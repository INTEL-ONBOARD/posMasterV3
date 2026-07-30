# Central POSMaster API — deployment

Containerized deployment on the on-prem host (`37.60.226.84`), alongside the
other Docker services. Two containers, managed by `docker compose` in
`/opt/posmaster`:

- **`posmaster-api`** — the online server (`src/online-server`), published on
  **port 4100** (HTTPS, self-signed cert the desktop trusts).
- **`posmaster-mongo`** — a dedicated **MongoDB (mongo:7)**, **internal only**
  (no published ports), running as a **single-node replica set `rs0`** so
  multi-document transactions work (sales/inventory require them). Auth on;
  data in the `posmaster_mongo_data` volume.

## Files on the host (`/opt/posmaster`, none in git)

- `.env.online` (chmod 600) — API secrets: `MONGODB_URI` (points at
  `posmaster-mongo`), `JWT_SECRET`, TLS paths, `NODE_ENV=production`,
  `ONLINE_API_CORS_ORIGIN=file://`. `TEA_COOP_*` still need real values.
- `.env` (chmod 600) — `MONGO_ROOT_USER` / `MONGO_ROOT_PASSWORD` for the mongo
  container (compose variable substitution).
- `mongo-keyfile` (chmod 400, uid 999) — replica-set auth keyfile.
- `certs/` — internal CA (`pos-ca.pem`, 10y) + server cert (`server.crt`, IP in
  SAN). CA private key (`ca.key`) never leaves the server.
- `.atlas_uri` — the previous Atlas connection string, kept for rollback.

## Deploy / update the API
```bash
rsync -az package.json package-lock.json root@37.60.226.84:/opt/posmaster/
rsync -az --delete src/online-server/ root@37.60.226.84:/opt/posmaster/src/online-server/
ssh root@37.60.226.84 'cd /opt/posmaster && docker compose up -d --build'
```

## Verify
```bash
curl --cacert deploy/pos-ca.pem https://37.60.226.84:4100/api/ready
# expect: {"status":"success","data":{"ready":true,"transactionsSupported":true}}
```

## DATABASE — on-prem, not Atlas

The API now uses the on-prem `posmaster-mongo`, not MongoDB Atlas. The data was
migrated with a `mongodump | mongorestore` stream (10,365 docs, 31 collections).

> **CUTOVER CAVEAT (important).** The tills still run old builds that write to
> **Atlas** until they are updated to v1.7.0. So the on-prem DB is a **snapshot**
> taken at migration time — sales made on Atlas afterward are **not** in it. The
> authoritative data copy MUST be redone at the moment the tills cut over:
> in a short maintenance window, drop the on-prem `POSmaster`, take a **fresh**
> Atlas dump, restore it, then install v1.7.0 on the tills. Otherwise sales made
> between the snapshot and cutover are lost.

Re-sync from Atlas (run at cutover):
```bash
ssh root@37.60.226.84 'cd /opt/posmaster
  ATLAS=$(cat .atlas_uri); MPASS=$(grep ^MONGO_ROOT_PASSWORD= .env | cut -d= -f2-)
  docker exec posmaster-mongo mongosh -u posmaster -p "$MPASS" --authenticationDatabase admin POSmaster --eval "db.dropDatabase()"
  docker exec -e A="$ATLAS" -e M="$MPASS" posmaster-mongo sh -c \
    "mongodump --uri=\"\$A\" --db=POSmaster --archive --gzip | mongorestore --uri=\"mongodb://posmaster:\$M@localhost:27017/?authSource=admin&replicaSet=rs0\" --archive --gzip"'
```

Rollback the API to Atlas (if needed):
```bash
ssh root@37.60.226.84 'cd /opt/posmaster
  sed -i "s#^MONGODB_URI=.*#MONGODB_URI=$(cat .atlas_uri)#" .env.online
  docker compose up -d posmaster-api'
```

## Notes
- `deploy/pos-ca.pem` is the PUBLIC CA cert (safe to commit); the CA private key
  and the mongo password exist only on the server.
- Host firewall is currently open; only 4100 needs to be reachable. Mongo is not
  published, so it is not internet-exposed.
