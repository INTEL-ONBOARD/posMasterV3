const fs = require('fs');
const path = require('path');

function requiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required build env: ${name}`);
    }
    return value;
}

function optionalEnv(name, fallback) {
    return process.env[name] || fallback;
}

// Remote/central-server build config. The desktop is a thin client: it holds
// only the server URL, the realtime URL, and the name of the bundled CA cert
// to trust. NO secrets ship to tills — MONGODB_URI, JWT_SECRET, and the
// TEA_COOP credentials live only on the central server (see deploy/README.md).
// POS_TLS_CA_FILE is a bare filename; electron.cjs resolves it to the bundled
// resource path at runtime.
const config = {
    POS_ONLINE_API_URL: requiredEnv('POS_ONLINE_API_URL'),
    POS_ONLINE_REALTIME_URL: requiredEnv('POS_ONLINE_REALTIME_URL'),
    POS_ONLINE_EMBED_SERVER: 'false',
    POS_TLS_CA_FILE: optionalEnv('POS_TLS_CA_FILE', 'pos-ca.pem'),
    POS_ORG_ID: optionalEnv('POS_ORG_ID', 'default-org'),
    // Receipt printing is client-side hardware config, not a secret.
    POS_RECEIPT_PRINTER_MODE: optionalEnv('POS_RECEIPT_PRINTER_MODE', 'auto'),
    POS_RECEIPT_SYSTEM_PRINTER_NAME: optionalEnv('POS_RECEIPT_SYSTEM_PRINTER_NAME', ''),
    POS_RECEIPT_NETWORK_AUTODISCOVERY: optionalEnv('POS_RECEIPT_NETWORK_AUTODISCOVERY', 'true'),
    POS_THERMAL_PRINTER_HOST: optionalEnv('POS_THERMAL_PRINTER_HOST', ''),
    POS_THERMAL_PRINTER_PORT: optionalEnv('POS_THERMAL_PRINTER_PORT', '9100')
};

const outputPath = path.join(__dirname, '..', 'online-runtime-config.json');
fs.writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`);

console.log(`[build] Wrote ${path.basename(outputPath)} (remote mode, no secrets) with keys: ${Object.keys(config).join(', ')}`);
