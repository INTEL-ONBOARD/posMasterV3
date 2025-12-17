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
    console.log('[Seeder] Email:    admin@posmaster.local');
    console.log('[Seeder] Password: admin123');
    console.log('[Seeder] ================================');

    return {
        seeded: true,
        message: 'Default admin created',
        credentials: {
            email: 'admin@posmaster.local',
            password: 'admin123'
        }
    };
}

/**
 * Run all seeders
 */
function runSeeders() {
    console.log('[Seeder] Running database seeders...');

    const results = {
        admin: seedDefaultAdmin()
    };

    console.log('[Seeder] Seeding complete');
    return results;
}

module.exports = {
    seedDefaultAdmin,
    runSeeders
};
