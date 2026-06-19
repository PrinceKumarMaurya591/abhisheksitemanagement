import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getSites } from '../api/siteApi';
import { getShiftingForSite, getShiftingSummary, createShifting, deleteShifting } from '../api/materialShiftingApi';
import { useAuth } from '../context/AuthContext';

const MATERIAL_TYPES = ['BULK', 'STOCK'];
const TRANSPORT_MODES = ['Tractor', 'Truck', 'Dumper', 'JCB', 'Loader', 'Other'];

export default function MaterialShiftingPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const siteIdFromUrl = searchParams.get('siteId');

  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(siteIdFromUrl || '');
  const [shifts, setShifts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [msg, setMsg] = useState(null);

  const [form, setForm] = useState({
    materialName: '',
    materialType: 'BULK',
    fromSiteId: '',
    toSiteId: '',
    transportMode: 'Tractor',
    trips: '',
    ratePerTrip: '',
    quantityPerTrip: '',
    date: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  const canManage = user?.role === 'OWNER' || user?.role === 'OFFICE_ADMIN' || user?.role === 'SITE_INCHARGE';

  useEffect(() => {
    getSites().then(res => {
      if (res.success) setSites(res.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      loadData();
    }
  }, [selectedSiteId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [shiftRes, sumRes] = await Promise.all([
        getShiftingForSite(selectedSiteId),
        getShiftingSummary(selectedSiteId),
      ]);
      if (shiftRes.success) setShifts(shiftRes.data || []);
      if (sumRes.success) setSummary(sumRes.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        trips: Number(form.trips),
        ratePerTrip: Number(form.ratePerTrip),
        quantityPerTrip: Number(form.quantityPerTrip),
        toSiteId: Number(selectedSiteId),
        fromSiteId: form.fromSiteId ? Number(form.fromSiteId) : null,
      };
      const res = await createShifting(payload);
      if (res.success) {
        setMsg({ type: 'success', text: 'Shifting recorded! Auto-calculated: ' +
          `${payload.trips} trips × ${payload.quantityPerTrip} qty = ${payload.trips * payload.quantityPerTrip} total, ` +
          `Transport Cost: ₹${(payload.trips * payload.ratePerTrip).toLocaleString('en-IN')}`
        });
        setShowForm(false);
        resetForm();
        loadData();
      } else {
        setMsg({ type: 'error', text: res.message || 'Failed to create shifting record' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to create' });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this shifting record? This cannot be undone.')) return;
    try {
      const res = await deleteShifting(id);
      if (res.success) {
        setMsg({ type: 'success', text: 'Record deleted' });
        loadData();
      }
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const resetForm = () => {
    setForm({
      materialName: '', materialType: 'BULK', fromSiteId: '', toSiteId: '',
      transportMode: 'Tractor', trips: '', ratePerTrip: '', quantityPerTrip: '',
      date: new Date().toISOString().split('T')[0], remarks: '',
    });
  };

  const formatCurrency = (v) => '₹' + Number(v || 0).toLocaleString('en-IN');
  const formatQty = (v) => Number(v || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

  // Auto-calculate preview
  const tripsNum = Number(form.trips) || 0;
  const rateNum = Number(form.ratePerTrip) || 0;
  const qtyNum = Number(form.quantityPerTrip) || 0;
  const previewTotalQty = tripsNum * qtyNum;
  const previewTotalCost = tripsNum * rateNum;

  const siteName = sites.find(s => s.id === Number(selectedSiteId))?.siteName || '';

  if (!selectedSiteId) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">🚛 Material Shifting (Yard to Site)</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <p className="text-yellow-700 font-medium mb-3">Please select a destination site</p>
            <select value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">Select Site...</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.siteName}</option>)}
            </select>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🚛 Material Shifting</h1>
            <p className="text-sm text-gray-500 mt-1">Track bulk material from yard/stock to site — with transport cost</p>
          </div>
          <div className="flex items-center gap-3">
            <select value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
              {sites.map(s => <option key={s.id} value={s.id}>{s.siteName}</option>)}
            </select>
            {canManage && (
              <button onClick={() => { setShowForm(!showForm); resetForm(); }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                {showForm ? 'Cancel' : '+ New Shift'}
              </button>
            )}
          </div>
        </div>

        {msg && (
          <div className={`px-4 py-3 rounded-lg text-sm ${
            msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {msg.text}
            <button onClick={() => setMsg(null)} className="float-right font-bold">&times;</button>
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500">📦 Total Material Shifted</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{formatQty(summary.totalQuantity)} units</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500">🚛 Total Transport Cost</p>
              <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(summary.totalTransportCost)}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500">📋 Total Shifts</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{summary.totalShifts || 0}</p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">💡 How this works:</p>
          <p>When bulk material moves from yard to site via transport, <strong>both</strong> material consumption AND transport expense are tracked.</p>
          <p className="mt-1">Example: Tractor carries GSB — 2 trips × ₹600/trip × 100 Cum/trip = 200 Cum consumed + ₹1,200 transport cost</p>
        </div>

        {/* Shifting Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Record Material Shifting</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Name *</label>
                <input type="text" required value={form.materialName}
                  onChange={(e) => setForm({...form, materialName: e.target.value})}
                  placeholder="e.g. GSB, WMM, Sand"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material Type</label>
                <select value={form.materialType}
                  onChange={(e) => setForm({...form, materialType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  {MATERIAL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transport Mode</label>
                <select value={form.transportMode}
                  onChange={(e) => setForm({...form, transportMode: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  {TRANSPORT_MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From (Yard/Source Site)</label>
                <select value={form.fromSiteId}
                  onChange={(e) => setForm({...form, fromSiteId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                  <option value="">Direct from Vendor</option>
                  {sites.filter(s => s.id !== Number(selectedSiteId)).map(s => (
                    <option key={s.id} value={s.id}>{s.siteName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To (Site)</label>
                <input type="text" disabled value={siteName}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" required value={form.date}
                  onChange={(e) => setForm({...form, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Trips *</label>
                <input type="number" required min="1" value={form.trips}
                  onChange={(e) => setForm({...form, trips: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate per Trip (₹) *</label>
                <input type="number" required min="0" step="0.01" value={form.ratePerTrip}
                  onChange={(e) => setForm({...form, ratePerTrip: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity per Trip *</label>
                <input type="number" required min="0" step="0.001" value={form.quantityPerTrip}
                  onChange={(e) => setForm({...form, quantityPerTrip: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
              <div className="md:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <input type="text" value={form.remarks}
                  onChange={(e) => setForm({...form, remarks: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              </div>
            </div>

            {/* Preview */}
            {tripsNum > 0 && rateNum > 0 && qtyNum > 0 && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 text-sm">
                <p className="font-medium text-indigo-700 mb-2">📊 Auto-Calculation Preview:</p>
                <div className="grid grid-cols-2 gap-2 text-indigo-600">
                  <p>Total Quantity: <strong>{formatQty(previewTotalQty)}</strong> ({tripsNum} × {formatQty(qtyNum)})</p>
                  <p>Total Transport Cost: <strong>{formatCurrency(previewTotalCost)}</strong> ({tripsNum} × {formatCurrency(rateNum)})</p>
                </div>
              </div>
            )}

            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              Record Shifting
            </button>
          </form>
        )}

        {/* Shifts List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="font-semibold text-gray-900">Shifting History ({shifts.length})</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Material</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Transport</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Trips</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Rate/Trip</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Qty/Trip</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Total Qty</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Transport Cost</th>
                {canManage && <th className="text-left py-3 px-4 font-medium text-gray-500">Action</th>}
              </tr>
            </thead>
            <tbody>
              {shifts.map(s => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{s.date}</td>
                  <td className="py-3 px-4 font-medium">{s.materialName}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-xs ${s.materialType === 'BULK' ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'}`}>
                      {s.materialType}
                    </span>
                  </td>
                  <td className="py-3 px-4">{s.transportMode || '-'}</td>
                  <td className="py-3 px-4 font-bold">{s.trips}</td>
                  <td className="py-3 px-4">{formatCurrency(s.ratePerTrip)}</td>
                  <td className="py-3 px-4">{formatQty(s.quantityPerTrip)}</td>
                  <td className="py-3 px-4 font-bold text-indigo-600">{formatQty(s.totalQuantity)}</td>
                  <td className="py-3 px-4 font-bold text-orange-600">{formatCurrency(s.totalTransportCost)}</td>
                  {canManage && (
                    <td className="py-3 px-4">
                      <button onClick={() => handleDelete(s.id)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium">
                        🗑️ Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {shifts.length === 0 && (
                <tr><td colSpan={canManage ? 11 : 10} className="py-8 text-center text-gray-400">No shifting records</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Total summary row */}
        {shifts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-around text-sm">
            <div className="text-center">
              <p className="text-gray-500">Total Material</p>
              <p className="font-bold text-indigo-600 text-lg">
                {formatQty(shifts.reduce((s, r) => s + Number(r.totalQuantity || 0), 0))} units
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Total Transport Cost</p>
              <p className="font-bold text-orange-600 text-lg">
                {formatCurrency(shifts.reduce((s, r) => s + Number(r.totalTransportCost || 0), 0))}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-500">Total Trips</p>
              <p className="font-bold text-gray-700 text-lg">
                {shifts.reduce((s, r) => s + Number(r.trips || 0), 0)}
              </p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
