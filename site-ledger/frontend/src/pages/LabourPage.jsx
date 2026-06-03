import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getSites } from '../api/siteApi';
import { getSiteLabour, createLabourEntry } from '../api/labourApi';

export default function LabourPage() {
  const [searchParams] = useSearchParams();
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(searchParams.get('siteId') || '');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ labourName: '', category: '', date: new Date().toISOString().split('T')[0], amount: '', remarks: '' });
  const [error, setError] = useState(null);

  useEffect(() => {
    getSites()
      .then(res => setSites(res.data || []))
      .catch(err => setError('Failed to load sites'));
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      setLoading(true);
      setError(null);
      getSiteLabour(selectedSiteId)
        .then(res => setEntries(res.data || []))
        .catch(err => setError('Failed to load labour entries'))
        .finally(() => setLoading(false));
    }
  }, [selectedSiteId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        labourName: form.labourName,
        category: form.category || null,
        date: form.date,
        amount: form.amount,
        remarks: form.remarks || null,
        site: { id: Number(selectedSiteId) }
      };
      const response = await createLabourEntry(payload);
      if (response.success) {
        setShowForm(false);
        setForm({ labourName: '', category: '', date: new Date().toISOString().split('T')[0], amount: '', remarks: '' });
        const res = await getSiteLabour(selectedSiteId);
        setEntries(res.data || []);
      } else {
        setError(response.message || 'Failed to create labour entry');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create labour entry');
    }
  };

  const formatCurrency = (v) => '₹' + Number(v).toLocaleString('en-IN');

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Labour Management</h1>
          {selectedSiteId && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              {showForm ? 'Cancel' : '+ Add Labour'}
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
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Labour Name *</label>
                <input
                  type="text" required value={form.labourName}
                  onChange={(e) => setForm({...form, labourName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <input
                  type="text" value={form.category}
                  onChange={(e) => setForm({...form, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder="e.g. Mason, Carpenter"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date" required value={form.date}
                  onChange={(e) => setForm({...form, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input
                  type="number" step="0.01" required value={form.amount}
                  onChange={(e) => setForm({...form, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea
                value={form.remarks} rows={2}
                onChange={(e) => setForm({...form, remarks: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
            </div>
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              Add Entry
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
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Labour Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Category</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{e.date}</td>
                    <td className="py-3 px-4 font-medium">{e.labourName}</td>
                    <td className="py-3 px-4">{e.category || '-'}</td>
                    <td className="py-3 px-4 text-right font-medium text-red-600">{formatCurrency(e.amount)}</td>
                    <td className="py-3 px-4 text-gray-500">{e.remarks || '-'}</td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-400">No labour entries found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">Select a site to view labour entries</div>
        )}
      </div>
    </Layout>
  );
}
