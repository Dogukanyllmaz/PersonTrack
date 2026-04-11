import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { forgotPassword } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await forgotPassword(email);
      if (res.data.otp) {
        setOtp(res.data.otp);
      } else {
        setError('Bu e-posta adresi sistemde kayıtlı değil veya hesap aktif değil.');
      }
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  if (otp) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-slate-800">PersonTrack</h1>
            <p className="text-gray-500 mt-2 text-sm">Sıfırlama Kodunuz</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-center mb-6">
            <p className="text-sm text-amber-700 mb-3">
              Tek kullanımlık şifre sıfırlama kodunuz:
            </p>
            <div className="text-4xl font-mono font-bold text-amber-800 tracking-widest mb-3">
              {otp}
            </div>
            <p className="text-xs text-amber-600">
              Bu kod <strong>2 saat</strong> geçerlidir. Not alın ve aşağıdaki butona tıklayın.
            </p>
          </div>

          <button
            onClick={() => navigate('/reset-password')}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            Şifremi Sıfırla →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">PersonTrack</h1>
          <p className="text-gray-500 mt-2 text-sm">Şifre Sıfırlama</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        <p className="text-sm text-gray-600 mb-4">
          Sisteme kayıtlı e-posta adresinizi girin. Sıfırlama kodunuz ekranda gösterilecektir.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
              placeholder="ornek@sirket.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {loading ? 'Kontrol ediliyor...' : 'Sıfırlama Kodu Al'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-sm text-slate-600 hover:underline">
            Giriş sayfasına dön
          </Link>
        </div>
      </div>
    </div>
  );
}
