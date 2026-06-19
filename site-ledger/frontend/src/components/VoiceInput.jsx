import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * VoiceInput Component
 * 
 * Provides a microphone button that captures speech and converts to text.
 * Uses Web Speech API (works in Chrome, Edge, Android WebView).
 * 
 * Features:
 * - Toggle microphone on/off
 * - Real-time interim results
 * - Support for multiple languages (hi-IN for Hindi, en-IN for English)
 * - Auto-fill detected fields (optional, via onParsed callback)
 */
export default function VoiceInput({
  onText,           // Callback with final transcript text
  onParsed,         // Callback with parsed structured data (for auto-fill)
  language = 'hi-IN', // Default: Hindi
  placeholder = 'बोलने के लिए माइक्रोफोन दबाएं...',
  autoDetect = false, // Whether to attempt auto-fill parsing
  fieldType = 'text', // 'text' for description, 'material' for material entry
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimText, setInterimText] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');

  // Check browser support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSupported(false);
    }
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition is not supported in this browser. Please use Chrome or Android.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let interim = '';
      let final = finalTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += ' ' + result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      finalTranscriptRef.current = final.trim();
      setTranscript(final.trim());
      setInterimText(interim);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please allow microphone permissions.');
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      // If we're still supposed to be listening, restart
      if (isListening) {
        try { recognition.start(); } catch (e) { /* ignore */ }
      } else {
        setIsListening(false);
        const finalText = finalTranscriptRef.current;
        if (finalText && onText) {
          onText(finalText);
        }
        if (finalText && autoDetect && onParsed) {
          const parsed = parseVoiceInput(finalText, fieldType);
          if (parsed) {
            onParsed(parsed);
          }
        }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimText('');
    setIsListening(true);
  }, [language, onText, onParsed, autoDetect, fieldType, isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);

    const finalText = finalTranscriptRef.current;
    if (finalText && onText) {
      onText(finalText);
    }
    if (finalText && autoDetect && onParsed) {
      const parsed = parseVoiceInput(finalText, fieldType);
      if (parsed) {
        onParsed(parsed);
      }
    }
  }, [onText, onParsed, autoDetect, fieldType]);

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setInterimText('');
    finalTranscriptRef.current = '';
  };

  if (!supported) {
    return (
      <div className="text-xs text-gray-400 italic">
        Voice input not supported in this browser. Use Chrome or Android.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleListening}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
          isListening
            ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
        title={isListening ? 'Stop recording' : 'Start voice input'}
      >
        <span className="text-lg">{isListening ? '🔴' : '🎤'}</span>
        <span>{isListening ? 'Recording...' : 'Voice'}</span>
      </button>

      {(transcript || interimText) && (
        <div className="flex-1 flex items-center gap-2">
          <div className="flex-1 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-700 min-h-[36px]">
            {transcript}
            {interimText && (
              <span className="text-blue-300 italic"> {interimText}</span>
            )}
          </div>
          <button
            type="button"
            onClick={clearTranscript}
            className="text-gray-400 hover:text-gray-600 text-xs"
            title="Clear"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Parse natural language voice input into structured data.
 * Supports Hindi and English mixed input.
 * 
 * Examples:
 * - "Aaj 30 bag cement aaya 12000 rupaye ka"
 *   → { materialName: "Cement", quantity: 30, unit: "Bags", amount: 12000 }
 * 
 * - "Aaj 10 labour aaye 800 rupaye per day"
 *   → { labourCount: 10, rate: 800 }
 * 
 * - "Aaj pani ka kharcha 500 rupaye"
 *   → { expenseType: "Water", amount: 500 }
 */
function parseVoiceInput(text, fieldType) {
  if (!text || text.trim().length < 5) return null;

  const lower = text.toLowerCase();

  if (fieldType === 'material') {
    return parseMaterialEntry(text);
  } else if (fieldType === 'labour') {
    return parseLabourEntry(text);
  } else if (fieldType === 'expense') {
    return parseExpenseEntry(text);
  } else if (fieldType === 'attendance') {
    return parseAttendanceCommand(text);
  }

  return null;
}

/**
 * Parse material entry from voice.
 * Pattern: [quantity] [unit] [material] [amount] rupaye
 */
function parseMaterialEntry(text) {
  const result = {};

  // Extract numbers
  const numbers = text.match(/\d+/g);
  if (!numbers || numbers.length === 0) return null;

  // Common material names (Hindi + English)
  const materialKeywords = [
    { name: 'Cement', keywords: ['cement', 'सीमेंट', 'सिमेन्ट'] },
    { name: 'Steel', keywords: ['steel', 'स्टील', 'सरिया', 'लोहा'] },
    { name: 'Sand', keywords: ['sand', 'रेत', 'बालू'] },
    { name: 'Brick', keywords: ['brick', 'ईंट', 'इंट'] },
    { name: 'Stone', keywords: ['stone', 'पत्थर', 'गिट्टी', 'boulder'] },
    { name: 'GSB', keywords: ['gsb', 'जीएसबी'] },
    { name: 'WMM', keywords: ['wmm', 'डब्ल्यूएमएम'] },
    { name: 'Pipe', keywords: ['pipe', 'पाइप', 'पाईप'] },
    { name: 'Bitumen', keywords: ['bitumen', 'बिटुमेन', 'डामर'] },
    { name: 'Paint', keywords: ['paint', 'पेंट', 'रंग'] },
    { name: 'Diesel', keywords: ['diesel', 'डीजल'] },
  ];

  for (const mat of materialKeywords) {
    if (mat.keywords.some(k => text.toLowerCase().includes(k))) {
      result.materialName = mat.name;
      break;
    }
  }

  // Units
  const unitKeywords = [
    { unit: 'Bags', keywords: ['bag', 'बैग', 'बोरी', 'बोरा'] },
    { unit: 'Kg', keywords: ['kg', 'किलो', 'किग्रा'] },
    { unit: 'Quintals', keywords: ['quintal', 'क्विंटल'] },
    { unit: 'Ton', keywords: ['ton', 'tonne', 'टन'] },
    { unit: 'Cum', keywords: ['cum', 'क्यूम', 'घन'] },
    { unit: 'Sqft', keywords: ['sqft', 'sq ft', 'वर्ग'] },
    { unit: 'Ltr', keywords: ['liter', 'litre', 'ltr', 'लीटर'] },
    { unit: 'Nos', keywords: ['nos', 'number', 'piece', 'पीस', 'नग'] },
  ];

  for (const u of unitKeywords) {
    if (u.keywords.some(k => text.toLowerCase().includes(k))) {
      result.unit = u.unit;
      break;
    }
  }

  // Assign numbers: if we have 2+ numbers, first might be qty, second amount
  const nums = numbers.map(Number);
  if (nums.length >= 2) {
    result.quantity = nums[0];
    result.amount = nums[nums.length - 1];
    // If quantity seems too large for amount, swap
    if (result.quantity > result.amount && result.quantity > 1000) {
      [result.quantity, result.amount] = [result.amount, result.quantity];
    }
  } else if (nums.length === 1) {
    // Assume it's the amount if large, quantity if small
    if (nums[0] > 500) {
      result.amount = nums[0];
    } else {
      result.quantity = nums[0];
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Parse labour entry from voice.
 */
function parseLabourEntry(text) {
  const numbers = text.match(/\d+/g);
  if (!numbers) return null;

  const nums = numbers.map(Number);
  const result = {};

  if (nums.length >= 2) {
    result.labourCount = nums[0];
    result.rate = nums[1];
  } else {
    result.labourCount = nums[0];
  }

  return result;
}

/**
 * Parse expense entry from voice.
 */
function parseExpenseEntry(text) {
  const numbers = text.match(/\d+/g);
  if (!numbers) return null;

  const result = { amount: Number(numbers[numbers.length - 1]) };

  const expenseKeywords = [
    { type: 'Water', keywords: ['water', 'पानी', 'जल'] },
    { type: 'Tea', keywords: ['tea', 'चाय', 'chai'] },
    { type: 'Diesel', keywords: ['diesel', 'डीजल'] },
    { type: 'Tools', keywords: ['tool', 'औजार', 'उपकरण'] },
    { type: 'Transport', keywords: ['transport', 'transportation', 'भाड़ा', 'किराया', 'परिवहन'] },
    { type: 'Food', keywords: ['food', 'खाना', 'भोजन'] },
    { type: 'Electricity', keywords: ['electricity', 'बिजली'] },
    { type: 'Misc', keywords: ['misc', 'अन्य', 'आदि'] },
  ];

  for (const exp of expenseKeywords) {
    if (exp.keywords.some(k => text.toLowerCase().includes(k))) {
      result.expenseType = exp.type;
      break;
    }
  }

  return result;
}

/**
 * Parse attendance command from voice.
 */
function parseAttendanceCommand(text) {
  const lower = text.toLowerCase();
  const result = {};

  if (lower.includes('all') || lower.includes('सब') || lower.includes('सभी')) {
    if (lower.includes('present') || lower.includes('a') || lower.includes('आ') || lower.includes('मौजूद')) {
      result.command = 'ALL_PRESENT';
    } else if (lower.includes('absent') || lower.includes('p') || lower.includes('पी') || lower.includes('अनुपस्थित')) {
      result.command = 'ALL_ABSENT';
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}
