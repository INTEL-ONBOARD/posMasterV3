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

const config = {
    host: process.env.ONLINE_API_HOST || '0.0.0.0',
    port: optionalInt('ONLINE_API_PORT', 4100),
    corsOrigin: process.env.ONLINE_API_CORS_ORIGIN || '*',
    mongoUri: requireEnv('MONGODB_URI', 'mongodb://127.0.0.1:27017'),
    mongoDbName: requireEnv('MONGODB_DB', 'POSmaster'),
    jwtSecret: requireEnv('JWT_SECRET', 'dev-only-change-this-secret'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
    defaultOrgId: process.env.POS_ORG_ID || 'default-org',
    teaCoopApiUrl: process.env.TEA_COOP_API_URL || '',
    teaCoopApiToken: process.env.TEA_COOP_API_TOKEN || '',
    teaCoopMembersPath: process.env.TEA_COOP_MEMBERS_PATH || '/members',
    teaCoopPaymentsPath: process.env.TEA_COOP_PAYMENTS_PATH || '/payments',
    nodeEnv: process.env.NODE_ENV || 'development'
};

module.exports = { config };
