import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getSites } from '../api/siteApi';
import { getSiteTransport, createTransport } from '../api/transportApi';
import { useAuth } from '../context/AuthContext';

const VEHICLE_TYPES = ['Truck', 'Tractor', 'Dumper', 'Pickup', 'Mini Truck', 'JCB', 'Crane', 'Other'];

export default function TransportPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(searchParams.get('siteId') || '');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    vehicleType: 'Truck', trips: '', quantity: '', unit: 'Cum', rate: '',
    vendorName: '', vehicleNumber: '', date: new Date().toISOString().split('T')[0], remarks: ''
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
      getSiteTransport(selectedSiteId)
        .then(res => setEntries(res.data || []))
        .catch(() => setError('Failed to load transport entries'))
        .finally(() => setLoading(false));
    }
  }, [selectedSiteId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        vehicleType: form.vehicleType,
        trips: Number(form.trips),
        quantity: form.quantity ? Number(form.quantity) : null,
        unit: form.unit || null,
        rate: Number(form.rate),
        vendorName: form.vendorName || null,
        vehicleNumber: form.vehicleNumber || null,
        date: form.date,
        remarks: form.remarks || null,
        site: { id: Number(selectedSiteId) }
      };
      const response = await createTransport(payload);
      if (response.success) {
        setShowForm(false);
        setForm({ ...form, vehicleType: 'Truck', trips: '', quantity: '', rate: '', vendorName: '', vehicleNumber: '', date: new Date().toISOString().split('T')[0], remarks: '' });
        const res = await getSiteTransport(selectedSiteId);
        setEntries(res.data || []);
      } else {
        setError(response.message || 'Failed to create transport entry');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create transport entry');
    }
  };

  const formatCurrency = (v) => '₹' + Number(v).toLocaleString('en-IN');
  const totalAmount = entries.reduce((sum, e) => sum + Number(e.totalAmount || 0), 0);
  const totalTrips = entries.reduce((sum, e) => sum + Number(e.trips || 0), 0);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">🚛 Transport Management</h1>
          {selectedSiteId && canAdd && (
            <button onClick={() => setShowForm(!showForm)}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              {showForm ? 'Cancel' : '+ Add Transport'}
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type *</label>
                <select value={form.vehicleType} onChange={(e) => setForm({...form, vehicleType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                  {VEHICLE_TYPES.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trips *</label>
                <input type="number" required value={form.trips}
                  onChange={(e) => setForm({...form, trips: e.target.value})}
                  placeholder="Number of trips"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹/trip) *</label>
                <input type="number" step="0.01" required value={form.rate}
                  onChange={(e) => setForm({...form, rate: e.target.value})}
                  placeholder="e.g. 2500"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount</label>
                <input type="text" disabled
                  value={form.trips && form.rate ? formatCurrency(Number(form.trips) * Number(form.rate)) : 'Auto-calculated'}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <div className="flex gap-2">
                  <input type="number" step="0.001" value={form.quantity}
                    onChange={(e) => setForm({...form, quantity: e.target.value})}
                    placeholder="Quantity"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                  <select value={form.unit} onChange={(e) => setForm({...form, unit: e.target.value})}
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                    <option value="Cum">Cum</option><option value="Ton">Ton</option><option value="Kg">Kg</option><option value="Nos">Nos</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name</label>
                <input type="text" value={form.vendorName}
                  onChange={(e) => setForm({...form, vendorName: e.target.value})}
                  placeholder="Vendor name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle No.</label>
                <input type="text" value={form.vehicleNumber}
                  onChange={(e) => setForm({...form, vehicleNumber: e.target.value})}
                  placeholder="Vehicle number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" required value={form.date}
                  onChange={(e) => setForm({...form, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea value={form.remarks} rows={2}
                onChange={(e) => setForm({...form, remarks: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
            </div>
            <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              Add Transport Entry
            </button>
          </form>
        )}

        {loading ? (
          <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
        ) : selectedSiteId ? (
          <>
            {entries.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <p className="text-sm text-gray-500">Total Trips</p>
                  <p className="text-xl font-bold text-gray-900">{totalTrips}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <p className="text-sm text-gray-500">Total Entries</p>
                  <p className="text-xl font-bold text-gray-900">{entries.length}</p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                  <p className="text-sm text-gray-500">Total Cost</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(totalAmount)}</p>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Vehicle</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Trips</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Rate</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Total</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Vendor</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{e.date}</td>
                      <td className="py-3 px-4 font-medium">{e.vehicleType} {e.vehicleNumber ? `(${e.vehicleNumber})` : ''}</td>
                      <td className="py-3 px-4 text-right">{e.trips}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(e.rate)}/trip</td>
                      <td className="py-3 px-4 text-right font-medium text-red-600">{formatCurrency(e.totalAmount || (Number(e.trips) * Number(e.rate)))}</td>
                      <td className="py-3 px-4">{e.vendorName || '-'}</td>
                      <td className="py-3 px-4 text-gray-500">{e.remarks || '-'}</td>
                    </tr>
                  ))}
                  {entries.length === 0 && (
                    <tr><td colSpan={7} className="py-8 text-center text-gray-400">No transport entries found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-400">Select a site to view transport entries</div>
        )}
      </div>
    </Layout>
  );
}
