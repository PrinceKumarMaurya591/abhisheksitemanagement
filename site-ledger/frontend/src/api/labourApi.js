import api from './axios';

export const getSiteLabour = async (siteId) => {
  const response = await api.get(`/labour/site/${siteId}`);
  return response.data;
};

export const createLabourEntry = async (entry) => {
  const response = await api.post('/labour', entry);
  return response.data;
};
