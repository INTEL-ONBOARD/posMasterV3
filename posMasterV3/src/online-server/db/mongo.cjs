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
    await Promise.all([
        database.collection('users').createIndex({ orgId: 1, email: 1 }, { unique: true }),
        database.collection('users').createIndex({ orgId: 1, username: 1 }, { unique: true }),
        database.collection('branches').createIndex({ orgId: 1, name: 1 }, { unique: true }),
        database.collection('items').createIndex({ orgId: 1, sku: 1 }, { unique: true }),
        database.collection('stock_batches').createIndex(
            { orgId: 1, branchId: 1, itemId: 1, batchCode: 1 },
            { unique: true }
        ),
        database.collection('sessions').createIndex({ userId: 1, active: 1 }),
        database.collection('sessions').createIndex({ tokenHash: 1 }, { unique: true }),
        database.collection('sales').createIndex({ orgId: 1, branchId: 1, invoiceNo: 1 }, { unique: true }),
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
