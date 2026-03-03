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
        const adminUser = db.prepare("SELECT id, roles, sync_status FROM users WHERE username = 'admin' LIMIT 1").get();
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

            // Fix sync_status if it's 'local_only' - admin should sync to cloud
            if (adminUser.sync_status === 'local_only') {
                console.log('[Seeder] Admin user has local_only sync status, fixing to pending...');
                const stmt = db.prepare('UPDATE users SET sync_status = ?, updated_at = ? WHERE id = ?');
                stmt.run('pending', nowISO(), adminUser.id);
                console.log('[Seeder] Admin user sync_status fixed to pending');
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
        sync_status: 'pending', // Should sync to cloud
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
        VALUES (?, ?, ?, ?, 'pending')
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
 * Seed default categories - 2000 categories with real Sri Lankan supermarket brands
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

    // Real Sri Lankan supermarket brands and product types
    const defaultCategories = [
        // ========== BEVERAGES - CARBONATED DRINKS ==========
        { brand: 'Coca-Cola', type: 'Carbonated Drinks' },
        { brand: 'Pepsi', type: 'Carbonated Drinks' },
        { brand: 'Sprite', type: 'Carbonated Drinks' },
        { brand: 'Fanta', type: 'Carbonated Drinks' },
        { brand: '7UP', type: 'Carbonated Drinks' },
        { brand: 'Mountain Dew', type: 'Carbonated Drinks' },
        { brand: 'Elephant House', type: 'Carbonated Drinks' },
        { brand: 'EGB', type: 'Carbonated Drinks' },
        { brand: 'Portello', type: 'Carbonated Drinks' },
        { brand: 'Cream Soda EH', type: 'Carbonated Drinks' },
        { brand: 'Ginger Beer EH', type: 'Carbonated Drinks' },
        { brand: 'Necto', type: 'Carbonated Drinks' },
        { brand: 'Lemonade EH', type: 'Carbonated Drinks' },
        { brand: 'Orange Barley', type: 'Carbonated Drinks' },
        { brand: 'Mirinda', type: 'Carbonated Drinks' },

        // ========== BEVERAGES - TEA ==========
        { brand: 'Dilmah', type: 'Tea' },
        { brand: 'Lipton', type: 'Tea' },
        { brand: 'Zesta', type: 'Tea' },
        { brand: 'Akbar', type: 'Tea' },
        { brand: 'Mlesna', type: 'Tea' },
        { brand: 'Basilur', type: 'Tea' },
        { brand: 'Impra', type: 'Tea' },
        { brand: 'Bogawantalawa', type: 'Tea' },
        { brand: 'Watawala', type: 'Tea' },
        { brand: 'Heladiv', type: 'Tea' },
        { brand: 'Jaffna Tea', type: 'Tea' },
        { brand: 'Stassen', type: 'Tea' },
        { brand: 'Tea Tang', type: 'Tea' },
        { brand: 'Harischandra', type: 'Tea' },
        { brand: 'Tetley', type: 'Tea' },
        { brand: 'Twinings', type: 'Tea' },
        { brand: 'Ahmad Tea', type: 'Tea' },

        // ========== BEVERAGES - COFFEE ==========
        { brand: 'Nescafe', type: 'Coffee' },
        { brand: 'Bru', type: 'Coffee' },
        { brand: 'Harischandra', type: 'Coffee' },
        { brand: 'Davidoff', type: 'Coffee' },
        { brand: 'Lavazza', type: 'Coffee' },
        { brand: 'Nespresso', type: 'Coffee' },
        { brand: 'Dilmah', type: 'Coffee' },
        { brand: 'Jacobs', type: 'Coffee' },
        { brand: 'Maxwell House', type: 'Coffee' },
        { brand: 'Moccona', type: 'Coffee' },

        // ========== BEVERAGES - MILK & DAIRY DRINKS ==========
        { brand: 'Highland', type: 'Fresh Milk' },
        { brand: 'Anchor', type: 'Fresh Milk' },
        { brand: 'Kotmale', type: 'Fresh Milk' },
        { brand: 'Ambewela', type: 'Fresh Milk' },
        { brand: 'Pelwatte', type: 'Fresh Milk' },
        { brand: 'Richlife', type: 'Fresh Milk' },
        { brand: 'Newdale', type: 'Fresh Milk' },
        { brand: 'Cargills Magic', type: 'Fresh Milk' },
        { brand: 'Anchor', type: 'Milk Powder' },
        { brand: 'Nespray', type: 'Milk Powder' },
        { brand: 'Lakspray', type: 'Milk Powder' },
        { brand: 'Ratthi', type: 'Milk Powder' },
        { brand: 'Highland', type: 'Milk Powder' },
        { brand: 'Diploma', type: 'Milk Powder' },
        { brand: 'Anlene', type: 'Milk Powder' },
        { brand: 'Similac', type: 'Milk Powder' },
        { brand: 'Enfagrow', type: 'Milk Powder' },
        { brand: 'Pediasure', type: 'Milk Powder' },
        { brand: 'S-26', type: 'Milk Powder' },
        { brand: 'Dumex', type: 'Milk Powder' },
        { brand: 'Nan', type: 'Milk Powder' },
        { brand: 'Lactogen', type: 'Milk Powder' },
        { brand: 'Richlife', type: 'Flavored Milk' },
        { brand: 'Highland', type: 'Flavored Milk' },
        { brand: 'Kotmale', type: 'Flavored Milk' },
        { brand: 'Milo', type: 'Flavored Milk' },
        { brand: 'Anchor', type: 'Flavored Milk' },

        // ========== BEVERAGES - MALTED DRINKS ==========
        { brand: 'Milo', type: 'Malted Drinks' },
        { brand: 'Horlicks', type: 'Malted Drinks' },
        { brand: 'Ovaltine', type: 'Malted Drinks' },
        { brand: 'Bournvita', type: 'Malted Drinks' },
        { brand: 'Viva', type: 'Malted Drinks' },
        { brand: 'Complan', type: 'Malted Drinks' },
        { brand: 'Boost', type: 'Malted Drinks' },

        // ========== BEVERAGES - ENERGY DRINKS ==========
        { brand: 'Red Bull', type: 'Energy Drinks' },
        { brand: 'Monster', type: 'Energy Drinks' },
        { brand: 'Sting', type: 'Energy Drinks' },
        { brand: 'Power Horse', type: 'Energy Drinks' },
        { brand: 'Wild Tiger', type: 'Energy Drinks' },
        { brand: 'Shark', type: 'Energy Drinks' },
        { brand: 'Gatorade', type: 'Energy Drinks' },
        { brand: 'Powerade', type: 'Energy Drinks' },
        { brand: '100 Plus', type: 'Energy Drinks' },
        { brand: 'Lucozade', type: 'Energy Drinks' },

        // ========== BEVERAGES - FRUIT JUICES ==========
        { brand: 'Kist', type: 'Fruit Juice' },
        { brand: 'MD', type: 'Fruit Juice' },
        { brand: 'Elephant House', type: 'Fruit Juice' },
        { brand: 'Tropicana', type: 'Fruit Juice' },
        { brand: 'Real', type: 'Fruit Juice' },
        { brand: 'Minute Maid', type: 'Fruit Juice' },
        { brand: 'Ceres', type: 'Fruit Juice' },
        { brand: 'Del Monte', type: 'Fruit Juice' },
        { brand: 'Sunquick', type: 'Fruit Juice' },
        { brand: 'Ribena', type: 'Fruit Juice' },
        { brand: 'Rasna', type: 'Fruit Juice' },
        { brand: 'Tang', type: 'Fruit Juice' },
        { brand: 'Frutee', type: 'Fruit Juice' },
        { brand: 'Ceylon Cold Stores', type: 'Fruit Juice' },

        // ========== BEVERAGES - BOTTLED WATER ==========
        { brand: 'Aquafina', type: 'Bottled Water' },
        { brand: 'Nestle Pure Life', type: 'Bottled Water' },
        { brand: 'Perera & Sons', type: 'Bottled Water' },
        { brand: 'Elephant', type: 'Bottled Water' },
        { brand: 'Cool Blue', type: 'Bottled Water' },
        { brand: 'Oasis', type: 'Bottled Water' },
        { brand: 'Natural Spring', type: 'Bottled Water' },
        { brand: 'Wet Water', type: 'Bottled Water' },

        // ========== DAIRY PRODUCTS - YOGURT ==========
        { brand: 'Kotmale', type: 'Yogurt' },
        { brand: 'Ambewela', type: 'Yogurt' },
        { brand: 'Highland', type: 'Yogurt' },
        { brand: 'Anchor', type: 'Yogurt' },
        { brand: 'Richlife', type: 'Yogurt' },
        { brand: 'Pelwatte', type: 'Yogurt' },
        { brand: 'Newdale', type: 'Yogurt' },
        { brand: 'Cargills', type: 'Yogurt' },
        { brand: 'Danone', type: 'Yogurt' },
        { brand: 'Activia', type: 'Yogurt' },

        // ========== DAIRY PRODUCTS - CURD ==========
        { brand: 'Pelwatte', type: 'Curd' },
        { brand: 'Highland', type: 'Curd' },
        { brand: 'Kotmale', type: 'Curd' },
        { brand: 'Ambewela', type: 'Curd' },
        { brand: 'Richlife', type: 'Curd' },
        { brand: 'Milco', type: 'Curd' },
        { brand: 'Lanka Curd', type: 'Curd' },

        // ========== DAIRY PRODUCTS - BUTTER ==========
        { brand: 'Anchor', type: 'Butter' },
        { brand: 'Highland', type: 'Butter' },
        { brand: 'Kotmale', type: 'Butter' },
        { brand: 'Pelwatte', type: 'Butter' },
        { brand: 'Lurpak', type: 'Butter' },
        { brand: 'President', type: 'Butter' },
        { brand: 'Kerrygold', type: 'Butter' },
        { brand: 'Milkmaid', type: 'Butter' },

        // ========== DAIRY PRODUCTS - CHEESE ==========
        { brand: 'Happy Cow', type: 'Cheese' },
        { brand: 'Kraft', type: 'Cheese' },
        { brand: 'Anchor', type: 'Cheese' },
        { brand: 'Kotmale', type: 'Cheese' },
        { brand: 'Laughing Cow', type: 'Cheese' },
        { brand: 'Chesdale', type: 'Cheese' },
        { brand: 'President', type: 'Cheese' },
        { brand: 'Philadelphia', type: 'Cheese' },
        { brand: 'Kiri', type: 'Cheese' },
        { brand: 'Cheddar', type: 'Cheese' },
        { brand: 'Mozzarella', type: 'Cheese' },
        { brand: 'Parmesan', type: 'Cheese' },

        // ========== DAIRY PRODUCTS - ICE CREAM ==========
        { brand: 'Elephant House', type: 'Ice Cream' },
        { brand: 'Cargills Magic', type: 'Ice Cream' },
        { brand: 'Alerics', type: 'Ice Cream' },
        { brand: 'Baskin Robbins', type: 'Ice Cream' },
        { brand: 'Haagen-Dazs', type: 'Ice Cream' },
        { brand: 'Walls', type: 'Ice Cream' },
        { brand: 'Magnum', type: 'Ice Cream' },
        { brand: 'Cornetto', type: 'Ice Cream' },
        { brand: 'Movenpick', type: 'Ice Cream' },
        { brand: 'Kotmale', type: 'Ice Cream' },

        // ========== DAIRY PRODUCTS - CREAM ==========
        { brand: 'Anchor', type: 'Cream' },
        { brand: 'Nestle', type: 'Cream' },
        { brand: 'Elle & Vire', type: 'Cream' },
        { brand: 'President', type: 'Cream' },
        { brand: 'Highland', type: 'Cream' },

        // ========== SNACKS - BISCUITS ==========
        { brand: 'Munchee', type: 'Biscuits' },
        { brand: 'Maliban', type: 'Biscuits' },
        { brand: 'CBL', type: 'Biscuits' },
        { brand: 'Uswatte', type: 'Biscuits' },
        { brand: 'Britannia', type: 'Biscuits' },
        { brand: 'Parle', type: 'Biscuits' },
        { brand: 'McVities', type: 'Biscuits' },
        { brand: 'Oreo', type: 'Biscuits' },
        { brand: 'Sunfeast', type: 'Biscuits' },
        { brand: 'Good Day', type: 'Biscuits' },
        { brand: 'Hide & Seek', type: 'Biscuits' },
        { brand: 'Bourbon', type: 'Biscuits' },
        { brand: 'Nice', type: 'Biscuits' },
        { brand: 'Marie', type: 'Biscuits' },
        { brand: 'Cream Cracker', type: 'Biscuits' },
        { brand: 'Digestive', type: 'Biscuits' },
        { brand: 'Lemon Puff', type: 'Biscuits' },
        { brand: 'Chocolate Puff', type: 'Biscuits' },
        { brand: 'Custard Cream', type: 'Biscuits' },
        { brand: 'Ginger Nuts', type: 'Biscuits' },

        // ========== SNACKS - CHIPS & CRISPS ==========
        { brand: 'Tipi Tip', type: 'Chips' },
        { brand: 'Lays', type: 'Chips' },
        { brand: 'Pringles', type: 'Chips' },
        { brand: 'Jack n Jill', type: 'Chips' },
        { brand: 'Bingo', type: 'Chips' },
        { brand: 'Uncle Chipps', type: 'Chips' },
        { brand: 'Cheetos', type: 'Chips' },
        { brand: 'Doritos', type: 'Chips' },
        { brand: 'Kurkure', type: 'Chips' },
        { brand: 'W.W. Crisps', type: 'Chips' },
        { brand: 'Harvest', type: 'Chips' },
        { brand: 'Mr. Potato', type: 'Chips' },

        // ========== SNACKS - CHOCOLATES ==========
        { brand: 'Kandos', type: 'Chocolates' },
        { brand: 'Ritzbury', type: 'Chocolates' },
        { brand: 'Cadbury', type: 'Chocolates' },
        { brand: 'Nestle', type: 'Chocolates' },
        { brand: 'KitKat', type: 'Chocolates' },
        { brand: 'Snickers', type: 'Chocolates' },
        { brand: 'Mars', type: 'Chocolates' },
        { brand: 'Twix', type: 'Chocolates' },
        { brand: 'Bounty', type: 'Chocolates' },
        { brand: 'Milky Way', type: 'Chocolates' },
        { brand: 'Galaxy', type: 'Chocolates' },
        { brand: 'Toblerone', type: 'Chocolates' },
        { brand: 'Ferrero Rocher', type: 'Chocolates' },
        { brand: 'Lindt', type: 'Chocolates' },
        { brand: 'Kinder', type: 'Chocolates' },
        { brand: 'Hersheys', type: 'Chocolates' },
        { brand: '5 Star', type: 'Chocolates' },
        { brand: 'Perk', type: 'Chocolates' },
        { brand: 'Silk', type: 'Chocolates' },
        { brand: 'Temptations', type: 'Chocolates' },
        { brand: 'Dairy Milk', type: 'Chocolates' },
        { brand: 'Gems', type: 'Chocolates' },
        { brand: 'Eclairs', type: 'Chocolates' },
        { brand: 'Choco Malt', type: 'Chocolates' },

        // ========== SNACKS - TOFFEES & CANDIES ==========
        { brand: 'KIK', type: 'Toffees' },
        { brand: 'Haribo', type: 'Toffees' },
        { brand: 'Mentos', type: 'Toffees' },
        { brand: 'Halls', type: 'Toffees' },
        { brand: 'Polo', type: 'Toffees' },
        { brand: 'Eclairs', type: 'Toffees' },
        { brand: 'Kopiko', type: 'Toffees' },
        { brand: 'Alpenliebe', type: 'Toffees' },
        { brand: 'Chupa Chups', type: 'Toffees' },
        { brand: 'Skittles', type: 'Toffees' },
        { brand: 'M&Ms', type: 'Toffees' },
        { brand: 'Tic Tac', type: 'Toffees' },
        { brand: 'Werther', type: 'Toffees' },

        // ========== SNACKS - NUTS & DRY FRUITS ==========
        { brand: 'Ceylon Nuts', type: 'Nuts' },
        { brand: 'Happilo', type: 'Nuts' },
        { brand: 'Planters', type: 'Nuts' },
        { brand: 'Blue Diamond', type: 'Nuts' },
        { brand: 'Wonderful', type: 'Nuts' },
        { brand: 'Nature Valley', type: 'Nuts' },
        { brand: 'Krikri', type: 'Nuts' },
        { brand: 'Local Cashews', type: 'Nuts' },

        // ========== SNACKS - MIXTURE & NAMKEEN ==========
        { brand: 'Star', type: 'Mixture' },
        { brand: 'Haldiram', type: 'Mixture' },
        { brand: 'Bikano', type: 'Mixture' },
        { brand: 'Balaji', type: 'Mixture' },
        { brand: 'Bikaji', type: 'Mixture' },
        { brand: 'Priya', type: 'Mixture' },
        { brand: 'Agarwal', type: 'Mixture' },

        // ========== INSTANT FOOD - NOODLES ==========
        { brand: 'Prima', type: 'Instant Noodles' },
        { brand: 'Maggi', type: 'Instant Noodles' },
        { brand: 'Kottu Mee', type: 'Instant Noodles' },
        { brand: 'Wai Wai', type: 'Instant Noodles' },
        { brand: 'Indomie', type: 'Instant Noodles' },
        { brand: 'Cup Noodles', type: 'Instant Noodles' },
        { brand: 'Knorr', type: 'Instant Noodles' },
        { brand: 'Yippee', type: 'Instant Noodles' },
        { brand: 'Top Ramen', type: 'Instant Noodles' },
        { brand: 'Samyang', type: 'Instant Noodles' },
        { brand: 'Shin Ramyun', type: 'Instant Noodles' },
        { brand: 'Nissin', type: 'Instant Noodles' },

        // ========== INSTANT FOOD - SOUP ==========
        { brand: 'Knorr', type: 'Soup' },
        { brand: 'Maggi', type: 'Soup' },
        { brand: 'Campbell', type: 'Soup' },
        { brand: 'Heinz', type: 'Soup' },
        { brand: 'Cup-a-Soup', type: 'Soup' },
        { brand: 'Batchelors', type: 'Soup' },

        // ========== INSTANT FOOD - READY MEALS ==========
        { brand: 'Raigam', type: 'Ready Meals' },
        { brand: 'MA\'s Kitchen', type: 'Ready Meals' },
        { brand: 'Catch', type: 'Ready Meals' },
        { brand: 'MTR', type: 'Ready Meals' },
        { brand: 'Haldiram', type: 'Ready Meals' },
        { brand: 'Tasty Bite', type: 'Ready Meals' },

        // ========== RICE & GRAINS - RICE ==========
        { brand: 'CIC', type: 'Rice' },
        { brand: 'Nipuna', type: 'Rice' },
        { brand: 'Araliya', type: 'Rice' },
        { brand: 'My Rice', type: 'Rice' },
        { brand: 'Prima', type: 'Rice' },
        { brand: 'Harischandra', type: 'Rice' },
        { brand: 'Ruhunu', type: 'Rice' },
        { brand: 'Samba', type: 'Rice' },
        { brand: 'Nadu', type: 'Rice' },
        { brand: 'Keeri Samba', type: 'Rice' },
        { brand: 'Red Rice', type: 'Rice' },
        { brand: 'Basmati', type: 'Rice' },
        { brand: 'India Gate', type: 'Rice' },
        { brand: 'Daawat', type: 'Rice' },
        { brand: 'Kohinoor', type: 'Rice' },
        { brand: 'Fortune', type: 'Rice' },
        { brand: 'Tilda', type: 'Rice' },

        // ========== RICE & GRAINS - FLOUR ==========
        { brand: 'Prima', type: 'Flour' },
        { brand: 'MDK', type: 'Flour' },
        { brand: 'Harischandra', type: 'Flour' },
        { brand: 'Aashirvaad', type: 'Flour' },
        { brand: 'Pillsbury', type: 'Flour' },
        { brand: 'Ruhunu', type: 'Flour' },
        { brand: 'CIC', type: 'Flour' },
        { brand: 'Fortune', type: 'Flour' },

        // ========== RICE & GRAINS - PULSES & LENTILS ==========
        { brand: 'CIC', type: 'Pulses' },
        { brand: 'Raigam', type: 'Pulses' },
        { brand: 'Prima', type: 'Pulses' },
        { brand: 'Local Dhal', type: 'Pulses' },
        { brand: 'Toor Dhal', type: 'Pulses' },
        { brand: 'Moong Dhal', type: 'Pulses' },
        { brand: 'Chana Dhal', type: 'Pulses' },
        { brand: 'Masoor Dhal', type: 'Pulses' },
        { brand: 'Urad Dhal', type: 'Pulses' },
        { brand: 'Red Lentils', type: 'Pulses' },
        { brand: 'Green Gram', type: 'Pulses' },
        { brand: 'Chickpeas', type: 'Pulses' },
        { brand: 'Black Gram', type: 'Pulses' },

        // ========== RICE & GRAINS - SUGAR ==========
        { brand: 'Lanka Sugar', type: 'Sugar' },
        { brand: 'White Sugar', type: 'Sugar' },
        { brand: 'Brown Sugar', type: 'Sugar' },
        { brand: 'Jaggery', type: 'Sugar' },
        { brand: 'Treacle', type: 'Sugar' },
        { brand: 'Icing Sugar', type: 'Sugar' },
        { brand: 'Castor Sugar', type: 'Sugar' },

        // ========== COOKING OILS ==========
        { brand: 'MD', type: 'Coconut Oil' },
        { brand: 'Ceylon', type: 'Coconut Oil' },
        { brand: 'Santha', type: 'Coconut Oil' },
        { brand: 'Coir', type: 'Coconut Oil' },
        { brand: 'Parachute', type: 'Coconut Oil' },
        { brand: 'KLF', type: 'Coconut Oil' },
        { brand: 'Fortune', type: 'Vegetable Oil' },
        { brand: 'Sunflower', type: 'Vegetable Oil' },
        { brand: 'Saffola', type: 'Vegetable Oil' },
        { brand: 'Dalda', type: 'Vegetable Oil' },
        { brand: 'Sundrop', type: 'Vegetable Oil' },
        { brand: 'Dhara', type: 'Vegetable Oil' },
        { brand: 'Olive', type: 'Vegetable Oil' },
        { brand: 'Canola', type: 'Vegetable Oil' },
        { brand: 'Corn Oil', type: 'Vegetable Oil' },
        { brand: 'Sesame Oil', type: 'Vegetable Oil' },
        { brand: 'Mustard Oil', type: 'Vegetable Oil' },
        { brand: 'Groundnut Oil', type: 'Vegetable Oil' },

        // ========== SPICES & SEASONINGS ==========
        { brand: 'MA\'s Kitchen', type: 'Spices' },
        { brand: 'Raigam', type: 'Spices' },
        { brand: 'Harischandra', type: 'Spices' },
        { brand: 'MDH', type: 'Spices' },
        { brand: 'Everest', type: 'Spices' },
        { brand: 'Catch', type: 'Spices' },
        { brand: 'Eastern', type: 'Spices' },
        { brand: 'Aachi', type: 'Spices' },
        { brand: 'MTR', type: 'Spices' },
        { brand: 'Badshah', type: 'Spices' },
        { brand: 'Sakthi', type: 'Spices' },
        { brand: 'Shan', type: 'Spices' },
        { brand: 'National', type: 'Spices' },
        { brand: 'Turmeric', type: 'Spices' },
        { brand: 'Chilli Powder', type: 'Spices' },
        { brand: 'Curry Powder', type: 'Spices' },
        { brand: 'Garam Masala', type: 'Spices' },
        { brand: 'Coriander', type: 'Spices' },
        { brand: 'Cumin', type: 'Spices' },
        { brand: 'Pepper', type: 'Spices' },
        { brand: 'Cinnamon', type: 'Spices' },
        { brand: 'Cardamom', type: 'Spices' },
        { brand: 'Cloves', type: 'Spices' },
        { brand: 'Nutmeg', type: 'Spices' },
        { brand: 'Fenugreek', type: 'Spices' },
        { brand: 'Mustard Seeds', type: 'Spices' },

        // ========== SAUCES & CONDIMENTS ==========
        { brand: 'Heinz', type: 'Sauce' },
        { brand: 'Maggi', type: 'Sauce' },
        { brand: 'Knorr', type: 'Sauce' },
        { brand: 'Kissan', type: 'Sauce' },
        { brand: 'MD', type: 'Sauce' },
        { brand: 'Edinburgh', type: 'Sauce' },
        { brand: 'Lee Kum Kee', type: 'Sauce' },
        { brand: 'Kikkoman', type: 'Sauce' },
        { brand: 'HP', type: 'Sauce' },
        { brand: 'Tabasco', type: 'Sauce' },
        { brand: 'Sriracha', type: 'Sauce' },
        { brand: 'Worcestershire', type: 'Sauce' },
        { brand: 'Oyster Sauce', type: 'Sauce' },
        { brand: 'Soy Sauce', type: 'Sauce' },
        { brand: 'Chilli Sauce', type: 'Sauce' },
        { brand: 'Tomato Ketchup', type: 'Sauce' },
        { brand: 'Mayonnaise', type: 'Sauce' },
        { brand: 'Mustard', type: 'Sauce' },
        { brand: 'BBQ Sauce', type: 'Sauce' },

        // ========== JAMS & SPREADS ==========
        { brand: 'Kist', type: 'Jam' },
        { brand: 'MD', type: 'Jam' },
        { brand: 'Edinborough', type: 'Jam' },
        { brand: 'Kissan', type: 'Jam' },
        { brand: 'Smucker', type: 'Jam' },
        { brand: 'Bonne Maman', type: 'Jam' },
        { brand: 'Nutella', type: 'Spread' },
        { brand: 'Peanut Butter', type: 'Spread' },
        { brand: 'Marmite', type: 'Spread' },
        { brand: 'Vegemite', type: 'Spread' },
        { brand: 'Honey', type: 'Spread' },
        { brand: 'Kithul Treacle', type: 'Spread' },
        { brand: 'Chocolate Spread', type: 'Spread' },

        // ========== CANNED GOODS - FISH ==========
        { brand: 'Marina', type: 'Canned Fish' },
        { brand: 'Edinborough', type: 'Canned Fish' },
        { brand: 'John West', type: 'Canned Fish' },
        { brand: 'Rio Mare', type: 'Canned Fish' },
        { brand: 'Ayam', type: 'Canned Fish' },
        { brand: 'Sardines', type: 'Canned Fish' },
        { brand: 'Tuna', type: 'Canned Fish' },
        { brand: 'Mackerel', type: 'Canned Fish' },
        { brand: 'Salmon', type: 'Canned Fish' },

        // ========== CANNED GOODS - VEGETABLES ==========
        { brand: 'Del Monte', type: 'Canned Vegetables' },
        { brand: 'Green Giant', type: 'Canned Vegetables' },
        { brand: 'Bonduelle', type: 'Canned Vegetables' },
        { brand: 'Libby', type: 'Canned Vegetables' },
        { brand: 'Baked Beans', type: 'Canned Vegetables' },
        { brand: 'Sweet Corn', type: 'Canned Vegetables' },
        { brand: 'Green Peas', type: 'Canned Vegetables' },
        { brand: 'Mushrooms', type: 'Canned Vegetables' },
        { brand: 'Tomatoes', type: 'Canned Vegetables' },

        // ========== CANNED GOODS - FRUITS ==========
        { brand: 'Del Monte', type: 'Canned Fruits' },
        { brand: 'Dole', type: 'Canned Fruits' },
        { brand: 'Libby', type: 'Canned Fruits' },
        { brand: 'Peaches', type: 'Canned Fruits' },
        { brand: 'Pineapple', type: 'Canned Fruits' },
        { brand: 'Fruit Cocktail', type: 'Canned Fruits' },
        { brand: 'Lychee', type: 'Canned Fruits' },
        { brand: 'Mandarin', type: 'Canned Fruits' },

        // ========== VINEGAR & PRESERVATIVES ==========
        { brand: 'Heinz', type: 'Vinegar' },
        { brand: 'MD', type: 'Vinegar' },
        { brand: 'White Vinegar', type: 'Vinegar' },
        { brand: 'Apple Cider', type: 'Vinegar' },
        { brand: 'Balsamic', type: 'Vinegar' },
        { brand: 'Rice Vinegar', type: 'Vinegar' },
        { brand: 'Coconut Vinegar', type: 'Vinegar' },

        // ========== PASTA & NOODLES ==========
        { brand: 'Barilla', type: 'Pasta' },
        { brand: 'De Cecco', type: 'Pasta' },
        { brand: 'Panzani', type: 'Pasta' },
        { brand: 'San Remo', type: 'Pasta' },
        { brand: 'Prima', type: 'Pasta' },
        { brand: 'Spaghetti', type: 'Pasta' },
        { brand: 'Penne', type: 'Pasta' },
        { brand: 'Macaroni', type: 'Pasta' },
        { brand: 'Fusilli', type: 'Pasta' },
        { brand: 'Lasagne', type: 'Pasta' },
        { brand: 'Vermicelli', type: 'Pasta' },
        { brand: 'Rice Noodles', type: 'Pasta' },

        // ========== BREAKFAST CEREALS ==========
        { brand: 'Kelloggs', type: 'Cereal' },
        { brand: 'Nestle', type: 'Cereal' },
        { brand: 'Quaker', type: 'Cereal' },
        { brand: 'Weetabix', type: 'Cereal' },
        { brand: 'Cornflakes', type: 'Cereal' },
        { brand: 'Chocos', type: 'Cereal' },
        { brand: 'Frosties', type: 'Cereal' },
        { brand: 'Special K', type: 'Cereal' },
        { brand: 'Muesli', type: 'Cereal' },
        { brand: 'Granola', type: 'Cereal' },
        { brand: 'Oats', type: 'Cereal' },
        { brand: 'All Bran', type: 'Cereal' },
        { brand: 'Coco Pops', type: 'Cereal' },
        { brand: 'Fruit Loops', type: 'Cereal' },

        // ========== BREAD & BAKERY ==========
        { brand: 'Prima', type: 'Bread' },
        { brand: 'Perera & Sons', type: 'Bread' },
        { brand: 'Breadtalk', type: 'Bread' },
        { brand: 'Cargills', type: 'Bread' },
        { brand: 'Raheema', type: 'Bread' },
        { brand: 'Little Lion', type: 'Bread' },
        { brand: 'Wonder', type: 'Bread' },
        { brand: 'Enriched', type: 'Bread' },
        { brand: 'Whole Wheat', type: 'Bread' },
        { brand: 'Multigrain', type: 'Bread' },
        { brand: 'Buns', type: 'Bread' },
        { brand: 'Rolls', type: 'Bread' },
        { brand: 'Pita', type: 'Bread' },
        { brand: 'Tortilla', type: 'Bread' },
        { brand: 'Naan', type: 'Bread' },
        { brand: 'Paratha', type: 'Bread' },
        { brand: 'Roti', type: 'Bread' },

        // ========== BAKING SUPPLIES ==========
        { brand: 'Dr. Oetker', type: 'Baking' },
        { brand: 'Betty Crocker', type: 'Baking' },
        { brand: 'Pillsbury', type: 'Baking' },
        { brand: 'Baking Powder', type: 'Baking' },
        { brand: 'Baking Soda', type: 'Baking' },
        { brand: 'Yeast', type: 'Baking' },
        { brand: 'Cocoa Powder', type: 'Baking' },
        { brand: 'Vanilla', type: 'Baking' },
        { brand: 'Food Coloring', type: 'Baking' },
        { brand: 'Icing', type: 'Baking' },
        { brand: 'Cake Mix', type: 'Baking' },
        { brand: 'Brownie Mix', type: 'Baking' },
        { brand: 'Pancake Mix', type: 'Baking' },

        // ========== PERSONAL CARE - TOOTHPASTE ==========
        { brand: 'Signal', type: 'Toothpaste' },
        { brand: 'Colgate', type: 'Toothpaste' },
        { brand: 'Pepsodent', type: 'Toothpaste' },
        { brand: 'Close Up', type: 'Toothpaste' },
        { brand: 'Sensodyne', type: 'Toothpaste' },
        { brand: 'Oral-B', type: 'Toothpaste' },
        { brand: 'Aquafresh', type: 'Toothpaste' },
        { brand: 'Dabur', type: 'Toothpaste' },
        { brand: 'Himalaya', type: 'Toothpaste' },
        { brand: 'Crest', type: 'Toothpaste' },

        // ========== PERSONAL CARE - TOOTHBRUSH ==========
        { brand: 'Oral-B', type: 'Toothbrush' },
        { brand: 'Colgate', type: 'Toothbrush' },
        { brand: 'Signal', type: 'Toothbrush' },
        { brand: 'Sensodyne', type: 'Toothbrush' },
        { brand: 'Aquafresh', type: 'Toothbrush' },
        { brand: 'Jordan', type: 'Toothbrush' },

        // ========== PERSONAL CARE - SHAMPOO ==========
        { brand: 'Sunsilk', type: 'Shampoo' },
        { brand: 'Head & Shoulders', type: 'Shampoo' },
        { brand: 'Pantene', type: 'Shampoo' },
        { brand: 'Dove', type: 'Shampoo' },
        { brand: 'Clear', type: 'Shampoo' },
        { brand: 'Clinic Plus', type: 'Shampoo' },
        { brand: 'TRESemme', type: 'Shampoo' },
        { brand: 'LOreal', type: 'Shampoo' },
        { brand: 'Garnier', type: 'Shampoo' },
        { brand: 'Herbal Essences', type: 'Shampoo' },
        { brand: 'Vatika', type: 'Shampoo' },
        { brand: 'Kumarika', type: 'Shampoo' },
        { brand: 'Rejoice', type: 'Shampoo' },
        { brand: 'Lifebuoy', type: 'Shampoo' },

        // ========== PERSONAL CARE - CONDITIONER ==========
        { brand: 'Sunsilk', type: 'Conditioner' },
        { brand: 'Pantene', type: 'Conditioner' },
        { brand: 'Dove', type: 'Conditioner' },
        { brand: 'TRESemme', type: 'Conditioner' },
        { brand: 'LOreal', type: 'Conditioner' },
        { brand: 'Garnier', type: 'Conditioner' },
        { brand: 'Head & Shoulders', type: 'Conditioner' },

        // ========== PERSONAL CARE - SOAP ==========
        { brand: 'Lifebuoy', type: 'Bath Soap' },
        { brand: 'Lux', type: 'Bath Soap' },
        { brand: 'Dove', type: 'Bath Soap' },
        { brand: 'Dettol', type: 'Bath Soap' },
        { brand: 'Pears', type: 'Bath Soap' },
        { brand: 'Palmolive', type: 'Bath Soap' },
        { brand: 'Santoor', type: 'Bath Soap' },
        { brand: 'Hamam', type: 'Bath Soap' },
        { brand: 'Savlon', type: 'Bath Soap' },
        { brand: 'Cinthol', type: 'Bath Soap' },
        { brand: 'Medimix', type: 'Bath Soap' },
        { brand: 'Ayush', type: 'Bath Soap' },
        { brand: 'Nature', type: 'Bath Soap' },
        { brand: 'Yardley', type: 'Bath Soap' },
        { brand: 'Imperial Leather', type: 'Bath Soap' },

        // ========== PERSONAL CARE - SHOWER GEL ==========
        { brand: 'Dove', type: 'Shower Gel' },
        { brand: 'Nivea', type: 'Shower Gel' },
        { brand: 'Palmolive', type: 'Shower Gel' },
        { brand: 'Lux', type: 'Shower Gel' },
        { brand: 'Dettol', type: 'Shower Gel' },
        { brand: 'Lifebuoy', type: 'Shower Gel' },
        { brand: 'Old Spice', type: 'Shower Gel' },
        { brand: 'Axe', type: 'Shower Gel' },

        // ========== PERSONAL CARE - FACE WASH ==========
        { brand: 'Clean & Clear', type: 'Face Wash' },
        { brand: 'Himalaya', type: 'Face Wash' },
        { brand: 'Garnier', type: 'Face Wash' },
        { brand: 'Nivea', type: 'Face Wash' },
        { brand: 'Pond\'s', type: 'Face Wash' },
        { brand: 'Fair & Lovely', type: 'Face Wash' },
        { brand: 'Lakme', type: 'Face Wash' },
        { brand: 'Neutrogena', type: 'Face Wash' },
        { brand: 'Cetaphil', type: 'Face Wash' },
        { brand: 'Olay', type: 'Face Wash' },

        // ========== PERSONAL CARE - MOISTURIZER ==========
        { brand: 'Vaseline', type: 'Moisturizer' },
        { brand: 'Nivea', type: 'Moisturizer' },
        { brand: 'Dove', type: 'Moisturizer' },
        { brand: 'Pond\'s', type: 'Moisturizer' },
        { brand: 'Olay', type: 'Moisturizer' },
        { brand: 'Garnier', type: 'Moisturizer' },
        { brand: 'Himalaya', type: 'Moisturizer' },
        { brand: 'Cetaphil', type: 'Moisturizer' },
        { brand: 'Aveeno', type: 'Moisturizer' },
        { brand: 'Johnson\'s', type: 'Moisturizer' },

        // ========== PERSONAL CARE - DEODORANT ==========
        { brand: 'Rexona', type: 'Deodorant' },
        { brand: 'Nivea', type: 'Deodorant' },
        { brand: 'Axe', type: 'Deodorant' },
        { brand: 'Old Spice', type: 'Deodorant' },
        { brand: 'Dove', type: 'Deodorant' },
        { brand: 'Sure', type: 'Deodorant' },
        { brand: 'Secret', type: 'Deodorant' },
        { brand: 'Fa', type: 'Deodorant' },
        { brand: 'Adidas', type: 'Deodorant' },
        { brand: 'Fogg', type: 'Deodorant' },
        { brand: 'Wild Stone', type: 'Deodorant' },
        { brand: 'Park Avenue', type: 'Deodorant' },

        // ========== PERSONAL CARE - HAIR OIL ==========
        { brand: 'Parachute', type: 'Hair Oil' },
        { brand: 'Dabur', type: 'Hair Oil' },
        { brand: 'Vatika', type: 'Hair Oil' },
        { brand: 'Coconut Oil', type: 'Hair Oil' },
        { brand: 'Almond Oil', type: 'Hair Oil' },
        { brand: 'Kumarika', type: 'Hair Oil' },
        { brand: 'Bajaj', type: 'Hair Oil' },
        { brand: 'Navratna', type: 'Hair Oil' },
        { brand: 'Himani', type: 'Hair Oil' },

        // ========== PERSONAL CARE - RAZOR & SHAVING ==========
        { brand: 'Gillette', type: 'Shaving' },
        { brand: 'Philips', type: 'Shaving' },
        { brand: 'Wilkinson', type: 'Shaving' },
        { brand: 'BIC', type: 'Shaving' },
        { brand: 'Old Spice', type: 'Shaving' },
        { brand: 'Nivea', type: 'Shaving' },
        { brand: 'Dettol', type: 'Shaving' },

        // ========== PERSONAL CARE - ANTISEPTIC ==========
        { brand: 'Dettol', type: 'Antiseptic' },
        { brand: 'Savlon', type: 'Antiseptic' },
        { brand: 'TCP', type: 'Antiseptic' },
        { brand: 'Betadine', type: 'Antiseptic' },
        { brand: 'Hydrogen Peroxide', type: 'Antiseptic' },
        { brand: 'Spirit', type: 'Antiseptic' },

        // ========== BABY CARE ==========
        { brand: 'Johnson\'s Baby', type: 'Baby Care' },
        { brand: 'Pampers', type: 'Baby Care' },
        { brand: 'Huggies', type: 'Baby Care' },
        { brand: 'Himalaya Baby', type: 'Baby Care' },
        { brand: 'Cetaphil Baby', type: 'Baby Care' },
        { brand: 'Pigeon', type: 'Baby Care' },
        { brand: 'Chicco', type: 'Baby Care' },
        { brand: 'Sebamed', type: 'Baby Care' },
        { brand: 'Aveeno Baby', type: 'Baby Care' },
        { brand: 'Baby Dove', type: 'Baby Care' },
        { brand: 'Diapers', type: 'Baby Care' },
        { brand: 'Baby Wipes', type: 'Baby Care' },
        { brand: 'Baby Powder', type: 'Baby Care' },
        { brand: 'Baby Lotion', type: 'Baby Care' },
        { brand: 'Baby Oil', type: 'Baby Care' },
        { brand: 'Baby Shampoo', type: 'Baby Care' },

        // ========== FEMININE CARE ==========
        { brand: 'Whisper', type: 'Feminine Care' },
        { brand: 'Stayfree', type: 'Feminine Care' },
        { brand: 'Kotex', type: 'Feminine Care' },
        { brand: 'Carefree', type: 'Feminine Care' },
        { brand: 'Always', type: 'Feminine Care' },
        { brand: 'Sofy', type: 'Feminine Care' },
        { brand: 'Libresse', type: 'Feminine Care' },

        // ========== HOUSEHOLD - LAUNDRY ==========
        { brand: 'Surf Excel', type: 'Laundry' },
        { brand: 'Sunlight', type: 'Laundry' },
        { brand: 'Rin', type: 'Laundry' },
        { brand: 'Tide', type: 'Laundry' },
        { brand: 'Ariel', type: 'Laundry' },
        { brand: 'Persil', type: 'Laundry' },
        { brand: 'Comfort', type: 'Laundry' },
        { brand: 'Downy', type: 'Laundry' },
        { brand: 'Vanish', type: 'Laundry' },
        { brand: 'Robin', type: 'Laundry' },
        { brand: 'Ujala', type: 'Laundry' },
        { brand: 'Ezee', type: 'Laundry' },
        { brand: 'Genteel', type: 'Laundry' },

        // ========== HOUSEHOLD - DISHWASHING ==========
        { brand: 'Vim', type: 'Dishwashing' },
        { brand: 'Sunlight', type: 'Dishwashing' },
        { brand: 'Fairy', type: 'Dishwashing' },
        { brand: 'Pril', type: 'Dishwashing' },
        { brand: 'Finish', type: 'Dishwashing' },
        { brand: 'Cascade', type: 'Dishwashing' },
        { brand: 'Scotch-Brite', type: 'Dishwashing' },

        // ========== HOUSEHOLD - FLOOR CLEANER ==========
        { brand: 'Dettol', type: 'Floor Cleaner' },
        { brand: 'Lizol', type: 'Floor Cleaner' },
        { brand: 'Domex', type: 'Floor Cleaner' },
        { brand: 'Colin', type: 'Floor Cleaner' },
        { brand: 'Pine Sol', type: 'Floor Cleaner' },
        { brand: 'Fabuloso', type: 'Floor Cleaner' },
        { brand: 'Mr. Clean', type: 'Floor Cleaner' },

        // ========== HOUSEHOLD - TOILET CLEANER ==========
        { brand: 'Harpic', type: 'Toilet Cleaner' },
        { brand: 'Domex', type: 'Toilet Cleaner' },
        { brand: 'Toilet Duck', type: 'Toilet Cleaner' },
        { brand: 'Lysol', type: 'Toilet Cleaner' },
        { brand: 'Clorox', type: 'Toilet Cleaner' },
        { brand: 'Sanifresh', type: 'Toilet Cleaner' },

        // ========== HOUSEHOLD - GLASS CLEANER ==========
        { brand: 'Colin', type: 'Glass Cleaner' },
        { brand: 'Windex', type: 'Glass Cleaner' },
        { brand: 'Mr. Muscle', type: 'Glass Cleaner' },
        { brand: 'Glass Plus', type: 'Glass Cleaner' },

        // ========== HOUSEHOLD - AIR FRESHENER ==========
        { brand: 'Glade', type: 'Air Freshener' },
        { brand: 'Air Wick', type: 'Air Freshener' },
        { brand: 'Ambi Pur', type: 'Air Freshener' },
        { brand: 'Febreze', type: 'Air Freshener' },
        { brand: 'Odonil', type: 'Air Freshener' },
        { brand: 'Godrej', type: 'Air Freshener' },

        // ========== HOUSEHOLD - INSECT REPELLENT ==========
        { brand: 'Mortein', type: 'Insect Repellent' },
        { brand: 'Good Knight', type: 'Insect Repellent' },
        { brand: 'All Out', type: 'Insect Repellent' },
        { brand: 'Hit', type: 'Insect Repellent' },
        { brand: 'Raid', type: 'Insect Repellent' },
        { brand: 'Baygon', type: 'Insect Repellent' },
        { brand: 'Off', type: 'Insect Repellent' },
        { brand: 'Odomos', type: 'Insect Repellent' },
        { brand: 'Maxo', type: 'Insect Repellent' },

        // ========== HOUSEHOLD - TISSUES & PAPER ==========
        { brand: 'Kleenex', type: 'Tissue Paper' },
        { brand: 'Scott', type: 'Tissue Paper' },
        { brand: 'Premier', type: 'Tissue Paper' },
        { brand: 'Softex', type: 'Tissue Paper' },
        { brand: 'Rose Petal', type: 'Tissue Paper' },
        { brand: 'Bounty', type: 'Tissue Paper' },
        { brand: 'Toilet Roll', type: 'Tissue Paper' },
        { brand: 'Kitchen Towel', type: 'Tissue Paper' },
        { brand: 'Napkins', type: 'Tissue Paper' },
        { brand: 'Facial Tissue', type: 'Tissue Paper' },

        // ========== HOUSEHOLD - GARBAGE BAGS ==========
        { brand: 'Glad', type: 'Garbage Bags' },
        { brand: 'Hefty', type: 'Garbage Bags' },
        { brand: 'Generic', type: 'Garbage Bags' },
        { brand: 'Biodegradable', type: 'Garbage Bags' },

        // ========== HOUSEHOLD - FOIL & WRAPS ==========
        { brand: 'Glad', type: 'Food Wrap' },
        { brand: 'Saran', type: 'Food Wrap' },
        { brand: 'Reynolds', type: 'Food Wrap' },
        { brand: 'Aluminium Foil', type: 'Food Wrap' },
        { brand: 'Cling Film', type: 'Food Wrap' },
        { brand: 'Baking Paper', type: 'Food Wrap' },
        { brand: 'Ziploc', type: 'Food Wrap' },

        // ========== PET CARE ==========
        { brand: 'Pedigree', type: 'Pet Food' },
        { brand: 'Whiskas', type: 'Pet Food' },
        { brand: 'Royal Canin', type: 'Pet Food' },
        { brand: 'Purina', type: 'Pet Food' },
        { brand: 'Drools', type: 'Pet Food' },
        { brand: 'Hills', type: 'Pet Food' },
        { brand: 'Iams', type: 'Pet Food' },
        { brand: 'Eukanuba', type: 'Pet Food' },

        // ========== HEALTH & WELLNESS ==========
        { brand: 'Panadol', type: 'Medicine' },
        { brand: 'Crocin', type: 'Medicine' },
        { brand: 'Strepsils', type: 'Medicine' },
        { brand: 'Vicks', type: 'Medicine' },
        { brand: 'Zandu', type: 'Medicine' },
        { brand: 'Dabur', type: 'Medicine' },
        { brand: 'Himalaya', type: 'Medicine' },
        { brand: 'ENO', type: 'Medicine' },
        { brand: 'Digene', type: 'Medicine' },
        { brand: 'Burnol', type: 'Medicine' },
        { brand: 'Iodex', type: 'Medicine' },
        { brand: 'Moov', type: 'Medicine' },
        { brand: 'Tiger Balm', type: 'Medicine' },
        { brand: 'Amrutanjan', type: 'Medicine' },
        { brand: 'Volini', type: 'Medicine' },
        { brand: 'Band-Aid', type: 'Medicine' },
        { brand: 'Cotton', type: 'Medicine' },
        { brand: 'Thermometer', type: 'Medicine' },

        // ========== VITAMINS & SUPPLEMENTS ==========
        { brand: 'Centrum', type: 'Vitamins' },
        { brand: 'Revital', type: 'Vitamins' },
        { brand: 'Supradyn', type: 'Vitamins' },
        { brand: 'Seven Seas', type: 'Vitamins' },
        { brand: 'Cenovis', type: 'Vitamins' },
        { brand: 'Blackmores', type: 'Vitamins' },
        { brand: 'Nature Made', type: 'Vitamins' },
        { brand: 'Swisse', type: 'Vitamins' },
        { brand: 'Omega-3', type: 'Vitamins' },
        { brand: 'Calcium', type: 'Vitamins' },
        { brand: 'Vitamin C', type: 'Vitamins' },
        { brand: 'Vitamin D', type: 'Vitamins' },
        { brand: 'Multivitamin', type: 'Vitamins' },
        { brand: 'Iron', type: 'Vitamins' },
        { brand: 'Zinc', type: 'Vitamins' },

        // ========== STATIONERY ==========
        { brand: 'Atlas', type: 'Stationery' },
        { brand: 'Camlin', type: 'Stationery' },
        { brand: 'Faber-Castell', type: 'Stationery' },
        { brand: 'Reynolds', type: 'Stationery' },
        { brand: 'Cello', type: 'Stationery' },
        { brand: 'Natraj', type: 'Stationery' },
        { brand: 'Staedtler', type: 'Stationery' },
        { brand: 'Pilot', type: 'Stationery' },
        { brand: 'Parker', type: 'Stationery' },
        { brand: 'Uni-ball', type: 'Stationery' },
        { brand: 'Pencils', type: 'Stationery' },
        { brand: 'Pens', type: 'Stationery' },
        { brand: 'Erasers', type: 'Stationery' },
        { brand: 'Sharpeners', type: 'Stationery' },
        { brand: 'Notebooks', type: 'Stationery' },
        { brand: 'Rulers', type: 'Stationery' },
        { brand: 'Scissors', type: 'Stationery' },
        { brand: 'Glue', type: 'Stationery' },
        { brand: 'Tape', type: 'Stationery' },
        { brand: 'Stapler', type: 'Stationery' },

        // ========== BATTERIES ==========
        { brand: 'Duracell', type: 'Batteries' },
        { brand: 'Energizer', type: 'Batteries' },
        { brand: 'Panasonic', type: 'Batteries' },
        { brand: 'Sony', type: 'Batteries' },
        { brand: 'Eveready', type: 'Batteries' },
        { brand: 'GP', type: 'Batteries' },
        { brand: 'Maxell', type: 'Batteries' },
        { brand: 'Varta', type: 'Batteries' },
        { brand: 'AA Batteries', type: 'Batteries' },
        { brand: 'AAA Batteries', type: 'Batteries' },
        { brand: 'C Batteries', type: 'Batteries' },
        { brand: 'D Batteries', type: 'Batteries' },
        { brand: '9V Batteries', type: 'Batteries' },
        { brand: 'Button Cell', type: 'Batteries' },
        { brand: 'Rechargeable', type: 'Batteries' },

        // ========== LIGHT BULBS ==========
        { brand: 'Philips', type: 'Light Bulbs' },
        { brand: 'Osram', type: 'Light Bulbs' },
        { brand: 'GE', type: 'Light Bulbs' },
        { brand: 'Havells', type: 'Light Bulbs' },
        { brand: 'Crompton', type: 'Light Bulbs' },
        { brand: 'Syska', type: 'Light Bulbs' },
        { brand: 'LED', type: 'Light Bulbs' },
        { brand: 'CFL', type: 'Light Bulbs' },
        { brand: 'Incandescent', type: 'Light Bulbs' },
        { brand: 'Tube Light', type: 'Light Bulbs' },

        // ========== COOKING UTENSILS ==========
        { brand: 'Prestige', type: 'Kitchen Utensils' },
        { brand: 'Hawkins', type: 'Kitchen Utensils' },
        { brand: 'Pigeon', type: 'Kitchen Utensils' },
        { brand: 'Butterfly', type: 'Kitchen Utensils' },
        { brand: 'Tefal', type: 'Kitchen Utensils' },
        { brand: 'Morphy Richards', type: 'Kitchen Utensils' },
        { brand: 'Borosil', type: 'Kitchen Utensils' },
        { brand: 'Milton', type: 'Kitchen Utensils' },
        { brand: 'Cello', type: 'Kitchen Utensils' },
        { brand: 'Tupperware', type: 'Kitchen Utensils' },

        // ========== DISPOSABLES ==========
        { brand: 'Plastic Cups', type: 'Disposables' },
        { brand: 'Plastic Plates', type: 'Disposables' },
        { brand: 'Paper Cups', type: 'Disposables' },
        { brand: 'Paper Plates', type: 'Disposables' },
        { brand: 'Plastic Spoons', type: 'Disposables' },
        { brand: 'Plastic Forks', type: 'Disposables' },
        { brand: 'Straws', type: 'Disposables' },
        { brand: 'Food Containers', type: 'Disposables' },
        { brand: 'Takeaway Boxes', type: 'Disposables' },

        // ========== SEASONAL - FESTIVE ==========
        { brand: 'Vesak', type: 'Festive' },
        { brand: 'Christmas', type: 'Festive' },
        { brand: 'New Year', type: 'Festive' },
        { brand: 'Diwali', type: 'Festive' },
        { brand: 'Ramadan', type: 'Festive' },
        { brand: 'Easter', type: 'Festive' },
        { brand: 'Thai Pongal', type: 'Festive' },
        { brand: 'Sinhala New Year', type: 'Festive' },
        { brand: 'Decorations', type: 'Festive' },
        { brand: 'Gift Items', type: 'Festive' },
        { brand: 'Candles', type: 'Festive' },
        { brand: 'Incense', type: 'Festive' },
        { brand: 'Oil Lamps', type: 'Festive' },

        // ========== COCONUT PRODUCTS ==========
        { brand: 'Coconut Milk', type: 'Coconut Products' },
        { brand: 'Coconut Cream', type: 'Coconut Products' },
        { brand: 'Desiccated Coconut', type: 'Coconut Products' },
        { brand: 'Coconut Water', type: 'Coconut Products' },
        { brand: 'Coconut Flour', type: 'Coconut Products' },
        { brand: 'Coconut Sugar', type: 'Coconut Products' },
        { brand: 'Coconut Chips', type: 'Coconut Products' },
        { brand: 'Virgin Coconut Oil', type: 'Coconut Products' },

        // ========== PICKLES & CHUTNEYS ==========
        { brand: 'MD', type: 'Pickles' },
        { brand: 'Kist', type: 'Pickles' },
        { brand: 'Patak', type: 'Pickles' },
        { brand: 'Priya', type: 'Pickles' },
        { brand: 'Mother\'s Recipe', type: 'Pickles' },
        { brand: 'Bedekar', type: 'Pickles' },
        { brand: 'Mango Pickle', type: 'Pickles' },
        { brand: 'Lime Pickle', type: 'Pickles' },
        { brand: 'Mixed Pickle', type: 'Pickles' },
        { brand: 'Chutney', type: 'Pickles' },

        // ========== TRADITIONAL SRI LANKAN ==========
        { brand: 'Harischandra', type: 'Traditional Foods' },
        { brand: 'Raigam', type: 'Traditional Foods' },
        { brand: 'MA\'s Kitchen', type: 'Traditional Foods' },
        { brand: 'Keells', type: 'Traditional Foods' },
        { brand: 'Achcharu', type: 'Traditional Foods' },
        { brand: 'Sambol', type: 'Traditional Foods' },
        { brand: 'Pol Sambol', type: 'Traditional Foods' },
        { brand: 'Seeni Sambol', type: 'Traditional Foods' },
        { brand: 'Lunu Miris', type: 'Traditional Foods' },
        { brand: 'Katta Sambol', type: 'Traditional Foods' },
        { brand: 'Goraka', type: 'Traditional Foods' },
        { brand: 'Maldive Fish', type: 'Traditional Foods' },
        { brand: 'Dried Fish', type: 'Traditional Foods' },
        { brand: 'Jadi', type: 'Traditional Foods' },
        { brand: 'Papadam', type: 'Traditional Foods' },
        { brand: 'Roasted Curry Powder', type: 'Traditional Foods' },
        { brand: 'Raw Curry Powder', type: 'Traditional Foods' },
        { brand: 'Ceylon Cinnamon', type: 'Traditional Foods' },

        // ========== FROZEN FOODS ==========
        { brand: 'Keells', type: 'Frozen Foods' },
        { brand: 'Cargills', type: 'Frozen Foods' },
        { brand: 'Prima', type: 'Frozen Foods' },
        { brand: 'Elephant House', type: 'Frozen Foods' },
        { brand: 'Frozen Fish', type: 'Frozen Foods' },
        { brand: 'Frozen Chicken', type: 'Frozen Foods' },
        { brand: 'Frozen Prawns', type: 'Frozen Foods' },
        { brand: 'Frozen Vegetables', type: 'Frozen Foods' },
        { brand: 'Fish Fingers', type: 'Frozen Foods' },
        { brand: 'Nuggets', type: 'Frozen Foods' },
        { brand: 'Sausages', type: 'Frozen Foods' },
        { brand: 'Burgers', type: 'Frozen Foods' },
        { brand: 'Samosas', type: 'Frozen Foods' },
        { brand: 'Spring Rolls', type: 'Frozen Foods' },
        { brand: 'Frozen Paratha', type: 'Frozen Foods' },
        { brand: 'Frozen Pizza', type: 'Frozen Foods' },

        // ========== MEAT & POULTRY ==========
        { brand: 'Crysbro', type: 'Poultry' },
        { brand: 'Bairaha', type: 'Poultry' },
        { brand: 'Keells', type: 'Poultry' },
        { brand: 'Chicken', type: 'Poultry' },
        { brand: 'Eggs', type: 'Poultry' },
        { brand: 'Duck', type: 'Poultry' },
        { brand: 'Turkey', type: 'Poultry' },
        { brand: 'Quail', type: 'Poultry' },

        // ========== SEAFOOD ==========
        { brand: 'Fresh Fish', type: 'Seafood' },
        { brand: 'Prawns', type: 'Seafood' },
        { brand: 'Crab', type: 'Seafood' },
        { brand: 'Squid', type: 'Seafood' },
        { brand: 'Lobster', type: 'Seafood' },
        { brand: 'Tuna', type: 'Seafood' },
        { brand: 'Salmon', type: 'Seafood' },
        { brand: 'Sardines', type: 'Seafood' },
        { brand: 'Mackerel', type: 'Seafood' },
        { brand: 'Seer Fish', type: 'Seafood' },
        { brand: 'Tilapia', type: 'Seafood' },
        { brand: 'Dried Prawns', type: 'Seafood' },

        // ========== FRESH VEGETABLES ==========
        { brand: 'Carrots', type: 'Fresh Vegetables' },
        { brand: 'Potatoes', type: 'Fresh Vegetables' },
        { brand: 'Tomatoes', type: 'Fresh Vegetables' },
        { brand: 'Onions', type: 'Fresh Vegetables' },
        { brand: 'Cabbage', type: 'Fresh Vegetables' },
        { brand: 'Beans', type: 'Fresh Vegetables' },
        { brand: 'Brinjal', type: 'Fresh Vegetables' },
        { brand: 'Ladies Finger', type: 'Fresh Vegetables' },
        { brand: 'Capsicum', type: 'Fresh Vegetables' },
        { brand: 'Cucumber', type: 'Fresh Vegetables' },
        { brand: 'Lettuce', type: 'Fresh Vegetables' },
        { brand: 'Spinach', type: 'Fresh Vegetables' },
        { brand: 'Leeks', type: 'Fresh Vegetables' },
        { brand: 'Pumpkin', type: 'Fresh Vegetables' },
        { brand: 'Bitter Gourd', type: 'Fresh Vegetables' },
        { brand: 'Snake Gourd', type: 'Fresh Vegetables' },
        { brand: 'Drumstick', type: 'Fresh Vegetables' },
        { brand: 'Mushrooms', type: 'Fresh Vegetables' },
        { brand: 'Garlic', type: 'Fresh Vegetables' },
        { brand: 'Ginger', type: 'Fresh Vegetables' },
        { brand: 'Green Chilli', type: 'Fresh Vegetables' },
        { brand: 'Curry Leaves', type: 'Fresh Vegetables' },
        { brand: 'Pandan Leaves', type: 'Fresh Vegetables' },
        { brand: 'Lemongrass', type: 'Fresh Vegetables' },
        { brand: 'Coriander', type: 'Fresh Vegetables' },
        { brand: 'Mint', type: 'Fresh Vegetables' },

        // ========== FRESH FRUITS ==========
        { brand: 'Bananas', type: 'Fresh Fruits' },
        { brand: 'Apples', type: 'Fresh Fruits' },
        { brand: 'Oranges', type: 'Fresh Fruits' },
        { brand: 'Grapes', type: 'Fresh Fruits' },
        { brand: 'Mangoes', type: 'Fresh Fruits' },
        { brand: 'Papaya', type: 'Fresh Fruits' },
        { brand: 'Pineapple', type: 'Fresh Fruits' },
        { brand: 'Watermelon', type: 'Fresh Fruits' },
        { brand: 'Guava', type: 'Fresh Fruits' },
        { brand: 'Pomegranate', type: 'Fresh Fruits' },
        { brand: 'Avocado', type: 'Fresh Fruits' },
        { brand: 'Passion Fruit', type: 'Fresh Fruits' },
        { brand: 'Lime', type: 'Fresh Fruits' },
        { brand: 'Lemon', type: 'Fresh Fruits' },
        { brand: 'Coconut', type: 'Fresh Fruits' },
        { brand: 'King Coconut', type: 'Fresh Fruits' },
        { brand: 'Rambutan', type: 'Fresh Fruits' },
        { brand: 'Mangosteen', type: 'Fresh Fruits' },
        { brand: 'Durian', type: 'Fresh Fruits' },
        { brand: 'Jackfruit', type: 'Fresh Fruits' },
        { brand: 'Wood Apple', type: 'Fresh Fruits' },
        { brand: 'Star Fruit', type: 'Fresh Fruits' },
        { brand: 'Dragon Fruit', type: 'Fresh Fruits' },
        { brand: 'Kiwi', type: 'Fresh Fruits' },
        { brand: 'Strawberry', type: 'Fresh Fruits' },
        { brand: 'Blueberry', type: 'Fresh Fruits' },
        { brand: 'Pear', type: 'Fresh Fruits' },
        { brand: 'Peach', type: 'Fresh Fruits' },
        { brand: 'Plum', type: 'Fresh Fruits' },
        { brand: 'Cherry', type: 'Fresh Fruits' },

        // ========== ALCOHOL (WHERE PERMITTED) ==========
        { brand: 'Lion Lager', type: 'Beer' },
        { brand: 'Carlsberg', type: 'Beer' },
        { brand: 'Three Coins', type: 'Beer' },
        { brand: 'Anchor', type: 'Beer' },
        { brand: 'Heineken', type: 'Beer' },
        { brand: 'Corona', type: 'Beer' },
        { brand: 'Budweiser', type: 'Beer' },
        { brand: 'Stella', type: 'Beer' },
        { brand: 'Arrack', type: 'Spirits' },
        { brand: 'DCSL', type: 'Spirits' },
        { brand: 'Mendis', type: 'Spirits' },
        { brand: 'Rockland', type: 'Spirits' },

        // ========== TOBACCO (WHERE PERMITTED) ==========
        { brand: 'Dunhill', type: 'Cigarettes' },
        { brand: 'Marlboro', type: 'Cigarettes' },
        { brand: 'Benson & Hedges', type: 'Cigarettes' },
        { brand: 'Bristol', type: 'Cigarettes' },
        { brand: 'John Player', type: 'Cigarettes' },
        { brand: 'Gold Leaf', type: 'Cigarettes' },

        // ========== ADDITIONAL BRANDS TO REACH 2000 ==========
        // More beverage variations
        { brand: 'Coca-Cola Zero', type: 'Carbonated Drinks' },
        { brand: 'Diet Coke', type: 'Carbonated Drinks' },
        { brand: 'Pepsi Max', type: 'Carbonated Drinks' },
        { brand: 'Diet Pepsi', type: 'Carbonated Drinks' },
        { brand: 'Tonic Water', type: 'Carbonated Drinks' },
        { brand: 'Soda Water', type: 'Carbonated Drinks' },
        { brand: 'Club Soda', type: 'Carbonated Drinks' },

        // More tea varieties
        { brand: 'Green Tea', type: 'Tea' },
        { brand: 'Black Tea', type: 'Tea' },
        { brand: 'White Tea', type: 'Tea' },
        { brand: 'Oolong Tea', type: 'Tea' },
        { brand: 'Herbal Tea', type: 'Tea' },
        { brand: 'Chamomile Tea', type: 'Tea' },
        { brand: 'Peppermint Tea', type: 'Tea' },
        { brand: 'Ginger Tea', type: 'Tea' },
        { brand: 'Lemon Tea', type: 'Tea' },
        { brand: 'Masala Tea', type: 'Tea' },
        { brand: 'Earl Grey', type: 'Tea' },
        { brand: 'English Breakfast', type: 'Tea' },

        // More coffee varieties
        { brand: 'Espresso', type: 'Coffee' },
        { brand: 'Cappuccino', type: 'Coffee' },
        { brand: 'Latte', type: 'Coffee' },
        { brand: 'Mocha', type: 'Coffee' },
        { brand: 'Americano', type: 'Coffee' },
        { brand: 'Decaf', type: 'Coffee' },
        { brand: 'Instant Coffee', type: 'Coffee' },
        { brand: 'Ground Coffee', type: 'Coffee' },
        { brand: 'Coffee Beans', type: 'Coffee' },
        { brand: '3-in-1 Coffee', type: 'Coffee' },

        // More dairy
        { brand: 'Evaporated Milk', type: 'Milk Products' },
        { brand: 'Condensed Milk', type: 'Milk Products' },
        { brand: 'UHT Milk', type: 'Milk Products' },
        { brand: 'Skim Milk', type: 'Milk Products' },
        { brand: 'Low Fat Milk', type: 'Milk Products' },
        { brand: 'Full Cream Milk', type: 'Milk Products' },
        { brand: 'Buttermilk', type: 'Milk Products' },
        { brand: 'Lassi', type: 'Milk Products' },

        // More snacks
        { brand: 'Popcorn', type: 'Snacks' },
        { brand: 'Nachos', type: 'Snacks' },
        { brand: 'Pretzels', type: 'Snacks' },
        { brand: 'Crackers', type: 'Snacks' },
        { brand: 'Rice Cakes', type: 'Snacks' },
        { brand: 'Corn Snacks', type: 'Snacks' },
        { brand: 'Puffed Rice', type: 'Snacks' },
        { brand: 'Murukku', type: 'Snacks' },
        { brand: 'Achappam', type: 'Snacks' },
        { brand: 'Kokis', type: 'Snacks' },
        { brand: 'Kavum', type: 'Snacks' },
        { brand: 'Aluwa', type: 'Snacks' },
        { brand: 'Dodol', type: 'Snacks' },
        { brand: 'Halapa', type: 'Snacks' },
        { brand: 'Kalu Dodol', type: 'Snacks' },
        { brand: 'Watalappan', type: 'Snacks' },

        // More personal care
        { brand: 'Hand Sanitizer', type: 'Hand Care' },
        { brand: 'Hand Wash', type: 'Hand Care' },
        { brand: 'Hand Cream', type: 'Hand Care' },
        { brand: 'Nail Polish', type: 'Nail Care' },
        { brand: 'Nail Polish Remover', type: 'Nail Care' },
        { brand: 'Nail File', type: 'Nail Care' },
        { brand: 'Cotton Buds', type: 'Personal Care' },
        { brand: 'Cotton Pads', type: 'Personal Care' },
        { brand: 'Wet Wipes', type: 'Personal Care' },
        { brand: 'Makeup Remover', type: 'Personal Care' },
        { brand: 'Lip Balm', type: 'Personal Care' },
        { brand: 'Sunscreen', type: 'Personal Care' },
        { brand: 'After Shave', type: 'Personal Care' },
        { brand: 'Perfume', type: 'Personal Care' },
        { brand: 'Cologne', type: 'Personal Care' },
        { brand: 'Body Spray', type: 'Personal Care' },
        { brand: 'Talcum Powder', type: 'Personal Care' },
        { brand: 'Body Lotion', type: 'Personal Care' },
        { brand: 'Hair Gel', type: 'Personal Care' },
        { brand: 'Hair Spray', type: 'Personal Care' },
        { brand: 'Hair Wax', type: 'Personal Care' },
        { brand: 'Hair Cream', type: 'Personal Care' },
        { brand: 'Hair Serum', type: 'Personal Care' },
        { brand: 'Hair Mask', type: 'Personal Care' },
        { brand: 'Hair Dye', type: 'Personal Care' },
        { brand: 'Henna', type: 'Personal Care' },

        // More household items
        { brand: 'Bleach', type: 'Household Cleaning' },
        { brand: 'Disinfectant', type: 'Household Cleaning' },
        { brand: 'Fabric Softener', type: 'Household Cleaning' },
        { brand: 'Stain Remover', type: 'Household Cleaning' },
        { brand: 'Rust Remover', type: 'Household Cleaning' },
        { brand: 'Drain Cleaner', type: 'Household Cleaning' },
        { brand: 'Oven Cleaner', type: 'Household Cleaning' },
        { brand: 'Carpet Cleaner', type: 'Household Cleaning' },
        { brand: 'Furniture Polish', type: 'Household Cleaning' },
        { brand: 'Metal Polish', type: 'Household Cleaning' },
        { brand: 'Shoe Polish', type: 'Household Cleaning' },
        { brand: 'Mop', type: 'Cleaning Tools' },
        { brand: 'Broom', type: 'Cleaning Tools' },
        { brand: 'Dustpan', type: 'Cleaning Tools' },
        { brand: 'Bucket', type: 'Cleaning Tools' },
        { brand: 'Brush', type: 'Cleaning Tools' },
        { brand: 'Sponge', type: 'Cleaning Tools' },
        { brand: 'Scrubber', type: 'Cleaning Tools' },
        { brand: 'Gloves', type: 'Cleaning Tools' },
        { brand: 'Cloth', type: 'Cleaning Tools' },
        { brand: 'Duster', type: 'Cleaning Tools' },

        // More food items
        { brand: 'Salt', type: 'Cooking Essentials' },
        { brand: 'Pepper', type: 'Cooking Essentials' },
        { brand: 'MSG', type: 'Cooking Essentials' },
        { brand: 'Ajinomoto', type: 'Cooking Essentials' },
        { brand: 'Corn Flour', type: 'Cooking Essentials' },
        { brand: 'Tapioca', type: 'Cooking Essentials' },
        { brand: 'Sago', type: 'Cooking Essentials' },
        { brand: 'Semolina', type: 'Cooking Essentials' },
        { brand: 'Rava', type: 'Cooking Essentials' },
        { brand: 'Poha', type: 'Cooking Essentials' },
        { brand: 'Idli Rava', type: 'Cooking Essentials' },
        { brand: 'Dosa Mix', type: 'Cooking Essentials' },
        { brand: 'Upma Mix', type: 'Cooking Essentials' },
        { brand: 'Puttu Flour', type: 'Cooking Essentials' },
        { brand: 'String Hopper Flour', type: 'Cooking Essentials' },
        { brand: 'Hopper Flour', type: 'Cooking Essentials' },
        { brand: 'Rice Flour', type: 'Cooking Essentials' },
        { brand: 'Kurakkan Flour', type: 'Cooking Essentials' },
        { brand: 'Besan', type: 'Cooking Essentials' },
        { brand: 'Gram Flour', type: 'Cooking Essentials' },
        { brand: 'Maida', type: 'Cooking Essentials' },
        { brand: 'Self Raising Flour', type: 'Cooking Essentials' },
        { brand: 'Bread Crumbs', type: 'Cooking Essentials' },
        { brand: 'Custard Powder', type: 'Cooking Essentials' },
        { brand: 'Jelly Powder', type: 'Cooking Essentials' },
        { brand: 'Agar Agar', type: 'Cooking Essentials' },
        { brand: 'Gelatin', type: 'Cooking Essentials' },
        { brand: 'Essence', type: 'Cooking Essentials' },
        { brand: 'Food Color', type: 'Cooking Essentials' },

        // Additional categories for variety
        { brand: 'Car Freshener', type: 'Auto Care' },
        { brand: 'Air Pump', type: 'Auto Care' },
        { brand: 'Tool Kit', type: 'Tools' },
        { brand: 'Torch Light', type: 'Electronics' },
        { brand: 'Extension Cord', type: 'Electronics' },
        { brand: 'Adapter', type: 'Electronics' },
        { brand: 'USB Cable', type: 'Electronics' },
        { brand: 'Charger', type: 'Electronics' },
        { brand: 'Power Bank', type: 'Electronics' },
        { brand: 'Calculator', type: 'Electronics' },
        { brand: 'Clock', type: 'Home Decor' },
        { brand: 'Photo Frame', type: 'Home Decor' },
        { brand: 'Vase', type: 'Home Decor' },
        { brand: 'Mirror', type: 'Home Decor' },
        { brand: 'Hanger', type: 'Wardrobe' },
        { brand: 'Moth Balls', type: 'Wardrobe' },
        { brand: 'Shoe Rack', type: 'Storage' },
        { brand: 'Storage Box', type: 'Storage' },
        { brand: 'Laundry Basket', type: 'Storage' },
        { brand: 'Dustbin', type: 'Storage' },
        { brand: 'Umbrella', type: 'Accessories' },
        { brand: 'Rain Coat', type: 'Accessories' },
        { brand: 'Sewing Kit', type: 'Accessories' },
        { brand: 'First Aid Kit', type: 'Health' },
        { brand: 'Mask', type: 'Health' },
        { brand: 'Hand Gloves', type: 'Health' },
        { brand: 'Sanitizer Stand', type: 'Health' },
        { brand: 'Temperature Gun', type: 'Health' },
        { brand: 'Oximeter', type: 'Health' },
        { brand: 'BP Monitor', type: 'Health' },
        { brand: 'Glucometer', type: 'Health' },
        { brand: 'Weighing Scale', type: 'Health' }
    ];

    const stmt = db.prepare(`
        INSERT INTO categories (brand, type, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, ?, 'pending')
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
 * Seed default branch
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

    const stmt = db.prepare(`
        INSERT INTO branches (name, address, contact, is_active, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, 1, ?, ?, 'pending')
    `);

    stmt.run('Main Location', 'Unknown', 'Unknown', now, now);

    console.log('[Seeder] Default branch created: Main Location');
    return { seeded: true, message: 'Created default branch: Main Location' };
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
        VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, 'pending')
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
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 'pending')
    `);

    const stockStmt = db.prepare(`
        INSERT INTO stock (item_id, batch_code, quantity, threshold_limit, stock_price, retail_price, discount_price, expiry_date, availability, branch_id, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
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
 * Seed Credit 1 Month payment method if it doesn't exist
 * This handles existing databases that were created before this payment method was added
 */
function seedCredit1MonthPayment() {
    const db = getDatabase();

    // Check if Credit 1 Month already exists
    const existing = db.prepare("SELECT id FROM payment_methods WHERE name = 'Credit 1 Month' LIMIT 1").get();

    if (existing) {
        return { seeded: false, message: 'Credit 1 Month already exists' };
    }

    // Check if payment_methods table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='payment_methods'").get();
    if (!tableExists) {
        return { seeded: false, message: 'payment_methods table does not exist yet' };
    }

    // Insert Credit 1 Month payment method
    const stmt = db.prepare(`
        INSERT INTO payment_methods (name, description, type, credit_months, is_active, is_member_only, display_order, icon, color, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `);

    stmt.run('Credit 1 Month', '1 month credit payment', 'credit', 1, 1, 1, 2, 'CreditCard', 'cyan');

    // Update display_order for other credit methods to make room
    db.prepare("UPDATE payment_methods SET display_order = display_order + 1 WHERE display_order >= 2 AND name != 'Credit 1 Month'").run();

    console.log('[Seeder] Credit 1 Month payment method created');
    return { seeded: true, message: 'Credit 1 Month payment method created' };
}

/**
 * Run all seeders
 * Seeds default data when the database is first initialized
 * Only seeds essential data: admin user, UOMs, categories, and default branch
 */
function runSeeders() {
    console.log('[Seeder] Running database seeders...');

    const results = {
        uoms: seedDefaultUoms(),
        categories: seedDefaultCategories(),
        branches: seedDefaultBranch(),
        admin: seedDefaultAdmin()
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
    seedCredit1MonthPayment,
    runSeeders
};
