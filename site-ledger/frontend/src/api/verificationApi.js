import api from './axios';

export const getPendingVerifications = (siteId) =>
  api.get('/verification/pending', { params: { siteId } }).then(res => res.data);

export const verifyEntry = (entityType, entityId) =>
  api.post('/verification/verify', null, { params: { entityType, entityId } }).then(res => res.data);

export const getAuditLogs = (entityType, entityId) =>
  api.get(`/verification/audit/${entityType}/${entityId}`).then(res => res.data);
