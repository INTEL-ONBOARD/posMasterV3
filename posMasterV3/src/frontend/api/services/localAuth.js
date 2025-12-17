/**
 * Local Authentication Service
 *
 * Provides authentication services using the local SQLite backend.
 * Falls back to cloud API when needed.
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

import { apiClient } from '../client';

// Check if running in Electron
const isElectron = () => {
    return typeof window !== 'undefined' && window.electronAPI;
};

/**
 * Local Authentication Service
 */
export const localAuth = {
    /**
     * Login with local database first, fallback to cloud
     * @param {string} email - Email or username
     * @param {string} password - Password
     * @returns {Promise<Object>} Login result
     */
    async login(email, password) {
        if (isElectron()) {
            try {
                // Try local login first
                const localResult = await window.electronAPI.auth.login(email, password);

                if (localResult.success) {
                    // Store in localStorage for compatibility
                    this._storeUserData(localResult);
                    return localResult;
                }

                // If local user not found, try cloud and import
                if (localResult.requiresCloudSync) {
                    return await this._loginViaCloud(email, password);
                }

                return localResult;

            } catch (error) {
                console.error('[LocalAuth] Local login error:', error);
                // Fallback to cloud
                return await this._loginViaCloud(email, password);
            }
        }

        // Not in Electron, use cloud directly
        return await this._loginViaCloud(email, password);
    },

    /**
     * Login via cloud API and import user locally
     * @private
     */
    async _loginViaCloud(email, password) {
        try {
            const response = await apiClient.post('api/users/login', { email, password });

            if (response.data.status === 'success') {
                const userData = response.data.data;
                const token = response.data.token;

                // Import user to local database if in Electron
                if (isElectron()) {
                    try {
                        await window.electronAPI.auth.importFromCloud(userData, password);
                        console.log('[LocalAuth] User imported to local database');
                    } catch (importError) {
                        console.warn('[LocalAuth] Failed to import user locally:', importError);
                    }
                }

                // Store in localStorage
                this._storeUserData({
                    data: userData,
                    token
                });

                return {
                    success: true,
                    status: 'success',
                    message: 'Login successful',
                    data: userData,
                    token
                };
            }

            return {
                success: false,
                status: response.data.status,
                message: response.data.message || 'Login failed'
            };

        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Login failed';
            return {
                success: false,
                status: 'error',
                message
            };
        }
    },

    /**
     * Register a new user
     * @param {Object} userData - User data
     * @returns {Promise<Object>} Registration result
     */
    async register(userData) {
        if (isElectron()) {
            try {
                // Register locally first
                const result = await window.electronAPI.auth.register(userData);
                return result;
            } catch (error) {
                console.error('[LocalAuth] Local registration error:', error);
                return {
                    success: false,
                    status: 'error',
                    message: 'Registration failed: ' + error.message
                };
            }
        }

        // Not in Electron, register via cloud directly
        try {
            const response = await apiClient.post('api/users/register', userData);
            return {
                success: response.data.status === 'success',
                status: response.data.status,
                message: response.data.message,
                data: response.data.data
            };
        } catch (error) {
            return {
                success: false,
                status: 'error',
                message: error.response?.data?.message || 'Registration failed'
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
                console.warn('[LocalAuth] Local logout error:', error);
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
            }
        }

        // Fallback: check if token exists
        return { valid: !!token };
    },

    /**
     * Get current user
     * @returns {Promise<Object|null>} Current user
     */
    async getCurrentUser() {
        const token = localStorage.getItem('token');

        if (isElectron() && token) {
            try {
                const user = await window.electronAPI.auth.getCurrentUser(token);
                if (user) return user;
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

        if (isElectron()) {
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
        }

        // Cloud fallback
        try {
            const response = await apiClient.post(`api/users/${user._id}/change-password`, {
                current_password: currentPassword,
                new_password: newPassword
            });
            return {
                success: response.data.status === 'success',
                message: response.data.message
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Password change failed'
            };
        }
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
 * Sync Service Helper
 */
export const syncService = {
    /**
     * Get sync status
     * @returns {Promise<Object>}
     */
    async getStatus() {
        if (!isElectron()) {
            return { isOnline: true, isSyncing: false, queue: { pending: 0 } };
        }

        try {
            return await window.electronAPI.sync.getStatus();
        } catch (error) {
            console.error('[SyncService] Get status error:', error);
            return { isOnline: false, isSyncing: false, error: error.message };
        }
    },

    /**
     * Check cloud connectivity
     * @returns {Promise<boolean>}
     */
    async isOnline() {
        if (!isElectron()) return true;

        try {
            const result = await window.electronAPI.sync.checkConnectivity();
            return result.online;
        } catch (error) {
            return false;
        }
    },

    /**
     * Trigger sync
     * @returns {Promise<Object>}
     */
    async sync() {
        if (!isElectron()) {
            return { success: true, message: 'Not in Electron environment' };
        }

        try {
            const token = localStorage.getItem('token');
            return await window.electronAPI.sync.processQueue(token);
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
};

export default localAuth;
