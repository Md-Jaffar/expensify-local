// src/components/dashboard/QuickStatsGrid.jsx — 2x2 grid of quick statistics
// Displays Today's Spend, This Week, Daily Average, and Remaining Cushion

import Icon from '../ui/Icon';
import { formatINR } from '../../utils/currency';

/**
 * QuickStatsGrid renders 4 compact metric cards matching the Stitch design.
 */
const QuickStatsGrid = ({
  todaySpend = 0,
  todayCount = 0,
  weekSpend = 0,
  dailyAverage = 0,
  remainingBudget = null,
}) => {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {/* ── Stat 1: Today's Spend ──────────────────── */}
      <div className="rounded-2xl bg-surface-container-lowest p-3.5 flex flex-col justify-between shadow-sm min-h-[92px]">
        <div className="flex items-center justify-between">
          <span className="text-label-sm text-on-surface-variant font-medium">Today's Spend</span>
          <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-primary">
            <Icon name="today" size={15} />
          </div>
        </div>
        <div>
          <div className="text-headline-sm text-on-surface font-semibold tracking-tight tabular-nums">
            {formatINR(todaySpend)}
          </div>
          <span className="text-body-sm text-on-surface-variant">
            {todayCount} {todayCount === 1 ? 'transaction' : 'transactions'}
          </span>
        </div>
      </div>

      {/* ── Stat 2: This Week ──────────────────────── */}
      <div className="rounded-2xl bg-surface-container-lowest p-3.5 flex flex-col justify-between shadow-sm min-h-[92px]">
        <div className="flex items-center justify-between">
          <span className="text-label-sm text-on-surface-variant font-medium">This Week</span>
          <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-primary">
            <Icon name="date_range" size={15} />
          </div>
        </div>
        <div>
          <div className="text-headline-sm text-on-surface font-semibold tracking-tight tabular-nums">
            {formatINR(weekSpend)}
          </div>
          <span className="text-body-sm text-secondary font-medium">Within safe pace</span>
        </div>
      </div>

      {/* ── Stat 3: Daily Average ──────────────────── */}
      <div className="rounded-2xl bg-surface-container-lowest p-3.5 flex flex-col justify-between shadow-sm min-h-[92px]">
        <div className="flex items-center justify-between">
          <span className="text-label-sm text-on-surface-variant font-medium">Daily Average</span>
          <div className="w-6 h-6 rounded-full bg-surface-container flex items-center justify-center text-primary">
            <Icon name="query_stats" size={15} />
          </div>
        </div>
        <div>
          <div className="text-headline-sm text-on-surface font-semibold tracking-tight tabular-nums">
            {formatINR(dailyAverage)}
          </div>
          <span className="text-body-sm text-on-surface-variant">Per active day</span>
        </div>
      </div>

      {/* ── Stat 4: Remaining / Cushion ────────────── */}
      <div className="rounded-2xl bg-surface-container-lowest p-3.5 flex flex-col justify-between shadow-sm min-h-[92px]">
        <div className="flex items-center justify-between">
          <span className="text-label-sm text-on-surface-variant font-medium">Remaining</span>
          <div className="w-6 h-6 rounded-full bg-secondary-container/60 flex items-center justify-center text-on-secondary-container">
            <Icon name="savings" size={15} />
          </div>
        </div>
        <div>
          <div className="text-headline-sm text-secondary font-semibold tracking-tight tabular-nums">
            {remainingBudget !== null ? formatINR(Math.max(0, remainingBudget)) : 'No budget'}
          </div>
          <span className="text-body-sm text-on-surface-variant">Budget cushion</span>
        </div>
      </div>
    </div>
  );
};

export default QuickStatsGrid;
