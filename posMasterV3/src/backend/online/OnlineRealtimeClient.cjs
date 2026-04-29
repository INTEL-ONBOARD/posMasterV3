const { io } = require('socket.io-client');
const { BrowserWindow } = require('electron');

class OnlineRealtimeClient {
    constructor(options = {}) {
        this.baseUrl = options.baseUrl || process.env.POS_ONLINE_REALTIME_URL || 'http://localhost:4100';
        this.socket = null;
    }

    connect(token) {
        this.disconnect();
        if (!token) throw new Error('Cannot connect realtime client without token');

        this.socket = io(this.baseUrl, {
            auth: { token },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000
        });

        this.socket.on('connect', () => this.broadcast('online:realtime-status', {
            connected: true,
            socketId: this.socket.id
        }));
        this.socket.on('disconnect', (reason) => this.broadcast('online:realtime-status', {
            connected: false,
            reason
        }));
        this.socket.on('connect_error', (error) => this.broadcast('online:realtime-status', {
            connected: false,
            error: error.message
        }));
        this.socket.on('domain.event', (event) => this.broadcast('online:domain-event', event));
        this.socket.onAny((eventName, payload) => {
            if (eventName === 'domain.event') return;
            this.broadcast('online:event', { eventName, payload });
        });

        return { connected: this.socket.connected };
    }

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    getStatus() {
        return {
            connected: !!this.socket?.connected,
            socketId: this.socket?.id || null
        };
    }

    broadcast(channel, payload) {
        for (const win of BrowserWindow.getAllWindows()) {
            if (!win.isDestroyed()) {
                win.webContents.send(channel, payload);
            }
        }
    }
}

module.exports = { OnlineRealtimeClient };
