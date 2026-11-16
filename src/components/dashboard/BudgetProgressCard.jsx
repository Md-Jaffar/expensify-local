// src/components/dashboard/BudgetProgressCard.jsx — Monthly budget progress card
// Shows spent vs limit, gradient bar with alert threshold marker, cushion, and link to /budgets

import { useNavigate } from 'react-router-dom';
import Icon from '../ui/Icon';
import { formatINR } from '../../utils/currency';

/**
 * BudgetProgressCard displays monthly budget pacing against a set spending limit,
 * with alerts for category or overall limits and direct navigation to budget controls.
 */
const BudgetProgressCard = ({
  spent = 0,
  limit = 50000,
  alertThreshold = 80,
  alertsCount = 0,
}) => {
  const navigate = useNavigate();
  const hasLimit = limit && limit > 0;
  const effectiveLimit = hasLimit ? limit : 50000;
  const percent = Math.min(100, Math.round((spent / effectiveLimit) * 100));
  const remaining = Math.max(0, effectiveLimit - spent);
  const isOver = spent > effectiveLimit;
  const isCaution = percent >= alertThreshold && !isOver;

  return (
    <div
      onClick={() => navigate('/budgets')}
      className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-2.5 cursor-pointer hover:bg-surface-container-low transition-colors"
      role="button"
      tabIndex={0}
      title="Click to manage budgets"
    >
      {/* ── Top Header ─────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            <Icon name="account_balance_wallet" size={17} />
          </div>
          <span className="text-label-lg text-on-surface font-semibold">
            Monthly Budget Limit
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {alertsCount > 0 && (
            <span className="text-label-sm font-bold px-2 py-0.5 rounded-full bg-error-container text-on-error-container flex items-center gap-1">
              <Icon name="warning" size={13} />
              {alertsCount} {alertsCount === 1 ? 'alert' : 'alerts'}
            </span>
          )}

          <span
            className={`text-label-sm font-semibold px-2 py-0.5 rounded-full ${
              isOver
                ? 'bg-error-container text-on-error-container'
                : isCaution
                ? 'bg-tertiary-fixed text-on-tertiary-fixed font-bold'
                : 'bg-secondary-container/50 text-on-secondary-container'
            }`}
          >
            {isOver ? 'Over budget' : isCaution ? 'Near limit' : 'On track'}
          </span>

          <Icon name="chevron_right" size={18} className="text-on-surface-variant/70" />
        </div>
      </div>

      {/* ── Value & Percentage ─────────────────────────── */}
      <div className="flex items-baseline justify-between pt-1">
        <div className="flex items-baseline gap-1">
          <span className="text-headline-sm text-on-surface font-bold tabular-nums">
            {formatINR(spent)}
          </span>
          <span className="text-body-sm text-on-surface-variant tabular-nums">
            / {formatINR(effectiveLimit)}
          </span>
        </div>
        <span
          className={`text-label-md font-bold ${
            isOver ? 'text-error' : isCaution ? 'text-tertiary' : 'text-primary'
          }`}
        >
          {percent}%
        </span>
      </div>

      {/* ── Dual-tone Progress Bar with Configurable Threshold Marker ── */}
      <div className="relative w-full h-3 bg-surface-container rounded-full overflow-hidden my-1">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            isOver
              ? 'bg-error'
              : 'bg-gradient-to-r from-primary-container via-primary to-secondary'
          }`}
          style={{ width: `${percent}%` }}
        />
        {/* Warning Limit indicator line */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-error/70 z-10"
          style={{ left: `${alertThreshold}%` }}
          title={`${alertThreshold}% Warning Limit`}
        />
      </div>

      {/* ── Legend row ─────────────────────────────────── */}
      <div className="flex items-center justify-between text-on-surface-variant text-label-sm">
        <span className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${isOver ? 'bg-error' : 'bg-primary'}`} />
          {isOver ? `${formatINR(spent - effectiveLimit)} over limit` : `${formatINR(remaining)} cushion left`}
        </span>
        <span className="flex items-center gap-1 text-on-surface-variant/80">
          <span className="w-1.5 h-1.5 rounded-full bg-error" />
          {alertThreshold}% mark: {formatINR((effectiveLimit * alertThreshold) / 100)}
        </span>
      </div>
    </div>
  );
};

export default BudgetProgressCard;
