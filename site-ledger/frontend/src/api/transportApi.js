import api from './axios';

export const getSiteTransport = (siteId) =>
  api.get(`/transport/site/${siteId}`).then(res => res.data);

export const createTransport = (data) =>
  api.post('/transport', data).then(res => res.data);
