const { ObjectId } = require('mongodb');

const TRACKING_MODES = new Set(['quantity', 'batch', 'unit']);

function normalizeTrackingMode(value) {
    const normalized = String(value || 'quantity').trim().toLowerCase();
    return TRACKING_MODES.has(normalized) ? normalized : 'quantity';
}

function isUnitTracked(item = {}) {
    return normalizeTrackingMode(item.trackingMode || item.tracking_mode) === 'unit';
}

function toObjectId(id) {
    return ObjectId.isValid(id) ? new ObjectId(id) : null;
}

function stringId(id) {
    if (id == null) return null;
    return String(id);
}

function assertWholeUnits(quantity, label = 'Quantity') {
    const numeric = Number(quantity);
    if (!Number.isFinite(numeric) || numeric <= 0 || !Number.isInteger(numeric)) {
        const err = new Error(`${label} must be a positive whole number for unit-tracked items`);
        err.statusCode = 400;
        throw err;
    }
    return numeric;
}

function buildItemLookup(auth, { itemId, sku } = {}) {
    const clauses = [];
    const objectId = toObjectId(itemId);
    if (objectId) clauses.push({ _id: objectId });
    if (itemId) clauses.push({ id: itemId }, { itemId }, { item_id: itemId });
    if (sku) clauses.push({ sku });

    return {
        orgId: auth.orgId,
        deletedAt: null,
        ...(clauses.length ? { $or: clauses } : {})
    };
}

async function findItemForStock(db, auth, stockOrLine = {}, session = null) {
    const itemId = stockOrLine.itemId || stockOrLine.item_id || stockOrLine.item?.id || null;
    const sku = stockOrLine.sku || stockOrLine.item?.sku || null;
    const query = buildItemLookup(auth, { itemId, sku });
    if (!query.$or) return null;
    return db.collection('items').findOne(query, session ? { session } : {});
}

async function nextUnitCodes(db, auth, sku, count, session = null) {
    const prefix = String(sku || 'ITEM')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 16) || 'ITEM';
    const now = new Date();
    const counter = await db.collection('inventory_counters').findOneAndUpdate(
        {
            orgId: auth.orgId,
            type: 'inventory_unit',
            sku: prefix
        },
        {
            $inc: { sequence: count },
            $setOnInsert: {
                orgId: auth.orgId,
                type: 'inventory_unit',
                sku: prefix,
                createdAt: now
            },
            $set: { updatedAt: now }
        },
        { upsert: true, returnDocument: 'after', session }
    );
    const doc = counter.value || counter;
    const end = Number(doc.sequence || 0);
    const start = end - count + 1;
    return Array.from({ length: count }, (_, index) => {
        const sequence = start + index;
        return {
            sequence,
            unitCode: `${prefix}-${String(sequence).padStart(6, '0')}`
        };
    });
}

async function writeStockMovement(db, auth, movement = {}, session = null) {
    const now = movement.createdAt || new Date();
    const branchId = movement.branchId || movement.branch_id || null;
    const doc = {
        ...movement,
        orgId: auth.orgId,
        branchId,
        branch_id: branchId,
        quantity: Number(movement.quantity || 0),
        createdAt: now,
        created_at: now,
        createdBy: movement.createdBy || auth.userId,
        created_by: movement.created_by || movement.createdBy || auth.userId,
        version: 1,
        deletedAt: null
    };
    await db.collection('stock_movements').insertOne(doc, session ? { session } : {});
    return doc;
}

async function createUnitsForRestock(db, auth, { item, stockBatch, restock, restockItem, branchId, now }, session = null) {
    if (!isUnitTracked(item)) return [];

    const quantity = assertWholeUnits(restockItem.quantity, `Restock quantity for SKU ${restockItem.sku}`);
    const codes = await nextUnitCodes(db, auth, restockItem.sku, quantity, session);
    const itemId = stringId(item._id || item.id || stockBatch.itemId || stockBatch.item_id);
    const stockBatchId = stringId(stockBatch._id || stockBatch.id);
    const restockId = stringId(restock._id || restock.id);

    const docs = codes.map(({ sequence, unitCode }) => ({
        orgId: auth.orgId,
        branchId,
        branch_id: branchId,
        itemId,
        item_id: itemId,
        stockBatchId,
        stock_batch_id: stockBatchId,
        restockId,
        restock_id: restockId,
        sku: restockItem.sku,
        batchCode: restockItem.batchCode,
        batch_code: restockItem.batchCode,
        unitCode,
        unit_code: unitCode,
        barcode: unitCode,
        unitSequence: sequence,
        unit_sequence: sequence,
        status: 'available',
        currentLocationType: 'branch',
        current_location_type: 'branch',
        currentLocationId: branchId,
        current_location_id: branchId,
        createdAt: now,
        created_at: now,
        updatedAt: now,
        updated_at: now,
        createdBy: auth.userId,
        updatedBy: auth.userId,
        version: 1,
        deletedAt: null
    }));

    if (docs.length) {
        await db.collection('inventory_units').insertMany(docs, { session });
    }

    return docs;
}

function unitBatchFilter(auth, stockBatch, branchId, status = 'available') {
    const stockBatchId = stringId(stockBatch._id || stockBatch.id || stockBatch.stockBatchId || stockBatch.stock_batch_id);
    const itemId = stringId(stockBatch.itemId || stockBatch.item_id);
    const batchCode = stockBatch.batchCode || stockBatch.batch_code || null;
    const sku = stockBatch.sku || null;
    const identity = [];
    if (stockBatchId) identity.push({ stockBatchId }, { stock_batch_id: stockBatchId });
    if (itemId && batchCode) {
        identity.push({ itemId, batchCode }, { item_id: itemId, batch_code: batchCode });
    }
    if (sku && batchCode) {
        identity.push({ sku, batchCode }, { sku, batch_code: batchCode });
    }

    return {
        orgId: auth.orgId,
        deletedAt: null,
        status,
        $and: [
            { $or: [{ branchId }, { branch_id: branchId }] },
            { $or: identity }
        ]
    };
}

async function takeAvailableUnits(db, auth, { stockBatch, branchId, quantity, now }, session = null) {
    const count = assertWholeUnits(quantity, `Unit-tracked quantity for SKU ${stockBatch.sku || stockBatch.itemId || 'item'}`);
    const units = await db.collection('inventory_units')
        .find(unitBatchFilter(auth, stockBatch, branchId, 'available'), session ? { session } : {})
        .sort({ createdAt: 1, unitSequence: 1 })
        .limit(count)
        .toArray();

    if (units.length !== count) {
        const err = new Error(`Not enough tracked units for SKU ${stockBatch.sku || 'unknown'} / batch ${stockBatch.batchCode || stockBatch.batch_code || 'unknown'}`);
        err.statusCode = 409;
        throw err;
    }

    return units;
}

async function markUnitsSold(db, auth, { stockBatch, branchId, quantity, saleId, invoiceNo, now }, session = null) {
    const item = await findItemForStock(db, auth, stockBatch, session);
    if (!isUnitTracked(item)) return [];

    const units = await takeAvailableUnits(db, auth, { stockBatch, branchId, quantity, now }, session);
    const ids = units.map((unit) => unit._id);
    await db.collection('inventory_units').updateMany(
        { _id: { $in: ids }, orgId: auth.orgId },
        {
            $set: {
                status: 'sold',
                soldSaleId: stringId(saleId),
                sold_sale_id: stringId(saleId),
                soldInvoiceNo: invoiceNo || null,
                sold_invoice_no: invoiceNo || null,
                soldAt: now,
                sold_at: now,
                updatedAt: now,
                updated_at: now,
                updatedBy: auth.userId
            },
            $inc: { version: 1 }
        },
        { session }
    );
    return units;
}

async function restoreSoldUnits(db, auth, { stockBatch, branchId, quantity, saleId, now }, session = null) {
    const item = await findItemForStock(db, auth, stockBatch, session);
    if (!isUnitTracked(item)) return [];

    const count = assertWholeUnits(quantity, `Restore quantity for SKU ${stockBatch.sku || 'item'}`);
    const stockBatchId = stringId(stockBatch._id || stockBatch.id || stockBatch.stockBatchId || stockBatch.stock_batch_id);
    const filter = {
        orgId: auth.orgId,
        deletedAt: null,
        status: 'sold',
        $and: [
            { $or: [{ branchId }, { branch_id: branchId }] },
            { $or: [{ stockBatchId }, { stock_batch_id: stockBatchId }] }
        ]
    };
    if (saleId) {
        filter.$and.push({ $or: [{ soldSaleId: stringId(saleId) }, { sold_sale_id: stringId(saleId) }] });
    }

    const units = await db.collection('inventory_units')
        .find(filter, session ? { session } : {})
        .sort({ soldAt: -1, updatedAt: -1 })
        .limit(count)
        .toArray();

    if (units.length !== count) {
        const err = new Error(`Could not restore ${count} tracked units for SKU ${stockBatch.sku || 'unknown'}`);
        err.statusCode = 409;
        throw err;
    }

    await db.collection('inventory_units').updateMany(
        { _id: { $in: units.map((unit) => unit._id) }, orgId: auth.orgId },
        {
            $set: {
                status: 'available',
                updatedAt: now,
                updated_at: now,
                updatedBy: auth.userId
            },
            $unset: {
                soldSaleId: '',
                sold_sale_id: '',
                soldInvoiceNo: '',
                sold_invoice_no: '',
                soldAt: '',
                sold_at: ''
            },
            $inc: { version: 1 }
        },
        { session }
    );

    return units;
}

async function transferUnits(db, auth, { sourceStock, targetStock, sourceBranchId, targetBranchId, quantity, transferId, now }, session = null) {
    const item = await findItemForStock(db, auth, sourceStock, session);
    if (!isUnitTracked(item)) return [];

    const units = await takeAvailableUnits(db, auth, {
        stockBatch: sourceStock,
        branchId: sourceBranchId,
        quantity,
        now
    }, session);
    const targetStockBatchId = stringId(targetStock._id || targetStock.id);

    await db.collection('inventory_units').updateMany(
        { _id: { $in: units.map((unit) => unit._id) }, orgId: auth.orgId },
        {
            $set: {
                branchId: targetBranchId,
                branch_id: targetBranchId,
                stockBatchId: targetStockBatchId,
                stock_batch_id: targetStockBatchId,
                currentLocationType: 'branch',
                current_location_type: 'branch',
                currentLocationId: targetBranchId,
                current_location_id: targetBranchId,
                lastTransferId: stringId(transferId),
                last_transfer_id: stringId(transferId),
                transferredFromBranchId: sourceBranchId,
                transferred_from_branch_id: sourceBranchId,
                updatedAt: now,
                updated_at: now,
                updatedBy: auth.userId
            },
            $inc: { version: 1 }
        },
        { session }
    );

    return units;
}

async function disposeUnits(db, auth, { stockBatch, branchId, quantity, disposedId, reason, now }, session = null) {
    const item = await findItemForStock(db, auth, stockBatch, session);
    if (!isUnitTracked(item)) return [];

    const units = await takeAvailableUnits(db, auth, { stockBatch, branchId, quantity, now }, session);
    await db.collection('inventory_units').updateMany(
        { _id: { $in: units.map((unit) => unit._id) }, orgId: auth.orgId },
        {
            $set: {
                status: 'disposed',
                disposedItemId: stringId(disposedId),
                disposed_item_id: stringId(disposedId),
                disposedReason: reason || null,
                disposed_reason: reason || null,
                disposedAt: now,
                disposed_at: now,
                updatedAt: now,
                updated_at: now,
                updatedBy: auth.userId
            },
            $inc: { version: 1 }
        },
        { session }
    );
    return units;
}

async function returnUnitsToSupplier(db, auth, { stockBatch, branchId, quantity, restockId, reason, now }, session = null) {
    const item = await findItemForStock(db, auth, stockBatch, session);
    if (!isUnitTracked(item)) return [];

    const units = await takeAvailableUnits(db, auth, { stockBatch, branchId, quantity, now }, session);
    await db.collection('inventory_units').updateMany(
        { _id: { $in: units.map((unit) => unit._id) }, orgId: auth.orgId },
        {
            $set: {
                status: 'returned_to_supplier',
                supplierReturnRestockId: stringId(restockId),
                supplier_return_restock_id: stringId(restockId),
                supplierReturnReason: reason || null,
                supplier_return_reason: reason || null,
                returnedToSupplierAt: now,
                returned_to_supplier_at: now,
                updatedAt: now,
                updated_at: now,
                updatedBy: auth.userId
            },
            $inc: { version: 1 }
        },
        { session }
    );
    return units;
}

module.exports = {
    normalizeTrackingMode,
    isUnitTracked,
    assertWholeUnits,
    findItemForStock,
    writeStockMovement,
    createUnitsForRestock,
    markUnitsSold,
    restoreSoldUnits,
    transferUnits,
    disposeUnits,
    returnUnitsToSupplier
};
