/**
 * User Service
 *
 * Handles user management business logic including:
 * - User CRUD operations
 * - User listing and search
 * - Role management
 */

const { getUserRepository, getSyncQueueRepository } = require('../repositories/index.cjs');
const UserRepository = require('../repositories/UserRepository.cjs');

class UserService {
    constructor() {
        this.userRepo = getUserRepository();
        this.syncQueueRepo = getSyncQueueRepository();
    }

    /**
     * Get all users
     * @param {Object} options - Query options
     * @returns {Object} Result with users array
     */
    getAllUsers(options = {}) {
        try {
            const users = this.userRepo.findAllActive();
            const sanitizedUsers = users.map(u => {
                return UserRepository.sanitize(u);
            });

            return {
                success: true,
                status: 'success',
                data: sanitizedUsers,
                total: sanitizedUsers.length
            };

        } catch (error) {
            console.error('[UserService] Get all users error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Failed to fetch users: ' + error.message
            };
        }
    }

    /**
     * Get user by ID
     * @param {string} userId - User ID
     * @returns {Object} Result with user data
     */
    getUserById(userId) {
        try {
            const user = this.userRepo.findById(userId);

            if (!user) {
                return {
                    success: false,
                    status: 'error',
                    message: 'User not found'
                };
            }

            return {
                success: true,
                status: 'success',
                data: UserRepository.sanitize(user)
            };

        } catch (error) {
            console.error('[UserService] Get user error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Failed to fetch user: ' + error.message
            };
        }
    }

    /**
     * Update user
     * @param {string} userId - User ID
     * @param {Object} updateData - Data to update
     * @returns {Object} Result with updated user
     */
    updateUser(userId, updateData) {
        try {
            const existingUser = this.userRepo.findById(userId);

            if (!existingUser) {
                return {
                    success: false,
                    status: 'error',
                    message: 'User not found'
                };
            }

            // Don't allow updating password through this method
            const { password, password_hash, ...safeData } = updateData;

            // Check email format and uniqueness if changing
            if (safeData.email && safeData.email !== existingUser.email) {
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeData.email)) {
                    return {
                        success: false,
                        status: 'error',
                        message: 'Please enter a valid email address'
                    };
                }
                if (this.userRepo.emailExists(safeData.email, userId)) {
                    return {
                        success: false,
                        status: 'error',
                        message: 'Email already in use'
                    };
                }
                safeData.email = safeData.email.toLowerCase();
            }

            // Check username uniqueness if changing
            if (safeData.username && safeData.username !== existingUser.username) {
                if (this.userRepo.usernameExists(safeData.username, userId)) {
                    return {
                        success: false,
                        status: 'error',
                        message: 'Username already in use'
                    };
                }
            }

            // Validate branch_id if provided
            if (safeData.branch_id) {
                const BranchRepository = require('../repositories/BranchRepository.cjs');
                const branchRepo = new BranchRepository();
                const branch = branchRepo.findById(safeData.branch_id);
                if (!branch) {
                    return {
                        success: false,
                        status: 'error',
                        message: 'Selected branch does not exist'
                    };
                }
            }

            // Handle roles serialization
            if (safeData.roles && Array.isArray(safeData.roles)) {
                safeData.roles = JSON.stringify(safeData.roles);
            }

            // Mark as pending sync
            safeData.sync_status = 'pending';

            const updatedUser = this.userRepo.update(userId, safeData);

            // Queue for REST API cloud sync (legacy)
            this.syncQueueRepo.enqueue({
                entity_type: 'user',
                entity_id: userId,
                operation: 'update',
                payload: {
                    cloud_id: existingUser.cloud_id,
                    ...safeData,
                    roles: updatedUser.roles
                },
                priority: 5
            });

            // Immediately push to MySQL cloud (real-time sync)
            try {
                const { getCloudSyncService } = require('./CloudSyncService.cjs');
                const cloudSync = getCloudSyncService();
                if (cloudSync && cloudSync.isOnline && cloudSync.mysqlInitialized) {
                    // Get the full updated user record for syncing (exclude password_hash)
                    const fullUser = this.userRepo.findById(userId);
                    if (fullUser) {
                        const { password_hash: _ph, ...userWithoutHash } = fullUser;
                        // Re-serialize roles if they were parsed
                        const userToSync = {
                            ...userWithoutHash,
                            roles: Array.isArray(fullUser.roles) ? JSON.stringify(fullUser.roles) : fullUser.roles
                        };
                        cloudSync.pushUser(userToSync, false).catch(err => {
                            console.error('[UserService] Cloud push failed (will retry):', err.message);
                        });
                        console.log('[UserService] User update pushed to cloud:', userId);
                    }
                }
            } catch (syncError) {
                console.error('[UserService] Cloud sync error (non-fatal):', syncError.message);
            }

            return {
                success: true,
                status: 'success',
                message: 'User updated successfully',
                data: UserRepository.sanitize(this.userRepo.findById(userId))
            };

        } catch (error) {
            console.error('[UserService] Update user error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Failed to update user: ' + error.message
            };
        }
    }

    /**
     * Reset a user's password (admin action, no current password required)
     * @param {string} userId - User ID
     * @param {string} newPassword - New plain-text password
     * @returns {Object} Result
     */
    async resetPassword(userId, newPassword) {
        try {
            if (!userId || !newPassword) {
                return { success: false, status: 'error', message: 'User ID and new password are required' };
            }

            if (newPassword.length < 6) {
                return { success: false, status: 'error', message: 'Password must be at least 6 characters' };
            }

            const user = this.userRepo.findById(userId);
            if (!user) {
                return { success: false, status: 'error', message: 'User not found' };
            }

            const bcrypt = require('bcryptjs');
            const SALT_ROUNDS = 12;
            const password_hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

            this.userRepo.update(userId, { password_hash });

            // Queue for cloud sync
            this.syncQueueRepo.enqueue({
                entity_type: 'user',
                entity_id: userId,
                operation: 'password_change',
                payload: { user_id: user.cloud_id || userId, new_password_hash: password_hash },
                priority: 10
            });

            // Real-time cloud push
            try {
                const { notifyDataChange } = require('./CloudSyncService.cjs');
                const updatedUser = this.userRepo.findById(userId);
                if (updatedUser) notifyDataChange('users', 'UPDATE', updatedUser, userId);
            } catch (e) { console.error('[UserService] Cloud sync error (non-fatal):', e.message); }

            return { success: true, status: 'success', message: 'Password reset successfully' };

        } catch (error) {
            console.error('[UserService] Reset password error:', error.message);
            return { success: false, status: 'error', message: 'Failed to reset password: ' + error.message };
        }
    }

    /**
     * Delete/deactivate user
     * @param {string} userId - User ID
     * @param {boolean} hardDelete - Whether to permanently delete
     * @returns {Object} Result
     */
    deleteUser(userId, hardDelete = false) {
        try {
            const user = this.userRepo.findById(userId);

            if (!user) {
                return {
                    success: false,
                    status: 'error',
                    message: 'User not found'
                };
            }

            if (hardDelete) {
                // Check if user is referenced in transactions (sales/restock)
                try {
                    const db = this.userRepo.db;
                    const salesRef = db.prepare(
                        `SELECT COUNT(*) as cnt FROM sales_transactions WHERE prepared_by = ? OR authorized_by = ? LIMIT 1`
                    ).get(user.username, user.username);
                    const restockRef = db.prepare(
                        `SELECT COUNT(*) as cnt FROM restock_transactions WHERE prepared_by = ? OR authorized_by = ? LIMIT 1`
                    ).get(user.username, user.username);

                    if ((salesRef?.cnt || 0) > 0 || (restockRef?.cnt || 0) > 0) {
                        // Soft-delete instead to preserve referential integrity
                        this.userRepo.deactivate(userId);
                        return {
                            success: true,
                            status: 'success',
                            message: 'User deactivated (has transaction history — full deletion skipped to preserve records)'
                        };
                    }
                } catch (refErr) {
                    console.warn('[UserService] Referential check failed (non-fatal):', refErr.message);
                }

                // Permanent delete from local DB
                this.userRepo.delete(userId);

                // Delete from cloud — immediate if online, queued if offline
                try {
                    const { getCloudSyncService } = require('./CloudSyncService.cjs');
                    const cloudSync = getCloudSyncService();
                    if (cloudSync) {
                        // queueChange handles both: immediate sync when online, queued when offline
                        cloudSync.queueChange('users', 'DELETE', {}, userId).catch(err => {
                            console.error('[UserService] Cloud delete failed:', err.message);
                        });
                    }
                } catch (syncError) {
                    console.error('[UserService] Cloud delete sync error (non-fatal):', syncError.message);
                }

                return {
                    success: true,
                    status: 'success',
                    message: 'User deleted permanently'
                };
            }

            // Soft delete (deactivate)
            this.userRepo.deactivate(userId);

            // Queue for cloud sync
            this.syncQueueRepo.enqueue({
                entity_type: 'user',
                entity_id: userId,
                operation: 'deactivate',
                payload: {
                    cloud_id: user.cloud_id
                },
                priority: 5
            });

            // Immediately update MySQL cloud (set is_active = 0)
            try {
                const { notifyDataChange } = require('./CloudSyncService.cjs');
                const deactivatedUser = this.userRepo.findById(userId);
                if (deactivatedUser) notifyDataChange('users', 'UPDATE', deactivatedUser, userId);
            } catch (syncError) {
                console.error('[UserService] Cloud deactivate sync error (non-fatal):', syncError.message);
            }

            return {
                success: true,
                status: 'success',
                message: 'User deactivated successfully'
            };

        } catch (error) {
            console.error('[UserService] Delete user error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Failed to delete user: ' + error.message
            };
        }
    }

    /**
     * Search users
     * @param {string} query - Search query
     * @returns {Object} Result with matching users
     */
    searchUsers(query) {
        try {
            if (!query || query.length < 2) {
                return {
                    success: false,
                    status: 'error',
                    message: 'Search query must be at least 2 characters'
                };
            }

            const stmt = this.userRepo.db.prepare(`
                SELECT * FROM users
                WHERE is_active = 1
                AND (
                    username LIKE ?
                    OR email LIKE ?
                    OR full_name LIKE ?
                )
                ORDER BY username ASC
                LIMIT 50
            `);

            const searchPattern = `%${query}%`;
            const users = stmt.all(searchPattern, searchPattern, searchPattern);

            const sanitizedUsers = users.map(u => {
                const parsed = this.userRepo._parseUser(u);
                return UserRepository.sanitize(parsed);
            });

            return {
                success: true,
                status: 'success',
                data: sanitizedUsers,
                count: sanitizedUsers.length
            };

        } catch (error) {
            console.error('[UserService] Search users error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Search failed: ' + error.message
            };
        }
    }

    /**
     * Get users by role
     * @param {string} role - Role to filter by
     * @returns {Object} Result with users array
     */
    getUsersByRole(role) {
        try {
            // Validate role against allowed values to prevent SQL injection
            const allowedRoles = ['admin', 'manager', 'cashier', 'assistant', 'user'];
            if (!role || typeof role !== 'string') {
                return {
                    success: false,
                    status: 'error',
                    message: 'Invalid role parameter'
                };
            }

            const sanitizedRole = role.toLowerCase().trim();
            if (!allowedRoles.includes(sanitizedRole)) {
                return {
                    success: false,
                    status: 'error',
                    message: 'Invalid role specified'
                };
            }

            const stmt = this.userRepo.db.prepare(`
                SELECT * FROM users
                WHERE roles LIKE ?
                AND is_active = 1
                ORDER BY username ASC
            `);

            // Use properly escaped parameter
            const searchPattern = '%"' + sanitizedRole + '"%';
            const users = stmt.all(searchPattern);

            const sanitizedUsers = users.map(u => {
                const parsed = this.userRepo._parseUser(u);
                return UserRepository.sanitize(parsed);
            });

            return {
                success: true,
                status: 'success',
                data: sanitizedUsers,
                count: sanitizedUsers.length
            };

        } catch (error) {
            console.error('[UserService] Get users by role error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Failed to fetch users: ' + error.message
            };
        }
    }

    /**
     * Update user roles
     * @param {string} userId - User ID
     * @param {Array} roles - New roles array
     * @returns {Object} Result
     */
    updateUserRoles(userId, roles) {
        try {
            if (!Array.isArray(roles)) {
                return {
                    success: false,
                    status: 'error',
                    message: 'Roles must be an array'
                };
            }

            const user = this.userRepo.findById(userId);

            if (!user) {
                return {
                    success: false,
                    status: 'error',
                    message: 'User not found'
                };
            }

            this.userRepo.update(userId, {
                roles: JSON.stringify(roles),
                sync_status: 'pending'
            });

            // Queue for cloud sync
            this.syncQueueRepo.enqueue({
                entity_type: 'user',
                entity_id: userId,
                operation: 'update_roles',
                payload: {
                    cloud_id: user.cloud_id,
                    roles
                },
                priority: 5
            });

            // Immediately push roles update to MySQL cloud
            try {
                const { notifyDataChange } = require('./CloudSyncService.cjs');
                const updatedUser = this.userRepo.findById(userId);
                if (updatedUser) notifyDataChange('users', 'UPDATE', updatedUser, userId);
            } catch (syncError) {
                console.error('[UserService] Cloud roles sync error (non-fatal):', syncError.message);
            }

            return {
                success: true,
                status: 'success',
                message: 'User roles updated successfully',
                data: UserRepository.sanitize(this.userRepo.findById(userId))
            };

        } catch (error) {
            console.error('[UserService] Update roles error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Failed to update roles: ' + error.message
            };
        }
    }

    /**
     * Get user statistics
     * @returns {Object} User statistics
     */
    getStatistics() {
        try {
            const totalUsers = this.userRepo.count();
            const activeUsers = this.userRepo.countWhere({ is_active: 1 });
            const inactiveUsers = totalUsers - activeUsers;
            const pendingSync = this.userRepo.countWhere({ sync_status: 'pending' });

            return {
                success: true,
                status: 'success',
                data: {
                    total: totalUsers,
                    active: activeUsers,
                    inactive: inactiveUsers,
                    pendingSync
                }
            };

        } catch (error) {
            console.error('[UserService] Get statistics error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Failed to get statistics: ' + error.message
            };
        }
    }
}

module.exports = UserService;
