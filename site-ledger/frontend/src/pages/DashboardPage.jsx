import { useState, useEffect } from 'react';
import { getOwnerDashboard } from '../api/dashboardApi';
import { getSites } from '../api/siteApi';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

function StatCard({ title, value, icon, color, href }) {
  const card = (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );

  if (href) {
    return <Link to={href}>{card}</Link>;
  }
  return card;
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState(null);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashRes, sitesRes] = await Promise.all([
        getOwnerDashboard(),
        getSites(),
      ]);
      setDashboard(dashRes.data);
      setSites(sitesRes.data);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '₹0';
    return '₹' + Number(value).toLocaleString('en-IN', {
      maximumFractionDigits: 0,
    });
  };

  if (loading) {
    return (
      <Layout><div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div></Layout>
    );
  }

  if (error) {
    return (
      <Layout><div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div></Layout>
    );
  }

  const siteStatusData = [
    { name: 'Running', value: dashboard?.runningSites || 0 },
    { name: 'Completed', value: dashboard?.completedSites || 0 },
  ];

  const expenseData = [
    { name: 'Material', amount: Number(dashboard?.totalMaterialCost || 0) },
    { name: 'Labour', amount: Number(dashboard?.totalLabourCost || 0) },
    { name: 'Other', amount: Number(dashboard?.totalExpense || 0) - Number(dashboard?.totalMaterialCost || 0) - Number(dashboard?.totalLabourCost || 0) },
  ];

  return (
    <Layout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Owner Dashboard</h1>
        <Link
          to="/sites"
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          Manage Sites
        </Link>
      </div>

      {/* KPI Cards — all clickable, navigate to the relevant section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Sites" value={dashboard?.totalSites || 0} icon="🏗️" color="#4F46E5" href="/sites" />
        <StatCard title="Running Sites" value={dashboard?.runningSites || 0} icon="🔄" color="#10B981" href="/sites" />
        <StatCard title="Completed Sites" value={dashboard?.completedSites || 0} icon="✅" color="#F59E0B" href="/sites" />
        <StatCard title="Total Contract Value" value={formatCurrency(dashboard?.totalContractValue)} icon="📋" color="#8B5CF6" href="/sites" />
        <StatCard title="Total Received" value={formatCurrency(dashboard?.totalReceived)} icon="💰" color="#10B981" href="/payments" />
        <StatCard title="Total Pending" value={formatCurrency(dashboard?.totalPending)} icon="⏳" color="#EF4444" href="/payments" />
        <StatCard title="Total Expense" value={formatCurrency(dashboard?.totalExpense)} icon="💸" color="#F59E0B" href="/expenses" />
        <StatCard title="Outstanding Advances" value={formatCurrency(dashboard?.outstandingAdvances)} icon="📤" color="#EC4899" href="/advances" />
      </div>

      {/* Profit/Loss Highlight */}
      <div className={`rounded-xl p-6 ${(dashboard?.overallProfitLoss || 0) >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Overall Profit / Loss</p>
            <p className={`text-3xl font-bold mt-1 ${(dashboard?.overallProfitLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(dashboard?.overallProfitLoss)}
            </p>
          </div>
          <span className="text-5xl">{(dashboard?.overallProfitLoss || 0) >= 0 ? '📈' : '📉'}</span>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Site Status Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Site Status Overview</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={siteStatusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {siteStatusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Expense Breakdown Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={expenseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis tickFormatter={(value) => '₹' + (value / 1000).toFixed(0) + 'K'} />
              <Tooltip formatter={(value) => ['₹' + Number(value).toLocaleString('en-IN'), 'Amount']} />
              <Bar dataKey="amount" fill="#4F46E5" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Sites */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">All Sites</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Site Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Work Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Contract Value</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Action</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((site) => (
                <tr key={site.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{site.siteName}</td>
                  <td className="py-3 px-4 text-gray-600">{site.workName || '-'}</td>
                  <td className="py-3 px-4">{formatCurrency(site.contractValue)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      site.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      site.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {site.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Link to={`/sites/${site.id}`} className="text-indigo-600 hover:text-indigo-800 font-medium">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
              {sites.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">No sites created yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    </Layout>
  );
}
