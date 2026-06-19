import api from './axios';

// ==================== REGISTRATION ====================

export const getRegisteredLabourers = (siteId, includeInactive = false) =>
  api.get(`/labour-management/registrations/${siteId}`, { params: { includeInactive } }).then(res => res.data);

export const registerLabourer = (data) =>
  api.post('/labour-management/registrations', data).then(res => res.data);

export const updateLabourer = (id, data) =>
  api.put(`/labour-management/registrations/${id}`, data).then(res => res.data);

// ==================== ATTENDANCE ====================

export const getAttendance = (siteId, date) =>
  api.get(`/labour-management/attendance/${siteId}`, { params: { date } }).then(res => res.data);

export const getAttendanceSummary = (siteId, date) =>
  api.get(`/labour-management/attendance/${siteId}/summary`, { params: { date } }).then(res => res.data);

export const markBulkAttendance = (siteId, date, records) =>
  api.post('/labour-management/attendance/bulk', records, { params: { siteId, date } }).then(res => res.data);

// ==================== WAGES ====================

export const calculateWages = (siteId, month) =>
  api.get(`/labour-management/wages/${siteId}`, { params: { month } }).then(res => res.data);

// ==================== PAYMENTS ====================

export const getPayments = (siteId) =>
  api.get(`/labour-management/payments/${siteId}`).then(res => res.data);

export const processPayment = (data) =>
  api.post('/labour-management/payments', data).then(res => res.data);

// ==================== DASHBOARD ====================

export const getLabourDashboard = (siteId) =>
  api.get(`/labour-management/dashboard/${siteId}`).then(res => res.data);
