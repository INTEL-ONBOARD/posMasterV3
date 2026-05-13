/**
 * Local Authentication Service
 *
 * Compatibility authentication service.
 * The app is online-only; this facade delegates to the online API.
 *
 * Usage:
 * import { localAuth } from '../api/services/localAuth';
 *
 * // Login
 * const result = await localAuth.login(email, password);
 *
 * // Register
 * const result = await localAuth.register({ username, email, password, full_name });
 *
 * // Logout
 * await localAuth.logout();
 */

import { resetSyncModuleState } from '../../hooks/useRealTimeSync';

// Check if running in Electron
const isElectron = () => {
    return typeof window !== 'undefined' && window.electronAPI;
};

function notifyAuthChange() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('auth-changed'));
}

async function getResetSyncFn() {
    return resetSyncModuleState;
}

/**
 * Local Authentication Service
 */
export const localAuth = {
    /**
     * Login with the online auth service
     * @param {string} email - Email or username
     * @param {string} password - Password
     * @returns {Promise<Object>} Login result
     */
    async login(email, password, deviceInfo = null) {
        if (!isElectron()) {
            return {
                success: false,
                status: 'error',
                message: 'Not running in Electron environment'
            };
        }

        try {
            // Prevent the next session from inheriting the previous branch context.
            localStorage.removeItem('selectedBranchId');

            const result = await window.electronAPI.online.login(email, password, deviceInfo);

            if (result.success) {
                // Store in localStorage for compatibility
                this._storeUserData(result);
            }

            return result;

        } catch (error) {
            console.error('[LocalAuth] Login error:', error);
            return {
                success: false,
                status: 'error',
                message: 'Login failed: ' + error.message
            };
        }
    },

    /**
     * Register a new user
     * @param {Object} userData - User data
     * @returns {Promise<Object>} Registration result
     */
    async register(userData) {
        if (!isElectron()) {
            return {
                success: false,
                status: 'error',
                message: 'Not running in Electron environment'
            };
        }

        try {
            return await window.electronAPI.online.register(userData);
        } catch (error) {
            console.error('[LocalAuth] Registration error:', error);
            return {
                success: false,
                status: 'error',
                message: 'Registration failed: ' + error.message
            };
        }
    },

    /**
     * Logout user
     * @returns {Promise<Object>} Logout result
     */
    async logout() {
        const token = sessionStorage.getItem('token');

        if (isElectron() && token) {
            try {
                await window.electronAPI.online.logout();
            } catch (error) {
                console.warn('[LocalAuth] Logout error:', error);
            }
        }

        // Reset realtime module state so the next user's session
        // doesn't inherit stale subscribers or status from this user.
        try {
            const resetFn = await getResetSyncFn();
            resetFn();
        } catch (e) {
            console.warn('[LocalAuth] Could not reset sync module state:', e);
        }

        // Clean up DataStore subscribers and cache so no stale data leaks to the next user.
        if (typeof window !== 'undefined' && window.dataStore?.cleanup) {
            try {
                window.dataStore.cleanup();
            } catch (e) {
                console.warn('[LocalAuth] Could not clean up DataStore:', e);
            }
        }

        // Clear localStorage
        this._clearUserData();
        notifyAuthChange();

        return { success: true, message: 'Logged out' };
    },

    /**
     * Validate current session
     * @returns {Promise<Object>} Validation result
     */
    async validateSession() {
        const token = sessionStorage.getItem('token');

        if (!token) {
            return { valid: false, message: 'No token' };
        }

        if (isElectron()) {
            try {
                const result = await window.electronAPI.online.validateSession(token);
                return {
                    valid: result?.status === 'success' && result?.data?.valid !== false,
                    ...result?.data
                };
            } catch (error) {
                console.error('[LocalAuth] Session validation error:', error);
                return { valid: false, message: error.message };
            }
        }

        return { valid: false, message: 'Not in Electron environment' };
    },

    /**
     * Get current user
     * @returns {Promise<Object|null>} Current user
     */
    async getCurrentUser() {
        const token = sessionStorage.getItem('token');

        if (isElectron() && token) {
            try {
                const result = await window.electronAPI.online.validateSession(token);
                if (result?.status === 'success') {
                    const stored = localStorage.getItem('user') || sessionStorage.getItem('user');
                    return stored ? JSON.parse(stored) : result.data;
                }
            } catch (error) {
                console.error('[LocalAuth] Get current user error:', error);
            }
        }

        // Fallback to localStorage
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    },

    /**
     * Change password
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<Object>} Result
     */
    async changePassword(currentPassword, newPassword) {
        const user = await this.getCurrentUser();

        if (!user) {
            return { success: false, message: 'Not logged in' };
        }

        if (!isElectron()) {
            return { success: false, message: 'Not in Electron environment' };
        }

        return window.electronAPI.online.changePassword(currentPassword, newPassword);
    },

    /**
     * Check if user is logged in
     * @returns {boolean}
     */
    isLoggedIn() {
        return !!sessionStorage.getItem('token');
    },

    /**
     * Get stored token
     * @returns {string|null}
     */
    getToken() {
        return sessionStorage.getItem('token');
    },

    /**
     * Store user data in localStorage
     * @private
     */
    _storeUserData(result) {
        // Clear any branch selection from the previous session so a new user
        // does not inherit the last user's outlet context.
        localStorage.removeItem('selectedBranchId');

        if (result.data) {
            localStorage.setItem('user', JSON.stringify(result.data));
            localStorage.setItem('username', result.data.username || result.data.email || '');
            localStorage.setItem('email', result.data.email || '');
            localStorage.setItem('_id', result.data._id || result.data.id || '');
        }
        if (result.token) {
            sessionStorage.setItem('token', result.token);
        }
        if (result.sessionId) {
            localStorage.setItem('sessionId', result.sessionId);
        }
    },

    /**
     * Clear user data from localStorage
     * @private
     */
    _clearUserData() {
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        localStorage.removeItem('token');
        localStorage.removeItem('sessionId');
        localStorage.removeItem('selectedBranchId');
        localStorage.removeItem('username');
        localStorage.removeItem('email');
        localStorage.removeItem('_id');
    }
};

/**
 * Database Status Service
 */
export const databaseService = {
    /**
     * Get database/backend status
     * @returns {Promise<Object>}
     */
    async getStatus() {
        if (!isElectron()) {
            return { initialized: false, message: 'Not in Electron environment' };
        }

        try {
            const result = await window.electronAPI.online.ready();
            return {
                initialized: result?.status === 'success',
                onlineOnly: true,
                data: result?.data
            };
        } catch (error) {
            console.error('[DatabaseService] Get status error:', error);
            return { initialized: false, error: error.message };
        }
    }
};

export default localAuth;
