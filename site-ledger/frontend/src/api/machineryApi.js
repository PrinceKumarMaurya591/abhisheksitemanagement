import api from './axios';

export const getSiteMachinery = async (siteId) => {
  const response = await api.get(`/machinery/site/${siteId}`);
  return response.data;
};

export const createMachinery = async (entry) => {
  const response = await api.post('/machinery', entry);
  return response.data;
};

export const updateMachinery = async (id, entry) => {
  const response = await api.put(`/machinery/${id}`, entry);
  return response.data;
};

export const deleteMachinery = async (id) => {
  const response = await api.delete(`/machinery/${id}`);
  return response.data;
};
