const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { config } = require('../config.cjs');
const { getDb } = require('../db/mongo.cjs');
const { hashToken } = require('../utils/security.cjs');

let io = null;

function createRealtimeServer(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: config.corsOrigin,
            credentials: true
        }
    });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) return next(new Error('Missing auth token'));
            const claims = jwt.verify(token, config.jwtSecret);
            const tokenHash = hashToken(token);
            const session = await getDb().collection('sessions').findOne({
                tokenHash,
                active: true,
                userId: claims.sub
            });
            if (!session) return next(new Error('Session is no longer active'));
            socket.auth = claims;
            socket.data.tokenHash = tokenHash;
            socket.data.userId = claims.sub;
            return next();
        } catch {
            return next(new Error('Invalid auth token'));
        }
    });

    io.on('connection', (socket) => {
        const { orgId, branchId, sub: userId, roles = [] } = socket.auth;
        socket.join(`org:${orgId}`);
        socket.join(`user:${userId}`);
        if (branchId) socket.join(`branch:${branchId}`);
        for (const role of roles) socket.join(`role:${orgId}:${role}`);

        socket.emit('realtime.connected', {
            orgId,
            branchId: branchId || null,
            userId
        });
    });

    return io;
}

function emitDomainEvent(event) {
    if (!io) return;

    if (event.entity === 'sessions' && event.userId) {
        void disconnectInactiveUserSockets(event.userId);
    }

    if (event.userId) {
        io.to(`user:${event.userId}`).emit(event.event, event);
    }
    if (event.branchId) {
        io.to(`branch:${event.branchId}`).emit(event.event, event);
    } else if (event.orgId) {
        io.to(`org:${event.orgId}`).emit(event.event, event);
    }

    if (event.orgId) {
        io.to(`org:${event.orgId}`).emit('domain.event', event);
    }
}

async function disconnectInactiveUserSockets(userId) {
    try {
        const sockets = await io.in(`user:${userId}`).fetchSockets();
        if (!sockets.length) return;
        const tokenHashes = sockets.map((socket) => socket.data?.tokenHash).filter(Boolean);
        if (!tokenHashes.length) return;

        const active = await getDb().collection('sessions')
            .find({ userId: String(userId), tokenHash: { $in: tokenHashes }, active: true })
            .project({ tokenHash: 1 })
            .toArray();
        const activeHashes = new Set(active.map((session) => session.tokenHash));

        for (const socket of sockets) {
            if (!activeHashes.has(socket.data?.tokenHash)) {
                socket.disconnect(true);
            }
        }
    } catch (error) {
        console.warn('[Realtime] Failed to disconnect inactive sockets:', error?.message || error);
    }
}

function getRealtimeServer() {
    return io;
}

module.exports = {
    createRealtimeServer,
    emitDomainEvent,
    getRealtimeServer
};
