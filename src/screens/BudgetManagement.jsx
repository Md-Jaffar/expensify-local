// src/screens/BudgetManagement.jsx — Full budget management for Expensify Local
// Supports overall monthly budget, category budgets, configurable alert thresholds, and over-budget warnings.

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import Icon from '../components/ui/Icon';
import { db } from '../db/db';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { formatINR, toPaise, fromPaise } from '../utils/currency';
import { toMonthYearKey, getMonthYear } from '../utils/date';
import { findCategory, getCategoryBgClass, getCategoryTextClass } from '../utils/categories';
import {
  getBudgetsWithSpend,
  saveBudget,
  deleteBudget,
} from '../utils/budgets';

const THRESHOLD_OPTIONS = [50, 75, 80, 90, 100];

const BudgetManagement = () => {
  const { activeProfileId } = useProfile();
  const { showToast } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());
  const monthYearKey = toMonthYearKey(currentDate);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [budgetType, setBudgetType] = useState('category'); // 'overall' | 'category'
  const [selectedCategoryName, setSelectedCategoryName] = useState('');
  const [limitInput, setLimitInput] = useState('');
  const [alertThreshold, setAlertThreshold] = useState(80);
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  // ── Queries from Dexie ────────────────────────────────────────────────
  const transactions = useLiveQuery(
    () =>
      activeProfileId
        ? db.transactions.where('profileId').equals(activeProfileId).toArray()
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

  const categories = useLiveQuery(
    () =>
      activeProfileId
        ? db.categories.where('profileId').equals(activeProfileId).toArray()
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

  const overallSetting = settings.find((s) => s.key === 'monthlyBudget');
  const defaultOverallLimitPaise = overallSetting?.value
    ? toPaise(overallSetting.value)
    : 5000000;

  // Filter out archived categories and 'Income' category
  const activeExpenseCategories = categories.filter(
    (c) => !c.isArchived && c.name.toLowerCase() !== 'income'
  );

  // Compute budgets with spend
  const { overall, categories: categoryBudgets, alerts } = getBudgetsWithSpend(
    storedBudgets,
    transactions,
    monthYearKey,
    defaultOverallLimitPaise
  );

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate((d) => {
      const prev = new Date(d);
      prev.setMonth(prev.getMonth() - 1);
      return prev;
    });
  };

  const handleNextMonth = () => {
    setCurrentDate((d) => {
      const next = new Date(d);
      next.setMonth(next.getMonth() + 1);
      return next;
    });
  };

  // Open Add/Edit Modal
  const openAddModal = (type = 'category') => {
    setEditingBudget(null);
    setBudgetType(type);
    setSelectedCategoryName(activeExpenseCategories[0]?.name || 'Dining');
    setLimitInput('');
    setAlertThreshold(80);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditOverallModal = () => {
    setEditingBudget(overall);
    setBudgetType('overall');
    setSelectedCategoryName('Overall');
    setLimitInput(overall.limit ? String(overall.limit) : '50000');
    setAlertThreshold(overall.alertThreshold || 80);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditCategoryModal = (budget) => {
    setEditingBudget(budget);
    setBudgetType('category');
    setSelectedCategoryName(budget.categoryName);
    setLimitInput(String(budget.limit));
    setAlertThreshold(budget.alertThreshold || 80);
    setFormError('');
    setIsModalOpen(true);
  };

  // Save budget handler
  const handleSaveBudget = async (e) => {
    e.preventDefault();
    setFormError('');

    const cleanLimit = Number(limitInput.trim());
    if (isNaN(cleanLimit) || cleanLimit <= 0) {
      setFormError('Please enter a valid positive budget amount in ₹');
      return;
    }

    if (budgetType === 'category' && !selectedCategoryName) {
      setFormError('Please select a category');
      return;
    }

    try {
      setIsSubmitting(true);
      const categoryObj = activeExpenseCategories.find((c) => c.name === selectedCategoryName);

      await saveBudget(db, activeProfileId, {
        id: editingBudget?.id || null,
        categoryId: budgetType === 'overall' ? null : categoryObj?.id || null,
        categoryName: budgetType === 'overall' ? 'Overall' : selectedCategoryName,
        monthYear: monthYearKey,
        limit: cleanLimit,
        alertThreshold,
      });

      showToast(
        editingBudget ? 'Budget updated successfully' : 'New budget set successfully',
        'success'
      );
      setIsModalOpen(false);
    } catch (err) {
      setFormError(err.message || 'Failed to save budget');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete budget handler
  const handleDeleteBudget = async (id) => {
    try {
      await deleteBudget(db, id);
      showToast('Budget limit removed', 'info');
      setDeleteConfirmId(null);
    } catch (err) {
      showToast('Failed to delete budget', 'error');
    }
  };

  return (
    <div className="flex flex-col w-full pb-12 space-y-4 select-none">
      {/* ── Top Month Navigation ────────────────────────── */}
      <div className="flex items-center justify-between bg-surface-container-lowest rounded-2xl p-3 shadow-sm">
        <button
          type="button"
          onClick={handlePrevMonth}
          className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Previous Month"
        >
          <Icon name="chevron_left" size={24} />
        </button>

        <div className="flex flex-col items-center">
          <span className="text-label-sm uppercase tracking-wider text-primary font-bold">
            Budget Cycle
          </span>
          <span className="text-title-md font-bold text-on-surface">
            {getMonthYear(currentDate)}
          </span>
        </div>

        <button
          type="button"
          onClick={handleNextMonth}
          className="p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          title="Next Month"
        >
          <Icon name="chevron_right" size={24} />
        </button>
      </div>

      {/* ── Alert Banner (if any budget is near or over limit) ── */}
      {alerts.length > 0 && (
        <div className="rounded-2xl bg-error-container/40 border border-error/20 p-4 shadow-sm flex flex-col gap-2">
          <div className="flex items-center gap-2 text-error font-semibold text-label-lg">
            <Icon name="warning" size={20} />
            <span>Budget Alerts ({alerts.length})</span>
          </div>
          <div className="flex flex-col gap-1.5 text-body-sm text-on-error-container">
            {alerts.map((alt, idx) => (
              <div key={idx} className="flex items-start gap-1.5">
                <span className="text-error mt-0.5">•</span>
                <span>
                  <strong>{alt.categoryName}:</strong> {alt.message}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Overall Monthly Budget Card ──────────────────── */}
      <div className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Icon name="account_balance_wallet" size={20} />
            </div>
            <div>
              <span className="text-label-sm uppercase tracking-wider text-primary font-bold block">
                Overall Limit
              </span>
              <span className="text-title-md text-on-surface font-bold">
                Total Monthly Budget
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-label-sm font-semibold px-2.5 py-1 rounded-full ${
                overall.isOver
                  ? 'bg-error-container text-on-error-container'
                  : overall.isWarning
                  ? 'bg-tertiary-fixed text-on-tertiary-fixed font-bold'
                  : 'bg-secondary-container/50 text-on-secondary-container'
              }`}
            >
              {overall.statusLabel}
            </span>
            <button
              type="button"
              onClick={openEditOverallModal}
              className="p-1.5 rounded-full hover:bg-surface-container text-primary transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Edit Overall Budget"
            >
              <Icon name="edit" size={18} />
            </button>
          </div>
        </div>

        {/* Spend Figures */}
        <div className="flex items-baseline justify-between pt-1">
          <div className="flex items-baseline gap-1.5">
            <span className="text-headline-sm text-on-surface font-bold tabular-nums">
              {formatINR(overall.spent)}
            </span>
            <span className="text-body-sm text-on-surface-variant tabular-nums">
              / {formatINR(overall.limit)}
            </span>
          </div>
          <span
            className={`text-label-lg font-bold ${
              overall.isOver ? 'text-error' : overall.isWarning ? 'text-tertiary' : 'text-primary'
            }`}
          >
            {overall.percentage}%
          </span>
        </div>

        {/* Progress Bar with Alert Threshold Line */}
        <div className="relative w-full h-3 bg-surface-container rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              overall.isOver
                ? 'bg-error'
                : 'bg-gradient-to-r from-primary-container via-primary to-secondary'
            }`}
            style={{ width: `${Math.min(100, overall.percentage)}%` }}
          />
          {/* Threshold marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-error/70 z-10"
            style={{ left: `${overall.alertThreshold}%` }}
            title={`Alert Threshold: ${overall.alertThreshold}%`}
          />
        </div>

        {/* Cushion & Threshold footer */}
        <div className="flex items-center justify-between text-on-surface-variant text-label-sm pt-0.5">
          <span className="flex items-center gap-1">
            <span
              className={`w-2 h-2 rounded-full ${
                overall.isOver ? 'bg-error' : 'bg-primary'
              }`}
            />
            {overall.isOver
              ? `${formatINR(overall.over)} over limit`
              : `${formatINR(overall.remaining)} cushion remaining`}
          </span>
          <span className="text-on-surface-variant/80">
            Alert at {overall.alertThreshold}% ({formatINR((overall.limit * overall.alertThreshold) / 100)})
          </span>
        </div>
      </div>

      {/* ── Category Budgets Header ─────────────────────── */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <span className="text-label-sm uppercase tracking-wider text-primary font-bold">
            Granular Controls
          </span>
          <h2 className="text-headline-sm text-on-surface font-semibold">
            Category Budgets
          </h2>
        </div>
        <button
          type="button"
          onClick={() => openAddModal('category')}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary text-on-primary text-label-md font-semibold shadow-sm hover:bg-primary/90 transition-colors min-h-[44px]"
        >
          <Icon name="add" size={18} />
          <span>Set Budget</span>
        </button>
      </div>

      {/* ── Category Budget Cards List ──────────────────── */}
      {categoryBudgets.length === 0 ? (
        <div className="rounded-2xl bg-surface-container-lowest p-6 text-center shadow-sm flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-on-surface-variant">
            <Icon name="pie_chart" size={24} />
          </div>
          <span className="text-label-lg font-semibold text-on-surface">
            No Category Budgets Configured
          </span>
          <p className="text-body-sm text-on-surface-variant max-w-xs">
            Set individual monthly spending limits for Dining, Groceries, Shopping, and more to catch overspending early.
          </p>
          <button
            type="button"
            onClick={() => openAddModal('category')}
            className="mt-2 px-4 py-2 rounded-full bg-secondary-container text-on-secondary-container text-label-md font-semibold min-h-[44px]"
          >
            + Add First Category Budget
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {categoryBudgets.map((b) => {
            const catDef = findCategory(b.categoryName);
            const bgClass = getCategoryBgClass(catDef.colorToken);
            const textClass = getCategoryTextClass(catDef.colorToken);

            return (
              <div
                key={b.id}
                className="rounded-2xl bg-surface-container-lowest p-4 shadow-sm flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full ${bgClass} ${textClass} flex items-center justify-center shrink-0`}
                    >
                      <Icon name={catDef.icon} size={20} />
                    </div>
                    <div className="min-w-0">
                      <span className="text-label-lg text-on-surface font-semibold truncate block">
                        {b.categoryName}
                      </span>
                      <span className="text-body-sm text-on-surface-variant tabular-nums">
                        Alert at {b.alertThreshold}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`text-label-sm font-semibold px-2 py-0.5 rounded-full ${
                        b.isOver
                          ? 'bg-error-container text-on-error-container'
                          : b.isWarning
                          ? 'bg-tertiary-fixed text-on-tertiary-fixed font-bold'
                          : 'bg-surface-container text-on-surface-variant'
                      }`}
                    >
                      {b.statusLabel}
                    </span>

                    <button
                      type="button"
                      onClick={() => openEditCategoryModal(b)}
                      className="p-1.5 rounded-full hover:bg-surface-container text-primary min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Edit Category Budget"
                    >
                      <Icon name="edit" size={17} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(b.id)}
                      className="p-1.5 rounded-full hover:bg-error-container/30 text-error min-h-[36px] min-w-[36px] flex items-center justify-center"
                      title="Remove Budget"
                    >
                      <Icon name="delete" size={17} />
                    </button>
                  </div>
                </div>

                {/* Progress & Numbers */}
                <div className="flex items-baseline justify-between pt-0.5">
                  <span className="text-body-md font-semibold text-on-surface tabular-nums">
                    {formatINR(b.spent)}{' '}
                    <span className="text-body-sm text-on-surface-variant font-normal">
                      / {formatINR(b.limit)}
                    </span>
                  </span>
                  <span
                    className={`text-label-md font-bold ${
                      b.isOver ? 'text-error' : b.isWarning ? 'text-tertiary' : 'text-primary'
                    }`}
                  >
                    {b.percentage}%
                  </span>
                </div>

                {/* Bar */}
                <div className="relative w-full h-2.5 bg-surface-container rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      b.isOver ? 'bg-error' : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(100, b.percentage)}%` }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-error/70 z-10"
                    style={{ left: `${b.alertThreshold}%` }}
                    title={`Alert threshold: ${b.alertThreshold}%`}
                  />
                </div>

                {/* Remaining / Over status */}
                <div className="flex items-center justify-between text-on-surface-variant text-label-sm">
                  <span>
                    {b.isOver
                      ? `${formatINR(b.over)} over limit`
                      : `${formatINR(b.remaining)} remaining`}
                  </span>
                  <span>
                    Threshold: {formatINR((b.limit * b.alertThreshold) / 100)}
                  </span>
                </div>

                {/* Inline Delete Confirmation */}
                {deleteConfirmId === b.id && (
                  <div className="mt-2 p-3 rounded-xl bg-error-container/30 border border-error/20 flex flex-col gap-2">
                    <span className="text-label-md font-semibold text-on-error-container">
                      Remove budget limit for {b.categoryName}?
                    </span>
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-3 py-1.5 rounded-full bg-surface-container text-on-surface text-label-sm font-semibold min-h-[36px]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteBudget(b.id)}
                        className="px-3 py-1.5 rounded-full bg-error text-on-error text-label-sm font-semibold min-h-[36px]"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add / Edit Budget Modal ──────────────────────── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-surface-container-lowest rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl flex flex-col gap-4 animate-slide-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1 border-b border-outline-variant">
              <h3 className="text-headline-sm font-bold text-on-surface">
                {editingBudget ? 'Edit Budget' : 'Set New Budget'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-on-surface-variant hover:text-on-surface rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Icon name="close" size={24} />
              </button>
            </div>

            <form onSubmit={handleSaveBudget} className="flex flex-col gap-4">
              {/* Type Switch (Only when adding new) */}
              {!editingBudget && (
                <div className="flex p-1 bg-surface-container rounded-full">
                  <button
                    type="button"
                    onClick={() => setBudgetType('category')}
                    className={`flex-1 py-1.5 rounded-full text-label-md font-semibold transition-colors min-h-[40px] ${
                      budgetType === 'category'
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    Category Budget
                  </button>
                  <button
                    type="button"
                    onClick={() => setBudgetType('overall')}
                    className={`flex-1 py-1.5 rounded-full text-label-md font-semibold transition-colors min-h-[40px] ${
                      budgetType === 'overall'
                        ? 'bg-primary text-on-primary shadow-xs'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    Overall Monthly
                  </button>
                </div>
              )}

              {/* Category selector (if category budget) */}
              {budgetType === 'category' && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-label-md font-semibold text-on-surface">
                    Select Category
                  </label>
                  <select
                    value={selectedCategoryName}
                    onChange={(e) => setSelectedCategoryName(e.target.value)}
                    disabled={!!editingBudget}
                    className="w-full h-12 px-3 rounded-xl bg-surface-container border border-outline/30 text-body-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
                  >
                    {activeExpenseCategories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Budget Limit Input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-label-md font-semibold text-on-surface">
                  Monthly Limit (₹)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-headline-sm font-bold text-on-surface-variant">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="100000000"
                    placeholder="e.g. 15000"
                    value={limitInput}
                    onChange={(e) => setLimitInput(e.target.value)}
                    className="w-full h-12 pl-10 pr-4 rounded-xl bg-surface-container border border-outline/30 text-headline-sm font-bold text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>

              {/* Alert Threshold Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-label-md font-semibold text-on-surface">
                  Alert Notification Threshold
                </label>
                <p className="text-body-sm text-on-surface-variant">
                  Notify when spending crosses this percentage of limit:
                </p>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {THRESHOLD_OPTIONS.map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setAlertThreshold(pct)}
                      className={`px-3 py-1.5 rounded-full text-label-md font-semibold transition-colors min-h-[40px] ${
                        alertThreshold === pct
                          ? 'bg-secondary text-on-secondary shadow-xs'
                          : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {formError && (
                <p className="text-body-sm text-error bg-error-container/40 p-2.5 rounded-xl">
                  {formError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-full bg-surface-container text-on-surface text-label-md font-semibold min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-full bg-primary text-on-primary text-label-md font-semibold min-h-[44px] hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetManagement;
