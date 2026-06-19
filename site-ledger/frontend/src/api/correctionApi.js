import api from './axios';

export const requestCorrection = (data) =>
  api.post('/corrections/request', data).then(res => res.data);

export const getPendingCorrections = (siteId) =>
  api.get('/corrections/pending', { params: { siteId } }).then(res => res.data);

export const approveCorrection = (id, correctedValues) =>
  api.put(`/corrections/${id}/approve`, { correctedValues }).then(res => res.data);

export const rejectCorrection = (id, rejectionReason) =>
  api.put(`/corrections/${id}/reject`, { rejectionReason }).then(res => res.data);

export const getCorrectionHistory = (entityType, entityId) =>
  api.get(`/corrections/history/${entityType}/${entityId}`).then(res => res.data);

export const getAllCorrections = (siteId) =>
  api.get('/corrections/all', { params: { siteId } }).then(res => res.data);
