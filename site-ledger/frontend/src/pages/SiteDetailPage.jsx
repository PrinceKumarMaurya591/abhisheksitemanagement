import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getSiteDashboard } from '../api/dashboardApi';
import { getSite, assignStaff } from '../api/siteApi';
import { getUsers } from '../api/userApi';
import { useAuth } from '../context/AuthContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

const STAFF_ROLES = ['SITE_INCHARGE', 'MUNSHI', 'MATE'];
const ALLOWED_SITE_ROLES = ['SUBCONTRACTOR', 'SUBCONTRACTOR_ADMIN'];

export default function SiteDetailPage() {
  const { user: currentUser } = useAuth();
  const { id } = useParams();
  const [site, setSite] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [assignMsg, setAssignMsg] = useState(null);
  const [showAssign, setShowAssign] = useState(false);

  const canManage = currentUser?.role === 'OWNER' || currentUser?.role === 'OFFICE_ADMIN';

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      const [siteRes, dashRes] = await Promise.all([
        getSite(id),
        getSiteDashboard(id),
      ]);
      setSite(siteRes.data);
      setDashboard(dashRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await getUsers();
      if (res.success) {
        // Filter to STAFF roles + SUBCONTRACTOR roles that can be assigned
        const staffUsers = (res.data || []).filter(u =>
          STAFF_ROLES.includes(u.role) || ALLOWED_SITE_ROLES.includes(u.role)
        );
        setAllUsers(staffUsers);
      }
    } catch (err) {
      console.error('Failed to load users');
    }
  };

  const handleAssignToggle = () => {
    setShowAssign(!showAssign);
    if (!showAssign) {
      loadUsers();
      setAssignMsg(null);
      setSelectedUserIds([]);
    }
  };

  const handleAssign = async () => {
    if (selectedUserIds.length === 0) {
      setAssignMsg({ type: 'error', text: 'Please select at least one user' });
      return;
    }
    try {
      const res = await assignStaff(id, selectedUserIds);
      if (res.success) {
        setAssignMsg({ type: 'success', text: `${selectedUserIds.length} user(s) assigned successfully!` });
        setSelectedUserIds([]);
        loadData();
      } else {
        setAssignMsg({ type: 'error', text: res.message || 'Failed to assign staff' });
      }
    } catch (err) {
      setAssignMsg({ type: 'error', text: err.response?.data?.message || 'Failed to assign staff' });
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const formatCurrency = (v) => v ? '₹' + Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 }) : '₹0';

  if (loading) return <Layout><div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div></Layout>;
  if (!site) return <Layout><div className="text-center p-12 text-gray-500">Site not found</div></Layout>;

  const expenseChartData = dashboard?.expenseSummary
    ? Object.entries(dashboard.expenseSummary)
        .filter(([_, v]) => Number(v) > 0)
        .map(([name, amount]) => ({ name, amount: Number(amount) }))
    : [];

  return (
    <Layout>
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/sites" className="text-indigo-600 hover:text-indigo-800">← Sites</Link>
        <h1 className="text-2xl font-bold text-gray-900">{site.siteName}</h1>
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
          site.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
          site.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
        }`}>{site.status}</span>
      </div>

      {/* Site Info — includes Yojna */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div><span className="text-sm text-gray-500">Yojna / Nikay</span>
          <p className="font-medium">
            {site.yojna ? (
              <Link to={`/yojnas/${site.yojna.id}`} className="text-indigo-600 hover:text-indigo-800">
                {site.yojna.yojnaName}
              </Link>
            ) : '-'}
          </p>
        </div>
        <div><span className="text-sm text-gray-500">Work Name</span><p className="font-medium">{site.workName || '-'}</p></div>
        <div><span className="text-sm text-gray-500">Department</span><p className="font-medium">{site.department || '-'}</p></div>
        <div><span className="text-sm text-gray-500">Work Order</span><p className="font-medium">{site.workOrderNumber || '-'}</p></div>
        <div><span className="text-sm text-gray-500">Start Date</span><p className="font-medium">{site.startDate || '-'}</p></div>
        <div><span className="text-sm text-gray-500">End Date</span><p className="font-medium">{site.endDate || '-'}</p></div>
        <div><span className="text-sm text-gray-500">Address</span><p className="font-medium">{site.address || '-'}</p></div>
      </div>

      {/* Financial KPIs — Only for OWNER/OFFICE_ADMIN */}
      {canManage && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500">Contract Value</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{formatCurrency(dashboard?.contractValue)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500">Total Received</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(dashboard?.totalReceived)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500">Pending Amount</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(dashboard?.pendingAmount)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500">Total Expense</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(dashboard?.totalExpense)}</p>
            </div>
          </div>

          {/* Profit/Loss */}
          <div className={`rounded-xl p-6 ${(dashboard?.profitLoss || 0) >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Profit / Loss</p>
                <p className={`text-3xl font-bold mt-1 ${(dashboard?.profitLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(dashboard?.profitLoss)}
                </p>
              </div>
              <span className="text-5xl">{(dashboard?.profitLoss || 0) >= 0 ? '📈' : '📉'}</span>
            </div>
          </div>
        </>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
          {expenseChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={expenseChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="amount" fill="#4F46E5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-center py-12">No expense data</p>
          )}
        </div>

        {/* Material Summary */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Material Summary</h3>
          {dashboard?.materialSummary ? (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                <span className="font-medium">Purchased</span>
                <span className="font-bold text-blue-700">{Number(dashboard.materialSummary.purchased).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="font-medium">Shifted</span>
                <span className="font-bold text-green-700">{Number(dashboard.materialSummary.shifted).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                <span className="font-medium">Consumed</span>
                <span className="font-bold text-orange-700">{Number(dashboard.materialSummary.consumed).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                <span className="font-medium">Balance</span>
                <span className="font-bold text-purple-700">{Number(dashboard.materialSummary.balance).toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-12">No material data</p>
          )}
        </div>
      </div>

      {/* Assign Staff Section — Only for OWNER/OFFICE_ADMIN */}
      {canManage && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">👥 Assign Staff to Site</h3>
            <button
              onClick={handleAssignToggle}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              {showAssign ? 'Cancel' : '+ Assign Staff'}
            </button>
          </div>

          {assignMsg && (
            <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${
              assignMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {assignMsg.text}
            </div>
          )}

          {showAssign && (
            <div>
              <p className="text-sm text-gray-500 mb-3">
                Select Site Incharge, Munshi, or Subcontractor to assign to this site:
              </p>
              {allUsers.length === 0 ? (
                <p className="text-sm text-gray-400">No staff users available. Create users first.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {allUsers.map(u => (
                    <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={() => toggleUserSelection(u.id)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{u.fullName || u.username}</span>
                          <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.role === 'SITE_INCHARGE' ? 'bg-blue-100 text-blue-700' :
                            u.role === 'MUNSHI' ? 'bg-yellow-100 text-yellow-700' :
                            u.role === 'MATE' ? 'bg-orange-100 text-orange-700' :
                            u.role === 'SUBCONTRACTOR' ? 'bg-green-100 text-green-700' :
                            'bg-purple-100 text-purple-700'
                          }`}>{u.role}</span>
                        </div>
                        <span className="text-xs text-gray-400">{u.email}</span>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              {selectedUserIds.length > 0 && (
                <button
                  onClick={handleAssign}
                  className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Assign {selectedUserIds.length} User(s) to Site
                </button>
              )}
            </div>
          )}

          {/* Show currently assigned staff */}
          {site.assignedStaff && site.assignedStaff.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">Currently Assigned Staff:</p>
              <div className="flex flex-wrap gap-2">
                {site.assignedStaff.map(staff => (
                  <span key={staff.id} className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-sm font-medium">
                    {staff.fullName || staff.username}
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                      staff.role === 'SITE_INCHARGE' ? 'bg-blue-100' :
                      staff.role === 'MUNSHI' ? 'bg-yellow-100' :
                      staff.role === 'MATE' ? 'bg-orange-100' : 'bg-green-100'
                    }`}>{staff.role}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link to={`/ledger?siteId=${id}`} className="flex items-center gap-2 p-3 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
            <span>📒</span><span className="font-medium text-sm">View Ledger</span>
          </Link>
          <Link to={`/materials?siteId=${id}`} className="flex items-center gap-2 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
            <span>📦</span><span className="font-medium text-sm">Materials</span>
          </Link>
          <Link to={`/labour?siteId=${id}`} className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
            <span>👷</span><span className="font-medium text-sm">Labour</span>
          </Link>
          <Link to={`/advances?siteId=${id}`} className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
            <span>💰</span><span className="font-medium text-sm">Advances</span>
          </Link>
          <Link to={`/other-expenses?level=SITE&siteId=${id}`} className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
            <span>📝</span><span className="font-medium text-sm">Other Expenses</span>
          </Link>
        </div>
      </div>
    </div>
    </Layout>
  );
}
