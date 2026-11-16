// src/screens/Settings.jsx — App settings, vault preferences, encrypted backup/restore, auto-lock & theme toggle
// Full Phase 1 release implementation with atomic restore and complete export

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import Icon from '../components/ui/Icon';
import { db } from '../db/db';
import { useProfile } from '../contexts/ProfileContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { encryptData, decryptData } from '../utils/crypto';
import { getLearnedRules, saveLearnedRules } from '../utils/categorization';
import { validateAmount } from '../utils/currency';

const Settings = () => {
  const navigate = useNavigate();
  const { activeProfileId, lockProfile } = useProfile();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [showDangerModal, setShowDangerModal] = useState(false);
  const [backupPassword, setBackupPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingBackupData, setPendingBackupData] = useState(null);

  // Restore password modal state
  const [showDecryptModal, setShowDecryptModal] = useState(false);
  const [decryptPassword, setDecryptPassword] = useState('');
  const [pendingEncryptedText, setPendingEncryptedText] = useState(null);

  const profile = useLiveQuery(
    () => (activeProfileId ? db.profiles.get(activeProfileId) : null),
    [activeProfileId]
  );

  const settingsList = useLiveQuery(
    () => (activeProfileId ? db.settings.where('profileId').equals(activeProfileId).toArray() : []),
    [activeProfileId]
  ) || [];

  const autoLockSetting = settingsList.find((s) => s.key === 'autoLock');
  const currentAutoLock = autoLockSetting?.value ?? 5; // default 5 min

  const txCount = useLiveQuery(
    () =>
      activeProfileId
        ? db.transactions.where('profileId').equals(activeProfileId).count()
        : 0,
    [activeProfileId]
  ) || 0;

  const profileInitial = profile?.name ? profile.name[0].toUpperCase() : '?';

  // ── Auto-Lock Setting Handler ───────────────────────────────────────────
  const handleSetAutoLock = async (val) => {
    if (!activeProfileId) return;
    try {
      const existing = await db.settings.where({ profileId: activeProfileId, key: 'autoLock' }).first();
      if (existing) {
        await db.settings.update(existing.id, { value: val });
      } else {
        await db.settings.add({ profileId: activeProfileId, key: 'autoLock', value: val });
      }
      showToast(val === false ? 'Auto-lock disabled' : `Auto-lock set to ${val} minute${val > 1 ? 's' : ''}`);
    } catch (err) {
      console.error(err);
      showToast('Failed to update auto-lock setting');
    }
  };

  // ── Backup: Export Complete Encrypted/Plain JSON ────────────────────────
  const handleExportJSON = async () => {
    if (!activeProfileId) return;

    // Fetch all collections scoped to this profile for 100% backup completeness
    const txs = await db.transactions.where('profileId').equals(activeProfileId).toArray();
    const cats = await db.categories.where('profileId').equals(activeProfileId).toArray();
    const bgs = await db.budgets.where('profileId').equals(activeProfileId).toArray();
    const sets = await db.settings.where('profileId').equals(activeProfileId).toArray();
    const recs = await db.recurringTemplates.where('profileId').equals(activeProfileId).toArray();
    const recOccs = await db.recurringOccurrences.where('profileId').equals(activeProfileId).toArray();
    const learnedList = db.learnedRules ? await db.learnedRules.where('profileId').equals(activeProfileId).toArray() : [];
    const learnedObj = getLearnedRules(activeProfileId);

    const exportPayload = {
      app: 'ExpensifyLocal',
      version: 3,
      exportedAt: new Date().toISOString(),
      profile: {
        name: profile?.name,
        pinHash: profile?.pinHash || null,
        pinSalt: profile?.pinSalt || null,
      },
      transactions: txs,
      categories: cats,
      budgets: bgs,
      settings: sets,
      recurringTemplates: recs,
      recurringOccurrences: recOccs,
      learnedRules: learnedList.length > 0 ? learnedList : learnedObj,
    };

    setPendingBackupData(JSON.stringify(exportPayload, null, 2));
    setBackupPassword('');
    setShowPasswordModal(true);
  };

  const handleConfirmEncryptedDownload = async () => {
    if (!pendingBackupData) return;

    const trimmedPassword = backupPassword.trim();
    if (trimmedPassword) {
      if (trimmedPassword.length < 4) {
        showToast('Password must be at least 4 characters');
        return;
      }
      if (/^\d{4}$/.test(trimmedPassword)) {
        showToast('Avoid using a 4-digit PIN for backup encryption; use a strong password');
      }
    }

    try {
      let finalData = pendingBackupData;
      let filename = `expensify-vault-${profile?.name || 'backup'}.json`;

      if (trimmedPassword) {
        finalData = await encryptData(pendingBackupData, trimmedPassword);
        filename = `expensify-vault-${profile?.name || 'backup'}.aes.json`;
      }

      const blob = new Blob([finalData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      showToast(trimmedPassword ? 'AES-256-GCM Encrypted Backup Saved!' : 'JSON Backup Saved!');
      setShowPasswordModal(false);
      setPendingBackupData(null);
    } catch (err) {
      console.error(err);
      showToast('Error encrypting backup');
    }
  };

  // ── Restore: Process, validate, and atomically restore payload ──────────
  const processRestoredPayload = async (payload) => {
    if (!payload || typeof payload !== 'object') {
      showToast('Corrupted backup: Payload is not a valid JSON object');
      return;
    }

    if (!payload.transactions || !Array.isArray(payload.transactions)) {
      showToast('Corrupted backup: Missing transactions collection');
      return;
    }

    // Validate transactions schema and data types
    const validTxs = [];
    for (const t of payload.transactions) {
      const val = validateAmount(t.amount);
      if (!val.valid && Number(t.amount) !== 0) {
        showToast(`Invalid amount (${t.amount}) found in backup record`);
        return;
      }
      const { id, ...rest } = t;
      validTxs.push({
        ...rest,
        profileId: activeProfileId,
        amount: val.amount,
        amountPaise: val.paise,
        date: rest.date || new Date().toISOString(),
      });
    }

    try {
      // Execute restore inside an atomic Dexie transaction across all collections
      const storesToLock = [
        db.transactions,
        db.categories,
        db.budgets,
        db.settings,
        db.recurringTemplates,
        db.recurringOccurrences,
      ];
      if (db.learnedRules) {
        storesToLock.push(db.learnedRules);
      }

      await db.transaction(
        'rw',
        storesToLock,
        async () => {
          // 1. Add validated transactions (remap to activeProfileId)
          if (validTxs.length > 0) {
            await db.transactions.bulkAdd(validTxs);
          }

          // 2. Safe merge categories (prevent duplicates by name)
          if (Array.isArray(payload.categories) && payload.categories.length > 0) {
            const existingCats = await db.categories.where('profileId').equals(activeProfileId).toArray();
            const existingNames = new Set(existingCats.map((c) => (c.name || '').toLowerCase()));

            const newCats = payload.categories
              .filter((c) => c.name && !existingNames.has(c.name.toLowerCase()))
              .map((c) => {
                const { id, ...rest } = c;
                return { ...rest, profileId: activeProfileId };
              });

            if (newCats.length > 0) {
              await db.categories.bulkAdd(newCats);
            }
          }

          // 3. Safe merge budgets
          if (Array.isArray(payload.budgets) && payload.budgets.length > 0) {
            const cleanedBudgets = payload.budgets.map((b) => {
              const { id, ...rest } = b;
              return { ...rest, profileId: activeProfileId };
            });
            await db.budgets.bulkAdd(cleanedBudgets);
          }

          // 4. Safe merge recurring templates
          if (Array.isArray(payload.recurringTemplates) && payload.recurringTemplates.length > 0) {
            const cleanedTemplates = payload.recurringTemplates.map((r) => {
              const { id, ...rest } = r;
              return { ...rest, profileId: activeProfileId };
            });
            await db.recurringTemplates.bulkAdd(cleanedTemplates);
          }

          // 5. Safe merge recurring occurrences
          if (Array.isArray(payload.recurringOccurrences) && payload.recurringOccurrences.length > 0) {
            const cleanedOccs = payload.recurringOccurrences.map((o) => {
              const { id, ...rest } = o;
              return { ...rest, profileId: activeProfileId };
            });
            await db.recurringOccurrences.bulkAdd(cleanedOccs);
          }

          // 6. Safe merge learned rules in Dexie table
          if (db.learnedRules && payload.learnedRules) {
            if (Array.isArray(payload.learnedRules)) {
              for (const rule of payload.learnedRules) {
                const key = (rule.merchantKey || '').trim().toLowerCase();
                if (!key || !rule.category) continue;
                const existing = await db.learnedRules
                  .where('[profileId+merchantKey]')
                  .equals([activeProfileId, key])
                  .first();

                if (existing) {
                  await db.learnedRules.update(existing.id, {
                    category: rule.category,
                    count: Math.max(existing.count || 1, rule.count || 1),
                    updatedAt: rule.updatedAt || new Date().toISOString(),
                  });
                } else {
                  await db.learnedRules.add({
                    profileId: activeProfileId,
                    merchantKey: key,
                    category: rule.category,
                    count: rule.count || 1,
                    updatedAt: rule.updatedAt || new Date().toISOString(),
                  });
                }
              }
            } else if (typeof payload.learnedRules === 'object') {
              for (const [key, data] of Object.entries(payload.learnedRules)) {
                const cleanKey = key.trim().toLowerCase();
                if (!cleanKey || !data?.category) continue;
                const existing = await db.learnedRules
                  .where('[profileId+merchantKey]')
                  .equals([activeProfileId, cleanKey])
                  .first();

                if (existing) {
                  await db.learnedRules.update(existing.id, {
                    category: data.category,
                    count: Math.max(existing.count || 1, data.count || 1),
                    updatedAt: data.updatedAt || new Date().toISOString(),
                  });
                } else {
                  await db.learnedRules.add({
                    profileId: activeProfileId,
                    merchantKey: cleanKey,
                    category: data.category,
                    count: data.count || 1,
                    updatedAt: data.updatedAt || new Date().toISOString(),
                  });
                }
              }
            }
          }
        }
      );

      // 7. Sync local rules cache
      if (payload.learnedRules && typeof payload.learnedRules === 'object' && !Array.isArray(payload.learnedRules)) {
        const merged = { ...getLearnedRules(activeProfileId), ...payload.learnedRules };
        saveLearnedRules(merged, activeProfileId, db);
      }

      showToast(`Restored ${validTxs.length} transactions + settings safely!`);
    } catch (err) {
      console.error('Error during atomic database bulk restore:', err);
      showToast('Database restore failed: Transaction was aborted and rolled back');
    }
  };

  // ── Restore: File input handler ─────────────────────────────────────────
  const handleFileRestore = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        let parsed;

        try {
          parsed = JSON.parse(text);
        } catch {
          showToast('Invalid backup file: Not valid JSON');
          return;
        }

        // Check if AES encrypted bundle
        if (parsed.salt && parsed.iv && parsed.data) {
          setPendingEncryptedText(text);
          setDecryptPassword('');
          setShowDecryptModal(true);
          return;
        }

        await processRestoredPayload(parsed);
      } catch (err) {
        console.error(err);
        showToast('Restore failed');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Restore: Confirm password decryption ────────────────────────────────
  const handleConfirmDecrypt = async () => {
    if (!pendingEncryptedText) return;

    try {
      const decryptedText = await decryptData(pendingEncryptedText, decryptPassword);
      const payload = JSON.parse(decryptedText);
      setShowDecryptModal(false);
      setPendingEncryptedText(null);
      await processRestoredPayload(payload);
    } catch (err) {
      showToast(err.message.includes('AUTH_FAILED') ? 'Incorrect password or tampered backup' : 'Decryption failed');
    }
  };

  // ── Clear profile data ──────────────────────────────────────────────────
  const handleClearData = async () => {
    if (!activeProfileId) return;
    try {
      await db.transactions.where('profileId').equals(activeProfileId).delete();
      showToast(`Cleared transactions for ${profile?.name}`);
      setShowDangerModal(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to clear data');
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-lg select-none pb-12">
      {/* ── Active Profile Summary Card ──────────────────── */}
      <section className="bg-surface-container-lowest rounded-lg p-space-lg shadow-sm flex flex-col gap-space-md">
        <div className="flex items-start justify-between gap-space-md">
          <div className="flex items-center gap-space-md min-w-0">
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-full bg-primary-container text-on-primary flex items-center justify-center text-headline-sm font-bold">
                {profileInitial}
              </div>
              <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-secondary flex items-center justify-center text-on-secondary text-[10px]">
                <Icon name="check" size={10} fill={1} />
              </span>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-headline-sm text-on-surface truncate font-bold">
                  {profile?.name || 'Vault'}
                </h2>
                <Icon name="verified_user" size={16} className="text-primary flex-shrink-0" />
              </div>
              <span className="text-body-sm text-on-surface-variant flex items-center gap-1 mt-0.5">
                <span>Personal Vault</span>
                <span>•</span>
                <span className="text-primary font-medium">
                  {profile?.pinHash ? 'PIN Protected 🔒' : 'Open Access'}
                </span>
              </span>
              <div className="flex items-center gap-1 mt-1 text-label-sm text-outline">
                <Icon name="database" size={14} />
                <span>{txCount} transactions in IndexedDB</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Action Profile Buttons */}
        <div className="grid grid-cols-2 gap-space-sm pt-space-xs">
          <button
            type="button"
            onClick={() => navigate('/profiles')}
            className="min-h-[44px] px-space-md py-2 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <Icon name="swap_horiz" size={18} className="text-primary" />
            <span className="text-label-md font-semibold">Switch Vault</span>
          </button>
          {profile?.pinHash && (
            <button
              type="button"
              onClick={() => {
                lockProfile();
                navigate('/profiles');
              }}
              className="min-h-[44px] px-space-md py-2 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
            >
              <Icon name="lock" size={18} className="text-primary" />
              <span className="text-label-md font-semibold">Lock Vault</span>
            </button>
          )}
        </div>
      </section>

      {/* ── Privacy & Offline Vault Status Banner ────────── */}
      <section className="bg-secondary/10 rounded-lg p-space-md flex items-start gap-space-md shadow-sm">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-on-secondary flex-shrink-0 shadow-sm">
          <Icon name="shield" size={22} fill={1} />
        </div>
        <div className="flex flex-col min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-label-md text-secondary font-bold">100% Offline & Private</span>
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span className="text-label-sm text-on-surface-variant font-medium">Zero Trackers</span>
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span className="text-label-sm text-on-surface-variant font-medium">No Cloud Sync</span>
          </div>
          <p className="text-body-sm text-on-surface-variant mt-1 leading-relaxed">
            All financial records stay exclusively inside your browser's IndexedDB storage.
          </p>
        </div>
      </section>

      {/* ── Advanced Expense Management & Customization ── */}
      <section className="flex flex-col gap-space-sm">
        <span className="text-label-sm uppercase tracking-wider text-primary font-bold px-space-xs">
          Advanced Management
        </span>
        <div className="bg-surface-container-lowest rounded-2xl p-space-xs shadow-sm flex flex-col divide-y divide-surface-container">
          {/* Recurring Expenses tile */}
          <div
            onClick={() => navigate('/recurring')}
            className="p-space-md flex items-center justify-between hover:bg-surface-container/50 transition-colors cursor-pointer rounded-xl"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                <Icon name="event_repeat" size={20} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-label-lg text-on-surface font-semibold">Recurring Expenses</span>
                <span className="text-body-sm text-on-surface-variant">Scheduled templates & due payments</span>
              </div>
            </div>
            <Icon name="chevron_right" size={20} className="text-on-surface-variant/70" />
          </div>

          {/* Category Management tile */}
          <div
            onClick={() => navigate('/categories')}
            className="p-space-md flex items-center justify-between hover:bg-surface-container/50 transition-colors cursor-pointer rounded-xl"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary flex-shrink-0">
                <Icon name="category" size={20} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-label-lg text-on-surface font-semibold">Category Management</span>
                <span className="text-body-sm text-on-surface-variant">Custom categories, colors & archiving</span>
              </div>
            </div>
            <Icon name="chevron_right" size={20} className="text-on-surface-variant/70" />
          </div>

          {/* Budget Management tile */}
          <div
            onClick={() => navigate('/budgets')}
            className="p-space-md flex items-center justify-between hover:bg-surface-container/50 transition-colors cursor-pointer rounded-xl"
            role="button"
            tabIndex={0}
          >
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-full bg-tertiary-fixed/30 flex items-center justify-center text-tertiary flex-shrink-0">
                <Icon name="account_balance_wallet" size={20} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-label-lg text-on-surface font-semibold">Budget Management</span>
                <span className="text-body-sm text-on-surface-variant">Monthly limits & threshold alerts</span>
              </div>
            </div>
            <Icon name="chevron_right" size={20} className="text-on-surface-variant/70" />
          </div>
        </div>
      </section>

      {/* ── Preferences Section ──────────────────────────── */}
      <section className="flex flex-col gap-space-sm">
        <span className="text-label-sm uppercase tracking-wider text-primary font-bold px-space-xs">
          Preferences
        </span>
        <div className="bg-surface-container-lowest rounded-lg p-space-xs shadow-sm flex flex-col gap-0.5">
          {/* App Theme Segmented Selector */}
          <div className="flex flex-col p-space-md gap-space-sm">
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
                <Icon name="palette" size={20} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-label-lg text-on-surface font-semibold">App Theme</span>
                <span className="text-body-sm text-on-surface-variant">Material You visual scheme</span>
              </div>
            </div>

            <div className="grid grid-cols-3 bg-surface-container p-1 rounded-full text-center mt-1">
              {['light', 'dark', 'system'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTheme(t);
                    showToast(`Theme set to ${t}`);
                  }}
                  className={`min-h-[38px] rounded-full text-label-md capitalize transition-all ${
                    theme === t
                      ? 'bg-surface-container-lowest text-primary font-bold shadow-sm'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Inactivity Auto-Lock Selector */}
          <div className="flex flex-col p-space-md gap-space-sm border-t border-surface-container">
            <div className="flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
                <Icon name="timer" size={20} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-label-lg text-on-surface font-semibold">Inactivity Auto-Lock</span>
                <span className="text-body-sm text-on-surface-variant">Lock protected vault when inactive</span>
              </div>
            </div>

            <div className="grid grid-cols-4 bg-surface-container p-1 rounded-full text-center mt-1">
              {[
                { label: 'Off', val: false },
                { label: '2 min', val: 2 },
                { label: '5 min', val: 5 },
                { label: '15 min', val: 15 },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => handleSetAutoLock(item.val)}
                  className={`min-h-[36px] rounded-full text-label-sm font-semibold transition-all ${
                    currentAutoLock === item.val
                      ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Data Backup & Local Restore ──────────────────── */}
      <section className="flex flex-col gap-space-sm">
        <div className="flex items-center justify-between px-space-xs">
          <span className="text-label-sm uppercase tracking-wider text-primary font-bold">
            Data & Offline Backups
          </span>
          <span className="text-label-sm text-secondary font-semibold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            PWA Dexie.js
          </span>
        </div>

        <div className="bg-surface-container-lowest rounded-lg p-space-lg shadow-sm flex flex-col gap-space-md">
          <p className="text-body-sm text-on-surface-variant leading-relaxed">
            <strong>Safe Merge Policy:</strong> Backups include all transactions, categories, budgets, recurring templates, and learned rules. Restoring merges records into this vault without overwriting other profiles.
          </p>

          {/* Export JSON Button */}
          <button
            type="button"
            onClick={handleExportJSON}
            className="min-h-[48px] w-full px-space-md py-3 rounded-full bg-primary-container text-on-primary text-label-lg font-bold flex items-center justify-center gap-space-sm shadow-sm hover:bg-primary active:scale-[0.98] transition-all"
          >
            <Icon name="download" size={20} />
            <span>Export Encrypted JSON Backup</span>
          </button>

          {/* Sub Actions: Restore File */}
          <label className="min-h-[44px] px-space-md py-2.5 rounded-full bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-label-md font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer text-center">
            <Icon name="file_open" size={18} className="text-primary" />
            <span>Restore JSON Backup</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFileRestore}
              className="sr-only"
            />
          </label>
        </div>
      </section>

      {/* ── Danger Zone ──────────────────────────────────── */}
      <section className="flex flex-col gap-space-sm">
        <span className="text-label-sm uppercase tracking-wider text-error font-bold px-space-xs">
          Danger Zone
        </span>
        <div className="bg-surface-container-lowest rounded-lg p-space-md shadow-sm flex flex-col gap-space-sm">
          <div className="flex items-start justify-between gap-space-md">
            <div className="flex flex-col min-w-0">
              <span className="text-label-lg text-error font-semibold">Clear Profile Transactions</span>
              <span className="text-body-sm text-on-surface-variant mt-0.5">
                Permanently erase all {txCount} expense records for {profile?.name}.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDangerModal(true)}
            className="min-h-[44px] w-full px-space-md py-2.5 rounded-full bg-error-container text-on-error-container hover:bg-error/20 text-label-md font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
          >
            <Icon name="delete_forever" size={18} />
            <span>Clear All Transactions</span>
          </button>
        </div>
      </section>

      {/* ── Password for Backup Modal ────────────────────── */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-[100] bg-inverse-surface/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-gutter pb-6 sm:pb-gutter animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <h3 className="text-headline-sm font-bold text-on-surface">Encrypt Backup (Optional)</h3>
            <p className="text-body-sm text-on-surface-variant">
              Enter a password to encrypt with AES-256-GCM. <strong>Do not reuse your 4-digit PIN</strong> — use a strong password (6+ characters recommended). Leave blank for unencrypted JSON.
            </p>
            <input
              type="password"
              placeholder="Enter backup password (optional)"
              value={backupPassword}
              onChange={(e) => setBackupPassword(e.target.value)}
              className="w-full bg-surface-container-low rounded-xl p-3 text-body-md text-on-surface focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="min-h-[48px] rounded-full bg-surface-container text-on-surface font-semibold text-label-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEncryptedDownload}
                className="min-h-[48px] rounded-full bg-primary-container text-on-primary font-semibold text-label-md"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Password for Decrypt/Restore Modal ───────────── */}
      {showDecryptModal && (
        <div className="fixed inset-0 z-[100] bg-inverse-surface/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-gutter pb-6 sm:pb-gutter animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-6 shadow-xl flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Icon name="lock" size={24} className="text-primary" />
              <h3 className="text-headline-sm font-bold text-on-surface">Encrypted Backup</h3>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              This backup file was encrypted with AES-256-GCM. Enter the decryption password to restore.
            </p>
            <input
              type="password"
              placeholder="Enter backup password"
              autoFocus
              value={decryptPassword}
              onChange={(e) => setDecryptPassword(e.target.value)}
              className="w-full bg-surface-container-low rounded-xl p-3 text-body-md text-on-surface focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDecryptModal(false);
                  setPendingEncryptedText(null);
                }}
                className="min-h-[48px] rounded-full bg-surface-container text-on-surface font-semibold text-label-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDecrypt}
                className="min-h-[48px] rounded-full bg-primary-container text-on-primary font-semibold text-label-md"
              >
                Unlock & Restore
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Danger Zone Confirmation Modal ──────────────── */}
      {showDangerModal && (
        <div className="fixed inset-0 z-[100] bg-inverse-surface/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-gutter pb-6 sm:pb-gutter animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl p-space-lg shadow-xl flex flex-col gap-space-md">
            <div className="w-12 h-12 rounded-full bg-error-container text-on-error-container flex items-center justify-center mx-auto">
              <Icon name="warning" size={28} />
            </div>
            <div className="text-center flex flex-col gap-1">
              <h3 className="text-headline-sm text-on-surface font-bold">
                Permanently Delete All Data?
              </h3>
              <p className="text-body-sm text-on-surface-variant">
                This will wipe all transactions for <strong className="text-on-surface">{profile?.name}</strong>.
                This action cannot be undone unless you have a JSON backup.
              </p>
            </div>
            <div className="flex flex-col gap-space-xs mt-space-xs">
              <button
                type="button"
                onClick={handleClearData}
                className="min-h-[48px] w-full rounded-full bg-error text-on-error text-label-lg font-semibold flex items-center justify-center gap-1.5"
              >
                <Icon name="delete" size={18} />
                <span>Yes, Erase Everything</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDangerModal(false)}
                className="min-h-[48px] w-full rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface text-label-lg font-semibold flex items-center justify-center"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
