import { useState, useEffect } from 'react';
import { getSites } from '../api/siteApi';
import { getSiteDocuments, uploadDocument, downloadDocument, deleteDocument } from '../api/documentApi';

const DOC_TYPES = ['TENDER_NOTICE', 'NIT', 'BOQ', 'CORRIGENDUM', 'DPR', 'ESTIMATE', 'RATE_ANALYSIS', 'AGREEMENT', 'WORK_ORDER', 'LAYOUT_DRAWING', 'STRUCTURAL_DRAWING', 'CROSS_SECTION', 'BEFORE_PHOTO', 'PROGRESS_PHOTO', 'COMPLETION_PHOTO', 'LETTER', 'OTHER'];

export default function DocumentsPage() {
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    documentType: 'OTHER',
    file: null,
    version: '',
    description: '',
  });

  useEffect(() => {
    getSites().then(res => setSites(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      setLoading(true);
      getSiteDocuments(selectedSiteId)
        .then(res => setDocs(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [selectedSiteId]);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, file });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.file) {
      setError('Please select a file to upload');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', form.file);
      formData.append('documentType', form.documentType);
      formData.append('siteId', selectedSiteId);
      formData.append('version', form.version || '');
      formData.append('description', form.description || '');

      await uploadDocument(formData);
      setShowForm(false);
      setForm({ documentType: 'OTHER', file: null, version: '', description: '' });
      const res = await getSiteDocuments(selectedSiteId);
      setDocs(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (doc) => {
    try {
      const response = await downloadDocument(doc.id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download file');
    }
  };

  const handleView = async (doc) => {
    try {
      const response = await downloadDocument(doc.id);
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      alert('Failed to open file');
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await deleteDocument(docId);
      const res = await getSiteDocuments(selectedSiteId);
      setDocs(res.data);
    } catch (err) {
      alert('Failed to delete document');
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
        {selectedSiteId && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
          >
            {showForm ? 'Cancel' : '+ Upload Document'}
          </button>
        )}
      </div>

      <select
        value={selectedSiteId}
        onChange={(e) => setSelectedSiteId(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
      >
        <option value="">Select a site...</option>
        {sites.map(s => (
          <option key={s.id} value={s.id}>{s.siteName}</option>
        ))}
      </select>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {showForm && selectedSiteId && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document Type *</label>
              <select
                required
                value={form.documentType}
                onChange={(e) => setForm({ ...form, documentType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                {DOC_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select File *</label>
              <input
                type="file"
                required
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
              <input
                type="text"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g., V1, V2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                rows={2}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={uploading}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : selectedSiteId ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">File Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Version</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Description</th>
                <th className="text-center py-3 px-4 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
                      {d.documentType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium">{d.fileName}</td>
                  <td className="py-3 px-4">{d.version || '-'}</td>
                  <td className="py-3 px-4 text-gray-600 max-w-xs truncate">{d.description || '-'}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleView(d)}
                        className="px-3 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100"
                        title="View"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDownload(d)}
                        className="px-3 py-1 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100"
                        title="Download"
                      >
                        Download
                      </button>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                        title="Delete"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No documents uploaded
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">Select a site to view documents</div>
      )}
    </div>
  );
}
