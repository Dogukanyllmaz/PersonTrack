import { useState, useEffect, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getPersons, createPerson, deletePerson,
  importPersons, downloadPersonTemplate, exportPersons, getErrorMessage
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import PhoneInput from '../components/PhoneInput';
import ConfirmDialog from '../components/ConfirmDialog';
import { PersonsSkeleton } from '../components/Skeleton';
import Avatar, { avatarGradient } from '../components/ui/Avatar';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '',
  address: '', notes: '', currentPosition: '', organization: '', password: '', birthDate: ''
};
const PAGE_SIZE = 12;

/* ── SVG icons ──────────────────────────────────────────────────────── */
function MailIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.81 19.79 19.79 0 013 2.18 2 2 0 015.18 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L9.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  );
}
function LinkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
    </svg>
  );
}
function FileIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/>
      <polyline points="13 2 13 9 20 9"/>
    </svg>
  );
}
function EmptyPeopleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}
function SearchEmptyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      <line x1="8" y1="11" x2="14" y2="11"/>
    </svg>
  );
}

/* ── Memoized PersonCard ─────────────────────────────────────────────── */
const PersonCard = memo(function PersonCard({ p, isSelected, onSelect, onNavigate, onDelete, isAdmin }) {
  return (
    <div className={`card person-card group ${isSelected ? 'is-selected' : ''}`}
      style={{ animationFillMode: 'both' }}>

      {/* Top: Avatar banner */}
      <div className="relative h-14 rounded-t-[18px] overflow-hidden"
        style={{ background: avatarGradient(p.fullName), opacity: 0.9 }}>
        {/* subtle mesh */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
      </div>

      {/* Body */}
      <div className="px-4 pb-4 pt-0 relative" onClick={() => onNavigate(p.id)} style={{ cursor: 'pointer' }}>
        {/* Avatar overlapping the banner */}
        <div className="flex items-end justify-between -mt-7 mb-3">
          <div className="relative" style={{ boxShadow: '0 0 0 4px var(--card-bg)', borderRadius: '14px' }}>
            <Avatar src={p.photoUrl} firstName={p.firstName} lastName={p.lastName} size="lg" />
          </div>
          <div className="flex items-center gap-1 mb-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(p.id)}
              onClick={e => e.stopPropagation()}
              className="w-4 h-4 rounded cursor-pointer"
              style={{ accentColor: 'var(--accent)' }}
            />
            {isAdmin && (
              <button
                onClick={e => { e.stopPropagation(); onDelete(p); }}
                className="opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-lg leading-none"
                style={{ color: 'var(--text-tertiary)' }}
              >×</button>
            )}
          </div>
        </div>

        <h3 className="font-bold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>{p.fullName}</h3>
        {(p.currentPosition || p.organization) && (
          <p className="text-xs mt-1 truncate font-medium" style={{ color: 'var(--text-secondary)' }}>
            {[p.currentPosition, p.organization].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="mt-3 space-y-1.5">
          {p.email && (
            <p className="text-xs flex items-center gap-2 truncate" style={{ color: 'var(--text-tertiary)' }}>
              <MailIcon />{p.email}
            </p>
          )}
          {p.phone && (
            <p className="text-xs flex items-center gap-2" style={{ color: 'var(--text-tertiary)' }}>
              <PhoneIcon />{p.phone}
            </p>
          )}
        </div>

        {(p.relationships?.length > 0 || p.documents?.length > 0) && (
          <div className="mt-3 pt-3 flex items-center gap-3 text-xs"
            style={{ borderTop: '1px solid var(--card-border)', color: 'var(--text-tertiary)' }}>
            {p.relationships?.length > 0 && (
              <span className="flex items-center gap-1.5 font-medium"><LinkIcon />{p.relationships.length} ilişki</span>
            )}
            {p.documents?.length > 0 && (
              <span className="flex items-center gap-1.5 font-medium"><FileIcon />{p.documents.length} evrak</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   Persons page
═══════════════════════════════════════════════════════════════════ */
export default function Persons() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [persons, setPersons]           = useState([]);
  const [search, setSearch]             = useState('');
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState(emptyForm);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errors, setErrors]             = useState({});
  const [selectedIds, setSelectedIds]   = useState(new Set());
  const [page, setPage]                 = useState(1);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  /* ── Data load ──────────────────────────────────────────────────── */
  const load = useCallback(async (s = '') => {
    setLoading(true);
    try {
      const res = await getPersons(s);
      setPersons(res.data);
      setPage(1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(''); }, [load]);

  /* ── Pagination ─────────────────────────────────────────────────── */
  const totalPages       = Math.ceil(persons.length / PAGE_SIZE);
  const paginatedPersons = persons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allOnPageSelected = paginatedPersons.length > 0 && paginatedPersons.every(p => selectedIds.has(p.id));

  /* ── Handlers (useCallback) ─────────────────────────────────────── */
  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      paginatedPersons.forEach(p => allOnPageSelected ? n.delete(p.id) : n.add(p.id));
      return n;
    });
  }, [paginatedPersons, allOnPageSelected]);

  const handleSearch = useCallback((e) => { e.preventDefault(); load(search); }, [load, search]);

  const openCreate = useCallback(() => { setForm(emptyForm); setShowForm(true); }, []);

  const handleNavigate = useCallback((id) => navigate(`/persons/${id}`), [navigate]);

  const handleDeleteOpen = useCallback((p) => setConfirmDelete(p), []);

  const handleSave = useCallback(async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.firstName?.trim()) newErrors.firstName = 'Ad zorunludur';
    if (!form.lastName?.trim())  newErrors.lastName  = 'Soyad zorunludur';
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;
    setSaving(true);
    try {
      await createPerson({ ...form, birthDate: form.birthDate || null });
      setShowForm(false);
      setErrors({});
      await load(search);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setSaving(false); }
  }, [form, load, search, toast]);

  const handleDelete = useCallback(async (id) => {
    setDeleting(true);
    try {
      await deletePerson(id);
      setConfirmDelete(null);
      await load(search);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setDeleting(false); }
  }, [load, search, toast]);

  const handleBulkDelete = useCallback(async () => {
    const count = selectedIds.size;
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => deletePerson(id)));
      setSelectedIds(new Set());
      setConfirmBulkDelete(false);
      await load(search);
      toast.success(`${count} kişi silindi.`);
    } catch (err) { toast.error(getErrorMessage(err)); }
    finally { setBulkDeleting(false); }
  }, [selectedIds, load, search, toast]);

  const handleExport = useCallback(async () => {
    try {
      const res = await exportPersons();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `kisiler_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
    } catch (err) { toast.error(getErrorMessage(err)); }
  }, [toast]);

  const handleImport = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await importPersons(file);
      toast.success(`${res.data.added} kişi eklendi.${res.data.errors.length ? ' Hatalar: ' + res.data.errors.join(', ') : ''}`);
      await load(search);
    } catch (err) { toast.error(getErrorMessage(err)); }
    e.target.value = '';
  }, [load, search, toast]);

  const handleTemplate = useCallback(async () => {
    const res = await downloadPersonTemplate();
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url; a.download = 'kisi_sablonu.xlsx'; a.click();
  }, []);

  /* ── Skeleton while loading ─────────────────────────────────────── */
  if (loading) return <PersonsSkeleton />;

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Kişiler</h1>
          <p className="page-subtitle">{persons.length} kişi kayıtlı</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdmin && (
            <>
              <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-[13.5px] px-5 py-2.5 rounded-xl border border-[--card-border] bg-[--card-bg] text-[--text-primary] shadow-[var(--shadow-xs)] hover:-translate-y-px hover:border-[#B0BACA] transition-all duration-[0.14s]">
                ↑ Import
                <input type="file" accept=".xlsx" onChange={handleImport} className="hidden" />
              </label>
              <Button variant="secondary" size="md" onClick={handleTemplate}>↓ Şablon</Button>
            </>
          )}
          <Button variant="secondary" size="md" onClick={handleExport}>↓ Export</Button>
          <Button variant="primary" size="md" onClick={openCreate}>+ Yeni Kişi</Button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="İsim, email, görev veya kurum ara..."
          className="input-base flex-1"
        />
        <button type="submit" className="btn-primary">Ara</button>
      </form>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl border animate-fade-in"
          style={{ background: 'rgba(59,130,246,0.08)', borderColor: 'rgba(59,130,246,0.2)' }}>
          <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{selectedIds.size} kişi seçildi</span>
          <div className="flex gap-2 ml-auto">
            <Button size="xs" variant="secondary" onClick={handleExport}>↓ Export</Button>
            {isAdmin && (
              <Button size="xs" variant="danger" onClick={() => setConfirmBulkDelete(true)}>Sil</Button>
            )}
            <Button size="xs" variant="ghost" onClick={() => setSelectedIds(new Set())}>İptal</Button>
          </div>
        </div>
      )}

      {/* Empty states */}
      {persons.length === 0 && !search && (
        <div className="empty-state">
          <div className="empty-icon"><EmptyPeopleIcon /></div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>Henüz kişi eklenmedi</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Yeni kişi eklemek için butona tıklayın</p>
        </div>
      )}
      {persons.length === 0 && search && (
        <div className="empty-state">
          <div className="empty-icon"><SearchEmptyIcon /></div>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-secondary)' }}>Arama sonucu bulunamadı</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>"{search}" için sonuç yok</p>
        </div>
      )}

      {/* Card grid */}
      {persons.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-2 px-1">
            <input
              type="checkbox"
              checked={allOnPageSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
            />
            <span className="text-xs select-none" style={{ color: 'var(--text-tertiary)' }}>
              Bu sayfadakileri seç ({paginatedPersons.length})
              {persons.length > PAGE_SIZE && ` · Toplam ${persons.length} kişi, sayfa ${page}/${totalPages}`}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            {paginatedPersons.map(p => (
              <PersonCard
                key={p.id}
                p={p}
                isSelected={selectedIds.has(p.id)}
                onSelect={toggleSelect}
                onNavigate={handleNavigate}
                onDelete={handleDeleteOpen}
                isAdmin={isAdmin}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
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
        </>
      )}

      {/* Single delete confirm */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Kişiyi Sil"
        message={`"${confirmDelete?.firstName} ${confirmDelete?.lastName}" kişisi kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
        confirmLabel="Sil"
        variant="danger"
        loading={deleting}
        onConfirm={() => handleDelete(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        open={confirmBulkDelete}
        title="Toplu Silme"
        message={`Seçilen ${selectedIds.size} kişi kalıcı olarak silinecek. Bu işlem geri alınamaz.`}
        confirmLabel="Hepsini Sil"
        variant="danger"
        loading={bulkDeleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmBulkDelete(false)}
      />

      {/* Create modal */}
      {showForm && (
        <Modal title="Yeni Kişi" onClose={() => { setShowForm(false); setErrors({}); }}>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Ad <span className="text-red-500">*</span></label>
                <input value={form.firstName}
                  onChange={e => { setForm(f => ({ ...f, firstName: e.target.value })); setErrors(p => ({ ...p, firstName: undefined })); }}
                  className="input-base" style={errors.firstName ? { borderColor: '#EF4444' } : {}} />
                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Soyad <span className="text-red-500">*</span></label>
                <input value={form.lastName}
                  onChange={e => { setForm(f => ({ ...f, lastName: e.target.value })); setErrors(p => ({ ...p, lastName: undefined })); }}
                  className="input-base" style={errors.lastName ? { borderColor: '#EF4444' } : {}} />
                {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Görev / Unvan</label>
                <input value={form.currentPosition} onChange={e => setForm(f => ({ ...f, currentPosition: e.target.value }))}
                  placeholder="Müdür, Mühendis..." className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Kurum</label>
                <input value={form.organization} onChange={e => setForm(f => ({ ...f, organization: e.target.value }))}
                  placeholder="Şirket adı..." className="input-base" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email <span className="text-red-500">*</span></label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Giriş Şifresi <span className="text-red-500">*</span></label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required minLength={6} placeholder="En az 6 karakter" className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Telefon</label>
              <PhoneInput value={form.phone} onChange={v => setForm(f => ({ ...f, phone: v }))} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Doğum Tarihi</label>
              <input type="date" value={form.birthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))}
                className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Adres</label>
              <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Notlar</label>
              <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="input-base" />
            </div>
            <Button type="submit" loading={saving} className="w-full justify-center" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
              Kaydet
            </Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
