/**
 * Preload Script
 *
 * Exposes safe IPC methods to the renderer process via contextBridge.
 * This is the bridge between the frontend React app and the Electron backend.
 */

const { contextBridge, ipcRenderer } = require("electron");

const defaultFolderPath = "C:\\POS Master";

contextBridge.exposeInMainWorld("electronAPI", {
    // ============================================
    // UTILITY METHODS
    // ============================================

    // Utility to create a Buffer from a given data string and encoding
    bufferFrom: (data, encoding = "base64") => Buffer.from(data, encoding),

    // Get default folder path
    getDefaultFolderPath: () => defaultFolderPath,

    // ============================================
    // GENERAL IPC METHODS (Legacy)
    // ============================================

    // General send and receive IPC methods
    send: (channel, data) => ipcRenderer.send(channel, data),
    sendPrintSilent: (arrayBuffer) => ipcRenderer.send("print-silent", arrayBuffer),
    receive: (channel, func) => {
        ipcRenderer.on(channel, (event, ...args) => func(...args));
    },

    // ============================================
    // USER DATA METHODS (Legacy)
    // ============================================

    // Store user data in main process (for logout handling)
    sendUserData: (email, token) => {
        return ipcRenderer.invoke("store-user-data", { email, token });
    },

    // Handle request for user data from main process
    onRequestUserData: (getUserDataFn) => {
        try {
            ipcRenderer.on("request-user-data", async () => {
                try {
                    const user = await Promise.resolve(getUserDataFn());
                    ipcRenderer.send("reply-user-data", user);
                } catch (e) {
                    console.error("preload: onRequestUserData handler error", e);
                    ipcRenderer.send("reply-user-data", null);
                }
            });
        } catch (e) {
            console.error("preload: onRequestUserData setup failed", e);
        }
    },

    // ============================================
    // FILE SYSTEM METHODS
    // ============================================

    // Folder selection dialog
    selectFolder: () => ipcRenderer.invoke("select-folder"),

    // Create config files
    createFiles: (folderPath, outlet) =>
        ipcRenderer.invoke("create-files", { folderPath, outlet }),

    // Ensure sample.json (legacy feature)
    ensureSampleJson: (folderPath) =>
        ipcRenderer.invoke("ensure-sample-json", folderPath),

    // ============================================
    // AUTHENTICATION API
    // ============================================

    auth: {
        /**
         * Login with email/username and password
         * @param {string} email - Email or username
         * @param {string} password - Password
         * @param {string} deviceInfo - Optional device information
         * @returns {Promise<Object>} Login result
         */
        login: (email, password, deviceInfo) =>
            ipcRenderer.invoke("auth:login", { email, password, deviceInfo }),

        /**
         * Register a new user
         * @param {Object} userData - User registration data
         * @returns {Promise<Object>} Registration result
         */
        register: (userData) =>
            ipcRenderer.invoke("auth:register", userData),

        /**
         * Logout user
         * @param {string} token - Session token
         * @returns {Promise<Object>} Logout result
         */
        logout: (token) =>
            ipcRenderer.invoke("auth:logout", { token }),

        /**
         * Validate session token
         * @param {string} token - Session token
         * @returns {Promise<Object>} Validation result
         */
        validateSession: (token) =>
            ipcRenderer.invoke("auth:validate-session", { token }),

        /**
         * Get current user from session
         * @param {string} token - Session token
         * @returns {Promise<Object|null>} Current user
         */
        getCurrentUser: (token) =>
            ipcRenderer.invoke("auth:get-current-user", { token }),

        /**
         * Change password
         * @param {string} userId - User ID
         * @param {string} currentPassword - Current password
         * @param {string} newPassword - New password
         * @returns {Promise<Object>} Result
         */
        changePassword: (userId, currentPassword, newPassword) =>
            ipcRenderer.invoke("auth:change-password", { userId, currentPassword, newPassword }),

        /**
         * Import user from cloud (for sync)
         * @param {Object} cloudUser - User data from cloud
         * @param {string} password - Plain password for local storage
         * @returns {Promise<Object>} Import result
         */
        importFromCloud: (cloudUser, password) =>
            ipcRenderer.invoke("auth:import-from-cloud", { cloudUser, password })
    },

    // ============================================
    // USER MANAGEMENT API
    // ============================================

    users: {
        /**
         * Get all users
         * @param {Object} options - Query options (limit, offset, orderBy, order)
         * @returns {Promise<Object>} Result with users array
         */
        getAll: (options = {}) =>
            ipcRenderer.invoke("users:get-all", options),

        /**
         * Get user by ID
         * @param {string} userId - User ID
         * @returns {Promise<Object>} Result with user
         */
        getById: (userId) =>
            ipcRenderer.invoke("users:get-by-id", { userId }),

        /**
         * Update user
         * @param {string} userId - User ID
         * @param {Object} data - Data to update
         * @returns {Promise<Object>} Result with updated user
         */
        update: (userId, data) =>
            ipcRenderer.invoke("users:update", { userId, data }),

        /**
         * Delete user
         * @param {string} userId - User ID
         * @param {boolean} hardDelete - Permanently delete (default: false)
         * @returns {Promise<Object>} Result
         */
        delete: (userId, hardDelete = false) =>
            ipcRenderer.invoke("users:delete", { userId, hardDelete }),

        /**
         * Search users
         * @param {string} query - Search query
         * @returns {Promise<Object>} Result with matching users
         */
        search: (query) =>
            ipcRenderer.invoke("users:search", { query }),

        /**
         * Get users by role
         * @param {string} role - Role to filter by
         * @returns {Promise<Object>} Result with users
         */
        getByRole: (role) =>
            ipcRenderer.invoke("users:get-by-role", { role }),

        /**
         * Update user roles
         * @param {string} userId - User ID
         * @param {string[]} roles - New roles array
         * @returns {Promise<Object>} Result
         */
        updateRoles: (userId, roles) =>
            ipcRenderer.invoke("users:update-roles", { userId, roles }),

        /**
         * Get user statistics
         * @returns {Promise<Object>} Statistics
         */
        getStatistics: () =>
            ipcRenderer.invoke("users:statistics")
    },

    // ============================================
    // SYNC API
    // ============================================

    sync: {
        /**
         * Get sync status
         * @returns {Promise<Object>} Sync status
         */
        getStatus: () =>
            ipcRenderer.invoke("sync:status"),

        /**
         * Check connectivity to cloud
         * @returns {Promise<Object>} { online: boolean }
         */
        checkConnectivity: () =>
            ipcRenderer.invoke("sync:check-connectivity"),

        /**
         * Process sync queue (push to cloud)
         * @param {string} token - Auth token
         * @returns {Promise<Object>} Sync result
         */
        processQueue: (token) =>
            ipcRenderer.invoke("sync:process-queue", { token }),

        /**
         * Pull data from cloud
         * @param {string} entityType - Entity type to pull
         * @param {string} token - Auth token
         * @returns {Promise<Object>} Pull result
         */
        pull: (entityType, token) =>
            ipcRenderer.invoke("sync:pull", { entityType, token }),

        /**
         * Retry failed sync items
         * @returns {Promise<Object>} Result
         */
        retryFailed: () =>
            ipcRenderer.invoke("sync:retry-failed"),

        /**
         * Clean up old sync items
         * @param {number} daysOld - Days to keep (default: 7)
         * @returns {Promise<Object>} Result
         */
        cleanup: (daysOld = 7) =>
            ipcRenderer.invoke("sync:cleanup", { daysOld }),

        /**
         * Set cloud API URL
         * @param {string} url - Cloud URL
         * @returns {Promise<Object>} Result
         */
        setCloudUrl: (url) =>
            ipcRenderer.invoke("sync:set-cloud-url", { url })
    },

    // ============================================
    // DATABASE STATUS API
    // ============================================

    database: {
        /**
         * Get backend status
         * @returns {Promise<Object>} Backend status
         */
        getStatus: () =>
            ipcRenderer.invoke("backend:status")
    }
});
