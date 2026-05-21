const { ObjectId } = require('mongodb');
const { getDb, getMongoClient, supportsTransactions } = require('../db/mongo.cjs');
const { publishDomainEvent } = require('./domainEvents.cjs');
const {
    transferUnits,
    writeStockMovement
} = require('./inventoryTrackingService.cjs');

function toObjectId(id) {
    return ObjectId.isValid(id) ? new ObjectId(id) : id;
}

function readTransferItems(transfer = {}) {
    const candidates = [
        transfer.items,
        transfer.transferItems,
        transfer.transfer_items,
        transfer.details,
        transfer.requestDetails?.items,
        transfer.request_details?.items
    ];

    for (const value of candidates) {
        if (Array.isArray(value)) return value;
    }

    return [];
}

function readTransferLineQuantity(item = {}) {
    return Number(
        item.quantity
        ?? item.qty
        ?? item.transferQty
        ?? item.transfer_qty
        ?? item.requestedQty
        ?? item.requested_qty
        ?? item.requested_quantity
        ?? item.acceptedQty
        ?? item.accepted_qty
        ?? item.accepted_quantity
        ?? 0
    ) || 0;
}

function readTransferLineIdentity(item = {}) {
    return {
        stockId: item.stockId || item.stock_id || item.stockid || null,
        itemId: item.itemId || item.item_id || item.id || item._id || null,
        batchCode: item.batchCode || item.batch_code || item.batch || null,
        sku: item.sku || null
    };
}

function readTransferQuantity(transfer = {}) {
    const topLevelQty = Number(
        transfer.quantity
        ?? transfer.requestedQty
        ?? transfer.requested_qty
        ?? transfer.requested_quantity
        ?? 0
    ) || 0;

    if (topLevelQty > 0) return topLevelQty;

    const items = readTransferItems(transfer);
    const itemQtyTotal = items.reduce((sum, item) => sum + readTransferLineQuantity(item), 0);
    if (itemQtyTotal > 0) return itemQtyTotal;

    const bodyQty = Number(
        transfer.totalRequestedQty
        ?? transfer.total_requested_qty
        ?? 0
    ) || 0;

    return bodyQty;
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

function isSameBranch(a, b) {
    return Boolean(a && b && String(a) === String(b));
}

function normalizeTransferStatus(status) {
    return String(status || 'pending').trim().toLowerCase();
}

function getTransferDecisionStage(existing) {
    const status = normalizeTransferStatus(existing?.status);
    if (status === 'pending') return 'source_review';
    if (status === 'approved_by_manager' || status === 'in_transit') return 'target_review';
    return 'terminal';
}

function buildManagerDecisionUpdate(auth, existing, nextStatus, extra = {}) {
    const now = new Date();
    return {
        ...extra,
        status: nextStatus,
        updatedAt: now,
        updated_at: now,
        updatedBy: auth.userId,
        version: (existing.version || 1) + 1
    };
}

function buildSourceStockFilter(auth, transfer, sourceBranchId) {
    const clauses = [];
    const items = readTransferItems(transfer);
    const candidates = [
        transfer,
        ...items
    ];

    for (const candidate of candidates) {
        const { stockId, itemId, batchCode, sku } = readTransferLineIdentity(candidate);

        if (stockId && ObjectId.isValid(stockId)) clauses.push({ _id: new ObjectId(stockId) });
        if (stockId) clauses.push({ id: stockId }, { stockId }, { stock_id: stockId });
        if (itemId && batchCode) {
            clauses.push({ itemId, batchCode });
            clauses.push({ item_id: itemId, batch_code: batchCode });
        }
        if (sku && batchCode) {
            clauses.push({ sku, batchCode }, { sku, batch_code: batchCode });
        }
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

            const sourceBranchId = body.sourceBranchId || body.source_branch_id || getSourceBranchId(existing);
            const targetBranchId = body.targetBranchId || body.target_branch_id || getTargetBranchId(existing);
            let requestedQty = readTransferQuantity(existing);
            if (requestedQty <= 0) {
                requestedQty = readTransferQuantity(body);
            }
            const acceptedQty = Number(body.acceptedQty ?? body.accepted_qty ?? body.accepted_quantity ?? requestedQty);
            const currentStage = getTransferDecisionStage(existing);

            if (!sourceBranchId || !targetBranchId) {
                const err = new Error('Source and target branches are required to accept a transfer');
                err.statusCode = 400;
                throw err;
            }
            if (currentStage === 'source_review') {
                if (!isSameBranch(auth.branchId, sourceBranchId)) {
                    const err = new Error('Only the source branch can approve this transfer');
                    err.statusCode = 403;
                    throw err;
                }

                const updateDoc = buildManagerDecisionUpdate(auth, existing, 'approved_by_manager', {
                    approvedByManagerAt: new Date(),
                    approved_by_manager_at: new Date(),
                    approvedByManagerBy: auth.userId,
                    approved_by_manager_by: auth.userId,
                    sourceBranchId,
                    source_branch_id: sourceBranchId,
                    fromBranchId: sourceBranchId,
                    targetBranchId,
                    target_branch_id: targetBranchId,
                    toBranchId: targetBranchId
                });

                await db.collection('inventory_transfers').updateOne(
                    { _id: existing._id, orgId: auth.orgId },
                    { $set: updateDoc },
                    { session: querySession }
                );
                transfer = { ...existing, ...updateDoc };
                return;
            }

            if (currentStage !== 'target_review') {
                const err = new Error(`Only pending or manager-approved transfers can be accepted. Current status: ${existing.status || 'unknown'}`);
                err.statusCode = 409;
                throw err;
            }

            if (!isSameBranch(auth.branchId, targetBranchId)) {
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
            const transferForLookup = {
                ...existing,
                ...body,
                items: Array.isArray(body.items) && body.items.length > 0
                    ? body.items
                    : readTransferItems(existing),
                requestDetails: {
                    ...(existing.requestDetails || {}),
                    ...(body.requestDetails || {})
                }
            };
            const sourceFilter = {
                ...buildSourceStockFilter(auth, transferForLookup, sourceBranchId),
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
            let targetStockDoc;
            if (targetStock) {
                await db.collection('stock_batches').updateOne(
                    { _id: targetStock._id },
                    {
                        $inc: { quantity: acceptedQty, version: 1 },
                        $set: { updatedAt: now, updatedBy: auth.userId }
                    },
                    { session: querySession }
                );
                targetStockDoc = { ...targetStock, quantity: Number(targetStock.quantity || 0) + acceptedQty, updatedAt: now };
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
                const insert = await db.collection('stock_batches').insertOne(clonedStock, { session: querySession });
                targetStockDoc = { ...clonedStock, _id: insert.insertedId };
            }

            const units = await transferUnits(db, auth, {
                sourceStock,
                targetStock: targetStockDoc,
                sourceBranchId,
                targetBranchId,
                quantity: acceptedQty,
                transferId: existing._id,
                now
            }, querySession);
            const unitCodes = units.map((unit) => unit.unitCode || unit.unit_code).filter(Boolean);

            await writeStockMovement(db, auth, {
                movementType: 'transfer_out',
                movement_type: 'transfer_out',
                direction: 'out',
                branchId: sourceBranchId,
                itemId: sourceStock.itemId || sourceStock.item_id || null,
                item_id: sourceStock.item_id || sourceStock.itemId || null,
                stockBatchId: String(sourceStock._id),
                stock_batch_id: String(sourceStock._id),
                transferId: String(existing._id),
                transfer_id: String(existing._id),
                sku: sourceStock.sku || null,
                batchCode: sourceStock.batchCode || sourceStock.batch_code || null,
                batch_code: sourceStock.batch_code || sourceStock.batchCode || null,
                quantity: acceptedQty,
                unitCount: unitCodes.length,
                unit_count: unitCodes.length,
                unitCodes,
                unit_codes: unitCodes,
                referenceType: 'inventory_transfers',
                reference_type: 'inventory_transfers',
                referenceId: String(existing._id),
                reference_id: String(existing._id)
            }, querySession);

            await writeStockMovement(db, auth, {
                movementType: 'transfer_in',
                movement_type: 'transfer_in',
                direction: 'in',
                branchId: targetBranchId,
                itemId: targetStockDoc.itemId || targetStockDoc.item_id || null,
                item_id: targetStockDoc.item_id || targetStockDoc.itemId || null,
                stockBatchId: String(targetStockDoc._id),
                stock_batch_id: String(targetStockDoc._id),
                transferId: String(existing._id),
                transfer_id: String(existing._id),
                sku: targetStockDoc.sku || null,
                batchCode: targetStockDoc.batchCode || targetStockDoc.batch_code || null,
                batch_code: targetStockDoc.batch_code || targetStockDoc.batchCode || null,
                quantity: acceptedQty,
                unitCount: unitCodes.length,
                unit_count: unitCodes.length,
                unitCodes,
                unit_codes: unitCodes,
                referenceType: 'inventory_transfers',
                reference_type: 'inventory_transfers',
                referenceId: String(existing._id),
                reference_id: String(existing._id)
            }, querySession);

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

    if (normalizeTransferStatus(transfer.status) === 'approved_by_manager') {
        await publishDomainEvent({
            event: 'inventory_transfers.manager_approved',
            orgId: auth.orgId,
            branchId: transfer.sourceBranchId || transfer.source_branch_id || auth.branchId || null,
            entity: 'inventory_transfers',
            entityId: String(transfer._id),
            operation: 'update',
            version: transfer.version,
            changedBy: auth.userId
        });
        return transfer;
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
    await publishDomainEvent({
        event: 'stock_batches.updated',
        orgId: auth.orgId,
        branchId: transfer.sourceBranchId || transfer.source_branch_id || null,
        entity: 'stock_batches',
        operation: 'update',
        changedBy: auth.userId
    });
    await publishDomainEvent({
        event: 'inventory_units.updated',
        orgId: auth.orgId,
        branchId: transfer.targetBranchId || transfer.target_branch_id || auth.branchId || null,
        entity: 'inventory_units',
        operation: 'update',
        changedBy: auth.userId
    });
    await publishDomainEvent({
        event: 'stock_movements.created',
        orgId: auth.orgId,
        branchId: transfer.targetBranchId || transfer.target_branch_id || auth.branchId || null,
        entity: 'stock_movements',
        operation: 'create',
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
    const sourceBranchId = body.sourceBranchId || body.source_branch_id || getSourceBranchId(existing);
    const targetBranchId = body.targetBranchId || body.target_branch_id || getTargetBranchId(existing);
    const currentStage = getTransferDecisionStage(existing);
    const now = new Date();
    const rejectionReason = body.reason || body.rejectionReason || body.rejection_reason || null;

    if (currentStage === 'source_review') {
        if (!isSameBranch(auth.branchId, sourceBranchId)) {
            const err = new Error('Only the source branch can reject this transfer');
            err.statusCode = 403;
            throw err;
        }

        const updateDoc = buildManagerDecisionUpdate(auth, existing, 'rejected_by_manager', {
            acceptedQty: 0,
            accepted_qty: 0,
            accepted_quantity: 0,
            rejectedAt: now,
            rejected_at: now,
            rejectionReason,
            rejection_reason: rejectionReason,
            managerRejectedAt: now,
            manager_rejected_at: now,
            managerRejectedBy: auth.userId,
            manager_rejected_by: auth.userId,
            sourceBranchId,
            source_branch_id: sourceBranchId,
            fromBranchId: sourceBranchId,
            targetBranchId,
            target_branch_id: targetBranchId,
            toBranchId: targetBranchId
        });

        await db.collection('inventory_transfers').updateOne(
            { _id: existing._id, orgId: auth.orgId },
            { $set: updateDoc }
        );

        const transfer = { ...existing, ...updateDoc };
        await publishDomainEvent({
            event: 'inventory_transfers.manager_rejected',
            orgId: auth.orgId,
            branchId: sourceBranchId || auth.branchId || null,
            entity: 'inventory_transfers',
            entityId: String(transfer._id),
            operation: 'update',
            version: transfer.version,
            changedBy: auth.userId
        });

        return transfer;
    }

    if (currentStage !== 'target_review') {
        const err = new Error(`Only pending or manager-approved transfers can be rejected. Current status: ${existing.status || 'unknown'}`);
        err.statusCode = 409;
        throw err;
    }

    if (!isSameBranch(auth.branchId, targetBranchId)) {
        const err = new Error('Only the target branch can reject this transfer');
        err.statusCode = 403;
        throw err;
    }

    const updateDoc = {
        status: 'rejected',
        acceptedQty: 0,
        accepted_qty: 0,
        accepted_quantity: 0,
        rejectedAt: now,
        rejected_at: now,
        rejectionReason,
        rejection_reason: rejectionReason,
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
