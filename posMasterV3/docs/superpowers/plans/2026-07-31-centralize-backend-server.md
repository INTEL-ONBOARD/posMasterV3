# Centralize Backend Server — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract the per-till embedded Express server into one internet-facing central server on the on-prem box (37.60.226.84), so every desktop is a thin client with no secrets, and all tills share one Socket.IO hub for true real-time.

**Architecture:** Keep the existing Node/Express + Socket.IO server unchanged in behavior; deploy it once; point every desktop's `OnlineApiClient` / `OnlineRealtimeClient` at it over self-signed HTTPS the app trusts. Port the four desktop-side direct-MongoDB methods to real REST endpoints so tills need no DB access. Remove all secrets from the desktop build.

**Tech Stack:** Node.js 20, Express 5, Socket.IO 4, MongoDB 7 (Atlas), Electron 30, undici (Node fetch), OpenSSL (self-signed CA), systemd or pm2, optional Caddy.

## Global Constraints

- **No offline mode.** Tills require a live connection; on disconnect show the existing `OnlineConnectionOverlay` and auto-reconnect. No local cache/queue.
- **No secrets on the desktop.** The desktop build ships only `POS_ONLINE_API_URL`, `POS_ONLINE_REALTIME_URL`, and the CA cert to trust. `MONGODB_URI`, `JWT_SECRET`, `TEA_COOP_*` live only on the server.
- **MongoDB is reachable only from the central server.** Atlas IP allowlist contains the server, never tills.
- **Same database, same org.** One `POSmaster` database, `POS_ORG_ID=default-org`. No schema or business-logic changes.
- **Server:** `37.60.226.84`, port `4100` (unless changed), self-signed TLS with a long-lived internal CA.
- **Repo has no unit-test framework.** Each task is verified by integration checks (start server, curl/node against it, assert output). Do not introduce jest/pytest.
- **Do not touch the uncommitted refactor** already staged in the working tree; commit only files this plan names.

---

## File Structure

**Server (modified/created):**
- `src/online-server/config.cjs` — reject the placeholder JWT_SECRET; tighten CORS default; add TLS cert paths.
- `src/online-server/services/salesService.cjs` — add `getSalesSummary`, `getSalesDaily`.
- `src/online-server/services/authService.cjs` — add `listActiveSessions`, `countActiveSessions`.
- `src/online-server/routes/reports.cjs` *(new)* — `GET /api/sales/summary`, `/api/sales/daily`, `/api/sessions/active`, `/api/sessions/active/count`.
- `src/online-server/app.cjs` — mount the reports router.
- `src/online-server/routes/auth.cjs` — extend rate limiting to write routes.
- `src/online-server/runtime.cjs` — serve HTTPS when TLS cert paths are configured.

**Desktop (modified):**
- `src/backend/online/OnlineApiClient.cjs` — add client methods for the four new endpoints; trust the CA via an undici dispatcher.
- `src/backend/online/OnlineRealtimeClient.cjs` — trust the CA in the socket.io-client.
- `src/backend/services/OnlineModeService.cjs` — replace the four direct-Mongo methods with API calls.
- `electron.cjs` — skip embedding the server when a remote URL is configured; set the CA for TLS.
- `scripts/write-online-runtime-config.cjs` — write only URL/realtime/CA to the desktop config; no secrets.
- `.github/workflows/release.yml` — stop injecting server secrets into the desktop build.

**Server box (infra, not in repo):**
- `/opt/posmaster/.env.online` — real secrets + strong JWT + TLS paths.
- `/opt/posmaster/certs/` — internal CA + server cert.
- systemd unit or pm2 config; optional Caddyfile; firewall rules.

---

## Phase 1 — Server hardening

### Task 1: Reject the placeholder JWT_SECRET

**Files:**
- Modify: `src/online-server/config.cjs:22-39` (`resolveJwtSecret`)

**Interfaces:**
- Produces: `config.jwtSecret` still a string; now throws at boot if the value is the known placeholder or too short.

- [ ] **Step 1: Write the failing check (integration)**

Create `scratch/check-jwt.cjs`:
```js
process.env.JWT_SECRET = 'replace-with-a-long-random-secret';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017';
try { require('../src/online-server/config.cjs'); console.log('NO ERROR (bad)'); }
catch (e) { console.log('THREW:', e.message); }
```

- [ ] **Step 2: Run it — expect it does NOT throw yet**

Run: `node scratch/check-jwt.cjs`
Expected now: `NO ERROR (bad)` (the placeholder is currently accepted because it is ≥32 chars).

- [ ] **Step 3: Add the placeholder rejection**

In `resolveJwtSecret`, after the length check:
```js
    if (explicit) {
        if (explicit.length < 32) {
            throw new Error(`JWT_SECRET must be at least 32 characters long. Generate one with: ${generateHint}`);
        }
        const placeholders = ['replace-with-a-long-random-secret', 'dev-only-change-this-secret'];
        if (placeholders.includes(explicit)) {
            throw new Error(`JWT_SECRET is a known placeholder value. Set a real secret. Generate one with: ${generateHint}`);
        }
        return explicit;
    }
```

- [ ] **Step 4: Run again — expect it throws now**

Run: `node scratch/check-jwt.cjs`
Expected: `THREW: JWT_SECRET is a known placeholder value...`

- [ ] **Step 5: Commit**

```bash
git add src/online-server/config.cjs
git commit -m "fix(server): reject placeholder JWT_SECRET at boot"
```

---

### Task 2: Sales reporting service methods + endpoints

**Files:**
- Modify: `src/online-server/services/salesService.cjs` (add two functions + exports)
- Create: `src/online-server/routes/reports.cjs`
- Modify: `src/online-server/app.cjs:9-47` (require + mount reports)

**Interfaces:**
- Consumes: `getDb()` from `db/mongo.cjs`; `req.auth` (`{orgId, userId, roles}`) from `requireAuth`.
- Produces:
  - `salesService.getSalesSummary(auth, { startDate, endDate })` → `{ total_sales, total_amount, total_transactions, count }`.
  - `salesService.getSalesDaily(auth, days)` → `[{ _id: 'YYYY-MM-DD', total_amount, total_sales }]`.
  - `GET /api/sales/summary?startDate=&endDate=` and `GET /api/sales/daily?days=30`, both `requireSalesPermission`.

- [ ] **Step 1: Add the two functions to `salesService.cjs`**

Port the aggregation logic from `OnlineModeService.cjs:181-273` (auth comes from `req.auth`, not a local token check):
```js
async function getSalesSummary(auth, { startDate = null, endDate = null } = {}) {
    const db = getDb();
    const dateRange = {};
    if (startDate) dateRange.$gte = new Date(startDate);
    if (endDate) dateRange.$lte = new Date(endDate);
    const pipeline = [
        { $addFields: { effectiveCreatedAt: { $ifNull: ['$createdAt', { $cond: [{ $ne: ['$created_at', null] }, { $toDate: '$created_at' }, null] }] } } },
        { $match: { orgId: auth.orgId } },
        { $match: { $or: [{ is_held: { $ne: true } }, { isHeld: { $ne: true } }, { status: { $ne: 'held' } }] } },
        ...(Object.keys(dateRange).length ? [{ $match: { effectiveCreatedAt: dateRange } }] : []),
        { $group: { _id: null, total_sales: { $sum: '$totalAmount' }, total_amount: { $sum: '$totalAmount' }, total_transactions: { $sum: 1 }, count: { $sum: 1 } } }
    ];
    const [summary] = await db.collection('sales').aggregate(pipeline).toArray();
    return summary || { total_sales: 0, total_amount: 0, total_transactions: 0, count: 0 };
}

async function getSalesDaily(auth, days = 30) {
    const db = getDb();
    const dayCount = Math.max(Number.parseInt(days, 10) || 30, 1);
    const start = new Date();
    start.setDate(start.getDate() - dayCount);
    return db.collection('sales').aggregate([
        { $addFields: { effectiveCreatedAt: { $ifNull: ['$createdAt', { $cond: [{ $ne: ['$created_at', null] }, { $toDate: '$created_at' }, null] }] } } },
        { $match: { orgId: auth.orgId, effectiveCreatedAt: { $gte: start } } },
        { $match: { $or: [{ is_held: { $ne: true } }, { isHeld: { $ne: true } }, { status: { $ne: 'held' } }] } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$effectiveCreatedAt' } }, total_amount: { $sum: '$totalAmount' }, total_sales: { $sum: 1 } } },
        { $sort: { _id: 1 } }
    ]).toArray();
}
```
Add both to `module.exports`.

- [ ] **Step 2: Create `routes/reports.cjs`**

```js
const express = require('express');
const salesService = require('../services/salesService.cjs');
const authService = require('../services/authService.cjs');
const { asyncHandler, ok } = require('../utils/http.cjs');
const { requireAuth, requireOrgScope, requireSalesPermission, requireManagerRole } = require('../middleware/auth.cjs');

const router = express.Router();
router.use(requireAuth, requireOrgScope);

router.get('/sales/summary', requireSalesPermission, asyncHandler(async (req, res) => {
    const data = await salesService.getSalesSummary(req.auth, { startDate: req.query.startDate, endDate: req.query.endDate });
    return ok(res, data);
}));

router.get('/sales/daily', requireSalesPermission, asyncHandler(async (req, res) => {
    const data = await salesService.getSalesDaily(req.auth, req.query.days);
    return ok(res, data);
}));

router.get('/sessions/active', requireManagerRole, asyncHandler(async (req, res) => {
    const data = await authService.listActiveSessions(req.auth, { limit: req.query.limit, skip: req.query.skip });
    return ok(res, data);
}));

router.get('/sessions/active/count', requireManagerRole, asyncHandler(async (req, res) => {
    const data = await authService.countActiveSessions(req.auth);
    return ok(res, data);
}));

module.exports = router;
```
(The two `authService` methods are added in Task 3; this file compiles now but `/sessions/*` returns 500 until Task 3.)

- [ ] **Step 3: Mount the router in `app.cjs`**

After line 9 add `const reportsRoutes = require('./routes/reports.cjs');`
After line 47 (`app.use('/api', catalogRoutes);`) add `app.use('/api', reportsRoutes);`

- [ ] **Step 4: Verify against a running dev server**

Terminal A: `npm run online:dev`  (needs a real `.env.online` with Atlas URI + a strong JWT_SECRET)
Terminal B, get a token then call the endpoints:
```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:4100/api/auth/login -H 'Content-Type: application/json' -d '{"email":"admin@posmaster.com","password":"<pwd>"}' | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d).token))")
curl -s "http://127.0.0.1:4100/api/sales/summary" -H "Authorization: Bearer $TOKEN"
curl -s "http://127.0.0.1:4100/api/sales/daily?days=7" -H "Authorization: Bearer $TOKEN"
```
Expected: `{"status":"success","data":{...}}` for summary; a dated array for daily. Compare the summary total against the pre-existing IPC path if desired.

- [ ] **Step 5: Commit**

```bash
git add src/online-server/services/salesService.cjs src/online-server/routes/reports.cjs src/online-server/app.cjs
git commit -m "feat(server): sales summary and daily REST endpoints"
```

---

### Task 3: Active-session service methods

**Files:**
- Modify: `src/online-server/services/authService.cjs` (add two functions + exports)

**Interfaces:**
- Consumes: `getDb()`; `req.auth`.
- Produces:
  - `authService.listActiveSessions(auth, { limit, skip })` → array of session docs (org-scoped, sanitized: no `tokenHash`).
  - `authService.countActiveSessions(auth)` → `{ count }`.

- [ ] **Step 1: Add the functions**

Port from `OnlineModeService.cjs:275-302`; strip `tokenHash` from output:
```js
async function listActiveSessions(auth, { limit = 100, skip = 0 } = {}) {
    const db = getDb();
    const cappedLimit = Math.min(Math.max(Number.parseInt(limit, 10) || 100, 1), 500);
    const safeSkip = Math.max(Number.parseInt(skip, 10) || 0, 0);
    const sessions = await db.collection('sessions')
        .find({ active: true, orgId: auth.orgId })
        .sort({ lastSeenAt: -1, createdAt: -1 })
        .skip(safeSkip).limit(cappedLimit).toArray();
    return sessions.map(({ tokenHash, ...safe }) => safe);
}

async function countActiveSessions(auth) {
    const db = getDb();
    const count = await db.collection('sessions').countDocuments({ active: true, orgId: auth.orgId });
    return { count };
}
```
Add both to `module.exports`.

- [ ] **Step 2: Verify against the running server**

```bash
curl -s "http://127.0.0.1:4100/api/sessions/active/count" -H "Authorization: Bearer $TOKEN"
curl -s "http://127.0.0.1:4100/api/sessions/active" -H "Authorization: Bearer $TOKEN" | head -c 300
```
Expected: `{"status":"success","data":{"count":N}}`; a session array with **no `tokenHash`** field. Confirm a cashier token gets 403 (manager-only): repeat with a cashier's token → `403`.

- [ ] **Step 3: Commit**

```bash
git add src/online-server/services/authService.cjs
git commit -m "feat(server): active-session REST endpoints (manager-only)"
```

---

### Task 4: Strict CORS default

**Files:**
- Modify: `src/online-server/config.cjs:56` (corsOrigin default)

**Interfaces:**
- Produces: `config.corsOrigin` defaults to the app origins only; a public deployment sets an explicit list via `ONLINE_API_CORS_ORIGIN`.

- [ ] **Step 1: Keep the existing safe default, document the prod override**

The default `'file://,http://localhost:5173,http://localhost:5174'` is already an allowlist (not `*`), so packaged tills (which load over `file://`) are allowed and arbitrary websites are not. No code change needed unless a `*` is present in the server's env — verify the server's `.env.online` does **not** set `ONLINE_API_CORS_ORIGIN=*`.

- [ ] **Step 2: Verify the resolver rejects an unknown browser origin**

```bash
curl -s -o /dev/null -w "%{http_code}\n" "http://127.0.0.1:4100/api/ready" -H "Origin: https://evil.example"
```
Expected: request blocked by CORS for that origin (error), while a no-Origin curl to `/api/ready` returns 200.

- [ ] **Step 3: Commit (only if a change was needed)**

```bash
git add src/online-server/config.cjs
git commit -m "chore(server): confirm CORS allowlist default for tills"
```

---

### Task 5: Extend rate limiting to auth/write routes

**Files:**
- Modify: `src/online-server/routes/auth.cjs` (reuse the existing `express-rate-limit` on register/change-password/reset)

**Interfaces:**
- Consumes: `express-rate-limit` (already a dependency; already used on login).
- Produces: register / change-password / reset-password limited (e.g. 30 / 15 min per IP).

- [ ] **Step 1: Add a shared limiter and apply to sensitive writes**

Near the existing `loginLimiter`:
```js
const writeLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });
```
Add `writeLimiter` before `authService.register`, `changePassword`, and the reset-password handler.

- [ ] **Step 2: Verify a burst is throttled**

```bash
for i in $(seq 1 35); do curl -s -o /dev/null -w "%{http_code} " -X POST http://127.0.0.1:4100/api/auth/change-password -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{}'; done; echo
```
Expected: `429` appears after the limit.

- [ ] **Step 3: Commit**

```bash
git add src/online-server/routes/auth.cjs
git commit -m "feat(server): rate-limit sensitive auth write routes"
```

---

### Task 6: Serve HTTPS when TLS certs are configured

**Files:**
- Modify: `src/online-server/config.cjs` (add `tlsCertFile`, `tlsKeyFile`)
- Modify: `src/online-server/runtime.cjs:1-29` (use `https.createServer` when configured)

**Interfaces:**
- Consumes: `POS_TLS_CERT_FILE`, `POS_TLS_KEY_FILE` env paths.
- Produces: server listens over HTTPS when both paths are set, else HTTP (dev unchanged).

- [ ] **Step 1: Add config keys**

In `config.cjs` config object: `tlsCertFile: process.env.POS_TLS_CERT_FILE || '', tlsKeyFile: process.env.POS_TLS_KEY_FILE || '',`

- [ ] **Step 2: Use HTTPS in `runtime.cjs`**

```js
const http = require('http');
const https = require('https');
const fs = require('fs');
// ...
const app = createApp();
let server;
if (config.tlsCertFile && config.tlsKeyFile) {
    server = https.createServer({ cert: fs.readFileSync(config.tlsCertFile), key: fs.readFileSync(config.tlsKeyFile) }, app);
    console.log('[OnlineAPI] TLS enabled');
} else {
    server = http.createServer(app);
}
const io = createRealtimeServer(server);
```

- [ ] **Step 3: Verify locally with a throwaway cert**

```bash
openssl req -x509 -newkey rsa:2048 -nodes -keyout /tmp/k.pem -out /tmp/c.pem -days 1 -subj "/CN=localhost"
POS_TLS_CERT_FILE=/tmp/c.pem POS_TLS_KEY_FILE=/tmp/k.pem npm run online:server &
sleep 3; curl -sk https://127.0.0.1:4100/api/ready; echo
```
Expected: `{"status":...,"online":true,...}` over HTTPS (note `-k` accepts the throwaway cert).

- [ ] **Step 4: Commit**

```bash
git add src/online-server/config.cjs src/online-server/runtime.cjs
git commit -m "feat(server): optional HTTPS via configured TLS cert/key"
```

---

## Phase 2 — Desktop thin-client

### Task 7: Skip embedding the server when a remote URL is set

**Files:**
- Modify: `electron.cjs:607-628` (`startBundledOnlineBackend`)

**Interfaces:**
- Consumes: `POS_ONLINE_EMBED_SERVER` env (`'false'` disables embedding); default embeds (backward compatible).
- Produces: when disabled, the desktop starts no local server and talks only to the remote URL.

- [ ] **Step 1: Guard the embed start**

At the top of `startBundledOnlineBackend()`:
```js
if (String(process.env.POS_ONLINE_EMBED_SERVER).toLowerCase() === 'false') {
    console.log('[Electron] Embedded server disabled; using remote POS_ONLINE_API_URL');
    return;
}
```
Guard `stopBundledOnlineBackend()` similarly so it is a no-op when never started.

- [ ] **Step 2: Verify**

Set `POS_ONLINE_EMBED_SERVER=false` + `POS_ONLINE_API_URL=https://37.60.226.84:4100/api` in the runtime config, launch the app, confirm the log shows "Embedded server disabled" and no local :4100 listener is opened (`lsof -i :4100` on the till shows nothing).

- [ ] **Step 3: Commit**

```bash
git add electron.cjs
git commit -m "feat(desktop): allow disabling the embedded server for remote mode"
```

---

### Task 8: Trust the self-signed CA in the desktop HTTP + socket clients

**Files:**
- Modify: `src/backend/online/OnlineApiClient.cjs` (undici dispatcher with the CA)
- Modify: `src/backend/online/OnlineRealtimeClient.cjs:14` (socket.io-client CA options)

**Interfaces:**
- Consumes: `POS_TLS_CA_FILE` env pointing at the bundled CA PEM.
- Produces: fetch + socket connections trust the internal CA; no blanket `rejectUnauthorized:false`.

- [ ] **Step 1: Add a CA-aware dispatcher to `OnlineApiClient`**

```js
const fs = require('fs');
const { Agent } = require('undici');
let caDispatcher = null;
function getDispatcher() {
    if (caDispatcher !== null) return caDispatcher || undefined;
    const caFile = process.env.POS_TLS_CA_FILE;
    caDispatcher = caFile && fs.existsSync(caFile)
        ? new Agent({ connect: { ca: fs.readFileSync(caFile) } })
        : false;
    return caDispatcher || undefined;
}
```
In `request()`, pass `dispatcher: getDispatcher()` to `fetch(url, { ...opts, dispatcher: getDispatcher() })`.

- [ ] **Step 2: Trust the CA in `OnlineRealtimeClient`**

```js
const fs = require('fs');
const caFile = process.env.POS_TLS_CA_FILE;
const tlsOpts = caFile && fs.existsSync(caFile) ? { ca: fs.readFileSync(caFile), rejectUnauthorized: true } : {};
this.socket = io(this.baseUrl, { auth: { token }, transports: ['websocket'], reconnection: true, reconnectionAttempts: Infinity, reconnectionDelay: 1000, ...tlsOpts });
```

- [ ] **Step 3: Verify against the throwaway HTTPS server from Task 6**

Point `POS_ONLINE_API_URL=https://127.0.0.1:4100/api` and `POS_TLS_CA_FILE=/tmp/c.pem`, run a small node script that requires `OnlineApiClient`, calls `.ready()`, and prints the result. Expected: success (no `self-signed certificate` error). Remove the CA env and confirm it now fails with a TLS error — proving the trust is coming from the CA, not a bypass.

- [ ] **Step 4: Commit**

```bash
git add src/backend/online/OnlineApiClient.cjs src/backend/online/OnlineRealtimeClient.cjs
git commit -m "feat(desktop): trust the internal CA for HTTPS + socket.io"
```

---

### Task 9: Replace the four direct-Mongo methods with API calls

**Files:**
- Modify: `src/backend/online/OnlineApiClient.cjs` (add four endpoint methods)
- Modify: `src/backend/services/OnlineModeService.cjs:146-306` (delete `_requireAuthContext` + the four methods; delegate to the API)

**Interfaces:**
- Consumes: the endpoints from Tasks 2–3.
- Produces: `OnlineModeService.getSalesSummary/getSalesDaily/getActiveSessions/countActiveSessions` return `{status,data}` from the API, not direct DB.

- [ ] **Step 1: Add client methods to `OnlineApiClient`**

```js
getSalesSummary({ startDate, endDate } = {}) {
    const q = new URLSearchParams(); if (startDate) q.set('startDate', startDate); if (endDate) q.set('endDate', endDate);
    return this.request(`/sales/summary${q.toString() ? `?${q}` : ''}`);
}
getSalesDaily(days = 30) { return this.request(`/sales/daily?days=${encodeURIComponent(days)}`); }
getActiveSessions(limit = 100, skip = 0) { return this.request(`/sessions/active?limit=${limit}&skip=${skip}`); }
countActiveSessions() { return this.request('/sessions/active/count'); }
```

- [ ] **Step 2: Delegate in `OnlineModeService`, delete direct-Mongo code**

Replace the four methods with pass-throughs and delete `_requireAuthContext`, the `getConnectedDb`/`jwt`/`hashToken` imports it needed (verify nothing else uses them first):
```js
async getSalesSummary(startDate, endDate) { return this.api.getSalesSummary({ startDate, endDate }); }
async getSalesDaily(days = 30) { return this.api.getSalesDaily(days); }
async getActiveSessions(limit = 100, skip = 0) { return this.api.getActiveSessions(limit, skip); }
async countActiveSessions() { return this.api.countActiveSessions(); }
```

- [ ] **Step 3: Verify the desktop reports still work end-to-end**

With the app pointed at the dev/remote server and logged in, open the dashboard/reports view that calls these (sales summary / active sessions). Expected: same numbers as before; no `MONGODB_URI`-dependent code runs on the desktop. Grep confirms the desktop no longer imports Mongo for these: `grep -n "getConnectedDb\|require('mongodb')" src/backend/services/OnlineModeService.cjs` → gone.

- [ ] **Step 4: Commit**

```bash
git add src/backend/online/OnlineApiClient.cjs src/backend/services/OnlineModeService.cjs
git commit -m "refactor(desktop): route reports/sessions through REST, drop direct Mongo"
```

---

### Task 10: Strip secrets from the desktop build config

**Files:**
- Modify: `scripts/write-online-runtime-config.cjs`
- Modify: `.github/workflows/release.yml`

**Interfaces:**
- Produces: the packaged `online-runtime-config.json` contains only `POS_ONLINE_API_URL`, `POS_ONLINE_REALTIME_URL`, `POS_ONLINE_EMBED_SERVER=false`, `POS_TLS_CA_FILE`, `MONGODB_DB`, `POS_ORG_ID`. No `MONGODB_URI`, `JWT_SECRET`, `TEA_COOP_*`.

- [ ] **Step 1: Rewrite the config writer**

Replace the secret keys in `write-online-runtime-config.cjs` with only the client-safe keys:
```js
const config = {
    POS_ONLINE_API_URL: requiredEnv('POS_ONLINE_API_URL'),
    POS_ONLINE_REALTIME_URL: requiredEnv('POS_ONLINE_REALTIME_URL'),
    POS_ONLINE_EMBED_SERVER: 'false',
    POS_TLS_CA_FILE: optionalEnv('POS_TLS_CA_FILE', 'resources/pos-ca.pem'),
    MONGODB_DB: optionalEnv('MONGODB_DB', 'POSmaster'),
    POS_ORG_ID: optionalEnv('POS_ORG_ID', 'default-org'),
    // printing/UI env may remain
};
```

- [ ] **Step 2: Update the release workflow env block**

In the root `.github/workflows/release.yml` "Generate packaged online runtime config" step, remove `MONGODB_URI`, `JWT_SECRET`, `TEA_COOP_*`; add `POS_ONLINE_API_URL`, `POS_ONLINE_REALTIME_URL` from repo vars. Bundle the CA cert as an `extraResource`.

- [ ] **Step 3: Verify a built config carries no secrets**

```bash
POS_ONLINE_API_URL=https://37.60.226.84:4100/api POS_ONLINE_REALTIME_URL=https://37.60.226.84:4100 node scripts/write-online-runtime-config.cjs
grep -iE "mongodb_uri|jwt_secret|tea_coop_(username|password|token)" online-runtime-config.json && echo "LEAK" || echo "clean"
```
Expected: `clean`.

- [ ] **Step 4: Commit**

```bash
git add scripts/write-online-runtime-config.cjs .github/workflows/release.yml
git commit -m "feat(build): ship desktop config with URL+CA only, no secrets"
```

---

## Phase 3 — Server deployment (on 37.60.226.84)

### Task 11: Provision the server runtime + secrets

- [ ] **Step 1:** Install Node 20 LTS on the server; create `/opt/posmaster`, copy the repo (or `git clone` + `npm ci --omit=dev`).
- [ ] **Step 2:** Write `/opt/posmaster/.env.online` with real values: `MONGODB_URI` (Atlas), `MONGODB_DB=POSmaster`, a strong `JWT_SECRET` (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), `POS_ORG_ID=default-org`, `NODE_ENV=production`, `ONLINE_API_HOST=0.0.0.0`, `ONLINE_API_PORT=4100`, `ONLINE_API_CORS_ORIGIN=file://`, `TEA_COOP_*` real creds.
- [ ] **Step 3:** Add the server's public IP to the **Atlas IP allowlist**; remove any till IPs.
- [ ] **Step 4: Verify:** `NODE_ENV=production node src/online-server/server.cjs` boots and logs "Listening"; `curl -s http://127.0.0.1:4100/api/ready` returns online. Confirm boot **fails** if `JWT_SECRET` is the placeholder (Task 1).

### Task 12: Internal CA + server certificate for the IP

- [ ] **Step 1:** Create a long-lived CA:
```bash
openssl genrsa -out ca.key 4096
openssl req -x509 -new -nodes -key ca.key -sha256 -days 3650 -out pos-ca.pem -subj "/CN=POSMaster Internal CA"
```
- [ ] **Step 2:** Create a server cert with the IP in SAN:
```bash
openssl genrsa -out server.key 2048
openssl req -new -key server.key -out server.csr -subj "/CN=37.60.226.84"
printf "subjectAltName=IP:37.60.226.84\n" > san.ext
openssl x509 -req -in server.csr -CA pos-ca.pem -CAkey ca.key -CAcreateserial -out server.crt -days 825 -sha256 -extfile san.ext
```
- [ ] **Step 3:** Place `server.crt`/`server.key` under `/opt/posmaster/certs`; keep `pos-ca.pem` to bundle into desktop builds (Task 10). Keep `ca.key` offline/secure.
- [ ] **Step 4: Verify:** `openssl x509 -in server.crt -noout -text | grep -A1 "Subject Alternative Name"` shows `IP Address:37.60.226.84`.

### Task 13: Run under a process manager with TLS + firewall

- [ ] **Step 1:** Point the server at the certs: add `POS_TLS_CERT_FILE=/opt/posmaster/certs/server.crt` and `POS_TLS_KEY_FILE=/opt/posmaster/certs/server.key` to `.env.online` (Task 6 makes it serve HTTPS).
- [ ] **Step 2:** Create a **systemd** unit (or pm2) that runs `node src/online-server/server.cjs` with `WorkingDirectory=/opt/posmaster`, `Restart=always`, `EnvironmentFile=/opt/posmaster/.env.online`. Enable + start.
- [ ] **Step 3:** Firewall: allow inbound TCP **4100** only; deny direct DB ports. (Optional: put Caddy in front and expose 443 instead — Caddy config would `reverse_proxy 127.0.0.1:4100` with `tls internal` or the same cert.)
- [ ] **Step 4: Verify:** from another machine `curl --cacert pos-ca.pem https://37.60.226.84:4100/api/ready` returns online; `systemctl status posmaster` shows active; killing the process auto-restarts it.

### Task 14: Deploy verification (smoke test over the internet)

- [ ] **Step 1:** From a remote network, obtain a token via `POST https://37.60.226.84:4100/api/auth/login` (with `--cacert pos-ca.pem`).
- [ ] **Step 2:** Call `/api/sales/summary`, `/api/sales/daily`, `/api/sessions/active/count`, `/api/collections/items` — all return `{status:success}`.
- [ ] **Step 3:** Open a WebSocket with the token and confirm `realtime.connected` fires (use a small `socket.io-client` node script with `{ ca }`).
- [ ] **Step 4: Verify:** all green; note the results in a deploy log.

---

## Phase 4 — Migration

### Task 15: Point one till at the central server

- [ ] **Step 1:** On one test till, set runtime config: `POS_ONLINE_API_URL=https://37.60.226.84:4100/api`, `POS_ONLINE_REALTIME_URL=https://37.60.226.84:4100`, `POS_ONLINE_EMBED_SERVER=false`, `POS_TLS_CA_FILE=<path to pos-ca.pem>`.
- [ ] **Step 2:** Launch, log in, make a test sale, print a receipt.
- [ ] **Step 3: Verify cross-till real-time:** with a second till also pointed at the server, make a sale on till A and confirm till B's sales/stock refresh within ~2s. Pull till A's network and confirm the reconnect overlay, then restore and confirm recovery.

### Task 16: Cut and roll out the no-secrets desktop build

- [ ] **Step 1:** Build a release whose config has no secrets (Task 10) and bundles `pos-ca.pem`. Confirm with the grep from Task 10 Step 3.
- [ ] **Step 2:** Install on tills one at a time; verify each logs in and syncs; keep the previous embedded-server build available as rollback until all tills are cut over.
- [ ] **Step 3: Verify:** every till operates against the central server; no till holds `MONGODB_URI`/`JWT_SECRET`; Atlas allowlist lists only the server.

---

## Self-Review

- **Spec coverage:** §6 server changes → Tasks 1–6; §7 desktop changes → Tasks 7–10; §8 config/release → Task 10; §9 deployment → Tasks 11–13; §10 real-time → verified in Task 15; §11 rollout → Tasks 15–16; §12 risks (placeholder JWT, direct-Mongo, cert expiry) → Tasks 1, 9, 12. All covered.
- **Placeholder scan:** no TBD/TODO; every code step has real code; every verify step has a runnable command with expected output.
- **Type consistency:** `getSalesSummary(auth, {startDate,endDate})`, `getSalesDaily(auth, days)`, `listActiveSessions(auth,{limit,skip})`, `countActiveSessions(auth)` are defined in Tasks 2–3 and consumed with matching shapes by the routes and the client methods in Tasks 2, 3, 9.
- **Open items from spec §14:** port defaults to `4100`; TLS terminates in Node directly (Task 6) with Caddy noted as an alternative in Task 13.
