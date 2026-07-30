const { startOnlineServer, stopOnlineServer } = require('./runtime.cjs');
const { createLogger } = require('./utils/logger.cjs');

const logger = createLogger('OnlineAPI');
process.on('uncaughtException', (error) => {
    logger.error(error.message, { stack: error.stack });
});
process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error(error.message, { stack: error.stack });
});

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
