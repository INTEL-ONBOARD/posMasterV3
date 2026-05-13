const { MongoClient } = require('mongodb');
const { config } = require('../config.cjs');

let client = null;
let db = null;
let transactionsSupported = false;
let connectPromise = null;

async function connectMongo() {
    if (db) return db;
    if (connectPromise) return connectPromise;

    connectPromise = (async () => {
        client = new MongoClient(config.mongoUri, {
            appName: 'posmasterv3-online'
        });

        await client.connect();
        db = client.db(config.mongoDbName);
        transactionsSupported = await detectTransactionSupport(db);
        await ensureIndexes(db);
        return db;
    })();

    try {
        return await connectPromise;
    } catch (error) {
        client = null;
        db = null;
        transactionsSupported = false;
        throw error;
    } finally {
        connectPromise = null;
    }
}

function getDb() {
    if (!db) {
        throw new Error('MongoDB is not connected');
    }
    return db;
}

function getMongoClient() {
    if (!client) {
        throw new Error('MongoDB is not connected');
    }
    return client;
}

function supportsTransactions() {
    return transactionsSupported;
}

async function closeMongo() {
    if (client) {
        await client.close();
    }
    client = null;
    db = null;
    transactionsSupported = false;
    connectPromise = null;
}

async function detectTransactionSupport(database) {
    try {
        const hello = await database.admin().command({ hello: 1 });
        return Boolean(hello.setName || hello.msg === 'isdbgrid');
    } catch {
        return false;
    }
}

async function ensureIndexes(database) {
    const activeOnly = { deletedAt: null };
    const dropLegacyIndex = async (collectionName, name) => {
        const collection = database.collection(collectionName);
        const existing = await collection.indexes();
        if (existing.some((index) => index.name === name)) {
            await collection.dropIndex(name);
        }
    };
    const ensureUniqueActiveIndex = async (collectionName, keys, name, partialFilterExpression = activeOnly) => {
        const collection = database.collection(collectionName);
        const existing = await collection.indexes();
        const current = existing.find((index) => index.name === name);
        if (current) {
            const samePartial = JSON.stringify(current.partialFilterExpression || {}) === JSON.stringify(partialFilterExpression || {});
            if (current.unique === true && samePartial) return;
            await collection.dropIndex(name);
        }
        await collection.createIndex(keys, {
            unique: true,
            name,
            partialFilterExpression
        });
    };

    await Promise.all([
        dropLegacyIndex('users', 'orgId_1_email_1'),
        dropLegacyIndex('users', 'orgId_1_username_1'),
        dropLegacyIndex('branches', 'orgId_1_name_1'),
        dropLegacyIndex('items', 'orgId_1_sku_1'),
        dropLegacyIndex('stock_batches', 'orgId_1_branchId_1_itemId_1_batchCode_1'),
        dropLegacyIndex('sales', 'orgId_1_branchId_1_invoiceNo_1')
    ]);

    await Promise.all([
        ensureUniqueActiveIndex('users', { orgId: 1, email: 1 }, 'unique_active_user_email', { deletedAt: null, email: { $type: 'string' } }),
        ensureUniqueActiveIndex('users', { orgId: 1, username: 1 }, 'unique_active_user_username', { deletedAt: null, username: { $type: 'string' } }),
        ensureUniqueActiveIndex('branches', { orgId: 1, name: 1 }, 'unique_active_branch_name', { deletedAt: null, name: { $type: 'string' } }),
        ensureUniqueActiveIndex('items', { orgId: 1, sku: 1 }, 'unique_active_item_sku', { deletedAt: null, sku: { $type: 'string' } }),
        ensureUniqueActiveIndex('stock_batches', { orgId: 1, branchId: 1, itemId: 1, batchCode: 1 }, 'unique_active_stock_batch', {
            deletedAt: null,
            branchId: { $type: 'string' },
            itemId: { $type: 'string' },
            batchCode: { $type: 'string' }
        }),
        ensureUniqueActiveIndex('stock_batches', { orgId: 1, branch_id: 1, item_id: 1, batch_code: 1 }, 'unique_active_stock_batch_legacy', {
            deletedAt: null,
            branch_id: { $type: 'string' },
            item_id: { $type: 'string' },
            batch_code: { $type: 'string' }
        }),
        ensureUniqueActiveIndex('sales', { orgId: 1, branchId: 1, invoiceNo: 1 }, 'unique_active_sale_invoice', {
            deletedAt: null,
            branchId: { $type: 'string' },
            invoiceNo: { $type: 'string' }
        })
    ]);

    await Promise.all([
        database.collection('sessions').createIndex({ userId: 1, active: 1 }),
        database.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true }),
        database.collection('invoice_counters').createIndex(
            { orgId: 1, branchId: 1, dateKey: 1, type: 1 },
            { unique: true }
        ),
        database.collection('audit_events').createIndex({ orgId: 1, createdAt: -1 }),
        database.collection('domain_events').createIndex({ orgId: 1, createdAt: -1 })
    ]);
}

module.exports = {
    connectMongo,
    getDb,
    getMongoClient,
    supportsTransactions,
    closeMongo
};
