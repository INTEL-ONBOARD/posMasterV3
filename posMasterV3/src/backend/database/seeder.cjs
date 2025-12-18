/**
 * Database Seeder
 *
 * Creates default data when the database is first initialized.
 */

const bcrypt = require('bcryptjs');
const { getDatabase } = require('./connection.cjs');
const { generateUUID } = require('../utils/helpers.cjs');

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

    const adminUser = {
        id: generateUUID(),
        cloud_id: null,
        username: 'admin',
        email: 'admin@posmaster',
        password_hash: passwordHash,
        full_name: 'System Administrator',
        roles: JSON.stringify(['admin', 'manager', 'cashier']),
        is_active: 1,
        sync_status: 'local_only',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
    };

    const stmt = db.prepare(`
        INSERT INTO users (id, cloud_id, username, email, password_hash, full_name, roles, is_active, sync_status, created_at, updated_at)
        VALUES (@id, @cloud_id, @username, @email, @password_hash, @full_name, @roles, @is_active, @sync_status, @created_at, @updated_at)
    `);

    stmt.run(adminUser);

    console.log('[Seeder] Default admin user created');
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

    const now = new Date().toISOString();
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
 * Seed default categories
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

    const defaultCategories = [
        { brand: 'General', type: 'Beverages' },
        { brand: 'General', type: 'Snacks' },
        { brand: 'General', type: 'Dairy' },
        { brand: 'General', type: 'Bakery' },
        { brand: 'General', type: 'Personal Care' },
        { brand: 'General', type: 'Household' },
        { brand: 'General', type: 'Groceries' },
        { brand: 'General', type: 'Frozen Foods' },
        { brand: 'General', type: 'Canned Goods' },
        { brand: 'General', type: 'Condiments' }
    ];

    const stmt = db.prepare(`
        INSERT INTO categories (brand, type, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, ?, 'local_only')
    `);

    const now = new Date().toISOString();
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

    const now = new Date().toISOString();

    const stmt = db.prepare(`
        INSERT INTO branches (name, address, contact, is_active, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, 1, ?, ?, 'local_only')
    `);

    stmt.run('Main Branch', 'Default Location', '', now, now);

    console.log('[Seeder] Default branch created');
    return { seeded: true, message: 'Default branch created' };
}

/**
 * Seed default member (Walk-in customer)
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

    const now = new Date().toISOString();

    const stmt = db.prepare(`
        INSERT INTO members (member_no, full_name, contact, address, member_type, is_active, created_at, updated_at, sync_status)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, 'local_only')
    `);

    stmt.run('MEM000001', 'Walk-in Customer', '', '', 'regular', now, now);

    console.log('[Seeder] Default member (Walk-in Customer) created');
    return { seeded: true, message: 'Default member created' };
}

/**
 * Run all seeders
 */
function runSeeders() {
    console.log('[Seeder] Running database seeders...');

    const results = {
        admin: seedDefaultAdmin(),
        uoms: seedDefaultUoms(),
        categories: seedDefaultCategories(),
        branches: seedDefaultBranch(),
        members: seedDefaultMember()
    };

    console.log('[Seeder] Seeding complete');
    return results;
}

module.exports = {
    seedDefaultAdmin,
    seedDefaultUoms,
    seedDefaultCategories,
    seedDefaultBranch,
    seedDefaultMember,
    runSeeders
};
