# Android Expense Tracker PWA — Design System

> **Source:** Google Stitch project `projects/12259217695612448850`  
> **Device Target:** Android Mobile (390×844 dp reference)  
> **Design Language:** Material Design 3 (Material You) — Minimalist Finance  
> **App Name:** Expensify Local  
> **Tech Stack (planned):** React · Vite · Tailwind CSS · Dexie/IndexedDB · PWA Service Worker

---

## 1. Screens Inventory

The Stitch project contains **15 screen instances** across **3 design rows** (each row is a thematic variant). They map to **5 unique logical screens**:

| # | Screen Title | Stitch IDs (representative) | Shell Type | Height (px @2x) | Notes |
|---|---|---|---|---|---|
| 1 | **Home Dashboard** | `1a9c2fdcaaad…` | `mobile_tab` | 3834 | Hero financial overview card, donut chart, recent transactions |
| 2 | **Add Transaction** | `6b0b49edf4d2…` | `mobile_stack` | 2192 | Full-page form (not a bottom sheet in HTML) |
| 3 | **Transaction History** | `63bc83447fa8…` | `mobile_tab` | 2368 | Grouped list, search, filter chips, detail bottom sheet |
| 4 | **Spending Insights** | `68e1809cb43d…` | `mobile_tab` | 4350 | Cash flow, bar chart, donut, ranked categories, insight cards |
| 5 | **App Settings** | `5a2e5b81f256…` | `mobile_tab` | 3732 | Profile card, privacy banner, prefs, security, data export |

> Each screen exists in **3 visual variants** (rows 1–3 in the Stitch canvas). The row-3 variants are the most elaborate and should be treated as the **final reference**.

---

## 2. Colors

Extracted from the Tailwind config embedded in every screen's HTML.

### Brand Semantic Roles

| Role | Token | Hex | Usage |
|---|---|---|---|
| **Primary** | `primary` | `#005c55` | Nav active icon, text links, focus rings |
| **Primary Container** | `primary-container` | `#0f766e` | FAB, hero card gradient start, active chips & buttons |
| **On Primary** | `on-primary` | `#ffffff` | Text/icons on primary/primary-container surfaces |
| **On Primary Container** | `on-primary-container` | `#a3faef` | Muted text on primary-container backgrounds |
| **Secondary** (Credit / Income) | `secondary` | `#006c49` | Credit amounts, positive deltas, income badge |
| **Secondary Container** | `secondary-container` | `#6cf8bb` | Credit row tint, success chip bg |
| **On Secondary Container** | `on-secondary-container` | `#00714d` | Text on secondary-container |
| **Tertiary** (Warning / Amber) | `tertiary` | `#734700` | Budget caution text |
| **Tertiary Fixed** | `tertiary-fixed` | `#ffddb8` | Food/dining category icon bg |
| **Tertiary Fixed Dim** | `tertiary-fixed-dim` | `#ffb95f` | Transport chart fill, amber accent |
| **Error** (Debit / Expense) | `error` | `#ba1a1a` | Expense amounts, delete actions, budget overage |
| **Error Container** | `error-container` | `#ffdad6` | Delete button bg, healthcare icon bg |
| **On Error Container** | `on-error-container` | `#93000a` | Text on error-container |

### Surface Hierarchy

| Level | Token | Hex | Description |
|---|---|---|---|
| Canvas / Base | `background` / `surface` | `#faf8ff` | Root page background |
| Elevated Cards | `surface-container-lowest` | `#ffffff` | Transaction cards, form fields, modal sheets |
| Nested Content | `surface-container-low` | `#f2f3ff` | Category breakdown rows, search bar bg |
| Interactive Containers | `surface-container` | `#eaedff` | Chip backgrounds, icon wrappers, segmented controls track |
| Active / Hovered | `surface-container-high` | `#e2e7ff` | Hovered pills, filter chips |
| Strongest Surface | `surface-container-highest` | `#dae2fd` | Maximum tinted surface |
| Dimmed Surface | `surface-dim` | `#d2d9f4` | Inactive/muted surface overlays |

### Text / Outline

| Token | Hex | Usage |
|---|---|---|
| `on-surface` | `#131b2e` | Primary body text, headings |
| `on-surface-variant` | `#3e4947` | Secondary labels, metadata, timestamps |
| `outline` | `#6e7977` | Placeholder text, dividers, helper text |
| `outline-variant` | `#bdc9c6` | Thin dividers, dot separators |
| `inverse-surface` | `#283044` | Toast/snackbar background |
| `inverse-on-surface` | `#eef0ff` | Toast text |

### Extended Palette (overrides)

```
overridePrimaryColor:   #0f766e   (displayed color for primary-container)
overrideSecondaryColor: #10b981   (Mint – income)
overrideTertiaryColor:  #f59e0b   (Amber – warning)
overrideNeutralColor:   #0f172a   (Dark charcoal – text anchor)
```

---

## 3. Typography

**Single font family:** `Inter` (weights: 400, 500, 600, 700)  
**Numeral rendering:** `font-variant-numeric: tabular-nums` on all currency figures  
**Currency symbol:** ₹ (Indian Rupee) — format: `₹1,28,450.00` (Indian lakhs notation)

### Type Scale

| Token | Size | Weight | Line Height | Letter Spacing | Usage |
|---|---|---|---|---|---|
| `display-currency` | 38px | 700 | 44px | −0.03em | Desktop large balance (unused on mobile) |
| `display-currency-mobile` | 32px | 700 | 38px | −0.02em | Hero balance on Home Dashboard |
| `headline-lg` | 26px | 600 | 32px | −0.015em | Section heroes |
| `headline-md` | 20px | 600 | 26px | −0.01em | App bar screen title |
| `headline-sm` | 18px | 600 | 24px | — | Card headings, stat values |
| `body-lg` | 16px | 400 | 24px | — | Description field input |
| `body-md` | 14px | 400 | 20px | — | Transaction merchant name, row content |
| `body-sm` | 12px | 400 | 16px | — | Timestamps, metadata, sub-labels |
| `label-lg` | 14px | 600 | 20px | +0.01em | Settings row labels, section labels |
| `label-md` | 12px | 600 | 16px | +0.02em | Filter chips, category names, payment mode chips |
| `label-sm` | 11px | 600 | 14px | +0.04em | Privacy badge text, offline indicator, uppercase section titles |
| `numeral-dense` | 15px | 600 | 20px | −0.01em | Transaction amounts in list rows |

---

## 4. Spacing

| Token | Value | Tailwind class |
|---|---|---|
| `space-xs` | 0.25rem (4px) | `gap-space-xs`, `p-space-xs` |
| `space-sm` | 0.5rem (8px) | `gap-space-sm`, `p-space-sm` |
| `space-md` | 1rem (16px) | `gap-space-md`, `p-space-md` |
| `space-lg` | 1.5rem (24px) | `gap-space-lg`, `p-space-lg` |
| `space-xl` | 2rem (32px) | `gap-space-xl`, `p-space-xl` |
| `gutter` | 1rem (16px) | `px-gutter` — horizontal page margin |
| `margin` | 1rem (16px) | — |

**Body scroll:** `overscroll-behavior-y: contain; -webkit-overflow-scrolling: touch`  
**Safe area:** `.pt-safe` / `.pb-safe` using `env(safe-area-inset-*)` CSS variables  
**Main content:** `pt-24 pb-32` to clear fixed header (96px) and nav bar (80px + inset)

---

## 5. Border Radius

| Scale | Value | Tailwind | Usage |
|---|---|---|---|
| Default | 1rem (16px) | `rounded` | Card containers (transaction rows) |
| Large | 2rem (32px) | `rounded-lg` | Main stat cards, metric panels, bottom sheet top corners |
| XL | 3rem (48px) | `rounded-xl` | (reserved) |
| Full | 9999px | `rounded-full` | Buttons, chips, pills, FAB, avatar circles, nav pill |
| `rounded-2xl` | 24px | `rounded-2xl` | Category tiles, stat grid cards |
| `rounded-xl` | 12px | `rounded-xl` | Input fields, inner nested rows |

---

## 6. Elevation & Shadows

| Level | Surface Token | Shadow CSS | Usage |
|---|---|---|---|
| 0 — Canvas | `background` | none | Root page |
| 1 — Cards | `surface-container-lowest` (#fff) | `shadow-sm` | Transaction cards, stat cells, settings sections |
| 2 — Nested | `surface-container-low` | flat (no shadow) | Inner rows, search bar |
| 3 — Header | `surface` at 85% opacity | `shadow-[0_1px_8px_rgba(0,0,0,0.03)]` + `backdrop-blur-xl` | Fixed top app bar |
| 3 — Nav | `surface` at 90% opacity | `shadow-[0_-4px_16px_rgba(19,27,46,0.06)]` + `backdrop-blur-xl` | Fixed bottom nav |
| 3 — Hero | `primary-container → primary` gradient | `shadow-[0_8px_24px_-4px_rgba(15,118,110,0.35)]` | Financial overview card |
| 4 — FAB | `primary-container` | `shadow-[0_6px_16px_-2px_rgba(15,118,110,0.35)]` | Centered add FAB in nav |

---

## 7. Navigation

### Bottom Tab Bar

Fixed bar, `z-50`, `h-20` + bottom safe inset. Glass morphic: `bg-surface/90 backdrop-blur-xl`.  
Android gesture home indicator: `w-28 h-1 rounded-full bg-on-surface/30` centered below nav items.

**4 destinations + 1 FAB (centered, elevated):**

| Icon (Material Symbols) | Label | Route |
|---|---|---|
| `grid_view` | Home | `/` (Dashboard) |
| `receipt_long` | History | `/history` |
| `add` ← **FAB** | — | `/add` |
| `pie_chart` | Insights | `/insights` |
| `settings` | Settings | `/settings` |

**Active state:** `text-primary font-bold`; inactive: `text-on-surface-variant`  
**Nav item anatomy:** `min-w-[56px] min-h-[48px]` outer; inner `w-12 h-7 rounded-full` pill for active indicator + icon.

**FAB:** `w-14 h-14 rounded-full bg-primary-container text-on-primary`, raised `-top-3` above nav bar, with `ring-4 ring-surface` to visually float it.

---

## 8. Shared Header (App Bar)

Fixed top, `z-50`, `pt-safe`, `bg-surface/85 backdrop-blur-xl`.

**Status bar row:** time (`numeral-dense` font) + "Offline • Local Only" pill (`bg-primary/10 border-primary/20 text-primary`, pulsing `bg-secondary` dot) + system icons (signal, wifi, battery).

**App bar row (`h-16`):**
- Left: Logo image + `font-label-sm uppercase text-primary` brand name ("Expensify Local") + `font-headline-md` screen title
- Right: Profile avatar pill (`rounded-full bg-surface-container-high`, avatar + "Personal" label + `unfold_more` icon)

**Add Transaction screen:** replaces logo area with `arrow_back` back button + screen title.

---

## 9. Screen-by-Screen Component Breakdown

### 9.1 Home Dashboard

```
AppBar → StatusBar + OfflineBadge
├─ GreetingBar (PersonalVaultBadge + PrivacyBadge + GreetingText + MonthSelectorPill)
├─ HeroFinancialCard (gradient bg-primary-container → primary → #004741)
│   ├─ AmbientBlobs (blur-2xl circles, decorative)
│   ├─ NetBalanceLabel + AuditedBadge
│   ├─ BalanceDisplay (display-currency-mobile: ₹42,350)
│   ├─ ComparisonChip ("↓ 8% spent less than Sep")
│   └─ IncomeExpenseGrid (2-col: Income ₹78,000 / Expenses ₹35,650)
├─ QuickStatsGrid (2×2)
│   ├─ StatCard: Today's Spend (₹420 / 3 transactions)
│   ├─ StatCard: This Week (₹6,850 / "Within safe pace")
│   ├─ StatCard: Daily Average (₹1,188)
│   └─ StatCard: Remaining (₹14,350 Budget cushion) ← secondary color
├─ BudgetProgressCard
│   ├─ BudgetHeader + "On track" badge
│   ├─ SpentVsLimit (₹35,650 / ₹50,000 · 71%)
│   ├─ DualToneProgressBar (gradient + 80% error threshold marker)
│   └─ ProgressLegend
├─ SpendingBreakdownCard
│   ├─ DonutChart (SVG, 5 segments: Food 38%, Rent 30%, Transport 14%, Shopping 12%, Other 6%)
│   ├─ DonutCenter (Total label + ₹35,650 + "Oct '24")
│   └─ DonutLegend (5 rows: color dot + name + % + amount)
├─ RecentActivitySection
│   ├─ SectionHeader + "View All" button
│   └─ TransactionListCard (5 rows: Swiggy, Metro, Freelance, Zepto, Blue Tokai)
└─ ZeroCloudBanner (encrypted icon + privacy text)
BottomNav
```

### 9.2 Add Transaction

```
AppBar (back arrow variant) → StatusBar + OfflineBadge
├─ NewEntryHeader + "Smart Local AI" badge (secondary-container)
├─ ExpenseIncomeSwitcher (segmented pill: Expense | Income)
├─ AmountStage (rounded-2xl card)
│   ├─ ₹ prefix + large number input (display-currency-mobile)
│   └─ QuickIncrementChips (+₹50, +₹100, +₹500, +₹1k)
├─ DescriptionField (text input with edit_note icon)
├─ AISuggestionBanner (emoji + "Suggested: Food & Drinks" + Confirm button)
├─ CategoryGrid (4×2 tiles: Dining, Groceries, Transport, Shopping, Bills, Fun, Health, Housing)
├─ PaymentChannelChips (UPI/QR ← active | Cash | Debit Card | Credit Card)
├─ DateTimePill (calendar_today + "Today, 24 Oct • 4:15 PM" + "Yesterday?" button)
├─ MemoField (tag icon + text input)
└─ SaveButton (w-full h-14 rounded-full primary-container · "Save Expense • ₹280")
    + PrivacyFootnote (encrypted icon + IndexedDB note)
AndroidHomeIndicator
```

### 9.3 Transaction History

```
AppBar (tab variant) → StatusBar + OfflineBadge
├─ TopUtilityBar (SearchBar + FilterButton + ExportCSVButton)
├─ TypeFilterPills (All 42 | Expenses 38 | Income 4)
├─ FilterChipCarousel (Category: All | Payment: UPI | Oct 2024 | Sort: Newest)
├─ SummaryBanner ("Showing 14 transactions · Total: ₹8,420 spent")
├─ TransactionGroups
│   ├─ DayGroup: TODAY (24 OCT) · Day: -₹540
│   │   ├─ TransactionRow: Swiggy Instamart · Groceries · UPI · -₹320
│   │   ├─ TransactionRow: Chai Point · Food & Drinks · Cash · -₹80
│   │   └─ TransactionRow: Auto Rickshaw · Transport · UPI · -₹140
│   ├─ DayGroup: YESTERDAY (23 OCT) · Net: +₹14,650
│   │   ├─ TransactionRow: Consulting Retainer · Income NEFT · +₹15,000 ← Income badge
│   │   └─ TransactionRow: Apollo Pharmacy · Healthcare · Card · -₹350
│   └─ DayGroup: 21 OCT 2024 · Monday · Day: -₹1,299
│       ├─ TransactionRow: Netflix · Subscriptions · Card · -₹649 ← sync icon (recurring)
│       └─ TransactionRow: Reliance Fresh · Groceries · UPI · -₹650
├─ GestureMicroHint ("Tap transaction to inspect or edit details")
└─ TransactionDetailSheet (bottom sheet modal, hidden by default)
    ├─ DragHandle + SheetHeader + CloseButton
    ├─ HeroMerchantPanel (icon + name + amount in display-currency-mobile + date)
    ├─ MetadataGrid (Category | Payment Mode)
    └─ ActionRow (DeleteButton error-container | EditButton primary-container)
BottomNav + ToastPill
```

### 9.4 Spending Insights

```
AppBar (tab variant) → StatusBar + OfflineBadge
├─ TimeframeChips (Weekly | Monthly (Oct) ← active | Yearly | Custom Range)
├─ CashFlowCard ("54% Saved" badge · Inflow ₹78,000 / Burn ₹35,650 · StackedProgressBar)
├─ WeeklyTrendCard
│   ├─ SVGBarChart (Wk1 ₹8.2k | Wk2 ₹11.4k Peak | Wk3 ₹7.9k | Wk4 ₹8.1k)
│   └─ InsightNote (peak reason)
├─ BudgetWarningCard (Dining & Food Alert · 90% of ₹15,000 · Caution badge)
├─ CategoryBreakdownCard
│   ├─ DonutChart (SVG, 6 segments)
│   └─ RankedCategoryList (Food 38% | Rent 28% | Groceries 13.5% | Transport 10% | Shopping 7% | Bills 3.5%)
├─ KeyInsightsSection
│   ├─ InsightCard: "Delivery Spike" (lightbulb)
│   ├─ InsightCard: "UPI Dominance" (bolt)
│   ├─ InsightCard: "Largest Single Outflow" (emoji_events)
│   └─ InsightCard: "Daily Run Rate" (today)
└─ PrivacyFooterBanner ("Analytics calculated strictly on-device…")
BottomNav
```

### 9.5 App Settings

```
AppBar (tab variant) → StatusBar + OfflineBadge
├─ ProfileSummaryCard (avatar + name + vault label + 1.2MB storage + edit button + Switch/New Profile)
├─ PrivacyBanner ("100% Offline & Private · Zero Trackers · No Cloud Sync")
├─ PreferencesSection
│   └─ SettingsCard: Currency | Default Payment | ThemeSelector (Light/Dark/System) | Category Mgmt
├─ SecuritySection
│   └─ SettingsCard: Profile Password toggle | Auto-Lock | Biometric toggle
├─ DataSection
│   └─ DataCard: LastBackupInfo | ExportEncryptedJSON | Export CSV | Restore Backup
├─ DangerZoneSection (error label · ClearAllButton)
├─ BuildFooter ("Expense Tracker v1.2.0 PWA · Vite • Dexie.js • React Local")
└─ DangerConfirmModal (bottom-sheet, error icon, confirm/cancel buttons)
BottomNav + ToastPill
```

---

## 10. Shared Components

| Component | Key Classes / Notes |
|---|---|
| `StatusBar` | `px-gutter pt-space-xs pb-1 flex items-center justify-between` |
| `OfflineBadge` | `rounded-full bg-primary/10 text-primary border border-primary/20` + `animate-pulse` dot |
| `AppBar` | `fixed top-0 w-full z-50 h-16 px-gutter bg-surface/85 backdrop-blur-xl` |
| `BottomNav` | `fixed bottom-0 w-full z-50 h-20 pb-safe bg-surface/90 backdrop-blur-xl` |
| `FAB` | `w-14 h-14 rounded-full bg-primary-container text-on-primary -top-3 ring-4 ring-surface` |
| `TransactionRow` | `flex items-center justify-between p-3.5 rounded-xl hover:bg-surface-container-low` |
| `CategoryIconCircle` | `w-11 h-11 rounded-full flex items-center justify-center` (44×44 dp) |
| `AmountDisplay` | `font-numeral-dense text-error` (debit) / `text-secondary font-bold` (credit) |
| `Divider` | `h-[1px] bg-surface-container-high/60 mx-3.5` |
| `BottomSheet` | `fixed inset-0 z-50 bg-black/40 backdrop-blur-sm` + inner `rounded-t-xl` |
| `DragHandle` | `w-12 h-1.5 rounded-full bg-on-surface/20 mx-auto` |
| `ToastPill` | `fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-inverse-surface text-inverse-on-surface` |
| `SectionLabel` | `font-label-sm uppercase tracking-wider text-primary font-bold` |
| `SettingsRow` | `w-full flex items-center justify-between p-space-md hover:bg-surface-container-low rounded-lg` |
| `ToggleSwitch` | `w-12 h-7 rounded-full peer-checked:bg-primary-container` |
| `SegmentedControl` | `bg-surface-container-high p-1 rounded-full flex` + inner `rounded-full` active button |
| `FilterChip` | `flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-surface-container-high` |
| `CategoryTile` | `flex flex-col items-center p-2.5 rounded-2xl` active: `bg-primary-container text-on-primary` |
| `PaymentChip` | `px-3.5 py-2 rounded-full` active: `bg-primary-container text-on-primary` |
| `DonutChart` | Inline SVG with stacked `<circle>` stroke-dasharray segments, `-rotate-90` |
| `BarChart` | Inline SVG with `<rect>` bars, gradient fills, dotted average line |
| `ProgressBar` | `w-full h-{size} rounded-full bg-surface-container overflow-hidden` + fill div |
| `StatCard` | `rounded-2xl bg-surface-container-lowest p-3.5 shadow-sm min-h-[92px]` |
| `InsightCard` | `rounded-lg p-space-sm shadow-sm flex items-start gap-space-sm` |
| `HeroFinancialCard` | `rounded-lg bg-gradient-to-br from-primary-container via-primary to-[#004741]` |

---

## 11. Category System

| Label | Icon (Material Symbols) | Color Accent |
|---|---|---|
| Dining / Food & Drinks | `restaurant` | tertiary-fixed (#ffddb8) bg |
| Groceries | `local_grocery_store` / `shopping_cart` | secondary-container bg |
| Transport / Transit | `directions_subway` / `local_taxi` | primary/10 bg |
| Shopping & Leisure | `shopping_bag` / `local_mall` | surface-container-high bg |
| Bills & Utilities | `receipt_long` / `receipt` | surface-container-high bg |
| Entertainment | `movie` / `subscriptions` | surface-container-highest bg |
| Healthcare | `medical_services` / `medication` | error-container/40 bg |
| Rent & Housing | `home` | secondary/10 bg |
| Income / Freelance | `payments` / `trending_up` | secondary-container bg |
| Subscriptions | `subscriptions` + `sync` icon (recurring) | surface-container-highest bg |

---

## 12. Payment Methods

| Label | Icon | Display in row |
|---|---|---|
| UPI / QR | `qr_code_scanner` / `qr_code_2` | "UPI (GPay)" / "Paytm" / "PhonePe" |
| Cash | `payments` / `local_atm` | "Cash" |
| Debit Card | `credit_card` | "HDFC Debit" |
| Credit Card | `contactless` | "Card" |
| Bank Transfer / NEFT | `account_balance` | "NEFT Transfer" |

---

## 13. Missing / Inconsistent Screens

| Issue | Severity | Notes |
|---|---|---|
| **No empty state** for Transaction History | Medium | When 0 transactions exist, nothing is designed |
| **No onboarding / first-launch** screen | Medium | No welcome, no initial profile creation flow |
| **No Category Management** sub-screen | Medium | Referenced in Settings ("14 Active Categories") but no screen exists |
| **No Transaction Edit** screen | High | Detail bottom sheet has "Edit Note" button but no edit form is designed |
| **No Budget Setup** screen | Medium | Budget limit (₹50,000) referenced but no creation UI designed |
| **No Profile PIN** entry screen | Low | PIN toggle in Settings but no PIN pad screen |
| **Duplicate screen instances** | Low | 3 rows of screens; row-1 and row-2 are earlier drafts; implement row-3 only |
| **Add Transaction is a full page** (not bottom sheet) | Design note | Stitch HTML is a full scrollable page; designMd spec describes a bottom sheet. **Implement as full `/add` route.** |
| **No dark mode screens** designed | Low | Only light mode; dark mode tokens exist but no dark screens |
| **No error/loading/skeleton states** | Low | No spinners, skeletons, or error banners designed |
| **No search results empty state** | Low | Search exists in History but no "no results" state shown |

---

## 14. Navigation Patterns

| Pattern | Used In | Notes |
|---|---|---|
| **Tab navigation** | Home, History, Insights, Settings | Fixed bottom bar, `mobile_tab` shell type |
| **Stack navigation (push)** | Add Transaction | `mobile_stack` shell type, back arrow in app bar |
| **Bottom sheet (overlay)** | Transaction Detail, Danger Confirm | `fixed inset-0` modal with slide-in animation |
| **Scroll within screen** | All screens | Full-page content scroll behind fixed header + nav |
| **Month picker pill** | Home Dashboard | Inline dropdown trigger (design pending) |
| **Horizontal chip scroll** | History filter chips, Insights timeframe, Add payment chips | `overflow-x-auto no-scrollbar -mx-gutter px-gutter` pattern |

---

## 15. Proposed React Component Structure

```
src/
├── main.jsx
├── App.jsx                        # Router setup + PWA install prompt
│
├── components/                    # Shared / atomic components
│   ├── layout/
│   │   ├── AppBar.jsx             # Fixed top app bar (tab + stack variants via prop)
│   │   ├── BottomNav.jsx          # Fixed bottom tab bar + FAB
│   │   ├── StatusBar.jsx          # Time + OfflineBadge + system icons
│   │   └── PageShell.jsx          # Wraps main scroll area with correct padding
│   │
│   ├── ui/
│   │   ├── OfflineBadge.jsx       # Pulsing "Offline • Local Only" pill
│   │   ├── CurrencyAmount.jsx     # Formats ₹ amounts with tabular-nums + sign coloring
│   │   ├── DonutChart.jsx         # Reusable SVG ring chart
│   │   ├── BarChart.jsx           # Reusable SVG bar chart (weekly trend)
│   │   ├── ProgressBar.jsx        # Budget/category progress bar
│   │   ├── StatCard.jsx           # 92dp min-height metric card
│   │   ├── TransactionRow.jsx     # Single list item (icon + merchant + meta + amount)
│   │   ├── CategoryIconCircle.jsx # 44×44 icon container with category color
│   │   ├── InsightCard.jsx        # Bento insight item
│   │   ├── SectionLabel.jsx       # Uppercase tracking primary label
│   │   ├── SettingsRow.jsx        # Settings list row with icon + text + chevron/toggle
│   │   ├── ToggleSwitch.jsx       # iOS-style CSS checkbox toggle
│   │   ├── SegmentedControl.jsx   # Multi-option pill switcher
│   │   ├── FilterChip.jsx         # Scrollable filter pill
│   │   ├── CategoryTile.jsx       # 4-col grid tile for AddTransaction
│   │   ├── PaymentChip.jsx        # Horizontal payment mode chip
│   │   ├── ToastPill.jsx          # Snackbar notification
│   │   ├── BottomSheet.jsx        # Overlay modal wrapper
│   │   └── DragHandle.jsx         # Sheet drag indicator
│   │
│   └── dashboard/
│       ├── HeroFinancialCard.jsx  # Gradient balance card with income/expense grid
│       ├── QuickStatsGrid.jsx     # 2×2 stat cards
│       ├── BudgetProgressCard.jsx # Monthly budget bar + threshold marker
│       ├── SpendingBreakdownCard.jsx  # Donut chart + legend
│       └── RecentActivitySection.jsx  # Section header + TransactionListCard
│
├── screens/                       # Route-level page components
│   ├── Dashboard.jsx              # /
│   ├── AddTransaction.jsx         # /add
│   ├── TransactionHistory.jsx     # /history
│   ├── SpendingInsights.jsx       # /insights
│   └── Settings.jsx               # /settings
│
├── sheets/                        # Bottom sheet overlays
│   ├── TransactionDetailSheet.jsx # View + Edit + Delete for a transaction
│   └── DangerConfirmSheet.jsx     # Confirm clear all data
│
├── hooks/
│   ├── useTransactions.js         # Dexie queries for transaction CRUD
│   ├── useCategories.js           # Category list from Dexie
│   ├── useBudget.js               # Budget limits from Dexie
│   ├── useMonthFilter.js          # Active month state shared across screens
│   └── useOfflineStatus.js        # navigator.onLine + service worker status
│
├── db/
│   ├── db.js                      # Dexie instance + schema definition
│   └── seed.js                    # Optional dev seed data
│
├── utils/
│   ├── currency.js                # formatINR(), parseCurrency(), Indian lakh notation
│   ├── date.js                    # formatDate(), groupByDay(), isToday(), isYesterday()
│   ├── categories.js              # Category definitions (name, icon, color tokens)
│   └── export.js                  # CSV + JSON export utilities
│
└── pwa/
    ├── sw.js                      # Service worker (Workbox or manual)
    └── manifest.json              # PWA manifest
```

### Key State Architecture

```
App state (no global store — keep it simple):
  ├─ MonthContext            → active month/year filter (shared: Dashboard, History, Insights)
  ├─ ProfileContext          → active profile ID (single profile MVP)
  └─ local component state   → search query, selected category, sheet open/close
```

### Tailwind Config Mapping

The Stitch Tailwind config maps **1:1** to your project's `tailwind.config.js`. Copy the `colors`, `borderRadius`, `spacing`, and `fontSize` extensions verbatim from the Stitch-generated HTML.

---

## 16. Implementation Priority Order

```
Phase 1 — Foundation
  1. Tailwind config (all design tokens from Section 2–5)
  2. Dexie schema (transactions, categories, budgets, profiles)
  3. AppBar + BottomNav + PageShell + StatusBar + OfflineBadge

Phase 2 — Core Flow (MVP)
  4. AddTransaction screen (amount + category + payment + save to Dexie)
  5. TransactionHistory screen (grouped list + search + type filters)
  6. TransactionDetailSheet (view + delete)

Phase 3 — Dashboard
  7. HeroFinancialCard (live Dexie aggregation)
  8. QuickStatsGrid
  9. BudgetProgressCard
  10. SpendingBreakdownCard (DonutChart)
  11. RecentActivitySection

Phase 4 — Insights + Settings
  12. SpendingInsights (BarChart + CategoryBreakdown + InsightCards)
  13. Settings (profile card, security toggles, export/import)

Phase 5 — PWA
  14. Service worker + offline caching
  15. Web App Manifest
  16. Install prompt
```
