const { ObjectId } = require('mongodb');
const { getDb, getMongoClient, supportsTransactions } = require('../db/mongo.cjs');
const { publishDomainEvent } = require('./domainEvents.cjs');
const {
    markUnitsSold,
    restoreSoldUnits,
    writeStockMovement
} = require('./inventoryTrackingService.cjs');

function dateKey(date = new Date()) {
    return date.toISOString().slice(0, 10).replaceAll('-', '');
}

function toObjectId(id) {
    return ObjectId.isValid(id) ? new ObjectId(id) : id;
}

function saleLineKey(line = {}) {
    return String(
        line.sale_item_id
        || line.saleItemId
        || line.id
        || line._id
        || `${line.itemId || line.item_id || ''}:${line.batchCode || line.batch_code || ''}:${line.stockId || line.stock_id || ''}`
    );
}

function normalizeSaleLine(line = {}) {
    const itemId = line.itemId ?? line.item_id ?? line.itemID ?? line.item?.id ?? null;
    const batchCode = line.batchCode ?? line.batch_code ?? line.batch ?? null;
    const stockId = line.stockId ?? line.stock_id ?? null;
    const quantity = Number(line.quantity ?? line.qty ?? line.customer_quantity ?? 0);
    const unitPrice = Number(line.unitPrice ?? line.unit_price ?? line.retail_price ?? 0);
    const discount = Number(line.discount ?? line.customer_discount ?? 0);
    const totalPrice = Number(line.totalPrice ?? line.total_price ?? (unitPrice - discount) * quantity);

    return {
        ...line,
        itemId,
        item_id: itemId,
        stockId,
        stock_id: stockId,
        batchCode,
        batch_code: batchCode,
        quantity,
        unitPrice,
        unit_price: unitPrice,
        discount,
        totalPrice,
        total_price: totalPrice
    };
}

function assertTransactionSupport() {
    if (!supportsTransactions()) {
        const err = new Error('MongoDB transactions are required for sales mutations. Use MongoDB Atlas or a replica-set MongoDB deployment.');
        err.statusCode = 503;
        throw err;
    }
}

function validateSaleLines(lines = []) {
    if (!Array.isArray(lines) || lines.length === 0) {
        const err = new Error('Sale must contain at least one item');
        err.statusCode = 400;
        throw err;
    }

    for (const line of lines) {
        if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
            const err = new Error(`Invalid sale quantity for item ${line.itemId || line.item_name || 'unknown'}`);
            err.statusCode = 400;
            throw err;
        }
        if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
            const err = new Error(`Invalid sale unit price for item ${line.itemId || line.item_name || 'unknown'}`);
            err.statusCode = 400;
            throw err;
        }
        if (!Number.isFinite(line.discount) || line.discount < 0) {
            const err = new Error(`Invalid sale discount for item ${line.itemId || line.item_name || 'unknown'}`);
            err.statusCode = 400;
            throw err;
        }
    }
}

function buildStockIdentityFilter(auth, branchId, line) {
    const clauses = [];
    if (line.stockId && ObjectId.isValid(line.stockId)) {
        clauses.push({ _id: new ObjectId(line.stockId) });
    }
    if (line.stockId) {
        clauses.push({ id: line.stockId }, { stockId: line.stockId }, { stock_id: line.stockId });
    }
    if (line.itemId && line.batchCode) {
        clauses.push({ itemId: line.itemId, batchCode: line.batchCode });
        clauses.push({ item_id: line.itemId, batch_code: line.batchCode });
    }
    if (line.sku && line.batchCode) {
        clauses.push({ sku: line.sku, batchCode: line.batchCode });
        clauses.push({ sku: line.sku, batch_code: line.batchCode });
    }

    if (clauses.length === 0) {
        const err = new Error(`Sale line is missing item or batch identity: item ${line.itemId || 'undefined'} / batch ${line.batchCode || 'undefined'}`);
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

async function decrementStock(db, auth, branchId, line, now, session, context = {}) {
    const stockBatch = await db.collection('stock_batches').findOne({
        ...buildStockIdentityFilter(auth, branchId, line),
        quantity: { $gte: Number(line.quantity) }
    }, { session });

    if (!stockBatch) {
        const err = new Error(`Insufficient stock for item ${line.itemId} / batch ${line.batchCode}`);
        err.statusCode = 409;
        throw err;
    }

    const units = await markUnitsSold(db, auth, {
        stockBatch,
        branchId,
        quantity: line.quantity,
        saleId: context.saleId,
        invoiceNo: context.invoiceNo,
        now
    }, session);
    const unitCodes = units.map((unit) => unit.unitCode || unit.unit_code).filter(Boolean);

    const result = await db.collection('stock_batches').updateOne(
        { _id: stockBatch._id, orgId: auth.orgId, quantity: { $gte: Number(line.quantity) } },
        {
            $inc: { quantity: -Number(line.quantity), version: 1 },
            $set: { updatedAt: now, updated_at: now, updatedBy: auth.userId }
        },
        { session }
    );

    if (result.modifiedCount !== 1) {
        const err = new Error(`Insufficient stock for item ${line.itemId} / batch ${line.batchCode}`);
        err.statusCode = 409;
        throw err;
    }

    await writeStockMovement(db, auth, {
        movementType: 'sale',
        movement_type: 'sale',
        direction: 'out',
        branchId,
        itemId: line.itemId || stockBatch.itemId || stockBatch.item_id || null,
        item_id: line.itemId || stockBatch.item_id || stockBatch.itemId || null,
        stockBatchId: String(stockBatch._id),
        stock_batch_id: String(stockBatch._id),
        saleId: context.saleId ? String(context.saleId) : null,
        sale_id: context.saleId ? String(context.saleId) : null,
        invoiceNo: context.invoiceNo || null,
        invoice_no: context.invoiceNo || null,
        sku: line.sku || stockBatch.sku || null,
        batchCode: line.batchCode || stockBatch.batchCode || stockBatch.batch_code || null,
        batch_code: line.batchCode || stockBatch.batch_code || stockBatch.batchCode || null,
        quantity: Number(line.quantity),
        unitCount: unitCodes.length,
        unit_count: unitCodes.length,
        unitCodes,
        unit_codes: unitCodes,
        referenceType: 'sales',
        reference_type: 'sales',
        referenceId: context.saleId ? String(context.saleId) : null,
        reference_id: context.saleId ? String(context.saleId) : null
    }, session);
}

async function restoreStock(db, auth, branchId, line, quantity, now, session, context = {}) {
    const stockBatch = await db.collection('stock_batches').findOne(
        buildStockIdentityFilter(auth, branchId, line),
        { session }
    );
    if (!stockBatch) {
        const err = new Error(`Stock batch for item ${line.itemId || 'undefined'} / batch ${line.batchCode || 'undefined'} was not found`);
        err.statusCode = 404;
        throw err;
    }

    const units = await restoreSoldUnits(db, auth, {
        stockBatch,
        branchId,
        quantity,
        saleId: context.saleId,
        now
    }, session);
    const unitCodes = units.map((unit) => unit.unitCode || unit.unit_code).filter(Boolean);

    const result = await db.collection('stock_batches').updateOne(
        { _id: stockBatch._id, orgId: auth.orgId },
        {
            $inc: { quantity: Number(quantity), version: 1 },
            $set: { updatedAt: now, updated_at: now, updatedBy: auth.userId }
        },
        { session }
    );

    if (result.modifiedCount !== 1) {
        const err = new Error(`Stock batch for item ${line.itemId || 'undefined'} / batch ${line.batchCode || 'undefined'} was not found`);
        err.statusCode = 404;
        throw err;
    }

    await writeStockMovement(db, auth, {
        movementType: context.movementType || 'sale_restore',
        movement_type: context.movementType || 'sale_restore',
        direction: 'in',
        branchId,
        itemId: line.itemId || stockBatch.itemId || stockBatch.item_id || null,
        item_id: line.itemId || stockBatch.item_id || stockBatch.itemId || null,
        stockBatchId: String(stockBatch._id),
        stock_batch_id: String(stockBatch._id),
        saleId: context.saleId ? String(context.saleId) : null,
        sale_id: context.saleId ? String(context.saleId) : null,
        invoiceNo: context.invoiceNo || null,
        invoice_no: context.invoiceNo || null,
        sku: line.sku || stockBatch.sku || null,
        batchCode: line.batchCode || stockBatch.batchCode || stockBatch.batch_code || null,
        batch_code: line.batchCode || stockBatch.batch_code || stockBatch.batchCode || null,
        quantity: Number(quantity),
        unitCount: unitCodes.length,
        unit_count: unitCodes.length,
        unitCodes,
        unit_codes: unitCodes,
        referenceType: context.referenceType || 'sales',
        reference_type: context.referenceType || 'sales',
        referenceId: context.referenceId ? String(context.referenceId) : context.saleId ? String(context.saleId) : null,
        reference_id: context.referenceId ? String(context.referenceId) : context.saleId ? String(context.saleId) : null
    }, session);
}

async function nextInvoiceNo(db, session, auth, type = 'SALE') {
    const key = dateKey();
    const result = await db.collection('invoice_counters').findOneAndUpdate(
        {
            orgId: auth.orgId,
            branchId: auth.branchId,
            dateKey: key,
            type
        },
        {
            $inc: { sequence: 1 },
            $setOnInsert: {
                orgId: auth.orgId,
                branchId: auth.branchId,
                dateKey: key,
                type,
                createdAt: new Date()
            },
            $set: { updatedAt: new Date() }
        },
        { upsert: true, returnDocument: 'after', session }
    );
    const counter = result.value || result;
    return `${type}-${key}-${String(counter.sequence).padStart(5, '0')}`;
}

async function generateInvoiceNo(auth, type = 'SALE', branchId = null) {
    const activeBranchId = auth.branchId || branchId;
    if (!activeBranchId) {
        const err = new Error('Branch is required to generate an invoice number');
        err.statusCode = 400;
        throw err;
    }
    const invoiceNo = await nextInvoiceNo(getDb(), null, { ...auth, branchId: activeBranchId }, type);
    return {
        invoice_no: invoiceNo,
        invoiceNo
    };
}

async function createSale(auth, saleInput) {
    const branchId = auth.branchId || saleInput.branchId || saleInput.branch_id;

    if (!branchId) {
        const err = new Error('Branch is required to create a sale');
        err.statusCode = 400;
        throw err;
    }

    const db = getDb();
    assertTransactionSupport();
    const session = getMongoClient().startSession();
    const querySession = session;
    const isHeldSale = saleInput.is_held === true || saleInput.isHeld === true;
    let sale;

    try {
        const executeCreateSale = async () => {
            const saleObjectId = new ObjectId();
            const invoiceNo = saleInput.invoiceNo || saleInput.invoice_no || await nextInvoiceNo(db, querySession, { ...auth, branchId });
            const now = new Date();
            const lines = (saleInput.items || []).map(normalizeSaleLine);
            validateSaleLines(lines);

            if (!isHeldSale) {
                for (const line of lines) {
                    await decrementStock(db, auth, branchId, line, now, querySession, {
                        saleId: saleObjectId,
                        invoiceNo
                    });
                }
            }

            // Resolve IDs using both naming conventions
            const memberId = saleInput.memberId || saleInput.member_id || null;
            const cashierId = saleInput.cashierId || saleInput.cashier_id || null;

            // Look up member and cashier names if not provided
            let memberName = saleInput.memberName || saleInput.member_name || null;
            let cashierName = saleInput.cashierName || saleInput.cashier_name || null;

            if (memberId && !memberName) {
                try {
                    const memberQuery = { orgId: auth.orgId, deletedAt: null };
                    if (ObjectId.isValid(memberId)) {
                        memberQuery.$or = [{ _id: new ObjectId(memberId) }, { id: memberId }];
                    } else {
                        memberQuery.id = memberId;
                    }
                    const member = await db.collection('members').findOne(memberQuery, { session: querySession });
                    memberName = member?.full_name || member?.member_name || member?.name || null;
                } catch (e) { /* ignore lookup error */ }
            }

            if (cashierId && !cashierName) {
                try {
                    const userQuery = { orgId: auth.orgId, deletedAt: null };
                    if (ObjectId.isValid(cashierId)) {
                        userQuery.$or = [{ _id: new ObjectId(cashierId) }, { id: cashierId }];
                    } else {
                        userQuery.id = cashierId;
                    }
                    const user = await db.collection('users').findOne(userQuery, { session: querySession });
                    cashierName = user?.username || user?.name || user?.full_name || null;
                } catch (e) { /* ignore lookup error */ }
            }

            sale = {
                _id: saleObjectId,
                orgId: auth.orgId,
                branchId,
                branch_id: branchId,
                invoiceNo,
                invoice_no: invoiceNo,
                memberId,
                member_id: memberId,
                memberName,
                member_name: memberName,
                cashierId,
                cashier_id: cashierId,
                cashierName,
                cashier_name: cashierName,
                paymentMethod: saleInput.paymentMethod || saleInput.payment_method || 'cash',
                payment_method: saleInput.payment_method || saleInput.paymentMethod || 'cash',
                subtotal: Number(saleInput.subtotal || 0),
                discount: Number(saleInput.discount || 0),
                totalAmount: Number(saleInput.totalAmount || saleInput.total_amount || 0),
                total_amount: Number(saleInput.total_amount || saleInput.totalAmount || 0),
                cashReceived: Number(saleInput.cashReceived || saleInput.cash_received || 0),
                cash_received: Number(saleInput.cash_received || saleInput.cashReceived || 0),
                changeAmount: Number(saleInput.changeAmount || saleInput.change_amount || 0),
                change_amount: Number(saleInput.change_amount || saleInput.changeAmount || 0),
                creditDuration: saleInput.creditDuration || saleInput.credit_duration || null,
                credit_duration: saleInput.credit_duration || saleInput.creditDuration || null,
                salesSessionId: saleInput.salesSessionId || saleInput.sales_session_id || null,
                sales_session_id: saleInput.sales_session_id || saleInput.salesSessionId || null,
                items: lines,
                status: isHeldSale ? 'held' : 'completed',
                is_held: isHeldSale,
                isHeld: isHeldSale,
                createdAt: now,
                created_at: now,
                updatedAt: now,
                updated_at: now,
                createdBy: auth.userId,
                updatedBy: auth.userId,
                version: 1,
                deletedAt: null
            };

            await db.collection('sales').insertOne(sale, { session: querySession });
        };

        await session.withTransaction(executeCreateSale);
    } finally {
        if (session) {
            await session.endSession();
        }
    }

    await publishDomainEvent({
        event: 'sales.created',
        orgId: auth.orgId,
        branchId,
        entity: 'sales',
        entityId: String(sale._id),
        operation: 'create',
        version: sale.version,
        changedBy: auth.userId
    });

    if (!isHeldSale) {
        await publishDomainEvent({
            event: 'stock_batches.updated',
            orgId: auth.orgId,
            branchId,
            entity: 'stock_batches',
            operation: 'update',
            changedBy: auth.userId
        });
        await publishDomainEvent({
            event: 'inventory_units.updated',
            orgId: auth.orgId,
            branchId,
            entity: 'inventory_units',
            operation: 'update',
            changedBy: auth.userId
        });
        await publishDomainEvent({
            event: 'stock_movements.created',
            orgId: auth.orgId,
            branchId,
            entity: 'stock_movements',
            operation: 'create',
            changedBy: auth.userId
        });
    }

    return sale;
}

async function completeHeldSale(auth, saleId, updateData = {}) {
    const db = getDb();
    assertTransactionSupport();
    const session = getMongoClient().startSession();
    const querySession = session;
    const saleObjectId = toObjectId(saleId);
    let sale;

    try {
        const executeCompleteHeldSale = async () => {
            const existing = await db.collection('sales').findOne({
                _id: saleObjectId,
                orgId: auth.orgId,
                deletedAt: null
            }, { session: querySession });

            if (!existing) {
                const err = new Error('Held sale not found');
                err.statusCode = 404;
                throw err;
            }

            const branchId = auth.branchId || updateData.branchId || updateData.branch_id || existing.branchId;
            if (existing.branchId && branchId !== existing.branchId) {
                const err = new Error('Held sale branch does not match the active branch');
                err.statusCode = 403;
                throw err;
            }
            const now = new Date();
            const lines = (updateData.items || existing.items || []).map(normalizeSaleLine);
            validateSaleLines(lines);

            for (const line of lines) {
                await decrementStock(db, auth, branchId, line, now, querySession, {
                    saleId: existing._id,
                    invoiceNo: existing.invoiceNo || existing.invoice_no
                });
            }

            // Resolve IDs using both naming conventions
            const memberId = updateData.memberId ?? updateData.member_id ?? existing.memberId ?? null;
            const cashierId = updateData.cashierId ?? updateData.cashier_id ?? existing.cashierId ?? null;

            // Look up member and cashier names if not provided
            let memberName = updateData.memberName ?? updateData.member_name ?? existing.memberName ?? existing.member_name ?? null;
            let cashierName = updateData.cashierName ?? updateData.cashier_name ?? existing.cashierName ?? existing.cashier_name ?? null;

            if (memberId && !memberName) {
                try {
                    const memberQuery = { orgId: auth.orgId, deletedAt: null };
                    if (ObjectId.isValid(memberId)) {
                        memberQuery.$or = [{ _id: new ObjectId(memberId) }, { id: memberId }];
                    } else {
                        memberQuery.id = memberId;
                    }
                    const member = await db.collection('members').findOne(memberQuery, { session: querySession });
                    memberName = member?.full_name || member?.member_name || member?.name || null;
                } catch (e) { /* ignore lookup error */ }
            }

            if (cashierId && !cashierName) {
                try {
                    const userQuery = { orgId: auth.orgId, deletedAt: null };
                    if (ObjectId.isValid(cashierId)) {
                        userQuery.$or = [{ _id: new ObjectId(cashierId) }, { id: cashierId }];
                    } else {
                        userQuery.id = cashierId;
                    }
                    const user = await db.collection('users').findOne(userQuery, { session: querySession });
                    cashierName = user?.username || user?.name || user?.full_name || null;
                } catch (e) { /* ignore lookup error */ }
            }

            const updateDoc = {
                branchId,
                branch_id: branchId,
                is_held: false,
                isHeld: false,
                status: updateData.status && updateData.status !== 'held' ? updateData.status : 'completed',
                memberId,
                member_id: memberId,
                memberName,
                member_name: memberName,
                cashierId,
                cashier_id: cashierId,
                cashierName,
                cashier_name: cashierName,
                paymentMethod: updateData.paymentMethod || updateData.payment_method || existing.paymentMethod || 'cash',
                payment_method: updateData.payment_method || updateData.paymentMethod || existing.payment_method || existing.paymentMethod || 'cash',
                subtotal: Number(updateData.subtotal ?? existing.subtotal ?? 0),
                discount: Number(updateData.discount ?? existing.discount ?? 0),
                totalAmount: Number(updateData.totalAmount ?? updateData.total_amount ?? existing.totalAmount ?? 0),
                total_amount: Number(updateData.total_amount ?? updateData.totalAmount ?? existing.total_amount ?? existing.totalAmount ?? 0),
                cashReceived: Number(updateData.cashReceived ?? updateData.cash_received ?? existing.cashReceived ?? 0),
                cash_received: Number(updateData.cash_received ?? updateData.cashReceived ?? existing.cash_received ?? existing.cashReceived ?? 0),
                changeAmount: Number(updateData.changeAmount ?? updateData.change_amount ?? existing.changeAmount ?? 0),
                change_amount: Number(updateData.change_amount ?? updateData.changeAmount ?? existing.change_amount ?? existing.changeAmount ?? 0),
                creditDuration: updateData.creditDuration ?? updateData.credit_duration ?? existing.creditDuration ?? existing.credit_duration ?? null,
                credit_duration: updateData.credit_duration ?? updateData.creditDuration ?? existing.credit_duration ?? existing.creditDuration ?? null,
                salesSessionId: updateData.salesSessionId ?? updateData.sales_session_id ?? existing.salesSessionId ?? existing.sales_session_id ?? null,
                sales_session_id: updateData.sales_session_id ?? updateData.salesSessionId ?? existing.sales_session_id ?? existing.salesSessionId ?? null,
                items: lines,
                updatedAt: now,
                updated_at: now,
                updatedBy: auth.userId,
                version: (existing.version || 1) + 1
            };

            await db.collection('sales').updateOne(
                { _id: existing._id, orgId: auth.orgId },
                { $set: updateDoc },
                { session: querySession }
            );

            sale = {
                ...existing,
                ...updateDoc,
                _id: existing._id
            };
        };

        await session.withTransaction(executeCompleteHeldSale);
    } finally {
        if (session) {
            await session.endSession();
        }
    }

    await publishDomainEvent({
        event: 'sales.updated',
        orgId: auth.orgId,
        branchId: sale.branchId || auth.branchId || null,
        entity: 'sales',
        entityId: String(sale._id),
        operation: 'update',
        version: sale.version,
        changedBy: auth.userId
    });

    await publishDomainEvent({
        event: 'stock_batches.updated',
        orgId: auth.orgId,
        branchId: sale.branchId || auth.branchId || null,
        entity: 'stock_batches',
        operation: 'update',
        changedBy: auth.userId
    });
    await publishDomainEvent({
        event: 'inventory_units.updated',
        orgId: auth.orgId,
        branchId: sale.branchId || auth.branchId || null,
        entity: 'inventory_units',
        operation: 'update',
        changedBy: auth.userId
    });
    await publishDomainEvent({
        event: 'stock_movements.created',
        orgId: auth.orgId,
        branchId: sale.branchId || auth.branchId || null,
        entity: 'stock_movements',
        operation: 'create',
        changedBy: auth.userId
    });

    return sale;
}

async function cancelSale(auth, saleId, body = {}) {
    const db = getDb();
    assertTransactionSupport();
    const session = getMongoClient().startSession();
    const querySession = session;
    const saleObjectId = toObjectId(saleId);
    let sale;
    let stockChanged = false;

    try {
        const executeCancelSale = async () => {
            const existing = await db.collection('sales').findOne({
                _id: saleObjectId,
                orgId: auth.orgId,
                deletedAt: null
            }, { session: querySession });

            if (!existing) {
                const err = new Error('Sale not found');
                err.statusCode = 404;
                throw err;
            }
            if (existing.status === 'cancelled') {
                sale = existing;
                return;
            }

            const branchId = auth.branchId || existing.branchId || existing.branch_id || body.branchId || body.branch_id || null;
            if (!branchId) {
                const err = new Error('Branch is required to cancel a sale');
                err.statusCode = 400;
                throw err;
            }

            const returnedByKey = new Map();
            for (const returned of existing.returned_items || existing.returnedItems || []) {
                const key = saleLineKey(returned);
                returnedByKey.set(key, (returnedByKey.get(key) || 0) + Number(returned.quantity || returned.qty || 0));
            }

            const now = new Date();
            if (!(existing.is_held || existing.isHeld || existing.status === 'held')) {
                for (const rawLine of existing.items || []) {
                    const line = normalizeSaleLine(rawLine);
                    const remainingQty = Math.max(Number(line.quantity || 0) - (returnedByKey.get(saleLineKey(line)) || 0), 0);
                    if (remainingQty > 0) {
                        await restoreStock(db, auth, branchId, line, remainingQty, now, querySession, {
                            saleId: existing._id,
                            invoiceNo: existing.invoiceNo || existing.invoice_no,
                            movementType: 'sale_cancel_restore'
                        });
                        stockChanged = true;
                    }
                }
            }

            const updateDoc = {
                status: 'cancelled',
                cancelledAt: now,
                cancelled_at: now,
                cancelReason: body.reason || body.cancelReason || body.cancel_reason || null,
                cancel_reason: body.reason || body.cancelReason || body.cancel_reason || null,
                updatedAt: now,
                updated_at: now,
                updatedBy: auth.userId,
                version: (existing.version || 1) + 1
            };

            await db.collection('sales').updateOne(
                { _id: existing._id, orgId: auth.orgId },
                { $set: updateDoc },
                { session: querySession }
            );
            sale = { ...existing, ...updateDoc };
        };

        await session.withTransaction(executeCancelSale);
    } finally {
        if (session) await session.endSession();
    }

    await publishDomainEvent({
        event: 'sales.cancelled',
        orgId: auth.orgId,
        branchId: sale.branchId || sale.branch_id || auth.branchId || null,
        entity: 'sales',
        entityId: String(sale._id),
        operation: 'update',
        version: sale.version,
        changedBy: auth.userId
    });

    if (stockChanged) {
        await publishDomainEvent({
            event: 'stock_batches.updated',
            orgId: auth.orgId,
            branchId: sale.branchId || sale.branch_id || auth.branchId || null,
            entity: 'stock_batches',
            operation: 'update',
            changedBy: auth.userId
        });
        await publishDomainEvent({
            event: 'inventory_units.updated',
            orgId: auth.orgId,
            branchId: sale.branchId || sale.branch_id || auth.branchId || null,
            entity: 'inventory_units',
            operation: 'update',
            changedBy: auth.userId
        });
        await publishDomainEvent({
            event: 'stock_movements.created',
            orgId: auth.orgId,
            branchId: sale.branchId || sale.branch_id || auth.branchId || null,
            entity: 'stock_movements',
            operation: 'create',
            changedBy: auth.userId
        });
    }

    return sale;
}

async function returnSaleItems(auth, saleId, body = {}) {
    const db = getDb();
    assertTransactionSupport();
    const session = getMongoClient().startSession();
    const querySession = session;
    const saleObjectId = toObjectId(saleId);
    const requestedItems = Array.isArray(body.items) ? body.items : [];
    let sale;

    if (requestedItems.length === 0) {
        const err = new Error('At least one returned item is required');
        err.statusCode = 400;
        throw err;
    }

    try {
        const executeReturnSaleItems = async () => {
            const existing = await db.collection('sales').findOne({
                _id: saleObjectId,
                orgId: auth.orgId,
                deletedAt: null
            }, { session: querySession });

            if (!existing) {
                const err = new Error('Sale not found');
                err.statusCode = 404;
                throw err;
            }
            if (existing.status === 'cancelled') {
                const err = new Error('Cancelled sales cannot be returned');
                err.statusCode = 409;
                throw err;
            }

            const branchId = auth.branchId || existing.branchId || existing.branch_id || body.branchId || body.branch_id || null;
            if (!branchId) {
                const err = new Error('Branch is required to return sale items');
                err.statusCode = 400;
                throw err;
            }

            const soldLines = (existing.items || []).map(normalizeSaleLine);
            const soldByKey = new Map();
            for (const line of soldLines) {
                soldByKey.set(saleLineKey(line), line);
            }

            const alreadyReturned = new Map();
            for (const returned of existing.returned_items || existing.returnedItems || []) {
                const key = saleLineKey(returned);
                alreadyReturned.set(key, (alreadyReturned.get(key) || 0) + Number(returned.quantity || returned.qty || 0));
            }

            const now = new Date();
            const returnDocs = [];
            for (const requestLine of requestedItems) {
                const normalizedRequest = normalizeSaleLine(requestLine);
                const matchingLine = soldByKey.get(saleLineKey(normalizedRequest))
                    || soldLines.find((line) =>
                        String(line.itemId || '') === String(normalizedRequest.itemId || '')
                        && String(line.batchCode || '') === String(normalizedRequest.batchCode || '')
                    );

                if (!matchingLine) {
                    const err = new Error(`Returned item was not found on sale: ${normalizedRequest.itemId || normalizedRequest.item_name || 'unknown'}`);
                    err.statusCode = 400;
                    throw err;
                }

                const key = saleLineKey(matchingLine);
                const returnQty = Number(requestLine.quantity ?? requestLine.qty ?? 0);
                const soldQty = Number(matchingLine.quantity || 0);
                const previousQty = alreadyReturned.get(key) || 0;
                if (!Number.isFinite(returnQty) || returnQty <= 0 || previousQty + returnQty > soldQty) {
                    const err = new Error(`Invalid return quantity for ${matchingLine.item_name || matchingLine.itemId || 'item'}`);
                    err.statusCode = 400;
                    throw err;
                }

                await restoreStock(db, auth, branchId, matchingLine, returnQty, now, querySession, {
                    saleId: existing._id,
                    invoiceNo: existing.invoiceNo || existing.invoice_no,
                    movementType: 'sale_return_restore'
                });
                alreadyReturned.set(key, previousQty + returnQty);

                returnDocs.push({
                    orgId: auth.orgId,
                    branchId,
                    branch_id: branchId,
                    saleId: String(existing._id),
                    sale_id: String(existing._id),
                    invoiceNo: existing.invoiceNo || existing.invoice_no || null,
                    invoice_no: existing.invoice_no || existing.invoiceNo || null,
                    saleItemId: key,
                    sale_item_id: key,
                    itemId: matchingLine.itemId,
                    item_id: matchingLine.itemId,
                    stockId: matchingLine.stockId,
                    stock_id: matchingLine.stockId,
                    batchCode: matchingLine.batchCode,
                    batch_code: matchingLine.batchCode,
                    item_name: matchingLine.item_name || null,
                    quantity: returnQty,
                    unitPrice: Number(matchingLine.unitPrice || matchingLine.unit_price || 0),
                    unit_price: Number(matchingLine.unit_price || matchingLine.unitPrice || 0),
                    reason: body.reason || body.returnReason || body.return_reason || null,
                    createdAt: now,
                    created_at: now,
                    createdBy: auth.userId,
                    updatedAt: now,
                    updated_at: now,
                    updatedBy: auth.userId,
                    version: 1,
                    deletedAt: null
                });
            }

            if (returnDocs.length) {
                await db.collection('returned_items').insertMany(returnDocs, { session: querySession });
            }

            const totalSoldQty = soldLines.reduce((sum, line) => sum + Number(line.quantity || 0), 0);
            const totalReturnedQty = Array.from(alreadyReturned.values()).reduce((sum, qty) => sum + Number(qty || 0), 0);
            const status = totalReturnedQty >= totalSoldQty ? 'returned' : 'partially_returned';
            const returnedItems = [...(existing.returned_items || existing.returnedItems || []), ...returnDocs];
            const updateDoc = {
                returned_items: returnedItems,
                returnedItems,
                returnReason: body.reason || body.returnReason || body.return_reason || null,
                return_reason: body.reason || body.returnReason || body.return_reason || null,
                status,
                updatedAt: now,
                updated_at: now,
                updatedBy: auth.userId,
                version: (existing.version || 1) + 1
            };

            await db.collection('sales').updateOne(
                { _id: existing._id, orgId: auth.orgId },
                { $set: updateDoc },
                { session: querySession }
            );
            sale = { ...existing, ...updateDoc };
        };

        await session.withTransaction(executeReturnSaleItems);
    } finally {
        if (session) await session.endSession();
    }

    await publishDomainEvent({
        event: 'sales.returned',
        orgId: auth.orgId,
        branchId: sale.branchId || sale.branch_id || auth.branchId || null,
        entity: 'sales',
        entityId: String(sale._id),
        operation: 'update',
        version: sale.version,
        changedBy: auth.userId
    });
    await publishDomainEvent({
        event: 'stock_batches.updated',
        orgId: auth.orgId,
        branchId: sale.branchId || sale.branch_id || auth.branchId || null,
        entity: 'stock_batches',
        operation: 'update',
        changedBy: auth.userId
    });
    await publishDomainEvent({
        event: 'returned_items.created',
        orgId: auth.orgId,
        branchId: sale.branchId || sale.branch_id || auth.branchId || null,
        entity: 'returned_items',
        operation: 'create',
        changedBy: auth.userId
    });
    await publishDomainEvent({
        event: 'inventory_units.updated',
        orgId: auth.orgId,
        branchId: sale.branchId || sale.branch_id || auth.branchId || null,
        entity: 'inventory_units',
        operation: 'update',
        changedBy: auth.userId
    });
    await publishDomainEvent({
        event: 'stock_movements.created',
        orgId: auth.orgId,
        branchId: sale.branchId || sale.branch_id || auth.branchId || null,
        entity: 'stock_movements',
        operation: 'create',
        changedBy: auth.userId
    });

    return sale;
}

module.exports = {
    generateInvoiceNo,
    createSale,
    completeHeldSale,
    cancelSale,
    returnSaleItems
};
