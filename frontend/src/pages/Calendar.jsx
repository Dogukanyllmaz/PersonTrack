import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMeetings, getTasks } from '../services/api';
import { useAuth } from '../context/AuthContext';

const MONTHS = ['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const DAYS = ['Pzt','Sal','Çar','Per','Cum','Cmt','Paz'];

function buildCalendar(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Monday-based: 0=Mon..6=Sun
  let startDow = firstDay.getDay(); // 0=Sun..6=Sat
  startDow = startDow === 0 ? 6 : startDow - 1;

  const days = [];
  // Leading empty cells
  for (let i = 0; i < startDow; i++) days.push(null);
  // Month days
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
  return days;
}

function dateKey(d) {
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export default function Calendar() {
  const { canManage } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [meetings, setMeetings] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    getMeetings().then(r => setMeetings(r.data)).catch(() => {});
    if (canManage) getTasks().then(r => setTasks(r.data)).catch(() => {});
  }, [canManage]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDate(null);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelectedDate(null); };

  // Index events by date key
  const meetingsByDate = {};
  meetings.forEach(m => {
    const k = dateKey(new Date(m.meetingDate));
    if (!meetingsByDate[k]) meetingsByDate[k] = [];
    meetingsByDate[k].push(m);
  });

  const tasksByDate = {};
  tasks.forEach(t => {
    if (t.dueDate) {
      const k = dateKey(new Date(t.dueDate));
      if (!tasksByDate[k]) tasksByDate[k] = [];
      tasksByDate[k].push(t);
    }
  });

  const calDays = buildCalendar(year, month);
  const todayKey = dateKey(today);

  // Selected day events
  const selKey = selectedDate ? dateKey(selectedDate) : null;
  const selMeetings = selKey ? (meetingsByDate[selKey] || []) : [];
  const selTasks = selKey ? (tasksByDate[selKey] || []) : [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Takvim</h2>
        <button onClick={goToday} className="text-sm px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600">
          Bugün
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {/* Month navigator */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 font-bold text-lg">‹</button>
          <h3 className="text-lg font-semibold text-gray-800">{MONTHS[month]} {year}</h3>
          <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 font-bold text-lg">›</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAYS.map(d => (
            <div key={d} className="text-center py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {calDays.map((day, i) => {
            if (!day) return <div key={`e-${i}`} className="h-24 border-b border-r border-gray-50 bg-gray-50/50" />;

            const k = dateKey(day);
            const isToday = k === todayKey;
            const isSelected = k === selKey;
            const dayMeetings = meetingsByDate[k] || [];
            const dayTasks = tasksByDate[k] || [];
            const hasEvents = dayMeetings.length > 0 || dayTasks.length > 0;

            return (
              <div
                key={k}
                onClick={() => setSelectedDate(day)}
                className={`h-24 border-b border-r border-gray-100 p-1.5 cursor-pointer transition-colors ${
                  isSelected ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                }`}
              >
                <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-blue-600 text-white' : 'text-gray-700'
                }`}>
                  {day.getDate()}
                </div>
                <div className="space-y-0.5 overflow-hidden">
                  {dayMeetings.slice(0, 2).map(m => (
                    <div key={m.id} className="text-xs bg-blue-100 text-blue-700 rounded px-1 truncate leading-4">
                      {m.title}
                    </div>
                  ))}
                  {dayTasks.slice(0, 2).map(t => (
                    <div key={t.id} className={`text-xs rounded px-1 truncate leading-4 ${
                      t.priority === 'Critical' ? 'bg-red-100 text-red-700' :
                      t.priority === 'High' ? 'bg-orange-100 text-orange-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      ✓ {t.title}
                    </div>
                  ))}
                  {(dayMeetings.length + dayTasks.length > 4) && (
                    <div className="text-xs text-gray-400">+{dayMeetings.length + dayTasks.length - 4} daha</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day detail */}
      {selectedDate && (selMeetings.length > 0 || selTasks.length > 0) && (
        <div className="mt-4 bg-white rounded-xl shadow-sm border p-5">
          <h3 className="font-semibold text-gray-800 mb-4">
            {selectedDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' })}
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {selMeetings.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-blue-700 mb-2">📅 Toplantılar</h4>
                <ul className="space-y-2">
                  {selMeetings.map(m => (
                    <li key={m.id}>
                      <Link to={`/meetings/${m.id}`} className="block bg-blue-50 hover:bg-blue-100 rounded-lg p-3 transition-colors">
                        <p className="text-sm font-medium text-gray-800">{m.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(m.meetingDate).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                          {' · '}
                          <span className={m.status === 'Completed' ? 'text-green-600' : 'text-amber-600'}>
                            {m.status === 'Completed' ? 'Tamamlandı' : 'Planlandı'}
                          </span>
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {selTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-amber-700 mb-2">✅ Son Tarihli Görevler</h4>
                <ul className="space-y-2">
                  {selTasks.map(t => (
                    <li key={t.id} className={`rounded-lg p-3 ${
                      t.priority === 'Critical' ? 'bg-red-50' :
                      t.priority === 'High' ? 'bg-orange-50' : 'bg-amber-50'
                    }`}>
                      <p className="text-sm font-medium text-gray-800">{t.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t.personName} ·
                        <span className={`ml-1 ${
                          t.priority === 'Critical' ? 'text-red-600' :
                          t.priority === 'High' ? 'text-orange-600' :
                          t.priority === 'Medium' ? 'text-blue-600' : 'text-gray-600'
                        }`}>
                          {t.priority === 'Critical' ? 'Kritik' : t.priority === 'High' ? 'Yüksek' :
                           t.priority === 'Medium' ? 'Orta' : 'Düşük'}
                        </span>
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedDate && selMeetings.length === 0 && selTasks.length === 0 && (
        <div className="mt-4 bg-white rounded-xl shadow-sm border p-5 text-center text-gray-400 text-sm">
          Bu gün için planlanmış toplantı veya görev yok.
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex gap-4 text-xs text-gray-500">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 inline-block" /> Toplantı</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-100 inline-block" /> Görev son tarihi</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-100 inline-block" /> Kritik/Yüksek öncelik</span>
      </div>
    </div>
  );
}
