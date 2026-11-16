# EXPENSIFY LOCAL — ANDROID STAGING DEPLOYMENT GUIDE

**Project:** Expensify Local (Android-First 100% Offline Personal Expense Tracker)  
**Target Environment:** GitHub Pages (Staging Deployment for Physical Android PWA Testing)  
**Date:** November 16, 2026  
**Status:** READY FOR STAGING DEPLOYMENT  

---

## 1. Code & Configuration Changes Summary

To prepare the application for a reliable Android PWA staging deployment on GitHub Pages, the following enhancements and audits were implemented:

1. **Vite Dynamic Base Configuration ([`vite.config.js`](file:///c:/Users/Mohammed%20Jaffar/OneDrive/Desktop/Timepass/expensify-local/vite.config.js)):**
   - Configured dynamic base path resolution supporting:
     - `process.env.BASE_PATH` (explicit override)
     - `process.env.GITHUB_REPOSITORY` (automatically provided in GitHub Actions as `owner/repo`, resolving to `/${repo}/`)
     - Sensible default `'/expensify-local/'` matching the project repository name.
   - Automatically handles root custom user pages ending in `.github.io` (resolving to `/`).
   - Synced manifest `start_url` and `scope` dynamically to the base path to ensure scoped WebAPK generation on Android.

2. **Android High-Resolution PWA Icons ([`public/`](file:///c:/Users/Mohammed%20Jaffar/OneDrive/Desktop/Timepass/expensify-local/public)):**
   - Generated high-resolution Android-compliant PNG icons matching the Stitch design system (Brand Primary `#0f766e`, Dark Circle `#005c55`, White Rupee `₹` glyph):
     - `icon-192x192.png` (Standard 192×192 PNG icon for Android home screen and App Drawer)
     - `icon-512x512.png` (Standard 512×512 PNG splash and install icon)
     - `icon-maskable-512x512.png` (Adaptive maskable 512×512 icon with full-bleed background for Android 8+ circles/squircles)
     - `icon.svg` (Scalable vector icon)
   - Updated `index.html` with `<link rel="apple-touch-icon" href="icon-192x192.png" />` and `<link rel="icon" type="image/png" sizes="192x192" href="icon-192x192.png" />`.

3. **Data Security & Git Privacy Protection ([`.gitignore`](file:///c:/Users/Mohammed%20Jaffar/OneDrive/Desktop/Timepass/expensify-local/.gitignore)):**
   - Created comprehensive `.gitignore` preventing accidental commits of:
     - `node_modules/`, `dist/`
     - Environment variables and keys (`.env`, `*.key`, `*.pem`)
     - Database dumps, backups, and user transactions (`*.enc`, `*.backup`, `*.csv`, `*.db`, `backups/`)
     - Temporary scratch and log files.

4. **Automated GitHub Actions Deployment Workflow ([`.github/workflows/deploy.yml`](file:///c:/Users/Mohammed%20Jaffar/OneDrive/Desktop/Timepass/expensify-local/.github/workflows/deploy.yml)):**
   - Fully automated CI/CD pipeline using official GitHub Pages actions (`actions/deploy-pages@v4`, `actions/upload-pages-artifact@v3`).
   - Runs `npm ci`, executes the 141-test verification suite, compiles the production build, runs the static PWA deployment audit, and publishes `dist/` directly to GitHub Pages.

5. **Static Deployment & PWA Manifest Audit Script ([`scripts/audit-deployment.mjs`](file:///c:/Users/Mohammed%20Jaffar/OneDrive/Desktop/Timepass/expensify-local/scripts/audit-deployment.mjs)):**
   - Validates all generated assets, manifest entries, scopes, icon sizes, and Service Worker registration files before deployment.

---

## 2. GitHub Repository Setup Instructions

Because no remote GitHub repository is connected yet, follow these simple steps to push the project to your GitHub account:

### Step 1: Create a New GitHub Repository
1. Log in to [GitHub](https://github.com/) in your web browser.
2. In the top-right corner, click **+** and select **New repository**.
3. Repository settings:
   - **Repository name:** `expensify-local` *(recommended to match the default base path)*
   - **Description:** `100% offline personal expense tracker (Android PWA)`
   - **Visibility:** **Public** *(required for free GitHub Pages)* or **Private** *(if using GitHub Pro/Team)*
   - **Initialize with README / .gitignore / license:** **Leave UNCHECKED** *(we already have them)*
4. Click **Create repository**.

### Step 2: Initialize Git and Push from Your Terminal
Open PowerShell or your command prompt in the `expensify-local` directory and run:

```powershell
# Navigate into the project folder
cd "C:\Users\Mohammed Jaffar\OneDrive\Desktop\Timepass\expensify-local"

# Initialize git repository
git init -b main

# Stage all project files (our .gitignore strictly protects private data)
git add .

# Create initial commit
git commit -m "feat: initial staging release for Expensify Local Android PWA"

# Link to your new GitHub repository (replace <YOUR_USERNAME> with your GitHub handle)
git remote add origin https://github.com/<YOUR_USERNAME>/expensify-local.git

# Push to GitHub main branch
git push -u origin main
```

---

## 3. GitHub Pages Configuration Instructions

Once your code is pushed, enable GitHub Pages to deploy using GitHub Actions:

1. In your GitHub repository, click on the **Settings** tab.
2. In the left navigation menu, under the **Code and automation** section, click **Pages**.
3. Under **Build and deployment**:
   - **Source:** Change from *Deploy from a branch* to **GitHub Actions**.
4. That's it! The `.github/workflows/deploy.yml` workflow will automatically trigger on your push.
5. You can view the build and deployment progress in real-time under the **Actions** tab of your repository.

---

## 4. Deployment URL

Once the GitHub Actions workflow finishes (typically takes ~45 seconds), your application will be live at:

$$\mathbf{https://<YOUR\_USERNAME>.github.io/expensify-local/}$$

*(Example: If your GitHub handle is `MohammedJaffar`, the URL is `https://mohammedjaffar.github.io/expensify-local/`)*

> [!NOTE]
> Because the application uses `HashRouter`, deep links (e.g. `https://<YOUR_USERNAME>.github.io/expensify-local/#/history` or `/#/insights`) reload seamlessly without HTTP 404 errors.

---

## 5. Android Installation Steps

Once deployed, follow these steps to install Expensify Local on your physical Android device:

1. **Open in Chrome for Android:**
   - Launch Google Chrome on your Android phone.
   - Navigate to `https://<YOUR_USERNAME>.github.io/expensify-local/`.
2. **Trigger Native WebAPK Installation:**
   - An install banner may automatically slide up at the bottom: tap **"Install"**.
   - If not automatically prompted, tap Chrome's three-dot menu (**⋮**) in the top-right corner.
   - Tap **"Install app"** or **"Add to Home screen"**.
   - In the confirmation dialog showing the Expensify icon, tap **"Install"**.
3. **Launch the Native PWA:**
   - Open your Android App Drawer or Home Screen.
   - Look for the teal **Expensify** icon with the white Rupee glyph.
   - Tap to launch. The app will launch in standalone fullscreen mode without Chrome browser toolbars.

---

## 6. Five Physical Android Acceptance Tests

Execute the following 5 tests on your physical Android phone to verify device readiness:

### Acceptance Test 1: WebAPK & Standalone Mode Launch
- **Action:** Tap the installed Expensify app icon on your home screen.
- **Pass Criteria:**
  - The app opens with the native splash screen displaying the teal icon and background.
  - The browser URL bar and bottom navigation controls from Chrome are completely absent.
  - The app displays in portrait orientation matching a native Android application.

### Acceptance Test 2: Status Bar, Notch & Gesture Pill Safe Areas
- **Action:** Inspect the top app bar and the bottom navigation bar on screens with a display cutout/punch hole and gesture navigation enabled.
- **Pass Criteria:**
  - Content does not clip beneath the camera notch or status bar clock/battery icons (`pt-safe`).
  - The bottom navigation bar has adequate breathing room above the Android system gesture bar pill (`pb-safe`).
  - Scrolling through transaction lists does not jump under Android overscroll.

### Acceptance Test 3: 100% Offline Cold Launch (Airplane Mode)
- **Action:**
  1. Open the app while connected to the internet to ensure the Service Worker is activated.
  2. Enable **Airplane Mode** in Android Quick Settings (disable Wi-Fi and Cellular).
  3. Force close Expensify from the Android Recent Apps / Multitasking switcher.
  4. Tap the Expensify icon to launch cold while strictly offline.
- **Pass Criteria:**
  - The application opens immediately from cache without any "No internet connection" or dinosaur error.
  - Icons and Inter fonts render crisp and clear.
  - Existing transactions and categories load from IndexedDB.

### Acceptance Test 4: Hardware & Gesture Back Button Handling
- **Action:**
  1. From Dashboard, tap the bottom **Insights** tab (`/#/insights`).
  2. Tap the central floating **Add (+)** button (`/#/add`).
  3. Perform the Android system back gesture (swipe inward from either side of the screen) or press the hardware Back button.
- **Pass Criteria:**
  - The app returns to the Insights screen (`/#/insights`) rather than minimizing or closing the application.

### Acceptance Test 5: Soft Keyboard Behavior & Local Persistence
- **Action:**
  1. On the **Add Transaction** screen, tap into the **Amount** field.
  2. Type `450.50`, select a category, and tap **"Save Expense"**.
  3. Close the app, restart the phone or clear browser cache (do NOT clear site data).
  4. Re-open Expensify.
- **Pass Criteria:**
  - Tapping the Amount field opens the Android numeric decimal keypad (`inputMode="decimal"`).
  - The bottom keypad does not obscure or push critical buttons out of view.
  - The saved transaction is immediately visible on the Dashboard and History after relaunch.

---

## 7. Troubleshooting Instructions

| Symptom | Probable Cause | Recommended Fix |
| :--- | :--- | :--- |
| **White screen on load** | Incorrect base path or repository name mismatch | Check repository name. If repo is `my-app`, base path must be `/my-app/`. Re-trigger workflow or verify repository settings. |
| **"Install App" option missing in Chrome** | Service worker not registered or HTTPS not active | Ensure you are accessing via `https://` (GitHub Pages enforces this). Check that Chrome is up to date. |
| **Offline launch fails after first install** | App was closed before initial service worker precaching finished | Keep the app open for ~5 seconds on first online launch to allow Workbox to precache all static assets. |
| **GitHub Actions workflow fails on `npm ci`** | Outdated or mismatched `package-lock.json` | Run `npm install` locally, commit the updated `package-lock.json`, and push to GitHub. |
| **Font looks generic (fallback) offline** | Google Fonts not precached before going offline | Normal on very first offline cold run if fonts were never accessed online. After 1 online load, fonts remain cached for 1 year via Workbox `CacheFirst`. |

---

## 8. Automated Test & Build Verification Results

### 8.1 Core Automated Verification Suite
**Command:** `npm test` (`node tests/verification.test.mjs`)  
**Result:** **141 PASSED, 0 FAILED** (100% Pass Rate)

- Group 1: Currency Math & Paise Arithmetic (27 tests) — **PASS**
- Group 2: Multi-Profile Isolation in Dexie (12 tests) — **PASS**
- Group 3: PIN Security & Session Locking (6 tests) — **PASS**
- Group 4: Smart Categorization & Word-Boundary Safety (8 tests) — **PASS**
- Group 5: Web Crypto Backup, Completeness & Safe Restore (9 tests) — **PASS**
- Group 6: Recurring Integrity & Unique Index Constraint (17 tests) — **PASS**
- Group 7: Category Management & True ACID Rollback (11 tests) — **PASS**
- Group 8: CSV Sanitization, Signs & Unicode (16 tests) — **PASS**
- Group 9: Budget Management & Integer Math (14 tests) — **PASS**
- Group 10: Advanced Analytics Edge Cases (13 tests) — **PASS**
- Group 11: Populated Profile Restore & Safe Merges (8 tests) — **PASS**

### 8.2 Deployment & PWA Manifest Audit
**Command:** `node scripts/audit-deployment.mjs`  
**Result:** **31 PASSED, 0 FAILED** (100% Pass Rate)

- Dist required asset existence: **PASS**
- Viewport fit cover & theme color meta: **PASS**
- PWA manifest structure, display mode, and orientations: **PASS**
- 192×192 PNG, 512×512 PNG, and 512×512 maskable icon validation: **PASS**
- Service worker registration scoping: **PASS**

### 8.3 Production Build Output
**Command:** `npm run build`  
**Result:** **SUCCESS** in 3.73 seconds

```
dist/registerSW.js                0.17 kB
dist/manifest.webmanifest         0.63 kB
dist/index.html                   1.53 kB │ gzip:   0.65 kB
dist/assets/index-l-8V5sf-.css   34.72 kB │ gzip:   6.61 kB
dist/assets/index-2uPKxQlr.js   456.56 kB │ gzip: 127.97 kB
PWA v0.21.2: precache 14 entries (505.30 KiB)
```

---

## 9. Outstanding Issues & Notes

- **No Remote Git Repository Currently Connected:** As instructed, git push has been paused awaiting your review. The workflow file, `.gitignore`, and scripts are fully prepared. Follow Section 2 above to push to your GitHub account whenever you are ready.
- **Zero Cloud / Backend Footprint:** The application operates 100% client-side in IndexedDB with zero telemetry, cloud databases, external APIs, or account dependencies.
