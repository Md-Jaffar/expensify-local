// src/components/ui/TransactionRow.jsx — Transaction list item
// Matches Stitch design for both credit and debit items

import Icon from './Icon';
import CurrencyAmount from './CurrencyAmount';
import { formatDate, formatTime } from '../../utils/date';
import { findCategory, getCategoryBgClass, getCategoryTextClass } from '../../utils/categories';

/**
 * TransactionRow represents a single line-item transaction.
 * @param {Object} transaction - Dexie transaction record
 * @param {Function} onClick - Optional click handler (e.g., to open detail bottom sheet)
 */
const TransactionRow = ({ transaction, onClick }) => {
  if (!transaction) return null;

  const isIncome = transaction.type === 'credit' || transaction.type === 'income';
  const categoryDef = findCategory(transaction.category);
  const bgClass = getCategoryBgClass(categoryDef.colorToken);
  const textClass = getCategoryTextClass(categoryDef.colorToken);

  const timeString = transaction.date ? `${formatDate(transaction.date)}, ${formatTime(transaction.date)}` : '';

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer select-none
        ${isIncome
          ? 'bg-secondary-container/20 hover:bg-secondary-container/30 active:bg-secondary-container/40'
          : 'hover:bg-surface-container-low active:bg-surface-container'
        }`}
    >
      {/* ── Left side: Icon + Merchant Details ───────── */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${bgClass} ${textClass}`}>
          <Icon name={categoryDef.icon} size={22} fill={isIncome ? 1 : 0} />
        </div>

        <div className="flex flex-col min-w-0 pr-2">
          <div className="flex items-center gap-1.5">
            <span className="text-body-md text-on-surface font-semibold truncate">
              {transaction.description || transaction.category || 'Transaction'}
            </span>
            {isIncome && (
              <Icon name="verified" size={15} className="text-secondary flex-shrink-0" fill={1} />
            )}
            {transaction.isRecurring && (
              <Icon name="sync" size={14} className="text-primary flex-shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-1.5 text-on-surface-variant text-body-sm">
            <span className="truncate">{transaction.category} • {timeString}</span>
            {transaction.paymentMethod && (
              <>
                <span className="w-1 h-1 rounded-full bg-outline-variant flex-shrink-0" />
                <span className="px-1.5 py-0.5 rounded-md bg-surface-container text-label-sm text-[10px] text-on-surface-variant flex-shrink-0">
                  {transaction.paymentMethod}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Right side: Amount + Debit/Credit label ──── */}
      <div className="flex flex-col items-end flex-shrink-0 ml-2">
        <CurrencyAmount
          amount={transaction.amount}
          type={isIncome ? 'credit' : 'debit'}
          size="sm"
        />
        <span className={`text-label-sm text-[10px] ${isIncome ? 'text-secondary font-medium' : 'text-on-surface-variant'}`}>
          {isIncome ? 'Credit' : 'Debit'}
        </span>
      </div>
    </div>
  );
};

export default TransactionRow;
