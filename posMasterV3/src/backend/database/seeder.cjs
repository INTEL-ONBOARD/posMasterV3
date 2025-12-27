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
 * Seed default items with stock
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

    // Get category and UOM IDs
    const beveragesCat = db.prepare("SELECT id FROM categories WHERE type = 'Beverages' LIMIT 1").get();
    const snacksCat = db.prepare("SELECT id FROM categories WHERE type = 'Snacks' LIMIT 1").get();
    const dairyCat = db.prepare("SELECT id FROM categories WHERE type = 'Dairy' LIMIT 1").get();
    const groceriesCat = db.prepare("SELECT id FROM categories WHERE type = 'Groceries' LIMIT 1").get();
    const personalCareCat = db.prepare("SELECT id FROM categories WHERE type = 'Personal Care' LIMIT 1").get();

    const pcsUom = db.prepare("SELECT id FROM units_of_measurement WHERE symbol = 'pcs' LIMIT 1").get();
    const kgUom = db.prepare("SELECT id FROM units_of_measurement WHERE symbol = 'kg' LIMIT 1").get();
    const LUom = db.prepare("SELECT id FROM units_of_measurement WHERE symbol = 'L' LIMIT 1").get();
    const packUom = db.prepare("SELECT id FROM units_of_measurement WHERE symbol = 'pack' LIMIT 1").get();

    // Get first branch (Morawakkorale Head Branch)
    const branch = db.prepare("SELECT id FROM branches LIMIT 1").get();

    const defaultItems = [
        // Beverages
        { sku: 'BEV001', item_name: 'Coca Cola 500ml', category_id: beveragesCat?.id, uom_id: pcsUom?.id, maximum_capacity: 200, stock_price: 100, retail_price: 130 },
        { sku: 'BEV002', item_name: 'Pepsi 500ml', category_id: beveragesCat?.id, uom_id: pcsUom?.id, maximum_capacity: 200, stock_price: 95, retail_price: 125 },
        { sku: 'BEV003', item_name: 'Sprite 500ml', category_id: beveragesCat?.id, uom_id: pcsUom?.id, maximum_capacity: 150, stock_price: 100, retail_price: 130 },
        { sku: 'BEV004', item_name: 'Elephant House Cream Soda 400ml', category_id: beveragesCat?.id, uom_id: pcsUom?.id, maximum_capacity: 100, stock_price: 80, retail_price: 100 },
        { sku: 'BEV005', item_name: 'Nestomalt 400g', category_id: beveragesCat?.id, uom_id: pcsUom?.id, maximum_capacity: 50, stock_price: 450, retail_price: 550 },

        // Snacks
        { sku: 'SNK001', item_name: 'Munchee Lemon Puff', category_id: snacksCat?.id, uom_id: packUom?.id, maximum_capacity: 100, stock_price: 120, retail_price: 150 },
        { sku: 'SNK002', item_name: 'Maliban Cream Cracker', category_id: snacksCat?.id, uom_id: packUom?.id, maximum_capacity: 80, stock_price: 180, retail_price: 220 },
        { sku: 'SNK003', item_name: 'CBL Munchee Chocolate Biscuit', category_id: snacksCat?.id, uom_id: packUom?.id, maximum_capacity: 60, stock_price: 250, retail_price: 300 },
        { sku: 'SNK004', item_name: 'Prima Instant Noodles', category_id: snacksCat?.id, uom_id: pcsUom?.id, maximum_capacity: 300, stock_price: 55, retail_price: 70 },

        // Dairy
        { sku: 'DRY001', item_name: 'Anchor Milk Powder 400g', category_id: dairyCat?.id, uom_id: pcsUom?.id, maximum_capacity: 50, stock_price: 750, retail_price: 890 },
        { sku: 'DRY002', item_name: 'Highland Fresh Milk 1L', category_id: dairyCat?.id, uom_id: LUom?.id, maximum_capacity: 40, stock_price: 280, retail_price: 350 },
        { sku: 'DRY003', item_name: 'Kotmale Curd 400g', category_id: dairyCat?.id, uom_id: pcsUom?.id, maximum_capacity: 30, stock_price: 150, retail_price: 190 },

        // Groceries
        { sku: 'GRC001', item_name: 'Astra Margarine 250g', category_id: groceriesCat?.id, uom_id: pcsUom?.id, maximum_capacity: 60, stock_price: 220, retail_price: 280 },
        { sku: 'GRC002', item_name: 'MD Coconut Oil 500ml', category_id: groceriesCat?.id, uom_id: pcsUom?.id, maximum_capacity: 40, stock_price: 450, retail_price: 520 },
        { sku: 'GRC003', item_name: 'Raigam Soya Meat 90g', category_id: groceriesCat?.id, uom_id: pcsUom?.id, maximum_capacity: 100, stock_price: 85, retail_price: 110 },
        { sku: 'GRC004', item_name: 'Red Rice 1kg', category_id: groceriesCat?.id, uom_id: kgUom?.id, maximum_capacity: 100, stock_price: 180, retail_price: 220 },
        { sku: 'GRC005', item_name: 'White Rice 1kg', category_id: groceriesCat?.id, uom_id: kgUom?.id, maximum_capacity: 100, stock_price: 160, retail_price: 200 },

        // Personal Care
        { sku: 'PRC001', item_name: 'Signal Toothpaste 120g', category_id: personalCareCat?.id, uom_id: pcsUom?.id, maximum_capacity: 50, stock_price: 180, retail_price: 230 },
        { sku: 'PRC002', item_name: 'Lifebuoy Soap 100g', category_id: personalCareCat?.id, uom_id: pcsUom?.id, maximum_capacity: 80, stock_price: 95, retail_price: 120 },
        { sku: 'PRC003', item_name: 'Sunsilk Shampoo 180ml', category_id: personalCareCat?.id, uom_id: pcsUom?.id, maximum_capacity: 40, stock_price: 320, retail_price: 400 }
    ];

    const itemStmt = db.prepare(`
        INSERT INTO items (sku, item_name, category_id, uom_id, branch_id, maximum_capacity, availability, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 'local_only')
    `);

    const stockStmt = db.prepare(`
        INSERT INTO stock (item_id, batch_code, quantity, threshold_limit, stock_price, retail_price, discount_price, expiry_date, availability, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 'local_only')
    `);

    // Generate expiry date 6 months from now
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 6);
    const expiryDateStr = expiryDate.toISOString().split('T')[0];

    const insertMany = db.transaction(() => {
        for (const item of defaultItems) {
            // Insert item
            const result = itemStmt.run(
                item.sku,
                item.item_name,
                item.category_id,
                item.uom_id,
                branch?.id,
                item.maximum_capacity,
                now,
                now
            );

            // Insert initial stock for the item
            const itemId = result.lastInsertRowid;
            const batchCode = `BATCH-${item.sku}-001`;
            const initialQty = Math.floor(item.maximum_capacity * 0.6); // 60% of max capacity
            const threshold = Math.floor(item.maximum_capacity * 0.2); // 20% threshold

            stockStmt.run(
                itemId,
                batchCode,
                initialQty,
                threshold,
                item.stock_price,
                item.retail_price,
                0,
                expiryDateStr,
                now,
                now
            );
        }
    });

    insertMany();

    console.log('[Seeder] Default items and stock created:', defaultItems.length);
    return { seeded: true, message: `Created ${defaultItems.length} items with stock` };
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
        { member_no: 'MEM000001', full_name: 'Walk-in Customer', contact: '', address: '', member_type: 'regular' },
        { member_no: 'MEM000002', full_name: 'Nimal Perera', contact: '077 1234567', address: '45 Galle Road, Colombo', member_type: 'regular' },
        { member_no: 'MEM000003', full_name: 'Kumari Silva', contact: '071 2345678', address: '78 Kandy Road, Kurunegala', member_type: 'premium' },
        { member_no: 'MEM000004', full_name: 'Sunil Fernando', contact: '076 3456789', address: '12 Station Road, Galle', member_type: 'regular' },
        { member_no: 'MEM000005', full_name: 'Anura Bandara', contact: '078 4567890', address: '23 Temple Street, Kandy', member_type: 'premium' }
    ];

    const stmt = db.prepare(`
        INSERT INTO members (member_no, full_name, contact, address, member_type, is_active, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'local_only')
    `);

    const insertMany = db.transaction(() => {
        for (const member of defaultMembers) {
            stmt.run(member.member_no, member.full_name, member.contact, member.address, member.member_type, now, now);
        }
    });

    insertMany();

    console.log('[Seeder] Default members created:', defaultMembers.length);
    return { seeded: true, message: `Created ${defaultMembers.length} members` };
}

/**
 * Run all seeders
 * NOTE: Seeders are currently disabled/commented out
 */
function runSeeders() {
    console.log('[Seeder] Seeders are currently disabled');

    // SEEDERS DISABLED - Uncomment below to enable seeding
    // Order matters: branches must be seeded before admin (for branch_id assignment)
    // and before items (for branch_id foreign key)
    /*
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
    */

    // Return empty results when disabled
    return {
        uoms: { seeded: false, message: 'Seeders disabled' },
        categories: { seeded: false, message: 'Seeders disabled' },
        branches: { seeded: false, message: 'Seeders disabled' },
        admin: { seeded: false, message: 'Seeders disabled' },
        suppliers: { seeded: false, message: 'Seeders disabled' },
        members: { seeded: false, message: 'Seeders disabled' },
        items: { seeded: false, message: 'Seeders disabled' }
    };
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
