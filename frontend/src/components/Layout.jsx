import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getUnreadCount, getNotifications, markAllNotificationsRead, markNotificationRead, globalSearch } from '../services/api';

export default function Layout({ children }) {
  const { user, logout, isAdmin, isManager, canManage } = useAuth();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const notifRef = useRef(null);
  const searchRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleLabel = isAdmin ? 'Admin' : isManager ? 'Yetkili' : null;
  const roleBg = isAdmin ? 'bg-amber-500' : 'bg-blue-500';

  // Poll unread count every 60 seconds
  useEffect(() => {
    const load = async () => {
      try {
        const res = await getUnreadCount();
        setUnreadCount(res.data.count);
      } catch {}
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close panels on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifPanel(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Global search with debounce
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await globalSearch(searchQuery);
        setSearchResults(res.data);
      } catch { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const openNotifications = async () => {
    if (!showNotifPanel) {
      try {
        const res = await getNotifications();
        setNotifications(res.data);
      } catch {}
    }
    setShowNotifPanel(v => !v);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleNotifClick = async (n) => {
    if (!n.isRead) {
      try {
        await markNotificationRead(n.id);
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {}
    }
    if (n.link) { navigate(n.link); setShowNotifPanel(false); }
  };

  const handleSearchSelect = (result) => {
    navigate(result.link);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const typeIcon = { task_assigned: '📋', task_overdue: '⚠️', meeting_reminder: '📅', birthday: '🎂', reminder: '🔔', system: 'ℹ️' };

  // Admin/Manager için tam menü; normal kullanıcı için kısıtlı menü
  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠', show: true },
    { to: '/persons', label: 'Kişiler', icon: '👥', show: canManage },
    { to: '/meetings', label: 'Toplantılar', icon: '📅', show: true },
    { to: '/tasks', label: 'Görevler', icon: '✅', show: canManage },
    { to: '/timeline', label: 'Zaman Tüneli', icon: '⏱️', show: true },
    { to: '/reminders', label: 'Hatırlatıcılar', icon: '🔔', show: true },
    { to: '/notifications', label: 'Bildirimler', icon: '🔔', show: false }, // only via bell
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
            <>
              <NavLink
                to="/activity-log"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    isActive ? 'bg-slate-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`
                }
              >
                <span>📜</span> Aktivite Günlüğü
              </NavLink>
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors mt-2 border-t border-slate-700 pt-4 ${
                    isActive ? 'bg-slate-600 text-white font-medium' : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`
                }
              >
                <span>⚙️</span> Admin Panel
              </NavLink>
            </>
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
          {/* Global search */}
          <div className="relative flex-1 max-w-lg" ref={searchRef}>
            <input
              type="text"
              placeholder="Kişi, toplantı veya görev ara..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400 text-sm">🔍</span>
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-72 overflow-y-auto">
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleSearchSelect(r)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                  >
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{r.type === 'person' ? '👤' : r.type === 'meeting' ? '📅' : '✅'}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{r.title}</p>
                      {r.subtitle && <p className="text-xs text-gray-500">{r.subtitle}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showSearch && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 px-4 py-3 text-sm text-gray-500">
                Sonuç bulunamadı
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={openNotifications}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {showNotifPanel && (
                <div className="absolute right-0 top-full mt-2 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900">Bildirimler</h3>
                    <div className="flex gap-2">
                      <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:underline">Tümünü oku</button>
                      <button onClick={() => { navigate('/notifications'); setShowNotifPanel(false); }} className="text-xs text-gray-500 hover:underline">Tümünü gör</button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-6">Bildirim yok</p>
                    ) : (
                      notifications.map(n => (
                        <button
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className={`w-full flex gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-50 last:border-0 ${!n.isRead ? 'bg-blue-50' : ''}`}
                        >
                          <span className="mt-0.5">{typeIcon[n.type] || 'ℹ️'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{n.title}</p>
                            <p className="text-xs text-gray-600 line-clamp-2">{n.message}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{new Date(n.createdAt).toLocaleString('tr-TR')}</p>
                          </div>
                          {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
