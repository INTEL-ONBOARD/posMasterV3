const http = require('http');
const https = require('https');
const fs = require('fs');
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
        console.log(
            `[OnlineAPI] Starting (env=${config.nodeEnv}, mongoUri=${config.mongoUri.replace(/\/\/([^:]+):[^@]+@/, '//***:***@')}, corsOrigin=${config.corsOrigin})`
        );

        try {
            await connectMongo();
        } catch (mongoError) {
            mongoError.message = `MongoDB connection failed: ${mongoError.message}. Check MONGODB_URI and the Atlas IP allowlist.`;
            throw mongoError;
        }

        const app = createApp();
        // Serve HTTPS directly when a TLS cert/key are configured (the central
        // on-prem deployment uses a self-signed cert the desktop trusts). Falls
        // back to HTTP for local dev and reverse-proxy-terminated setups.
        if (config.tlsCertFile && config.tlsKeyFile) {
            server = https.createServer({
                cert: fs.readFileSync(config.tlsCertFile),
                key: fs.readFileSync(config.tlsKeyFile)
            }, app);
            console.log('[OnlineAPI] TLS enabled (serving HTTPS)');
        } else {
            server = http.createServer(app);
        }
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
