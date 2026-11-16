// src/screens/TransactionHistory.jsx — Grouped transaction history with search, filters, details sheet, and secure CSV export/import
// Full implementation matching Stitch design: search, type pills, filter chips, grouped cards, detail modal, and CSV integration

import { useState, useMemo, useEffect, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Icon from '../components/ui/Icon';
import { db } from '../db/db';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { formatINR, toPaise, fromPaise } from '../utils/currency';
import { formatDate, formatTime } from '../utils/date';
import { findCategory, getCategoryBgClass, getCategoryTextClass } from '../utils/categories';
import {
  exportTransactionsToCSV,
  triggerCSVDownload,
  parseAndValidateCSV,
  importTransactionsFromCSV,
} from '../utils/csv';

const TransactionHistory = () => {
  const { activeProfileId } = useProfile();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'expense' | 'income'
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest'); // 'newest' | 'highest'
  const [selectedTx, setSelectedTx] = useState(null); // for detail modal

  // Editing state inside detail modal
  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState('');
  const [editMemo, setEditMemo] = useState('');

  // CSV Import state
  const csvFileInputRef = useRef(null);
  const [csvPreview, setCsvPreview] = useState(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  // Reset modal state when active profile changes to prevent cross-profile leakage
  useEffect(() => {
    setSelectedTx(null);
    setIsEditing(false);
    setCsvPreview(null);
  }, [activeProfileId]);

  // ── Query all transactions from Dexie ───────────────────────────────────
  const transactions = useLiveQuery(
    () =>
      activeProfileId
        ? db.transactions.where('profileId').equals(activeProfileId).toArray()
        : [],
    [activeProfileId]
  ) || [];

  // Filter & Sort
  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          (t.description || '').toLowerCase().includes(q) ||
          (t.category || '').toLowerCase().includes(q) ||
          (t.memo || '').toLowerCase().includes(q) ||
          (t.paymentMethod || '').toLowerCase().includes(q)
      );
    }

    // Type filter
    if (typeFilter === 'expense') {
      list = list.filter((t) => t.type === 'debit' || t.type === 'expense');
    } else if (typeFilter === 'income') {
      list = list.filter((t) => t.type === 'credit' || t.type === 'income');
    }

    // Category filter
    if (categoryFilter !== 'all') {
      list = list.filter((t) => (t.category || '').toLowerCase() === categoryFilter.toLowerCase());
    }

    // Sort
    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    } else if (sortBy === 'highest') {
      list.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
    }

    return list;
  }, [transactions, search, typeFilter, categoryFilter, sortBy]);

  // Compute counts & total filtered spent using exact paise arithmetic
  const expenseCount = transactions.filter((t) => t.type === 'debit' || t.type === 'expense').length;
  const incomeCount = transactions.filter((t) => t.type === 'credit' || t.type === 'income').length;
  const filteredSpentPaise = filteredTransactions
    .filter((t) => t.type === 'debit' || t.type === 'expense')
    .reduce((sum, t) => sum + toPaise(t.amount), 0);
  const filteredSpent = fromPaise(filteredSpentPaise);

  // Group by date (e.g. "TODAY", "YESTERDAY", or "24 OCT 2024") with exact paise net
  const groups = useMemo(() => {
    const map = new Map();

    filteredTransactions.forEach((tx) => {
      const d = new Date(tx.date || Date.now());
      const label = formatDate(d).toUpperCase();
      if (!map.has(label)) {
        map.set(label, { label, date: d, items: [], dayNetPaise: 0 });
      }
      const g = map.get(label);
      g.items.push(tx);
      const isInc = tx.type === 'credit' || tx.type === 'income';
      g.dayNetPaise += isInc ? toPaise(tx.amount) : -toPaise(tx.amount);
    });

    return Array.from(map.values()).map((g) => ({
      ...g,
      dayNet: fromPaise(g.dayNetPaise),
    }));
  }, [filteredTransactions]);

  // Modal handlers with profile isolation guards
  const handleOpenDetail = (tx) => {
    setSelectedTx(tx);
    setEditDesc(tx.description || '');
    setEditMemo(tx.memo || '');
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!selectedTx || selectedTx.profileId !== activeProfileId) return;
    try {
      await db.transactions.delete(selectedTx.id);
      showToast('Transaction removed');
      setSelectedTx(null);
    } catch (err) {
      console.error(err);
      showToast('Error deleting transaction');
    }
  };

  const handleSaveEdit = async () => {
    if (!selectedTx || selectedTx.profileId !== activeProfileId) return;
    try {
      await db.transactions.update(selectedTx.id, {
        description: editDesc.trim(),
        memo: editMemo.trim(),
      });
      showToast('Transaction updated');
      setIsEditing(false);
      setSelectedTx((prev) => ({ ...prev, description: editDesc.trim(), memo: editMemo.trim() }));
    } catch (err) {
      console.error(err);
      showToast('Error updating transaction');
    }
  };

  // ── CSV Export ──────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const listToExport = filteredTransactions.length > 0 ? filteredTransactions : transactions;
    if (listToExport.length === 0) {
      showToast('No transactions to export');
      return;
    }

    try {
      const csvStr = exportTransactionsToCSV(listToExport);
      const filename = `expensify-vault-export-${new Date().toISOString().slice(0, 10)}.csv`;
      triggerCSVDownload(csvStr, filename);
      showToast(`Exported ${listToExport.length} transactions to CSV`);
    } catch (err) {
      console.error(err);
      showToast('Error exporting CSV');
    }
  };

  // ── CSV Import Handler ──────────────────────────────────────────────────
  const handleCSVFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const result = parseAndValidateCSV(text, transactions);
        setCsvPreview(result);
        setSkipDuplicates(true);
      } catch (err) {
        showToast(err.message.replace('INVALID_CSV: ', '').replace('MISSING_COLUMNS: ', ''));
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleConfirmCSVImport = async () => {
    if (!csvPreview || !activeProfileId) return;
    setIsImporting(true);

    try {
      const res = await importTransactionsFromCSV(
        db,
        csvPreview.validRows,
        activeProfileId,
        skipDuplicates
      );
      showToast(`Imported ${res.importedCount} transactions successfully!`);
      setCsvPreview(null);
    } catch (err) {
      console.error(err);
      showToast('Database error while importing CSV rows');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="flex flex-col w-full pb-8 select-none">
      {/* ── Top Utility Bar: Search, Quick Filter & Export/Import CSV ─ */}
      <div className="flex items-center gap-space-sm w-full mb-space-md">
        <div className="relative flex-1 flex items-center bg-surface-container-low rounded-full px-space-md py-2.5 shadow-sm transition-all focus-within:bg-surface-container-lowest focus-within:shadow-md">
          <Icon name="search" size={20} className="text-primary mr-2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search merchant, note, tag..."
            className="w-full bg-transparent text-on-surface text-body-md placeholder:text-outline focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-on-surface-variant hover:text-on-surface p-0.5 rounded-full"
            >
              <Icon name="close" size={18} />
            </button>
          )}
        </div>

        {/* Export CSV Button */}
        <button
          onClick={handleExportCSV}
          title="Export CSV (Unencrypted)"
          className="flex items-center gap-1 px-3 h-11 rounded-full bg-primary/10 hover:bg-primary/15 text-primary active:scale-95 transition-all flex-shrink-0"
        >
          <Icon name="file_download" size={18} />
          <span className="text-label-md font-semibold">Export</span>
        </button>

        {/* Import CSV Button */}
        <button
          onClick={() => csvFileInputRef.current?.click()}
          title="Import CSV File"
          className="flex items-center gap-1 px-3 h-11 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface active:scale-95 transition-all flex-shrink-0"
        >
          <Icon name="file_upload" size={18} />
          <span className="text-label-md font-semibold">Import</span>
        </button>
        <input
          ref={csvFileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleCSVFileChange}
          className="sr-only"
        />
      </div>

      {/* ── Segmented Type Filters (M3 Pill Group) ──────── */}
      <div className="flex items-center p-1 bg-surface-container-low rounded-full w-full mb-space-sm">
        <button
          type="button"
          onClick={() => setTypeFilter('all')}
          className={`flex-1 py-1.5 px-3 rounded-full text-center transition-all text-label-md ${
            typeFilter === 'all'
              ? 'bg-primary-container text-on-primary shadow-sm font-bold'
              : 'text-on-surface-variant hover:text-on-surface font-medium'
          }`}
        >
          All <span className="opacity-80 text-label-sm font-normal">({transactions.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setTypeFilter('expense')}
          className={`flex-1 py-1.5 px-3 rounded-full text-center transition-all text-label-md ${
            typeFilter === 'expense'
              ? 'bg-primary-container text-on-primary shadow-sm font-bold'
              : 'text-on-surface-variant hover:text-on-surface font-medium'
          }`}
        >
          Expenses <span className="opacity-80 text-label-sm font-normal">({expenseCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setTypeFilter('income')}
          className={`flex-1 py-1.5 px-3 rounded-full text-center transition-all text-label-md ${
            typeFilter === 'income'
              ? 'bg-secondary text-on-secondary shadow-sm font-bold'
              : 'text-on-surface-variant hover:text-on-surface font-medium'
          }`}
        >
          Income <span className="opacity-80 text-label-sm font-normal">({incomeCount})</span>
        </button>
      </div>

      {/* ── Filter Chips Row (Scrollable Horizontal) ────── */}
      <div className="flex items-center gap-space-xs overflow-x-auto no-scrollbar -mx-gutter px-gutter mb-space-md py-0.5">
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface text-label-sm font-semibold flex items-center gap-1 border-none focus:outline-none flex-shrink-0"
        >
          <option value="all">Category: All</option>
          <option value="Dining">Dining</option>
          <option value="Groceries">Groceries</option>
          <option value="Transport">Transport</option>
          <option value="Shopping">Shopping</option>
          <option value="Bills">Bills</option>
          <option value="Entertainment">Entertainment</option>
          <option value="Healthcare">Healthcare</option>
          <option value="Housing">Housing</option>
          <option value="Subscriptions">Subscriptions</option>
          <option value="Income">Income</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-1.5 rounded-full bg-surface-container-high text-on-surface text-label-sm font-semibold flex items-center gap-1 border-none focus:outline-none flex-shrink-0"
        >
          <option value="newest">Sort: Newest</option>
          <option value="highest">Sort: Highest Amount</option>
        </select>
      </div>

      {/* ── Summary Banner ──────────────────────────────── */}
      <div className="flex items-center justify-between px-space-xs py-1 mb-space-sm text-body-sm text-on-surface-variant">
        <span>
          Showing <strong>{filteredTransactions.length}</strong> transactions
        </span>
        <span>
          Total spent: <strong className="text-on-surface">{formatINR(filteredSpent)}</strong>
        </span>
      </div>

      {/* ── Grouped Transactions List ───────────────────── */}
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-space-xl text-center">
          <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center text-outline mb-space-md">
            <Icon name="search_off" size={32} />
          </div>
          <span className="text-headline-sm text-on-surface font-semibold">No Transactions Found</span>
          <span className="text-body-sm text-on-surface-variant max-w-xs mt-1">
            Try adjusting your search terms or clearing your filters to see more results.
          </span>
        </div>
      ) : (
        <div className="flex flex-col gap-space-lg">
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col gap-space-xs">
              <div className="flex items-center justify-between px-space-xs py-1">
                <span className="font-label-sm uppercase tracking-wider text-primary font-bold">
                  {group.label}
                </span>
                <span className="font-label-sm text-outline font-semibold">
                  Day net: {group.dayNet < 0 ? '−' : '+'}{formatINR(Math.abs(group.dayNet))}
                </span>
              </div>

              <div className="bg-surface-container-lowest rounded-lg p-space-xs shadow-sm flex flex-col gap-0.5">
                {group.items.map((tx, idx) => {
                  const cat = findCategory(tx.category);
                  const isCredit = tx.type === 'credit' || tx.type === 'income';
                  const bgClass = getCategoryBgClass(cat.colorToken);
                  const textClass = getCategoryTextClass(cat.colorToken);

                  return (
                    <div
                      key={tx.id || idx}
                      onClick={() => handleOpenDetail(tx)}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-container-low active:bg-surface-container transition-all cursor-pointer"
                    >
                      <div className="flex items-center gap-space-md min-w-0">
                        <div
                          className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${bgClass} ${textClass}`}
                        >
                          <Icon name={cat.icon || 'category'} size={20} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-body-md text-on-surface truncate font-semibold">
                            {tx.description}
                          </span>
                          <span className="text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                            <span>{tx.category}</span>
                            <span>•</span>
                            <span>{tx.paymentMethod || 'UPI'}</span>
                            {tx.isRecurring && (
                              <Icon name="sync" size={14} className="text-primary ml-1" />
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 pl-2">
                        <span
                          className={`font-numeral-dense tabular-nums font-bold ${
                            isCredit ? 'text-secondary' : 'text-error'
                          }`}
                        >
                          {isCredit ? '+' : '−'}{formatINR(tx.amount)}
                        </span>
                        <span className="block text-[11px] text-outline mt-0.5">
                          {formatTime(tx.date)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Transaction Detail Modal / Bottom Sheet ─────── */}
      {selectedTx && (
        <div className="fixed inset-0 z-[100] bg-inverse-surface/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-gutter pb-6 sm:pb-gutter animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-t-2xl sm:rounded-2xl p-space-lg shadow-xl flex flex-col gap-space-md animate-in slide-in-from-bottom duration-200 max-h-[85vh] overflow-y-auto">
            <div className="w-12 h-1.5 rounded-full bg-outline-variant/60 mx-auto -mt-2 mb-1" />

            <div className="flex items-center justify-between">
              <span className="text-label-sm uppercase tracking-wider text-primary font-bold">
                Transaction Details
              </span>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Merchant and Amount Hero */}
            <div className="flex flex-col items-center justify-center p-space-md bg-surface-container-low rounded-2xl text-center">
              <div className="w-14 h-14 rounded-full bg-surface-container flex items-center justify-center text-primary mb-2">
                <Icon name={findCategory(selectedTx.category).icon || 'category'} size={28} />
              </div>

              {isEditing ? (
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full text-center text-headline-sm font-bold text-on-surface bg-surface-container-lowest rounded-xl p-2 border border-primary/40 focus:outline-none"
                />
              ) : (
                <h3 className="text-headline-sm text-on-surface font-bold">{selectedTx.description}</h3>
              )}

              <span
                className={`text-display-currency-mobile tabular-nums font-bold my-1 ${
                  selectedTx.type === 'credit' || selectedTx.type === 'income'
                    ? 'text-secondary'
                    : 'text-error'
                }`}
              >
                {selectedTx.type === 'credit' || selectedTx.type === 'income' ? '+' : '−'}
                {formatINR(selectedTx.amount)}
              </span>

              <span className="text-body-sm text-on-surface-variant">
                {formatDate(selectedTx.date)} at {formatTime(selectedTx.date)}
              </span>
            </div>

            {/* Metadata Fields */}
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-label-sm font-semibold text-on-surface block mb-1">
                    Memo / Tag
                  </label>
                  <input
                    type="text"
                    value={editMemo}
                    onChange={(e) => setEditMemo(e.target.value)}
                    placeholder="Add memo or details..."
                    className="w-full bg-surface-container-low rounded-xl p-3 text-body-md text-on-surface focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-space-sm">
                <div className="flex flex-col p-3 rounded-DEFAULT bg-surface-container-low">
                  <span className="text-label-sm text-outline uppercase font-semibold">Category</span>
                  <span className="text-body-md font-semibold text-on-surface mt-0.5">
                    {selectedTx.category}
                  </span>
                </div>
                <div className="flex flex-col p-3 rounded-DEFAULT bg-surface-container-low">
                  <span className="text-label-sm text-outline uppercase font-semibold">Payment Mode</span>
                  <span className="text-body-md font-semibold text-on-surface mt-0.5">
                    {selectedTx.paymentMethod || 'UPI'}
                  </span>
                </div>
                {selectedTx.memo && (
                  <div className="col-span-2 flex flex-col p-3 rounded-DEFAULT bg-surface-container-low">
                    <span className="text-label-sm text-outline uppercase font-semibold">Memo</span>
                    <span className="text-body-md text-on-surface mt-0.5">
                      {selectedTx.memo}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-space-md mt-auto pt-2">
              <button
                type="button"
                onClick={handleDelete}
                className="flex-1 min-h-[48px] rounded-full bg-error-container text-on-error-container text-label-lg font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <Icon name="delete" size={18} />
                <span>Delete</span>
              </button>

              {isEditing ? (
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="flex-1 min-h-[48px] rounded-full bg-primary-container text-on-primary text-label-lg font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-sm"
                >
                  <Icon name="save" size={18} />
                  <span>Save</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex-1 min-h-[48px] rounded-full bg-primary-container text-on-primary text-label-lg font-semibold flex items-center justify-center gap-1.5 active:scale-95 transition-transform shadow-sm"
                >
                  <Icon name="edit" size={18} />
                  <span>Edit Note</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CSV Import Preview Modal ──────────────────────── */}
      {csvPreview && (
        <div className="fixed inset-0 z-[100] bg-inverse-surface/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-gutter pb-6 sm:pb-gutter animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon name="file_upload" size={22} className="text-primary" />
                <h3 className="text-headline-sm font-bold text-on-surface">Import CSV Preview</h3>
              </div>
              <button
                type="button"
                onClick={() => setCsvPreview(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Metrics Chips */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 rounded-xl bg-surface-container-low">
                <span className="text-[11px] text-outline uppercase font-semibold block">Total</span>
                <span className="text-label-lg font-bold text-on-surface">{csvPreview.totalRows}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-secondary-container/40">
                <span className="text-[11px] text-on-secondary-container uppercase font-semibold block">Valid</span>
                <span className="text-label-lg font-bold text-secondary">{csvPreview.validRows.length}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-error-container/40">
                <span className="text-[11px] text-on-error-container uppercase font-semibold block">Rejected</span>
                <span className="text-label-lg font-bold text-error">{csvPreview.invalidRows.length}</span>
              </div>
            </div>

            {/* Duplicate Checkbox */}
            {csvPreview.duplicateCount > 0 && (
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="w-5 h-5 accent-primary-container rounded"
                />
                <div className="flex flex-col">
                  <span className="text-label-sm font-bold text-on-surface">
                    Skip {csvPreview.duplicateCount} duplicate transaction{csvPreview.duplicateCount > 1 ? 's' : ''}
                  </span>
                  <span className="text-body-sm text-on-surface-variant">
                    Matches existing date, amount, and description
                  </span>
                </div>
              </label>
            )}

            {/* Preview List (first 5 rows) */}
            <div className="space-y-2">
              <span className="text-label-sm uppercase font-bold text-outline px-1">
                Sample Rows ({Math.min(5, csvPreview.validRows.length)} of {csvPreview.validRows.length})
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {csvPreview.validRows.slice(0, 5).map((row, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between text-body-sm"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="font-semibold text-on-surface truncate">{row.description}</span>
                      <span className="text-outline text-[11px]">
                        {row.date.slice(0, 10)} • {row.category}
                      </span>
                    </div>
                    <span className={`font-bold tabular-nums flex-shrink-0 ${row.type === 'credit' ? 'text-secondary' : 'text-error'}`}>
                      {row.type === 'credit' ? '+' : '−'}{formatINR(row.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[11px] text-outline leading-tight">
              ⚠️ <em>CSV files are unencrypted plain text. For secure encrypted vault backups, use JSON Backup in Settings.</em>
            </p>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setCsvPreview(null)}
                className="min-h-[48px] rounded-full bg-surface-container text-on-surface font-semibold text-label-md"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isImporting || csvPreview.validRows.length === 0}
                onClick={handleConfirmCSVImport}
                className="min-h-[48px] rounded-full bg-primary-container text-on-primary font-bold text-label-md shadow-sm active:scale-95 disabled:opacity-50"
              >
                {isImporting ? 'Importing...' : `Import ${skipDuplicates ? csvPreview.validRows.length - csvPreview.duplicateCount : csvPreview.validRows.length}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
