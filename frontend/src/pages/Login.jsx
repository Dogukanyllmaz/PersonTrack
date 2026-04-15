import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login({ email, password });
      const { token, refreshToken, ...userData } = res.data;
      loginUser(userData, token, refreshToken);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Giriş başarısız.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#060C18' }}>

      {/* ── Left panel — branding ─────────────────────────────── */}
      <div
        className="hidden lg:flex w-[480px] flex-col justify-between p-12 relative overflow-hidden flex-shrink-0"
        style={{
          background: 'linear-gradient(160deg, #0D1828 0%, #090E1C 100%)',
          borderRight: '1px solid rgba(255,255,255,0.055)',
        }}
      >
        {/* Background glow orbs */}
        <div className="absolute top-[-80px] left-[-80px] w-[380px] h-[380px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(82,96,247,0.18) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-[300px] h-[300px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(138,92,246,0.12) 0%, transparent 70%)' }} />
        {/* Dot grid */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-[13px] flex items-center justify-center relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #5260F7 0%, #8A5CF6 100%)', boxShadow: '0 6px 24px rgba(82,96,247,0.55)' }}>
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.22) 0%,transparent 55%)' }} />
            <span className="relative z-10 text-white text-[16px]"
              style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800 }}>PT</span>
          </div>
          <div>
            <p className="text-white text-[15px] tracking-tight" style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700 }}>PersonTrack</p>
            <p className="text-[10.5px] font-semibold" style={{ color: 'rgba(98,114,255,0.80)' }}>CRM Platform</p>
          </div>
        </div>

        {/* Hero text */}
        <div className="relative z-10">
          <h2 className="text-white text-[38px] leading-tight mb-4"
            style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, letterSpacing: '-1px' }}>
            İlişkileri<br />
            <span style={{
              background: 'linear-gradient(135deg, #6272FF 0%, #A78BFA 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>güçlü tutun.</span>
          </h2>
          <p className="text-[14px] leading-relaxed" style={{ color: 'rgba(150,175,200,0.82)' }}>
            Kişiler, toplantılar, görevler ve iletişimi<br />tek bir premium platformda yönetin.
          </p>
          <div className="flex flex-wrap gap-2 mt-6">
            {['Kişi Yönetimi', 'Toplantı Takibi', 'Görev Akışı', 'Anlık Mesajlaşma'].map(f => (
              <span key={f} className="text-[11px] font-semibold px-3 py-1.5 rounded-full"
                style={{ background: 'rgba(82,96,247,0.12)', color: 'rgba(148,168,255,0.88)', border: '1px solid rgba(82,96,247,0.22)' }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-[11px] font-medium" style={{ color: 'rgba(80,110,140,0.65)' }}>
          © 2025 PersonTrack — Professional CRM
        </p>
      </div>

      {/* ── Right panel — form ───────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ background: '#060C18' }}>
        <div className="w-full max-w-[400px] animate-fade-up">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10 justify-center">
            <div className="w-10 h-10 rounded-[11px] flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#5260F7,#8A5CF6)', boxShadow: '0 4px 18px rgba(82,96,247,0.5)' }}>
              <span className="text-white text-[14px]" style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800 }}>PT</span>
            </div>
            <span className="text-white text-[15px]" style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700 }}>PersonTrack</span>
          </div>

          {/* Card */}
          <div className="rounded-[22px] p-8"
            style={{
              background: 'rgba(11,22,38,0.80)',
              border: '1px solid rgba(255,255,255,0.075)',
              backdropFilter: 'blur(20px)',
              boxShadow: '0 28px 72px rgba(0,0,0,0.55)',
            }}>

            <div className="mb-7">
              <h1 className="text-white text-[24px] mb-1.5"
                style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, letterSpacing: '-0.5px' }}>
                Hoş geldiniz
              </h1>
              <p className="text-[13px]" style={{ color: 'rgba(95,125,160,0.85)' }}>Hesabınıza giriş yapın</p>
            </div>

            {error && (
              <div className="mb-5 px-4 py-3 rounded-[12px] flex items-center gap-2.5 text-[12.5px] font-medium animate-slide-down"
                style={{ background: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.22)', color: '#F87171' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-[11.5px] font-semibold mb-1.5" style={{ color: 'rgba(148,175,210,0.85)' }}>
                  E-posta adresi
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="ornek@domain.com"
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1.5px solid rgba(255,255,255,0.09)',
                    borderRadius: '12px', fontSize: '13.5px',
                    fontFamily: 'inherit', color: '#E4EDF8', outline: 'none', transition: 'all 0.18s',
                  }}
                  onFocus={e => { e.target.style.background = 'rgba(82,96,247,0.09)'; e.target.style.borderColor = '#5260F7'; e.target.style.boxShadow = '0 0 0 3.5px rgba(82,96,247,0.20)'; }}
                  onBlur={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11.5px] font-semibold mb-1.5" style={{ color: 'rgba(148,175,210,0.85)' }}>
                  Şifre
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    style={{
                      width: '100%', padding: '10px 40px 10px 14px',
                      background: 'rgba(255,255,255,0.05)',
                      border: '1.5px solid rgba(255,255,255,0.09)',
                      borderRadius: '12px', fontSize: '13.5px',
                      fontFamily: 'inherit', color: '#E4EDF8', outline: 'none', transition: 'all 0.18s',
                    }}
                    onFocus={e => { e.target.style.background = 'rgba(82,96,247,0.09)'; e.target.style.borderColor = '#5260F7'; e.target.style.boxShadow = '0 0 0 3.5px rgba(82,96,247,0.20)'; }}
                    onBlur={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.borderColor = 'rgba(255,255,255,0.09)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button type="button" onClick={() => setShowPass(v => !v)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(100,130,160,0.65)', padding: 0 }}>
                    {showPass ? (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"/>
                      </svg>
                    ) : (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="text-right -mt-1">
                <Link to="/forgot-password"
                  style={{ fontSize: '11.5px', fontWeight: 500, color: 'rgba(98,114,255,0.85)', textDecoration: 'none' }}>
                  Şifremi unuttum
                </Link>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 font-semibold text-[14px] py-[11px] rounded-[13px] text-white relative overflow-hidden"
                style={{
                  background: loading ? 'rgba(82,96,247,0.5)' : 'linear-gradient(135deg, #5260F7 0%, #8A5CF6 100%)',
                  boxShadow: loading ? 'none' : '0 6px 24px rgba(82,96,247,0.42), inset 0 1px 0 rgba(255,255,255,0.18)',
                  cursor: loading ? 'not-allowed' : 'pointer', border: 'none',
                  transition: 'all 0.20s cubic-bezier(0.34,1.56,0.64,1)',
                }}
                onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 10px 32px rgba(82,96,247,0.55), inset 0 1px 0 rgba(255,255,255,0.18)'; }}}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = loading ? 'none' : '0 6px 24px rgba(82,96,247,0.42), inset 0 1px 0 rgba(255,255,255,0.18)'; }}
                onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.97)'; }}
                onMouseUp={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-2px)'; }}
              >
                {/* Shine overlay */}
                <div className="absolute inset-0 pointer-events-none"
                  style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.14) 0%,transparent 55%)', borderRadius: 'inherit' }} />
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4 relative z-10" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    <span className="relative z-10">Giriş yapılıyor...</span>
                  </>
                ) : <span className="relative z-10">Giriş Yap</span>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
