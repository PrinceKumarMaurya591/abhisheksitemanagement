import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getSites } from '../api/siteApi';
import { getSiteAdvances, createAdvance, settleAdvance } from '../api/advanceApi';

export default function AdvancesPage() {
  const [searchParams] = useSearchParams();
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(searchParams.get('siteId') || '');
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ personName: '', personRole: '', amount: '', purpose: '', date: new Date().toISOString().split('T')[0] });
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
      getSiteAdvances(selectedSiteId)
        .then(res => setAdvances(res.data || []))
        .catch(err => setError('Failed to load advances'))
        .finally(() => setLoading(false));
    }
  }, [selectedSiteId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        personName: form.personName,
        personRole: form.personRole || null,
        amount: form.amount,
        purpose: form.purpose || null,
        date: form.date,
        site: { id: Number(selectedSiteId) }
      };
      const response = await createAdvance(payload);
      if (response.success) {
        setShowForm(false);
        setForm({ personName: '', personRole: '', amount: '', purpose: '', date: new Date().toISOString().split('T')[0] });
        const res = await getSiteAdvances(selectedSiteId);
        setAdvances(res.data || []);
      } else {
        setError(response.message || 'Failed to create advance');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create advance');
    }
  };

  const handleSettle = async (id) => {
    if (!window.confirm('Settle this advance?')) return;
    try {
      const response = await settleAdvance(id);
      if (response.success) {
        const res = await getSiteAdvances(selectedSiteId);
        setAdvances(res.data || []);
      } else {
        setError(response.message || 'Failed to settle advance');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to settle advance');
    }
  };

  const formatCurrency = (v) => '₹' + Number(v).toLocaleString('en-IN');

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Advances</h1>
          {selectedSiteId && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              {showForm ? 'Cancel' : '+ New Advance'}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Person Name *</label>
                <input type="text" required value={form.personName}
                  onChange={(e) => setForm({...form, personName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={form.personRole} onChange={(e) => setForm({...form, personRole: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                  <option value="">Select role</option>
                  <option value="MUNSHI">Munshi</option>
                  <option value="MATE">Mate</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="SITE_INCHARGE">Site Incharge</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input type="number" step="0.01" required value={form.amount}
                  onChange={(e) => setForm({...form, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" required value={form.date}
                  onChange={(e) => setForm({...form, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose</label>
                <input type="text" value={form.purpose}
                  onChange={(e) => setForm({...form, purpose: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
            </div>
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
              Create Advance
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
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Person</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Role</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Amount</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Settled</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {advances.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{a.date}</td>
                    <td className="py-3 px-4 font-medium">{a.personName}</td>
                    <td className="py-3 px-4">{a.personRole || '-'}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(a.amount)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(a.settledAmount || 0)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${a.status === 'OPEN' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{a.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      {a.status === 'OPEN' && (
                        <button onClick={() => handleSettle(a.id)} className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">Settle</button>
                      )}
                    </td>
                  </tr>
                ))}
                {advances.length === 0 && (
                  <tr><td colSpan={7} className="py-8 text-center text-gray-400">No advances found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">Select a site to view advances</div>
        )}
      </div>
    </Layout>
  );
}
