/**
 * Auth Controller
 *
 * Handles IPC communication for authentication-related operations.
 * This is the "API layer" for the Electron main process.
 */

const { getAuthService } = require('../services/index.cjs');

// Lazy load ipcMain to ensure electron is ready
let _ipcMain = null;
function getIpcMain() {
    if (!_ipcMain) {
        _ipcMain = require('electron').ipcMain;
    }
    return _ipcMain;
}

/**
 * Register all authentication IPC handlers
 */
function registerAuthHandlers() {
    const ipcMain = getIpcMain();
    const authService = getAuthService();

    /**
     * Handle user login
     * Channel: 'auth:login'
     * Payload: { email: string, password: string, deviceInfo?: string }
     * Response: { success: boolean, status: string, message: string, data?: User, token?: string }
     */
    ipcMain.handle('auth:login', async (event, payload) => {
        console.log('[AuthController] Login request received');

        try {
            const { email, password, deviceInfo } = payload;

            const result = await authService.login(
                { email, password },
                { deviceInfo }
            );

            return result;

        } catch (error) {
            console.error('[AuthController] Login error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Login failed: ' + error.message
            };
        }
    });

    /**
     * Handle user registration
     * Channel: 'auth:register'
     * Payload: { username: string, email: string, password: string, full_name?: string, roles?: string[] }
     * Response: { success: boolean, status: string, message: string, data?: User }
     */
    ipcMain.handle('auth:register', async (event, payload) => {
        console.log('[AuthController] Registration request received');

        try {
            const result = await authService.register(payload);
            return result;

        } catch (error) {
            console.error('[AuthController] Registration error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Registration failed: ' + error.message
            };
        }
    });

    /**
     * Handle user logout
     * Channel: 'auth:logout'
     * Payload: { token: string }
     * Response: { success: boolean, status: string, message: string }
     */
    ipcMain.handle('auth:logout', async (event, payload) => {
        console.log('[AuthController] Logout request received');

        try {
            const { token } = payload;
            const result = await authService.logout(token);
            return result;

        } catch (error) {
            console.error('[AuthController] Logout error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Logout failed: ' + error.message
            };
        }
    });

    /**
     * Validate session token
     * Channel: 'auth:validate-session'
     * Payload: { token: string }
     * Response: { valid: boolean, user?: User, message?: string }
     */
    ipcMain.handle('auth:validate-session', async (event, payload) => {
        try {
            const { token } = payload;
            const result = authService.validateSession(token);
            return result;

        } catch (error) {
            console.error('[AuthController] Validate session error:', error.message);
            return {
                valid: false,
                message: 'Session validation failed: ' + error.message
            };
        }
    });

    /**
     * Get current user from session
     * Channel: 'auth:get-current-user'
     * Payload: { token: string }
     * Response: User | null
     */
    ipcMain.handle('auth:get-current-user', async (event, payload) => {
        try {
            const { token } = payload;
            return authService.getCurrentUser(token);

        } catch (error) {
            console.error('[AuthController] Get current user error:', error.message);
            return null;
        }
    });

    /**
     * Change password
     * Channel: 'auth:change-password'
     * Payload: { userId: string, currentPassword: string, newPassword: string }
     * Response: { success: boolean, status: string, message: string }
     */
    ipcMain.handle('auth:change-password', async (event, payload) => {
        console.log('[AuthController] Change password request received');

        try {
            const { userId, currentPassword, newPassword } = payload;
            const result = await authService.changePassword(userId, currentPassword, newPassword);
            return result;

        } catch (error) {
            console.error('[AuthController] Change password error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Password change failed: ' + error.message
            };
        }
    });

    /**
     * Import user from cloud (for sync)
     * Channel: 'auth:import-from-cloud'
     * Payload: { cloudUser: Object, password: string }
     * Response: { success: boolean, status: string, message: string, data?: User }
     */
    ipcMain.handle('auth:import-from-cloud', async (event, payload) => {
        console.log('[AuthController] Import from cloud request received');

        try {
            const { cloudUser, password } = payload;
            const result = await authService.importFromCloud(cloudUser, password);
            return result;

        } catch (error) {
            console.error('[AuthController] Import error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Import failed: ' + error.message
            };
        }
    });

    console.log('[AuthController] Auth handlers registered');
}

/**
 * Unregister all authentication IPC handlers (for cleanup/testing)
 */
function unregisterAuthHandlers() {
    const ipcMain = getIpcMain();
    const channels = [
        'auth:login',
        'auth:register',
        'auth:logout',
        'auth:validate-session',
        'auth:get-current-user',
        'auth:change-password',
        'auth:import-from-cloud'
    ];

    channels.forEach(channel => {
        ipcMain.removeHandler(channel);
    });

    console.log('[AuthController] Auth handlers unregistered');
}

module.exports = {
    registerAuthHandlers,
    unregisterAuthHandlers
};
