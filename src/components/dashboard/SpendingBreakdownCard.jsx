// src/components/dashboard/SpendingBreakdownCard.jsx — Spending breakdown donut chart and legend
// Renders an SVG donut chart with category distribution and tabular legend

import Icon from '../ui/Icon';
import { formatINR } from '../../utils/currency';

// Color map for donut segments matching Stitch tokens
const CATEGORY_COLORS = [
  '#0f766e', // Dining / Primary container
  '#006c49', // Groceries / Secondary
  '#ffb95f', // Transport / Tertiary fixed dim
  '#80d5cb', // Shopping / Primary fixed dim
  '#dae2fd', // Housing / Surface container highest
  '#ba1a1a', // Health / Error
  '#945d00', // Bills / Tertiary container
];

/**
 * SpendingBreakdownCard renders the donut visual and ranked category rows.
 * @param {Array} breakdown - Array of { name, amount, percentage }
 * @param {number} total - Total spend for the active month
 * @param {string} monthLabel - e.g. "Oct '24"
 */
const SpendingBreakdownCard = ({ breakdown = [], total = 0, monthLabel = 'This Month' }) => {
  const circum = 2 * Math.PI * 62; // ~389.56
  let cumulativePercent = 0;

  return (
    <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-3">
      {/* ── Top Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-tertiary-fixed flex items-center justify-center text-on-tertiary-fixed">
            <Icon name="donut_small" size={17} />
          </div>
          <h3 className="text-headline-sm text-on-surface font-semibold">
            Spending Breakdown
          </h3>
        </div>
        <span className="text-label-sm text-on-surface-variant">
          {breakdown.length} {breakdown.length === 1 ? 'Category' : 'Categories'}
        </span>
      </div>

      {/* ── SVG Donut Chart + Centered Label ───────────── */}
      <div className="flex items-center justify-center py-2">
        <div className="relative w-44 h-44 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 160 160">
            {/* Background track circle */}
            <circle
              cx="80"
              cy="80"
              r="62"
              fill="transparent"
              stroke="#f2f3ff"
              strokeWidth="18"
            />

            {/* Segments */}
            {breakdown.map((item, index) => {
              const strokeColor = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
              const dashLength = (item.percentage / 100) * circum;
              const dashOffset = -(cumulativePercent / 100) * circum;
              cumulativePercent += item.percentage;

              return (
                <circle
                  key={item.name}
                  cx="80"
                  cy="80"
                  r="62"
                  fill="transparent"
                  stroke={strokeColor}
                  strokeWidth="18"
                  strokeDasharray={`${dashLength} ${circum}`}
                  strokeDashoffset={dashOffset}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* Centered Total Graphic */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-label-sm text-on-surface-variant uppercase tracking-wider">
              Total
            </span>
            <span className="text-headline-sm text-on-surface font-bold tabular-nums">
              {formatINR(total)}
            </span>
            <span className="text-body-sm text-secondary font-medium">
              {monthLabel}
            </span>
          </div>
        </div>
      </div>

      {/* ── Donut Legend Grid ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-1 pt-1">
        {breakdown.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant text-center py-2">
            No expense categories recorded yet
          </p>
        ) : (
          breakdown.map((item, index) => {
            const dotColor = CATEGORY_COLORS[index % CATEGORY_COLORS.length];
            return (
              <div
                key={item.name}
                className="flex items-center justify-between py-1 px-2 rounded-xl hover:bg-surface-container-low transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: dotColor }}
                  />
                  <span className="text-body-md text-on-surface font-medium truncate">
                    {item.name}
                  </span>
                  <span className="text-label-sm text-on-surface-variant">
                    {item.percentage}%
                  </span>
                </div>
                <span className="text-numeral-dense text-on-surface font-semibold tabular-nums ml-2">
                  {formatINR(item.amount)}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default SpendingBreakdownCard;
