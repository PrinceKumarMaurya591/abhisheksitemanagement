import api from './axios';

export const getSiteDocuments = async (siteId) => {
  const response = await api.get(`/documents/site/${siteId}`);
  return response.data;
};

export const uploadDocument = async (formData) => {
  const response = await api.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const downloadDocument = async (documentId) => {
  const response = await api.get(`/documents/download/${documentId}`, {
    responseType: 'blob',
  });
  return response;
};

export const deleteDocument = async (documentId) => {
  const response = await api.delete(`/documents/${documentId}`);
  return response.data;
};
