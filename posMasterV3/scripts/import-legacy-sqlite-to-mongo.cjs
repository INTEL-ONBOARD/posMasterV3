#!/usr/bin/env node

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { ObjectId } = require('mongodb');
const { config } = require('../src/online-server/config.cjs');
const { connectMongo, closeMongo } = require('../src/online-server/db/mongo.cjs');

const LEGACY_SOURCE = 'sqlite';
let CURRENT_ORG_ID = config.defaultOrgId;

function parseArgs(argv) {
    const options = {
        sqlitePath: process.env.LEGACY_SQLITE_PATH || path.resolve(process.cwd(), 'C:\\POS Master/posmaster.db'),
        orgId: process.env.IMPORT_ORG_ID || config.defaultOrgId,
        orgName: process.env.IMPORT_ORG_NAME || 'POSmaster'
    };

    for (let i = 0; i < argv.length; i += 1) {
        const arg = argv[i];
        if (arg === '--sqlite' && argv[i + 1]) {
            options.sqlitePath = argv[i + 1];
            i += 1;
        } else if (arg === '--org-id' && argv[i + 1]) {
            options.orgId = argv[i + 1];
            i += 1;
        } else if (arg === '--org-name' && argv[i + 1]) {
            options.orgName = argv[i + 1];
            i += 1;
        }
    }

    return options;
}

function assertFileExists(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Legacy SQLite database not found: ${filePath}`);
    }
}

function readSqliteRows(sqlitePath, tableName) {
    const sql = `SELECT * FROM "${tableName}"`;
    const output = execFileSync('sqlite3', ['-json', sqlitePath, sql], {
        encoding: 'utf8',
        maxBuffer: 100 * 1024 * 1024
    }).trim();
    if (!output) return [];
    return JSON.parse(output);
}

function toStringId(value) {
    if (value === null || value === undefined || value === '') return null;
    return String(value);
}

function parseNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === '') return fallback;
    const parsed = Number(value);
    return Number.isNaN(parsed) ? fallback : parsed;
}

function parseBoolean(value, fallback = false) {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const normalized = String(value).trim().toLowerCase();
    return ['1', 'true', 'yes', 'y', 'on'].includes(normalized);
}

function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function parseJson(value, fallback = null) {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'object') return value;
    try {
        return JSON.parse(value);
    } catch {
        return fallback;
    }
}

function normalizeText(value) {
    if (value === null || value === undefined) return null;
    return String(value);
}

function getMapValue(map, value) {
    if (value === null || value === undefined || value === '') return null;
    return map.get(String(value)) || null;
}

function addAliases(target, aliases) {
    for (const [key, value] of Object.entries(aliases)) {
        if (value !== undefined) target[key] = value;
    }
    return target;
}

function baseDoc(row, now = new Date()) {
    const createdAt = parseDate(row.created_at) || now;
    const updatedAt = parseDate(row.updated_at) || createdAt || now;
    return {
        orgId: CURRENT_ORG_ID,
        org_id: CURRENT_ORG_ID,
        cloud_id: row.cloud_id ?? null,
        cloudId: row.cloud_id ?? null,
        sync_status: row.sync_status ?? null,
        syncStatus: row.sync_status ?? null,
        created_at: row.created_at ?? createdAt.toISOString(),
        updated_at: row.updated_at ?? updatedAt.toISOString(),
        createdAt,
        updatedAt,
        deletedAt: null,
        version: 1
    };
}

async function upsertLegacyCollection(db, collectionName, legacyTable, rows, buildDoc, options = {}) {
    const existingRows = await db.collection(collectionName).find({
        legacySource: LEGACY_SOURCE,
        legacyTable
    }).project({ _id: 1, legacyId: 1 }).toArray();

    const existingMap = new Map(existingRows.map((row) => [String(row.legacyId), row._id]));
    const idMap = new Map();
    const ops = [];
    const importedAt = new Date();

    for (const row of rows) {
        const legacyId = row.id;
        const key = String(legacyId);
        const resolvedExistingId = options.resolveExistingId ? await options.resolveExistingId(row, db) : null;
        const _id = existingMap.get(key) || resolvedExistingId || new ObjectId();
        const doc = buildDoc(row, { _id, importedAt });
        doc._id = _id;
        doc.legacySource = LEGACY_SOURCE;
        doc.legacyTable = legacyTable;
        doc.legacyId = legacyId;
        doc.importedAt = importedAt;
        const filter = existingMap.has(key)
            ? { legacySource: LEGACY_SOURCE, legacyTable, legacyId }
            : { _id };
        ops.push({
            replaceOne: {
                filter,
                replacement: doc,
                upsert: true
            }
        });
        idMap.set(key, _id);
    }

    if (ops.length) {
        await db.collection(collectionName).bulkWrite(ops, { ordered: false });
    }

    return idMap;
}

function buildBranchDoc(row) {
    const doc = {
        ...baseDoc(row),
        name: row.name,
        address: row.address ?? null,
        contact: row.contact ?? null,
        is_active: parseBoolean(row.is_active, true),
        isActive: parseBoolean(row.is_active, true)
    };
    return doc;
}

function buildUserDoc(row, { branchMap }) {
    const branchObjectId = getMapValue(branchMap, row.branch_id);
    const roles = parseJson(row.roles, []);
    const doc = {
        ...baseDoc(row),
        username: row.username,
        email: String(row.email || '').toLowerCase(),
        passwordHash: row.password_hash,
        full_name: row.full_name ?? null,
        fullName: row.full_name ?? null,
        roles: Array.isArray(roles) ? roles : [],
        is_active: parseBoolean(row.is_active, true),
        isActive: parseBoolean(row.is_active, true),
        last_login_at: row.last_login_at ?? null,
        lastLoginAt: parseDate(row.last_login_at),
        branchId: toStringId(branchObjectId),
        branch_id: toStringId(branchObjectId),
        synced_at: row.synced_at ?? null,
        syncedAt: parseDate(row.synced_at)
    };
    return doc;
}

function buildCategoryDoc(row, { branchMap }) {
    const branchObjectId = getMapValue(branchMap, row.created_at_branch);
    return {
        ...baseDoc(row),
        brand: row.brand,
        type: row.type,
        created_by: row.created_by ?? null,
        updated_by: row.updated_by ?? null,
        branchId: toStringId(branchObjectId),
        branch_id: toStringId(branchObjectId),
        created_at_branch: toStringId(branchObjectId)
    };
}

function buildUomDoc(row, { branchMap }) {
    const branchObjectId = getMapValue(branchMap, row.created_at_branch);
    return {
        ...baseDoc(row),
        symbol: row.symbol,
        unit_name: row.unit_name,
        created_by: row.created_by ?? null,
        updated_by: row.updated_by ?? null,
        branchId: toStringId(branchObjectId),
        branch_id: toStringId(branchObjectId),
        created_at_branch: toStringId(branchObjectId)
    };
}

function buildSupplierDoc(row, { branchMap }) {
    const branchObjectId = getMapValue(branchMap, row.created_at_branch);
    return {
        ...baseDoc(row),
        supplier_name: row.supplier_name,
        contact: row.contact ?? null,
        type: row.type ?? null,
        supplier_address: row.supplier_address ?? null,
        status: parseBoolean(row.status, true),
        current_amount: parseNumber(row.current_amount, 0),
        previous_amount: parseNumber(row.previous_amount, 0),
        account_number: row.account_number ?? null,
        account_bank: row.account_bank ?? null,
        account_branch: row.account_branch ?? null,
        account_name: row.account_name ?? null,
        account_nickname: row.account_nickname ?? null,
        created_by: row.created_by ?? null,
        updated_by: row.updated_by ?? null,
        branchId: toStringId(branchObjectId),
        branch_id: toStringId(branchObjectId),
        created_at_branch: toStringId(branchObjectId)
    };
}

function buildMemberDoc(row, { branchMap }) {
    const branchObjectId = getMapValue(branchMap, row.branch_id);
    return {
        ...baseDoc(row),
        member_no: row.member_no,
        full_name: row.full_name,
        contact: row.contact ?? null,
        address: row.address ?? null,
        member_type: row.member_type ?? 'regular',
        total_income: parseNumber(row.total_income, 0),
        total_credits: parseNumber(row.total_credits, 0),
        is_active: parseBoolean(row.is_active, true),
        branchId: toStringId(branchObjectId),
        branch_id: toStringId(branchObjectId)
    };
}

function buildPaymentMethodDoc(row, { branchMap }) {
    const branchObjectId = getMapValue(branchMap, row.created_at_branch);
    return {
        ...baseDoc(row),
        name: row.name,
        description: row.description ?? null,
        type: row.type ?? 'cash',
        credit_months: parseNumber(row.credit_months, 0),
        interest_rate: parseNumber(row.interest_rate, 0),
        is_active: parseBoolean(row.is_active, true),
        is_member_only: parseBoolean(row.is_member_only, false),
        display_order: parseNumber(row.display_order, 0),
        icon: row.icon ?? null,
        color: row.color ?? null,
        created_by: row.created_by ?? null,
        updated_by: row.updated_by ?? null,
        branchId: toStringId(branchObjectId),
        branch_id: toStringId(branchObjectId),
        created_at_branch: toStringId(branchObjectId)
    };
}

function buildTeaCoopMemberDoc(row) {
    return {
        ...baseDoc(row),
        member_id: row.member_id,
        member_no: row.member_no ?? null,
        full_name: row.full_name,
        contact: row.contact ?? null,
        address: row.address ?? null,
        factory_id: row.factory_id ?? null,
        green_leaf_value: parseNumber(row.green_leaf_value, 0),
        loans: parseNumber(row.loans, 0),
        net_amount: parseNumber(row.net_amount, 0),
        is_active: parseBoolean(row.is_active, true),
        last_fetched_at: row.last_fetched_at ?? null,
        lastFetchedAt: parseDate(row.last_fetched_at),
        additions: parseNumber(row.additions, 0),
        deductions: parseNumber(row.deductions, 0)
    };
}

function buildItemDoc(row, { branchMap, categoryMap, uomMap }) {
    const branchObjectId = getMapValue(branchMap, row.branch_id);
    const categoryObjectId = getMapValue(categoryMap, row.category_id);
    const uomObjectId = getMapValue(uomMap, row.uom_id);
    return {
        ...baseDoc(row),
        sku: row.sku,
        item_name: row.item_name,
        item_image_url: row.item_image_url ?? null,
        maximum_capacity: parseNumber(row.maximum_capacity, 0),
        categoryId: toStringId(categoryObjectId),
        category_id: toStringId(categoryObjectId),
        uomId: toStringId(uomObjectId),
        uom_id: toStringId(uomObjectId),
        branchId: toStringId(branchObjectId),
        branch_id: toStringId(branchObjectId),
        availability: parseBoolean(row.availability, true),
        item_image_blob: row.item_image_blob ?? null,
        created_by: row.created_by ?? null,
        updated_by: row.updated_by ?? null,
        created_at_branch: toStringId(getMapValue(branchMap, row.created_at_branch)),
        item_code: row.item_code ?? null
    };
}

function buildStockDoc(row, { branchMap, itemMap, itemRowsByLegacyId }) {
    const branchObjectId = getMapValue(branchMap, row.branch_id);
    const itemObjectId = getMapValue(itemMap, row.item_id);
    const itemRow = itemRowsByLegacyId.get(String(row.item_id)) || null;
    return {
        ...baseDoc(row),
        itemId: toStringId(itemObjectId),
        item_id: row.item_id,
        item_name: itemRow?.item_name ?? null,
        sku: itemRow?.sku ?? null,
        branchId: toStringId(branchObjectId),
        branch_id: row.branch_id ?? null,
        batchCode: row.batch_code,
        batch_code: row.batch_code,
        quantity: parseNumber(row.quantity, 0),
        thresholdLimit: parseNumber(row.threshold_limit, 0),
        threshold_limit: parseNumber(row.threshold_limit, 0),
        stockPrice: parseNumber(row.stock_price, 0),
        stock_price: parseNumber(row.stock_price, 0),
        retailPrice: parseNumber(row.retail_price, 0),
        retail_price: parseNumber(row.retail_price, 0),
        discountPrice: parseNumber(row.discount_price, 0),
        discount_price: parseNumber(row.discount_price, 0),
        expiryDate: parseDate(row.expiry_date),
        expiry_date: row.expiry_date ?? null,
        availability: parseBoolean(row.availability, true)
    };
}

function buildSalesTransactionDoc(row, context) {
    const { branchMap, memberMap, userMap, memberRowsByLegacyId, userRowsByLegacyId } = context;
    const branchObjectId = getMapValue(branchMap, row.branch_id);
    const memberObjectId = getMapValue(memberMap, row.member_id);
    const cashierObjectId = getMapValue(userMap, row.cashier_id);
    const createdByObjectId = getMapValue(userMap, row.created_by);
    const memberRow = row.member_id !== null && row.member_id !== undefined
        ? memberRowsByLegacyId.get(String(row.member_id))
        : null;
    const cashierRow = row.cashier_id !== null && row.cashier_id !== undefined
        ? userRowsByLegacyId.get(String(row.cashier_id))
        : null;
    const createdByRow = row.created_by !== null && row.created_by !== undefined
        ? userRowsByLegacyId.get(String(row.created_by))
        : null;

    return {
        ...baseDoc(row),
        invoice_no: row.invoice_no,
        invoiceNo: row.invoice_no,
        memberId: toStringId(memberObjectId),
        member_id: row.member_id ?? null,
        member_name: memberRow?.full_name ?? null,
        cashierId: toStringId(cashierObjectId),
        cashier_id: row.cashier_id ?? null,
        cashier_name: cashierRow?.full_name || cashierRow?.username || null,
        payment_method: row.payment_method ?? 'cash',
        credit_duration: row.credit_duration ?? null,
        subtotal: parseNumber(row.subtotal, 0),
        discount: parseNumber(row.discount, 0),
        total_amount: parseNumber(row.total_amount, 0),
        totalAmount: parseNumber(row.total_amount, 0),
        cash_received: parseNumber(row.cash_received, 0),
        change_amount: parseNumber(row.change_amount, 0),
        status: row.status ?? 'completed',
        is_held: parseBoolean(row.is_held, false),
        isHeld: parseBoolean(row.is_held, false),
        branchId: toStringId(branchObjectId),
        branch_id: row.branch_id ?? null,
        createdBy: toStringId(createdByObjectId),
        created_by: row.created_by ?? null,
        updated_at: row.updated_at ?? row.created_at ?? null,
        updatedAt: parseDate(row.updated_at) || parseDate(row.created_at) || new Date(),
        cash_received_at: row.cash_received_at ?? null,
        memberName: memberRow?.full_name ?? null
    };
}

function buildSalesItemDoc(row, context) {
    const { saleMap, itemMap, stockMap, itemRowsByLegacyId } = context;
    const saleObjectId = getMapValue(saleMap, row.sale_id);
    const itemObjectId = getMapValue(itemMap, row.item_id);
    const stockObjectId = getMapValue(stockMap, row.stock_id);
    const itemRow = itemRowsByLegacyId.get(String(row.item_id)) || null;
    return {
        ...baseDoc(row),
        saleId: toStringId(saleObjectId),
        sale_id: row.sale_id,
        itemId: toStringId(itemObjectId),
        item_id: row.item_id,
        item_name: itemRow?.item_name ?? null,
        sku: itemRow?.sku ?? null,
        stockId: toStringId(stockObjectId),
        stock_id: row.stock_id,
        batchCode: row.batch_code,
        batch_code: row.batch_code,
        quantity: parseNumber(row.quantity, 0),
        unitPrice: parseNumber(row.unit_price, 0),
        unit_price: parseNumber(row.unit_price, 0),
        discount: parseNumber(row.discount, 0),
        totalPrice: parseNumber(row.total_price, 0),
        total_price: parseNumber(row.total_price, 0)
    };
}

function buildRestockTransactionDoc(row, context) {
    const { branchMap, supplierMap, userMap, supplierRowsByLegacyId, userRowsByLegacyId } = context;
    const branchObjectId = getMapValue(branchMap, row.branch_id);
    const supplierObjectId = getMapValue(supplierMap, row.supplier_id);
    const createdByObjectId = getMapValue(userMap, row.created_by);
    const supplierRow = row.supplier_id !== null && row.supplier_id !== undefined
        ? supplierRowsByLegacyId.get(String(row.supplier_id))
        : null;
    const preparedByRow = row.prepared_by !== null && row.prepared_by !== undefined
        ? userRowsByLegacyId.get(String(row.prepared_by))
        : null;
    const authorizedByRow = row.authorized_by !== null && row.authorized_by !== undefined
        ? userRowsByLegacyId.get(String(row.authorized_by))
        : null;
    return {
        ...baseDoc(row),
        invoice_no: row.invoice_no,
        invoiceNo: row.invoice_no,
        bill_no: row.bill_no ?? null,
        billNo: row.bill_no ?? null,
        supplierId: toStringId(supplierObjectId),
        supplier_id: row.supplier_id ?? null,
        supplier_name: supplierRow?.supplier_name ?? null,
        prepared_by: row.prepared_by ?? null,
        preparedBy: preparedByRow?.full_name || preparedByRow?.username || null,
        authorized_by: row.authorized_by ?? null,
        authorizedBy: authorizedByRow?.full_name || authorizedByRow?.username || null,
        payment_method: row.payment_method ?? null,
        discount: parseNumber(row.discount, 0),
        expenses: parseNumber(row.expenses, 0),
        total_amount: parseNumber(row.total_amount, 0),
        totalAmount: parseNumber(row.total_amount, 0),
        cash_amount: parseNumber(row.cash_amount, 0),
        change_amount: parseNumber(row.change_amount, 0),
        changeAmount: parseNumber(row.change_amount, 0),
        execution_level: row.execution_level ?? 'medium',
        status: row.status ?? 'completed',
        branchId: toStringId(branchObjectId),
        branch_id: row.branch_id ?? null,
        createdBy: toStringId(createdByObjectId),
        created_by: row.created_by ?? null
    };
}

function buildRestockItemDoc(row, context) {
    const { restockMap, itemMap, itemRowsByLegacyId } = context;
    const restockObjectId = getMapValue(restockMap, row.restock_id);
    const itemObjectId = getMapValue(itemMap, row.item_id);
    const itemRow = itemRowsByLegacyId.get(String(row.item_id)) || null;
    return {
        ...baseDoc(row),
        restockId: toStringId(restockObjectId),
        restock_id: row.restock_id,
        itemId: toStringId(itemObjectId),
        item_id: row.item_id,
        item_name: itemRow?.item_name ?? null,
        sku: itemRow?.sku ?? null,
        batchCode: row.batch_code,
        batch_code: row.batch_code,
        quantity: parseNumber(row.quantity, 0),
        stockPrice: parseNumber(row.stock_price, 0),
        stock_price: parseNumber(row.stock_price, 0),
        retailPrice: parseNumber(row.retail_price, 0),
        retail_price: parseNumber(row.retail_price, 0),
        expiryDate: parseDate(row.expiry_date),
        expiry_date: row.expiry_date ?? null
    };
}

function buildReturnItemDoc(row, context) {
    const { restockMap, itemMap, itemRowsByLegacyId } = context;
    const restockObjectId = getMapValue(restockMap, row.restock_id);
    const itemObjectId = getMapValue(itemMap, row.item_id);
    const itemRow = itemRowsByLegacyId.get(String(row.item_id)) || null;
    return {
        ...baseDoc(row),
        restockId: toStringId(restockObjectId),
        restock_id: row.restock_id,
        itemId: toStringId(itemObjectId),
        item_id: row.item_id,
        item_name: itemRow?.item_name ?? null,
        sku: itemRow?.sku ?? null,
        batchCode: row.batch_code,
        batch_code: row.batch_code,
        quantity: parseNumber(row.quantity, 0),
        description: row.description ?? null
    };
}

function buildReturnedItemDoc(row, context) {
    const { saleMap, itemMap, stockMap, itemRowsByLegacyId } = context;
    const saleObjectId = getMapValue(saleMap, row.sale_id);
    const itemObjectId = getMapValue(itemMap, row.item_id);
    const stockObjectId = getMapValue(stockMap, row.stock_id);
    const itemRow = itemRowsByLegacyId.get(String(row.item_id)) || null;
    return {
        ...baseDoc(row),
        saleId: toStringId(saleObjectId),
        sale_id: row.sale_id,
        itemId: toStringId(itemObjectId),
        item_id: row.item_id,
        item_name: itemRow?.item_name ?? null,
        sku: itemRow?.sku ?? null,
        stockId: toStringId(stockObjectId),
        stock_id: row.stock_id,
        batchCode: row.batch_code,
        batch_code: row.batch_code,
        quantity: parseNumber(row.quantity, 0),
        unitPrice: parseNumber(row.unit_price, 0),
        unit_price: parseNumber(row.unit_price, 0),
        reason: row.reason ?? null,
        returnedBy: row.returned_by ?? null,
        returned_at: row.returned_at ?? null,
        returnedAt: parseDate(row.returned_at)
    };
}

function buildDisposedItemDoc(row, context) {
    const { itemMap, stockMap, itemRowsByLegacyId } = context;
    const itemObjectId = getMapValue(itemMap, row.item_id);
    const stockObjectId = getMapValue(stockMap, row.stock_id);
    const itemRow = itemRowsByLegacyId.get(String(row.item_id)) || null;
    return {
        ...baseDoc(row),
        itemId: toStringId(itemObjectId),
        item_id: row.item_id,
        item_name: itemRow?.item_name ?? null,
        sku: itemRow?.sku ?? null,
        stockId: toStringId(stockObjectId),
        stock_id: row.stock_id,
        batchCode: row.batch_code,
        batch_code: row.batch_code,
        quantity: parseNumber(row.quantity, 0),
        reason: row.reason ?? null,
        disposed_by: row.disposed_by ?? null,
        disposedAt: parseDate(row.disposed_at) || parseDate(row.created_at) || null,
        disposed_at: row.disposed_at ?? null
    };
}

function buildUserSettingsDoc(row, { userMap }) {
    const userObjectId = getMapValue(userMap, row.user_id);
    return {
        ...baseDoc(row),
        userId: toStringId(userObjectId),
        user_id: row.user_id,
        profile_image: row.profile_image ?? null,
        permissions: parseJson(row.permissions, {}),
        theme: row.theme ?? 'light',
        language: row.language ?? 'en',
        notifications_enabled: parseBoolean(row.notifications_enabled, true),
        notificationsEnabled: parseBoolean(row.notifications_enabled, true)
    };
}

function buildAppSettingsDoc(row) {
    const typedValue = (() => {
        switch (String(row.setting_type || 'string').toLowerCase()) {
            case 'boolean':
                return parseBoolean(row.setting_value, false);
            case 'number':
                return parseNumber(row.setting_value, 0);
            case 'json':
                return parseJson(row.setting_value, row.setting_value);
            default:
                return row.setting_value;
        }
    })();

    return {
        id: row.id,
        key: row.setting_key,
        setting_key: row.setting_key,
        value: typedValue,
        setting_value: row.setting_value,
        type: row.setting_type ?? 'string',
        setting_type: row.setting_type ?? 'string',
        description: row.description ?? null,
        ...baseDoc(row)
    };
}

function buildLoginHistoryDoc(row, context) {
    const { userMap, branchMap, userRowsByLegacyId } = context;
    const userObjectId = getMapValue(userMap, row.user_id);
    const branchObjectId = getMapValue(branchMap, row.branch_id);
    const userRow = userRowsByLegacyId.get(String(row.user_id)) || null;
    return {
        ...baseDoc(row),
        userId: toStringId(userObjectId),
        user_id: row.user_id,
        session_id: row.session_id ?? null,
        username: row.username,
        full_name: row.full_name ?? userRow?.full_name ?? null,
        login_at: row.login_at,
        loginAt: parseDate(row.login_at),
        logout_at: row.logout_at ?? null,
        logoutAt: parseDate(row.logout_at),
        duration_seconds: row.duration_seconds ?? null,
        logout_reason: row.logout_reason ?? null,
        device_info: row.device_info ?? null,
        ip_address: row.ip_address ?? null,
        status: row.status ?? 'active',
        branchId: toStringId(branchObjectId),
        branch_id: row.branch_id ?? null,
        branch_name: row.branch_name ?? null
    };
}

function buildTeaCoopPaymentDoc(row, { memberMap }) {
    const memberObjectId = getMapValue(memberMap, row.member_id);
    return {
        ...baseDoc(row),
        memberId: toStringId(memberObjectId),
        member_id: row.member_id,
        year: parseNumber(row.year, 0),
        month: parseNumber(row.month, 0),
        green_leaf_value: parseNumber(row.green_leaf_value, 0),
        loans: parseNumber(row.loans, 0),
        net_amount: parseNumber(row.net_amount, 0),
        payment_date: row.payment_date ?? null,
        paymentDate: parseDate(row.payment_date),
        factory_id: row.factory_id ?? null,
        last_fetched_at: row.last_fetched_at ?? null,
        lastFetchedAt: parseDate(row.last_fetched_at),
        additions: parseNumber(row.additions, 0),
        deductions: parseNumber(row.deductions, 0)
    };
}

async function replaceOrganization(db, orgId, orgName) {
    const now = new Date();
    await db.collection('organizations').updateOne(
        { _id: orgId },
        {
            $setOnInsert: {
                _id: orgId,
                createdAt: now,
                name: orgName
            },
            $set: {
                updatedAt: now
            }
        },
        { upsert: true }
    );
}

function groupBy(rows, key) {
    const grouped = new Map();
    for (const row of rows) {
        const bucketKey = String(row[key]);
        if (!grouped.has(bucketKey)) grouped.set(bucketKey, []);
        grouped.get(bucketKey).push(row);
    }
    return grouped;
}

async function attachEmbeddedItems(db, collectionName, legacyTable, parentMap, rowsByParentKey, buildItem, parentIdKey, embeddedKey) {
    const ops = [];
    const importedAt = new Date();
    for (const [legacyParentId, rows] of rowsByParentKey.entries()) {
        const parentObjectId = parentMap.get(String(legacyParentId));
        if (!parentObjectId) continue;
        const embeddedItems = rows.map((row) => buildItem(row));
        ops.push({
            updateOne: {
                filter: { legacySource: LEGACY_SOURCE, legacyTable, legacyId: Number.isNaN(Number(legacyParentId)) ? legacyParentId : Number(legacyParentId) },
                update: {
                    $set: {
                        [embeddedKey]: embeddedItems,
                        updatedAt: importedAt,
                        updated_at: importedAt.toISOString()
                    }
                }
            }
        });
    }
    if (ops.length) {
        await db.collection(collectionName).bulkWrite(ops, { ordered: false });
    }
}

async function main() {
    const { sqlitePath, orgId, orgName } = parseArgs(process.argv.slice(2));
    assertFileExists(sqlitePath);
    CURRENT_ORG_ID = orgId;

    const db = await connectMongo();
    const existingUsersByLogin = new Map();
    const existingUsers = await db.collection('users').find({ orgId }).project({ _id: 1, username: 1, email: 1, legacySource: 1 }).toArray();
    for (const existing of existingUsers) {
        if (existing.username) {
            existingUsersByLogin.set(`username:${String(existing.username).toLowerCase()}`, existing._id);
        }
        if (existing.email) {
            existingUsersByLogin.set(`email:${String(existing.email).toLowerCase()}`, existing._id);
        }
    }
    const tables = {
        branches: readSqliteRows(sqlitePath, 'branches'),
        users: readSqliteRows(sqlitePath, 'users'),
        categories: readSqliteRows(sqlitePath, 'categories'),
        unitsOfMeasurement: readSqliteRows(sqlitePath, 'units_of_measurement'),
        suppliers: readSqliteRows(sqlitePath, 'suppliers'),
        members: readSqliteRows(sqlitePath, 'members'),
        paymentMethods: readSqliteRows(sqlitePath, 'payment_methods'),
        teaCoopMembers: readSqliteRows(sqlitePath, 'tea_coop_members'),
        items: readSqliteRows(sqlitePath, 'items'),
        stock: readSqliteRows(sqlitePath, 'stock'),
        salesTransactions: readSqliteRows(sqlitePath, 'sales_transactions'),
        salesItems: readSqliteRows(sqlitePath, 'sales_items'),
        restockTransactions: readSqliteRows(sqlitePath, 'restock_transactions'),
        restockItems: readSqliteRows(sqlitePath, 'restock_items'),
        returnItems: readSqliteRows(sqlitePath, 'return_items'),
        returnedItems: readSqliteRows(sqlitePath, 'returned_items'),
        disposedItems: readSqliteRows(sqlitePath, 'disposed_items'),
        userSettings: readSqliteRows(sqlitePath, 'user_settings'),
        appSettings: readSqliteRows(sqlitePath, 'app_settings'),
        loginHistory: readSqliteRows(sqlitePath, 'login_history'),
        teaCoopPayments: readSqliteRows(sqlitePath, 'tea_coop_payments')
    };

    const itemRowsByLegacyId = new Map(tables.items.map((row) => [String(row.id), row]));
    const userRowsByLegacyId = new Map(tables.users.map((row) => [String(row.id), row]));
    const supplierRowsByLegacyId = new Map(tables.suppliers.map((row) => [String(row.id), row]));
    const memberRowsByLegacyId = new Map(tables.members.map((row) => [String(row.id), row]));

    const context = {
        branchMap: new Map(),
        userMap: new Map(),
        categoryMap: new Map(),
        uomMap: new Map(),
        supplierMap: new Map(),
        memberMap: new Map(),
        paymentMethodMap: new Map(),
        teaCoopMemberMap: new Map(),
        itemMap: new Map(),
        stockMap: new Map(),
        saleMap: new Map(),
        restockMap: new Map(),
        userRowsByLegacyId,
        supplierRowsByLegacyId,
        memberRowsByLegacyId,
        itemRowsByLegacyId
    };

    console.log(`[ImportLegacy] SQLite DB: ${sqlitePath}`);
    console.log(`[ImportLegacy] Mongo org: ${orgId} (${orgName})`);

    await replaceOrganization(db, orgId, orgName);

    context.branchMap = await upsertLegacyCollection(db, 'branches', 'branches', tables.branches, (row) => buildBranchDoc(row));
    context.userMap = await upsertLegacyCollection(db, 'users', 'users', tables.users, (row, { _id, importedAt }) => {
        const doc = buildUserDoc(row, { branchMap: context.branchMap });
        doc.importedAt = importedAt;
        return doc;
    }, {
        resolveExistingId: async (row) => {
            const usernameKey = `username:${String(row.username || '').toLowerCase()}`;
            const emailKey = `email:${String(row.email || '').toLowerCase()}`;
            return existingUsersByLogin.get(usernameKey) || existingUsersByLogin.get(emailKey) || null;
        }
    });
    context.categoryMap = await upsertLegacyCollection(db, 'categories', 'categories', tables.categories, (row) => buildCategoryDoc(row, { branchMap: context.branchMap }));
    context.uomMap = await upsertLegacyCollection(db, 'units_of_measurement', 'units_of_measurement', tables.unitsOfMeasurement, (row) => buildUomDoc(row, { branchMap: context.branchMap }));
    context.supplierMap = await upsertLegacyCollection(db, 'suppliers', 'suppliers', tables.suppliers, (row) => buildSupplierDoc(row, { branchMap: context.branchMap }));
    context.memberMap = await upsertLegacyCollection(db, 'members', 'members', tables.members, (row) => buildMemberDoc(row, { branchMap: context.branchMap }));
    context.paymentMethodMap = await upsertLegacyCollection(db, 'payment_methods', 'payment_methods', tables.paymentMethods, (row) => buildPaymentMethodDoc(row, { branchMap: context.branchMap }));
    context.teaCoopMemberMap = await upsertLegacyCollection(db, 'tea_coop_members', 'tea_coop_members', tables.teaCoopMembers, (row) => buildTeaCoopMemberDoc(row));
    context.itemMap = await upsertLegacyCollection(db, 'items', 'items', tables.items, (row) => buildItemDoc(row, {
        branchMap: context.branchMap,
        categoryMap: context.categoryMap,
        uomMap: context.uomMap
    }));
    context.stockMap = await upsertLegacyCollection(db, 'stock_batches', 'stock', tables.stock, (row) => buildStockDoc(row, {
        branchMap: context.branchMap,
        itemMap: context.itemMap,
        itemRowsByLegacyId
    }));
    context.restockMap = await upsertLegacyCollection(db, 'restock_transactions', 'restock_transactions', tables.restockTransactions, (row) => buildRestockTransactionDoc(row, {
        branchMap: context.branchMap,
        supplierMap: context.supplierMap,
        userMap: context.userMap,
        supplierRowsByLegacyId,
        userRowsByLegacyId
    }));
    context.saleMap = await upsertLegacyCollection(db, 'sales', 'sales_transactions', tables.salesTransactions, (row) => buildSalesTransactionDoc(row, {
        branchMap: context.branchMap,
        memberMap: context.memberMap,
        userMap: context.userMap,
        memberRowsByLegacyId,
        userRowsByLegacyId
    }));

    await upsertLegacyCollection(db, 'sales_items', 'sales_items', tables.salesItems, (row) => buildSalesItemDoc(row, {
        saleMap: context.saleMap,
        itemMap: context.itemMap,
        stockMap: context.stockMap,
        itemRowsByLegacyId
    }));
    await upsertLegacyCollection(db, 'restock_items', 'restock_items', tables.restockItems, (row) => buildRestockItemDoc(row, {
        restockMap: context.restockMap,
        itemMap: context.itemMap,
        itemRowsByLegacyId
    }));
    await upsertLegacyCollection(db, 'return_items', 'return_items', tables.returnItems, (row) => buildReturnItemDoc(row, {
        restockMap: context.restockMap,
        itemMap: context.itemMap,
        itemRowsByLegacyId
    }));
    await upsertLegacyCollection(db, 'returned_items', 'returned_items', tables.returnedItems, (row) => buildReturnedItemDoc(row, {
        saleMap: context.saleMap,
        itemMap: context.itemMap,
        stockMap: context.stockMap,
        itemRowsByLegacyId
    }));
    await upsertLegacyCollection(db, 'disposed_items', 'disposed_items', tables.disposedItems, (row) => buildDisposedItemDoc(row, {
        itemMap: context.itemMap,
        stockMap: context.stockMap,
        itemRowsByLegacyId
    }));
    await upsertLegacyCollection(db, 'user_settings', 'user_settings', tables.userSettings, (row) => buildUserSettingsDoc(row, {
        userMap: context.userMap
    }));
    await upsertLegacyCollection(db, 'app_settings', 'app_settings', tables.appSettings, (row) => buildAppSettingsDoc(row));
    await upsertLegacyCollection(db, 'login_history', 'login_history', tables.loginHistory, (row) => buildLoginHistoryDoc(row, {
        userMap: context.userMap,
        branchMap: context.branchMap,
        userRowsByLegacyId
    }));
    await upsertLegacyCollection(db, 'tea_coop_payments', 'tea_coop_payments', tables.teaCoopPayments, (row) => buildTeaCoopPaymentDoc(row, {
        memberMap: context.teaCoopMemberMap
    }));

    const salesItemsBySale = groupBy(tables.salesItems, 'sale_id');
    await attachEmbeddedItems(
        db,
        'sales',
        'sales_transactions',
        context.saleMap,
        salesItemsBySale,
        (row) => ({
            id: row.id,
            sale_id: row.sale_id,
            saleId: toStringId(context.saleMap.get(String(row.sale_id))),
            item_id: row.item_id,
            itemId: toStringId(context.itemMap.get(String(row.item_id))),
            item_name: itemRowsByLegacyId.get(String(row.item_id))?.item_name ?? null,
            sku: itemRowsByLegacyId.get(String(row.item_id))?.sku ?? null,
            stock_id: row.stock_id,
            stockId: toStringId(context.stockMap.get(String(row.stock_id))),
            batch_code: row.batch_code,
            batchCode: row.batch_code,
            quantity: parseNumber(row.quantity, 0),
            unit_price: parseNumber(row.unit_price, 0),
            unitPrice: parseNumber(row.unit_price, 0),
            discount: parseNumber(row.discount, 0),
            total_price: parseNumber(row.total_price, 0),
            totalPrice: parseNumber(row.total_price, 0)
        }),
        'sale_id',
        'items'
    );

    const returnedItemsBySale = groupBy(tables.returnedItems, 'sale_id');
    await attachEmbeddedItems(
        db,
        'sales',
        'sales_transactions',
        context.saleMap,
        returnedItemsBySale,
        (row) => ({
            id: row.id,
            sale_id: row.sale_id,
            saleId: toStringId(context.saleMap.get(String(row.sale_id))),
            item_id: row.item_id,
            itemId: toStringId(context.itemMap.get(String(row.item_id))),
            item_name: itemRowsByLegacyId.get(String(row.item_id))?.item_name ?? null,
            sku: itemRowsByLegacyId.get(String(row.item_id))?.sku ?? null,
            stock_id: row.stock_id,
            stockId: toStringId(context.stockMap.get(String(row.stock_id))),
            batch_code: row.batch_code,
            batchCode: row.batch_code,
            quantity: parseNumber(row.quantity, 0),
            unit_price: parseNumber(row.unit_price, 0),
            unitPrice: parseNumber(row.unit_price, 0),
            reason: row.reason ?? null,
            returned_by: row.returned_by ?? null,
            returned_at: row.returned_at ?? null
        }),
        'sale_id',
        'returned_items'
    );

    const restockItemsByRestock = groupBy(tables.restockItems, 'restock_id');
    await attachEmbeddedItems(
        db,
        'restock_transactions',
        'restock_transactions',
        context.restockMap,
        restockItemsByRestock,
        (row) => ({
            id: row.id,
            restock_id: row.restock_id,
            restockId: toStringId(context.restockMap.get(String(row.restock_id))),
            item_id: row.item_id,
            itemId: toStringId(context.itemMap.get(String(row.item_id))),
            item_name: itemRowsByLegacyId.get(String(row.item_id))?.item_name ?? null,
            sku: itemRowsByLegacyId.get(String(row.item_id))?.sku ?? null,
            batch_code: row.batch_code,
            batchCode: row.batch_code,
            quantity: parseNumber(row.quantity, 0),
            stock_price: parseNumber(row.stock_price, 0),
            stockPrice: parseNumber(row.stock_price, 0),
            retail_price: parseNumber(row.retail_price, 0),
            retailPrice: parseNumber(row.retail_price, 0),
            expiry_date: row.expiry_date ?? null,
            expiryDate: parseDate(row.expiry_date)
        }),
        'restock_id',
        'added_items'
    );

    const returnItemsByRestock = groupBy(tables.returnItems, 'restock_id');
    await attachEmbeddedItems(
        db,
        'restock_transactions',
        'restock_transactions',
        context.restockMap,
        returnItemsByRestock,
        (row) => ({
            id: row.id,
            restock_id: row.restock_id,
            restockId: toStringId(context.restockMap.get(String(row.restock_id))),
            item_id: row.item_id,
            itemId: toStringId(context.itemMap.get(String(row.item_id))),
            item_name: itemRowsByLegacyId.get(String(row.item_id))?.item_name ?? null,
            sku: itemRowsByLegacyId.get(String(row.item_id))?.sku ?? null,
            batch_code: row.batch_code,
            batchCode: row.batch_code,
            quantity: parseNumber(row.quantity, 0),
            description: row.description ?? null
        }),
        'restock_id',
        'return_items'
    );

    const summary = {
        branches: tables.branches.length,
        users: tables.users.length,
        categories: tables.categories.length,
        units_of_measurement: tables.unitsOfMeasurement.length,
        suppliers: tables.suppliers.length,
        members: tables.members.length,
        payment_methods: tables.paymentMethods.length,
        tea_coop_members: tables.teaCoopMembers.length,
        items: tables.items.length,
        stock_batches: tables.stock.length,
        sales: tables.salesTransactions.length,
        sales_items: tables.salesItems.length,
        restock_transactions: tables.restockTransactions.length,
        restock_items: tables.restockItems.length,
        login_history: tables.loginHistory.length,
        user_settings: tables.userSettings.length,
        app_settings: tables.appSettings.length,
        tea_coop_payments: tables.teaCoopPayments.length
    };

    console.log(JSON.stringify({
        status: 'success',
        orgId,
        sqlitePath,
        imported: summary
    }, null, 2));
}

main()
    .catch((error) => {
        console.error('[ImportLegacy] Failed:', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await closeMongo();
    });
