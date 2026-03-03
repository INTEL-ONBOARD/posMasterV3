/**
 * Auth Controller
 *
 * Handles IPC communication for authentication-related operations.
 * This is the "API layer" for the Electron main process.
 */

const { getAuthService } = require('../services/index.cjs');
const { branchContextService } = require('../services/BranchContextService.cjs');
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
 * Register all authentication IPC handlers
 */
function registerAuthHandlers() {
    console.log('[AuthController] Starting handler registration...');

    let ipcMain, authService;
    try {
        ipcMain = getIpcMain();
        authService = getAuthService();
    } catch (error) {
        console.error('[AuthController] Failed to initialize:', error.message);
        return;
    }

    /**
     * Handle user login
     * Channel: 'auth:login'
     * Payload: { email: string, password: string, deviceInfo?: string }
     * Response: { success: boolean, status: string, message: string, data?: User, token?: string, branch?: Object }
     */
    ipcMain.handle('auth:login', wrapIpcHandler(async (event, payload) => {
        console.log('[AuthController] Login request received');

        try {
            const { email, password, deviceInfo } = payload;

            const result = await authService.login(
                { email, password },
                { deviceInfo }
            );

            // If login successful, set user context in BranchContextService
            // and auto-select branch if user has one assigned
            if (result.success && result.data) {
                const user = result.data;

                // Set user context so BranchContextService knows the user's branch_id
                branchContextService.setCurrentUser(user);
                console.log('[AuthController] User context set for:', user.username, 'branch_id:', user.branch_id);

                // If user has an assigned branch, auto-select it
                if (user.branch_id) {
                    try {
                        const branchResult = await branchContextService.setCurrentBranch(user.branch_id);
                        if (branchResult.status === 'success') {
                            result.branch = branchResult.data;
                            result.branchAutoSelected = true;
                            console.log('[AuthController] Auto-selected branch:', branchResult.data?.name);
                        }
                    } catch (branchError) {
                        console.error('[AuthController] Failed to auto-select branch:', branchError.message);
                        // Don't fail login if branch selection fails
                    }
                }
            }

            return result;

        } catch (error) {
            console.error('[AuthController] Login error:', error.message);
            return {
                success: false,
                status: 'error',
                message: 'Login failed: ' + error.message
            };
        }
    }));

    /**
     * Handle user registration
     * Channel: 'auth:register'
     * Payload: { username: string, email: string, password: string, full_name?: string, roles?: string[] }
     * Response: { success: boolean, status: string, message: string, data?: User }
     */
    ipcMain.handle('auth:register', wrapIpcHandler(async (event, payload) => {
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
    }));

    /**
     * Handle user logout
     * Channel: 'auth:logout'
     * Payload: { token: string }
     * Response: { success: boolean, status: string, message: string }
     */
    ipcMain.handle('auth:logout', wrapIpcHandler(async (event, payload) => {
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
    }));

    /**
     * Validate session token
     * Channel: 'auth:validate-session'
     * Payload: { token: string }
     * Response: { valid: boolean, user?: User, message?: string }
     */
    ipcMain.handle('auth:validate-session', wrapIpcHandler(async (event, payload) => {
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
    }));

    /**
     * Get current user from session
     * Channel: 'auth:get-current-user'
     * Payload: { token: string }
     * Response: User | null
     */
    ipcMain.handle('auth:get-current-user', wrapIpcHandler(async (event, payload) => {
        try {
            const { token } = payload;
            return authService.getCurrentUser(token);

        } catch (error) {
            console.error('[AuthController] Get current user error:', error.message);
            return null;
        }
    }));

    /**
     * Change password
     * Channel: 'auth:change-password'
     * Payload: { userId: string, currentPassword: string, newPassword: string }
     * Response: { success: boolean, status: string, message: string }
     */
    ipcMain.handle('auth:change-password', wrapIpcHandler(async (event, payload) => {
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
    }));

    /**
     * Import user from cloud (for sync)
     * Channel: 'auth:import-from-cloud'
     * Payload: { cloudUser: Object, password: string }
     * Response: { success: boolean, status: string, message: string, data?: User }
     */
    ipcMain.handle('auth:import-from-cloud', wrapIpcHandler(async (event, payload) => {
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
    }));

    /**
     * Check session with cloud sync (for single-device enforcement)
     * This pulls active_sessions from cloud first, then validates locally
     * Channel: 'auth:check-session-with-sync'
     * Payload: { token: string }
     * Response: { valid: boolean, forcedLogout?: boolean, message?: string, otherDevice?: string }
     */
    try {
        ipcMain.handle('auth:check-session-with-sync', wrapIpcHandler(async (event, payload) => {
            try {
                const { token } = payload;

                // First, try to sync active_sessions from cloud
                try {
                    const { getCloudSyncService } = require('../services/CloudSyncService.cjs');
                    const cloudSync = getCloudSyncService();

                    if (cloudSync.isOnline && cloudSync.mysqlInitialized) {
                        // Pull active_sessions from cloud to get latest session state
                        await cloudSync.pullFromCloud('active_sessions');
                        console.log('[AuthController] Synced active_sessions from cloud for session check');
                    }
                } catch (syncError) {
                    console.log('[AuthController] Cloud sync skipped:', syncError.message);
                }

                // Now validate the session (this will check against the synced active_sessions)
                const result = authService.validateSession(token);

                if (!result.valid && result.forcedLogout) {
                    console.log('[AuthController] Session was kicked by another device');
                }

                return result;

            } catch (error) {
                console.error('[AuthController] Check session with sync error:', error.message);
                return {
                    valid: false,
                    message: 'Session check failed: ' + error.message
                };
            }
        }));
        console.log('[AuthController] Registered: auth:check-session-with-sync');
    } catch (regError) {
        console.error('[AuthController] Failed to register auth:check-session-with-sync:', regError.message);
    }

    /**
     * Fast session validation (with background cloud sync)
     * Use this for every API operation - it's optimized for speed
     * Channel: 'auth:validate-session-fast'
     * Payload: { token: string }
     * Response: { valid: boolean, forcedLogout?: boolean, message?: string }
     */
    try {
        ipcMain.handle('auth:validate-session-fast', wrapIpcHandler(async (event, payload) => {
            try {
                const { token } = payload;
                const { validateSessionWithSync } = require('../services/SessionValidator.cjs');
                return await validateSessionWithSync(token);
            } catch (error) {
                console.error('[AuthController] Fast validation error:', error.message);
                return { valid: false, message: 'Validation failed' };
            }
        }));
        console.log('[AuthController] Registered: auth:validate-session-fast');
    } catch (regError) {
        console.error('[AuthController] Failed to register auth:validate-session-fast:', regError.message);
    }

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
        'auth:import-from-cloud',
        'auth:check-session-with-sync',
        'auth:validate-session-fast'
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
