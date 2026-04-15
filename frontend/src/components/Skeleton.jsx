import { memo } from 'react';

/** Base skeleton block */
export const Sk = memo(function Sk({ className = '', style, round = false }) {
  return (
    <div
      className={`skeleton${round ? ' skeleton-rounded' : ''} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
});

/* ─────────────────────────────────────────────────────────────────────
   Dashboard skeleton  — mirrors real 3-section widget layout
───────────────────────────────────────────────────────────────────── */
export function DashboardSkeleton() {
  return (
    <div className="animate-fade-in" aria-label="Yükleniyor...">
      {/* Greeting */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Sk className="h-9 rounded-xl mb-2" style={{ width: 280 }} />
          <Sk className="h-4 rounded-lg" style={{ width: 200 }} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }, (_, i) => (
          <Sk key={i} className="h-28 rounded-2xl" />
        ))}
      </div>

      {/* Charts widget */}
      <div className="mb-2">
        <Sk className="h-3 rounded" style={{ width: 80 }} />
      </div>
      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        {Array.from({ length: 3 }, (_, i) => (
          <Sk key={i} className="h-56 rounded-2xl" />
        ))}
      </div>

      {/* Recent items widget */}
      <div className="mb-2">
        <Sk className="h-3 rounded" style={{ width: 180 }} />
      </div>
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <Sk className="h-4 rounded" style={{ width: 120 }} />
              <Sk className="h-3 rounded" style={{ width: 64 }} />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, j) => (
                <div key={j} className="flex items-center justify-between">
                  <div>
                    <Sk className="h-3.5 rounded mb-1.5" style={{ width: 140 + j * 20 }} />
                    <Sk className="h-3 rounded" style={{ width: 80 }} />
                  </div>
                  <Sk className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Activity widget */}
      <div className="mb-2">
        <Sk className="h-3 rounded" style={{ width: 220 }} />
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }, (_, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <Sk className="h-4 rounded" style={{ width: 140 }} />
              <Sk className="h-3 rounded" style={{ width: 64 }} />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }, (_, j) => (
                <div key={j} className="flex gap-3 items-start">
                  <Sk className="w-8 h-8 rounded-xl flex-shrink-0" />
                  <div className="flex-1">
                    <Sk className="h-3.5 rounded mb-1.5" style={{ width: '70%' }} />
                    <Sk className="h-3 rounded" style={{ width: '50%' }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Persons skeleton  — mirrors the card grid layout
───────────────────────────────────────────────────────────────────── */
export function PersonsSkeleton() {
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <Sk className="h-8 rounded-xl mb-2" style={{ width: 120 }} />
          <Sk className="h-4 rounded-lg" style={{ width: 100 }} />
        </div>
        <div className="flex gap-2">
          <Sk className="h-9 w-24 rounded-xl" />
          <Sk className="h-9 w-24 rounded-xl" />
          <Sk className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Search */}
      <Sk className="h-10 w-full rounded-xl mb-5" />

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-start gap-3">
              <Sk className="w-4 h-4 rounded flex-shrink-0 mt-1" />
              <div className="flex items-start gap-3 flex-1">
                <Sk className="w-14 h-14 rounded-xl flex-shrink-0" />
                <div className="flex-1">
                  <Sk className="h-4 rounded mb-2" style={{ width: '65%' }} />
                  <Sk className="h-3 rounded mb-3" style={{ width: '80%' }} />
                  <Sk className="h-3 rounded mb-1.5" style={{ width: '90%' }} />
                  <Sk className="h-3 rounded" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Tasks skeleton  — mirrors the table layout
───────────────────────────────────────────────────────────────────── */
export function TasksSkeleton() {
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <Sk className="h-8 rounded-xl mb-2" style={{ width: 110 }} />
          <Sk className="h-4 rounded-lg" style={{ width: 140 }} />
        </div>
        <div className="flex gap-2">
          <Sk className="h-9 w-32 rounded-xl" />
          <Sk className="h-9 w-32 rounded-xl" />
          <Sk className="h-9 w-24 rounded-xl" />
          <Sk className="h-9 w-28 rounded-xl" />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {/* thead */}
        <div
          className="flex items-center gap-4 px-4 py-3"
          style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--content-bg)' }}
        >
          <Sk className="w-4 h-4 rounded flex-shrink-0" />
          <Sk className="h-3 rounded flex-1" style={{ maxWidth: 180 }} />
          <Sk className="h-3 rounded" style={{ width: 100 }} />
          <Sk className="h-3 rounded" style={{ width: 70 }} />
          <Sk className="h-3 rounded" style={{ width: 90 }} />
          <Sk className="h-3 rounded" style={{ width: 60 }} />
          <Sk className="h-3 rounded" style={{ width: 80 }} />
        </div>
        {/* tbody rows */}
        {Array.from({ length: 8 }, (_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-4"
            style={{ borderBottom: '1px solid var(--card-border)' }}
          >
            <Sk className="w-4 h-4 rounded flex-shrink-0" />
            <div className="flex-1">
              <Sk className="h-4 rounded mb-1.5" style={{ width: `${55 + (i % 4) * 10}%` }} />
              {i % 3 === 0 && <Sk className="h-3 rounded" style={{ width: '45%' }} />}
            </div>
            <Sk className="h-4 rounded" style={{ width: 96 }} />
            <Sk className="h-5 rounded-full" style={{ width: 62 }} />
            <Sk className="h-4 rounded" style={{ width: 76 }} />
            <Sk className="h-5 rounded-full" style={{ width: 72 }} />
            <Sk className="h-4 rounded" style={{ width: 80 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   Generic page loader (used as React.lazy Suspense fallback)
───────────────────────────────────────────────────────────────────── */
export function PageLoader() {
  return (
    <div className="p-8 animate-fade-in">
      <Sk className="h-8 rounded-xl mb-6" style={{ width: 200 }} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }, (_, i) => (
          <Sk key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }, (_, i) => (
          <Sk key={i} className="h-52 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
