import api from './axios';

export const getMyWork = async (siteId) => {
  const params = siteId ? { siteId } : {};
  const response = await api.get('/subcontractor-work/my-work', { params });
  return response.data;
};

export const getSiteWork = async (siteId) => {
  const response = await api.get(`/subcontractor-work/site/${siteId}`);
  return response.data;
};

export const getSubcontractorWork = async (subcontractorId, siteId) => {
  const params = siteId ? { siteId } : {};
  const response = await api.get(`/subcontractor-work/subcontractor/${subcontractorId}`, { params });
  return response.data;
};

export const createWorkEntry = async (formData) => {
  const response = await api.post('/subcontractor-work', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const updatePaymentStatus = async (id, paymentAmount, paymentStatus) => {
  const response = await api.put(`/subcontractor-work/${id}/payment`, null, {
    params: { paymentAmount, paymentStatus },
  });
  return response.data;
};

export const deleteWorkEntry = async (id) => {
  const response = await api.delete(`/subcontractor-work/${id}`);
  return response.data;
};
