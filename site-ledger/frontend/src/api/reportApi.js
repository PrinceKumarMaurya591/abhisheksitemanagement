import api from './axios';

/**
 * Download site report as Excel file.
 * Returns a Blob that can be used with URL.createObjectURL for download.
 */
export const downloadSiteExcel = async (siteId) => {
  const response = await api.get(`/reports/site/${siteId}/excel`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Download site report as PDF file.
 * Returns a Blob that can be used with URL.createObjectURL for download.
 */
export const downloadSitePdf = async (siteId) => {
  const response = await api.get(`/reports/site/${siteId}/pdf`, {
    responseType: 'blob',
  });
  return response.data;
};

/**
 * Trigger a file download in the browser.
 */
export function triggerDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
