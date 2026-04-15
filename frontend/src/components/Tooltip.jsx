/**
 * Wraps any element with a CSS tooltip.
 * Usage: <Tooltip text="Düzenle"><button>...</button></Tooltip>
 * Position: 'top' | 'bottom' | 'left' | 'right' (default: 'top')
 */
export default function Tooltip({ text, children, position = 'top' }) {
  if (!text) return children;

  const posClass = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position] ?? 'bottom-full left-1/2 -translate-x-1/2 mb-2';

  return (
    <span className="relative inline-flex group">
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute ${posClass} z-50 whitespace-nowrap rounded-md bg-gray-900 dark:bg-gray-700 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 shadow-lg`}
      >
        {text}
      </span>
    </span>
  );
}
