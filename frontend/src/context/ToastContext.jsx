import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const ToastContext = createContext(null);

// ── Individual Toast ──────────────────────────────────────────────────────────
const STYLES = {
  success: {
    bar:  'bg-green-500',
    icon: '✓',
    ring: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-200',
    progress: 'bg-green-400',
  },
  error: {
    bar:  'bg-red-500',
    icon: '✕',
    ring: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-700 dark:text-red-200',
    progress: 'bg-red-400',
  },
  warning: {
    bar:  'bg-amber-500',
    icon: '⚠',
    ring: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-200',
    progress: 'bg-amber-400',
  },
  info: {
    bar:  'bg-blue-500',
    icon: 'ℹ',
    ring: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-200',
    progress: 'bg-blue-400',
  },
};

function Toast({ toast, onRemove }) {
  const s = STYLES[toast.type] || STYLES.info;
  const [progress, setProgress] = useState(100);
  const [visible, setVisible] = useState(false);

  // Slide-in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // Progress bar countdown
  useEffect(() => {
    if (!toast.duration) return;
    const step  = 50;
    const delta = (step / toast.duration) * 100;
    const timer = setInterval(() => {
      setProgress(p => {
        if (p - delta <= 0) { clearInterval(timer); return 0; }
        return p - delta;
      });
    }, step);
    return () => clearInterval(timer);
  }, [toast.duration]);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => onRemove(toast.id), 300);
  };

  return (
    <div
      className={`relative flex items-start gap-3 w-80 max-w-full rounded-xl border shadow-lg overflow-hidden px-4 py-3 transition-all duration-300 ${s.ring} ${
        visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
      }`}
    >
      {/* Left color bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${s.bar}`} />

      {/* Icon */}
      <span className="text-base font-bold mt-0.5 flex-shrink-0">{s.icon}</span>

      {/* Message */}
      <p className="flex-1 text-sm leading-relaxed">{toast.message}</p>

      {/* Close */}
      <button onClick={dismiss} className="flex-shrink-0 opacity-50 hover:opacity-100 text-lg leading-none mt-0.5">
        ×
      </button>

      {/* Progress bar */}
      {toast.duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/10">
          <div
            className={`h-full ${s.progress} transition-all`}
            style={{ width: `${progress}%`, transitionDuration: '50ms' }}
          />
        </div>
      )}
    </div>
  );
}

// ── Container ─────────────────────────────────────────────────────────────────
function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map(t => (
        <div key={t.id} className="pointer-events-auto">
          <Toast toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timerMap = useRef({});

  const remove = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    clearTimeout(timerMap.current[id]);
    delete timerMap.current[id];
  }, []);

  const add = useCallback((message, type = 'info', duration = 4500) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev.slice(-4), { id, message, type, duration }]);
    if (duration > 0) {
      timerMap.current[id] = setTimeout(() => remove(id), duration + 300);
    }
    return id;
  }, [remove]);

  const toast = {
    success: (msg, dur)  => add(msg, 'success', dur),
    error:   (msg, dur)  => add(msg, 'error',   dur ?? 6000),
    warning: (msg, dur)  => add(msg, 'warning',  dur ?? 5000),
    info:    (msg, dur)  => add(msg, 'info',     dur),
    dismiss: remove,
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={remove} />
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
