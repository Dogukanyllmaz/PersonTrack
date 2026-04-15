import { memo, forwardRef } from 'react';

/**
 * Unified Button component — premium gradient system
 * variant: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'warning'
 * size:    'xs' | 'sm' | 'md' | 'lg'
 */

const BASE = [
  'inline-flex items-center justify-center gap-1.5',
  'font-semibold font-[inherit]',
  'border-none rounded-xl cursor-pointer select-none',
  'transition-[transform,box-shadow,background,opacity] duration-[0.18s]',
  'focus-visible:outline-2 focus-visible:outline-offset-2',
  'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
  'active:scale-[0.96] active:!duration-[0.08s]',
  'relative overflow-hidden',
].join(' ');

/* Shimmer sweep pseudo — achieved via ::after via inline style trick */
const SHIMMER_STYLE = `
  .btn-shimmer::after {
    content: '';
    position: absolute;
    top: 0; left: -120%;
    width: 55%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
    transform: skewX(-18deg);
    transition: left 0.55s ease;
    pointer-events: none;
  }
  .btn-shimmer:hover::after { left: 200%; }
`;

/* Inject shimmer styles once */
if (typeof document !== 'undefined' && !document.getElementById('btn-shimmer-css')) {
  const style = document.createElement('style');
  style.id = 'btn-shimmer-css';
  style.textContent = SHIMMER_STYLE;
  document.head.appendChild(style);
}

const VARIANTS = {
  primary: [
    'btn-shimmer text-white',
    'shadow-[0_4px_20px_var(--accent-glow),inset_0_1px_0_rgba(255,255,255,0.20)]',
    'hover:-translate-y-[2px] hover:shadow-[0_8px_32px_var(--accent-glow)]',
    'before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/[0.14] before:to-transparent before:pointer-events-none',
  ].join(' '),

  secondary: [
    'bg-[--card-bg] text-[--text-primary]',
    'border border-[--card-border] shadow-[var(--shadow-xs)]',
    'hover:-translate-y-px hover:border-[rgba(82,96,247,0.35)] hover:text-[--accent]',
    'hover:bg-[rgba(82,96,247,0.04)] hover:shadow-[0_4px_16px_rgba(82,96,247,0.12)]',
    'dark:bg-[rgba(255,255,255,0.05)] dark:border-[rgba(255,255,255,0.09)]',
    'dark:hover:bg-[rgba(98,115,255,0.12)] dark:hover:border-[rgba(98,115,255,0.40)]',
  ].join(' '),

  ghost: [
    'bg-transparent text-[--text-secondary]',
    'hover:bg-[--content-bg] hover:text-[--text-primary]',
  ].join(' '),

  danger: [
    'btn-shimmer text-white',
    'bg-gradient-to-br from-red-500 to-red-600',
    'shadow-[0_4px_16px_rgba(220,38,38,0.32),inset_0_1px_0_rgba(255,255,255,0.18)]',
    'hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(220,38,38,0.42)]',
  ].join(' '),

  success: [
    'btn-shimmer text-white',
    'bg-gradient-to-br from-emerald-500 to-emerald-600',
    'shadow-[0_4px_16px_rgba(5,150,105,0.30),inset_0_1px_0_rgba(255,255,255,0.18)]',
    'hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(5,150,105,0.40)]',
  ].join(' '),

  warning: [
    'btn-shimmer text-white',
    'bg-gradient-to-br from-amber-400 to-orange-500',
    'shadow-[0_4px_16px_rgba(245,158,11,0.32),inset_0_1px_0_rgba(255,255,255,0.18)]',
    'hover:-translate-y-px hover:shadow-[0_8px_28px_rgba(245,158,11,0.42)]',
  ].join(' '),
};

const SIZES = {
  xs: 'text-[11px] px-2.5 py-1.5 rounded-lg gap-1',
  sm: 'text-[12.5px] px-3.5 py-2 rounded-xl',
  md: 'text-[13.5px] px-5 py-2.5',
  lg: 'text-[15px] px-6 py-3 rounded-2xl',
};

/* Dynamic style for primary gradient */
function getPrimaryStyle(loading) {
  return loading ? {} : {
    background: 'var(--grad-brand)',
  };
}

const Button = memo(forwardRef(function Button(
  { variant = 'primary', size = 'md', className = '', loading = false, children, style, ...props },
  ref
) {
  const isPrimary = variant === 'primary';
  return (
    <button
      ref={ref}
      className={`${BASE} ${VARIANTS[variant] || VARIANTS.primary} ${SIZES[size] || SIZES.md} ${className}`}
      disabled={loading || props.disabled}
      style={isPrimary ? { ...getPrimaryStyle(loading), ...style } : style}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-0.5 shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
          <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      )}
      {children}
    </button>
  );
}));

export default Button;
