// src/utils/budgets.js — Budget calculations, status tracking, and persistence
// Scoped to active profile with integer paise arithmetic and zero-division protection.

import { toPaise, fromPaise } from './currency.js';
import { toMonthYearKey } from './date.js';

/**
 * Calculates budget status given spent and limit in paise.
 * Excludes income and strictly prevents negative cushion.
 *
 * @param {Object} params
 * @param {number} params.spentPaise - Total spent in paise
 * @param {number} params.limitPaise - Budget limit in paise
 * @param {number} [params.alertThreshold=80] - Alert threshold percentage (e.g. 50, 80, 100)
 * @returns {Object} Calculated budget status and display properties
 */
export function calculateBudgetStatus({ spentPaise = 0, limitPaise = 0, alertThreshold = 80 }) {
  const safeSpentPaise = Math.max(0, Math.round(Number(spentPaise) || 0));
  const safeLimitPaise = Math.max(0, Math.round(Number(limitPaise) || 0));
  const safeThreshold = Math.max(1, Math.min(100, Number(alertThreshold) || 80));

  const percentage = safeLimitPaise > 0
    ? Math.round((safeSpentPaise / safeLimitPaise) * 100)
    : 0;

  const isOver = safeLimitPaise > 0 && safeSpentPaise > safeLimitPaise;
  const isWarning = !isOver && safeLimitPaise > 0 && percentage >= safeThreshold;

  const status = isOver ? 'over' : isWarning ? 'warning' : 'ok';
  const statusLabel = isOver ? 'Over Budget' : isWarning ? 'Near Limit' : 'On Track';

  const remainingPaise = Math.max(0, safeLimitPaise - safeSpentPaise);
  const overPaise = Math.max(0, safeSpentPaise - safeLimitPaise);

  return {
    spentPaise: safeSpentPaise,
    limitPaise: safeLimitPaise,
    spent: fromPaise(safeSpentPaise),
    limit: fromPaise(safeLimitPaise),
    remainingPaise,
    remaining: fromPaise(remainingPaise),
    overPaise,
    over: fromPaise(overPaise),
    percentage,
    alertThreshold: safeThreshold,
    isOver,
    isWarning,
    status,
    statusLabel,
  };
}

/**
 * Calculates total expense spent and category-wise expense spent for a given month.
 * Strictly ignores income/credit transactions.
 *
 * @param {Array} transactions - List of transactions
 * @param {string} monthYearKey - Month-Year in YYYY-MM format
 * @returns {Object} { totalSpentPaise, byCategoryPaise }
 */
export function getExpenseSpendForMonth(transactions, monthYearKey) {
  let totalSpentPaise = 0;
  const byCategoryPaise = {};

  if (!Array.isArray(transactions) || !monthYearKey) {
    return { totalSpentPaise: 0, byCategoryPaise: {} };
  }

  for (const tx of transactions) {
    // Only include expense transactions (exclude credit/income)
    const isExpense = tx.type === 'debit' || tx.type === 'expense';
    if (!isExpense) continue;

    // Check month match (tx.date in format YYYY-MM-DD or ISO string)
    const txDate = tx.date || '';
    if (!txDate.startsWith(monthYearKey)) continue;

    const amtPaise = tx.amountPaise !== undefined
      ? Math.round(Number(tx.amountPaise) || 0)
      : toPaise(tx.amount);

    totalSpentPaise += amtPaise;
    const cat = tx.category || 'Other';
    byCategoryPaise[cat] = (byCategoryPaise[cat] || 0) + amtPaise;
  }

  return { totalSpentPaise, byCategoryPaise };
}

/**
 * Combines stored budget limits with actual transaction spending for a month.
 *
 * @param {Array} storedBudgets - Budgets fetched from db.budgets
 * @param {Array} transactions - Transactions for the profile
 * @param {string} monthYearKey - 'YYYY-MM'
 * @param {number} [fallbackOverallLimitPaise] - Fallback overall limit if not in db.budgets
 * @returns {Object} { overall, categories, alerts }
 */
export function getBudgetsWithSpend(
  storedBudgets = [],
  transactions = [],
  monthYearKey = toMonthYearKey(new Date()),
  fallbackOverallLimitPaise = 5000000 // ₹50,000 default
) {
  const { totalSpentPaise, byCategoryPaise } = getExpenseSpendForMonth(transactions, monthYearKey);

  // Find overall budget for this month
  const overallBudgetRecord = storedBudgets.find(
    (b) => b.monthYear === monthYearKey && (!b.categoryId || b.categoryName === 'Overall')
  );

  const overallLimitPaise = overallBudgetRecord?.limitPaise !== undefined
    ? overallBudgetRecord.limitPaise
    : overallBudgetRecord?.limit !== undefined
    ? toPaise(overallBudgetRecord.limit)
    : fallbackOverallLimitPaise;

  const overallAlertThreshold = overallBudgetRecord?.alertThreshold || 80;

  const overallStatus = calculateBudgetStatus({
    spentPaise: totalSpentPaise,
    limitPaise: overallLimitPaise,
    alertThreshold: overallAlertThreshold,
  });

  const overall = {
    id: overallBudgetRecord?.id || null,
    categoryId: null,
    categoryName: 'Overall',
    monthYear: monthYearKey,
    ...overallStatus,
  };

  // Category-specific budgets
  const categoryBudgets = storedBudgets.filter(
    (b) => b.categoryId && b.categoryName !== 'Overall' && (!b.monthYear || b.monthYear === monthYearKey)
  );

  const categories = categoryBudgets.map((b) => {
    const catLimitPaise = b.limitPaise !== undefined ? b.limitPaise : toPaise(b.limit);
    const catSpentPaise = byCategoryPaise[b.categoryName] || 0;
    const status = calculateBudgetStatus({
      spentPaise: catSpentPaise,
      limitPaise: catLimitPaise,
      alertThreshold: b.alertThreshold || 80,
    });

    return {
      id: b.id,
      categoryId: b.categoryId,
      categoryName: b.categoryName,
      monthYear: b.monthYear || monthYearKey,
      ...status,
    };
  });

  // Collect any budgets needing alerts (warning or over)
  const alerts = [];
  if (overall.isOver || overall.isWarning) {
    alerts.push({
      type: 'overall',
      title: overall.isOver ? 'Overall Monthly Budget Exceeded!' : 'Overall Monthly Budget Near Limit',
      message: overall.isOver
        ? `You have exceeded your monthly limit by ${fromPaise(overall.overPaise)}.`
        : `You have reached ${overall.percentage}% of your ${overall.limit} limit.`,
      status: overall.status,
      ...overall,
    });
  }

  for (const c of categories) {
    if (c.isOver || c.isWarning) {
      alerts.push({
        type: 'category',
        title: c.isOver ? `${c.categoryName} Budget Exceeded!` : `${c.categoryName} Near Limit`,
        message: c.isOver
          ? `Spent ${c.spent} of ${c.limit} limit (${fromPaise(c.overPaise)} over).`
          : `Spent ${c.spent} of ${c.limit} limit (${c.percentage}%).`,
        status: c.status,
        ...c,
      });
    }
  }

  return {
    overall,
    categories,
    alerts,
    totalSpentPaise,
    byCategoryPaise,
  };
}

/**
 * Saves or updates a budget record in Dexie.
 * If saving an Overall budget, keeps db.settings 'monthlyBudget' in sync.
 *
 * @param {Object} db - Dexie database instance
 * @param {number} profileId - Active profile ID
 * @param {Object} budgetData - { id, categoryId, categoryName, monthYear, limit, alertThreshold }
 * @returns {Promise<number>} Saved record ID
 */
export async function saveBudget(db, profileId, budgetData) {
  if (!profileId) throw new Error('Active profile required to save budget');

  const { id, categoryId = null, categoryName = 'Overall', monthYear, limit, alertThreshold = 80 } = budgetData;

  const numLimit = Number(limit);
  if (isNaN(numLimit) || numLimit <= 0) {
    throw new Error('Budget limit must be a positive number');
  }

  const limitPaise = toPaise(numLimit);
  const cleanMonthYear = monthYear || toMonthYearKey(new Date());
  const safeThreshold = Number(alertThreshold) || 80;

  return await db.transaction('rw', [db.budgets, db.settings], async () => {
    let savedId = id;

    if (id) {
      await db.budgets.update(id, {
        categoryId,
        categoryName,
        monthYear: cleanMonthYear,
        limit: numLimit,
        limitPaise,
        alertThreshold: safeThreshold,
      });
    } else {
      // Check if one already exists for this profile + monthYear + category
      let existing;
      if (!categoryId || categoryName === 'Overall') {
        existing = await db.budgets
          .where('[profileId+monthYear]')
          .equals([profileId, cleanMonthYear])
          .filter((b) => !b.categoryId || b.categoryName === 'Overall')
          .first();
      } else {
        existing = await db.budgets
          .where('profileId')
          .equals(profileId)
          .filter(
            (b) =>
              (b.categoryId === categoryId || b.categoryName === categoryName) &&
              (!b.monthYear || b.monthYear === cleanMonthYear)
          )
          .first();
      }

      if (existing) {
        savedId = existing.id;
        await db.budgets.update(existing.id, {
          limit: numLimit,
          limitPaise,
          alertThreshold: safeThreshold,
          categoryName,
        });
      } else {
        savedId = await db.budgets.add({
          profileId,
          categoryId,
          categoryName,
          monthYear: cleanMonthYear,
          limit: numLimit,
          limitPaise,
          alertThreshold: safeThreshold,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // If this is an overall monthly budget, also update db.settings
    if (!categoryId || categoryName === 'Overall') {
      const existingSetting = await db.settings
        .where('[profileId+key]')
        .equals([profileId, 'monthlyBudget'])
        .first();

      if (existingSetting) {
        await db.settings.update(existingSetting.id, { value: numLimit });
      } else {
        await db.settings.add({
          profileId,
          key: 'monthlyBudget',
          value: numLimit,
        });
      }
    }

    return savedId;
  });
}

/**
 * Deletes a budget record from Dexie.
 *
 * @param {Object} db - Dexie instance
 * @param {number} budgetId - ID of budget to delete
 * @returns {Promise<void>}
 */
export async function deleteBudget(db, budgetId) {
  if (!budgetId) return;
  await db.budgets.delete(budgetId);
}
