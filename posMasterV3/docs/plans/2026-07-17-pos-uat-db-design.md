# POS UAT Database Design

**Date:** 2026-07-17
**Status:** Approved

## Context

POSMasterV3's online backend currently connects to a MongoDB Atlas cluster
(`atlas-cerulean-candle`, database `POSmaster`, MongoDB 8.x). Every Electron
client runs its own copy of the Express online-server in-process
(`electron.cjs` → `startOnlineServer()`), so the MongoDB connection originates
from each POS machine rather than from a central API tier. The database must
therefore be reachable from the public internet.

There is no separate environment for testing. Any exploratory or destructive
test today runs against the same cluster that holds the working dataset (432
sales, 19 users, 5,152 Tea Coop members across 31 collections).

This design adds `pos-uat-db`: a dedicated UAT MongoDB hosted on the project
VPS (37.60.226.84), seeded with a copy of the current Atlas data, which the
local development system points at instead of Atlas.

The Atlas cluster holds development/staging data rather than live production
data, which lowers the risk of this work. Atlas is nevertheless left completely
untouched — the migration reads from it and never writes to it.

## Approach

**Dedicated single-node replica-set MongoDB container on the VPS**, seeded via
`mongodump`/`mongorestore`, reached over TLS with a private CA, with the local
`.env.online` repointed at it.

Three alternatives were considered and rejected:

- **Reuse the existing `shared-mongodb` container** — fastest, but co-locates
  POS UAT data with other clients' databases in a container we do not control
  the lifecycle of.
- **New database inside the same Atlas cluster** — no new infrastructure, but
  UAT and the working dataset would share one cluster's resources and a
  mistyped database name would cross environments.
- **A separate Atlas cluster** — cleanest isolation, but adds cost and a second
  Atlas project to administer.

## Critical Constraint: Transactions

`db/mongo.cjs` gates transaction support on replica-set or sharded topology:

```js
return Boolean(hello.setName || hello.msg === 'isdbgrid');
```

Five services branch on the resulting `supportsTransactions()` flag:
`salesService`, `restockService`, `disposeService`, `inventoryTransferService`,
and the `/health` route. These are the core write paths.

Atlas is a replica set (`atlas-r9txru-shard-0`), so it runs the transactional
path. A standalone `mongod` reports neither `setName` nor `isdbgrid`, so a
plain container would silently return `false` and UAT would exercise the
**non-transactional fallback** for every sale, restock, dispose, and transfer.
UAT would then pass while running different code than the environment it is
meant to model.

**The UAT container must therefore run as a single-node replica set.** This is
the load-bearing decision of this design; it drives the keyfile requirement,
the port choice, and the replica-set host configuration below.

## Architecture

```
Developer machine                          VPS 37.60.226.84
┌──────────────────────────┐               ┌───────────────────────────────┐
│ Electron app             │               │ pos-uat-mongo (mongo:8.0)     │
│  └ online-server         │  TLS 27019    │  ├ --replSet rs0              │
│     └ MongoClient  ──────┼──────────────▶│  ├ --port 27019               │
│        tlsCAFile         │   verify via  │  ├ --keyFile (internal auth)  │
│        replicaSet=rs0    │   private CA  │  ├ --tlsMode requireTLS       │
└──────────────────────────┘               │  ├ --wiredTigerCacheSizeGB .5 │
         │                                 │  └ volume pos-uat-mongo-data  │
         │ .env.online                     └───────────────────────────────┘
         │  MONGODB_URI / MONGODB_DB
         │  MONGODB_TLS_CA_FILE

MongoDB Atlas (POSmaster) ── read-only mongodump ──▶ archive ──▶ mongorestore
                                                                  nsFrom/nsTo
```

### Container

| Setting | Value | Rationale |
|---|---|---|
| Image | `mongo:8.0` | Matches Atlas 8.x (wire version 25). AVX confirmed present on the host EPYC, required by Mongo 5+. |
| Name / volume | `pos-uat-mongo` / `pos-uat-mongo-data` | Isolated from `shared-mongodb`. |
| Port | `0.0.0.0:27019:27019` | 27017 and 27018 are already taken by the shared instances. `mongod` listens on 27019 *inside* the container so the advertised replica-set port matches the published port. |
| Replica set | `--replSet rs0`, member host `37.60.226.84:27019` | A replica set advertises member addresses to clients. Defaulting to the container hostname would leave clients unable to resolve it. |
| Internal auth | `--keyFile` | Enabling auth together with a replica set requires a keyfile for member authentication; `mongod` refuses to start without it. |
| Cache | `--wiredTigerCacheSizeGB 0.5` | Default is 50% of (RAM − 1 GB) ≈ 5 GB on this 11 GiB host. With 19 containers, ~5.9 GiB available and **no swap**, the default risks the OOM killer terminating another client's database. The dataset is ~10k documents. |

### Auth

Two users, replacing the current Atlas pattern where the application connects
as `Vercel-Admin-atlas-cerulean-candle`:

- **root** — administration only, not used by the app.
- **`pos_uat_app`** — `readWrite` scoped to `pos-uat-db`, `authSource=pos-uat-db`.
  This is the only credential the application holds.

### TLS

A private CA signs a server certificate for the container. The certificate's
SAN **must include `IP:37.60.226.84`**, because clients connect by IP rather
than hostname and verification fails without an IP SAN.

- Server: `--tlsMode requireTLS`, combined cert+key PEM,
  `--tlsAllowConnectionsWithoutCertificates` (clients authenticate with SCRAM,
  not client certificates).
- Client: `tls=true` plus `tlsCAFile` pointing at the CA certificate.
- The CA **certificate** is public information and is committed to the repo at
  `certs/pos-uat-ca.crt`. The CA **private key** never lands on the VPS or in
  the repo; it is used once for signing and then stored outside the project.

Connection string shape:

```
mongodb://pos_uat_app:<password>@37.60.226.84:27019/pos-uat-db
  ?replicaSet=rs0&authSource=pos-uat-db&tls=true&tlsCAFile=<path>
```

## Code Changes

The current code has no TLS CA support and cannot connect to this server as-is.

| File | Change |
|---|---|
| `src/online-server/db/mongo.cjs` | Pass `tlsCAFile` to `MongoClient` when configured. |
| `src/online-server/config.cjs` | Add `mongoTlsCaFile`, resolving packaged vs. development paths. |
| `scripts/write-online-runtime-config.cjs` | Emit `MONGODB_TLS_CA_FILE`. |
| `package.json` (`build.extraResources`) | Ship the CA certificate alongside `online-runtime-config.json`. |
| `.env.online.example` | Document `MONGODB_TLS_CA_FILE`. |

Path resolution is the subtle part: in a packaged Electron app the CA resolves
under `process.resourcesPath`, not `__dirname`, and must sit **outside** the
asar archive because OpenSSL reads it from disk rather than through Electron's
virtual filesystem.

These changes are additive and backward compatible. When `MONGODB_TLS_CA_FILE`
is unset the driver options are unchanged, so existing Atlas connections and
current release builds behave exactly as before.

## Data Flow: Migration

1. `mongodump` from Atlas (read-only) to a local archive.
2. Transfer the archive to the VPS.
3. `mongorestore` with `--nsFrom='POSmaster.*' --nsTo='pos-uat-db.*'` to rename
   the database in flight.
4. Restore **before** enabling `requireTLS`, so a restore failure and a TLS
   failure cannot be confused with one another.
5. Enable TLS and verify. Because TLS is passed as `mongod` flags, this
   recreates the container rather than restarting it; the named volume persists,
   so no data is lost and the restore is not repeated.

Ordering constraint: the container must be initialised in the sequence
*start with root credentials → `rs.initiate()` → create `pos_uat_app` →
restore → enable TLS*. Creating the first user relies on the localhost
exception, and `rs.initiate()` must precede any transactional access.

Volume is small (~10k documents across 31 collections), so the restore runs in
seconds.

## Error Handling and Rollback

**Rollback is a one-line revert.** Atlas is never written to; `.env.online` is
backed up before being repointed. Restoring the backup returns the system to
Atlas with no other action required.

Failure modes considered:

| Failure | Detection | Response |
|---|---|---|
| `mongod` won't start | Container exits on boot | Almost always keyfile permissions (must be `chmod 400`, owned by the `mongodb` user) |
| Clients can't resolve the replica set | Driver times out on server selection | `rs.conf()` member host is wrong — must be `37.60.226.84:27019` |
| TLS verification fails | Driver reports certificate error | SAN is missing `IP:37.60.226.84` |
| Transactions silently disabled | `/health` reports `transactionsSupported: false` | `rs.initiate()` did not run or did not take |
| Host memory pressure | OOM killer terminates a container | Confirm `--wiredTigerCacheSizeGB` took effect |

## Testing

The acceptance gate is **`GET /health` returning `transactionsSupported: true`**
(`routes/health.cjs`). That single field proves the replica set is live and that
UAT exercises the same code path as Atlas.

1. Collection-by-collection count comparison against the Atlas baseline
   captured on 2026-07-17: `sales` 432, `tea_coop_members` 5,152, `categories`
   1,115, `domain_events` 2,047, `sessions` 542, `users` 19, `items` 48,
   `stock_batches` 42, `branches` 6 (31 collections total).
2. Document-shape spot check on `sales` and `items`.
3. `/health` reports `transactionsSupported: true`.
4. `scripts/verify-online-runtime.cjs` passes.
5. Application launch: log in, load catalog, complete one sale through the
   transactional path.

## Configuration and Cutover

Only `.env.online` on the development machine is repointed:

- `MONGODB_URI` → the UAT connection string
- `MONGODB_DB` → `pos-uat-db`
- `MONGODB_TLS_CA_FILE` → path to the CA certificate
- `JWT_SECRET` → a freshly generated value

The GitHub Actions `MONGODB_URI` secret is **not** changed, so shipped releases
continue to use Atlas. This keeps UAT parallel rather than a replacement.

`JWT_SECRET` is currently the literal placeholder
`replace-with-a-long-random-secret`, which `config.cjs` accepts because it only
rejects empty values. UAT gets a generated secret instead. This invalidates the
542 migrated session documents — correct behaviour for UAT, and they are stale
development sessions.

## Security Notes

Two accepted risks, recorded as decisions rather than oversights.

**Port 27019 will be internet-facing on a host with no firewall.** UFW is
inactive and the iptables INPUT policy is ACCEPT; `shared-mongodb` (27017),
`shared-mongodb-2` (27018) and MySQL (3306) are already exposed, protected only
by their credentials. Auth plus TLS matches the posture Atlas provides minus its
IP allowlist. If UAT testers turn out to have stable IPs, `DOCKER-USER` iptables
rules would close most of this exposure. Note that UFW alone would **not** work:
Docker publishes ports through its own iptables chain, which is evaluated before
UFW's INPUT rules.

**UAT will hold 5,152 Tea Coop member records** on a shared host alongside other
clients' containers. The source data is classed as development/staging, so a
straight copy was chosen. If any of those records originated from the live
`api.teacoop.lk` sync, anonymising names and identifiers during restore is a
contained follow-up.

## Out of Scope

- Changing what shipped/production clients connect to.
- Enabling a firewall on the VPS, or re-securing the existing exposed
  `shared-mongodb`, `shared-mongodb-2`, and MySQL ports.
- Rotating the Atlas credentials or the VPS root password.
- The broader architectural issue that every Electron client holds full
  database credentials, because `online-runtime-config.json` is bundled into the
  installer. UAT inherits this; it is not made worse by this work.
- Anonymising UAT data.
- Backups or a refresh-from-Atlas routine for the UAT database.
