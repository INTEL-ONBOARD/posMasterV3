const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const { config } = require('../config.cjs');

let io = null;

function createRealtimeServer(httpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: config.corsOrigin,
            credentials: true
        }
    });

    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) return next(new Error('Missing auth token'));
            const claims = jwt.verify(token, config.jwtSecret);
            socket.auth = claims;
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

function getRealtimeServer() {
    return io;
}

module.exports = {
    createRealtimeServer,
    emitDomainEvent,
    getRealtimeServer
};
