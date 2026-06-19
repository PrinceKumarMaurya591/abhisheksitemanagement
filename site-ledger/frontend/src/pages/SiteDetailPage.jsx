import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getSiteDashboard } from '../api/dashboardApi';
import { getSite, updateSite, updateSiteStatus, assignStaff, archiveSite, restoreSite } from '../api/siteApi';
import { getSiteMaterialTransactions } from '../api/materialApi';
import { getYojnas } from '../api/yojnaApi';
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

  // Edit form state
  const [showEditForm, setShowEditForm] = useState(false);
  const [yojnas, setYojnas] = useState([]);
  const [showDetail, setShowDetail] = useState(null);
  const [materialTransactions, setMaterialTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  
  // Tab state for the new tabbed layout
  const [activeTab, setActiveTab] = useState('dashboard');
  const SITE_TABS = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'expenses', label: 'Expenses', icon: '💸' },
    { id: 'material', label: 'Material', icon: '📦' },
    { id: 'shifting', label: 'Material Shifting', icon: '🚛' },
    { id: 'labour', label: 'Labour', icon: '👷' },
    { id: 'photos', label: 'Photos', icon: '📷' },
    { id: 'documents', label: 'Documents', icon: '📄' },
    { id: 'payments', label: 'Payments', icon: '💳' },
    { id: 'cash-ledger', label: 'Cash Ledger', icon: '💰' },
    { id: 'reports', label: 'Reports', icon: '📈' },
  ];

  // Change Owner state
  const [showOwnerForm, setShowOwnerForm] = useState(false);
  const [ownerForm, setOwnerForm] = useState({ department: '', yojna: '' });
  const [ownerMsg, setOwnerMsg] = useState(null);

  const [editForm, setEditForm] = useState({
    siteName: '', department: '', workName: '', contractValue: '',
    workOrderNumber: '', startDate: '', endDate: '', address: '', district: '',
    yojna: null,
  });
  const [editMsg, setEditMsg] = useState(null);

  const canManage = currentUser?.role === 'OWNER' || currentUser?.role === 'OFFICE_ADMIN';
  const canViewFinance = currentUser?.role === 'OWNER' || currentUser?.role === 'OFFICE_ADMIN' || currentUser?.role === 'SITE_INCHARGE';

  useEffect(() => {
    loadData();
    if (canManage) {
      getYojnas().then(res => setYojnas(res.data)).catch(() => {});
    }
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
        const staffUsers = (res.data || []).filter(u =>
          STAFF_ROLES.includes(u.role) || ALLOWED_SITE_ROLES.includes(u.role)
        );
        setAllUsers(staffUsers);
      }
    } catch (err) {
      console.error('Failed to load users');
    }
  };

  const handleEditClick = () => {
    setEditForm({
      siteName: site.siteName || '',
      department: site.department || '',
      workName: site.workName || '',
      contractValue: site.contractValue || '',
      workOrderNumber: site.workOrderNumber || '',
      startDate: site.startDate || '',
      endDate: site.endDate || '',
      address: site.address || '',
      district: site.district || '',
      yojna: site.yojna?.id || '',
    });
    setShowEditForm(true);
    setEditMsg(null);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...editForm,
        contractValue: editForm.contractValue ? Number(editForm.contractValue) : null,
        yojna: editForm.yojna ? { id: Number(editForm.yojna) } : null,
      };
      const res = await updateSite(id, payload);
      if (res.success) {
        setEditMsg({ type: 'success', text: 'Site updated successfully!' });
        setShowEditForm(false);
        loadData();
      } else {
        setEditMsg({ type: 'error', text: res.message || 'Failed to update site' });
      }
    } catch (err) {
      setEditMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update site' });
    }
  };

  const handleOwnerChange = async (e) => {
    e.preventDefault();
    setOwnerMsg(null);
    try {
      const payload = {
        ...editForm, // Use same structure
        department: ownerForm.department,
        yojna: ownerForm.yojna ? { id: Number(ownerForm.yojna) } : null,
      };
      const res = await updateSite(id, payload);
      if (res.success) {
        setOwnerMsg({ type: 'success', text: 'Owner/assignment updated successfully!' });
        setShowOwnerForm(false);
        loadData();
      } else {
        setOwnerMsg({ type: 'error', text: res.message || 'Failed to update owner' });
      }
    } catch (err) {
      setOwnerMsg({ type: 'error', text: err.response?.data?.message || 'Failed to update owner' });
    }
  };

  // Initialize owner form when site loads
  useEffect(() => {
    if (site) {
      setOwnerForm({
        department: site.department || '',
        yojna: site.yojna?.id || '',
      });
    }
  }, [site?.id, site?.department, site?.yojna?.id]);

  // Load material transactions for detailed summary
  useEffect(() => {
    if (site && canManage && site.status !== 'ARCHIVED') {
      setLoadingTransactions(true);
      getSiteMaterialTransactions(id)
        .then(res => setMaterialTransactions(res.data || []))
        .catch(() => {})
        .finally(() => setLoadingTransactions(false));
    }
  }, [site?.id, site?.status]);

  const handleStatusChange = async (newStatus) => {
    try {
      await updateSiteStatus(id, { status: newStatus });
      loadData();
    } catch (err) {
      alert('Failed to update site status');
    }
  };

  const handleArchive = async () => {
    if (!window.confirm('Archive this site? It will be moved to the Archive folder and excluded from financial calculations.')) return;
    try {
      await archiveSite(id);
      loadData();
    } catch (err) {
      alert('Failed to archive site');
    }
  };

  const handleRestore = async () => {
    if (!window.confirm('Restore this site from archive?')) return;
    try {
      await restoreSite(id);
      loadData();
    } catch (err) {
      alert('Failed to restore site');
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

  const getStatusBadge = (status) => {
    const styles = {
      ACTIVE: 'bg-green-100 text-green-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
      ON_HOLD: 'bg-yellow-100 text-yellow-700',
      CANCELLED: 'bg-red-100 text-red-700',
      ARCHIVED: 'bg-gray-200 text-gray-600',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  if (loading) return <Layout><div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div></Layout>;
  if (!site) return <Layout><div className="text-center p-12 text-gray-500">Site not found</div></Layout>;

  const expenseChartData = dashboard?.expenseSummary
    ? Object.entries(dashboard.expenseSummary)
        .filter(([_, v]) => Number(v) > 0)
        .map(([name, amount]) => ({ name, amount: Number(amount) }))
    : [];

  // Calculate material financials from transactions
  const purchasedDetails = materialTransactions
    .filter(t => t.transactionType === 'PURCHASE')
    .map(t => ({
      materialName: t.material?.materialName || 'Unknown',
      quantity: Number(t.quantity || 0),
      rate: Number(t.rate || 0),
      totalAmount: Number(t.totalAmount || 0) || (Number(t.quantity || 0) * Number(t.rate || 0)),
      date: t.transactionDate,
      vendorName: t.vendorName,
    }));

  const shiftedDetails = materialTransactions
    .filter(t => t.transactionType === 'SHIFTING')
    .map(t => ({
      materialName: t.material?.materialName || 'Unknown',
      quantity: Number(t.quantity || 0),
      fromSite: t.fromSite?.siteName || 'Unknown',
      toSite: t.toSite?.siteName || 'Unknown',
      date: t.transactionDate,
    }));

  const consumedDetails = materialTransactions
    .filter(t => t.transactionType === 'CONSUMPTION')
    .map(t => ({
      materialName: t.material?.materialName || 'Unknown',
      quantity: Number(t.quantity || 0),
      date: t.transactionDate,
    }));

  // Calculate waste/loss: purchased - shifted - consumed
  const totalPurchasedQty = dashboard?.materialSummary?.purchased || 0;
  const totalShiftedQty = dashboard?.materialSummary?.shifted || 0;
  const totalConsumedQty = dashboard?.materialSummary?.consumed || 0;
  const totalBalanceQty = dashboard?.materialSummary?.balance || 0;
  const wasteQty = Math.max(0, Number(totalPurchasedQty) - Number(totalShiftedQty) - Number(totalConsumedQty) - Number(totalBalanceQty));

  return (
    <Layout>
    <div className="space-y-6">
      {/* Header with Back and action buttons */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/sites" className="text-indigo-600 hover:text-indigo-800">← Sites</Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{site.siteName}</h1>
            {site.workName && <p className="text-sm text-gray-500">{site.workName}{site.yojna?.yojnaName ? ` — ${site.yojna.yojnaName}` : ''}</p>}
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadge(site.status)}`}>{site.status}</span>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            {!showEditForm && (
              <button onClick={handleEditClick}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                ✏️ Edit
              </button>
            )}
            {/* Status management buttons */}
            {site.status === 'ACTIVE' && (
              <>
                <button onClick={() => handleStatusChange('COMPLETED')}
                  className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-green-200 border border-green-300">
                  ✓ Complete
                </button>
                <button onClick={() => handleStatusChange('ON_HOLD')}
                  className="bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-yellow-200 border border-yellow-300">
                  ⏸ Hold
                </button>
              </>
            )}
            {site.status === 'COMPLETED' && (
              <>
                <button onClick={() => handleStatusChange('ACTIVE')}
                  className="bg-orange-100 text-orange-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-orange-200 border border-orange-300">
                  ↻ Reopen
                </button>
                <button onClick={() => handleStatusChange('ON_HOLD')}
                  className="bg-yellow-100 text-yellow-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-yellow-200 border border-yellow-300">
                  ⏸ Hold
                </button>
              </>
            )}
            {site.status === 'ON_HOLD' && (
              <button onClick={() => handleStatusChange('ACTIVE')}
                className="bg-blue-100 text-blue-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-blue-200 border border-blue-300">
                ▶ Resume
              </button>
            )}
            {site.status !== 'ARCHIVED' ? (
              <button onClick={handleArchive}
                className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-gray-200 border border-gray-300">
                🗂️ Archive
              </button>
            ) : (
              <button onClick={handleRestore}
                className="bg-green-100 text-green-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-green-200 border border-green-300">
                ↻ Restore
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      {site.status !== 'ARCHIVED' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {SITE_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Edit Form */}
      {showEditForm && canManage && (
        <form onSubmit={handleEditSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">✏️ Edit Site Details</h2>
          {editMsg && (
            <div className={`px-4 py-3 rounded-lg text-sm ${
              editMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {editMsg.text}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Name *</label>
              <input type="text" required value={editForm.siteName}
                onChange={(e) => setEditForm({...editForm, siteName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nikay / Yojna *</label>
              <select required value={editForm.yojna || ''}
                onChange={(e) => setEditForm({...editForm, yojna: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">Select Yojna</option>
                {yojnas.map(y => (
                  <option key={y.id} value={y.id}>{y.yojnaName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
              <input type="text" required value={editForm.department}
                onChange={(e) => setEditForm({...editForm, department: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Name *</label>
              <input type="text" required value={editForm.workName}
                onChange={(e) => setEditForm({...editForm, workName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract Value</label>
              <input type="number" value={editForm.contractValue}
                onChange={(e) => setEditForm({...editForm, contractValue: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Order No</label>
              <input type="text" value={editForm.workOrderNumber}
                onChange={(e) => setEditForm({...editForm, workOrderNumber: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={editForm.startDate}
                onChange={(e) => setEditForm({...editForm, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={editForm.endDate}
                onChange={(e) => setEditForm({...editForm, endDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">District *</label>
              <input type="text" required value={editForm.district}
                onChange={(e) => setEditForm({...editForm, district: e.target.value})}
                placeholder="e.g. Lucknow, Varanasi"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address / Location *</label>
              <input type="text" required value={editForm.address}
                onChange={(e) => setEditForm({...editForm, address: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              Save Changes
            </button>
            <button type="button" onClick={() => setShowEditForm(false)}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium px-4 py-2">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Hierarchy Display */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-sm font-medium text-gray-500 mb-4">📊 Organization Hierarchy</h3>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg border border-blue-200 font-medium">
            🏢 {site.department || 'No Department'}
          </div>
          <span className="text-gray-400 text-xl">→</span>
          <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg border border-indigo-200 font-medium">
            📋 {site.yojna ? (
              <Link to={`/yojnas/${site.yojna.id}`} className="hover:underline">
                {site.yojna.yojnaName}
              </Link>
            ) : 'No Nikay'}
          </div>
          <span className="text-gray-400 text-xl">→</span>
          <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg border border-green-200 font-medium">
            🏗️ {site.workName || site.siteName || 'No Work'}
          </div>
        </div>
      </div>

      {/* Change Owner Section */}
      {canManage && site.status !== 'ARCHIVED' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">🔄 Change Owner / Assignment</h3>
            <button
              onClick={() => setShowOwnerForm(!showOwnerForm)}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              {showOwnerForm ? 'Cancel' : 'Change Owner'}
            </button>
          </div>

          {showOwnerForm && (
            <form onSubmit={handleOwnerChange} className="space-y-4">
              {ownerMsg && (
                <div className={`px-4 py-3 rounded-lg text-sm ${
                  ownerMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {ownerMsg.text}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                  <input type="text" required value={ownerForm.department}
                    onChange={(e) => setOwnerForm({...ownerForm, department: e.target.value})}
                    placeholder="e.g. PWD, Nagar Nigam"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nikay / Yojna *</label>
                  <select required value={ownerForm.yojna || ''}
                    onChange={(e) => setOwnerForm({...ownerForm, yojna: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                    <option value="">Select Yojna</option>
                    {yojnas.map(y => (
                      <option key={y.id} value={y.id}>{y.yojnaName}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-500">Changing the Department or Nikay will update the site's organizational hierarchy.</p>
              <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                Update Owner
              </button>
            </form>
          )}

          {/* Current assignment info */}
          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-500">Current Department</span>
              <p className="font-medium">{site.department || '-'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-500">Current Nikay</span>
              <p className="font-medium">{site.yojna?.yojnaName || '-'}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-500">Work Name</span>
              <p className="font-medium">{site.workName || '-'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Site Details */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div><span className="text-sm text-gray-500">Work Order</span><p className="font-medium">{site.workOrderNumber || '-'}</p></div>
        <div><span className="text-sm text-gray-500">District</span><p className="font-medium">{site.district || '-'}</p></div>
        <div><span className="text-sm text-gray-500">Start Date</span><p className="font-medium">{site.startDate || '-'}</p></div>
        <div><span className="text-sm text-gray-500">End Date</span><p className="font-medium">{site.endDate || '-'}</p></div>
        <div className="md:col-span-4"><span className="text-sm text-gray-500">Address</span><p className="font-medium">{site.address || '-'}</p></div>
      </div>

      {/* ========== DASHBOARD TAB ========== */}
      {activeTab === 'dashboard' && canViewFinance && site.status !== 'ARCHIVED' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500">📋 Contract Value</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{formatCurrency(dashboard?.contractValue)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500">💰 Total Received</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(dashboard?.totalReceived)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500">⏳ Pending Amount</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(dashboard?.pendingAmount)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500">💸 Total Expense</p>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(dashboard?.totalExpense)}</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-500">📊 Progress</p>
              <span className="text-lg font-bold text-indigo-600">{dashboard?.progressPercentage || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-indigo-600 h-4 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Number(dashboard?.progressPercentage || 0))}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>₹0</span>
              <span>₹{Number(dashboard?.contractValue || 0).toLocaleString('en-IN')}</span>
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

          {/* Expense Breakdown Chart */}
          {expenseChartData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={expenseChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Bar dataKey="amount" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </>
      )}

      {/* Show archived notice */}
      {site.status === 'ARCHIVED' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          <p className="font-medium mb-1">🗂️ This site is archived</p>
          <p>Archived sites are hidden from active lists and excluded from all financial calculations.
          {canManage && ' You can restore it using the "Restore" button above.'}</p>
        </div>
      )}

      {/* ========== DASHBOARD TAB — Material Summary ========== */}
      {activeTab === 'dashboard' && site.status !== 'ARCHIVED' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">📦 Material Summary</h3>
            <Link to={`/materials?siteId=${id}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
              View All →
            </Link>
          </div>
          {dashboard?.materialSummary ? (
            <div className="space-y-4">
              {/* Purchased */}
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                <div className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowDetail(showDetail === 'purchased' ? null : 'purchased')}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📥</span>
                    <span className="font-medium">Purchased</span>
                    <span className="text-xs text-gray-500">({Number(dashboard.materialSummary.purchased).toFixed(2)} units)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-700">{formatCurrency(purchasedDetails.reduce((s, d) => s + d.totalAmount, 0))}</span>
                    <span className="text-blue-400 text-xs">{showDetail === 'purchased' ? '▲' : '▼'} View</span>
                  </div>
                </div>
                {showDetail === 'purchased' && (
                  <div className="mt-3 space-y-2">
                    {purchasedDetails.length === 0 ? (
                      <p className="text-xs text-blue-500">No purchase transactions recorded</p>
                    ) : (
                      purchasedDetails.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1.5">
                          <div>
                            <span className="font-medium">{d.materialName}</span>
                            <span className="text-gray-500 ml-2">Qty: {d.quantity.toFixed(2)}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-medium">Rate: {formatCurrency(d.rate)}</div>
                            <div className="text-blue-600">Amount: {formatCurrency(d.totalAmount)}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Shifted */}
              <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                <div className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowDetail(showDetail === 'shifted' ? null : 'shifted')}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">↔️</span>
                    <span className="font-medium">Shifted</span>
                    <span className="text-xs text-gray-500">({Number(dashboard.materialSummary.shifted).toFixed(2)} units)</span>
                  </div>
                  <span className="text-green-400 text-xs">{showDetail === 'shifted' ? '▲' : '▼'} View</span>
                </div>
                {showDetail === 'shifted' && (
                  <div className="mt-3 space-y-2">
                    {shiftedDetails.length === 0 ? (
                      <p className="text-xs text-green-500">No material shifts recorded</p>
                    ) : (
                      shiftedDetails.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1.5">
                          <div>
                            <span className="font-medium">{d.materialName}</span>
                            <span className="text-gray-500 ml-2">{d.quantity.toFixed(2)} units</span>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-500">{d.fromSite} → {d.toSite}</span>
                            <div className="text-gray-400">{d.date}</div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Consumed */}
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
                <div className="flex items-center justify-between cursor-pointer"
                  onClick={() => setShowDetail(showDetail === 'consumed' ? null : 'consumed')}>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔨</span>
                    <span className="font-medium">Consumed</span>
                    <span className="text-xs text-gray-500">({Number(dashboard.materialSummary.consumed).toFixed(2)} units)</span>
                  </div>
                  <span className="text-orange-400 text-xs">{showDetail === 'consumed' ? '▲' : '▼'} View</span>
                </div>
                {showDetail === 'consumed' && (
                  <div className="mt-3 space-y-2">
                    {consumedDetails.length === 0 ? (
                      <p className="text-xs text-orange-500">No consumption recorded</p>
                    ) : (
                      consumedDetails.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1.5">
                          <span className="font-medium">{d.materialName}</span>
                          <div className="text-right">
                            <span className="font-bold text-orange-600">{d.quantity.toFixed(2)}</span>
                            <div className="text-gray-400">{d.date}</div>
                          </div>
                        </div>
                      ))
                    )}
                    {wasteQty > 0 && (
                      <div className="flex items-center justify-between text-xs bg-red-50 rounded px-2 py-1.5 border border-red-100">
                        <span className="font-medium text-red-600">⚠️ Waste / Loss</span>
                        <span className="font-bold text-red-600">{wasteQty.toFixed(2)} units</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Balance Summary */}
              <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚖️</span>
                    <span className="font-medium">Balance</span>
                  </div>
                  <span className="font-bold text-purple-700">{Number(dashboard.materialSummary.balance).toFixed(2)} units</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400 text-center py-12">No material data</p>
          )}
        </div>
      )}

      {/* ========== MATERIAL SHIFTING TAB ========== */}
      {activeTab === 'shifting' && site.status !== 'ARCHIVED' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <span className="text-5xl block mb-4">🚛</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Material Shifting (Yard to Site)</h3>
          <p className="text-gray-500 mb-6">Track bulk material movement from yard to site with transport cost calculation</p>
          <Link
            to={`/material-shifting?siteId=${id}`}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            🚛 Open Material Shifting Page →
          </Link>
        </div>
      )}

      {/* ========== EXPENSES TAB ========== */}
      {activeTab === 'expenses' && site.status !== 'ARCHIVED' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <span className="text-5xl block mb-4">💸</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Site Expenses</h3>
          <p className="text-gray-500 mb-6">View and manage all expenses for this site</p>
          <Link to={`/expenses?siteId=${id}`}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700">
            💸 Open Expenses Page →
          </Link>
        </div>
      )}

      {/* ========== MATERIAL TAB ========== */}
      {activeTab === 'material' && site.status !== 'ARCHIVED' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <span className="text-5xl block mb-4">📦</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Site Materials</h3>
          <p className="text-gray-500 mb-6">Track stock materials, purchases, and consumption</p>
          <Link to={`/materials?siteId=${id}`}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700">
            📦 Open Materials Page →
          </Link>
        </div>
      )}

      {/* ========== LABOUR TAB ========== */}
      {activeTab === 'labour' && site.status !== 'ARCHIVED' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <span className="text-5xl block mb-4">👷</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Labour Management</h3>
          <p className="text-gray-500 mb-6">Register labourers, mark attendance, calculate wages, process payments</p>
          <Link to={`/labour?siteId=${id}`}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700">
            👷 Open Labour Page →
          </Link>
        </div>
      )}

      {/* ========== PHOTOS TAB ========== */}
      {activeTab === 'photos' && site.status !== 'ARCHIVED' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <span className="text-5xl block mb-4">📷</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Site Photos</h3>
          <p className="text-gray-500 mb-6">Upload and view site photos</p>
          <Link to={`/documents?siteId=${id}`}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700">
            📷 Open Documents Page →
          </Link>
        </div>
      )}

      {/* ========== DOCUMENTS TAB ========== */}
      {activeTab === 'documents' && site.status !== 'ARCHIVED' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <span className="text-5xl block mb-4">📄</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Site Documents</h3>
          <p className="text-gray-500 mb-6">Upload, view, and manage tender notices, DPR, BOQ, bills, and other documents</p>
          <Link to={`/documents?siteId=${id}`}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700">
            📄 Open Documents Page →
          </Link>
        </div>
      )}

      {/* ========== PAYMENTS TAB ========== */}
      {activeTab === 'payments' && site.status !== 'ARCHIVED' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <span className="text-5xl block mb-4">💳</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Department Payments</h3>
          <p className="text-gray-500 mb-6">Track payments received from department against contract value</p>
          <Link to={`/payments?siteId=${id}`}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700">
            💳 Open Payments Page →
          </Link>
        </div>
      )}

      {/* ========== CASH LEDGER TAB ========== */}
      {activeTab === 'cash-ledger' && site.status !== 'ARCHIVED' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <span className="text-5xl block mb-4">💰</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Staff Cash Ledger</h3>
          <p className="text-gray-500 mb-6">View site-wise cash balance for assigned staff (Munshi/Incharge)</p>
          <Link to={`/my-balance?siteId=${id}`}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-indigo-700">
            💰 Open Cash Ledger →
          </Link>
        </div>
      )}

      {/* ========== REPORTS TAB ========== */}
      {activeTab === 'reports' && site.status !== 'ARCHIVED' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center">
          <span className="text-5xl block mb-4">📈</span>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Site Reports</h3>
          <p className="text-gray-500 mb-2">Generate and export site reports</p>
          <p className="text-xs text-gray-400 mb-6">Comprehensive report with Summary, Expenses, Materials, Labour, and Ledger details</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <button
              onClick={async () => {
                try {
                  const { downloadSiteExcel, triggerDownload } = await import('../api/reportApi');
                  const blob = await downloadSiteExcel(id);
                  triggerDownload(blob, `site-ledger-report-${id}.xlsx`);
                } catch (e) {
                  alert('Failed to download Excel report');
                }
              }}
              className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              📥 Download Excel Report
            </button>
            <button
              onClick={async () => {
                try {
                  const { downloadSitePdf, triggerDownload } = await import('../api/reportApi');
                  const blob = await downloadSitePdf(id);
                  triggerDownload(blob, `site-ledger-report-${id}.pdf`);
                } catch (e) {
                  alert('Failed to download PDF report');
                }
              }}
              className="inline-flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              📥 Download PDF Report
            </button>
          </div>
        </div>
      )}

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
      {site.status !== 'ARCHIVED' && (
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
          </div>
        </div>
      )}
    </div>
    </Layout>
  );
}
