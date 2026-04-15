import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getPersons, createPerson, deletePerson,
  importPersons, downloadPersonTemplate, exportPersons, getErrorMessage
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import PhoneInput from '../components/PhoneInput';
import ConfirmDialog from '../components/ConfirmDialog';

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '',
  address: '', notes: '', currentPosition: '', organization: '', password: '', birthDate: ''
};

const PAGE_SIZE = 12;

export default function Persons() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [persons, setPersons] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [errors, setErrors] = useState({});

  // Bulk & pagination
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [page, setPage] = useState(1);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const load = async (s) => {
    setLoading(true);
    try {
      const res = await getPersons(s);
      setPersons(res.data);
      setPage(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(''); }, []);

  // Pagination
  const totalPages = Math.ceil(persons.length / PAGE_SIZE);
  const paginatedPersons = persons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const allOnPageSelected = paginatedPersons.length > 0 && paginatedPersons.every(p => selectedIds.has(p.id));

  const toggleSelect = (id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };
  const toggleSelectAll = () => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      paginatedPersons.forEach(p => allOnPageSelected ? n.delete(p.id) : n.add(p.id));
      return n;
    });
  };

  const handleSearch = (e) => { e.preventDefault(); load(search); };

  const openCreate = () => { setForm(emptyForm); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.firstName?.trim()) newErrors.firstName = 'Ad zorunludur';
    if (!form.lastName?.trim()) newErrors.lastName = 'Soyad zorunludur';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    setSaving(true);
    try {
      const payload = { ...form, birthDate: form.birthDate ? form.birthDate : null };
      await createPerson(payload);
      setShowForm(false);
      setErrors({});
      await load(search);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    setDeleting(true);
    try {
      await deletePerson(id);
      setConfirmDelete(null);
      await load(search);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    setBulkDeleting(true);
    try {
      await Promise.all([...selectedIds].map(id => deletePerson(id)));
      setSelectedIds(new Set());
      setConfirmBulkDelete(false);
      await load(search);
      toast.success(`${count} kişi silindi.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally { setBulkDeleting(false); }
  };

  const handleExport = async () => {
    try {
      const res = await exportPersons();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = `kisiler_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
    } catch (err) { toast.error(getErrorMessage(err)); }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await importPersons(file);
      toast.success(`${res.data.added} kişi eklendi.${res.data.errors.length ? ' Hatalar: ' + res.data.errors.join(', ') : ''}`);
      await load(search);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    e.target.value = '';
  };

  const handleTemplate = async () => {
    const res = await downloadPersonTemplate();
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url; a.download = 'kisi_sablonu.xlsx'; a.click();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center" style={{ color: 'var(--text-secondary)' }}>
        <div className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
        <p className="text-sm">Kişiler yükleniyor...</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Kişiler</h1>
          <p className="page-subtitle">{persons.length} kişi kayıtlı</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <label className="btn-secondary cursor-pointer">
                ↑ Import
                <input type="file" accept=".xlsx" onChange={handleImport} className="hidden" />
              </label>
              <button onClick={handleTemplate} className="btn-secondary">
                ↓ Şablon
              </button>
            </>
          )}
          <button onClick={handleExport} className="btn-secondary">
            ↓ Export
          </button>
          <button onClick={openCreate} className="btn-primary">
            + Yeni Kişi
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
            <button onClick={handleExport}
              className="text-sm px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium">
              ↓ Export
            </button>
            {isAdmin && (
              <button onClick={() => setConfirmBulkDelete(true)}
                className="text-sm px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium">
                Sil
              </button>
            )}
            <button onClick={() => setSelectedIds(new Set())} className="btn-secondary" style={{ padding: '6px 12px', fontSize: '13px' }}>
              İptal
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {persons.length === 0 && !loading && !search && (
        <div className="text-center py-20" style={{ color: 'var(--text-tertiary)' }}>
          <div className="text-5xl mb-4">👥</div>
          <p className="font-semibold text-base" style={{ color: 'var(--text-secondary)' }}>Henüz kişi eklenmedi</p>
          <p className="text-sm mt-1">Yeni kişi eklemek için butona tıklayın</p>
        </div>
      )}
      {persons.length === 0 && !loading && search && (
        <div className="text-center py-20" style={{ color: 'var(--text-tertiary)' }}>
          <div className="text-5xl mb-4">🔍</div>
          <p className="font-semibold text-base" style={{ color: 'var(--text-secondary)' }}>Arama sonucu bulunamadı</p>
          <p className="text-sm mt-1">"{search}" için sonuç yok</p>
        </div>
      )}

      {/* Card Grid */}
      {persons.length > 0 && (
        <>
          {/* Select all row */}
          <div className="flex items-center gap-2 mb-2 px-1">
            <input
              type="checkbox"
              checked={allOnPageSelected}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400 select-none">
              Bu sayfadakileri seç ({paginatedPersons.length})
            </span>
            {persons.length > PAGE_SIZE && (
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                · Toplam {persons.length} kişi, sayfa {page}/{totalPages}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedPersons.map((p, i) => (
              <div key={p.id}
                className={`card card-hover p-4 group animate-fade-up cursor-pointer transition-all ${
                  selectedIds.has(p.id) ? 'ring-2' : ''
                }`}
                style={{
                  animationDelay: `${i * 40}ms`,
                  ...(selectedIds.has(p.id) ? { ringColor: 'var(--accent)', borderColor: 'var(--accent)' } : {})
                }}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(p.id)}
                    onChange={() => toggleSelect(p.id)}
                    onClick={e => e.stopPropagation()}
                    className="mt-1 w-4 h-4 rounded flex-shrink-0 cursor-pointer"
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  <div className="flex-1 min-w-0" onClick={() => navigate(`/persons/${p.id}`)}>
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {p.photoUrl ? (
                          <img
                            src={p.photoUrl}
                            alt={p.fullName}
                            className="w-14 h-14 rounded-xl object-cover"
                            style={{ border: '2px solid var(--card-border)' }}
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-lg font-bold"
                            style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
                            {p.firstName?.[0]}{p.lastName?.[0]}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between">
                          <h3 className="font-semibold truncate transition-colors" style={{ color: 'var(--text-primary)' }}>
                            {p.fullName}
                          </h3>
                          {isAdmin && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setConfirmDelete(p); }}
                              className="ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none hover:text-red-500"
                              style={{ color: 'var(--text-tertiary)' }}
                            >×</button>
                          )}
                        </div>
                        {(p.currentPosition || p.organization) && (
                          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
                            {p.currentPosition}
                            {p.currentPosition && p.organization ? ' · ' : ''}
                            {p.organization}
                          </p>
                        )}
                        <div className="mt-1.5 space-y-0.5">
                          {p.email && <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>✉ {p.email}</p>}
                          {p.phone && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>📞 {p.phone}</p>}
                        </div>
                      </div>
                    </div>
                    {(p.relationships?.length > 0 || p.documents?.length > 0) && (
                      <div className="mt-3 flex items-center gap-3 text-xs pt-2" style={{ borderTop: '1px solid var(--card-border)', color: 'var(--text-tertiary)' }}>
                        {p.relationships?.length > 0 && <span>🔗 {p.relationships.length} ilişki</span>}
                        {p.documents?.length > 0 && <span>📎 {p.documents.length} evrak</span>}
                      </div>
                    )}
                  </div>
                </div>
              </div>
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

      {/* Create Modal */}
      {showForm && (
        <Modal title="Yeni Kişi" onClose={() => { setShowForm(false); setErrors({}); }}>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Ad <span className="text-red-500">*</span></label>
                <input value={form.firstName} onChange={e => { setForm({...form, firstName: e.target.value}); setErrors(prev => ({...prev, firstName: undefined})); }}
                  className="input-base" style={errors.firstName ? { borderColor: '#EF4444' } : {}} />
                {errors.firstName && <p className="text-xs text-red-500 mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Soyad <span className="text-red-500">*</span></label>
                <input value={form.lastName} onChange={e => { setForm({...form, lastName: e.target.value}); setErrors(prev => ({...prev, lastName: undefined})); }}
                  className="input-base" style={errors.lastName ? { borderColor: '#EF4444' } : {}} />
                {errors.lastName && <p className="text-xs text-red-500 mt-1">{errors.lastName}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Görev / Unvan</label>
                <input value={form.currentPosition} onChange={e => setForm({...form, currentPosition: e.target.value})}
                  placeholder="Müdür, Mühendis..." className="input-base" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Kurum</label>
                <input value={form.organization} onChange={e => setForm({...form, organization: e.target.value})}
                  placeholder="Şirket adı..." className="input-base" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Email <span className="text-red-500">*</span></label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                required className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Giriş Şifresi <span className="text-red-500">*</span></label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                required minLength={6} placeholder="En az 6 karakter" className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Telefon</label>
              <PhoneInput value={form.phone} onChange={v => setForm({...form, phone: v})} className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Doğum Tarihi</label>
              <input type="date" value={form.birthDate} onChange={e => setForm({...form, birthDate: e.target.value})}
                className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Adres</label>
              <input value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                className="input-base" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Notlar</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                className="input-base" />
            </div>
            <button type="submit" disabled={saving}
              className="btn-primary w-full justify-center disabled:opacity-50" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
