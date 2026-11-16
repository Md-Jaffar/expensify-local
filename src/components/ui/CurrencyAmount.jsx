// src/components/ui/CurrencyAmount.jsx — Formats ₹ amounts with correct styling
// Handles Indian lakh notation, sign coloring, and tabular-numeral rendering.

import { formatINR, formatINRShort } from '../../utils/currency';

/**
 * CurrencyAmount displays a formatted rupee amount.
 * @param {number} amount - Raw number (always positive)
 * @param {'debit'|'credit'|'neutral'} type - Determines sign and color
 * @param {'sm'|'md'|'lg'|'display'} size - Text size variant
 * @param {boolean} short - Use compact format (₹1.2k, ₹1.28L)
 * @param {boolean} showDecimals - Show .00 decimals
 */
const CurrencyAmount = ({
  amount = 0,
  type = 'neutral',
  size = 'md',
  short = false,
  showDecimals = false,
  className = '',
}) => {
  // ── Color class based on transaction type ──────────────────────────────
  const colorClass = {
    debit:   'text-error',
    credit:  'text-secondary font-bold',
    neutral: 'text-on-surface',
  }[type] || 'text-on-surface';

  // ── Font size class ────────────────────────────────────────────────────
  const sizeClass = {
    sm:      'text-numeral-dense',
    md:      'text-numeral-dense',
    lg:      'text-headline-sm',
    display: 'text-display-currency-mobile',
  }[size] || 'text-numeral-dense';

  // ── Sign prefix ────────────────────────────────────────────────────────
  const sign = type === 'debit' ? '−' : type === 'credit' ? '+' : '';

  // ── Formatted value ────────────────────────────────────────────────────
  const formatted = short
    ? formatINRShort(amount)
    : formatINR(amount, showDecimals);

  return (
    <span className={`tabular-nums ${sizeClass} ${colorClass} ${className}`}>
      {sign}{formatted}
    </span>
  );
};

export default CurrencyAmount;
