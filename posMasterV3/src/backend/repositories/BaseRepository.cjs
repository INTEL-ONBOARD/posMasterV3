/**
 * Base Repository
 *
 * Abstract base class for all repositories providing common CRUD operations.
 * Repositories handle direct database interactions and data mapping.
 * Automatically notifies CloudSyncService on data changes for real-time sync.
 */

const { getDatabase } = require('../database/connection.cjs');
const { notifyDataChange } = require('../services/CloudSyncService.cjs');
const { nowISO } = require('../utils/helpers.cjs');

class BaseRepository {
    constructor(tableName) {
        this.tableName = tableName;
    }

    /**
     * Get the database instance
     * @returns {Database}
     */
    get db() {
        const db = getDatabase();
        if (!db) {
            throw new Error('Database not initialized');
        }
        return db;
    }

    /**
     * Find a record by ID
     * @param {string} id - The record ID
     * @returns {Object|null}
     */
    findById(id) {
        const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE id = ?`);
        return stmt.get(id) || null;
    }

    /**
     * Find all records
     * @param {Object} options - Query options
     * @param {number} options.limit - Maximum records to return
     * @param {number} options.offset - Records to skip
     * @param {string} options.orderBy - Column to order by
     * @param {string} options.order - 'ASC' or 'DESC'
     * @returns {Array}
     */
    findAll(options = {}) {
        const {
            limit = 100,
            offset = 0,
            orderBy = 'created_at',
            order = 'DESC'
        } = options;

        const stmt = this.db.prepare(`
            SELECT * FROM ${this.tableName}
            ORDER BY ${orderBy} ${order}
            LIMIT ? OFFSET ?
        `);

        return stmt.all(limit, offset);
    }

    /**
     * Find records matching criteria
     * @param {Object} criteria - Key-value pairs to match
     * @returns {Array}
     */
    findWhere(criteria) {
        const keys = Object.keys(criteria);
        const values = Object.values(criteria);

        if (keys.length === 0) {
            return this.findAll();
        }

        const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
        const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${whereClause}`);

        return stmt.all(...values);
    }

    /**
     * Find one record matching criteria
     * @param {Object} criteria - Key-value pairs to match
     * @returns {Object|null}
     */
    findOneWhere(criteria) {
        const keys = Object.keys(criteria);
        const values = Object.values(criteria);

        if (keys.length === 0) {
            return null;
        }

        const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
        const stmt = this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${whereClause} LIMIT 1`);

        return stmt.get(...values) || null;
    }

    /**
     * Create a new record
     * @param {Object} data - The data to insert
     * @returns {Object} The created record
     */
    create(data) {
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map(() => '?').join(', ');

        const stmt = this.db.prepare(`
            INSERT INTO ${this.tableName} (${keys.join(', ')})
            VALUES (${placeholders})
        `);

        const result = stmt.run(...values);

        // Get the created record
        let createdRecord;
        if (data.id) {
            createdRecord = this.findById(data.id);
        } else {
            // For auto-increment IDs
            createdRecord = this.findById(result.lastInsertRowid);
        }

        // Notify CloudSync of the change
        if (createdRecord) {
            const recordId = createdRecord.id || result.lastInsertRowid;
            notifyDataChange(this.tableName, 'INSERT', createdRecord, recordId);
        }

        return createdRecord;
    }

    /**
     * Update a record by ID
     * @param {string} id - The record ID
     * @param {Object} data - The data to update
     * @returns {Object|null} The updated record
     */
    update(id, data) {
        const keys = Object.keys(data);
        const values = Object.values(data);

        if (keys.length === 0) {
            return this.findById(id);
        }

        // Add updated_at if column exists (using Sri Lankan time)
        if (!keys.includes('updated_at')) {
            keys.push('updated_at');
            values.push(nowISO());
        }

        const setClause = keys.map(k => `${k} = ?`).join(', ');

        const stmt = this.db.prepare(`
            UPDATE ${this.tableName}
            SET ${setClause}
            WHERE id = ?
        `);

        stmt.run(...values, id);

        // Get the updated record and notify CloudSync
        const updatedRecord = this.findById(id);
        if (updatedRecord) {
            notifyDataChange(this.tableName, 'UPDATE', updatedRecord, id);
        }

        return updatedRecord;
    }

    /**
     * Delete a record by ID
     * @param {string} id - The record ID
     * @returns {boolean} Whether the record was deleted
     */
    delete(id) {
        // Get the record before deleting for sync notification
        const recordToDelete = this.findById(id);

        const stmt = this.db.prepare(`DELETE FROM ${this.tableName} WHERE id = ?`);
        const result = stmt.run(id);

        // Notify CloudSync of the deletion
        if (result.changes > 0 && recordToDelete) {
            notifyDataChange(this.tableName, 'DELETE', recordToDelete, id);
        }

        return result.changes > 0;
    }

    /**
     * Count all records
     * @returns {number}
     */
    count() {
        const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.tableName}`);
        return stmt.get().count;
    }

    /**
     * Count records matching criteria
     * @param {Object} criteria - Key-value pairs to match
     * @returns {number}
     */
    countWhere(criteria) {
        const keys = Object.keys(criteria);
        const values = Object.values(criteria);

        if (keys.length === 0) {
            return this.count();
        }

        const whereClause = keys.map(k => `${k} = ?`).join(' AND ');
        const stmt = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${whereClause}`);

        return stmt.get(...values).count;
    }

    /**
     * Check if a record exists
     * @param {string} id - The record ID
     * @returns {boolean}
     */
    exists(id) {
        const stmt = this.db.prepare(`SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`);
        return !!stmt.get(id);
    }

    /**
     * Execute a raw query
     * @param {string} sql - The SQL query
     * @param {Array} params - Query parameters
     * @returns {Array}
     */
    raw(sql, params = []) {
        const stmt = this.db.prepare(sql);
        return stmt.all(...params);
    }

    /**
     * Execute a raw query and get one result
     * @param {string} sql - The SQL query
     * @param {Array} params - Query parameters
     * @returns {Object|null}
     */
    rawOne(sql, params = []) {
        const stmt = this.db.prepare(sql);
        return stmt.get(...params) || null;
    }

    /**
     * Run a transaction
     * @param {Function} callback - The transaction callback
     * @returns {any} The callback result
     */
    transaction(callback) {
        const transaction = this.db.transaction(callback);
        return transaction();
    }
}

module.exports = BaseRepository;
