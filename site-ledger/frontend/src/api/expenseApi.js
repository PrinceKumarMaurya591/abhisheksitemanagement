import api from './axios';

export const getSiteExpenses = (siteId) =>
  api.get(`/expenses/site/${siteId}`).then(res => res.data);

export const createExpense = (data) =>
  api.post('/expenses', data).then(res => res.data);
