import api from './axios';

export const getSites = async () => {
  const response = await api.get('/sites');
  return response.data;
};

export const getSite = async (id) => {
  const response = await api.get(`/sites/${id}`);
  return response.data;
};

export const createSite = async (site) => {
  const response = await api.post('/sites', site);
  return response.data;
};

export const updateSite = async (id, site) => {
  const response = await api.put(`/sites/${id}`, site);
  return response.data;
};

export const deleteSite = async (id) => {
  const response = await api.delete(`/sites/${id}`);
  return response.data;
};

export const updateSiteStatus = async (id, statusData) => {
  const response = await api.put(`/sites/${id}/status`, statusData);
  return response.data;
};

export const assignStaff = async (siteId, userIds) => {
  const response = await api.post(`/sites/${siteId}/assign`, userIds);
  return response.data;
};
