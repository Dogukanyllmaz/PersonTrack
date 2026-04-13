import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTasks, createTask, updateTask, completeTask, deleteTask, getPersons,
  getTaskComments, addTaskComment, deleteTaskComment, exportTasks } from '../services/api';
import Modal from '../components/Modal';

const emptyForm = { personId: '', title: '', description: '', assignedDate: '', dueDate: '', priority: 'Medium' };

const STATUS_LABELS = { Active: 'Aktif', Completed: 'Tamamlandı', Pending: 'Bekliyor' };
const STATUS_COLORS = {
  Active: 'bg-blue-100 text-blue-700',
  Completed: 'bg-green-100 text-green-700',
  Pending: 'bg-gray-100 text-gray-600'
};
const PRIORITY_LABELS = { Low: 'Düşük', Medium: 'Orta', High: 'Yüksek', Critical: 'Kritik' };
const PRIORITY_COLORS = {
  Low: 'bg-gray-100 text-gray-600',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700'
};

function isOverdue(task) {
  return task.status === 'Active' && task.dueDate && new Date(task.dueDate) < new Date();
}

export default function Tasks() {
  const [searchParams] = useSearchParams();
  const personIdFilter = searchParams.get('personId');

  const [tasks, setTasks] = useState([]);
  const [persons, setPersons] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const load = async () => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (priorityFilter) params.priority = priorityFilter;
    if (personIdFilter) params.personId = personIdFilter;
    const res = await getTasks(params);
    setTasks(res.data);
  };

  useEffect(() => { load(); }, [statusFilter, priorityFilter, personIdFilter]);
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
      assignedDate: t.assignedDate.split('T')[0],
      dueDate: t.dueDate ? t.dueDate.split('T')[0] : '',
      priority: t.priority || 'Medium'
    });
    setShowForm(true);
  };

  const openComments = async (t) => {
    setSelectedTask(t);
    setCommentText('');
    try {
      const res = await getTaskComments(t.id);
      setComments(res.data);
    } catch { setComments([]); }
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
          completedDate: editTask.completedDate,
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
          priority: form.priority
        });
      } else {
        await createTask({
          personId: parseInt(form.personId),
          title: form.title,
          description: form.description || null,
          assignedDate: new Date(form.assignedDate).toISOString(),
          dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
          priority: form.priority
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

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const res = await addTaskComment(selectedTask.id, commentText.trim());
      setComments(prev => [...prev, res.data]);
      setCommentText('');
    } catch { alert('Yorum eklenemedi.'); }
    finally { setCommentLoading(false); }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Yorumu sil?')) return;
    await deleteTaskComment(selectedTask.id, commentId);
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const handleExport = async () => {
    try {
      const res = await exportTasks();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = `gorevler_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
    } catch { alert('Export başarısız.'); }
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
          <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
            <option value="">Tüm Öncelikler</option>
            <option value="Critical">Kritik</option>
            <option value="High">Yüksek</option>
            <option value="Medium">Orta</option>
            <option value="Low">Düşük</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
            <option value="">Tüm Durumlar</option>
            <option value="Active">Aktif</option>
            <option value="Pending">Bekliyor</option>
            <option value="Completed">Tamamlandı</option>
          </select>
          <button onClick={handleExport}
            className="border border-green-600 text-green-600 hover:bg-green-50 text-sm font-medium px-4 py-2 rounded-lg">
            ↓ Excel
          </button>
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
                <th className="text-left px-4 py-3 font-medium text-gray-600">Öncelik</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Son Tarih</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tasks.map((t) => (
                <tr key={t.id} className={`hover:bg-gray-50 ${isOverdue(t) ? 'bg-red-50' : ''}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-2">
                      <div>
                        <p className="font-medium text-gray-800">
                          {t.title}
                          {isOverdue(t) && <span className="ml-2 text-xs text-red-600 font-medium">⚠️ Gecikmiş</span>}
                        </p>
                        {t.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{t.description}</p>}
                        {t.comments?.length > 0 && (
                          <p className="text-xs text-gray-400 mt-0.5">💬 {t.comments.length} yorum</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{t.personName}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${PRIORITY_COLORS[t.priority] || 'bg-gray-100 text-gray-600'}`}>
                      {PRIORITY_LABELS[t.priority] || t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {t.dueDate ? (
                      <span className={isOverdue(t) ? 'text-red-600 font-medium' : ''}>
                        {new Date(t.dueDate).toLocaleDateString('tr-TR')}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openComments(t)}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium">💬</button>
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

      {/* Task form modal */}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Öncelik</label>
                <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                  <option value="Low">Düşük</option>
                  <option value="Medium">Orta</option>
                  <option value="High">Yüksek</option>
                  <option value="Critical">Kritik</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Atanma Tarihi *</label>
                <input type="date" value={form.assignedDate} onChange={e => setForm({...form, assignedDate: e.target.value})} required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Son Tarih (isteğe bağlı)</label>
              <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </form>
        </Modal>
      )}

      {/* Comments modal */}
      {selectedTask && (
        <Modal title={`Yorumlar — ${selectedTask.title}`} onClose={() => setSelectedTask(null)}>
          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto space-y-3">
              {comments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Henüz yorum yok</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-medium text-gray-700">{c.createdByName}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString('tr-TR')}</p>
                          <button onClick={() => handleDeleteComment(c.id)} className="text-xs text-red-400 hover:text-red-600">×</button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-800 mt-1">{c.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Yorum yaz..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              <button type="submit" disabled={commentLoading || !commentText.trim()}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
                Gönder
              </button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
