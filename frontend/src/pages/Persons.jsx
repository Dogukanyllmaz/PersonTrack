import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getPersons, createPerson, deletePerson,
  importPersons, downloadPersonTemplate
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import PhoneInput from '../components/PhoneInput';

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '',
  address: '', notes: '', currentPosition: '', organization: '', password: '', birthDate: ''
};

export default function Persons() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [persons, setPersons] = useState([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  const load = async (s) => {
    const res = await getPersons(s);
    setPersons(res.data);
  };

  useEffect(() => { load(''); }, []);

  const handleSearch = (e) => { e.preventDefault(); load(search); };

  const openCreate = () => { setForm(emptyForm); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form, birthDate: form.birthDate ? form.birthDate : null };
      await createPerson(payload);
      setShowForm(false);
      await load(search);
    } catch (err) {
      alert(err.response?.data?.message || 'Hata oluştu.');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu kişiyi silmek istediğinizden emin misiniz?')) return;
    await deletePerson(id);
    await load(search);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const res = await importPersons(file);
      alert(`${res.data.added} kişi eklendi.${res.data.errors.length ? '\nHatalar:\n' + res.data.errors.join('\n') : ''}`);
      await load(search);
    } catch (err) {
      alert('Import hatası: ' + (err.response?.data?.message || err.message));
    }
    e.target.value = '';
  };

  const handleTemplate = async () => {
    const res = await downloadPersonTemplate();
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a'); a.href = url; a.download = 'kisi_sablonu.xlsx'; a.click();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Kişiler</h2>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <label className="cursor-pointer bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors">
                📤 Excel Import
                <input type="file" accept=".xlsx" onChange={handleImport} className="hidden" />
              </label>
              <button onClick={handleTemplate} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-3 py-2 rounded-lg transition-colors">
                📥 Şablon
              </button>
            </>
          )}
          <button onClick={openCreate} className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            + Yeni Kişi
          </button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="İsim, email, görev veya kurum ara..."
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
        />
        <button type="submit" className="bg-slate-700 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-600">Ara</button>
      </form>

      {/* Card Grid */}
      {persons.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-gray-400">Kişi bulunamadı.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {persons.map((p) => (
            <div key={p.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => navigate(`/persons/${p.id}`)}>
              <div className="flex items-start gap-3">
                {/* Vesikalık fotoğraf */}
                <div className="flex-shrink-0">
                  {p.photoUrl ? (
                    <img
                      src={p.photoUrl}
                      alt={p.fullName}
                      className="w-14 h-14 rounded-full object-cover border-2 border-gray-100"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-100 border-2 border-gray-100 flex items-center justify-center text-slate-400 text-xl font-semibold">
                      {p.firstName?.[0]}{p.lastName?.[0]}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                      {p.fullName}
                    </h3>
                    {isAdmin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                        className="text-gray-300 hover:text-red-500 ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-lg leading-none"
                      >×</button>
                    )}
                  </div>
                  {(p.currentPosition || p.organization) && (
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {p.currentPosition}
                      {p.currentPosition && p.organization ? ' · ' : ''}
                      {p.organization}
                    </p>
                  )}
                  <div className="mt-1.5 space-y-0.5">
                    {p.email && <p className="text-xs text-gray-400 truncate">✉ {p.email}</p>}
                    {p.phone && <p className="text-xs text-gray-400">📞 {p.phone}</p>}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-xs text-gray-400 border-t pt-2">
                {p.relationships?.length > 0 && <span>🔗 {p.relationships.length} ilişki</span>}
                {p.documents?.length > 0 && <span>📎 {p.documents.length} evrak</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showForm && (
        <Modal title="Yeni Kişi" onClose={() => setShowForm(false)}>
          <form onSubmit={handleSave} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ad *</label>
                <input value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Soyad *</label>
                <input value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} required
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Görev / Unvan</label>
                <input value={form.currentPosition} onChange={e => setForm({...form, currentPosition: e.target.value})}
                  placeholder="Müdür, Mühendis..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kurum</label>
                <input value={form.organization} onChange={e => setForm({...form, organization: e.target.value})}
                  placeholder="Şirket adı..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Giriş Şifresi *</label>
              <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})}
                required minLength={6}
                placeholder="En az 6 karakter"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefon</label>
              <PhoneInput value={form.phone} onChange={v => setForm({...form, phone: v})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Doğum Tarihi</label>
              <input type="date" value={form.birthDate} onChange={e => setForm({...form, birthDate: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Adres</label>
              <input value={form.address} onChange={e => setForm({...form, address: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notlar</label>
              <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
