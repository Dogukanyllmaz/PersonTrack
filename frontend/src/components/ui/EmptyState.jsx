import { memo } from 'react';

const PRESETS = {
  tasks: {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
      </svg>
    ),
    title: 'Görev yok',
    body: 'Henüz hiç görev oluşturulmadı.',
  },
  persons: {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>
    ),
    title: 'Kişi bulunamadı',
    body: 'Arama kriterlerinizle eşleşen kişi yok.',
  },
  search: {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
    ),
    title: 'Sonuç bulunamadı',
    body: 'Farklı anahtar kelimeler deneyin.',
  },
  generic: {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
    title: 'Veri yok',
    body: 'Gösterilecek içerik bulunamadı.',
  },
};

/**
 * <EmptyState preset="tasks" action={<Button>Görev Ekle</Button>} />
 * or override title/body/icon directly
 */
const EmptyState = memo(function EmptyState({
  preset = 'generic',
  title,
  body,
  icon,
  action,
  className = '',
}) {
  const cfg = PRESETS[preset] || PRESETS.generic;
  const resolvedIcon  = icon  ?? cfg.icon;
  const resolvedTitle = title ?? cfg.title;
  const resolvedBody  = body  ?? cfg.body;

  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-[--content-bg] text-[--text-secondary] mb-1">
        {resolvedIcon}
      </div>
      <p className="text-[15px] font-semibold text-[--text-primary]">{resolvedTitle}</p>
      {resolvedBody && (
        <p className="text-[13px] text-[--text-secondary] max-w-[280px] leading-relaxed">{resolvedBody}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
});

export default EmptyState;
