const http = require('http');
const { config } = require('./config.cjs');
const { connectMongo, closeMongo } = require('./db/mongo.cjs');
const { createApp } = require('./app.cjs');
const { createRealtimeServer } = require('./realtime/hub.cjs');

let runtime = null;

async function startOnlineServer() {
    if (runtime?.server?.listening) {
        return runtime;
    }

    let server = null;
    try {
        await connectMongo();

        const app = createApp();
        server = http.createServer(app);
        const io = createRealtimeServer(server);

        await new Promise((resolve, reject) => {
            const onError = (error) => {
                server.off('listening', onListening);
                reject(error);
            };
            const onListening = () => {
                server.off('error', onError);
                resolve();
            };

            server.once('error', onError);
            server.once('listening', onListening);
            server.listen(config.port, config.host);
        });

        runtime = { server, io, config };
        console.log(`[OnlineAPI] Listening on http://${config.host}:${config.port}`);
        console.log(`[OnlineAPI] MongoDB database: ${config.mongoDbName}`);
        return runtime;
    } catch (error) {
        if (server) {
            server.close(() => {});
        }
        await closeMongo().catch(() => {});
        runtime = null;
        throw error;
    }
}

async function stopOnlineServer() {
    const activeRuntime = runtime;
    runtime = null;

    if (activeRuntime?.server) {
        await new Promise((resolve) => {
            activeRuntime.server.close(() => resolve());
        });
    }

    await closeMongo();
}

function getOnlineServerRuntime() {
    return runtime;
}

module.exports = {
    startOnlineServer,
    stopOnlineServer,
    getOnlineServerRuntime
};
