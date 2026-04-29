const { startOnlineServer, stopOnlineServer } = require('./runtime.cjs');

async function start() {
    await startOnlineServer();

    const shutdown = async () => {
        console.log('[OnlineAPI] Shutting down...');
        await stopOnlineServer();
        process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}

start().catch((error) => {
    console.error('[OnlineAPI] Failed to start:', error);
    process.exit(1);
});
