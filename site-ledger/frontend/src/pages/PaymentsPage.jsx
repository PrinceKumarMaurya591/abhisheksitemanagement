import { useState, useEffect } from 'react';
import { getSites } from '../api/siteApi';
import { getSitePayments, createPayment } from '../api/paymentApi';
import Layout from '../components/Layout';

export default function PaymentsPage() {
  const [sites, setSites] = useState([]);
  const [selectedSiteId, setSelectedSiteId] = useState('');
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ billNumber: '', billDate: '', billAmount: '', paymentDate: '', paymentAmount: '', remarks: '' });

  useEffect(() => { getSites().then(res => setSites(res.data)).catch(console.error); }, []);

  useEffect(() => {
    if (selectedSiteId) {
      setLoading(true);
      getSitePayments(selectedSiteId).then(res => setPayments(res.data)).catch(console.error).finally(() => setLoading(false));
    }
  }, [selectedSiteId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createPayment({ ...form, billAmount: Number(form.billAmount), paymentAmount: form.paymentAmount ? Number(form.paymentAmount) : null, site: { id: Number(selectedSiteId) } });
      setShowForm(false);
      setForm({ billNumber: '', billDate: '', billAmount: '', paymentDate: '', paymentAmount: '', remarks: '' });
      const res = await getSitePayments(selectedSiteId);
      setPayments(res.data);
    } catch (err) { alert('Failed'); }
  };

  const formatCurrency = (v) => '₹' + Number(v).toLocaleString('en-IN');

  return (
    <Layout>
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Payment Tracking</h1>
        {selectedSiteId && <button onClick={() => setShowForm(!showForm)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">{showForm ? 'Cancel' : '+ New Bill'}</button>}
      </div>

      <select value={selectedSiteId} onChange={(e) => setSelectedSiteId(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none">
        <option value="">Select a site...</option>
        {sites.map(s => <option key={s.id} value={s.id}>{s.siteName}</option>)}
      </select>

      {showForm && selectedSiteId && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number *</label>
              <input type="text" required value={form.billNumber} onChange={(e) => setForm({...form, billNumber: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Date</label>
              <input type="date" value={form.billDate} onChange={(e) => setForm({...form, billDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bill Amount *</label>
              <input type="number" required value={form.billAmount} onChange={(e) => setForm({...form, billAmount: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
              <input type="date" value={form.paymentDate} onChange={(e) => setForm({...form, paymentDate: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
              <input type="number" value={form.paymentAmount} onChange={(e) => setForm({...form, paymentAmount: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
              <input type="text" value={form.remarks} onChange={(e) => setForm({...form, remarks: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          </div>
          <button type="submit" className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">Record Bill</button>
        </form>
      )}

      {loading ? (
        <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>
      ) : selectedSiteId ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-500">Bill No</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Bill Date</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Bill Amount</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Received</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Pending</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{p.billNumber}</td>
                  <td className="py-3 px-4">{p.billDate || '-'}</td>
                  <td className="py-3 px-4 text-right">{formatCurrency(p.billAmount)}</td>
                  <td className="py-3 px-4 text-right text-green-600 font-medium">{formatCurrency(p.paymentAmount || 0)}</td>
                  <td className="py-3 px-4 text-right text-red-600 font-medium">{formatCurrency(p.pendingAmount)}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-400">No bills recorded</td></tr>}
            </tbody>
          </table>
        </div>
      ) : <div className="text-center py-12 text-gray-400">Select a site to view payments</div>}
    </div>
    </Layout>
  );
}
