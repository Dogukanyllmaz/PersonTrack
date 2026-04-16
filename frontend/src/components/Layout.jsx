import { useState, useEffect, useRef } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '../context/LanguageContext';
import {
  getUnreadCount, getNotifications, markAllNotificationsRead,
  markNotificationRead, globalSearch, getMessageUnreadCount
} from '../services/api';
import { useChatHub } from '../hooks/useChatHub';

/* ══════════════════════════════════════════════════════════════
   SVG ICON SYSTEM — consistent 18px stroke icons
══════════════════════════════════════════════════════════════ */
const SvgIcon = ({ d, extra, size = 18, fill = 'none', strokeW = 1.85 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
    strokeWidth={strokeW} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
    {extra && <path d={extra} />}
  </svg>
);

/* Navigation icons */
const HomeIcon     = () => <SvgIcon d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" extra="M9 22V12h6v10" />;
const PeopleIcon   = () => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.85} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
  </svg>
);
const CalIcon      = () => <SvgIcon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />;
const CalGridIcon  = () => <SvgIcon d="M3 4h18v18H3V4z" extra="M8 2v4M16 2v4M3 10h18" />;
const CheckIcon    = () => <SvgIcon d="M9 11l3 3L22 4" extra="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />;
const TagIcon      = () => <SvgIcon d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" extra="M7 7h.01" />;
const TimelineIcon = () => <SvgIcon d="M12 20V10" extra="M18 20V4M6 20v-4" />;
const BellIcon     = () => <SvgIcon d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />;
const ChatIcon     = () => <SvgIcon d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />;
const MonitorIcon  = () => <SvgIcon d="M2 3h20v14H2zM8 21h8M12 17v4" />;
const LogIcon      = () => <SvgIcon d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" extra="M14 2v6h6M16 13H8M16 17H8M10 9H8" />;
const GearIcon     = () => <SvgIcon d="M12 15a3 3 0 100-6 3 3 0 000 6z" extra="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />;

/* Topbar icons */
const SunIcon      = () => <SvgIcon size={16} strokeW={2} d="M12 7a5 5 0 100 10A5 5 0 0012 7zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />;
const MoonIcon     = () => <SvgIcon size={16} strokeW={2} d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />;
const TopBellIcon  = () => <SvgIcon size={16} strokeW={2} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />;
const SearchSvg    = () => <SvgIcon size={14} strokeW={2.2} d="M21 21l-4.35-4.35" extra="M11 3a8 8 0 100 16A8 8 0 0011 3z" />;
const LogoutIcon   = () => <SvgIcon size={16} strokeW={2} d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />;

/* Notification type icons */
const NotifTaskIcon  = () => <SvgIcon size={14} strokeW={2} d="M9 11l3 3L22 4" extra="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />;
const NotifAlertIcon = () => <SvgIcon size={14} strokeW={2} d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01" />;
const NotifCalIcon   = () => <SvgIcon size={14} strokeW={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />;
const NotifGiftIcon  = () => <SvgIcon size={14} strokeW={2} d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />;
const NotifBellIcon  = () => <SvgIcon size={14} strokeW={2} d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />;
const NotifInfoIcon  = () => <SvgIcon size={14} strokeW={2} d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8h.01M11 12h1v4h1" />;

/* Search result type icons */
const PersonSearchIcon  = () => <SvgIcon size={14} strokeW={2} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" extra="M12 3a4 4 0 100 8 4 4 0 000-8z" />;
const MeetingSearchIcon = () => <SvgIcon size={14} strokeW={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />;
const TaskSearchIcon    = () => <SvgIcon size={14} strokeW={2} d="M9 11l3 3L22 4" extra="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />;

/* ══════════════════════════════════════════════════════════════
   NOTIFICATION TYPE CONFIG
══════════════════════════════════════════════════════════════ */
const NOTIF_CFG = {
  task_assigned:    { icon: <NotifTaskIcon />,  color: '#6272FF', bg: 'rgba(98,114,255,0.12)'  },
  task_overdue:     { icon: <NotifAlertIcon />, color: '#EF4444', bg: 'rgba(239,68,68,0.12)'   },
  meeting_reminder: { icon: <NotifCalIcon />,   color: '#F59E0B', bg: 'rgba(245,158,11,0.12)'  },
  birthday:         { icon: <NotifGiftIcon />,  color: '#EC4899', bg: 'rgba(236,72,153,0.12)'  },
  reminder:         { icon: <NotifBellIcon />,  color: '#10B981', bg: 'rgba(16,185,129,0.12)'  },
  system:           { icon: <NotifInfoIcon />,  color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
};

/* ══════════════════════════════════════════════════════════════
   NAVIGATION SECTIONS (dynamic — uses t() for translations)
══════════════════════════════════════════════════════════════ */
const buildNavSections = (t) => [
  {
    label: null,
    items: [
      { to: '/dashboard',  label: t('dashboard'),     Icon: HomeIcon,     show: () => true },
      { to: '/persons',    label: t('persons'),        Icon: PeopleIcon,   show: (a,m,c) => c },
      { to: '/meetings',   label: t('meetings'),       Icon: CalIcon,      show: () => true },
      { to: '/calendar',   label: t('calendar'),       Icon: CalGridIcon,  show: () => true },
      { to: '/tasks',      label: t('tasks'),          Icon: CheckIcon,    show: (a,m,c) => c },
      { to: '/tags',       label: t('tags'),           Icon: TagIcon,      show: (a,m,c) => c },
      { to: '/timeline',   label: t('timeline'),       Icon: TimelineIcon, show: () => true },
      { to: '/reminders',  label: t('reminders'),      Icon: BellIcon,     show: () => true },
      { to: '/messages',   label: t('messages'),       Icon: ChatIcon,     show: () => true, badge: true },
    ],
  },
  {
    label: t('management'),
    adminOnly: true,
    items: [
      { to: '/monitor',      label: t('monitor'),      Icon: MonitorIcon },
      { to: '/activity-log', label: t('activityLog'),  Icon: LogIcon },
      { to: '/admin',        label: t('admin'),         Icon: GearIcon },
    ],
  },
];

/* ══════════════════════════════════════════════════════════════
   LAYOUT COMPONENT
══════════════════════════════════════════════════════════════ */
export default function Layout({ children }) {
  const { user, logout, isAdmin, isManager, canManage } = useAuth();
  const { isDark, toggle: toggleTheme } = useTheme();
  const { lang, changeLang, t, enabledLangs } = useLanguage();
  const navigate = useNavigate();

  const [unreadCount, setUnreadCount]       = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications]   = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showLangMenu, setShowLangMenu]     = useState(false);
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchResults, setSearchResults]   = useState([]);
  const [showSearch, setShowSearch]         = useState(false);
  const notifRef  = useRef(null);
  const searchRef = useRef(null);
  const langRef   = useRef(null);

  const NAV_SECTIONS = buildNavSections(t);

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
    onRead: () => { getMessageUnreadCount().then(r => setUnreadMessages(r.data.count)).catch(() => {}); },
  });

  useEffect(() => {
    const fn = (e) => {
      if (notifRef.current  && !notifRef.current.contains(e.target))  setShowNotifPanel(false);
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearch(false);
      if (langRef.current   && !langRef.current.contains(e.target))   setShowLangMenu(false);
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

  const initial   = (user?.username ?? '?')[0].toUpperCase();
  const roleLabel = isAdmin ? 'Admin' : isManager ? 'Manager' : 'User';
  const roleColor = isAdmin ? '#F59E0B' : isManager ? '#6272FF' : '#64748B';
  const roleGrad  = isAdmin
    ? 'linear-gradient(135deg,#F59E0B,#EF4444)'
    : isManager
      ? 'linear-gradient(135deg,#6272FF,#9E6EFA)'
      : 'linear-gradient(135deg,#64748B,#475569)';

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--content-bg)' }}>

      {/* ═══════════════════════════════════════════════════
          SIDEBAR
      ═══════════════════════════════════════════════════ */}
      <aside
        className="sidebar-texture w-[232px] flex flex-col flex-shrink-0 relative"
        style={{ background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
      >
        {/* Top accent glow */}
        <div className="absolute top-0 left-0 right-0 h-52 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% -10%, rgba(82,96,247,0.15) 0%, transparent 72%)' }} />

        {/* ─ Logo ─────────────────────────────────────── */}
        <div className="relative px-5 pt-6 pb-4" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-[11px] flex items-center justify-center font-bold text-white text-sm flex-shrink-0 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #5260F7 0%, #8A5CF6 100%)',
                boxShadow: '0 4px 18px rgba(82,96,247,0.50)',
              }}
            >
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(135deg,rgba(255,255,255,0.22) 0%,transparent 55%)' }} />
              <span className="relative z-10 text-[13px]" style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800 }}>PT</span>
            </div>
            <div>
              <p className="text-white text-[13.5px] leading-tight tracking-tight"
                style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700 }}>PersonTrack</p>
              <p className="text-[10px] font-semibold" style={{ color: 'rgba(98,114,255,0.75)' }}>CRM v2.0</p>
            </div>
          </div>
        </div>

        {/* ─ User card ────────────────────────────────── */}
        <Link
          to="/profile"
          className="relative mx-3 mt-3 mb-1 px-3 py-2.5 rounded-[12px] flex items-center gap-2.5 transition-all duration-200"
          style={{ textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.055)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-[10px] flex items-center justify-center text-white text-sm font-bold"
              style={{ background: roleGrad, boxShadow: `0 3px 10px ${roleColor}44` }}>
              {initial}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
              style={{ background: '#10B981', border: '2px solid var(--sidebar-bg)', boxShadow: '0 0 6px rgba(16,185,129,0.6)' }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-[12.5px] font-semibold truncate leading-snug">{user?.username}</p>
            <p className="text-[10.5px] font-medium truncate" style={{ color: roleColor }}>{roleLabel}</p>
          </div>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.22)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </Link>

        {/* ─ Navigation ───────────────────────────────── */}
        <nav className="flex-1 px-3 overflow-y-auto pb-3 mt-1" style={{ scrollbarWidth: 'none' }}>
          {NAV_SECTIONS.map((section, si) => {
            if (section.adminOnly && !isAdmin) return null;
            const visibleItems = section.items?.filter(item => {
              if (!item.show) return isAdmin;
              return item.show(isAdmin, isManager, canManage);
            }) ?? [];
            if (visibleItems.length === 0) return null;

            return (
              <div key={si} className={si > 0 ? 'mt-1' : ''}>
                {section.label && (
                  <div className="flex items-center gap-2 px-3 pt-4 pb-1.5">
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em]"
                      style={{ color: 'rgba(86,111,138,0.60)' }}>
                      {section.label}
                    </span>
                    <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.042)' }} />
                  </div>
                )}
                {visibleItems.map(item => {
                  const msgBadge = item.badge ? unreadMessages : 0;
                  const { Icon } = item;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className="flex items-center gap-2.5 px-3 py-[9px] rounded-[11px] text-[12.5px] font-medium transition-all duration-150 relative mb-0.5"
                      style={({ isActive }) => ({
                        background: isActive
                          ? 'linear-gradient(90deg, rgba(82,96,247,0.20) 0%, rgba(82,96,247,0.08) 100%)'
                          : 'transparent',
                        boxShadow: isActive ? 'inset 3px 0 0 #5260F7' : 'none',
                        color: isActive ? '#FFFFFF' : 'var(--sidebar-text)',
                        textDecoration: 'none',
                      })}
                      onMouseEnter={e => {
                        const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                        if (!isActive) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.048)';
                          e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
                        }
                      }}
                      onMouseLeave={e => {
                        const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                        if (!isActive) {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = 'var(--sidebar-text)';
                        }
                      }}
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className="w-[18px] flex items-center justify-center flex-shrink-0 transition-all duration-150"
                            style={{
                              color: isActive ? '#6272FF' : 'inherit',
                              filter: isActive ? 'drop-shadow(0 0 5px rgba(82,96,247,0.55))' : 'none',
                            }}
                          >
                            <Icon />
                          </span>
                          <span className="flex-1">{item.label}</span>
                          {msgBadge > 0 && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none text-white"
                              style={{
                                background: 'linear-gradient(135deg,#EF4444,#F43F5E)',
                                boxShadow: '0 2px 8px rgba(239,68,68,0.45)',
                              }}>
                              {msgBadge > 99 ? '99+' : msgBadge}
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

        {/* ─ Logout ───────────────────────────────────── */}
        <div className="p-3" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-[11px] text-[12.5px] font-medium transition-all duration-150"
            style={{ color: 'var(--sidebar-text)', background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.10)'; e.currentTarget.style.color = '#FCA5A5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--sidebar-text)'; }}
          >
            <LogoutIcon />
            <span>{t('logout')}</span>
          </button>
        </div>
      </aside>

      {/* ═══════════════════════════════════════════════════
          MAIN
      ═══════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ─ Topbar ───────────────────────────────────── */}
        <header
          className="flex items-center gap-3 px-6 py-3 z-10"
          style={{
            background: isDark ? 'rgba(6,12,24,0.88)' : 'rgba(255,255,255,0.90)',
            backdropFilter: 'blur(22px) saturate(160%)',
            WebkitBackdropFilter: 'blur(22px) saturate(160%)',
            borderBottom: isDark ? '1px solid rgba(255,255,255,0.058)' : '1px solid rgba(15,35,70,0.08)',
            boxShadow: isDark
              ? '0 1px 0 rgba(0,0,0,0.3), 0 4px 20px rgba(0,0,0,0.14)'
              : '0 1px 0 rgba(15,35,70,0.05), 0 4px 20px rgba(15,40,80,0.06)',
          }}
        >
          {/* Search */}
          <div className="relative flex-1 max-w-[400px]" ref={searchRef}>
            <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--text-tertiary)' }}>
              <SearchSvg />
            </span>
            <input
              type="text"
              value={searchQuery}
              placeholder={t('search')}
              onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
              onFocus={e => {
                setShowSearch(true);
                e.target.style.background = isDark ? 'rgba(82,96,247,0.09)' : '#FFFFFF';
                e.target.style.borderColor = 'var(--accent)';
                e.target.style.boxShadow = '0 0 0 3.5px var(--accent-glow)';
              }}
              onBlur={e => {
                e.target.style.background = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(82,96,247,0.04)';
                e.target.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(82,96,247,0.10)';
                e.target.style.boxShadow = 'none';
              }}
              style={{
                width: '100%',
                paddingLeft: '36px', paddingRight: '12px',
                paddingTop: '8px', paddingBottom: '8px',
                background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(82,96,247,0.04)',
                border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(82,96,247,0.10)'}`,
                borderRadius: '11px',
                fontSize: '12.5px',
                fontFamily: 'inherit',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'all 0.18s',
              }}
            />

            {showSearch && searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-[14px] overflow-hidden z-50 animate-slide-down"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-pop)' }}>
                {searchResults.map((r, i) => {
                  const Icon = r.type === 'person' ? PersonSearchIcon : r.type === 'meeting' ? MeetingSearchIcon : TaskSearchIcon;
                  const iconColor = r.type === 'person' ? '#8A5CF6' : r.type === 'meeting' ? '#F59E0B' : '#10B981';
                  return (
                    <button
                      key={i}
                      onClick={() => { navigate(r.link); setSearchQuery(''); setSearchResults([]); setShowSearch(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
                      style={{
                        borderBottom: i < searchResults.length - 1 ? '1px solid var(--card-border)' : 'none',
                        color: 'var(--text-primary)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(82,96,247,0.07)' : 'rgba(82,96,247,0.04)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${iconColor}1A`, color: iconColor }}>
                        <Icon />
                      </span>
                      <div>
                        <p className="font-semibold text-[13px]">{r.title}</p>
                        {r.subtitle && <p className="text-[11.5px]" style={{ color: 'var(--text-secondary)' }}>{r.subtitle}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {showSearch && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-[14px] px-4 py-3 text-[12.5px] z-50 animate-slide-down"
                style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-secondary)', boxShadow: 'var(--shadow-card)' }}>
                {t('noResult')}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="ml-auto flex items-center gap-1">
            {/* Theme toggle */}
            <TopbarBtn onClick={toggleTheme} title={isDark ? t('lightMode') : t('darkMode')}>
              {isDark ? <SunIcon /> : <MoonIcon />}
            </TopbarBtn>

            {/* Language switcher */}
            {enabledLangs.length > 1 && (
              <div className="relative" ref={langRef}>
                <button
                  onClick={() => setShowLangMenu(v => !v)}
                  title={t('language')}
                  className="icon-btn text-[11px] font-bold"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {SUPPORTED_LANGUAGES.find(l => l.code === lang)?.flag ?? '🌐'}
                </button>
                {showLangMenu && (
                  <div className="absolute right-0 top-full mt-2 rounded-[13px] overflow-hidden z-50 animate-slide-down"
                    style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-pop)', minWidth: '140px' }}>
                    {SUPPORTED_LANGUAGES.filter(l => enabledLangs.includes(l.code)).map(l => (
                      <button
                        key={l.code}
                        onClick={() => { changeLang(l.code); setShowLangMenu(false); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left text-[12.5px] font-medium transition-colors"
                        style={{
                          color: lang === l.code ? 'var(--accent)' : 'var(--text-primary)',
                          background: lang === l.code ? 'rgba(91,127,166,0.08)' : 'transparent',
                          border: 'none', cursor: 'pointer',
                        }}
                        onMouseEnter={e => { if (lang !== l.code) e.currentTarget.style.background = 'rgba(91,127,166,0.05)'; }}
                        onMouseLeave={e => { if (lang !== l.code) e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span className="text-base">{l.flag}</span>
                        <span>{l.label}</span>
                        {lang === l.code && <span className="ml-auto text-[10px]">✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notifications */}
            <div className="relative" ref={notifRef}>
              <TopbarBtn onClick={openNotifications} title="Bildirimler">
                <TopBellIcon />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full text-[9px] font-bold text-white px-1 leading-none"
                    style={{ background: 'linear-gradient(135deg,#EF4444,#F43F5E)', boxShadow: '0 2px 8px rgba(239,68,68,0.5)' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </TopbarBtn>

              {showNotifPanel && (
                <div className="absolute right-0 top-full mt-2.5 w-[380px] rounded-[18px] overflow-hidden z-50 animate-slide-down"
                  style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-pop)' }}>

                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-3.5"
                    style={{ borderBottom: '1px solid var(--card-border)' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ color: 'var(--accent)' }}><TopBellIcon /></span>
                      <h3 className="font-bold text-[13.5px]" style={{ color: 'var(--text-primary)' }}>Bildirimler</h3>
                      {unreadCount > 0 && (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full text-white"
                          style={{ background: 'var(--accent)' }}>
                          {unreadCount}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={handleMarkAllRead}
                        className="text-[11.5px] font-semibold transition-opacity hover:opacity-75"
                        style={{ color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Tümünü oku
                      </button>
                      <button onClick={() => { navigate('/notifications'); setShowNotifPanel(false); }}
                        className="text-[11.5px] font-medium transition-opacity hover:opacity-75"
                        style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                        Tümü →
                      </button>
                    </div>
                  </div>

                  {/* List */}
                  <div className="max-h-[340px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 gap-3">
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                          style={{ background: 'rgba(82,96,247,0.08)', color: 'var(--accent)' }}>
                          <TopBellIcon />
                        </div>
                        <p className="text-[12.5px] font-medium" style={{ color: 'var(--text-tertiary)' }}>Bildirim yok</p>
                      </div>
                    ) : notifications.map((n, idx) => {
                      const cfg = NOTIF_CFG[n.type] || NOTIF_CFG.system;
                      return (
                        <button
                          key={n.id}
                          onClick={() => handleNotifClick(n)}
                          className="w-full flex gap-3 px-4 py-3.5 text-left transition-colors"
                          style={{
                            borderBottom: idx < notifications.length - 1 ? '1px solid var(--card-border)' : 'none',
                            background: !n.isRead ? (isDark ? 'rgba(82,96,247,0.07)' : 'rgba(82,96,247,0.03)') : 'transparent',
                            border: 'none', cursor: 'pointer', width: '100%',
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = isDark ? 'rgba(82,96,247,0.10)' : 'rgba(82,96,247,0.05)'}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = !n.isRead
                              ? (isDark ? 'rgba(82,96,247,0.07)' : 'rgba(82,96,247,0.03)')
                              : 'transparent';
                          }}
                        >
                          <span className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 mt-0.5"
                            style={{ background: cfg.bg, color: cfg.color }}>
                            {cfg.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] font-semibold leading-snug truncate" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                            <p className="text-[11.5px] line-clamp-2 mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{n.message}</p>
                            <p className="text-[10.5px] mt-1 font-medium" style={{ color: 'var(--text-tertiary)' }}>
                              {new Date(n.createdAt).toLocaleString('tr-TR')}
                            </p>
                          </div>
                          {!n.isRead && (
                            <span className="w-2 h-2 rounded-full mt-2 flex-shrink-0"
                              style={{ background: 'var(--accent)', boxShadow: '0 0 8px var(--accent-glow)' }} />
                          )}
                        </button>
                      );
                    })}
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

/* ── Topbar button helper ────────────────────────────────────── */
function TopbarBtn({ children, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="icon-btn"
      style={{ border: 'none', cursor: 'pointer' }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(82,96,247,0.09)';
        e.currentTarget.style.color = 'var(--accent)';
        e.currentTarget.style.transform = 'scale(1.10)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = 'var(--text-secondary)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.93)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.10)'; }}
    >
      {children}
    </button>
  );
}
