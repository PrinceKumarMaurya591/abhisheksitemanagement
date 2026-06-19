import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import VoiceInput from '../components/VoiceInput';
import { getSites } from '../api/siteApi';
import { createMaterial } from '../api/materialApi';
import { createExpense } from '../api/expenseApi';
import { useAuth } from '../context/AuthContext';

/**
 * Voice Entry Page — Munshi can speak naturally and the system auto-fills forms.
 * 
 * Two modes:
 * 1. Quick Voice Entry: Speak naturally, system auto-parses and shows preview → confirm
 * 2. Voice-Enabled Forms: Standard forms with voice input for each field
 */
export default function VoiceEntryPage() {
  const { user } = useAuth();
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [entryType, setEntryType] = useState('material'); // material, expense
  const [parsedData, setParsedData] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [msg, setMsg] = useState(null);
  const [editing, setEditing] = useState(false);

  // Manual edit form
  const [form, setForm] = useState({
    materialName: '', quantity: '', unit: 'Bags', amount: '',
    expenseType: 'Misc', expenseAmount: '', expenseRemarks: '',
  });

  useEffect(() => {
    getSites().then(res => {
      if (res.success) setSites(res.data || []);
    }).catch(() => {});
  }, []);

  const handleVoiceParsed = (data) => {
    setParsedData(data);
    setEditing(false);
    // Pre-fill form based on entry type
    if (entryType === 'material') {
      setForm(prev => ({
        ...prev,
        materialName: data.materialName || prev.materialName,
        quantity: data.quantity || '',
        unit: data.unit || 'Bags',
        amount: data.amount || '',
      }));
    } else if (entryType === 'expense') {
      setForm(prev => ({
        ...prev,
        expenseType: data.expenseType || 'Misc',
        expenseAmount: data.amount || '',
        expenseRemarks: transcript,
      }));
    }
  };

  const handleVoiceText = (text) => {
    setTranscript(text);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSiteId) {
      setMsg({ type: 'error', text: 'Please select a site first' });
      return;
    }

    try {
      if (entryType === 'material') {
        const payload = {
          materialName: form.materialName,
          unit: form.unit,
          purchasedQty: Number(form.quantity),
          site: { id: Number(selectedSiteId) },
        };
        const res = await createMaterial(payload);
        if (res.success) {
          setMsg({ type: 'success', text: `✅ ${form.materialName} (${form.quantity} ${form.unit}) recorded!` });
          resetForm();
        } else {
          setMsg({ type: 'error', text: res.message || 'Failed' });
        }
      } else if (entryType === 'expense') {
        const payload = {
          expenseType: form.expenseType,
          amount: Number(form.expenseAmount),
          date: new Date().toISOString().split('T')[0],
          paymentSource: 'COMPANY_ADVANCE',
          site: { id: Number(selectedSiteId) },
          remarks: form.expenseRemarks || transcript || '',
        };
        const res = await createExpense(payload);
        if (res.success) {
          setMsg({ type: 'success', text: `✅ ${form.expenseType} expense of ₹${form.expenseAmount} recorded!` });
          resetForm();
        } else {
          setMsg({ type: 'error', text: res.message || 'Failed' });
        }
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save' });
    }
  };

  const resetForm = () => {
    setParsedData(null);
    setTranscript('');
    setForm({
      materialName: '', quantity: '', unit: 'Bags', amount: '',
      expenseType: 'Misc', expenseAmount: '', expenseRemarks: '',
    });
    setEditing(false);
  };

  const siteName = sites.find(s => s.id === Number(selectedSiteId))?.siteName || '';

  if (!selectedSiteId) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">🎤 Voice Entry</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <p className="text-yellow-700 font-medium mb-3">Please select a site first</p>
            <select value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">Select Site...</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.siteName}</option>)}
            </select>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🎤 Voice Entry</h1>
            <p className="text-sm text-gray-500 mt-1">
              बोलिए और सिस्टम ऑटो-फिल करेगा — {siteName}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
              {sites.map(s => <option key={s.id} value={s.id}>{s.siteName}</option>)}
            </select>
          </div>
        </div>

        {/* Entry Type Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => { setEntryType('material'); resetForm(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              entryType === 'material'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            📦 Material Entry
          </button>
          <button
            onClick={() => { setEntryType('expense'); resetForm(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              entryType === 'expense'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            💸 Expense Entry
          </button>
        </div>

        {msg && (
          <div className={`px-4 py-3 rounded-lg text-sm ${
            msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {msg.text}
            <button onClick={() => setMsg(null)} className="float-right font-bold">&times;</button>
          </div>
        )}

        {/* Voice Input Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🎤 बोलिए — Speak Naturally
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {entryType === 'material'
              ? 'उदाहरण: "Aaj 30 bag cement aaya 12000 rupaye ka" या "50 बोरी सीमेंट 25000 का आया"'
              : 'उदाहरण: "Aaj pani ka kharcha 500 rupaye" या "मजदूरों के लिए चाय 200 रुपए"'
            }
          </p>

          <VoiceInput
            onText={handleVoiceText}
            onParsed={handleVoiceParsed}
            language="hi-IN"
            autoDetect={true}
            fieldType={entryType}
            placeholder="बोलने के लिए माइक्रोफोन दबाएं..."
          />
        </div>

        {/* Parsed Result Preview */}
        {parsedData && !editing && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-green-800">🔍 System Detected</h3>
              <button
                onClick={() => setEditing(true)}
                className="text-green-700 hover:text-green-900 text-sm font-medium underline"
              >
                ✏️ Edit
              </button>
            </div>

            {entryType === 'material' && (
              <div className="grid grid-cols-3 gap-4 text-sm">
                {parsedData.materialName && (
                  <div className="bg-white rounded-lg p-3 border border-green-100">
                    <p className="text-green-600 text-xs">Material</p>
                    <p className="font-bold text-green-800">{parsedData.materialName}</p>
                  </div>
                )}
                {parsedData.quantity && (
                  <div className="bg-white rounded-lg p-3 border border-green-100">
                    <p className="text-green-600 text-xs">Quantity</p>
                    <p className="font-bold text-green-800">{parsedData.quantity} {parsedData.unit || ''}</p>
                  </div>
                )}
                {parsedData.amount && (
                  <div className="bg-white rounded-lg p-3 border border-green-100">
                    <p className="text-green-600 text-xs">Amount</p>
                    <p className="font-bold text-green-800">₹{Number(parsedData.amount).toLocaleString('en-IN')}</p>
                  </div>
                )}
              </div>
            )}

            {entryType === 'expense' && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {parsedData.expenseType && (
                  <div className="bg-white rounded-lg p-3 border border-green-100">
                    <p className="text-green-600 text-xs">Expense Type</p>
                    <p className="font-bold text-green-800">{parsedData.expenseType}</p>
                  </div>
                )}
                {parsedData.amount && (
                  <div className="bg-white rounded-lg p-3 border border-green-100">
                    <p className="text-green-600 text-xs">Amount</p>
                    <p className="font-bold text-green-800">₹{Number(parsedData.amount).toLocaleString('en-IN')}</p>
                  </div>
                )}
              </div>
            )}

            {transcript && (
              <div className="mt-3 text-xs text-green-600 bg-white rounded-lg p-2 border border-green-100">
                🎤 You said: "{transcript}"
              </div>
            )}
          </div>
        )}

        {/* Manual Entry Form (always visible for editing) */}
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {editing ? '✏️ Edit & Confirm' : parsedData ? '✅ Confirm & Save' : '📝 Manual Entry'}
          </h3>

          {entryType === 'material' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Name *</label>
                <input type="text" required value={form.materialName}
                  onChange={(e) => setForm({...form, materialName: e.target.value})}
                  placeholder="e.g. Cement, Steel, Sand"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input type="number" required min="0" step="0.01" value={form.quantity}
                  onChange={(e) => setForm({...form, quantity: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <select value={form.unit}
                  onChange={(e) => setForm({...form, unit: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="Bags">Bags</option>
                  <option value="Kg">Kg</option>
                  <option value="Quintals">Quintals</option>
                  <option value="Ton">Ton</option>
                  <option value="Cum">Cum</option>
                  <option value="Sqft">Sqft</option>
                  <option value="Ltr">Ltr</option>
                  <option value="Nos">Nos</option>
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type *</label>
                <select required value={form.expenseType}
                  onChange={(e) => setForm({...form, expenseType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="Water">Water</option>
                  <option value="Tea">Tea</option>
                  <option value="Diesel">Diesel</option>
                  <option value="Tools">Tools</option>
                  <option value="Transport">Transport</option>
                  <option value="Food">Food</option>
                  <option value="Electricity">Electricity</option>
                  <option value="Misc">Misc</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input type="number" required min="0" value={form.expenseAmount}
                  onChange={(e) => setForm({...form, expenseAmount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <div className="space-y-2">
                  <input type="text" value={form.expenseRemarks}
                    onChange={(e) => setForm({...form, expenseRemarks: e.target.value})}
                    placeholder="Description or remarks"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  <VoiceInput
                    onText={(text) => setForm({...form, expenseRemarks: form.expenseRemarks + ' ' + text})}
                    language="hi-IN"
                    placeholder="या बोलकर भरें..."
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button type="submit"
              className="bg-green-600 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2">
              <span>✅</span>
              Save Entry
            </button>
            {parsedData && (
              <button type="button" onClick={resetForm}
                className="text-gray-500 hover:text-gray-700 text-sm font-medium">
                Clear & Start Again
              </button>
            )}
          </div>
        </form>

        {/* Tips Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-medium mb-2">💡 Voice Entry Tips:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Material:</strong> "30 bag cement 12000 rupaye" या "50 बोरी सीमेंट 25000 का"</li>
            <li><strong>Expense:</strong> "पानी का खर्चा 500 रुपए" या "diesel 2000 rupaye"</li>
            <li><strong>Mixed language</strong> (Hindi + English) दोनों चलेगा</li>
            <li>सिस्टम ऑटो-डिटेक्ट करेगा और फॉर्म भर देगा — आपको सिर्फ Confirm करना है</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
