/**
 * Local API Bridge
 *
 * This module provides the same interface as the cloud API but uses
 * the local SQLite backend via Electron IPC instead.
 *
 * Usage: Import this instead of apiClient/client for local operations.
 *
 * @module localApi
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * @typedef {Object} ApiResponse
 * @property {'success'|'error'} status - Response status
 * @property {string} [message] - Error or success message
 * @property {*} [data] - Response data
 */

/**
 * @typedef {Object} Category
 * @property {number} id - Category ID
 * @property {string} brand - Brand name
 * @property {string} type - Category type
 * @property {string} created_at - ISO date string
 * @property {string} updated_at - ISO date string
 */

/**
 * @typedef {Object} CategoryCreateData
 * @property {string} brand - Brand name (required)
 * @property {string} type - Category type (required)
 */

/**
 * @typedef {Object} UOM
 * @property {number} id - UOM ID
 * @property {string} symbol - Unit symbol (e.g., "kg", "L", "pcs")
 * @property {string} unit_name - Full unit name (e.g., "Kilogram", "Liter", "Pieces")
 * @property {string} created_at - ISO date string
 * @property {string} updated_at - ISO date string
 */

/**
 * @typedef {Object} UOMCreateData
 * @property {string} symbol - Unit symbol (required)
 * @property {string} unit_name - Full unit name (required)
 */

/**
 * @typedef {Object} Branch
 * @property {number} id - Branch ID
 * @property {string} name - Branch name
 * @property {string} [address] - Branch address
 * @property {string} [contact] - Contact number
 * @property {boolean} is_active - Whether branch is active
 * @property {string} created_at - ISO date string
 * @property {string} updated_at - ISO date string
 */

/**
 * @typedef {Object} BranchCreateData
 * @property {string} name - Branch name (required)
 * @property {string} [address] - Branch address
 * @property {string} [contact] - Contact number
 * @property {boolean} [is_active=true] - Whether branch is active
 */

/**
 * @typedef {Object} Supplier
 * @property {number} id - Supplier ID
 * @property {string} supplier_name - Supplier name
 * @property {string} [contact] - Contact number
 * @property {string} [type] - Supplier type
 * @property {string} [supplier_address] - Supplier address
 * @property {boolean} status - Whether supplier is active
 * @property {number} current_amount - Current outstanding amount
 * @property {number} previous_amount - Previous balance
 * @property {string} [account_number] - Bank account number
 * @property {string} [account_bank] - Bank name
 * @property {string} [account_branch] - Bank branch
 * @property {string} [account_name] - Account holder name
 * @property {string} [account_nickname] - Account nickname
 * @property {string} created_at - ISO date string
 * @property {string} updated_at - ISO date string
 */

/**
 * @typedef {Object} SupplierCreateData
 * @property {string} supplier_name - Supplier name (required)
 * @property {string} [contact] - Contact number
 * @property {string} [type] - Supplier type
 * @property {string} [supplier_address] - Supplier address
 * @property {boolean} [status=true] - Whether supplier is active
 * @property {number} [current_amount=0] - Current outstanding amount
 * @property {string} [account_number] - Bank account number
 * @property {string} [account_bank] - Bank name
 * @property {string} [account_branch] - Bank branch
 * @property {string} [account_name] - Account holder name
 * @property {string} [account_nickname] - Account nickname
 */

/**
 * @typedef {Object} Item
 * @property {number} id - Item ID
 * @property {string} sku - Stock Keeping Unit (unique identifier)
 * @property {string} item_name - Item name
 * @property {string} [item_image_url] - Item image URL
 * @property {number} [maximum_capacity] - Maximum stock capacity
 * @property {number} [category_id] - Category ID (foreign key)
 * @property {number} [uom_id] - Unit of Measurement ID (foreign key)
 * @property {number} [branch_id] - Branch ID (foreign key)
 * @property {boolean} availability - Whether item is available
 * @property {string} created_at - ISO date string
 * @property {string} updated_at - ISO date string
 */

/**
 * @typedef {Object} ItemCreateData
 * @property {string} sku - Stock Keeping Unit (required, unique)
 * @property {string} item_name - Item name (required)
 * @property {string} [item_image_url] - Item image URL
 * @property {number} [maximum_capacity=0] - Maximum stock capacity
 * @property {number} [category_id] - Category ID
 * @property {number} [uom_id] - Unit of Measurement ID
 * @property {number} [branch_id] - Branch ID
 * @property {boolean} [availability=true] - Whether item is available
 */

/**
 * @typedef {Object} Stock
 * @property {number} id - Stock ID
 * @property {number} item_id - Item ID (foreign key)
 * @property {string} batch_code - Batch code
 * @property {number} quantity - Current quantity
 * @property {number} threshold_limit - Low stock threshold
 * @property {number} stock_price - Purchase price
 * @property {number} retail_price - Selling price
 * @property {number} [discount_price] - Discounted price
 * @property {string} [expiry_date] - Expiry date (ISO string)
 * @property {boolean} availability - Whether stock is available
 * @property {string} created_at - ISO date string
 * @property {string} updated_at - ISO date string
 */

/**
 * @typedef {Object} StockUpsertData
 * @property {number} item_id - Item ID (required)
 * @property {string} batch_code - Batch code (required)
 * @property {number} quantity - Quantity to add/set (required)
 * @property {number} [threshold_limit=0] - Low stock threshold
 * @property {number} stock_price - Purchase price (required)
 * @property {number} retail_price - Selling price (required)
 * @property {number} [discount_price] - Discounted price
 * @property {string} [expiry_date] - Expiry date (ISO string)
 */

/**
 * @typedef {Object} RestockItem
 * @property {string} sku - Item SKU (required)
 * @property {string} batch_code - Batch code (required)
 * @property {number} qty - Quantity (required)
 * @property {number} stock_price - Purchase price (required)
 * @property {number} retail_price - Selling price (required)
 * @property {string} [exp_date] - Expiry date (ISO string)
 */

/**
 * @typedef {Object} ReturnItem
 * @property {string} sku - Item SKU (required)
 * @property {string} batch_code - Batch code (required)
 * @property {number} qty - Quantity to return (required)
 * @property {string} [description] - Reason for return
 */

/**
 * @typedef {Object} RestockCreateData
 * @property {string} invoice_no - Invoice number (required, unique)
 * @property {string} [bill_no] - Bill number from supplier
 * @property {number} [supplier_id] - Supplier ID
 * @property {string} [prepared_by] - User ID who prepared
 * @property {string} [authorized_by] - User ID who authorized
 * @property {string} [payment_method] - Payment method (e.g., "cash", "credit", "bank")
 * @property {number} [discount=0] - Discount amount
 * @property {number} [expenses=0] - Additional expenses
 * @property {number} total_amount - Total transaction amount (required)
 * @property {number} [cash_amount=0] - Cash paid
 * @property {number} [change_amount=0] - Change given
 * @property {'low'|'medium'|'high'} [execution_level='medium'] - Priority level
 * @property {RestockItem[]} added_items - Items to add to stock (required)
 * @property {ReturnItem[]} [return_items=[]] - Items to return to supplier
 */

/**
 * @typedef {Object} Member
 * @property {number} id - Member ID
 * @property {string} member_no - Unique member number
 * @property {string} full_name - Member's full name
 * @property {string} [contact] - Contact number
 * @property {string} [address] - Address
 * @property {'regular'|'vip'|'wholesale'} member_type - Member type
 * @property {number} total_income - Total purchases
 * @property {number} total_credits - Outstanding credit
 * @property {boolean} is_active - Whether member is active
 * @property {string} created_at - ISO date string
 * @property {string} updated_at - ISO date string
 */

/**
 * @typedef {Object} MemberCreateData
 * @property {string} member_no - Unique member number (required)
 * @property {string} full_name - Member's full name (required)
 * @property {string} [contact] - Contact number
 * @property {string} [address] - Address
 * @property {'regular'|'vip'|'wholesale'} [member_type='regular'] - Member type
 * @property {boolean} [is_active=true] - Whether member is active
 */

/**
 * @typedef {Object} SaleItem
 * @property {number} item_id - Item ID (required)
 * @property {number} stock_id - Stock ID (required)
 * @property {string} batch_code - Batch code (required)
 * @property {number} quantity - Quantity sold (required)
 * @property {number} unit_price - Price per unit (required)
 * @property {number} [discount=0] - Item discount
 * @property {number} total_price - Total price for this item (required)
 */

/**
 * @typedef {Object} SaleCreateData
 * @property {string} invoice_no - Invoice number (required, unique)
 * @property {number} [member_id] - Member ID (for member sales)
 * @property {string} [cashier_id] - User ID of cashier
 * @property {'cash'|'credit'|'card'} [payment_method='cash'] - Payment method
 * @property {string} [credit_duration] - Credit duration (e.g., "30 days")
 * @property {number} [subtotal=0] - Subtotal before discount
 * @property {number} [discount=0] - Total discount
 * @property {number} total_amount - Final amount (required)
 * @property {number} [cash_received=0] - Cash received from customer
 * @property {number} [change_amount=0] - Change given
 * @property {boolean} [is_held=false] - Whether to hold the order
 * @property {SaleItem[]} items - Sale items (required)
 */

/**
 * @typedef {Object} User
 * @property {string} id - User UUID
 * @property {string} username - Username
 * @property {string} email - Email address
 * @property {string} full_name - Full name
 * @property {string[]} roles - User roles (e.g., ["admin", "cashier"])
 * @property {boolean} is_active - Whether user is active
 * @property {string} [last_login_at] - Last login timestamp
 * @property {string} created_at - ISO date string
 * @property {string} updated_at - ISO date string
 */

/**
 * @typedef {Object} UserRegisterData
 * @property {string} username - Username (required, unique)
 * @property {string} email - Email address (required, unique)
 * @property {string} password - Password (required)
 * @property {string} full_name - Full name (required)
 * @property {string[]} [roles=['user']] - User roles
 */

/**
 * @typedef {Object} UserUpdateData
 * @property {string} [username] - Username
 * @property {string} [email] - Email address
 * @property {string} [full_name] - Full name
 * @property {string[]} [roles] - User roles
 * @property {boolean} [is_active] - Whether user is active
 */

/**
 * @typedef {Object} LoginResponse
 * @property {'success'|'error'} status - Response status
 * @property {string} [message] - Error message
 * @property {Object} [data] - Login data
 * @property {User} [data.user] - Logged in user
 * @property {string} [data.token] - Session token
 */

/**
 * @typedef {Object} CloudSyncStatus
 * @property {boolean} isOnline - Whether internet is available
 * @property {boolean} isSyncing - Whether sync is in progress
 * @property {string|null} lastSyncTime - Last successful sync time
 * @property {string} syncStatus - Current status ('idle'|'syncing'|'completed'|'failed'|'offline'|'disabled')
 * @property {string} status - Alias of syncStatus
 * @property {string|null} syncError - Last error message
 * @property {boolean} autoSyncEnabled - Whether auto-sync is enabled
 * @property {boolean} syncEnabled - Alias of autoSyncEnabled
 * @property {number} pendingCount - Number of changes waiting to sync
 * @property {number} pendingChangesCount - Number of changes waiting to sync
 * @property {boolean} mysqlInitialized - Whether MySQL connection is ready
 * @property {string} connectionQuality - Current connection quality
*/

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if running in Electron environment
 * @returns {boolean}
 */
const isElectron = () => {
    return typeof window !== 'undefined' && window.electronAPI;
};

/**
 * Get the Electron API bridge
 * @returns {Object|null}
 */
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

/**
 * Category API - Manage product categories (brand + type combinations)
 * @namespace
 */
export const categoryApi = {
    /**
     * Get all categories
     * @returns {Promise<ApiResponse & {data: Category[]}>}
     */
    getAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.categories.getAll();
    },

    /**
     * Get category by ID
     * @param {number} id - Category ID
     * @returns {Promise<ApiResponse & {data: Category}>}
     */
    getById: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.categories.getById(id);
    },

    /**
     * Create a new category
     * @param {CategoryCreateData} data - Category data
     * @returns {Promise<ApiResponse & {data: Category}>}
     * @example
     * await categoryApi.create({
     *   brand: "Nike",
     *   type: "Shoes"
     * });
     */
    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.categories.create(data);
    },

    /**
     * Update a category
     * @param {number} id - Category ID
     * @param {Partial<CategoryCreateData>} data - Data to update
     * @returns {Promise<ApiResponse & {data: Category}>}
     */
    update: async (id, data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.categories.update(id, data);
    },

    /**
     * Delete a category
     * @param {number} id - Category ID
     * @returns {Promise<ApiResponse>}
     */
    delete: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.categories.delete(id);
    },

    /**
     * Search categories by brand or type
     * @param {string} searchTerm - Search term
     * @returns {Promise<ApiResponse & {data: Category[]}>}
     */
    search: async (searchTerm) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.categories.search(searchTerm);
    }
};

// ============================================
// UOM API
// ============================================

/**
 * Unit of Measurement API - Manage measurement units
 * @namespace
 */
export const uomApi = {
    /**
     * Get all units of measurement
     * @returns {Promise<ApiResponse & {data: UOM[]}>}
     */
    getAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.uom.getAll();
    },

    /**
     * Get UOM by ID
     * @param {number} id - UOM ID
     * @returns {Promise<ApiResponse & {data: UOM}>}
     */
    getById: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.uom.getById(id);
    },

    /**
     * Create a new unit of measurement
     * @param {UOMCreateData} data - UOM data
     * @returns {Promise<ApiResponse & {data: UOM}>}
     * @example
     * await uomApi.create({
     *   symbol: "kg",
     *   unit_name: "Kilogram"
     * });
     */
    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.uom.create(data);
    },

    /**
     * Update a unit of measurement
     * @param {number} id - UOM ID
     * @param {Partial<UOMCreateData>} data - Data to update
     * @returns {Promise<ApiResponse & {data: UOM}>}
     */
    update: async (id, data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.uom.update(id, data);
    },

    /**
     * Delete a unit of measurement
     * @param {number} id - UOM ID
     * @returns {Promise<ApiResponse>}
     */
    delete: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.uom.delete(id);
    }
};

// ============================================
// BRANCH API
// ============================================

/**
 * Branch API - Manage store branches/locations
 * @namespace
 */
export const branchApi = {
    /**
     * Get all branches
     * @returns {Promise<ApiResponse & {data: Branch[]}>}
     */
    getAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.branches.getAll();
    },

    /**
     * Get only active branches
     * @returns {Promise<ApiResponse & {data: Branch[]}>}
     */
    getActive: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.branches.getActive();
    },

    /**
     * Get branch by ID
     * @param {number} id - Branch ID
     * @returns {Promise<ApiResponse & {data: Branch}>}
     */
    getById: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.branches.getById(id);
    },

    /**
     * Create a new branch
     * @param {BranchCreateData} data - Branch data
     * @returns {Promise<ApiResponse & {data: Branch}>}
     * @example
     * await branchApi.create({
     *   name: "Main Store",
     *   address: "123 Main St",
     *   contact: "+94771234567"
     * });
     */
    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.branches.create(data);
    },

    /**
     * Update a branch
     * @param {number} id - Branch ID
     * @param {Partial<BranchCreateData>} data - Data to update
     * @returns {Promise<ApiResponse & {data: Branch}>}
     */
    update: async (id, data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.branches.update(id, data);
    },

    /**
     * Delete a branch
     * @param {number} id - Branch ID
     * @returns {Promise<ApiResponse>}
     */
    delete: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.branches.delete(id);
    }
};

// ============================================
// SUPPLIER API
// ============================================

/**
 * Supplier API - Manage suppliers/vendors
 * @namespace
 */
export const supplierApi = {
    /**
     * Get all suppliers
     * @returns {Promise<ApiResponse & {data: Supplier[]}>}
     */
    getAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.suppliers.getAll();
    },

    /**
     * Get only active suppliers
     * @returns {Promise<ApiResponse & {data: Supplier[]}>}
     */
    getActive: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.suppliers.getActive();
    },

    /**
     * Get supplier by ID
     * @param {number} id - Supplier ID
     * @returns {Promise<ApiResponse & {data: Supplier}>}
     */
    getById: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.suppliers.getById(id);
    },

    /**
     * Create a new supplier
     * @param {SupplierCreateData} data - Supplier data
     * @returns {Promise<ApiResponse & {data: Supplier}>}
     * @example
     * await supplierApi.create({
     *   supplier_name: "ABC Suppliers",
     *   contact: "+94771234567",
     *   type: "Wholesale",
     *   supplier_address: "456 Supply St",
     *   account_bank: "Commercial Bank",
     *   account_number: "1234567890"
     * });
     */
    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.suppliers.create(data);
    },

    /**
     * Update a supplier
     * @param {number} id - Supplier ID
     * @param {Partial<SupplierCreateData>} data - Data to update
     * @returns {Promise<ApiResponse & {data: Supplier}>}
     */
    update: async (id, data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.suppliers.update(id, data);
    },

    /**
     * Delete a supplier
     * @param {number} id - Supplier ID
     * @returns {Promise<ApiResponse>}
     */
    delete: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.suppliers.delete(id);
    },

    /**
     * Search suppliers by name
     * @param {string} searchTerm - Search term
     * @returns {Promise<ApiResponse & {data: Supplier[]}>}
     */
    search: async (searchTerm) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.suppliers.search(searchTerm);
    }
};

// ============================================
// ITEM API
// ============================================

/**
 * Item API - Manage products/items
 * @namespace
 */
export const itemApi = {
    /**
     * Get all items
     * @returns {Promise<ApiResponse & {data: Item[]}>}
     */
    getAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.items.getAll();
    },

    /**
     * Get all items with category and UOM details
     * @returns {Promise<ApiResponse & {data: (Item & {category: Category, uom: UOM})[]}>}
     */
    getAllExtended: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.items.getAllExtended();
    },

    /**
     * Get item by ID
     * @param {number} id - Item ID
     * @returns {Promise<ApiResponse & {data: Item}>}
     */
    getById: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.items.getById(id);
    },

    /**
     * Get item by SKU
     * @param {string} sku - Stock Keeping Unit
     * @returns {Promise<ApiResponse & {data: Item}>}
     */
    getBySku: async (sku) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.items.getBySku(sku);
    },

    /**
     * Create a new item
     * @param {ItemCreateData} data - Item data
     * @returns {Promise<ApiResponse & {data: Item}>}
     * @example
     * await itemApi.create({
     *   sku: "SHOE-001",
     *   item_name: "Running Shoes",
     *   category_id: 1,
     *   uom_id: 1,
     *   maximum_capacity: 100
     * });
     */
    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.items.create(data);
    },

    /**
     * Update an item
     * @param {number} id - Item ID
     * @param {Partial<ItemCreateData>} data - Data to update
     * @returns {Promise<ApiResponse & {data: Item}>}
     */
    update: async (id, data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.items.update(id, data);
    },

    /**
     * Delete an item
     * @param {number} id - Item ID
     * @returns {Promise<ApiResponse>}
     */
    delete: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.items.delete(id);
    },

    /**
     * Search items by name or SKU
     * @param {string} searchTerm - Search term
     * @returns {Promise<ApiResponse & {data: Item[]}>}
     */
    search: async (searchTerm) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.items.search(searchTerm);
    }
};

// ============================================
// STOCK API
// ============================================

/**
 * Stock API - Manage inventory stock levels
 * @namespace
 */
export const stockApi = {
    /**
     * Get all stock records
     * @returns {Promise<ApiResponse & {data: Stock[]}>}
     */
    getAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.stock.getAll();
    },

    /**
     * Get all stock with item details
     * @returns {Promise<ApiResponse & {data: (Stock & {item: Item})[]}>}
     */
    getAllWithItems: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.stock.getAllWithItems();
    },

    /**
     * Get stock records for an item by SKU
     * @param {string} sku - Item SKU
     * @returns {Promise<ApiResponse & {data: Stock[]}>}
     */
    getBySku: async (sku) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.stock.getBySku(sku);
    },

    /**
     * Get items with low stock (below threshold)
     * @returns {Promise<ApiResponse & {data: Stock[]}>}
     */
    getLowStock: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.stock.getLowStock();
    },

    /**
     * Get items expiring within specified days
     * @param {number} [days=30] - Number of days to check
     * @returns {Promise<ApiResponse & {data: Stock[]}>}
     */
    getExpiring: async (days = 30) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.stock.getExpiring(days);
    },

    /**
     * Insert or update stock (upsert by item_id + batch_code)
     * @param {StockUpsertData} data - Stock data
     * @returns {Promise<ApiResponse & {data: Stock}>}
     * @example
     * await stockApi.upsert({
     *   item_id: 1,
     *   batch_code: "BATCH-2024-001",
     *   quantity: 50,
     *   stock_price: 1000,
     *   retail_price: 1500,
     *   expiry_date: "2025-12-31"
     * });
     */
    upsert: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.stock.upsert(data);
    },

    /**
     * Update stock prices with optional audit trail
     * @param {number} id - Stock ID
     * @param {number} stockPrice - New stock price
     * @param {number} retailPrice - New retail price
     * @param {string} [changedBy] - Username making the change
     * @param {string} [reason] - Reason for price change
     * @returns {Promise<ApiResponse & {data: Stock}>}
     */
    updatePrices: async (id, stockPrice, retailPrice, changedBy, reason) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.stock.updatePrices(id, stockPrice, retailPrice, changedBy, reason);
    }
};

// ============================================
// RESTOCK API
// ============================================

/**
 * Restock API - Manage stock replenishment transactions
 * @namespace
 */
export const restockApi = {
    /**
     * Get all restock transactions
     * @param {Object} [options] - Query options
     * @param {number} [options.limit=100] - Max records to return
     * @param {number} [options.offset=0] - Records to skip
     * @returns {Promise<ApiResponse & {data: Object[]}>}
     */
    getAll: async (options = {}) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.restocks.getAll(options);
    },

    /**
     * Get restock transaction by ID with full details
     * @param {number} id - Restock ID
     * @returns {Promise<ApiResponse & {data: Object}>}
     */
    getById: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.restocks.getById(id);
    },

    /**
     * Get stock data for an item by SKU (batch codes, quantities, prices)
     * @param {string} sku - Item SKU
     * @returns {Promise<ApiResponse & {data: Stock[]}>}
     */
    getStockData: async (sku) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.restocks.getStockData(sku);
    },

    /**
     * Get all items with their stock information
     * @returns {Promise<ApiResponse & {data: Object[]}>}
     */
    getStockItems: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.restocks.getStockItems();
    },

    /**
     * Create a new restock transaction
     * @param {RestockCreateData} data - Restock data with items
     * @returns {Promise<ApiResponse & {data: Object}>}
     * @example
     * await restockApi.create({
     *   invoice_no: "RST-2024-001",
     *   supplier_id: 1,
     *   prepared_by: "user-uuid",
     *   payment_method: "cash",
     *   total_amount: 50000,
     *   cash_amount: 50000,
     *   added_items: [
     *     {
     *       sku: "SHOE-001",
     *       batch_code: "BATCH-2024-001",
     *       qty: 20,
     *       stock_price: 2000,
     *       retail_price: 3000,
     *       exp_date: "2025-12-31"
     *     }
     *   ],
     *   return_items: []
     * });
     */
    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.restocks.create(data);
    }
};

// ============================================
// MEMBER API
// ============================================

/**
 * Member API - Manage customer members
 * @namespace
 */
export const memberApi = {
    /**
     * Get all members
     * @returns {Promise<ApiResponse & {data: Member[]}>}
     */
    getAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.members.getAll();
    },

    /**
     * Get member by ID
     * @param {number} id - Member ID
     * @returns {Promise<ApiResponse & {data: Member}>}
     */
    getById: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.members.getById(id);
    },

    /**
     * Get member by member number
     * @param {string} memberNo - Member number
     * @returns {Promise<ApiResponse & {data: Member}>}
     */
    getByMemberNo: async (memberNo) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.members.getByMemberNo(memberNo);
    },

    /**
     * Create a new member
     * @param {MemberCreateData} data - Member data
     * @returns {Promise<ApiResponse & {data: Member}>}
     * @example
     * await memberApi.create({
     *   member_no: "MEM-001",
     *   full_name: "John Doe",
     *   contact: "+94771234567",
     *   address: "123 Customer St",
     *   member_type: "regular"
     * });
     */
    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.members.create(data);
    },

    /**
     * Update a member
     * @param {number} id - Member ID
     * @param {Partial<MemberCreateData>} data - Data to update
     * @returns {Promise<ApiResponse & {data: Member}>}
     */
    update: async (id, data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.members.update(id, data);
    },

    /**
     * Delete a member
     * @param {number} id - Member ID
     * @returns {Promise<ApiResponse>}
     */
    delete: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.members.delete(id);
    },

    /**
     * Search members by name or member number
     * @param {string} searchTerm - Search term
     * @returns {Promise<ApiResponse & {data: Member[]}>}
     */
    search: async (searchTerm) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.members.search(searchTerm);
    }
};

// ============================================
// SALES API
// ============================================

/**
 * Sales API - Manage sales transactions
 * @namespace
 */
export const salesApi = {
    /**
     * Get all sales transactions
     * @param {Object} [options] - Query options
     * @param {number} [options.limit=100] - Max records to return
     * @param {number} [options.offset=0] - Records to skip
     * @returns {Promise<ApiResponse & {data: Object[]}>}
     */
    getAll: async (options = {}) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.getAll(options);
    },

    /**
     * Get sale by ID with full details
     * @param {number} id - Sale ID
     * @returns {Promise<ApiResponse & {data: Object}>}
     */
    getById: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.getById(id);
    },

    /**
     * Get all held/pending orders
     * @returns {Promise<ApiResponse & {data: Object[]}>}
     */
    getHeldOrders: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.getHeldOrders();
    },

    /**
     * Create a new sale transaction
     * @param {SaleCreateData} data - Sale data with items
     * @returns {Promise<ApiResponse & {data: Object}>}
     * @example
     * await salesApi.create({
     *   invoice_no: "INV-2024-001",
     *   member_id: 1,
     *   cashier_id: "user-uuid",
     *   payment_method: "cash",
     *   subtotal: 5000,
     *   discount: 500,
     *   total_amount: 4500,
     *   cash_received: 5000,
     *   change_amount: 500,
     *   items: [
     *     {
     *       item_id: 1,
     *       stock_id: 1,
     *       batch_code: "BATCH-2024-001",
     *       quantity: 2,
     *       unit_price: 2500,
     *       discount: 250,
     *       total_price: 4750
     *     }
     *   ]
     * });
     */
    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.create(data);
    },

    /**
     * Create a held/pending order
     * @param {SaleCreateData} data - Sale data (same as create, is_held=true)
     * @returns {Promise<ApiResponse & {data: Object}>}
     */
    hold: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.hold(data);
    },

    /**
     * Complete a held order
     * @param {number} id - Sale ID
     * @param {Object} [updateData] - Optional updates (payment info, etc.)
     * @returns {Promise<ApiResponse & {data: Object}>}
     */
    completeHeld: async (id, updateData = {}) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.completeHeld(id, updateData);
    },

    /**
     * Cancel a sale and restore stock
     * @param {number} id - Sale ID
     * @returns {Promise<ApiResponse>}
     */
    cancel: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.cancel(id);
    },

    /**
     * Return items from a completed sale
     * @param {number} saleId - Sale ID
     * @param {{ items: Array, reason: string }} data
     * @returns {Promise<ApiResponse>}
     */
    returnItems: async (saleId, data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.return(saleId, data);
    },

    /**
     * Generate a unique invoice number
     * @returns {Promise<ApiResponse & {data: {invoice_no: string}}>}
     */
    generateInvoiceNo: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.generateInvoiceNo();
    },

    /**
     * Get sales summary for date range
     * @param {string} startDate - Start date (ISO string)
     * @param {string} endDate - End date (ISO string)
     * @returns {Promise<ApiResponse & {data: Object}>}
     */
    getSummary: async (startDate, endDate) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.getSummary(startDate, endDate);
    },

    /**
     * Get daily sales totals
     * @param {number} [days=30] - Number of days to retrieve
     * @returns {Promise<ApiResponse & {data: Object[]}>}
     */
    getDaily: async (days = 30) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.sales.getDaily(days);
    }
};

// ============================================
// PAYMENT METHODS API
// ============================================

/**
 * @typedef {Object} PaymentMethod
 * @property {number} id - Payment method ID
 * @property {string} name - Method name (e.g., "Cash", "Credit 3 Months")
 * @property {string} [description] - Description
 * @property {'cash'|'credit'|'special'} type - Payment type
 * @property {number} credit_months - Credit duration in months (0 for non-credit)
 * @property {number} interest_rate - Interest rate percentage
 * @property {boolean} is_active - Whether method is active
 * @property {boolean} is_member_only - Whether only available for members
 * @property {number} display_order - Display order for UI
 * @property {string} [icon] - Icon name (lucide icon)
 * @property {string} [color] - Color theme
 * @property {string} created_at - ISO date string
 * @property {string} updated_at - ISO date string
 */

/**
 * @typedef {Object} PaymentMethodCreateData
 * @property {string} name - Method name (required)
 * @property {string} [description] - Description
 * @property {'cash'|'credit'|'special'} type - Payment type (required)
 * @property {number} [credit_months=0] - Credit duration in months
 * @property {number} [interest_rate=0] - Interest rate percentage
 * @property {boolean} [is_active=true] - Whether method is active
 * @property {boolean} [is_member_only=false] - Whether only available for members
 * @property {number} [display_order=0] - Display order for UI
 * @property {string} [icon] - Icon name
 * @property {string} [color] - Color theme
 */

/**
 * Payment Methods API - Manage payment method configurations
 * @namespace
 */
export const paymentMethodApi = {
    /**
     * Get all payment methods
     * @returns {Promise<ApiResponse & {data: PaymentMethod[]}>}
     */
    getAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.paymentMethods.getAll();
    },

    /**
     * Get only active payment methods
     * @returns {Promise<ApiResponse & {data: PaymentMethod[]}>}
     */
    getActive: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.paymentMethods.getActive();
    },

    /**
     * Get payment methods available for members (all active methods)
     * @returns {Promise<ApiResponse & {data: PaymentMethod[]}>}
     */
    getForMembers: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.paymentMethods.getForMembers();
    },

    /**
     * Get payment methods available for non-members (cash only)
     * @returns {Promise<ApiResponse & {data: PaymentMethod[]}>}
     */
    getForNonMembers: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.paymentMethods.getForNonMembers();
    },

    /**
     * Get payment method by ID
     * @param {number} id - Payment method ID
     * @returns {Promise<ApiResponse & {data: PaymentMethod}>}
     */
    getById: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.paymentMethods.getById(id);
    },

    /**
     * Search payment methods by name or description
     * @param {string} searchTerm - Search term
     * @returns {Promise<ApiResponse & {data: PaymentMethod[]}>}
     */
    search: async (searchTerm) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.paymentMethods.search(searchTerm);
    },

    /**
     * Create a new payment method
     * @param {PaymentMethodCreateData} data - Payment method data
     * @returns {Promise<ApiResponse & {data: PaymentMethod}>}
     * @example
     * await paymentMethodApi.create({
     *   name: "Credit 12 Months",
     *   description: "12 months credit payment",
     *   type: "credit",
     *   credit_months: 12,
     *   is_member_only: true,
     *   icon: "CreditCard",
     *   color: "violet"
     * });
     */
    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.paymentMethods.create(data);
    },

    /**
     * Update a payment method
     * @param {number} id - Payment method ID
     * @param {Partial<PaymentMethodCreateData>} data - Data to update
     * @returns {Promise<ApiResponse & {data: PaymentMethod}>}
     */
    update: async (id, data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.paymentMethods.update(id, data);
    },

    /**
     * Toggle active status of a payment method
     * @param {number} id - Payment method ID
     * @returns {Promise<ApiResponse & {data: PaymentMethod}>}
     */
    toggleActive: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.paymentMethods.toggleActive(id);
    },

    /**
     * Delete a payment method
     * @param {number} id - Payment method ID
     * @returns {Promise<ApiResponse>}
     */
    delete: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.paymentMethods.delete(id);
    }
};

// ============================================
// AUTH API
// ============================================

/**
 * Authentication API - Handle user login/logout
 * @namespace
 */
export const authApi = {
    /**
     * Login with email and password
     * @param {string} email - User email
     * @param {string} password - User password
     * @param {string} [deviceInfo=''] - Device information
     * @returns {Promise<LoginResponse>}
     * @example
     * const result = await authApi.login("user@example.com", "password123");
     * if (result.status === 'success') {
     *   localStorage.setItem('token', result.data.token);
     * }
     */
    login: async (email, password, deviceInfo = '') => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.auth.login(email, password, deviceInfo);
    },

    /**
     * Logout and invalidate session
     * @param {string} token - Session token
     * @returns {Promise<ApiResponse>}
     */
    logout: async (token) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.auth.logout(token);
    },

    /**
     * Validate if session token is still valid
     * @param {string} token - Session token
     * @returns {Promise<ApiResponse & {data: {valid: boolean}}>}
     */
    validateSession: async (token) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.auth.validateSession(token);
    },

    /**
     * Get current logged in user from token
     * @param {string} token - Session token
     * @returns {Promise<ApiResponse & {data: User}>}
     */
    getCurrentUser: async (token) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.auth.getCurrentUser(token);
    },

    /**
     * Register a new user
     * @param {UserRegisterData} userData - User registration data
     * @returns {Promise<ApiResponse & {data: User}>}
     * @example
     * await authApi.register({
     *   username: "johndoe",
     *   email: "john@example.com",
     *   password: "securePassword123",
     *   full_name: "John Doe",
     *   roles: ["cashier"]
     * });
     */
    register: async (userData) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.auth.register(userData);
    },

    /**
     * Check session with cloud sync (for single-device enforcement)
     * This syncs active_sessions from cloud first, then validates the session locally.
     * If another device has logged in, this will return forcedLogout: true
     * @param {string} token - Session token
     * @returns {Promise<{valid: boolean, forcedLogout?: boolean, message?: string}>}
     */
    checkSessionWithSync: async (token) => {
        const api = getElectronAPI();
        if (!api) return { valid: false, message: 'Not in Electron environment' };
        return api.auth.checkSessionWithSync(token);
    },

    /**
     * Fast session validation (optimized for every API call)
     * Uses caching and background sync for speed
     * @param {string} token - Session token
     * @returns {Promise<{valid: boolean, forcedLogout?: boolean, message?: string}>}
     */
    validateSessionFast: async (token) => {
        const api = getElectronAPI();
        if (!api) return { valid: false, message: 'Not in Electron environment' };
        return api.auth.validateSessionFast(token);
    }
};

// ============================================
// USER API
// ============================================

/**
 * User API - Manage user accounts
 * @namespace
 */
export const userApi = {
    /**
     * Get all users
     * @param {Object} [options] - Query options
     * @param {number} [options.limit=100] - Max records to return
     * @param {number} [options.offset=0] - Records to skip
     * @returns {Promise<ApiResponse & {data: User[]}>}
     */
    getAll: async (options = {}) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.users.getAll(options);
    },

    /**
     * Get user by ID
     * @param {string} userId - User UUID
     * @returns {Promise<ApiResponse & {data: User}>}
     */
    getById: async (userId) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.users.getById(userId);
    },

    /**
     * Update user data
     * @param {string} userId - User UUID
     * @param {UserUpdateData} data - Data to update
     * @returns {Promise<ApiResponse & {data: User}>}
     */
    update: async (userId, data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.users.update(userId, data);
    },

    /**
     * Delete a user permanently
     * @param {string} userId - User UUID
     * @param {boolean} hardDelete - Whether to permanently delete (default: true)
     * @returns {Promise<ApiResponse>}
     */
    delete: async (userId, hardDelete = true) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.users.delete(userId, hardDelete);
    },

    /**
     * Deactivate a user (soft delete - keeps user in database but marks as inactive)
     * @param {string} userId - User UUID
     * @returns {Promise<ApiResponse>}
     */
    deactivate: async (userId) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.users.delete(userId, false);
    },

    /**
     * Search users by name, username, or email
     * @param {string} query - Search query
     * @returns {Promise<ApiResponse & {data: User[]}>}
     */
    search: async (query) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.users.search(query);
    },

    resetPassword: async (userId, newPassword) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.users.resetPassword(userId, newPassword);
    }
};

// ============================================
// SETTINGS API
// ============================================

/**
 * Settings API - Manage user and app settings
 * @namespace
 */
export const settingsApi = {
    /**
     * Get settings for a user
     * @param {string} userId - User UUID
     * @returns {Promise<ApiResponse & {data: Object}>}
     */
    getUserSettings: async (userId) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.getUserSettings(userId);
    },

    /**
     * Get user with their settings combined
     * @param {string} userId - User UUID
     * @returns {Promise<ApiResponse & {data: User & {settings: Object}}>}
     */
    getCurrentUserWithSettings: async (userId) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.getCurrentUserWithSettings(userId);
    },

    /**
     * Update user profile (name, contact, etc.)
     * @param {string} userId - User UUID
     * @param {Object} profileData - Profile data to update
     * @returns {Promise<ApiResponse>}
     */
    updateUserProfile: async (userId, profileData) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.updateUserProfile(userId, profileData);
    },

    /**
     * Update user permissions
     * @param {string} userId - User UUID
     * @param {Object} permissions - Permissions object
     * @returns {Promise<ApiResponse>}
     */
    updateUserPermissions: async (userId, permissions) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.updateUserPermissions(userId, permissions);
    },

    /**
     * Update user profile image
     * @param {string} userId - User UUID
     * @param {string} profileImage - Base64 encoded image or URL
     * @returns {Promise<ApiResponse>}
     */
    updateProfileImage: async (userId, profileImage) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.updateProfileImage(userId, profileImage);
    },

    /**
     * Get all application settings
     * @returns {Promise<ApiResponse & {data: Object}>}
     */
    getAppSettings: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.getAppSettings();
    },

    /**
     * Get a single application setting by key
     * @param {string} key - Setting key
     * @returns {Promise<ApiResponse & {data: {key: string, value: any}}>}
     */
    getAppSetting: async (key) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.getAppSetting(key);
    },

    /**
     * Update multiple application settings
     * @param {Object} settings - Key-value pairs of settings
     * @returns {Promise<ApiResponse>}
     */
    updateAppSettings: async (settings) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.updateAppSettings(settings);
    },

    /**
     * Update a single application setting
     * @param {string} key - Setting key
     * @param {any} value - Setting value
     * @returns {Promise<ApiResponse>}
     */
    updateAppSetting: async (key, value) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.updateAppSetting(key, value);
    },

    /**
     * Reset all application settings to defaults
     * @returns {Promise<ApiResponse>}
     */
    resetAppSettings: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.settings.resetAppSettings();
    }
};

// ============================================
// APP SETTINGS API (System behavior settings)
// ============================================

/**
 * App Settings API - Manage system behavior settings
 * @namespace
 */
export const appSettingsApi = {
    /**
     * Get all app settings with applied status
     * @returns {Promise<ApiResponse>}
     */
    getAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.appSettings.getAll();
    },

    /**
     * Set logout on close configuration
     * @param {boolean} enabled - Whether to logout when app closes
     * @returns {Promise<ApiResponse>}
     */
    setLogoutOnClose: async (enabled) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.appSettings.setLogoutOnClose(enabled);
    },

    /**
     * Set run on startup
     * @param {boolean} enabled
     * @returns {Promise<ApiResponse>}
     */
    setRunOnStartup: async (enabled) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.appSettings.setRunOnStartup(enabled);
    },

    /**
     * Set maximize on start
     * @param {boolean} enabled
     * @returns {Promise<ApiResponse>}
     */
    setMaximizeOnStart: async (enabled) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.appSettings.setMaximizeOnStart(enabled);
    },

    /**
     * Set notifications enabled
     * @param {boolean} enabled
     * @returns {Promise<ApiResponse>}
     */
    setNotifications: async (enabled) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.appSettings.setNotifications(enabled);
    },

    /**
     * Set cloud sync enabled
     * @param {boolean} enabled
     * @returns {Promise<ApiResponse>}
     */
    setCloudSync: async (enabled) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.appSettings.setCloudSync(enabled);
    },

    /**
     * Send test notification
     * @returns {Promise<ApiResponse>}
     */
    testNotification: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.appSettings.testNotification();
    },

    /**
     * Apply all settings (call after login)
     * @returns {Promise<ApiResponse>}
     */
    applyAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.appSettings.applyAll();
    },

    /**
     * Check if cloud sync is enabled
     * @returns {Promise<ApiResponse & {data: {enabled: boolean}}>}
     */
    isCloudSyncEnabled: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.appSettings.isCloudSyncEnabled();
    },

    // Idle tracking is handled entirely in the frontend (useActivityTracker hook).
    // This stub exists so the API surface is complete and callers don't throw.
    resetActivity: () => Promise.resolve({ status: 'success' })
};

// ============================================
// CLOUD SYNC API
// ============================================

/**
 * Cloud Sync API - Manage cloud database synchronization
 * @namespace
 */
export const cloudSyncApi = {
    /**
     * Get current sync status
     * @returns {Promise<ApiResponse & {data: CloudSyncStatus}>}
     */
    getStatus: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.cloudSync.getStatus();
    },

    /**
     * Trigger immediate sync to cloud
     * @returns {Promise<ApiResponse & {data: {synced: number, failed: number}}>}
     */
    syncNow: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.cloudSync.syncNow();
    },

    /**
     * Enable or disable auto-sync
     * @param {boolean} enabled - Whether to enable auto-sync
     * @returns {Promise<ApiResponse>}
     */
    setAutoSync: async (enabled) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.cloudSync.setAutoSync(enabled);
    },

    /**
     * Check network connectivity
     * @returns {Promise<ApiResponse & {data: {isOnline: boolean}}>}
     */
    checkNetwork: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.cloudSync.checkNetwork();
    },

    /**
     * Pull users from cloud (cloud is the primary source for users)
     * Use this to refresh local user data from the cloud database
     * @returns {Promise<ApiResponse & {data: {status: string, users: number, userSettings: number}}>}
     * @example
     * const result = await cloudSyncApi.pullUsers();
     * // { status: 'success', data: { status: 'success', users: 5, userSettings: 5 } }
     */
    pullUsers: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.cloudSync.pullUsers();
    },

    /**
     * Pull branches from cloud (safety net when branch selector shows empty on fresh install)
     * @returns {Promise<ApiResponse>}
     */
    pullBranches: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.cloudSync.pullBranches();
    },

    /**
     * Push a user to cloud
     * Use this to sync a locally created/updated user to the cloud
     * @param {User} user - The user object to push to cloud
     * @returns {Promise<ApiResponse & {data: {status: string}}>}
     * @example
     * const result = await cloudSyncApi.pushUser(newUser);
     * // { status: 'success', data: { status: 'success' } }
     */
    pushUser: async (user) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.cloudSync.pushUser(user);
    },

    /**
     * Force ensure MySQL schema exists (creates tables if missing)
     * Use this to fix sync issues when cloud tables are missing
     * @returns {Promise<ApiResponse & {data: {success: boolean, message: string}}>}
     * @example
     * const result = await cloudSyncApi.ensureSchema();
     * // { status: 'success', data: { success: true, message: 'MySQL schema created/verified successfully' } }
     */
    ensureSchema: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.cloudSync.ensureSchema();
    },

    /**
     * Initialize MySQL connection manually
     * Use this to reconnect to MySQL if connection was lost
     * @returns {Promise<ApiResponse & {data: {initialized: boolean}}>}
     */
    initializeMySQL: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.cloudSync.initializeMySQL();
    }
};

/**
 * Software Updates API - Check and install app updates via GitHub Releases
 * @namespace
 */
export const updatesApi = {
    getVersion: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.updates.getVersion();
    },
    checkForUpdates: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.updates.checkForUpdates();
    },
    downloadUpdate: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.updates.downloadUpdate();
    },
    installUpdate: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.updates.installUpdate();
    },
    onUpdateAvailable: (callback) => {
        const api = getElectronAPI();
        if (!api) return () => {};
        return api.updates.onUpdateAvailable(callback);
    },
    onUpdateNotAvailable: (callback) => {
        const api = getElectronAPI();
        if (!api) return () => {};
        return api.updates.onUpdateNotAvailable(callback);
    },
    onDownloadProgress: (callback) => {
        const api = getElectronAPI();
        if (!api) return () => {};
        return api.updates.onDownloadProgress(callback);
    },
    onUpdateDownloaded: (callback) => {
        const api = getElectronAPI();
        if (!api) return () => {};
        return api.updates.onUpdateDownloaded(callback);
    },
    onUpdateError: (callback) => {
        const api = getElectronAPI();
        if (!api) return () => {};
        return api.updates.onUpdateError(callback);
    },
};

// ============================================
// LOGIN HISTORY API
// ============================================

/**
 * @typedef {Object} LoginHistoryRecord
 * @property {number} id - Record ID
 * @property {string} user_id - User ID
 * @property {string} session_id - Session ID
 * @property {string} username - Username
 * @property {string} [full_name] - User's full name
 * @property {string} login_at - Login timestamp (ISO string)
 * @property {string} [logout_at] - Logout timestamp (ISO string)
 * @property {number} [duration_seconds] - Session duration in seconds
 * @property {string} [logout_reason] - Logout reason (manual, timeout, forced, app_close)
 * @property {string} [device_info] - Device information
 * @property {string} [ip_address] - IP address
 * @property {string} status - Status (active, completed, timeout)
 * @property {string} created_at - Created timestamp
 */

/**
 * @typedef {Object} UserLoginStats
 * @property {number} total_logins - Total login count
 * @property {number} total_duration_seconds - Total time logged in
 * @property {number} avg_duration_seconds - Average session duration
 * @property {string} last_login - Last login timestamp
 * @property {string} first_login - First login timestamp
 */

/**
 * @typedef {Object} DailyLoginStats
 * @property {string} date - Date (YYYY-MM-DD)
 * @property {number} login_count - Number of logins
 * @property {number} unique_users - Number of unique users
 * @property {number} total_duration_seconds - Total duration
 * @property {number} avg_duration_seconds - Average duration
 */

/**
 * Login History API
 * Track and view user login/logout activity
 */
export const loginHistoryApi = {
    /**
     * Get all login history with pagination
     * @param {Object} [options] - Query options
     * @param {number} [options.limit=50] - Maximum records
     * @param {number} [options.offset=0] - Records to skip
     * @param {string} [options.startDate] - Filter by start date
     * @param {string} [options.endDate] - Filter by end date
     * @returns {Promise<ApiResponse & {data: LoginHistoryRecord[]}>}
     */
    getAll: async (options = {}) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.loginHistory.getAll(options);
    },

    /**
     * Get login history for a specific user
     * @param {string} userId - User ID
     * @param {Object} [options] - Query options
     * @param {number} [options.limit=50] - Maximum records
     * @param {number} [options.offset=0] - Records to skip
     * @returns {Promise<ApiResponse & {data: LoginHistoryRecord[]}>}
     */
    getByUser: async (userId, options = {}) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.loginHistory.getByUser(userId, options);
    },

    /**
     * Get login history by date range
     * @param {string} startDate - Start date ISO string
     * @param {string} endDate - End date ISO string
     * @returns {Promise<ApiResponse & {data: LoginHistoryRecord[]}>}
     */
    getByDateRange: async (startDate, endDate) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.loginHistory.getByDateRange(startDate, endDate);
    },

    /**
     * Get login statistics for a user
     * @param {string} userId - User ID
     * @returns {Promise<ApiResponse & {data: UserLoginStats}>}
     */
    getUserStats: async (userId) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.loginHistory.getUserStats(userId);
    },

    /**
     * Get daily login statistics
     * @param {number} [days=30] - Number of days to look back
     * @returns {Promise<ApiResponse & {data: DailyLoginStats[]}>}
     */
    getDailyStats: async (days = 30) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.loginHistory.getDailyStats(days);
    },

    /**
     * Get user activity summary
     * @param {number} [days=30] - Number of days to look back
     * @returns {Promise<ApiResponse & {data: Array}>}
     */
    getUserActivitySummary: async (days = 30) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.loginHistory.getUserActivitySummary(days);
    },

    /**
     * Get currently active sessions
     * @returns {Promise<ApiResponse & {data: LoginHistoryRecord[]}>}
     */
    getActiveSessions: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.loginHistory.getActiveSessions();
    },

    /**
     * Count active sessions
     * @returns {Promise<ApiResponse & {data: {count: number}}>}
     */
    countActiveSessions: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.loginHistory.countActiveSessions();
    },

    /**
     * Mark stale sessions as timed out (cleanup)
     * @param {number} [hoursThreshold=24] - Hours after which to consider session stale
     * @returns {Promise<ApiResponse & {data: {markedCount: number}}>}
     */
    markStaleSessions: async (hoursThreshold = 24) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.loginHistory.markStaleSessions(hoursThreshold);
    }
};

// ============================================
// REAL-TIME DATA CHANGE LISTENER API
// ============================================

/**
 * @typedef {Object} DataChangeEvent
 * @property {string} table - The table that changed (e.g., 'items', 'stock')
 * @property {'INSERT'|'UPDATE'|'DELETE'} operation - The operation type
 * @property {string|number} recordId - The ID of the affected record
 * @property {Object} record - The record data
 * @property {string} timestamp - ISO timestamp of the change
 */

/**
 * Real-time Data Change Listener API
 * Subscribe to real-time data changes from the backend
 * @namespace
 */
export const dataChangeApi = {
    /**
     * Subscribe to data changes for specific tables
     * @param {Function} callback - Callback function receiving DataChangeEvent
     * @returns {Function} Unsubscribe function
     * @example
     * const unsubscribe = dataChangeApi.onDataChange((event) => {
     *   console.log('Data changed:', event.table, event.operation);
     *   if (event.table === 'items') {
     *     refetchItems();
     *   }
     * });
     * // Later: unsubscribe();
     */
    onDataChange: (callback) => {
        const api = getElectronAPI();
        if (!api?.onDataChange) {
            console.warn('onDataChange not available in this environment');
            return () => {};
        }
        return api.onDataChange(callback);
    },

    /**
     * Subscribe to sync status changes
     * @param {Function} callback - Callback function receiving sync status
     * @returns {Function} Unsubscribe function
     */
    onSyncStatusChange: (callback) => {
        const api = getElectronAPI();
        if (!api?.onSyncStatusChange) {
            console.warn('onSyncStatusChange not available in this environment');
            return () => {};
        }
        return api.onSyncStatusChange(callback);
    }
};

// ============================================
// BRANCH CONTEXT API
// ============================================

/**
 * @typedef {Object} BranchContext
 * @property {number} id - Branch ID
 * @property {string} name - Branch name
 * @property {string} [address] - Branch address
 * @property {string} [contact] - Branch contact
 * @property {number} is_active - Whether branch is active
 */

/**
 * Branch Context API - Manage current branch selection
 * @namespace
 */
export const branchContextApi = {
    /**
     * Get the currently selected branch
     * @returns {Promise<ApiResponse & {data: BranchContext | null}>}
     */
    getCurrent: async () => {
        const api = getElectronAPI();
        if (!api?.branchContext) return { status: 'error', message: 'Not in Electron environment' };
        return api.branchContext.getCurrent();
    },

    /**
     * Set the current branch context
     * @param {number} branchId - Branch ID to select
     * @returns {Promise<ApiResponse & {data: BranchContext}>}
     */
    setCurrent: async (branchId) => {
        const api = getElectronAPI();
        if (!api?.branchContext) return { status: 'error', message: 'Not in Electron environment' };
        return api.branchContext.setCurrent(branchId);
    },

    /**
     * Clear the current branch selection
     * @returns {Promise<ApiResponse>}
     */
    clear: async () => {
        const api = getElectronAPI();
        if (!api?.branchContext) return { status: 'error', message: 'Not in Electron environment' };
        return api.branchContext.clear();
    },

    /**
     * Check if branch selection is required
     * @returns {Promise<ApiResponse & {data: {required: boolean, currentBranch: BranchContext | null}}>}
     */
    isRequired: async () => {
        const api = getElectronAPI();
        if (!api?.branchContext) return { status: 'error', message: 'Not in Electron environment' };
        return api.branchContext.isRequired();
    },

    /**
     * Get branches available to the current user
     * @returns {Promise<ApiResponse & {data: BranchContext[]}>}
     */
    getAvailableBranches: async () => {
        const api = getElectronAPI();
        if (!api?.branchContext) return { status: 'error', message: 'Not in Electron environment' };
        return api.branchContext.getAvailableBranches();
    },

    /**
     * Validate if an operation can proceed (checks branch selection)
     * @param {string} operation - Operation name (e.g., 'create_sale', 'create_restock')
     * @returns {Promise<ApiResponse & {valid: boolean, message?: string, requiresBranch?: boolean}>}
     */
    validateOperation: async (operation) => {
        const api = getElectronAPI();
        if (!api?.branchContext) return { status: 'error', message: 'Not in Electron environment' };
        return api.branchContext.validateOperation(operation);
    },

    /**
     * Subscribe to branch context changes
     * @param {Function} callback - Called when branch changes with branch data or null
     * @returns {Function} Unsubscribe function
     */
    onBranchChanged: (callback) => {
        const api = getElectronAPI();
        if (!api?.branchContext?.onBranchChanged) {
            console.warn('onBranchChanged not available in this environment');
            return () => {};
        }
        return api.branchContext.onBranchChanged(callback);
    }
};

// ============================================
// TEA COOP API (External API Integration)
// ============================================

/**
 * @typedef {Object} TeaCoopMember
 * @property {number} id - Local database ID
 * @property {string} member_id - External member ID from Tea Coop API
 * @property {string} member_no - Member number
 * @property {string} full_name - Member's full name
 * @property {string} [contact] - Contact number
 * @property {string} [address] - Address
 * @property {number} factory_id - Factory ID
 * @property {number} green_leaf_value - Green leaf value
 * @property {number} loans - Loans amount
 * @property {number} net_amount - Net amount
 * @property {number} is_active - Active status
 * @property {string} last_fetched_at - Last fetch timestamp
 */

/**
 * @typedef {Object} TeaCoopPayment
 * @property {number} id - Local database ID
 * @property {string} member_id - Member ID
 * @property {number} year - Year
 * @property {number} month - Month
 * @property {number} green_leaf_value - Green leaf value
 * @property {number} loans - Loans amount
 * @property {number} net_amount - Net amount
 * @property {string} [payment_date] - Payment date
 */

/**
 * Tea Coop API - Integration with Tea Coop external API
 * Fetches member and payment data from external source
 * @namespace
 */
export const teaCoopApi = {
    /**
     * Initialize Tea Coop service (starts background sync)
     * @returns {Promise<ApiResponse>}
     */
    initialize: async () => {
        const api = getElectronAPI();
        if (!api?.teaCoop) return { status: 'error', message: 'Not in Electron environment' };
        return api.teaCoop.initialize();
    },

    /**
     * Get all Tea Coop members from local database
     * @returns {Promise<ApiResponse & {data: TeaCoopMember[]}>}
     */
    getAllMembers: async () => {
        const api = getElectronAPI();
        if (!api?.teaCoop) return { status: 'error', message: 'Not in Electron environment', data: [] };
        return api.teaCoop.getAllMembers();
    },

    /**
     * Get Tea Coop member by ID
     * @param {string} memberId - Member ID
     * @returns {Promise<ApiResponse & {data: TeaCoopMember}>}
     */
    getMemberById: async (memberId) => {
        const api = getElectronAPI();
        if (!api?.teaCoop) return { status: 'error', message: 'Not in Electron environment' };
        return api.teaCoop.getMemberById(memberId);
    },

    /**
     * Search Tea Coop members
     * @param {string} searchTerm - Search term
     * @returns {Promise<ApiResponse & {data: TeaCoopMember[]}>}
     */
    searchMembers: async (searchTerm) => {
        const api = getElectronAPI();
        if (!api?.teaCoop) return { status: 'error', message: 'Not in Electron environment', data: [] };
        return api.teaCoop.searchMembers(searchTerm);
    },

    /**
     * Get payment history for a member (last 6 months)
     * @param {string} memberId - Member ID
     * @param {number} [months=6] - Number of months to fetch
     * @returns {Promise<ApiResponse & {data: TeaCoopPayment[]}>}
     */
    getPaymentHistory: async (memberId, months = 6) => {
        const api = getElectronAPI();
        if (!api?.teaCoop) return { status: 'error', message: 'Not in Electron environment', data: [] };
        return api.teaCoop.getPaymentHistory(memberId, months);
    },

    /**
     * Sync members from Tea Coop API (manual trigger)
     * @returns {Promise<ApiResponse & {data: {totalFetched: number, inserted: number, updated: number}}>}
     */
    syncMembers: async () => {
        const api = getElectronAPI();
        if (!api?.teaCoop) return { status: 'error', message: 'Not in Electron environment' };
        return api.teaCoop.syncMembers();
    },

    /**
     * Sync payments for a specific member from API
     * @param {string} memberId - Member ID
     * @param {Object} [options] - Sync options
     * @param {number} [options.startYear] - Start year
     * @param {number} [options.startMonth] - Start month
     * @param {number} [options.monthLimit=6] - Number of months
     * @returns {Promise<ApiResponse>}
     */
    syncPayments: async (memberId, options = {}) => {
        const api = getElectronAPI();
        if (!api?.teaCoop) return { status: 'error', message: 'Not in Electron environment' };
        return api.teaCoop.syncPayments(memberId, options);
    },

    /**
     * Refresh member data (force fetch from API)
     * @param {string} memberId - Member ID
     * @returns {Promise<ApiResponse & {data: {member: TeaCoopMember, payments: TeaCoopPayment[]}}>}
     */
    refreshMember: async (memberId) => {
        const api = getElectronAPI();
        if (!api?.teaCoop) return { status: 'error', message: 'Not in Electron environment' };
        return api.teaCoop.refreshMember(memberId);
    },

    /**
     * Get Tea Coop sync status
     * @returns {Promise<ApiResponse & {data: {isSyncing: boolean, lastSyncTime: string}}>}
     */
    getStatus: async () => {
        const api = getElectronAPI();
        if (!api?.teaCoop) return { status: 'error', message: 'Not in Electron environment' };
        return api.teaCoop.getStatus();
    },

    /**
     * Subscribe to Tea Coop sync events
     * @param {Function} callback - Called on sync events with {type: 'started'|'completed'|'error', ...data}
     * @returns {Function} Unsubscribe function
     */
    onSyncEvent: (callback) => {
        const api = getElectronAPI();
        if (!api?.teaCoop?.onSyncEvent) {
            console.warn('teaCoop.onSyncEvent not available in this environment');
            return () => {};
        }
        return api.teaCoop.onSyncEvent(callback);
    }
};

// ============================================
// OFFERS & DISCOUNTS API
// ============================================

export const offersApi = {
    getAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.offers.getAll();
    },
    getActive: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.offers.getActive();
    },
    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.offers.create(data);
    },
    update: async (id, data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.offers.update(id, data);
    },
    delete: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.offers.delete(id);
    },
    toggleActive: async (id) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.offers.toggleActive(id);
    }
};

// ============================================
// DISPOSED ITEMS API
// ============================================

export const disposedApi = {
    getAll: async () => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.disposed.getAll();
    },
    create: async (data) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.disposed.create(data);
    },
    getByDateRange: async (startDate, endDate) => {
        const api = getElectronAPI();
        if (!api) return { status: 'error', message: 'Not in Electron environment' };
        return api.disposed.getByDateRange(startDate, endDate);
    }
};

// ============================================
// DEFAULT EXPORT
// ============================================

/**
 * Default export with all APIs
 */
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
    paymentMethods: paymentMethodApi,
    auth: authApi,
    users: userApi,
    settings: settingsApi,
    cloudSync: cloudSyncApi,
    updates: updatesApi,
    loginHistory: loginHistoryApi,
    dataChange: dataChangeApi,
    branchContext: branchContextApi,
    teaCoop: teaCoopApi,
    offers: offersApi,
    disposed: disposedApi,
    isElectron
};
