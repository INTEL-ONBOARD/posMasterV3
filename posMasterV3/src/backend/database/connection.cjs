/**
 * Database Connection Manager
 * Handles SQLite database connection with better-sqlite3
 *
 * This module provides a singleton database connection that can be used
 * across the entire backend layer.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let db = null;
let dbPath = null;

/**
 * Initialize the database connection
 * @param {string} configPath - Path to the config folder where DB will be stored
 * @returns {Database} The database instance
 */
function initializeDatabase(configPath) {
    if (db) {
        return db;
    }

    // Default to user's app data if no config path provided
    const basePath = configPath || path.join(process.env.APPDATA || process.env.HOME, 'POS Master');

    // Ensure the directory exists
    if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true });
    }

    dbPath = path.join(basePath, 'posmaster.db');

    try {
        db = new Database(dbPath, {
            verbose: process.env.NODE_ENV === 'development' ? console.log : null
        });

        // Enable foreign keys
        db.pragma('foreign_keys = ON');

        // Enable WAL mode for better performance
        db.pragma('journal_mode = WAL');

        console.log(`[Database] Connected to SQLite database at: ${dbPath}`);

        return db;
    } catch (error) {
        console.error('[Database] Failed to connect:', error.message);
        throw error;
    }
}

/**
 * Get the current database instance
 * @returns {Database|null} The database instance or null if not initialized
 */
function getDatabase() {
    if (!db) {
        console.warn('[Database] Database not initialized. Call initializeDatabase first.');
    }
    return db;
}

/**
 * Close the database connection
 */
function closeDatabase() {
    if (db) {
        db.close();
        db = null;
        console.log('[Database] Connection closed');
    }
}

/**
 * Get the current database file path
 * @returns {string|null} The database file path
 */
function getDatabasePath() {
    return dbPath;
}

/**
 * Check if database is initialized
 * @returns {boolean}
 */
function isInitialized() {
    return db !== null;
}

module.exports = {
    initializeDatabase,
    getDatabase,
    closeDatabase,
    getDatabasePath,
    isInitialized
};
