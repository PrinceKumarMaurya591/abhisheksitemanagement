import api from './axios';

export const getMyBalance = () =>
  api.get('/balance-ledger/my-balance').then(res => res.data);

export const getMyTransactions = (siteId) =>
  api.get('/balance-ledger/my-transactions', { params: { siteId } }).then(res => res.data);

export const getStaffBalance = (staffUserId) =>
  api.get(`/balance-ledger/staff/${staffUserId}`).then(res => res.data);

export const giveAdvance = (data) =>
  api.post('/balance-ledger/advance', data).then(res => res.data);
