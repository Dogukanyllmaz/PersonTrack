import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  getUnreadCount, getNotifications, markAllNotificationsRead,
  markNotificationRead, globalSearch, getMessageUnreadCount
} from '../services/api';
import { useChatHub } from '../hooks/useChatHub';

/* ── SVG Icons — MUST be defined before NAV_SECTIONS uses them ────────── */
const ic = (d, extra = '') => ({ active }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={active ? '#3B82F6' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
    {extra && <path d={extra} />}
  </svg>
);

const HomeIcon     = ic('M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z', 'M9 22V12h6v10');
const PeopleIcon   = ic('M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75');
const CalIcon      = ic('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z');
const CalGridIcon  = ic('M3 4h18v18H3V4z', 'M8 2v4M16 2v4M3 10h18');
const CheckIcon    = ic('M9 11l3 3L22 4', 'M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11');
const TagIcon      = ic('M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z', 'M7 7h.01');
const TimelineIcon = ic('M12 20V10', 'M18 20V4M6 20v-4');
const BellIcon     = ic('M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0');
const ChatIcon     = ic('M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z');
const MonitorIcon  = ic('M2 3h20v14H2zM8 21h8M12 17v4');
const LogIcon      = ic('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z', 'M14 2v6h6M16 13H8M16 17H8M10 9H8');
const GearIcon     = ic('M12 15a3 3 0 100-6 3 3 0 000 6z', 'M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z');

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { to: '/dashboard',  label: 'Dashboard',      icon: HomeIcon,     show: () => true },
      { to: '/persons',    label: 'Kişiler',         icon: PeopleIcon,   show: (a,m,c) => c },
      { to: '/meetings',   label: 'Toplantılar',     icon: CalIcon,      show: () => true },
      { to: '/calendar',   label: 'Takvim',          icon: CalGridIcon,  show: () => true },
      { to: '/tasks',      label: 'Görevler',        icon: CheckIcon,    show: (a,m,c) => c },
      { to: '/tags',       label: 'Etiketler',       icon: TagIcon,      show: (a,m,c) => c },
      { to: '/timeline',   label: 'Zaman Tüneli',    icon: TimelineIcon, show: () => true },
      { to: '/reminders',  label: 'Hatırlatıcılar',  icon: BellIcon,     show: () => true },
      { to: '/messages',   label: 'Mesajlar',        icon: ChatIcon,     show: () => true, badge: true },
    ]
  },
  {
    label: 'Yönetim',
    adminOnly: true,
    items: [
      { to: '/monitor',      label: 'Sistem İzleme',    icon: MonitorIcon },
      { to: '/activity-log', label: 'Aktivite',         icon: LogIcon },
      { to: '/admin',        label: 'Admin Panel',       icon: GearIcon },
    ]
  }
];

export default function Layout({ children }) {
  const { user, logout, isAdmin, isManager, canManage } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const notifRef = useRef(null);
  const searchRef = useRef(null);

  const handleLogout = () => { logout(); navigate('/login'); };

  useEffect(() => {
    const load = async () => {
      try { const r = await getUnreadCount(); setUnreadCount(r.data.count); } catch {}
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = async () => {
      try { const r = await getMessageUnreadCount(); setUnreadMessages(r.data.count); } catch {}
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  useChatHub({
    onMessage: (msg) => { if (msg.senderId !== user?.id) setUnreadMessages(p => p + 1); },
    onRead: () => { getMessageUnreadCount().then(r => setUnreadMessages(r.data.count)).catch(() => {}); }
  });

  useEffect(() => {
    const fn = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifPanel(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try { const r = await globalSearch(searchQuery); setSearchResults(r.data); }
      catch { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const openNotifications = async () => {
    if (!showNotifPanel) {
      try { const r = await getNotifications(); setNotifications(r.data); } catch {}
    }
    setShowNotifPanel(v => !v);
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(p => p.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  const handleNotifClick = async (n) => {
    if (!n.isRead) {
      try {
        await markNotificationRead(n.id);
        setNotifications(p => p.map(x => x.id === n.id ? { ...x, isRead: true } : x));
        setUnreadCount(p => Math.max(0, p - 1));
      } catch {}
    }
    if (n.link) { navigate(n.link); setShowNotifPanel(false); }
  };

  const TYPE_ICON = { task_assigned: '📋', task_overdue: '⚠️', meeting_reminder: '📅', birthday: '🎂', reminder: '🔔', system: 'ℹ️' };

  const initial = (user?.username ?? '?')[0].toUpperCase();
  const roleLabel = isAdmin ? 'Admin' : isManager ? 'Manager' : 'User';
  const roleColor = isAdmin ? '#F59E0B' : isManager ? '#3B82F6' : '#64748B';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--content-bg)' }}>

      {/* ── SIDEBAR ──────────────────────────────────────────────────── */}
      <aside
        className="sidebar-texture w-60 flex flex-col flex-shrink-0 relative"
        style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
      >
        {/* Subtle glow at top */}
        <div className="absolute top-0 left-0 right-0 h-48 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% -20%, rgba(59,130,246,0.12) 0%, transparent 70%)' }} />

        {/* Logo */}
        <div className="relative px-5 pt-6 pb-5" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)', boxShadow: '0 4px 12px rgba(37,99,235,0.4)' }}>
                PT
              </div>
            </div>
            <div>
              <p className="text-white font-bold text-sm tracking-tight">PersonTrack</p>
              <p className="text-xs" style={{ color: 'var(--sidebar-text)' }}>v2.0</p>
            </div>
          </div>
        </div>

        {/* User Card */}
        <Link to="/profile" className="relative mx-3 my-3 px-3 py-3 rounded-xl flex items-center gap-3 group transition-all"
          style={{ ':hover': { background: 'var(--sidebar-active)' } }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${roleColor}99, ${roleColor})` }}>
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-semibold truncate leading-tight">{user?.username}</p>
            <p className="text-xs truncate" style={{ color: roleColor }}>{roleLabel}</p>
          </div>
          <ChevronIcon />
        </Link>

        {/* Navigation */}
        <nav className="flex-1 px-3 overflow-y-auto pb-3 space-y-0.5">
          {NAV_SECTIONS.map((section, si) => {
            if (section.adminOnly && !isAdmin) return null;
            const visibleItems = section.items?.filter(item => {
              if (!item.show) return isAdmin;
              return item.show(isAdmin, isManager, canManage);
            }) ?? [];
            if (visibleItems.length === 0) return null;

            return (
              <div key={si}>
                {section.label && (
                  <p className="text-[10px] font-semibold uppercase tracking-widest px-3 pt-4 pb-1"
                    style={{ color: 'rgba(148,163,184,0.5)' }}>
                    {section.label}
                  </p>
                )}
                {visibleItems.map(item => {
                  const badge = item.badge ? unreadMessages : 0;
                  const Icon = item.icon;
                  return (
                    <NavLink key={item.to} to={item.to}
                      className={({ isActive }) => `
                        flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 relative group
                        ${isActive
                          ? 'text-white'
                          : 'hover:text-white'
                        }
                      `}
                      style={({ isActive }) => ({
                        background: isActive ? 'rgba(59,130,246,0.18)' : 'transparent',
                        color: isActive ? 'white' : 'var(--sidebar-text)',
                      })}
                      onMouseEnter={e => {
                        if (!e.currentTarget.dataset.active) e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                      }}
                      onMouseLeave={e => {
                        if (!e.currentTarget.dataset.active) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r"
                              style={{ background: '#3B82F6' }} />
                          )}
                          <span className="w-5 flex items-center justify-center">
                            <Icon active={isActive} />
                          </span>
                          <span className="flex-1">{item.label}</span>
                          {badge > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none"
                              style={{ background: '#EF4444', color: 'white' }}>
                              {badge > 99 ? '99+' : badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ color: 'var(--sidebar-text)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; e.currentTarget.style.color = '#FCA5A5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-text)'; }}>
            <LogoutIcon />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Topbar */}
        <header className="flex items-center gap-4 px-6 py-3 z-10"
          style={{
            background: isDark ? 'rgba(13,26,45,0.9)' : 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(12px)',
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.06)' : '1px solid rgba(0,0,0,0.06)',
            boxShadow: '0 1px 0 rgba(0,0,0,0.04)'
          }}>

          {/* Search */}
          <div className="relative flex-1 max-w-md" ref={searchRef}>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                <SearchIcon />
              </span>
              <input
                type="text"
                value={searchQuery}
                placeholder="Kişi, toplantı veya görev ara..."
                onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
                onFocus={() => setShowSearch(true)}
                style={{
                  width: '100%', paddingLeft: '36px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px',
                  background: isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9',
                  border: isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #E2E8F0',
                  borderRadius: '10px', fontSize: '13px', fontFamily: 'inherit',
                  color: 'var(--text-primary)',
                  outline: 'none', transition: 'all 0.15s'
                }}
                onFocusCapture={e => { e.target.style.background = isDark ? 'rgba(59,130,246,0.08)' : 'white'; e.target.style.borderColor = '#3B82F6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)'; }}
                onBlurCapture={e => { e.target.style.background = isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9'; e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl overflow-hidden z-50"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-hover)' }}>
                {searchResults.map((r, i) => (
                  <button key={i} onClick={() => { navigate(r.link); setSearchQuery(''); setSearchResults([]); setShowSearch(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors"
                    style={{ borderBottom: '1px solid var(--card-border)', color: 'var(--text-primary)' }}
                    onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <span className="text-base">{r.type === 'person' ? '👤' : r.type === 'meeting' ? '📅' : '✅'}</span>
                    <div><p className="font-medium">{r.title}</p>
                    {r.subtitle && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.subtitle}</p>}</div>
                  </button>
                ))}
              </div>
            )}
            {showSearch && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1.5 rounded-xl px-4 py-3 text-sm z-50"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)' }}>
                Sonuç bulunamadı
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-1.5">
            <IconBtn onClick={toggleTheme} title={isDark ? 'Açık mod' : 'Koyu mod'}>
              {isDark ? '☀️' : '🌙'}
            </IconBtn>

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <IconBtn onClick={openNotifications} title="Bildirimler">
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white px-0.5"
                    style={{ background: '#EF4444' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </IconBtn>

              {showNotifPanel && (
                <div className="absolute right-0 top-full mt-2 w-96 rounded-2xl overflow-hidden z-50"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-hover)' }}>
                  <div className="flex items-center justify-between px-4 py-3"
                    style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Bildirimler</h3>
                    <div className="flex gap-3">
                      <button onClick={handleMarkAllRead} className="text-xs font-medium" style={{ color: '#3B82F6' }}>
                        Tümünü oku
                      </button>
                      <button onClick={() => { navigate('/notifications'); setShowNotifPanel(false); }}
                        className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Tümü →
                      </button>
                    </div>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="text-center py-10" style={{ color: 'var(--text-tertiary)' }}>
                        <p className="text-2xl mb-1">🔔</p>
                        <p className="text-sm">Bildirim yok</p>
                      </div>
                    ) : notifications.map(n => (
                      <button key={n.id} onClick={() => handleNotifClick(n)}
                        className="w-full flex gap-3 px-4 py-3 text-left transition-colors"
                        style={{
                          borderBottom: '1px solid var(--card-border)',
                          background: !n.isRead ? (isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.04)') : 'transparent'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC'}
                        onMouseLeave={e => e.currentTarget.style.background = !n.isRead ? (isDark ? 'rgba(59,130,246,0.08)' : 'rgba(59,130,246,0.04)') : 'transparent'}>
                        <span className="text-base mt-0.5">{TYPE_ICON[n.type] || 'ℹ️'}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                          <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>{n.message}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{new Date(n.createdAt).toLocaleString('tr-TR')}</p>
                        </div>
                        {!n.isRead && <span className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#3B82F6' }} />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-8 animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}

/* ── Icon helpers ─────────────────────────────────────────────────── */
function IconBtn({ children, onClick, title }) {
  return (
    <button onClick={onClick} title={title}
      className="relative w-9 h-9 flex items-center justify-center rounded-xl text-sm transition-all"
      style={{ color: 'var(--text-secondary)' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(148,163,184,0.12)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
      {children}
    </button>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(148,163,184,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6"/>
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
    </svg>
  );
}
