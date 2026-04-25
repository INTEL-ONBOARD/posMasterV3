const { ObjectId } = require('mongodb');
const { getDb, getMongoClient, supportsTransactions } = require('../db/mongo.cjs');
const { publishDomainEvent } = require('./domainEvents.cjs');

function dateKey(date = new Date()) {
    return date.toISOString().slice(0, 10).replaceAll('-', '');
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

async function generateInvoiceNo(auth, type = 'SALE') {
    if (!auth.branchId) {
        const err = new Error('Branch is required to generate an invoice number');
        err.statusCode = 400;
        throw err;
    }
    const invoiceNo = await nextInvoiceNo(getDb(), null, auth, type);
    return {
        invoice_no: invoiceNo,
        invoiceNo
    };
}

async function createSale(auth, saleInput) {
    if (!supportsTransactions()) {
        const err = new Error('MongoDB transactions are required for sales. Use MongoDB Atlas or a replica set.');
        err.statusCode = 503;
        err.code = 'TRANSACTIONS_REQUIRED';
        throw err;
    }

    if (!auth.branchId && !saleInput.branchId) {
        const err = new Error('Branch is required to create a sale');
        err.statusCode = 400;
        throw err;
    }

    const db = getDb();
    const session = getMongoClient().startSession();
    const branchId = saleInput.branchId || auth.branchId;
    let sale;

    try {
        await session.withTransaction(async () => {
            const invoiceNo = saleInput.invoiceNo || await nextInvoiceNo(db, session, { ...auth, branchId });
            const now = new Date();
            const lines = (saleInput.items || []).map((line) => {
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
            });

            for (const line of lines) {
                if (!line.itemId || !line.batchCode) {
                    const err = new Error(`Sale line is missing item or batch identity: item ${line.itemId || 'undefined'} / batch ${line.batchCode || 'undefined'}`);
                    err.statusCode = 400;
                    throw err;
                }

                const result = await db.collection('stock_batches').updateOne(
                    {
                        orgId: auth.orgId,
                        branchId,
                        itemId: line.itemId,
                        batchCode: line.batchCode,
                        quantity: { $gte: Number(line.quantity) },
                        deletedAt: null
                    },
                    {
                        $inc: { quantity: -Number(line.quantity), version: 1 },
                        $set: { updatedAt: now, updatedBy: auth.userId }
                    },
                    { session }
                );

                if (result.modifiedCount !== 1) {
                    const err = new Error(`Insufficient stock for item ${line.itemId} / batch ${line.batchCode}`);
                    err.statusCode = 409;
                    throw err;
                }
            }

            sale = {
                orgId: auth.orgId,
                branchId,
                invoiceNo,
                memberId: saleInput.memberId || null,
                paymentMethod: saleInput.paymentMethod || 'cash',
                subtotal: Number(saleInput.subtotal || 0),
                discount: Number(saleInput.discount || 0),
                totalAmount: Number(saleInput.totalAmount || 0),
                items: lines,
                createdAt: now,
                updatedAt: now,
                createdBy: auth.userId,
                updatedBy: auth.userId,
                version: 1,
                deletedAt: null
            };

            const insert = await db.collection('sales').insertOne(sale, { session });
            sale._id = insert.insertedId;
        });
    } finally {
        await session.endSession();
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

    await publishDomainEvent({
        event: 'stock_batches.updated',
        orgId: auth.orgId,
        branchId,
        entity: 'stock_batches',
        operation: 'update',
        changedBy: auth.userId
    });

    return sale;
}

async function completeHeldSale(auth, saleId, updateData = {}) {
    if (!supportsTransactions()) {
        const err = new Error('MongoDB transactions are required for sales. Use MongoDB Atlas or a replica set.');
        err.statusCode = 503;
        err.code = 'TRANSACTIONS_REQUIRED';
        throw err;
    }

    const db = getDb();
    const session = getMongoClient().startSession();
    const saleObjectId = ObjectId.isValid(saleId) ? new ObjectId(saleId) : saleId;
    let sale;

    try {
        await session.withTransaction(async () => {
            const existing = await db.collection('sales').findOne({
                _id: saleObjectId,
                orgId: auth.orgId,
                deletedAt: null
            }, { session });

            if (!existing) {
                const err = new Error('Held sale not found');
                err.statusCode = 404;
                throw err;
            }

            const branchId = updateData.branchId || existing.branchId || auth.branchId;
            const now = new Date();
            const lines = (updateData.items || existing.items || []).map((line) => {
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
            });

            for (const line of lines) {
                if (!line.itemId || !line.batchCode) {
                    const err = new Error(`Sale line is missing item or batch identity: item ${line.itemId || 'undefined'} / batch ${line.batchCode || 'undefined'}`);
                    err.statusCode = 400;
                    throw err;
                }

                const result = await db.collection('stock_batches').updateOne(
                    {
                        orgId: auth.orgId,
                        branchId,
                        itemId: line.itemId,
                        batchCode: line.batchCode,
                        quantity: { $gte: Number(line.quantity) },
                        deletedAt: null
                    },
                    {
                        $inc: { quantity: -Number(line.quantity), version: 1 },
                        $set: { updatedAt: now, updatedBy: auth.userId }
                    },
                    { session }
                );

                if (result.modifiedCount !== 1) {
                    const err = new Error(`Insufficient stock for item ${line.itemId} / batch ${line.batchCode}`);
                    err.statusCode = 409;
                    throw err;
                }
            }

            const updateDoc = {
                is_held: false,
                isHeld: false,
                status: updateData.status || existing.status || 'completed',
                memberId: updateData.memberId ?? updateData.member_id ?? existing.memberId ?? null,
                paymentMethod: updateData.paymentMethod || updateData.payment_method || existing.paymentMethod || 'cash',
                subtotal: Number(updateData.subtotal ?? existing.subtotal ?? 0),
                discount: Number(updateData.discount ?? existing.discount ?? 0),
                totalAmount: Number(updateData.totalAmount ?? updateData.total_amount ?? existing.totalAmount ?? 0),
                cashReceived: Number(updateData.cashReceived ?? updateData.cash_received ?? existing.cashReceived ?? 0),
                changeAmount: Number(updateData.changeAmount ?? updateData.change_amount ?? existing.changeAmount ?? 0),
                items: lines,
                updatedAt: now,
                updatedBy: auth.userId,
                version: (existing.version || 1) + 1
            };

            await db.collection('sales').updateOne(
                { _id: existing._id, orgId: auth.orgId },
                { $set: updateDoc },
                { session }
            );

            sale = {
                ...existing,
                ...updateDoc,
                _id: existing._id
            };
        });
    } finally {
        await session.endSession();
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

    return sale;
}

module.exports = {
    generateInvoiceNo,
    createSale,
    completeHeldSale
};
