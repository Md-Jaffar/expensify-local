# 📱 [👉 TAP HERE TO LAUNCH & INSTALL EXPENSIFY LOCAL 👈](https://md-jaffar.github.io/expensify-local/)

### 🚀 Live Web App URL: **[https://md-jaffar.github.io/expensify-local/](https://md-jaffar.github.io/expensify-local/)**

---

# Expensify Local — Android-First Offline Personal Expense Tracker PWA

Expensify Local is an Android-first, 100% offline, privacy-first personal expense tracking Progressive Web App built to match Google Stitch Material Design 3 specifications (`DESIGN.md`).

All data resides strictly on your device inside browser **IndexedDB (Dexie.js)**. No cloud servers, no third-party tracking, no external APIs, and no background listeners.

---

## Key Features

### Phase 1 Foundation
- **Local Multi-Profile Architecture**: Complete scoping and data isolation between multiple personal and business vaults.
- **PIN Convenience Lock**: Salted PBKDF2 (100,000 iterations, SHA-256, 16-byte random salt) access lock with auto-lock timer (off, 2m, 5m, 15m) and zero plaintext storage.
- **Smart Offline Categorization**: On-device merchant keyword inference with word-boundary matching and self-learning rule memory scoped per vault.
- **Precision Currency Arithmetic**: Native Integer Paise calculations (`toPaise` / `fromPaise`) eliminating floating-point rounding errors (`0.1 + 0.2 = 0.3`). Full Indian Lakh/Crore notation support (`₹1,28,450`).
- **Encrypted Web Crypto Backups**: Industry-standard AES-256-GCM authenticated encryption with PBKDF2 key derivation for tamper-evident JSON backup export and atomic restore.
- **PWA Offline Operation**: Service worker precaching and manifest for installable Android mobile experience.

### Phase 2 Advanced Capabilities
- **Feature A: Recurring Expense Management**:
  - Calendar-aware scheduling supporting daily, weekly, monthly (preserving anchor day-of-month and month-end clamping like Jan 31 → Feb 28), and yearly frequencies.
  - Startup due detection: Interactive alert banner on Dashboard surfaces due and overdue expenses.
  - Confirmation-only execution: Zero automatic expense creation without user consent. Supports **Mark as Paid**, **Skip**, and **Postpone**.
  - Atomic duplicate prevention: Indexed compound key `[templateId+occurrenceDate]` in `recurringOccurrences` store prevents double payments.
- **Feature B: Custom Category Management**:
  - Full CRUD for categories with 22 Material Symbols icons and 7 MD3 semantic color tokens.
  - Atomic cascading renames: Renaming a category updates historical transactions, recurring templates, category budgets, and learned categorization rules in a single Dexie transaction.
  - Soft Archiving: Archive categories to hide them from new transaction entry while preserving full history and past reports.
  - Deletion Safeguard: Prevents deleting categories that are currently referenced by transactions or budgets.
- **Feature C: Secure CSV Export & Import**:
  - RFC-4180 compliant with UTF-8 Byte Order Mark (`\uFEFF`) for flawless Microsoft Excel and Google Sheets opening.
  - **Spreadsheet Formula Injection Defense (CWE-1236)**: Automatically neutralizes cells starting with `=`, `+`, `-`, `@`, `\t`, or `\r` by prepending a single quote.
  - Interactive Import Preview Dialog: Structural validation, invalid row reporting, duplicate detection toggle, and atomic bulk commit.
- **Feature D: Complete Budget Management**:
  - Monthly overall budget and category-specific spending limits.
  - Configurable alert thresholds (50%, 75%, 80%, 90%, 100%) with visual marker lines and alert banners.
  - Strict expense-only aggregation: Automatically excludes income/credit transactions.
  - Integer paise math preventing negative remaining cushion.
- **Feature E: Advanced Analytics & Summaries**:
  - Multi-timeframe filtering: `Today`, `This Week`, `This Month`, `Previous Month`, and `Custom Range` (with start and end date pickers).
  - Zero-division safe period-over-period comparisons (e.g. +100% or 0% without `NaN` or `Infinity` crashes).
  - Cash flow breakdown: Total Inflow, Total Outflow, Net Saved, and Savings Rate percentage.
  - Visual SVG Spending Velocity chart: Dynamic 7-day or 4-week bar charts with peak highlight gradients.
  - Ranked Outflows: Sorted category distribution with percentage bars and rupee amounts.
  - Payment Method Breakdown: Metrics on UPI, Cash, Debit, and Credit card usage.
  - Bento Stack Local Insights: 100% on-device observations on payment channel preference, top outflows, weekend spending patterns, and daily run rates.

---

## Tech Stack

- **Frontend Framework**: React 18 with JavaScript (ES Modules)
- **Build System**: Vite 6
- **Styling**: Tailwind CSS configured with Material Design 3 tokens
- **Local Database**: Dexie.js 4 (IndexedDB) with Version 2 schema migration
- **Cryptography**: Web Crypto API (`crypto.subtle`)
- **PWA / Service Worker**: `vite-plugin-pwa` (Workbox)
- **Testing**: Node.js automated test suite using `fake-indexeddb`

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```

### 3. Run Automated Verification Test Suite
```bash
node tests/verification.test.mjs
```
The test suite validates:
1. Currency math & paise arithmetic (27 assertions)
2. Multi-profile isolation & scoping (13 assertions)
3. PIN security & PBKDF2 hashing (7 assertions)
4. Smart categorization & word-boundary safety (8 assertions)
5. Web Crypto AES-256-GCM backup round-trip (9 assertions)
6. Recurring expense scheduling & duplicate prevention (19 assertions)
7. Category management & cascading renames (7 assertions)
8. CSV export, sanitization & RFC-4180 escaping (14 assertions)
9. Budget management, thresholds & income exclusion (14 assertions)
10. Advanced analytics, comparisons & insights (12 assertions)
11. Encrypted backup round-trip with Phase 2 collections (4 assertions)

**Current Status: 134 Passed, 0 Failed.**

### 4. Build Production Bundle
```bash
npm run build
```
Generates offline-ready static assets in `dist/` with precache service worker.
