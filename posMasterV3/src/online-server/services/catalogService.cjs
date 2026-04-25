const { ObjectId } = require('mongodb');
const { getDb } = require('../db/mongo.cjs');
const { publishDomainEvent } = require('./domainEvents.cjs');

const COLLECTIONS = new Set([
    'branches',
    'categories',
    'units_of_measurement',
    'suppliers',
    'items',
    'stock_batches',
    'restock_transactions',
    'restock_items',
    'return_items',
    'members',
    'sales',
    'sales_items',
    'returned_items',
    'users',
    'user_settings',
    'app_settings',
    'login_history',
    'offers',
    'disposed_items',
    'payment_methods',
    'tea_coop_members',
    'tea_coop_payments'
]);

function ensureCollection(name) {
    if (!COLLECTIONS.has(name)) {
        const err = new Error(`Unsupported collection: ${name}`);
        err.statusCode = 404;
        throw err;
    }
}

function parseObjectId(id) {
    if (!ObjectId.isValid(id)) {
        const err = new Error('Invalid record id');
        err.statusCode = 400;
        throw err;
    }
    return new ObjectId(id);
}

function scopedQuery(auth, query = {}) {
    const filter = {
        orgId: auth.orgId,
        deletedAt: null
    };
    if (query.branchId) filter.branchId = query.branchId;
    return filter;
}

async function list(collectionName, auth, query = {}) {
    ensureCollection(collectionName);
    const db = getDb();
    const limit = Math.min(Number.parseInt(query.limit || '100', 10), 500);
    const skip = Math.max(Number.parseInt(query.skip || '0', 10), 0);
    return db.collection(collectionName)
        .find(scopedQuery(auth, query))
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
}

async function getById(collectionName, auth, id) {
    ensureCollection(collectionName);
    const db = getDb();
    const record = await db.collection(collectionName).findOne({
        _id: parseObjectId(id),
        orgId: auth.orgId,
        deletedAt: null
    });
    if (!record) {
        const err = new Error('Record not found');
        err.statusCode = 404;
        throw err;
    }
    return record;
}

async function create(collectionName, auth, body) {
    ensureCollection(collectionName);
    const db = getDb();
    const now = new Date();
    const document = {
        ...body,
        orgId: auth.orgId,
        branchId: body.branchId || auth.branchId || null,
        createdAt: now,
        updatedAt: now,
        createdBy: auth.userId,
        updatedBy: auth.userId,
        version: 1,
        deletedAt: null
    };

    const result = await db.collection(collectionName).insertOne(document);
    const inserted = { ...document, _id: result.insertedId };
    await publishDomainEvent({
        event: `${collectionName}.created`,
        orgId: auth.orgId,
        branchId: inserted.branchId || null,
        entity: collectionName,
        entityId: String(result.insertedId),
        operation: 'create',
        version: inserted.version,
        changedBy: auth.userId
    });
    return inserted;
}

async function update(collectionName, auth, id, body) {
    ensureCollection(collectionName);
    const db = getDb();
    const _id = parseObjectId(id);
    const existing = await db.collection(collectionName).findOne({
        _id,
        orgId: auth.orgId,
        deletedAt: null
    });
    if (!existing) {
        const err = new Error('Record not found');
        err.statusCode = 404;
        throw err;
    }

    const updateDoc = {
        ...body,
        orgId: existing.orgId,
        updatedAt: new Date(),
        updatedBy: auth.userId,
        version: (existing.version || 1) + 1
    };
    delete updateDoc._id;
    delete updateDoc.createdAt;
    delete updateDoc.createdBy;
    delete updateDoc.deletedAt;

    await db.collection(collectionName).updateOne({ _id }, { $set: updateDoc });
    const updated = await db.collection(collectionName).findOne({ _id });
    await publishDomainEvent({
        event: `${collectionName}.updated`,
        orgId: auth.orgId,
        branchId: updated.branchId || null,
        entity: collectionName,
        entityId: id,
        operation: 'update',
        version: updated.version,
        changedBy: auth.userId
    });
    return updated;
}

async function softDelete(collectionName, auth, id) {
    ensureCollection(collectionName);
    const db = getDb();
    const _id = parseObjectId(id);
    const existing = await db.collection(collectionName).findOne({
        _id,
        orgId: auth.orgId,
        deletedAt: null
    });
    if (!existing) {
        const err = new Error('Record not found');
        err.statusCode = 404;
        throw err;
    }

    const version = (existing.version || 1) + 1;
    await db.collection(collectionName).updateOne(
        { _id },
        {
            $set: {
                deletedAt: new Date(),
                updatedAt: new Date(),
                updatedBy: auth.userId,
                version
            }
        }
    );

    await publishDomainEvent({
        event: `${collectionName}.deleted`,
        orgId: auth.orgId,
        branchId: existing.branchId || null,
        entity: collectionName,
        entityId: id,
        operation: 'delete',
        version,
        changedBy: auth.userId
    });

    return { id, deleted: true };
}

module.exports = {
    list,
    getById,
    create,
    update,
    softDelete
};
