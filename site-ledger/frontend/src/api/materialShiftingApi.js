import api from './axios';

export const getShiftingForSite = (siteId) =>
  api.get(`/material-shifting/site/${siteId}`).then(res => res.data);

export const getShiftingSummary = (siteId) =>
  api.get(`/material-shifting/summary/${siteId}`).then(res => res.data);

export const createShifting = (data) =>
  api.post('/material-shifting', data).then(res => res.data);

export const deleteShifting = (id) =>
  api.delete(`/material-shifting/${id}`).then(res => res.data);
