import { useState, useEffect, useCallback } from 'react';
import { getActivityLog, getActivityLogStats, getActivityLogUsers, exportPersons } from '../services/api';

const ACTION_COLORS = {
  Create:          'bg-green-100 text-green-700',
  Update:          'bg-blue-100 text-blue-700',
  Delete:          'bg-red-100 text-red-700',
  Login:           'bg-purple-100 text-purple-700',
  Logout:          'bg-gray-100 text-gray-600',
  Complete:        'bg-teal-100 text-teal-700',
  Import:          'bg-orange-100 text-orange-700',
  SetUserRole:     'bg-yellow-100 text-yellow-700',
  ToggleUserActive:'bg-pink-100 text-pink-700',
  ChangePassword:  'bg-indigo-100 text-indigo-700',
  ResetPassword:   'bg-indigo-100 text-indigo-700',
  UploadPhoto:     'bg-sky-100 text-sky-700',
  UploadDocument:  'bg-sky-100 text-sky-700',
  AddRelationship: 'bg-violet-100 text-violet-700',
};

const ENTITY_ICONS = {
  Person: '👤',
  Meeting: '📅',
  Task: '✅',
  User: '🔑',
  Auth: '🔐',
  Tag: '🏷️',
  Reminder: '🔔',
  Export: '📤',
  Search: '🔍',
};

const ENTITY_TYPES = ['Person','Meeting','Task','User','Auth','Tag','Reminder','Export'];
const ACTION_TYPES = ['Create','Update','Delete','Login','Logout','Complete','Import','SetUserRole','ToggleUserActive','ChangePassword','ResetPassword'];

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

export default function ActivityLog() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Stats
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [showStats, setShowStats] = useState(true);

  const pageSize = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, pageSize };
      if (entityType) params.entityType = entityType;
      if (action)     params.action = action;
      if (userId)     params.userId = userId;
      if (search)     params.search = search;
      if (from)       params.from = from;
      if (to)         params.to = to;
      const res = await getActivityLog(params);
      setLogs(res.data.items);
      setTotal(res.data.total);
    } finally { setLoading(false); }
  }, [page, pageSize, entityType, action, userId, search, from, to]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getActivityLogStats(7).then(r => setStats(r.data)).catch(() => {});
    getActivityLogUsers().then(r => setUsers(r.data)).catch(() => {});
  }, []);

  const resetFilters = () => {
    setEntityType(''); setAction(''); setUserId('');
    setSearch(''); setSearchInput(''); setFrom(''); setTo('');
    setPage(1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);
  const hasFilters = entityType || action || userId || search || from || to;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Aktivite Günlüğü</h2>
          <p className="text-sm text-gray-500 mt-0.5">Sistemdeki tüm işlemlerin kaydı</p>
        </div>
        <button onClick={() => setShowStats(s => !s)}
          className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50 text-gray-600">
          {showStats ? 'İstatistikleri Gizle' : 'İstatistikleri Göster'}
        </button>
      </div>

      {/* Stats Widget */}
      {showStats && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label={`Son ${stats.days} gün işlem`} value={stats.total}
              color="bg-slate-50 text-slate-800 border-slate-200" />
            <StatCard label="En aktif işlem"
              value={stats.byAction?.[0]?.action ?? '-'}
              color="bg-blue-50 text-blue-800 border-blue-200" />
            <StatCard label="En aktif kullanıcı"
              value={stats.topUsers?.[0]?.userName ?? '-'}
              color="bg-purple-50 text-purple-800 border-purple-200" />
            <StatCard label="Kritik işlem (son 7 gün)"
              value={stats.recentCritical?.length ?? 0}
              color="bg-red-50 text-red-800 border-red-200" />
          </div>

          {stats.recentCritical?.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-red-700 mb-3">Son Kritik İşlemler</p>
              <div className="space-y-2">
                {stats.recentCritical.map(c => (
                  <div key={c.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ACTION_COLORS[c.action] || 'bg-gray-100 text-gray-600'}`}>
                        {c.action}
                      </span>
                      <span className="text-red-800 font-medium">{c.entityName}</span>
                      <span className="text-red-500 text-xs">({c.entityType})</span>
                    </div>
                    <div className="flex items-center gap-3 text-red-400 text-xs">
                      <span>{c.userName}</span>
                      {c.ipAddress && <span className="font-mono">{c.ipAddress}</span>}
                      <span>{new Date(c.createdAt).toLocaleString('tr-TR')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <select value={entityType} onChange={e => { setEntityType(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
            <option value="">Tüm Kategoriler</option>
            {ENTITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select value={action} onChange={e => { setAction(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
            <option value="">Tüm İşlemler</option>
            {ACTION_TYPES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          <select value={userId} onChange={e => { setUserId(e.target.value); setPage(1); }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300">
            <option value="">Tüm Kullanıcılar</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.username} ({u.role})</option>)}
          </select>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Ara..." className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
            <button type="submit" className="px-3 py-2 bg-slate-700 text-white rounded-lg text-sm hover:bg-slate-800">Ara</button>
          </form>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-center">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">Başlangıç</label>
            <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPage(1); }}
              className="flex-1 border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 whitespace-nowrap">Bitiş</label>
            <input type="date" value={to} onChange={e => { setTo(e.target.value); setPage(1); }}
              className="flex-1 border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300" />
          </div>
          <div />
          {hasFilters && (
            <button onClick={resetFilters}
              className="text-sm text-red-500 hover:text-red-700 border border-red-200 rounded-lg px-3 py-2 hover:bg-red-50">
              Filtreleri Temizle
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Yükleniyor...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <p className="text-3xl mb-2">📜</p>
            <p>Kayıt bulunamadı</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Kullanıcı</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">İşlem</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Kayıt</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Detay</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">IP Adresi</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{log.userName}</p>
                      {log.userEmail && log.userEmail !== '?' && (
                        <p className="text-xs text-gray-400">{log.userEmail}</p>
                      )}
                      {log.userRole && log.userRole !== '?' && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{log.userRole}</span>
                      )}
                    </td>
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
                    <td className="px-4 py-3 text-gray-500 max-w-xs">
                      <p className="truncate">{log.details || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {log.ipAddress ? (
                        <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {log.ipAddress}
                        </span>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                      {new Date(log.createdAt).toLocaleString('tr-TR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-600">
        <p>{total} kayıt{hasFilters && ' (filtrelenmiş)'}</p>
        {totalPages > 1 && (
          <div className="flex gap-2">
            <button onClick={() => setPage(1)} disabled={page === 1}
              className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-40">«</button>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-40">Önceki</button>
            <span className="px-3 py-1">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-3 py-1 border rounded-lg hover:bg-gray-50 disabled:opacity-40">Sonraki</button>
            <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
              className="px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-40">»</button>
          </div>
        )}
      </div>
    </div>
  );
}
