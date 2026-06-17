import api from './axios';

export const getSiteAdvances = async (siteId) => {
  const response = await api.get(`/advances/site/${siteId}`);
  return response.data;
};

export const createAdvance = async (advance) => {
  const response = await api.post('/advances', advance);
  return response.data;
};

export const updateAdvance = async (id, advance) => {
  const response = await api.put(`/advances/${id}`, advance);
  return response.data;
};

export const deleteAdvance = async (id) => {
  const response = await api.delete(`/advances/${id}`);
  return response.data;
};

export const addAdvanceExpense = async (advanceId, expense) => {
  const response = await api.post(`/advances/${advanceId}/expense`, expense);
  return response.data;
};

export const settleAdvance = async (advanceId) => {
  const response = await api.post(`/advances/${advanceId}/settle`);
  return response.data;
};
