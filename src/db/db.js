// src/db/db.js — Dexie (IndexedDB) database schema for Expensify Local
// Complete offline IndexedDB persistence with version migrations.

import Dexie from 'dexie';

export const db = new Dexie('ExpensifyLocal');

// Version 1: Baseline Phase 1 schema
db.version(1).stores({
  profiles: '++id, name, createdAt',
  transactions:
    '++id, profileId, type, amount, category, paymentMethod, date, description, memo, isRecurring, recurringId, createdAt',
  categories: '++id, profileId, name, icon, colorToken, budget, isDefault',
  budgets: '++id, profileId, categoryId, monthYear, limit, createdAt',
  settings: '++id, profileId, key, value',
  recurringTemplates:
    '++id, profileId, name, amount, category, paymentMethod, frequency, nextDueDate, isActive',
});

// Version 2: Phase 2 schema additions
// - recurringOccurrences for duplicate prevention and skip/paid tracking
// - recurringTemplates expanded with amountPaise, startDate, lastConfirmedDate
// - categories expanded with isArchived
// - budgets expanded with categoryName, alertThreshold
db.version(2)
  .stores({
    profiles: '++id, name, pinHash, pinSalt, createdAt',
    transactions:
      '++id, profileId, type, amount, amountPaise, category, paymentMethod, date, description, memo, isRecurring, recurringId, recurringTemplateId, occurrenceDate, createdAt, [profileId+date]',
    categories: '++id, profileId, name, icon, colorToken, budget, isDefault, isArchived, [profileId+name]',
    budgets: '++id, profileId, categoryId, categoryName, monthYear, limit, limitPaise, alertThreshold, createdAt, [profileId+monthYear]',
    settings: '++id, profileId, key, value, [profileId+key]',
    recurringTemplates:
      '++id, profileId, name, amount, amountPaise, category, paymentMethod, frequency, nextDueDate, startDate, isActive, lastConfirmedDate, createdAt, [profileId+isActive]',
    recurringOccurrences:
      '++id, profileId, templateId, occurrenceDate, status, transactionId, createdAt, [templateId+occurrenceDate]',
  })
  .upgrade((tx) => {
    // Migration: populate amountPaise on existing transactions if missing
    return tx.transactions.toCollection().modify((t) => {
      if (t.amountPaise === undefined && t.amount !== undefined) {
        t.amountPaise = Math.round(Number(t.amount) * 100);
      }
    });
  });

// Version 3: Post-Phase 2 schema hardening & true atomicity
// - recurringOccurrences: &[templateId+occurrenceDate] strictly unique index
// - learnedRules: fully moved into IndexedDB with &[profileId+merchantKey] for true ACID atomicity
db.version(3)
  .stores({
    profiles: '++id, name, pinHash, pinSalt, createdAt',
    transactions:
      '++id, profileId, type, amount, amountPaise, category, paymentMethod, date, description, memo, isRecurring, recurringId, recurringTemplateId, occurrenceDate, createdAt, [profileId+date]',
    categories:
      '++id, profileId, name, icon, colorToken, budget, isDefault, isArchived, [profileId+name]',
    budgets:
      '++id, profileId, categoryId, categoryName, monthYear, limit, limitPaise, alertThreshold, createdAt, [profileId+monthYear]',
    settings: '++id, profileId, key, value, [profileId+key]',
    recurringTemplates:
      '++id, profileId, name, amount, amountPaise, category, paymentMethod, frequency, nextDueDate, startDate, isActive, lastConfirmedDate, createdAt, [profileId+isActive]',
    recurringOccurrences:
      '++id, profileId, templateId, occurrenceDate, status, transactionId, createdAt, &[templateId+occurrenceDate]',
    learnedRules:
      '++id, profileId, merchantKey, category, count, updatedAt, &[profileId+merchantKey], [profileId+category]',
  })
  .upgrade(async (tx) => {
    // 1. Dedup recurringOccurrences before applying unique index
    const occSeen = new Set();
    const occToDelete = [];
    await tx.table('recurringOccurrences').toCollection().each((occ) => {
      const key = `${occ.templateId}_${occ.occurrenceDate}`;
      if (occSeen.has(key)) {
        occToDelete.push(occ.id);
      } else {
        occSeen.add(key);
      }
    });
    for (const id of occToDelete) {
      await tx.table('recurringOccurrences').delete(id);
    }

    // 2. Safe migration of legacy localStorage learned rules into Dexie
    if (typeof localStorage !== 'undefined') {
      try {
        const profiles = await tx.table('profiles').toArray();
        for (const prof of profiles) {
          const storageKey = `expensify-learned-rules-${prof.id}`;
          const raw = localStorage.getItem(storageKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            for (const [merchantKey, data] of Object.entries(parsed)) {
              if (data && data.category) {
                await tx.table('learnedRules').add({
                  profileId: prof.id,
                  merchantKey: merchantKey.trim().toLowerCase(),
                  category: data.category,
                  count: data.count || 1,
                  updatedAt: data.updatedAt || new Date().toISOString(),
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('Error during learnedRules migration from localStorage:', err);
      }
    }
  });

export default db;
