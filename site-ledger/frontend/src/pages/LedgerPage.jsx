import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getSites } from '../api/siteApi';
import { getSiteLedger, createLedgerEntry } from '../api/ledgerApi';

const CATEGORIES = ['MATERIAL', 'LABOUR', 'DIESEL', 'TRANSPORT', 'MACHINERY', 'TENDER', 'DEPARTMENT', 'OTHER'];

export default function LedgerPage() {
  const [searchParams] = useSearchParams();
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(searchParams.get('siteId') || '');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    entryDate: new Date().toISOString().split('T')[0],
    particulars: '', category: 'OTHER', amount: '', entryType: 'DEBIT', remarks: '',
  });

  useEffect(() => {
    getSites().then(res => setSites(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      setLoading(true);
      getSiteLedger(selectedSiteId)
        .then(res => setEntries(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [selectedSiteId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createLedgerEntry({
        ...form,
        amount: Number(form.amount),
        site: { id: Number(selectedSiteId) },
      });
      setShowForm(false);
      setForm({ entryDate: new Date().toISOString().split('T')[0], particulars: '', category: 'OTHER', amount: '', entryType: 'DEBIT', remarks: '' });
      const res = await getSiteLedger(selectedSiteId);
      setEntries(res.data);
    } catch (err) {
      alert('Failed to create entry');
    }
  };

  const formatCurrency = (v) => '₹' + Number(v).toLocaleString('en-IN');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Site Ledger</h1>
        {selectedSiteId && (
          <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            {showForm ? 'Cancel' : '+ New Entry'}
          </button>
        )}
      </div>

      <div className="flex gap-4 items-center">
        <select value={selectedSiteId} onChange={(e) => setSelectedSiteId(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="">Select a site...</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.siteName}</option>)}
        </select>
      </div>

      {showForm && selectedSiteId && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" required value={form.entryDate} onChange={(e) => setForm({...form, entryDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select value={form.entryType} onChange={(e) => setForm({...form, entryType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="CREDIT">Credit (Income)</option>
                <option value="DEBIT">Debit (Expense)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
              <input type="number" required value={form.amount} onChange={(e) => setForm({...form, amount: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Particulars *</label>
              <input type="text" required value={form.particulars} onChange={(e) => setForm({...form, particulars: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <input type="text" value={form.remarks} onChange={(e) => setForm({...form, remarks: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Create Entry</button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
      ) : selectedSiteId ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Particulars</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Category</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Amount</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{entry.entryDate}</td>
                  <td className="py-3 px-4 font-medium">{entry.particulars}</td>
                  <td className="py-3 px-4">{entry.category}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      entry.entryType === 'CREDIT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>{entry.entryType}</span>
                  </td>
                  <td className={`py-3 px-4 text-right font-medium ${entry.entryType === 'CREDIT' ? 'text-green-600' : 'text-red-600'}`}>
                    {entry.entryType === 'CREDIT' ? '+' : '-'}{formatCurrency(entry.amount)}
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-gray-400">No ledger entries yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">Select a site to view its ledger</div>
      )}
    </div>
  );
}
