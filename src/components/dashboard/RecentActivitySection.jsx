// src/components/dashboard/RecentActivitySection.jsx — Recent transactions preview
// Shows the latest logged transactions with a quick "View All" link to History

import { useNavigate } from 'react-router-dom';
import TransactionRow from '../ui/TransactionRow';

/**
 * RecentActivitySection displays the last few transactions on the Dashboard.
 */
const RecentActivitySection = ({ transactions = [], onSelectTransaction }) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-2.5 pt-1">
      {/* ── Section Header ─────────────────────────────── */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <h3 className="text-headline-sm text-on-surface font-semibold">
            Recent Activity
          </h3>
          <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary text-label-sm font-semibold">
            Latest
          </span>
        </div>

        <button
          onClick={() => navigate('/history')}
          className="min-h-[44px] px-2 flex items-center text-label-md text-primary font-semibold hover:text-primary-container active:scale-95 transition-all"
        >
          View All
        </button>
      </div>

      {/* ── Transaction List Card ──────────────────────── */}
      <div className="rounded-2xl bg-surface-container-lowest p-2 shadow-sm space-y-1.5">
        {transactions.length === 0 ? (
          <div className="py-8 text-center text-on-surface-variant text-body-sm">
            No transactions yet. Tap the + button to add one!
          </div>
        ) : (
          transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              onClick={() => onSelectTransaction?.(tx)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default RecentActivitySection;
