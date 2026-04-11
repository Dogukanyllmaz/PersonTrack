import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getPersons, getMeetings, getTasks, getUpcomingBirthdays } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user, canManage } = useAuth();
  const [stats, setStats] = useState({ persons: 0, meetings: 0, tasks: 0, activeTasks: 0 });
  const [recentMeetings, setRecentMeetings] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [birthdays, setBirthdays] = useState([]);

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

      if (canManage) {
        const persons = results[2].status === 'fulfilled' ? results[2].value.data : [];
        const allTasks = results[3].status === 'fulfilled' ? results[3].value.data : [];
        const bdays = results[4].status === 'fulfilled' ? results[4].value.data : [];
        setStats({
          persons: persons.length,
          meetings: meetings.length,
          tasks: allTasks.length,
          activeTasks: activeTasks.length,
        });
        setBirthdays(bdays);
      } else {
        setStats(s => ({
          ...s,
          meetings: meetings.length,
          activeTasks: activeTasks.length,
        }));
      }
    });
  }, [canManage]);

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

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Merhaba, {user?.username} 👋</h2>
        <p className="text-gray-500 mt-1">PersonTrack sistemine hoş geldiniz.</p>
      </div>

      {/* Bugün doğum günü olanlar — banner */}
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

      {/* Stats */}
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

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Son Toplantılar */}
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

        {/* Aktif Görevler veya Yaklaşan Doğum Günleri */}
        {canManage && upcomingBirthdays.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-800">🎁 Yaklaşan Doğum Günleri</h3>
              <span className="text-xs text-gray-400">30 gün içinde</span>
            </div>
            <ul className="space-y-3">
              {upcomingBirthdays.slice(0, 6).map((b) => (
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
                    b.daysUntil <= 3
                      ? 'bg-red-100 text-red-600'
                      : b.daysUntil <= 7
                      ? 'bg-amber-100 text-amber-600'
                      : 'bg-purple-100 text-purple-600'
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
                    <p className="text-xs text-gray-400">{new Date(t.assignedDate).toLocaleDateString('tr-TR')}</p>
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
