// tests/verification.test.mjs — Comprehensive test suite for Expensify Local release readiness
import 'fake-indexeddb/auto';

// Node.js localStorage mock for testing environment
if (typeof globalThis.localStorage === 'undefined') {
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => store[key] ?? null,
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };
}

import Dexie from 'dexie';
import {
  formatINR,
  parseINR,
  formatINRShort,
  getAmountDisplay,
  toPaise,
  fromPaise,
  addINR,
  subtractINR,
  sumINR,
  roundCurrency,
  validateAmount,
} from '../src/utils/currency.js';
import { formatDate, isToday, isThisWeek, toMonthYearKey } from '../src/utils/date.js';
import { hashPIN, verifyPIN, encryptData, decryptData } from '../src/utils/crypto.js';
import {
  suggestCategory,
  recordLearnedRule,
  getLearnedRules,
  getLearnedRulesFromDB,
  saveLearnedRules,
  clearLearnedRules,
} from '../src/utils/categorization.js';
import {
  calculateNextDueDate,
  toDateString,
  isDueOrOverdue,
  getDaysOverdue,
  markRecurringAsPaid,
  skipRecurringOccurrence,
  postponeRecurringOccurrence,
} from '../src/utils/recurring.js';
import {
  createCategory,
  updateCategory,
  archiveCategory,
  unarchiveCategory,
  deleteCategorySafely,
} from '../src/utils/categories.js';
import {
  sanitizeCSVCell,
  escapeCSVCell,
  exportTransactionsToCSV,
  parseCSVString,
  parseAndValidateCSV,
  importTransactionsFromCSV,
} from '../src/utils/csv.js';
import {
  calculateBudgetStatus,
  getExpenseSpendForMonth,
  getBudgetsWithSpend,
  saveBudget,
  deleteBudget,
} from '../src/utils/budgets.js';
import {
  getDateRanges,
  calculateComparison,
  computeAnalytics,
} from '../src/utils/analytics.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n================================================================');
  console.log('EXPENSIFY LOCAL — POST-PHASE 2 COMPREHENSIVE VERIFICATION SUITE');
  console.log('================================================================\n');

  // ──────────────────────────────────────────────────────────
  // TEST GROUP 1: Currency Math, Paise Arithmetic & Formatting
  // ──────────────────────────────────────────────────────────
  console.log('--- Test Group 1: Currency Math & Paise Arithmetic ---');
  assert(toPaise(0) === 0, 'Zero rupees converts to 0 paise');
  assert(toPaise(280) === 28000, '₹280 converts to 28000 paise');
  assert(toPaise(42.5) === 4250, '₹42.50 converts to 4250 paise');
  assert(fromPaise(28000) === 280, '28000 paise converts to ₹280');
  assert(fromPaise(4250) === 42.5, '4250 paise converts to ₹42.50');

  const floatSum = 0.1 + 0.2;
  assert(roundCurrency(floatSum) === 0.3, 'roundCurrency eliminates floating-point drift: 0.1 + 0.2 = 0.3');
  assert(addINR(42.1, 0.2) === 42.3, 'addINR(42.1, 0.2) is exactly 42.3');
  assert(subtractINR(100.5, 42.3) === 58.2, 'subtractINR(100.5, 42.3) is exactly 58.2');
  assert(sumINR([10.25, 20.5, 30.25]) === 61, 'sumINR([10.25, 20.5, 30.25]) is exactly 61');

  assert(validateAmount(280).valid === true, 'validateAmount accepts positive integer amount');
  assert(validateAmount('42.50').valid === true && validateAmount('42.50').amount === 42.5, 'validateAmount parses valid decimal string');
  assert(validateAmount(0).valid === false, 'validateAmount rejects zero amount');
  assert(validateAmount(-150).valid === false, 'validateAmount rejects negative amount');
  assert(validateAmount('abc').valid === false, 'validateAmount rejects non-numeric string');
  assert(validateAmount(null).valid === false, 'validateAmount rejects null');
  assert(validateAmount(1000000001).valid === false, 'validateAmount rejects overflow (> ₹100 Crore)');

  assert(formatINR(0) === '₹0', 'Zero formats as ₹0');
  assert(formatINR(420) === '₹420', 'Small amount formats as ₹420');
  assert(formatINR(128450) === '₹1,28,450', 'Indian lakh notation: ₹1,28,450 (not 128,450)');
  assert(formatINR(10000000) === '₹1,00,00,000', 'Indian crore notation: ₹1,00,00,000');
  assert(formatINR(42350, true) === '₹42,350.00', 'Decimals format properly when requested');
  assert(formatINRShort(1500) === '₹1.5k', 'Short format for 1500 is ₹1.5k');
  assert(formatINRShort(128450) === '₹1.28L', 'Short format for 128450 is ₹1.28L');
  assert(formatINRShort(10000000) === '₹1.0Cr', 'Short format for 10000000 is ₹1.0Cr');
  assert(parseINR('₹1,28,450') === 128450, 'parseINR parses ₹1,28,450 back to 128450');
  assert(getAmountDisplay(280, 'debit') === '−₹280', 'Debit amount display has minus sign');
  assert(getAmountDisplay(15000, 'credit') === '+₹15,000', 'Credit amount display has plus sign');

  // ──────────────────────────────────────────────────────────
  // TEST GROUP 2: Local Multi-Profile Data Isolation
  // ──────────────────────────────────────────────────────────
  console.log('\n--- Test Group 2: Multi-Profile Isolation in Dexie ---');
  const testDb = new Dexie('TestExpensifyAudited');
  testDb.version(1).stores({
    profiles: '++id, name, pinHash, pinSalt, createdAt',
    transactions: '++id, profileId, type, amount, amountPaise, category, paymentMethod, date, description, memo, isRecurring, recurringId, recurringTemplateId, occurrenceDate, createdAt, [profileId+date]',
    categories: '++id, profileId, name, icon, colorToken, budget, isDefault, isArchived, [profileId+name]',
    budgets: '++id, profileId, categoryId, categoryName, monthYear, limit, limitPaise, alertThreshold, createdAt, [profileId+monthYear]',
    settings: '++id, profileId, key, value, [profileId+key]',
    recurringTemplates: '++id, profileId, name, amount, amountPaise, category, paymentMethod, frequency, nextDueDate, startDate, isActive, lastConfirmedDate, createdAt, [profileId+isActive]',
    recurringOccurrences: '++id, profileId, templateId, occurrenceDate, status, transactionId, createdAt, &[templateId+occurrenceDate]',
    learnedRules: '++id, profileId, merchantKey, category, count, updatedAt, &[profileId+merchantKey], [profileId+category]',
  });

  const profileA_Id = await testDb.profiles.add({ name: 'Personal Vault', createdAt: new Date().toISOString() });
  const profileB_Id = await testDb.profiles.add({ name: 'Business Vault', createdAt: new Date().toISOString() });

  assert(profileA_Id !== profileB_Id, 'Profiles have distinct primary keys');

  // Profile A transactions
  await testDb.transactions.bulkAdd([
    { profileId: profileA_Id, type: 'debit', amount: 350, amountPaise: 35000, category: 'Dining', paymentMethod: 'UPI', date: '2026-11-01', description: 'Lunch' },
    { profileId: profileA_Id, type: 'debit', amount: 1200, amountPaise: 120000, category: 'Groceries', paymentMethod: 'UPI', date: '2026-11-02', description: 'Weekly groceries' },
    { profileId: profileA_Id, type: 'credit', amount: 50000, amountPaise: 5000000, category: 'Income', paymentMethod: 'Bank Transfer', date: '2026-11-01', description: 'Salary' },
  ]);

  // Profile B transactions
  await testDb.transactions.bulkAdd([
    { profileId: profileB_Id, type: 'debit', amount: 5000, amountPaise: 500000, category: 'Software', paymentMethod: 'Credit Card', date: '2026-11-03', description: 'Server hosting' },
    { profileId: profileB_Id, type: 'debit', amount: 2500, amountPaise: 250000, category: 'Travel', paymentMethod: 'Corporate Card', date: '2026-11-04', description: 'Client meeting cab' },
  ]);

  const txsA = await testDb.transactions.where('profileId').equals(profileA_Id).toArray();
  const txsB = await testDb.transactions.where('profileId').equals(profileB_Id).toArray();

  assert(txsA.length === 3, 'Profile A queries return exactly 3 transactions');
  assert(txsB.length === 2, 'Profile B queries return exactly 2 transactions');
  assert(txsA.every(t => t.profileId === profileA_Id), 'All Profile A records belong to Profile A');
  assert(txsB.every(t => t.profileId === profileB_Id), 'All Profile B records belong to Profile B');
  assert(!txsA.some(t => t.description === 'Server hosting'), 'Profile A cannot see Profile B transactions (zero data leakage)');

  // Categories isolation
  await testDb.categories.add({ profileId: profileA_Id, name: 'Personal Gym', icon: 'fitness_center', colorToken: 'primary', isDefault: false, isArchived: false });
  await testDb.categories.add({ profileId: profileB_Id, name: 'Office Supplies', icon: 'inventory_2', colorToken: 'secondary', isDefault: false, isArchived: false });

  const catsA = await testDb.categories.where('profileId').equals(profileA_Id).toArray();
  const catsB = await testDb.categories.where('profileId').equals(profileB_Id).toArray();
  assert(catsA.some(c => c.name === 'Personal Gym') && !catsA.some(c => c.name === 'Office Supplies'), 'Custom categories strictly isolated to Profile A');
  assert(catsB.some(c => c.name === 'Office Supplies') && !catsB.some(c => c.name === 'Personal Gym'), 'Custom categories strictly isolated to Profile B');

  // Settings isolation
  await testDb.settings.add({ profileId: profileA_Id, key: 'monthlyBudget', value: 35000 });
  await testDb.settings.add({ profileId: profileB_Id, key: 'monthlyBudget', value: 150000 });

  const setA = await testDb.settings.where({ profileId: profileA_Id, key: 'monthlyBudget' }).first();
  const setB = await testDb.settings.where({ profileId: profileB_Id, key: 'monthlyBudget' }).first();
  assert(setA.value === 35000, 'Profile A settings isolated');
  assert(setB.value === 150000, 'Profile B settings isolated');

  // Mutation isolation
  await testDb.transactions.delete(txsA[0].id);
  const txsA_afterDelete = await testDb.transactions.where('profileId').equals(profileA_Id).toArray();
  const txsB_afterDelete = await testDb.transactions.where('profileId').equals(profileB_Id).toArray();
  assert(txsA_afterDelete.length === 2, 'Profile A delete operation succeeded');
  assert(txsB_afterDelete.length === 2, 'Profile B records completely unaffected by Profile A deletion');

  // ──────────────────────────────────────────────────────────
  // TEST GROUP 3: PIN Security & Session Locking
  // ──────────────────────────────────────────────────────────
  console.log('\n--- Test Group 3: PIN Security & Session Locking ---');
  const candidatePIN = '4826';
  const wrongPIN = '9999';
  const hashedObj = await hashPIN(candidatePIN);

  assert(typeof hashedObj.hash === 'string' && hashedObj.hash.length === 64, 'PBKDF2 hash is 64 hex characters (256-bit)');
  assert(typeof hashedObj.salt === 'string' && hashedObj.salt.length === 32, 'PBKDF2 salt is 32 hex characters (16 bytes random)');

  const secondHash = await hashPIN(candidatePIN);
  assert(hashedObj.salt !== secondHash.salt, 'Salt is unique per invocation (defends against precomputed tables)');
  assert(hashedObj.hash !== secondHash.hash, 'Hashes differ for the same PIN due to random salt');

  const verifySuccess = await verifyPIN(candidatePIN, hashedObj.hash, hashedObj.salt);
  assert(verifySuccess === true, 'verifyPIN accepts correct candidate PIN');

  const verifyFail = await verifyPIN(wrongPIN, hashedObj.hash, hashedObj.salt);
  assert(verifyFail === false, 'verifyPIN rejects incorrect candidate PIN');

  // ──────────────────────────────────────────────────────────
  // TEST GROUP 4: Smart Categorization & Word-Boundary Safety
  // ──────────────────────────────────────────────────────────
  console.log('\n--- Test Group 4: Smart Categorization & Word-Boundary Safety ---');
  await clearLearnedRules(profileA_Id, testDb);
  await clearLearnedRules(profileB_Id, testDb);

  assert(suggestCategory('Swiggy order #4829', [], profileA_Id) === 'Dining', 'Swiggy → Dining (Food & Drinks)');
  assert(suggestCategory('Delhi Metro recharge', [], profileA_Id) === 'Transport', 'Metro → Transport');
  assert(suggestCategory('Airtel prepaid recharge', [], profileA_Id) === 'Bills', 'Mobile recharge → Bills');
  assert(suggestCategory('Zepto quick delivery', [], profileA_Id) === 'Groceries', 'Zepto → Groceries');

  // Word-boundary safety
  await recordLearnedRule('car', 'Transport', profileA_Id, testDb);
  assert(suggestCategory('card payment at bookstore', [], profileA_Id) !== 'Transport', 'Word-boundary: "card" does not trigger learned "car" rule');
  assert(suggestCategory('monthly car wash', [], profileA_Id) === 'Transport', 'Word-boundary: exact phrase "car wash" triggers learned rule');

  // Profile-scoped learned rules
  await recordLearnedRule('canteen lunch', 'Dining', profileA_Id, testDb);
  await recordLearnedRule('canteen lunch', 'Other', profileB_Id, testDb);
  assert(suggestCategory('canteen lunch', [], profileA_Id) === 'Dining', 'Learned rule Dining for Profile A');
  assert(suggestCategory('canteen lunch', [], profileB_Id) === 'Other', 'Learned rule Other for Profile B');

  // ──────────────────────────────────────────────────────────
  // TEST GROUP 5: Web Crypto Backup, Completeness & Restore
  // ──────────────────────────────────────────────────────────
  console.log('\n--- Test Group 5: Web Crypto Backup, Completeness & Safe Restore ---');
  const dummyPayload = JSON.stringify({
    app: 'ExpensifyLocal',
    version: 3,
    transactions: [{ amount: 450, category: 'Dining', date: '2026-11-01' }],
  });
  const backupPassword = 'SecureVaultPassphrase!@#123';

  const encryptedBundle = await encryptData(dummyPayload, backupPassword);
  assert(typeof encryptedBundle === 'string', 'Encrypted backup is serialized JSON string');

  const parsedBundle = JSON.parse(encryptedBundle);
  assert(parsedBundle.algorithm === 'AES-256-GCM', 'Backup bundle uses AES-256-GCM');
  assert(parsedBundle.kdf === 'PBKDF2-SHA256', 'Key derivation is PBKDF2-SHA256');
  assert(parsedBundle.iterations === 100000, 'KDF uses 100,000 iterations');
  assert(typeof parsedBundle.salt === 'string', 'Bundle contains random Base64 salt');
  assert(typeof parsedBundle.iv === 'string', 'Bundle contains random Base64 96-bit IV');
  assert(typeof parsedBundle.data === 'string', 'Bundle contains Base64 ciphertext');

  const decryptedPayload = await decryptData(encryptedBundle, backupPassword);
  assert(decryptedPayload === dummyPayload, 'Decrypted payload matches original export verbatim');

  let wrongPassFailed = false;
  try {
    await decryptData(encryptedBundle, 'WrongPassword123');
  } catch (e) {
    wrongPassFailed = true;
  }
  assert(wrongPassFailed, 'Decryption with wrong password throws authentication failure');

  // ──────────────────────────────────────────────────────────
  // TEST GROUP 6: Recurring Integrity & Unique Index Enforcement
  // ──────────────────────────────────────────────────────────
  console.log('\n--- Test Group 6: Recurring Integrity & Unique Index Constraint ---');

  // Scheduling calculations
  assert(calculateNextDueDate('2026-03-01', 'daily') === '2026-03-02', 'Daily frequency advances by 1 calendar day');
  assert(calculateNextDueDate('2026-03-01', 'weekly') === '2026-03-08', 'Weekly frequency advances by 7 calendar days');
  assert(calculateNextDueDate('2026-01-31', 'monthly') === '2026-02-28', 'Monthly preserves month-end clamping (Jan 31 -> Feb 28 in non-leap year)');
  assert(calculateNextDueDate('2024-01-31', 'monthly') === '2024-02-29', 'Monthly preserves leap-year month-end (Jan 31 -> Feb 29 in leap year)');
  assert(calculateNextDueDate('2026-01-15', 'monthly') === '2026-02-15', 'Monthly advances day-of-month (Jan 15 -> Feb 15)');
  assert(calculateNextDueDate('2025-05-10', 'yearly') === '2026-05-10', 'Yearly advances by 1 full year');
  assert(calculateNextDueDate('2024-02-29', 'yearly') === '2025-02-28', 'Yearly handles leap year leap day (Feb 29 -> Feb 28)');

  const pastDate = '2020-01-01';
  const futureDate = '2099-01-01';
  assert(isDueOrOverdue(pastDate) === true, 'Past date identified as due or overdue');
  assert(isDueOrOverdue(futureDate) === false, 'Future date identified as not due');
  assert(getDaysOverdue(pastDate) > 1000, 'getDaysOverdue computes overdue days count accurately');

  // Template creation
  const templateId = await testDb.recurringTemplates.add({
    profileId: profileA_Id,
    name: 'Netflix 4K',
    amount: 649,
    amountPaise: 64900,
    category: 'Entertainment',
    paymentMethod: 'UPI',
    frequency: 'monthly',
    nextDueDate: '2026-11-01',
    startDate: '2026-11-01',
    isActive: true,
    lastConfirmedDate: null,
    createdAt: new Date().toISOString(),
  });

  const templateObj = await testDb.recurringTemplates.get(templateId);

  // Mark as Paid
  const paidResult = await markRecurringAsPaid({
    db: testDb,
    template: templateObj,
    profileId: profileA_Id,
    paidDate: '2026-11-01',
  });
  assert(typeof paidResult.transactionId === 'number', 'markRecurringAsPaid returns created transaction ID');

  const createdTx = await testDb.transactions.get(paidResult.transactionId);
  assert(createdTx && createdTx.isRecurring === true && createdTx.amountPaise === 64900, 'Transaction created with isRecurring flag and exact amount');
  assert(createdTx.category === 'Entertainment', 'Created transaction preserves category');

  // Verify exactly 1 transaction created for this occurrence
  const matchingTxs = await testDb.transactions
    .where('profileId')
    .equals(profileA_Id)
    .filter((t) => t.recurringTemplateId === templateId && t.occurrenceDate === '2026-11-01')
    .toArray();
  assert(matchingTxs.length === 1, 'Exactly one financial transaction created for the confirmed occurrence');

  // Task 1 check: Verify Dexie unique index &[templateId+occurrenceDate]
  let uniqueConstraintError = false;
  try {
    await testDb.recurringOccurrences.add({
      profileId: profileA_Id,
      templateId,
      occurrenceDate: '2026-11-01',
      status: 'paid',
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    uniqueConstraintError = true;
  }
  assert(uniqueConstraintError, 'Database-level unique constraint &[templateId+occurrenceDate] strictly rejects duplicate occurrence');

  // Duplicate prevention in markRecurringAsPaid
  let duplicatePrevented = false;
  try {
    await markRecurringAsPaid({
      db: testDb,
      template: templateObj,
      profileId: profileA_Id,
      paidDate: '2026-11-01',
    });
  } catch (err) {
    if (err.message && err.message.includes('DUPLICATE_OCCURRENCE')) {
      duplicatePrevented = true;
    }
  }
  assert(duplicatePrevented, 'Duplicate prevention rejects marking same occurrence as paid twice');

  // Skip occurrence
  const tplForSkip = await testDb.recurringTemplates.get(templateId);
  await skipRecurringOccurrence({
    db: testDb,
    template: tplForSkip,
    profileId: profileA_Id,
  });

  const skippedOccurrence = await testDb.recurringOccurrences
    .where('[templateId+occurrenceDate]')
    .equals([templateId, '2026-12-01'])
    .first();
  assert(skippedOccurrence && skippedOccurrence.status === 'skipped', 'Occurrence status recorded as skipped');

  const tplAfterSkip = await testDb.recurringTemplates.get(templateId);
  assert(tplAfterSkip.nextDueDate === '2027-01-01', 'nextDueDate advanced after skipping occurrence');

  // Postpone occurrence
  const tplForPostpone = await testDb.recurringTemplates.get(templateId);
  await postponeRecurringOccurrence({
    db: testDb,
    template: tplForPostpone,
    days: 9,
  });
  const tplAfterPostpone = await testDb.recurringTemplates.get(templateId);
  assert(tplAfterPostpone.nextDueDate === '2027-01-10', 'nextDueDate postponed to target date');

  // ──────────────────────────────────────────────────────────
  // TEST GROUP 7: Category Management, True Atomicity & Rollback
  // ──────────────────────────────────────────────────────────
  console.log('\n--- Test Group 7: Category Management & True ACID Rollback ---');

  // Create custom category
  const newCatId = await createCategory(testDb, {
    profileId: profileA_Id,
    name: 'Pet Care',
    icon: 'pets',
    colorToken: 'primary',
  });
  assert(typeof newCatId === 'number', 'createCategory successfully creates category');

  // Duplicate name rejection
  let dupCatRejected = false;
  try {
    await createCategory(testDb, { profileId: profileA_Id, name: 'Pet Care' });
  } catch (err) {
    dupCatRejected = true;
  }
  assert(dupCatRejected, 'createCategory rejects duplicate category name within same profile');

  // Add transaction and learned rule using 'Pet Care'
  const petTxId = await testDb.transactions.add({
    profileId: profileA_Id,
    type: 'debit',
    amount: 850,
    amountPaise: 85000,
    category: 'Pet Care',
    paymentMethod: 'UPI',
    date: '2026-11-10',
    description: 'Vet checkup',
  });

  await recordLearnedRule('vet clinic', 'Pet Care', profileA_Id, testDb);

  // Cascade Rename: Pet Care -> Veterinary & Pets across ALL stores
  await updateCategory(testDb, {
    categoryId: newCatId,
    profileId: profileA_Id,
    oldName: 'Pet Care',
    newName: 'Veterinary & Pets',
    icon: 'medical_services',
    colorToken: 'error-container',
  });

  const updatedCat = await testDb.categories.get(newCatId);
  assert(updatedCat.name === 'Veterinary & Pets', 'Category name updated in db.categories');

  const cascadedTx = await testDb.transactions.get(petTxId);
  assert(cascadedTx.category === 'Veterinary & Pets', 'Category rename cascaded to historical transactions');

  // Check learned rule updated in Dexie
  const dbLearned = await testDb.learnedRules
    .where('[profileId+merchantKey]')
    .equals([profileA_Id, 'vet clinic'])
    .first();
  assert(dbLearned && dbLearned.category === 'Veterinary & Pets', 'Category rename cascaded atomically to Dexie learnedRules store');

  // Midway failure atomic rollback verification
  let midwayErrorCaught = false;
  try {
    await testDb.transaction('rw', [testDb.categories, testDb.transactions, testDb.learnedRules], async () => {
      await testDb.categories.update(newCatId, { name: 'Faulty Name' });
      await testDb.transactions.where('id').equals(petTxId).modify({ category: 'Faulty Name' });
      throw new Error('SIMULATED_HALFWAY_FAILURE');
    });
  } catch (err) {
    midwayErrorCaught = true;
  }
  assert(midwayErrorCaught, 'Simulated halfway failure caught and transaction aborted');

  const catAfterAborted = await testDb.categories.get(newCatId);
  assert(catAfterAborted.name === 'Veterinary & Pets', 'Atomic rollback: Category table rolled back completely');

  const txAfterAborted = await testDb.transactions.get(petTxId);
  assert(txAfterAborted.category === 'Veterinary & Pets', 'Atomic rollback: Transaction table rolled back completely');

  // Safe deletion check: should fail because category is in use
  let deleteBlocked = false;
  try {
    await deleteCategorySafely(testDb, {
      categoryId: newCatId,
      profileId: profileA_Id,
      name: 'Veterinary & Pets',
    });
  } catch (err) {
    if (err.message && err.message.includes('CATEGORY_IN_USE')) {
      deleteBlocked = true;
    }
  }
  assert(deleteBlocked, 'deleteCategorySafely rejects deletion of in-use category');

  // Archive and unarchive category
  await archiveCategory(testDb, newCatId);
  const archivedCat = await testDb.categories.get(newCatId);
  assert(archivedCat.isArchived === true, 'archiveCategory sets isArchived: true');

  await unarchiveCategory(testDb, newCatId);
  const unarchivedCat = await testDb.categories.get(newCatId);
  assert(unarchivedCat.isArchived === false, 'unarchiveCategory restores category (isArchived: false)');

  // ──────────────────────────────────────────────────────────
  // TEST GROUP 8: CSV Export, RFC-4180 Escaping & Unicode
  // ──────────────────────────────────────────────────────────
  console.log('\n--- Test Group 8: CSV Sanitization, Signs & Unicode ---');

  // Formula injection defense
  assert(sanitizeCSVCell('=cmd|"/C calc"!A0') === "'=cmd|\"/C calc\"!A0", 'Sanitize prepends single-quote to = formula');
  assert(sanitizeCSVCell('+12345') === "'+12345", 'Sanitize prepends single-quote to + formula trigger');
  assert(sanitizeCSVCell('-20+5') === "'-20+5", 'Sanitize prepends single-quote to - formula trigger');
  assert(sanitizeCSVCell('@SUM(A1:A10)') === "'@SUM(A1:A10)", 'Sanitize prepends single-quote to @ formula trigger');
  assert(sanitizeCSVCell('\tmalicious') === "'\tmalicious", 'Sanitize prepends single-quote to tab prefix');
  assert(sanitizeCSVCell('Regular Dinner') === 'Regular Dinner', 'Sanitize leaves regular text untouched');

  // RFC-4180 Escaping
  assert(escapeCSVCell('Hello, World') === '"Hello, World"', 'Quotes cells containing commas');
  assert(escapeCSVCell('He said "Hi"') === '"He said ""Hi"""', 'Escapes double quotes by doubling them');
  assert(escapeCSVCell('Line1\nLine2') === '"Line1\nLine2"', 'Quotes cells containing newlines');

  // CSV Export with Unicode and special characters
  const sampleExportTxs = [
    { date: '2026-11-05', type: 'debit', amount: 450.50, category: 'Dining', paymentMethod: 'UPI', description: 'Dinner, Pasta "Special"' },
    { date: '2026-11-06', type: 'credit', amount: 25000, category: 'Income', paymentMethod: 'Bank', description: 'Bonus' },
    { date: '2026-11-07', type: 'debit', amount: 1500, category: 'Housing', paymentMethod: 'UPI', description: 'महीने का राशन' },
  ];
  const exportedCSV = exportTransactionsToCSV(sampleExportTxs);
  assert(exportedCSV.charCodeAt(0) === 0xFEFF, 'CSV Export includes UTF-8 BOM for Excel compatibility');
  assert(exportedCSV.includes('"Dinner, Pasta ""Special"""'), 'CSV Export quotes and escapes quotes in description');
  assert(exportedCSV.includes('महीने का राशन'), 'CSV Export preserves Devanagari/Unicode characters');

  // CSV Parsing with signs: -450.50, (120.00), +500.00
  const csvWithSigns = `Date,Type,Amount,Category,Payment Method,Description
2026-11-05,debit,-450.50,Dining,UPI,"Dinner, Pasta ""Special"""
2026-11-06,credit,+25000,Income,Bank,Bonus
2026-11-07,expense,(120.00),Transport,Cash,Metro`;

  const parsedData = parseAndValidateCSV(csvWithSigns, sampleExportTxs);
  assert(parsedData.validRows.length === 3, 'parseAndValidateCSV parses 3 valid rows with numeric signs');
  assert(parsedData.invalidRows.length === 0, 'Zero invalid rows flagged on negative / parenthetical amounts');
  assert(parsedData.validRows[0].amount === 450.5 && parsedData.validRows[0].type === 'debit', 'Negative amount -450.50 parsed as positive 450.5 debit');
  assert(parsedData.validRows[2].amount === 120 && parsedData.validRows[2].type === 'debit', 'Parenthetical amount (120.00) parsed as positive 120 debit');
  assert(parsedData.duplicateCount === 2, 'Duplicate detection detects matching records');

  // ──────────────────────────────────────────────────────────
  // TEST GROUP 9: Budget Management & Integer Math
  // ──────────────────────────────────────────────────────────
  console.log('\n--- Test Group 9: Budget Management & Integer Math ---');

  // Budget calculations
  const okBudget = calculateBudgetStatus({ spentPaise: 400000, limitPaise: 1000000, alertThreshold: 80 });
  assert(okBudget.status === 'ok' && okBudget.percentage === 40, 'Budget at 40% has status "ok"');
  assert(okBudget.remaining === 6000, 'Remaining cushion is ₹6,000');

  const warningBudget = calculateBudgetStatus({ spentPaise: 850000, limitPaise: 1000000, alertThreshold: 80 });
  assert(warningBudget.status === 'warning' && warningBudget.isWarning === true, 'Budget at 85% with 80% threshold has status "warning"');

  const overBudget = calculateBudgetStatus({ spentPaise: 1200000, limitPaise: 1000000, alertThreshold: 80 });
  assert(overBudget.status === 'over' && overBudget.isOver === true, 'Budget at 120% has status "over"');
  assert(overBudget.remainingPaise === 0, 'Negative cushion prevented (remainingPaise is 0)');
  assert(overBudget.over === 2000, 'Over-budget amount is ₹2,000');

  // Monthly Expense Spend calculation (strictly ignores income)
  const monthTxs = [
    { type: 'debit', amount: 1500, amountPaise: 150000, category: 'Groceries', date: '2026-11-05' },
    { type: 'debit', amount: 800, amountPaise: 80000, category: 'Dining', date: '2026-11-06' },
    { type: 'credit', amount: 50000, amountPaise: 5000000, category: 'Income', date: '2026-11-01' },
  ];
  const spend = getExpenseSpendForMonth(monthTxs, '2026-11');
  assert(spend.totalSpentPaise === 230000, 'Total expense spend is ₹2,300 (Income excluded)');
  assert(spend.byCategoryPaise['Groceries'] === 150000, 'Groceries spend is ₹1,500');
  assert(spend.byCategoryPaise['Dining'] === 80000, 'Dining spend is ₹800');
  assert(!spend.byCategoryPaise['Income'], 'Income category omitted from expense spend breakdown');

  // Dexie saveBudget & deleteBudget
  const overallBudgetId = await saveBudget(testDb, profileA_Id, {
    categoryName: 'Overall',
    monthYear: '2026-11',
    limit: 45000,
    alertThreshold: 75,
  });
  assert(typeof overallBudgetId === 'number', 'saveBudget saves overall monthly budget');

  const syncedSetting = await testDb.settings.where({ profileId: profileA_Id, key: 'monthlyBudget' }).first();
  assert(syncedSetting && syncedSetting.value === 45000, 'Overall budget synchronizes to db.settings monthlyBudget');

  const catBudgetId = await saveBudget(testDb, profileA_Id, {
    categoryId: 99,
    categoryName: 'Groceries',
    monthYear: '2026-11',
    limit: 12000,
    alertThreshold: 80,
  });
  assert(typeof catBudgetId === 'number', 'saveBudget saves category-specific budget');

  await deleteBudget(testDb, catBudgetId);
  const deletedCheck = await testDb.budgets.get(catBudgetId);
  assert(deletedCheck === undefined, 'deleteBudget deletes category budget record');

  // ──────────────────────────────────────────────────────────
  // TEST GROUP 10: Advanced Analytics & Correct Edge Cases
  // ──────────────────────────────────────────────────────────
  console.log('\n--- Test Group 10: Advanced Analytics Edge Cases ---');

  // Task 3: Zero previous period comparisons
  const newSpendingComp = calculateComparison(500000, 0);
  assert(newSpendingComp.text === 'New spending' && newSpendingComp.direction === 'up' && newSpendingComp.percent === null, 'Task 3: Previous=0, Current>0 displays "New spending"');

  const noChangeComp = calculateComparison(0, 0);
  assert(noChangeComp.text === 'No change' && noChangeComp.direction === 'flat' && noChangeComp.percent === 0, 'Task 3: Previous=0, Current=0 displays "No change"');

  const zeroCurrentComp = calculateComparison(0, 500000);
  assert(zeroCurrentComp.direction === 'down' && zeroCurrentComp.percent === 100, 'Previous>0, Current=0 displays -100% vs previous period');

  const normalIncrease = calculateComparison(150000, 100000);
  assert(normalIncrease.direction === 'up' && normalIncrease.percent === 50, 'Standard percentage increase: +50%');

  const normalDecrease = calculateComparison(80000, 100000);
  assert(normalDecrease.direction === 'down' && normalDecrease.percent === 20, 'Standard percentage decrease: -20%');

  // Date ranges
  const weekRange = getDateRanges('This Week');
  assert(typeof weekRange.currentStart === 'string' && typeof weekRange.currentEnd === 'string', 'getDateRanges returns valid start and end strings');

  // Analytics Computation
  const analyticsTxs = [
    { type: 'credit', amount: 60000, amountPaise: 6000000, category: 'Income', paymentMethod: 'Bank Transfer', date: '2026-11-01' },
    { type: 'debit', amount: 4500, amountPaise: 450000, category: 'Groceries', paymentMethod: 'UPI', date: '2026-11-02' },
    { type: 'debit', amount: 1500, amountPaise: 150000, category: 'Dining', paymentMethod: 'UPI', date: '2026-11-03' },
    { type: 'debit', amount: 2000, amountPaise: 200000, category: 'Transport', paymentMethod: 'Cash', date: '2026-11-04' },
  ];

  const analyticsResult = computeAnalytics(analyticsTxs, 'This Month', '2026-11-01', '2026-11-30');
  assert(analyticsResult.totalInflow === 60000, 'Total inflow is ₹60,000');
  assert(analyticsResult.totalBurn === 8000, 'Total burn is ₹8,000');
  assert(analyticsResult.netSaved === 52000, 'Net saved is ₹52,000');
  assert(analyticsResult.savingsRate === 87, 'Savings rate is 87%');
  assert(analyticsResult.rankedCategories[0].name === 'Groceries', 'Groceries is top ranked category');
  assert(analyticsResult.paymentBreakdown.some(p => p.method === 'UPI'), 'Payment breakdown contains UPI');
  assert(analyticsResult.insights.length >= 3, 'Data-driven local insights generated');

  // ──────────────────────────────────────────────────────────
  // TEST GROUP 11: Populated Profile Restore & Rollback Safety
  // ──────────────────────────────────────────────────────────
  console.log('\n--- Test Group 11: Populated Profile Restore & Safe Merges ---');

  // Create an already-populated test profile
  const profilePop_Id = await testDb.profiles.add({ name: 'Populated Vault', createdAt: new Date().toISOString() });
  await testDb.transactions.bulkAdd([
    { profileId: profilePop_Id, type: 'debit', amount: 100, amountPaise: 10000, category: 'Dining', date: '2026-11-01', description: 'Existing Tea' },
    { profileId: profilePop_Id, type: 'debit', amount: 200, amountPaise: 20000, category: 'Transport', date: '2026-11-02', description: 'Existing Bus' },
  ]);
  await testDb.categories.add({ profileId: profilePop_Id, name: 'Dining', icon: 'restaurant', colorToken: 'tertiary', isDefault: true, isArchived: false });

  // Prepare backup bundle to restore into populated profile
  const incomingBackupPayload = {
    app: 'ExpensifyLocal',
    version: 3,
    exportedAt: new Date().toISOString(),
    profile: { name: 'Restored Profile', pinHash: null, pinSalt: null },
    transactions: [
      { amount: 500, amountPaise: 50000, category: 'Shopping', date: '2026-11-03', description: 'New Shoes' },
      { amount: 1500, amountPaise: 150000, category: 'Dining', date: '2026-11-04', description: 'New Dinner' },
    ],
    categories: [
      { name: 'Dining', icon: 'restaurant', colorToken: 'tertiary', isDefault: true, isArchived: false }, // Duplicate name: must merge
      { name: 'Shopping', icon: 'shopping_bag', colorToken: 'primary', isDefault: true, isArchived: false }, // New category: must add
    ],
    budgets: [
      { categoryName: 'Shopping', monthYear: '2026-11', limit: 5000, alertThreshold: 80 },
    ],
    recurringTemplates: [
      { name: 'Gym', amount: 1200, amountPaise: 120000, category: 'Fitness', frequency: 'monthly', nextDueDate: '2026-12-01', isActive: true },
    ],
    recurringOccurrences: [
      { templateId: 999, occurrenceDate: '2026-11-01', status: 'paid' },
    ],
    learnedRules: [
      { merchantKey: 'zara', category: 'Shopping', count: 2, updatedAt: new Date().toISOString() },
    ],
  };

  const encryptedBundleStr = await encryptData(JSON.stringify(incomingBackupPayload), 'VaultPassword_999!');
  const decryptedStr = await decryptData(encryptedBundleStr, 'VaultPassword_999!');
  const parsedIncoming = JSON.parse(decryptedStr);

  // Perform atomic restore into populated profile
  await testDb.transaction(
    'rw',
    [testDb.transactions, testDb.categories, testDb.budgets, testDb.recurringTemplates, testDb.recurringOccurrences, testDb.learnedRules],
    async () => {
      // 1. Transactions
      const txsToAdd = parsedIncoming.transactions.map(t => ({ ...t, profileId: profilePop_Id }));
      await testDb.transactions.bulkAdd(txsToAdd);

      // 2. Safe merge categories (prevent duplicates by name)
      const existingCats = await testDb.categories.where('profileId').equals(profilePop_Id).toArray();
      const existingNames = new Set(existingCats.map((c) => (c.name || '').toLowerCase()));
      const newCats = parsedIncoming.categories
        .filter((c) => c.name && !existingNames.has(c.name.toLowerCase()))
        .map((c) => ({ ...c, profileId: profilePop_Id }));
      if (newCats.length > 0) {
        await testDb.categories.bulkAdd(newCats);
      }

      // 3. Budgets
      const bgsToAdd = parsedIncoming.budgets.map(b => ({ ...b, profileId: profilePop_Id }));
      await testDb.budgets.bulkAdd(bgsToAdd);

      // 4. Recurring templates
      const recsToAdd = parsedIncoming.recurringTemplates.map(r => ({ ...r, profileId: profilePop_Id }));
      await testDb.recurringTemplates.bulkAdd(recsToAdd);

      // 5. Learned rules
      for (const rule of parsedIncoming.learnedRules) {
        await testDb.learnedRules.add({ ...rule, profileId: profilePop_Id });
      }
    }
  );

  // Validate Populated Profile state after restore
  const finalPopTxs = await testDb.transactions.where('profileId').equals(profilePop_Id).toArray();
  assert(finalPopTxs.length === 4, 'Existing populated profile has 4 transactions (2 existing + 2 restored preserved)');
  assert(finalPopTxs.some(t => t.description === 'Existing Tea'), 'Existing transaction "Existing Tea" preserved');
  assert(finalPopTxs.some(t => t.description === 'New Shoes'), 'Restored transaction "New Shoes" imported');

  const finalPopCats = await testDb.categories.where('profileId').equals(profilePop_Id).toArray();
  assert(finalPopCats.length === 2, 'Categories merged safely: exactly 1 Dining and 1 Shopping (no duplicates)');

  // Verify Profile B records remain completely untouched
  const finalTxsB = await testDb.transactions.where('profileId').equals(profileB_Id).toArray();
  assert(finalTxsB.length === 2, 'Unrelated Profile B records 100% untouched during populated restore');

  // Clean up test db
  await testDb.delete();

  console.log('\n================================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
