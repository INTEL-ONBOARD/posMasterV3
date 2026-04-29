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
    ONLINE_API_CORS_ORIGIN: optionalEnv('ONLINE_API_CORS_ORIGIN', '*'),
    POS_ONLINE_CLIENT_HOST: optionalEnv('POS_ONLINE_CLIENT_HOST', '127.0.0.1'),
    MONGODB_URI: requiredEnv('MONGODB_URI'),
    MONGODB_DB: optionalEnv('MONGODB_DB', 'POSmaster'),
    JWT_SECRET: requiredEnv('JWT_SECRET'),
    JWT_EXPIRES_IN: optionalEnv('JWT_EXPIRES_IN', '8h'),
    POS_ORG_ID: optionalEnv('POS_ORG_ID', 'default-org')
};

const outputPath = path.join(__dirname, '..', 'online-runtime-config.json');
fs.writeFileSync(outputPath, `${JSON.stringify(config, null, 2)}\n`);

console.log(`[build] Wrote ${path.basename(outputPath)} with keys: ${Object.keys(config).join(', ')}`);
