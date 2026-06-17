import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getSites } from '../api/siteApi';
import { getSiteAdvances, createAdvance, updateAdvance, deleteAdvance, settleAdvance } from '../api/advanceApi';
import { useAuth } from '../context/AuthContext';

const PAYMENT_TYPES = [
  { value: 'PERSON', label: '👤 Person (Staff/Worker)' },
  { value: 'SITE', label: '🏗️ Site (General)' },
  { value: 'OTHER', label: '📋 Other (Supervisor/Driver/Vendor)' },
];

const PERSON_ROLES = [
  { value: 'SITE_INCHARGE', label: 'Site Incharge' },
  { value: 'MUNSHI', label: 'Munshi' },
  { value: 'MATE', label: 'Mate' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'DRIVER', label: 'Driver' },
  { value: 'SECURITY', label: 'Security' },
  { value: 'VENDOR', label: 'Vendor/Supplier' },
  { value: 'OTHER', label: 'Other' },
];

export default function AdvancesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(searchParams.get('siteId') || '');
  const [advances, setAdvances] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingAdvance, setEditingAdvance] = useState(null);
  const [form, setForm] = useState({
    personName: '', personRole: '', paymentType: 'PERSON', amount: '',
    purpose: '', date: new Date().toISOString().split('T')[0],
  });
  const [error, setError] = useState(null);

  const canManage = user?.role === 'OWNER' || user?.role === 'OFFICE_ADMIN';

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

  const resetForm = () => {
    setForm({
      personName: '', personRole: '', paymentType: 'PERSON', amount: '',
      purpose: '', date: new Date().toISOString().split('T')[0],
    });
    setEditingAdvance(null);
  };

  const handleEditClick = (advance) => {
    setForm({
      personName: advance.personName || '',
      personRole: advance.personRole || '',
      paymentType: advance.paymentType || 'PERSON',
      amount: advance.amount || '',
      purpose: advance.purpose || '',
      date: advance.date || new Date().toISOString().split('T')[0],
    });
    setEditingAdvance(advance);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this advance?')) return;
    try {
      await deleteAdvance(id);
      const res = await getSiteAdvances(selectedSiteId);
      setAdvances(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete advance');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        personName: form.personName,
        personRole: form.personRole || null,
        paymentType: form.paymentType,
        amount: Number(form.amount),
        purpose: form.purpose || null,
        date: form.date,
        site: { id: Number(selectedSiteId) }
      };

      if (editingAdvance) {
        await updateAdvance(editingAdvance.id, payload);
      } else {
        await createAdvance(payload);
      }

      setShowForm(false);
      resetForm();
      const res = await getSiteAdvances(selectedSiteId);
      setAdvances(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save advance');
    }
  };

  const handleSettle = async (id) => {
    if (!window.confirm('Mark this advance as settled?')) return;
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

  const siteOnHold = selectedSiteId && sites.find(s => String(s.id) === String(selectedSiteId))?.status === 'ON_HOLD';

  // Summary
  const totalOpen = advances.filter(a => a.status === 'OPEN').reduce((s, a) => s + Number(a.amount || 0), 0);
  const totalSettled = advances.filter(a => a.status === 'SETTLED').reduce((s, a) => s + Number(a.amount || 0), 0);

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
            {searchParams.get('siteId') && (
              <Link to={`/sites/${searchParams.get('siteId')}`} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">← Back to Site</Link>
            )}
            <h1 className="text-2xl font-bold text-gray-900">💰 Advances</h1>
          </div>
          {selectedSiteId && canManage && (
            <button
              onClick={() => { resetForm(); setShowForm(!showForm); }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              {showForm ? 'Cancel' : '+ New Advance'}
            </button>
          )}
        </div>

        {!canManage && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">
            Only Office Admin and Owner can manage advances.
          </div>
        )}

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

        {/* Summary Cards */}
        {advances.length > 0 && selectedSiteId && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <p className="text-xs text-yellow-600 font-medium">Total Advances</p>
              <p className="text-lg font-bold text-yellow-700">{formatCurrency(totalOpen + totalSettled)}</p>
              <p className="text-xs text-yellow-500">{advances.length} entries</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-200">
              <p className="text-xs text-orange-600 font-medium">Open (Unsettled)</p>
              <p className="text-lg font-bold text-orange-700">{formatCurrency(totalOpen)}</p>
              <p className="text-xs text-orange-500">{advances.filter(a => a.status === 'OPEN').length} pending</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-xs text-green-600 font-medium">Settled</p>
              <p className="text-lg font-bold text-green-700">{formatCurrency(totalSettled)}</p>
              <p className="text-xs text-green-500">{advances.filter(a => a.status === 'SETTLED').length} completed</p>
            </div>
          </div>
        )}

        {/* Add/Edit Advance Form */}
        {showForm && selectedSiteId && canManage && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingAdvance ? '✏️ Edit Advance' : '➕ New Advance'}
            </h2>
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm mb-2">
              <p>💡 Advances will be automatically added to this site's total expenditure in the dashboard.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Payment Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paid To *</label>
                <select required value={form.paymentType}
                  onChange={(e) => setForm({...form, paymentType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                  {PAYMENT_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                </select>
              </div>

              {/* Person Name - always shown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.paymentType === 'SITE' ? 'Site Reference *' :
                   form.paymentType === 'OTHER' ? 'Person / Vendor Name *' :
                   'Person Name *'}
                </label>
                <input type="text" required value={form.personName}
                  onChange={(e) => setForm({...form, personName: e.target.value})}
                  placeholder={form.paymentType === 'SITE' ? 'e.g. Site materials' :
                    form.paymentType === 'OTHER' ? 'e.g. Driver Ram, Vendor Sharma' :
                    'e.g. Rajesh Kumar'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>

              {/* Person Role (for PERSON and OTHER types) */}
              {(form.paymentType === 'PERSON' || form.paymentType === 'OTHER') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role / Designation</label>
                  <select value={form.personRole}
                    onChange={(e) => setForm({...form, personRole: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                    <option value="">Select role</option>
                    {PERSON_ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input type="number" step="0.01" required value={form.amount}
                  onChange={(e) => setForm({...form, amount: e.target.value})}
                  placeholder="Advance amount"
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
                  placeholder="What is this advance for?"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                {editingAdvance ? 'Update Advance' : 'Create Advance'}
              </button>
              {editingAdvance && (
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium">
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {/* Advances Table */}
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
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Paid To</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Person / Reference</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Role</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Amount</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Settled</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {advances.map((a) => (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{a.date}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        a.paymentType === 'PERSON' ? 'bg-blue-100 text-blue-700' :
                        a.paymentType === 'SITE' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {a.paymentType === 'PERSON' ? '👤 Person' :
                         a.paymentType === 'SITE' ? '🏗️ Site' : '📋 Other'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium">{a.personName}</td>
                    <td className="py-3 px-4 text-gray-600">{a.personRole || '-'}</td>
                    <td className="py-3 px-4 text-right font-medium">{formatCurrency(a.amount)}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(a.settledAmount || 0)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        a.status === 'OPEN' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                      }`}>{a.status}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {canManage && (
                          <>
                            <button onClick={() => handleEditClick(a)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                            {a.status === 'OPEN' && (
                              <button onClick={() => handleSettle(a.id)}
                                className="text-indigo-600 hover:text-indigo-800 text-xs font-medium">Settle</button>
                            )}
                            <button onClick={() => handleDelete(a.id)}
                              className="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {advances.length === 0 && (
                  <tr><td colSpan={8} className="py-8 text-center text-gray-400">No advances found</td></tr>
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
