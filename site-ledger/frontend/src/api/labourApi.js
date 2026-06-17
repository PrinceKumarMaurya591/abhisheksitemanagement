import api from './axios';

export const getSiteLabour = async (siteId) => {
  const response = await api.get(`/labour/site/${siteId}`);
  return response.data;
};

export const createLabourEntry = async (entry) => {
  const response = await api.post('/labour', entry);
  return response.data;
};

export const updateLabourEntry = async (id, entry) => {
  const response = await api.put(`/labour/${id}`, entry);
  return response.data;
};

export const deleteLabourEntry = async (id) => {
  const response = await api.delete(`/labour/${id}`);
  return response.data;
};
