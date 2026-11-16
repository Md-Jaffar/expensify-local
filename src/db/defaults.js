// src/db/defaults.js — Default categories and settings seeded for new profiles

// ── Default Categories ───────────────────────────────────────────────────
// These 10 categories are seeded when a new profile is created.
// colorToken maps to Tailwind color tokens in DESIGN.md Section 11.
export const DEFAULT_CATEGORIES = [
  { name: 'Dining',         icon: 'restaurant',         colorToken: 'tertiary-fixed',           budget: null, isDefault: true },
  { name: 'Groceries',      icon: 'local_grocery_store', colorToken: 'secondary-container',      budget: null, isDefault: true },
  { name: 'Transport',      icon: 'directions_subway',   colorToken: 'primary',                  budget: null, isDefault: true },
  { name: 'Shopping',       icon: 'shopping_bag',        colorToken: 'surface-container-high',   budget: null, isDefault: true },
  { name: 'Bills',          icon: 'receipt_long',        colorToken: 'surface-container-high',   budget: null, isDefault: true },
  { name: 'Entertainment',  icon: 'movie',               colorToken: 'surface-container-highest',budget: null, isDefault: true },
  { name: 'Healthcare',     icon: 'medical_services',    colorToken: 'error-container',          budget: null, isDefault: true },
  { name: 'Housing',        icon: 'home',                colorToken: 'secondary',                budget: null, isDefault: true },
  { name: 'Income',         icon: 'payments',            colorToken: 'secondary-container',      budget: null, isDefault: true },
  { name: 'Subscriptions',  icon: 'subscriptions',       colorToken: 'surface-container-highest',budget: null, isDefault: true },
];

// ── Default Settings ─────────────────────────────────────────────────────
// Key-value settings seeded for each new profile
export const DEFAULT_SETTINGS = [
  { key: 'theme',              value: 'system' },   // 'light' | 'dark' | 'system'
  { key: 'defaultPayment',     value: 'UPI' },       // UPI | Cash | Debit Card | Credit Card
  { key: 'monthlyBudget',      value: null },        // overall monthly budget (₹)
  { key: 'currency',           value: 'INR' },
  { key: 'autoLock',           value: false },
  { key: 'biometric',          value: false },
];

// ── Seed function ─────────────────────────────────────────────────────────
// Called after creating a new profile to populate defaults
export async function seedProfileDefaults(db, profileId) {
  // Insert default categories
  const cats = DEFAULT_CATEGORIES.map(c => ({ ...c, profileId }));
  await db.categories.bulkAdd(cats);

  // Insert default settings
  const settings = DEFAULT_SETTINGS.map(s => ({ ...s, profileId }));
  await db.settings.bulkAdd(settings);
}
