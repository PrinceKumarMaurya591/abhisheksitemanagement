import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getMyBalance, getMyTransactions } from '../api/balanceApi';
import { getSites } from '../api/siteApi';
import { useAuth } from '../context/AuthContext';

export default function BalancePage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isSiteStaff = user?.role === 'SITE_INCHARGE' || user?.role === 'MUNSHI' || user?.role === 'MATE';

  useEffect(() => {
    loadData();
  }, []);

  // Reload balance and transactions when site filter changes
  useEffect(() => {
    if (!loading) {
      loadBalanceAndTransactions();
    }
  }, [selectedSiteId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [balanceRes, txnRes, sitesRes] = await Promise.all([
        getMyBalance(),
        getMyTransactions(null),
        getSites(),
      ]);
      if (balanceRes.success) setBalance(balanceRes.data);
      if (txnRes.success) setTransactions(txnRes.data || []);
      if (sitesRes.success) setSites(sitesRes.data || []);
    } catch (err) {
      setError('Failed to load balance data');
    } finally {
      setLoading(false);
    }
  };

  const loadBalanceAndTransactions = async () => {
    try {
      const siteIdParam = selectedSiteId || null;
      const [balanceRes, txnRes] = await Promise.all([
        getMyBalance(siteIdParam),
        getMyTransactions(siteIdParam),
      ]);
      if (balanceRes.success) setBalance(balanceRes.data);
      if (txnRes.success) setTransactions(txnRes.data || []);
    } catch (err) {
      console.error('Failed to load data', err);
    }
  };

  const formatCurrency = (v) => '₹' + Number(v).toLocaleString('en-IN');

  const getTxnIcon = (type) => {
    switch (type) {
      case 'RECEIVED': return '💰';
      case 'EXPENSE': return '💸';
      case 'SETTLEMENT': return '✅';
      default: return '📝';
    }
  };

  const getSourceLabel = (source) => {
    const labels = {
      COMPANY_ADVANCE: '🏢 Company Advance',
      PERSONAL_MONEY: '👤 Personal Money',
      VENDOR_CREDIT: '📝 Vendor Credit',
    };
    return labels[source] || source || '-';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">📊 My Balance Ledger</h1>
          <button onClick={loadData} className="text-indigo-600 hover:text-indigo-800 text-sm font-medium">
            🔄 Refresh
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {!isSiteStaff ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-sm">
            यह Page केवल Site Staff (Site Incharge / Munshi) के लिए है।
          </div>
        ) : null}

        {/* Site Filter */}
        {sites.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Filter by Site:</label>
            <select
              value={selectedSiteId}
              onChange={(e) => setSelectedSiteId(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">All Sites (Combined)</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.siteName} {s.district ? `(${s.district})` : ''}
                </option>
              ))}
            </select>
            <span className="text-xs text-gray-400">
              {selectedSiteId
                ? `Showing transactions for selected site`
                : 'Showing transactions across all sites'}
            </span>
          </div>
        )}

        {/* Balance Summary Cards */}
        {balance && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500 font-medium">💰 Company Amount Received</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(balance.totalReceived || 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">कंपनी से मिली रकम</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <p className="text-sm text-gray-500 font-medium">💸 Total Expenses Submitted</p>
              <p className="text-2xl font-bold text-red-600 mt-1">
                {formatCurrency(balance.totalExpense || 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">कुल खर्च किया गया</p>
            </div>
            <div className={`rounded-xl shadow-sm border p-6 ${
              Number(balance.currentBalance || 0) >= 0
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            }`}>
              <p className="text-sm font-medium text-gray-500">📊 Current Balance</p>
              <p className={`text-2xl font-bold mt-1 ${
                Number(balance.currentBalance || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(balance.currentBalance || 0)}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {Number(balance.currentBalance || 0) >= 0
                  ? '✅ कंपनी को वापस करना है'
                  : '❗ कंपनी को आपको देना है'}
              </p>
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">💡 How Balance Works:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Positive Balance:</strong> कंपनी का पैसा आपके पास है, वापस करना है</li>
            <li><strong>Negative Balance:</strong> आपने अपने पैसे खर्च किए, कंपनी को आपको देना है</li>
            <li>Expense करते समय Payment Source चुनें: Company Advance / Personal Money / Vendor Credit</li>
            <li><strong>Site Filter:</strong> ऊपर Site चुनकर देखें कि किस Site पर कितना मिला और खर्च किया</li>
          </ul>
        </div>

        {/* Transaction History */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">📋 Transaction History</h3>
            {selectedSiteId && (
              <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded border">
                Site: {sites.find(s => s.id === Number(selectedSiteId))?.siteName || 'Selected'}
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-100">
            {transactions.length === 0 ? (
              <div className="py-8 text-center text-gray-400">No transactions yet</div>
            ) : (
              transactions.map((txn) => (
                <div key={txn.id} className="px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{getTxnIcon(txn.transactionType)}</span>
                      <div>
                        <p className="font-medium text-sm">
                          {txn.transactionType === 'RECEIVED' ? 'Company Advance Given' :
                           txn.transactionType === 'EXPENSE' ? `Expense - ${txn.description || ''}` :
                           'Settlement'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {txn.date} {txn.paymentSource ? `| ${getSourceLabel(txn.paymentSource)}` : ''}
                          {txn.vendorName ? ` | Vendor: ${txn.vendorName}` : ''}
                          {txn.site?.siteName ? ` | Site: ${txn.site.siteName}` : ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${
                        txn.transactionType === 'RECEIVED' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {txn.transactionType === 'RECEIVED' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Balance: {formatCurrency(txn.runningBalance || 0)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
