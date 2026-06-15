import api from './axios';

export const getYojnas = async () => {
  const response = await api.get('/yojnas');
  return response.data;
};
export const getYojna = async (id) => {
  const response = await api.get(`/yojnas/${id}`);
  return response.data;
};
export const getYojnaSites = async (id) => {
  const response = await api.get(`/yojnas/${id}/sites`);
  return response.data;
};
export const createYojna = async (data) => {
  const response = await api.post('/yojnas', data);
  return response.data;
};
export const updateYojna = async (id, data) => {
  const response = await api.put(`/yojnas/${id}`, data);
  return response.data;
};
export const deleteYojna = async (id) => {
  const response = await api.delete(`/yojnas/${id}`);
  return response.data;
};
export const updateYojnaStatus = async (id, data) => {
  const response = await api.put(`/yojnas/${id}/status`, data);
  return response.data;
};
