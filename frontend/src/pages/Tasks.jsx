import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTasks, createTask, updateTask, completeTask, deleteTask, getPersons } from '../services/api';
import Modal from '../components/Modal';

const emptyForm = { personId: '', title: '', description: '', assignedDate: '' };

const STATUS_LABELS = { Active: 'Aktif', Completed: 'Tamamlandı', Pending: 'Bekliyor' };
const STATUS_COLORS = {
  Active: 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  Pending: 'bg-gray-100 text-gray-600'
};

export default function Tasks() {
  const [searchParams] = useSearchParams();
  const personIdFilter = searchParams.get('personId');

  const [tasks, setTasks] = useState([]);
  const [persons, setPersons] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (personIdFilter) params.personId = personIdFilter;
    const res = await getTasks(params);
    setTasks(res.data);
  };

  useEffect(() => { load(); }, [statusFilter, personIdFilter]);
  useEffect(() => { getPersons().then(r => setPersons(r.data)); }, []);

  const openCreate = () => {
    setEditTask(null);
    setForm({ ...emptyForm, personId: personIdFilter || '' });
    setShowForm(true);
  };

  const openEdit = (t) => {
    setEditTask(t);
    setForm({
      personId: t.personId.toString(),
      title: t.title,
      description: t.description || '',
      assignedDate: t.assignedDate.split('T')[0]
    });
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editTask) {
        await updateTask(editTask.id, {
          title: form.title,
          description: form.description || null,
          status: editTask.status,
          assignedDate: new Date(form.assignedDate).toISOString(),
          completedDate: editTask.completedDate
        });
      } else {
        await createTask({
          personId: parseInt(form.personId),
          title: form.title,
          description: form.description || null,
          assignedDate: new Date(form.assignedDate).toISOString()
        });
      }
      setShowForm(false);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Hata oluştu.');
    } finally { setLoading(false); }
  };

  const handleComplete = async (id) => {
    await completeTask(id);
    await load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu görevi silmek istediğinizden emin misiniz?')) return;
    await deleteTask(id);
    await load();
  };

  const filterPerson = persons.find(p => p.id === parseInt(personIdFilter));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Görevler</h2>
          {filterPerson && (
            <p className="text-sm text-gray-500 mt-1">Filtre: {filterPerson.fullName}</p>
          )}
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
            <option value="">Tüm Durumlar</option>
            <option value="Active">Aktif</option>
            <option value="Pending">Bekliyor</option>
            <option value="Completed">Tamamlandı</option>
          </select>
          <button onClick={openCreate}
            className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            + Yeni Görev
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {tasks.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Görev bulunamadı.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Görev</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kişi</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Atanma</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Bitiş</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{t.title}</p>
                    {t.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{t.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.personName}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(t.assignedDate).toLocaleDateString('tr-TR')}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.completedDate ? new Date(t.completedDate).toLocaleDateString('tr-TR') : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      {t.status !== 'Completed' && (
                        <button onClick={() => handleComplete(t.id)}
                          className="text-xs text-green-600 hover:text-green-800 font-medium">Tamamla</button>
                      )}
                      <button onClick={() => openEdit(t)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium">Düzenle</button>
                      <button onClick={() => handleDelete(t.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium">Sil</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <Modal title={editTask ? 'Görevi Düzenle' : 'Yeni Görev'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            {!editTask && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kişi *</label>
                <select value={form.personId} onChange={e => setForm({...form, personId: e.target.value})} required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                  <option value="">Seçin...</option>
                  {persons.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Görev Başlığı *</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Açıklama</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Atanma Tarihi *</label>
              <input type="date" value={form.assignedDate} onChange={e => setForm({...form, assignedDate: e.target.value})} required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
