import { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../api/expenseCategoryApi';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const LEVELS = ['YOJNA', 'SITE', 'STAFF'];

export default function ExpenseCategoriesPage() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    categoryName: '', description: '',
    applicableLevels: ['SITE'],
  });

  const canManage = user?.role === 'OWNER' || user?.role === 'OFFICE_ADMIN';
  const canDelete = user?.role === 'OWNER';

  useEffect(() => { loadCategories(); }, []);

  const loadCategories = async () => {
    try {
      const res = await getCategories();
      setCategories(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({ categoryName: '', description: '', applicableLevels: ['SITE'] });
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateCategory(editing.id, form);
      } else {
        await createCategory(form);
      }
      setShowForm(false);
      resetForm();
      loadCategories();
    } catch (err) {
      alert('Failed to save category');
    }
  };

  const handleEdit = (cat) => {
    setForm({
      categoryName: cat.categoryName,
      description: cat.description || '',
      applicableLevels: cat.applicableLevels || ['SITE'],
    });
    setEditing(cat);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this expense category?')) return;
    try {
      await deleteCategory(id);
      loadCategories();
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const toggleLevel = (level) => {
    setForm(prev => ({
      ...prev,
      applicableLevels: prev.applicableLevels.includes(level)
        ? prev.applicableLevels.filter(l => l !== level)
        : [...prev.applicableLevels, level],
    }));
  };

  if (loading) return <Layout><div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div></Layout>;

  return (
    <Layout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expense Categories</h1>
          <p className="text-sm text-gray-500 mt-1">Configure other expense categories for Yojnas, Sites, and Staff</p>
        </div>
        {canManage && (
          <button onClick={() => { resetForm(); setShowForm(!showForm); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            {showForm ? 'Cancel' : '+ New Category'}
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category Name *</label>
              <input type="text" required value={form.categoryName}
                onChange={(e) => setForm({...form, categoryName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input type="text" value={form.description}
                onChange={(e) => setForm({...form, description: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Applicable At</label>
            <div className="flex gap-4">
              {LEVELS.map(level => (
                <label key={level} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.applicableLevels.includes(level)}
                    onChange={() => toggleLevel(level)}
                    className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" />
                  <span className="text-sm text-gray-700">
                    {level === 'YOJNA' ? 'Yojna Level' : level === 'SITE' ? 'Site Level' : 'Staff Level'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            {editing ? 'Update Category' : 'Create Category'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left py-3 px-4 font-medium text-gray-500">Category Name</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Description</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Applicable At</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
              <th className="text-left py-3 px-4 font-medium text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 font-medium">{cat.categoryName}</td>
                <td className="py-3 px-4 text-gray-600">{cat.description || '-'}</td>
                <td className="py-3 px-4">
                  <div className="flex gap-1">
                    {cat.applicableLevels?.map(level => (
                      <span key={level} className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
                        {level}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    cat.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>{cat.isActive ? 'Active' : 'Inactive'}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {canManage && (
                      <button onClick={() => handleEdit(cat)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium">Edit</button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(cat.id)}
                        className="text-red-600 hover:text-red-800 text-xs font-medium">Delete</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-gray-400">No categories yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
    </Layout>
  );
}
