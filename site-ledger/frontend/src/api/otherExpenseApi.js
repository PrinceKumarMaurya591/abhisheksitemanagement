import api from './axios';

export const getOtherExpenses = async (params = {}) => {
  const response = await api.get('/other-expenses', { params });
  return response.data;
};
export const getOtherExpense = async (id) => {
  const response = await api.get(`/other-expenses/${id}`);
  return response.data;
};
export const createOtherExpense = async (data) => {
  const response = await api.post('/other-expenses', data);
  return response.data;
};
export const updateOtherExpense = async (id, data) => {
  const response = await api.put(`/other-expenses/${id}`, data);
  return response.data;
};
export const deleteOtherExpense = async (id) => {
  const response = await api.delete(`/other-expenses/${id}`);
  return response.data;
};
