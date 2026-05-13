const { ObjectId } = require('mongodb');
const { getDb, getMongoClient, supportsTransactions } = require('../db/mongo.cjs');
const { publishDomainEvent } = require('./domainEvents.cjs');

function toObjectId(id) {
    return ObjectId.isValid(id) ? new ObjectId(id) : id;
}

function readTransferQuantity(transfer = {}) {
    return Number(
        transfer.quantity
        ?? transfer.requestedQty
        ?? transfer.requested_qty
        ?? transfer.requested_quantity
        ?? 0
    );
}

function getSourceBranchId(transfer = {}) {
    return transfer.sourceBranchId
        || transfer.source_branch_id
        || transfer.fromBranchId
        || transfer.from_branch_id
        || transfer.branchId
        || transfer.branch_id
        || null;
}

function getTargetBranchId(transfer = {}) {
    return transfer.targetBranchId
        || transfer.target_branch_id
        || transfer.toBranchId
        || transfer.to_branch_id
        || transfer.destinationBranchId
        || transfer.destination_branch_id
        || null;
}

function buildSourceStockFilter(auth, transfer, sourceBranchId) {
    const itemId = transfer.itemId || transfer.item_id || null;
    const batchCode = transfer.batchCode || transfer.batch_code || null;
    const stockId = transfer.stockId || transfer.stock_id || null;
    const clauses = [];

    if (stockId && ObjectId.isValid(stockId)) clauses.push({ _id: new ObjectId(stockId) });
    if (stockId) clauses.push({ id: stockId }, { stockId }, { stock_id: stockId });
    if (itemId && batchCode) {
        clauses.push({ itemId, batchCode });
        clauses.push({ item_id: itemId, batch_code: batchCode });
    }

    if (clauses.length === 0) {
        const err = new Error('Transfer item is missing stock identity');
        err.statusCode = 400;
        throw err;
    }

    return {
        orgId: auth.orgId,
        deletedAt: null,
        $and: [
            { $or: [{ branchId: sourceBranchId }, { branch_id: sourceBranchId }] },
            { $or: clauses }
        ]
    };
}

async function acceptTransfer(auth, transferId, body = {}) {
    const db = getDb();
    const useTransactions = supportsTransactions();
    const session = useTransactions ? getMongoClient().startSession() : null;
    const querySession = useTransactions ? session : undefined;
    let transfer;

    try {
        const executeAccept = async () => {
            const existing = await db.collection('inventory_transfers').findOne({
                _id: toObjectId(transferId),
                orgId: auth.orgId,
                deletedAt: null
            }, { session: querySession });

            if (!existing) {
                const err = new Error('Inventory transfer not found');
                err.statusCode = 404;
                throw err;
            }
            if (String(existing.status || '').toLowerCase() !== 'pending') {
                const err = new Error(`Only pending transfers can be accepted. Current status: ${existing.status || 'unknown'}`);
                err.statusCode = 409;
                throw err;
            }

            const sourceBranchId = body.sourceBranchId || body.source_branch_id || getSourceBranchId(existing);
            const targetBranchId = body.targetBranchId || body.target_branch_id || getTargetBranchId(existing);
            const requestedQty = readTransferQuantity(existing);
            const acceptedQty = Number(body.acceptedQty ?? body.accepted_qty ?? body.accepted_quantity ?? requestedQty);

            if (!sourceBranchId || !targetBranchId) {
                const err = new Error('Source and target branches are required to accept a transfer');
                err.statusCode = 400;
                throw err;
            }
            if (auth.branchId && String(auth.branchId) !== String(targetBranchId)) {
                const err = new Error('Only the target branch can accept this transfer');
                err.statusCode = 403;
                throw err;
            }
            if (!Number.isFinite(acceptedQty) || acceptedQty <= 0 || acceptedQty > requestedQty) {
                const err = new Error(`Accept quantity must be between 1 and ${requestedQty}`);
                err.statusCode = 400;
                throw err;
            }

            const now = new Date();
            const sourceFilter = {
                ...buildSourceStockFilter(auth, existing, sourceBranchId),
                quantity: { $gte: acceptedQty }
            };
            const sourceStock = await db.collection('stock_batches').findOne(sourceFilter, { session: querySession });
            if (!sourceStock) {
                const err = new Error('Source branch does not have enough stock for this transfer');
                err.statusCode = 409;
                throw err;
            }

            await db.collection('stock_batches').updateOne(
                { _id: sourceStock._id },
                {
                    $inc: { quantity: -acceptedQty, version: 1 },
                    $set: { updatedAt: now, updatedBy: auth.userId }
                },
                { session: querySession }
            );

            const targetFilter = {
                orgId: auth.orgId,
                deletedAt: null,
                $and: [
                    { $or: [{ branchId: targetBranchId }, { branch_id: targetBranchId }] },
                    {
                        $or: [
                            { itemId: sourceStock.itemId, batchCode: sourceStock.batchCode },
                            { item_id: sourceStock.item_id || sourceStock.itemId, batch_code: sourceStock.batch_code || sourceStock.batchCode }
                        ]
                    }
                ]
            };
            const targetStock = await db.collection('stock_batches').findOne(targetFilter, { session: querySession });
            if (targetStock) {
                await db.collection('stock_batches').updateOne(
                    { _id: targetStock._id },
                    {
                        $inc: { quantity: acceptedQty, version: 1 },
                        $set: { updatedAt: now, updatedBy: auth.userId }
                    },
                    { session: querySession }
                );
            } else {
                const clonedStock = {
                    ...sourceStock,
                    _id: undefined,
                    branchId: targetBranchId,
                    branch_id: targetBranchId,
                    quantity: acceptedQty,
                    createdAt: now,
                    created_at: now,
                    updatedAt: now,
                    updated_at: now,
                    createdBy: auth.userId,
                    updatedBy: auth.userId,
                    version: 1,
                    deletedAt: null,
                    transferredFromBranchId: sourceBranchId,
                    transferred_from_branch_id: sourceBranchId
                };
                delete clonedStock._id;
                await db.collection('stock_batches').insertOne(clonedStock, { session: querySession });
            }

            const updateDoc = {
                status: 'accepted',
                acceptedQty,
                accepted_qty: acceptedQty,
                accepted_quantity: acceptedQty,
                sourceBranchId,
                source_branch_id: sourceBranchId,
                fromBranchId: sourceBranchId,
                targetBranchId,
                target_branch_id: targetBranchId,
                toBranchId: targetBranchId,
                acceptedAt: now,
                accepted_at: now,
                updatedAt: now,
                updated_at: now,
                updatedBy: auth.userId,
                version: (existing.version || 1) + 1
            };

            await db.collection('inventory_transfers').updateOne(
                { _id: existing._id, orgId: auth.orgId },
                { $set: updateDoc },
                { session: querySession }
            );
            transfer = { ...existing, ...updateDoc };
        };

        if (useTransactions) {
            await session.withTransaction(executeAccept);
        } else {
            await executeAccept();
        }
    } finally {
        if (session) await session.endSession();
    }

    await publishDomainEvent({
        event: 'inventory_transfers.accepted',
        orgId: auth.orgId,
        branchId: transfer.targetBranchId || transfer.target_branch_id || auth.branchId || null,
        entity: 'inventory_transfers',
        entityId: String(transfer._id),
        operation: 'update',
        version: transfer.version,
        changedBy: auth.userId
    });
    await publishDomainEvent({
        event: 'stock_batches.updated',
        orgId: auth.orgId,
        branchId: transfer.targetBranchId || transfer.target_branch_id || auth.branchId || null,
        entity: 'stock_batches',
        operation: 'update',
        changedBy: auth.userId
    });

    return transfer;
}

async function rejectTransfer(auth, transferId, body = {}) {
    const db = getDb();
    const existing = await db.collection('inventory_transfers').findOne({
        _id: toObjectId(transferId),
        orgId: auth.orgId,
        deletedAt: null
    });

    if (!existing) {
        const err = new Error('Inventory transfer not found');
        err.statusCode = 404;
        throw err;
    }
    const targetBranchId = body.targetBranchId || body.target_branch_id || getTargetBranchId(existing);
    if (auth.branchId && String(auth.branchId) !== String(targetBranchId)) {
        const err = new Error('Only the target branch can reject this transfer');
        err.statusCode = 403;
        throw err;
    }

    const now = new Date();
    const updateDoc = {
        status: 'rejected',
        acceptedQty: 0,
        accepted_qty: 0,
        accepted_quantity: 0,
        rejectedAt: now,
        rejected_at: now,
        rejectionReason: body.reason || body.rejectionReason || body.rejection_reason || null,
        rejection_reason: body.reason || body.rejectionReason || body.rejection_reason || null,
        updatedAt: now,
        updated_at: now,
        updatedBy: auth.userId,
        version: (existing.version || 1) + 1
    };

    await db.collection('inventory_transfers').updateOne(
        { _id: existing._id, orgId: auth.orgId },
        { $set: updateDoc }
    );

    const transfer = { ...existing, ...updateDoc };
    await publishDomainEvent({
        event: 'inventory_transfers.rejected',
        orgId: auth.orgId,
        branchId: targetBranchId || auth.branchId || null,
        entity: 'inventory_transfers',
        entityId: String(transfer._id),
        operation: 'update',
        version: transfer.version,
        changedBy: auth.userId
    });

    return transfer;
}

module.exports = {
    acceptTransfer,
    rejectTransfer
};
