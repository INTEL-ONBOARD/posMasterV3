# Central POSMaster API — deployment

Containerized deployment of the online server (`src/online-server`), running on
the on-prem host alongside the other Docker services.

- **Host:** `37.60.226.84`, published on **port 4100** (HTTPS).
- **TLS:** self-signed cert (`certs/server.crt`) signed by an internal CA
  (`pos-ca.pem`, 10y). The IP is in the cert SAN. The desktop app bundles
  `pos-ca.pem` and trusts it. The CA **private key never leaves the server**.
- **Secrets:** `/opt/posmaster/.env.online` on the host (chmod 600, not in git):
  `MONGODB_URI`, `JWT_SECRET` (strong), TLS paths, `NODE_ENV=production`,
  `ONLINE_API_CORS_ORIGIN=file://`. `TEA_COOP_*` still need real values.
- **DB:** MongoDB Atlas (`POSmaster`). The server IP must be in the Atlas allowlist.

## Deploy / update
```bash
# from repo root, sync context + rebuild
rsync -az package.json package-lock.json root@37.60.226.84:/opt/posmaster/
rsync -az --delete src/online-server/ root@37.60.226.84:/opt/posmaster/src/online-server/
ssh root@37.60.226.84 'cd /opt/posmaster && docker compose up -d --build'
```

## Verify
```bash
curl --cacert deploy/pos-ca.pem https://37.60.226.84:4100/api/ready
```

## Notes
- `deploy/pos-ca.pem` is the PUBLIC CA cert (safe to commit). `certs/ca.key`
  (private) exists only on the server.
- Firewall on the host is currently open; the container publishes 4100 directly.
