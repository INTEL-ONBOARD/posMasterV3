require('dotenv').config({ path: '.env.online' });
require('dotenv').config();

function requireEnv(name, fallback = null) {
    const value = process.env[name] ?? fallback;
    if (value === null || value === undefined || value === '') {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

function optionalInt(name, fallback) {
    const value = process.env[name];
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) {
        throw new Error(`Invalid integer environment variable: ${name}`);
    }
    return parsed;
}

function resolveJwtSecret() {
    const explicit = process.env.JWT_SECRET;
    const isProduction = (process.env.NODE_ENV || 'development') === 'production';
    const generateHint = 'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"';

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

    if (isProduction) {
        throw new Error(`JWT_SECRET is required in production. Generate one with: ${generateHint}`);
    }

    return 'dev-only-change-this-secret';
}

function resolveMongoUri() {
    const explicit = process.env.MONGODB_URI;
    if (explicit) return explicit;

    const isProduction = (process.env.NODE_ENV || 'development') === 'production';
    if (isProduction) {
        throw new Error('MONGODB_URI is required in production — refusing to silently fall back to a local MongoDB that will not exist on a customer machine.');
    }

    return 'mongodb://127.0.0.1:27017';
}

const config = {
    host: process.env.ONLINE_API_HOST || '0.0.0.0',
    port: optionalInt('ONLINE_API_PORT', 4100),
    corsOrigin: process.env.ONLINE_API_CORS_ORIGIN || 'file://,http://localhost:5173,http://localhost:5174',
    mongoUri: resolveMongoUri(),
    mongoDbName: requireEnv('MONGODB_DB', 'POSmaster'),
    jwtSecret: resolveJwtSecret(),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
    defaultOrgId: process.env.POS_ORG_ID || 'default-org',
    tlsCertFile: process.env.POS_TLS_CERT_FILE || '',
    tlsKeyFile: process.env.POS_TLS_KEY_FILE || '',
    teaCoopApiUrl: process.env.TEA_COOP_API_URL || 'https://api.teacoop.lk/api/v1',
    teaCoopApiToken: process.env.TEA_COOP_API_TOKEN || '',
    teaCoopAuthPath: process.env.TEA_COOP_AUTH_PATH || '/thirdPartyLogin',
    teaCoopUsername: process.env.TEA_COOP_USERNAME || '',
    teaCoopPassword: process.env.TEA_COOP_PASSWORD || '',
    teaCoopMembersPath: process.env.TEA_COOP_MEMBERS_PATH || '/members/thirdparty-all-members-current-month',
    teaCoopPaymentsPath: process.env.TEA_COOP_PAYMENTS_PATH || '/members/{memberId}/thirdparty-monthly-payment',
    nodeEnv: process.env.NODE_ENV || 'development'
};

module.exports = { config };
