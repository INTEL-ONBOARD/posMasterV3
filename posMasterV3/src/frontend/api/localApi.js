/**
 * Local API Bridge
 *
 * This module provides the same interface as the cloud API but uses
 * the local SQLite backend via Electron IPC instead.
 *
 * Usage: Import this instead of apiClient/client for local operations.
 */

// Check if running in Electron environment
const isElectron = () => {
    return typeof window !== 'undefined' && window.electronAPI;
};

// Helper to ensure we're in Electron
const getElectronAPI = () => {
    if (!isElectron()) {
        console.warn('[LocalAPI] Not running in Electron environment');
        return null;
    }
    return window.electronAPI;
};

// ============================================
// CATEGORY API
// ============================================

export const categoryApi = {
    getAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.categories.getAll();
    },

    getById: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.categories.getById(id);
    },

    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.categories.create(data);
    },

    update: async (id, data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.categories.update(id, data);
    },

    delete: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.categories.delete(id);
    },

    search: async (searchTerm) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.categories.search(searchTerm);
    }
};

// ============================================
// UOM API
// ============================================

export const uomApi = {
    getAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.uom.getAll();
    },

    getById: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.uom.getById(id);
    },

    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.uom.create(data);
    },

    update: async (id, data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.uom.update(id, data);
    },

    delete: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.uom.delete(id);
    }
};

// ============================================
// BRANCH (Inventory) API
// ============================================

export const branchApi = {
    getAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.branches.getAll();
    },

    getActive: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.branches.getActive();
    },

    getById: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.branches.getById(id);
    },

    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.branches.create(data);
    },

    update: async (id, data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.branches.update(id, data);
    },

    delete: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.branches.delete(id);
    }
};

// ============================================
// SUPPLIER API
// ============================================

export const supplierApi = {
    getAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.suppliers.getAll();
    },

    getActive: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.suppliers.getActive();
    },

    getById: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.suppliers.getById(id);
    },

    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.suppliers.create(data);
    },

    update: async (id, data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.suppliers.update(id, data);
    },

    delete: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.suppliers.delete(id);
    },

    search: async (searchTerm) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.suppliers.search(searchTerm);
    }
};

// ============================================
// ITEM API
// ============================================

export const itemApi = {
    getAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.items.getAll();
    },

    getAllExtended: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.items.getAllExtended();
    },

    getById: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.items.getById(id);
    },

    getBySku: async (sku) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.items.getBySku(sku);
    },

    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.items.create(data);
    },

    update: async (id, data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.items.update(id, data);
    },

    delete: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.items.delete(id);
    },

    search: async (searchTerm) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.items.search(searchTerm);
    }
};

// ============================================
// STOCK API
// ============================================

export const stockApi = {
    getAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.stock.getAll();
    },

    getAllWithItems: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.stock.getAllWithItems();
    },

    getBySku: async (sku) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.stock.getBySku(sku);
    },

    getLowStock: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.stock.getLowStock();
    },

    getExpiring: async (days = 30) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.stock.getExpiring(days);
    },

    upsert: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.stock.upsert(data);
    }
};

// ============================================
// RESTOCK API
// ============================================

export const restockApi = {
    getAll: async (options = {}) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.restocks.getAll(options);
    },

    getById: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.restocks.getById(id);
    },

    getStockData: async (sku) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.restocks.getStockData(sku);
    },

    getStockItems: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.restocks.getStockItems();
    },

    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.restocks.create(data);
    }
};

// ============================================
// MEMBER API
// ============================================

export const memberApi = {
    getAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.members.getAll();
    },

    getById: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.members.getById(id);
    },

    getByMemberNo: async (memberNo) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.members.getByMemberNo(memberNo);
    },

    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.members.create(data);
    },

    update: async (id, data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.members.update(id, data);
    },

    delete: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.members.delete(id);
    },

    search: async (searchTerm) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.members.search(searchTerm);
    }
};

// ============================================
// SALES API
// ============================================

export const salesApi = {
    getAll: async (options = {}) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.getAll(options);
    },

    getById: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.getById(id);
    },

    getHeldOrders: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.getHeldOrders();
    },

    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.create(data);
    },

    hold: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.hold(data);
    },

    completeHeld: async (id, updateData = {}) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.completeHeld(id, updateData);
    },

    cancel: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.cancel(id);
    },

    generateInvoiceNo: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.generateInvoiceNo();
    },

    getSummary: async (startDate, endDate) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.getSummary(startDate, endDate);
    },

    getDaily: async (days = 30) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.getDaily(days);
    }
};

// ============================================
// AUTH API
// ============================================

export const authApi = {
    login: async (email, password, deviceInfo = '') => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.auth.login(email, password, deviceInfo);
    },

    logout: async (token) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.auth.logout(token);
    },

    validateSession: async (token) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.auth.validateSession(token);
    },

    getCurrentUser: async (token) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.auth.getCurrentUser(token);
    },

    register: async (userData) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.auth.register(userData);
    }
};

// ============================================
// USER API
// ============================================

export const userApi = {
    getAll: async (options = {}) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.users.getAll(options);
    },

    getById: async (userId) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.users.getById(userId);
    },

    update: async (userId, data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.users.update(userId, data);
    },

    delete: async (userId) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.users.delete(userId);
    },

    search: async (query) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.users.search(query);
    }
};

// ============================================
// SETTINGS API
// ============================================

export const settingsApi = {
    // User settings
    getUserSettings: async (userId) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.getUserSettings(userId);
    },

    getCurrentUserWithSettings: async (userId) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.getCurrentUserWithSettings(userId);
    },

    updateUserProfile: async (userId, profileData) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.updateUserProfile(userId, profileData);
    },

    updateUserPermissions: async (userId, permissions) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.updateUserPermissions(userId, permissions);
    },

    updateProfileImage: async (userId, profileImage) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.updateProfileImage(userId, profileImage);
    },

    // App settings
    getAppSettings: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.getAppSettings();
    },

    getAppSetting: async (key) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.getAppSetting(key);
    },

    updateAppSettings: async (settings) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.updateAppSettings(settings);
    },

    updateAppSetting: async (key, value) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.updateAppSetting(key, value);
    },

    resetAppSettings: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.resetAppSettings();
    }
};

// Default export with all APIs
export default {
    categories: categoryApi,
    uom: uomApi,
    branches: branchApi,
    suppliers: supplierApi,
    items: itemApi,
    stock: stockApi,
    restocks: restockApi,
    members: memberApi,
    sales: salesApi,
    auth: authApi,
    users: userApi,
    settings: settingsApi,
    isElectron
};
