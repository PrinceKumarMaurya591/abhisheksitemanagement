import { useState, useEffect } from 'react';
import { getSites, createSite, updateSiteStatus } from '../api/siteApi';
import { getYojnas } from '../api/yojnaApi';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export default function SitesPage() {
  const { user } = useAuth();
  const [sites, setSites] = useState([]);
  const [yojnas, setYojnas] = useState([]);
  const [selectedYojnaId, setSelectedYojnaId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    siteName: '', department: '', workName: '', contractValue: '',
    workOrderNumber: '', startDate: '', endDate: '', address: '', yojna: null,
  });

  useEffect(() => { loadData(); }, []);

  const canManageStatus = user?.role === 'OWNER' || user?.role === 'OFFICE_ADMIN';
  const canCreateSite = user?.role === 'OWNER' || user?.role === 'OFFICE_ADMIN';

  const loadData = async () => {
    try {
      const [sitesRes, yojnasRes] = await Promise.all([
        getSites(),
        getYojnas(),
      ]);
      setSites(sitesRes.data);
      setYojnas(yojnasRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSites = selectedYojnaId
    ? sites.filter(s => s.yojna?.id === Number(selectedYojnaId))
    : sites;

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        contractValue: form.contractValue ? Number(form.contractValue) : null,
        yojna: form.yojna ? { id: Number(form.yojna) } : null,
      };
      await createSite(payload);
      setShowForm(false);
      setForm({ siteName: '', department: '', workName: '', contractValue: '', workOrderNumber: '', startDate: '', endDate: '', address: '', yojna: null });
      loadData();
    } catch (err) {
      alert('Failed to create site');
    }
  };

  const handleStatusChange = async (siteId, newStatus) => {
    try {
      await updateSiteStatus(siteId, { status: newStatus });
      loadData();
    } catch (err) {
      alert('Failed to update site status');
    }
  };

  const formatCurrency = (v) => v ? '₹' + Number(v).toLocaleString('en-IN') : '₹0';

  if (loading) return <Layout><div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div></Layout>;

  return (
    <Layout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Sites / Sections</h1>
        {canCreateSite && (
          <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            {showForm ? 'Cancel' : '+ New Site'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Name *</label>
              <input type="text" required value={form.siteName} onChange={(e) => setForm({...form, siteName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nikay / Yojna *</label>
              <select required value={form.yojna || ''} onChange={(e) => setForm({...form, yojna: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
                <option value="">Select Yojna</option>
                {yojnas.filter(y => y.status === 'ACTIVE').map(y => (
                  <option key={y.id} value={y.id}>{y.yojnaName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input type="text" value={form.department} onChange={(e) => setForm({...form, department: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Name</label>
              <input type="text" value={form.workName} onChange={(e) => setForm({...form, workName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contract Value</label>
              <input type="number" value={form.contractValue} onChange={(e) => setForm({...form, contractValue: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Order No</label>
              <input type="text" value={form.workOrderNumber} onChange={(e) => setForm({...form, workOrderNumber: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={form.startDate} onChange={(e) => setForm({...form, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={form.endDate} onChange={(e) => setForm({...form, endDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input type="text" value={form.address} onChange={(e) => setForm({...form, address: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            Create Site
          </button>
        </form>
      )}

      {/* Yojna Filter */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-gray-700">Filter by Yojna:</label>
        <select value={selectedYojnaId} onChange={(e) => setSelectedYojnaId(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
          <option value="">All Yojnas</option>
          {yojnas.map(y => (
            <option key={y.id} value={y.id}>{y.yojnaName}</option>
          ))}
        </select>
        <span className="text-sm text-gray-400">{filteredSites.length} site(s)</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Site Name</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Yojna</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Work Name</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSites.map((site) => (
              <tr key={site.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{site.siteName}</td>
                <td className="py-3 px-4 text-gray-600">
                  {site.yojna ? (
                    <Link to={`/yojnas/${site.yojna.id}`} className="text-indigo-600 hover:text-indigo-800 text-xs">
                      {site.yojna.yojnaName}
                    </Link>
                  ) : '-'}
                </td>
                <td className="py-3 px-4 text-gray-600">{site.workName || '-'}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    site.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                    site.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>{site.status}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Link to={`/sites/${site.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium">View →</Link>
                    {canManageStatus && site.status === 'ACTIVE' && (
                      <button onClick={() => handleStatusChange(site.id, 'COMPLETED')}
                        className="text-green-600 hover:text-green-800 text-xs font-medium bg-green-50 px-2 py-1 rounded">
                        ✓ Complete
                      </button>
                    )}
                    {canManageStatus && site.status === 'COMPLETED' && (
                      <button onClick={() => handleStatusChange(site.id, 'ACTIVE')}
                        className="text-orange-600 hover:text-orange-800 text-xs font-medium bg-orange-50 px-2 py-1 rounded">
                        ↻ Reopen
                      </button>
                    )}
                    {canManageStatus && (site.status === 'ACTIVE' || site.status === 'COMPLETED') && (
                      <button onClick={() => handleStatusChange(site.id, 'ON_HOLD')}
                        className="text-yellow-600 hover:text-yellow-800 text-xs font-medium bg-yellow-50 px-2 py-1 rounded">
                        ⏸ Hold
                      </button>
                    )}
                    {canManageStatus && site.status !== 'CANCELLED' && (
                      <button onClick={() => handleStatusChange(site.id, 'CANCELLED')}
                        className="text-red-600 hover:text-red-800 text-xs font-medium bg-red-50 px-2 py-1 rounded">
                        ✕ Cancel
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filteredSites.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">No sites found for this filter</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </Layout>
  );
}
