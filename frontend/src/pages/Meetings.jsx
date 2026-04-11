import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMeetings, createMeeting, deleteMeeting, completeMeeting, getPersons, downloadNotesTemplate
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

const emptyForm = { title: '', content: '', meetingDate: '', participantIds: [] };

export default function Meetings() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [persons, setPersons] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await getMeetings(statusFilter || undefined);
    setMeetings(res.data);
  };

  useEffect(() => { load(); }, [statusFilter]);
  useEffect(() => { getPersons().then(r => setPersons(r.data)); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
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
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Hata oluştu.');
    } finally { setLoading(false); }
  };

  const handleComplete = async (id) => {
    if (!confirm('Toplantıyı tamamlandı olarak işaretleyeceksiniz.')) return;
    await completeMeeting(id);
    await load();
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu toplantıyı silmek istediğinizden emin misiniz?')) return;
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Toplantılar</h2>
        <div className="flex gap-2">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
            <option value="">Tümü</option>
            <option value="Planned">Planlandı</option>
            <option value="Completed">Tamamlandı</option>
          </select>
          <button onClick={() => setShowForm(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
            + Yeni Toplantı
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {meetings.length === 0 && (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400 border">Toplantı bulunamadı.</div>
        )}
        {meetings.map((m) => (
          <div key={m.id} className="bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3
                    className="font-semibold text-gray-800 hover:text-blue-600 cursor-pointer"
                    onClick={() => navigate(`/meetings/${m.id}`)}
                  >
                    {m.title}
                  </h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    m.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {m.status === 'Completed' ? 'Tamamlandı' : 'Planlandı'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-2">
                  📅 {new Date(m.meetingDate).toLocaleDateString('tr-TR', { dateStyle: 'long' })}
                </p>
                {m.content && <p className="text-sm text-gray-600 line-clamp-2">{m.content}</p>}
                {m.participants?.length > 0 && (
                  <p className="text-xs text-gray-400 mt-2">
                    👥 {m.participants.map(p => p.personName).join(', ')}
                  </p>
                )}
              </div>
              <div className="flex gap-2 ml-4">
                {m.status === 'Planned' && (
                  <button onClick={() => handleComplete(m.id)}
                    className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg font-medium">
                    ✓ Tamamlandı
                  </button>
                )}
                <button onClick={() => navigate(`/meetings/${m.id}`)}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg font-medium">
                  Detay
                </button>
                {isAdmin && (
                  <button onClick={() => handleDelete(m.id)}
                    className="text-xs bg-red-100 hover:bg-red-200 text-red-600 px-3 py-1.5 rounded-lg font-medium">
                    Sil
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Meeting Modal */}
      {showForm && (
        <Modal title="Yeni Toplantı" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Başlık *</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tarih *</label>
              <input type="datetime-local" value={form.meetingDate} onChange={e => setForm({...form, meetingDate: e.target.value})} required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">İçerik</label>
              <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Katılımcılar</label>
              <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                {persons.map(p => (
                  <label key={p.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                    <input type="checkbox" checked={form.participantIds.includes(p.id)}
                      onChange={() => toggleParticipant(p.id)} className="rounded" />
                    {p.fullName}
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'Kaydediliyor...' : 'Oluştur'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
