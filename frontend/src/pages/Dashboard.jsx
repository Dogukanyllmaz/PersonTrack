import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';
import { getPersons, getMeetings, getTasks, getUpcomingBirthdays, getNotifications, getReminders } from '../services/api';
import { useAuth } from '../context/AuthContext';

const PRIORITY_COLORS = {
  Low: 'bg-gray-100 text-gray-600',
  Medium: 'bg-blue-100 text-blue-700',
  High: 'bg-orange-100 text-orange-700',
  Critical: 'bg-red-100 text-red-700'
};
const PRIORITY_LABELS = { Low: 'Düşük', Medium: 'Orta', High: 'Yüksek', Critical: 'Kritik' };

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];
const PRIORITY_BAR_COLORS = { Low: '#94a3b8', Medium: '#3b82f6', High: '#f97316', Critical: '#ef4444' };

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

export default function Dashboard() {
  const { user, canManage } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ persons: 0, meetings: 0, tasks: 0, activeTasks: 0 });
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [allMeetings, setAllMeetings] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [upcomingReminders, setUpcomingReminders] = useState([]);

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
      { label: 'Toplam Kişi', value: stats.persons, to: '/persons', color: 'bg-blue-500', icon: '👥' },
    ] : []),
    { label: 'Toplantılar', value: stats.meetings, to: '/meetings', color: 'bg-purple-500', icon: '📅' },
    { label: 'Aktif Görevler', value: stats.activeTasks, to: canManage ? '/tasks' : '/timeline', color: 'bg-amber-500', icon: '✅' },
    ...(canManage ? [
      { label: 'Toplam Görev', value: stats.tasks, to: '/tasks', color: 'bg-green-500', icon: '📋' },
    ] : []),
  ];

  const todayBirthdays = birthdays.filter(b => b.isToday);
  const upcomingBirthdays = birthdays.filter(b => !b.isToday);
  const TYPE_ICONS = { task_assigned: '📋', task_overdue: '⚠️', meeting_reminder: '📅', birthday: '🎂', reminder: '🔔', system: 'ℹ️' };

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Merhaba, {user?.username} 👋</h2>
        <p className="text-gray-500 mt-1">PersonTrack sistemine hoş geldiniz.</p>
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
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="block">
            <div className="bg-white rounded-xl p-5 shadow-sm border hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-2xl">{c.icon}</span>
                <div className={`${c.color} text-white text-2xl font-bold rounded-lg w-12 h-12 flex items-center justify-center`}>
                  {c.value}
                </div>
              </div>
              <p className="text-gray-600 text-sm font-medium">{c.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Charts — only for admin/manager */}
      {canManage && (allTasks.length > 0 || allMeetings.length > 0) && (
        <div className="grid lg:grid-cols-3 gap-6 mb-6">
          {/* Task status pie */}
          {taskStatusData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Görev Durumu</h3>
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
                  <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                    {d.name} ({d.value})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Task priority bar */}
          {taskPriorityData.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Öncelik Dağılımı</h3>
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

          {/* Monthly meetings */}
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Aylık Toplantılar (6 ay)</h3>
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
      )}

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Recent meetings */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Son Toplantılar</h3>
            <Link to="/meetings" className="text-sm text-blue-600 hover:underline">Tümünü gör</Link>
          </div>
          {recentMeetings.length === 0 ? (
            <p className="text-gray-400 text-sm">Henüz toplantı yok.</p>
          ) : (
            <ul className="space-y-3">
              {recentMeetings.map((m) => (
                <li key={m.id} className="flex items-center justify-between">
                  <div>
                    <Link to={`/meetings/${m.id}`} className="text-sm font-medium text-gray-800 hover:text-blue-600">
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

        {/* Active tasks */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">Aktif Görevler</h3>
            {canManage && <Link to="/tasks" className="text-sm text-blue-600 hover:underline">Tümünü gör</Link>}
          </div>
          {pendingTasks.length === 0 ? (
            <p className="text-gray-400 text-sm">Aktif görev yok.</p>
          ) : (
            <ul className="space-y-3">
              {pendingTasks.map((t) => (
                <li key={t.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{t.title}</p>
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Unread notifications */}
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800">🔔 Okunmamış Bildirimler</h3>
            <Link to="/notifications" className="text-sm text-blue-600 hover:underline">Tümünü gör</Link>
          </div>
          {recentNotifications.length === 0 ? (
            <p className="text-gray-400 text-sm">Okunmamış bildirim yok.</p>
          ) : (
            <ul className="space-y-3">
              {recentNotifications.map(n => (
                <li key={n.id} className="flex gap-3 cursor-pointer hover:bg-gray-50 rounded-lg p-1 -mx-1"
                  onClick={() => navigate(n.link || '/notifications')}>
                  <span className="text-lg">{TYPE_ICONS[n.type] || 'ℹ️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{n.title}</p>
                    <p className="text-xs text-gray-500 truncate">{n.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Birthdays or reminders */}
        {canManage && upcomingBirthdays.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">🎁 Yaklaşan Doğum Günleri</h3>
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
                    <Link to={`/persons/${b.id}`} className="text-sm font-medium text-gray-800 hover:text-blue-600 block truncate">
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
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">🔔 Yaklaşan Hatırlatıcılar</h3>
              <Link to="/reminders" className="text-sm text-blue-600 hover:underline">Tümünü gör</Link>
            </div>
            {upcomingReminders.length === 0 ? (
              <p className="text-gray-400 text-sm">Aktif hatırlatıcı yok.</p>
            ) : (
              <ul className="space-y-3">
                {upcomingReminders.map(r => (
                  <li key={r.id} className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{r.title}</p>
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
    </div>
  );
}
