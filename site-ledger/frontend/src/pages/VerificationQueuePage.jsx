import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getPendingVerifications, verifyEntry, getAuditLogs } from '../api/verificationApi';
import { getSites } from '../api/siteApi';
import { useAuth } from '../context/AuthContext';

export default function VerificationQueuePage() {
  const { user } = useAuth();
  const [pendingList, setPendingList] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [auditModal, setAuditModal] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  const isOffice = user?.role === 'OWNER' || user?.role === 'OFFICE_ADMIN';

  useEffect(() => {
    getSites().then(res => {
      if (res.success) setSites(res.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadPending();
  }, [selectedSiteId]);

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await getPendingVerifications(selectedSiteId || null);
      if (res.success) setPendingList(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (entityType, entityId) => {
    try {
      const res = await verifyEntry(entityType, entityId);
      if (res.success) {
        setMsg({ type: 'success', text: `${entityType} #${entityId} verified!` });
        loadPending();
      }
    } catch (err) {
      setMsg({ type: 'error', text: 'Verification failed' });
    }
  };

  const handleViewAudit = async (entityType, entityId) => {
    try {
      const res = await getAuditLogs(entityType, entityId);
      if (res.success) {
        setAuditLogs(res.data || []);
        setAuditModal({ entityType, entityId });
      }
    } catch (e) {
      alert('Failed to load audit logs');
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN') : '-';
  const formatCurrency = (v) => '₹' + Number(v || 0).toLocaleString('en-IN');

  const summaryBySite = pendingList.reduce((acc, item) => {
    const siteName = item.siteName || 'Unknown';
    if (!acc[siteName]) acc[siteName] = [];
    acc[siteName].push(item);
    return acc;
  }, {});

  if (!isOffice) {
    return (
      <Layout>
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
          This page is only for Office/Admin users.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">✅ Verification Queue</h1>
            <p className="text-sm text-gray-500 mt-1">
              {pendingList.length} entry(s) pending verification
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">All Sites</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.siteName}</option>)}
            </select>
            <button onClick={loadPending}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
              🔄 Refresh
            </button>
          </div>
        </div>

        {msg && (
          <div className={`px-4 py-3 rounded-lg text-sm ${
            msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {msg.text}
            <button onClick={() => setMsg(null)} className="float-right font-bold">&times;</button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading verification queue...</div>
        ) : pendingList.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <span className="text-5xl block mb-4">✅</span>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">All Clear!</h3>
            <p className="text-gray-500">No entries pending verification.</p>
          </div>
        ) : (
          Object.entries(summaryBySite).map(([siteName, entries]) => (
            <div key={siteName} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">🏗️ {siteName}</h3>
                <span className="text-sm text-gray-500">{entries.length} pending</span>
              </div>
              <div className="divide-y divide-gray-100">
                {entries.map((entry, idx) => (
                  <div key={`${entry.entityType}-${entry.entityId}-${idx}`}
                    className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <span className={`text-xl ${
                        entry.entityType === 'LABOUR' ? '👷' : '💸'
                      }`}></span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            entry.entityType === 'LABOUR' ? 'bg-orange-50 text-orange-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {entry.entityType}
                          </span>
                          <span className="font-medium text-sm">#{entry.entityId}</span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{entry.summary}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          By: {entry.createdBy || 'Unknown'} | {formatDate(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {entry.amount && Number(entry.amount) > 0 && (
                        <span className="text-sm font-medium text-gray-700 mr-2">
                          {formatCurrency(entry.amount)}
                        </span>
                      )}
                      <button onClick={() => handleVerify(entry.entityType, entry.entityId)}
                        className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-600">
                        ✅ Verify
                      </button>
                      <button onClick={() => handleViewAudit(entry.entityType, entry.entityId)}
                        className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-200">
                        📋 History
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Audit Log Modal */}
        {auditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setAuditModal(null)}>
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  📋 Audit History — {auditModal.entityType} #{auditModal.entityId}
                </h3>
                <button onClick={() => setAuditModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>
              <div className="p-6">
                {auditLogs.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">No audit records found</p>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map((log, i) => (
                      <div key={i} className="border border-gray-100 rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-700">{log.username}</span>
                          <span className="text-xs text-gray-400">{formatDate(log.createdAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                          <span className={`px-2 py-0.5 rounded ${
                            log.action === 'CREATE' ? 'bg-green-50 text-green-700' :
                            log.action === 'UPDATE' ? 'bg-blue-50 text-blue-700' :
                            'bg-red-50 text-red-700'
                          }`}>{log.action}</span>
                          {log.fieldName && <span className="text-gray-500">Field: {log.fieldName}</span>}
                        </div>
                        {(log.oldValue || log.newValue) && (
                          <div className="mt-2 text-xs bg-gray-50 rounded p-2">
                            {log.oldValue && <p className="text-red-600">Old: {log.oldValue}</p>}
                            {log.newValue && <p className="text-green-600">New: {log.newValue}</p>}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
