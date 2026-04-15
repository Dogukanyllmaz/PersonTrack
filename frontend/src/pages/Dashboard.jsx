import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { getPersons, getMeetings, getTasks, getUpcomingBirthdays, getNotifications, getReminders, getErrorMessage } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const PRIORITY_COLORS = {
  Low: 'bg-gray-100 text-gray-600',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700'
};
const PRIORITY_LABELS = { Low: 'Düşük', Medium: 'Orta', High: 'Yüksek', Critical: 'Kritik' };

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];
const PRIORITY_BAR_COLORS = { Low: '#94a3b8', Medium: '#3b82f6', High: '#f97316', Critical: '#ef4444' };

const DEFAULT_WIDGET_ORDER = ['charts', 'recentItems', 'activityItems'];

function buildMonthlyMeetingData(meetings) {
  const now = new Date();
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      name: d.toLocaleDateString('tr-TR', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
      toplantı: 0
    });
  }
  meetings.forEach(m => {
    const d = new Date(m.meetingDate);
    const entry = months.find(x => x.year === d.getFullYear() && x.month === d.getMonth());
    if (entry) entry.toplantı++;
  });
  return months;
}

function DragHandle() {
  return (
    <span
      title="Sürükleyerek taşı"
      className="cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 select-none text-lg leading-none px-1"
      style={{ touchAction: 'none' }}
    >
      ⠿
    </span>
  );
}

export default function Dashboard() {
  const { user, canManage } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ persons: 0, meetings: 0, tasks: 0, activeTasks: 0 });
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [allMeetings, setAllMeetings] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);

  // Widget order — persisted to localStorage
  const [widgetOrder, setWidgetOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('dashboard_widget_order');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === DEFAULT_WIDGET_ORDER.length) return parsed;
      }
    } catch {}
    return DEFAULT_WIDGET_ORDER;
  });

  // Drag state
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const handleDragStart = (e, id) => {
    setDragging(id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragOver) setDragOver(id);
  };
  const handleDrop = (e, id) => {
    e.preventDefault();
    if (!dragging || dragging === id) { setDragging(null); setDragOver(null); return; }
    const newOrder = [...widgetOrder];
    const from = newOrder.indexOf(dragging);
    const to = newOrder.indexOf(id);
    newOrder.splice(from, 1);
    newOrder.splice(to, 0, dragging);
    setWidgetOrder(newOrder);
    localStorage.setItem('dashboard_widget_order', JSON.stringify(newOrder));
    setDragging(null);
    setDragOver(null);
  };
  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  useEffect(() => {
    const promises = [getMeetings(), getTasks({ status: 'Active' })];
    if (canManage) {
      promises.push(getPersons(), getTasks(), getUpcomingBirthdays(30));
    }

    Promise.allSettled(promises).then((results) => {
      const meetings = results[0].status === 'fulfilled' ? results[0].value.data : [];
      const activeTasks = results[1].status === 'fulfilled' ? results[1].value.data : [];

      setRecentMeetings(meetings.slice(0, 5));
      setPendingTasks(activeTasks.slice(0, 5));
      setAllMeetings(meetings);

      if (canManage) {
        const persons = results[2].status === 'fulfilled' ? results[2].value.data : [];
        const tasks = results[3].status === 'fulfilled' ? results[3].value.data : [];
        const bdays = results[4].status === 'fulfilled' ? results[4].value.data : [];
        setStats({
          persons: persons.length,
          meetings: meetings.length,
          tasks: tasks.length,
          activeTasks: activeTasks.length,
        });
        setAllTasks(tasks);
        setBirthdays(bdays);
      } else {
        setStats(s => ({ ...s, meetings: meetings.length, activeTasks: activeTasks.length }));
        setAllTasks(activeTasks);
      }
    });

    getNotifications(true).then(r => setRecentNotifications(r.data.slice(0, 5))).catch(() => {});
    getReminders().then(r => setUpcomingReminders(r.data.slice(0, 5))).catch(() => {});
    setLoading(false);
  }, [canManage]);

  // Chart data
  const taskStatusData = (() => {
    const active = allTasks.filter(t => t.status === 'Active').length;
    const completed = allTasks.filter(t => t.status === 'Completed').length;
    return [
      { name: 'Aktif', value: active },
      { name: 'Tamamlandı', value: completed },
    ].filter(d => d.value > 0);
  })();

  const taskPriorityData = ['Low', 'Medium', 'High', 'Critical'].map(p => ({
    name: PRIORITY_LABELS[p],
    sayı: allTasks.filter(t => t.priority === p).length,
    fill: PRIORITY_BAR_COLORS[p]
  })).filter(d => d.sayı > 0);

  const monthlyMeetingData = buildMonthlyMeetingData(allMeetings);

  const cards = [
    ...(canManage ? [
      { label: 'Toplam Kişi', value: stats.persons, to: '/persons',
        gradient: 'from-blue-500 to-cyan-500', icon: '👥', desc: 'kayıtlı kişi' },
    ] : []),
    { label: 'Toplantılar', value: stats.meetings, to: '/meetings',
      gradient: 'from-violet-500 to-purple-600', icon: '📅', desc: 'toplantı' },
    { label: 'Aktif Görevler', value: stats.activeTasks, to: canManage ? '/tasks' : '/timeline',
      gradient: 'from-amber-500 to-orange-500', icon: '⚡', desc: 'bekleyen görev' },
    ...(canManage ? [
      { label: 'Toplam Görev', value: stats.tasks, to: '/tasks',
        gradient: 'from-emerald-500 to-green-600', icon: '📋', desc: 'toplam görev' },
    ] : []),
  ];

  const todayBirthdays = birthdays.filter(b => b.isToday);
  const upcomingBirthdays = birthdays.filter(b => !b.isToday);
  const TYPE_ICONS = { task_assigned: '📋', task_overdue: '⚠️', meeting_reminder: '📅', birthday: '🎂', reminder: '🔔', system: 'ℹ️' };

  // ── Widget render functions ──────────────────────────────────────────────

  const chartsWidget = canManage && (allTasks.length > 0 || allMeetings.length > 0) ? (
    <div className="grid lg:grid-cols-3 gap-6">
      {taskStatusData.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-sm uppercase tracking-wide mb-4" style={{ color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>Görev Durumu</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                {taskStatusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
              </Pie>
              <Tooltip formatter={(v, n) => [v, n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-2">
            {taskStatusData.map((d, i) => (
              <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>
      )}
      {taskPriorityData.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-sm uppercase tracking-wide mb-4" style={{ color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>Öncelik Dağılımı</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={taskPriorityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="sayı" radius={[4, 4, 0, 0]}>
                {taskPriorityData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="card p-5">
        <h3 className="font-bold text-sm uppercase tracking-wide mb-4" style={{ color: 'var(--text-secondary)', letterSpacing: '0.06em' }}>Aylık Toplantılar (6 ay)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthlyMeetingData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="toplantı" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  ) : null;

  const recentItemsWidget = (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Son Toplantılar</h3>
          <Link to="/meetings" className="text-sm text-blue-600 hover:underline">Tümünü gör</Link>
        </div>
        {recentMeetings.length === 0 ? (
          <div className="text-center py-6 text-gray-400 dark:text-gray-500">
            <p className="text-2xl mb-1">📅</p>
            <p className="text-sm">Yaklaşan toplantı yok</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {recentMeetings.map((m) => (
              <li key={m.id} className="flex items-center justify-between">
                <div>
                  <Link to={`/meetings/${m.id}`} className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600">
                    {m.title}
                  </Link>
                  <p className="text-xs text-gray-400">{new Date(m.meetingDate).toLocaleDateString('tr-TR')}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  m.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {m.status === 'Completed' ? 'Tamamlandı' : 'Planlandı'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">Aktif Görevler</h3>
          {canManage && <Link to="/tasks" className="text-sm text-blue-600 hover:underline">Tümünü gör</Link>}
        </div>
        {pendingTasks.length === 0 ? (
          <div className="text-center py-6 text-gray-400 dark:text-gray-500">
            <p className="text-2xl mb-1">✅</p>
            <p className="text-sm">Atanmış görev yok</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {pendingTasks.map((t) => (
              <li key={t.id} className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t.title}</p>
                  <p className="text-xs text-gray-400">{t.personName}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[t.priority] || 'bg-gray-100 text-gray-600'}`}>
                  {PRIORITY_LABELS[t.priority] || t.priority}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  const activityItemsWidget = (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">🔔 Okunmamış Bildirimler</h3>
          <Link to="/notifications" className="text-sm text-blue-600 hover:underline">Tümünü gör</Link>
        </div>
        {recentNotifications.length === 0 ? (
          <div className="text-center py-6 text-gray-400 dark:text-gray-500">
            <p className="text-2xl mb-1">🔔</p>
            <p className="text-sm">Okunmamış bildirim yok</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {recentNotifications.map(n => (
              <li key={n.id} className="flex gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-1 -mx-1"
                onClick={() => navigate(n.link || '/notifications')}>
                <span className="text-lg">{TYPE_ICONS[n.type] || 'ℹ️'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{n.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{n.message}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManage && upcomingBirthdays.length > 0 ? (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">🎁 Yaklaşan Doğum Günleri</h3>
            <span className="text-xs text-gray-400">30 gün içinde</span>
          </div>
          <ul className="space-y-3">
            {upcomingBirthdays.slice(0, 5).map((b) => (
              <li key={b.id} className="flex items-center gap-3">
                {b.photoUrl ? (
                  <img src={b.photoUrl} alt={b.fullName} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold flex-shrink-0">
                    {b.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link to={`/persons/${b.id}`} className="text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 block truncate">
                    {b.fullName}
                  </Link>
                  <p className="text-xs text-gray-400">
                    {new Date(b.birthDate).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}
                    {' · '}{b.age} yaşına girecek
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${
                  b.daysUntil <= 3 ? 'bg-red-100 text-red-600' : b.daysUntil <= 7 ? 'bg-amber-100 text-amber-600' : 'bg-purple-100 text-purple-600'
                }`}>
                  {b.daysUntil === 1 ? 'Yarın' : `${b.daysUntil} gün`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">🔔 Yaklaşan Hatırlatıcılar</h3>
            <Link to="/reminders" className="text-sm text-blue-600 hover:underline">Tümünü gör</Link>
          </div>
          {upcomingReminders.length === 0 ? (
            <div className="text-center py-6 text-gray-400 dark:text-gray-500">
              <p className="text-2xl mb-1">🔔</p>
              <p className="text-sm">Hatırlatıcı yok</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {upcomingReminders.map(r => (
                <li key={r.id} className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{r.title}</p>
                    <p className="text-xs text-gray-400">{new Date(r.reminderDate).toLocaleString('tr-TR')}</p>
                  </div>
                  {r.isRecurring && <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">🔄</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );

  const WIDGET_MAP = {
    charts: chartsWidget,
    recentItems: recentItemsWidget,
    activityItems: activityItemsWidget,
  };

  const WIDGET_LABELS = {
    charts: 'Grafikler',
    recentItems: 'Son Toplantılar & Görevler',
    activityItems: 'Bildirimler & Hatırlatıcılar',
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center text-gray-500 dark:text-gray-400">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Dashboard yükleniyor...</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Merhaba, <span className="gradient-text">{user?.username}</span> 👋
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">
            {new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Birthday banner */}
      {todayBirthdays.length > 0 && (
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-5 mb-6 text-white shadow">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🎂</span>
            <div>
              <p className="font-bold text-lg">Bugün Doğum Günü Var!</p>
              <p className="text-purple-100 text-sm">
                {todayBirthdays.map(b => `${b.fullName} (${b.age} yaş)`).join(', ')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((c, i) => (
          <Link key={c.label} to={c.to}
            className={`block animate-fade-up animate-delay-${(i+1)*100}`}>
            <div className={`noise relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.gradient} p-5 cursor-pointer`}
              style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)', transition: 'transform 0.2s, box-shadow 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 16px 48px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)'; }}>
              {/* Orb decorations */}
              <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10 blur-sm" />
              <div className="absolute -bottom-8 -left-4 w-24 h-24 rounded-full bg-black/10" />
              <div className="relative">
                <div className="flex items-center justify-between mb-5">
                  <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center text-2xl"
                    style={{ backdropFilter: 'blur(8px)' }}>
                    {c.icon}
                  </div>
                  <span className="text-white/60 text-xs bg-black/15 px-2.5 py-1 rounded-full font-medium">
                    {c.desc}
                  </span>
                </div>
                <p className="text-white font-black leading-none mb-1.5"
                  style={{ fontSize: '42px', letterSpacing: '-2px' }}>
                  {c.value}
                </p>
                <p className="text-white/75 font-semibold text-sm">{c.label}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Draggable widget sections */}
      <div className="space-y-6">
        {widgetOrder.map((widgetId) => {
          const content = WIDGET_MAP[widgetId];
          if (!content) return null;
          return (
            <div
              key={widgetId}
              draggable
              onDragStart={e => handleDragStart(e, widgetId)}
              onDragOver={e => handleDragOver(e, widgetId)}
              onDrop={e => handleDrop(e, widgetId)}
              onDragEnd={handleDragEnd}
              className={`transition-all duration-150 ${
                dragging === widgetId ? 'opacity-50 scale-[0.99]' : ''
              } ${
                dragOver === widgetId && dragging !== widgetId
                  ? 'ring-2 ring-blue-400 ring-offset-2 rounded-xl'
                  : ''
              }`}
            >
              {/* Widget header with drag handle */}
              <div className="flex items-center gap-1 mb-2 select-none">
                <DragHandle />
                <span className="text-xs text-gray-400 dark:text-gray-500">{WIDGET_LABELS[widgetId]}</span>
              </div>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
