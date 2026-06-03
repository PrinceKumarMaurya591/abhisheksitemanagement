import api from './axios';

export const getSiteLedger = async (siteId) => {
  const response = await api.get(`/ledger/site/${siteId}`);
  return response.data;
};

export const createLedgerEntry = async (entry) => {
  const response = await api.post('/ledger', entry);
  return response.data;
};
