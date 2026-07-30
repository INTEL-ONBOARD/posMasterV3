const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const { getDb } = require('../db/mongo.cjs');
const { publishDomainEvent } = require('./domainEvents.cjs');
const restockService = require('./restockService.cjs');
const disposeService = require('./disposeService.cjs');
const { normalizeTrackingMode } = require('./inventoryTrackingService.cjs');
const { hasAnyRole, MANAGER_ROLES } = require('../middleware/auth.cjs');

// Fields a non-manager may change on their own user record via the
// self-service PATCH /collections/users/:id path (see middleware/auth.cjs's
// isSelfUserRecord gate) — matches exactly what UserSettings.jsx's profile
// form actually sends (username, email, full_name). Deliberately an
// ALLOWLIST, not a blocklist: a blocklist of field names like 'roles' is
// bypassable by sending the key as "roles.0" — MongoDB's $set treats a
// dotted key as a path into the array/object, not a literal field name equal
// to "roles", so `delete body['roles']` doesn't touch it, and the update
// still lands. An allowlist has no equivalent bypass — anything not on the
// list is dropped, whatever it's named.
const SELF_SERVICE_ALLOWED_USER_FIELDS = new Set([
    'username', 'email', 'full_name', 'fullName'
]);

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
    'inventory_units',
    'stock_movements',
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

const BRANCH_SCOPED_COLLECTIONS = new Set([
    'stock_batches',
    'restock_transactions',
    'restock_items',
    'return_items',
    'inventory_transfers',
    'inventory_units',
    'stock_movements',
    'sales',
    'sales_items',
    'returned_items',
    'disposed_items',
    'login_history'
]);

const SYSTEM_MANAGED_COLLECTIONS = new Set([
    'inventory_units',
    'stock_movements'
]);

const SEARCH_FIELDS = {
    branches: ['name', 'branch_name', 'address', 'contact'],
    categories: ['type', 'brand', 'name', 'category_name'],
    units_of_measurement: ['symbol', 'unit_name', 'unitName', 'name'],
    suppliers: ['supplier_name', 'contact', 'type', 'supplier_address'],
    items: ['item_name', 'name', 'sku', 'item_code', 'product_code', 'category_type', 'category_brand'],
    stock_batches: ['sku', 'batchCode', 'batch_code', 'item_name'],
    inventory_units: ['unitCode', 'unit_code', 'barcode', 'sku', 'batchCode', 'batch_code', 'status'],
    stock_movements: ['sku', 'batchCode', 'batch_code', 'movementType', 'movement_type', 'referenceType', 'reference_type'],
    restock_transactions: ['invoiceNo', 'invoice_no', 'billNo', 'bill_no', 'supplier_name'],
    inventory_transfers: ['sku', 'batchCode', 'batch_code', 'item_name', 'status'],
    members: ['member_no', 'memberNo', 'full_name', 'member_name', 'name', 'contact'],
    sales: ['invoiceNo', 'invoice_no', 'memberName', 'member_name', 'cashierName', 'cashier_name', 'paymentMethod', 'payment_method', 'status'],
    users: ['email', 'username', 'full_name', 'name'],
    payment_methods: ['name', 'description', 'type'],
    login_history: ['email', 'username', 'deviceName', 'device_name', 'status'],
    offers: ['name', 'description', 'code'],
    disposed_items: ['sku', 'batchCode', 'batch_code', 'item_name'],
    tea_coop_members: ['name', 'full_name', 'member_no', 'memberNo']
};

const USER_SECRET_FIELDS = [
    'password',
    'newPassword',
    'confirmPassword',
    'passwordHash',
    'resetToken',
    'resetTokenHash',
    'tokenHash',
    'sessionToken',
    'apiKey',
    // Internal login-lockout bookkeeping (see authService.cjs) — not secrets
    // in the credential sense, but internal auth state that shouldn't reach
    // the client. publicUser() in utils/security.cjs strips these for the
    // login/register response path; this is the equivalent for the generic
    // catalog browsing path (GET /collections/users), which goes through
    // sanitizeRecord() below instead of publicUser().
    'failedLoginAttempts',
    'lockedUntil'
];

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

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseLimit(query = {}) {
    const raw = Number.parseInt(query.limit || query.pageSize || '100', 10);
    if (!Number.isFinite(raw) || raw <= 0) return 100;
    return Math.min(raw, 500);
}

function parseSkip(query = {}) {
    const explicitSkip = query.skip ?? query.offset;
    if (explicitSkip !== undefined) {
        const parsed = Number.parseInt(explicitSkip, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
    }
    const page = Number.parseInt(query.page || '1', 10);
    const limit = parseLimit(query);
    return Number.isFinite(page) && page > 1 ? (page - 1) * limit : 0;
}

function applySearchFilter(collectionName, filter, query = {}) {
    const searchTerm = query.q ?? query.search ?? query.searchTerm ?? query.term ?? '';
    const trimmed = String(searchTerm || '').trim();
    if (!trimmed) return filter;

    const fields = SEARCH_FIELDS[collectionName] || ['name', 'title', 'sku', 'code', 'type', 'status'];
    const regex = { $regex: escapeRegex(trimmed), $options: 'i' };
    const searchClause = {
        $or: fields.map((field) => ({ [field]: regex }))
    };

    if (filter.$and) {
        filter.$and.push(searchClause);
    } else if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, searchClause];
        delete filter.$or;
    } else {
        Object.assign(filter, searchClause);
    }

    return filter;
}

function applyDateRangeFilter(filter, query = {}) {
    const startRaw = query.startDate ?? query.start_date ?? query.from ?? '';
    const endRaw = query.endDate ?? query.end_date ?? query.to ?? '';
    if (!startRaw && !endRaw) return filter;

    const range = {};
    if (startRaw) {
        const start = new Date(startRaw);
        if (!Number.isNaN(start.getTime())) range.$gte = start;
    }
    if (endRaw) {
        const end = new Date(endRaw);
        if (!Number.isNaN(end.getTime())) range.$lte = end;
    }
    if (!range.$gte && !range.$lte) return filter;

    // Records were created via different service paths over time, some of
    // which only ever set createdAt (camelCase) and some which set both that
    // and the legacy created_at (snake_case) — never with different values —
    // so matching either field is the same defensive coalesce
    // OnlineModeService's own sales aggregations already rely on.
    const dateClause = {
        $or: [
            { createdAt: range },
            { created_at: range }
        ]
    };

    if (filter.$and) {
        filter.$and.push(dateClause);
    } else if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, dateClause];
        delete filter.$or;
    } else {
        Object.assign(filter, dateClause);
    }

    return filter;
}

// Used only by the stock:get-expiring IPC handler ("batches expiring within
// N days"), which previously ignored the days argument entirely and
// returned the full unfiltered stock list. Matches on expiryDate OR
// expiry_date, same dual-field-name reasoning as applyDateRangeFilter above.
function applyExpiryFilter(collectionName, filter, query = {}) {
    if (collectionName !== 'stock_batches') return filter;
    const daysRaw = query.days ?? query.expiringInDays;
    if (daysRaw === undefined || daysRaw === null || daysRaw === '') return filter;

    const days = Number(daysRaw);
    if (!Number.isFinite(days)) return filter;

    const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const range = { $lte: cutoff };
    const expiryClause = {
        $or: [
            { expiryDate: range },
            { expiry_date: range }
        ]
    };

    if (filter.$and) {
        filter.$and.push(expiryClause);
    } else if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, expiryClause];
        delete filter.$or;
    } else {
        Object.assign(filter, expiryClause);
    }

    return filter;
}

function sanitizeRecord(collectionName, record) {
    if (!record || typeof record !== 'object') return record;
    const sanitized = { ...record };

    if (collectionName === 'users') {
        for (const field of USER_SECRET_FIELDS) {
            delete sanitized[field];
        }
    }

    if (collectionName === 'sessions') {
        delete sanitized.tokenHash;
    }

    return sanitized;
}

function sanitizeRecords(collectionName, records) {
    return Array.isArray(records)
        ? records.map((record) => sanitizeRecord(collectionName, record))
        : sanitizeRecord(collectionName, records);
}

function getTransferBranchIds(record = {}) {
    return [
        record.branchId,
        record.branch_id,
        record.source_branch_id,
        record.sourceBranchId,
        record.fromBranchId,
        record.from_branch_id,
        record.target_branch_id,
        record.targetBranchId,
        record.toBranchId,
        record.to_branch_id,
        record.destination_branch_id,
        record.destinationBranchId
    ]
        .filter((value) => value !== undefined && value !== null && value !== '')
        .map((value) => String(value));
}

function assertBranchAccess(collectionName, auth, record) {
    if (!BRANCH_SCOPED_COLLECTIONS.has(collectionName) || !auth.branchId) return;

    if (collectionName === 'inventory_transfers') {
        const authBranchId = String(auth.branchId);
        if (!getTransferBranchIds(record).includes(authBranchId)) {
            const err = new Error('Record not found in the active branch');
            err.statusCode = 404;
            throw err;
        }
        return;
    }

    const recordBranchId = record?.branchId || record?.branch_id || null;
    if (recordBranchId && String(recordBranchId) !== String(auth.branchId)) {
        const err = new Error('Record not found in the active branch');
        err.statusCode = 404;
        throw err;
    }
}

function scopedQuery(collectionName, auth, query = {}) {
    const filter = {
        orgId: auth.orgId,
        deletedAt: null
    };
    const teaCoopPaymentMemberId = collectionName === 'tea_coop_payments'
        ? (query.memberId ?? query.member_id ?? null)
        : null;
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
        ['sourceBranchId', 'sourceBranchId'],
        ['source_branch_id', 'sourceBranchId'],
        ['targetBranchId', 'targetBranchId'],
        ['target_branch_id', 'targetBranchId'],
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
        if (collectionName === 'tea_coop_payments' && (sourceKey === 'memberId' || sourceKey === 'member_id')) {
            continue;
        }
        if (query[sourceKey] !== undefined && query[sourceKey] !== null && query[sourceKey] !== '') {
            filter[targetKey] = query[sourceKey];
        }
    }
    if (teaCoopPaymentMemberId !== undefined && teaCoopPaymentMemberId !== null && teaCoopPaymentMemberId !== '') {
        filter.$or = [
            { memberId: teaCoopPaymentMemberId },
            { member_id: teaCoopPaymentMemberId }
        ];
    }
    if (collectionName === 'inventory_transfers' && auth.branchId && !filter.branchId && !filter.sourceBranchId && !filter.targetBranchId) {
        const branchId = auth.branchId;
        filter.$or = [
            { branchId },
            { branch_id: branchId },
            { sourceBranchId: branchId },
            { source_branch_id: branchId },
            { fromBranchId: branchId },
            { from_branch_id: branchId },
            { targetBranchId: branchId },
            { target_branch_id: branchId },
            { toBranchId: branchId },
            { to_branch_id: branchId },
            { destinationBranchId: branchId },
            { destination_branch_id: branchId }
        ];
        return filter;
    }
    if (BRANCH_SCOPED_COLLECTIONS.has(collectionName) && !filter.branchId && auth.branchId) {
        filter.branchId = auth.branchId;
    }
    if (filter.branchId) {
        const branchId = filter.branchId;
        delete filter.branchId;
        filter.$or = [{ branchId }, { branch_id: branchId }];
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

    if (collectionName === 'items') {
        const trackingMode = normalizeTrackingMode(
            payload.tracking_mode
            ?? payload.trackingMode
            ?? existing?.tracking_mode
            ?? existing?.trackingMode
            ?? 'quantity'
        );
        payload.tracking_mode = trackingMode;
        payload.trackingMode = trackingMode;
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

    if (collectionName === 'inventory_transfers') {
        const sourceBranchId = payload.source_branch_id
            ?? payload.sourceBranchId
            ?? payload.fromBranchId
            ?? payload.from_branch_id
            ?? existing?.source_branch_id
            ?? existing?.sourceBranchId
            ?? existing?.fromBranchId
            ?? existing?.from_branch_id
            ?? null;
        const targetBranchId = payload.target_branch_id
            ?? payload.targetBranchId
            ?? payload.toBranchId
            ?? payload.to_branch_id
            ?? payload.destination_branch_id
            ?? payload.destinationBranchId
            ?? existing?.target_branch_id
            ?? existing?.targetBranchId
            ?? existing?.toBranchId
            ?? existing?.to_branch_id
            ?? existing?.destination_branch_id
            ?? existing?.destinationBranchId
            ?? null;

        if (sourceBranchId) {
            payload.source_branch_id = sourceBranchId;
            payload.sourceBranchId = sourceBranchId;
            payload.fromBranchId = sourceBranchId;
        }
        if (targetBranchId) {
            payload.target_branch_id = targetBranchId;
            payload.targetBranchId = targetBranchId;
            payload.toBranchId = targetBranchId;
        }
        payload.branchId = sourceBranchId || payload.branchId || payload.branch_id || existing?.branchId || existing?.branch_id || auth.branchId || null;
        payload.branch_id = payload.branchId;
        payload.status = String(payload.status ?? existing?.status ?? 'pending').toLowerCase();

        const rawUnitCodes = payload.unit_codes ?? payload.unitCodes ?? existing?.unit_codes ?? existing?.unitCodes ?? [];
        const unitCodes = Array.isArray(rawUnitCodes)
            ? rawUnitCodes
            : String(rawUnitCodes || '').split(',').map((value) => value.trim());
        payload.unit_codes = unitCodes.filter(Boolean);
        payload.unitCodes = payload.unit_codes;
    }

    return payload;
}

async function list(collectionName, auth, query = {}) {
    ensureCollection(collectionName);
    const db = getDb();
    const limit = parseLimit(query);
    const skip = parseSkip(query);
    const filter = applyExpiryFilter(collectionName, applyDateRangeFilter(applySearchFilter(collectionName, scopedQuery(collectionName, auth, query), query), query), query);
    const records = await db.collection(collectionName)
        .find(filter)
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();
    return sanitizeRecords(collectionName, records);
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
    assertBranchAccess(collectionName, auth, record);
    return sanitizeRecord(collectionName, record);
}

async function create(collectionName, auth, body) {
    ensureCollection(collectionName);
    if (SYSTEM_MANAGED_COLLECTIONS.has(collectionName)) {
        const err = new Error(`${collectionName} records are generated by inventory mutations and cannot be created directly`);
        err.statusCode = 405;
        throw err;
    }

    // Delegate restock transactions to dedicated service that also
    // creates/updates stock_batches for each added item.
    if (collectionName === 'restock_transactions') {
        return restockService.createRestock(auth, body);
    }

    if (collectionName === 'disposed_items') {
        return disposeService.createDisposedItem(auth, body);
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
    const documentBranchId = collectionName === 'inventory_transfers'
        ? (payload.branchId || payload.branch_id || auth.branchId || null)
        : (auth.branchId || payload.branchId || payload.branch_id || null);
    const document = {
        ...payload,
        orgId: auth.orgId,
        branchId: documentBranchId,
        branch_id: documentBranchId,
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
    return sanitizeRecord(collectionName, inserted);
}

async function update(collectionName, auth, id, body) {
    ensureCollection(collectionName);
    if (SYSTEM_MANAGED_COLLECTIONS.has(collectionName)) {
        const err = new Error(`${collectionName} records are generated by inventory mutations and cannot be updated directly`);
        err.statusCode = 405;
        throw err;
    }
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
    assertBranchAccess(collectionName, auth, existing);

    let effectiveBody = body;
    if (collectionName === 'users' && String(existing._id) === String(auth.userId) && !hasAnyRole(auth, MANAGER_ROLES)) {
        effectiveBody = {};
        for (const key of Object.keys(body || {})) {
            if (SELF_SERVICE_ALLOWED_USER_FIELDS.has(key)) effectiveBody[key] = body[key];
        }
    }

    const payload = normalizeCollectionBody(collectionName, auth, effectiveBody, existing);
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
    if (BRANCH_SCOPED_COLLECTIONS.has(collectionName) && collectionName !== 'inventory_transfers' && auth.branchId) {
        updateDoc.branchId = auth.branchId;
        updateDoc.branch_id = auth.branchId;
    }

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
    return sanitizeRecord(collectionName, updated);
}

async function softDelete(collectionName, auth, id) {
    ensureCollection(collectionName);
    if (SYSTEM_MANAGED_COLLECTIONS.has(collectionName)) {
        const err = new Error(`${collectionName} records are generated by inventory mutations and cannot be deleted directly`);
        err.statusCode = 405;
        throw err;
    }
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
    assertBranchAccess(collectionName, auth, existing);

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
