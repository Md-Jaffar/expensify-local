// src/utils/categories.js — Category definitions, icon/color palettes, and management utilities
// Handles creation, renaming with foreign-key cascade, archiving, and deletion safeguards.

import { getLearnedRules, saveLearnedRules } from './categorization.js';

// ── Default category definitions matching DESIGN.md Section 11 ─────────────
export const DEFAULT_CATEGORIES = [
  { name: 'Dining',         icon: 'restaurant',         colorToken: 'tertiary-fixed'           },
  { name: 'Groceries',      icon: 'local_grocery_store', colorToken: 'secondary-container'      },
  { name: 'Transport',      icon: 'directions_subway',   colorToken: 'primary'                  },
  { name: 'Shopping',       icon: 'shopping_bag',        colorToken: 'surface-container-high'   },
  { name: 'Bills',          icon: 'receipt_long',        colorToken: 'surface-container-high'   },
  { name: 'Entertainment',  icon: 'movie',               colorToken: 'surface-container-highest'},
  { name: 'Healthcare',     icon: 'medical_services',    colorToken: 'error-container'          },
  { name: 'Housing',        icon: 'home',                colorToken: 'secondary'                },
  { name: 'Income',         icon: 'payments',            colorToken: 'secondary-container'      },
  { name: 'Subscriptions',  icon: 'subscriptions',       colorToken: 'surface-container-highest'},
];

// Available icons for custom categories
export const CATEGORY_ICON_PALETTE = [
  'restaurant',
  'local_grocery_store',
  'directions_subway',
  'shopping_bag',
  'receipt_long',
  'movie',
  'medical_services',
  'home',
  'payments',
  'subscriptions',
  'school',
  'fitness_center',
  'flight',
  'pets',
  'local_gas_station',
  'build',
  'sports_esports',
  'card_giftcard',
  'savings',
  'work',
  'devices',
  'local_cafe',
];

// Available color tokens for custom categories
export const CATEGORY_COLOR_PALETTE = [
  { token: 'tertiary-fixed',           label: 'Amber / Orange' },
  { token: 'secondary-container',      label: 'Mint / Green' },
  { token: 'primary',                  label: 'Teal / Cyan' },
  { token: 'surface-container-high',   label: 'Soft Blue' },
  { token: 'surface-container-highest',label: 'Purple / Lavender' },
  { token: 'error-container',          label: 'Coral / Red' },
  { token: 'secondary',                label: 'Emerald' },
];

// ── Color token → Tailwind class mapping ─────────────────────────────────
const TOKEN_BG_MAP = {
  'tertiary-fixed':           'bg-tertiary-fixed',
  'secondary-container':      'bg-secondary-container',
  'primary':                  'bg-primary/10',
  'surface-container-high':   'bg-surface-container-high',
  'surface-container-highest':'bg-surface-container-highest',
  'error-container':          'bg-error-container/40',
  'secondary':                'bg-secondary/10',
};

const TOKEN_TEXT_MAP = {
  'tertiary-fixed':           'text-tertiary',
  'secondary-container':      'text-on-secondary-container',
  'primary':                  'text-primary',
  'surface-container-high':   'text-on-surface-variant',
  'surface-container-highest':'text-on-surface-variant',
  'error-container':          'text-on-error-container',
  'secondary':                'text-secondary',
};

export function getCategoryBgClass(colorToken) {
  return TOKEN_BG_MAP[colorToken] || 'bg-surface-container';
}

export function getCategoryTextClass(colorToken) {
  return TOKEN_TEXT_MAP[colorToken] || 'text-on-surface-variant';
}

export function findCategory(name, categoriesList = DEFAULT_CATEGORIES) {
  return (
    categoriesList.find(c => c.name.toLowerCase() === (name || '').toLowerCase()) ||
    { name: name || 'Other', icon: 'category', colorToken: 'surface-container' }
  );
}

/**
 * Create a new custom category with profile-scoped uniqueness check.
 */
export async function createCategory(db, { profileId, name, icon = 'category', colorToken = 'primary' }) {
  if (!profileId || !name || !name.trim()) {
    throw new Error('INVALID_NAME: Category name cannot be empty.');
  }

  const cleanName = name.trim();
  const existing = await db.categories
    .where('profileId')
    .equals(profileId)
    .filter((c) => c.name.toLowerCase() === cleanName.toLowerCase())
    .first();

  if (existing) {
    throw new Error(`DUPLICATE_NAME: Category "${cleanName}" already exists in this vault.`);
  }

  const id = await db.categories.add({
    profileId,
    name: cleanName,
    icon,
    colorToken,
    budget: null,
    isDefault: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
  });

  return id;
}

/**
 * Rename and/or update a category, cascading changes to historical transactions,
 * recurring templates, and learned categorization rules atomically.
 */
export async function updateCategory(db, { categoryId, profileId, oldName, newName, icon, colorToken }) {
  if (!categoryId || !profileId) throw new Error('Missing categoryId or profileId');

  const cleanNewName = newName ? newName.trim() : oldName;
  if (!cleanNewName) throw new Error('Category name cannot be empty');

  // Check duplicate if name is changing
  if (oldName && cleanNewName.toLowerCase() !== oldName.toLowerCase()) {
    const existing = await db.categories
      .where('profileId')
      .equals(profileId)
      .filter((c) => c.id !== categoryId && c.name.toLowerCase() === cleanNewName.toLowerCase())
      .first();

    if (existing) {
      throw new Error(`DUPLICATE_NAME: Category "${cleanNewName}" already exists.`);
    }
  }

  const storesToLock = [db.categories, db.transactions, db.recurringTemplates, db.budgets];
  if (db.learnedRules) {
    storesToLock.push(db.learnedRules);
  }

  return db.transaction(
    'rw',
    storesToLock,
    async () => {
      // 1. Update the category record
      await db.categories.update(categoryId, {
        name: cleanNewName,
        icon,
        colorToken,
      });

      // 2. Cascade rename to transactions if name changed
      if (oldName && cleanNewName !== oldName) {
        await db.transactions
          .where('profileId')
          .equals(profileId)
          .filter((t) => (t.category || '').toLowerCase() === oldName.toLowerCase())
          .modify({ category: cleanNewName });

        // Cascade to recurring templates
        await db.recurringTemplates
          .where('profileId')
          .equals(profileId)
          .filter((t) => (t.category || '').toLowerCase() === oldName.toLowerCase())
          .modify({ category: cleanNewName });

        // Cascade to budgets
        await db.budgets
          .where('profileId')
          .equals(profileId)
          .filter((b) => b.categoryId === categoryId || (b.categoryName || '').toLowerCase() === oldName.toLowerCase())
          .modify({ categoryName: cleanNewName });

        // Cascade to learned categorization rules in Dexie (true ACID atomicity!)
        if (db.learnedRules) {
          await db.learnedRules
            .where('profileId')
            .equals(profileId)
            .filter((r) => (r.category || '').toLowerCase() === oldName.toLowerCase())
            .modify({ category: cleanNewName, updatedAt: new Date().toISOString() });
        }

        // Keep local cache synced
        const learned = getLearnedRules(profileId);
        let updatedLearned = false;
        for (const [key, rule] of Object.entries(learned)) {
          if (rule.category && rule.category.toLowerCase() === oldName.toLowerCase()) {
            rule.category = cleanNewName;
            updatedLearned = true;
          }
        }
        if (updatedLearned) {
          saveLearnedRules(learned, profileId, db);
        }
      }
    }
  );
}

/**
 * Archive a category so it cannot be selected for new transactions,
 * while preserving it for historical reporting and existing transactions.
 */
export async function archiveCategory(db, categoryId) {
  if (!categoryId) return;
  await db.categories.update(categoryId, { isArchived: true });
}

/**
 * Restore an archived category.
 */
export async function unarchiveCategory(db, categoryId) {
  if (!categoryId) return;
  await db.categories.update(categoryId, { isArchived: false });
}

/**
 * Safely delete a category only if no transactions or budgets depend on it.
 */
export async function deleteCategorySafely(db, { categoryId, profileId, name }) {
  if (!categoryId || !profileId) throw new Error('Missing categoryId or profileId');

  const txCount = await db.transactions
    .where('profileId')
    .equals(profileId)
    .filter((t) => (t.category || '').toLowerCase() === (name || '').toLowerCase())
    .count();

  if (txCount > 0) {
    throw new Error(
      `CATEGORY_IN_USE: Cannot delete "${name}" because it is linked to ${txCount} transaction${
        txCount > 1 ? 's' : ''
      }. Archive it instead to hide it from new entries.`
    );
  }

  const budgetCount = await db.budgets
    .where('profileId')
    .equals(profileId)
    .filter((b) => b.categoryId === categoryId || (b.categoryName || '').toLowerCase() === (name || '').toLowerCase())
    .count();

  if (budgetCount > 0) {
    throw new Error(`CATEGORY_IN_USE: Cannot delete "${name}" because an active budget is configured for it.`);
  }

  await db.categories.delete(categoryId);
}
