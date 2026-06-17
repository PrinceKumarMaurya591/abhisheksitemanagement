import api from './axios';

export const getSiteMaterials = async (siteId) => {
  const response = await api.get(`/materials/site/${siteId}`);
  return response.data;
};

export const createMaterial = async (material) => {
  const response = await api.post('/materials', material);
  return response.data;
};

export const updateMaterial = async (id, material) => {
  const response = await api.put(`/materials/${id}`, material);
  return response.data;
};

export const deleteMaterial = async (id) => {
  const response = await api.delete(`/materials/${id}`);
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

export const getMaterialTransactions = async (materialId) => {
  const response = await api.get(`/materials/transactions/material/${materialId}`);
  return response.data;
};

export const getSiteMaterialTransactions = async (siteId) => {
  const response = await api.get(`/materials/transactions/site/${siteId}`);
  return response.data;
};
