import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getSites } from '../api/siteApi';
import { getSiteExpenses, createExpense } from '../api/expenseApi';
import { useAuth } from '../context/AuthContext';

const EXPENSE_TYPES = ['Water', 'Tea', 'Tools', 'Diesel', 'Electricity', 'Stationery', 'Cleaning', 'Security', 'Machinery', 'Miscellaneous'];
const PAYMENT_SOURCES = [
  { value: 'COMPANY_ADVANCE', label: '🏢 Company Advance' },
  { value: 'PERSONAL_MONEY', label: '👤 Personal Money' },
  { value: 'VENDOR_CREDIT', label: '📝 Vendor Credit / Udhar' },
];

export default function ExpensesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(searchParams.get('siteId') || '');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    expenseType: 'Miscellaneous', amount: '', date: new Date().toISOString().split('T')[0],
    paymentSource: 'COMPANY_ADVANCE', vendorName: '', remarks: ''
  });
  const [error, setError] = useState(null);

  const canAdd = user?.role === 'OWNER' || user?.role === 'OFFICE_ADMIN' ||
    user?.role === 'SITE_INCHARGE' || user?.role === 'MUNSHI';

  useEffect(() => {
    getSites().then(res => setSites(res.data || [])).catch(() => setError('Failed to load sites'));
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      setLoading(true);
      setError(null);
      getSiteExpenses(selectedSiteId)
        .then(res => setEntries(res.data || []))
        .catch(() => setError('Failed to load expenses'))
        .finally(() => setLoading(false));
    }
  }, [selectedSiteId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        expenseType: form.expenseType,
        amount: Number(form.amount),
        date: form.date,
        paymentSource: form.paymentSource,
        vendorName: form.paymentSource === 'VENDOR_CREDIT' ? form.vendorName : null,
        remarks: form.remarks || null,
        site: { id: Number(selectedSiteId) }
      };
      const response = await createExpense(payload);
      if (response.success) {
        setShowForm(false);
        setForm({ expenseType: 'Miscellaneous', amount: '', date: new Date().toISOString().split('T')[0], paymentSource: 'COMPANY_ADVANCE', vendorName: '', remarks: '' });
        const res = await getSiteExpenses(selectedSiteId);
        setEntries(res.data || []);
      } else {
        setError(response.message || 'Failed to create expense');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create expense');
    }
  };

  const formatCurrency = (v) => '₹' + Number(v).toLocaleString('en-IN');
  const totalAmount = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const siteOnHold = selectedSiteId && sites.find(s => String(s.id) === String(selectedSiteId))?.status === 'ON_HOLD';

  const getSourceBadge = (source) => {
    const colors = {
      COMPANY_ADVANCE: 'bg-blue-100 text-blue-700',
      PERSONAL_MONEY: 'bg-yellow-100 text-yellow-700',
      VENDOR_CREDIT: 'bg-purple-100 text-purple-700',
    };
    const labels = {
      COMPANY_ADVANCE: '🏢 Advance',
      PERSONAL_MONEY: '👤 Personal',
      VENDOR_CREDIT: '📝 Udhar',
    };
    return { color: colors[source] || 'bg-gray-100 text-gray-700', label: labels[source] || source };
  };

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
            {searchParams.get('siteId') ? (
              <Link to={`/sites/${searchParams.get('siteId')}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">← Back to Site</Link>
            ) : (
              <Link to="/sites" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">← Back to Sites</Link>
            )}
            <h1 className="text-2xl font-bold text-gray-900">💰 Petty Expenses</h1>
          </div>
          {selectedSiteId && canAdd && (
            <button onClick={() => setShowForm(!showForm)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              {showForm ? 'Cancel' : '+ Add Expense'}
            </button>
          )}
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

        <select value={selectedSiteId} onChange={(e) => setSelectedSiteId(e.target.value)}
          className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
          <option value="">Select a site...</option>
          {sites.map(s => <option key={s.id} value={s.id}>{s.siteName}</option>)}
        </select>

        {showForm && selectedSiteId && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type *</label>
                <select value={form.expenseType} onChange={(e) => setForm({...form, expenseType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                  {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input type="number" step="0.01" required value={form.amount}
                  onChange={(e) => setForm({...form, amount: e.target.value})}
                  placeholder="Amount"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" required value={form.date}
                  onChange={(e) => setForm({...form, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Source *</label>
                <select value={form.paymentSource} onChange={(e) => setForm({...form, paymentSource: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                  {PAYMENT_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              {form.paymentSource === 'VENDOR_CREDIT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name *</label>
                  <input type="text" required value={form.vendorName}
                    onChange={(e) => setForm({...form, vendorName: e.target.value})}
                    placeholder="Vendor name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea value={form.remarks} rows={2}
                onChange={(e) => setForm({...form, remarks: e.target.value})}
                placeholder="What is this expense for?"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
            </div>
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              Add Expense
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
        ) : selectedSiteId ? (
          <>
            {entries.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <p className="text-sm text-gray-500">Total Expenses</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(totalAmount)}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <p className="text-sm text-gray-500">Total Entries</p>
                  <p className="text-xl font-bold text-gray-900">{entries.length}</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Source</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => {
                    const badge = getSourceBadge(e.paymentSource);
                    return (
                      <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">{e.date}</td>
                        <td className="py-3 px-4 font-medium">{e.expenseType}</td>
                        <td className="py-3 px-4 text-right font-medium text-red-600">{formatCurrency(e.amount)}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                            {badge.label}{e.vendorName ? ` - ${e.vendorName}` : ''}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-500">{e.remarks || '-'}</td>
                      </tr>
                    );
                  })}
                  {entries.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400">No expense entries found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-400">Select a site to view expenses</div>
        )}
      </div>
    </Layout>
  );
}
