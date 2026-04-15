import { useEffect, useRef } from 'react';

const VARIANTS = {
  danger: {
    icon: '🗑️',
    confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
  },
  warning: {
    icon: '⚠️',
    confirmClass: 'bg-amber-500 hover:bg-amber-600 text-white',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
  },
  info: {
    icon: 'ℹ️',
    confirmClass: 'bg-blue-600 hover:bg-blue-700 text-white',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
  },
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Onayla',
  cancelLabel = 'İptal',
  variant = 'danger',
  loading = false,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null);
  const v = VARIANTS[variant] ?? VARIANTS.danger;

  // Focus confirm button when dialog opens
  useEffect(() => {
    if (open) setTimeout(() => confirmRef.current?.focus(), 50);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onCancel?.(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel?.(); }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4 animate-in">
        {/* Icon + Title */}
        <div className="flex items-center gap-3">
          <span className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${v.iconBg}`}>
            {v.icon}
          </span>
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
        </div>

        {/* Message */}
        {message && (
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{message}</p>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm rounded-lg font-medium disabled:opacity-50 transition-colors ${v.confirmClass}`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                İşleniyor...
              </span>
            ) : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
