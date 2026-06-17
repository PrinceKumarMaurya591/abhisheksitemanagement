import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getOtherExpenses, createOtherExpense, deleteOtherExpense } from '../api/otherExpenseApi';
import { getCategories } from '../api/expenseCategoryApi';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

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

export default function OtherExpensesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const levelParam = searchParams.get('level') || 'SITE';
  const yojnaIdParam = searchParams.get('yojnaId');
  const siteIdParam = searchParams.get('siteId');
  const staffUserIdParam = searchParams.get('staffUserId');

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState(siteIdParam || '');

  const level = yojnaIdParam ? 'YOJNA' : (selectedSiteId ? 'SITE' : levelParam);
  const yojnaId = yojnaIdParam || null;
  const siteId = selectedSiteId || siteIdParam || null;
  const staffUserId = staffUserIdParam || null;

  const [form, setForm] = useState({
    category: { id: '' },
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentSource: 'COMPANY_ADVANCE',
    expenseLevel: level,
    yojna: yojnaId ? { id: yojnaId } : null,
    site: siteId ? { id: siteId } : null,
    staffUser: staffUserId ? { id: staffUserId } : null,
  });

  const isMunshiOrMate = user?.role === 'MUNSHI' || user?.role === 'MATE';
  const canAdd = user?.role === 'OWNER' || user?.role === 'OFFICE_ADMIN' || user?.role === 'SITE_INCHARGE' || isMunshiOrMate;
  const canDelete = user?.role === 'OWNER' || user?.role === 'OFFICE_ADMIN';

  useEffect(() => {
    loadData();
  }, [level, yojnaId, siteId, staffUserId]);

  // Auto-refresh for MUNSHI/MATE to update visibility timer
  useEffect(() => {
    if (!isMunshiOrMate) return;
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [level, yojnaId, siteId, staffUserId, isMunshiOrMate]);

  // Load sites for site selector (when no siteId in URL)
  useEffect(() => {
    if (!siteIdParam) {
      import('../api/siteApi').then(({ getSites }) => {
        getSites().then(res => setSites(res.data || [])).catch(() => {});
      });
    }
  }, [siteIdParam]);

  // Update form when context changes
  useEffect(() => {
    setForm(prev => ({
      ...prev,
      expenseLevel: level,
      yojna: yojnaId ? { id: yojnaId } : null,
      site: siteId ? { id: siteId } : null,
    }));
  }, [level, yojnaId, siteId]);

  const loadData = async () => {
    try {
      const params = {};
      if (level) params.level = level;
      if (yojnaId) params.yojnaId = yojnaId;
      if (siteId) params.siteId = siteId;
      if (staffUserId) params.staffUserId = staffUserId;

      const [expensesRes, categoriesRes] = await Promise.all([
        getOtherExpenses(params),
        getCategories(true),
      ]);
      setExpenses(expensesRes.data);
      setCategories(categoriesRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        category: { id: Number(form.category.id) },
        amount: Number(form.amount),
        date: form.date,
        description: form.description,
        paymentSource: form.paymentSource,
        expenseLevel: level,
        yojna: yojnaId ? { id: Number(yojnaId) } : null,
        site: siteId ? { id: Number(siteId) } : null,
        staffUser: staffUserId ? { id: Number(staffUserId) } : null,
      };
      const response = await createOtherExpense(payload);
      if (response.success) {
        setShowForm(false);
        setForm({ ...form, category: { id: '' }, amount: '', description: '' });
        loadData();
      } else {
        alert(response.message || 'Failed to create expense');
      }
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Failed to create expense');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense?')) return;
    try {
      await deleteOtherExpense(id);
      loadData();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const formatCurrency = (v) => v ? '₹' + Number(v).toLocaleString('en-IN') : '₹0';

  const getTitle = () => {
    // Find site name from loaded sites list
    const selectedSite = sites.find(s => String(s.id) === String(selectedSiteId || siteIdParam));
    const siteName = selectedSite?.siteName || siteId || '...';

    switch (level) {
      case 'YOJNA': return `Other Expenses — Yojna #${yojnaId}`;
      case 'SITE': return selectedSite ? `Other Expenses — ${selectedSite.siteName}` : `Other Expenses — Select a site`;
      case 'STAFF': return `Other Expenses — Staff #${staffUserId}`;
      default: return 'Other Expenses';
    }
  };

  const siteOnHold = selectedSiteId && sites.find(s => String(s.id) === String(selectedSiteId))?.status === 'ON_HOLD';

  if (loading) return <Layout><div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div></Layout>;

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
          ) : searchParams.get('yojnaId') ? (
            <Link to={`/yojnas/${searchParams.get('yojnaId')}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">← Back to Yojna</Link>
          ) : (
            <Link to="/sites" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">← Back to Sites</Link>
          )}
          <h1 className="text-2xl font-bold text-gray-900">{getTitle()}</h1>
        </div>
        {canAdd && (siteIdParam || yojnaIdParam || selectedSiteId || level === 'STAFF') && (
          <button onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            {showForm ? 'Cancel' : '+ Add Expense'}
          </button>
        )}
      </div>

      {isMunshiOrMate && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <span>⏳</span>
          <span>You can add expenses to your assigned site. Entries are visible for <strong>24 hours</strong> after creation and cannot be edited or deleted.</span>
        </div>
      )}

      {/* Site selector when no siteId is in URL */}
      {!siteIdParam && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Site</label>
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="w-full md:w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          >
            <option value="">Select a site...</option>
            {sites.map(s => <option key={s.id} value={s.id}>{s.siteName}</option>)}
          </select>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select required value={form.category.id}
                onChange={(e) => setForm({...form, category: { id: e.target.value }})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.categoryName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
              <input type="number" required step="0.01" min="0" value={form.amount}
                onChange={(e) => setForm({...form, amount: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" required value={form.date}
                onChange={(e) => setForm({...form, date: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Source</label>
              <select value={form.paymentSource}
                onChange={(e) => setForm({...form, paymentSource: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="COMPANY_ADVANCE">Company Advance</option>
                <option value="PERSONAL_MONEY">Personal Money</option>
                <option value="VENDOR_CREDIT">Vendor Credit</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" rows="2" />
            </div>
          </div>
          <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            Add Expense
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Category</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Payment Source</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Description</th>
              {isMunshiOrMate && <th className="text-center py-3 px-4 font-medium text-gray-500">Visibility</th>}
              {canDelete && <th className="text-left py-3 px-4 font-medium text-gray-500">Action</th>}
            </tr>
          </thead>
          <tbody>
            {expenses.map((exp) => {
              const remaining = isMunshiOrMate ? getTimeRemaining(exp.createdAt) : null;
              return (
                <tr key={exp.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{exp.category?.categoryName || 'N/A'}</td>
                  <td className="py-3 px-4">{formatCurrency(exp.amount)}</td>
                  <td className="py-3 px-4 text-gray-600">{exp.date}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                      {exp.paymentSource?.replace(/_/g, ' ') || 'N/A'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-gray-600 max-w-xs truncate">{exp.description || '-'}</td>
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
                  {canDelete && (
                    <td className="py-3 px-4">
                      <button onClick={() => handleDelete(exp.id)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
                    </td>
                  )}
                </tr>
              );
            })}
            {expenses.length === 0 && (
              <tr><td colSpan={canDelete ? (isMunshiOrMate ? 7 : 6) : (isMunshiOrMate ? 6 : 5)} className="py-8 text-center text-gray-400">No expenses found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </Layout>
  );
}
