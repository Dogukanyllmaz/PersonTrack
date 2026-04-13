import { useState, useEffect } from 'react';
import { getActivityLog } from '../services/api';

const ACTION_COLORS = {
  Create: 'bg-green-100 text-green-700',
  Update: 'bg-blue-100 text-blue-700',
  Delete: 'bg-red-100 text-red-700',
  Login: 'bg-purple-100 text-purple-700',
  Complete: 'bg-teal-100 text-teal-700'
};

const ENTITY_ICONS = {
  Person: '👤',
  Meeting: '📅',
  Task: '✅',
  User: '🔑',
  Document: '📄',
  Note: '📝'
};

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [loading, setLoading] = useState(false);
  const pageSize = 50;

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, pageSize };
      if (entityType) params.entityType = entityType;
      const res = await getActivityLog(params);
      setLogs(res.data.items);
      setTotal(res.data.total);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, entityType]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Aktivite Günlüğü</h2>
        <select value={entityType} onChange={e => { setEntityType(e.target.value); setPage(1); }}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
          <option value="">Tüm İşlemler</option>
          <option value="Person">Kişiler</option>
          <option value="Meeting">Toplantılar</option>
          <option value="Task">Görevler</option>
          <option value="User">Kullanıcılar</option>
          <option value="Document">Evraklar</option>
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Yükleniyor...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-3xl mb-2">📜</p>
            <p>Kayıt bulunamadı</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kullanıcı</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">İşlem</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kayıt</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Detay</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{log.userName}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-600'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span>{ENTITY_ICONS[log.entityType] || '📌'}</span>
                      <div>
                        <p className="text-gray-800">{log.entityName}</p>
                        <p className="text-xs text-gray-400">{log.entityType}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{log.details || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('tr-TR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
          <p>{total} kayıt</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-40">Önceki</button>
            <span className="px-3 py-1">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-40">Sonraki</button>
          </div>
        </div>
      )}
    </div>
  );
}
