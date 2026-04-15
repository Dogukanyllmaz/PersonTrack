import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMeetings, createMeeting, deleteMeeting, completeMeeting, getPersons, downloadNotesTemplate, getErrorMessage
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';

const emptyForm = { title: '', content: '', meetingDate: '', participantIds: [] };

export default function Meetings() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [meetings, setMeetings] = useState([]);
  const [persons, setPersons] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [confirm, setConfirm] = useState(null);
  const [confirming, setConfirming] = useState(false);

  const load = async () => {
    setPageLoading(true);
    try {
      const res = await getMeetings(statusFilter || undefined);
      setMeetings(res.data);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => { getPersons().then(r => setPersons(r.data)); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.title?.trim()) newErrors.title = 'Başlık zorunludur';
    if (!form.meetingDate) newErrors.date = 'Tarih zorunludur';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setLoading(true);
    try {
      await createMeeting({
        title: form.title,
        content: form.content || null,
        meetingDate: new Date(form.meetingDate).toISOString(),
        participantIds: form.participantIds
      });
      setShowForm(false);
      setForm(emptyForm);
      setErrors({});
      await load();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setLoading(false); }
  };

  const handleComplete = async (id) => {
    await completeMeeting(id);
    await load();
  };

  const handleDelete = async (id) => {
    await deleteMeeting(id);
    await load();
  };

  const toggleParticipant = (id) => {
    setForm(f => ({
      ...f,
      participantIds: f.participantIds.includes(id)
        ? f.participantIds.filter(x => x !== id)
        : [...f.participantIds, id]
    }));
  };

  const filtered = meetings;

  if (pageLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <p className="text-sm">Toplantılar yükleniyor...</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Toplantılar</h1>
          <p className="page-subtitle">{meetings.length} toplantı</p>
        </div>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="input-base" style={{ width: 'auto', padding: '7px 12px' }}>
            <option value="">Tümü</option>
            <option value="Planned">Planlandı</option>
            <option value="Completed">Tamamlandı</option>
          </select>
          <button onClick={() => setShowForm(true)} className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #5B21B6, #7C3AED)' }}>
            + Yeni Toplantı
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && !pageLoading && (
          <div className="text-center py-20" style={{ color: 'var(--text-tertiary)' }}>
            <div className="text-5xl mb-4">📅</div>
            <p className="font-semibold text-base" style={{ color: 'var(--text-secondary)' }}>
              {statusFilter ? 'Bu filtreye uygun toplantı bulunamadı' : 'Henüz toplantı oluşturulmadı'}
            </p>
            {!statusFilter && <p className="text-sm mt-1">Yeni toplantı eklemek için butona tıklayın</p>}
          </div>
        )}
        {filtered.map((m, i) => {
          const isCompleted = m.status === 'Completed';
          const meetingDate = new Date(m.meetingDate);
          const isPast = meetingDate < new Date() && !isCompleted;
          return (
            <div key={m.id}
              className="card card-hover cursor-pointer animate-fade-up"
              style={{ animationDelay: `${i * 50}ms` }}
              onClick={() => navigate(`/meetings/${m.id}`)}>
              <div className="flex items-stretch">
                {/* Left accent bar */}
                <div className={`w-1.5 rounded-l-2xl flex-shrink-0 ${
                  isCompleted ? 'bg-emerald-400' : isPast ? 'bg-orange-400' : 'bg-violet-500'
                }`} />
                <div className="flex-1 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-2 flex-wrap">
                        <h3 className="font-semibold transition-colors" style={{ color: 'var(--text-primary)' }}>
                          {m.title}
                        </h3>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          isCompleted
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                        }`}>
                          {isCompleted ? '✓ Tamamlandı' : '● Planlandı'}
                        </span>
                        {isPast && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                            Geçmiş
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        <span className="flex items-center gap-1.5">
                          <span className="text-xs">📅</span>
                          {meetingDate.toLocaleDateString('tr-TR', { dateStyle: 'long' })}
                        </span>
                        {m.participants?.length > 0 && (
                          <span className="flex items-center gap-1.5">
                            <span className="text-xs">👥</span>
                            {m.participants.slice(0, 3).map(p => p.personName).join(', ')}
                            {m.participants.length > 3 && ` +${m.participants.length - 3}`}
                          </span>
                        )}
                      </div>
                      {m.content && (
                        <p className="text-sm mt-2 line-clamp-1" style={{ color: 'var(--text-tertiary)' }}>{m.content}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                      {!isCompleted && (
                        <button onClick={() => setConfirm({ type: 'complete', meeting: m })}
                          className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold px-3 py-1.5 rounded-lg transition-colors"
                          style={{ border: '1px solid rgba(16,185,129,0.3)' }}>
                          ✓ Tamamla
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => setConfirm({ type: 'delete', meeting: m })}
                          className="text-xs hover:text-red-500 px-2 py-1.5 rounded-lg transition-colors"
                          style={{ color: 'var(--text-tertiary)' }}>
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ConfirmDialog
        open={!!confirm}
        title={confirm?.type === 'delete' ? 'Toplantıyı Sil' : 'Toplantıyı Tamamla'}
        message={confirm?.type === 'delete'
          ? `"${confirm?.meeting?.title}" toplantısı kalıcı olarak silinecek.`
          : `"${confirm?.meeting?.title}" toplantısı tamamlandı olarak işaretlenecek.`}
        confirmLabel={confirm?.type === 'delete' ? 'Sil' : 'Tamamla'}
        variant={confirm?.type === 'delete' ? 'danger' : 'warning'}
        loading={confirming}
        onConfirm={async () => {
          setConfirming(true);
          try {
            if (confirm.type === 'delete') await handleDelete(confirm.meeting.id);
            else await handleComplete(confirm.meeting.id);
            setConfirm(null);
          } finally { setConfirming(false); }
        }}
        onCancel={() => setConfirm(null)}
      />

      {/* Create Meeting Modal */}
      {showForm && (
        <Modal title="Yeni Toplantı" onClose={() => { setShowForm(false); setErrors({}); }}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Başlık <span className="text-red-500">*</span></label>
              <input value={form.title} onChange={e => { setForm({...form, title: e.target.value}); setErrors(prev => ({ ...prev, title: undefined })); }}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500 ${errors.title ? 'border-red-400' : 'border-gray-300'}`} />
              {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tarih <span className="text-red-500">*</span></label>
              <input type="datetime-local" value={form.meetingDate} onChange={e => { setForm({...form, meetingDate: e.target.value}); setErrors(prev => ({ ...prev, date: undefined })); }}
                className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500 ${errors.date ? 'border-red-400' : 'border-gray-300'}`} />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">İçerik</label>
              <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Katılımcılar</label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg divide-y divide-gray-200 dark:divide-gray-600 bg-white dark:bg-gray-700">
                {persons.map(p => (
                  <label key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer text-sm text-gray-900 dark:text-gray-100">
                    <input type="checkbox" checked={form.participantIds.includes(p.id)}
                      onChange={() => toggleParticipant(p.id)} className="rounded" />
                    {p.fullName}
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full justify-center disabled:opacity-50" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
              {loading ? 'Kaydediliyor...' : 'Oluştur'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
