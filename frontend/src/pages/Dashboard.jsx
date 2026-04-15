import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Area, AreaChart
} from 'recharts';
import {
  getPersons, getMeetings, getTasks, getUpcomingBirthdays,
  getNotifications, getReminders, getErrorMessage
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { DashboardSkeleton } from '../components/Skeleton';
import Avatar from '../components/ui/Avatar';
import { StatusBadge, PriorityBadge } from '../components/ui/Badge';

/* ── Constants ──────────────────────────────────────────────────────── */
const PRIORITY_LABELS = { Low: 'Düşük', Medium: 'Orta', High: 'Yüksek', Critical: 'Kritik' };
const PRIORITY_COLORS = { Low: 'bg-slate-100 text-slate-600', Medium: 'bg-indigo-100 text-indigo-700', High: 'bg-orange-100 text-orange-700', Critical: 'bg-red-100 text-red-700' };
const DEFAULT_ORDER   = ['charts', 'recentItems', 'activityItems'];
const WIDGET_LABELS   = { charts: 'Analizler', recentItems: 'Son Aktivite', activityItems: 'Bildirimler & Hatırlatıcılar' };
/* Notification type SVG icons */
const _NIcon = ({ d, extra, color }) => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>{extra && <path d={extra}/>}
  </svg>
);
const TYPE_ICON_CFG = {
  task_assigned:    { d: 'M9 11l3 3L22 4', extra: 'M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11', color: '#6272FF', bg: 'rgba(98,114,255,0.12)' },
  task_overdue:     { d: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' },
  meeting_reminder: { d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  birthday:         { d: 'M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z', color: '#EC4899', bg: 'rgba(236,72,153,0.12)' },
  reminder:         { d: 'M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0', color: '#10B981', bg: 'rgba(16,185,129,0.12)' },
  system:           { d: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM12 8h.01M11 12h1v4h1', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' },
};

/* ── Card accent colors ─────────────────────────────────────────────── */
const CARD_THEMES = {
  persons:  { gradient: 'linear-gradient(135deg,#4F46E5,#7C3AED)', accent: '#4F46E5', icon: '#EEF2FF' },
  meetings: { gradient: 'linear-gradient(135deg,#0EA5E9,#6366F1)', accent: '#0EA5E9', icon: '#E0F2FE' },
  active:   { gradient: 'linear-gradient(135deg,#F59E0B,#EF4444)', accent: '#F59E0B', icon: '#FEF3C7' },
  total:    { gradient: 'linear-gradient(135deg,#10B981,#059669)', accent: '#10B981', icon: '#D1FAE5' },
};

/* ── Helpers ────────────────────────────────────────────────────────── */
function buildMonthlyData(meetings) {
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return { name: d.toLocaleDateString('tr-TR', { month: 'short' }), year: d.getFullYear(), month: d.getMonth(), toplantı: 0 };
  });
  meetings.forEach(m => {
    const d = new Date(m.meetingDate);
    const entry = months.find(x => x.year === d.getFullYear() && x.month === d.getMonth());
    if (entry) entry.toplantı++;
  });
  return months;
}

function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

/* ── SVG Icons ──────────────────────────────────────────────────────── */
const PersonsIcon = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);
const MeetingIcon = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const ActiveIcon = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);
const TasksIcon = ({ size = 22, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
  </svg>
);
const ArrowIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17L17 7M17 7H7M17 7v10"/>
  </svg>
);

/* ── Drag handle ─────────────────────────────────────────────────────── */
const DragHandle = memo(() => (
  <span className="cursor-grab active:cursor-grabbing select-none flex items-center" style={{ color: 'var(--text-tertiary)', touchAction: 'none' }}>
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
      <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
      <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
    </svg>
  </span>
));

/* ── Custom Chart Tooltip ───────────────────────────────────────────── */
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-xl text-xs font-semibold" style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)', boxShadow: 'var(--shadow-hover)', color: 'var(--text-primary)' }}>
      {label && <p className="mb-0.5 font-normal" style={{ color: 'var(--text-tertiary)' }}>{label}</p>}
      <p>{payload[0].value}</p>
    </div>
  );
};

/* ── Metric Card (brand new design) ────────────────────────────────── */
const MetricCard = memo(function MetricCard({ card, index }) {
  const { gradient, accent, icon: iconBg } = card.theme;
  const Icon = card.Icon;
  return (
    <Link
      to={card.to}
      className="metric-card animate-fade-up"
      style={{ '--mc-accent': accent, '--mc-gradient': gradient, animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-start justify-between mb-5">
        <div className="metric-icon-wrap" style={{ background: iconBg, '--mc-accent': accent }}>
          <Icon size={20} color={accent} />
        </div>
        <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>
          {card.desc} <ArrowIcon />
        </span>
      </div>
      <div className="metric-number">{card.value}</div>
      <div className="metric-label">{card.label}</div>
    </Link>
  );
});

/* ═══════════════════════════════════════════════════════════════════
   Dashboard
═══════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const { user, canManage } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats]     = useState({ persons: 0, meetings: 0, tasks: 0, activeTasks: 0 });
  const [recentMeetings, setRecentMeetings]           = useState([]);
  const [pendingTasks, setPendingTasks]               = useState([]);
  const [allTasks, setAllTasks]                       = useState([]);
  const [allMeetings, setAllMeetings]                 = useState([]);
  const [birthdays, setBirthdays]                     = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [upcomingReminders, setUpcomingReminders]     = useState([]);

  const [widgetOrder, setWidgetOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_widget_order');
      if (saved) { const p = JSON.parse(saved); if (Array.isArray(p) && p.length === DEFAULT_ORDER.length) return p; }
    } catch {}
    return DEFAULT_ORDER;
  });
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  /* ── Drag handlers ─────────────────────────────────────────── */
  const handleDragStart = useCallback((e, id) => { setDragging(id); e.dataTransfer.effectAllowed = 'move'; }, []);
  const handleDragOver  = useCallback((e, id) => { e.preventDefault(); setDragOver(p => p === id ? p : id); }, []);
  const handleDragEnd   = useCallback(() => { setDragging(null); setDragOver(null); }, []);
  const handleDrop = useCallback((e, id) => {
    e.preventDefault();
    setDragging(prev => {
      if (!prev || prev === id) { setDragOver(null); return null; }
      setWidgetOrder(order => {
        const next = [...order];
        next.splice(next.indexOf(prev), 1);
        next.splice(next.indexOf(id), 0, prev);
        localStorage.setItem('dashboard_widget_order', JSON.stringify(next));
        return next;
      });
      setDragOver(null);
      return null;
    });
  }, []);

  /* ── Data fetch ─────────────────────────────────────────────── */
  useEffect(() => {
    const promises = [getMeetings(), getTasks({ status: 'Active' })];
    if (canManage) promises.push(getPersons(), getTasks(), getUpcomingBirthdays(30));

    Promise.allSettled(promises).then(results => {
      const meetings    = results[0].status === 'fulfilled' ? results[0].value.data : [];
      const activeTasks = results[1].status === 'fulfilled' ? results[1].value.data : [];
      setRecentMeetings(meetings.slice(0, 5));
      setPendingTasks(activeTasks.slice(0, 5));
      setAllMeetings(meetings);
      if (canManage) {
        const persons = results[2].status === 'fulfilled' ? results[2].value.data : [];
        const tasks   = results[3].status === 'fulfilled' ? results[3].value.data : [];
        const bdays   = results[4].status === 'fulfilled' ? results[4].value.data : [];
        setStats({ persons: persons.length, meetings: meetings.length, tasks: tasks.length, activeTasks: activeTasks.length });
        setAllTasks(tasks);
        setBirthdays(bdays);
      } else {
        setStats(s => ({ ...s, meetings: meetings.length, activeTasks: activeTasks.length }));
        setAllTasks(activeTasks);
      }
      setLoading(false);
    });
    getNotifications(true).then(r => setRecentNotifications(r.data.slice(0, 5))).catch(() => {});
    getReminders().then(r => setUpcomingReminders(r.data.slice(0, 5))).catch(() => {});
  }, [canManage]);

  /* ── Chart data (memoized) ──────────────────────────────────── */
  const taskStatusData = useMemo(() => [
    { name: 'Aktif',      value: allTasks.filter(t => t.status === 'Active').length },
    { name: 'Tamamlandı', value: allTasks.filter(t => t.status === 'Completed').length },
  ].filter(d => d.value > 0), [allTasks]);

  const taskPriorityData = useMemo(() =>
    ['Low','Medium','High','Critical'].map(p => ({
      name: PRIORITY_LABELS[p],
      sayı: allTasks.filter(t => t.priority === p).length,
      fill: { Low:'#94A3B8', Medium:'#6366F1', High:'#F97316', Critical:'#EF4444' }[p]
    })).filter(d => d.sayı > 0),
  [allTasks]);

  const monthlyData = useMemo(() => buildMonthlyData(allMeetings), [allMeetings]);

  /* ── Stat cards config ──────────────────────────────────────── */
  const cards = useMemo(() => [
    ...(canManage ? [{ label:'Toplam Kişi',  value: stats.persons,    to:'/persons',                       desc:'Kişiler',   Icon: PersonsIcon, theme: CARD_THEMES.persons }] : []),
    {               label:'Toplantılar',     value: stats.meetings,   to:'/meetings',                      desc:'Toplantılar', Icon: MeetingIcon, theme: CARD_THEMES.meetings },
    {               label:'Aktif Görevler',  value: stats.activeTasks,to: canManage?'/tasks':'/timeline',  desc:'Görevler',  Icon: ActiveIcon,  theme: CARD_THEMES.active },
    ...(canManage ? [{ label:'Toplam Görev', value: stats.tasks,      to:'/tasks',                         desc:'Görevler',  Icon: TasksIcon,   theme: CARD_THEMES.total }] : []),
  ], [canManage, stats]);

  const todayBirthdays    = useMemo(() => birthdays.filter(b => b.isToday),  [birthdays]);
  const upcomingBirthdays = useMemo(() => birthdays.filter(b => !b.isToday), [birthdays]);

  /* ── Widget sections (memoized — stable during drag) ────────── */
  const chartsWidget = useMemo(() => {
    if (!canManage || (allTasks.length === 0 && allMeetings.length === 0)) return null;
    const PIE_COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444'];
    return (
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Pie */}
        {taskStatusData.length > 0 && (
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-tertiary)' }}>Görev Durumu</p>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={4} dataKey="value" strokeWidth={0}>
                  {taskStatusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip content={<ChartTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-1">
              {taskStatusData.map((d, i) => (
                <span key={d.name} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                  {d.name} ({d.value})
                </span>
              ))}
            </div>
          </div>
        )}
        {/* Bar — Priority */}
        {taskPriorityData.length > 0 && (
          <div className="card p-5">
            <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-tertiary)' }}>Öncelik Dağılımı</p>
            <ResponsiveContainer width="100%" height={170}>
              <BarChart data={taskPriorityData} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(99,102,241,0.06)' }} />
                <Bar dataKey="sayı" radius={[5,5,0,0]}>
                  {taskPriorityData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        {/* Area — Monthly meetings */}
        <div className="card p-5">
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: 'var(--text-tertiary)' }}>Aylık Toplantılar</p>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={monthlyData} margin={{ top: 4, right: 0, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="meetingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--card-border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)', fontFamily: 'inherit' }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTip />} cursor={{ stroke: 'rgba(99,102,241,0.3)', strokeWidth: 1 }} />
              <Area type="monotone" dataKey="toplantı" stroke="#6366F1" strokeWidth={2.5} fill="url(#meetingGrad)" dot={{ fill: '#6366F1', r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }, [canManage, allTasks, allMeetings, taskStatusData, taskPriorityData, monthlyData]);

  const recentItemsWidget = useMemo(() => (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* Recent Meetings */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Son Toplantılar</p>
          <Link to="/meetings" className="flex items-center gap-1 text-xs font-semibold hover:opacity-70 transition-opacity" style={{ color: 'var(--accent)' }}>
            Tümü <ArrowIcon />
          </Link>
        </div>
        {recentMeetings.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
            <MeetingIcon size={28} color="var(--text-tertiary)" />
            <p className="text-sm mt-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Toplantı yok</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {recentMeetings.map(m => (
              <li key={m.id} className="flex items-center gap-3 py-1.5 px-2 rounded-xl transition-colors" style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/meetings/${m.id}`)}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--content-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: m.status === 'Completed' ? '#10B981' : '#F59E0B' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{m.title}</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{new Date(m.meetingDate).toLocaleDateString('tr-TR')}</p>
                </div>
                <StatusBadge status={m.status === 'Completed' ? 'Completed' : 'Planned'} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Active Tasks */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Aktif Görevler</p>
          {canManage && (
            <Link to="/tasks" className="flex items-center gap-1 text-xs font-semibold hover:opacity-70 transition-opacity" style={{ color: 'var(--accent)' }}>
              Tümü <ArrowIcon />
            </Link>
          )}
        </div>
        {pendingTasks.length === 0 ? (
          <div className="text-center py-8" style={{ color: 'var(--text-tertiary)' }}>
            <TasksIcon size={28} color="var(--text-tertiary)" />
            <p className="text-sm mt-2 font-medium" style={{ color: 'var(--text-secondary)' }}>Bekleyen görev yok</p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {pendingTasks.map(t => (
              <li key={t.id} className="flex items-center gap-3 py-1.5 px-2 rounded-xl transition-colors"
                onMouseEnter={e => e.currentTarget.style.background = 'var(--content-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ border: '2px solid var(--card-border)' }}>
                  <div className="w-2 h-2 rounded-sm" style={{ background: { Low:'#94A3B8', Medium:'#6366F1', High:'#F97316', Critical:'#EF4444' }[t.priority] || '#94A3B8' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{t.title}</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{t.personName}</p>
                </div>
                <PriorityBadge priority={t.priority} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  ), [recentMeetings, pendingTasks, canManage, navigate]);

  const activityItemsWidget = useMemo(() => (
    <div className="grid lg:grid-cols-2 gap-5">
      {/* Notifications */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Okunmamış Bildirimler</p>
          <Link to="/notifications" className="flex items-center gap-1 text-xs font-semibold hover:opacity-70 transition-opacity" style={{ color: 'var(--accent)' }}>
            Tümü <ArrowIcon />
          </Link>
        </div>
        {recentNotifications.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ background: 'rgba(82,96,247,0.08)', color: 'var(--accent)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Okunmamış bildirim yok</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {recentNotifications.map(n => (
              <li key={n.id} onClick={() => navigate(n.link || '/notifications')}
                className="flex gap-3 px-2 py-2 rounded-xl cursor-pointer transition-colors"
                onMouseEnter={e => e.currentTarget.style.background = 'var(--content-bg)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {(() => { const cfg = TYPE_ICON_CFG[n.type] || TYPE_ICON_CFG.system; return (
                  <span className="w-7 h-7 rounded-[9px] flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: cfg.bg, color: cfg.color }}>
                    <_NIcon d={cfg.d} extra={cfg.extra} color={cfg.color}/>
                  </span>
                ); })()}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{n.title}</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{n.message}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Birthdays / Reminders */}
      {canManage && upcomingBirthdays.length > 0 ? (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Yaklaşan Doğum Günleri</p>
            <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>30 gün içinde</span>
          </div>
          <ul className="space-y-3">
            {upcomingBirthdays.slice(0, 5).map(b => (
              <li key={b.id} className="flex items-center gap-3">
                <Avatar src={b.photoUrl} firstName={b.fullName.split(' ')[0]} lastName={b.fullName.split(' ').slice(1).join(' ')} size="sm" />
                <div className="flex-1 min-w-0">
                  <Link to={`/persons/${b.id}`} className="text-sm font-semibold block truncate hover:opacity-70 transition-opacity" style={{ color: 'var(--text-primary)' }}>{b.fullName}</Link>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{new Date(b.birthDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} · {b.age} yaş</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-bold flex-shrink-0 ${b.daysUntil <= 3 ? 'bg-red-100 text-red-600' : b.daysUntil <= 7 ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {b.daysUntil === 1 ? 'Yarın' : `${b.daysUntil}g`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>Yaklaşan Hatırlatıcılar</p>
            <Link to="/reminders" className="flex items-center gap-1 text-xs font-semibold hover:opacity-70 transition-opacity" style={{ color: 'var(--accent)' }}>Tümü <ArrowIcon /></Link>
          </div>
          {upcomingReminders.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ background: 'rgba(82,96,247,0.08)', color: 'var(--accent)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Hatırlatıcı yok</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {upcomingReminders.map(r => (
                <li key={r.id} className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>{new Date(r.reminderDate).toLocaleString('tr-TR')}</p>
                  </div>
                  {r.isRecurring && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1" style={{ background: 'rgba(82,96,247,0.10)', color: 'var(--accent)' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
                      Tekrar
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  ), [recentNotifications, upcomingBirthdays, upcomingReminders, canManage, navigate]);

  const WIDGET_MAP = useMemo(() => ({ charts: chartsWidget, recentItems: recentItemsWidget, activityItems: activityItemsWidget }), [chartsWidget, recentItemsWidget, activityItemsWidget]);

  if (loading) return <DashboardSkeleton />;

  const todayStr = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="animate-fade-in">

      {/* ── GREETING BANNER ──────────────────────────────────────── */}
      <div className="greeting-banner animate-fade-up">
        {/* Birthday overlay */}
        {todayBirthdays.length > 0 && (
          <div className="absolute top-4 right-6 flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
            <span className="w-6 h-6 flex items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>
            </span>
            <span className="text-xs font-semibold text-white">{todayBirthdays.map(b => b.fullName).join(', ')} — Bugün doğum günü!</span>
          </div>
        )}
        <p className="text-white/60 text-sm font-medium mb-1 relative z-10">{todayStr}</p>
        <h1 className="text-white font-black text-4xl relative z-10" style={{ fontFamily: 'Syne, sans-serif', letterSpacing: '-1px' }}>
          {timeGreeting()}, <span style={{ opacity: 0.9 }}>{user?.username}</span>
        </h1>
        <p className="text-white/60 text-sm mt-2 relative z-10">
          {stats.activeTasks > 0
            ? `${stats.activeTasks} aktif görev seni bekliyor.`
            : 'Bugün harika bir gün!'}
        </p>
      </div>

      {/* ── METRIC CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger">
        {cards.map((card, i) => <MetricCard key={card.label} card={card} index={i} />)}
      </div>

      {/* ── DRAGGABLE WIDGETS ────────────────────────────────────── */}
      <div className="space-y-6">
        {widgetOrder.map(widgetId => {
          const content = WIDGET_MAP[widgetId];
          if (!content) return null;
          return (
            <div key={widgetId}
              draggable
              onDragStart={e => handleDragStart(e, widgetId)}
              onDragOver={e => handleDragOver(e, widgetId)}
              onDrop={e => handleDrop(e, widgetId)}
              onDragEnd={handleDragEnd}
              className={`transition-all duration-150 ${dragging === widgetId ? 'opacity-50 scale-[0.99]' : ''} ${dragOver === widgetId && dragging !== widgetId ? 'ring-2 ring-indigo-400 ring-offset-2 rounded-2xl' : ''}`}>
              <div className="flex items-center gap-1.5 mb-2.5 select-none">
                <DragHandle />
                <span className="widget-label">{WIDGET_LABELS[widgetId]}</span>
              </div>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
