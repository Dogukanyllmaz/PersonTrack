import { useState, useEffect } from 'react';
import { getReminders, createReminder, completeReminder, deleteReminder, getPersons, getMeetings } from '../services/api';
import Modal from '../components/Modal';
import { useLanguage } from '../context/LanguageContext';

const emptyForm = {
  title: '', notes: '', reminderDate: '', isRecurring: false,
  recurringIntervalDays: '', personId: '', meetingId: ''
};

export default function Reminders() {
  const { t } = useLanguage();
  const [reminders, setReminders] = useState([]);
  const [persons, setPersons] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await getReminders();
    setReminders(res.data);
  };

  useEffect(() => {
    load();
    getPersons().then(r => setPersons(r.data));
    getMeetings().then(r => setMeetings(r.data));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createReminder({
        title: form.title,
        notes: form.notes || null,
        reminderDate: new Date(form.reminderDate).toISOString(),
        isRecurring: form.isRecurring,
        recurringIntervalDays: form.isRecurring && form.recurringIntervalDays ? parseInt(form.recurringIntervalDays) : null,
        personId: form.personId ? parseInt(form.personId) : null,
        meetingId: form.meetingId ? parseInt(form.meetingId) : null
      });
      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Hata oluştu.');
    } finally { setLoading(false); }
  };

  const handleComplete = async (id) => {
    await completeReminder(id);
    await load();
  };

  const handleDelete = async (id) => {
    if (!confirm(t('deleteReminder'))) return;
    await deleteReminder(id);
    await load();
  };

  const isOverdue = (r) => new Date(r.reminderDate) < new Date() && !r.isSent;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{t('pageReminders')}</h2>
        <button onClick={() => setShowForm(true)}
          className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          + {t('addReminder')}
        </button>
      </div>

      {reminders.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">🔔</p>
          <p>{t('noReminders')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map(r => (
            <div key={r.id} className={`bg-white rounded-xl border shadow-sm p-5 ${isOverdue(r) ? 'border-orange-200 bg-orange-50' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔔</span>
                    <h3 className="font-medium text-gray-900">{r.title}</h3>
                    {r.isRecurring && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                        🔄 Her {r.recurringIntervalDays} günde bir
                      </span>
                    )}
                    {isOverdue(r) && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">Zamanı geçti</span>
                    )}
                  </div>
                  {r.notes && <p className="text-sm text-gray-600 mt-1">{r.notes}</p>}
                  <div className="flex items-center gap-4 mt-2">
                    <p className="text-sm text-gray-500">
                      📅 {new Date(r.reminderDate).toLocaleString('tr-TR')}
                    </p>
                    {r.personName && <p className="text-sm text-gray-500">👤 {r.personName}</p>}
                    {r.meetingTitle && <p className="text-sm text-gray-500">📅 {r.meetingTitle}</p>}
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleComplete(r.id)}
                    className="text-sm text-green-600 hover:text-green-800 font-medium">{t('taskDone')}</button>
                  <button onClick={() => handleDelete(r.id)}
                    className="text-sm text-red-500 hover:text-red-700 font-medium">{t('delete')}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <Modal title={t('addReminder')} onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('reminderTitle')} *</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('notes')}</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('reminderDate')} *</label>
              <input type="datetime-local" value={form.reminderDate} onChange={e => setForm({...form, reminderDate: e.target.value})} required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="recurring" checked={form.isRecurring}
                onChange={e => setForm({...form, isRecurring: e.target.checked})}
                className="w-4 h-4 rounded" />
              <label htmlFor="recurring" className="text-sm text-gray-700">{t('repeat')}</label>
            </div>
            {form.isRecurring && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Her kaç günde bir? *</label>
                <input type="number" min="1" value={form.recurringIntervalDays}
                  onChange={e => setForm({...form, recurringIntervalDays: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('personName')} ({t('note')})</label>
                <select value={form.personId} onChange={e => setForm({...form, personId: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                  <option value="">Seçin...</option>
                  {persons.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">{t('meetingTitle')} ({t('note')})</label>
                <select value={form.meetingId} onChange={e => setForm({...form, meetingId: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                  <option value="">Seçin...</option>
                  {meetings.map(m => <option key={m.id} value={m.id}>{m.title}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? t('loading') : t('save')}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
