/**
 * User Controller
 *
 * Handles IPC communication for user management operations.
 */

const { ipcMain } = require('electron');
const { getUserService } = require('../services/index.cjs');

/**
 * Register all user management IPC handlers
 */
function registerUserHandlers() {
    const userService = getUserService();

    /**
     * Get all users
     * Channel: 'users:get-all'
     * Payload: { limit?: number, offset?: number, orderBy?: string, order?: string }
     * Response: { success: boolean, data: User[], total: number }
     */
    ipcMain.handle('users:get-all', async (event, payload = {}) => {
        console.log('[UserController] Get all users request received');

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
    });

    /**
     * Get user by ID
     * Channel: 'users:get-by-id'
     * Payload: { userId: string }
     * Response: { success: boolean, data: User }
     */
    ipcMain.handle('users:get-by-id', async (event, payload) => {
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
    });

    /**
     * Update user
     * Channel: 'users:update'
     * Payload: { userId: string, data: Object }
     * Response: { success: boolean, data: User }
     */
    ipcMain.handle('users:update', async (event, payload) => {
        console.log('[UserController] Update user request received');

        try {
            const { userId, data } = payload;
            return userService.updateUser(userId, data);

        } catch (error) {
            console.error('[UserController] Update user error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Failed to update user: ' + error.message
            };
        }
    });

    /**
     * Delete user
     * Channel: 'users:delete'
     * Payload: { userId: string, hardDelete?: boolean }
     * Response: { success: boolean, message: string }
     */
    ipcMain.handle('users:delete', async (event, payload) => {
        console.log('[UserController] Delete user request received');

        try {
            const { userId, hardDelete = false } = payload;
            return userService.deleteUser(userId, hardDelete);

        } catch (error) {
            console.error('[UserController] Delete user error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Failed to delete user: ' + error.message
            };
        }
    });

    /**
     * Search users
     * Channel: 'users:search'
     * Payload: { query: string }
     * Response: { success: boolean, data: User[], count: number }
     */
    ipcMain.handle('users:search', async (event, payload) => {
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
    });

    /**
     * Get users by role
     * Channel: 'users:get-by-role'
     * Payload: { role: string }
     * Response: { success: boolean, data: User[], count: number }
     */
    ipcMain.handle('users:get-by-role', async (event, payload) => {
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
    });

    /**
     * Update user roles
     * Channel: 'users:update-roles'
     * Payload: { userId: string, roles: string[] }
     * Response: { success: boolean, data: User }
     */
    ipcMain.handle('users:update-roles', async (event, payload) => {
        console.log('[UserController] Update roles request received');

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
    });

    /**
     * Get user statistics
     * Channel: 'users:statistics'
     * Payload: none
     * Response: { success: boolean, data: { total, active, inactive, pendingSync } }
     */
    ipcMain.handle('users:statistics', async (event) => {
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
    });

    console.log('[UserController] User handlers registered');
}

/**
 * Unregister all user management IPC handlers
 */
function unregisterUserHandlers() {
    const channels = [
        'users:get-all',
        'users:get-by-id',
        'users:update',
        'users:delete',
        'users:search',
        'users:get-by-role',
        'users:update-roles',
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
