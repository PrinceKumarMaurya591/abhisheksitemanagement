import api from './axios';

export const getSiteTransport = async (siteId) => {
  const response = await api.get(`/transport/site/${siteId}`);
  return response.data;
};

export const createTransport = async (entry) => {
  const response = await api.post('/transport', entry);
  return response.data;
};

export const updateTransport = async (id, entry) => {
  const response = await api.put(`/transport/${id}`, entry);
  return response.data;
};

export const deleteTransport = async (id) => {
  const response = await api.delete(`/transport/${id}`);
  return response.data;
};
