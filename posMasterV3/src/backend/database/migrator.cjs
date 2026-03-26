/**
 * Database Migration Manager
 *
 * Handles running and tracking database migrations.
 * Migrations are run in order and tracked in a migrations table.
 *
 * MIGRATION VERSION HISTORY NOTE:
 * Versions 016-019 are intentionally absent. These were exploratory migrations
 * created during development that were reverted before shipping and removed
 * to avoid breaking devices that never received them. The migrator safely
 * handles gaps in version numbers — it skips missing files and only runs
 * migrations not yet recorded in the migrations table.
 */

const fs = require('fs');
const path = require('path');

/**
 * Initialize migrations tracking table
 * @param {Database} db - The better-sqlite3 database instance
 */
function initMigrationsTable(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            version INTEGER UNIQUE NOT NULL,
            name TEXT NOT NULL,
            applied_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

/**
 * Get the current migration version
 * @param {Database} db - The better-sqlite3 database instance
 * @returns {number} The highest applied migration version
 */
function getCurrentVersion(db) {
    const result = db.prepare('SELECT MAX(version) as version FROM migrations').get();
    return result?.version || 0;
}

/**
 * Load all migration files from the migrations directory
 * @returns {Array} Array of migration modules sorted by version
 */
function loadMigrations() {
    const migrationsDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
        console.warn('[Migrator] Migrations directory not found');
        return [];
    }

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.cjs') || f.endsWith('.js'))
        .sort();

    const migrations = [];

    for (const file of files) {
        try {
            const migration = require(path.join(migrationsDir, file));
            if (migration.version && migration.up && migration.down) {
                migrations.push(migration);
            }
        } catch (error) {
            console.error(`[Migrator] Failed to load migration ${file}:`, error.message);
        }
    }

    return migrations.sort((a, b) => a.version - b.version);
}

/**
 * Run all pending migrations
 * @param {Database} db - The better-sqlite3 database instance
 * @returns {Object} Migration result with applied count and any errors
 */
function runMigrations(db) {
    initMigrationsTable(db);

    const currentVersion = getCurrentVersion(db);
    const migrations = loadMigrations();
    const pendingMigrations = migrations.filter(m => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
        console.log('[Migrator] Database is up to date');
        return { applied: 0, errors: [] };
    }

    console.log(`[Migrator] Running ${pendingMigrations.length} pending migration(s)...`);

    const results = {
        applied: 0,
        errors: []
    };

    for (const migration of pendingMigrations) {
        try {
            // Run migration in a transaction
            const transaction = db.transaction(() => {
                migration.up(db);

                // Record the migration
                db.prepare(`
                    INSERT INTO migrations (version, name, applied_at)
                    VALUES (?, ?, datetime('now'))
                `).run(migration.version, migration.name);
            });

            transaction();
            results.applied++;
            console.log(`[Migrator] ✓ Applied migration ${migration.version}: ${migration.name}`);
        } catch (error) {
            console.error(`[Migrator] ✗ Failed migration ${migration.version}:`, error.message);
            results.errors.push({
                version: migration.version,
                name: migration.name,
                error: error.message
            });
            // Continue to next migration — a failed migration should not block
            // safety-net or independent migrations that follow it.
        }
    }

    return results;
}

/**
 * Rollback the last migration
 * @param {Database} db - The better-sqlite3 database instance
 * @returns {Object} Rollback result
 */
function rollbackLast(db) {
    initMigrationsTable(db);

    const currentVersion = getCurrentVersion(db);
    if (currentVersion === 0) {
        console.log('[Migrator] No migrations to rollback');
        return { rolledBack: false };
    }

    const migrations = loadMigrations();
    const migration = migrations.find(m => m.version === currentVersion);

    if (!migration) {
        console.error(`[Migrator] Migration ${currentVersion} not found in files`);
        return { rolledBack: false, error: 'Migration file not found' };
    }

    try {
        const transaction = db.transaction(() => {
            migration.down(db);

            db.prepare('DELETE FROM migrations WHERE version = ?').run(currentVersion);
        });

        transaction();
        console.log(`[Migrator] ✓ Rolled back migration ${migration.version}: ${migration.name}`);
        return { rolledBack: true, version: currentVersion };
    } catch (error) {
        console.error(`[Migrator] ✗ Rollback failed:`, error.message);
        return { rolledBack: false, error: error.message };
    }
}

/**
 * Get migration status
 * @param {Database} db - The better-sqlite3 database instance
 * @returns {Object} Migration status information
 */
function getStatus(db) {
    initMigrationsTable(db);

    const appliedMigrations = db.prepare('SELECT * FROM migrations ORDER BY version').all();
    const availableMigrations = loadMigrations();
    const currentVersion = getCurrentVersion(db);
    const pendingCount = availableMigrations.filter(m => m.version > currentVersion).length;

    return {
        currentVersion,
        appliedCount: appliedMigrations.length,
        pendingCount,
        applied: appliedMigrations,
        available: availableMigrations.map(m => ({
            version: m.version,
            name: m.name,
            applied: m.version <= currentVersion
        }))
    };
}

module.exports = {
    runMigrations,
    rollbackLast,
    getStatus,
    getCurrentVersion
};
