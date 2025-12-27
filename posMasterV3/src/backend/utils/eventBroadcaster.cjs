/**
 * Event Broadcaster
 *
 * Utility for broadcasting events from the backend to the frontend renderer.
 * Uses Electron's BrowserWindow.webContents.send() to push events.
 */

const { BrowserWindow } = require('electron');

/**
 * Broadcast a data change event to all renderer windows
 * @param {string} table - The table that changed (e.g., 'items', 'stock')
 * @param {string} operation - The operation type ('INSERT', 'UPDATE', 'DELETE')
 * @param {string|number} recordId - The ID of the affected record
 * @param {object} record - The record data (optional for DELETE)
 */
function broadcastDataChange(table, operation, recordId, record = null) {
    try {
        const windows = BrowserWindow.getAllWindows();
        const payload = {
            table,
            operation,
            recordId,
            record,
            timestamp: new Date().toISOString()
        };

        for (const win of windows) {
            if (win && win.webContents && !win.isDestroyed()) {
                win.webContents.send('data:changed', payload);
            }
        }

        console.log(`[EventBroadcaster] Broadcast: ${operation} on ${table} (ID: ${recordId})`);
    } catch (error) {
        console.error('[EventBroadcaster] Failed to broadcast data change:', error.message);
    }
}

/**
 * Broadcast a sync status change event to all renderer windows
 * @param {object} status - Sync status object
 */
function broadcastSyncStatus(status) {
    try {
        const windows = BrowserWindow.getAllWindows();
        const payload = {
            ...status,
            timestamp: new Date().toISOString()
        };

        for (const win of windows) {
            if (win && win.webContents && !win.isDestroyed()) {
                win.webContents.send('sync:status-changed', payload);
            }
        }
    } catch (error) {
        console.error('[EventBroadcaster] Failed to broadcast sync status:', error.message);
    }
}

/**
 * Broadcast a custom event to all renderer windows
 * @param {string} channel - The IPC channel name
 * @param {object} data - The data to send
 */
function broadcastEvent(channel, data) {
    try {
        const windows = BrowserWindow.getAllWindows();

        for (const win of windows) {
            if (win && win.webContents && !win.isDestroyed()) {
                win.webContents.send(channel, data);
            }
        }
    } catch (error) {
        console.error(`[EventBroadcaster] Failed to broadcast ${channel}:`, error.message);
    }
}

/**
 * Broadcast session kicked event to all renderer windows
 * Used for single-device enforcement
 * @param {object} data - { userId, deviceName, message }
 */
function broadcastSessionKicked(data) {
    try {
        const windows = BrowserWindow.getAllWindows();
        const payload = {
            ...data,
            timestamp: new Date().toISOString()
        };

        for (const win of windows) {
            if (win && win.webContents && !win.isDestroyed()) {
                win.webContents.send('session:kicked', payload);
            }
        }

        console.log(`[EventBroadcaster] Session kicked broadcast: ${data.message || 'Session ended'}`);
    } catch (error) {
        console.error('[EventBroadcaster] Failed to broadcast session kicked:', error.message);
    }
}

/**
 * Broadcast connection status change to all renderer windows
 * @param {object} status - { isOnline, quality, lastCheck }
 */
function broadcastConnectionStatus(status) {
    try {
        const windows = BrowserWindow.getAllWindows();
        const payload = {
            ...status,
            timestamp: new Date().toISOString()
        };

        for (const win of windows) {
            if (win && win.webContents && !win.isDestroyed()) {
                win.webContents.send('connection:status-changed', payload);
            }
        }
    } catch (error) {
        console.error('[EventBroadcaster] Failed to broadcast connection status:', error.message);
    }
}

/**
 * Broadcast immediate data refresh notification
 * Used to trigger UI refresh after critical operations
 * @param {string} table - The table that needs refresh
 * @param {string} reason - Reason for refresh (e.g., 'cloud_sync', 'local_update')
 */
function broadcastRefreshNeeded(table, reason = 'update') {
    try {
        const windows = BrowserWindow.getAllWindows();
        const payload = {
            table,
            reason,
            timestamp: new Date().toISOString()
        };

        for (const win of windows) {
            if (win && win.webContents && !win.isDestroyed()) {
                win.webContents.send('data:refresh-needed', payload);
            }
        }

        console.log(`[EventBroadcaster] Refresh needed: ${table} (${reason})`);
    } catch (error) {
        console.error('[EventBroadcaster] Failed to broadcast refresh needed:', error.message);
    }
}

module.exports = {
    broadcastDataChange,
    broadcastSyncStatus,
    broadcastEvent,
    broadcastSessionKicked,
    broadcastConnectionStatus,
    broadcastRefreshNeeded
};
