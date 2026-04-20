# POSMaster V3 System Audit and Issue Report

Date: 2026-04-20
Scope: `/Users/kkwenuja/development/Revo-infosurv/posMasterV3/posMasterV3`
Method: static code review, architecture tracing, `npm run build`, `npm run lint`

## 1. System Understanding

POSMaster V3 is an Electron desktop POS application with a React renderer and a local SQLite-first backend. The app is designed to work primarily offline on a machine or branch, then optionally synchronize to a cloud/MySQL layer.

### High-level architecture

1. Electron main process
   - Entry point: `electron.cjs`
   - Responsibilities:
     - create the desktop window
     - expose IPC handlers
     - manage auto-update flow
     - handle printing
     - initialize backend services

2. Preload bridge
   - Entry point: `preload.cjs`
   - Responsibilities:
     - expose renderer-safe APIs through `window.electronAPI`
     - proxy auth, inventory, sales, settings, sync, reporting, and branch context actions

3. React renderer
   - Entry point: `src/main.jsx`
   - App shell and routing: `src/App.jsx`
   - Responsibilities:
     - login and protected routing
     - inventory, sales, users, notifications, and settings UI
     - local session state and feature navigation

4. Local backend
   - Entry point: `src/backend/backend.cjs`
   - Responsibilities:
     - initialize SQLite
     - run migrations
     - register IPC controllers
     - run branch-context and sync services

5. Data layer
   - Database: SQLite via `better-sqlite3`
   - Migrations: `src/backend/database/migrations/*`
   - Repositories/services/controllers:
     - controllers = IPC layer
     - services = business logic
     - repositories = SQL/data access

### Main business modules found in code

1. Authentication and session management
   - Login, logout, session validation, current user lookup
   - Files: `src/frontend/pages/Login.jsx`, `src/frontend/api/services/localAuth.js`, `src/backend/controllers/AuthController.cjs`

2. Inventory
   - Item master data, categories, UOM, suppliers, stock, restock, disposal, pricing, reporting
   - Files: `src/frontend/pages/inventory/*`, backend inventory controllers/services/repositories

3. Sales
   - Billing, held orders, transaction history, payment methods, members, returns
   - Files: `src/frontend/pages/sales/*`, `src/backend/controllers/SalesController.cjs`

4. Users and permissions
   - User CRUD, roles, settings, permissions
   - Files: `src/frontend/pages/users/*`, `src/backend/controllers/UserController.cjs`, `SettingsController.cjs`

5. Sync and branch context
   - Cloud sync, real-time sync, active session sync, current branch enforcement
   - Files: `src/backend/services/CloudSyncService.cjs`, `RealTimeSyncService.cjs`, `BranchContextService.cjs`

### Architectural observations

1. The app is functionally rich, but the frontend boundary is weak.
   - `preload.cjs` exposes a very large API surface.
   - `src/frontend/api/localApi.js` is a 2,500+ line wrapper layer.

2. Some modules are too large for safe maintenance.
   - `src/frontend/pages/inventory/InventoryRestock.jsx`: 2408 lines
   - `src/frontend/pages/sales/SalesView.jsx`: 1108 lines
   - `preload.cjs`: 833 lines
   - `src/frontend/api/localApi.js`: 2515 lines

3. The backend layering is better than the frontend layering.
   - Backend has clear controller/service/repository separation.
   - Frontend has duplicated patterns, mixed state storage, and some direct UI/business coupling.

## 2. Verification Summary

### Build

`npm run build` passes.

Notable warnings from the build:

1. Large production chunk
   - Main JS output is about 3.28 MB before gzip warning thresholds.
   - This points to weak code splitting and a heavy renderer bundle.

2. Ineffective dynamic imports
   - `src/App.jsx` dynamically imports modules that are also statically imported elsewhere, so chunk splitting does not actually improve.

### Lint

`npm run lint` fails badly.

Observed result:

1. 913 total problems
2. 885 errors
3. 28 warnings

Important detail:

1. ESLint is scanning generated files because only `dist` is ignored, while `dist-react` is not ignored.
2. Even after excluding generated output, there are still many real source-level failures including hook-rule violations, undefined functions, and numerous unused or unstable patterns.

## 3. Confirmed Issues and Bugs

Severity legend:

- Critical: likely runtime failure or high operational risk
- High: broken feature, invalid behavior, or major maintainability blocker
- Medium: incorrect fallback, weak boundary, or likely defect source
- Low: quality/process issue that should still be fixed

### Critical

#### 1. Conditional React hooks in both ViewItemModal implementations

- Files:
  - `src/frontend/pages/inventory/modals/ViewItemModal.jsx:9-17`
  - `src/frontend/pages/sales/modals/ViewItemModal.jsx:9-17`
- Evidence:
  - Both components return early on `if (!isOpen) return null;` before `useState` and `useEffect`.
- Why this is a bug:
  - This violates React hook ordering rules and can cause unstable rendering behavior when the modal opens/closes.
- Impact:
  - Runtime instability in inventory and sales item-detail modal flows.

#### 2. Inventory report print path calls an undefined function

- File: `src/frontend/pages/inventory/InventoryReport.jsx:551-563`
- Evidence:
  - The print button calls `generatePettyCashReportPdf()` for `reportType === "petty-cash"`.
  - Lint also reports `generatePettyCashReportPdf is not defined`.
- Why this is a bug:
  - Selecting that report path will throw at runtime instead of printing.
- Impact:
  - Broken reporting action from the inventory reporting UI.

### High

#### 3. Session state is inconsistent between `sessionStorage` and `localStorage`

- Files:
  - `src/App.jsx:35-37`
  - `src/App.jsx:120-150`
  - `src/frontend/api/services/localAuth.js:105-182`
  - `src/frontend/pages/Login.jsx:99-123`
- Evidence:
  - `PrivateRoute` accepts either `sessionStorage` or `localStorage` token.
  - `localAuth` uses `sessionStorage` as the primary token store.
  - `App.jsx` unload and request-user-data paths read token from `localStorage`.
  - `Login.jsx` writes the token to `sessionStorage`, not `localStorage`.
- Why this is a bug:
  - Different parts of the app disagree on where the authoritative token lives.
  - Logout/restart/close flows can read stale or missing auth data.
- Impact:
  - Session restore and logout behavior can be inconsistent across app close, restart, and route protection.

#### 4. Lint pipeline is not trustworthy because generated output is being linted

- Files:
  - `eslint.config.js:6-8`
  - `package.json:13-20`
- Evidence:
  - Lint config ignores only `dist`.
  - The lint run reports hundreds of errors from `dist-react/assets/index-*.js`.
- Why this is a bug:
  - CI/local quality checks become noisy and stop highlighting real source problems clearly.
- Impact:
  - Developers cannot use lint reliably as a gate.
  - Real issues become harder to prioritize.

#### 5. Backend enables cloud sync by default when settings lookup fails

- File: `src/backend/backend.cjs:92-129`
- Evidence:
  - If settings resolution throws, the catch block logs `initializing by default` and starts both cloud sync and real-time sync.
- Why this is a bug:
  - Failure to read a setting should fail closed, not fail open into sync behavior.
  - For a POS app, accidental sync activation is the wrong operational default.
- Impact:
  - Unexpected network activity, sync side effects, or data divergence during degraded startup conditions.

#### 6. Preload bridge exposes a very broad generic IPC surface

- File: `preload.cjs:27-33`
- Evidence:
  - `send`, `invoke`, and `receive` are exposed generically in addition to specific typed APIs.
- Why this is an issue:
  - This weakens the safety value of the preload boundary because renderer code can call arbitrary channels rather than a constrained contract.
- Impact:
  - Harder to audit IPC usage.
  - Higher security and maintainability risk in an Electron app.

### Medium

#### 7. Build output indicates ineffective code splitting

- Files:
  - `src/App.jsx:56-57`
  - Build output from `npm run build`
- Evidence:
  - Vite warns that `localAuth.js` and `localApi.js` are both dynamically and statically imported, so they stay in the same chunk.
  - Main bundle still exceeds the size warning threshold.
- Why this is an issue:
  - The app pays complexity cost for dynamic imports without receiving the expected bundle-size benefit.
- Impact:
  - Slower renderer startup and harder performance tuning.

#### 8. Oversized frontend modules increase bug density and reduce reviewability

- Files:
  - `src/frontend/api/localApi.js`
  - `src/frontend/pages/inventory/InventoryRestock.jsx`
  - `src/frontend/pages/sales/SalesView.jsx`
  - `preload.cjs`
- Evidence:
  - These files are all 800 to 2500+ lines long.
- Why this is an issue:
  - Large files mix multiple responsibilities and make regression-safe edits harder.
- Impact:
  - Higher change risk, slower onboarding, more duplicated logic.

#### 9. README does not describe the actual product

- File: `README.md`
- Evidence:
  - The file still contains the default Vite template text.
- Why this is an issue:
  - Repo-level understanding depends on source spelunking instead of a maintained system entry document.
- Impact:
  - Slower onboarding and weaker release/maintenance discipline.

### Low

#### 10. Build scripts contain duplicated `dev:dev:*` entries

- File: `package.json:8-12`
- Evidence:
  - Both `dev:electron` and `dev:dev:electron` exist, as well as `dev:all` and `dev:dev:all`.
- Why this is an issue:
  - Script sprawl usually signals drift and raises the chance of stale commands surviving.
- Impact:
  - Low direct runtime impact, but avoidable confusion.

## 4. Source-Level Quality Issues Worth Fixing Next

These were confirmed by lint and should be treated as real cleanup work, though not all were manually traced to runtime breakage in this pass.

1. Additional hook dependency problems across reporting, checkout, transaction-detail, and store hooks.
2. Many unused variables/imports across inventory, sales, settings, and users modules.
3. Additional conditional hook violations in:
   - `src/frontend/pages/sales/modals/MemEvaluation.jsx`
4. Multiple files exporting mixed component/non-component content, reducing fast-refresh stability.
5. Large amounts of dead or partially wired reporting code in inventory reporting.

## 5. Recommended Fix Order

### Phase 1: Runtime correctness

1. Fix both `ViewItemModal` components so hooks are always called before any early return.
2. Fix or remove the `petty-cash` print action in `InventoryReport.jsx`.
3. Standardize auth/session storage to one source of truth for tokens and current user.

### Phase 2: Tooling and safety

1. Update ESLint ignores to exclude generated folders such as `dist-react`.
2. Remove or tightly restrict generic preload IPC methods.
3. Change backend sync startup to fail closed when settings lookup fails.

### Phase 3: Structural maintainability

1. Split `localApi.js` into module-specific API files.
2. Split `InventoryRestock.jsx` and `SalesView.jsx` into screen sections plus hooks/services.
3. Replace ineffective dynamic imports with real route- or feature-level code splitting.
4. Replace the Vite template README with a real system README.

## 6. Final Assessment

The system is functionally substantial and the backend structure is directionally solid, but the renderer and integration edges need cleanup. The app currently builds, but it is carrying confirmed runtime defects, broken quality gates, and several maintainability risks that will continue to slow delivery unless the boundary and state-management issues are addressed first.
