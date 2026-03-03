/**
 * MySQL Cloud Database Connection Manager
 * Handles MySQL connection pool for cloud synchronization
 */

const mysql = require('mysql2/promise');

// MySQL Cloud Configuration
const MYSQL_CONFIG = {
    host: '162.241.24.242',
    port: 3306,
    user: 'toursurv_posdbuser',
    password: 'Abc@1234#tea',
    database: 'toursurv_posdb',
    waitForConnections: true,
    connectionLimit: 5,
    connectTimeout: 30000,
    acquireTimeout: 30000,
    queueLimit: 0
};

let pool = null;

/**
 * Initialize MySQL connection pool
 * @returns {Promise<mysql.Pool>} The MySQL connection pool
 */
async function initializeMySQLPool() {
    if (pool) {
        return pool;
    }

    try {
        pool = mysql.createPool(MYSQL_CONFIG);
        console.log('[MySQL] Connection pool created');
        return pool;
    } catch (error) {
        console.error('[MySQL] Failed to create connection pool:', error.message);
        throw error;
    }
}

/**
 * Get the MySQL connection pool
 * @returns {mysql.Pool|null} The connection pool or null if not initialized
 */
function getMySQLPool() {
    return pool;
}

/**
 * Test MySQL connection
 * @returns {Promise<boolean>} True if connection is successful
 */
async function testConnection() {
    try {
        if (!pool) {
            await initializeMySQLPool();
        }

        const connection = await pool.getConnection();
        await connection.ping();
        connection.release();
        console.log('[MySQL] Connection test successful');
        return true;
    } catch (error) {
        console.error('[MySQL] Connection test failed:', error.message);
        return false;
    }
}

/**
 * Execute a MySQL query with an optional timeout
 * @param {string} sql - The SQL query
 * @param {Array} params - Query parameters
 * @param {number} timeoutMs - Query timeout in ms (default: 30000)
 * @returns {Promise<Array>} Query results
 */
async function executeQuery(sql, params = [], timeoutMs = 30000) {
    if (!pool) {
        await initializeMySQLPool();
    }

    let conn = null;
    try {
        conn = await pool.getConnection();
        const queryPromise = conn.execute(sql, params).then(([results]) => results);
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`MySQL query timeout after ${timeoutMs}ms`)), timeoutMs)
        );
        const result = await Promise.race([queryPromise, timeoutPromise]);
        conn.release();
        return result;
    } catch (error) {
        if (conn) conn.release(); // Always release on error or timeout
        console.error('[MySQL] Query execution failed:', error.message);
        throw error;
    }
}

/**
 * Close the MySQL connection pool
 */
async function closeMySQLPool() {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('[MySQL] Connection pool closed');
    }
}

/**
 * Check if pool is initialized
 * @returns {boolean}
 */
function isPoolInitialized() {
    return pool !== null;
}

module.exports = {
    initializeMySQLPool,
    getMySQLPool,
    testConnection,
    executeQuery,
    closeMySQLPool,
    isPoolInitialized,
    MYSQL_CONFIG
};
