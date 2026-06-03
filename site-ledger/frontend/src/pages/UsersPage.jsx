import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { getUsers, suspendUser, createUser } from '../api/userApi';
import { useAuth } from '../context/AuthContext';

const roleColors = {
  OWNER: 'bg-red-100 text-red-800',
  OFFICE_ADMIN: 'bg-purple-100 text-purple-800',
  SITE_INCHARGE: 'bg-blue-100 text-blue-800',
  MUNSHI: 'bg-yellow-100 text-yellow-800',
  SUBCONTRACTOR: 'bg-green-100 text-green-800',
  SUBCONTRACTOR_ADMIN: 'bg-orange-100 text-orange-800',
};

const ROLES = ['OWNER', 'OFFICE_ADMIN', 'SITE_INCHARGE', 'MUNSHI', 'SUBCONTRACTOR', 'SUBCONTRACTOR_ADMIN'];

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const { user: currentUser } = useAuth();

  // Create user form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({
    username: '',
    password: '',
    email: '',
    fullName: '',
    phone: '',
    role: 'SUBCONTRACTOR',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await getUsers();
      if (response.success) {
        setUsers(response.data);
      } else {
        setError(response.message || 'Failed to fetch users');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSuspend = async (userId, currentlySuspended) => {
    const action = currentlySuspended ? 'activate' : 'suspend';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;
    try {
      const response = await suspendUser(userId);
      if (response.success) {
        setSuccessMessage(response.message || `User ${action}d successfully`);
        fetchUsers();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.message || `Failed to ${action} user`);
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${action} user`);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await createUser(form);
      if (response.success) {
        setSuccessMessage('User created successfully');
        setShowCreateForm(false);
        setForm({ username: '', password: '', email: '', fullName: '', phone: '', role: 'SUBCONTRACTOR' });
        fetchUsers();
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(response.message || 'Failed to create user');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const canManageUsers = currentUser?.role === 'OWNER' || currentUser?.role === 'SUBCONTRACTOR_ADMIN';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          {canManageUsers && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
            >
              {showCreateForm ? 'Cancel' : '+ Add User'}
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Create User Form */}
        {showCreateForm && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New User</h2>
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  required
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {currentUser?.role === 'SUBCONTRACTOR_ADMIN' ? (
                    <option value="SUBCONTRACTOR">Subcontractor</option>
                  ) : (
                    ROLES.map((role) => (
                      <option key={role} value={role}>{role.replace(/_/g, ' ')}</option>
                    ))
                  )}
                </select>
              </div>
              <div className="md:col-span-2 lg:col-span-3 flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span className="text-indigo-600 font-medium text-sm">
                              {user.fullName?.charAt(0)?.toUpperCase() || user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.fullName || 'N/A'}</div>
                            <div className="text-sm text-gray-500">{user.email || 'No email'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${roleColors[user.role] || 'bg-gray-100 text-gray-800'}`}>
                          {user.role?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.suspended ? (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Suspended</span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">Active</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{user.phone || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {user.id === currentUser?.userId ? (
                          <span className="text-gray-400">Current User</span>
                        ) : canManageUsers && !user.suspended ? (
                          <button
                            onClick={() => handleToggleSuspend(user.id, false)}
                            className="text-red-600 hover:text-red-800 font-medium"
                          >
                            Suspend
                          </button>
                        ) : canManageUsers && user.suspended ? (
                          <button
                            onClick={() => handleToggleSuspend(user.id, true)}
                            className="text-green-600 hover:text-green-800 font-medium"
                          >
                            Activate
                          </button>
                        ) : (
                          <span className="text-gray-400">{user.suspended ? 'Suspended' : 'Active'}</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
