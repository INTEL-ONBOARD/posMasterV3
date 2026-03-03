/**
 * Sync Service
 *
 * Handles synchronization between local SQLite and cloud API.
 * Implements offline-first approach with queue-based sync.
 *
 * Strategy: Pull-first-then-push
 * - Always pull incoming changes from cloud FIRST
 * - Then push local queued changes to cloud
 */

const axios = require('axios');
const { getSyncQueueRepository, getUserRepository } = require('../repositories/index.cjs');
const { nowISO } = require('../utils/helpers.cjs');

// Default cloud API URL (can be overridden)
const DEFAULT_CLOUD_URL = 'https://posmasterv3-backend.onrender.com';

class SyncService {
    constructor(cloudBaseUrl = DEFAULT_CLOUD_URL) {
        this.cloudBaseUrl = cloudBaseUrl;
        this.syncQueueRepo = getSyncQueueRepository();
        this.userRepo = getUserRepository();
        this.isOnline = true;
        this.isSyncing = false;
    }

    /**
     * Set the cloud API base URL
     * @param {string} url - Cloud API URL
     */
    setCloudUrl(url) {
        this.cloudBaseUrl = url;
    }

    /**
     * Check if cloud is reachable
     * @returns {Promise<boolean>}
     */
    async checkConnectivity() {
        try {
            await axios.get(`${this.cloudBaseUrl}/health`, { timeout: 5000 });
            this.isOnline = true;
            return true;
        } catch (error) {
            this.isOnline = false;
            return false;
        }
    }

    /**
     * Process pending sync queue items using pull-first-then-push strategy
     * @param {string} token - Auth token for cloud API
     * @returns {Object} Sync result
     */
    async processSyncQueue(token) {
        if (this.isSyncing) {
            return {
                success: false,
                message: 'Sync already in progress'
            };
        }

        this.isSyncing = true;

        const results = {
            pulled: 0,
            processed: 0,
            succeeded: 0,
            failed: 0,
            errors: []
        };

        try {
            // Check connectivity first
            const online = await this.checkConnectivity();
            if (!online) {
                return {
                    success: false,
                    message: 'No connection to cloud server',
                    offline: true
                };
            }

            // STEP 1: PULL from cloud FIRST - Get latest changes before pushing
            console.log('[SyncService] Step 1: Pulling latest data from cloud first...');
            const pullResult = await this._pullUsers({
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            });
            results.pulled = pullResult.updated || 0;
            console.log(`[SyncService] Pulled ${results.pulled} user updates from cloud`);

            // STEP 2: PUSH local queued changes to cloud
            // Get pending items
            const pendingItems = this.syncQueueRepo.getNextPending(20);

            if (pendingItems.length === 0) {
                return {
                    success: true,
                    message: `Sync completed: Pulled ${results.pulled} updates, no pending items to push`,
                    ...results
                };
            }

            console.log(`[SyncService] Step 2: Pushing ${pendingItems.length} pending items to cloud...`);

            for (const item of pendingItems) {
                results.processed++;
                this.syncQueueRepo.markProcessing(item.id);

                try {
                    await this._processItem(item, token);
                    this.syncQueueRepo.markCompleted(item.id);
                    results.succeeded++;

                    // Update entity sync status
                    this._updateEntitySyncStatus(item, 'synced');

                } catch (error) {
                    console.error(`[SyncService] Failed to sync item ${item.id}:`, error.message);
                    this.syncQueueRepo.markFailed(item.id, error.message);
                    results.failed++;
                    results.errors.push({
                        itemId: item.id,
                        entityType: item.entity_type,
                        operation: item.operation,
                        error: error.message
                    });
                }
            }

            return {
                success: true,
                message: `Sync completed: Pulled ${results.pulled} updates, pushed ${results.succeeded}/${results.processed} items`,
                ...results
            };

        } catch (error) {
            console.error('[SyncService] Sync error:', error.message);
            return {
                success: false,
                message: 'Sync failed: ' + error.message,
                ...results
            };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Process a single sync queue item
     * @param {Object} item - Sync queue item
     * @param {string} token - Auth token
     * @private
     */
    async _processItem(item, token) {
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const axiosConfig = {
            headers,
            timeout: 30000
        };

        switch (item.entity_type) {
            case 'user':
                await this._syncUser(item, axiosConfig);
                break;
            // Add more entity types as needed
            default:
                throw new Error(`Unknown entity type: ${item.entity_type}`);
        }
    }

    /**
     * Sync user entity
     * @param {Object} item - Sync queue item
     * @param {Object} axiosConfig - Axios config
     * @private
     */
    async _syncUser(item, axiosConfig) {
        const { operation, payload } = item;

        switch (operation) {
            case 'create':
                await axios.post(
                    `${this.cloudBaseUrl}/api/users/register`,
                    payload,
                    axiosConfig
                );
                break;

            case 'update':
                await axios.put(
                    `${this.cloudBaseUrl}/api/users/${payload.cloud_id}`,
                    payload,
                    axiosConfig
                );
                break;

            case 'delete':
            case 'deactivate':
                await axios.delete(
                    `${this.cloudBaseUrl}/api/users/${payload.cloud_id}`,
                    axiosConfig
                );
                break;

            case 'password_change':
                await axios.post(
                    `${this.cloudBaseUrl}/api/users/${payload.user_id}/change-password`,
                    { new_password: payload.new_password },
                    axiosConfig
                );
                break;

            case 'update_roles':
                await axios.put(
                    `${this.cloudBaseUrl}/api/users/${payload.cloud_id}/roles`,
                    { roles: payload.roles },
                    axiosConfig
                );
                break;

            default:
                throw new Error(`Unknown user operation: ${operation}`);
        }
    }

    /**
     * Update entity sync status after successful sync
     * @param {Object} item - Sync queue item
     * @param {string} status - New status
     * @private
     */
    _updateEntitySyncStatus(item, status) {
        switch (item.entity_type) {
            case 'user':
                this.userRepo.updateSyncStatus(item.entity_id, status);
                break;
            // Add more entity types as needed
        }
    }

    /**
     * Pull latest data from cloud for a specific entity type
     * @param {string} entityType - Entity type to pull
     * @param {string} token - Auth token
     * @returns {Object} Pull result
     */
    async pullFromCloud(entityType, token) {
        try {
            const online = await this.checkConnectivity();
            if (!online) {
                return {
                    success: false,
                    message: 'No connection to cloud server',
                    offline: true
                };
            }

            const headers = {
                'Content-Type': 'application/json'
            };

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            switch (entityType) {
                case 'users':
                    return await this._pullUsers(headers);
                // Add more entity types as needed
                default:
                    return {
                        success: false,
                        message: `Unknown entity type: ${entityType}`
                    };
            }

        } catch (error) {
            console.error(`[SyncService] Pull ${entityType} error:`, error.message);
            return {
                success: false,
                message: `Failed to pull ${entityType}: ` + error.message
            };
        }
    }

    /**
     * Pull users from cloud
     * @param {Object} headers - Request headers
     * @returns {Object}
     * @private
     */
    async _pullUsers(headers) {
        const response = await axios.get(
            `${this.cloudBaseUrl}/api/users`,
            { headers, timeout: 30000 }
        );

        const cloudUsers = response.data.data || response.data || [];
        let imported = 0;
        let updated = 0;

        for (const cloudUser of cloudUsers) {
            // Note: We can't sync passwords from cloud for security
            // Users will need to re-enter password or reset
            const existing = this.userRepo.findByCloudId(cloudUser._id);

            if (existing) {
                // Update existing
                this.userRepo.update(existing.id, {
                    cloud_id: cloudUser._id,
                    username: cloudUser.username,
                    email: cloudUser.email,
                    full_name: cloudUser.full_name,
                    roles: JSON.stringify(cloudUser.roles || []),
                    sync_status: 'synced',
                    synced_at: nowISO()
                });
                updated++;
            } else {
                // Note: Without password, we create a placeholder
                // User will need to log in via cloud first
                console.log(`[SyncService] Skipping new user ${cloudUser.email} - no local password`);
            }
        }

        return {
            success: true,
            message: `Pulled users: ${updated} updated`,
            updated,
            imported
        };
    }

    /**
     * Get sync status overview
     * @returns {Object}
     */
    getSyncStatus() {
        const queueStats = this.syncQueueRepo.getStats();

        return {
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            queue: queueStats,
            lastCheck: nowISO()
        };
    }

    /**
     * Force retry all failed items
     * @returns {Object}
     */
    retryFailed() {
        const count = this.syncQueueRepo.retryFailed();
        return {
            success: true,
            message: `${count} items queued for retry`
        };
    }

    /**
     * Clean up old completed items
     * @param {number} daysOld - Days to keep
     * @returns {Object}
     */
    cleanup(daysOld = 7) {
        const deleted = this.syncQueueRepo.cleanupCompleted(daysOld);
        return {
            success: true,
            message: `${deleted} old items cleaned up`
        };
    }
}

module.exports = SyncService;
