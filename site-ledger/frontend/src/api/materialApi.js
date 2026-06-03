import api from './axios';

export const getSiteMaterials = async (siteId) => {
  const response = await api.get(`/materials/site/${siteId}`);
  return response.data;
};

export const createMaterial = async (material) => {
  const response = await api.post('/materials', material);
  return response.data;
};

export const purchaseMaterial = async (transaction) => {
  const response = await api.post('/materials/purchase', transaction);
  return response.data;
};

export const shiftMaterial = async (transaction) => {
  const response = await api.post('/materials/shift', transaction);
  return response.data;
};

export const consumeMaterial = async (transaction) => {
  const response = await api.post('/materials/consume', transaction);
  return response.data;
};
