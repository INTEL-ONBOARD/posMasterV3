/**
 * Preload Script
 *
 * Exposes safe IPC methods to the renderer process via contextBridge.
 * This is the bridge between the frontend React app and the Electron backend.
 */

const { contextBridge, ipcRenderer } = require("electron");

const defaultFolderPath = "C:\\POS Master";

// Channels the renderer is allowed to reach through the generic send()/invoke()
// passthrough below. Every channel the app actually uses is exposed through the
// namespaced APIs further down this file (electronAPI.online.*, .users.*, etc.),
// each of which hardcodes its own channel name. This whitelist exists only to
// close off the raw passthrough as an attack surface (e.g. a compromised
// dependency or XSS payload calling electronAPI.invoke() with an arbitrary
// channel name) — nothing in this codebase relies on it being unrestricted.
const ALLOWED_RAW_IPC_CHANNELS = new Set([
    "select-folder", "create-files", "read-config-dtos", "store-user-data",
    "perform-logout", "print-silent", "receipt-printer:get-config", "receipt-printer:list",
    "receipt-printer:print-pdf", "thermal:print-receipt", "backend:status", "app:restart",
    "app:logoutAndRestart", "startup:get-error", "updates:get-version", "updates:check-for-updates",
    "updates:download-update", "updates:install-update",
    "auth:login", "auth:register", "auth:logout", "auth:validate-session",
    "auth:get-current-user", "auth:change-password", "auth:import-from-cloud",
    "auth:check-session-with-sync", "auth:validate-session-fast",
    "users:get-all", "users:get-by-id", "users:update", "users:delete", "users:search",
    "users:get-by-role", "users:update-roles", "users:statistics", "users:reset-password",
    "categories:get-all", "categories:get-by-id", "categories:get-types", "categories:search",
    "categories:create", "categories:update", "categories:delete",
    "uom:get-all", "uom:get-by-id", "uom:search", "uom:create", "uom:update", "uom:delete",
    "branches:get-all", "branches:get-active", "branches:get-by-id", "branches:search",
    "branches:create", "branches:update", "branches:delete",
    "suppliers:get-all", "suppliers:get-active", "suppliers:get-by-id", "suppliers:search",
    "suppliers:create", "suppliers:update", "suppliers:delete", "suppliers:update-amounts",
    "items:get-all", "items:get-all-extended", "items:get-by-id", "items:get-by-id-extended",
    "items:get-by-sku", "items:search", "items:create", "items:update", "items:delete",
    "stock:get-all", "stock:get-all-with-items", "stock:get-by-id", "stock:get-by-sku",
    "stock:get-low-stock", "stock:get-expiring", "stock:get-value", "stock:upsert",
    "stock:update-quantity", "stock:update-prices", "stock:delete",
    "restocks:get-all", "restocks:get-by-id", "restocks:get-by-invoice", "restocks:get-by-supplier",
    "restocks:get-by-date-range", "restocks:get-stock-data", "restocks:get-stock-items",
    "restocks:create", "restocks:get-summary",
    "members:get-all", "members:get-active", "members:get-by-id", "members:get-by-member-no",
    "members:get-with-transactions", "members:search", "members:create", "members:update",
    "members:delete", "members:get-top", "members:get-debtors",
    "offers:get-all", "offers:get-active", "offers:create", "offers:update", "offers:delete",
    "offers:toggle-active",
    "disposed:get-all", "disposed:create", "disposed:get-by-date-range",
    "sales:get-all", "sales:get-by-id", "sales:get-by-invoice", "sales:get-by-member",
    "sales:get-by-date-range", "sales:get-held-orders", "sales:create", "sales:hold",
    "payment-methods:get-all", "payment-methods:get-active", "payment-methods:get-for-members",
    "payment-methods:get-for-non-members", "payment-methods:get-by-id", "payment-methods:search",
    "payment-methods:create", "payment-methods:update", "payment-methods:toggle-active",
    "payment-methods:delete",
    "loginHistory:getAll", "loginHistory:getByUser", "loginHistory:getByDateRange",
    "loginHistory:getUserStats", "loginHistory:getDailyStats", "loginHistory:getUserActivitySummary",
    "loginHistory:getActiveSessions", "loginHistory:markStaleSessions",
    "teacoop:initialize", "teacoop:members:getAll", "teacoop:members:getById",
    "teacoop:members:search", "teacoop:payments:getHistory", "teacoop:sync:members",
    "teacoop:sync:payments", "teacoop:members:refresh", "teacoop:status",
    "appSettings:getAll", "appSettings:setLogoutOnClose", "appSettings:setRunOnStartup",
    "appSettings:setMaximizeOnStart", "appSettings:setNotifications", "appSettings:testNotification",
    "appSettings:applyAll",
    "online:get-config", "online:health", "online:ready", "online:login", "online:register",
    "online:logout", "online:validate-session", "online:set-token", "online:realtime-status",
    "online:list", "online:get", "online:create", "online:update", "online:delete",
    "online:sales:create", "online:sales:complete-held", "online:sales:cancel",
    "online:sales:return-items", "online:sales:invoice-no", "online:sales:get-summary",
    "online:sales:get-daily", "online:login-history:get-active-sessions",
    "online:login-history:count-active-sessions", "online:auth:change-password",
    "online:users:reset-password", "online:inventory-transfers:accept",
    "online:inventory-transfers:reject",
]);

// Channels the main process pushes TO the renderer (the reverse direction
// from ALLOWED_RAW_IPC_CHANNELS above) — gates the generic receive()
// passthrough the same way, so a compromised renderer can't register a
// listener on an arbitrary channel name. Built from every webContents.send()
// call site (electron.cjs, OnlineRealtimeClient.cjs's broadcast()) plus the
// channels the dedicated onSessionKicked/onStatusUpdate/onAutoLogout/
// onSyncEvent methods below already listen for even though nothing
// currently triggers them.
const ALLOWED_RECEIVE_CHANNELS = new Set([
    "logout-response", "updates:available", "updates:download-progress",
    "updates:downloaded", "updates:error", "updates:not-available",
    "online:realtime-status", "online:domain-event", "online:event",
    "session:kicked", "status:update", "appSettings:auto-logout",
    "teacoop:sync:started", "teacoop:sync:completed", "teacoop:sync:error",
]);

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

    // General send and receive IPC methods (channel-restricted, see ALLOWED_RAW_IPC_CHANNELS above)
    send: (channel, data) => {
        if (!ALLOWED_RAW_IPC_CHANNELS.has(channel)) {
            throw new Error(`IPC channel not allowed: ${channel}`);
        }
        return ipcRenderer.send(channel, data);
    },
    invoke: (channel, ...args) => {
        if (!ALLOWED_RAW_IPC_CHANNELS.has(channel)) {
            throw new Error(`IPC channel not allowed: ${channel}`);
        }
        return ipcRenderer.invoke(channel, ...args);
    },
    sendPrintSilent: (arrayBuffer) => ipcRenderer.send("print-silent", arrayBuffer),
    getReceiptPrinterConfig: () => ipcRenderer.invoke("receipt-printer:get-config"),
    listReceiptPrinters: () => ipcRenderer.invoke("receipt-printer:list"),
    printReceiptPdf: (payload) => ipcRenderer.invoke("receipt-printer:print-pdf", payload),
    printThermalReceipt: (payload) => ipcRenderer.invoke("thermal:print-receipt", payload),
    receive: (channel, func) => {
        if (!ALLOWED_RECEIVE_CHANNELS.has(channel)) {
            throw new Error(`IPC channel not allowed: ${channel}`);
        }
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

    // Read the last bundled-server startup failure, if any (see electron.cjs recordStartupError)
    getStartupError: () => ipcRenderer.invoke("startup:get-error"),

    // ============================================
    // ONLINE-ONLY API
    // ============================================

    online: {
        getConfig: () => ipcRenderer.invoke("online:get-config"),
        health: () => ipcRenderer.invoke("online:health"),
        ready: () => ipcRenderer.invoke("online:ready"),
        setToken: (token) => ipcRenderer.invoke("online:set-token", { token }),
        login: (email, password, deviceInfo) =>
            ipcRenderer.invoke("online:login", { email, password, deviceInfo }),
        register: (userData) =>
            ipcRenderer.invoke("online:register", userData),
        logout: () => ipcRenderer.invoke("online:logout"),
        validateSession: (token = null) => ipcRenderer.invoke("online:validate-session", { token }),
        changePassword: (currentPassword, newPassword) =>
            ipcRenderer.invoke("online:auth:change-password", { currentPassword, newPassword }),
        resetPassword: (userId, newPassword) =>
            ipcRenderer.invoke("online:users:reset-password", { userId, newPassword }),
        getRealtimeStatus: () => ipcRenderer.invoke("online:realtime-status"),
        getSalesSummary: (startDate, endDate) =>
            ipcRenderer.invoke("online:sales:get-summary", { startDate, endDate }),
        getSalesDaily: (days) =>
            ipcRenderer.invoke("online:sales:get-daily", { days }),
        completeHeldSale: (id, data) =>
            ipcRenderer.invoke("online:sales:complete-held", { id, ...data }),
        cancelSale: (id, data = {}) =>
            ipcRenderer.invoke("online:sales:cancel", { id, ...data }),
        returnSaleItems: (id, data = {}) =>
            ipcRenderer.invoke("online:sales:return-items", { id, ...data }),
        acceptInventoryTransfer: (id, data = {}) =>
            ipcRenderer.invoke("online:inventory-transfers:accept", { id, ...data }),
        rejectInventoryTransfer: (id, data = {}) =>
            ipcRenderer.invoke("online:inventory-transfers:reject", { id, ...data }),
        list: (collection, query = {}) =>
            ipcRenderer.invoke("online:list", { collection, query }),
        get: (collection, id) =>
            ipcRenderer.invoke("online:get", { collection, id }),
        create: (collection, data) =>
            ipcRenderer.invoke("online:create", { collection, data }),
        update: (collection, id, data) =>
            ipcRenderer.invoke("online:update", { collection, id, data }),
        delete: (collection, id) =>
            ipcRenderer.invoke("online:delete", { collection, id }),
        createSale: (data) =>
            ipcRenderer.invoke("online:sales:create", data),
        generateInvoiceNo: (type = "SALE", branchId = null) =>
            ipcRenderer.invoke("online:sales:invoice-no", { type, branchId, branch_id: branchId }),
        syncTeaCoop: (options = {}) => ipcRenderer.invoke("teacoop:sync:members", options),
        syncTeaCoopMembers: () => ipcRenderer.invoke("teacoop:sync:members"),
        syncTeaCoopPayments: (memberId = null, options = {}) =>
            ipcRenderer.invoke("teacoop:sync:payments", { memberId, options }),
        getTeaCoopStatus: () => ipcRenderer.invoke("teacoop:status"),
        onRealtimeStatus: (callback) => {
            const listener = (_event, payload) => callback(payload);
            ipcRenderer.on("online:realtime-status", listener);
            return () => ipcRenderer.removeListener("online:realtime-status", listener);
        },
        onDomainEvent: (callback) => {
            const listener = (_event, payload) => callback(payload);
            ipcRenderer.on("online:domain-event", listener);
            return () => ipcRenderer.removeListener("online:domain-event", listener);
        },
        onEvent: (callback) => {
            const listener = (_event, payload) => callback(payload);
            ipcRenderer.on("online:event", listener);
            return () => ipcRenderer.removeListener("online:event", listener);
        }
    },

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
        // Check session with the online session authority for single-device enforcement
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
            ipcRenderer.invoke("users:statistics"),
        resetPassword: (userId, newPassword) =>
            ipcRenderer.invoke("users:reset-password", { userId, newPassword })
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
        updatePrices: (id, stockPrice, retailPrice, changedBy, reason) =>
            ipcRenderer.invoke("stock:update-prices", id, stockPrice, retailPrice, changedBy, reason),
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
    // OFFERS & DISCOUNTS API
    // ============================================

    offers: {
        getAll:       () => ipcRenderer.invoke("offers:get-all"),
        getActive:    () => ipcRenderer.invoke("offers:get-active"),
        create:       (data) => ipcRenderer.invoke("offers:create", data),
        update:       (id, data) => ipcRenderer.invoke("offers:update", id, data),
        delete:       (id) => ipcRenderer.invoke("offers:delete", id),
        toggleActive: (id) => ipcRenderer.invoke("offers:toggle-active", id)
    },

    // ============================================
    // DISPOSED ITEMS API
    // ============================================

    disposed: {
        getAll:          () => ipcRenderer.invoke("disposed:get-all"),
        create:          (data) => ipcRenderer.invoke("disposed:create", data),
        getByDateRange:  (startDate, endDate) => ipcRenderer.invoke("disposed:get-by-date-range", startDate, endDate)
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
        completeHeld: (id, updateData) => ipcRenderer.invoke("online:sales:complete-held", { id, ...(updateData || {}) }),
        cancel: (id, data = {}) => ipcRenderer.invoke("online:sales:cancel", { id, ...data }),
        return: (saleId, data) => ipcRenderer.invoke("online:sales:return-items", { id: saleId, ...(data || {}) }),
        getSummary: (startDate, endDate) =>
            ipcRenderer.invoke("online:sales:get-summary", { startDate, endDate }),
        getDaily: (days) => ipcRenderer.invoke("online:sales:get-daily", { days }),
        generateInvoiceNo: (type = "SALE", branchId = null) =>
            ipcRenderer.invoke("online:sales:invoice-no", { type, branchId, branch_id: branchId })
    },

    // ============================================
    // SYNC API
    // ============================================

    sync: {
        getStatus: () =>
            Promise.resolve({ status: "success", data: { onlineOnly: true, status: "online-only", pendingCount: 0 } }),
        checkConnectivity: () =>
            ipcRenderer.invoke("online:ready"),
        processQueue: (token) =>
            Promise.resolve({ status: "success", data: { processed: 0, onlineOnly: true } }),
        pull: (entityType, token) =>
            Promise.resolve({ status: "success", data: { entityType, pulled: 0, onlineOnly: true } }),
        retryFailed: () =>
            Promise.resolve({ status: "success", data: { retried: 0, onlineOnly: true } }),
        cleanup: (daysOld = 7) =>
            Promise.resolve({ status: "success", data: { cleaned: 0, daysOld, onlineOnly: true } }),
        setCloudUrl: (url) =>
            Promise.resolve({ status: "success", data: { url, onlineOnly: true } }),
        onStatusChange: (callback) => {
            const handler = (_event, status) => callback(status);
            ipcRenderer.on('sync:status-changed', handler);
            // Return unsubscribe function
            return () => ipcRenderer.removeListener('sync:status-changed', handler);
        }
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
            ipcRenderer.invoke("online:list", { collection: "user_settings", query: { userId } }),
        getCurrentUserWithSettings: (userId) =>
            ipcRenderer.invoke("online:list", { collection: "user_settings", query: { userId } }),
        updateUserProfile: (userId, profileData) =>
            ipcRenderer.invoke("online:update", { collection: "users", id: userId, data: profileData }),
        updateUserPermissions: (userId, permissions) =>
            ipcRenderer.invoke("online:create", { collection: "user_settings", data: { userId, user_id: userId, settings: { permissions }, permissions } }),
        updateProfileImage: (userId, profileImage) =>
            ipcRenderer.invoke("online:create", { collection: "user_settings", data: { userId, user_id: userId, settings: { profile_image: profileImage, profileImage }, profile_image: profileImage, profileImage } }),

        // App settings
        getAppSettings: () =>
            ipcRenderer.invoke("online:list", { collection: "app_settings", query: {} }),
        getAppSetting: (key) =>
            ipcRenderer.invoke("online:list", { collection: "app_settings", query: { key, setting_key: key } }),
        updateAppSettings: (settings) =>
            ipcRenderer.invoke("online:create", { collection: "app_settings", data: { key: "app_settings", setting_key: "app_settings", value: settings, setting_value: settings, settings } }),
        updateAppSetting: (key, value) =>
            ipcRenderer.invoke("online:create", { collection: "app_settings", data: { key, setting_key: key, value, setting_value: value } }),
        resetAppSettings: () =>
            Promise.resolve({ status: "success", data: { onlineOnly: true } })
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
    // SOFTWARE UPDATES API
    // ============================================

    updates: {
        // Get the current installed app version
        getVersion: () =>
            ipcRenderer.invoke("updates:get-version"),
        // Check GitHub for a newer version
        checkForUpdates: () =>
            ipcRenderer.invoke("updates:check-for-updates"),
        // Start downloading the available update
        downloadUpdate: () =>
            ipcRenderer.invoke("updates:download-update"),
        // Quit and install the downloaded update
        installUpdate: () =>
            ipcRenderer.invoke("updates:install-update"),
        // Register listener: called when an update is found
        onUpdateAvailable: (callback) => {
            const handler = (_, data) => callback(data);
            ipcRenderer.on("updates:available", handler);
            return () => ipcRenderer.removeListener("updates:available", handler);
        },
        // Register listener: called when no update is available
        onUpdateNotAvailable: (callback) => {
            const handler = (_, data) => callback(data);
            ipcRenderer.on("updates:not-available", handler);
            return () => ipcRenderer.removeListener("updates:not-available", handler);
        },
        // Register listener: called with download progress { percent, transferred, total }
        onDownloadProgress: (callback) => {
            const handler = (_, data) => callback(data);
            ipcRenderer.on("updates:download-progress", handler);
            return () => ipcRenderer.removeListener("updates:download-progress", handler);
        },
        // Register listener: called when download is complete
        onUpdateDownloaded: (callback) => {
            const handler = (_, data) => callback(data);
            ipcRenderer.on("updates:downloaded", handler);
            return () => ipcRenderer.removeListener("updates:downloaded", handler);
        },
        // Register listener: called on error
        onUpdateError: (callback) => {
            const handler = (_, data) => callback(data);
            ipcRenderer.on("updates:error", handler);
            return () => ipcRenderer.removeListener("updates:error", handler);
        },
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
        // Send test notification
        testNotification: () =>
            ipcRenderer.invoke("appSettings:testNotification"),
        // Apply all settings (call after login)
        applyAll: () =>
            ipcRenderer.invoke("appSettings:applyAll"),
        // Listen for backend-initiated auto-logout (e.g. admin force-logout)
        // Returns an unsubscribe function
        onAutoLogout: (callback) => {
            const handler = (event, data) => callback(data);
            ipcRenderer.on("appSettings:auto-logout", handler);
            return () => ipcRenderer.removeListener("appSettings:auto-logout", handler);
        }
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
            ipcRenderer.invoke("online:login-history:get-active-sessions"),
        // Count active sessions
        countActiveSessions: () =>
            ipcRenderer.invoke("online:login-history:count-active-sessions"),
        // Mark stale sessions (cleanup)
        markStaleSessions: (hoursThreshold) =>
            ipcRenderer.invoke("loginHistory:markStaleSessions", hoursThreshold)
    },

    // ============================================
    // REAL-TIME DATA CHANGE EVENTS
    // ============================================

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
     * Listen for backend status log updates
     * The callback will be called with: { message, type, isLoading }
     * Returns an unsubscribe function
     */
    onStatusUpdate: (callback) => {
        const handler = (event, data) => callback(data);
        ipcRenderer.on("status:update", handler);
        return () => ipcRenderer.removeListener("status:update", handler);
    },

    // Read config DTOs from the POS Master folder (temp.json + config.json)
    readConfigDtos: (folderPath) =>
        ipcRenderer.invoke("read-config-dtos", { folderPath }),

    // ============================================
    // BRANCH CONTEXT API
    // ============================================

    branchContext: {
        /**
         * Get the currently selected branch
         * @returns {Promise<{status: string, data: {id, name, address, contact} | null}>}
         */
        getCurrent: () => Promise.resolve({ status: "success", data: null }),

        /**
         * Set the current branch context
         * @param {number} branchId - Branch ID to select
         * @returns {Promise<{status: string, data: object}>}
         */
        setCurrent: () => Promise.resolve({ status: "error", message: "Legacy branch context is disabled in online-only mode" }),

        /**
         * Clear the current branch selection
         * @returns {Promise<{status: string}>}
         */
        clear: () => Promise.resolve({ status: "success", data: null }),

        /**
         * Check if branch selection is required
         * @returns {Promise<{status: string, data: {required: boolean, currentBranch: object | null}}>}
         */
        isRequired: () => Promise.resolve({ status: "success", data: { required: true, currentBranch: null } }),

        /**
         * Get branches available to the current user
         * @returns {Promise<{status: string, data: array}>}
         */
        getAvailableBranches: () => Promise.resolve({ status: "success", data: [] }),

        /**
         * Validate if an operation can proceed (checks branch selection)
         * @param {string} operation - Operation name
         * @returns {Promise<{status: string, valid: boolean, message?: string}>}
         */
        validateOperation: () => Promise.resolve({ status: "error", valid: false, message: "Legacy branch context is disabled in online-only mode" }),

        /**
         * Listen for branch context changes
         * @param {function} callback - Called when branch changes
         * @returns {function} Unsubscribe function
         */
        onBranchChanged: (callback) => {
            return () => {};
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
         * Get Tea Coop service status
         * @returns {Promise<{status: string, data: object}>}
         */
        getStatus: () => ipcRenderer.invoke("teacoop:status"),

        /**
         * Listen for Tea Coop realtime events
         * @param {function} callback - Called on service events
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
