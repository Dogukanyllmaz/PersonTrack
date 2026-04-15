import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getMeeting, completeMeeting, addMeetingNote, deleteMeetingNote,
  previewMeetingNotes, importConfirmedNotes, downloadNotesTemplate, getPersons,
  uploadMeetingDocument, downloadMeetingDocument, deleteMeetingDocument,
  addMeetingLink, removeMeetingLink, getMeetings,
  getTags, addTagToMeeting, removeTagFromMeeting, exportMeetings,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import Breadcrumb from '../components/Breadcrumb';

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

  // Confirm dialog
  const [confirmAction, setConfirmAction] = useState(null);

  // Import preview
  const [importPreview, setImportPreview] = useState(null); // { rows }
  const [importSaving, setImportSaving] = useState(false);
  const importFileRef = useRef();

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

  const handleComplete = () => {
    setConfirmAction({
      label: 'Toplantıyı tamamlandı olarak işaretlemek istediğinizden emin misiniz?',
      onConfirm: async () => { await completeMeeting(id); await load(); },
    });
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

  const handleDeleteNote = (noteId) => {
    setConfirmAction({
      label: 'Bu notu silmek istediğinizden emin misiniz?',
      variant: 'danger',
      onConfirm: async () => { await deleteMeetingNote(id, noteId); await load(); },
    });
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await previewMeetingNotes(id, file);
      // Attach editable resolvedPersonId to each row for user interaction
      const rows = res.data.rows.map(r => ({
        ...r,
        resolvedPersonId: r.resolvedPersonId ?? (r.matches.length === 1 ? r.matches[0].id : null),
        excluded: false,
      }));
      setImportPreview({ rows });
    } catch (err) {
      alert('Import hatası: ' + (err.response?.data?.message || err.message));
    }
    if (importFileRef.current) importFileRef.current.value = '';
    e.target.value = '';
  };

  const handleImportConfirm = async () => {
    if (!importPreview) return;
    setImportSaving(true);
    try {
      const rows = importPreview.rows
        .filter(r => !r.excluded && r.content?.trim())
        .map(r => ({
          personId: r.resolvedPersonId || null,
          content: r.content,
          minuteMarker: r.minuteMarker || null,
        }));
      const res = await importConfirmedNotes(id, rows);
      setImportPreview(null);
      await load();
      alert(`${res.data.added} not eklendi.`);
    } catch (err) {
      alert('Kaydetme hatası: ' + (err.response?.data?.message || err.message));
    } finally { setImportSaving(false); }
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

  const handleDeleteDoc = (docId) => {
    setConfirmAction({
      label: 'Bu evrakı silmek istiyor musunuz?',
      variant: 'danger',
      onConfirm: async () => { try { await deleteMeetingDocument(id, docId); await load(); } catch {} },
    });
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

  const handleRemoveLink = (linkId) => {
    setConfirmAction({
      label: 'Bu bağlantıyı kaldırmak istiyor musunuz?',
      variant: 'warning',
      onConfirm: async () => { try { await removeMeetingLink(id, linkId); await load(); } catch {} },
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <p className="text-sm">Yükleniyor...</p>
      </div>
    </div>
  );
  if (!meeting) return <div style={{ color: 'var(--text-secondary)' }}>Toplantı bulunamadı.</div>;

  const tabs = [
    { id: 'notes', label: `Notlar (${meeting.notes?.length ?? 0})` },
    { id: 'documents', label: `Evraklar (${meeting.documents?.length ?? 0})` },
    { id: 'links', label: `Bağlantılı Toplantılar (${meeting.linkedMeetings?.length ?? 0})` },
  ];

  return (
    <div className="max-w-3xl">
      <Breadcrumb items={[
        { label: 'Toplantılar', to: '/meetings' },
        { label: meeting.title },
      ]} />
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{meeting.title}</h2>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
              meeting.status === 'Completed'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
            }`}>
              {meeting.status === 'Completed' ? '✓ Tamamlandı' : '● Planlandı'}
            </span>
          </div>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
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
        <div className="card p-5 mb-5">
          <h3 className="font-semibold text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>Toplantı İçeriği</h3>
          <p className="text-sm whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{meeting.content}</p>
        </div>
      )}

      {/* Participants */}
      <div className="card p-5 mb-5">
        <h3 className="font-semibold text-xs uppercase tracking-wide mb-3" style={{ color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>Katılımcılar</h3>
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
      <div className="mb-5" style={{ borderBottom: '1px solid var(--card-border)' }}>
        <div className="flex">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="px-5 py-3 text-sm font-semibold border-b-2 transition-colors"
              style={tab === t.id
                ? { borderColor: 'var(--accent)', color: 'var(--accent)' }
                : { borderColor: 'transparent', color: 'var(--text-tertiary)' }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── NOTLAR ── */}
      {tab === 'notes' && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>Toplantı Notları</h3>
            <div className="flex gap-2">
              <label className="btn-secondary cursor-pointer" style={{ padding: '5px 12px', fontSize: '12px' }}>
                ↑ Excel Import
                <input ref={importFileRef} type="file" accept=".xlsx" onChange={handleImport} className="hidden" />
              </label>
              <button onClick={handleTemplate} className="btn-secondary" style={{ padding: '5px 12px', fontSize: '12px' }}>
                ↓ Şablon
              </button>
              <button onClick={() => setShowNoteForm(true)} className="btn-primary" style={{ padding: '5px 12px', fontSize: '12px' }}>
                + Not Ekle
              </button>
            </div>
          </div>

          {meeting.notes?.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Henüz not yok.</p>
          ) : (
            <div className="space-y-3">
              {meeting.notes.map((n) => (
                <div key={n.id} className="flex gap-3 group">
                  <div className="shrink-0 mt-0.5">
                    {n.minuteMarker && (
                      <span className="text-xs font-mono px-2 py-0.5 rounded" style={{ background: 'var(--content-bg)', color: 'var(--text-tertiary)' }}>{n.minuteMarker}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    {n.personName && <p className="text-xs font-semibold mb-0.5" style={{ color: 'var(--accent)' }}>{n.personName}</p>}
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{n.content}</p>
                  </div>
                  <button onClick={() => handleDeleteNote(n.id)}
                    className="text-red-400 hover:text-red-500 opacity-0 group-hover:opacity-100 text-xs shrink-0 transition-opacity">Sil</button>
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
            <h3 className="font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>Toplantı Evrakları</h3>
            <div>
              <input type="file" ref={fileRef} onChange={handleUploadDoc} className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip,.ppt,.pptx" />
              <button onClick={() => fileRef.current?.click()} disabled={uploadingDoc} className="btn-primary disabled:opacity-50">
                {uploadingDoc ? 'Yükleniyor...' : '+ Evrak Yükle'}
              </button>
            </div>
          </div>

          {!meeting.documents?.length ? (
            <div className="card text-center py-10" style={{ color: 'var(--text-tertiary)' }}>
              Henüz evrak yüklenmemiş.
            </div>
          ) : (
            <div className="card overflow-hidden">
              {meeting.documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between px-5 py-4 gap-4"
                  style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl shrink-0">{fileIcon(doc.contentType)}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{doc.fileName}</div>
                      <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {formatBytes(doc.fileSize)} · {new Date(doc.uploadedAt).toLocaleDateString('tr-TR')} · {doc.uploadedByName}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleDownloadDoc(doc)} className="btn-secondary" style={{ padding: '5px 12px', fontSize: '12px' }}>İndir</button>
                    <button onClick={() => handleDeleteDoc(doc.id)}
                      className="text-xs px-3 py-1.5 border rounded-lg transition-colors text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      style={{ borderColor: 'rgba(239,68,68,0.3)' }}>Sil</button>
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
            <h3 className="font-semibold text-xs uppercase tracking-wide" style={{ color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>Bağlantılı Toplantılar</h3>
            <button onClick={() => setShowLinkForm(!showLinkForm)} className="btn-primary">
              + Bağlantı Ekle
            </button>
          </div>

          {showLinkForm && (
            <div className="card p-5 space-y-3">
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
            <div className="card text-center py-10" style={{ color: 'var(--text-tertiary)' }}>
              Bu toplantıya bağlı başka toplantı yok.
            </div>
          ) : (
            <div className="card overflow-hidden">
              {meeting.linkedMeetings.map(lm => (
                <div key={lm.id} className="flex items-center justify-between px-5 py-4 gap-4"
                  style={{ borderBottom: '1px solid var(--card-border)' }}>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      lm.isReverse ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                    }`}>
                      {lm.linkType || 'İlgili'}
                    </span>
                    <Link to={`/meetings/${lm.linkedMeetingId}`}
                      className="text-sm font-semibold hover:underline transition-colors"
                      style={{ color: 'var(--text-primary)' }}>
                      {lm.linkedMeetingTitle}
                    </Link>
                    <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(lm.linkedMeetingDate).toLocaleDateString('tr-TR')}
                    </span>
                  </div>
                  {!lm.isReverse && (
                    <button onClick={() => handleRemoveLink(lm.id)}
                      className="text-xs text-red-500 hover:text-red-600 shrink-0 font-medium">Kaldır</button>
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

      {/* ── Import Preview Modal ── */}
      {importPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">📋 İçe Aktarma Önizlemesi</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {importPreview.rows.filter(r => !r.excluded).length} not kaydedilecek — kişi eşleşmelerini kontrol edin
                </p>
              </div>
              <button onClick={() => setImportPreview(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">×</button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-3 w-8 text-center">
                      <span className="text-xs text-gray-500 dark:text-gray-400">#</span>
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Kişi</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Not İçeriği</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide w-28">Dakika</th>
                    <th className="px-4 py-3 w-16 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Dahil</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {importPreview.rows.map((row, idx) => (
                    <tr key={idx} className={`transition-colors ${
                      row.excluded
                        ? 'opacity-40 bg-gray-50 dark:bg-gray-900'
                        : row.matches.length > 1
                        ? 'bg-amber-50 dark:bg-amber-900/10'
                        : ''
                    }`}>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs text-gray-400">{row.rowNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        {row.matches.length === 0 && !row.rawName ? (
                          <span className="text-xs text-gray-400 italic">Kişisiz not</span>
                        ) : row.matches.length === 0 ? (
                          <div>
                            <span className="text-xs text-red-500 font-medium">⚠ Bulunamadı</span>
                            <p className="text-xs text-gray-400 mt-0.5">"{row.rawName}"</p>
                          </div>
                        ) : row.matches.length === 1 ? (
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {row.matches[0].fullName[0]}
                            </span>
                            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{row.matches[0].fullName}</span>
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✓ Eşleşti</span>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">
                              ⚠ {row.matches.length} eşleşme — birini seçin
                            </p>
                            <select
                              value={row.resolvedPersonId ?? ''}
                              onChange={e => {
                                const val = e.target.value ? parseInt(e.target.value) : null;
                                setImportPreview(prev => ({
                                  ...prev,
                                  rows: prev.rows.map((r, i) => i === idx ? { ...r, resolvedPersonId: val } : r)
                                }));
                              }}
                              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 dark:text-gray-100"
                            >
                              <option value="">— Kişisiz bırak —</option>
                              {row.matches.map(m => (
                                <option key={m.id} value={m.id}>{m.fullName}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.content
                          ? <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{row.content}</p>
                          : <span className="text-xs text-red-500 italic">İçerik boş — atlanacak</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        {row.minuteMarker
                          ? <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded">{row.minuteMarker}</span>
                          : <span className="text-gray-300 dark:text-gray-600">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={!row.excluded}
                          onChange={e => {
                            setImportPreview(prev => ({
                              ...prev,
                              rows: prev.rows.map((r, i) => i === idx ? { ...r, excluded: !e.target.checked } : r)
                            }));
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-2xl">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {importPreview.rows.filter(r => !r.excluded && r.content).length} not kaydedilecek,{' '}
                {importPreview.rows.filter(r => r.excluded).length} atlanacak
              </div>
              <div className="flex gap-3">
                <button onClick={() => setImportPreview(null)}
                  className="px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                  İptal
                </button>
                <button onClick={handleImportConfirm} disabled={importSaving}
                  className="px-5 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2">
                  {importSaving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {importSaving ? 'Kaydediliyor...' : '✓ Kaydet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmAction}
        title="Onay"
        message={confirmAction?.label}
        variant={confirmAction?.variant || 'danger'}
        onConfirm={async () => { await confirmAction?.onConfirm(); setConfirmAction(null); }}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
