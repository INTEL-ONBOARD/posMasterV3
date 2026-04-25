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
 * Broadcast a realtime status change event to all renderer windows
 * @param {object} status - Status object
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
        console.error('[EventBroadcaster] Failed to broadcast realtime status:', error.message);
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
 * @param {string} reason - Reason for refresh (e.g., 'online_refresh', 'local_update')
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

/**
 * Broadcast refresh completion event
 * Called when a refresh cycle completes
 * @param {object} result - Refresh result { success, tablesAffected, recordsUpdated, error }
 */
function broadcastSyncComplete(result) {
    try {
        const windows = BrowserWindow.getAllWindows();
        const payload = {
            ...result,
            syncStatus: result.success ? 'completed' : 'failed',
            timestamp: new Date().toISOString()
        };

        for (const win of windows) {
            if (win && win.webContents && !win.isDestroyed()) {
                win.webContents.send('sync:completed', payload);
                // Also update realtime status
                win.webContents.send('sync:status-changed', {
                    syncStatus: result.success ? 'completed' : 'failed',
                    lastSyncTime: payload.timestamp,
                    isSyncing: false,
                    ...result
                });
            }
        }

        console.log(`[EventBroadcaster] Refresh completed: ${result.success ? 'success' : 'failed'}, ${result.recordsUpdated || 0} records updated`);
    } catch (error) {
        console.error('[EventBroadcaster] Failed to broadcast refresh complete:', error.message);
    }
}

/**
 * Broadcast batch data change event
 * Used when multiple records change at once (e.g., after a bulk refresh)
 * @param {string} table - The table that changed
 * @param {number} count - Number of records affected
 * @param {string} operation - 'SYNC_PULL' | 'BULK_INSERT' | 'BULK_UPDATE' | 'BULK_DELETE'
 */
function broadcastBatchChange(table, count, operation = 'SYNC_PULL') {
    // Skip if no records were actually changed
    if (count === 0) {
        return;
    }

    try {
        const windows = BrowserWindow.getAllWindows();
        const payload = {
            table,
            operation,
            count,
            isBatch: true,
            timestamp: new Date().toISOString()
        };

        for (const win of windows) {
            if (win && win.webContents && !win.isDestroyed()) {
                // Send only data:changed - the frontend DataStore will handle it
                // Don't send both data:changed AND refresh-needed to avoid duplicate refreshes
                win.webContents.send('data:changed', payload);
            }
        }

        console.log(`[EventBroadcaster] Batch change: ${operation} on ${table} (${count} records)`);
    } catch (error) {
        console.error('[EventBroadcaster] Failed to broadcast batch change:', error.message);
    }
}

/**
 * Broadcast multiple table changes at once
 * Used after a bulk refresh when multiple tables are updated
 * @param {Array<{table: string, count: number}>} changes - Array of table changes
 */
function broadcastMultiTableChange(changes) {
    // Filter out tables with no changes
    const actualChanges = changes.filter(c => c.count > 0);
    if (actualChanges.length === 0) {
        return; // No actual changes
    }

    try {
        const windows = BrowserWindow.getAllWindows();
        const payload = {
            changes: actualChanges,
            totalRecords: actualChanges.reduce((sum, c) => sum + (c.count || 0), 0),
            tables: actualChanges.map(c => c.table),
            timestamp: new Date().toISOString()
        };

        for (const win of windows) {
            if (win && win.webContents && !win.isDestroyed()) {
                // Send only multi-table-changed - the frontend DataStore handles it
                // Don't also send individual refresh-needed to avoid duplicate refreshes
                win.webContents.send('sync:multi-table-changed', payload);
            }
        }

        console.log(`[EventBroadcaster] Multi-table change: ${actualChanges.length} tables, ${payload.totalRecords} total records`);
    } catch (error) {
        console.error('[EventBroadcaster] Failed to broadcast multi-table change:', error.message);
    }
}

module.exports = {
    broadcastDataChange,
    broadcastSyncStatus,
    broadcastEvent,
    broadcastSessionKicked,
    broadcastConnectionStatus,
    broadcastRefreshNeeded,
    broadcastSyncComplete,
    broadcastBatchChange,
    broadcastMultiTableChange
};
