// src/components/dashboard/HeroFinancialCard.jsx — Hero balance card
// Material 3 gradient container with net balance, comparison tag, and income/expense metrics

import Icon from '../ui/Icon';
import { formatINR } from '../../utils/currency';

/**
 * HeroFinancialCard displays total balance and side-by-side income/expense for the active month.
 * @param {number} balance - Net liquid balance (income - expense)
 * @param {number} income - Total income this month
 * @param {number} expense - Total expenses this month
 * @param {string} comparisonText - e.g. "↓ 8% spent less than Sep"
 */
const HeroFinancialCard = ({
  balance = 0,
  income = 0,
  expense = 0,
  comparisonText = 'Local Vault Audited',
}) => {
  const isPositive = balance >= 0;
  const balanceInt = Math.floor(Math.abs(balance));
  const balanceDec = (Math.abs(balance) % 1).toFixed(2).substring(1);

  return (
    <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-primary-container via-primary to-[#090d16] text-on-primary p-5 shadow-hero">
      {/* ── Ambient organic decorative shapes ─────────── */}
      <div className="absolute -right-10 -bottom-10 w-44 h-44 rounded-full bg-secondary-container/15 pointer-events-none blur-2xl" />
      <div className="absolute -left-8 -top-8 w-36 h-36 rounded-full bg-on-primary-container/10 pointer-events-none blur-xl" />

      <div className="relative z-10 flex flex-col">
        {/* Header row */}
        <div className="flex items-center justify-between">
          <span className="text-label-md uppercase tracking-wider text-on-primary-container font-semibold">
            Net Liquid Balance
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-on-primary/15 backdrop-blur-md text-on-primary text-label-sm">
            <Icon name="verified_user" size={14} />
            Audited
          </span>
        </div>

        {/* Currency Display */}
        <div className="flex items-baseline gap-1 mt-1 mb-3">
          <span className="text-display-currency-mobile tracking-tight">
            {!isPositive && '−'}₹{balanceInt.toLocaleString('en-IN')}
          </span>
          <span className="text-label-sm text-on-primary-container font-medium">
            {balanceDec}
          </span>
        </div>

        {/* Comparison Tag */}
        <div className="inline-flex items-center self-start gap-1 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container text-label-sm mb-4 shadow-sm">
          <Icon name="trending_down" size={15} />
          <span>{comparisonText}</span>
        </div>

        {/* Side-by-side Flow Metrics */}
        <div className="grid grid-cols-2 gap-2 bg-on-primary/10 rounded-2xl p-2.5 backdrop-blur-md">
          {/* Monthly Income */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-secondary-container/80 flex items-center justify-center flex-shrink-0 text-on-secondary-container">
              <Icon name="arrow_downward_alt" size={20} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-label-sm text-on-primary-container">Income</span>
              <span className="text-numeral-dense text-on-primary truncate font-bold tabular-nums">
                {formatINR(income)}
              </span>
            </div>
          </div>

          {/* Monthly Expenses */}
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-error-container flex items-center justify-center flex-shrink-0 text-on-error-container">
              <Icon name="arrow_upward_alt" size={20} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-label-sm text-on-primary-container">Expenses</span>
              <span className="text-numeral-dense text-on-primary truncate font-bold tabular-nums">
                {formatINR(expense)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroFinancialCard;
