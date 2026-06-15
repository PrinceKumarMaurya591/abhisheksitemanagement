import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getYojna, getYojnaSites } from '../api/yojnaApi';
import { getOtherExpenses } from '../api/otherExpenseApi';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export default function YojnaDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [yojna, setYojna] = useState(null);
  const [sites, setSites] = useState([]);
  const [otherExpenses, setOtherExpenses] = useState([]);
  const [activeTab, setActiveTab] = useState('sites');
  const [loading, setLoading] = useState(true);

  const canManage = user?.role === 'OWNER' || user?.role === 'OFFICE_ADMIN';
  const canViewFinancial = user?.role === 'OWNER' || user?.role === 'OFFICE_ADMIN';

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [yojnaRes, sitesRes] = await Promise.all([
        getYojna(id),
        getYojnaSites(id),
      ]);
      setYojna(yojnaRes.data);
      setSites(sitesRes.data);

      // Load other expenses for this yojna
      try {
        const expensesRes = await getOtherExpenses({ level: 'YOJNA', yojnaId: id });
        setOtherExpenses(expensesRes.data);
      } catch (e) {
        // Other expenses may not exist yet
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v) => v ? '₹' + Number(v).toLocaleString('en-IN') : '₹0';

  if (loading) return <Layout><div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div></Layout>;
  if (!yojna) return <Layout><div className="text-center p-12 text-gray-500">Yojna not found</div></Layout>;

  return (
    <Layout>
    <div className="space-y-6">
      <div>
        <Link to="/yojnas" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">← Back to Yojnas</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">{yojna.yojnaName}</h1>
        {yojna.description && <p className="text-gray-500 mt-1">{yojna.description}</p>}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Total Sites</p>
          <p className="text-2xl font-bold text-gray-900">{sites.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-sm text-gray-500">Active Sites</p>
          <p className="text-2xl font-bold text-green-600">{sites.filter(s => s.status === 'ACTIVE').length}</p>
        </div>
        {canViewFinancial && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-sm text-gray-500">Total Contract Value</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(sites.reduce((sum, s) => sum + (Number(s.contractValue) || 0), 0))}
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <p className="text-sm text-gray-500">Other Expenses</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(otherExpenses.reduce((sum, e) => sum + Number(e.amount), 0))}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button onClick={() => setActiveTab('sites')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'sites' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            Sites ({sites.length})
          </button>
          <button onClick={() => setActiveTab('expenses')}
            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'expenses' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            Other Expenses ({otherExpenses.length})
          </button>
        </nav>
      </div>

      {/* Sites Tab */}
      {activeTab === 'sites' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Site Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Work Name</th>
                {canViewFinancial && <th className="text-left py-3 px-4 font-medium text-gray-500">Contract Value</th>}
                <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{site.siteName}</td>
                  <td className="py-3 px-4 text-gray-600">{site.workName || '-'}</td>
                  {canViewFinancial && <td className="py-3 px-4">{formatCurrency(site.contractValue)}</td>}
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      site.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      site.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}>{site.status}</span>
                  </td>
                  <td className="py-3 px-4">
                    <Link to={`/sites/${site.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium">View →</Link>
                  </td>
                </tr>
              ))}
              {sites.length === 0 && (
                <tr><td colSpan={canViewFinancial ? 5 : 4} className="py-8 text-center text-gray-400">No sites in this Yojna</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === 'expenses' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Other Expenses — {yojna.yojnaName}</h3>
            {canManage && (
              <Link to={`/other-expenses?level=YOJNA&yojnaId=${id}`}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                + Add Expense
              </Link>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Category</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Description</th>
                </tr>
              </thead>
              <tbody>
                {otherExpenses.map((exp) => (
                  <tr key={exp.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{exp.category?.categoryName || 'N/A'}</td>
                    <td className="py-3 px-4">{formatCurrency(exp.amount)}</td>
                    <td className="py-3 px-4 text-gray-600">{exp.date}</td>
                    <td className="py-3 px-4 text-gray-600">{exp.description || '-'}</td>
                  </tr>
                ))}
                {otherExpenses.length === 0 && (
                  <tr><td colSpan={4} className="py-8 text-center text-gray-400">No other expenses for this Yojna</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
}
