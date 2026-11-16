// src/screens/SpendingInsights.jsx — Analytics and spending trends
// Timeframe filtering (Today, This Week, This Month, Previous Month, Custom Range),
// period comparison, cash flow breakdown, trend bar chart, ranked outflows, payment methods, and local insights.

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Icon from '../components/ui/Icon';
import { db } from '../db/db';
import { useProfile } from '../contexts/ProfileContext';
import { formatINR } from '../utils/currency';
import { toDateString } from '../utils/recurring';
import { findCategory, getCategoryBgClass, getCategoryTextClass } from '../utils/categories';
import { computeAnalytics } from '../utils/analytics';

const TIMEFRAMES = ['Today', 'This Week', 'This Month', 'Previous Month', 'Custom Range'];

const SpendingInsights = () => {
  const { activeProfileId } = useProfile();
  const [timeframe, setTimeframe] = useState('This Month');

  // Custom range state (defaults to first of month to today)
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [customStart, setCustomStart] = useState(toDateString(firstOfMonth));
  const [customEnd, setCustomEnd] = useState(toDateString(now));

  const transactions = useLiveQuery(
    () =>
      activeProfileId
        ? db.transactions.where('profileId').equals(activeProfileId).toArray()
        : [],
    [activeProfileId]
  ) || [];

  // Metrics computation using the analytics engine
  const analytics = useMemo(() => {
    return computeAnalytics(transactions, timeframe, customStart, customEnd);
  }, [transactions, timeframe, customStart, customEnd]);

  const {
    totalInflow,
    totalBurn,
    netSaved,
    savingsRate,
    burnComparison,
    rankedCategories,
    paymentBreakdown,
    trendBars,
    insights,
    transactionCount,
    currentStart,
    currentEnd,
  } = analytics;

  const maxTrendVal = Math.max(...trendBars.map((b) => b.value), 1000);

  return (
    <div className="flex flex-col w-full gap-space-md select-none pb-12">
      {/* ── Timeframe Selector (Horizontal Chips) ───────── */}
      <div className="flex items-center gap-space-xs overflow-x-auto pb-1 -mx-gutter px-gutter no-scrollbar">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            type="button"
            onClick={() => setTimeframe(tf)}
            className={`min-h-[44px] px-space-md py-1.5 rounded-full text-label-md flex items-center justify-center shrink-0 transition-colors ${
              timeframe === tf
                ? 'bg-primary-container text-on-primary shadow-sm font-semibold'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {tf}
          </button>
        ))}
      </div>

      {/* ── Custom Date Range Inputs (Visible when Custom Range selected) ── */}
      {timeframe === 'Custom Range' && (
        <div className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm flex flex-col gap-3">
          <span className="text-label-sm uppercase tracking-wider text-primary font-bold">
            Select Custom Date Window
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-label-sm text-on-surface-variant font-medium">From</label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-surface-container border border-outline/30 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-label-sm text-on-surface-variant font-medium">To</label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-surface-container border border-outline/30 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Period Comparison Badge / Banner ─────────────── */}
      <div className="bg-surface-container-lowest rounded-2xl p-3 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              burnComparison.direction === 'up'
                ? 'bg-error-container text-on-error-container'
                : burnComparison.direction === 'down'
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-surface-container text-on-surface-variant'
            }`}
          >
            <Icon
              name={
                burnComparison.direction === 'up'
                  ? 'trending_up'
                  : burnComparison.direction === 'down'
                  ? 'trending_down'
                  : 'remove'
              }
              size={18}
            />
          </div>
          <div>
            <span className="text-label-sm uppercase tracking-wider text-on-surface-variant font-bold block">
              Spending Velocity
            </span>
            <span className="text-label-md font-bold text-on-surface">
              {burnComparison.text}
            </span>
          </div>
        </div>

        <span className="text-label-sm text-on-surface-variant">
          {transactionCount} {transactionCount === 1 ? 'record' : 'records'}
        </span>
      </div>

      {/* ── Cash Flow Summary & Savings Rate Banner ─────── */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-space-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Icon name="account_balance_wallet" size={20} className="text-secondary" />
            <span className="text-headline-sm text-on-surface font-semibold">
              Cash Flow & Savings
            </span>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-label-sm font-bold">
            <Icon name={totalInflow > 0 ? "trending_up" : "trending_down"} size={14} />
            {totalInflow > 0 ? `${savingsRate}% Saved` : 'Outflow Cycle'}
          </span>
        </div>

        {/* Metrics Split */}
        <div className="grid grid-cols-2 gap-space-sm pt-1">
          <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col">
            <span className="text-label-sm text-on-surface-variant">Total Inflow</span>
            <span className="text-headline-md text-secondary font-bold tabular-nums">
              {formatINR(totalInflow)}
            </span>
          </div>
          <div className="bg-surface-container-low rounded-xl p-space-sm flex flex-col">
            <span className="text-label-sm text-on-surface-variant">Total Burn</span>
            <span className="text-headline-md text-error font-bold tabular-nums">
              {formatINR(totalBurn)}
            </span>
          </div>
        </div>

        {/* Comparative Stacked Progress Bar / Cash Flow Status */}
        {totalInflow > 0 ? (
          <div className="flex flex-col gap-1.5 pt-1">
            <div className="w-full h-3 rounded-full bg-surface-container overflow-hidden flex">
              <div
                className="h-full bg-secondary transition-all duration-500"
                style={{ width: `${Math.min(100, savingsRate)}%` }}
              />
              <div
                className="h-full bg-error transition-all duration-500"
                style={{ width: `${Math.max(0, 100 - savingsRate)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-on-surface-variant text-label-sm">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-secondary" />
                Net Stashed: <strong className="text-on-surface">{formatINR(netSaved)}</strong>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-error" />
                Spent: <strong className="text-on-surface">{Math.max(0, 100 - savingsRate)}%</strong>
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-low text-label-sm text-on-surface-variant">
            <span>Net Outlay: <strong className="text-error font-bold">{formatINR(totalBurn)}</strong></span>
            <span className="text-outline">No income logged in period</span>
          </div>
        )}
      </div>

      {/* ── Trend Analysis Chart ─────────────────────────── */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-space-sm">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-label-sm uppercase tracking-wider text-primary font-bold">
              Trend Analysis
            </span>
            <h2 className="text-headline-sm text-on-surface font-semibold">Spending Velocity</h2>
          </div>
          <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-label-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Total {formatINR(totalBurn)}
          </div>
        </div>

        {/* Visual SVG Bar Chart */}
        <div className="relative w-full pt-4 pb-1">
          <svg className="w-full h-44 overflow-visible" viewBox="0 0 340 160">
            <defs>
              <linearGradient id="barGradientPrimary" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#0F766E" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#80D5CB" stopOpacity="0.8" />
              </linearGradient>
              <linearGradient id="barGradientPeak" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#BA1A1A" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#FFDAD6" stopOpacity="0.75" />
              </linearGradient>
            </defs>

            {/* Guides */}
            <line stroke="#DAE2FD" strokeDasharray="3 3" strokeWidth="1" x1="20" x2="330" y1="20" y2="20" />
            <line stroke="#DAE2FD" strokeWidth="1" x1="20" x2="330" y1="120" y2="120" />

            {/* Bars */}
            {trendBars.map((bar, idx) => {
              const numBars = trendBars.length;
              const barWidth = numBars === 7 ? 28 : 42;
              const spacing = (310 - numBars * barWidth) / (numBars + 1);
              const xPos = 20 + spacing + idx * (barWidth + spacing);
              const height = maxTrendVal > 0 ? (bar.value / maxTrendVal) * 85 : 0;
              const isPeak = bar.value === Math.max(...trendBars.map((b) => b.value)) && bar.value > 0;

              return (
                <g key={bar.label}>
                  <rect
                    fill={isPeak ? 'url(#barGradientPeak)' : 'url(#barGradientPrimary)'}
                    x={xPos}
                    y={120 - height}
                    width={barWidth}
                    height={Math.max(4, height)}
                    rx={6}
                    className="hover:opacity-90 transition-opacity"
                  />
                  <text
                    x={xPos + barWidth / 2}
                    y={110 - height}
                    textAnchor="middle"
                    className={`text-[9px] font-bold ${isPeak ? 'fill-[#BA1A1A]' : 'fill-[#131B2E]'}`}
                  >
                    {bar.value > 0
                      ? bar.value >= 1000
                        ? `₹${Math.round(bar.value / 1000)}k`
                        : `₹${bar.value}`
                      : '₹0'}
                  </text>
                  <text
                    x={xPos + barWidth / 2}
                    y={136}
                    textAnchor="middle"
                    className="text-[10px] fill-[#3E4947] font-medium"
                  >
                    {bar.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* ── Ranked Category Outflows ─────────────────────── */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-space-md">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-label-sm uppercase tracking-wider text-primary font-bold">
              Category Distribution
            </span>
            <h2 className="text-headline-sm text-on-surface font-semibold">Ranked Outflows</h2>
          </div>
          <div className="text-right">
            <span className="text-label-sm text-on-surface-variant block">Total Spend</span>
            <span className="text-numeral-dense font-bold text-on-surface tabular-nums">
              {formatINR(totalBurn)}
            </span>
          </div>
        </div>

        {/* Ranked Categories List */}
        <div className="flex flex-col gap-space-sm pt-1">
          {rankedCategories.length === 0 ? (
            <p className="text-body-sm text-on-surface-variant text-center py-4">
              No expenses recorded in this period
            </p>
          ) : (
            rankedCategories.map((c) => {
              const catDef = findCategory(c.name);
              const bgClass = getCategoryBgClass(catDef.colorToken);
              const textClass = getCategoryTextClass(catDef.colorToken);

              return (
                <div
                  key={c.name}
                  className="bg-surface-container-low rounded-xl p-space-sm flex flex-col gap-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-full ${bgClass} ${textClass} flex items-center justify-center shrink-0`}
                      >
                        <Icon name={catDef.icon} size={18} />
                      </div>
                      <span className="text-label-lg text-on-surface font-semibold truncate">
                        {c.name}
                      </span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-numeral-dense font-bold text-on-surface tabular-nums">
                        {formatINR(c.amount)}
                      </span>
                      <span className="text-label-sm text-on-surface-variant block">
                        {c.percentage}% of total
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surface-container overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${c.percentage}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Payment Method Distribution ──────────────────── */}
      {paymentBreakdown.length > 0 && (
        <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm flex flex-col gap-3">
          <div>
            <span className="text-label-sm uppercase tracking-wider text-primary font-bold">
              Payment Methods
            </span>
            <h2 className="text-headline-sm text-on-surface font-semibold">
              Payment Breakdown
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {paymentBreakdown.map((pm) => (
              <div
                key={pm.method}
                className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between">
                  <span className="text-label-md text-on-surface font-bold truncate">
                    {pm.method}
                  </span>
                  <span className="text-label-sm font-semibold text-primary">
                    {pm.percentage}%
                  </span>
                </div>
                <span className="text-body-md text-on-surface font-bold tabular-nums">
                  {formatINR(pm.amount)}
                </span>
                <span className="text-body-xs text-on-surface-variant">
                  {pm.count} {pm.count === 1 ? 'transaction' : 'transactions'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Key Spending Insights (Bento Stack) ─────────── */}
      <div className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Icon name="insights" size={20} className="text-primary" />
            <h3 className="text-headline-sm text-on-surface font-semibold">Local Insights</h3>
          </div>
          <span className="text-label-sm text-primary font-bold">100% On-Device</span>
        </div>

        <div className="flex flex-col gap-2.5">
          {insights.map((ins) => (
            <div
              key={ins.id}
              className="bg-surface-container-lowest rounded-2xl p-space-sm shadow-sm flex items-start gap-space-sm"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                <Icon name={ins.icon} size={20} />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-label-lg text-on-surface font-semibold">
                  {ins.title}
                </span>
                <p className="text-body-md text-on-surface-variant leading-snug mt-0.5">
                  {ins.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SpendingInsights;
