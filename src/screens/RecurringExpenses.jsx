// src/screens/RecurringExpenses.jsx — Full Recurring Expense Management Screen
// Allows creating, editing, pausing, deleting templates, confirming due items, skipping, and postponing.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import Icon from '../components/ui/Icon';
import EmptyState from '../components/ui/EmptyState';
import { db } from '../db/db';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { formatINR, validateAmount } from '../utils/currency';
import { findCategory } from '../utils/categories';
import {
  toDateString,
  isDueOrOverdue,
  getDaysOverdue,
  markRecurringAsPaid,
  skipRecurringOccurrence,
  postponeRecurringOccurrence,
} from '../utils/recurring';

const FREQUENCIES = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'daily', label: 'Daily' },
  { id: 'yearly', label: 'Yearly' },
];

const PAYMENT_METHODS = ['UPI', 'Cash', 'Debit Card', 'Credit Card'];

const RecurringExpenses = () => {
  const navigate = useNavigate();
  const { activeProfileId } = useProfile();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('due'); // 'due' | 'templates' | 'history'

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [templateAmount, setTemplateAmount] = useState('');
  const [templateFrequency, setTemplateFrequency] = useState('monthly');
  const [templateCategory, setTemplateCategory] = useState('Subscriptions');
  const [templatePayment, setTemplatePayment] = useState('UPI');
  const [templateStartDate, setTemplateStartDate] = useState(toDateString(new Date()));
  const [templateNotes, setTemplateNotes] = useState('');

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isProcessing, setIsProcessing] = useState({});

  // Queries from Dexie
  const templates = useLiveQuery(
    () => (activeProfileId ? db.recurringTemplates.where('profileId').equals(activeProfileId).toArray() : []),
    [activeProfileId]
  ) || [];

  const categories = useLiveQuery(
    () => (activeProfileId ? db.categories.where('profileId').equals(activeProfileId).toArray() : []),
    [activeProfileId]
  ) || [];

  const occurrences = useLiveQuery(
    () => (activeProfileId ? db.recurringOccurrences.where('profileId').equals(activeProfileId).reverse().limit(30).toArray() : []),
    [activeProfileId]
  ) || [];

  // Filter due / overdue items
  const dueTemplates = templates.filter((t) => t.isActive && isDueOrOverdue(t.nextDueDate));
  const activeTemplates = templates.filter((t) => t.isActive);
  const pausedTemplates = templates.filter((t) => !t.isActive);

  // ── Open Add/Edit Modal ──────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateAmount('');
    setTemplateFrequency('monthly');
    setTemplateCategory(categories[0]?.name || 'Subscriptions');
    setTemplatePayment('UPI');
    setTemplateStartDate(toDateString(new Date()));
    setTemplateNotes('');
    setShowModal(true);
  };

  const handleOpenEdit = (t) => {
    setEditingTemplate(t);
    setTemplateName(t.name);
    setTemplateAmount(String(t.amount));
    setTemplateFrequency(t.frequency || 'monthly');
    setTemplateCategory(t.category);
    setTemplatePayment(t.paymentMethod || 'UPI');
    setTemplateStartDate(t.startDate ? t.startDate.slice(0, 10) : toDateString(new Date()));
    setTemplateNotes(t.notes || '');
    setShowModal(true);
  };

  // ── Save Template ────────────────────────────────────────────────────────
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      showToast('Please enter a template name');
      return;
    }

    const val = validateAmount(templateAmount);
    if (!val.valid) {
      showToast(val.error);
      return;
    }

    try {
      if (editingTemplate) {
        // Update existing template
        await db.recurringTemplates.update(editingTemplate.id, {
          name: templateName.trim(),
          amount: val.amount,
          amountPaise: val.paise,
          frequency: templateFrequency,
          category: templateCategory,
          paymentMethod: templatePayment,
          startDate: templateStartDate,
          notes: templateNotes.trim(),
        });
        showToast(`Updated "${templateName}"`);
      } else {
        // Create new template
        await db.recurringTemplates.add({
          profileId: activeProfileId,
          name: templateName.trim(),
          amount: val.amount,
          amountPaise: val.paise,
          frequency: templateFrequency,
          category: templateCategory,
          paymentMethod: templatePayment,
          startDate: templateStartDate,
          nextDueDate: templateStartDate,
          isActive: true,
          notes: templateNotes.trim(),
          createdAt: new Date().toISOString(),
        });
        showToast(`Created recurring template "${templateName}"`);
      }
      setShowModal(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to save recurring template');
    }
  };

  // ── Toggle Pause / Resume ────────────────────────────────────────────────
  const handleToggleActive = async (template) => {
    try {
      await db.recurringTemplates.update(template.id, {
        isActive: !template.isActive,
      });
      showToast(template.isActive ? `Paused "${template.name}"` : `Resumed "${template.name}"`);
    } catch (err) {
      console.error(err);
      showToast('Error updating template status');
    }
  };

  // ── Delete Template ──────────────────────────────────────────────────────
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await db.recurringTemplates.delete(deleteTarget.id);
      showToast(`Deleted "${deleteTarget.name}"`);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      showToast('Error deleting template');
    }
  };

  // ── Recurring Confirmation Actions ───────────────────────────────────────
  const handleMarkPaid = async (template) => {
    if (isProcessing[template.id]) return;
    setIsProcessing((prev) => ({ ...prev, [template.id]: true }));
    try {
      await markRecurringAsPaid({
        db,
        template,
        profileId: activeProfileId,
      });
      showToast(`Recorded payment: ${template.name} • ${formatINR(template.amount)}`);
    } catch (err) {
      showToast(err.message.includes('DUPLICATE') ? 'Already marked as paid for this cycle' : 'Error recording payment');
    } finally {
      setIsProcessing((prev) => ({ ...prev, [template.id]: false }));
    }
  };

  const handleSkip = async (template) => {
    if (isProcessing[template.id]) return;
    setIsProcessing((prev) => ({ ...prev, [template.id]: true }));
    try {
      await skipRecurringOccurrence({
        db,
        template,
        profileId: activeProfileId,
      });
      showToast(`Skipped ${template.name} for this cycle`);
    } catch (err) {
      console.error(err);
      showToast('Error skipping occurrence');
    } finally {
      setIsProcessing((prev) => ({ ...prev, [template.id]: false }));
    }
  };

  const handlePostpone = async (template) => {
    if (isProcessing[template.id]) return;
    setIsProcessing((prev) => ({ ...prev, [template.id]: true }));
    try {
      await postponeRecurringOccurrence({
        db,
        template,
        days: 2,
      });
      showToast(`Postponed ${template.name} by 2 days`);
    } catch (err) {
      console.error(err);
      showToast('Error postponing occurrence');
    } finally {
      setIsProcessing((prev) => ({ ...prev, [template.id]: false }));
    }
  };

  return (
    <div className="flex flex-col w-full pb-12 space-y-4 select-none">
      {/* ── Screen Header ───────────────────────────────── */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-headline-md font-bold text-on-surface">Recurring Expenses</h2>
          <p className="text-body-sm text-on-surface-variant">Scheduled subscriptions, rent, and utility bills</p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="h-10 px-3.5 rounded-full bg-primary-container text-on-primary font-semibold text-label-md flex items-center gap-1.5 shadow-sm active:scale-95 transition-transform"
        >
          <Icon name="add" size={18} />
          <span>New Template</span>
        </button>
      </div>

      {/* ── Segmented Tab Switcher ──────────────────────── */}
      <div className="w-full bg-surface-container p-1 rounded-full flex items-center">
        {[
          { id: 'due', label: `Due (${dueTemplates.length})`, icon: 'notification_important' },
          { id: 'templates', label: `All (${templates.length})`, icon: 'sync' },
          { id: 'history', label: 'History', icon: 'history' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-full text-label-md font-semibold flex items-center justify-center gap-1.5 transition-all ${
              activeTab === tab.id
                ? 'bg-surface-container-lowest text-primary shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <Icon name={tab.icon} size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB 1: Due & Overdue Items ──────────────────── */}
      {activeTab === 'due' && (
        <div className="space-y-3">
          {dueTemplates.length === 0 ? (
            <EmptyState
              icon="check_circle"
              title="All Caught Up!"
              description="No recurring expenses are due today. Upcoming bills will appear here when their due date arrives."
              actionLabel="Add Template"
              onAction={handleOpenAdd}
            />
          ) : (
            dueTemplates.map((t) => {
              const cat = findCategory(t.category);
              const daysOverdue = getDaysOverdue(t.nextDueDate);
              const isOverdue = daysOverdue > 0;

              return (
                <div
                  key={t.id}
                  className={`rounded-2xl p-4 shadow-sm border transition-all ${
                    isOverdue
                      ? 'bg-error-container/15 border-error/30'
                      : 'bg-surface-container-lowest border-outline-variant/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
                        <Icon name={cat.icon || 'subscriptions'} size={22} />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-label-lg font-bold text-on-surface truncate">{t.name}</h3>
                          {isOverdue && (
                            <span className="px-2 py-0.5 rounded-full bg-error text-on-error text-[10px] font-bold uppercase tracking-wider">
                              {daysOverdue}d Overdue
                            </span>
                          )}
                        </div>
                        <span className="text-body-sm text-on-surface-variant flex items-center gap-1.5 mt-0.5">
                          <span className="capitalize">{t.frequency}</span>
                          <span>•</span>
                          <span>Due: {t.nextDueDate}</span>
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-headline-sm font-bold text-on-surface">{formatINR(t.amount)}</span>
                      <span className="block text-[11px] text-outline">{t.paymentMethod || 'UPI'}</span>
                    </div>
                  </div>

                  {/* Actions for Due Item */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-surface-container">
                    <button
                      type="button"
                      disabled={!!isProcessing[t.id]}
                      onClick={() => handleMarkPaid(t)}
                      className="min-h-[40px] px-2 rounded-full bg-primary-container text-on-primary text-label-sm font-bold flex items-center justify-center gap-1 shadow-sm active:scale-95 disabled:opacity-50"
                    >
                      <Icon name="check" size={16} />
                      <span>{isProcessing[t.id] ? 'Saving...' : 'Mark Paid'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={!!isProcessing[t.id]}
                      onClick={() => handlePostpone(t)}
                      className="min-h-[40px] px-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-label-sm font-semibold flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                    >
                      <Icon name="schedule" size={16} />
                      <span>Postpone</span>
                    </button>
                    <button
                      type="button"
                      disabled={!!isProcessing[t.id]}
                      onClick={() => handleSkip(t)}
                      className="min-h-[40px] px-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant text-label-sm font-semibold flex items-center justify-center gap-1 active:scale-95 disabled:opacity-50"
                    >
                      <Icon name="skip_next" size={16} />
                      <span>Skip</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── TAB 2: All Templates (Active & Paused) ──────── */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          {templates.length === 0 ? (
            <EmptyState
              icon="sync"
              title="No Recurring Templates"
              description="Set up recurring expenses like Netflix, broadband, or rent. You will be prompted to confirm each time it is due."
              actionLabel="Create Template"
              onAction={handleOpenAdd}
            />
          ) : (
            <>
              {/* Active Templates */}
              {activeTemplates.length > 0 && (
                <div className="space-y-2.5">
                  <span className="text-label-sm uppercase tracking-wider text-primary font-bold px-1">
                    Active Templates ({activeTemplates.length})
                  </span>
                  {activeTemplates.map((t) => {
                    const cat = findCategory(t.category);
                    return (
                      <div
                        key={t.id}
                        className="bg-surface-container-lowest rounded-2xl p-4 shadow-sm border border-outline-variant/30 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-11 h-11 rounded-full bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
                            <Icon name={cat.icon || 'subscriptions'} size={20} />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-label-lg font-bold text-on-surface truncate">{t.name}</span>
                            <span className="text-body-sm text-on-surface-variant capitalize">
                              {t.frequency} • Next: {t.nextDueDate || 'Pending'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <span className="text-headline-sm font-bold text-on-surface">{formatINR(t.amount)}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(t)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface hover:bg-surface-container"
                            title="Edit"
                          >
                            <Icon name="edit" size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(t)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container"
                            title="Pause"
                          >
                            <Icon name="pause_circle" size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(t)}
                            className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-error-container/30"
                            title="Delete"
                          >
                            <Icon name="delete" size={18} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Paused Templates */}
              {pausedTemplates.length > 0 && (
                <div className="space-y-2.5 pt-2">
                  <span className="text-label-sm uppercase tracking-wider text-outline font-bold px-1">
                    Paused Templates ({pausedTemplates.length})
                  </span>
                  {pausedTemplates.map((t) => (
                    <div
                      key={t.id}
                      className="bg-surface-container-low/60 rounded-2xl p-4 shadow-sm border border-outline-variant/20 flex items-center justify-between gap-3 opacity-75"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-outline flex-shrink-0">
                          <Icon name="pause" size={18} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-label-md font-bold text-on-surface truncate">{t.name}</span>
                          <span className="text-body-sm text-outline">Paused • {t.frequency}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(t)}
                          className="px-3 py-1 rounded-full bg-surface-container text-primary font-semibold text-label-sm hover:bg-surface-container-high"
                        >
                          Resume
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(t)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-error-container/30"
                        >
                          <Icon name="delete" size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB 3: Confirmed Occurrences History ────────── */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {occurrences.length === 0 ? (
            <EmptyState
              icon="history"
              title="No Occurrence History"
              description="Confirmed and skipped occurrences will be logged here chronologically."
            />
          ) : (
            occurrences.map((occ) => {
              const tmpl = templates.find((t) => t.id === occ.templateId);
              const isPaid = occ.status === 'paid';

              return (
                <div
                  key={occ.id}
                  className="bg-surface-container-lowest rounded-2xl p-3.5 shadow-sm border border-outline-variant/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isPaid ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container text-outline'
                      }`}
                    >
                      <Icon name={isPaid ? 'check_circle' : 'skip_next'} size={20} />
                    </div>
                    <div>
                      <span className="text-label-md font-bold text-on-surface block truncate">
                        {tmpl?.name || 'Recurring Item'}
                      </span>
                      <span className="text-body-sm text-on-surface-variant">
                        Occurrence: {occ.occurrenceDate}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-label-sm font-bold uppercase tracking-wider ${
                      isPaid
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'bg-surface-container text-outline'
                    }`}
                  >
                    {occ.status}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Modal: Add / Edit Recurring Template ────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-end justify-center p-gutter animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-headline-sm font-bold text-on-surface">
                {editingTemplate ? 'Edit Recurring Template' : 'New Recurring Template'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            {/* Template Name */}
            <div>
              <label className="text-label-sm font-semibold text-on-surface block mb-1">
                Expense / Service Name
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. Netflix, Flat Rent, Broadband"
                className="w-full bg-surface-container-low rounded-xl p-3 text-body-md text-on-surface focus:outline-none"
              />
            </div>

            {/* Amount */}
            <div>
              <label className="text-label-sm font-semibold text-on-surface block mb-1">
                Amount (₹)
              </label>
              <div className="flex items-center bg-surface-container-low rounded-xl p-3">
                <span className="text-headline-sm font-bold text-primary mr-2">₹</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={templateAmount}
                  onChange={(e) => setTemplateAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-transparent text-headline-sm font-bold text-on-surface focus:outline-none tabular-nums"
                />
              </div>
            </div>

            {/* Frequency Selector */}
            <div>
              <label className="text-label-sm font-semibold text-on-surface block mb-1.5">
                Billing Frequency
              </label>
              <div className="grid grid-cols-4 bg-surface-container p-1 rounded-full text-center">
                {FREQUENCIES.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setTemplateFrequency(f.id)}
                    className={`min-h-[34px] rounded-full text-label-sm capitalize transition-all ${
                      templateFrequency === f.id
                        ? 'bg-surface-container-lowest text-primary font-bold shadow-sm'
                        : 'text-on-surface-variant'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="text-label-sm font-semibold text-on-surface block mb-1">
                Category
              </label>
              <select
                value={templateCategory}
                onChange={(e) => setTemplateCategory(e.target.value)}
                className="w-full bg-surface-container-low rounded-xl p-3 text-body-md text-on-surface focus:outline-none"
              >
                {categories
                  .filter((c) => !c.isArchived)
                  .map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="text-label-sm font-semibold text-on-surface block mb-1">
                Default Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setTemplatePayment(pm)}
                    className={`p-2.5 rounded-xl text-label-sm font-semibold text-left transition-all border ${
                      templatePayment === pm
                        ? 'bg-primary-container text-on-primary border-primary-container shadow-sm'
                        : 'bg-surface-container-low text-on-surface border-transparent'
                    }`}
                  >
                    {pm}
                  </button>
                ))}
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="text-label-sm font-semibold text-on-surface block mb-1">
                Start Date / Next Due Date
              </label>
              <input
                type="date"
                value={templateStartDate}
                onChange={(e) => setTemplateStartDate(e.target.value)}
                className="w-full bg-surface-container-low rounded-xl p-3 text-body-md text-on-surface focus:outline-none"
              />
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-surface-container">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="min-h-[48px] rounded-full bg-surface-container text-on-surface font-semibold text-label-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                className="min-h-[48px] rounded-full bg-primary-container text-on-primary font-bold text-label-md shadow-sm active:scale-95"
              >
                {editingTemplate ? 'Update' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Delete Confirmation ──────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-inverse-surface/60 backdrop-blur-sm flex items-end justify-center p-gutter animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-headline-sm font-bold text-on-surface">Delete Template?</h3>
            <p className="text-body-sm text-on-surface-variant">
              Are you sure you want to delete recurring template <strong className="text-on-surface">{deleteTarget.name}</strong>?
              Past recorded transactions will not be deleted.
            </p>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="min-h-[48px] rounded-full bg-surface-container text-on-surface font-semibold text-label-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="min-h-[48px] rounded-full bg-error text-on-error font-bold text-label-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringExpenses;
