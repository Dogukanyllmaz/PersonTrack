import { useState, useEffect } from 'react';
import { getTags, createTag, deleteTag, updateTag } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

const PRESET_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e','#14b8a6',
  '#3b82f6','#6366f1','#8b5cf6','#ec4899','#64748b'
];

export default function Tags() {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Edit state
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editError, setEditError] = useState('');

  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null);

  const loadTags = () => {
    setLoading(true);
    getTags().then(r => { setTags(r.data); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { loadTags(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await createTag({ name: newName.trim(), color: newColor });
      setTags(prev => [...prev, { ...res.data, personCount: 0, meetingCount: 0 }]);
      setNewName('');
      setNewColor('#6366f1');
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Etiket oluşturulamadı.');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (tag) => {
    setEditId(tag.id);
    setEditName(tag.name);
    setEditColor(tag.color);
    setEditError('');
  };

  const cancelEdit = () => { setEditId(null); setEditError(''); };

  const handleUpdate = async (id) => {
    if (!editName.trim()) return;
    setEditError('');
    try {
      const res = await updateTag(id, { name: editName.trim(), color: editColor });
      setTags(prev => prev.map(t => t.id === id ? { ...t, name: res.data.name, color: res.data.color } : t));
      setEditId(null);
    } catch (err) {
      setEditError(err.response?.data?.message || 'Güncellenemedi.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteTag(id);
      setTags(prev => prev.filter(t => t.id !== id));
      setDeleteId(null);
    } catch {}
  };

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800">{t('pageTags')}</h2>
        <p className="text-gray-500 text-sm mt-1">{t('tagName')}</p>
      </div>

      {/* Create form */}
      <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
        <h3 className="font-semibold text-gray-800 mb-4">{t('editTag')}</h3>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Etiket adı (örn: VIP, Tedarikçi)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              maxLength={50}
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? '...' : t('create')}
            </button>
          </div>

          {/* Color picker */}
          <div>
            <p className="text-xs text-gray-500 mb-2">{t('tagColor')}:</p>
            <div className="flex gap-2 flex-wrap items-center">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={`w-7 h-7 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={newColor}
                onChange={e => setNewColor(e.target.value)}
                className="w-7 h-7 rounded cursor-pointer border-0 p-0"
                title="Özel renk"
              />
              <span className="ml-2 text-sm font-medium px-3 py-1 rounded-full text-white" style={{ backgroundColor: newColor }}>
                {newName || 'Önizleme'}
              </span>
            </div>
          </div>

          {createError && <p className="text-red-500 text-sm">{createError}</p>}
        </form>
      </div>

      {/* Tags list */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">{t('pageTags')}</h3>
          <span className="text-sm text-gray-500">{tags.length} {t('pageTags').toLowerCase()}</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">{t('loading')}</div>
        ) : tags.length === 0 ? (
          <div className="p-8 text-center text-gray-400">{t('noTags')}</div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {tags.map(tag => (
              <li key={tag.id} className="px-5 py-4">
                {editId === tag.id ? (
                  // Edit mode
                  <div className="flex flex-col gap-3">
                    <div className="flex gap-3 items-center">
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        maxLength={50}
                        autoFocus
                      />
                      <button onClick={() => handleUpdate(tag.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                        {t('save')}
                      </button>
                      <button onClick={cancelEdit} className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                        {t('cancel')}
                      </button>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditColor(c)}
                          className={`w-6 h-6 rounded-full transition-transform ${editColor === c ? 'scale-125 ring-2 ring-offset-1 ring-gray-400' : 'hover:scale-110'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <input type="color" value={editColor} onChange={e => setEditColor(e.target.value)} className="w-6 h-6 rounded cursor-pointer border-0 p-0" />
                    </div>
                    {editError && <p className="text-red-500 text-xs">{editError}</p>}
                  </div>
                ) : (
                  // View mode
                  <div className="flex items-center gap-4">
                    <span className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                    <span className="text-sm font-medium text-white px-3 py-1 rounded-full" style={{ backgroundColor: tag.color }}>
                      {tag.name}
                    </span>
                    <div className="flex gap-3 text-xs text-gray-400 ml-1">
                      <span>👥 {tag.personCount} kişi</span>
                      <span>📅 {tag.meetingCount} toplantı</span>
                    </div>
                    <div className="ml-auto flex gap-2">
                      <button
                        onClick={() => startEdit(tag)}
                        className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
                      >
                        {t('edit')}
                      </button>
                      {isAdmin && (
                        deleteId === tag.id ? (
                          <div className="flex gap-1">
                            <button onClick={() => handleDelete(tag.id)} className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700">
                              {t('delete')}
                            </button>
                            <button onClick={() => setDeleteId(null)} className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
                              {t('cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteId(tag.id)}
                            className="text-xs px-3 py-1.5 border border-red-200 rounded-lg text-red-600 hover:bg-red-50"
                          >
                            {t('delete')}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
