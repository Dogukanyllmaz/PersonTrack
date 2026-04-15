import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getTasks, createTask, updateTask, completeTask, deleteTask, getPersons,
  getTaskComments, addTaskComment, deleteTaskComment, exportTasks, getErrorMessage } from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';

const emptyForm = { personId: '', title: '', description: '', assignedDate: '', dueDate: '', priority: 'Medium' };

const STATUS_LABELS = { Active: 'Aktif', Completed: 'Tamamlandı', Pending: 'Bekliyor' };
const STATUS_COLORS = {
  Active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Pending: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
};
const PRIORITY_LABELS = { Low: 'Düşük', Medium: 'Orta', High: 'Yüksek', Critical: 'Kritik' };
const PRIORITY_COLORS = {
  Low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
  Medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  High: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  Critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
};
const PRIORITY_DOT = {
  Low: 'bg-slate-400',
  Medium: 'bg-blue-500',
  High: 'bg-orange-500',
  Critical: 'bg-red-500'
};

function isOverdue(task) {
  return task.status === 'Active' && task.dueDate && new Date(task.dueDate) < new Date();
}

function SortIcon({ col, sortBy, sortDir }) {
  if (sortBy !== col) return <span className="text-gray-300 ml-1">↕</span>;
  return <span className="text-blue-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
}

export default function Tasks() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const personIdFilter = searchParams.get('personId');

  const [tasks, setTasks] = useState([]);
  const [persons, setPersons] = useState([]);
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('tasks_statusFilter') || '');
  const [priorityFilter, setPriorityFilter] = useState(() => localStorage.getItem('tasks_priorityFilter') || '');
  const [sortBy, setSortBy] = useState(() => localStorage.getItem('tasks_sortBy') || '');
  const [sortDir, setSortDir] = useState(() => localStorage.getItem('tasks_sortDir') || 'asc');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);

  // Bulk & pagination
  const PAGE_SIZE = 20;
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSort = (col) => {
    const newDir = sortBy === col && sortDir === 'asc' ? 'desc' : 'asc';
    setSortBy(col);
    setSortDir(newDir);
    localStorage.setItem('tasks_sortBy', col);
    localStorage.setItem('tasks_sortDir', newDir);
  };

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (personIdFilter) params.personId = personIdFilter;
      const res = await getTasks(params);
      setTasks(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); setPage(1); setSelectedIds(new Set()); }, [statusFilter, priorityFilter, personIdFilter]);
  useEffect(() => { getPersons().then(r => setPersons(r.data)); }, []);

  const openCreate = () => {
    setEditTask(null);
    setForm({ ...emptyForm, personId: personIdFilter || '' });
    setErrors({});
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
    setErrors({});
    setShowForm(true);
  };

  const openComments = async (t) => {
    setSelectedTask(t);
    setCommentText('');
    setCommentsLoading(true);
    try {
      const res = await getTaskComments(t.id);
      setComments(res.data);
    } catch { setComments([]); }
    finally { setCommentsLoading(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.title?.trim()) newErrors.title = 'Görev adı zorunludur';
    if (!editTask && !form.personId) newErrors.assignedTo = 'Atanacak kişi seçilmelidir';
    if (!form.dueDate) newErrors.dueDate = 'Bitiş tarihi zorunludur';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setSaveLoading(true);
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
      toast.error(getErrorMessage(err));
    } finally { setSaveLoading(false); }
  };

  const handleComplete = async (id) => {
    await completeTask(id);
    await load();
  };

  const handleDelete = (id, label) => {
    setConfirmDel({ type: 'task', id, label });
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDel) return;
    try {
      if (confirmDel.type === 'task') {
        await deleteTask(confirmDel.id);
        await load();
      } else if (confirmDel.type === 'comment') {
        await deleteTaskComment(selectedTask.id, confirmDel.id);
        setComments(prev => prev.filter(c => c.id !== confirmDel.id));
      }
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setConfirmDel(null); }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const res = await addTaskComment(selectedTask.id, commentText.trim());
      setComments(prev => [...prev, res.data]);
      setCommentText('');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setCommentLoading(false); }
  };

  const handleDeleteComment = (commentId) => {
    setConfirmDel({ type: 'comment', id: commentId, label: 'Bu yorumu silmek istediğinizden emin misiniz?' });
  };

  const handleExport = async () => {
    try {
      const res = await exportTasks();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = `gorevler_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => deleteTask(id)));
      setSelectedIds(new Set());
      setConfirmBulkDelete(false);
      await load();
      toast.success(`${count} görev silindi.`);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setBulkDeleting(false); }
  };

  const handleBulkComplete = async () => {
    const ids = [...selectedIds].filter(id => {
      const t = tasks.find(t => t.id === id);
      return t && t.status !== 'Completed';
    });
    try {
      await Promise.all(ids.map(id => completeTask(id)));
      setSelectedIds(new Set());
      await load();
      toast.success(`${ids.length} görev tamamlandı.`);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!sortBy) return 0;
    let av = a[sortBy], bv = b[sortBy];
    if (sortBy === 'dueDate' || sortBy === 'assignedDate') {
      av = av ? new Date(av) : new Date(0);
      bv = bv ? new Date(bv) : new Date(0);
    }
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const totalPages = Math.ceil(sortedTasks.length / PAGE_SIZE);
  const paginatedTasks = sortedTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allOnPageSelected = paginatedTasks.length > 0 && paginatedTasks.every(t => selectedIds.has(t.id));
  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      paginatedTasks.forEach(t => allOnPageSelected ? n.delete(t.id) : n.add(t.id));
      return n;
    });
  };

  const filterPerson = persons.find(p => p.id === parseInt(personIdFilter));

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <p className="text-sm">Görevler yükleniyor...</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Görevler</h1>
          {filterPerson
            ? <p className="page-subtitle">Filtre: {filterPerson.fullName}</p>
            : <p className="page-subtitle">{tasks.length} görev{totalPages > 1 ? ` · Sayfa ${page}/${totalPages}` : ''}</p>
          }
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={priorityFilter} onChange={e => { setPriorityFilter(e.target.value); localStorage.setItem('tasks_priorityFilter', e.target.value); }}
            className="input-base" style={{ width: 'auto', padding: '7px 12px' }}>
            <option value="">Tüm Öncelikler</option>
            <option value="Critical">Kritik</option>
            <option value="High">Yüksek</option>
            <option value="Medium">Orta</option>
            <option value="Low">Düşük</option>
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); localStorage.setItem('tasks_statusFilter', e.target.value); }}
            className="input-base" style={{ width: 'auto', padding: '7px 12px' }}>
            <option value="">Tüm Durumlar</option>
            <option value="Active">Aktif</option>
            <option value="Pending">Bekliyor</option>
            <option value="Completed">Tamamlandı</option>
          </select>
          <button onClick={handleExport} className="btn-secondary">
            ↓ Excel
          </button>
          <button onClick={openCreate} className="btn-primary">
            + Yeni Görev
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl border animate-fade-in"
          style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{selectedIds.size} görev seçildi</span>
          <div className="flex gap-2 ml-auto">
            <button onClick={handleBulkComplete}
              className="text-sm px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium">
              ✓ Tamamla
            </button>
            <button onClick={handleExport}
              className="text-sm px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors font-medium">
              ↓ Export
            </button>
            <button onClick={() => setConfirmBulkDelete(true)}
              className="text-sm px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium">
              Sil
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>
              İptal
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {tasks.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">✅</div>
            <p className="font-semibold text-base" style={{ color: 'var(--text-secondary)' }}>
              {(statusFilter || priorityFilter) ? 'Bu filtreye uygun görev bulunamadı' : 'Henüz görev oluşturulmadı'}
            </p>
            {!(statusFilter || priorityFilter) && (
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>Yeni görev eklemek için butona tıklayın</p>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead style={{ background: 'var(--content-bg)', borderBottom: '1px solid var(--card-border)' }}>
              <tr>
                <th className="px-4 py-3 w-10">
                  <input type="checkbox" checked={allOnPageSelected} onChange={toggleSelectAll}
                    className="w-4 h-4 rounded cursor-pointer" style={{ accentColor: 'var(--accent)' }} />
                </th>
                <th onClick={() => toggleSort('title')} className="text-left px-4 py-3 font-semibold cursor-pointer select-none text-xs uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                  Görev<SortIcon col="title" sortBy={sortBy} sortDir={sortDir} />
                </th>
                <th onClick={() => toggleSort('personName')} className="text-left px-4 py-3 font-semibold cursor-pointer select-none text-xs uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                  Kişi<SortIcon col="personName" sortBy={sortBy} sortDir={sortDir} />
                </th>
                <th onClick={() => toggleSort('priority')} className="text-left px-4 py-3 font-semibold cursor-pointer select-none text-xs uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                  Öncelik<SortIcon col="priority" sortBy={sortBy} sortDir={sortDir} />
                </th>
                <th onClick={() => toggleSort('dueDate')} className="text-left px-4 py-3 font-semibold cursor-pointer select-none text-xs uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                  Son Tarih<SortIcon col="dueDate" sortBy={sortBy} sortDir={sortDir} />
                </th>
                <th onClick={() => toggleSort('status')} className="text-left px-4 py-3 font-semibold cursor-pointer select-none text-xs uppercase tracking-wide"
                  style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                  Durum<SortIcon col="status" sortBy={sortBy} sortDir={sortDir} />
                </th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedTasks.map((t) => (
                <tr key={t.id}
                  className="table-row-hover transition-colors"
                  style={{
                    borderBottom: '1px solid var(--card-border)',
                    ...(selectedIds.has(t.id) ? { background: 'rgba(59,130,246,0.06)' } : isOverdue(t) ? { background: 'rgba(239,68,68,0.05)' } : {})
                  }}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)}
                      className="w-4 h-4 rounded cursor-pointer" style={{ accentColor: 'var(--accent)' }} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {t.title}
                      {isOverdue(t) && <span className="ml-2 text-xs text-red-500 font-semibold">⚠ Gecikmiş</span>}
                    </p>
                    {t.description && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-tertiary)' }}>{t.description}</p>}
                    {t.comments?.length > 0 && (
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>💬 {t.comments.length} yorum</p>
                    )}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{t.personName}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold ${PRIORITY_COLORS[t.priority] || 'bg-gray-100 text-gray-600'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[t.priority] || 'bg-gray-400'}`} />
                      {PRIORITY_LABELS[t.priority] || t.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>
                    {t.dueDate ? (
                      <span className={isOverdue(t) ? 'text-red-500 font-semibold' : ''}>
                        {new Date(t.dueDate).toLocaleDateString('tr-TR')}
                      </span>
                    ) : <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[t.status] || t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openComments(t)}
                        className="text-xs font-medium hover:opacity-70 transition-opacity" style={{ color: 'var(--text-tertiary)' }}>💬</button>
                      {t.status !== 'Completed' && (
                        <button onClick={() => handleComplete(t.id)}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Tamamla</button>
                      )}
                      <button onClick={() => openEdit(t)}
                        className="text-xs font-medium" style={{ color: 'var(--accent)' }}>Düzenle</button>
                      <button onClick={() => handleDelete(t.id, t.title)}
                        className="text-xs text-red-500 hover:text-red-600 font-medium">Sil</button>
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
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Kişi *</label>
                <select value={form.personId} onChange={e => setForm({...form, personId: e.target.value})} required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500">
                  <option value="">Seçin...</option>
                  {persons.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Görev Başlığı <span className="text-red-500">*</span></label>
              <input value={form.title} onChange={e => { setForm({...form, title: e.target.value}); setErrors(prev => ({...prev, title: undefined})); }}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 ${errors.title ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Açıklama</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Öncelik</label>
                <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500">
                  <option value="Low">Düşük</option>
                  <option value="Medium">Orta</option>
                  <option value="High">Yüksek</option>
                  <option value="Critical">Kritik</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Atanma Tarihi *</label>
                <input type="date" value={form.assignedDate} onChange={e => setForm({...form, assignedDate: e.target.value})} required
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Son Tarih <span className="text-red-500">*</span></label>
              <input type="date" value={form.dueDate} onChange={e => { setForm({...form, dueDate: e.target.value}); setErrors(prev => ({...prev, dueDate: undefined})); }}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white dark:bg-gray-700 dark:text-gray-100 ${errors.dueDate ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'}`} />
              {errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>}
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center disabled:opacity-50" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </form>
        </Modal>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="btn-secondary disabled:opacity-40" style={{ padding: '6px 14px', fontSize: '13px' }}>
            ← Önceki
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pg => (
            <button key={pg} onClick={() => setPage(pg)}
              className="w-8 h-8 text-sm rounded-lg transition-colors font-medium"
              style={page === pg
                ? { background: 'var(--accent)', color: 'white', border: 'none' }
                : { border: '1px solid var(--card-border)', color: 'var(--text-secondary)', background: 'transparent' }}>
              {pg}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="btn-secondary disabled:opacity-40" style={{ padding: '6px 14px', fontSize: '13px' }}>
            Sonraki →
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDel}
        title={confirmDel?.type === 'task' ? 'Görevi Sil' : 'Yorumu Sil'}
        message={confirmDel?.type === 'task'
          ? `"${confirmDel?.label}" görevi kalıcı olarak silinecek.`
          : 'Bu yorum kalıcı olarak silinecek.'}
        confirmLabel="Sil"
        variant="danger"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDel(null)}
      />

      <ConfirmDialog
        open={confirmBulkDelete}
        title="Toplu Silme"
        message={`Seçilen ${selectedIds.size} görev kalıcı olarak silinecek.`}
        confirmLabel="Hepsini Sil"
        variant="danger"
        loading={bulkDeleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />

      {/* Comments modal */}
      {selectedTask && (
        <Modal title={`Yorumlar — ${selectedTask.title}`} onClose={() => setSelectedTask(null)}>
          <div className="space-y-4">
            <div className="max-h-60 overflow-y-auto space-y-3">
              {commentsLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Henüz yorum yok</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex gap-3">
                    <div className="flex-1 bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                      <div className="flex justify-between items-start">
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{c.createdByName}</p>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString('tr-TR')}</p>
                          <button onClick={() => handleDeleteComment(c.id)} className="text-xs text-red-400 hover:text-red-600">×</button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-gray-100 mt-1">{c.content}</p>
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
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
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
