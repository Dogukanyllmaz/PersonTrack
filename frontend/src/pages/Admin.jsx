import { useState, useEffect } from 'react';
import { getUsers, createUser, setUserRole, toggleUserActive, deleteUser, resetPassword } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '../context/LanguageContext';
import Modal from '../components/Modal';

export default function Admin() {
  const { user: currentUser } = useAuth();
  const { enabledLangs, saveEnabledLangs, t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(null); // user id
  const [createForm, setCreateForm] = useState({ username: '', email: '', password: '' });
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const toggleLang = (code) => {
    if (enabledLangs.includes(code)) {
      saveEnabledLangs(enabledLangs.filter(l => l !== code));
    } else {
      saveEnabledLangs([...enabledLangs, code]);
    }
  };

  const load = async () => {
    const res = await getUsers();
    setUsers(res.data);
  };

  useEffect(() => { load(); }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createUser(createForm);
      setShowCreateModal(false);
      setCreateForm({ username: '', email: '', password: '' });
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Hata oluştu.');
    } finally { setLoading(false); }
  };

  const handleSetRole = async (userId, newRole) => {
    if (!confirm(`Bu kullanıcının rolünü "${newRole}" yapmak istediğinizden emin misiniz?`)) return;
    await setUserRole(userId, newRole);
    await load();
  };

  const handleToggleActive = async (userId) => {
    await toggleUserActive(userId);
    await load();
  };

  const handleDelete = async (userId) => {
    if (!confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) return;
    try {
      await deleteUser(userId);
      await load();
    } catch (err) {
      alert(err.response?.data?.message || 'Hata oluştu.');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    await resetPassword(showResetModal, newPassword);
    setShowResetModal(null);
    setNewPassword('');
    alert('Şifre sıfırlandı.');
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Admin Panel — Kullanıcı Yönetimi</h2>
        <button onClick={() => setShowCreateModal(true)}
          className="bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
          + Yeni Kullanıcı
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kullanıcı</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Rol</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Durum</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kayıt Tarihi</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id} className={`hover:bg-gray-50 ${!u.isActive ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium text-gray-800">
                  {u.username}
                  {u.id === currentUser?.id && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">Siz</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                    u.role === 'Admin' ? 'bg-amber-100 text-amber-700' :
                    u.role === 'Manager' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {u.role === 'Admin' ? 'Admin' : u.role === 'Manager' ? 'Yetkili' : 'Normal'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    u.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>
                    {u.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(u.createdAt).toLocaleDateString('tr-TR')}
                </td>
                <td className="px-4 py-3">
                  {u.id !== currentUser?.id && (
                    <div className="flex gap-2 justify-end items-center">
                      <select
                        value={u.role}
                        onChange={e => handleSetRole(u.id, e.target.value)}
                        className="text-xs border rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-slate-400 bg-white"
                      >
                        <option value="User">Normal</option>
                        <option value="Manager">Yetkili</option>
                        <option value="Admin">Admin</option>
                      </select>
                      <button onClick={() => handleToggleActive(u.id)}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        {u.isActive ? 'Devre Dışı' : 'Aktifleştir'}
                      </button>
                      <button onClick={() => { setShowResetModal(u.id); setNewPassword(''); }}
                        className="text-xs text-gray-600 hover:text-gray-800 font-medium">
                        Şifre Sıfırla
                      </button>
                      <button onClick={() => handleDelete(u.id)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium">
                        Sil
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Language Settings */}
      <div className="mt-8 mb-6">
        <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
          {t('langSettings')}
        </h2>
        <div className="rounded-xl overflow-hidden" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-card)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--card-border)' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              {t('langDesc')}
            </p>
          </div>
          <div className="divide-y" style={{ '--tw-divide-color': 'var(--card-border)' }}>
            {SUPPORTED_LANGUAGES.map(l => {
              const isEnabled = enabledLangs.includes(l.code);
              const isLast = enabledLangs.length === 1 && isEnabled;
              return (
                <div key={l.code} className="flex items-center justify-between px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{l.flag}</span>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{l.label}</p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{l.code.toUpperCase()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => !isLast && toggleLang(l.code)}
                    title={isLast ? 'En az bir dil aktif olmalı' : ''}
                    style={{
                      width: 44, height: 24, borderRadius: 12, border: 'none', cursor: isLast ? 'not-allowed' : 'pointer',
                      background: isEnabled ? 'var(--accent)' : 'rgba(0,0,0,0.12)',
                      transition: 'background 0.2s', position: 'relative', opacity: isLast ? 0.5 : 1,
                    }}
                  >
                    <span style={{
                      display: 'block', width: 18, height: 18, borderRadius: '50%', background: '#fff',
                      position: 'absolute', top: 3, left: isEnabled ? 23 : 3, transition: 'left 0.2s',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                    }} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <Modal title="Yeni Kullanıcı Oluştur" onClose={() => setShowCreateModal(false)}>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Kullanıcı Adı *</label>
              <input value={createForm.username} onChange={e => setCreateForm({...createForm, username: e.target.value})} required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
              <input type="email" value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})} required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Şifre *</label>
              <input type="password" value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})} required
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
              {loading ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
          </form>
        </Modal>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <Modal title="Şifre Sıfırla" onClose={() => setShowResetModal(null)}>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Yeni Şifre *</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={6}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
            </div>
            <button type="submit" className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2.5 rounded-lg text-sm font-medium">
              Sıfırla
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
