import { useState, useEffect } from 'react';
import { getYojnas, createYojna, updateYojnaStatus, deleteYojna } from '../api/yojnaApi';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export default function YojnasPage() {
  const { user } = useAuth();
  const [yojnas, setYojnas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingYojna, setEditingYojna] = useState(null);
  const [form, setForm] = useState({
    yojnaName: '', description: '', department: '',
    startDate: '', endDate: '',
  });

  const canManage = user?.role === 'OWNER' || user?.role === 'OFFICE_ADMIN';
  const canDelete = user?.role === 'OWNER';

  useEffect(() => { loadYojnas(); }, []);

  const loadYojnas = async () => {
    try {
      const res = await getYojnas();
      setYojnas(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ yojnaName: '', description: '', department: '', startDate: '', endDate: '' });
    setEditingYojna(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingYojna) {
        await updateYojna(editingYojna.id, form);
      } else {
        await createYojna(form);
      }
      setShowForm(false);
      resetForm();
      loadYojnas();
    } catch (err) {
      alert('Failed to save Yojna');
    }
  };

  const handleEdit = (yojna) => {
    setForm({
      yojnaName: yojna.yojnaName,
      description: yojna.description || '',
      department: yojna.department || '',
      startDate: yojna.startDate || '',
      endDate: yojna.endDate || '',
    });
    setEditingYojna(yojna);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this Yojna?')) return;
    try {
      await deleteYojna(id);
      loadYojnas();
    } catch (err) {
      alert('Failed to delete Yojna');
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateYojnaStatus(id, { status: newStatus });
      loadYojnas();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  if (loading) return <Layout><div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div></Layout>;

  return (
    <Layout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nikay / Yojna</h1>
          <p className="text-sm text-gray-500 mt-1">Manage schemes and programs (e.g., Pandit Deen Dayal Yojna, Jal Nikash Yojna)</p>
        </div>
        {canManage && (
          <button onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            {showForm ? 'Cancel' : '+ New Yojna'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Yojna Name *</label>
              <input type="text" required value={form.yojnaName}
                onChange={(e) => setForm({...form, yojnaName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input type="text" value={form.department}
                onChange={(e) => setForm({...form, department: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input type="date" value={form.startDate}
                onChange={(e) => setForm({...form, startDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input type="date" value={form.endDate}
                onChange={(e) => setForm({...form, endDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" rows="2" />
            </div>
          </div>
          <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            {editingYojna ? 'Update Yojna' : 'Create Yojna'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Yojna Name</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Department</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {yojnas.map((yojna) => (
              <tr key={yojna.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{yojna.yojnaName}</td>
                <td className="py-3 px-4 text-gray-600">{yojna.department || '-'}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    yojna.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>{yojna.status}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Link to={`/yojnas/${yojna.id}`}
                      className="text-indigo-600 hover:text-indigo-800 font-medium">View →</Link>
                    {canManage && (
                      <>
                        <button onClick={() => handleEdit(yojna)}
                          className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                        {yojna.status === 'ACTIVE' ? (
                          <button onClick={() => handleStatusChange(yojna.id, 'INACTIVE')}
                            className="text-yellow-600 hover:text-yellow-800 text-xs font-medium">Deactivate</button>
                        ) : (
                          <button onClick={() => handleStatusChange(yojna.id, 'ACTIVE')}
                            className="text-green-600 hover:text-green-800 text-xs font-medium">Activate</button>
                        )}
                      </>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(yojna.id)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {yojnas.length === 0 && (
              <tr><td colSpan={4} className="py-8 text-center text-gray-400">No Yojnas yet. Create your first Yojna!</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </Layout>
  );
}
