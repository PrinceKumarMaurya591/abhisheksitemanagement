import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSites } from '../api/siteApi';
import { getSiteDashboard } from '../api/dashboardApi';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [sites, setSites] = useState([]);
  const [dashboards, setDashboards] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);

  const isSiteStaff = user?.role === 'SITE_INCHARGE' || user?.role === 'MUNSHI' || user?.role === 'MATE';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const sitesRes = await getSites();
      const sitesData = sitesRes.data || [];
      setSites(sitesData);

      // Load dashboard for each assigned site
      const dashMap = {};
      for (const site of sitesData) {
        try {
          const dashRes = await getSiteDashboard(site.id);
          if (dashRes.success) {
            dashMap[site.id] = dashRes.data;
          }
        } catch (e) {
          // Skip if dashboard fails
        }
      }
      setDashboards(dashMap);
    } catch (err) {
      setError('Failed to load your sites. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (v) => v ? '₹' + Number(v).toLocaleString('en-IN') : '₹0';

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
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-800 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">👋 Welcome, {user?.fullName || user?.username}!</h1>
              <p className="text-indigo-200 mt-1">
                {isSiteStaff ? 'You are assigned to ' + sites.length + ' site(s)' : 'Manage your sites and track progress'}
              </p>
            </div>
            <span className="text-4xl">🏗️</span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        {/* Assigned Sites */}
        {sites.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <p className="text-4xl mb-4">📋</p>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Sites Assigned</h2>
            <p className="text-gray-500">You haven't been assigned to any sites yet. Contact your admin to get assigned.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {sites.map((site) => {
              const dash = dashboards[site.id] || {};
              const balance = Number(dash.totalReceived || 0) - Number(dash.totalExpense || 0);
              return (
                <div key={site.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  {/* Site Header */}
                  <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold text-gray-900">{site.siteName}</h2>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">🏢 {site.department || 'N/A'}</span>
                          <span>→</span>
                          <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs">
                            📋 {site.yojna?.yojnaName || 'N/A'}
                          </span>
                          <span>→</span>
                          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-xs">
                            🏗️ {site.workName || site.siteName}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          site.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                          site.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                          site.status === 'ON_HOLD' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>{site.status}</span>
                      </div>
                    </div>
                  </div>

                  {/* Financial Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100">
                    <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                      <p className="text-xs text-green-600 font-medium">💰 Total Received</p>
                      <p className="text-lg font-bold text-green-700">{formatCurrency(dash.totalReceived)}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 border border-red-100">
                      <p className="text-xs text-red-600 font-medium">💸 Total Expenses</p>
                      <p className="text-lg font-bold text-red-700">{formatCurrency(dash.totalExpense)}</p>
                    </div>
                    <div className={`rounded-lg p-3 border ${balance >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
                      <p className="text-xs font-medium ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}">⚖️ Remaining Balance</p>
                      <p className={`text-lg font-bold ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                        {formatCurrency(balance)}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                      <p className="text-xs text-purple-600 font-medium">📋 Contract Value</p>
                      <p className="text-lg font-bold text-purple-700">{formatCurrency(dash.contractValue)}</p>
                    </div>
                  </div>

                  {/* Quick Entry Links */}
                  <div className="px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/materials?siteId=${site.id}`}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
                        📦 Material Received
                      </Link>
                      <Link to={`/materials?siteId=${site.id}`}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-xs font-medium hover:bg-green-100 transition-colors">
                        🔨 Material Consumed
                      </Link>
                      <Link to={`/materials?siteId=${site.id}`}
                        className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-100 transition-colors">
                        📋 Other Materials
                      </Link>
                      <Link to={`/labour?siteId=${site.id}`}
                        className="flex items-center gap-1.5 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium hover:bg-orange-100 transition-colors">
                        👷 Work Progress
                      </Link>
                      <Link to={`/expenses?siteId=${site.id}`}
                        className="flex items-center gap-1.5 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg text-xs font-medium hover:bg-yellow-100 transition-colors">
                        💸 Other Expenses
                      </Link>
                      <Link to={`/sites/${site.id}`}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-medium hover:bg-indigo-100 transition-colors">
                        📊 View Full Details →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
          <p className="font-medium mb-1">💡 Quick Tips:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use <strong>Material Received</strong> to record new materials delivered to your site</li>
            <li>Use <strong>Work Progress</strong> to track daily labour and attendance</li>
            <li>Use <strong>Other Expenses</strong> for petty cash expenses (water, tea, tools, etc.)</li>
            <li>Your <strong>Balance</strong> shows how much company money remains with you</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
}
