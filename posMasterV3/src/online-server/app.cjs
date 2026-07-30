const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config } = require('./config.cjs');
const { errorMiddleware } = require('./utils/http.cjs');

const healthRoutes = require('./routes/health.cjs');
const authRoutes = require('./routes/auth.cjs');
const catalogRoutes = require('./routes/catalog.cjs');
const teaCoopRoutes = require('./routes/teaCoop.cjs');
const reportsRoutes = require('./routes/reports.cjs');

// Origins are known ahead of time: the packaged app loads over file://,
// the dev renderer loads from the Vite dev server. ONLINE_API_CORS_ORIGIN can
// override with a comma-separated list for non-standard deployments.
function resolveCorsOrigin(configuredOrigin) {
    if (configuredOrigin === '*') {
        console.warn('[OnlineAPI] ONLINE_API_CORS_ORIGIN="*" allows any website to call this API with a valid bearer token. Set an explicit origin list in production.');
        return '*';
    }

    const allowed = String(configuredOrigin || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);

    return (origin, callback) => {
        // Requests without an Origin header (curl, server-to-server, the
        // MongoDB health checker) are not browser-CORS requests and are safe to allow.
        if (!origin || allowed.includes(origin)) return callback(null, true);
        return callback(new Error(`Origin not allowed by CORS: ${origin}`));
    };
}

function createApp() {
    const app = express();

    app.use(helmet());
    app.use(cors({
        origin: resolveCorsOrigin(config.corsOrigin),
        credentials: true
    }));
    app.use(express.json({ limit: '10mb' }));

    app.use('/api', healthRoutes);
    app.use('/api', authRoutes);
    app.use('/api', teaCoopRoutes);
    app.use('/api', catalogRoutes);
    app.use('/api', reportsRoutes);

    app.use((req, res) => {
        res.status(404).json({ status: 'error', message: 'Route not found' });
    });
    app.use(errorMiddleware);

    return app;
}

module.exports = { createApp };
