import { useState, useEffect } from 'react';
import { getSites, createSite, updateSite, updateSiteStatus, archiveSite, restoreSite, getArchivedSites } from '../api/siteApi';
import { getYojnas } from '../api/yojnaApi';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export default function SitesPage() {
  const { user } = useAuth();
  const [sites, setSites] = useState([]);
  const [archivedSites, setArchivedSites] = useState([]);
  const [yojnas, setYojnas] = useState([]);
  const [selectedYojnaId, setSelectedYojnaId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingSite, setEditingSite] = useState(null);
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

      // Load archived sites separately if user can manage
      if (canManageStatus) {
        try {
          const archivedRes = await getArchivedSites();
          setArchivedSites(archivedRes.data || []);
        } catch (e) {
          // Archive endpoint not available
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredSites = selectedYojnaId
    ? sites.filter(s => s.yojna?.id === Number(selectedYojnaId))
    : sites;

  const resetForm = () => {
    setForm({
      siteName: '', department: '', workName: '', contractValue: '',
      workOrderNumber: '', startDate: '', endDate: '', address: '', yojna: null,
    });
    setEditingSite(null);
  };

  const handleEditClick = (site) => {
    setForm({
      siteName: site.siteName || '',
      department: site.department || '',
      workName: site.workName || '',
      contractValue: site.contractValue || '',
      workOrderNumber: site.workOrderNumber || '',
      startDate: site.startDate || '',
      endDate: site.endDate || '',
      address: site.address || '',
      yojna: site.yojna?.id || '',
    });
    setEditingSite(site);
    setShowForm(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        contractValue: form.contractValue ? Number(form.contractValue) : null,
        yojna: form.yojna ? { id: Number(form.yojna) } : null,
      };

      if (editingSite) {
        await updateSite(editingSite.id, payload);
      } else {
        await createSite(payload);
      }

      setShowForm(false);
      resetForm();
      loadData();
    } catch (err) {
      alert('Failed to save site');
    }
  };

  const handleArchive = async (siteId) => {
    if (!window.confirm('Are you sure you want to archive this site? It will be moved to the Archive folder.')) return;
    try {
      await archiveSite(siteId);
      loadData();
    } catch (err) {
      alert('Failed to archive site');
    }
  };

  const handleRestore = async (siteId) => {
    if (!window.confirm('Restore this site from archive?')) return;
    try {
      await restoreSite(siteId);
      loadData();
    } catch (err) {
      alert('Failed to restore site');
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

  return (
    <Layout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sites / Sections</h1>
          <p className="text-sm text-gray-500 mt-1">Manage construction sites and sections under each Yojna</p>
        </div>
        <div className="flex items-center gap-3">
          {canManageStatus && (
            <button
              onClick={() => { setShowArchived(!showArchived); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                showArchived
                  ? 'bg-gray-100 border-gray-300 text-gray-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              🗂️ {showArchived ? 'Active Sites' : `Archive (${archivedSites.length})`}
            </button>
          )}
          {canCreateSite && !showArchived && (
            <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              {showForm ? 'Cancel' : '+ New Site'}
            </button>
          )}
        </div>
      </div>

      {/* Show archived sites section */}
      {showArchived && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <span>🗂️</span>
            <span>Archived sites are hidden from active lists and excluded from financial calculations.</span>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-500">🏢 Department</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">📋 Nikay / Yojna</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">🏗️ Work Name / Site</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {archivedSites.map((site) => (
                  <tr key={site.id} className="border-b border-gray-100 hover:bg-gray-50 opacity-70">
                    <td className="py-3 px-4 text-gray-600">{site.department || '-'}</td>
                    <td className="py-3 px-4 text-gray-600">
                      {site.yojna ? (
                        <Link to={`/yojnas/${site.yojna.id}`} className="text-indigo-600 hover:text-indigo-800 text-xs">
                          {site.yojna.yojnaName}
                        </Link>
                      ) : '-'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium">{site.siteName}</div>
                      {site.workName && <div className="text-xs text-gray-400">{site.workName}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(site.status)}`}>{site.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <Link to={`/sites/${site.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium text-xs">View →</Link>
                        {canManageStatus && (
                          <button onClick={() => handleRestore(site.id)}
                            className="text-green-600 hover:text-green-800 text-xs font-medium bg-green-50 px-2 py-1 rounded">
                            ↻ Restore
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {archivedSites.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-gray-400">No archived sites</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Site Form */}
      {showForm && !showArchived && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{editingSite ? 'Edit Site' : 'Create New Site'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Name / Section Name *</label>
              <input type="text" required value={form.siteName} onChange={(e) => setForm({...form, siteName: e.target.value})}
                placeholder="e.g. Main Building, Road Section A"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
              <input type="text" required value={form.department} onChange={(e) => setForm({...form, department: e.target.value})}
                placeholder="e.g. PWD, Nagar Nigam"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Name *</label>
              <input type="text" required value={form.workName} onChange={(e) => setForm({...form, workName: e.target.value})}
                placeholder="e.g. Construction of Building"
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
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address / Location *</label>
              <input type="text" required value={form.address} onChange={(e) => setForm({...form, address: e.target.value})}
                placeholder="Full site address or location description"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              {editingSite ? 'Update Site' : 'Create Site'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
              className="text-gray-500 hover:text-gray-700 text-sm font-medium px-4 py-2">
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Yojna Filter */}
      {!showArchived && (
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
      )}

      {/* Active Sites Table */}
      {!showArchived && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">🏢 Department</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">📋 Nikay / Yojna</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">🏗️ Work Name / Site</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSites.map((site) => (
                <tr key={site.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-700">{site.department || '-'}</td>
                  <td className="py-3 px-4">
                    {site.yojna ? (
                      <Link to={`/yojnas/${site.yojna.id}`} className="text-indigo-600 hover:text-indigo-800 text-xs">
                        {site.yojna.yojnaName}
                      </Link>
                    ) : '-'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium">{site.siteName}</div>
                    {site.workName && <div className="text-xs text-gray-400">{site.workName}</div>}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(site.status)}`}>{site.status}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <Link to={`/sites/${site.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium">View →</Link>
                      {canManageStatus && (
                        <>
                          <button onClick={() => handleEditClick(site)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                          {site.status === 'ACTIVE' && (
                            <button onClick={() => handleStatusChange(site.id, 'COMPLETED')}
                              className="text-green-600 hover:text-green-800 text-xs font-medium bg-green-50 px-2 py-1 rounded">
                              ✓ Complete
                            </button>
                          )}
                          {site.status === 'COMPLETED' && (
                            <button onClick={() => handleStatusChange(site.id, 'ACTIVE')}
                              className="text-orange-600 hover:text-orange-800 text-xs font-medium bg-orange-50 px-2 py-1 rounded">
                              ↻ Reopen
                            </button>
                          )}
                          {(site.status === 'ACTIVE' || site.status === 'COMPLETED') && (
                            <button onClick={() => handleStatusChange(site.id, 'ON_HOLD')}
                              className="text-yellow-600 hover:text-yellow-800 text-xs font-medium bg-yellow-50 px-2 py-1 rounded">
                              ⏸ Hold
                            </button>
                          )}
                          {site.status === 'ON_HOLD' && (
                            <button onClick={() => handleStatusChange(site.id, 'ACTIVE')}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium bg-blue-50 px-2 py-1 rounded">
                              ▶ Resume
                            </button>
                          )}
                          {site.status !== 'CANCELLED' && site.status !== 'ARCHIVED' && site.status !== 'ON_HOLD' && (
                            <button onClick={() => handleStatusChange(site.id, 'CANCELLED')}
                              className="text-red-600 hover:text-red-800 text-xs font-medium bg-red-50 px-2 py-1 rounded">
                              ✕ Cancel
                            </button>
                          )}
                          <button onClick={() => handleArchive(site.id)}
                            className="text-gray-600 hover:text-gray-800 text-xs font-medium bg-gray-50 px-2 py-1 rounded">
                            🗂️ Archive
                          </button>
                          <Link to={`/sites/${site.id}`}
                            className="text-purple-600 hover:text-purple-800 text-xs font-medium">
                            🔄 Change Owner
                          </Link>
                        </>
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
      )}
    </div>
    </Layout>
  );
}
