// src/utils/date.js — Date formatting and grouping utilities

/**
 * Returns time-aware greeting string.
 * Morning: 5am–11:59am | Afternoon: 12pm–4:59pm | Evening: 5pm–11:59pm | Night: 12am–4:59am
 */
export function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12)  return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Good night';
}

/**
 * Formats a date as "Today", "Yesterday", or "24 Oct" / "24 Oct 2023"
 */
export function formatDate(date) {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (a, b) =>
    a.getDate() === b.getDate() &&
    a.getMonth() === b.getMonth() &&
    a.getFullYear() === b.getFullYear();

  if (isSameDay(d, today))     return 'Today';
  if (isSameDay(d, yesterday)) return 'Yesterday';

  // Different year → show year
  const showYear = d.getFullYear() !== today.getFullYear();
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: showYear ? 'numeric' : undefined,
  });
}

/**
 * Formats a date as "HH:MM AM/PM" for time display.
 */
export function formatTime(date) {
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Returns "Oct 2024" style month-year string from a Date.
 */
export function getMonthYear(date) {
  return new Date(date).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Returns "YYYY-MM" string for use as a monthYear key in Dexie queries.
 */
export function toMonthYearKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Returns current month-year key: e.g. "2024-10"
 */
export function currentMonthYearKey() {
  return toMonthYearKey(new Date());
}

/**
 * Returns true if the date is today.
 */
export function isToday(date) {
  const d = new Date(date);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}

/**
 * Returns true if the date is within the current calendar week (Mon–Sun).
 */
export function isThisWeek(date) {
  const d = new Date(date);
  const today = new Date();
  // Find start of week (Monday)
  const startOfWeek = new Date(today);
  const day = today.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // Go back to Monday
  startOfWeek.setDate(today.getDate() + diff);
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek && d <= today;
}

/**
 * Groups an array of transactions by date string key ("Today", "Yesterday", "24 Oct").
 * Returns an array of { label, date, transactions } objects, sorted newest first.
 */
export function groupByDay(transactions) {
  const groups = {};

  for (const tx of transactions) {
    const label = formatDate(tx.date || tx.createdAt);
    if (!groups[label]) {
      groups[label] = { label, date: new Date(tx.date || tx.createdAt), transactions: [] };
    }
    groups[label].transactions.push(tx);
  }

  // Sort groups: newest first
  return Object.values(groups).sort((a, b) => b.date - a.date);
}

/**
 * Returns current time as "HH:MM" (24h) for status bar display.
 */
export function getCurrentTime() {
  return new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}
