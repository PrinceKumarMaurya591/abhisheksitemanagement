import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getSites } from '../api/siteApi';
import { getSiteLabour, createLabourEntry, updateLabourEntry, deleteLabourEntry } from '../api/labourApi';
import { useAuth } from '../context/AuthContext';

const WAGE_TYPES = [
  { value: 'DAILY_WAGE', label: 'Daily Wage' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'CONTRACT', label: 'Contract' },
  { value: 'PIECE_RATE', label: 'Piece Rate' },
];

const LABOUR_CATEGORIES = ['Mason', 'Carpenter', 'Electrician', 'Plumber', 'Painter', 'Labourer', 'Welder', 'Driver', 'Security', 'Supervisor', 'Other'];

export default function LabourPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(searchParams.get('siteId') || '');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [form, setForm] = useState({
    labourName: '', category: '', date: new Date().toISOString().split('T')[0],
    checkIn: '09:00', checkOut: '17:00', hoursWorked: '',
    attendanceCount: 1, wageType: 'DAILY_WAGE', rate: '', amount: '', remarks: ''
  });
  const [error, setError] = useState(null);

  const isSiteStaff = user?.role === 'SITE_INCHARGE' || user?.role === 'MUNSHI';
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
      getSiteLabour(selectedSiteId)
        .then(res => setEntries(res.data || []))
        .catch(err => setError('Failed to load labour entries'))
        .finally(() => setLoading(false));
    }
  }, [selectedSiteId]);

  const resetForm = () => {
    setForm({
      labourName: '', category: '', date: new Date().toISOString().split('T')[0],
      checkIn: '09:00', checkOut: '17:00', hoursWorked: '',
      attendanceCount: 1, wageType: 'DAILY_WAGE', rate: '', amount: '', remarks: ''
    });
    setEditingEntry(null);
  };

  const handleEditClick = (entry) => {
    setForm({
      labourName: entry.labourName || '',
      category: entry.category || '',
      date: entry.date || new Date().toISOString().split('T')[0],
      checkIn: entry.checkIn || '09:00',
      checkOut: entry.checkOut || '17:00',
      hoursWorked: entry.hoursWorked || '',
      attendanceCount: entry.attendanceCount || 1,
      wageType: entry.wageType || 'DAILY_WAGE',
      rate: entry.rate || '',
      amount: entry.amount || '',
      remarks: entry.remarks || '',
    });
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this labour entry?')) return;
    try {
      await deleteLabourEntry(id);
      const res = await getSiteLabour(selectedSiteId);
      setEntries(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete labour entry');
    }
  };

  // Auto-calculate hours from check-in/check-out
  const calculateHours = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return '';
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    const hours = (outH + outM / 60) - (inH + inM / 60);
    return hours > 0 ? hours.toFixed(1) : '';
  };

  // Auto-calculate amount
  const calculateAmount = (wageType, rate, hoursWorked, attendanceCount) => {
    const r = Number(rate || 0);
    const h = Number(hoursWorked || 0);
    const c = Number(attendanceCount || 1);
    if (wageType === 'DAILY_WAGE') return (r * c).toFixed(2);
    if (wageType === 'MONTHLY') return (r / 30 * c).toFixed(2);
    if (wageType === 'PIECE_RATE') return (r * c).toFixed(2);
    if (wageType === 'CONTRACT') return (r * h * c).toFixed(2);
    return (r * c).toFixed(2);
  };

  // Auto-calculate on form change
  useEffect(() => {
    const hours = calculateHours(form.checkIn, form.checkOut);
    const amount = calculateAmount(form.wageType, form.rate, hours || form.hoursWorked, form.attendanceCount);
    setForm(prev => ({
      ...prev,
      hoursWorked: hours || prev.hoursWorked,
      amount: amount || prev.amount,
    }));
  }, [form.checkIn, form.checkOut, form.wageType, form.rate, form.attendanceCount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const payload = {
        labourName: form.labourName,
        category: form.category || null,
        date: form.date,
        checkIn: form.checkIn || null,
        checkOut: form.checkOut || null,
        hoursWorked: form.hoursWorked ? Number(form.hoursWorked) : null,
        attendanceCount: form.attendanceCount ? Number(form.attendanceCount) : 1,
        wageType: form.wageType || null,
        rate: form.rate ? Number(form.rate) : null,
        amount: Number(form.amount),
        remarks: form.remarks || null,
        site: { id: Number(selectedSiteId) }
      };

      if (editingEntry) {
        await updateLabourEntry(editingEntry.id, payload);
      } else {
        await createLabourEntry(payload);
      }

      setShowForm(false);
      resetForm();
      const res = await getSiteLabour(selectedSiteId);
      setEntries(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save labour entry');
    }
  };

  const formatCurrency = (v) => '₹' + Number(v).toLocaleString('en-IN');

  const siteOnHold = selectedSiteId && sites.find(s => String(s.id) === String(selectedSiteId))?.status === 'ON_HOLD';

  // Summary calculations
  const totalAmount = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const totalWorkers = entries.reduce((sum, e) => sum + Number(e.attendanceCount || 1), 0);
  const todayEntries = entries.filter(e => e.date === new Date().toISOString().split('T')[0]);

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
            <h1 className="text-2xl font-bold text-gray-900">👷 Labour & Attendance</h1>
          </div>
          {selectedSiteId && (
            <button
              onClick={() => { resetForm(); setShowForm(!showForm); }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              {showForm ? 'Cancel' : '+ Add Labour Entry'}
            </button>
          )}
        </div>

        {isSiteStaff && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg text-sm">
            <p><strong>ℹ️ Attendance Tracking:</strong> You can record daily attendance with check-in/check-out times, wage type, and rate. Entries you create will be locked after saving.</p>
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
        {entries.length > 0 && selectedSiteId && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-indigo-50 rounded-xl p-4 border border-indigo-200">
              <p className="text-xs text-indigo-600 font-medium">Total Labour Cost</p>
              <p className="text-lg font-bold text-indigo-700">{formatCurrency(totalAmount)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-xs text-blue-600 font-medium">Total Attendance</p>
              <p className="text-lg font-bold text-blue-700">{totalWorkers} workers</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <p className="text-xs text-green-600 font-medium">Total Entries</p>
              <p className="text-lg font-bold text-green-700">{entries.length}</p>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-200">
              <p className="text-xs text-yellow-600 font-medium">Today's Entries</p>
              <p className="text-lg font-bold text-yellow-700">{todayEntries.length}</p>
            </div>
          </div>
        )}

        {/* Add/Edit Labour Form */}
        {showForm && selectedSiteId && (
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingEntry ? '✏️ Edit Labour Entry' : '➕ New Labour Entry'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Labour Name *</label>
                <input type="text" required value={form.labourName}
                  onChange={(e) => setForm({...form, labourName: e.target.value})}
                  placeholder="e.g. Raju Kumar"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category / Trade</label>
                <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                  <option value="">Select trade</option>
                  {LABOUR_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" required value={form.date}
                  onChange={(e) => setForm({...form, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wage Type</label>
                <select value={form.wageType} onChange={(e) => setForm({...form, wageType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm">
                  {WAGE_TYPES.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </div>

              {/* Attendance fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🕐 Check-In</label>
                <input type="time" value={form.checkIn}
                  onChange={(e) => setForm({...form, checkIn: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">🕐 Check-Out</label>
                <input type="time" value={form.checkOut}
                  onChange={(e) => setForm({...form, checkOut: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours Worked</label>
                <input type="number" step="0.5" value={form.hoursWorked}
                  onChange={(e) => setForm({...form, hoursWorked: e.target.value})}
                  placeholder="Auto-calculated"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Workers Count</label>
                <input type="number" min="1" value={form.attendanceCount}
                  onChange={(e) => setForm({...form, attendanceCount: e.target.value})}
                  placeholder="Number of workers"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹)</label>
                <input type="number" step="0.01" value={form.rate}
                  onChange={(e) => setForm({...form, rate: e.target.value})}
                  placeholder="Rate per day/piece"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                <input type="number" step="0.01" required value={form.amount}
                  onChange={(e) => setForm({...form, amount: e.target.value})}
                  placeholder="Auto-calculated"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
                {form.rate && form.attendanceCount && (
                  <p className="text-xs text-indigo-600 mt-1">
                    {form.wageType === 'DAILY_WAGE' ? `${formatCurrency(Number(form.rate) * Number(form.attendanceCount))} (${form.attendanceCount} workers × ₹${form.rate})` :
                     form.wageType === 'CONTRACT' ? `${formatCurrency(Number(form.rate) * Number(form.hoursWorked || 0) * Number(form.attendanceCount))}` :
                     `${formatCurrency(Number(form.rate) * Number(form.attendanceCount))}`}
                  </p>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <textarea value={form.remarks} rows={2}
                onChange={(e) => setForm({...form, remarks: e.target.value})}
                placeholder="Work description, location, etc."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                {editingEntry ? 'Update Entry' : 'Add Entry'}
              </button>
              {editingEntry && (
                <button type="button" onClick={() => { setShowForm(false); resetForm(); }}
                  className="text-gray-500 hover:text-gray-700 text-sm font-medium">
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}

        {/* Labour Entries Table */}
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
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Labour Name</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Category</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">🕐 In</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">🕐 Out</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">Hours</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-500">👥 Workers</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Wage Type</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-500">Amount</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">{e.date}</td>
                    <td className="py-3 px-4 font-medium">{e.labourName}</td>
                    <td className="py-3 px-4 text-gray-600">{e.category || '-'}</td>
                    <td className="py-3 px-4 text-center text-gray-600">{e.checkIn || '-'}</td>
                    <td className="py-3 px-4 text-center text-gray-600">{e.checkOut || '-'}</td>
                    <td className="py-3 px-4 text-center font-medium">
                      {e.hoursWorked ? `${Number(e.hoursWorked).toFixed(1)}h` : '-'}
                    </td>
                    <td className="py-3 px-4 text-center font-medium">{e.attendanceCount || 1}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">
                        {(e.wageType || 'DAILY_WAGE').replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-red-600">{formatCurrency(e.amount)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {canManage && (
                          <>
                            <button onClick={() => handleEditClick(e)}
                              className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                            <button onClick={() => handleDelete(e.id)}
                              className="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
                          </>
                        )}
                        {e.locked && <span className="text-xs text-gray-400">🔒</span>}
                      </div>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr><td colSpan={10} className="py-8 text-center text-gray-400">No labour entries found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-400">Select a site to view labour entries</div>
        )}
      </div>
    </Layout>
  );
}
