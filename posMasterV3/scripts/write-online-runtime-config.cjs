const fs = require('fs');
const path = require('path');

function requiredEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required build secret/env: ${name}`);
    }
    return value;
}

function optionalEnv(name, fallback) {
    return process.env[name] || fallback;
}

const config = {
    ONLINE_API_HOST: optionalEnv('ONLINE_API_HOST', '127.0.0.1'),
    ONLINE_API_PORT: optionalEnv('ONLINE_API_PORT', '4100'),
    ONLINE_API_CORS_ORIGIN: optionalEnv('ONLINE_API_CORS_ORIGIN', 'file://,http://localhost:5173,http://localhost:5174'),
    POS_ONLINE_CLIENT_HOST: optionalEnv('POS_ONLINE_CLIENT_HOST', '127.0.0.1'),
    MONGODB_URI: requiredEnv('MONGODB_URI'),
    MONGODB_DB: optionalEnv('MONGODB_DB', 'POSmaster'),
    JWT_SECRET: requiredEnv('JWT_SECRET'),
    JWT_EXPIRES_IN: optionalEnv('JWT_EXPIRES_IN', '8h'),
    POS_ORG_ID: optionalEnv('POS_ORG_ID', 'default-org'),
    POS_RECEIPT_PRINTER_MODE: optionalEnv('POS_RECEIPT_PRINTER_MODE', 'auto'),
    POS_RECEIPT_SYSTEM_PRINTER_NAME: optionalEnv('POS_RECEIPT_SYSTEM_PRINTER_NAME', ''),
    POS_RECEIPT_NETWORK_AUTODISCOVERY: optionalEnv('POS_RECEIPT_NETWORK_AUTODISCOVERY', 'true'),
    POS_THERMAL_PRINTER_HOST: optionalEnv('POS_THERMAL_PRINTER_HOST', ''),
    POS_THERMAL_PRINTER_PORT: optionalEnv('POS_THERMAL_PRINTER_PORT', '9100'),
    TEA_COOP_API_URL: optionalEnv('TEA_COOP_API_URL', 'https://api.teacoop.lk/api/v1'),
    TEA_COOP_API_TOKEN: optionalEnv('TEA_COOP_API_TOKEN', ''),
    TEA_COOP_AUTH_PATH: optionalEnv('TEA_COOP_AUTH_PATH', '/thirdPartyLogin'),
    TEA_COOP_USERNAME: optionalEnv('TEA_COOP_USERNAME', ''),
    TEA_COOP_PASSWORD: optionalEnv('TEA_COOP_PASSWORD', ''),
    TEA_COOP_MEMBERS_PATH: optionalEnv('TEA_COOP_MEMBERS_PATH', '/members/thirdparty-all-members-current-month'),
    TEA_COOP_PAYMENTS_PATH: optionalEnv('TEA_COOP_PAYMENTS_PATH', '/members/{memberId}/thirdparty-monthly-payment')
};

const outputPath = path.join(__dirname, '..', 'online-runtime-config.json');
fs.writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`);

console.log(`[build] Wrote ${path.basename(outputPath)} with keys: ${Object.keys(config).join(', ')}`);
