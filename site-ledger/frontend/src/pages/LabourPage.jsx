import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import {
  getRegisteredLabourers, registerLabourer, updateLabourer,
  getAttendance, markBulkAttendance, getAttendanceSummary,
  calculateWages, getPayments, processPayment,
  getLabourDashboard,
} from '../api/labourManagementApi';
import { getSites } from '../api/siteApi';

const LABOUR_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'registration', label: 'Registration', icon: '📝' },
  { id: 'attendance', label: 'Attendance', icon: '✅' },
  { id: 'wages', label: 'Wages', icon: '💰' },
  { id: 'payments', label: 'Payments', icon: '💳' },
];

const CATEGORIES = ['Labour', 'Mistri', 'Helper', 'Welder', 'Electrician', 'Plumber', 'Driver', 'Machine Operator', 'Carpenter', 'Painter', 'Other'];

export default function LabourPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const siteIdFromUrl = searchParams.get('siteId');

  const [activeTab, setActiveTab] = useState('dashboard');
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState(siteIdFromUrl || '');

  // Registration state
  const [labourers, setLabourers] = useState([]);
  const [showRegForm, setShowRegForm] = useState(false);
  const [editingLabourer, setEditingLabourer] = useState(null);
  const [regForm, setRegForm] = useState({
    name: '', fatherName: '', mobile: '', category: 'Labour',
    ratePerDay: '', joiningDate: new Date().toISOString().split('T')[0],
    status: 'ACTIVE', site: null,
  });

  // Attendance state
  const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceList, setAttendanceList] = useState([]);
  const [attSummary, setAttSummary] = useState(null);

  // Wages state
  const [wageMonth, setWageMonth] = useState(new Date().toISOString().slice(0, 7));
  const [wageRecords, setWageRecords] = useState([]);

  // Payments state
  const [payments, setPayments] = useState([]);
  const [showPayForm, setShowPayForm] = useState(false);
  const [payForm, setPayForm] = useState({
    labourRegistrationId: '', payPeriod: wageMonth, grossWage: '',
    advanceDeduction: '', paidAmount: '', paymentMode: 'CASH',
    paymentDate: new Date().toISOString().split('T')[0], siteId: null,
  });

  // Dashboard state
  const [dashboard, setDashboard] = useState(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  const canManage = user?.role === 'OWNER' || user?.role === 'OFFICE_ADMIN' || user?.role === 'SITE_INCHARGE';

  useEffect(() => {
    getSites().then(res => {
      if (res.success) setSites(res.data || []);
    }).catch(() => {});
  }, []);

  // Load data when site changes
  useEffect(() => {
    if (!selectedSiteId) return;
    loadDashboard();
    loadLabourers();
  }, [selectedSiteId]);

  // Reload attendance when date changes
  useEffect(() => {
    if (selectedSiteId && attDate) loadAttendance();
  }, [selectedSiteId, attDate]);

  const loadDashboard = async () => {
    try {
      const res = await getLabourDashboard(selectedSiteId);
      if (res.success) setDashboard(res.data);
    } catch (e) { /* ignore */ }
  };

  const loadLabourers = async () => {
    try {
      const res = await getRegisteredLabourers(selectedSiteId, true);
      if (res.success) setLabourers(res.data || []);
    } catch (e) { /* ignore */ }
  };

  const loadAttendance = async () => {
    setLoading(true);
    try {
      const [attRes, sumRes] = await Promise.all([
        getAttendance(selectedSiteId, attDate),
        getAttendanceSummary(selectedSiteId, attDate),
      ]);
      if (attRes.success) setAttendanceList(attRes.data || []);
      if (sumRes.success) setAttSummary(sumRes.data);
    } catch (e) {
      setAttendanceList([]);
      setAttSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const loadWages = async () => {
    try {
      const res = await calculateWages(selectedSiteId, wageMonth);
      if (res.success) setWageRecords(res.data || []);
    } catch (e) { /* ignore */ }
  };

  const loadPayments = async () => {
    try {
      const res = await getPayments(selectedSiteId);
      if (res.success) setPayments(res.data || []);
    } catch (e) { /* ignore */ }
  };

  const handleRegSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...regForm,
        ratePerDay: Number(regForm.ratePerDay),
        site: { id: Number(selectedSiteId) },
      };
      let res;
      if (editingLabourer) {
        res = await updateLabourer(editingLabourer.id, payload);
      } else {
        res = await registerLabourer(payload);
      }
      if (res.success) {
        setMsg({ type: 'success', text: editingLabourer ? 'Labourer updated!' : 'Labourer registered!' });
        setShowRegForm(false);
        setEditingLabourer(null);
        resetRegForm();
        loadLabourers();
      } else {
        setMsg({ type: 'error', text: res.message || 'Failed' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed to save' });
    }
  };

  const resetRegForm = () => {
    setRegForm({
      name: '', fatherName: '', mobile: '', category: 'Labour',
      ratePerDay: '', joiningDate: new Date().toISOString().split('T')[0],
      status: 'ACTIVE', site: null,
    });
  };

  const handleEditLabourer = (labourer) => {
    setRegForm({
      name: labourer.name || '',
      fatherName: labourer.fatherName || '',
      mobile: labourer.mobile || '',
      category: labourer.category || 'Labour',
      ratePerDay: labourer.ratePerDay || '',
      joiningDate: labourer.joiningDate || '',
      status: labourer.status || 'ACTIVE',
      site: null,
    });
    setEditingLabourer(labourer);
    setShowRegForm(true);
  };

  const handleToggleStatus = async (labourer) => {
    const newStatus = labourer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateLabourer(labourer.id, { ...labourer, status: newStatus });
      loadLabourers();
    } catch (e) {
      alert('Failed to update status');
    }
  };

  // Attendance marking
  const handleAttendanceToggle = async (labourerId, currentStatus) => {
    const newPresent = !currentStatus;
    // Optimistic update
    setAttendanceList(prev =>
      prev.map(a =>
        a.labourRegistrationId === labourerId ? { ...a, present: newPresent } : a
      )
    );
    // If no existing record, create temporary one
    if (!attendanceList.find(a => a.labourRegistrationId === labourerId)) {
      setAttendanceList(prev => [...prev, {
        labourRegistrationId: labourerId, date: attDate, present: newPresent, siteId: Number(selectedSiteId),
      }]);
    }
  };

  const handleSaveAttendance = async () => {
    try {
      const records = attendanceList.map(a => ({
        labourRegistrationId: a.labourRegistrationId,
        present: a.present,
      }));
      const res = await markBulkAttendance(selectedSiteId, attDate, records);
      if (res.success) {
        setMsg({ type: 'success', text: 'Attendance saved!' });
        loadAttendance();
        loadDashboard();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Failed to save attendance' });
    }
  };

  // Payment
  const handlePaySubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...payForm,
        labourRegistrationId: Number(payForm.labourRegistrationId),
        siteId: Number(selectedSiteId),
        grossWage: Number(payForm.grossWage),
        advanceDeduction: Number(payForm.advanceDeduction || 0),
        paidAmount: Number(payForm.paidAmount),
      };
      const res = await processPayment(payload);
      if (res.success) {
        setMsg({ type: 'success', text: 'Payment processed!' });
        setShowPayForm(false);
        loadPayments();
        loadDashboard();
      } else {
        setMsg({ type: 'error', text: res.message || 'Failed' });
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.message || 'Failed' });
    }
  };

  const formatCurrency = (v) => '₹' + Number(v || 0).toLocaleString('en-IN');
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '-';
  const siteName = sites.find(s => s.id === Number(selectedSiteId))?.siteName || '';

  if (!selectedSiteId) {
    return (
      <Layout>
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-gray-900">👷 Labour Management</h1>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
            <p className="text-yellow-700 font-medium mb-3">Please select a site to manage labour</p>
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
            <h1 className="text-2xl font-bold text-gray-900">👷 Labour Management</h1>
            <p className="text-sm text-gray-500 mt-1">{siteName}</p>
          </div>
          <select value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
            {sites.map(s => <option key={s.id} value={s.id}>{s.siteName}</option>)}
          </select>
        </div>

        {msg && (
          <div className={`px-4 py-3 rounded-lg text-sm ${
            msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {msg.text}
            <button onClick={() => setMsg(null)} className="float-right font-bold">&times;</button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {LABOUR_TABS.map(tab => (
              <button key={tab.id} onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'wages') loadWages();
                if (tab.id === 'payments') loadPayments();
                if (tab.id === 'attendance') loadAttendance();
              }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}>
                <span>{tab.icon}</span> {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ============ DASHBOARD TAB ============ */}
        {activeTab === 'dashboard' && dashboard && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p className="text-sm text-gray-500">👥 Total Labour</p>
                <p className="text-2xl font-bold text-indigo-600 mt-1">{dashboard.totalLabourers || 0}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p className="text-sm text-gray-500">✅ Active</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{dashboard.activeLabourers || 0}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p className="text-sm text-gray-500">📅 Present Today</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{dashboard.presentToday || 0}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <p className="text-sm text-gray-500">💰 Month Cost</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(dashboard.currentMonthCost)}</p>
              </div>
            </div>
            {dashboard.presentToday > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">Today's Attendance</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-4">
                    <div className="bg-green-500 h-4 rounded-full"
                      style={{ width: `${(dashboard.presentToday / (dashboard.presentToday + dashboard.absentToday || 1)) * 100}%` }} />
                  </div>
                  <span className="text-sm font-bold text-green-600">
                    {dashboard.presentToday}/{dashboard.presentToday + dashboard.absentToday} Present
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ REGISTRATION TAB ============ */}
        {activeTab === 'registration' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Registered Labourers ({labourers.length})</h3>
              <button onClick={() => { setShowRegForm(!showRegForm); setEditingLabourer(null); resetRegForm(); }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                {showRegForm ? 'Cancel' : '+ Add Labourer'}
              </button>
            </div>

            {/* Registration Form */}
            {showRegForm && (
              <form onSubmit={handleRegSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                <h4 className="font-semibold text-gray-900">{editingLabourer ? 'Edit Labourer' : 'New Labour Registration'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input type="text" required value={regForm.name}
                      onChange={(e) => setRegForm({...regForm, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Father Name</label>
                    <input type="text" value={regForm.fatherName}
                      onChange={(e) => setRegForm({...regForm, fatherName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                    <input type="text" value={regForm.mobile}
                      onChange={(e) => setRegForm({...regForm, mobile: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select required value={regForm.category}
                      onChange={(e) => setRegForm({...regForm, category: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rate Per Day (₹) *</label>
                    <input type="number" required value={regForm.ratePerDay}
                      onChange={(e) => setRegForm({...regForm, ratePerDay: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Joining Date *</label>
                    <input type="date" required value={regForm.joiningDate}
                      onChange={(e) => setRegForm({...regForm, joiningDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
                <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                  {editingLabourer ? 'Update Labourer' : 'Register Labourer'}
                </button>
              </form>
            )}

            {/* Labourers List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Rate/Day</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Mobile</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {labourers.map(l => (
                    <tr key={l.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{l.name}</td>
                      <td className="py-3 px-4">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">{l.category}</span>
                      </td>
                      <td className="py-3 px-4">{formatCurrency(l.ratePerDay)}/day</td>
                      <td className="py-3 px-4 text-gray-500">{l.mobile || '-'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          l.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>{l.status}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => handleEditLabourer(l)}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                          <button onClick={() => handleToggleStatus(l)}
                            className={`text-xs font-medium px-2 py-1 rounded ${
                              l.status === 'ACTIVE'
                                ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                                : 'bg-green-50 text-green-600 hover:bg-green-100'
                            }`}>
                            {l.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {labourers.length === 0 && (
                    <tr><td colSpan={6} className="py-8 text-center text-gray-400">No labourers registered yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ============ ATTENDANCE TAB ============ */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Date:</label>
              <input type="date" value={attDate}
                onChange={(e) => setAttDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              {attSummary && (
                <div className="flex items-center gap-4 ml-auto text-sm">
                  <span className="text-green-600">✅ Present: {attSummary.present || 0}</span>
                  <span className="text-red-600">❌ Absent: {attSummary.absent || 0}</span>
                  <span className="text-gray-500">Total: {attSummary.total || 0}</span>
                </div>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-400">Loading attendance...</div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Mark Attendance — A / P</h3>
                  <button onClick={handleSaveAttendance}
                    className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700">
                    💾 Save Attendance
                  </button>
                </div>

                {/* Show labourers who are not yet in today's attendance */}
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {labourers.filter(l => l.status === 'ACTIVE').map(labourer => {
                    const attRecord = attendanceList.find(a => a.labourRegistrationId === labourer.id);
                    const isPresent = attRecord ? attRecord.present : null;
                    return (
                      <div key={labourer.id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{labourer.category === 'Mistri' ? '👨‍🔧' : '👷'}</span>
                          <div>
                            <p className="font-medium text-sm">{labourer.name}</p>
                            <p className="text-xs text-gray-400">{labourer.category} · {formatCurrency(labourer.ratePerDay)}/day</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAttendanceToggle(labourer.id, isPresent === true)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isPresent === true
                                ? 'bg-green-500 text-white ring-2 ring-green-300'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}>
                            ✅ A
                          </button>
                          <button
                            onClick={() => handleAttendanceToggle(labourer.id, isPresent === false)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isPresent === false
                                ? 'bg-red-500 text-white ring-2 ring-red-300'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}>
                            ❌ P
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {labourers.filter(l => l.status === 'ACTIVE').length === 0 && (
                    <div className="py-8 text-center text-gray-400">
                      No active labourers. Register labourers first in the Registration tab.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ============ WAGES TAB ============ */}
        {activeTab === 'wages' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">Month:</label>
              <input type="month" value={wageMonth}
                onChange={(e) => setWageMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
              <button onClick={loadWages}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                Calculate Wages
              </button>
              <span className="text-sm text-gray-400 ml-auto">
                Total: {formatCurrency(wageRecords.reduce((s, r) => s + Number(r.grossWage || 0), 0))}
              </span>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Category</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Rate/Day</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Present Days</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Gross Wage</th>
                  </tr>
                </thead>
                <tbody>
                  {wageRecords.map((r, i) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{r.name}</td>
                      <td className="py-3 px-4">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">{r.category}</span>
                      </td>
                      <td className="py-3 px-4">{formatCurrency(r.ratePerDay)}</td>
                      <td className="py-3 px-4 font-bold">{r.presentDays} days</td>
                      <td className="py-3 px-4 font-bold text-indigo-600">{formatCurrency(r.grossWage)}</td>
                    </tr>
                  ))}
                  {wageRecords.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400">
                      Click "Calculate Wages" to generate monthly wage sheet
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Quick Pay button */}
            {wageRecords.length > 0 && (
              <div className="text-center">
                <button onClick={() => {
                  setShowPayForm(true);
                  if (wageRecords.length > 0) {
                    const first = wageRecords[0];
                    setPayForm(prev => ({
                      ...prev,
                      labourRegistrationId: first.labourRegistrationId || '',
                      grossWage: first.grossWage || '',
                      payPeriod: wageMonth,
                    }));
                  }
                  setActiveTab('payments');
                }}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                  💳 Process Payment
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============ PAYMENTS TAB ============ */}
        {activeTab === 'payments' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Payment History</h3>
              <button onClick={() => { setShowPayForm(!showPayForm); if (!showPayForm) loadPayments(); }}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
                {showPayForm ? 'Cancel' : '+ New Payment'}
              </button>
            </div>

            {/* Payment Form */}
            {showPayForm && (
              <form onSubmit={handlePaySubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                <h4 className="font-semibold text-gray-900">Process Labour Payment</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Labourer *</label>
                    <select required value={payForm.labourRegistrationId}
                      onChange={(e) => {
                        const labourer = labourers.find(l => l.id === Number(e.target.value));
                        setPayForm({
                          ...payForm,
                          labourRegistrationId: e.target.value,
                          grossWage: labourer?.ratePerDay ? labourer.ratePerDay * 22 : '',
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="">Select Labourer</option>
                      {labourers.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.category})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Pay Period</label>
                    <input type="month" value={payForm.payPeriod}
                      onChange={(e) => setPayForm({...payForm, payPeriod: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                    <input type="date" value={payForm.paymentDate}
                      onChange={(e) => setPayForm({...payForm, paymentDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gross Wage (₹) *</label>
                    <input type="number" required value={payForm.grossWage}
                      onChange={(e) => {
                        const gross = Number(e.target.value);
                        const advance = Number(payForm.advanceDeduction || 0);
                        setPayForm({...payForm, grossWage: e.target.value, paidAmount: Math.max(0, gross - advance)});
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Advance Deduction (₹)</label>
                    <input type="number" value={payForm.advanceDeduction}
                      onChange={(e) => {
                        const advance = Number(e.target.value);
                        const gross = Number(payForm.grossWage || 0);
                        setPayForm({...payForm, advanceDeduction: e.target.value, paidAmount: Math.max(0, gross - advance)});
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
                    <select required value={payForm.paymentMode}
                      onChange={(e) => setPayForm({...payForm, paymentMode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Net Payable: {formatCurrency(Math.max(0, Number(payForm.grossWage || 0) - Number(payForm.advanceDeduction || 0)))}
                    </label>
                    <input type="number" required value={payForm.paidAmount}
                      onChange={(e) => setPayForm({...payForm, paidAmount: e.target.value})}
                      placeholder="Amount actually paid"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                  </div>
                </div>
                <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
                  ✅ Process Payment
                </button>
              </form>
            )}

            {/* Payments Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Labour ID</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Period</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Gross Wage</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Advance Ded.</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Net Payable</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Paid</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Mode</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-500">#{p.labourRegistrationId}</td>
                      <td className="py-3 px-4">{p.payPeriod || '-'}</td>
                      <td className="py-3 px-4">{formatCurrency(p.grossWage)}</td>
                      <td className="py-3 px-4 text-red-600">{formatCurrency(p.advanceDeduction)}</td>
                      <td className="py-3 px-4 font-medium">{formatCurrency(p.netPayable)}</td>
                      <td className="py-3 px-4 font-bold text-green-600">{formatCurrency(p.paidAmount)}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          p.paymentMode === 'CASH' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                        }`}>{p.paymentMode}</span>
                      </td>
                      <td className="py-3 px-4 text-gray-500">{formatDate(p.paymentDate)}</td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr><td colSpan={8} className="py-8 text-center text-gray-400">No payments recorded</td></tr>
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
