import api from './axios';

export const getCategories = async (activeOnly = false) => {
  const response = await api.get(`/expense-categories${activeOnly ? '?activeOnly=true' : ''}`);
  return response.data;
};
export const getCategory = async (id) => {
  const response = await api.get(`/expense-categories/${id}`);
  return response.data;
};
export const createCategory = async (data) => {
  const response = await api.post('/expense-categories', data);
  return response.data;
};
export const updateCategory = async (id, data) => {
  const response = await api.put(`/expense-categories/${id}`, data);
  return response.data;
};
export const deleteCategory = async (id) => {
  const response = await api.delete(`/expense-categories/${id}`);
  return response.data;
};
