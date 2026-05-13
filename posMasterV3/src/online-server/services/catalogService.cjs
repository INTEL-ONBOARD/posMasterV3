const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/mongo.cjs');
const { publishDomainEvent } = require('./domainEvents.cjs');
const restockService = require('./restockService.cjs');

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
    'inventory_transfers',
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
    const queryAliases = [
        ['branchId', 'branchId'],
        ['branch_id', 'branchId'],
        ['userId', 'userId'],
        ['user_id', 'userId'],
        ['memberId', 'memberId'],
        ['member_id', 'memberId'],
        ['saleId', 'saleId'],
        ['sale_id', 'saleId'],
        ['restockId', 'restockId'],
        ['restock_id', 'restockId'],
        ['itemId', 'itemId'],
        ['item_id', 'itemId'],
        ['stockId', 'stockId'],
        ['stock_id', 'stockId'],
        ['sku', 'sku'],
        ['batchCode', 'batchCode'],
        ['batch_code', 'batchCode'],
        ['invoiceNo', 'invoiceNo'],
        ['invoice_no', 'invoiceNo'],
        ['key', 'key'],
        ['setting_key', 'setting_key'],
        ['name', 'name'],
        ['type', 'type'],
        ['status', 'status']
    ];
    for (const [sourceKey, targetKey] of queryAliases) {
        if (query[sourceKey] !== undefined && query[sourceKey] !== null && query[sourceKey] !== '') {
            filter[targetKey] = query[sourceKey];
        }
    }
    return filter;
}

function normalizeCollectionBody(collectionName, auth, body = {}, existing = null) {
    const payload = { ...body };

    const boolFrom = (value) => value === true || value === 1 || value === '1' || value === 'true';

    if (collectionName === 'users') {
        if (payload.password || payload.newPassword) {
            payload.passwordHashPromise = bcrypt.hash(String(payload.password || payload.newPassword), 12);
        }
        if (payload.is_active !== undefined || payload.isActive !== undefined) {
            const active = boolFrom(payload.is_active ?? payload.isActive);
            payload.is_active = active;
            payload.isActive = active;
        }
        if (payload.branch_id !== undefined || payload.branchId !== undefined) {
            const branchId = payload.branch_id ?? payload.branchId ?? null;
            payload.branch_id = branchId;
            payload.branchId = branchId;
        }
        if (payload.roles && !Array.isArray(payload.roles)) {
            payload.roles = [payload.roles].filter(Boolean);
        }
    }

    if (collectionName === 'payment_methods') {
        if (payload.is_active !== undefined || payload.isActive !== undefined) {
            const active = boolFrom(payload.is_active ?? payload.isActive);
            payload.is_active = active;
            payload.isActive = active;
        }
        if (payload.is_member_only !== undefined || payload.isMemberOnly !== undefined) {
            const memberOnly = boolFrom(payload.is_member_only ?? payload.isMemberOnly);
            payload.is_member_only = memberOnly;
            payload.isMemberOnly = memberOnly;
        }
    }

    if (collectionName === 'branches' || collectionName === 'members') {
        if (payload.is_active !== undefined || payload.isActive !== undefined) {
            const active = boolFrom(payload.is_active ?? payload.isActive);
            payload.is_active = active;
            payload.isActive = active;
        }
    }

    if (collectionName === 'app_settings') {
        const settingKey = payload.setting_key ?? payload.key ?? existing?.setting_key ?? existing?.key ?? null;
        if (settingKey) {
            payload.setting_key = settingKey;
            payload.key = settingKey;
        }
        if (payload.setting_value === undefined && payload.value !== undefined) {
            payload.setting_value = payload.value;
        }
        if (payload.value === undefined && payload.setting_value !== undefined) {
            payload.value = payload.setting_value;
        }
    }

    if (collectionName === 'sales') {
        if (payload.invoice_no !== undefined && payload.invoiceNo === undefined) {
            payload.invoiceNo = payload.invoice_no;
        }
        if (payload.invoiceNo !== undefined && payload.invoice_no === undefined) {
            payload.invoice_no = payload.invoiceNo;
        }
        if (payload.is_held !== undefined || payload.isHeld !== undefined) {
            const held = boolFrom(payload.is_held ?? payload.isHeld);
            payload.is_held = held;
            payload.isHeld = held;
        }
    }

    return payload;
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

    // Delegate restock transactions to dedicated service that also
    // creates/updates stock_batches for each added item.
    if (collectionName === 'restock_transactions') {
        return restockService.createRestock(auth, body);
    }

    const db = getDb();
    const now = new Date();
    const payload = normalizeCollectionBody(collectionName, auth, body);
    if (payload.passwordHashPromise) {
        payload.passwordHash = await payload.passwordHashPromise;
        delete payload.passwordHashPromise;
        delete payload.password;
        delete payload.newPassword;
    }
    const document = {
        ...payload,
        orgId: auth.orgId,
        branchId: payload.branchId || payload.branch_id || auth.branchId || null,
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

    const payload = normalizeCollectionBody(collectionName, auth, body, existing);
    if (payload.passwordHashPromise) {
        payload.passwordHash = await payload.passwordHashPromise;
        delete payload.passwordHashPromise;
        delete payload.password;
        delete payload.newPassword;
    }

    const updateDoc = {
        ...payload,
        orgId: existing.orgId,
        updatedAt: new Date(),
        updatedBy: auth.userId,
        version: (existing.version || 1) + 1
    };
    delete updateDoc._id;
    delete updateDoc.createdAt;
    delete updateDoc.createdBy;
    delete updateDoc.deletedAt;
    if (updateDoc.is_active !== undefined) updateDoc.isActive = updateDoc.is_active;
    if (updateDoc.isActive !== undefined) updateDoc.is_active = updateDoc.isActive;
    if (updateDoc.branch_id !== undefined && updateDoc.branchId === undefined) updateDoc.branchId = updateDoc.branch_id;
    if (updateDoc.branchId !== undefined && updateDoc.branch_id === undefined) updateDoc.branch_id = updateDoc.branchId;

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
