import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { getTimeline, getPersons } from '../services/api';

const TYPE_CONFIG = {
  meeting: { label: 'Toplantı', color: 'bg-purple-100 text-purple-700 border-purple-200', dot: 'bg-purple-500', icon: '📅' },
  task: { label: 'Görev', color: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-500', icon: '✅' },
  note: { label: 'Toplantı Notu', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500', icon: '📝' },
  relationship: { label: 'İlişki', color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500', icon: '🔗' },
};

const STATUS_LABELS = {
  Planned: 'Planlandı', Completed: 'Tamamlandı',
  Active: 'Aktif', Pending: 'Bekliyor'
};

export default function Timeline() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [persons, setPersons] = useState([]);
  const [personId, setPersonId] = useState(searchParams.get('personId') || '');
  const [types, setTypes] = useState({ meeting: true, task: true, note: true, relationship: true });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { getPersons().then(r => setPersons(r.data)); }, []);

  const load = async () => {
    setLoading(true);
    const activeTypes = Object.entries(types).filter(([, v]) => v).map(([k]) => k).join(',');
    const params = { types: activeTypes };
    if (personId) params.personId = personId;
    if (dateFrom) params.from = new Date(dateFrom).toISOString();
    if (dateTo) params.to = new Date(dateTo).toISOString();
    try {
      const res = await getTimeline(params);
      setEvents(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [personId, types, dateFrom, dateTo]);

  const filterPerson = persons.find(p => p.id === parseInt(personId));

  // Group by date
  const grouped = events.reduce((acc, ev) => {
    const key = new Date(ev.date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(ev);
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Zaman Tüneli</h2>
          {filterPerson && (
            <p className="text-sm text-gray-500 mt-1">Kişi: {filterPerson.fullName}</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Kişi</label>
            <select value={personId} onChange={e => { setPersonId(e.target.value); if(e.target.value) setSearchParams({personId: e.target.value}); else setSearchParams({}); }}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400">
              <option value="">Tümü</option>
              {persons.map(p => <option key={p.id} value={p.id}>{p.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Başlangıç</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Bitiş</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Tür</label>
            <div className="flex gap-2 mt-1">
              {Object.entries(TYPE_CONFIG).map(([key, conf]) => (
                <label key={key} className="flex items-center gap-1 cursor-pointer text-xs">
                  <input type="checkbox" checked={types[key]} onChange={e => setTypes(t => ({...t, [key]: e.target.checked}))} />
                  <span>{conf.icon}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {loading && <div className="text-gray-400 text-sm mb-4">Yükleniyor...</div>}

      {Object.keys(grouped).length === 0 && !loading ? (
        <div className="bg-white rounded-xl border p-12 text-center text-gray-400">
          Kayıt bulunamadı.
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayEvents]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-gray-200"></div>
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-3 py-1 rounded-full">{date}</span>
                <div className="h-px flex-1 bg-gray-200"></div>
              </div>
              <div className="space-y-3">
                {dayEvents.map((ev, i) => {
                  const conf = TYPE_CONFIG[ev.type] || TYPE_CONFIG.note;
                  return (
                    <div key={`${ev.type}-${ev.id}-${i}`} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${conf.dot}`}></div>
                        <div className="w-px flex-1 bg-gray-200 mt-1"></div>
                      </div>
                      <div className={`flex-1 bg-white border rounded-xl p-4 mb-1 ${conf.color.split(' ').includes('border-purple-200') ? 'border-purple-100' : ''}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${conf.color}`}>
                                {conf.icon} {conf.label}
                              </span>
                              {ev.status && (
                                <span className="text-xs text-gray-500">{STATUS_LABELS[ev.status] || ev.status}</span>
                              )}
                              <span className="text-xs text-gray-400">
                                {new Date(ev.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="font-medium text-gray-800 text-sm">{ev.title}</p>
                            {ev.personName && (
                              <p className="text-xs text-gray-500 mt-0.5">👤 {ev.personName}</p>
                            )}
                            {ev.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">{ev.description}</p>
                            )}
                            {ev.endDate && (
                              <p className="text-xs text-gray-400 mt-1">
                                Tamamlanma: {new Date(ev.endDate).toLocaleDateString('tr-TR')}
                              </p>
                            )}
                          </div>
                          {ev.type === 'meeting' && (
                            <Link to={`/meetings/${ev.id}`}
                              className="text-xs text-blue-600 hover:underline ml-2 flex-shrink-0">
                              Detay →
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
