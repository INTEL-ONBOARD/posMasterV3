# POSMaster V3 Online MongoDB Real-Time Conversion

## Goal

Convert POSMaster V3 from the legacy SQLite-first system into an online-only, MongoDB-backed, real-time POS system.

## Implemented Foundation

- Added a central online backend under `src/online-server`.
- Added Express HTTP API with health, auth/session/register, generic collection, invoice, and sale creation routes.
- Added MongoDB connection and production-facing indexes.
- Added Socket.IO real-time gateway with org, branch, user, and role rooms.
- Added domain-event persistence and broadcast flow.
- Added JWT session authority and single-device session replacement.
- Added transactional sale creation with atomic stock decrement checks.
- Added admin seeding script for local smoke testing.
- Added Electron online gateway services and typed IPC handlers.
- Added renderer `onlineApi` wrapper.
- Cut startup to require the online backend instead of falling back offline.
- Cut login to use the online API instead of local SQLite authentication.
- Connected `DataStore` to online domain events for cache invalidation.
- Cut the shared renderer API facade (`localApi`) to MongoDB-backed online calls for inventory, sales, members, users, settings, reports, offers, disposed items, payment methods, branch context, login history, and tea-coop screens.
- Cut status helpers to online-only readiness/no-op responses so manual refresh UI can no longer enqueue local work.
- Cut sales invoice generation to the online API so invoice numbers are issued by MongoDB counters instead of local SQLite IPC.
- Cut user registration/creation to the online auth route so passwords are hashed server-side and never stored through generic collection writes.

## Current Target Architecture

```text
React UI
  -> preload online API
  -> Electron OnlineModeService
  -> central HTTP API
  -> MongoDB
  -> domain events
  -> Socket.IO
  -> Electron realtime client
  -> UI cache invalidation
```

## Hard Rules

- No desktop database credentials.
- No offline business writes.
- MongoDB is the business data authority.
- Server validates auth, branch scope, permissions, stock, and invoice generation.
- Success is returned only after server-side commit.
- Real-time events are emitted only after successful domain writes.

## Completed Screen-Level Cutover

- Startup and login are fail-closed on online backend readiness.
- Inventory configuration and item/stock/restock APIs now route through `window.electronAPI.online`.
- Sales checkout, held orders, returns/cancel updates, payment methods, offers, transaction history, and invoice generation now route through the online facade.
- Members, users, roles/settings lookups, app settings, branch context, login history, reports, disposed items, and status indicators now route through the online facade.
- Realtime domain events invalidate renderer caches without local queues or conflict resolution.

## Remaining Production Hardening

1. Replace generic collection writes with domain-specific server routes for restock, returns, reports, settings, user permissions, offers, and tea-coop integrations where stricter business validation is required.
2. Remove or quarantine legacy `CloudSyncService`, `RealTimeSyncService`, `SyncService`, and `sync_queue` after packaging confirms no remaining production entrypoint calls them.
3. Migrate existing SQLite/MySQL data into MongoDB with legacy IDs preserved.
4. Move item images from `item_image_blob` into object storage.
5. Add server-side RBAC and branch authorization middleware beyond the current org/branch scoping.
6. Add integration tests for concurrent stock decrement, invoice uniqueness, session takeover, branch isolation, user registration hashing, and real-time propagation.

## Runtime Notes

- MongoDB transactions require MongoDB Atlas or a replica set. Local standalone MongoDB is enough for health/login/catalog smoke tests, but sale creation returns `TRANSACTIONS_REQUIRED` until the server is connected to a transaction-capable deployment.
- Use `npm run online:seed-admin` for a local admin user.
- Use `npm run online:server` to run the central backend.
