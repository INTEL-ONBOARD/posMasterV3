/**
 * Database Seeder
 *
 * Creates default data when the database is first initialized.
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

    // Get first branch ID if exists
    const branch = db.prepare('SELECT id FROM branches LIMIT 1').get();

    const adminUser = {
        id: generateUUID(),
        cloud_id: null,
        username: 'admin',
        email: 'admin@posmaster.com',
        password_hash: passwordHash,
        full_name: 'System Administrator',
        roles: JSON.stringify(['admin']),
        branch_id: branch?.id || null,
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
    // This must match the permissions structure in ManageRole.jsx predefinedRoles
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
 * Seed default categories with Sri Lankan supermarket brands
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

    // Sri Lankan supermarket brands
    const brands = [
        // Beverages
        'Elephant House', 'Coca-Cola', 'Pepsi', 'Sprite', 'Fanta', 'Nestomalt', 'Milo',
        'Nescafe', 'Lipton', 'Dilmah', 'Zesta', 'Akbar', 'Bogawantalawa', 'Watawala',
        'Richlife', 'Highland', 'Anchor', 'Fonterra', 'Ambewela', 'Pelwatte',
        // Food & Snacks
        'Munchee', 'Maliban', 'CBL', 'Prima', 'Raigam', 'Harischandra', 'MD',
        'Edinborough', 'Kist', 'Larich', 'Astra', 'Marina', 'Fortune', 'Sunlight',
        'Kandos', 'Ritzbury', 'Chun Wah', 'KIK', 'Star', 'Tipi Tip',
        // Personal Care
        'Signal', 'Closeup', 'Pepsodent', 'Colgate', 'Lifebuoy', 'Lux', 'Dettol',
        'Sunsilk', 'Clear', 'Head & Shoulders', 'Pantene', 'Dove', 'Nivea', 'Vaseline',
        'Parachute', 'Kumarika', 'Swadeshi', 'Link', 'Janet', 'Nature Secrets',
        // Household
        'Harpic', 'Vim', 'Domex', 'Cif', 'Mr. Muscle', 'Mortein', 'Good Knight',
        'Rin', 'Surf Excel', 'Sunlight', 'Breeze', 'Diva', 'Softlan', 'Comfort',
        'Velvet', 'Serene', 'Prima', 'Anchor', 'Atlas', 'Singer',
        // Rice & Grains
        'Nipuna', 'CIC', 'Araliya', 'Red Rice', 'White Rice', 'Keeri Samba',
        'Samba Rice', 'Basmati', 'Nadu Rice', 'Brown Rice', 'Rattail Rice',
        // Cooking
        'Siddhalepa', 'MA\'s', 'IFS', 'Raigam', 'Harischandra', 'CBL', 'MD',
        // International
        'Maggi', 'Knorr', 'Heinz', 'Kelloggs', 'Quaker', 'Nestle', 'Unilever',
        'P&G', 'Johnson & Johnson', 'Reckitt', 'Kraft', 'Mars', 'Cadbury',
        // Local Brands
        'Cargills', 'Keells', 'Arpico', 'Laugfs', 'Sathosa', 'Lanka Soy',
        'Plenty Foods', 'Catch', 'Happy Cow', 'Kotmale', 'Newdale', 'Pelawatta'
    ];

    // Product types/categories
    const types = [
        // Beverages
        'Carbonated Drinks', 'Fruit Juice', 'Energy Drinks', 'Mineral Water', 'Flavored Water',
        'Tea', 'Green Tea', 'Black Tea', 'Herbal Tea', 'Tea Bags', 'Loose Tea',
        'Coffee', 'Instant Coffee', 'Ground Coffee', 'Coffee Sachets',
        'Milk', 'Fresh Milk', 'Flavored Milk', 'Milk Powder', 'UHT Milk', 'Condensed Milk',
        'Malted Drinks', 'Chocolate Drinks', 'Health Drinks', 'Protein Drinks',
        // Snacks & Biscuits
        'Cream Biscuits', 'Plain Biscuits', 'Chocolate Biscuits', 'Wafer Biscuits',
        'Crackers', 'Cookies', 'Digestive Biscuits', 'Marie Biscuits', 'Glucose Biscuits',
        'Potato Chips', 'Cassava Chips', 'Banana Chips', 'Mixture', 'Murukku',
        'Chocolates', 'Toffees', 'Candy', 'Chewing Gum', 'Lollipops',
        // Instant Food
        'Instant Noodles', 'Cup Noodles', 'Pasta', 'Macaroni', 'Spaghetti',
        'Instant Rice', 'Ready to Eat Meals', 'Soup Packets', 'Porridge Mix',
        // Rice & Grains
        'White Rice', 'Red Rice', 'Basmati Rice', 'Samba Rice', 'Nadu Rice',
        'Brown Rice', 'Parboiled Rice', 'Raw Rice', 'String Hoppers Flour',
        'Wheat Flour', 'Rice Flour', 'Kurakkan Flour', 'Corn Flour', 'Gram Flour',
        'Oats', 'Corn Flakes', 'Muesli', 'Granola', 'Breakfast Cereals',
        // Cooking Essentials
        'Coconut Oil', 'Vegetable Oil', 'Sunflower Oil', 'Olive Oil', 'Sesame Oil',
        'Coconut Milk', 'Coconut Cream', 'Desiccated Coconut', 'Coconut Powder',
        'Sugar', 'Brown Sugar', 'Jaggery', 'Treacle', 'Honey',
        'Salt', 'Iodized Salt', 'Sea Salt', 'Pink Salt',
        'Vinegar', 'Soy Sauce', 'Fish Sauce', 'Oyster Sauce', 'Tomato Sauce',
        'Chili Sauce', 'Garlic Sauce', 'BBQ Sauce', 'Mayonnaise', 'Mustard',
        // Spices & Condiments
        'Chili Powder', 'Turmeric Powder', 'Curry Powder', 'Coriander Powder',
        'Cumin Powder', 'Pepper Powder', 'Garam Masala', 'Meat Curry Powder',
        'Fish Curry Powder', 'Roasted Curry Powder', 'Unroasted Curry Powder',
        'Cinnamon', 'Cardamom', 'Cloves', 'Nutmeg', 'Mace', 'Fenugreek',
        'Goraka', 'Tamarind', 'Maldive Fish', 'Dried Fish', 'Dried Prawns',
        // Canned & Preserved
        'Canned Fish', 'Canned Tuna', 'Canned Sardines', 'Canned Mackerel',
        'Canned Vegetables', 'Canned Beans', 'Canned Corn', 'Canned Peas',
        'Canned Fruits', 'Fruit Cocktail', 'Canned Pineapple', 'Canned Peaches',
        'Pickles', 'Acharu', 'Chutney', 'Jam', 'Marmalade', 'Peanut Butter',
        // Dairy Products
        'Fresh Milk', 'Full Cream Milk', 'Low Fat Milk', 'Skim Milk',
        'Curd', 'Yogurt', 'Drinking Yogurt', 'Greek Yogurt', 'Flavored Yogurt',
        'Cheese', 'Cheddar Cheese', 'Mozzarella', 'Processed Cheese', 'Cheese Spread',
        'Butter', 'Margarine', 'Ghee', 'Cream', 'Whipping Cream',
        'Ice Cream', 'Ice Cream Tub', 'Ice Cream Cone', 'Ice Cream Bar',
        // Frozen Foods
        'Frozen Chicken', 'Frozen Fish', 'Frozen Prawns', 'Frozen Cuttlefish',
        'Frozen Vegetables', 'Frozen Peas', 'Frozen Corn', 'Mixed Vegetables',
        'Frozen Parata', 'Frozen Roti', 'Frozen Samosa', 'Frozen Rolls',
        'Frozen Sausages', 'Frozen Nuggets', 'Frozen Burgers', 'Frozen Meatballs',
        // Meat & Poultry
        'Fresh Chicken', 'Chicken Breast', 'Chicken Drumsticks', 'Chicken Wings',
        'Minced Chicken', 'Chicken Sausages', 'Chicken Nuggets', 'Chicken Burgers',
        'Fresh Beef', 'Minced Beef', 'Beef Sausages', 'Beef Burgers',
        'Fresh Mutton', 'Mutton Curry Cut', 'Mutton Mince',
        // Seafood
        'Fresh Fish', 'Tuna', 'Seer Fish', 'Prawns', 'Cuttlefish', 'Crab',
        'Dried Sprats', 'Dried Prawns', 'Maldive Fish Chips',
        // Bakery
        'White Bread', 'Brown Bread', 'Whole Wheat Bread', 'Milk Bread',
        'Buns', 'Rolls', 'Croissants', 'Puff Pastry', 'Danish Pastry',
        'Cakes', 'Cupcakes', 'Muffins', 'Donuts', 'Éclairs',
        // Personal Care - Hair
        'Shampoo', 'Conditioner', 'Hair Oil', 'Hair Gel', 'Hair Cream',
        'Hair Serum', 'Anti-Dandruff Shampoo', 'Hair Color', 'Hair Dye',
        // Personal Care - Skin
        'Body Lotion', 'Face Cream', 'Moisturizer', 'Sunscreen', 'Face Wash',
        'Body Wash', 'Shower Gel', 'Bath Soap', 'Handwash', 'Hand Sanitizer',
        'Deodorant', 'Perfume', 'Body Spray', 'Talcum Powder',
        // Personal Care - Oral
        'Toothpaste', 'Toothbrush', 'Mouthwash', 'Dental Floss', 'Tongue Cleaner',
        // Personal Care - Feminine
        'Sanitary Pads', 'Panty Liners', 'Tampons', 'Feminine Wash',
        // Baby Care
        'Baby Milk Powder', 'Baby Cereal', 'Baby Food', 'Baby Biscuits',
        'Baby Diapers', 'Baby Wipes', 'Baby Soap', 'Baby Shampoo', 'Baby Oil',
        'Baby Lotion', 'Baby Powder', 'Baby Cream', 'Diaper Rash Cream',
        // Household Cleaning
        'Dish Wash Liquid', 'Dish Wash Bar', 'Dish Wash Powder',
        'Floor Cleaner', 'Toilet Cleaner', 'Glass Cleaner', 'Kitchen Cleaner',
        'Bleach', 'Disinfectant', 'Air Freshener', 'Room Spray',
        'Laundry Detergent', 'Washing Powder', 'Liquid Detergent', 'Fabric Softener',
        'Stain Remover', 'Bleaching Powder', 'Laundry Bar',
        // Household Items
        'Garbage Bags', 'Food Wrap', 'Aluminum Foil', 'Baking Paper',
        'Tissue Paper', 'Toilet Paper', 'Kitchen Towels', 'Napkins',
        'Sponges', 'Scrubbers', 'Mops', 'Brooms', 'Dustpans',
        // Pest Control
        'Mosquito Coils', 'Mosquito Spray', 'Mosquito Liquid', 'Mosquito Mats',
        'Cockroach Killer', 'Rat Poison', 'Ant Killer', 'Insect Spray',
        // Health & Wellness
        'Vitamins', 'Supplements', 'Calcium Tablets', 'Iron Tablets',
        'Pain Relievers', 'Cold Medicine', 'Cough Syrup', 'Balm',
        'First Aid', 'Bandages', 'Cotton', 'Antiseptic',
        // Pet Food
        'Dog Food', 'Cat Food', 'Fish Food', 'Bird Food', 'Pet Treats',
        // Stationery
        'Pens', 'Pencils', 'Notebooks', 'A4 Paper', 'Envelopes',
        'Glue', 'Tape', 'Scissors', 'Staplers', 'Files',
        // Electronics
        'Batteries', 'Light Bulbs', 'LED Bulbs', 'Extension Cords', 'Adapters'
    ];

    // Generate 1000 brand-type combinations
    const defaultCategories = [];
    let count = 0;

    // Create combinations until we reach 1000
    for (let i = 0; i < brands.length && count < 1000; i++) {
        for (let j = 0; j < types.length && count < 1000; j++) {
            // Create logical brand-type pairs
            const brand = brands[i];
            const type = types[j];

            // Skip illogical combinations
            if (shouldSkipCombination(brand, type)) continue;

            defaultCategories.push({ brand, type });
            count++;
        }
    }

    // If we haven't reached 1000, add more combinations
    while (defaultCategories.length < 1000) {
        const randomBrand = brands[Math.floor(Math.random() * brands.length)];
        const randomType = types[Math.floor(Math.random() * types.length)];

        // Check if this combination already exists
        const exists = defaultCategories.some(c => c.brand === randomBrand && c.type === randomType);
        if (!exists && !shouldSkipCombination(randomBrand, randomType)) {
            defaultCategories.push({ brand: randomBrand, type: randomType });
        }
    }

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
 * Helper to skip illogical brand-type combinations
 */
function shouldSkipCombination(brand, type) {
    // Beverage brands shouldn't have cleaning products
    const beverageBrands = ['Elephant House', 'Coca-Cola', 'Pepsi', 'Sprite', 'Fanta', 'Nestomalt', 'Milo', 'Nescafe', 'Lipton', 'Dilmah'];
    const cleaningTypes = ['Floor Cleaner', 'Toilet Cleaner', 'Bleach', 'Disinfectant', 'Laundry Detergent'];

    if (beverageBrands.includes(brand) && cleaningTypes.includes(type)) return true;

    // Cleaning brands shouldn't have food
    const cleaningBrands = ['Harpic', 'Vim', 'Domex', 'Cif', 'Mr. Muscle', 'Mortein', 'Good Knight'];
    const foodTypes = ['Biscuits', 'Chocolates', 'Rice', 'Milk', 'Cheese', 'Bread'];

    if (cleaningBrands.includes(brand) && foodTypes.some(f => type.includes(f))) return true;

    return false;
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
        { name: 'Morawakkorale Head Branch', address: 'Morawakkorale, Sri Lanka', contact: '075 0000000' },
        { name: 'Allen Valley Branch', address: 'Allen Valley, Sri Lanka', contact: '071 0000000' }
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
            supplier_name: 'Ceylon Distributors',
            contact: '011 2345678',
            type: 'Wholesale',
            supplier_address: '123 Main Street, Colombo',
            account_bank: 'BOC',
            account_branch: 'Colombo Main',
            account_number: '1234567890',
            account_name: 'Ceylon Distributors Ltd'
        },
        {
            supplier_name: 'Lanka Foods PVT',
            contact: '011 3456789',
            type: 'Manufacturer',
            supplier_address: '45 Industrial Zone, Kelaniya',
            account_bank: 'Commercial Bank',
            account_branch: 'Kelaniya',
            account_number: '9876543210',
            account_name: 'Lanka Foods PVT Ltd'
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
            supplier_name: 'Hill Country Beverages',
            contact: '052 2234567',
            type: 'Manufacturer',
            supplier_address: 'Tea Factory Road, Nuwara Eliya',
            account_bank: 'Sampath Bank',
            account_branch: 'Nuwara Eliya',
            account_number: '6677889900',
            account_name: 'Hill Country Beverages'
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
 * Seed default items with stock - comprehensive test data with various scenarios
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

    // Get actual category IDs from seeded categories (match actual type names in the categories table)
    const carbonatedCat = db.prepare("SELECT id FROM categories WHERE type = 'Carbonated Drinks' LIMIT 1").get();
    const milkPowderCat = db.prepare("SELECT id FROM categories WHERE type = 'Milk Powder' LIMIT 1").get();
    const teaCat = db.prepare("SELECT id FROM categories WHERE type = 'Tea' LIMIT 1").get();
    const coffeeCat = db.prepare("SELECT id FROM categories WHERE type = 'Instant Coffee' LIMIT 1").get();
    const biscuitsCat = db.prepare("SELECT id FROM categories WHERE type = 'Cream Biscuits' LIMIT 1").get();
    const crackersCat = db.prepare("SELECT id FROM categories WHERE type = 'Crackers' LIMIT 1").get();
    const noodlesCat = db.prepare("SELECT id FROM categories WHERE type = 'Instant Noodles' LIMIT 1").get();
    const freshMilkCat = db.prepare("SELECT id FROM categories WHERE type = 'Fresh Milk' LIMIT 1").get();
    const yogurtCat = db.prepare("SELECT id FROM categories WHERE type = 'Yogurt' LIMIT 1").get();
    const riceCat = db.prepare("SELECT id FROM categories WHERE type = 'White Rice' LIMIT 1").get();
    const redRiceCat = db.prepare("SELECT id FROM categories WHERE type = 'Red Rice' LIMIT 1").get();
    const coconutOilCat = db.prepare("SELECT id FROM categories WHERE type = 'Coconut Oil' LIMIT 1").get();
    const toothpasteCat = db.prepare("SELECT id FROM categories WHERE type = 'Toothpaste' LIMIT 1").get();
    const shampooCat = db.prepare("SELECT id FROM categories WHERE type = 'Shampoo' LIMIT 1").get();
    const soapCat = db.prepare("SELECT id FROM categories WHERE type = 'Bath Soap' LIMIT 1").get();
    const detergentCat = db.prepare("SELECT id FROM categories WHERE type = 'Washing Powder' LIMIT 1").get();
    const chipsCat = db.prepare("SELECT id FROM categories WHERE type = 'Potato Chips' LIMIT 1").get();
    const chocolateCat = db.prepare("SELECT id FROM categories WHERE type = 'Chocolates' LIMIT 1").get();
    const cannedFishCat = db.prepare("SELECT id FROM categories WHERE type = 'Canned Tuna' LIMIT 1").get();
    const sugarCat = db.prepare("SELECT id FROM categories WHERE type = 'Sugar' LIMIT 1").get();
    const flourCat = db.prepare("SELECT id FROM categories WHERE type = 'Wheat Flour' LIMIT 1").get();
    const butterCat = db.prepare("SELECT id FROM categories WHERE type = 'Butter' LIMIT 1").get();
    const cheeseCat = db.prepare("SELECT id FROM categories WHERE type = 'Cheddar Cheese' LIMIT 1").get();

    // Get first branch
    const branch = db.prepare("SELECT id FROM branches LIMIT 1").get();

    // Date helpers for expiry scenarios
    const today = new Date();
    const addDays = (days) => {
        const d = new Date(today);
        d.setDate(d.getDate() + days);
        return d.toISOString().split('T')[0];
    };

    // Comprehensive test items with different scenarios
    // Stock scenarios: HIGH (>80%), MEDIUM (40-80%), LOW (<threshold), OUT_OF_STOCK, OVERSTOCKED (>100%)
    // Price scenarios: Budget (<Rs.100), Mid-range (Rs.100-500), Premium (>Rs.500)
    // Expiry scenarios: Long shelf life, Normal, Expiring soon (7 days), Expired
    // Multi-batch scenarios: Items with multiple batches at different prices/expiry dates
    //
    // Items with `batches` array will have multiple stock records
    // Items without `batches` use the single batch format (backwards compatible)
    const defaultItems = [
        // ========== BEVERAGES - Various stock levels ==========
        // HIGH STOCK with MULTIPLE BATCHES (different expiry dates and prices)
        {
            sku: 'BEV001',
            item_name: 'Coca Cola 500ml',
            category_id: carbonatedCat?.id,
            uom_id: pcsUom?.id,
            maximum_capacity: 200,
            threshold: 40,
            batches: [
                { batch_code: 'BATCH-BEV001-001', qty: 80, stock_price: 95, retail_price: 125, discount_price: 115, expiry_days: 90 },   // Older batch, lower price
                { batch_code: 'BATCH-BEV001-002', qty: 60, stock_price: 100, retail_price: 130, discount_price: 120, expiry_days: 180 }, // Mid batch
                { batch_code: 'BATCH-BEV001-003', qty: 40, stock_price: 105, retail_price: 135, discount_price: 0, expiry_days: 365 }    // Newest batch, higher price
            ]
        },
        {
            sku: 'BEV002',
            item_name: 'Pepsi 500ml',
            category_id: carbonatedCat?.id,
            uom_id: pcsUom?.id,
            maximum_capacity: 200,
            threshold: 40,
            batches: [
                { batch_code: 'BATCH-BEV002-001', qty: 75, stock_price: 90, retail_price: 120, discount_price: 110, expiry_days: 60 },   // Expiring soon, discounted
                { batch_code: 'BATCH-BEV002-002', qty: 100, stock_price: 95, retail_price: 125, discount_price: 0, expiry_days: 300 }    // Fresh batch
            ]
        },
        { sku: 'BEV003', item_name: 'Sprite 500ml', category_id: carbonatedCat?.id, uom_id: pcsUom?.id, maximum_capacity: 150, stock_qty: 140, threshold: 30, stock_price: 100, retail_price: 130, discount_price: 0, expiry_days: 365 },

        // MEDIUM STOCK (40-60% capacity)
        { sku: 'BEV004', item_name: 'Elephant House Cream Soda 400ml', category_id: carbonatedCat?.id, uom_id: pcsUom?.id, maximum_capacity: 100, stock_qty: 48, threshold: 20, stock_price: 80, retail_price: 100, discount_price: 0, expiry_days: 180 },
        { sku: 'BEV005', item_name: 'Fanta Orange 500ml', category_id: carbonatedCat?.id, uom_id: pcsUom?.id, maximum_capacity: 100, stock_qty: 55, threshold: 20, stock_price: 100, retail_price: 130, discount_price: 0, expiry_days: 300 },
        { sku: 'BEV006', item_name: 'Mountain Dew 500ml', category_id: carbonatedCat?.id, uom_id: pcsUom?.id, maximum_capacity: 80, stock_qty: 40, threshold: 16, stock_price: 105, retail_price: 135, discount_price: 125, expiry_days: 270 },

        // LOW STOCK (below threshold - needs restock alert)
        { sku: 'BEV007', item_name: 'Red Bull 250ml', category_id: carbonatedCat?.id, uom_id: pcsUom?.id, maximum_capacity: 50, stock_qty: 8, threshold: 10, stock_price: 280, retail_price: 350, discount_price: 0, expiry_days: 540 },
        { sku: 'BEV008', item_name: 'Monster Energy 500ml', category_id: carbonatedCat?.id, uom_id: pcsUom?.id, maximum_capacity: 40, stock_qty: 5, threshold: 8, stock_price: 350, retail_price: 450, discount_price: 0, expiry_days: 365 },

        // OUT OF STOCK
        { sku: 'BEV009', item_name: 'Elephant House Ginger Beer 400ml', category_id: carbonatedCat?.id, uom_id: pcsUom?.id, maximum_capacity: 60, stock_qty: 0, threshold: 12, stock_price: 85, retail_price: 110, discount_price: 0, expiry_days: 180 },

        // OVERSTOCKED (above 100% capacity)
        { sku: 'BEV010', item_name: 'Coca Cola 1.5L', category_id: carbonatedCat?.id, uom_id: btlUom?.id, maximum_capacity: 100, stock_qty: 120, threshold: 20, stock_price: 200, retail_price: 260, discount_price: 240, expiry_days: 365 },

        // ========== TEA & COFFEE ==========
        { sku: 'TEA001', item_name: 'Dilmah Ceylon Tea 100 Bags', category_id: teaCat?.id, uom_id: packUom?.id, maximum_capacity: 50, stock_qty: 42, threshold: 10, stock_price: 450, retail_price: 550, discount_price: 0, expiry_days: 730 },
        { sku: 'TEA002', item_name: 'Lipton Yellow Label 100 Bags', category_id: teaCat?.id, uom_id: packUom?.id, maximum_capacity: 60, stock_qty: 35, threshold: 12, stock_price: 420, retail_price: 520, discount_price: 0, expiry_days: 730 },
        { sku: 'TEA003', item_name: 'Zesta Premium Tea 200g', category_id: teaCat?.id, uom_id: packUom?.id, maximum_capacity: 40, stock_qty: 8, threshold: 8, stock_price: 380, retail_price: 480, discount_price: 0, expiry_days: 540 },
        { sku: 'COF001', item_name: 'Nescafe Classic 100g', category_id: coffeeCat?.id, uom_id: pcsUom?.id, maximum_capacity: 40, stock_qty: 28, threshold: 8, stock_price: 680, retail_price: 850, discount_price: 0, expiry_days: 540 },
        { sku: 'COF002', item_name: 'Nescafe 3-in-1 Sachet Pack', category_id: coffeeCat?.id, uom_id: packUom?.id, maximum_capacity: 100, stock_qty: 75, threshold: 20, stock_price: 15, retail_price: 25, discount_price: 0, expiry_days: 365 },

        // ========== DAIRY PRODUCTS ==========
        // Milk Powder with multiple batches (price changes over time)
        {
            sku: 'DRY001',
            item_name: 'Anchor Milk Powder 400g',
            category_id: milkPowderCat?.id,
            uom_id: pcsUom?.id,
            maximum_capacity: 50,
            threshold: 10,
            batches: [
                { batch_code: 'BATCH-DRY001-001', qty: 15, stock_price: 720, retail_price: 850, discount_price: 800, expiry_days: 120 },  // Older stock, old price
                { batch_code: 'BATCH-DRY001-002', qty: 23, stock_price: 750, retail_price: 890, discount_price: 0, expiry_days: 300 }     // New stock, new price
            ]
        },
        { sku: 'DRY002', item_name: 'Anchor Milk Powder 1kg', category_id: milkPowderCat?.id, uom_id: pcsUom?.id, maximum_capacity: 30, stock_qty: 22, threshold: 6, stock_price: 1800, retail_price: 2150, discount_price: 0, expiry_days: 365 },

        // Fresh Milk with multiple batches (short shelf life, FIFO important)
        {
            sku: 'DRY003',
            item_name: 'Highland Fresh Milk 1L',
            category_id: freshMilkCat?.id,
            uom_id: LUom?.id,
            maximum_capacity: 40,
            threshold: 8,
            batches: [
                { batch_code: 'BATCH-DRY003-001', qty: 10, stock_price: 275, retail_price: 340, discount_price: 300, expiry_days: 3 },   // Expiring very soon - discounted
                { batch_code: 'BATCH-DRY003-002', qty: 15, stock_price: 280, retail_price: 350, discount_price: 0, expiry_days: 10 },    // Good for a week
                { batch_code: 'BATCH-DRY003-003', qty: 10, stock_price: 280, retail_price: 350, discount_price: 0, expiry_days: 14 }     // Fresh batch
            ]
        },
        { sku: 'DRY004', item_name: 'Richlife Full Cream Milk 1L', category_id: freshMilkCat?.id, uom_id: LUom?.id, maximum_capacity: 30, stock_qty: 5, threshold: 6, stock_price: 290, retail_price: 360, discount_price: 0, expiry_days: 10 },
        { sku: 'DRY005', item_name: 'Kotmale Curd 400g', category_id: yogurtCat?.id, uom_id: pcsUom?.id, maximum_capacity: 30, stock_qty: 24, threshold: 6, stock_price: 150, retail_price: 190, discount_price: 0, expiry_days: 21 },

        // Yogurt with multiple batches
        {
            sku: 'DRY006',
            item_name: 'Ambewela Yogurt 80g',
            category_id: yogurtCat?.id,
            uom_id: pcsUom?.id,
            maximum_capacity: 100,
            threshold: 20,
            batches: [
                { batch_code: 'BATCH-DRY006-001', qty: 25, stock_price: 42, retail_price: 60, discount_price: 50, expiry_days: 5 },     // Near expiry
                { batch_code: 'BATCH-DRY006-002', qty: 35, stock_price: 45, retail_price: 65, discount_price: 0, expiry_days: 12 },     // Normal
                { batch_code: 'BATCH-DRY006-003', qty: 25, stock_price: 45, retail_price: 65, discount_price: 0, expiry_days: 21 }      // Fresh
            ]
        },
        { sku: 'DRY007', item_name: 'Anchor Butter 200g', category_id: butterCat?.id, uom_id: pcsUom?.id, maximum_capacity: 20, stock_qty: 12, threshold: 4, stock_price: 520, retail_price: 650, discount_price: 0, expiry_days: 90 },
        { sku: 'DRY008', item_name: 'Happy Cow Cheese 200g', category_id: cheeseCat?.id, uom_id: pcsUom?.id, maximum_capacity: 25, stock_qty: 18, threshold: 5, stock_price: 480, retail_price: 580, discount_price: 0, expiry_days: 180 },

        // EXPIRING SOON (within 7 days) - single batch
        { sku: 'DRY009', item_name: 'Highland Strawberry Milk 200ml', category_id: freshMilkCat?.id, uom_id: pcsUom?.id, maximum_capacity: 50, stock_qty: 42, threshold: 10, stock_price: 85, retail_price: 110, discount_price: 90, expiry_days: 5 },

        // EXPIRED (past expiry) with multiple batches (some expired, some not)
        {
            sku: 'DRY010',
            item_name: 'Kotmale Drinking Yogurt 180ml',
            category_id: yogurtCat?.id,
            uom_id: pcsUom?.id,
            maximum_capacity: 40,
            threshold: 8,
            batches: [
                { batch_code: 'BATCH-DRY010-001', qty: 15, stock_price: 90, retail_price: 120, discount_price: 0, expiry_days: -3 },    // EXPIRED
                { batch_code: 'BATCH-DRY010-002', qty: 20, stock_price: 95, retail_price: 125, discount_price: 0, expiry_days: 7 }      // Still good
            ]
        },

        // ========== SNACKS & BISCUITS ==========
        { sku: 'SNK001', item_name: 'Munchee Lemon Puff 200g', category_id: biscuitsCat?.id, uom_id: packUom?.id, maximum_capacity: 100, stock_qty: 78, threshold: 20, stock_price: 120, retail_price: 150, discount_price: 0, expiry_days: 180 },
        { sku: 'SNK002', item_name: 'Maliban Cream Cracker 500g', category_id: crackersCat?.id, uom_id: packUom?.id, maximum_capacity: 80, stock_qty: 65, threshold: 16, stock_price: 180, retail_price: 220, discount_price: 0, expiry_days: 270 },
        { sku: 'SNK003', item_name: 'CBL Munchee Chocolate Biscuit', category_id: biscuitsCat?.id, uom_id: packUom?.id, maximum_capacity: 60, stock_qty: 12, threshold: 12, stock_price: 250, retail_price: 300, discount_price: 280, expiry_days: 180 },
        { sku: 'SNK004', item_name: 'Maliban Marie Biscuit 400g', category_id: biscuitsCat?.id, uom_id: packUom?.id, maximum_capacity: 70, stock_qty: 55, threshold: 14, stock_price: 160, retail_price: 200, discount_price: 0, expiry_days: 365 },
        { sku: 'SNK005', item_name: 'Tipi Tip Potato Chips 50g', category_id: chipsCat?.id, uom_id: pcsUom?.id, maximum_capacity: 150, stock_qty: 130, threshold: 30, stock_price: 85, retail_price: 110, discount_price: 0, expiry_days: 120 },
        { sku: 'SNK006', item_name: 'Kandos Chocolate Bar 45g', category_id: chocolateCat?.id, uom_id: pcsUom?.id, maximum_capacity: 100, stock_qty: 88, threshold: 20, stock_price: 150, retail_price: 195, discount_price: 0, expiry_days: 365 },
        { sku: 'SNK007', item_name: 'Ritzbury Choco Malt 35g', category_id: chocolateCat?.id, uom_id: pcsUom?.id, maximum_capacity: 120, stock_qty: 25, threshold: 24, stock_price: 95, retail_price: 125, discount_price: 0, expiry_days: 270 },

        // ========== INSTANT FOOD ==========
        // High volume item with multiple batches (price increased over time)
        {
            sku: 'INS001',
            item_name: 'Prima Chicken Noodles 85g',
            category_id: noodlesCat?.id,
            uom_id: pcsUom?.id,
            maximum_capacity: 300,
            threshold: 60,
            batches: [
                { batch_code: 'BATCH-INS001-001', qty: 100, stock_price: 50, retail_price: 65, discount_price: 0, expiry_days: 180 },   // Older batch, old price
                { batch_code: 'BATCH-INS001-002', qty: 145, stock_price: 55, retail_price: 70, discount_price: 0, expiry_days: 365 }    // New batch, price increase
            ]
        },
        { sku: 'INS002', item_name: 'Prima Kottu Mee 80g', category_id: noodlesCat?.id, uom_id: pcsUom?.id, maximum_capacity: 200, stock_qty: 168, threshold: 40, stock_price: 50, retail_price: 65, discount_price: 0, expiry_days: 365 },
        { sku: 'INS003', item_name: 'Maggi Instant Noodles 80g', category_id: noodlesCat?.id, uom_id: pcsUom?.id, maximum_capacity: 250, stock_qty: 35, threshold: 50, stock_price: 60, retail_price: 80, discount_price: 0, expiry_days: 365 },

        // ========== RICE & GRAINS ==========
        { sku: 'GRN001', item_name: 'CIC White Rice 1kg', category_id: riceCat?.id, uom_id: kgUom?.id, maximum_capacity: 100, stock_qty: 75, threshold: 20, stock_price: 160, retail_price: 200, discount_price: 0, expiry_days: 365 },
        { sku: 'GRN002', item_name: 'CIC Red Rice 1kg', category_id: redRiceCat?.id, uom_id: kgUom?.id, maximum_capacity: 100, stock_qty: 68, threshold: 20, stock_price: 180, retail_price: 220, discount_price: 0, expiry_days: 365 },
        { sku: 'GRN003', item_name: 'Nipuna Nadu Rice 5kg', category_id: riceCat?.id, uom_id: packUom?.id, maximum_capacity: 40, stock_qty: 28, threshold: 8, stock_price: 750, retail_price: 920, discount_price: 880, expiry_days: 365 },
        { sku: 'GRN004', item_name: 'Araliya Basmati Rice 1kg', category_id: riceCat?.id, uom_id: kgUom?.id, maximum_capacity: 50, stock_qty: 42, threshold: 10, stock_price: 420, retail_price: 520, discount_price: 0, expiry_days: 730 },
        { sku: 'GRN005', item_name: 'Prima Wheat Flour 1kg', category_id: flourCat?.id, uom_id: kgUom?.id, maximum_capacity: 60, stock_qty: 48, threshold: 12, stock_price: 220, retail_price: 280, discount_price: 0, expiry_days: 180 },
        { sku: 'GRN006', item_name: 'White Sugar 1kg', category_id: sugarCat?.id, uom_id: kgUom?.id, maximum_capacity: 80, stock_qty: 62, threshold: 16, stock_price: 230, retail_price: 290, discount_price: 0, expiry_days: 730 },

        // ========== COOKING ESSENTIALS ==========
        { sku: 'COK001', item_name: 'MD Coconut Oil 500ml', category_id: coconutOilCat?.id, uom_id: btlUom?.id, maximum_capacity: 40, stock_qty: 32, threshold: 8, stock_price: 450, retail_price: 520, discount_price: 0, expiry_days: 365 },
        { sku: 'COK002', item_name: 'Fortune Sunflower Oil 1L', category_id: coconutOilCat?.id, uom_id: btlUom?.id, maximum_capacity: 30, stock_qty: 22, threshold: 6, stock_price: 680, retail_price: 820, discount_price: 0, expiry_days: 365 },
        { sku: 'COK003', item_name: 'Laugfs Coconut Oil 1L', category_id: coconutOilCat?.id, uom_id: btlUom?.id, maximum_capacity: 35, stock_qty: 8, threshold: 7, stock_price: 850, retail_price: 1020, discount_price: 0, expiry_days: 365 },

        // ========== CANNED GOODS ==========
        { sku: 'CAN001', item_name: 'Marina Tuna Chunks 185g', category_id: cannedFishCat?.id, uom_id: pcsUom?.id, maximum_capacity: 60, stock_qty: 48, threshold: 12, stock_price: 320, retail_price: 390, discount_price: 0, expiry_days: 730 },
        { sku: 'CAN002', item_name: 'Edinborough Fish Curry 425g', category_id: cannedFishCat?.id, uom_id: pcsUom?.id, maximum_capacity: 40, stock_qty: 35, threshold: 8, stock_price: 380, retail_price: 460, discount_price: 0, expiry_days: 730 },

        // ========== PERSONAL CARE ==========
        { sku: 'PRC001', item_name: 'Signal Toothpaste 120g', category_id: toothpasteCat?.id, uom_id: pcsUom?.id, maximum_capacity: 50, stock_qty: 42, threshold: 10, stock_price: 180, retail_price: 230, discount_price: 0, expiry_days: 730 },
        { sku: 'PRC002', item_name: 'Colgate MaxFresh 150g', category_id: toothpasteCat?.id, uom_id: pcsUom?.id, maximum_capacity: 50, stock_qty: 38, threshold: 10, stock_price: 220, retail_price: 280, discount_price: 0, expiry_days: 730 },
        { sku: 'PRC003', item_name: 'Closeup Deep Action 150g', category_id: toothpasteCat?.id, uom_id: pcsUom?.id, maximum_capacity: 40, stock_qty: 6, threshold: 8, stock_price: 200, retail_price: 260, discount_price: 0, expiry_days: 730 },
        { sku: 'PRC004', item_name: 'Lifebuoy Soap 100g', category_id: soapCat?.id, uom_id: pcsUom?.id, maximum_capacity: 80, stock_qty: 68, threshold: 16, stock_price: 95, retail_price: 120, discount_price: 0, expiry_days: 1095 },
        { sku: 'PRC005', item_name: 'Lux Soft Touch 100g', category_id: soapCat?.id, uom_id: pcsUom?.id, maximum_capacity: 80, stock_qty: 72, threshold: 16, stock_price: 110, retail_price: 140, discount_price: 0, expiry_days: 1095 },
        { sku: 'PRC006', item_name: 'Dettol Original 100g', category_id: soapCat?.id, uom_id: pcsUom?.id, maximum_capacity: 60, stock_qty: 15, threshold: 12, stock_price: 150, retail_price: 190, discount_price: 0, expiry_days: 1095 },
        { sku: 'PRC007', item_name: 'Sunsilk Shampoo 180ml', category_id: shampooCat?.id, uom_id: btlUom?.id, maximum_capacity: 40, stock_qty: 32, threshold: 8, stock_price: 320, retail_price: 400, discount_price: 0, expiry_days: 730 },
        { sku: 'PRC008', item_name: 'Head & Shoulders 180ml', category_id: shampooCat?.id, uom_id: btlUom?.id, maximum_capacity: 35, stock_qty: 28, threshold: 7, stock_price: 450, retail_price: 550, discount_price: 0, expiry_days: 730 },
        { sku: 'PRC009', item_name: 'Clear Anti-Dandruff 180ml', category_id: shampooCat?.id, uom_id: btlUom?.id, maximum_capacity: 30, stock_qty: 4, threshold: 6, stock_price: 420, retail_price: 520, discount_price: 0, expiry_days: 730 },

        // ========== HOUSEHOLD ==========
        { sku: 'HSH001', item_name: 'Surf Excel Washing Powder 1kg', category_id: detergentCat?.id, uom_id: packUom?.id, maximum_capacity: 50, stock_qty: 42, threshold: 10, stock_price: 380, retail_price: 460, discount_price: 0, expiry_days: 1095 },
        { sku: 'HSH002', item_name: 'Sunlight Washing Powder 1kg', category_id: detergentCat?.id, uom_id: packUom?.id, maximum_capacity: 50, stock_qty: 45, threshold: 10, stock_price: 320, retail_price: 390, discount_price: 0, expiry_days: 1095 },
        { sku: 'HSH003', item_name: 'Rin Detergent Bar 250g', category_id: detergentCat?.id, uom_id: pcsUom?.id, maximum_capacity: 100, stock_qty: 85, threshold: 20, stock_price: 85, retail_price: 110, discount_price: 0, expiry_days: 1095 },

        // ========== HIGH VALUE ITEMS (Premium) ==========
        { sku: 'HVL001', item_name: 'Nestle Lactogen 1 400g', category_id: milkPowderCat?.id, uom_id: pcsUom?.id, maximum_capacity: 20, stock_qty: 15, threshold: 4, stock_price: 1850, retail_price: 2250, discount_price: 0, expiry_days: 365 },
        { sku: 'HVL002', item_name: 'Similac Advance 400g', category_id: milkPowderCat?.id, uom_id: pcsUom?.id, maximum_capacity: 15, stock_qty: 8, threshold: 3, stock_price: 2200, retail_price: 2650, discount_price: 0, expiry_days: 365 },
        { sku: 'HVL003', item_name: 'Ensure Vanilla 400g', category_id: milkPowderCat?.id, uom_id: pcsUom?.id, maximum_capacity: 12, stock_qty: 6, threshold: 2, stock_price: 3500, retail_price: 4200, discount_price: 0, expiry_days: 540 },

        // ========== BUDGET/LOW PRICE ITEMS ==========
        { sku: 'BDG001', item_name: 'Maliban Smart Cream Cracker 100g', category_id: crackersCat?.id, uom_id: pcsUom?.id, maximum_capacity: 200, stock_qty: 165, threshold: 40, stock_price: 35, retail_price: 50, discount_price: 0, expiry_days: 180 },
        { sku: 'BDG002', item_name: 'Prima Noodles Single Pack', category_id: noodlesCat?.id, uom_id: pcsUom?.id, maximum_capacity: 500, stock_qty: 420, threshold: 100, stock_price: 45, retail_price: 60, discount_price: 0, expiry_days: 365 },
        { sku: 'BDG003', item_name: 'Lifebuoy Handwash Sachet 18ml', category_id: soapCat?.id, uom_id: pcsUom?.id, maximum_capacity: 300, stock_qty: 255, threshold: 60, stock_price: 18, retail_price: 25, discount_price: 0, expiry_days: 730 }
    ];

    const itemStmt = db.prepare(`
        INSERT INTO items (sku, item_name, category_id, uom_id, branch_id, maximum_capacity, availability, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 'local_only')
    `);

    const stockStmt = db.prepare(`
        INSERT INTO stock (item_id, batch_code, quantity, threshold_limit, stock_price, retail_price, discount_price, expiry_date, availability, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'local_only')
    `);

    let createdCount = 0;
    let skippedCount = 0;
    let batchCount = 0;

    const insertMany = db.transaction(() => {
        for (const item of defaultItems) {
            // Skip if no category found (for categories that might not exist)
            if (!item.category_id) {
                console.log(`[Seeder] Skipping ${item.item_name} - no matching category found`);
                skippedCount++;
                continue;
            }

            // Insert item
            const result = itemStmt.run(
                item.sku,
                item.item_name,
                item.category_id,
                item.uom_id || pcsUom?.id,
                branch?.id,
                item.maximum_capacity,
                now,
                now
            );

            const itemId = result.lastInsertRowid;

            // Check if item has multiple batches or single batch format
            if (item.batches && Array.isArray(item.batches)) {
                // Multi-batch item: create multiple stock records
                for (const batch of item.batches) {
                    const expiryDate = addDays(batch.expiry_days);
                    const isExpired = batch.expiry_days < 0;
                    const isOutOfStock = batch.qty === 0;
                    const availability = (isExpired || isOutOfStock) ? 0 : 1;

                    stockStmt.run(
                        itemId,
                        batch.batch_code,
                        batch.qty,
                        item.threshold,
                        batch.stock_price,
                        batch.retail_price,
                        batch.discount_price || 0,
                        expiryDate,
                        availability,
                        now,
                        now
                    );
                    batchCount++;
                }
            } else {
                // Single batch item (backwards compatible format)
                const batchCode = `BATCH-${item.sku}-001`;
                const expiryDate = addDays(item.expiry_days);

                // Set availability based on expiry and quantity
                const isExpired = item.expiry_days < 0;
                const isOutOfStock = item.stock_qty === 0;
                const availability = (isExpired || isOutOfStock) ? 0 : 1;

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
                    now,
                    now
                );
                batchCount++;
            }

            createdCount++;
        }
    });

    insertMany();

    console.log('[Seeder] Default items created:', createdCount);
    console.log('[Seeder] Stock batches created:', batchCount);
    if (skippedCount > 0) {
        console.log('[Seeder] Items skipped (no matching category):', skippedCount);
    }

    // Count items with multiple batches
    const multiBatchItems = defaultItems.filter(item => item.batches && item.batches.length > 1).length;
    console.log('[Seeder] Items with multiple batches:', multiBatchItems);

    // Log stock level distribution for verification
    const stockStats = db.prepare(`
        SELECT
            SUM(CASE WHEN (s.quantity * 1.0 / NULLIF(i.maximum_capacity, 0) * 100) > 80 THEN 1 ELSE 0 END) as high_stock,
            SUM(CASE WHEN (s.quantity * 1.0 / NULLIF(i.maximum_capacity, 0) * 100) BETWEEN 40 AND 80 THEN 1 ELSE 0 END) as medium_stock,
            SUM(CASE WHEN (s.quantity * 1.0 / NULLIF(i.maximum_capacity, 0) * 100) BETWEEN 1 AND 39 THEN 1 ELSE 0 END) as low_stock,
            SUM(CASE WHEN s.quantity = 0 THEN 1 ELSE 0 END) as out_of_stock,
            SUM(CASE WHEN (s.quantity * 1.0 / NULLIF(i.maximum_capacity, 0) * 100) > 100 THEN 1 ELSE 0 END) as overstocked
        FROM stock s
        JOIN items i ON s.item_id = i.id
    `).get();

    console.log('[Seeder] Stock distribution by batch:', stockStats);

    // Log expiry status distribution
    const expiryStats = db.prepare(`
        SELECT
            SUM(CASE WHEN date(expiry_date) < date('now') THEN 1 ELSE 0 END) as expired,
            SUM(CASE WHEN date(expiry_date) BETWEEN date('now') AND date('now', '+7 days') THEN 1 ELSE 0 END) as expiring_soon,
            SUM(CASE WHEN date(expiry_date) > date('now', '+7 days') THEN 1 ELSE 0 END) as good
        FROM stock
    `).get();

    console.log('[Seeder] Expiry status distribution:', expiryStats);

    return { seeded: true, message: `Created ${createdCount} items with ${batchCount} stock batches (${skippedCount} skipped)` };
}

/**
 * Seed default members with diverse scenarios
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

    // Diverse members: different types, locations, contact formats
    const defaultMembers = [
        // Walk-in customer (default for anonymous sales)
        { member_no: 'MEM000001', full_name: 'Walk-in Customer', contact: '', address: '', member_type: 'regular', is_active: 1 },

        // Regular customers from different areas
        { member_no: 'MEM000002', full_name: 'Nimal Perera', contact: '077 1234567', address: '45 Galle Road, Colombo 03', member_type: 'regular', is_active: 1 },
        { member_no: 'MEM000003', full_name: 'Sunil Fernando', contact: '076 3456789', address: '12 Station Road, Galle', member_type: 'regular', is_active: 1 },
        { member_no: 'MEM000004', full_name: 'Lakshmi Jayawardena', contact: '071 5678901', address: '56 Main Street, Matara', member_type: 'regular', is_active: 1 },
        { member_no: 'MEM000005', full_name: 'Rajitha Bandara', contact: '078 6789012', address: '89 Hill Street, Nuwara Eliya', member_type: 'regular', is_active: 1 },
        { member_no: 'MEM000006', full_name: 'Chaminda Silva', contact: '070 7890123', address: '34 Beach Road, Negombo', member_type: 'regular', is_active: 1 },

        // Premium customers (higher discount tier)
        { member_no: 'MEM000007', full_name: 'Kumari Silva', contact: '071 2345678', address: '78 Kandy Road, Kurunegala', member_type: 'premium', is_active: 1 },
        { member_no: 'MEM000008', full_name: 'Anura Bandara', contact: '078 4567890', address: '23 Temple Street, Kandy', member_type: 'premium', is_active: 1 },
        { member_no: 'MEM000009', full_name: 'Priya Wickramasinghe', contact: '077 8901234', address: '67 Lake View, Colombo 07', member_type: 'premium', is_active: 1 },
        { member_no: 'MEM000010', full_name: 'Dr. Sanjay Gupta', contact: '076 9012345', address: '101 Hospital Road, Colombo 08', member_type: 'premium', is_active: 1 },

        // Wholesale/Business customers
        { member_no: 'MEM000011', full_name: 'ABC Trading Company', contact: '011 2234567', address: '45 Industrial Zone, Ratmalana', member_type: 'wholesale', is_active: 1 },
        { member_no: 'MEM000012', full_name: 'Fresh Mart Supermarket', contact: '011 3345678', address: '78 Main Street, Moratuwa', member_type: 'wholesale', is_active: 1 },
        { member_no: 'MEM000013', full_name: 'Quick Stop Grocery', contact: '037 2234455', address: '23 Bus Stand Road, Kurunegala', member_type: 'wholesale', is_active: 1 },

        // Inactive member (for testing filter)
        { member_no: 'MEM000014', full_name: 'Kamal Dissanayake', contact: '077 1112233', address: '45 Old Road, Kandy', member_type: 'regular', is_active: 0 },
        { member_no: 'MEM000015', full_name: 'Old Customer Ltd', contact: '011 4456677', address: '89 Closed Lane, Colombo', member_type: 'wholesale', is_active: 0 }
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

    // Log member type distribution
    const activeRegular = defaultMembers.filter(m => m.member_type === 'regular' && m.is_active).length;
    const activePremium = defaultMembers.filter(m => m.member_type === 'premium' && m.is_active).length;
    const activeWholesale = defaultMembers.filter(m => m.member_type === 'wholesale' && m.is_active).length;
    const inactive = defaultMembers.filter(m => !m.is_active).length;

    console.log('[Seeder] Default members created:', defaultMembers.length);
    console.log(`[Seeder] Member distribution: ${activeRegular} regular, ${activePremium} premium, ${activeWholesale} wholesale, ${inactive} inactive`);

    return { seeded: true, message: `Created ${defaultMembers.length} members` };
}

/**
 * Run all seeders
 * Seeds default data when the database is first initialized
 */
function runSeeders() {
    console.log('[Seeder] Running database seeders...');

    // Order matters: branches must be seeded before admin (for branch_id assignment)
    // and before items (for branch_id foreign key)
    const results = {
        uoms: seedDefaultUoms(),
        categories: seedDefaultCategories(),
        branches: seedDefaultBranch(),
        admin: seedDefaultAdmin(),  // After branches so admin can be assigned to a branch
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
