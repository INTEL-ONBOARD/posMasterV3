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
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
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
        login: (email, password, deviceInfo) =>
            ipcRenderer.invoke("auth:login", { email, password, deviceInfo }),
        register: (userData) =>
            ipcRenderer.invoke("auth:register", userData),
        logout: (token) =>
            ipcRenderer.invoke("auth:logout", { token }),
        validateSession: (token) =>
            ipcRenderer.invoke("auth:validate-session", { token }),
        getCurrentUser: (token) =>
            ipcRenderer.invoke("auth:get-current-user", { token }),
        changePassword: (userId, currentPassword, newPassword) =>
            ipcRenderer.invoke("auth:change-password", { userId, currentPassword, newPassword }),
        importFromCloud: (cloudUser, password) =>
            ipcRenderer.invoke("auth:import-from-cloud", { cloudUser, password }),
        // Check session with cloud sync - used for single-device enforcement
        checkSessionWithSync: (token) =>
            ipcRenderer.invoke("auth:check-session-with-sync", { token }),
        // Fast session validation - optimized for every API call
        validateSessionFast: (token) =>
            ipcRenderer.invoke("auth:validate-session-fast", { token })
    },

    // ============================================
    // USER MANAGEMENT API
    // ============================================

    users: {
        getAll: (options = {}) =>
            ipcRenderer.invoke("users:get-all", options),
        getById: (userId) =>
            ipcRenderer.invoke("users:get-by-id", { userId }),
        update: (userId, data) =>
            ipcRenderer.invoke("users:update", { userId, data }),
        delete: (userId, hardDelete = false) =>
            ipcRenderer.invoke("users:delete", { userId, hardDelete }),
        search: (query) =>
            ipcRenderer.invoke("users:search", { query }),
        getByRole: (role) =>
            ipcRenderer.invoke("users:get-by-role", { role }),
        updateRoles: (userId, roles) =>
            ipcRenderer.invoke("users:update-roles", { userId, roles }),
        getStatistics: () =>
            ipcRenderer.invoke("users:statistics")
    },

    // ============================================
    // CATEGORY API
    // ============================================

    categories: {
        getAll: () => ipcRenderer.invoke("categories:get-all"),
        getById: (id) => ipcRenderer.invoke("categories:get-by-id", id),
        getTypes: () => ipcRenderer.invoke("categories:get-types"),
        search: (searchTerm) => ipcRenderer.invoke("categories:search", searchTerm),
        create: (data) => ipcRenderer.invoke("categories:create", data),
        update: (id, data) => ipcRenderer.invoke("categories:update", id, data),
        delete: (id) => ipcRenderer.invoke("categories:delete", id)
    },

    // ============================================
    // UOM (Unit of Measurement) API
    // ============================================

    uom: {
        getAll: () => ipcRenderer.invoke("uom:get-all"),
        getById: (id) => ipcRenderer.invoke("uom:get-by-id", id),
        search: (searchTerm) => ipcRenderer.invoke("uom:search", searchTerm),
        create: (data) => ipcRenderer.invoke("uom:create", data),
        update: (id, data) => ipcRenderer.invoke("uom:update", id, data),
        delete: (id) => ipcRenderer.invoke("uom:delete", id)
    },

    // ============================================
    // BRANCH (Inventory/Outlet) API
    // ============================================

    branches: {
        getAll: () => ipcRenderer.invoke("branches:get-all"),
        getActive: () => ipcRenderer.invoke("branches:get-active"),
        getById: (id) => ipcRenderer.invoke("branches:get-by-id", id),
        search: (searchTerm) => ipcRenderer.invoke("branches:search", searchTerm),
        create: (data) => ipcRenderer.invoke("branches:create", data),
        update: (id, data) => ipcRenderer.invoke("branches:update", id, data),
        delete: (id) => ipcRenderer.invoke("branches:delete", id)
    },

    // ============================================
    // SUPPLIER API
    // ============================================

    suppliers: {
        getAll: () => ipcRenderer.invoke("suppliers:get-all"),
        getActive: () => ipcRenderer.invoke("suppliers:get-active"),
        getById: (id) => ipcRenderer.invoke("suppliers:get-by-id", id),
        search: (searchTerm) => ipcRenderer.invoke("suppliers:search", searchTerm),
        create: (data) => ipcRenderer.invoke("suppliers:create", data),
        update: (id, data) => ipcRenderer.invoke("suppliers:update", id, data),
        delete: (id) => ipcRenderer.invoke("suppliers:delete", id),
        updateAmounts: (id, currentAmount, previousAmount) =>
            ipcRenderer.invoke("suppliers:update-amounts", id, currentAmount, previousAmount)
    },

    // ============================================
    // ITEM (Item Registry) API
    // ============================================

    items: {
        getAll: () => ipcRenderer.invoke("items:get-all"),
        getAllExtended: () => ipcRenderer.invoke("items:get-all-extended"),
        getById: (id) => ipcRenderer.invoke("items:get-by-id", id),
        getByIdExtended: (id) => ipcRenderer.invoke("items:get-by-id-extended", id),
        getBySku: (sku) => ipcRenderer.invoke("items:get-by-sku", sku),
        search: (searchTerm) => ipcRenderer.invoke("items:search", searchTerm),
        create: (data) => ipcRenderer.invoke("items:create", data),
        update: (id, data) => ipcRenderer.invoke("items:update", id, data),
        delete: (id) => ipcRenderer.invoke("items:delete", id)
    },

    // ============================================
    // STOCK API
    // ============================================

    stock: {
        getAll: () => ipcRenderer.invoke("stock:get-all"),
        getAllWithItems: () => ipcRenderer.invoke("stock:get-all-with-items"),
        getById: (id) => ipcRenderer.invoke("stock:get-by-id", id),
        getBySku: (sku) => ipcRenderer.invoke("stock:get-by-sku", sku),
        getLowStock: () => ipcRenderer.invoke("stock:get-low-stock"),
        getExpiring: (days) => ipcRenderer.invoke("stock:get-expiring", days),
        getValue: () => ipcRenderer.invoke("stock:get-value"),
        upsert: (data) => ipcRenderer.invoke("stock:upsert", data),
        updateQuantity: (id, quantity) => ipcRenderer.invoke("stock:update-quantity", id, quantity),
        updatePrices: (id, stockPrice, retailPrice) =>
            ipcRenderer.invoke("stock:update-prices", id, stockPrice, retailPrice),
        delete: (id) => ipcRenderer.invoke("stock:delete", id)
    },

    // ============================================
    // RESTOCK API
    // ============================================

    restocks: {
        getAll: (options) => ipcRenderer.invoke("restocks:get-all", options),
        getById: (id) => ipcRenderer.invoke("restocks:get-by-id", id),
        getByInvoice: (invoiceNo) => ipcRenderer.invoke("restocks:get-by-invoice", invoiceNo),
        getBySupplier: (supplierId) => ipcRenderer.invoke("restocks:get-by-supplier", supplierId),
        getByDateRange: (startDate, endDate) =>
            ipcRenderer.invoke("restocks:get-by-date-range", startDate, endDate),
        getStockData: (sku) => ipcRenderer.invoke("restocks:get-stock-data", sku),
        getStockItems: () => ipcRenderer.invoke("restocks:get-stock-items"),
        create: (data) => ipcRenderer.invoke("restocks:create", data),
        getSummary: (startDate, endDate) =>
            ipcRenderer.invoke("restocks:get-summary", startDate, endDate)
    },

    // ============================================
    // MEMBER (Customer) API
    // ============================================

    members: {
        getAll: () => ipcRenderer.invoke("members:get-all"),
        getActive: () => ipcRenderer.invoke("members:get-active"),
        getById: (id) => ipcRenderer.invoke("members:get-by-id", id),
        getByMemberNo: (memberNo) => ipcRenderer.invoke("members:get-by-member-no", memberNo),
        getWithTransactions: (id) => ipcRenderer.invoke("members:get-with-transactions", id),
        search: (searchTerm) => ipcRenderer.invoke("members:search", searchTerm),
        create: (data) => ipcRenderer.invoke("members:create", data),
        update: (id, data) => ipcRenderer.invoke("members:update", id, data),
        delete: (id) => ipcRenderer.invoke("members:delete", id),
        getTop: (limit) => ipcRenderer.invoke("members:get-top", limit),
        getDebtors: () => ipcRenderer.invoke("members:get-debtors")
    },

    // ============================================
    // SALES API
    // ============================================

    sales: {
        getAll: (options) => ipcRenderer.invoke("sales:get-all", options),
        getById: (id) => ipcRenderer.invoke("sales:get-by-id", id),
        getByInvoice: (invoiceNo) => ipcRenderer.invoke("sales:get-by-invoice", invoiceNo),
        getByMember: (memberId) => ipcRenderer.invoke("sales:get-by-member", memberId),
        getByDateRange: (startDate, endDate) =>
            ipcRenderer.invoke("sales:get-by-date-range", startDate, endDate),
        getHeldOrders: () => ipcRenderer.invoke("sales:get-held-orders"),
        create: (data) => ipcRenderer.invoke("sales:create", data),
        hold: (data) => ipcRenderer.invoke("sales:hold", data),
        completeHeld: (id, updateData) => ipcRenderer.invoke("sales:complete-held", id, updateData),
        cancel: (id) => ipcRenderer.invoke("sales:cancel", id),
        getSummary: (startDate, endDate) =>
            ipcRenderer.invoke("sales:get-summary", startDate, endDate),
        getDaily: (days) => ipcRenderer.invoke("sales:get-daily", days),
        generateInvoiceNo: () => ipcRenderer.invoke("sales:generate-invoice-no")
    },

    // ============================================
    // SYNC API
    // ============================================

    sync: {
        getStatus: () =>
            ipcRenderer.invoke("sync:status"),
        checkConnectivity: () =>
            ipcRenderer.invoke("sync:check-connectivity"),
        processQueue: (token) =>
            ipcRenderer.invoke("sync:process-queue", { token }),
        pull: (entityType, token) =>
            ipcRenderer.invoke("sync:pull", { entityType, token }),
        retryFailed: () =>
            ipcRenderer.invoke("sync:retry-failed"),
        cleanup: (daysOld = 7) =>
            ipcRenderer.invoke("sync:cleanup", { daysOld }),
        setCloudUrl: (url) =>
            ipcRenderer.invoke("sync:set-cloud-url", { url })
    },

    // ============================================
    // DATABASE STATUS API
    // ============================================

    database: {
        getStatus: () =>
            ipcRenderer.invoke("backend:status")
    },

    // ============================================
    // SETTINGS API
    // ============================================

    settings: {
        // User settings
        getUserSettings: (userId) =>
            ipcRenderer.invoke("settings:get-user-settings", userId),
        getCurrentUserWithSettings: (userId) =>
            ipcRenderer.invoke("settings:get-current-user-with-settings", userId),
        updateUserProfile: (userId, profileData) =>
            ipcRenderer.invoke("settings:update-user-profile", { userId, profileData }),
        updateUserPermissions: (userId, permissions) =>
            ipcRenderer.invoke("settings:update-user-permissions", { userId, permissions }),
        updateProfileImage: (userId, profileImage) =>
            ipcRenderer.invoke("settings:update-profile-image", { userId, profileImage }),

        // App settings
        getAppSettings: () =>
            ipcRenderer.invoke("settings:get-app-settings"),
        getAppSetting: (key) =>
            ipcRenderer.invoke("settings:get-app-setting", key),
        updateAppSettings: (settings) =>
            ipcRenderer.invoke("settings:update-app-settings", settings),
        updateAppSetting: (key, value) =>
            ipcRenderer.invoke("settings:update-app-setting", { key, value }),
        resetAppSettings: () =>
            ipcRenderer.invoke("settings:reset-app-settings")
    },

    // ============================================
    // APP LIFECYCLE API
    // ============================================

    app: {
        // Restart the application
        restart: () =>
            ipcRenderer.invoke("app:restart"),
        // Logout user and restart the application
        logoutAndRestart: () =>
            ipcRenderer.invoke("app:logoutAndRestart")
    },

    // ============================================
    // APP SETTINGS API (System behavior settings)
    // ============================================

    appSettings: {
        // Get all app settings with applied status
        getAll: () =>
            ipcRenderer.invoke("appSettings:getAll"),
        // Set logout on close configuration
        setLogoutOnClose: (enabled) =>
            ipcRenderer.invoke("appSettings:setLogoutOnClose", enabled),
        // Set run on startup
        setRunOnStartup: (enabled) =>
            ipcRenderer.invoke("appSettings:setRunOnStartup", enabled),
        // Set maximize on start
        setMaximizeOnStart: (enabled) =>
            ipcRenderer.invoke("appSettings:setMaximizeOnStart", enabled),
        // Set notifications enabled
        setNotifications: (enabled) =>
            ipcRenderer.invoke("appSettings:setNotifications", enabled),
        // Set cloud sync enabled
        setCloudSync: (enabled) =>
            ipcRenderer.invoke("appSettings:setCloudSync", enabled),
        // Send test notification
        testNotification: () =>
            ipcRenderer.invoke("appSettings:testNotification"),
        // Apply all settings (call after login)
        applyAll: () =>
            ipcRenderer.invoke("appSettings:applyAll"),
        // Check if cloud sync is enabled
        isCloudSyncEnabled: () =>
            ipcRenderer.invoke("appSettings:isCloudSyncEnabled")
    },

    // ============================================
    // PAYMENT METHODS API
    // ============================================

    paymentMethods: {
        getAll: () => ipcRenderer.invoke("payment-methods:get-all"),
        getActive: () => ipcRenderer.invoke("payment-methods:get-active"),
        getForMembers: () => ipcRenderer.invoke("payment-methods:get-for-members"),
        getForNonMembers: () => ipcRenderer.invoke("payment-methods:get-for-non-members"),
        getById: (id) => ipcRenderer.invoke("payment-methods:get-by-id", id),
        search: (searchTerm) => ipcRenderer.invoke("payment-methods:search", searchTerm),
        create: (data) => ipcRenderer.invoke("payment-methods:create", data),
        update: (id, data) => ipcRenderer.invoke("payment-methods:update", id, data),
        toggleActive: (id) => ipcRenderer.invoke("payment-methods:toggle-active", id),
        delete: (id) => ipcRenderer.invoke("payment-methods:delete", id)
    },

    // ============================================
    // CLOUD SYNC API
    // ============================================

    cloudSync: {
        getStatus: () =>
            ipcRenderer.invoke("cloudSync:getStatus"),
        syncNow: () =>
            ipcRenderer.invoke("cloudSync:syncNow"),
        setAutoSync: (enabled) =>
            ipcRenderer.invoke("cloudSync:setAutoSync", enabled),
        checkNetwork: () =>
            ipcRenderer.invoke("cloudSync:checkNetwork"),
        // Pull users from cloud (cloud is primary source for users)
        pullUsers: () =>
            ipcRenderer.invoke("cloudSync:pullUsers"),
        // Push a user to cloud
        pushUser: (user) =>
            ipcRenderer.invoke("cloudSync:pushUser", user),
        // Force ensure MySQL schema (creates tables if missing)
        ensureSchema: () =>
            ipcRenderer.invoke("cloudSync:ensureSchema"),
        // Initialize MySQL connection
        initializeMySQL: () =>
            ipcRenderer.invoke("cloudSync:initializeMySQL"),
        // Force full sync immediately (real-time sync)
        forceFullSync: () =>
            ipcRenderer.invoke("cloudSync:forceFullSync"),
        // Sync active_sessions immediately (for single-device enforcement)
        syncActiveSessions: () =>
            ipcRenderer.invoke("cloudSync:syncActiveSessions"),
        // Get real-time sync status
        getRealTimeStatus: () =>
            ipcRenderer.invoke("cloudSync:getRealTimeStatus")
    },

    // ============================================
    // LOGIN HISTORY API
    // ============================================

    loginHistory: {
        // Get all login history with pagination
        getAll: (options) =>
            ipcRenderer.invoke("loginHistory:getAll", options),
        // Get login history for a specific user
        getByUser: (userId, options) =>
            ipcRenderer.invoke("loginHistory:getByUser", userId, options),
        // Get login history by date range
        getByDateRange: (startDate, endDate) =>
            ipcRenderer.invoke("loginHistory:getByDateRange", startDate, endDate),
        // Get user statistics
        getUserStats: (userId) =>
            ipcRenderer.invoke("loginHistory:getUserStats", userId),
        // Get daily statistics
        getDailyStats: (days) =>
            ipcRenderer.invoke("loginHistory:getDailyStats", days),
        // Get user activity summary
        getUserActivitySummary: (days) =>
            ipcRenderer.invoke("loginHistory:getUserActivitySummary", days),
        // Get currently active sessions
        getActiveSessions: () =>
            ipcRenderer.invoke("loginHistory:getActiveSessions"),
        // Count active sessions
        countActiveSessions: () =>
            ipcRenderer.invoke("loginHistory:countActiveSessions"),
        // Mark stale sessions (cleanup)
        markStaleSessions: (hoursThreshold) =>
            ipcRenderer.invoke("loginHistory:markStaleSessions", hoursThreshold)
    },

    // ============================================
    // REAL-TIME DATA CHANGE EVENTS
    // ============================================

    /**
     * Listen for data changes from the backend
     * The callback will be called with: { table, operation, recordId, record }
     * - table: string (e.g., 'items', 'stock', 'sales_transactions')
     * - operation: 'INSERT' | 'UPDATE' | 'DELETE'
     * - recordId: string | number
     * - record: object (the changed record data)
     *
     * Returns an unsubscribe function
     */
    onDataChange: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on("data:changed", handler);
        // Return unsubscribe function
        return () => ipcRenderer.removeListener("data:changed", handler);
    },

    /**
     * Listen for sync status updates
     * The callback will be called with: { status, message, isOnline, pendingCount }
     *
     * Returns an unsubscribe function
     */
    onSyncStatusChange: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on("sync:status-changed", handler);
        return () => ipcRenderer.removeListener("sync:status-changed", handler);
    },

    /**
     * Listen for session kicked event (single-device enforcement)
     * Called when another device logs in with the same user
     * The callback will be called with: { userId, deviceName, message, timestamp }
     */
    onSessionKicked: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on("session:kicked", handler);
        return () => ipcRenderer.removeListener("session:kicked", handler);
    },

    /**
     * Listen for connection status changes
     * Called when network connectivity changes
     * The callback will be called with: { isOnline, quality, timestamp }
     */
    onConnectionStatusChange: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on("connection:status-changed", handler);
        return () => ipcRenderer.removeListener("connection:status-changed", handler);
    },

    /**
     * Listen for data refresh notifications
     * Called when data needs to be refetched (after sync)
     * The callback will be called with: { table, reason, timestamp }
     */
    onRefreshNeeded: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on("data:refresh-needed", handler);
        return () => ipcRenderer.removeListener("data:refresh-needed", handler);
    },

    /**
     * Listen for active sessions updates (for session monitoring)
     * Called after active_sessions are synced from cloud
     */
    onActiveSessionsUpdated: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on("sync:active-sessions-updated", handler);
        return () => ipcRenderer.removeListener("sync:active-sessions-updated", handler);
    },

    /**
     * Listen for sync completion events
     * Called when a sync cycle completes (push or pull)
     * The callback will be called with: { success, tablesAffected, recordsUpdated, timestamp }
     */
    onSyncCompleted: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on("sync:completed", handler);
        return () => ipcRenderer.removeListener("sync:completed", handler);
    },

    /**
     * Listen for multi-table sync changes
     * Called when cloud sync updates multiple tables at once
     * The callback will be called with: { changes: [{table, count}], totalRecords, tables, timestamp }
     */
    onMultiTableChanged: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on("sync:multi-table-changed", handler);
        return () => ipcRenderer.removeListener("sync:multi-table-changed", handler);
    },

    // ============================================
    // BRANCH CONTEXT API
    // ============================================

    branchContext: {
        /**
         * Get the currently selected branch
         * @returns {Promise<{status: string, data: {id, name, address, contact} | null}>}
         */
        getCurrent: () => ipcRenderer.invoke("branch-context:get-current"),

        /**
         * Set the current branch context
         * @param {number} branchId - Branch ID to select
         * @returns {Promise<{status: string, data: object}>}
         */
        setCurrent: (branchId) => ipcRenderer.invoke("branch-context:set-current", branchId),

        /**
         * Clear the current branch selection
         * @returns {Promise<{status: string}>}
         */
        clear: () => ipcRenderer.invoke("branch-context:clear"),

        /**
         * Check if branch selection is required
         * @returns {Promise<{status: string, data: {required: boolean, currentBranch: object | null}}>}
         */
        isRequired: () => ipcRenderer.invoke("branch-context:is-required"),

        /**
         * Get branches available to the current user
         * @returns {Promise<{status: string, data: array}>}
         */
        getAvailableBranches: () => ipcRenderer.invoke("branch-context:get-available-branches"),

        /**
         * Validate if an operation can proceed (checks branch selection)
         * @param {string} operation - Operation name
         * @returns {Promise<{status: string, valid: boolean, message?: string}>}
         */
        validateOperation: (operation) => ipcRenderer.invoke("branch-context:validate-operation", operation),

        /**
         * Listen for branch context changes
         * @param {function} callback - Called when branch changes
         * @returns {function} Unsubscribe function
         */
        onBranchChanged: (callback) => {
            const handler = (event, data) => callback(data);
            ipcRenderer.on("branch-context:changed", handler);
            return () => ipcRenderer.removeListener("branch-context:changed", handler);
        }
    },

    // ============================================
    // TEA COOP API (External API Integration)
    // ============================================
    teaCoop: {
        /**
         * Initialize Tea Coop service
         * @returns {Promise<{status: string, message: string}>}
         */
        initialize: () => ipcRenderer.invoke("teacoop:initialize"),

        /**
         * Get all Tea Coop members from local database
         * @returns {Promise<{status: string, data: array}>}
         */
        getAllMembers: () => ipcRenderer.invoke("teacoop:members:getAll"),

        /**
         * Get Tea Coop member by ID
         * @param {string} memberId - Member ID
         * @returns {Promise<{status: string, data: object}>}
         */
        getMemberById: (memberId) => ipcRenderer.invoke("teacoop:members:getById", memberId),

        /**
         * Search Tea Coop members
         * @param {string} searchTerm - Search term
         * @returns {Promise<{status: string, data: array}>}
         */
        searchMembers: (searchTerm) => ipcRenderer.invoke("teacoop:members:search", searchTerm),

        /**
         * Get payment history for a member
         * @param {string} memberId - Member ID
         * @param {number} months - Number of months (default: 6)
         * @returns {Promise<{status: string, data: array}>}
         */
        getPaymentHistory: (memberId, months = 6) => ipcRenderer.invoke("teacoop:payments:getHistory", { memberId, months }),

        /**
         * Sync members from Tea Coop API
         * @returns {Promise<{status: string, data: object}>}
         */
        syncMembers: () => ipcRenderer.invoke("teacoop:sync:members"),

        /**
         * Sync payments for a specific member
         * @param {string} memberId - Member ID
         * @param {object} options - Sync options
         * @returns {Promise<{status: string, data: object}>}
         */
        syncPayments: (memberId, options = {}) => ipcRenderer.invoke("teacoop:sync:payments", { memberId, options }),

        /**
         * Refresh member data from API
         * @param {string} memberId - Member ID
         * @returns {Promise<{status: string, data: object}>}
         */
        refreshMember: (memberId) => ipcRenderer.invoke("teacoop:members:refresh", memberId),

        /**
         * Get Tea Coop sync status
         * @returns {Promise<{status: string, data: object}>}
         */
        getStatus: () => ipcRenderer.invoke("teacoop:status"),

        /**
         * Listen for Tea Coop sync events
         * @param {function} callback - Called on sync events
         * @returns {function} Unsubscribe function
         */
        onSyncEvent: (callback) => {
            const startedHandler = (event, data) => callback({ type: 'started', ...data });
            const completedHandler = (event, data) => callback({ type: 'completed', ...data });
            const errorHandler = (event, data) => callback({ type: 'error', ...data });

            ipcRenderer.on("teacoop:sync:started", startedHandler);
            ipcRenderer.on("teacoop:sync:completed", completedHandler);
            ipcRenderer.on("teacoop:sync:error", errorHandler);

            return () => {
                ipcRenderer.removeListener("teacoop:sync:started", startedHandler);
                ipcRenderer.removeListener("teacoop:sync:completed", completedHandler);
                ipcRenderer.removeListener("teacoop:sync:error", errorHandler);
            };
        }
    }
});
