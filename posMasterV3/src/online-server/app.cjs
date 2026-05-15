const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { config } = require('./config.cjs');
const { errorMiddleware } = require('./utils/http.cjs');

const healthRoutes = require('./routes/health.cjs');
const authRoutes = require('./routes/auth.cjs');
const catalogRoutes = require('./routes/catalog.cjs');
const teaCoopRoutes = require('./routes/teaCoop.cjs');

function createApp() {
    const app = express();

    app.use(helmet());
    app.use(cors({
        origin: config.corsOrigin,
        credentials: true
    }));
    app.use(express.json({ limit: '10mb' }));

    app.use('/api', healthRoutes);
    app.use('/api', authRoutes);
    app.use('/api', teaCoopRoutes);
    app.use('/api', catalogRoutes);

    app.use((req, res) => {
        res.status(404).json({ status: 'error', message: 'Route not found' });
    });
    app.use(errorMiddleware);

    return app;
}

module.exports = { createApp };
