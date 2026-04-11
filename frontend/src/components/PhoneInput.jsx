import { useRef } from 'react';

/**
 * Turkish phone number input with format: 05XX XXX XX XX
 * Stores raw digits, displays formatted.
 */
export default function PhoneInput({ value = '', onChange, className = '', placeholder = '05XX XXX XX XX', required, disabled }) {
  const inputRef = useRef(null);

  const format = (digits) => {
    // digits: up to 11 numeric chars starting with 0
    const d = digits.slice(0, 11);
    if (d.length <= 4) return d;
    if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
    if (d.length <= 9) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
  };

  const handleChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    const clamped = raw.startsWith('0') ? raw : raw.length > 0 ? '0' + raw : '';
    onChange(clamped.slice(0, 11));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Backspace') {
      // Let default handle it — we'll re-derive from raw digits in onChange
    }
  };

  const displayed = format(value || '');

  return (
    <input
      ref={inputRef}
      type="tel"
      value={displayed}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
      className={className}
      inputMode="numeric"
    />
  );
}
