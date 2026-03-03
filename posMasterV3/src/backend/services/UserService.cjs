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
            const users = this.userRepo.findAll(options);
            const sanitizedUsers = users.map(u => {
                const parsed = this.userRepo._parseUser(u);
                return UserRepository.sanitize(parsed);
            });

            return {
                success: true,
                status: 'success',
                data: sanitizedUsers,
                total: this.userRepo.count()
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

            // Check email uniqueness if changing
            if (safeData.email && safeData.email !== existingUser.email) {
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
                    // Get the full updated user record for syncing
                    const fullUser = this.userRepo.findById(userId);
                    if (fullUser) {
                        // Re-serialize roles if they were parsed
                        const userToSync = {
                            ...fullUser,
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
                // Permanent delete
                this.userRepo.delete(userId);

                // Queue deletion for cloud sync
                this.syncQueueRepo.enqueue({
                    entity_type: 'user',
                    entity_id: userId,
                    operation: 'delete',
                    payload: {
                        cloud_id: user.cloud_id
                    },
                    priority: 5
                });

                // Immediately delete from MySQL cloud
                try {
                    const { notifyDataChange } = require('./CloudSyncService.cjs');
                    notifyDataChange('users', 'DELETE', {}, userId);
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
                WHERE username LIKE ?
                OR email LIKE ?
                OR full_name LIKE ?
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
            const allowedRoles = ['admin', 'manager', 'cashier', 'accountant', 'inventory_manager', 'viewer'];
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
