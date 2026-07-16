# POS UAT Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up `pos-uat-db` — a dedicated UAT MongoDB on the project VPS, seeded from a read-only copy of the current Atlas data — and point local development at it over TLS.

**Architecture:** A `mongo:8.0` container on 37.60.226.84 runs as a **single-node replica set** (not a standalone), because `db/mongo.cjs` gates transaction support on replica-set topology and five services branch on that flag. Auth is SCRAM with an app user scoped to `pos-uat-db`; transport is TLS verified against a private CA whose certificate ships with the app. Data is copied with `mongodump`/`mongorestore` and renamed in flight. Atlas is read-only throughout and remains the database for shipped releases.

**Tech Stack:** Docker, `mongo:8.0`, OpenSSL, MongoDB Database Tools (`mongodump`/`mongorestore`, already installed via Homebrew), Node 22 built-in test runner (`node:test` — no new dependencies), `mongodb` Node driver v7, electron-builder `extraResources`.

**Design doc:** `docs/plans/2026-07-17-pos-uat-db-design.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **Image:** `mongo:8.0` — matches Atlas 8.x (wire version 25). AVX confirmed present on the host.
- **Port:** `27019`, inside the container *and* published. 27017/27018 are taken by `shared-mongodb` / `shared-mongodb-2`.
- **Replica set:** name `rs0`, single member, host **must** be `37.60.226.84:27019` — never the container hostname, or clients cannot resolve it.
- **Cache cap:** `--wiredTigerCacheSizeGB 0.5` on every `docker run`. The default would claim ~5 GB on this 11 GiB host, which has **no swap** and 19 other containers.
- **Keyfile:** required whenever auth and `--replSet` are combined. Must be `chmod 400` and owned by uid `999` (the `mongodb` user in the official image), or `mongod` refuses to start.
- **Certificate SAN:** must include `IP:37.60.226.84`. Clients connect by IP; without an IP SAN, verification fails.
- **Atlas is read-only.** Never write to `atlas-cerulean-candle` / `POSmaster`. The only Atlas operation in this plan is `mongodump`.
- **CA certificate** is committed at `certs/pos-uat-ca.crt` (public information). The **CA private key, server key, keyfile, and all passwords never enter the repo** — they live in `~/.pos-uat-secrets` (chmod 700).
- **Do not change** the GitHub Actions `MONGODB_URI` secret. Shipped releases stay on Atlas.
- **Repo paths:** repo root is `/Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3`; the app lives in its `posMasterV3/` subdirectory. All `npm` commands run from the app subdirectory.
- **VPS access:** `sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84`. Export `VPS_ROOT_PW` in your shell from the value in `.claude/settings.local.json`; do not paste it into files.

**Atlas baseline counts** (captured 2026-07-17, for verification in Task 3):

| Collection | Count | Collection | Count |
|---|---|---|---|
| tea_coop_members | 5152 | sales | 432 |
| domain_events | 2047 | login_history | 234 |
| categories | 1115 | tea_coop_payments | 200 |
| sessions | 542 | stock_movements | 101 |
| restock_transactions | 87 | items | 48 |
| stock_batches | 42 | inventory_transfers | 41 |
| invoice_counters | 29 | sales_items | 28 |
| users | 19 | restock_items | 18 |
| units_of_measurement | 16 | app_settings | 14 |
| user_settings | 11 | disposed_items | 7 |
| payment_methods | 7 | branches | 6 |
| branch_item_shares | 6 | suppliers | 5 |
| return_items | 2 | organizations | 1 |
| offers | 1 | inventory_counters | 1 |
| audit_events | 0 | inventory_units | 0 |
| tea_coop_sync_runs | 0 | | |

Total: **31 collections**, ~10k documents.

---

### Task 1: Generate the private CA, server certificate, and keyfile

**Files:**
- Create: `certs/pos-uat-ca.crt` (committed — public information)
- Create: `~/.pos-uat-secrets/*` (never committed)

**Interfaces:**
- Produces: `certs/pos-uat-ca.crt` (CA cert, consumed by Task 5 and Task 6), `~/.pos-uat-secrets/pos-uat-server.pem` (combined cert+key for `mongod`, consumed by Task 4), `~/.pos-uat-secrets/pos-uat-keyfile` (replica-set internal auth, consumed by Task 2), `~/.pos-uat-secrets/root.pw` and `~/.pos-uat-secrets/app.pw` (consumed by Tasks 2-6).

- [ ] **Step 1: Create the secrets directory**

```bash
mkdir -p ~/.pos-uat-secrets && chmod 700 ~/.pos-uat-secrets
cd ~/.pos-uat-secrets
```

- [ ] **Step 2: Generate the passwords**

Alphanumeric only — this deliberately avoids `/`, `+`, `=` and other characters that would need percent-encoding inside a MongoDB connection URI.

```bash
openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 32 > ~/.pos-uat-secrets/root.pw
openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 32 > ~/.pos-uat-secrets/app.pw
openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 48 > ~/.pos-uat-secrets/jwt.secret
chmod 600 ~/.pos-uat-secrets/*.pw ~/.pos-uat-secrets/jwt.secret
wc -c ~/.pos-uat-secrets/root.pw ~/.pos-uat-secrets/app.pw ~/.pos-uat-secrets/jwt.secret
```

Expected: `32`, `32`, `48` bytes respectively.

- [ ] **Step 3: Generate the CA**

```bash
cd ~/.pos-uat-secrets
openssl genrsa -out pos-uat-ca.key 4096
openssl req -x509 -new -nodes -key pos-uat-ca.key -sha256 -days 3650 \
  -subj "/CN=POS UAT CA/O=Revo-infosurv" \
  -out pos-uat-ca.crt
```

Expected: `pos-uat-ca.key` and `pos-uat-ca.crt` exist.

- [ ] **Step 4: Generate the server key and CSR**

```bash
cd ~/.pos-uat-secrets
openssl genrsa -out pos-uat-server.key 4096
openssl req -new -key pos-uat-server.key \
  -subj "/CN=37.60.226.84/O=Revo-infosurv" \
  -out pos-uat-server.csr
```

- [ ] **Step 5: Write the SAN extension file**

`localhost`/`127.0.0.1` are included so that `mongosh` running *inside* the container can also verify the certificate in Task 4.

```bash
cat > ~/.pos-uat-secrets/san.cnf <<'EOF'
subjectAltName = IP:37.60.226.84, IP:127.0.0.1, DNS:localhost
extendedKeyUsage = serverAuth
keyUsage = digitalSignature, keyEncipherment
EOF
```

- [ ] **Step 6: Sign the server certificate**

```bash
cd ~/.pos-uat-secrets
openssl x509 -req -in pos-uat-server.csr \
  -CA pos-uat-ca.crt -CAkey pos-uat-ca.key -CAcreateserial \
  -out pos-uat-server.crt -days 825 -sha256 -extfile san.cnf
```

- [ ] **Step 7: Verify the SAN contains the IP**

This is the single most common cause of TLS failure in this build — check it now, not in Task 4.

```bash
openssl x509 -in ~/.pos-uat-secrets/pos-uat-server.crt -noout -text | grep -A1 "Subject Alternative Name"
```

Expected output contains: `IP Address:37.60.226.84, IP Address:127.0.0.1, DNS:localhost`

- [ ] **Step 8: Verify the chain**

```bash
openssl verify -CAfile ~/.pos-uat-secrets/pos-uat-ca.crt ~/.pos-uat-secrets/pos-uat-server.crt
```

Expected: `pos-uat-server.crt: OK`

- [ ] **Step 9: Build the combined PEM for mongod**

`mongod` requires certificate and key concatenated in a single file.

```bash
cd ~/.pos-uat-secrets
cat pos-uat-server.crt pos-uat-server.key > pos-uat-server.pem
chmod 600 pos-uat-server.pem
grep -c "BEGIN" pos-uat-server.pem
```

Expected: `2` (one CERTIFICATE block, one PRIVATE KEY block).

- [ ] **Step 10: Generate the replica-set keyfile**

```bash
openssl rand -base64 756 > ~/.pos-uat-secrets/pos-uat-keyfile
chmod 400 ~/.pos-uat-secrets/pos-uat-keyfile
wc -c ~/.pos-uat-secrets/pos-uat-keyfile
```

Expected: `1024` bytes (approximately — base64 of 756 bytes plus newlines).

- [ ] **Step 11: Copy the CA certificate into the repo**

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3/posMasterV3
mkdir -p certs
cp ~/.pos-uat-secrets/pos-uat-ca.crt certs/pos-uat-ca.crt
openssl x509 -in certs/pos-uat-ca.crt -noout -subject
```

Expected: `subject=CN=POS UAT CA, O=Revo-infosurv`

- [ ] **Step 12: Confirm no private material is staged**

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3
git status --short
```

Expected: only `?? posMasterV3/certs/` appears. If any `.key`, `.pem`, `.pw`, or keyfile shows up, **stop** — it means files were created inside the repo instead of `~/.pos-uat-secrets`.

- [ ] **Step 13: Commit the CA certificate**

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3
git add posMasterV3/certs/pos-uat-ca.crt
git commit -m "feat: add pos-uat CA certificate

Public CA certificate used to verify the pos-uat-db MongoDB server.
The CA private key is held outside the repo and never deployed."
```

---

### Task 2: Provision pos-uat-mongo as a single-node replica set

**Files:**
- Create (on VPS): `/opt/pos-uat/secrets/pos-uat-keyfile`, `/opt/pos-uat/secrets/pos-uat-server.pem`, `/opt/pos-uat/secrets/pos-uat-ca.crt`

**Interfaces:**
- Consumes: `~/.pos-uat-secrets/pos-uat-keyfile`, `root.pw`, `app.pw` (Task 1).
- Produces: a running `pos-uat-mongo` container with replica set `rs0` initiated, root user `posuatroot`, and app user `pos_uat_app` holding `readWrite` on `pos-uat-db`. Consumed by Tasks 3, 4, 6.

- [ ] **Step 1: Export the VPS password into your shell**

Read the password from `.claude/settings.local.json` and type it at the prompt. `read -s` keeps it out of the document, out of your shell history, and out of the terminal scrollback. Every later step reads `$VPS_ROOT_PW` from the environment, so it is never written to disk.

```bash
read -rsp "VPS root password: " VPS_ROOT_PW && export VPS_ROOT_PW && echo
sshpass -p "$VPS_ROOT_PW" ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20 \
  root@37.60.226.84 'echo CONNECTED; hostname'
```

Expected: `CONNECTED` then `vmi3321398`

If you open a new terminal partway through this plan, re-run this step — the export does not persist.

- [ ] **Step 2: Create the secrets directory on the VPS and copy the material**

```bash
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 'mkdir -p /opt/pos-uat/secrets && chmod 700 /opt/pos-uat/secrets'
sshpass -p "$VPS_ROOT_PW" scp ~/.pos-uat-secrets/pos-uat-keyfile ~/.pos-uat-secrets/pos-uat-server.pem ~/.pos-uat-secrets/pos-uat-ca.crt root@37.60.226.84:/opt/pos-uat/secrets/
```

- [ ] **Step 3: Fix keyfile ownership and permissions**

uid/gid 999 is the `mongodb` user inside the official image. `mongod` exits at startup if the keyfile is group- or world-readable.

```bash
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 '
chown 999:999 /opt/pos-uat/secrets/pos-uat-keyfile /opt/pos-uat/secrets/pos-uat-server.pem
chmod 400 /opt/pos-uat/secrets/pos-uat-keyfile
chmod 400 /opt/pos-uat/secrets/pos-uat-server.pem
chmod 444 /opt/pos-uat/secrets/pos-uat-ca.crt
ls -la /opt/pos-uat/secrets/
'
```

Expected: `pos-uat-keyfile` shows `-r-------- 1 999 999`.

- [ ] **Step 4: Confirm port 27019 is free**

```bash
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 'ss -lntp | grep 27019 || echo "27019 FREE"'
```

Expected: `27019 FREE`

- [ ] **Step 5: Start the container (no TLS yet)**

TLS is deliberately deferred to Task 4 so that a restore failure and a TLS failure cannot be mistaken for each other.

```bash
ROOT_PW=$(cat ~/.pos-uat-secrets/root.pw)
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 "
docker run -d --name pos-uat-mongo \
  --restart unless-stopped \
  -p 0.0.0.0:27019:27019 \
  -v pos-uat-mongo-data:/data/db \
  -v /opt/pos-uat/secrets:/etc/pos-uat:ro \
  -e MONGO_INITDB_ROOT_USERNAME=posuatroot \
  -e MONGO_INITDB_ROOT_PASSWORD='$ROOT_PW' \
  mongo:8.0 \
  --replSet rs0 \
  --port 27019 \
  --bind_ip_all \
  --keyFile /etc/pos-uat/pos-uat-keyfile \
  --wiredTigerCacheSizeGB 0.5
"
```

- [ ] **Step 6: Verify the container survived startup**

The image pulls and the entrypoint creates the root user, so allow a few seconds before checking.

```bash
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 '
sleep 15
docker ps --filter name=pos-uat-mongo --format "{{.Names}} {{.Status}}"
echo "--- last log lines ---"
docker logs pos-uat-mongo 2>&1 | tail -5
'
```

Expected: status shows `Up`. If the container is missing or restarting, read the full log — the overwhelmingly likely cause is keyfile permissions (Step 3).

- [ ] **Step 7: Initiate the replica set**

The member host **must** be the public address. `mongod` advertises this to clients; the container hostname would be unresolvable from your laptop.

```bash
ROOT_PW=$(cat ~/.pos-uat-secrets/root.pw)
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 "
docker exec pos-uat-mongo mongosh --port 27019 \
  -u posuatroot -p '$ROOT_PW' --authenticationDatabase admin --quiet --eval '
rs.initiate({_id: \"rs0\", members: [{_id: 0, host: \"37.60.226.84:27019\"}]})
'"
```

Expected: `{ ok: 1 }`

- [ ] **Step 8: Verify the node reached PRIMARY and reports setName**

`setName` is precisely what `mongo.cjs:67-71` reads to decide whether transactions are available. If this is empty, the whole point of the design is lost.

```bash
ROOT_PW=$(cat ~/.pos-uat-secrets/root.pw)
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 "
sleep 10
docker exec pos-uat-mongo mongosh --port 27019 \
  -u posuatroot -p '$ROOT_PW' --authenticationDatabase admin --quiet --eval '
const h = db.adminCommand({hello: 1});
print(\"setName: \" + h.setName);
print(\"isWritablePrimary: \" + h.isWritablePrimary);
print(\"me: \" + h.me);
'"
```

Expected:
```
setName: rs0
isWritablePrimary: true
me: 37.60.226.84:27019
```

- [ ] **Step 9: Create the application user**

Scoped to `pos-uat-db` only — the app never holds root, unlike the current Atlas arrangement.

```bash
ROOT_PW=$(cat ~/.pos-uat-secrets/root.pw)
APP_PW=$(cat ~/.pos-uat-secrets/app.pw)
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 "
docker exec pos-uat-mongo mongosh --port 27019 \
  -u posuatroot -p '$ROOT_PW' --authenticationDatabase admin --quiet --eval '
db.getSiblingDB(\"pos-uat-db\").createUser({
  user: \"pos_uat_app\",
  pwd: \"$APP_PW\",
  roles: [{role: \"readWrite\", db: \"pos-uat-db\"}]
})
'"
```

Expected: `{ ok: 1 }`

- [ ] **Step 10: Verify the app user can authenticate**

```bash
APP_PW=$(cat ~/.pos-uat-secrets/app.pw)
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 "
docker exec pos-uat-mongo mongosh --port 27019 \
  -u pos_uat_app -p '$APP_PW' --authenticationDatabase pos-uat-db --quiet \
  --eval 'db.getSiblingDB(\"pos-uat-db\").runCommand({ping: 1})'
"
```

Expected: `{ ok: 1 }`

- [ ] **Step 11: Verify the cache cap took effect**

```bash
ROOT_PW=$(cat ~/.pos-uat-secrets/root.pw)
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 "
docker exec pos-uat-mongo mongosh --port 27019 \
  -u posuatroot -p '$ROOT_PW' --authenticationDatabase admin --quiet --eval '
print(db.serverStatus().wiredTiger.cache[\"maximum bytes configured\"])
'"
```

Expected: `536870912` (512 MB). If this reads in the multi-gigabyte range, the flag did not apply — fix before continuing, or this box risks OOM-killing another client's database.

---

### Task 3: Migrate Atlas POSmaster to pos-uat-db

**Files:**
- Create: `/tmp/posmaster-2026-07-17.archive` (local, transient)

**Interfaces:**
- Consumes: the running container from Task 2; `MONGODB_URI` in `.env.online`, which still points at Atlas at this stage.
- Produces: `pos-uat-db` populated with all 31 collections.

- [ ] **Step 1: Confirm the dump tooling exists**

```bash
mongodump --version | head -1
```

Expected: `mongodump version: <x.y.z>`. If missing: `brew install mongodb-database-tools`.

- [ ] **Step 2: Dump from Atlas (read-only)**

Reads the URI out of `.env.online` rather than hardcoding the credential.

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3/posMasterV3
ATLAS_URI=$(grep '^MONGODB_URI=' .env.online | cut -d= -f2-)
mongodump --uri="$ATLAS_URI" --db=POSmaster \
  --archive=/tmp/posmaster-2026-07-17.archive --gzip
```

Expected: `done dumping POSmaster.<collection>` lines, ending with no errors.

- [ ] **Step 3: Verify the archive exists and is non-trivial**

```bash
ls -lh /tmp/posmaster-2026-07-17.archive
```

Expected: a file of at least a few hundred KB.

- [ ] **Step 4: Transfer the archive to the VPS**

```bash
sshpass -p "$VPS_ROOT_PW" scp /tmp/posmaster-2026-07-17.archive root@37.60.226.84:/opt/pos-uat/
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 'ls -lh /opt/pos-uat/posmaster-2026-07-17.archive'
```

- [ ] **Step 5: Copy the archive into the container**

```bash
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 '
docker cp /opt/pos-uat/posmaster-2026-07-17.archive pos-uat-mongo:/tmp/restore.archive
'
```

- [ ] **Step 6: Restore, renaming the database in flight**

`--nsFrom`/`--nsTo` rewrites `POSmaster.*` to `pos-uat-db.*` during the restore.

```bash
ROOT_PW=$(cat ~/.pos-uat-secrets/root.pw)
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 "
docker exec pos-uat-mongo mongorestore --port 27019 \
  -u posuatroot -p '$ROOT_PW' --authenticationDatabase admin \
  --archive=/tmp/restore.archive --gzip \
  --nsFrom='POSmaster.*' --nsTo='pos-uat-db.*'
"
```

Expected: ends with a line reporting documents restored and `0 document(s) failed to restore`.

- [ ] **Step 7: Verify collection counts against the Atlas baseline**

```bash
ROOT_PW=$(cat ~/.pos-uat-secrets/root.pw)
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 "
docker exec pos-uat-mongo mongosh --port 27019 \
  -u posuatroot -p '$ROOT_PW' --authenticationDatabase admin --quiet --eval '
const d = db.getSiblingDB(\"pos-uat-db\");
const names = d.getCollectionNames().sort();
print(\"collections: \" + names.length);
names.forEach(c => print(\"  \" + c.padEnd(28) + d.getCollection(c).countDocuments()));
'"
```

Expected: `collections: 31`, with counts matching the Global Constraints baseline table exactly — `tea_coop_members 5152`, `sales 432`, `users 19`, `categories 1115`, `domain_events 2047`, `sessions 542`, and so on.

- [ ] **Step 8: Spot-check document shape**

Count parity alone would not catch a corrupted restore.

```bash
ROOT_PW=$(cat ~/.pos-uat-secrets/root.pw)
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 "
docker exec pos-uat-mongo mongosh --port 27019 \
  -u posuatroot -p '$ROOT_PW' --authenticationDatabase admin --quiet --eval '
const d = db.getSiblingDB(\"pos-uat-db\");
printjson(d.sales.findOne({}, {invoiceNo: 1, orgId: 1, branchId: 1, createdAt: 1}));
printjson(d.items.findOne({}, {sku: 1, orgId: 1}));
printjson(d.users.findOne({}, {username: 1, roles: 1, orgId: 1}));
'"
```

Expected: real documents with populated `orgId` (`default-org`), a non-null `invoiceNo`, an `sku`, and a `roles` array.

- [ ] **Step 9: Clean up the transferred archive**

It contains a full copy of the dataset and has no reason to persist on a shared host.

```bash
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 '
rm -f /opt/pos-uat/posmaster-2026-07-17.archive
docker exec pos-uat-mongo rm -f /tmp/restore.archive
echo "archives removed"
'
rm -f /tmp/posmaster-2026-07-17.archive
```

---

### Task 4: Enable TLS on the container

**Files:**
- No repo files. Recreates the `pos-uat-mongo` container with TLS flags.

**Interfaces:**
- Consumes: `/opt/pos-uat/secrets/pos-uat-server.pem` and `pos-uat-ca.crt` (placed in Task 2); the populated volume from Task 3.
- Produces: `pos-uat-mongo` listening with `requireTLS` on 27019. Consumed by Task 6.

- [ ] **Step 1: Recreate the container with TLS flags**

TLS is set via `mongod` flags, so the container must be **recreated**, not restarted. The named volume `pos-uat-mongo-data` persists, so the Task 3 restore is not repeated. `MONGO_INITDB_ROOT_*` is intentionally dropped — those only apply to an empty volume.

`--tlsAllowConnectionsWithoutCertificates` lets clients authenticate with SCRAM instead of client certificates; the replica set still authenticates internally via the keyfile.

```bash
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 '
docker rm -f pos-uat-mongo
docker run -d --name pos-uat-mongo \
  --restart unless-stopped \
  -p 0.0.0.0:27019:27019 \
  -v pos-uat-mongo-data:/data/db \
  -v /opt/pos-uat/secrets:/etc/pos-uat:ro \
  mongo:8.0 \
  --replSet rs0 \
  --port 27019 \
  --bind_ip_all \
  --keyFile /etc/pos-uat/pos-uat-keyfile \
  --wiredTigerCacheSizeGB 0.5 \
  --tlsMode requireTLS \
  --tlsCertificateKeyFile /etc/pos-uat/pos-uat-server.pem \
  --tlsCAFile /etc/pos-uat/pos-uat-ca.crt \
  --tlsAllowConnectionsWithoutCertificates
'
```

- [ ] **Step 2: Verify the container is up**

```bash
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 '
sleep 15
docker ps --filter name=pos-uat-mongo --format "{{.Names}} {{.Status}}"
docker logs pos-uat-mongo 2>&1 | tail -5
'
```

Expected: `Up`. A crash loop here points at the PEM — check it is `chmod 400`, owned by 999, and contains both blocks (Task 1 Step 9).

- [ ] **Step 3: Verify TLS is required (a plaintext connection must fail)**

```bash
ROOT_PW=$(cat ~/.pos-uat-secrets/root.pw)
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 "
docker exec pos-uat-mongo mongosh --port 27019 \
  -u posuatroot -p '$ROOT_PW' --authenticationDatabase admin --quiet \
  --eval 'db.runCommand({ping: 1})' 2>&1 | tail -3
"
```

Expected: a **failure** — a connection/handshake error. A success here means `requireTLS` did not apply.

- [ ] **Step 4: Verify a TLS connection succeeds and data survived**

```bash
ROOT_PW=$(cat ~/.pos-uat-secrets/root.pw)
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 "
docker exec pos-uat-mongo mongosh --host 127.0.0.1 --port 27019 \
  --tls --tlsCAFile /etc/pos-uat/pos-uat-ca.crt \
  -u posuatroot -p '$ROOT_PW' --authenticationDatabase admin --quiet --eval '
print(\"setName: \" + db.adminCommand({hello: 1}).setName);
print(\"sales: \" + db.getSiblingDB(\"pos-uat-db\").sales.countDocuments());
'"
```

Expected:
```
setName: rs0
sales: 432
```

Both facts matter: `rs0` proves the replica set survived recreation, and `432` proves the volume retained the restore.

- [ ] **Step 5: Verify the app user can connect over TLS from your laptop**

This is the first end-to-end proof across the public internet, using the same driver the app itself uses. The script is written to `/tmp` and deleted in the next step — it must not land in the repo, because it reads a password.

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3/posMasterV3
cat > /tmp/uat-tls-check.cjs <<'EOF'
const { MongoClient } = require('mongodb');
const fs = require('fs');
const pw = fs.readFileSync(process.env.HOME + '/.pos-uat-secrets/app.pw', 'utf8').trim();
const uri = `mongodb://pos_uat_app:${pw}@37.60.226.84:27019/pos-uat-db`
  + `?replicaSet=rs0&authSource=pos-uat-db&tls=true`;
(async () => {
  const client = new MongoClient(uri, {
    tls: true,
    tlsCAFile: process.cwd() + '/certs/pos-uat-ca.crt'
  });
  await client.connect();
  const db = client.db('pos-uat-db');
  const hello = await db.admin().command({ hello: 1 });
  console.log('setName:', hello.setName);
  console.log('sales:', await db.collection('sales').countDocuments());
  await client.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
EOF
NODE_PATH=./node_modules node /tmp/uat-tls-check.cjs
```

Expected:
```
setName: rs0
sales: 432
```

If this reports a certificate error, the SAN is wrong (Task 1 Step 7). If it hangs on server selection, `rs.conf()` has the wrong member host (Task 2 Step 7).

- [ ] **Step 6: Clean up the check script**

```bash
rm -f /tmp/uat-tls-check.cjs
```

---

### Task 5: Add TLS CA support to the online-server

The app cannot currently connect to a server requiring a private-CA certificate — `mongo.cjs` passes only `appName`. This task adds that, unit-tested with Node's built-in runner.

**Files:**
- Create: `src/online-server/db/resolve-ca-path.cjs`
- Create: `src/online-server/db/resolve-ca-path.test.cjs`
- Create: `src/online-server/db/mongo-options.cjs`
- Create: `src/online-server/db/mongo-options.test.cjs`
- Modify: `src/online-server/db/mongo.cjs:1-2,14-16`
- Modify: `src/online-server/config.cjs:22-39`
- Modify: `scripts/write-online-runtime-config.cjs:21-22`
- Modify: `package.json` (`scripts.test`, `build.extraResources`)
- Modify: `.env.online.example`

**Interfaces:**
- Consumes: `certs/pos-uat-ca.crt` (Task 1).
- Produces: `resolveCaFilePath(value, opts) -> string|null` and `buildMongoClientOptions(cfg) -> object`; `config.mongoTlsCaFile` (string|null), read by Task 6.

Two pure modules are extracted rather than editing `config.cjs` inline, because `config.cjs` calls `requireEnv` at module load and throws without a full environment — that would make it untestable in isolation.

- [ ] **Step 1: Write the failing test for CA path resolution**

Create `src/online-server/db/resolve-ca-path.test.cjs`:

```js
const { test } = require('node:test');
const assert = require('node:assert');
const { resolveCaFilePath } = require('./resolve-ca-path.cjs');

test('returns null when no value is configured', () => {
    assert.strictEqual(resolveCaFilePath('', { projectRoot: '/app' }), null);
    assert.strictEqual(resolveCaFilePath(undefined, { projectRoot: '/app' }), null);
});

test('returns an absolute path unchanged', () => {
    const result = resolveCaFilePath('/etc/pos/ca.crt', { projectRoot: '/app' });
    assert.strictEqual(result, '/etc/pos/ca.crt');
});

test('resolves a relative path against projectRoot when not packaged', () => {
    const result = resolveCaFilePath('certs/pos-uat-ca.crt', {
        resourcesPath: null,
        projectRoot: '/app'
    });
    assert.strictEqual(result, '/app/certs/pos-uat-ca.crt');
});

test('prefers resourcesPath when the packaged file exists', () => {
    const result = resolveCaFilePath('certs/pos-uat-ca.crt', {
        resourcesPath: '/Applications/POS.app/Contents/Resources',
        projectRoot: '/app',
        fileExists: (p) => p === '/Applications/POS.app/Contents/Resources/certs/pos-uat-ca.crt'
    });
    assert.strictEqual(result, '/Applications/POS.app/Contents/Resources/certs/pos-uat-ca.crt');
});

test('falls back to projectRoot when resourcesPath lacks the file', () => {
    const result = resolveCaFilePath('certs/pos-uat-ca.crt', {
        resourcesPath: '/Applications/POS.app/Contents/Resources',
        projectRoot: '/app',
        fileExists: () => false
    });
    assert.strictEqual(result, '/app/certs/pos-uat-ca.crt');
});
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3/posMasterV3
node --test src/online-server/db/resolve-ca-path.test.cjs
```

Expected: FAIL — `Cannot find module './resolve-ca-path.cjs'`

- [ ] **Step 3: Write the minimal implementation**

Create `src/online-server/db/resolve-ca-path.cjs`:

```js
const path = require('path');
const fs = require('fs');

function resolveCaFilePath(value, options = {}) {
    if (!value) return null;
    if (path.isAbsolute(value)) return value;

    const {
        resourcesPath = null,
        projectRoot,
        fileExists = fs.existsSync
    } = options;

    if (resourcesPath) {
        const packaged = path.join(resourcesPath, value);
        if (fileExists(packaged)) return packaged;
    }

    return path.join(projectRoot, value);
}

module.exports = { resolveCaFilePath };
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3/posMasterV3
node --test src/online-server/db/resolve-ca-path.test.cjs
```

Expected: PASS — `# pass 5`, `# fail 0`

- [ ] **Step 5: Write the failing test for client options**

Create `src/online-server/db/mongo-options.test.cjs`:

```js
const { test } = require('node:test');
const assert = require('node:assert');
const { buildMongoClientOptions } = require('./mongo-options.cjs');

test('always sets the appName', () => {
    const options = buildMongoClientOptions({ mongoTlsCaFile: null });
    assert.strictEqual(options.appName, 'posmasterv3-online');
});

test('omits tls options when no CA file is configured', () => {
    const options = buildMongoClientOptions({ mongoTlsCaFile: null });
    assert.strictEqual(options.tls, undefined);
    assert.strictEqual(options.tlsCAFile, undefined);
});

test('enables tls and passes the CA path when configured', () => {
    const options = buildMongoClientOptions({ mongoTlsCaFile: '/app/certs/pos-uat-ca.crt' });
    assert.strictEqual(options.tls, true);
    assert.strictEqual(options.tlsCAFile, '/app/certs/pos-uat-ca.crt');
});
```

- [ ] **Step 6: Run the test to verify it fails**

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3/posMasterV3
node --test src/online-server/db/mongo-options.test.cjs
```

Expected: FAIL — `Cannot find module './mongo-options.cjs'`

- [ ] **Step 7: Write the minimal implementation**

Create `src/online-server/db/mongo-options.cjs`:

```js
function buildMongoClientOptions(cfg) {
    const options = { appName: 'posmasterv3-online' };

    if (cfg.mongoTlsCaFile) {
        options.tls = true;
        options.tlsCAFile = cfg.mongoTlsCaFile;
    }

    return options;
}

module.exports = { buildMongoClientOptions };
```

- [ ] **Step 8: Run the test to verify it passes**

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3/posMasterV3
node --test src/online-server/db/mongo-options.test.cjs
```

Expected: PASS — `# pass 3`, `# fail 0`

- [ ] **Step 9: Add the test script to package.json**

In `package.json`, add to `"scripts"` immediately after `"lint": "eslint .",`:

```json
    "test": "node --test src/",
```

- [ ] **Step 10: Run the whole suite**

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3/posMasterV3
npm test
```

Expected: `# pass 8`, `# fail 0`

- [ ] **Step 11: Commit the tested units**

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3
git add posMasterV3/src/online-server/db/resolve-ca-path.cjs \
        posMasterV3/src/online-server/db/resolve-ca-path.test.cjs \
        posMasterV3/src/online-server/db/mongo-options.cjs \
        posMasterV3/src/online-server/db/mongo-options.test.cjs \
        posMasterV3/package.json
git commit -m "feat: add mongo TLS CA path resolution and client options

Pure, unit-tested helpers for building MongoClient options with an
optional private-CA certificate. Uses the Node 22 built-in test runner,
so no test dependency is added."
```

- [ ] **Step 12: Wire the CA path into config.cjs**

In `src/online-server/config.cjs`, add these two requires below the existing `dotenv` lines at the top:

```js
const path = require('path');
const { resolveCaFilePath } = require('./db/resolve-ca-path.cjs');
```

Then add this entry to the `config` object, immediately after the `mongoDbName` line:

```js
    mongoTlsCaFile: resolveCaFilePath(process.env.MONGODB_TLS_CA_FILE, {
        resourcesPath: process.resourcesPath || null,
        projectRoot: path.join(__dirname, '..', '..')
    }),
```

`__dirname` is `src/online-server`, so `../..` is the app root — meaning a relative `certs/pos-uat-ca.crt` resolves correctly in development. `process.resourcesPath` is defined only under Electron, so it is `null` when running via `npm run online:dev`.

- [ ] **Step 13: Wire the options builder into mongo.cjs**

In `src/online-server/db/mongo.cjs`, add below the existing requires at lines 1-2:

```js
const { buildMongoClientOptions } = require('./mongo-options.cjs');
```

Then replace the `client = new MongoClient(...)` call (lines 14-16) with:

```js
        client = new MongoClient(config.mongoUri, buildMongoClientOptions(config));
```

- [ ] **Step 14: Emit the new key from the build config writer**

In `scripts/write-online-runtime-config.cjs`, add to the `config` object immediately after the `MONGODB_DB` line:

```js
    MONGODB_TLS_CA_FILE: optionalEnv('MONGODB_TLS_CA_FILE', ''),
```

`optionalEnv`, not `requiredEnv` — production release builds target Atlas, which needs no custom CA, and this must not break them.

- [ ] **Step 15: Ship the CA with packaged builds**

In `package.json`, extend `build.extraResources` to:

```json
    "extraResources": [
      {
        "from": "online-runtime-config.json",
        "to": "online-runtime-config.json"
      },
      {
        "from": "certs/pos-uat-ca.crt",
        "to": "certs/pos-uat-ca.crt"
      }
    ],
```

`extraResources` places the file outside the asar archive, which is required: OpenSSL reads the CA from the real filesystem and cannot see inside asar.

- [ ] **Step 16: Document the new key**

In `.env.online.example`, add immediately after the `MONGODB_DB=POSmaster` line:

```
# Optional. Path to a CA certificate for MongoDB servers using a private CA
# (e.g. the pos-uat-db UAT server). Relative paths resolve against the app root
# in development and against the packaged resources directory in builds.
# Leave empty for MongoDB Atlas, which uses a public CA.
MONGODB_TLS_CA_FILE=
```

- [ ] **Step 17: Verify nothing regressed for Atlas**

`.env.online` still points at Atlas at this stage and sets no `MONGODB_TLS_CA_FILE`, so this proves the change is backward compatible.

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3/posMasterV3
npm test && npm run lint && npm run verify:online
```

Expected: tests pass, lint clean, and `[verify:online] OK`.

- [ ] **Step 18: Commit the wiring**

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3
git add posMasterV3/src/online-server/config.cjs \
        posMasterV3/src/online-server/db/mongo.cjs \
        posMasterV3/scripts/write-online-runtime-config.cjs \
        posMasterV3/package.json \
        posMasterV3/.env.online.example
git commit -m "feat: support MONGODB_TLS_CA_FILE for private-CA mongo servers

Lets the online-server verify a MongoDB server signed by a private CA,
which pos-uat-db requires. Additive and backward compatible: when the
variable is unset the driver options are unchanged, so Atlas connections
and existing release builds are unaffected."
```

---

### Task 6: Repoint local development at pos-uat-db

**Files:**
- Modify: `.env.online` (gitignored — this change is never committed)
- Create: `.env.online.atlas.bak` (gitignored — the rollback path)

**Interfaces:**
- Consumes: everything from Tasks 1-5.
- Produces: a development environment running against `pos-uat-db`.

- [ ] **Step 1: Back up the current Atlas configuration**

This backup **is** the rollback plan — do not skip it.

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3/posMasterV3
cp .env.online .env.online.atlas.bak
grep -c . .env.online.atlas.bak
```

Expected: `8`

- [ ] **Step 2: Confirm the backup is ignored by git**

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3
git check-ignore -v posMasterV3/.env.online.atlas.bak || echo "NOT IGNORED — STOP"
```

Expected: a match against the `.env.online` rule. If it prints `NOT IGNORED — STOP`, add `.env.online.atlas.bak` to `.gitignore` before continuing — it holds the Atlas credential.

- [ ] **Step 3: Write the UAT configuration**

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3/posMasterV3
APP_PW=$(cat ~/.pos-uat-secrets/app.pw)
JWT=$(cat ~/.pos-uat-secrets/jwt.secret)
cat > .env.online <<EOF
ONLINE_API_PORT=4100
ONLINE_API_HOST=0.0.0.0
ONLINE_API_CORS_ORIGIN=http://localhost:5173
MONGODB_URI=mongodb://pos_uat_app:${APP_PW}@37.60.226.84:27019/pos-uat-db?replicaSet=rs0&authSource=pos-uat-db&tls=true
MONGODB_DB=pos-uat-db
MONGODB_TLS_CA_FILE=certs/pos-uat-ca.crt
JWT_SECRET=${JWT}
JWT_EXPIRES_IN=8h
POS_ORG_ID=default-org
EOF
grep -E '^(MONGODB_DB|MONGODB_TLS_CA_FILE|POS_ORG_ID)=' .env.online
```

Expected:
```
MONGODB_DB=pos-uat-db
MONGODB_TLS_CA_FILE=certs/pos-uat-ca.crt
POS_ORG_ID=default-org
```

`JWT_SECRET` is now a real generated value rather than the `replace-with-a-long-random-secret` placeholder. This invalidates the 542 migrated session documents, which is correct for UAT — they are stale development sessions.

- [ ] **Step 4: Verify the health endpoint reports transaction support**

**This is the acceptance gate for the entire plan.** `transactionsSupported: true` proves the replica set is live and that UAT exercises the same code path as Atlas — rather than the non-transactional fallback in `salesService`, `restockService`, `disposeService`, and `inventoryTransferService`.

In one terminal:

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3/posMasterV3
npm run online:dev
```

In another:

```bash
curl -s http://127.0.0.1:4100/api/health
```

Expected payload containing:
```json
{"online":true,"database":"mongodb","transactionsSupported":true,"realtime":"socket.io"}
```

If `transactionsSupported` is `false`, **stop**. The replica set is not being detected — recheck Task 2 Step 8. Continuing past this point would produce a UAT that silently tests different code than it models.

Stop the dev server before the next step.

- [ ] **Step 5: Run the full online smoke suite against UAT**

This writes to `sessions` — which is exactly why it belongs against UAT and not Atlas.

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3/posMasterV3
npm run verify:online
```

Expected: a series of `[verify:online] <route>: <status>` lines, `realtime: connected`, `realtime inactive session: rejected`, ending with `[verify:online] OK`.

- [ ] **Step 6: Confirm Atlas was never modified**

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3/posMasterV3
ATLAS_URI=$(grep '^MONGODB_URI=' .env.online.atlas.bak | cut -d= -f2-)
cat > /tmp/atlas-recheck.cjs <<'EOF'
const { MongoClient } = require('mongodb');
(async () => {
  const client = new MongoClient(process.argv[2]);
  await client.connect();
  const db = client.db('POSmaster');
  console.log('sales:', await db.collection('sales').countDocuments());
  console.log('users:', await db.collection('users').countDocuments());
  await client.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
EOF
NODE_PATH=./node_modules node /tmp/atlas-recheck.cjs "$ATLAS_URI"
rm -f /tmp/atlas-recheck.cjs
```

Expected: `sales: 432`, `users: 19` — unchanged from the baseline, confirming the migration was read-only.

- [ ] **Step 7: Run the application end-to-end**

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3/posMasterV3
npm run dev:all
```

Manually confirm, in order:
1. The app window opens and reaches the login screen.
2. Log in with a migrated user.
3. The catalog loads with items and categories.
4. Complete one sale — this exercises the transactional path in `salesService`.
5. The sale appears in sales history.

- [ ] **Step 8: Confirm the sale landed in UAT and not Atlas**

Definitive proof the cutover is real: the UAT count has grown past the 432 baseline while Atlas has not.

```bash
ROOT_PW=$(cat ~/.pos-uat-secrets/root.pw)
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 "
docker exec pos-uat-mongo mongosh --host 127.0.0.1 --port 27019 \
  --tls --tlsCAFile /etc/pos-uat/pos-uat-ca.crt \
  -u posuatroot -p '$ROOT_PW' --authenticationDatabase admin --quiet --eval '
print(\"uat sales: \" + db.getSiblingDB(\"pos-uat-db\").sales.countDocuments())
'"
```

Expected: `uat sales: 433` (or higher) — greater than the 432 baseline.

- [ ] **Step 9: Commit the plan completion**

Only the design and plan documents are committed; `.env.online` is gitignored and stays local.

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3
git status --short
```

Expected: clean, or showing only untracked gitignored files. **If `.env.online` or any `.pw`, `.key`, or `.pem` file appears as staged or modified, stop and unstage it.**

---

## Rollback

At any point, to return to Atlas:

```bash
cd /Users/kkwenuja/development/Clients/Revo-infosurv/posMasterV3/posMasterV3
cp .env.online.atlas.bak .env.online
npm run verify:online
```

Expected: `[verify:online] OK` against Atlas.

Atlas is never written to by this plan, so no data restoration is required. To remove the UAT server entirely:

```bash
sshpass -p "$VPS_ROOT_PW" ssh root@37.60.226.84 '
docker rm -f pos-uat-mongo
docker volume rm pos-uat-mongo-data
rm -rf /opt/pos-uat
'
```

## Known Follow-ups

Recorded in the design doc as out of scope, and not addressed by this plan:

- Port 27019 is internet-facing on a host with **no firewall** (UFW inactive, iptables INPUT policy ACCEPT). Auth plus TLS matches Atlas's posture minus its IP allowlist. If testers have stable IPs, `DOCKER-USER` iptables rules would close most of the exposure — note that UFW alone would not, because Docker's chain is evaluated first.
- UAT holds 5,152 Tea Coop member records on a shared host. Anonymising them during restore is a contained follow-up.
- No backup or refresh-from-Atlas routine exists for `pos-uat-db`.
- Every Electron client still ships full database credentials inside `online-runtime-config.json`. UAT inherits this; this plan does not worsen it.
