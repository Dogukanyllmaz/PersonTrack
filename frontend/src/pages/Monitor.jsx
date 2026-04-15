import { useState, useEffect, useCallback } from 'react';
import { getSystemMetrics } from '../services/api';

function StatCard({ label, value, sub, color = 'slate' }) {
  const colors = {
    slate:  'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    green:  'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    blue:   'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    amber:  'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color] ?? colors.slate}`}>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function DbRow({ label, value, icon }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
      <div className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
        <span>{icon}</span> {label}
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{value?.toLocaleString('tr-TR')}</span>
    </div>
  );
}

function HealthBadge({ status }) {
  const map = {
    Healthy:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    Degraded:  'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    Unhealthy: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };
  const dot = { Healthy: 'bg-green-500', Degraded: 'bg-amber-500', Unhealthy: 'bg-red-500' };
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${map[status] ?? map.Unhealthy}`}>
      <span className={`w-2 h-2 rounded-full animate-pulse ${dot[status] ?? dot.Unhealthy}`} />
      {status}
    </span>
  );
}

export default function Monitor() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [countdown, setCountdown]     = useState(30);

  const load = useCallback(async () => {
    try {
      const res = await getSystemMetrics();
      setData(res.data);
      setLastRefresh(new Date());
      setCountdown(30);
    } catch {
      setData(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  // Countdown display
  useEffect(() => {
    const t = setInterval(() => setCountdown(c => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [lastRefresh]);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
      <div className="text-center">
        <p className="text-3xl mb-2 animate-spin">⚙️</p>
        <p className="text-sm">Sistem metrikleri yükleniyor...</p>
      </div>
    </div>
  );

  if (!data) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center text-red-500 dark:text-red-400">
        <p className="text-3xl mb-2">⚠️</p>
        <p className="font-medium">Metrikler alınamadı</p>
        <button onClick={load} className="mt-3 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm hover:bg-red-200">
          Tekrar Dene
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Sistem İzleme</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {lastRefresh ? `Son güncelleme: ${lastRefresh.toLocaleTimeString('tr-TR')}` : ''} · {countdown}s sonra yenilenir
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HealthBadge status={data.status} />
          <button onClick={load}
            className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-gray-300 transition-colors">
            ↻ Yenile
          </button>
        </div>
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Uptime" value={data.uptime?.display} sub="başlatılmasından beri" color="green" />
        <StatCard label="Bellek (Working Set)" value={`${data.memory?.workingSetMb} MB`} sub={`GC Heap: ${data.memory?.gcHeapMb} MB`} color="blue" />
        <StatCard label="Son 24 Saat İşlem" value={data.activity?.last24Hours?.toLocaleString('tr-TR')} sub={`Son 7 gün: ${data.activity?.last7Days?.toLocaleString('tr-TR')}`} color="purple" />
        <StatCard label="İşlemci Çekirdeği" value={data.environment?.processorCount} sub={`.NET ${data.environment?.dotnetVersion}`} color="amber" />
      </div>

      {/* Main content */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Database */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
            🗄️ Veritabanı İstatistikleri
          </h3>
          <DbRow label="Kullanıcılar" value={data.database?.users} icon="👤" />
          <DbRow label="Aktif Kullanıcılar" value={data.database?.activeUsers} icon="✅" />
          <DbRow label="Kişiler" value={data.database?.persons} icon="👥" />
          <DbRow label="Toplantılar" value={data.database?.meetings} icon="📅" />
          <DbRow label="Görevler" value={data.database?.tasks} icon="✅" />
          <DbRow label="Mesajlar" value={data.database?.messages} icon="💬" />
          <DbRow label="Konuşmalar" value={data.database?.conversations} icon="📨" />
          <DbRow label="Okunmamış Bildirimler" value={data.database?.unreadNotifications} icon="🔔" />
          <DbRow label="Aktivite Kayıtları" value={data.database?.activityLogs} icon="📜" />
        </div>

        {/* GC + Server */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">⚙️ .NET Runtime</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'GC Gen 0', value: data.gc?.gen0?.toLocaleString('tr-TR') },
                { label: 'GC Gen 1', value: data.gc?.gen1?.toLocaleString('tr-TR') },
                { label: 'GC Gen 2', value: data.gc?.gen2?.toLocaleString('tr-TR') },
              ].map(r => (
                <div key={r.label} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className="text-gray-600 dark:text-gray-400">{r.label}</span>
                  <span className="font-mono font-medium text-gray-900 dark:text-gray-100">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">🌐 Sunucu</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Sunucu Saati', value: new Date(data.serverTime).toLocaleString('tr-TR') },
                { label: 'İşletim Sistemi', value: data.environment?.os },
                { label: '.NET Versiyonu', value: data.environment?.dotnetVersion },
              ].map(r => (
                <div key={r.label} className="flex justify-between py-1.5 border-b border-gray-100 dark:border-gray-700 last:border-0">
                  <span className="text-gray-600 dark:text-gray-400">{r.label}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent critical actions */}
      {data.recentCriticalActions?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">⚠️ Son Kritik İşlemler</h3>
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {data.recentCriticalActions.map((a, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                    {a.action}
                  </span>
                  <span className="text-gray-700 dark:text-gray-300">{a.entityName}</span>
                  <span className="text-gray-400 text-xs">({a.entityType})</span>
                </div>
                <span className="text-gray-400 text-xs">{new Date(a.createdAt).toLocaleString('tr-TR')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
