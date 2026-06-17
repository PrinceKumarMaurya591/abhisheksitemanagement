import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { getSites } from '../api/siteApi';
import { getSiteMaterials, createMaterial, updateMaterial, deleteMaterial, getMaterialTransactions } from '../api/materialApi';

function getTimeRemaining(createdAt) {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  const now = new Date();
  const elapsedMs = now - created;
  const elapsedHours = elapsedMs / (1000 * 60 * 60);
  const remainingHours = 24 - elapsedHours;

  if (remainingHours <= 0) return { expired: true, text: 'Expired' };
  if (remainingHours < 1) {
    const mins = Math.round(remainingHours * 60);
    return { expired: false, text: `${mins} min` };
  }
  const hrs = Math.floor(remainingHours);
  const mins = Math.round((remainingHours - hrs) * 60);
  return { expired: false, text: `${hrs}h ${mins}m` };
}

function getSiteStatus(sites, siteId) {
  if (!siteId) return null;
  const site = sites.find(s => String(s.id) === String(siteId));
  return site?.status || null;
}

export default function MaterialsPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(searchParams.get('siteId') || '');
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [form, setForm] = useState({ materialName: '', unit: '', rate: '', quantity: '', description: '' });
  const [error, setError] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [viewTransactions, setViewTransactions] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const recognitionRef = useRef(null);

  const isMunshiOrMate = user?.role === 'MUNSHI' || user?.role === 'MATE';
  const canManage = user?.role === 'OWNER' || user?.role === 'OFFICE_ADMIN';

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

  // For MUNSHI/MATE: auto-refresh materials every 60s
  useEffect(() => {
    if (!selectedSiteId || !isMunshiOrMate) return;
    const interval = setInterval(() => {
      getSiteMaterials(selectedSiteId)
        .then(res => setMaterials(res.data || []))
        .catch(() => {});
    }, 60000);
    return () => clearInterval(interval);
  }, [selectedSiteId, isMunshiOrMate]);

  const resetForm = () => {
    setForm({ materialName: '', unit: '', rate: '', quantity: '', description: '' });
    setEditingMaterial(null);
  };

  const handleEditClick = (material) => {
    setForm({
      materialName: material.materialName || '',
      unit: material.unit || '',
      rate: material.rate || '',
      quantity: material.purchasedQty || '',
      description: material.description || '',
    });
    setEditingMaterial(material);
    setShowForm(true);
  };

  const handleViewTransactions = async (material) => {
    try {
      const res = await getMaterialTransactions(material.id);
      setTransactions(res.data || []);
      setViewTransactions(material);
    } catch (err) {
      setError('Failed to load transactions');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this material entry?')) return;
    try {
      await deleteMaterial(id);
      const res = await getSiteMaterials(selectedSiteId);
      setMaterials(res.data || []);
    } catch (err) {
      setError('Failed to delete material');
    }
  };

  // Voice input
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Voice input is not supported in this browser. Please use Chrome.');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'hi-IN';

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
        rate: form.rate ? Number(form.rate) : null,
        purchasedQty: form.quantity ? Number(form.quantity) : 0,
        description: form.description || null,
        site: { id: Number(selectedSiteId) }
      };

      if (editingMaterial) {
        await updateMaterial(editingMaterial.id, payload);
      } else {
        await createMaterial(payload);
      }

      setShowForm(false);
      resetForm();
      const res = await getSiteMaterials(selectedSiteId);
      setMaterials(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save material');
    }
  };

  const formatCurrency = (v) => '₹' + Number(v || 0).toLocaleString('en-IN');

  const siteOnHold = getSiteStatus(sites, selectedSiteId) === 'ON_HOLD';

  // Calculate total amounts
  const totalPurchasedAmount = materials.reduce((sum, m) => sum + (Number(m.purchasedQty || 0) * Number(m.rate || 0)), 0);
  const totalConsumedAmount = materials.reduce((sum, m) => sum + (Number(m.consumedQty || 0) * Number(m.rate || 0)), 0);
  const totalWasteAmount = materials.reduce((sum, m) => {
    const waste = Number(m.purchasedQty || 0) - Number(m.shiftedQty || 0) - Number(m.consumedQty || 0);
    return sum + (waste > 0 ? waste * Number(m.rate || 0) : 0);
  }, 0);

  return (
    <Layout>
      <div className="space-y-6">
        {siteOnHold && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <span>⏸️</span>
            <span><strong>Site is on Hold.</strong> This site is currently on hold. Entries made now will be recorded but the site is not active.</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {searchParams.get('siteId') && (
              <Link to={`/sites/${searchParams.get('siteId')}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">← Back to Site</Link>
            )}
            <h1 className="text-2xl font-bold text-gray-900">Materials</h1>
          </div>
          {selectedSiteId && (
            <button
              onClick={() => { resetForm(); setShowForm(!showForm); }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              {showForm ? 'Cancel' : '+ Add Material'}
            </button>
          )}
        </div>

        {isMunshiOrMate && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <span>⏳</span>
            <span>You can add material to your assigned site(s). Entries are visible for <strong>24 hours</strong> after creation and cannot be edited.</span>
          </div>
        )}

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

        {/* Summary Cards */}
        {materials.length > 0 && selectedSiteId && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-xs text-blue-600 font-medium">Total Purchased</p>
              <p className="text-lg font-bold text-blue-700">{formatCurrency(totalPurchasedAmount)}</p>
              <p className="text-xs text-blue-500">{materials.reduce((s, m) => s + Number(m.purchasedQty || 0), 0).toFixed(2)} units</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-xs text-green-600 font-medium">Total Consumed</p>
              <p className="text-lg font-bold text-green-700">{formatCurrency(totalConsumedAmount)}</p>
              <p className="text-xs text-green-500">{materials.reduce((s, m) => s + Number(m.consumedQty || 0), 0).toFixed(2)} units</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <p className="text-xs text-purple-600 font-medium">Total Shifted</p>
              <p className="text-lg font-bold text-purple-700">{materials.reduce((s, m) => s + Number(m.shiftedQty || 0), 0).toFixed(2)} units</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <p className="text-xs text-orange-600 font-medium">Waste / Loss</p>
              <p className={`text-lg font-bold ${totalWasteAmount > 0 ? 'text-red-600' : 'text-orange-600'}`}>
                {totalWasteAmount > 0 ? formatCurrency(totalWasteAmount) : '₹0'}
              </p>
              <p className="text-xs text-orange-500">
                {materials.reduce((s, m) => {
                  const waste = Number(m.purchasedQty || 0) - Number(m.shiftedQty || 0) - Number(m.consumedQty || 0);
                  return s + (waste > 0 ? waste : 0);
                }, 0).toFixed(2)} units
              </p>
            </div>
          </div>
        )}

        {/* Add/Edit Material Form */}
        {showForm && selectedSiteId && (
          <form onSubmit={handleCreateMaterial} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingMaterial ? '✏️ Edit Material' : '+ Add New Material'}
            </h2>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹/unit)</label>
                <input type="number" step="0.01" value={form.rate}
                  onChange={(e) => setForm({...form, rate: e.target.value})}
                  placeholder="Rate per unit"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                {form.quantity && form.rate && (
                  <p className="text-xs text-indigo-600 mt-1 font-medium">
                    Total: {formatCurrency(Number(form.quantity) * Number(form.rate))}
                  </p>
                )}
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
            <div className="flex items-center gap-3">
              <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                {editingMaterial ? 'Update Material' : 'Add Material'}
              </button>
              {editingMaterial && (
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium">
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {/* Materials Table */}
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
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Rate</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Purchased</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Shifted</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Consumed</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Amount</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Balance</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                  {isMunshiOrMate && <th className="text-center py-3 px-4 font-medium text-gray-500">Visibility</th>}
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => {
                  const remaining = isMunshiOrMate ? getTimeRemaining(m.createdAt) : null;
                  const amount = Number(m.purchasedQty || 0) * Number(m.rate || 0);
                  const waste = Number(m.purchasedQty || 0) - Number(m.shiftedQty || 0) - Number(m.consumedQty || 0);
                  return (
                    <tr key={m.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{m.materialName}</td>
                      <td className="py-3 px-4">{m.unit || '-'}</td>
                      <td className="py-3 px-4 text-right">{m.rate ? formatCurrency(m.rate) : '-'}</td>
                      <td className="py-3 px-4 text-right text-green-600 font-medium">{Number(m.purchasedQty || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-blue-600 font-medium">{Number(m.shiftedQty || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right text-orange-600 font-medium">{Number(m.consumedQty || 0).toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-medium text-gray-900">{formatCurrency(amount)}</td>
                      <td className="py-3 px-4 text-right">
                        <span className={`font-bold ${waste > 0 ? 'text-red-600' : 'text-purple-600'}`}>
                          {Number(m.balanceQty || 0).toFixed(2)}
                          {waste > 0 && <span className="text-xs text-red-500 ml-1" title={`Waste: ${waste.toFixed(2)}`}>⚠️</span>}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewTransactions(m)}
                            className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                          >
                            📋 View
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => handleEditClick(m)}
                                className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(m.id)}
                                className="text-red-600 hover:text-red-800 text-xs font-medium"
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      {isMunshiOrMate && (
                        <td className="py-3 px-4 text-center">
                          {remaining ? (
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                              remaining.expired
                                ? 'bg-red-100 text-red-700'
                                : remaining.text.includes('h')
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-green-100 text-green-700'
                            }`}>
                              {remaining.expired ? '🔴 Expired' : `🟢 ${remaining.text}`}
                            </span>
                          ) : '-'}
                        </td>
                      )}
                    </tr>
                  );
                })}
                {materials.length === 0 && (
                  <tr><td colSpan={isMunshiOrMate ? 11 : 10} className="py-8 text-center text-gray-400">No materials added</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">Select a site to view materials</div>
        )}

        {/* Transactions Modal */}
        {viewTransactions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  📋 Transactions: {viewTransactions.materialName}
                </h2>
                <button onClick={() => setViewTransactions(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>

              {transactions.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No transactions for this material</p>
              ) : (
                <div className="space-y-3">
                  {transactions.map(txn => (
                    <div key={txn.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className={`text-lg ${
                          txn.transactionType === 'PURCHASE' ? 'text-green-600' :
                          txn.transactionType === 'SHIFTING' ? 'text-blue-600' : 'text-orange-600'
                        }`}>
                          {txn.transactionType === 'PURCHASE' ? '📥' : txn.transactionType === 'SHIFTING' ? '↔️' : '🔨'}
                        </span>
                        <div>
                          <p className="text-sm font-medium">
                            {txn.transactionType === 'PURCHASE' ? 'Purchase' :
                             txn.transactionType === 'SHIFTING' ? 'Shifted' : 'Consumed'}
                            {txn.fromSite && txn.toSite && ` (${txn.fromSite.siteName || 'Site A'} → ${txn.toSite.siteName || 'Site B'})`}
                          </p>
                          <p className="text-xs text-gray-500">
                            {txn.transactionDate} | Qty: {Number(txn.quantity).toFixed(2)}
                            {txn.rate ? ` | Rate: ${formatCurrency(txn.rate)}` : ''}
                            {txn.totalAmount ? ` | Total: ${formatCurrency(txn.totalAmount)}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm">{Number(txn.quantity).toFixed(2)}</p>
                        {txn.vendorName && <p className="text-xs text-gray-500">{txn.vendorName}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
