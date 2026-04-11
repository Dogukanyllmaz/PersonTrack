import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout, isAdmin, isManager, canManage } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = isAdmin ? 'Admin' : isManager ? 'Yetkili' : null;
  const roleBg = isAdmin ? 'bg-amber-500' : 'bg-blue-500';

  // Admin/Manager için tam menü; normal kullanıcı için kısıtlı menü
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠', show: true },
    { to: '/persons', label: 'Kişiler', icon: '👥', show: canManage },
    { to: '/meetings', label: 'Toplantılar', icon: '📅', show: true },
    { to: '/tasks', label: 'Görevler', icon: '✅', show: canManage },
    { to: '/timeline', label: 'Zaman Tüneli', icon: '⏱️', show: true },
  ].filter(item => item.show);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-800 text-white flex flex-col">
        <div className="p-6 border-b border-slate-700">
          <h1 className="text-xl font-bold text-white">PersonTrack</h1>
          <p className="text-slate-400 text-xs mt-1 truncate">{user?.username}</p>
          {roleLabel && (
            <span className={`inline-block mt-1 ${roleBg} text-white text-xs px-2 py-0.5 rounded`}>
              {roleLabel}
            </span>
          )}
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-slate-600 text-white font-medium'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mt-2 border-t border-slate-700 pt-4 ${
                  isActive
                    ? 'bg-slate-600 text-white font-medium'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`
              }
            >
              <span>⚙️</span> Admin Panel
            </NavLink>
          )}
        </nav>
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            <span>🚪</span> Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
