/**
 * Local Authentication Service
 *
 * Provides authentication services using the local SQLite backend.
 * All operations use the local database only - no cloud fallback.
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

// Check if running in Electron
const isElectron = () => {
    return typeof window !== 'undefined' && window.electronAPI;
};

/**
 * Local Authentication Service
 */
export const localAuth = {
    /**
     * Login with local database
     * @param {string} email - Email or username
     * @param {string} password - Password
     * @returns {Promise<Object>} Login result
     */
    async login(email, password) {
        if (!isElectron()) {
            return {
                success: false,
                status: 'error',
                message: 'Not running in Electron environment'
            };
        }

        try {
            const result = await window.electronAPI.auth.login(email, password);

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
            const result = await window.electronAPI.auth.register(userData);
            return result;
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
        const token = localStorage.getItem('token');

        if (isElectron() && token) {
            try {
                await window.electronAPI.auth.logout(token);
            } catch (error) {
                console.warn('[LocalAuth] Logout error:', error);
            }
        }

        // Clear localStorage
        this._clearUserData();

        return { success: true, message: 'Logged out' };
    },

    /**
     * Validate current session
     * @returns {Promise<Object>} Validation result
     */
    async validateSession() {
        const token = localStorage.getItem('token');

        if (!token) {
            return { valid: false, message: 'No token' };
        }

        if (isElectron()) {
            try {
                return await window.electronAPI.auth.validateSession(token);
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
        const token = localStorage.getItem('token');

        if (isElectron() && token) {
            try {
                const result = await window.electronAPI.auth.getCurrentUser(token);
                if (result && result.data) return result.data;
                if (result) return result;
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

        try {
            return await window.electronAPI.auth.changePassword(
                user.id || user._id,
                currentPassword,
                newPassword
            );
        } catch (error) {
            return {
                success: false,
                status: 'error',
                message: 'Password change failed: ' + error.message
            };
        }
    },

    /**
     * Check if user is logged in
     * @returns {boolean}
     */
    isLoggedIn() {
        return !!localStorage.getItem('token');
    },

    /**
     * Get stored token
     * @returns {string|null}
     */
    getToken() {
        return localStorage.getItem('token');
    },

    /**
     * Store user data in localStorage
     * @private
     */
    _storeUserData(result) {
        if (result.data) {
            localStorage.setItem('user', JSON.stringify(result.data));
            localStorage.setItem('username', result.data.username || result.data.email || '');
            localStorage.setItem('email', result.data.email || '');
            localStorage.setItem('_id', result.data._id || result.data.id || '');
        }
        if (result.token) {
            localStorage.setItem('token', result.token);
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
        localStorage.removeItem('token');
        localStorage.removeItem('sessionId');
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
            return await window.electronAPI.database.getStatus();
        } catch (error) {
            console.error('[DatabaseService] Get status error:', error);
            return { initialized: false, error: error.message };
        }
    }
};

export default localAuth;
