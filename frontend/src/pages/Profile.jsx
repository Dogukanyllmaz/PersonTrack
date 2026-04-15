import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { updateProfile, changePassword, getErrorMessage } from '../services/api';

export default function Profile() {
  const { user, setUser } = useAuth();
  const { toast } = useToast();

  const [username, setUsername] = useState(user?.username ?? '');
  const [savingProfile, setSavingProfile] = useState(false);

  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwErrors, setPwErrors] = useState({});
  const [savingPw, setSavingPw] = useState(false);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setSavingProfile(true);
    try {
      const res = await updateProfile({ username: username.trim() });
      if (setUser) setUser(prev => ({ ...prev, username: res.data.username }));
      toast.success('Profil güncellendi.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!pwForm.currentPassword) errs.currentPassword = 'Mevcut şifre zorunludur';
    if (!pwForm.newPassword || pwForm.newPassword.length < 6) errs.newPassword = 'Yeni şifre en az 6 karakter olmalıdır';
    if (pwForm.newPassword !== pwForm.confirmPassword) errs.confirmPassword = 'Şifreler eşleşmiyor';
    if (Object.keys(errs).length) { setPwErrors(errs); return; }

    setSavingPw(true);
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      toast.success('Şifre başarıyla güncellendi.');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPwErrors({});
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSavingPw(false);
    }
  };

  const inputCls = (err) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500 ${
      err ? 'border-red-400 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
    }`;

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Profilim</h2>

      {/* Profile info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Hesap Bilgileri</h3>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
            {(user?.username ?? '?')[0].toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-gray-100">{user?.username}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
            <span className={`mt-1 inline-block text-xs px-2 py-0.5 rounded-full font-medium ${
              user?.role === 'Admin' ? 'bg-red-100 text-red-700' :
              user?.role === 'Manager' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {user?.role === 'Admin' ? '🛡️ Admin' : user?.role === 'Manager' ? '👔 Yönetici' : '👤 Kullanıcı'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Kullanıcı Adı <span className="text-red-500">*</span>
            </label>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              className={inputCls(!username.trim())}
              placeholder="Kullanıcı adı"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
            <input
              value={user?.email ?? ''}
              disabled
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700/50 text-gray-400 dark:text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email adresi değiştirilemez.</p>
          </div>
          <button
            type="submit"
            disabled={savingProfile || !username.trim() || username === user?.username}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {savingProfile ? 'Kaydediliyor...' : 'Profili Güncelle'}
          </button>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">Şifre Değiştir</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Mevcut Şifre <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={pwForm.currentPassword}
              onChange={e => { setPwForm(f => ({ ...f, currentPassword: e.target.value })); setPwErrors(p => ({ ...p, currentPassword: undefined })); }}
              className={inputCls(pwErrors.currentPassword)}
              placeholder="••••••"
            />
            {pwErrors.currentPassword && <p className="text-xs text-red-500 mt-1">{pwErrors.currentPassword}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Yeni Şifre <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={pwForm.newPassword}
              onChange={e => { setPwForm(f => ({ ...f, newPassword: e.target.value })); setPwErrors(p => ({ ...p, newPassword: undefined })); }}
              className={inputCls(pwErrors.newPassword)}
              placeholder="En az 6 karakter"
            />
            {pwErrors.newPassword && <p className="text-xs text-red-500 mt-1">{pwErrors.newPassword}</p>}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Yeni Şifre Tekrar <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={pwForm.confirmPassword}
              onChange={e => { setPwForm(f => ({ ...f, confirmPassword: e.target.value })); setPwErrors(p => ({ ...p, confirmPassword: undefined })); }}
              className={inputCls(pwErrors.confirmPassword)}
              placeholder="••••••"
            />
            {pwErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{pwErrors.confirmPassword}</p>}
          </div>
          <button
            type="submit"
            disabled={savingPw}
            className="w-full bg-slate-800 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {savingPw ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
          </button>
        </form>
      </div>
    </div>
  );
}
