// src/utils/currency.js — Indian Rupee formatting & exact paise arithmetic utilities
// Eliminates floating-point money drift by performing calculations in integer paise (1 ₹ = 100 paise).

/**
 * Convert Rupees to integer paise.
 * Example: 280.50 → 28050, 42 → 4200
 */
export function toPaise(rupees) {
  if (rupees === null || rupees === undefined || isNaN(rupees)) return 0;
  return Math.round(Number(rupees) * 100);
}

/**
 * Convert integer paise back to Rupees.
 * Example: 28050 → 280.5, 4200 → 42
 */
export function fromPaise(paise) {
  if (paise === null || paise === undefined || isNaN(paise)) return 0;
  return Number(paise) / 100;
}

/**
 * Round an amount to 2 decimal places using paise arithmetic.
 */
export function roundCurrency(amount) {
  return fromPaise(toPaise(amount));
}

/**
 * Add two rupee amounts accurately without floating point drift.
 */
export function addINR(a, b) {
  return fromPaise(toPaise(a) + toPaise(b));
}

/**
 * Subtract two rupee amounts accurately without floating point drift.
 */
export function subtractINR(a, b) {
  return fromPaise(toPaise(a) - toPaise(b));
}

/**
 * Sum an array of rupee amounts accurately.
 */
export function sumINR(amounts) {
  if (!Array.isArray(amounts) || amounts.length === 0) return 0;
  const totalPaise = amounts.reduce((acc, val) => acc + toPaise(val), 0);
  return fromPaise(totalPaise);
}

/**
 * Validate that an amount string or number is a positive, finite, valid currency value.
 * @param {string|number} input
 * @returns {{ valid: boolean, error: string|null, amount: number, paise: number }}
 */
export function validateAmount(input) {
  if (input === null || input === undefined || input === '') {
    return { valid: false, error: 'Amount cannot be empty', amount: 0, paise: 0 };
  }

  const num = typeof input === 'number' ? input : parseFloat(String(input).replace(/[₹,\s]/g, ''));

  if (isNaN(num)) {
    return { valid: false, error: 'Invalid numeric amount', amount: 0, paise: 0 };
  }

  if (!isFinite(num)) {
    return { valid: false, error: 'Amount must be a finite number', amount: 0, paise: 0 };
  }

  if (num <= 0) {
    return { valid: false, error: 'Amount must be greater than zero', amount: 0, paise: 0 };
  }

  // Maximum allowed limit: ₹100 Crore (1,00,00,00,000)
  if (num > 1000000000) {
    return { valid: false, error: 'Amount exceeds maximum limit of ₹100 Crore', amount: 0, paise: 0 };
  }

  const cleanAmount = roundCurrency(num);
  return {
    valid: true,
    error: null,
    amount: cleanAmount,
    paise: toPaise(cleanAmount),
  };
}

/**
 * Format a number to Indian Rupee lakh/crore notation.
 * Example: 128450 → "₹1,28,450" or "₹1,28,450.00"
 *
 * Indian number system groups: last 3 digits, then every 2 digits from right.
 * e.g. 1,28,450  not  128,450
 */
export function formatINR(amount, showDecimals = false) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';

  const num = Math.abs(Number(amount));

  // Use Intl.NumberFormat with Indian locale for correct lakh/crore grouping
  const formatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : (num % 1 !== 0 ? 2 : 0),
  });

  return '₹' + formatter.format(num);
}

/**
 * Parse a ₹-prefixed string back to a plain number.
 * Example: "₹1,28,450.00" → 128450
 */
export function parseINR(str) {
  if (!str) return 0;
  const cleaned = String(str).replace(/[₹,\s]/g, '').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : roundCurrency(num);
}

/**
 * Returns a display-ready amount string with sign and color hint.
 * - Debit (expense): returns "−₹280"
 * - Credit (income): returns "+₹15,000"
 * - Neutral: returns "₹280"
 */
export function getAmountDisplay(amount, type) {
  const formatted = formatINR(amount, false);
  if (type === 'debit' || type === 'expense') return `−${formatted}`;
  if (type === 'credit' || type === 'income') return `+${formatted}`;
  return formatted;
}

/**
 * Short-form currency for compact displays (e.g. stat cards).
 * Example: 128450 → "₹1.28L" | 1200 → "₹1.2k" | 10000000 → "₹1.0Cr"
 */
export function formatINRShort(amount) {
  const num = Math.abs(Number(amount) || 0);
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000)   return `₹${(num / 100000).toFixed(2)}L`;
  if (num >= 1000)     return `₹${(num / 1000).toFixed(1)}k`;
  return formatINR(num);
}
