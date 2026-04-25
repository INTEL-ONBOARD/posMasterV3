const http = require('http');
const { config } = require('./config.cjs');
const { connectMongo, closeMongo } = require('./db/mongo.cjs');
const { createApp } = require('./app.cjs');
const { createRealtimeServer } = require('./realtime/hub.cjs');

async function start() {
    await connectMongo();

    const app = createApp();
    const server = http.createServer(app);
    createRealtimeServer(server);

    server.listen(config.port, config.host, () => {
        console.log(`[OnlineAPI] Listening on http://${config.host}:${config.port}`);
        console.log(`[OnlineAPI] MongoDB database: ${config.mongoDbName}`);
    });

    const shutdown = async () => {
        console.log('[OnlineAPI] Shutting down...');
        server.close(async () => {
            await closeMongo();
            process.exit(0);
        });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

start().catch((error) => {
    console.error('[OnlineAPI] Failed to start:', error);
    process.exit(1);
});
