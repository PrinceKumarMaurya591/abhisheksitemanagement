import api from './axios';

export const getUsers = async () => {
  const response = await api.get('/users');
  return response.data;
};

export const getUser = async (id) => {
  const response = await api.get(`/users/${id}`);
  return response.data;
};

export const suspendUser = async (id) => {
  const response = await api.put(`/users/${id}/suspend`);
  return response.data;
};

export const createUser = async (userData) => {
  const response = await api.post('/users/create', userData);
  return response.data;
};

export const updateUser = async (id, userData) => {
  const response = await api.put(`/users/${id}`, userData);
  return response.data;
};
