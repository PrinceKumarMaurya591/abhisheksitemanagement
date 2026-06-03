import api from './axios';

export const getSiteMachinery = (siteId) =>
  api.get(`/machinery/site/${siteId}`).then(res => res.data);

export const createMachinery = (data) =>
  api.post('/machinery', data).then(res => res.data);
