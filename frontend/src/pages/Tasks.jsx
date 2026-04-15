import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  getTasks, createTask, updateTask, completeTask, deleteTask, getPersons,
  getTaskComments, addTaskComment, deleteTaskComment, exportTasks, getErrorMessage
} from '../services/api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../context/ToastContext';
import { TasksSkeleton } from '../components/Skeleton';
import { StatusBadge, PriorityBadge } from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';

/* ── Constants ──────────────────────────────────────────────────────── */
const emptyForm = { personId: '', title: '', description: '', assignedDate: '', dueDate: '', priority: 'Medium' };

/* ── Helpers ────────────────────────────────────────────────────────── */
function isOverdue(task) {
  return task.status === 'Active' && task.dueDate && new Date(task.dueDate) < new Date();
}
function fmt(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ── Sort indicator ─────────────────────────────────────────────────── */
const SortIcon = memo(function SortIcon({ col, sortBy, sortDir }) {
  if (sortBy !== col) return <span className="ml-1 opacity-20 text-xs">⇅</span>;
  return <span className="ml-1 text-xs" style={{ color: 'var(--accent)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
});

/* ── Memoized TaskRow ────────────────────────────────────────────────── */
const TaskRow = memo(function TaskRow({
  t, isSelected, onSelect, onComments, onComplete, onEdit, onDelete,
  optimisticIds,
}) {
  const overdue    = isOverdue(t);
  const isPending  = optimisticIds?.has(t.id);
  const rowClass   = [
    'task-row border-b border-[--card-border] last:border-0',
    overdue    ? 'is-overdue' : '',
    isSelected ? 'is-selected' : '',
    isPending  ? 'opacity-50 pointer-events-none' : '',
  ].filter(Boolean).join(' ');

  return (
    <tr className={rowClass}>
      <td className="px-4 py-3.5 w-10">
        <input type="checkbox" checked={isSelected} onChange={() => onSelect(t.id)}
          className="w-4 h-4 rounded cursor-pointer" style={{ accentColor: 'var(--accent)' }} />
      </td>
      <td className="px-4 py-3.5 max-w-[260px]">
        <p className="font-medium text-sm leading-snug" style={{ color: 'var(--text-primary)' }}>
          {t.title}
          {overdue && (
            <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded-md">
              ⚠ GECİKMİŞ
            </span>
          )}
        </p>
        {t.description && (
          <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-tertiary)' }}>{t.description}</p>
        )}
      </td>
      <td className="px-4 py-3.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
        <span className="font-medium">{t.personName}</span>
      </td>
      <td className="px-4 py-3.5">
        <PriorityBadge priority={t.priority} />
      </td>
      <td className="px-4 py-3.5 text-sm" style={{ color: overdue ? '#EF4444' : 'var(--text-secondary)' }}>
        {fmt(t.dueDate) ?? <span style={{ color: 'var(--text-tertiary)' }}>—</span>}
      </td>
      <td className="px-4 py-3.5">
        <StatusBadge status={t.status} />
      </td>
      <td className="px-4 py-3.5 text-right">
        <div className="flex gap-2 justify-end items-center">
          <button onClick={() => onComments(t)}
            className="p-1.5 rounded-lg text-[--text-tertiary] hover:text-[--text-secondary] hover:bg-[--content-bg] transition-all"
            title="Yorumlar">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
            </svg>
          </button>
          {t.status !== 'Completed' && (
            <Button size="xs" variant="success" onClick={() => onComplete(t.id)}>✓ Tamamla</Button>
          )}
          <Button size="xs" variant="ghost" onClick={() => onEdit(t)}>Düzenle</Button>
          <Button size="xs" variant="danger" onClick={() => onDelete(t.id, t.title)}>Sil</Button>
        </div>
      </td>
    </tr>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   Tasks page
═══════════════════════════════════════════════════════════════════ */
export default function Tasks() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const personIdFilter = searchParams.get('personId');

  const [tasks, setTasks]               = useState([]);
  const [persons, setPersons]           = useState([]);
  const [statusFilter, setStatusFilter] = useState(() => localStorage.getItem('tasks_statusFilter') || '');
  const [priorityFilter, setPriorityFilter] = useState(() => localStorage.getItem('tasks_priorityFilter') || '');
  const [sortBy, setSortBy]             = useState(() => localStorage.getItem('tasks_sortBy') || '');
  const [sortDir, setSortDir]           = useState(() => localStorage.getItem('tasks_sortDir') || 'asc');
  const [showForm, setShowForm]         = useState(false);
  const [editTask, setEditTask]         = useState(null);
  const [form, setForm]                 = useState(emptyForm);
  const [errors, setErrors]             = useState({});
  const [loading, setLoading]           = useState(true);
  const [saveLoading, setSaveLoading]   = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [comments, setComments]         = useState([]);
  const [commentText, setCommentText]   = useState('');
  const [commentLoading, setCommentLoading]   = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [confirmDel, setConfirmDel]     = useState(null);
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  // Optimistic: track IDs that have a pending API call (dims the row)
  const [optimisticIds, setOptimisticIds] = useState(new Set());

  /* ── Data load ──────────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter)   params.status   = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (personIdFilter) params.personId = personIdFilter;
      const res = await getTasks(params);
      setTasks(res.data);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter, personIdFilter]);

  useEffect(() => { load(); setSelectedIds(new Set()); }, [load]);
  useEffect(() => { getPersons().then(r => setPersons(r.data)); }, []);

  /* ── Sort ───────────────────────────────────────────────────────── */
  const sortedTasks = useMemo(() => {
    if (!sortBy) return tasks;
    return [...tasks].sort((a, b) => {
      let av = a[sortBy], bv = b[sortBy];
      if (sortBy === 'dueDate' || sortBy === 'assignedDate') {
        av = av ? new Date(av) : new Date(0);
        bv = bv ? new Date(bv) : new Date(0);
      }
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
  }, [tasks, sortBy, sortDir]);

  const allSelected = sortedTasks.length > 0 && sortedTasks.every(t => selectedIds.has(t.id));
  const filterPerson = useMemo(() => persons.find(p => p.id === parseInt(personIdFilter)), [persons, personIdFilter]);

  /* ── Handlers ───────────────────────────────────────────────────── */
  const toggleSort = useCallback((col) => {
    setSortBy(prev => {
      const newDir = prev === col && sortDir === 'asc' ? 'desc' : 'asc';
      setSortDir(newDir);
      localStorage.setItem('tasks_sortBy', col);
      localStorage.setItem('tasks_sortDir', newDir);
      return col;
    });
  }, [sortDir]);

  const setStatusAndStore   = useCallback((v) => { setStatusFilter(v);   localStorage.setItem('tasks_statusFilter', v);   }, []);
  const setPriorityAndStore = useCallback((v) => { setPriorityFilter(v); localStorage.setItem('tasks_priorityFilter', v); }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      sortedTasks.forEach(t => allSelected ? n.delete(t.id) : n.add(t.id));
      return n;
    });
  }, [sortedTasks, allSelected]);

  const openCreate = useCallback(() => {
    setEditTask(null);
    setForm({ ...emptyForm, personId: personIdFilter || '' });
    setErrors({});
    setShowForm(true);
  }, [personIdFilter]);

  const openEdit = useCallback((t) => {
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
  }, []);

  const openComments = useCallback(async (t) => {
    setSelectedTask(t);
    setCommentText('');
    setCommentsLoading(true);
    try {
      const res = await getTaskComments(t.id);
      setComments(res.data);
    } catch { setComments([]); }
    finally { setCommentsLoading(false); }
  }, []);

  const handleSave = useCallback(async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.title?.trim())         newErrors.title      = 'Görev adı zorunludur';
    if (!editTask && !form.personId) newErrors.assignedTo = 'Atanacak kişi seçilmelidir';
    if (!form.dueDate)               newErrors.dueDate    = 'Bitiş tarihi zorunludur';
    if (Object.keys(newErrors).length) { setErrors(newErrors); return; }

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
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setSaveLoading(false); }
  }, [form, editTask, load, toast]);

  /* ── Optimistic complete ────────────────────────────────────────── */
  const handleComplete = useCallback(async (id) => {
    // Instantly flip to Completed
    setTasks(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'Completed', completedDate: new Date().toISOString() } : t
    ));
    setOptimisticIds(prev => new Set([...prev, id]));
    try {
      await completeTask(id);
    } catch (err) {
      // Rollback on failure
      setTasks(prev => prev.map(t =>
        t.id === id ? { ...t, status: 'Active', completedDate: null } : t
      ));
      toast.error(getErrorMessage(err));
    } finally {
      setOptimisticIds(prev => { const n = new Set(prev); n.delete(id); return n; });
    }
  }, [toast]);

  /* ── Optimistic delete ──────────────────────────────────────────── */
  const handleDelete = useCallback((id, label) => {
    setConfirmDel({ type: 'task', id, label });
  }, []);

  const handleDeleteConfirmed = useCallback(async () => {
    if (!confirmDel) return;
    if (confirmDel.type === 'task') {
      const { id } = confirmDel;
      // Snapshot for rollback
      const snapshot = tasks.find(t => t.id === id);
      setConfirmDel(null);
      // Instantly remove from list
      setTasks(prev => prev.filter(t => t.id !== id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      try {
        await deleteTask(id);
      } catch (err) {
        // Restore on failure
        if (snapshot) setTasks(prev => [...prev, snapshot].sort((a, b) => a.id - b.id));
        toast.error(getErrorMessage(err));
      }
    } else {
      // comment delete
      try {
        await deleteTaskComment(selectedTask.id, confirmDel.id);
        setComments(prev => prev.filter(c => c.id !== confirmDel.id));
      } catch (err) { toast.error(getErrorMessage(err)); }
      finally { setConfirmDel(null); }
    }
  }, [confirmDel, selectedTask, tasks, toast]);

  const handleAddComment = useCallback(async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentLoading(true);
    try {
      const res = await addTaskComment(selectedTask.id, commentText.trim());
      setComments(prev => [...prev, res.data]);
      setCommentText('');
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setCommentLoading(false); }
  }, [commentText, selectedTask, toast]);

  const handleDeleteComment = useCallback((commentId) => {
    setConfirmDel({ type: 'comment', id: commentId, label: 'Bu yorumu silmek istediğinizden emin misiniz?' });
  }, []);

  const handleExport = useCallback(async () => {
    try {
      const res = await exportTasks();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `gorevler_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
    } catch (err) { toast.error(getErrorMessage(err)); }
  }, [toast]);

  /* ── Optimistic bulk complete ───────────────────────────────────── */
  const handleBulkComplete = useCallback(async () => {
    const ids = [...selectedIds].filter(id => {
      const t = tasks.find(t => t.id === id);
      return t && t.status !== 'Completed';
    });
    if (ids.length === 0) return;
    // Instantly flip
    setTasks(prev => prev.map(t =>
      ids.includes(t.id) ? { ...t, status: 'Completed', completedDate: new Date().toISOString() } : t
    ));
    setOptimisticIds(prev => new Set([...prev, ...ids]));
    setSelectedIds(new Set());
    try {
      await Promise.all(ids.map(id => completeTask(id)));
      toast.success(`${ids.length} görev tamamlandı.`);
    } catch (err) {
      // Rollback on failure — full reload
      await load();
      toast.error(getErrorMessage(err));
    } finally {
      setOptimisticIds(prev => { const n = new Set(prev); ids.forEach(id => n.delete(id)); return n; });
    }
  }, [selectedIds, tasks, load, toast]);

  /* ── Optimistic bulk delete ─────────────────────────────────────── */
  const handleBulkDelete = useCallback(async () => {
    const ids = [...selectedIds];
    const count = ids.length;
    const snapshots = tasks.filter(t => ids.includes(t.id));
    setBulkDeleting(true);
    // Instantly remove
    setTasks(prev => prev.filter(t => !ids.includes(t.id)));
    setSelectedIds(new Set());
    setConfirmBulkDelete(false);
    try {
      await Promise.all(ids.map(id => deleteTask(id)));
      toast.success(`${count} görev silindi.`);
    } catch (err) {
      // Rollback on failure
      setTasks(prev => [...prev, ...snapshots].sort((a, b) => a.id - b.id));
      toast.error(getErrorMessage(err));
    } finally {
      setBulkDeleting(false);
    }
  }, [selectedIds, tasks, toast]);

  /* ── Skeleton while loading ─────────────────────────────────────── */
  if (loading) return <TasksSkeleton />;

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Görevler</h1>
          {filterPerson
            ? <p className="page-subtitle">Filtre: <strong>{filterPerson.fullName}</strong></p>
            : <p className="page-subtitle">{sortedTasks.length} görev</p>
          }
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <select value={priorityFilter} onChange={e => setPriorityAndStore(e.target.value)}
            className="input-base" style={{ width: 'auto', padding: '7px 12px' }}>
            <option value="">Tüm Öncelikler</option>
            <option value="Critical">Kritik</option>
            <option value="High">Yüksek</option>
            <option value="Medium">Orta</option>
            <option value="Low">Düşük</option>
          </select>
          <select value={statusFilter} onChange={e => setStatusAndStore(e.target.value)}
            className="input-base" style={{ width: 'auto', padding: '7px 12px' }}>
            <option value="">Tüm Durumlar</option>
            <option value="Active">Aktif</option>
            <option value="Pending">Bekliyor</option>
            <option value="Completed">Tamamlandı</option>
          </select>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Excel
          </Button>
          <Button variant="primary" size="sm" onClick={openCreate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Yeni Görev
          </Button>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl border animate-fade-in"
          style={{ background: 'rgba(79,70,229,0.07)', borderColor: 'rgba(79,70,229,0.2)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>
            {selectedIds.size} görev seçildi
          </span>
          <div className="flex gap-2 ml-auto">
            <Button size="xs" variant="success" onClick={handleBulkComplete}>✓ Tamamla</Button>
            <Button size="xs" variant="secondary" onClick={handleExport}>↓ Export</Button>
            <Button size="xs" variant="danger" onClick={() => setConfirmBulkDelete(true)}>Sil</Button>
            <Button size="xs" variant="ghost" onClick={() => setSelectedIds(new Set())}>İptal</Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        {tasks.length === 0 ? (
          <EmptyState
            preset={(statusFilter || priorityFilter) ? 'search' : 'tasks'}
            body={(statusFilter || priorityFilter) ? 'Bu filtreye uygun görev bulunamadı.' : 'Yeni görev eklemek için butona tıklayın.'}
            action={!(statusFilter || priorityFilter) && (
              <Button variant="primary" size="sm" onClick={openCreate}>+ Yeni Görev</Button>
            )}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
              <thead style={{ background: 'var(--content-bg)', borderBottom: '1px solid var(--card-border)' }}>
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
                      className="w-4 h-4 rounded cursor-pointer" style={{ accentColor: 'var(--accent)' }} />
                  </th>
                  {[
                    { key: 'title',      label: 'Görev' },
                    { key: 'personName', label: 'Kişi' },
                    { key: 'priority',   label: 'Öncelik' },
                    { key: 'dueDate',    label: 'Son Tarih' },
                    { key: 'status',     label: 'Durum' },
                  ].map(col => (
                    <th key={col.key} onClick={() => toggleSort(col.key)}
                      className="table-th text-left px-4 py-3 font-semibold cursor-pointer select-none text-xs uppercase tracking-wide"
                      style={{ color: 'var(--text-secondary)', letterSpacing: '0.05em' }}>
                      {col.label}<SortIcon col={col.key} sortBy={sortBy} sortDir={sortDir} />
                    </th>
                  ))}
                  <th className="px-4 py-3 w-48" />
                </tr>
              </thead>
              <tbody>
                {sortedTasks.map(t => (
                  <TaskRow
                    key={t.id}
                    t={t}
                    isSelected={selectedIds.has(t.id)}
                    onSelect={toggleSelect}
                    onComments={openComments}
                    onComplete={handleComplete}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    optimisticIds={optimisticIds}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task form modal */}
      {showForm && (
        <Modal title={editTask ? 'Görevi Düzenle' : 'Yeni Görev'} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            {!editTask && (
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Kişi *</label>
                <select value={form.personId} onChange={e => setForm(f => ({ ...f, personId: e.target.value }))} required
                  className="input-base">
                  <option value="">Seçin...</option>
                  {persons.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                </select>
                {errors.assignedTo && <p className="text-xs text-red-500 mt-1">{errors.assignedTo}</p>}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Görev Başlığı <span className="text-red-500">*</span>
              </label>
              <input value={form.title}
                onChange={e => { setForm(f => ({ ...f, title: e.target.value })); setErrors(p => ({ ...p, title: undefined })); }}
                className="input-base" style={errors.title ? { borderColor: '#EF4444' } : {}} placeholder="Görev başlığını girin" />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Açıklama</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} className="input-base" placeholder="İsteğe bağlı..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Öncelik</label>
                <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  className="input-base">
                  <option value="Low">Düşük</option>
                  <option value="Medium">Orta</option>
                  <option value="High">Yüksek</option>
                  <option value="Critical">Kritik</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>Atanma Tarihi *</label>
                <input type="date" value={form.assignedDate}
                  onChange={e => setForm(f => ({ ...f, assignedDate: e.target.value }))}
                  required className="input-base" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Son Tarih <span className="text-red-500">*</span>
              </label>
              <input type="date" value={form.dueDate}
                onChange={e => { setForm(f => ({ ...f, dueDate: e.target.value })); setErrors(p => ({ ...p, dueDate: undefined })); }}
                className="input-base" style={errors.dueDate ? { borderColor: '#EF4444' } : {}} />
              {errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate}</p>}
            </div>
            <Button type="submit" loading={saveLoading} className="w-full justify-center" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
              {editTask ? 'Değişiklikleri Kaydet' : 'Görev Oluştur'}
            </Button>
          </form>
        </Modal>
      )}

      {/* Confirm dialogs */}
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
            <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
              {commentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-center py-8" style={{ color: 'var(--text-tertiary)' }}>Henüz yorum yok</p>
              ) : comments.map(c => (
                <div key={c.id} className="group flex gap-3">
                  <div className="flex-1 rounded-xl px-3.5 py-3"
                    style={{ background: 'var(--content-bg)', border: '1px solid var(--card-border)' }}>
                    <div className="flex justify-between items-start gap-2">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{c.createdByName}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{new Date(c.createdAt).toLocaleString('tr-TR')}</p>
                        <button onClick={() => handleDeleteComment(c.id)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-all text-sm font-bold">×</button>
                      </div>
                    </div>
                    <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-primary)' }}>{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <form onSubmit={handleAddComment} className="flex gap-2">
              <input
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="Yorum yaz..."
                className="input-base flex-1"
              />
              <Button type="submit" loading={commentLoading} disabled={!commentText.trim()}>Gönder</Button>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
