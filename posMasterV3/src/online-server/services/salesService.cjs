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
            const lines = saleInput.items || [];

            for (const line of lines) {
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

module.exports = {
    generateInvoiceNo,
    createSale
};
