import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getPerson, updatePerson, addRelationship, removeRelationship, getPersons,
  uploadPersonDocument, downloadPersonDocument, deletePersonDocument,
  uploadPersonPhoto, deletePersonPhoto,
  getTasks, createTask, completeTask, deleteTask,
  getPersonAccount, createAccountForPerson, setUserRole, toggleUserActive,
  adminResetPassword, generateOtp,
  getTags, addTagToPerson, removeTagFromPerson,
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import PhoneInput from '../components/PhoneInput';

const RELATIONSHIP_TYPES = [
  'Baba', 'Anne', 'Oğul', 'Kız', 'Erkek Kardeş', 'Kız Kardeş', 'Eş',
  'Amca', 'Dayı', 'Teyze', 'Hala', 'Kuzen',
  'Büyükbaba', 'Büyükanne', 'Torun', 'Yeğen',
  'Kayınpeder', 'Kayınvalide', 'Kayınbirader', 'Baldız', 'Enişte', 'Görümce',
  'İş Arkadaşı', 'Müdür', 'Ast', 'Ortak', 'Müşteri', 'Tedarikçi', 'Mentor', 'Diğer',
];

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

export default function PersonDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  const [person, setPerson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('info');

  // edit
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // relations
  const [allPersons, setAllPersons] = useState([]);
  const [showRelForm, setShowRelForm] = useState(false);
  const [relForm, setRelForm] = useState({ relatedPersonId: '', relationshipType: 'Kuzen', notes: '' });
  const [addingRel, setAddingRel] = useState(false);

  // photo
  const photoRef = useRef();
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // documents
  const fileRef = useRef();
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // tasks
  const [tasks, setTasks] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assignedDate: '' });
  const [addingTask, setAddingTask] = useState(false);

  // tags
  const [allTags, setAllTags] = useState([]);
  const [personTags, setPersonTags] = useState([]);
  const [tagAdding, setTagAdding] = useState(false);

  // account (admin only)
  const [account, setAccount] = useState(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [showCreateAccount, setShowCreateAccount] = useState(false);
  const [accountForm, setAccountForm] = useState({ username: '', email: '', password: '' });
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState(null);
  const [newPwd, setNewPwd] = useState('');
  const [resettingPwd, setResettingPwd] = useState(false);

  useEffect(() => {
    loadPerson();
    loadTasks();
    getPersons().then(r => setAllPersons(r.data.filter(p => p.id !== parseInt(id))));
    if (isAdmin) loadAccount();
    getTags().then(r => setAllTags(r.data));
  }, [id]);

  async function loadPersonTags() {
    // tags are included in person.tags from the API
  }

  async function handleAddTag(tagId) {
    setTagAdding(true);
    try { await addTagToPerson(id, tagId); await loadPerson(); } catch {}
    finally { setTagAdding(false); }
  }

  async function handleRemoveTag(tagId) {
    try { await removeTagFromPerson(id, tagId); await loadPerson(); } catch {}
  }

  async function loadPerson() {
    try {
      const r = await getPerson(id);
      setPerson(r.data);
      const d = r.data;
      setEditForm({
        firstName: d.firstName, lastName: d.lastName,
        email: d.email || '', phone: d.phone || '',
        address: d.address || '', notes: d.notes || '',
        currentPosition: d.currentPosition || '', organization: d.organization || '',
        birthDate: d.birthDate ? d.birthDate.split('T')[0] : '',
      });
    } catch { navigate('/persons'); }
    finally { setLoading(false); }
  }

  async function loadTasks() {
    try { const r = await getTasks({ personId: id }); setTasks(r.data); } catch {}
  }

  async function loadAccount() {
    setAccountLoading(true);
    try { const r = await getPersonAccount(id); setAccount(r.data); } catch { setAccount(null); }
    finally { setAccountLoading(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = { ...editForm, birthDate: editForm.birthDate || null };
      await updatePerson(id, payload);
      await loadPerson();
      setEditing(false);
    } catch {}
    finally { setSaving(false); }
  }

  async function handleAddRel() {
    if (!relForm.relatedPersonId) return;
    setAddingRel(true);
    try {
      await addRelationship(id, {
        relatedPersonId: parseInt(relForm.relatedPersonId),
        relationshipType: relForm.relationshipType,
        notes: relForm.notes || null,
      });
      await loadPerson();
      setRelForm({ relatedPersonId: '', relationshipType: 'Kuzen', notes: '' });
      setShowRelForm(false);
    } catch {}
    finally { setAddingRel(false); }
  }

  async function handleRemoveRel(relId) {
    if (!confirm('Bu ilişkiyi silmek istiyor musunuz?')) return;
    try { await removeRelationship(id, relId); await loadPerson(); } catch {}
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try { await uploadPersonPhoto(id, file); await loadPerson(); } catch (err) {
      alert(err.response?.data?.message || 'Fotoğraf yüklenemedi.');
    }
    finally { setUploadingPhoto(false); if (photoRef.current) photoRef.current.value = ''; }
  }

  async function handleDeletePhoto() {
    if (!confirm('Fotoğrafı kaldırmak istiyor musunuz?')) return;
    try { await deletePersonPhoto(id); await loadPerson(); } catch {}
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    try { await uploadPersonDocument(id, file); await loadPerson(); } catch {}
    finally { setUploadingDoc(false); fileRef.current.value = ''; }
  }

  async function handleDownload(doc) {
    try {
      const r = await downloadPersonDocument(id, doc.id);
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a');
      a.href = url; a.download = doc.fileName; a.click();
      URL.revokeObjectURL(url);
    } catch {}
  }

  async function handleDeleteDoc(docId) {
    if (!confirm('Bu evrakı silmek istiyor musunuz?')) return;
    try { await deletePersonDocument(id, docId); await loadPerson(); } catch {}
  }

  async function handleAddTask() {
    if (!taskForm.title) return;
    setAddingTask(true);
    try {
      await createTask({
        personId: parseInt(id),
        title: taskForm.title,
        description: taskForm.description || null,
        assignedDate: taskForm.assignedDate
          ? new Date(taskForm.assignedDate).toISOString()
          : new Date().toISOString(),
      });
      await loadTasks();
      setTaskForm({ title: '', description: '', assignedDate: '' });
      setShowTaskForm(false);
    } catch {}
    finally { setAddingTask(false); }
  }

  async function handleCompleteTask(taskId) {
    try { await completeTask(taskId); await loadTasks(); } catch {}
  }

  async function handleDeleteTask(taskId) {
    if (!confirm('Bu görevi silmek istiyor musunuz?')) return;
    try { await deleteTask(taskId); await loadTasks(); } catch {}
  }

  async function handleCreateAccount(e) {
    e.preventDefault();
    setCreatingAccount(true);
    try {
      await createAccountForPerson(id, accountForm);
      await loadAccount();
      setShowCreateAccount(false);
      setAccountForm({ username: '', email: '', password: '' });
    } catch (err) {
      alert(err.response?.data?.message || 'Hata oluştu.');
    } finally { setCreatingAccount(false); }
  }

  async function handleSetRole(newRole) {
    if (!account) return;
    try {
      await setUserRole(account.id, newRole);
      await loadAccount();
    } catch {}
  }

  async function handleToggleActive() {
    if (!account) return;
    try { await toggleUserActive(account.id); await loadAccount(); } catch {}
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    if (!newPwd || newPwd.length < 6) { alert('En az 6 karakter giriniz.'); return; }
    setResettingPwd(true);
    try {
      await adminResetPassword(account.id, newPwd);
      setNewPwd('');
      alert('Şifre başarıyla sıfırlandı.');
    } catch {} finally { setResettingPwd(false); }
  }

  async function handleGenerateOtp() {
    try {
      const r = await generateOtp(account.id);
      setGeneratedOtp(r.data);
    } catch {}
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Yükleniyor...</div>
  );
  if (!person) return null;

  const tabs = [
    { id: 'info', label: 'Bilgiler' },
    { id: 'relations', label: `İlişkiler (${person.relationships?.length ?? 0})` },
    { id: 'documents', label: `Evraklar (${person.documents?.length ?? 0})` },
    { id: 'tasks', label: `Görevler (${tasks.length})` },
    ...(isAdmin ? [{ id: 'account', label: 'Hesap' }] : []),
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-start gap-5">
          {/* Vesikalık Fotoğraf */}
          <div className="relative flex-shrink-0 group">
            {person.photoUrl ? (
              <img
                src={`${person.photoUrl}?t=${Date.now()}`}
                alt={`${person.firstName} ${person.lastName}`}
                className="w-24 h-24 rounded-xl object-cover border-2 border-gray-100 shadow-sm"
              />
            ) : (
              <div className="w-24 h-24 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 text-3xl font-bold select-none">
                {person.firstName?.[0]}{person.lastName?.[0]}
              </div>
            )}
            {/* Hover overlay — fotoğraf yükleme */}
            <label
              className="absolute inset-0 rounded-xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center"
              title="Fotoğraf yükle"
            >
              <span className="text-white text-xs font-medium text-center px-1">
                {uploadingPhoto ? '⏳' : '📷 Değiştir'}
              </span>
              <input
                ref={photoRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
                disabled={uploadingPhoto}
              />
            </label>
            {person.photoUrl && (
              <button
                onClick={handleDeletePhoto}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs leading-none opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Fotoğrafı kaldır"
              >×</button>
            )}
          </div>

          {/* Kişi bilgileri */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{person.firstName} {person.lastName}</h1>
                {(person.currentPosition || person.organization) && (
                  <p className="text-slate-500 text-sm mt-0.5">
                    {person.currentPosition}
                    {person.currentPosition && person.organization ? ' — ' : ''}
                    {person.organization}
                  </p>
                )}
                {person.email && <p className="text-sm text-gray-400 mt-1">✉ {person.email}</p>}
                {person.phone && <p className="text-sm text-gray-400">📞 {person.phone}</p>}
                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {(person.tags || []).map(pt => (
                    <span key={pt.tagId} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: pt.tag?.color || '#6366f1' }}>
                      {pt.tag?.name}
                      <button onClick={() => handleRemoveTag(pt.tagId)} className="hover:opacity-70 leading-none">×</button>
                    </span>
                  ))}
                  {allTags.filter(t => !(person.tags || []).some(pt => pt.tagId === t.id)).length > 0 && (
                    <select onChange={e => { if (e.target.value) handleAddTag(parseInt(e.target.value)); e.target.value = ''; }}
                      className="text-xs border border-dashed border-gray-300 rounded-full px-2 py-0.5 text-gray-400 bg-transparent cursor-pointer"
                      disabled={tagAdding}>
                      <option value="">+ Etiket</option>
                      {allTags.filter(t => !(person.tags || []).some(pt => pt.tagId === t.id)).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {editing ? (
                  <>
                    <button onClick={() => setEditing(false)}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">İptal</button>
                    <button onClick={handleSave} disabled={saving}
                      className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                      {saving ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => navigate('/persons')}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-500">← Geri</button>
                    <button onClick={() => setEditing(true)}
                      className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700">Düzenle</button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex flex-wrap">
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

      {/* ── BİLGİLER ── */}
      {tab === 'info' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {editing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Ad', key: 'firstName' },
                { label: 'Soyad', key: 'lastName' },
                { label: 'Email', key: 'email' },
                { label: 'Görev / Unvan', key: 'currentPosition' },
                { label: 'Kurum / Şirket', key: 'organization' },
              ].map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{f.label}</label>
                  <input value={editForm[f.key] || ''}
                    onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Telefon</label>
                <PhoneInput
                  value={editForm.phone || ''}
                  onChange={v => setEditForm(p => ({ ...p, phone: v }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Doğum Tarihi</label>
                <input type="date" value={editForm.birthDate || ''}
                  onChange={e => setEditForm(p => ({ ...p, birthDate: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Adres</label>
                <input value={editForm.address || ''}
                  onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-500 mb-1">Notlar</label>
                <textarea value={editForm.notes || ''}
                  onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Email', value: person.email },
                { label: 'Telefon', value: person.phone },
                { label: 'Görev / Unvan', value: person.currentPosition },
                { label: 'Kurum / Şirket', value: person.organization },
                { label: 'Doğum Tarihi', value: person.birthDate
                    ? `${new Date(person.birthDate).toLocaleDateString('tr-TR')}${person.age ? ` · ${person.age} yaşında` : ''}`
                    : null },
                { label: 'Adres', value: person.address },
                { label: 'Kayıt Tarihi', value: new Date(person.createdAt).toLocaleDateString('tr-TR') },
              ].filter(f => f.value).map(f => (
                <div key={f.label}>
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{f.label}</div>
                  <div className="text-sm text-gray-800">{f.value}</div>
                </div>
              ))}
              {person.notes && (
                <div className="md:col-span-2">
                  <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Notlar</div>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap">{person.notes}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── İLİŞKİLER ── */}
      {tab === 'relations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-gray-700">Kişisel İlişkiler</h2>
            <button onClick={() => setShowRelForm(!showRelForm)}
              className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700">
              + İlişki Ekle
            </button>
          </div>

          {showRelForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <p className="text-xs text-gray-500">
                İlişki yönü: <strong>{person.firstName}</strong> → seçilen kişi için geçerlidir.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Kişi</label>
                  <select value={relForm.relatedPersonId}
                    onChange={e => setRelForm(p => ({ ...p, relatedPersonId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                    <option value="">Seçiniz...</option>
                    {allPersons.map(p => (
                      <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {person.firstName}'in bu kişiyle ilişkisi
                  </label>
                  <select value={relForm.relationshipType}
                    onChange={e => setRelForm(p => ({ ...p, relationshipType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
                    {RELATIONSHIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Not (opsiyonel)</label>
                  <input value={relForm.notes}
                    onChange={e => setRelForm(p => ({ ...p, notes: e.target.value }))}
                    placeholder="Ek açıklama..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowRelForm(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">İptal</button>
                <button onClick={handleAddRel} disabled={addingRel || !relForm.relatedPersonId}
                  className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                  {addingRel ? 'Ekleniyor...' : 'Ekle'}
                </button>
              </div>
            </div>
          )}

          {!person.relationships?.length ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
              Henüz ilişki eklenmemiş.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {person.relationships.map(rel => (
                <div key={rel.id} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      rel.isReverse ? 'bg-orange-50 text-orange-700' : 'bg-blue-50 text-blue-700'
                    }`}>
                      {rel.relationshipType}
                    </span>
                    <Link to={`/persons/${rel.relatedPersonId}`}
                      className="text-sm font-medium text-gray-800 hover:text-slate-600 hover:underline">
                      {rel.relatedPersonName}
                    </Link>
                    {rel.notes && <span className="text-xs text-gray-400">— {rel.notes}</span>}
                    {rel.isReverse && (
                      <span className="text-xs text-orange-400 italic">(diğer kişi tarafından tanımlı)</span>
                    )}
                  </div>
                  {!rel.isReverse && (
                    <button onClick={() => handleRemoveRel(rel.id)}
                      className="text-red-400 hover:text-red-600 text-sm ml-4 shrink-0">Sil</button>
                  )}
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
            <h2 className="text-base font-semibold text-gray-700">Evraklar</h2>
            <div>
              <input type="file" ref={fileRef} onChange={handleUpload} className="hidden"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip" />
              <button onClick={() => fileRef.current?.click()} disabled={uploadingDoc}
                className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                {uploadingDoc ? 'Yükleniyor...' : '+ Evrak Yükle'}
              </button>
            </div>
          </div>

          {!person.documents?.length ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
              Henüz evrak yüklenmemiş.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {person.documents.map(doc => (
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
                    <button onClick={() => handleDownload(doc)}
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

      {/* ── GÖREVLER ── */}
      {tab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-gray-700">Görevler</h2>
            <button onClick={() => setShowTaskForm(!showTaskForm)}
              className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700">
              + Görev Ekle
            </button>
          </div>

          {showTaskForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Başlık</label>
                  <input value={taskForm.title}
                    onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="Görev başlığı..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Hedef Tarih</label>
                  <input type="date" value={taskForm.assignedDate}
                    onChange={e => setTaskForm(p => ({ ...p, assignedDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Açıklama</label>
                  <input value={taskForm.description}
                    onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Opsiyonel açıklama..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowTaskForm(false)}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">İptal</button>
                <button onClick={handleAddTask} disabled={addingTask || !taskForm.title}
                  className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                  {addingTask ? 'Ekleniyor...' : 'Ekle'}
                </button>
              </div>
            </div>
          )}

          {!tasks.length ? (
            <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
              Henüz görev eklenmemiş.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between px-5 py-4 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      task.status === 'Completed' ? 'bg-green-500' : 'bg-amber-400'
                    }`} />
                    <div className="min-w-0">
                      <div className={`text-sm font-medium ${
                        task.status === 'Completed' ? 'line-through text-gray-400' : 'text-gray-800'
                      }`}>{task.title}</div>
                      {task.description && <div className="text-xs text-gray-400 truncate">{task.description}</div>}
                      {task.assignedDate && (
                        <div className="text-xs text-gray-400">
                          Hedef: {new Date(task.assignedDate).toLocaleDateString('tr-TR')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {task.status !== 'Completed' && (
                      <button onClick={() => handleCompleteTask(task.id)}
                        className="px-3 py-1.5 text-xs border border-green-200 text-green-700 rounded-lg hover:bg-green-50">
                        Tamamla
                      </button>
                    )}
                    <button onClick={() => handleDeleteTask(task.id)}
                      className="px-3 py-1.5 text-xs border border-red-200 text-red-600 rounded-lg hover:bg-red-50">Sil</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── HESAP (Admin only) ── */}
      {tab === 'account' && isAdmin && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-gray-700">Kullanıcı Hesabı</h2>

          {accountLoading ? (
            <div className="text-gray-400 text-sm">Yükleniyor...</div>
          ) : account ? (
            <div className="space-y-4">
              {/* Account Info */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Kullanıcı Adı</div>
                    <div className="text-gray-800 font-medium">{account.username}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Email (Giriş)</div>
                    <div className="text-gray-800">{account.email}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Rol</div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      account.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {account.role === 'Admin' ? 'Yönetici' : 'Kullanıcı'}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Durum</div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                      account.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {account.isActive ? 'Aktif' : 'Pasif'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 mt-5 flex-wrap items-center">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Rol</label>
                    <select
                      value={account.role}
                      onChange={e => handleSetRole(e.target.value)}
                      className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                    >
                      <option value="User">Normal</option>
                      <option value="Manager">Yetkili</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <button onClick={handleToggleActive}
                    className={`px-4 py-2 text-sm rounded-lg ${
                      account.isActive
                        ? 'border border-red-200 text-red-600 hover:bg-red-50'
                        : 'border border-green-200 text-green-700 hover:bg-green-50'
                    }`}>
                    {account.isActive ? 'Hesabı Devre Dışı Bırak' : 'Hesabı Aktifleştir'}
                  </button>
                </div>
              </div>

              {/* Reset Password */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Şifre Sıfırlama</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Admin olarak şifre belirleyebilir veya kullanıcıya göndermek için tek kullanımlık OTP kodu üretebilirsiniz. Şifreler şifrelenmiş saklanır, eski şifre görüntülenemez.
                </p>
                <form onSubmit={handleResetPassword} className="flex gap-2 mb-3">
                  <input
                    type="password"
                    value={newPwd}
                    onChange={e => setNewPwd(e.target.value)}
                    placeholder="Yeni şifre (min. 6 karakter)"
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <button type="submit" disabled={resettingPwd}
                    className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                    {resettingPwd ? '...' : 'Sıfırla'}
                  </button>
                </form>
                <button onClick={handleGenerateOtp}
                  className="text-sm text-blue-600 hover:underline">
                  Tek kullanımlık OTP kodu üret (kullanıcıya ilet)
                </button>
                {generatedOtp && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-medium text-amber-800 mb-1">OTP Kodu (kullanıcıya iletin):</p>
                    <p className="text-2xl font-mono font-bold text-amber-900 tracking-widest">{generatedOtp.otp}</p>
                    <p className="text-xs text-amber-600 mt-1">Geçerlilik: {generatedOtp.expiresIn} — Kullanıcı bu kodu "Şifremi Unuttum" sayfasında kullanabilir.</p>
                    <button onClick={() => setGeneratedOtp(null)} className="text-xs text-gray-400 hover:text-gray-600 mt-1">Kapat</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-gray-500 text-sm mb-4">Bu kişiye bağlı bir kullanıcı hesabı yok.</p>
              {!showCreateAccount ? (
                <button onClick={() => setShowCreateAccount(true)}
                  className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700">
                  + Hesap Oluştur
                </button>
              ) : (
                <form onSubmit={handleCreateAccount} className="space-y-3 max-w-sm">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Kullanıcı Adı</label>
                    <input value={accountForm.username}
                      onChange={e => setAccountForm(p => ({ ...p, username: e.target.value }))}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Giriş Email'i</label>
                    <input type="email" value={accountForm.email}
                      onChange={e => setAccountForm(p => ({ ...p, email: e.target.value }))}
                      placeholder={person.email || ''}
                      required
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Şifre</label>
                    <input type="password" value={accountForm.password}
                      onChange={e => setAccountForm(p => ({ ...p, password: e.target.value }))}
                      required minLength={6}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowCreateAccount(false)}
                      className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">İptal</button>
                    <button type="submit" disabled={creatingAccount}
                      className="px-4 py-2 text-sm bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50">
                      {creatingAccount ? 'Oluşturuluyor...' : 'Oluştur'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
