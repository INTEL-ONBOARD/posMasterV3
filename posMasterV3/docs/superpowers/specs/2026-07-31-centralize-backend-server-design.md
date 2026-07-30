# Design: Centralize the backend into one internet-facing server

**Date:** 2026-07-31
**Status:** Approved (design), pending spec review
**Author:** Architecture review + brainstorming session

---

## 1. Goal

Turn the current per-till architecture (every desktop embeds its own API server) into a
**single central backend** that every desktop connects to over the internet, giving:

- **100% online, no offline** — tills require a live connection; no local data or offline queue.
- **True real-time across tills** — one Socket.IO hub, so a change on any till pushes instantly to all others.
- **One deployed backend** on the customer's on-prem server, reachable by tills at multiple sites.

## 2. Decisions locked during brainstorming

| Decision | Choice |
|---|---|
| Backend stack | **Keep the existing Node.js/Express server** and centralize it (no Python/FastAPI rewrite). |
| Why not FastAPI | The workload is I/O-bound (a thin API over MongoDB + Socket.IO). Framework choice does not change speed; the real-time win comes from centralizing, not the language. A rewrite would discard tested auth/sales/inventory logic at high risk. |
| Hosting | Customer **on-prem server**, IP `37.60.226.84`, connected via **IP + port** (no domain yet). |
| Network topology | **Multiple locations over the internet** (server is publicly reachable). |
| Transport security | **Self-signed TLS certificate**; the desktop app is configured to trust that specific cert (the client is ours). Real encryption over the IP, no domain required. |
| Offline behavior | **None.** On disconnect the till blocks with the existing connection overlay and auto-reconnects. |
| Secrets on desktop | **Removed entirely.** The desktop build ships only the server URL + the CA cert to trust. All secrets live on the central server. |

## 3. Non-goals (YAGNI)

- No offline mode / local cache / sync queue.
- No multi-tenant redesign — same single `POSmaster` database, same `default-org`.
- No message broker, no container orchestration (single Node process).
- No rewrite of business logic, auth model, or schema. This is **relocate + secure**, not rebuild.

## 4. Current architecture (baseline)

- Each Electron desktop boots its own Express + Socket.IO server in-process via
  `src/online-server/runtime.cjs → startOnlineServer()` (called at `electron.cjs:619`), listening on `127.0.0.1:4100`.
- The renderer never makes network calls. Data flows:
  renderer → `window.electronAPI` (preload) → IPC → `OnlineController` →
  `OnlineModeService` → `OnlineApiClient.fetch()` → the embedded server → MongoDB Atlas.
- Real-time: server `publishDomainEvent` → Socket.IO hub → `OnlineRealtimeClient`
  (main process) → `webContents.send` → renderer `DataStore` invalidate + refetch (2s cache TTL).
- **Secrets today** ship inside the packaged `online-runtime-config.json`
  (`MONGODB_URI`, `JWT_SECRET`, `TEA_COOP_*`).
- **Four operations bypass the API and hit MongoDB directly from the desktop**
  (`OnlineModeService`: `getSalesSummary`, `getSalesDaily`, `getActiveSessions`, `countActiveSessions`).

## 5. Target architecture

```
Till A (Electron, thin client) ─┐
Till B (Electron, thin client) ─┼─ HTTPS (self-signed, pinned) ─→  Central Node/Express server  ─→  MongoDB Atlas
Till C (Electron, thin client) ─┘   Socket.IO (wss, self-signed)     @ 37.60.226.84:<port>            (POSmaster)
                                                                      · ONE Socket.IO hub
                                                                      · holds ALL secrets
```

- The **same server code** runs once on the on-prem box (it already runs standalone via `npm run online:server`).
- Every till's `OnlineApiClient` + `OnlineRealtimeClient` point at `https://37.60.226.84:<port>`
  instead of `localhost:4100`.
- One hub → a sale on any till is pushed to every other till immediately (fixes today's cross-till lag).
- MongoDB is reachable **only** from the central server, never from tills.

## 6. Server-side changes

1. **HTTPS with a self-signed cert.**
   - Create an internal CA + a server certificate for the IP `37.60.226.84`.
   - Terminate TLS either directly in Node (`https.createServer` in `runtime.cjs`, reading cert/key
     from config) or via a reverse proxy (Caddy/Nginx) in front. **Recommended:** reverse proxy for
     clean restarts and logs, using the self-signed/internal cert. Either way the desktop trusts the CA.
2. **New REST endpoints** to replace the four direct-Mongo desktop methods, so tills need no DB access:
   - `GET /api/sales/summary` → sales summary (org-scoped).
   - `GET /api/sales/daily` → daily sales series.
   - `GET /api/sessions/active` and `GET /api/sessions/active/count` → active-session queries.
   - Each guarded by `requireAuth` + `requireOrgScope` + the appropriate permission, reusing the
     logic currently in `OnlineModeService` (`_requireAuthContext` becomes standard middleware).
3. **Security hardening for internet exposure:**
   - **Strong `JWT_SECRET`** — replace the current literal placeholder
     `replace-with-a-long-random-secret` with a real high-entropy secret (critical: with the server
     public, the placeholder would let anyone forge admin tokens).
   - **Strict CORS** — allow only the desktop origin(s), not `*`.
   - **Rate limiting** — keep the existing `express-rate-limit` on login; extend sensible limits to
     other write/auth routes.
   - **helmet** already applied; confirm HTTPS-appropriate headers.
   - **Firewall** — expose only the chosen API port; MongoDB Atlas IP allowlist includes only the
     central server, not tills.
4. **Config on the server** — the server box holds its own `.env.online` with `MONGODB_URI`,
   `JWT_SECRET`, `TEA_COOP_*`, `ONLINE_API_HOST/PORT`, TLS cert paths. Nothing secret ships to tills.

## 7. Desktop-side changes

1. **Stop embedding the server** — remove the `startOnlineServer()` / `startBundledOnlineBackend()`
   startup path and the `stopBundledOnlineBackend()` shutdown for the packaged app.
2. **Remove direct-Mongo paths** — delete the four direct-DB methods in `OnlineModeService`; they
   now call the new REST endpoints through `OnlineApiClient`.
3. **Point clients at the central server** — set `POS_ONLINE_API_URL = https://37.60.226.84:<port>/api`
   and `POS_ONLINE_REALTIME_URL = https://37.60.226.84:<port>`.
4. **Trust the self-signed cert** — bundle the CA cert with the desktop app and configure the
   main-process HTTP client (undici Agent `ca` option, or `NODE_EXTRA_CA_CERTS`) and the Socket.IO
   client (`ca` / `rejectUnauthorized` transport option) to trust it. No `rejectUnauthorized:false`
   blanket bypass — trust the specific CA only.
5. **Connection-loss UX** — on disconnect, block the till with the existing `OnlineConnectionOverlay`;
   Socket.IO already retries infinitely. `OnlineApiClient` retry/backoff stays for transient errors.
6. **Strip secrets from the build** — `online-runtime-config.json` for the desktop contains only the
   API URL, realtime URL, and a reference to the bundled CA cert. No DB URI, no JWT secret, no
   Tea Coop credentials.

## 8. Config & release pipeline changes

- **`scripts/write-online-runtime-config.cjs`** — stop writing `MONGODB_URI`, `JWT_SECRET`,
  `TEA_COOP_*` into the desktop config; write only URL/realtime/CA references.
- **`.github/workflows/release.yml`** (the root one that actually runs) — stop injecting server
  secrets into the desktop build. Server secrets are provisioned on the server box, not in CI.
- The dead nested `posMasterV3/.github/workflows/release.yml` should be deleted to avoid confusion
  (it never runs and carries wrong defaults).

## 9. Deployment (on-prem)

- One Node process under a **process manager** (pm2 or systemd) for auto-restart on crash/reboot.
- Optional **reverse proxy** (Caddy or Nginx) terminating TLS with the self-signed/internal cert.
- **Health checks** hit the existing `/api/ready` (already returns Mongo + realtime status).
- **Rollback** = redeploy the previous build; no orchestration required.
- **Cert lifecycle** — self-signed certs expire; document a renewal step and rotate before expiry.
  Renewal means re-issuing the server cert (CA can be long-lived) and, if the CA changes, shipping a
  new desktop build. Using a long-lived internal CA avoids client rebuilds on server-cert rotation.

## 10. Real-time behavior after centralization

- Same-till: instant (unchanged).
- **Cross-till: now instant** — all tills share the one hub, so `domain.event` broadcasts reach every
  connected till immediately, instead of waiting for each till's own cycle. The 2s cache TTL becomes a
  safety net rather than the primary propagation path.
- Session enforcement (single active session, force-disconnect on replacement) works fleet-wide since
  all sockets live on one hub.

## 11. Migration / rollout phases

1. **Harden the server** — HTTPS + self-signed CA, the four new endpoints, strong `JWT_SECRET`,
   strict CORS, rate limits, firewall/Atlas allowlist.
2. **Deploy centrally** on `37.60.226.84`, verify with one till pointed at it.
3. **Cut a desktop build** that points remote, trusts the CA, and ships **no** secrets.
4. **Migrate tills one at a time**; keep the embedded-server build available as a fallback until all
   tills are cut over and verified.

## 12. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Server outage stops all tills (single point of failure) | Process manager auto-restart; health checks; document a fast redeploy/rollback. This is the accepted tradeoff of 100%-online, single central server. |
| Self-signed cert expiry breaks all tills at once | Long-lived internal CA (years); rotate server cert ahead of expiry; alert before expiry. |
| Placeholder `JWT_SECRET` shipped by accident | Server refuses to boot without a strong secret (config validation already requires ≥32 chars); verify in phase 1. |
| Direct-Mongo desktop methods missed → till errors | The four methods are explicitly ported to REST in phase 1 before any till cuts over. |
| Secrets left in an old desktop build | Old builds keep working against the embedded server; the point of exposure is only if an old build reaches the public server — it won't, since it targets localhost. New builds carry no secrets. |
| Internet-facing exposure | Strict CORS, rate limits, firewall to only the API port, JWT+session auth already server-side, TLS encryption. |

## 13. Verification

- **Server:** the four new endpoints return correct data with auth; boot fails on weak `JWT_SECRET`;
  HTTPS serves with the self-signed cert; `/api/ready` green.
- **Desktop:** a build with no secrets connects over HTTPS, trusts the CA, logs in, reads/writes,
  and receives real-time events; a second till sees the first till's sale immediately; pulling the
  network shows the reconnect overlay and recovers on restore.
- **End-to-end:** run a sale on till A, confirm till B's stock/sales refresh instantly.

## 14. Open items to confirm before implementation

- The **port** to expose on `37.60.226.84` (default keep 4100, or 8443, or 443 behind a proxy).
- Whether TLS terminates **in Node directly** or **behind a reverse proxy** (recommended: proxy).
- Note: this work layers on top of the large uncommitted sales-module refactor currently in the
  working tree; that refactor should be committed/settled before or alongside this to avoid tangling.
