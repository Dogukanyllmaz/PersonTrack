import { useState, useEffect } from 'react';
import { getNotifications, markNotificationRead, markAllNotificationsRead, deleteNotification } from '../services/api';
import { useNavigate } from 'react-router-dom';

const TYPE_ICONS = {
  task_assigned: '📋',
  task_overdue: '⚠️',
  meeting_reminder: '📅',
  birthday: '🎂',
  reminder: '🔔',
  system: 'ℹ️'
};

const TYPE_LABELS = {
  task_assigned: 'Görev',
  task_overdue: 'Gecikme',
  meeting_reminder: 'Toplantı',
  birthday: 'Doğum Günü',
  reminder: 'Hatırlatıcı',
  system: 'Sistem'
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    try {
      const res = await getNotifications(unreadOnly);
      setNotifications(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [unreadOnly]);

  const handleClick = async (n) => {
    if (!n.isRead) {
      try {
        await markNotificationRead(n.id);
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, isRead: true } : x));
      } catch {}
    }
    if (n.link) navigate(n.link);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    await deleteNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Bildirimler</h2>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)}
              className="w-4 h-4 rounded" />
            Sadece okunmamış
          </label>
          <button onClick={handleMarkAllRead}
            className="text-sm text-blue-600 hover:underline">Tümünü okundu işaretle</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-400">
          <p className="text-4xl mb-3">🔔</p>
          <p>Bildirim bulunamadı</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              className={`bg-white rounded-xl border shadow-sm p-4 flex gap-4 cursor-pointer hover:bg-gray-50 transition-colors ${!n.isRead ? 'border-blue-200 bg-blue-50 hover:bg-blue-100' : ''}`}
            >
              <span className="text-2xl flex-shrink-0">{TYPE_ICONS[n.type] || 'ℹ️'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-gray-900">{n.title}</p>
                    <p className="text-sm text-gray-600 mt-0.5">{n.message}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!n.isRead && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                    <button
                      onClick={e => handleDelete(e, n.id)}
                      className="text-gray-300 hover:text-red-400 text-lg leading-none"
                    >×</button>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                    {TYPE_LABELS[n.type] || n.type}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(n.createdAt).toLocaleString('tr-TR')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
