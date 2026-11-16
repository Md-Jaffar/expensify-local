// src/utils/recurring.js — Calendar-aware recurring expense scheduling & confirmation engine
// 100% offline, zero background workers, strict confirmation-only transaction creation with duplicate prevention.

import { toPaise, fromPaise, roundCurrency } from './currency.js';

/**
 * Format a Date object to YYYY-MM-DD in local time.
 */
export function toDateString(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get days in a specific year and month (1-indexed month: 1=Jan, 2=Feb, etc.).
 * Correctly accounts for leap years.
 */
export function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/**
 * Calculate the next scheduled due date using calendar-aware math.
 * Correctly clamps to month ends and preserves anchor days (e.g., Jan 31 -> Feb 28/29 -> Mar 31).
 *
 * @param {string|Date} currentDueDate - The current scheduled due date
 * @param {string} frequency - 'daily' | 'weekly' | 'monthly' | 'yearly'
 * @param {string|Date} [anchorDate] - The original start date establishing the preferred day of month
 * @returns {string} - Next due date as YYYY-MM-DD
 */
export function calculateNextDueDate(currentDueDate, frequency, anchorDate = null) {
  const current = new Date(currentDueDate);
  if (isNaN(current.getTime())) throw new Error('Invalid currentDueDate');

  const anchor = anchorDate ? new Date(anchorDate) : current;
  const anchorDay = !isNaN(anchor.getTime()) ? anchor.getDate() : current.getDate();

  const freq = (frequency || 'monthly').toLowerCase();

  if (freq === 'daily') {
    const next = new Date(current);
    next.setDate(next.getDate() + 1);
    return toDateString(next);
  }

  if (freq === 'weekly') {
    const next = new Date(current);
    next.setDate(next.getDate() + 7);
    return toDateString(next);
  }

  if (freq === 'monthly') {
    let year = current.getFullYear();
    let month = current.getMonth() + 1; // 0-indexed + 1 = 1-12

    // Advance 1 month
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }

    // Clamp day to maximum days in target month, preserving anchorDay
    const maxDays = getDaysInMonth(year, month);
    const day = Math.min(anchorDay, maxDays);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  if (freq === 'yearly') {
    let year = current.getFullYear() + 1;
    const targetMonth = anchor.getMonth() + 1;
    const maxDays = getDaysInMonth(year, targetMonth);
    const day = Math.min(anchorDay, maxDays);
    return `${year}-${String(targetMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  // Fallback monthly
  return calculateNextDueDate(currentDueDate, 'monthly', anchorDate);
}

/**
 * Check if a scheduled due date is due or overdue relative to today.
 */
export function isDueOrOverdue(dueDateStr) {
  if (!dueDateStr) return false;
  const todayStr = toDateString(new Date());
  return dueDateStr.slice(0, 10) <= todayStr;
}

/**
 * Calculate the number of days an occurrence is overdue.
 * Returns 0 if due today or in the future.
 */
export function getDaysOverdue(dueDateStr) {
  if (!dueDateStr) return 0;
  const today = new Date(toDateString(new Date()));
  const due = new Date(dueDateStr.slice(0, 10));
  const diffTime = today - due;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Query active recurring templates that are due or overdue for a profile.
 */
export async function getDueTemplates(db, profileId) {
  if (!profileId) return [];
  const todayStr = toDateString(new Date());
  const templates = await db.recurringTemplates
    .where('profileId')
    .equals(profileId)
    .filter((t) => t.isActive && t.nextDueDate && t.nextDueDate.slice(0, 10) <= todayStr)
    .toArray();

  return templates;
}

/**
 * Atomic Action: Mark a recurring occurrence as Paid.
 * - Enforces duplicate prevention: checks recurringOccurrences
 * - Creates an expense transaction in db.transactions
 * - Records occurrence status in db.recurringOccurrences
 * - Advances template.nextDueDate
 * - All executed within a single atomic Dexie transaction.
 *
 * @param {Object} params
 * @param {Dexie} params.db - Dexie database instance
 * @param {Object} params.template - Recurring template record
 * @param {number} params.profileId - Active profile ID
 * @param {string} [params.paidDate] - ISO date of actual payment
 * @param {number} [params.customAmount] - Optional adjusted amount in Rupees
 * @returns {Promise<{ transactionId: number, nextDueDate: string }>}
 */
export async function markRecurringAsPaid({ db, template, profileId, paidDate = null, customAmount = null }) {
  if (!template || !profileId) throw new Error('Missing template or profileId');

  const occurrenceDate = template.nextDueDate ? template.nextDueDate.slice(0, 10) : toDateString(new Date());
  const actualPaidDate = paidDate || new Date().toISOString();
  const finalAmount = customAmount !== null && customAmount !== undefined ? roundCurrency(customAmount) : template.amount;
  const amountPaise = toPaise(finalAmount);

  return db.transaction(
    'rw',
    [db.transactions, db.recurringTemplates, db.recurringOccurrences],
    async () => {
      // 1. Strict Duplicate Check
      const existing = await db.recurringOccurrences
        .where('[templateId+occurrenceDate]')
        .equals([template.id, occurrenceDate])
        .first();

      if (existing && existing.status === 'paid') {
        throw new Error(`DUPLICATE_OCCURRENCE: Occurrence for ${occurrenceDate} was already paid.`);
      }

      // 2. Insert financial transaction
      const txId = await db.transactions.add({
        profileId,
        type: 'debit',
        amount: finalAmount,
        amountPaise,
        category: template.category,
        paymentMethod: template.paymentMethod || 'UPI',
        date: actualPaidDate,
        description: template.name,
        memo: `Recurring payment (${template.frequency})`,
        isRecurring: true,
        recurringId: template.id,
        recurringTemplateId: template.id,
        occurrenceDate,
        createdAt: new Date().toISOString(),
      });

      // 3. Record or update occurrence status
      if (existing) {
        await db.recurringOccurrences.update(existing.id, {
          status: 'paid',
          transactionId: txId,
          updatedAt: new Date().toISOString(),
        });
      } else {
        await db.recurringOccurrences.add({
          profileId,
          templateId: template.id,
          occurrenceDate,
          status: 'paid',
          transactionId: txId,
          createdAt: new Date().toISOString(),
        });
      }

      // 4. Advance next scheduled due date
      const nextDueDate = calculateNextDueDate(occurrenceDate, template.frequency, template.startDate || occurrenceDate);

      await db.recurringTemplates.update(template.id, {
        nextDueDate,
        lastConfirmedDate: actualPaidDate,
      });

      return { transactionId: txId, nextDueDate };
    }
  );
}

/**
 * Atomic Action: Skip a scheduled recurring occurrence.
 * - Does NOT create a financial transaction
 * - Records occurrence status as 'skipped'
 * - Advances template.nextDueDate
 */
export async function skipRecurringOccurrence({ db, template, profileId }) {
  if (!template || !profileId) throw new Error('Missing template or profileId');

  const occurrenceDate = template.nextDueDate ? template.nextDueDate.slice(0, 10) : toDateString(new Date());

  return db.transaction(
    'rw',
    [db.recurringTemplates, db.recurringOccurrences],
    async () => {
      // Record skipped occurrence
      const existing = await db.recurringOccurrences
        .where('[templateId+occurrenceDate]')
        .equals([template.id, occurrenceDate])
        .first();

      if (existing) {
        await db.recurringOccurrences.update(existing.id, {
          status: 'skipped',
          updatedAt: new Date().toISOString(),
        });
      } else {
        await db.recurringOccurrences.add({
          profileId,
          templateId: template.id,
          occurrenceDate,
          status: 'skipped',
          createdAt: new Date().toISOString(),
        });
      }

      // Advance to next cycle
      const nextDueDate = calculateNextDueDate(occurrenceDate, template.frequency, template.startDate || occurrenceDate);

      await db.recurringTemplates.update(template.id, { nextDueDate });

      return { nextDueDate };
    }
  );
}

/**
 * Action: Postpone a recurring occurrence by N days.
 * - Changes nextDueDate without logging an expense or marking skipped
 */
export async function postponeRecurringOccurrence({ db, template, days = 2 }) {
  if (!template) throw new Error('Missing template');

  const current = new Date(template.nextDueDate || toDateString(new Date()));
  current.setDate(current.getDate() + Number(days));
  const newDueDate = toDateString(current);

  await db.recurringTemplates.update(template.id, {
    nextDueDate: newDueDate,
  });

  return { nextDueDate: newDueDate };
}
