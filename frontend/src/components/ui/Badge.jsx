import { memo } from 'react';

/* ── Status badge config ─────────────────────────────────────── */
const STATUS = {
  Active: {
    label: 'Aktif',
    light: { bg: 'rgba(82,96,247,0.10)', text: '#4752D4', dot: '#5260F7' },
    dark:  { bg: 'rgba(98,115,255,0.15)', text: '#8B9EFF', dot: '#6272FF' },
  },
  Completed: {
    label: 'Tamamlandı',
    light: { bg: 'rgba(16,185,129,0.10)', text: '#0B8C61', dot: '#10B981' },
    dark:  { bg: 'rgba(16,185,129,0.14)', text: '#5DD6A4', dot: '#10B981' },
  },
  Pending: {
    label: 'Bekliyor',
    light: { bg: 'rgba(100,116,139,0.10)', text: '#4A5568', dot: '#94A3B8' },
    dark:  { bg: 'rgba(148,163,184,0.12)', text: '#94A3B8', dot: '#64748B' },
  },
  Planned: {
    label: 'Planlandı',
    light: { bg: 'rgba(245,158,11,0.10)', text: '#B45309', dot: '#F59E0B' },
    dark:  { bg: 'rgba(245,158,11,0.14)', text: '#FBB740', dot: '#F59E0B' },
  },
};

/* ── Priority badge config ───────────────────────────────────── */
const PRIORITY = {
  Low: {
    label: 'Düşük',
    light: { bg: 'rgba(100,116,139,0.09)', text: '#4A5568', dot: '#94A3B8' },
    dark:  { bg: 'rgba(148,163,184,0.12)', text: '#94A3B8', dot: '#64748B' },
  },
  Medium: {
    label: 'Orta',
    light: { bg: 'rgba(82,96,247,0.10)', text: '#4752D4', dot: '#5260F7' },
    dark:  { bg: 'rgba(98,115,255,0.15)', text: '#8B9EFF', dot: '#6272FF' },
  },
  High: {
    label: 'Yüksek',
    light: { bg: 'rgba(249,115,22,0.10)', text: '#C2410C', dot: '#F97316' },
    dark:  { bg: 'rgba(249,115,22,0.15)', text: '#FB923C', dot: '#F97316' },
  },
  Critical: {
    label: 'Kritik',
    light: { bg: 'rgba(239,68,68,0.10)', text: '#B91C1C', dot: '#EF4444' },
    dark:  { bg: 'rgba(239,68,68,0.15)', text: '#F87171', dot: '#EF4444' },
  },
};

const BASE = 'inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.02em] px-2.5 py-[4px] rounded-full select-none whitespace-nowrap';

function useBadgeStyle(cfg) {
  /* Check if dark mode by querying the document element */
  const isDark = typeof document !== 'undefined'
    ? document.documentElement.classList.contains('dark')
    : false;
  return isDark ? cfg.dark : cfg.light;
}

/** <StatusBadge status="Active" /> */
export const StatusBadge = memo(function StatusBadge({ status }) {
  const cfg = STATUS[status] || STATUS.Pending;
  const s = useBadgeStyle(cfg);
  return (
    <span className={BASE} style={{ background: s.bg, color: s.text }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {cfg.label}
    </span>
  );
});

/** <PriorityBadge priority="High" /> */
export const PriorityBadge = memo(function PriorityBadge({ priority }) {
  const cfg = PRIORITY[priority] || PRIORITY.Medium;
  const s = useBadgeStyle(cfg);
  return (
    <span className={BASE} style={{ background: s.bg, color: s.text }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {cfg.label}
    </span>
  );
});

/** <CountBadge count={5} /> — gradient dot for notifications */
export const CountBadge = memo(function CountBadge({ count, max = 99 }) {
  if (!count || count <= 0) return null;
  return (
    <span
      className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[10px] font-bold text-white px-1 leading-none"
      style={{ background: 'linear-gradient(135deg,#EF4444,#F43F5E)', boxShadow: '0 2px 8px rgba(239,68,68,0.4)' }}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
});
