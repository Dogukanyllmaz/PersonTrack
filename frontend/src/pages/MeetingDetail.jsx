import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getMeeting, completeMeeting, addMeetingNote, deleteMeetingNote,
  importMeetingNotes, downloadNotesTemplate, getPersons,
  uploadMeetingDocument, downloadMeetingDocument, deleteMeetingDocument,
  addMeetingLink, removeMeetingLink, getMeetings,
  getTags, addTagToMeeting, removeTagFromMeeting, exportMeetings,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';

function formatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(1) + ' MB';
}

function fileIcon(ct) {
  if (!ct) return '📎';
  if (ct.includes('pdf')) return '📄';
  if (ct.includes('image')) return '🖼️';
  if (ct.includes('word') || ct.includes('document')) return '📝';
  if (ct.includes('sheet') || ct.includes('excel')) return '📊';
  return '📎';
}

const LINK_TYPES = ['İlgili', 'Devam', 'Önceki', 'Sonraki'];

export default function MeetingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [meeting, setMeeting] = useState(null);
  const [persons, setPersons] = useState([]);
  const [allMeetings, setAllMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('notes');

  // Notes
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [noteForm, setNoteForm] = useState({ personId: '', content: '', minuteMarker: '', orderIndex: 0 });

  // Documents
  const fileRef = useRef();
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Meeting links
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkForm, setLinkForm] = useState({ linkedMeetingId: '', linkType: 'İlgili' });
  const [addingLink, setAddingLink] = useState(false);

  // Tags
  const [allTags, setAllTags] = useState([]);
  const [tagAdding, setTagAdding] = useState(false);

  const load = async () => {
    const [mRes, pRes, allRes, tagsRes] = await Promise.all([getMeeting(id), getPersons(), getMeetings(), getTags()]);
    setMeeting(mRes.data);
    setPersons(pRes.data);
    setAllMeetings(allRes.data.filter(m => m.id !== parseInt(id)));
    setAllTags(tagsRes.data);
    setLoading(false);
  };

  const handleAddTag = async (tagId) => {
    setTagAdding(true);
    try { await addTagToMeeting(id, tagId); await load(); } catch {}
    finally { setTagAdding(false); }
  };

  const handleRemoveTag = async (tagId) => {
    try { await removeTagFromMeeting(id, tagId); await load(); } catch {}
  };

  useEffect(() => { load(); }, [id]);

  const handleComplete = async () => {
    if (!confirm('Toplantıyı tamamlandı olarak işaretleyeceksiniz.')) return;
    await completeMeeting(id);
    await load();
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    try {
      await addMeetingNote(id, {
        personId: noteForm.personId ? parseInt(noteForm.personId) : null,
        content: noteForm.content,
        minuteMarker: noteForm.minuteMarker || null,
        orderIndex: parseInt(noteForm.orderIndex) || meeting.notes.length,
      });
      setShowNoteForm(false);
      setNoteForm({ personId: '', content: '', minuteMarker: '', orderIndex: 0 });
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Hata oluştu.');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm('Bu notu silmek istediğinizden emin misiniz?')) return;
    await deleteMeetingNote(id, noteId);
    await load();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await importMeetingNotes(id, file);
      alert(`${res.data.added} not eklendi.`);
      await load();
    } catch (err) {
      alert('Import hatası: ' + (err.response?.data?.message || err.message));
    }
    e.target.value = '';
  };

  const handleTemplate = async () => {
    const res = await downloadNotesTemplate();
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url; a.download = 'toplanti_not_sablonu.xlsx'; a.click();
  };

  const handleUploadDoc = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try { await uploadMeetingDocument(id, file); await load(); } catch {}
    finally { setUploadingDoc(false); fileRef.current.value = ''; }
  };

  const handleDownloadDoc = async (doc) => {
    try {
      const r = await downloadMeetingDocument(id, doc.id);
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url; a.download = doc.fileName; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  const handleDeleteDoc = async (docId) => {
    if (!confirm('Bu evrakı silmek istiyor musunuz?')) return;
    try { await deleteMeetingDocument(id, docId); await load(); } catch {}
  };

  const handleAddLink = async () => {
    if (!linkForm.linkedMeetingId) return;
    setAddingLink(true);
    try {
      await addMeetingLink(id, {
        linkedMeetingId: parseInt(linkForm.linkedMeetingId),
        linkType: linkForm.linkType || null,
      });
      await load();
      setLinkForm({ linkedMeetingId: '', linkType: 'İlgili' });
      setShowLinkForm(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Hata.');
    } finally { setAddingLink(false); }
  };

  const handleRemoveLink = async (linkId) => {
    if (!confirm('Bu bağlantıyı kaldırmak istiyor musunuz?')) return;
    try { await removeMeetingLink(id, linkId); await load(); } catch {}
  };

  if (loading) return <div className="text-gray-500">Yükleniyor...</div>;
  if (!meeting) return <div className="text-gray-500">Toplantı bulunamadı.</div>;

  const tabs = [
    { id: 'notes', label: `Notlar (${meeting.notes?.length ?? 0})` },
    { id: 'documents', label: `Evraklar (${meeting.documents?.length ?? 0})` },
    { id: 'links', label: `Bağlantılı Toplantılar (${meeting.linkedMeetings?.length ?? 0})` },
  ];

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button onClick={() => navigate('/meetings')} className="text-gray-400 hover:text-gray-600 text-xl mt-1">←</button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-800">{meeting.title}</h2>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              meeting.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {meeting.status === 'Completed' ? 'Tamamlandı' : 'Planlandı'}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            📅 {new Date(meeting.meetingDate).toLocaleDateString('tr-TR', { dateStyle: 'long' })}
          </p>
          {/* Tags */}
          <div className="flex flex-wrap gap-1 mt-2">
            {(meeting.tags || []).map(mt => (
              <span key={mt.tagId} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: mt.tag?.color || '#6366f1' }}>
                {mt.tag?.name}
                <button onClick={() => handleRemoveTag(mt.tagId)} className="hover:opacity-70 leading-none">×</button>
              </span>
            ))}
            {allTags.filter(t => !(meeting.tags || []).some(mt => mt.tagId === t.id)).length > 0 && (
              <select onChange={e => { if (e.target.value) handleAddTag(parseInt(e.target.value)); e.target.value = ''; }}
                className="text-xs border border-dashed border-gray-300 rounded-full px-2 py-0.5 text-gray-400 bg-transparent cursor-pointer"
                disabled={tagAdding}>
                <option value="">+ Etiket</option>
                {allTags.filter(t => !(meeting.tags || []).some(mt => mt.tagId === t.id)).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
        {meeting.status === 'Planned' && (
          <button onClick={handleComplete}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium shrink-0">
            ✓ Tamamlandı
          </button>
        )}
      </div>

      {meeting.content && (
        <div className="bg-white rounded-xl border p-5 mb-5">
          <h3 className="font-medium text-gray-700 mb-2 text-sm">Toplantı İçeriği</h3>
          <p className="text-gray-600 text-sm whitespace-pre-line">{meeting.content}</p>
        </div>
      )}

      {/* Participants */}
      <div className="bg-white rounded-xl border p-5 mb-5">
        <h3 className="font-medium text-gray-700 mb-3 text-sm">Katılımcılar</h3>
        {meeting.participants?.length === 0 ? (
          <p className="text-gray-400 text-sm">Katılımcı yok.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {meeting.participants.map(p => (
              <Link key={p.personId} to={`/persons/${p.personId}`}
                className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-medium hover:bg-blue-200 transition-colors">
                {p.personName}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-5">
        <div className="flex">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-slate-800 text-slate-800' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── NOTLAR ── */}
      {tab === 'notes' && (
        <div className="bg-white rounded-xl border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-700 text-sm">Toplantı Notları</h3>
            <div className="flex gap-2">
              <label className="cursor-pointer text-xs bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg font-medium">
                📤 Excel Import
                <input type="file" accept=".xlsx" onChange={handleImport} className="hidden" />
              </label>
              <button onClick={handleTemplate}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-medium">
                📥 Şablon
              </button>
              <button onClick={() => setShowNoteForm(true)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-medium">
                + Not Ekle
              </button>
            </div>
          </div>

          {meeting.notes?.length === 0 ? (
            <p className="text-gray-400 text-sm">Henüz not yok.</p>
          ) : (
            <div className="space-y-3">
              {meeting.notes.map((n) => (
                <div key={n.id} className="flex gap-3 group">
                  <div className="shrink-0 mt-0.5">
                    {n.minuteMarker && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-mono">{n.minuteMarker}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {n.personName && <p className="text-xs font-semibold text-blue-600 mb-0.5">{n.personName}</p>}
                    <p className="text-sm text-gray-700">{n.content}</p>
                  </div>
                  <button onClick={() => handleDeleteNote(n.id)}
                    className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 text-xs shrink-0">Sil</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── EVRAKLAR ── */}
      {tab === 'documents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-700 text-sm">Toplantı Evrakları</h3>
            <div>
              <input type="file" ref={fileRef} onChange={handleUploadDoc} className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip,.ppt,.pptx" />
              <button onClick={() => fileRef.current?.click()} disabled={uploadingDoc}
                className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                {uploadingDoc ? 'Yükleniyor...' : '+ Evrak Yükle'}
              </button>
            </div>
          </div>

          {!meeting.documents?.length ? (
            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border">
              Henüz evrak yüklenmemiş.
            </div>
          ) : (
            <div className="bg-white rounded-xl border divide-y divide-gray-100">
              {meeting.documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between px-5 py-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{fileIcon(doc.contentType)}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-800 truncate">{doc.fileName}</div>
                      <div className="text-xs text-gray-400">
                        {formatBytes(doc.fileSize)} · {new Date(doc.uploadedAt).toLocaleDateString('tr-TR')} · {doc.uploadedByName}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleDownloadDoc(doc)}
                      className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50">İndir</button>
                    <button onClick={() => handleDeleteDoc(doc.id)}
                      className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Sil</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BAĞLANTILI TOPLANTILER ── */}
      {tab === 'links' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-medium text-gray-700 text-sm">Bağlantılı Toplantılar</h3>
            <button onClick={() => setShowLinkForm(!showLinkForm)}
              className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700">
              + Bağlantı Ekle
            </button>
          </div>

          {showLinkForm && (
            <div className="bg-white rounded-xl border p-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Toplantı</label>
                  <select value={linkForm.linkedMeetingId}
                    onChange={e => setLinkForm(p => ({ ...p, linkedMeetingId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                    <option value="">Seçiniz...</option>
                    {allMeetings.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.title} ({new Date(m.meetingDate).toLocaleDateString('tr-TR')})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Bağlantı Türü</label>
                  <select value={linkForm.linkType}
                    onChange={e => setLinkForm(p => ({ ...p, linkType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                    {LINK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowLinkForm(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">İptal</button>
                <button onClick={handleAddLink} disabled={addingLink || !linkForm.linkedMeetingId}
                  className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                  {addingLink ? 'Ekleniyor...' : 'Ekle'}
                </button>
              </div>
            </div>
          )}

          {!meeting.linkedMeetings?.length ? (
            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border">
              Bu toplantıya bağlı başka toplantı yok.
            </div>
          ) : (
            <div className="bg-white rounded-xl border divide-y divide-gray-100">
              {meeting.linkedMeetings.map(lm => (
                <div key={lm.id} className="flex items-center justify-between px-5 py-4 gap-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      lm.isReverse ? 'bg-orange-50 text-orange-700' : 'bg-purple-50 text-purple-700'
                    }`}>
                      {lm.linkType || 'İlgili'}
                    </span>
                    <Link to={`/meetings/${lm.linkedMeetingId}`}
                      className="text-sm font-medium text-gray-800 hover:text-slate-600 hover:underline">
                      {lm.linkedMeetingTitle}
                    </Link>
                    <span className="text-xs text-gray-400">
                      {new Date(lm.linkedMeetingDate).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  {!lm.isReverse && (
                    <button onClick={() => handleRemoveLink(lm.id)}
                      className="text-red-400 hover:text-red-600 text-sm shrink-0">Kaldır</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Note Form Modal */}
      {showNoteForm && (
        <Modal title="Not Ekle" onClose={() => setShowNoteForm(false)}>
          <form onSubmit={handleAddNote} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Konuşan Kişi (isteğe bağlı)</label>
              <select value={noteForm.personId} onChange={e => setNoteForm({...noteForm, personId: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                <option value="">Genel not</option>
                {meeting.participants.map(p => (
                  <option key={p.personId} value={p.personId}>{p.personName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Dakika (HH:mm:ss)</label>
              <input value={noteForm.minuteMarker} onChange={e => setNoteForm({...noteForm, minuteMarker: e.target.value})}
                placeholder="00:05:30" pattern="\d{2}:\d{2}:\d{2}"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">İçerik *</label>
              <textarea value={noteForm.content} onChange={e => setNoteForm({...noteForm, content: e.target.value})}
                required rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-medium">
              Ekle
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
