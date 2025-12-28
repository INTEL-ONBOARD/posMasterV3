/**
 * Database Seeder
 *
 * Creates default data when the database is first initialized.
 * Provides realistic Sri Lankan supermarket data for testing.
 */

const bcrypt = require('bcryptjs');
const { getDatabase } = require('./connection.cjs');
const { generateUUID, nowISO } = require('../utils/helpers.cjs');

/**
 * Seed default admin user
 * @returns {Object} Result of seeding
 */
function seedDefaultAdmin() {
    const db = getDatabase();

    // Check if any users exist
    const existingUser = db.prepare('SELECT id FROM users LIMIT 1').get();

    if (existingUser) {
        // Check if admin user exists but has no roles - fix it
        const adminUser = db.prepare("SELECT id, roles FROM users WHERE username = 'admin' LIMIT 1").get();
        if (adminUser) {
            let fixed = false;
            const roles = adminUser.roles ? JSON.parse(adminUser.roles) : [];

            // Fix roles if missing or doesn't include 'admin'
            if (!roles || roles.length === 0 || !roles.includes('admin')) {
                console.log('[Seeder] Admin user exists but has no/incorrect roles, fixing...');
                const stmt = db.prepare('UPDATE users SET roles = ?, updated_at = ? WHERE id = ?');
                stmt.run(JSON.stringify(['admin']), nowISO(), adminUser.id);
                console.log('[Seeder] Admin user roles fixed: ["admin"]');
                fixed = true;
            }

            // Check if admin has user_settings with permissions
            const adminSettings = db.prepare('SELECT id, permissions FROM user_settings WHERE user_id = ?').get(adminUser.id);
            if (!adminSettings) {
                console.log('[Seeder] Admin user has no settings, creating full permissions...');
                const fullAdminPermissions = {
                    SaleAccess: {
                        sale_process: true, sale_history: true, sale_view_inventory: true,
                        sale_reports: true, sale_configurations: true, sale_discounts: true
                    },
                    InventoryAccess: {
                        inventory_view: true, inventory_register_item: true, inventory_restock: true,
                        inventory_suppliers: true, inventory_discount: true, inventory_price_change: true,
                        inventory_history: true, inventory_configurations: true, inventory_reports: true
                    },
                    UserAccess: { user_manage: true, user_role_manage: true }
                };
                const settingsStmt = db.prepare(`
                    INSERT INTO user_settings (id, user_id, permissions, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                `);
                settingsStmt.run(generateUUID(), adminUser.id, JSON.stringify(fullAdminPermissions), nowISO(), nowISO());
                console.log('[Seeder] Admin user settings created with full permissions');
                fixed = true;
            }

            if (fixed) {
                return { seeded: false, message: 'Admin user fixed', roleFixed: true };
            }
        }
        console.log('[Seeder] Users already exist, skipping seed');
        return { seeded: false, message: 'Users already exist' };
    }

    // Create default admin user
    const defaultPassword = '12345';
    const passwordHash = bcrypt.hashSync(defaultPassword, 10);

    // NOTE: Admin users should NOT have a branch assigned by default
    // They should be able to select/switch between any branch
    // Only regular staff should have a fixed branch_id assignment

    const adminUser = {
        id: generateUUID(),
        cloud_id: null,
        username: 'admin',
        email: 'admin@posmaster.com',
        password_hash: passwordHash,
        full_name: 'System Administrator',
        roles: JSON.stringify(['admin']),
        branch_id: null, // Admin can select any branch
        is_active: 1,
        sync_status: 'local_only',
        created_at: nowISO(),
        updated_at: nowISO()
    };

    const stmt = db.prepare(`
        INSERT INTO users (id, cloud_id, username, email, password_hash, full_name, roles, branch_id, is_active, sync_status, created_at, updated_at)
        VALUES (@id, @cloud_id, @username, @email, @password_hash, @full_name, @roles, @branch_id, @is_active, @sync_status, @created_at, @updated_at)
    `);

    stmt.run(adminUser);

    // Create full admin permissions for the admin user
    const fullAdminPermissions = {
        SaleAccess: {
            sale_process: true,
            sale_history: true,
            sale_view_inventory: true,
            sale_reports: true,
            sale_configurations: true,
            sale_discounts: true
        },
        InventoryAccess: {
            inventory_view: true,
            inventory_register_item: true,
            inventory_restock: true,
            inventory_suppliers: true,
            inventory_discount: true,
            inventory_price_change: true,
            inventory_history: true,
            inventory_configurations: true,
            inventory_reports: true
        },
        UserAccess: {
            user_manage: true,
            user_role_manage: true
        }
    };

    // Insert admin settings with full permissions
    const settingsStmt = db.prepare(`
        INSERT INTO user_settings (id, user_id, permissions, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
    `);

    const settingsId = generateUUID();
    settingsStmt.run(settingsId, adminUser.id, JSON.stringify(fullAdminPermissions), nowISO(), nowISO());

    console.log('[Seeder] Default admin user created with full permissions');
    console.log('[Seeder] ================================');
    console.log('[Seeder] Username: admin');
    console.log('[Seeder] Password: 12345');
    console.log('[Seeder] ================================');

    return {
        seeded: true,
        message: 'Default admin created',
        credentials: {
            username: 'admin',
            password: '12345'
        }
    };
}

/**
 * Seed default Units of Measurement
 * @returns {Object} Result of seeding
 */
function seedDefaultUoms() {
    const db = getDatabase();

    // Check if UOMs already exist
    const existingUom = db.prepare('SELECT id FROM units_of_measurement LIMIT 1').get();

    if (existingUom) {
        console.log('[Seeder] UOMs already exist, skipping seed');
        return { seeded: false, message: 'UOMs already exist' };
    }

    const defaultUoms = [
        { symbol: 'pcs', unit_name: 'Pieces' },
        { symbol: 'kg', unit_name: 'Kilograms' },
        { symbol: 'g', unit_name: 'Grams' },
        { symbol: 'L', unit_name: 'Liters' },
        { symbol: 'mL', unit_name: 'Milliliters' },
        { symbol: 'pack', unit_name: 'Packs' },
        { symbol: 'box', unit_name: 'Boxes' },
        { symbol: 'doz', unit_name: 'Dozen' },
        { symbol: 'btl', unit_name: 'Bottles' },
        { symbol: 'can', unit_name: 'Cans' },
        { symbol: 'tube', unit_name: 'Tubes' },
        { symbol: 'sachet', unit_name: 'Sachets' },
        { symbol: 'm', unit_name: 'Meters' },
        { symbol: 'cm', unit_name: 'Centimeters' },
        { symbol: 'roll', unit_name: 'Rolls' }
    ];

    const stmt = db.prepare(`
        INSERT INTO units_of_measurement (symbol, unit_name, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, ?, 'local_only')
    `);

    const now = nowISO();
    const insertMany = db.transaction(() => {
        for (const uom of defaultUoms) {
            stmt.run(uom.symbol, uom.unit_name, now, now);
        }
    });

    insertMany();

    console.log('[Seeder] Default UOMs created:', defaultUoms.length);
    return { seeded: true, message: `Created ${defaultUoms.length} UOMs` };
}

/**
 * Seed default categories - 50 categories organized by department
 * @returns {Object} Result of seeding
 */
function seedDefaultCategories() {
    const db = getDatabase();

    // Check if categories already exist
    const existingCategory = db.prepare('SELECT id FROM categories LIMIT 1').get();

    if (existingCategory) {
        console.log('[Seeder] Categories already exist, skipping seed');
        return { seeded: false, message: 'Categories already exist' };
    }

    // 50 categories organized by brand and type (department)
    const defaultCategories = [
        // Beverages (10)
        { brand: 'Coca-Cola', type: 'Carbonated Drinks' },
        { brand: 'Elephant House', type: 'Carbonated Drinks' },
        { brand: 'Dilmah', type: 'Tea' },
        { brand: 'Lipton', type: 'Tea' },
        { brand: 'Nescafe', type: 'Coffee' },
        { brand: 'Highland', type: 'Fresh Milk' },
        { brand: 'Anchor', type: 'Milk Powder' },
        { brand: 'Milo', type: 'Malted Drinks' },
        { brand: 'Red Bull', type: 'Energy Drinks' },
        { brand: 'Richlife', type: 'Flavored Milk' },

        // Dairy Products (6)
        { brand: 'Kotmale', type: 'Yogurt' },
        { brand: 'Ambewela', type: 'Yogurt' },
        { brand: 'Anchor', type: 'Butter' },
        { brand: 'Happy Cow', type: 'Cheese' },
        { brand: 'Pelwatte', type: 'Curd' },
        { brand: 'Nestle', type: 'Ice Cream' },

        // Snacks & Biscuits (8)
        { brand: 'Munchee', type: 'Cream Biscuits' },
        { brand: 'Maliban', type: 'Crackers' },
        { brand: 'CBL', type: 'Chocolate Biscuits' },
        { brand: 'Tipi Tip', type: 'Potato Chips' },
        { brand: 'Kandos', type: 'Chocolates' },
        { brand: 'Ritzbury', type: 'Chocolates' },
        { brand: 'KIK', type: 'Toffees' },
        { brand: 'Star', type: 'Mixture' },

        // Instant Food (4)
        { brand: 'Prima', type: 'Instant Noodles' },
        { brand: 'Maggi', type: 'Instant Noodles' },
        { brand: 'Knorr', type: 'Soup Packets' },
        { brand: 'Raigam', type: 'Ready Meals' },

        // Rice & Grains (5)
        { brand: 'CIC', type: 'White Rice' },
        { brand: 'Nipuna', type: 'Red Rice' },
        { brand: 'Araliya', type: 'Basmati Rice' },
        { brand: 'Prima', type: 'Wheat Flour' },
        { brand: 'Local', type: 'Sugar' },

        // Cooking Essentials (5)
        { brand: 'MD', type: 'Coconut Oil' },
        { brand: 'Fortune', type: 'Vegetable Oil' },
        { brand: 'Heinz', type: 'Tomato Sauce' },
        { brand: 'Kist', type: 'Jam' },
        { brand: 'MA\'s', type: 'Curry Powder' },

        // Canned Goods (3)
        { brand: 'Marina', type: 'Canned Tuna' },
        { brand: 'Edinborough', type: 'Canned Fish' },
        { brand: 'Del Monte', type: 'Canned Fruits' },

        // Personal Care (6)
        { brand: 'Signal', type: 'Toothpaste' },
        { brand: 'Colgate', type: 'Toothpaste' },
        { brand: 'Sunsilk', type: 'Shampoo' },
        { brand: 'Lifebuoy', type: 'Bath Soap' },
        { brand: 'Lux', type: 'Bath Soap' },
        { brand: 'Dettol', type: 'Antiseptic' },

        // Household (3)
        { brand: 'Surf Excel', type: 'Washing Powder' },
        { brand: 'Harpic', type: 'Toilet Cleaner' },
        { brand: 'Mortein', type: 'Insect Repellent' }
    ];

    const stmt = db.prepare(`
        INSERT INTO categories (brand, type, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, ?, 'local_only')
    `);

    const now = nowISO();
    const insertMany = db.transaction(() => {
        for (const cat of defaultCategories) {
            stmt.run(cat.brand, cat.type, now, now);
        }
    });

    insertMany();

    console.log('[Seeder] Default categories created:', defaultCategories.length);
    return { seeded: true, message: `Created ${defaultCategories.length} categories` };
}

/**
 * Seed default branches
 * @returns {Object} Result of seeding
 */
function seedDefaultBranch() {
    const db = getDatabase();

    // Check if branches already exist
    const existingBranch = db.prepare('SELECT id FROM branches LIMIT 1').get();

    if (existingBranch) {
        console.log('[Seeder] Branches already exist, skipping seed');
        return { seeded: false, message: 'Branches already exist' };
    }

    const now = nowISO();

    const defaultBranches = [
        { name: 'Main Branch - Colombo', address: '45 Galle Road, Colombo 03', contact: '011 2345678' },
        { name: 'Kandy Branch', address: '78 Peradeniya Road, Kandy', contact: '081 2234567' }
    ];

    const stmt = db.prepare(`
        INSERT INTO branches (name, address, contact, is_active, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, 1, ?, ?, 'local_only')
    `);

    const insertMany = db.transaction(() => {
        for (const branch of defaultBranches) {
            stmt.run(branch.name, branch.address, branch.contact, now, now);
        }
    });

    insertMany();

    console.log('[Seeder] Default branches created:', defaultBranches.length);
    return { seeded: true, message: `Created ${defaultBranches.length} branches` };
}

/**
 * Seed default suppliers
 * @returns {Object} Result of seeding
 */
function seedDefaultSuppliers() {
    const db = getDatabase();

    // Check if suppliers already exist
    const existingSupplier = db.prepare('SELECT id FROM suppliers LIMIT 1').get();

    if (existingSupplier) {
        console.log('[Seeder] Suppliers already exist, skipping seed');
        return { seeded: false, message: 'Suppliers already exist' };
    }

    const now = nowISO();

    const defaultSuppliers = [
        {
            supplier_name: 'Ceylon Distributors (Pvt) Ltd',
            contact: '011 2345678',
            type: 'Wholesale',
            supplier_address: '123 Main Street, Colombo 10',
            account_bank: 'Bank of Ceylon',
            account_branch: 'Colombo Main',
            account_number: '1234567890',
            account_name: 'Ceylon Distributors Ltd'
        },
        {
            supplier_name: 'Lanka FMCG Suppliers',
            contact: '011 3456789',
            type: 'Manufacturer',
            supplier_address: '45 Industrial Zone, Kelaniya',
            account_bank: 'Commercial Bank',
            account_branch: 'Kelaniya',
            account_number: '9876543210',
            account_name: 'Lanka FMCG Suppliers'
        },
        {
            supplier_name: 'Fresh Farm Produce',
            contact: '077 1234567',
            type: 'Local Supplier',
            supplier_address: 'Dambulla Road, Matale',
            account_bank: 'Peoples Bank',
            account_branch: 'Matale',
            account_number: '5678901234',
            account_name: 'Fresh Farm Produce'
        },
        {
            supplier_name: 'Global Imports Co',
            contact: '011 4567890',
            type: 'Importer',
            supplier_address: '78 Port City, Colombo',
            account_bank: 'HSBC',
            account_branch: 'Colombo',
            account_number: '1122334455',
            account_name: 'Global Imports Company'
        },
        {
            supplier_name: 'Unilever Sri Lanka',
            contact: '011 5678901',
            type: 'Manufacturer',
            supplier_address: '258 Grandpass Road, Colombo 14',
            account_bank: 'Standard Chartered',
            account_branch: 'Colombo',
            account_number: '6677889900',
            account_name: 'Unilever Sri Lanka Ltd'
        }
    ];

    const stmt = db.prepare(`
        INSERT INTO suppliers (supplier_name, contact, type, supplier_address, status, account_bank, account_branch, account_number, account_name, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'local_only')
    `);

    const insertMany = db.transaction(() => {
        for (const supplier of defaultSuppliers) {
            stmt.run(
                supplier.supplier_name,
                supplier.contact,
                supplier.type,
                supplier.supplier_address,
                supplier.account_bank,
                supplier.account_branch,
                supplier.account_number,
                supplier.account_name,
                now,
                now
            );
        }
    });

    insertMany();

    console.log('[Seeder] Default suppliers created:', defaultSuppliers.length);
    return { seeded: true, message: `Created ${defaultSuppliers.length} suppliers` };
}

/**
 * Seed default items with stock - comprehensive test data
 * @returns {Object} Result of seeding
 */
function seedDefaultItems() {
    const db = getDatabase();

    // Check if items already exist
    const existingItem = db.prepare('SELECT id FROM items LIMIT 1').get();

    if (existingItem) {
        console.log('[Seeder] Items already exist, skipping seed');
        return { seeded: false, message: 'Items already exist' };
    }

    const now = nowISO();

    // Get UOM IDs
    const pcsUom = db.prepare("SELECT id FROM units_of_measurement WHERE symbol = 'pcs' LIMIT 1").get();
    const kgUom = db.prepare("SELECT id FROM units_of_measurement WHERE symbol = 'kg' LIMIT 1").get();
    const LUom = db.prepare("SELECT id FROM units_of_measurement WHERE symbol = 'L' LIMIT 1").get();
    const packUom = db.prepare("SELECT id FROM units_of_measurement WHERE symbol = 'pack' LIMIT 1").get();
    const btlUom = db.prepare("SELECT id FROM units_of_measurement WHERE symbol = 'btl' LIMIT 1").get();

    // Get category IDs - matching the 50 categories we created
    const getCategoryId = (brand, type) => {
        const cat = db.prepare("SELECT id FROM categories WHERE brand = ? AND type = ? LIMIT 1").get(brand, type);
        return cat?.id || null;
    };

    // Get first branch
    const branch = db.prepare("SELECT id FROM branches LIMIT 1").get();

    // Date helpers for expiry scenarios
    const today = new Date();
    const addDays = (days) => {
        const d = new Date(today);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    };

    // Items organized by category - matching our 50 categories
    const defaultItems = [
        // ========== BEVERAGES ==========
        // Coca-Cola - Carbonated Drinks
        { sku: 'BEV001', item_name: 'Coca Cola 500ml', brand: 'Coca-Cola', type: 'Carbonated Drinks', uom_id: pcsUom?.id, maximum_capacity: 200, stock_qty: 150, threshold: 40, stock_price: 100, retail_price: 130, discount_price: 0, expiry_days: 365 },
        { sku: 'BEV002', item_name: 'Coca Cola 1.5L', brand: 'Coca-Cola', type: 'Carbonated Drinks', uom_id: btlUom?.id, maximum_capacity: 100, stock_qty: 80, threshold: 20, stock_price: 200, retail_price: 260, discount_price: 0, expiry_days: 365 },
        { sku: 'BEV003', item_name: 'Sprite 500ml', brand: 'Coca-Cola', type: 'Carbonated Drinks', uom_id: pcsUom?.id, maximum_capacity: 150, stock_qty: 120, threshold: 30, stock_price: 100, retail_price: 130, discount_price: 0, expiry_days: 365 },
        { sku: 'BEV004', item_name: 'Fanta Orange 500ml', brand: 'Coca-Cola', type: 'Carbonated Drinks', uom_id: pcsUom?.id, maximum_capacity: 100, stock_qty: 85, threshold: 20, stock_price: 100, retail_price: 130, discount_price: 0, expiry_days: 365 },

        // Elephant House - Carbonated Drinks
        { sku: 'BEV005', item_name: 'EH Cream Soda 400ml', brand: 'Elephant House', type: 'Carbonated Drinks', uom_id: pcsUom?.id, maximum_capacity: 100, stock_qty: 75, threshold: 20, stock_price: 80, retail_price: 100, discount_price: 0, expiry_days: 180 },
        { sku: 'BEV006', item_name: 'EH Ginger Beer 400ml', brand: 'Elephant House', type: 'Carbonated Drinks', uom_id: pcsUom?.id, maximum_capacity: 80, stock_qty: 60, threshold: 16, stock_price: 85, retail_price: 110, discount_price: 0, expiry_days: 180 },
        { sku: 'BEV007', item_name: 'EH Necto 400ml', brand: 'Elephant House', type: 'Carbonated Drinks', uom_id: pcsUom?.id, maximum_capacity: 80, stock_qty: 55, threshold: 16, stock_price: 80, retail_price: 100, discount_price: 0, expiry_days: 180 },

        // Dilmah - Tea
        { sku: 'TEA001', item_name: 'Dilmah Ceylon Tea 100 Bags', brand: 'Dilmah', type: 'Tea', uom_id: packUom?.id, maximum_capacity: 50, stock_qty: 42, threshold: 10, stock_price: 450, retail_price: 550, discount_price: 0, expiry_days: 730 },
        { sku: 'TEA002', item_name: 'Dilmah Premium Tea 50 Bags', brand: 'Dilmah', type: 'Tea', uom_id: packUom?.id, maximum_capacity: 60, stock_qty: 48, threshold: 12, stock_price: 280, retail_price: 350, discount_price: 0, expiry_days: 730 },

        // Lipton - Tea
        { sku: 'TEA003', item_name: 'Lipton Yellow Label 100 Bags', brand: 'Lipton', type: 'Tea', uom_id: packUom?.id, maximum_capacity: 50, stock_qty: 38, threshold: 10, stock_price: 420, retail_price: 520, discount_price: 0, expiry_days: 730 },
        { sku: 'TEA004', item_name: 'Lipton Green Tea 25 Bags', brand: 'Lipton', type: 'Tea', uom_id: packUom?.id, maximum_capacity: 40, stock_qty: 28, threshold: 8, stock_price: 320, retail_price: 400, discount_price: 0, expiry_days: 730 },

        // Nescafe - Coffee
        { sku: 'COF001', item_name: 'Nescafe Classic 100g', brand: 'Nescafe', type: 'Coffee', uom_id: pcsUom?.id, maximum_capacity: 40, stock_qty: 28, threshold: 8, stock_price: 680, retail_price: 850, discount_price: 0, expiry_days: 540 },
        { sku: 'COF002', item_name: 'Nescafe 3-in-1 Pack (10s)', brand: 'Nescafe', type: 'Coffee', uom_id: packUom?.id, maximum_capacity: 100, stock_qty: 75, threshold: 20, stock_price: 150, retail_price: 200, discount_price: 0, expiry_days: 365 },

        // Highland - Fresh Milk
        { sku: 'MLK001', item_name: 'Highland Fresh Milk 1L', brand: 'Highland', type: 'Fresh Milk', uom_id: LUom?.id, maximum_capacity: 40, stock_qty: 25, threshold: 8, stock_price: 280, retail_price: 350, discount_price: 0, expiry_days: 10 },
        { sku: 'MLK002', item_name: 'Highland Fresh Milk 500ml', brand: 'Highland', type: 'Fresh Milk', uom_id: pcsUom?.id, maximum_capacity: 60, stock_qty: 40, threshold: 12, stock_price: 150, retail_price: 190, discount_price: 0, expiry_days: 10 },

        // Anchor - Milk Powder
        { sku: 'MLK003', item_name: 'Anchor Full Cream 400g', brand: 'Anchor', type: 'Milk Powder', uom_id: pcsUom?.id, maximum_capacity: 50, stock_qty: 38, threshold: 10, stock_price: 750, retail_price: 890, discount_price: 0, expiry_days: 365 },
        { sku: 'MLK004', item_name: 'Anchor Full Cream 1kg', brand: 'Anchor', type: 'Milk Powder', uom_id: pcsUom?.id, maximum_capacity: 30, stock_qty: 22, threshold: 6, stock_price: 1800, retail_price: 2150, discount_price: 0, expiry_days: 365 },

        // Milo - Malted Drinks
        { sku: 'MLT001', item_name: 'Milo 400g', brand: 'Milo', type: 'Malted Drinks', uom_id: pcsUom?.id, maximum_capacity: 40, stock_qty: 32, threshold: 8, stock_price: 650, retail_price: 780, discount_price: 0, expiry_days: 365 },
        { sku: 'MLT002', item_name: 'Milo Sachet Pack (10s)', brand: 'Milo', type: 'Malted Drinks', uom_id: packUom?.id, maximum_capacity: 80, stock_qty: 65, threshold: 16, stock_price: 180, retail_price: 230, discount_price: 0, expiry_days: 365 },

        // Red Bull - Energy Drinks
        { sku: 'ENG001', item_name: 'Red Bull 250ml', brand: 'Red Bull', type: 'Energy Drinks', uom_id: pcsUom?.id, maximum_capacity: 50, stock_qty: 8, threshold: 10, stock_price: 280, retail_price: 350, discount_price: 0, expiry_days: 540 },

        // Richlife - Flavored Milk
        { sku: 'FLV001', item_name: 'Richlife Chocolate Milk 200ml', brand: 'Richlife', type: 'Flavored Milk', uom_id: pcsUom?.id, maximum_capacity: 60, stock_qty: 45, threshold: 12, stock_price: 85, retail_price: 110, discount_price: 0, expiry_days: 14 },
        { sku: 'FLV002', item_name: 'Richlife Strawberry Milk 200ml', brand: 'Richlife', type: 'Flavored Milk', uom_id: pcsUom?.id, maximum_capacity: 60, stock_qty: 42, threshold: 12, stock_price: 85, retail_price: 110, discount_price: 0, expiry_days: 14 },

        // ========== DAIRY PRODUCTS ==========
        // Kotmale - Yogurt
        { sku: 'YOG001', item_name: 'Kotmale Curd 400g', brand: 'Kotmale', type: 'Yogurt', uom_id: pcsUom?.id, maximum_capacity: 30, stock_qty: 22, threshold: 6, stock_price: 150, retail_price: 190, discount_price: 0, expiry_days: 21 },
        { sku: 'YOG002', item_name: 'Kotmale Drinking Yogurt 180ml', brand: 'Kotmale', type: 'Yogurt', uom_id: pcsUom?.id, maximum_capacity: 50, stock_qty: 35, threshold: 10, stock_price: 95, retail_price: 125, discount_price: 0, expiry_days: 14 },

        // Ambewela - Yogurt
        { sku: 'YOG003', item_name: 'Ambewela Set Yogurt 80g', brand: 'Ambewela', type: 'Yogurt', uom_id: pcsUom?.id, maximum_capacity: 100, stock_qty: 78, threshold: 20, stock_price: 45, retail_price: 65, discount_price: 0, expiry_days: 21 },

        // Anchor - Butter
        { sku: 'BTR001', item_name: 'Anchor Butter 200g', brand: 'Anchor', type: 'Butter', uom_id: pcsUom?.id, maximum_capacity: 20, stock_qty: 12, threshold: 4, stock_price: 520, retail_price: 650, discount_price: 0, expiry_days: 90 },

        // Happy Cow - Cheese
        { sku: 'CHS001', item_name: 'Happy Cow Cheese 200g', brand: 'Happy Cow', type: 'Cheese', uom_id: pcsUom?.id, maximum_capacity: 25, stock_qty: 18, threshold: 5, stock_price: 480, retail_price: 580, discount_price: 0, expiry_days: 180 },
        { sku: 'CHS002', item_name: 'Happy Cow Cheese Spread 150g', brand: 'Happy Cow', type: 'Cheese', uom_id: pcsUom?.id, maximum_capacity: 30, stock_qty: 22, threshold: 6, stock_price: 380, retail_price: 460, discount_price: 0, expiry_days: 180 },

        // ========== SNACKS & BISCUITS ==========
        // Munchee - Cream Biscuits
        { sku: 'BSC001', item_name: 'Munchee Lemon Puff 200g', brand: 'Munchee', type: 'Cream Biscuits', uom_id: packUom?.id, maximum_capacity: 100, stock_qty: 78, threshold: 20, stock_price: 120, retail_price: 150, discount_price: 0, expiry_days: 180 },
        { sku: 'BSC002', item_name: 'Munchee Chocolate Puff 200g', brand: 'Munchee', type: 'Cream Biscuits', uom_id: packUom?.id, maximum_capacity: 80, stock_qty: 62, threshold: 16, stock_price: 130, retail_price: 160, discount_price: 0, expiry_days: 180 },

        // Maliban - Crackers
        { sku: 'BSC003', item_name: 'Maliban Cream Cracker 500g', brand: 'Maliban', type: 'Crackers', uom_id: packUom?.id, maximum_capacity: 80, stock_qty: 65, threshold: 16, stock_price: 180, retail_price: 220, discount_price: 0, expiry_days: 270 },
        { sku: 'BSC004', item_name: 'Maliban Marie 400g', brand: 'Maliban', type: 'Crackers', uom_id: packUom?.id, maximum_capacity: 70, stock_qty: 55, threshold: 14, stock_price: 160, retail_price: 200, discount_price: 0, expiry_days: 365 },

        // CBL - Chocolate Biscuits
        { sku: 'BSC005', item_name: 'Munchee Chocolate Biscuit 200g', brand: 'CBL', type: 'Chocolate Biscuits', uom_id: packUom?.id, maximum_capacity: 60, stock_qty: 45, threshold: 12, stock_price: 250, retail_price: 300, discount_price: 0, expiry_days: 180 },

        // Tipi Tip - Potato Chips
        { sku: 'SNK001', item_name: 'Tipi Tip Potato Chips 50g', brand: 'Tipi Tip', type: 'Potato Chips', uom_id: pcsUom?.id, maximum_capacity: 150, stock_qty: 130, threshold: 30, stock_price: 85, retail_price: 110, discount_price: 0, expiry_days: 120 },
        { sku: 'SNK002', item_name: 'Tipi Tip Cheese Chips 50g', brand: 'Tipi Tip', type: 'Potato Chips', uom_id: pcsUom?.id, maximum_capacity: 120, stock_qty: 95, threshold: 24, stock_price: 90, retail_price: 115, discount_price: 0, expiry_days: 120 },

        // Kandos - Chocolates
        { sku: 'CHO001', item_name: 'Kandos Milk Chocolate 45g', brand: 'Kandos', type: 'Chocolates', uom_id: pcsUom?.id, maximum_capacity: 100, stock_qty: 88, threshold: 20, stock_price: 150, retail_price: 195, discount_price: 0, expiry_days: 365 },
        { sku: 'CHO002', item_name: 'Kandos Dark Chocolate 45g', brand: 'Kandos', type: 'Chocolates', uom_id: pcsUom?.id, maximum_capacity: 80, stock_qty: 65, threshold: 16, stock_price: 160, retail_price: 210, discount_price: 0, expiry_days: 365 },

        // Ritzbury - Chocolates
        { sku: 'CHO003', item_name: 'Ritzbury Choco Malt 35g', brand: 'Ritzbury', type: 'Chocolates', uom_id: pcsUom?.id, maximum_capacity: 120, stock_qty: 95, threshold: 24, stock_price: 95, retail_price: 125, discount_price: 0, expiry_days: 270 },

        // ========== INSTANT FOOD ==========
        // Prima - Instant Noodles
        { sku: 'NDL001', item_name: 'Prima Chicken Noodles 85g', brand: 'Prima', type: 'Instant Noodles', uom_id: pcsUom?.id, maximum_capacity: 300, stock_qty: 245, threshold: 60, stock_price: 55, retail_price: 70, discount_price: 0, expiry_days: 365 },
        { sku: 'NDL002', item_name: 'Prima Kottu Mee 80g', brand: 'Prima', type: 'Instant Noodles', uom_id: pcsUom?.id, maximum_capacity: 200, stock_qty: 168, threshold: 40, stock_price: 50, retail_price: 65, discount_price: 0, expiry_days: 365 },

        // Maggi - Instant Noodles
        { sku: 'NDL003', item_name: 'Maggi 2-Minute Noodles 80g', brand: 'Maggi', type: 'Instant Noodles', uom_id: pcsUom?.id, maximum_capacity: 250, stock_qty: 185, threshold: 50, stock_price: 60, retail_price: 80, discount_price: 0, expiry_days: 365 },

        // ========== RICE & GRAINS ==========
        // CIC - White Rice
        { sku: 'RIC001', item_name: 'CIC White Rice 1kg', brand: 'CIC', type: 'White Rice', uom_id: kgUom?.id, maximum_capacity: 100, stock_qty: 75, threshold: 20, stock_price: 160, retail_price: 200, discount_price: 0, expiry_days: 365 },
        { sku: 'RIC002', item_name: 'CIC White Rice 5kg', brand: 'CIC', type: 'White Rice', uom_id: packUom?.id, maximum_capacity: 40, stock_qty: 28, threshold: 8, stock_price: 750, retail_price: 920, discount_price: 0, expiry_days: 365 },

        // Nipuna - Red Rice
        { sku: 'RIC003', item_name: 'Nipuna Red Rice 1kg', brand: 'Nipuna', type: 'Red Rice', uom_id: kgUom?.id, maximum_capacity: 80, stock_qty: 62, threshold: 16, stock_price: 180, retail_price: 220, discount_price: 0, expiry_days: 365 },

        // Araliya - Basmati Rice
        { sku: 'RIC004', item_name: 'Araliya Basmati 1kg', brand: 'Araliya', type: 'Basmati Rice', uom_id: kgUom?.id, maximum_capacity: 50, stock_qty: 38, threshold: 10, stock_price: 420, retail_price: 520, discount_price: 0, expiry_days: 730 },

        // Prima - Wheat Flour
        { sku: 'FLR001', item_name: 'Prima Wheat Flour 1kg', brand: 'Prima', type: 'Wheat Flour', uom_id: kgUom?.id, maximum_capacity: 60, stock_qty: 48, threshold: 12, stock_price: 220, retail_price: 280, discount_price: 0, expiry_days: 180 },

        // Local - Sugar
        { sku: 'SGR001', item_name: 'White Sugar 1kg', brand: 'Local', type: 'Sugar', uom_id: kgUom?.id, maximum_capacity: 80, stock_qty: 62, threshold: 16, stock_price: 230, retail_price: 290, discount_price: 0, expiry_days: 730 },

        // ========== COOKING ESSENTIALS ==========
        // MD - Coconut Oil
        { sku: 'OIL001', item_name: 'MD Coconut Oil 500ml', brand: 'MD', type: 'Coconut Oil', uom_id: btlUom?.id, maximum_capacity: 40, stock_qty: 32, threshold: 8, stock_price: 450, retail_price: 520, discount_price: 0, expiry_days: 365 },
        { sku: 'OIL002', item_name: 'MD Coconut Oil 1L', brand: 'MD', type: 'Coconut Oil', uom_id: btlUom?.id, maximum_capacity: 30, stock_qty: 22, threshold: 6, stock_price: 850, retail_price: 1020, discount_price: 0, expiry_days: 365 },

        // Fortune - Vegetable Oil
        { sku: 'OIL003', item_name: 'Fortune Sunflower Oil 1L', brand: 'Fortune', type: 'Vegetable Oil', uom_id: btlUom?.id, maximum_capacity: 30, stock_qty: 22, threshold: 6, stock_price: 680, retail_price: 820, discount_price: 0, expiry_days: 365 },

        // Heinz - Tomato Sauce
        { sku: 'SCE001', item_name: 'Heinz Tomato Ketchup 300g', brand: 'Heinz', type: 'Tomato Sauce', uom_id: pcsUom?.id, maximum_capacity: 40, stock_qty: 32, threshold: 8, stock_price: 380, retail_price: 450, discount_price: 0, expiry_days: 365 },

        // Kist - Jam
        { sku: 'JAM001', item_name: 'Kist Mixed Fruit Jam 510g', brand: 'Kist', type: 'Jam', uom_id: pcsUom?.id, maximum_capacity: 30, stock_qty: 22, threshold: 6, stock_price: 320, retail_price: 400, discount_price: 0, expiry_days: 365 },

        // ========== CANNED GOODS ==========
        // Marina - Canned Tuna
        { sku: 'CAN001', item_name: 'Marina Tuna Chunks 185g', brand: 'Marina', type: 'Canned Tuna', uom_id: pcsUom?.id, maximum_capacity: 60, stock_qty: 48, threshold: 12, stock_price: 320, retail_price: 390, discount_price: 0, expiry_days: 730 },

        // Edinborough - Canned Fish
        { sku: 'CAN002', item_name: 'Edinborough Fish Curry 425g', brand: 'Edinborough', type: 'Canned Fish', uom_id: pcsUom?.id, maximum_capacity: 40, stock_qty: 32, threshold: 8, stock_price: 380, retail_price: 460, discount_price: 0, expiry_days: 730 },

        // ========== PERSONAL CARE ==========
        // Signal - Toothpaste
        { sku: 'PRC001', item_name: 'Signal Strong Teeth 120g', brand: 'Signal', type: 'Toothpaste', uom_id: pcsUom?.id, maximum_capacity: 50, stock_qty: 42, threshold: 10, stock_price: 180, retail_price: 230, discount_price: 0, expiry_days: 730 },

        // Colgate - Toothpaste
        { sku: 'PRC002', item_name: 'Colgate MaxFresh 150g', brand: 'Colgate', type: 'Toothpaste', uom_id: pcsUom?.id, maximum_capacity: 50, stock_qty: 38, threshold: 10, stock_price: 220, retail_price: 280, discount_price: 0, expiry_days: 730 },

        // Sunsilk - Shampoo
        { sku: 'PRC003', item_name: 'Sunsilk Black Shine 180ml', brand: 'Sunsilk', type: 'Shampoo', uom_id: btlUom?.id, maximum_capacity: 40, stock_qty: 32, threshold: 8, stock_price: 320, retail_price: 400, discount_price: 0, expiry_days: 730 },

        // Lifebuoy - Bath Soap
        { sku: 'PRC004', item_name: 'Lifebuoy Total 100g', brand: 'Lifebuoy', type: 'Bath Soap', uom_id: pcsUom?.id, maximum_capacity: 100, stock_qty: 85, threshold: 20, stock_price: 95, retail_price: 120, discount_price: 0, expiry_days: 1095 },

        // Lux - Bath Soap
        { sku: 'PRC005', item_name: 'Lux Soft Touch 100g', brand: 'Lux', type: 'Bath Soap', uom_id: pcsUom?.id, maximum_capacity: 80, stock_qty: 72, threshold: 16, stock_price: 110, retail_price: 140, discount_price: 0, expiry_days: 1095 },

        // Dettol - Antiseptic
        { sku: 'PRC006', item_name: 'Dettol Antiseptic 100ml', brand: 'Dettol', type: 'Antiseptic', uom_id: btlUom?.id, maximum_capacity: 40, stock_qty: 32, threshold: 8, stock_price: 280, retail_price: 350, discount_price: 0, expiry_days: 1095 },

        // ========== HOUSEHOLD ==========
        // Surf Excel - Washing Powder
        { sku: 'HSH001', item_name: 'Surf Excel Quick Wash 1kg', brand: 'Surf Excel', type: 'Washing Powder', uom_id: packUom?.id, maximum_capacity: 50, stock_qty: 42, threshold: 10, stock_price: 380, retail_price: 460, discount_price: 0, expiry_days: 1095 },

        // Harpic - Toilet Cleaner
        { sku: 'HSH002', item_name: 'Harpic Toilet Cleaner 500ml', brand: 'Harpic', type: 'Toilet Cleaner', uom_id: btlUom?.id, maximum_capacity: 40, stock_qty: 32, threshold: 8, stock_price: 280, retail_price: 350, discount_price: 0, expiry_days: 1095 },

        // Mortein - Insect Repellent
        { sku: 'HSH003', item_name: 'Mortein Coils (10s)', brand: 'Mortein', type: 'Insect Repellent', uom_id: packUom?.id, maximum_capacity: 60, stock_qty: 48, threshold: 12, stock_price: 180, retail_price: 230, discount_price: 0, expiry_days: 730 },

        // ========== LOW STOCK ITEMS (for alerts testing) ==========
        { sku: 'LOW001', item_name: 'EH Lemonade 400ml', brand: 'Elephant House', type: 'Carbonated Drinks', uom_id: pcsUom?.id, maximum_capacity: 60, stock_qty: 5, threshold: 12, stock_price: 80, retail_price: 100, discount_price: 0, expiry_days: 180 },
        { sku: 'LOW002', item_name: 'Nestle Ice Cream 1L', brand: 'Nestle', type: 'Ice Cream', uom_id: pcsUom?.id, maximum_capacity: 20, stock_qty: 2, threshold: 4, stock_price: 650, retail_price: 800, discount_price: 0, expiry_days: 90 },

        // ========== OUT OF STOCK ITEMS ==========
        { sku: 'OUT001', item_name: 'Pelwatte Buffalo Curd 400g', brand: 'Pelwatte', type: 'Curd', uom_id: pcsUom?.id, maximum_capacity: 30, stock_qty: 0, threshold: 6, stock_price: 180, retail_price: 220, discount_price: 0, expiry_days: 21 },

        // ========== EXPIRING SOON ITEMS ==========
        { sku: 'EXP001', item_name: 'Highland Chocolate Milk 200ml', brand: 'Highland', type: 'Fresh Milk', uom_id: pcsUom?.id, maximum_capacity: 50, stock_qty: 35, threshold: 10, stock_price: 90, retail_price: 115, discount_price: 95, expiry_days: 5 }
    ];

    const itemStmt = db.prepare(`
        INSERT INTO items (sku, item_name, category_id, uom_id, branch_id, maximum_capacity, availability, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 'local_only')
    `);

    const stockStmt = db.prepare(`
        INSERT INTO stock (item_id, batch_code, quantity, threshold_limit, stock_price, retail_price, discount_price, expiry_date, availability, branch_id, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only')
    `);

    let createdCount = 0;
    let skippedCount = 0;

    const insertMany = db.transaction(() => {
        for (const item of defaultItems) {
            // Get category ID
            const categoryId = getCategoryId(item.brand, item.type);

            if (!categoryId) {
                console.log(`[Seeder] Skipping ${item.item_name} - no matching category for ${item.brand}/${item.type}`);
                skippedCount++;
                continue;
            }

            // Insert item
            const result = itemStmt.run(
                item.sku,
                item.item_name,
                categoryId,
                item.uom_id || pcsUom?.id,
                branch?.id,
                item.maximum_capacity,
                now,
                now
            );

            const itemId = result.lastInsertRowid;

            // Create stock record
            const batchCode = `BATCH-${item.sku}-001`;
            const expiryDate = addDays(item.expiry_days);

            // Set availability based on quantity
            const isOutOfStock = item.stock_qty === 0;
            const availability = isOutOfStock ? 0 : 1;

            stockStmt.run(
                itemId,
                batchCode,
                item.stock_qty,
                item.threshold,
                item.stock_price,
                item.retail_price,
                item.discount_price || 0,
                expiryDate,
                availability,
                branch?.id, // Add branch_id to stock record
                now,
                now
            );

            createdCount++;
        }
    });

    insertMany();

    console.log('[Seeder] Default items created:', createdCount);
    if (skippedCount > 0) {
        console.log('[Seeder] Items skipped (no matching category):', skippedCount);
    }

    return { seeded: true, message: `Created ${createdCount} items (${skippedCount} skipped)` };
}

/**
 * Seed default members
 * @returns {Object} Result of seeding
 */
function seedDefaultMember() {
    const db = getDatabase();

    // Check if members already exist
    const existingMember = db.prepare('SELECT id FROM members LIMIT 1').get();

    if (existingMember) {
        console.log('[Seeder] Members already exist, skipping seed');
        return { seeded: false, message: 'Members already exist' };
    }

    const now = nowISO();

    const defaultMembers = [
        // Walk-in customer (default for anonymous sales)
        { member_no: 'MEM000001', full_name: 'Walk-in Customer', contact: '', address: '', member_type: 'regular', is_active: 1 },

        // Regular customers
        { member_no: 'MEM000002', full_name: 'Nimal Perera', contact: '077 1234567', address: '45 Galle Road, Colombo 03', member_type: 'regular', is_active: 1 },
        { member_no: 'MEM000003', full_name: 'Sunil Fernando', contact: '076 3456789', address: '12 Station Road, Galle', member_type: 'regular', is_active: 1 },
        { member_no: 'MEM000004', full_name: 'Lakshmi Jayawardena', contact: '071 5678901', address: '56 Main Street, Matara', member_type: 'regular', is_active: 1 },
        { member_no: 'MEM000005', full_name: 'Rajitha Bandara', contact: '078 6789012', address: '89 Hill Street, Kandy', member_type: 'regular', is_active: 1 },

        // Premium customers
        { member_no: 'MEM000006', full_name: 'Kumari Silva', contact: '071 2345678', address: '78 Kandy Road, Kurunegala', member_type: 'premium', is_active: 1 },
        { member_no: 'MEM000007', full_name: 'Dr. Anura Bandara', contact: '078 4567890', address: '23 Temple Street, Kandy', member_type: 'premium', is_active: 1 },

        // Wholesale/Business customers
        { member_no: 'MEM000008', full_name: 'ABC Trading Company', contact: '011 2234567', address: '45 Industrial Zone, Ratmalana', member_type: 'wholesale', is_active: 1 },
        { member_no: 'MEM000009', full_name: 'Fresh Mart Supermarket', contact: '011 3345678', address: '78 Main Street, Moratuwa', member_type: 'wholesale', is_active: 1 },

        // Inactive member (for testing)
        { member_no: 'MEM000010', full_name: 'Old Customer Ltd', contact: '011 4456677', address: '89 Closed Lane, Colombo', member_type: 'wholesale', is_active: 0 }
    ];

    const stmt = db.prepare(`
        INSERT INTO members (member_no, full_name, contact, address, member_type, is_active, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'local_only')
    `);

    const insertMany = db.transaction(() => {
        for (const member of defaultMembers) {
            stmt.run(
                member.member_no,
                member.full_name,
                member.contact,
                member.address,
                member.member_type,
                member.is_active,
                now,
                now
            );
        }
    });

    insertMany();

    console.log('[Seeder] Default members created:', defaultMembers.length);
    return { seeded: true, message: `Created ${defaultMembers.length} members` };
}

/**
 * Run all seeders
 * Seeds default data when the database is first initialized
 */
function runSeeders() {
    console.log('[Seeder] Running database seeders...');

    const results = {
        uoms: seedDefaultUoms(),
        categories: seedDefaultCategories(),
        branches: seedDefaultBranch(),
        admin: seedDefaultAdmin(),
        suppliers: seedDefaultSuppliers(),
        members: seedDefaultMember(),
        items: seedDefaultItems()
    };

    console.log('[Seeder] Seeding complete');
    return results;
}

module.exports = {
    seedDefaultAdmin,
    seedDefaultUoms,
    seedDefaultCategories,
    seedDefaultBranch,
    seedDefaultSuppliers,
    seedDefaultMember,
    seedDefaultItems,
    runSeeders
};
