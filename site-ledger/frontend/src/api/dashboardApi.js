import api from './axios';

export const getOwnerDashboard = async () => {
  const response = await api.get('/dashboard/owner');
  return response.data;
};

export const getSiteDashboard = async (siteId) => {
  const response = await api.get(`/dashboard/site/${siteId}`);
  return response.data;
};
