const { ObjectId } = require('mongodb');
const { getDb, getMongoClient, supportsTransactions } = require('../db/mongo.cjs');
const { publishDomainEvent } = require('./domainEvents.cjs');
const {
    disposeUnits,
    writeStockMovement
} = require('./inventoryTrackingService.cjs');

function assertTransactionSupport() {
    if (!supportsTransactions()) {
        const err = new Error('MongoDB transactions are required for disposal mutations. Use MongoDB Atlas or a replica-set MongoDB deployment.');
        err.statusCode = 503;
        throw err;
    }
}

function stockIdentityFilter(auth, branchId, body = {}) {
    const clauses = [];
    const stockId = body.stockId || body.stock_id || body.id || null;
    const itemId = body.itemId || body.item_id || null;
    const sku = body.sku || null;
    const batchCode = body.batchCode || body.batch_code || null;

    if (stockId && ObjectId.isValid(stockId)) clauses.push({ _id: new ObjectId(stockId) });
    if (stockId) clauses.push({ id: stockId }, { stockId }, { stock_id: stockId });
    if (itemId && batchCode) {
        clauses.push({ itemId, batchCode }, { item_id: itemId, batch_code: batchCode });
        clauses.push({ itemId, batch_code: batchCode }, { item_id: itemId, batchCode });
    }
    if (sku && batchCode) {
        clauses.push({ sku, batchCode }, { sku, batch_code: batchCode });
    }

    if (!clauses.length) {
        const err = new Error('Disposed item is missing stock identity');
        err.statusCode = 400;
        throw err;
    }

    return {
        orgId: auth.orgId,
        deletedAt: null,
        $and: [
            { $or: [{ branchId }, { branch_id: branchId }] },
            { $or: clauses }
        ]
    };
}

async function createDisposedItem(auth, body = {}) {
    const db = getDb();
    const branchId = auth.branchId || body.branchId || body.branch_id || null;
    const quantity = Number(body.quantity || body.qty || 0);
    const reason = body.reason || body.disposeReason || body.dispose_reason || '';

    if (!branchId) {
        const err = new Error('Branch is required to dispose stock');
        err.statusCode = 400;
        throw err;
    }
    if (!Number.isFinite(quantity) || quantity <= 0) {
        const err = new Error('Disposed quantity must be greater than zero');
        err.statusCode = 400;
        throw err;
    }
    if (!reason.trim()) {
        const err = new Error('Disposal reason is required');
        err.statusCode = 400;
        throw err;
    }

    assertTransactionSupport();
    const session = getMongoClient().startSession();
    let disposedDoc;
    let stockBatch;
    let unitCodes = [];
    const now = new Date();

    try {
        await session.withTransaction(async () => {
            stockBatch = await db.collection('stock_batches').findOne({
                ...stockIdentityFilter(auth, branchId, body),
                quantity: { $gte: quantity }
            }, { session });

            if (!stockBatch) {
                const err = new Error('Stock batch was not found or does not have enough quantity to dispose');
                err.statusCode = 409;
                throw err;
            }

            disposedDoc = {
                orgId: auth.orgId,
                branchId,
                branch_id: branchId,
                stockId: String(stockBatch._id),
                stock_id: String(stockBatch._id),
                itemId: stockBatch.itemId || stockBatch.item_id || null,
                item_id: stockBatch.item_id || stockBatch.itemId || null,
                sku: stockBatch.sku || body.sku || null,
                batchCode: stockBatch.batchCode || stockBatch.batch_code || body.batchCode || body.batch_code || null,
                batch_code: stockBatch.batch_code || stockBatch.batchCode || body.batch_code || body.batchCode || null,
                quantity,
                reason: reason.trim(),
                disposedBy: body.disposedBy || body.disposed_by || auth.userId,
                disposed_by: body.disposed_by || body.disposedBy || auth.userId,
                createdAt: now,
                created_at: now,
                updatedAt: now,
                updated_at: now,
                createdBy: auth.userId,
                updatedBy: auth.userId,
                version: 1,
                deletedAt: null
            };

            const insert = await db.collection('disposed_items').insertOne(disposedDoc, { session });
            disposedDoc._id = insert.insertedId;

            const units = await disposeUnits(db, auth, {
                stockBatch,
                branchId,
                quantity,
                disposedId: disposedDoc._id,
                reason,
                now
            }, session);
            unitCodes = units.map((unit) => unit.unitCode || unit.unit_code).filter(Boolean);

            await db.collection('stock_batches').updateOne(
                { _id: stockBatch._id, orgId: auth.orgId },
                {
                    $inc: { quantity: -quantity, version: 1 },
                    $set: { updatedAt: now, updated_at: now, updatedBy: auth.userId }
                },
                { session }
            );

            await writeStockMovement(db, auth, {
                movementType: 'dispose',
                movement_type: 'dispose',
                direction: 'out',
                branchId,
                itemId: stockBatch.itemId || stockBatch.item_id || null,
                item_id: stockBatch.item_id || stockBatch.itemId || null,
                stockBatchId: String(stockBatch._id),
                stock_batch_id: String(stockBatch._id),
                sku: stockBatch.sku || null,
                batchCode: stockBatch.batchCode || stockBatch.batch_code || null,
                batch_code: stockBatch.batch_code || stockBatch.batchCode || null,
                quantity,
                unitCount: unitCodes.length,
                unit_count: unitCodes.length,
                unitCodes,
                unit_codes: unitCodes,
                referenceType: 'disposed_items',
                reference_type: 'disposed_items',
                referenceId: String(disposedDoc._id),
                reference_id: String(disposedDoc._id),
                reason
            }, session);
        });
    } finally {
        await session.endSession();
    }

    await publishDomainEvent({
        event: 'disposed_items.created',
        orgId: auth.orgId,
        branchId,
        entity: 'disposed_items',
        entityId: String(disposedDoc._id),
        operation: 'create',
        version: disposedDoc.version,
        changedBy: auth.userId
    });
    await publishDomainEvent({
        event: 'stock_batches.updated',
        orgId: auth.orgId,
        branchId,
        entity: 'stock_batches',
        operation: 'update',
        changedBy: auth.userId
    });
    if (unitCodes.length) {
        await publishDomainEvent({
            event: 'inventory_units.updated',
            orgId: auth.orgId,
            branchId,
            entity: 'inventory_units',
            operation: 'update',
            changedBy: auth.userId
        });
    }

    return disposedDoc;
}

module.exports = {
    createDisposedItem
};
