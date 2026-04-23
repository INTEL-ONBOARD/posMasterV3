/**
 * User Controller
 *
 * Handles IPC communication for user management operations.
 * All mutating operations require the caller to have user_manage permission.
 */

const { getUserService } = require('../services/index.cjs');
const { wrapIpcHandler } = require('../utils/helpers.cjs');

// Lazy load ipcMain to ensure electron is ready
let _ipcMain = null;
function getIpcMain() {
    if (!_ipcMain) {
        _ipcMain = require('electron').ipcMain;
    }
    return _ipcMain;
}

/**
 * Resolve the current session user from the active session store.
 * Returns null if no active session is found.
 * @returns {Object|null} parsed user record or null
 */
function _getSessionUser() {
    try {
        const { getSessionRepository, getUserRepository } = require('../repositories/index.cjs');
        const sessionRepo = getSessionRepository();
        const userRepo = getUserRepository();

        // Find the most recently created valid (non-expired) session
        const stmt = sessionRepo.db.prepare(`
            SELECT * FROM sessions
            WHERE expires_at > datetime('now')
            ORDER BY created_at DESC
            LIMIT 1
        `);
        const session = stmt.get();
        if (!session) return null;

        return userRepo.findById(session.user_id);
    } catch (e) {
        console.error('[UserController] Failed to resolve session user:', e.message);
        return null;
    }
}

/**
 * Check if a user has admin role (case-insensitive).
 * @param {Object} user - parsed user with roles array
 * @returns {boolean}
 */
function _isAdmin(user) {
    if (!user || !Array.isArray(user.roles)) return false;
    return user.roles.some(r => typeof r === 'string' && r.toLowerCase() === 'admin');
}

/**
 * Check if a user has a specific permission from their saved settings.
 * Falls back to role-based defaults if no settings row exists.
 * @param {Object} user
 * @param {string} permKey - e.g. 'user_manage'
 * @returns {boolean}
 */
function _hasPermission(user, permKey) {
    if (!user) return false;
    if (_isAdmin(user)) return true;

    try {
        const SettingsService = require('../services/SettingsService.cjs');
        const settingsService = new SettingsService();
        const settings = settingsService.getUserSettings(user.id);
        const perms = settings?.data?.settings?.permissions;
        if (perms) {
            // Check across all permission categories
            for (const category of Object.values(perms)) {
                if (category && typeof category === 'object' && permKey in category) {
                    return category[permKey] === true;
                }
            }
        }
    } catch (e) {
        // Settings lookup failed — fall back to role-based defaults below
    }

    // Role-based fallback: manager has user_manage
    if (permKey === 'user_manage' || permKey === 'user_role_manage') {
        if (!user.roles) return false;
        return user.roles.some(r => typeof r === 'string' && r.toLowerCase() === 'manager');
    }

    return false;
}

/** Shared permission denied response */
function _permissionDenied(action) {
    return {
        success: false,
        status: 'error',
        message: `Permission denied: you do not have access to ${action}`
    };
}

/**
 * Register all user management IPC handlers
 */
function registerUserHandlers() {
    const ipcMain = getIpcMain();
    const userService = getUserService();

    /**
     * Get all users
     * Requires: user_manage permission
     * Channel: 'users:get-all'
     * Payload: { limit?: number, offset?: number, orderBy?: string, order?: string }
     * Response: { success: boolean, data: User[], total: number }
     */
    ipcMain.handle('users:get-all', wrapIpcHandler(async (event, payload = {}) => {
        console.log('[UserController] Get all users request received');

        const caller = _getSessionUser();
        if (!_hasPermission(caller, 'user_manage')) {
            return _permissionDenied('view users');
        }

        try {
            return userService.getAllUsers(payload);

        } catch (error) {
            console.error('[UserController] Get all users error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Failed to fetch users: ' + error.message
            };
        }
    }));

    /**
     * Get user by ID
     * Requires: user_manage permission
     * Channel: 'users:get-by-id'
     * Payload: { userId: string }
     * Response: { success: boolean, data: User }
     */
    ipcMain.handle('users:get-by-id', wrapIpcHandler(async (event, payload) => {
        const caller = _getSessionUser();
        if (!_hasPermission(caller, 'user_manage')) {
            return _permissionDenied('view user details');
        }

        try {
            const { userId } = payload;
            return userService.getUserById(userId);

        } catch (error) {
            console.error('[UserController] Get user error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Failed to fetch user: ' + error.message
            };
        }
    }));

    /**
     * Update user
     * Requires: user_manage permission
     * Channel: 'users:update'
     * Payload: { userId: string, data: Object }
     * Response: { success: boolean, data: User }
     */
    ipcMain.handle('users:update', wrapIpcHandler(async (event, payload) => {
        console.log('[UserController] Update user request received');

        const caller = _getSessionUser();
        const { userId, data } = payload;

        // Allow users to update their own profile; user_manage required for others
        if (String(userId) !== String(caller?.id) && !_hasPermission(caller, 'user_manage')) {
            return _permissionDenied('update users');
        }

        try {
            return userService.updateUser(userId, data);

        } catch (error) {
            console.error('[UserController] Update user error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Failed to update user: ' + error.message
            };
        }
    }));

    /**
     * Delete user
     * Requires: user_manage permission
     * Channel: 'users:delete'
     * Payload: { userId: string, hardDelete?: boolean }
     * Response: { success: boolean, message: string }
     */
    ipcMain.handle('users:delete', wrapIpcHandler(async (event, payload) => {
        console.log('[UserController] Delete user request received, payload:', payload);

        const caller = _getSessionUser();
        if (!_hasPermission(caller, 'user_manage')) {
            return _permissionDenied('delete users');
        }

        try {
            if (!payload || !payload.userId) {
                console.error('[UserController] Delete user error: Missing userId in payload');
                return {
                    success: false,
                    status: 'error',
                    message: 'User ID is required'
                };
            }

            const { userId, hardDelete = false } = payload;

            // Prevent self-deletion
            if (caller && caller.id === userId) {
                return {
                    success: false,
                    status: 'error',
                    message: 'You cannot delete your own account'
                };
            }

            console.log(`[UserController] Deleting user ${userId}, hardDelete: ${hardDelete}`);

            const result = userService.deleteUser(userId, hardDelete);
            console.log('[UserController] Delete user result:', result);
            return result;

        } catch (error) {
            console.error('[UserController] Delete user error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Failed to delete user: ' + error.message
            };
        }
    }));

    /**
     * Search users
     * Requires: user_manage permission
     * Channel: 'users:search'
     * Payload: { query: string }
     * Response: { success: boolean, data: User[], count: number }
     */
    ipcMain.handle('users:search', wrapIpcHandler(async (event, payload) => {
        const caller = _getSessionUser();
        if (!_hasPermission(caller, 'user_manage')) {
            return _permissionDenied('search users');
        }

        try {
            const { query } = payload;
            return userService.searchUsers(query);

        } catch (error) {
            console.error('[UserController] Search users error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Search failed: ' + error.message
            };
        }
    }));

    /**
     * Get users by role
     * Requires: user_manage permission
     * Channel: 'users:get-by-role'
     * Payload: { role: string }
     * Response: { success: boolean, data: User[], count: number }
     */
    ipcMain.handle('users:get-by-role', wrapIpcHandler(async (event, payload) => {
        const caller = _getSessionUser();
        if (!_hasPermission(caller, 'user_manage')) {
            return _permissionDenied('view users by role');
        }

        try {
            const { role } = payload;
            return userService.getUsersByRole(role);

        } catch (error) {
            console.error('[UserController] Get users by role error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Failed to fetch users: ' + error.message
            };
        }
    }));

    /**
     * Update user roles
     * Requires: user_role_manage permission
     * Channel: 'users:update-roles'
     * Payload: { userId: string, roles: string[] }
     * Response: { success: boolean, data: User }
     */
    ipcMain.handle('users:update-roles', wrapIpcHandler(async (event, payload) => {
        console.log('[UserController] Update roles request received');

        const caller = _getSessionUser();
        if (!_hasPermission(caller, 'user_role_manage')) {
            return _permissionDenied('manage user roles');
        }

        try {
            const { userId, roles } = payload;
            return userService.updateUserRoles(userId, roles);

        } catch (error) {
            console.error('[UserController] Update roles error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Failed to update roles: ' + error.message
            };
        }
    }));

    /**
     * Reset user password (admin/manager only)
     * Requires: user_manage permission
     * Channel: 'users:reset-password'
     * Payload: { userId: string, newPassword: string }
     * Response: { success: boolean, message: string }
     */
    ipcMain.handle('users:reset-password', wrapIpcHandler(async (event, payload) => {
        const caller = _getSessionUser();
        const { userId, newPassword } = payload;

        // Allow users to reset their own password; user_manage required for others
        if (String(userId) !== String(caller?.id) && !_hasPermission(caller, 'user_manage')) {
            return _permissionDenied('reset user passwords');
        }

        try {
            return userService.resetPassword(userId, newPassword);
        } catch (error) {
            console.error('[UserController] Reset password error:', error.message);
            return { success: false, status: 'error', message: 'Failed to reset password: ' + error.message };
        }
    }));

    /**
     * Get user statistics
     * Channel: 'users:statistics'
     * Payload: none
     * Response: { success: boolean, data: { total, active, inactive, pendingSync } }
     */
    ipcMain.handle('users:statistics', wrapIpcHandler(async (event) => {
        try {
            return userService.getStatistics();

        } catch (error) {
            console.error('[UserController] Get statistics error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Failed to get statistics: ' + error.message
            };
        }
    }));

    console.log('[UserController] User handlers registered');
}

/**
 * Unregister all user management IPC handlers
 */
function unregisterUserHandlers() {
    const ipcMain = getIpcMain();
    const channels = [
        'users:get-all',
        'users:get-by-id',
        'users:update',
        'users:delete',
        'users:search',
        'users:get-by-role',
        'users:update-roles',
        'users:reset-password',
        'users:statistics'
    ];

    channels.forEach(channel => {
        ipcMain.removeHandler(channel);
    });

    console.log('[UserController] User handlers unregistered');
}

module.exports = {
    registerUserHandlers,
    unregisterUserHandlers
};
