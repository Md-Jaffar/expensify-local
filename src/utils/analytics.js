// src/utils/analytics.js — Analytics engine for Expensify Local
// Scoped to active profile, integer paise arithmetic, zero-division safe comparisons.

import { toPaise, fromPaise } from './currency.js';
import { toDateString } from './recurring.js';

/**
 * Returns date range strings { start, end } for a given timeframe keyword.
 *
 * @param {string} timeframe - 'Today' | 'This Week' | 'This Month' | 'Previous Month' | 'Custom Range'
 * @param {string} [customStart] - 'YYYY-MM-DD'
 * @param {string} [customEnd] - 'YYYY-MM-DD'
 * @returns {Object} { currentStart, currentEnd, prevStart, prevEnd }
 */
export function getDateRanges(timeframe, customStart = '', customEnd = '') {
  const now = new Date();
  const todayStr = toDateString(now);

  let currentStart = todayStr;
  let currentEnd = todayStr;
  let prevStart = todayStr;
  let prevEnd = todayStr;

  if (timeframe === 'Today') {
    currentStart = todayStr;
    currentEnd = todayStr;

    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    const yStr = toDateString(y);
    prevStart = yStr;
    prevEnd = yStr;
  } else if (timeframe === 'This Week') {
    const day = now.getDay(); // 0 is Sunday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    currentStart = toDateString(monday);
    currentEnd = toDateString(sunday);

    const prevMonday = new Date(monday);
    prevMonday.setDate(monday.getDate() - 7);
    const prevSunday = new Date(sunday);
    prevSunday.setDate(sunday.getDate() - 7);

    prevStart = toDateString(prevMonday);
    prevEnd = toDateString(prevSunday);
  } else if (timeframe === 'Previous Month') {
    const firstDayPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    currentStart = toDateString(firstDayPrevMonth);
    currentEnd = toDateString(lastDayPrevMonth);

    const firstDayTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const lastDayTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 0);

    prevStart = toDateString(firstDayTwoMonthsAgo);
    prevEnd = toDateString(lastDayTwoMonthsAgo);
  } else if (timeframe === 'Custom Range') {
    currentStart = customStart || todayStr;
    currentEnd = customEnd || todayStr;

    if (currentStart > currentEnd) {
      // Swap if out of order
      const temp = currentStart;
      currentStart = currentEnd;
      currentEnd = temp;
    }

    const s = new Date(currentStart);
    const e = new Date(currentEnd);
    const diffTime = Math.abs(e - s);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const pEnd = new Date(s);
    pEnd.setDate(s.getDate() - 1);
    const pStart = new Date(pEnd);
    pStart.setDate(pEnd.getDate() - diffDays + 1);

    prevStart = toDateString(pStart);
    prevEnd = toDateString(pEnd);
  } else {
    // Default: 'This Month'
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    currentStart = toDateString(firstDay);
    currentEnd = toDateString(lastDay);

    const firstDayPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayPrev = new Date(now.getFullYear(), now.getMonth(), 0);

    prevStart = toDateString(firstDayPrev);
    prevEnd = toDateString(lastDayPrev);
  }

  return { currentStart, currentEnd, prevStart, prevEnd };
}

/**
 * Calculates percentage change between current and previous amount with zero-division safety.
 *
 * @param {number} currentPaise
 * @param {number} prevPaise
 * @returns {Object} { percent, direction: 'up'|'down'|'flat', text }
 */
export function calculateComparison(currentPaise = 0, prevPaise = 0) {
  if (prevPaise === 0) {
    if (currentPaise === 0) {
      return { percent: 0, direction: 'flat', text: 'No change' };
    }
    return { percent: null, direction: 'up', text: 'New spending' };
  }

  const diffPaise = currentPaise - prevPaise;
  const percent = Math.round((Math.abs(diffPaise) / prevPaise) * 100);

  if (diffPaise > 0) {
    return { percent, direction: 'up', text: `+${percent}% vs previous period` };
  } else if (diffPaise < 0) {
    return { percent, direction: 'down', text: `-${percent}% vs previous period` };
  }

  return { percent: 0, direction: 'flat', text: 'No change' };
}

/**
 * Filters and aggregates transactions for the given timeframe.
 *
 * @param {Array} transactions
 * @param {string} timeframe
 * @param {string} [customStart]
 * @param {string} [customEnd]
 * @returns {Object} Complete analytics dataset
 */
export function computeAnalytics(transactions = [], timeframe = 'This Month', customStart = '', customEnd = '') {
  const { currentStart, currentEnd, prevStart, prevEnd } = getDateRanges(timeframe, customStart, customEnd);

  let currentInflowPaise = 0;
  let currentBurnPaise = 0;
  let prevBurnPaise = 0;

  const currentTxs = [];
  const categoryMapPaise = {};
  const paymentMap = {}; // { [method]: { count, amountPaise } }

  let largestExpense = null;
  let weekdayBurnPaise = 0;
  let weekendBurnPaise = 0;

  for (const tx of transactions) {
    const txDate = (tx.date || '').slice(0, 10);
    if (!txDate) continue;

    const isIncome = tx.type === 'credit' || tx.type === 'income';
    const amtPaise = tx.amountPaise !== undefined
      ? Math.round(Number(tx.amountPaise) || 0)
      : toPaise(tx.amount);

    // Current period
    if (txDate >= currentStart && txDate <= currentEnd) {
      currentTxs.push(tx);

      if (isIncome) {
        currentInflowPaise += amtPaise;
      } else {
        currentBurnPaise += amtPaise;

        const cat = tx.category || 'Other';
        categoryMapPaise[cat] = (categoryMapPaise[cat] || 0) + amtPaise;

        const method = tx.paymentMethod || 'Other';
        if (!paymentMap[method]) {
          paymentMap[method] = { method, count: 0, amountPaise: 0 };
        }
        paymentMap[method].count += 1;
        paymentMap[method].amountPaise += amtPaise;

        if (!largestExpense || amtPaise > toPaise(largestExpense.amount)) {
          largestExpense = tx;
        }

        // Weekend vs Weekday analysis
        const dateObj = new Date(txDate);
        const dayOfWeek = dateObj.getDay(); // 0 is Sun, 6 is Sat
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          weekendBurnPaise += amtPaise;
        } else {
          weekdayBurnPaise += amtPaise;
        }
      }
    }

    // Previous comparison period (expenses only for burn comparison)
    if (txDate >= prevStart && txDate <= prevEnd && !isIncome) {
      prevBurnPaise += amtPaise;
    }
  }

  // Net saved and savings rate
  const netSavedPaise = currentInflowPaise - currentBurnPaise;
  const savingsRate = currentInflowPaise > 0
    ? Math.max(0, Math.round(((currentInflowPaise - currentBurnPaise) / currentInflowPaise) * 100))
    : 0;

  // Comparison vs previous period
  const burnComparison = calculateComparison(currentBurnPaise, prevBurnPaise);

  // Ranked Categories
  const rankedCategories = Object.entries(categoryMapPaise)
    .map(([name, p]) => ({
      name,
      amountPaise: p,
      amount: fromPaise(p),
      percentage: currentBurnPaise > 0 ? Math.round((p / currentBurnPaise) * 100) : 0,
    }))
    .sort((a, b) => b.amountPaise - a.amountPaise);

  // Payment Breakdown
  const paymentBreakdown = Object.values(paymentMap)
    .map((pm) => ({
      method: pm.method,
      count: pm.count,
      amount: fromPaise(pm.amountPaise),
      percentage: currentBurnPaise > 0 ? Math.round((pm.amountPaise / currentBurnPaise) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Trend bars:
  // If This Week: 7 daily bars (Mon to Sun)
  // Otherwise: 4 weekly buckets or daily buckets
  let trendBars = [];
  if (timeframe === 'This Week') {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const dayTotals = [0, 0, 0, 0, 0, 0, 0];

    const s = new Date(currentStart);
    for (let i = 0; i < 7; i++) {
      const cur = new Date(s);
      cur.setDate(s.getDate() + i);
      const curStr = toDateString(cur);

      const dayTxs = currentTxs.filter((t) => (t.date || '').slice(0, 10) === curStr && (t.type === 'debit' || t.type === 'expense'));
      const daySum = dayTxs.reduce((sum, t) => sum + (t.amountPaise !== undefined ? t.amountPaise : toPaise(t.amount)), 0);
      dayTotals[i] = fromPaise(daySum);
    }

    trendBars = days.map((label, idx) => ({
      label,
      value: dayTotals[idx],
    }));
  } else {
    // 4-week distribution
    const weekTotals = [0, 0, 0, 0];
    currentTxs.forEach((tx) => {
      if (tx.type === 'debit' || tx.type === 'expense') {
        const d = new Date(tx.date || Date.now());
        const day = d.getDate();
        const wIdx = Math.min(3, Math.floor((day - 1) / 7));
        weekTotals[wIdx] += tx.amountPaise !== undefined ? tx.amountPaise : toPaise(tx.amount);
      }
    });

    trendBars = ['Wk 1', 'Wk 2', 'Wk 3', 'Wk 4'].map((label, idx) => ({
      label,
      value: fromPaise(weekTotals[idx]),
    }));
  }

  // Generate Data-Driven Local Insights
  const insights = [];

  // Insight 1: UPI preference
  const upiRecord = paymentBreakdown.find((p) => p.method.toUpperCase().includes('UPI'));
  if (upiRecord && upiRecord.percentage > 0) {
    insights.push({
      id: 'upi',
      icon: 'bolt',
      colorToken: 'primary',
      title: 'Digital Payments Lead',
      description: `${upiRecord.percentage}% of your expenses (${upiRecord.count} transactions) were completed via UPI / QR.`,
    });
  }

  // Insight 2: Top category outflow
  if (rankedCategories.length > 0) {
    const topCat = rankedCategories[0];
    insights.push({
      id: 'top-cat',
      icon: 'pie_chart',
      colorToken: 'tertiary-fixed',
      title: `${topCat.name} is Your #1 Outflow`,
      description: `${topCat.name} accounts for ${topCat.percentage}% (₹${topCat.amount}) of all spend in this period.`,
    });
  }

  // Insight 3: Weekend vs Weekday
  if (weekendBurnPaise > 0 || weekdayBurnPaise > 0) {
    const totalOut = weekendBurnPaise + weekdayBurnPaise;
    const weekendPct = Math.round((weekendBurnPaise / totalOut) * 100);
    if (weekendPct >= 40) {
      insights.push({
        id: 'weekend',
        icon: 'weekend',
        colorToken: 'secondary-container',
        title: 'Elevated Weekend Spending',
        description: `Weekends accounted for ${weekendPct}% of spending despite being only 2 out of 7 days.`,
      });
    }
  }

  // Insight 4: Largest single outlay
  if (largestExpense) {
    insights.push({
      id: 'largest',
      icon: 'emoji_events',
      colorToken: 'surface-container-high',
      title: 'Largest Single Outlay',
      description: `${largestExpense.description || largestExpense.category} totaling ₹${Number(largestExpense.amount).toLocaleString('en-IN')}.`,
    });
  }

  // Insight 5: Daily average burn
  const sDate = new Date(currentStart);
  const eDate = new Date(currentEnd);
  const numDays = Math.max(1, Math.ceil(Math.abs(eDate - sDate) / (1000 * 60 * 60 * 24)) + 1);
  const dailyAveragePaise = Math.round(currentBurnPaise / numDays);

  insights.push({
    id: 'run-rate',
    icon: 'today',
    colorToken: 'surface-container-highest',
    title: 'Daily Run Rate',
    description: `Average outflow is approximately ₹${fromPaise(dailyAveragePaise).toLocaleString('en-IN')}/day over ${numDays} days.`,
  });

  return {
    timeframe,
    currentStart,
    currentEnd,
    prevStart,
    prevEnd,
    numDays,
    totalInflow: fromPaise(currentInflowPaise),
    totalBurn: fromPaise(currentBurnPaise),
    netSaved: fromPaise(netSavedPaise),
    savingsRate,
    burnComparison,
    rankedCategories,
    paymentBreakdown,
    trendBars,
    largestExpense,
    insights,
    transactionCount: currentTxs.length,
  };
}
