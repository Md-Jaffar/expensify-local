// src/screens/Dashboard.jsx — Home dashboard screen
// Full integration of financial overview, metrics, budget pacing, and recent activity

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import Icon from '../components/ui/Icon';
import HeroFinancialCard from '../components/dashboard/HeroFinancialCard';
import QuickStatsGrid from '../components/dashboard/QuickStatsGrid';
import BudgetProgressCard from '../components/dashboard/BudgetProgressCard';
import SpendingBreakdownCard from '../components/dashboard/SpendingBreakdownCard';
import RecentActivitySection from '../components/dashboard/RecentActivitySection';
import { db } from '../db/db';
import { useProfile } from '../contexts/ProfileContext';
import { getGreeting, isToday, isThisWeek, getMonthYear, currentMonthYearKey, toMonthYearKey } from '../utils/date';
import { toPaise, fromPaise, formatINR } from '../utils/currency';
import { toDateString } from '../utils/recurring';
import { getBudgetsWithSpend } from '../utils/budgets';

const Dashboard = () => {
  const navigate = useNavigate();
  const { activeProfileId } = useProfile();
  const [selectedMonth] = useState(new Date());

  // ── Queries from Dexie ────────────────────────────────────────────────
  const profile = useLiveQuery(
    () => (activeProfileId ? db.profiles.get(activeProfileId) : null),
    [activeProfileId]
  );

  const dueRecurring = useLiveQuery(
    () =>
      activeProfileId
        ? db.recurringTemplates
            .where('profileId')
            .equals(activeProfileId)
            .filter((t) => t.isActive && t.nextDueDate && t.nextDueDate.slice(0, 10) <= toDateString(new Date()))
            .toArray()
        : [],
    [activeProfileId]
  ) || [];

  const transactions = useLiveQuery(
    () =>
      activeProfileId
        ? db.transactions
            .where('profileId')
            .equals(activeProfileId)
            .reverse()
            .sortBy('date')
        : [],
    [activeProfileId]
  ) || [];

  const settings = useLiveQuery(
    () =>
      activeProfileId
        ? db.settings.where('profileId').equals(activeProfileId).toArray()
        : [],
    [activeProfileId]
  ) || [];

  const storedBudgets = useLiveQuery(
    () =>
      activeProfileId
        ? db.budgets.where('profileId').equals(activeProfileId).toArray()
        : [],
    [activeProfileId]
  ) || [];

  // Monthly Budget setting
  const budgetSetting = settings.find((s) => s.key === 'monthlyBudget');
  const monthlyBudgetLimit = budgetSetting?.value || 50000;

  // ── Computations ──────────────────────────────────────────────────────
  const currentKey = toMonthYearKey(selectedMonth);
  const budgetSummary = getBudgetsWithSpend(
    storedBudgets,
    transactions,
    currentKey,
    toPaise(monthlyBudgetLimit)
  );

  const monthTransactions = transactions.filter(
    (tx) => tx.date && toMonthYearKey(tx.date) === currentKey
  );

  let totalIncomePaise = 0;
  let totalExpensePaise = 0;
  let todaySpendPaise = 0;
  let todayCount = 0;
  let weekSpendPaise = 0;

  const categoryTotalsPaise = {};

  monthTransactions.forEach((tx) => {
    const isIncome = tx.type === 'credit' || tx.type === 'income';
    const amountPaise = toPaise(tx.amount);

    if (isIncome) {
      totalIncomePaise += amountPaise;
    } else {
      totalExpensePaise += amountPaise;

      if (isToday(tx.date)) {
        todaySpendPaise += amountPaise;
        todayCount += 1;
      }

      if (isThisWeek(tx.date)) {
        weekSpendPaise += amountPaise;
      }

      const catName = tx.category || 'Other';
      categoryTotalsPaise[catName] = (categoryTotalsPaise[catName] || 0) + amountPaise;
    }
  });

  const totalIncome = fromPaise(totalIncomePaise);
  const totalExpense = fromPaise(totalExpensePaise);
  const todaySpend = fromPaise(todaySpendPaise);
  const weekSpend = fromPaise(weekSpendPaise);
  const netBalance = fromPaise(totalIncomePaise - totalExpensePaise);
  const remainingBudget = fromPaise(toPaise(monthlyBudgetLimit) - totalExpensePaise);

  // Days in month calculation for daily average using paise arithmetic
  const now = new Date();
  const daysPassed = now.getDate();
  const dailyAverage = daysPassed > 0 ? fromPaise(Math.round(totalExpensePaise / daysPassed)) : 0;

  // Category breakdown list
  const breakdown = Object.entries(categoryTotalsPaise)
    .map(([name, p]) => {
      const amount = fromPaise(p);
      return {
        name,
        amount,
        percentage: totalExpensePaise > 0 ? Math.round((p / totalExpensePaise) * 100) : 0,
      };
    })
    .sort((a, b) => b.amount - a.amount);

  const profileName = profile?.name || 'Rahul';
  const monthLabel = getMonthYear(selectedMonth);

  return (
    <div className="flex flex-col w-full pb-6 space-y-4 select-none">
      {/* ── Top Greeting & Context Bar ──────────────────── */}
      <div className="flex items-start justify-between gap-2 pt-1">
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-container/40 text-on-secondary-container text-label-sm font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              {profileName} Vault
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-container-high text-primary text-label-sm font-semibold">
              <Icon name="lock" size={13} className="text-primary" />
              100% Private
            </span>
          </div>
          <h2 className="text-headline-md text-on-surface mt-1 truncate font-semibold">
            {getGreeting()}, {profileName}
          </h2>
        </div>

        {/* Month Selector Pill */}
        <button
          type="button"
          className="min-h-[44px] flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-low hover:bg-surface-container active:scale-95 transition-all text-on-surface shadow-sm focus:outline-none"
        >
          <Icon name="calendar_month" size={18} className="text-primary" />
          <span className="text-label-md font-semibold">{monthLabel}</span>
          <Icon name="arrow_drop_down" size={16} className="text-on-surface-variant" />
        </button>
      </div>

      {/* ── Due Recurring Alert Banner (Confirmation-Based) ── */}
      {dueRecurring.length > 0 && (
        <div
          onClick={() => navigate('/recurring')}
          className="bg-primary-container/10 border border-primary-container/30 rounded-2xl p-3.5 flex items-center justify-between cursor-pointer hover:bg-primary-container/15 transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary flex items-center justify-center flex-shrink-0 animate-pulse">
              <Icon name="notification_important" size={20} />
            </div>
            <div>
              <span className="text-label-md font-bold text-on-surface block">
                {dueRecurring.length} Recurring Bill{dueRecurring.length > 1 ? 's' : ''} Due
              </span>
              <span className="text-body-sm text-on-surface-variant">
                Total: {formatINR(dueRecurring.reduce((sum, t) => sum + (Number(t.amount) || 0), 0))} • Tap to confirm or skip
              </span>
            </div>
          </div>
          <Icon name="chevron_right" size={20} className="text-primary" />
        </div>
      )}

      {/* ── Hero Financial Overview Card ───────────────── */}
      <HeroFinancialCard
        balance={netBalance}
        income={totalIncome}
        expense={totalExpense}
        comparisonText="Local Vault Audited"
      />

      {/* ── Quick Stats Grid (2x2) ─────────────────────── */}
      <QuickStatsGrid
        todaySpend={todaySpend}
        todayCount={todayCount}
        weekSpend={weekSpend}
        dailyAverage={dailyAverage}
        remainingBudget={remainingBudget}
      />

      {/* ── Monthly Budget Progress Card ───────────────── */}
      <BudgetProgressCard
        spent={totalExpense}
        limit={budgetSummary.overall.limit || monthlyBudgetLimit}
        alertThreshold={budgetSummary.overall.alertThreshold || 80}
        alertsCount={budgetSummary.alerts.length}
      />

      {/* ── Spending Breakdown Donut Card ──────────────── */}
      <SpendingBreakdownCard
        breakdown={breakdown}
        total={totalExpense}
        monthLabel={monthLabel}
      />

      {/* ── Recent Activity Section ────────────────────── */}
      <RecentActivitySection
        transactions={transactions.slice(0, 5)}
      />

      {/* ── Privacy & Local Vault Info Snippet ─────────── */}
      <div className="rounded-2xl bg-surface-container p-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
          <Icon name="encrypted" size={20} />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-label-md text-on-surface font-semibold">
            Zero-Cloud Storage Guarantee
          </span>
          <span className="text-body-sm text-on-surface-variant">
            Your expenses never leave this device. Stored privately in local browser IndexedDB.
          </span>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
