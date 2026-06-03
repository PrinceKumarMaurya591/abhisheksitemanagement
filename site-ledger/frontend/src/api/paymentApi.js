import api from './axios';

export const getSitePayments = async (siteId) => {
  const response = await api.get(`/payments/site/${siteId}`);
  return response.data;
};

export const createPayment = async (payment) => {
  const response = await api.post('/payments', payment);
  return response.data;
};
