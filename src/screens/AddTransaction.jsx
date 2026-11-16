// src/screens/AddTransaction.jsx — Add expense / income transaction
// Matches Stitch design: segmented switcher, rapid increments, self-learning category engine, profile-scoped categories

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import Icon from '../components/ui/Icon';
import { db } from '../db/db';
import { useProfile } from '../contexts/ProfileContext';
import { useToast } from '../contexts/ToastContext';
import { formatINR, validateAmount, addINR } from '../utils/currency';
import { suggestCategory, recordLearnedRule } from '../utils/categorization';
import { DEFAULT_CATEGORIES } from '../db/defaults';

const PAYMENT_METHODS = [
  { id: 'UPI', label: 'UPI / QR', icon: 'qr_code_scanner' },
  { id: 'Cash', label: 'Cash', icon: 'payments' },
  { id: 'Debit Card', label: 'Debit Card', icon: 'credit_card' },
  { id: 'Credit Card', label: 'Credit Card', icon: 'contactless' },
];

const AddTransaction = () => {
  const navigate = useNavigate();
  const { activeProfileId } = useProfile();
  const { showToast } = useToast();

  // Load profile categories from Dexie (excluding archived categories)
  const dbCategories = useLiveQuery(
    () => (activeProfileId ? db.categories.where('profileId').equals(activeProfileId).filter((c) => !c.isArchived).toArray() : []),
    [activeProfileId]
  ) || [];

  const categoriesList = dbCategories.length > 0 ? dbCategories : DEFAULT_CATEGORIES;

  // Load recent transactions for history-based category suggestions
  const recentTransactions = useLiveQuery(
    () => (activeProfileId ? db.transactions.where('profileId').equals(activeProfileId).reverse().limit(50).toArray() : []),
    [activeProfileId]
  ) || [];

  const [type, setType] = useState('expense'); // 'expense' | 'income'
  const [amount, setAmount] = useState('280');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Dining');
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [memo, setMemo] = useState('');
  const [date, setDate] = useState(new Date().toISOString());
  const [isYesterday, setIsYesterday] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Self-learning category suggestion
  useEffect(() => {
    const inferred = suggestCategory(description, recentTransactions, activeProfileId);
    if (inferred && inferred !== category) {
      const isArchived = categoriesList.some(
        (c) => c.name.toLowerCase() === inferred.toLowerCase() && c.isArchived
      );
      if (!isArchived) {
        setSuggestedCategory(inferred);
      } else {
        setSuggestedCategory(null);
      }
    } else {
      setSuggestedCategory(null);
    }
  }, [description, category, recentTransactions, activeProfileId, categoriesList]);

  const handleAddDelta = (delta) => {
    const current = parseFloat(amount) || 0;
    setAmount(String(addINR(current, delta)));
  };

  const handleToggleYesterday = () => {
    const d = new Date();
    if (!isYesterday) {
      d.setDate(d.getDate() - 1);
      setIsYesterday(true);
    } else {
      setIsYesterday(false);
    }
    setDate(d.toISOString());
  };

  const handleSave = async () => {
    const val = validateAmount(amount);
    if (!val.valid) {
      showToast(val.error);
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    const chosenCategory = type === 'income' ? 'Income' : category;
    const finalDesc = description.trim() || (type === 'expense' ? category : 'Income');

    try {
      await db.transactions.add({
        profileId: activeProfileId,
        type: type === 'expense' ? 'debit' : 'credit',
        amount: val.amount,
        amountPaise: val.paise,
        category: chosenCategory,
        paymentMethod,
        date: date || new Date().toISOString(),
        description: finalDesc,
        memo: memo.trim(),
        createdAt: new Date().toISOString(),
      });

      // Learn user's category association for this merchant/description
      if (type === 'expense' && description.trim()) {
        await recordLearnedRule(description.trim(), chosenCategory, activeProfileId, db);
      }

      showToast(`Saved ${type === 'expense' ? 'Expense' : 'Income'} • ${formatINR(val.amount)}`);
      navigate(-1);
    } catch (err) {
      console.error('Error saving transaction:', err);
      showToast('Failed to save transaction');
      setIsSaving(false);
    }
  };

  const dateLabel = isYesterday ? 'Yesterday' : 'Today';

  return (
    <div className="flex flex-col w-full pb-10 space-y-4 select-none">
      {/* ── 1. Sheet Header / Micro Status ──────────────── */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="text-headline-sm text-on-surface font-semibold">New Entry</span>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container text-on-secondary-container">
            <Icon name="bolt" size={14} fill={1} />
            <span className="text-label-sm font-semibold tracking-wide">Smart Local AI</span>
          </div>
        </div>
      </div>

      {/* ── 2. Segmented Mode Switcher (Expense / Income) ─ */}
      <div className="w-full bg-surface-container-high p-1 rounded-full flex items-center shadow-inner">
        <button
          type="button"
          onClick={() => setType('expense')}
          className={`flex-1 py-2 rounded-full text-label-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
            type === 'expense'
              ? 'bg-primary-container text-on-primary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Icon name="arrow_outward" size={18} />
          Expense
        </button>
        <button
          type="button"
          onClick={() => setType('income')}
          className={`flex-1 py-2 rounded-full text-label-lg font-semibold flex items-center justify-center gap-1.5 transition-all ${
            type === 'income'
              ? 'bg-secondary text-on-secondary shadow-sm'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <Icon name="south_west" size={18} />
          Income
        </button>
      </div>

      {/* ── 3. Dynamic Large Numeric Stage & Increments ─── */}
      <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center text-center relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-secondary-container/20 pointer-events-none blur-xl" />
        <span className="text-label-sm text-outline uppercase tracking-wider mb-1 font-semibold">
          Total Amount
        </span>

        <div className="flex items-baseline justify-center gap-1.5 my-1 w-full">
          <span className="text-headline-lg text-outline font-semibold select-none">₹</span>
          <input
            id="amount-input"
            type="number"
            inputMode="decimal"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-48 bg-transparent text-center text-display-currency-mobile text-on-surface font-bold focus:outline-none p-0 tracking-tight"
            placeholder="0"
            autoFocus
          />
        </div>

        {/* Rapid Increment Chips */}
        <div className="flex items-center gap-2 mt-3 pt-3 overflow-x-auto w-full justify-center no-scrollbar">
          {[50, 100, 500, 1000].map((delta) => (
            <button
              key={delta}
              type="button"
              onClick={() => handleAddDelta(delta)}
              className="px-3 py-1.5 rounded-full bg-surface-container-low text-on-surface text-numeral-dense active:bg-secondary-container active:scale-95 transition-all shadow-sm"
            >
              +{delta >= 1000 ? `₹${delta / 1000}k` : `₹${delta}`}
            </button>
          ))}
        </div>
      </div>

      {/* ── 4. Description & Predictive Suggestion ───────── */}
      <div className="space-y-2">
        <div className="relative bg-surface-container-lowest rounded-2xl p-3 shadow-sm focus-within:bg-surface-container-low transition-colors">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
              <Icon name="edit_note" size={18} />
            </div>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What was this for? (e.g. Chai, Zepto, Metro)"
              className="w-full bg-transparent text-body-lg text-on-surface placeholder:text-outline focus:outline-none"
            />
          </div>
        </div>

        {/* Smart AI Prompt Pill */}
        {suggestedCategory && (
          <div className="flex items-center justify-between bg-surface-container-high px-3.5 py-2.5 rounded-xl shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-base select-none">✨</span>
              <div className="flex flex-col min-w-0">
                <span className="text-label-md text-on-surface font-semibold truncate">
                  Suggested: {suggestedCategory}
                </span>
                <span className="text-body-sm text-on-surface-variant truncate">
                  Learned from your local habits
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setCategory(suggestedCategory);
                setSuggestedCategory(null);
              }}
              className="px-3 py-1 rounded-full bg-primary text-on-primary text-label-sm font-semibold flex-shrink-0 active:scale-95 transition-transform shadow-sm"
            >
              Confirm
            </button>
          </div>
        )}
      </div>

      {/* ── 5. Category Selection Grid (Profile Scoped) ──── */}
      {type === 'expense' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-label-md text-on-surface-variant uppercase tracking-wider font-semibold">
              Category
            </span>
            <button
              type="button"
              onClick={() => navigate('/categories')}
              className="text-body-sm text-primary font-semibold hover:underline flex items-center gap-1"
            >
              <span>+ Add / Manage</span>
            </button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {categoriesList
              .filter((cat) => cat.name !== 'Income' && !cat.isArchived)
              .map((cat) => {
                const isSelected = category.toLowerCase() === cat.name.toLowerCase();
                return (
                  <button
                    key={cat.name}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-2xl transition-all text-center ${
                      isSelected
                        ? 'bg-primary-container text-on-primary shadow-sm active:scale-95'
                        : 'bg-surface-container-lowest text-on-surface shadow-sm hover:bg-surface-container-low active:scale-95'
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center mb-1 ${
                        isSelected
                          ? 'bg-surface-container-lowest/20'
                          : 'bg-surface-container text-primary'
                      }`}
                    >
                      <Icon name={cat.icon || 'category'} size={20} fill={isSelected ? 1 : 0} />
                    </div>
                    <span className="text-label-sm font-semibold truncate w-full">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* ── 6. Payment Modes & Date ────────────────────── */}
      <div className="space-y-3">
        <div className="space-y-1.5">
          <span className="text-label-md text-on-surface-variant uppercase tracking-wider font-semibold px-1">
            Payment Channel
          </span>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {PAYMENT_METHODS.map((method) => {
              const isSelected = paymentMethod === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setPaymentMethod(method.id)}
                  className={`px-3.5 py-2 rounded-full text-label-md font-semibold flex items-center gap-1.5 shadow-sm flex-shrink-0 active:scale-95 transition-all ${
                    isSelected
                      ? 'bg-primary-container text-on-primary'
                      : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
                  }`}
                >
                  <Icon name={method.icon} size={16} />
                  {method.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date / Time Card */}
        <div className="bg-surface-container-lowest rounded-2xl p-3 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-primary">
              <Icon name="calendar_today" size={18} />
            </div>
            <div className="flex flex-col">
              <span className="text-label-md text-on-surface font-semibold">
                {dateLabel} • {new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-body-sm text-outline">Auto-synced from system clock</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleYesterday}
            className={`px-2.5 py-1 rounded-full text-label-sm transition-all active:scale-95 ${
              isYesterday
                ? 'bg-primary text-on-primary font-bold'
                : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            {isYesterday ? 'Today?' : 'Yesterday?'}
          </button>
        </div>

        {/* Optional Memo Field */}
        <div className="bg-surface-container-lowest rounded-2xl p-3 shadow-sm flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center text-outline">
            <Icon name="tag" size={18} />
          </div>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Add tag or brief memo..."
            className="w-full bg-transparent text-body-md text-on-surface placeholder:text-outline focus:outline-none"
          />
        </div>
      </div>

      {/* ── 7. Primary Action Button ───────────────────── */}
      <div className="pt-2 space-y-2.5">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className={`w-full h-14 rounded-full font-label-lg text-label-lg font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform ${
            type === 'expense'
              ? 'bg-primary-container text-on-primary'
              : 'bg-secondary text-on-secondary'
          }`}
        >
          {isSaving ? (
            <>
              <Icon name="sync" size={20} className="animate-spin" />
              <span>Saving Entry...</span>
            </>
          ) : (
            <>
              <Icon name="check_circle" size={20} />
              <span>
                Save {type === 'expense' ? 'Expense' : 'Income'} • {formatINR(parseFloat(amount) || 0)}
              </span>
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-1.5 px-4 text-center">
          <Icon name="verified_user" size={14} className="text-secondary" />
          <p className="text-body-sm text-outline">
            Stored locally in your private on-device IndexedDB database.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddTransaction;
