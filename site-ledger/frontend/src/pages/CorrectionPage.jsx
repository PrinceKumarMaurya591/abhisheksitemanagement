import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getSites } from '../api/siteApi';
import {
  getPendingCorrections,
  approveCorrection,
  rejectCorrection,
  getCorrectionHistory,
} from '../api/correctionApi';
import { useAuth } from '../context/AuthContext';

const CORRECTION_TABS = [
  { id: 'pending', label: 'Pending Corrections', icon: '⏳' },
  { id: 'history', label: 'History', icon: '📋' },
];

export default function CorrectionPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('pending');
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [pendingList, setPendingList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [selectedCorrection, setSelectedCorrection] = useState(null);
  const [correctedValues, setCorrectedValues] = useState({});
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(null);
  const [historyModal, setHistoryModal] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const isOwnerOrOffice = user?.role === 'OWNER' || user?.role === 'OFFICE_ADMIN';

  useEffect(() => {
    getSites().then(res => {
      if (res.success) setSites(res.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'pending') loadPending();
  }, [selectedSiteId, activeTab]);

  const loadPending = async () => {
    setLoading(true);
    try {
      const res = await getPendingCorrections(selectedSiteId || null);
      if (res.success) setPendingList(res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (correction) => {
    try {
      // Build corrected values from the form
      const values = {};
      if (correctedValues[correction.id]) {
        Object.entries(correctedValues[correction.id]).forEach(([key, val]) => {
          if (val !== '') values[key] = val;
        });
      }
      const res = await approveCorrection(correction.id, values);
      if (res.success) {
        setMsg({ type: 'success', text: `✅ Correction #${correction.id} approved!` });
        setSelectedCorrection(null);
        loadPending();
      }
    } catch (err) {
      setMsg({ type: 'error', text: '❌ Failed to approve correction' });
    }
  };

  const handleReject = async (correctionId) => {
    if (!rejectReason.trim()) return;
    try {
      const res = await rejectCorrection(correctionId, rejectReason);
      if (res.success) {
        setMsg({ type: 'success', text: `✅ Correction #${correctionId} rejected` });
        setShowRejectInput(null);
        setRejectReason('');
        loadPending();
      }
    } catch (err) {
      setMsg({ type: 'error', text: '❌ Failed to reject correction' });
    }
  };

  const loadHistory = async (entityType, entityId) => {
    setHistoryLoading(true);
    try {
      const res = await getCorrectionHistory(entityType, entityId);
      if (res.success) setHistoryData(res.data || []);
    } catch (e) {
      setHistoryData([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  const openHistory = (correction) => {
    setHistoryModal(correction);
    loadHistory(correction.entityType, correction.entityId);
  };

  const parseSnapshot = (jsonStr) => {
    try {
      return JSON.parse(jsonStr);
    } catch {
      return null;
    }
  };

  const renderSnapshot = (snapshot) => {
    const data = parseSnapshot(snapshot);
    if (!data) return <span className="text-gray-400">No data</span>;
    return (
      <div className="text-xs space-y-1 max-h-60 overflow-y-auto">
        {Object.entries(data).filter(([k]) => !['id','site','createdAt','updatedAt','createdBy','verified','verifiedAt','verifiedBy'].includes(k)).map(([key, val]) => (
          <div key={key} className="flex justify-between border-b border-gray-100 py-0.5">
            <span className="font-medium text-gray-600 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
            <span className="text-gray-900">{val !== null ? String(val) : '-'}</span>
          </div>
        ))}
      </div>
    );
  };

  const getEntityLabel = (type) => {
    const labels = { LABOUR: '👷 Labour', EXPENSE: '💸 Expense', MATERIAL: '📦 Material', TRANSPORT: '🚛 Transport', MACHINERY: '🏗️ Machinery' };
    return labels[type] || type;
  };

  if (!isOwnerOrOffice) {
    return (
      <Layout>
        <div className="text-center py-20 text-gray-500">⛔ You don't have access to this page.</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">📝 Correction Workflow</h1>

        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {msg.text}
            <button className="float-right font-bold" onClick={() => setMsg(null)}>✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          {CORRECTION_TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Site Filter */}
        {activeTab === 'pending' && (
          <>
            <div className="mb-4">
              <select value={selectedSiteId} onChange={e => setSelectedSiteId(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full max-w-xs">
                <option value="">All Sites</option>
                {sites.map(s => <option key={s.id} value={s.id}>{s.siteName}</option>)}
              </select>
            </div>

            {loading ? (
              <div className="text-center py-10 text-gray-500">Loading...</div>
            ) : pendingList.length === 0 ? (
              <div className="text-center py-20 text-gray-400">
                <span className="text-4xl block mb-4">✅</span>
                No pending corrections
              </div>
            ) : (
              <div className="space-y-4">
                {pendingList.map(correction => (
                  <div key={correction.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="inline-block bg-yellow-100 text-yellow-800 text-xs font-medium px-2.5 py-0.5 rounded-full mb-2">
                          {getEntityLabel(correction.entityType)} #{correction.entityId}
                        </span>
                        <p className="text-sm text-gray-500">Requested by: <strong>{correction.requestedBy}</strong></p>
                        <p className="text-xs text-gray-400">{new Date(correction.createdAt).toLocaleString()}</p>
                      </div>
                      <button onClick={() => openHistory(correction)} className="text-xs text-indigo-600 hover:text-indigo-800">
                        📋 History
                      </button>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-sm font-medium text-gray-700 mb-1">📝 Reason:</p>
                      <p className="text-sm text-gray-600">{correction.correctionReason}</p>
                    </div>

                    {/* Original Snapshot */}
                    <details className="mb-3">
                      <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                        📄 View Original Entry
                      </summary>
                      <div className="mt-2 bg-gray-50 rounded-lg p-3 border border-gray-200">
                        {renderSnapshot(correction.originalSnapshot)}
                      </div>
                    </details>

                    {/* Correction Form */}
                    <div className="border-t border-gray-100 pt-3 mt-3">
                      <button onClick={() => setSelectedCorrection(selectedCorrection === correction.id ? null : correction.id)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-2">
                        {selectedCorrection === correction.id ? '▼ Hide Correction Form' : '▶ Enter Corrected Values'}
                      </button>

                      {selectedCorrection === correction.id && (
                        <div className="space-y-3 mt-2 bg-indigo-50 rounded-lg p-4">
                          <p className="text-sm font-medium text-indigo-800">✏️ Enter corrected values (leave blank to keep original):</p>
                          <div className="grid grid-cols-2 gap-3">
                            {(() => {
                              const snapshot = parseSnapshot(correction.originalSnapshot);
                              if (!snapshot) return null;
                              return Object.entries(snapshot)
                                .filter(([k]) => !['id','site','createdAt','updatedAt','createdBy','verified','verifiedAt','verifiedBy','hibernateLazyInitializer','handler'].includes(k))
                                .filter(([,v]) => v === null || v === undefined || typeof v === 'string' || typeof v === 'number' || v instanceof Number)
                                .map(([key, val]) => (
                                  <div key={key}>
                                    <label className="block text-xs text-gray-600 capitalize mb-1">{key.replace(/([A-Z])/g, ' $1')}</label>
                                    <input type="text" defaultValue={val !== null && val !== undefined ? String(val) : ''}
                                      onChange={e => {
                                        setCorrectedValues(prev => ({
                                          ...prev,
                                          [correction.id]: { ...(prev[correction.id] || {}), [key]: e.target.value }
                                        }));
                                      }}
                                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs" />
                                  </div>
                                ));
                            })()}
                          </div>

                          <div className="flex gap-2 mt-3">
                            <button onClick={() => handleApprove(correction)}
                              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700">
                              ✅ Approve & Apply
                            </button>
                            <button onClick={() => setShowRejectInput(showRejectInput === correction.id ? null : correction.id)}
                              className="bg-red-100 text-red-700 px-4 py-2 rounded-lg text-sm hover:bg-red-200">
                              ❌ Reject
                            </button>
                          </div>

                          {showRejectInput === correction.id && (
                            <div className="mt-2 space-y-2">
                              <textarea placeholder="Rejection reason..."
                                value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2 text-sm" rows={2} />
                              <button onClick={() => handleReject(correction.id)}
                                disabled={!rejectReason.trim()}
                                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-700 disabled:opacity-50">
                                Confirm Reject
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="text-center py-20 text-gray-400">
            <span className="text-4xl block mb-4">📋</span>
            <p className="mb-4">Select a correction from Pending tab and click "History"</p>
            <p className="text-sm">Or visit individual entry pages to see correction history.</p>
          </div>
        )}

        {/* History Modal */}
        {historyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  📋 Correction History — {getEntityLabel(historyModal.entityType)} #{historyModal.entityId}
                </h3>
                <button onClick={() => setHistoryModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
              </div>
              {historyLoading ? (
                <div className="text-center py-6 text-gray-500">Loading...</div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-6 text-gray-400">No correction history found</div>
              ) : (
                <div className="space-y-3">
                  {historyData.map(h => (
                    <div key={h.id} className={`border rounded-lg p-3 ${
                      h.status === 'APPROVED' ? 'border-green-200 bg-green-50' :
                      h.status === 'REJECTED' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
                    }`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          h.status === 'APPROVED' ? 'bg-green-200 text-green-800' :
                          h.status === 'REJECTED' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                        }`}>{h.status}</span>
                        <span className="text-xs text-gray-500">{new Date(h.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-gray-600">By: {h.requestedBy} {h.resolvedBy ? `→ ${h.resolvedBy}` : ''}</p>
                      <p className="text-sm text-gray-700 mt-1">{h.correctionReason}</p>
                      {h.rejectionReason && <p className="text-xs text-red-600 mt-1">Rejected: {h.rejectionReason}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
