import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getSites } from '../api/siteApi';
import { getSiteMaterials, createMaterial, purchaseMaterial, shiftMaterial, consumeMaterial } from '../api/materialApi';

export default function MaterialsPage() {
  const [searchParams] = useSearchParams();
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(searchParams.get('siteId') || '');
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ materialName: '', unit: '', rate: '', quantity: '', description: '' });
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    getSites()
      .then(res => setSites(res.data || []))
      .catch(err => setError('Failed to load sites'));
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      setLoading(true);
      setError(null);
      getSiteMaterials(selectedSiteId)
        .then(res => setMaterials(res.data || []))
        .catch(err => setError('Failed to load materials'))
        .finally(() => setLoading(false));
    }
  }, [selectedSiteId]);

  // Voice input for description
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Voice input is not supported in this browser. Please use Chrome.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'hi-IN'; // Hindi by default, supports both Hindi & English

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error !== 'no-speech') {
        setError('Voice input error: ' + event.error);
      }
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setForm(prev => ({ ...prev, description: prev.description + (prev.description ? ' ' : '') + transcript }));
    };
    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        materialName: form.materialName,
        unit: form.unit || null,
        rate: form.rate || null,
        purchasedQty: form.quantity || null,
        description: form.description || null,
        site: { id: Number(selectedSiteId) }
      };
      const response = await createMaterial(payload);
      if (response.success) {
        setShowForm(false);
        setForm({ materialName: '', unit: '', rate: '', quantity: '', description: '' });
        const res = await getSiteMaterials(selectedSiteId);
        setMaterials(res.data || []);
      } else {
        setError(response.message || 'Failed to create material');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create material');
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Materials</h1>
          {selectedSiteId && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              {showForm ? 'Cancel' : '+ Add Material'}
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <select
          value={selectedSiteId}
          onChange={(e) => setSelectedSiteId(e.target.value)}
          className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
        >
          <option value="">Select a site...</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.siteName}</option>)}
        </select>

        {showForm && selectedSiteId && (
          <form onSubmit={handleCreateMaterial} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Name *</label>
                <input type="text" required value={form.materialName}
                  onChange={(e) => setForm({...form, materialName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <select value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                  <option value="">Select unit</option>
                  <option value="CFT">CFT</option><option value="Cum">Cum</option><option value="Bag">Bag</option>
                  <option value="Kg">Kg</option><option value="MT">MT</option><option value="Litre">Litre</option>
                  <option value="Meter">Meter</option><option value="Nos">Nos</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input type="number" step="0.001" value={form.quantity}
                  onChange={(e) => setForm({...form, quantity: e.target.value})}
                  placeholder="e.g. 40, 100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹)</label>
                <input type="number" step="0.01" value={form.rate}
                  onChange={(e) => setForm({...form, rate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <div className="flex gap-2">
                <textarea value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  rows={2}
                  placeholder="Add description (you can also use voice input in Hindi/English)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm resize-none" />
                <button type="button"
                  onClick={isListening ? stopListening : startListening}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={isListening ? 'Stop recording' : 'Voice input (Hindi/English)'}>
                  <span>{isListening ? '⏹' : '🎤'}</span>
                </button>
              </div>
              {isListening && (
                <p className="text-xs text-red-500 mt-1 animate-pulse">🎙️ Listening... Speak now in Hindi or English</p>
              )}
            </div>
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              Add Material
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : selectedSiteId ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Material</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Unit</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Purchased</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Shifted</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Consumed</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Balance</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Description</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => (
                  <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{m.materialName}</td>
                    <td className="py-3 px-4">{m.unit || '-'}</td>
                    <td className="py-3 px-4 text-right text-green-600 font-medium">{Number(m.purchasedQty || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-blue-600 font-medium">{Number(m.shiftedQty || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-orange-600 font-medium">{Number(m.consumedQty || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-purple-600 font-bold">{Number(m.balanceQty || 0).toFixed(2)}</td>
                    <td className="py-3 px-4 text-gray-500 max-w-[200px] truncate" title={m.description || ''}>{m.description || '-'}</td>
                  </tr>
                ))}
                {materials.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">No materials added</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">Select a site to view materials</div>
        )}
      </div>
    </Layout>
  );
}
