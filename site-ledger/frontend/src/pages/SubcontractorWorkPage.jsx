import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { getMyWork, getSiteWork, getSubcontractorWork, createWorkEntry, updatePaymentStatus, deleteWorkEntry } from '../api/subcontractorApi';
import { getSites } from '../api/siteApi';

export default function SubcontractorWorkPage() {
  const { user } = useAuth();
  const [workEntries, setWorkEntries] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [form, setForm] = useState({
    siteId: '',
    subcontractorId: '',
    workDate: new Date().toISOString().split('T')[0],
    quantityExecuted: '',
    workOrderNumber: '',
    workDescription: '',
    contractedQuantity: '',
    rate: '',
    unit: '',
    materialName: '',
    materialQuantity: '',
    materialUnit: '',
    paymentAmount: '',
    paymentStatus: 'PENDING',
    remarks: '',
  });
  const [photo, setPhoto] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [subcontractors, setSubcontractors] = useState([]);

  const isSubcontractor = user?.role === 'SUBCONTRACTOR';
  const isAdmin = user?.role === 'SUBCONTRACTOR_ADMIN' || user?.role === 'OWNER' || user?.role === 'OFFICE_ADMIN';

  useEffect(() => {
    loadSites();
    if (isAdmin) {
      loadSubcontractors();
    }
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      loadWorkEntries(selectedSiteId);
    } else if (!isSubcontractor) {
      setWorkEntries([]);
    }
  }, [selectedSiteId]);

  const loadSites = async () => {
    try {
      const res = await getSites();
      if (res.success) {
        setSites(res.data || []);
      }
    } catch (err) {
      console.error('Failed to load sites:', err);
    }
  };

  const loadSubcontractors = async () => {
    try {
      const { getUsers } = await import('../api/userApi');
      const res = await getUsers();
      if (res.success) {
        setSubcontractors((res.data || []).filter(u => u.role === 'SUBCONTRACTOR'));
      }
    } catch (err) {
      console.error('Failed to load subcontractors:', err);
    }
  };

  const loadWorkEntries = async (siteId) => {
    setLoading(true);
    setError('');
    try {
      let res;
      if (isSubcontractor) {
        res = await getMyWork(siteId);
      } else if (form.subcontractorId) {
        res = await getSubcontractorWork(form.subcontractorId, siteId);
      } else {
        res = await getSiteWork(siteId);
      }
      if (res.success) {
        setWorkEntries(res.data || []);
      } else {
        setError(res.message || 'Failed to load work entries');
      }
    } catch (err) {
      setError('Failed to load work entries: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePhotoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setPhoto(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.siteId) {
      setError('Please select a site');
      return;
    }
    if (!form.quantityExecuted || parseFloat(form.quantityExecuted) <= 0) {
      setError('Quantity executed is required and must be greater than 0');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('siteId', form.siteId);
      if (isAdmin && form.subcontractorId) {
        formData.append('subcontractorId', form.subcontractorId);
      }
      formData.append('workDate', form.workDate);
      formData.append('quantityExecuted', form.quantityExecuted);
      if (form.workOrderNumber) formData.append('workOrderNumber', form.workOrderNumber);
      if (form.workDescription) formData.append('workDescription', form.workDescription);
      if (form.contractedQuantity) formData.append('contractedQuantity', form.contractedQuantity);
      if (form.rate) formData.append('rate', form.rate);
      if (form.unit) formData.append('unit', form.unit);
      if (form.materialName) formData.append('materialName', form.materialName);
      if (form.materialQuantity) formData.append('materialQuantity', form.materialQuantity);
      if (form.materialUnit) formData.append('materialUnit', form.materialUnit);
      if (form.paymentAmount) formData.append('paymentAmount', form.paymentAmount);
      if (form.paymentStatus) formData.append('paymentStatus', form.paymentStatus);
      if (form.remarks) formData.append('remarks', form.remarks);
      if (photo) formData.append('photo', photo);

      const res = await createWorkEntry(formData);
      if (res.success) {
        setSuccess('Work entry created successfully!');
        setShowForm(false);
        resetForm();
        if (selectedSiteId) loadWorkEntries(selectedSiteId);
      } else {
        setError(res.message || 'Failed to create work entry');
      }
    } catch (err) {
      setError('Failed to create work entry: ' + (err.response?.data?.message || err.message));
    }
  };

  const resetForm = () => {
    setForm({
      siteId: selectedSiteId || '',
      subcontractorId: '',
      workDate: new Date().toISOString().split('T')[0],
      quantityExecuted: '',
      workOrderNumber: '',
      workDescription: '',
      contractedQuantity: '',
      rate: '',
      unit: '',
      materialName: '',
      materialQuantity: '',
      materialUnit: '',
      paymentAmount: '',
      paymentStatus: 'PENDING',
      remarks: '',
    });
    setPhoto(null);
  };

  const handleUpdatePayment = async (id, amount, status) => {
    setError('');
    setSuccess('');
    try {
      const res = await updatePaymentStatus(id, amount, status);
      if (res.success) {
        setSuccess('Payment status updated');
        if (selectedSiteId) loadWorkEntries(selectedSiteId);
      } else {
        setError(res.message || 'Failed to update payment');
      }
    } catch (err) {
      setError('Failed to update payment: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this work entry?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await deleteWorkEntry(id);
      if (res.success) {
        setSuccess('Work entry deleted');
        if (selectedSiteId) loadWorkEntries(selectedSiteId);
      } else {
        setError(res.message || 'Failed to delete');
      }
    } catch (err) {
      setError('Failed to delete: ' + (err.response?.data?.message || err.message));
    }
  };

  const getPaymentBadge = (status) => {
    const colors = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      PARTIAL: 'bg-blue-100 text-blue-800',
      PAID: 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatCurrency = (val) => {
    if (!val) return '-';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <Link to="/sites" className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">← Back to Sites</Link>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isSubcontractor ? 'My Work' : 'Subcontractor Work'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {isSubcontractor
                ? 'Track your daily work, materials, and view payment status'
                : 'Manage subcontractor work entries and payments'}
            </p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); resetForm(); }}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            {showForm ? 'Cancel' : '+ Add Work Entry'}
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>
        )}

        {/* Create Work Entry Form */}
        {showForm && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">New Work Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Site Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Site *</label>
                  <select
                    name="siteId"
                    value={form.siteId}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  >
                    <option value="">Select Site</option>
                    {sites.map(site => (
                      <option key={site.id} value={site.id}>{site.siteName}</option>
                    ))}
                  </select>
                </div>

                {/* Subcontractor Selection (for admin) */}
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Subcontractor *</label>
                    <select
                      name="subcontractorId"
                      value={form.subcontractorId}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select Subcontractor</option>
                      {subcontractors.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.fullName || sub.username}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Work Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Date *</label>
                  <input
                    type="date"
                    name="workDate"
                    value={form.workDate}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                {/* Quantity Executed */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Executed *</label>
                  <input
                    type="number"
                    step="0.001"
                    name="quantityExecuted"
                    value={form.quantityExecuted}
                    onChange={handleChange}
                    placeholder="e.g., 100.5"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    required
                  />
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input
                    type="text"
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    placeholder="e.g., SQFT, CUM, NOS"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Work Order Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Work Order No.</label>
                  <input
                    type="text"
                    name="workOrderNumber"
                    value={form.workOrderNumber}
                    onChange={handleChange}
                    placeholder="e.g., WO-2024-001"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Contracted Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contracted Qty</label>
                  <input
                    type="number"
                    step="0.001"
                    name="contractedQuantity"
                    value={form.contractedQuantity}
                    onChange={handleChange}
                    placeholder="Total contracted quantity"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Rate */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="rate"
                    value={form.rate}
                    onChange={handleChange}
                    placeholder="Rate per unit"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Material Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material Supplied</label>
                  <input
                    type="text"
                    name="materialName"
                    value={form.materialName}
                    onChange={handleChange}
                    placeholder="Material name (if self-supplied)"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Material Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material Qty</label>
                  <input
                    type="number"
                    step="0.001"
                    name="materialQuantity"
                    value={form.materialQuantity}
                    onChange={handleChange}
                    placeholder="Quantity of material"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Material Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material Unit</label>
                  <input
                    type="text"
                    name="materialUnit"
                    value={form.materialUnit}
                    onChange={handleChange}
                    placeholder="e.g., KG, BAGS, NOS"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* Payment Amount (admin only) */}
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="paymentAmount"
                      value={form.paymentAmount}
                      onChange={handleChange}
                      placeholder="Amount paid"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                )}

                {/* Payment Status (admin only) */}
                {isAdmin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                    <select
                      name="paymentStatus"
                      value={form.paymentStatus}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="PARTIAL">Partial</option>
                      <option value="PAID">Paid</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Work Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Description</label>
                <textarea
                  name="workDescription"
                  value={form.workDescription}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Describe the work done"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  name="remarks"
                  value={form.remarks}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Any additional remarks"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supporting Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                >
                  Save Work Entry
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Site Filter */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="w-full sm:w-64">
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Sites</option>
              {sites.map(site => (
                <option key={site.id} value={site.id}>{site.siteName}</option>
              ))}
            </select>
          </div>

          {/* Subcontractor filter for admin */}
          {isAdmin && (
            <div className="w-full sm:w-64">
              <select
                value={form.subcontractorId}
                onChange={(e) => {
                  setForm(prev => ({ ...prev, subcontractorId: e.target.value }));
                  if (selectedSiteId) {
                    if (e.target.value) {
                      loadWorkEntriesForSubcontractor(e.target.value, selectedSiteId);
                    } else {
                      loadWorkEntries(selectedSiteId);
                    }
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">All Subcontractors</option>
                {subcontractors.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.fullName || sub.username}</option>
                ))}
              </select>
            </div>
          )}

          <span className="text-sm text-gray-500">
            {workEntries.length} entry{workEntries.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>

        {/* Work Entries Table */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Loading work entries...</p>
          </div>
        ) : workEntries.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
            <p className="text-gray-500">No work entries found</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-2 text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              Add your first work entry
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  {isAdmin && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subcontractor</th>}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Site</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work Order</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty Executed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Photo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {workEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{entry.workDate}</td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                        {entry.subcontractor?.fullName || entry.subcontractor?.username || '-'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{entry.site?.siteName || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{entry.workOrderNumber || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {entry.quantityExecuted} {entry.unit || ''}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {entry.rate ? formatCurrency(entry.rate) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {entry.materialName ? `${entry.materialName} (${entry.materialQuantity || ''} ${entry.materialUnit || ''})` : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${getPaymentBadge(entry.paymentStatus)}`}>
                          {entry.paymentStatus || 'PENDING'}
                        </span>
                        {entry.paymentAmount && (
                          <span className="text-xs text-gray-500">{formatCurrency(entry.paymentAmount)}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      {entry.photoFileName ? (
                        <span className="text-indigo-600 text-xs" title={entry.photoFileName}>📷 Yes</span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <div className="flex gap-2">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => {
                                const amount = prompt('Enter payment amount:', entry.paymentAmount || '');
                                if (amount !== null) {
                                  const status = prompt('Enter payment status (PENDING/PARTIAL/PAID):', entry.paymentStatus || 'PENDING');
                                  if (status) {
                                    handleUpdatePayment(entry.id, parseFloat(amount), status.toUpperCase());
                                  }
                                }
                              }}
                              className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                            >
                              💰 Pay
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="text-red-600 hover:text-red-800 text-xs font-medium"
                            >
                              🗑️ Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Summary Cards */}
        {workEntries.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Quantity</p>
              <p className="text-xl font-bold text-gray-900">
                {workEntries.reduce((sum, e) => sum + parseFloat(e.quantityExecuted || 0), 0).toFixed(3)}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Payment</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCurrency(workEntries.reduce((sum, e) => sum + parseFloat(e.paymentAmount || 0), 0))}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Pending Payment</p>
              <p className="text-xl font-bold text-yellow-600">
                {formatCurrency(
                  workEntries
                    .filter(e => e.paymentStatus === 'PENDING' || e.paymentStatus === 'PARTIAL')
                    .reduce((sum, e) => sum + parseFloat(e.paymentAmount || 0), 0)
                )}
              </p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Entries</p>
              <p className="text-xl font-bold text-gray-900">{workEntries.length}</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

async function loadWorkEntriesForSubcontractor(subcontractorId, siteId) {
  try {
    const res = await getSubcontractorWork(subcontractorId, siteId);
    if (res.success) {
      // This will be used by the component
      return res.data || [];
    }
  } catch (err) {
    console.error('Failed to load subcontractor work:', err);
  }
  return [];
}
