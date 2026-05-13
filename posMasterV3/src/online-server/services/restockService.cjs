const { getDb, getMongoClient, supportsTransactions } = require('../db/mongo.cjs');
const { publishDomainEvent } = require('./domainEvents.cjs');
const { normalizeUomSymbol, getEffectiveSellingPrice } = require('../utils/uomPricing.cjs');

function assertTransactionSupport() {
    if (!supportsTransactions()) {
        const err = new Error('MongoDB transactions are required for restock mutations. Use MongoDB Atlas or a replica-set MongoDB deployment.');
        err.statusCode = 503;
        throw err;
    }
}

function assertFiniteNumber(value, label, { positive = false } = {}) {
    if (!Number.isFinite(value) || (positive ? value <= 0 : value < 0)) {
        const err = new Error(`${label} must be a ${positive ? 'positive' : 'non-negative'} number`);
        err.statusCode = 400;
        throw err;
    }
}

async function createRestock(auth, restockInput = {}) {
    const db = getDb();
    const now = new Date();
    const branchId = auth.branchId || restockInput.branchId || restockInput.branch_id || null;

    if (!branchId) {
        const err = new Error('Branch is required to create a restock transaction');
        err.statusCode = 400;
        throw err;
    }

    const addedItems = (restockInput.added_items || []).map((item) => ({
        sku: item.sku || item.SKU || '',
        batchCode: item.batch_code || item.batchCode || '',
        uomSymbol: normalizeUomSymbol(item.uom_symbol || item.uomSymbol || item.uom?.symbol || ''),
        quantity: Number(item.qty || item.quantity || 0),
        stockPrice: Number(item.stock_price || item.stockPrice || 0),
        retailPrice: Number(item.retail_price || item.retailPrice || 0),
        sellingPricePerKg: Number(item.selling_price_per_kg || item.sellingPricePerKg || 0),
        sellingPricePerLiter: Number(item.selling_price_per_liter || item.sellingPricePerLiter || 0),
        expiryDate: item.exp_date || item.expiryDate || item.expiry_date || null
    })).map((item) => ({
        ...item,
        retailPrice: getEffectiveSellingPrice(item, item.uomSymbol) || item.retailPrice
    }));

    if (addedItems.length === 0) {
        const err = new Error('Restock must contain at least one added item');
        err.statusCode = 400;
        throw err;
    }

    for (const item of addedItems) {
        if (!item.sku || !item.batchCode) {
            const err = new Error(`Restock item is missing SKU or batch code: sku=${item.sku} batch=${item.batchCode}`);
            err.statusCode = 400;
            throw err;
        }
        assertFiniteNumber(item.quantity, `Quantity for SKU ${item.sku}`, { positive: true });
        assertFiniteNumber(item.stockPrice, `Stock price for SKU ${item.sku}`);
        assertFiniteNumber(item.retailPrice, `Retail price for SKU ${item.sku}`);
        assertFiniteNumber(item.sellingPricePerKg, `Selling price per kg for SKU ${item.sku}`);
        assertFiniteNumber(item.sellingPricePerLiter, `Selling price per liter for SKU ${item.sku}`);
    }

    // Build restock transaction document
    const restockDoc = {
        orgId: auth.orgId,
        branchId,
        branch_id: branchId,
        supplierId: restockInput.sup_id || restockInput.supplierId || restockInput.supplier_id || null,
        preparedBy: restockInput.prep_agent_id || restockInput.preparedBy || restockInput.prepared_by || null,
        authorizedBy: restockInput.auth_agent_id || restockInput.authorizedBy || restockInput.authorized_by || null,
        invoiceNo: restockInput.invoice_no || restockInput.invoiceNo || null,
        billNo: restockInput.bill_no || restockInput.billNo || null,
        paymentMethod: restockInput.payment_method || restockInput.paymentMethod || 'cash',
        expenses: Number(restockInput.expenses || 0),
        discount: Number(restockInput.discount || 0),
        cashAmount: Number(restockInput.cash_amount || restockInput.cashAmount || 0),
        changeAmount: Number(restockInput.change_amount || restockInput.changeAmount || 0),
        totalAmount: Number(restockInput.total_amount || restockInput.totalAmount || 0),
        executionLevel: restockInput.exe_level || restockInput.executionLevel || restockInput.execution_level || 'medium',
        status: restockInput.status || 'completed',
        addedItems,
        returnItems: (restockInput.return_items || []).map((item) => ({
            sku: item.sku || item.SKU || '',
            batchCode: item.batch_code || item.batchCode || '',
            quantity: Number(item.qty || item.quantity || 0),
            description: item.description || ''
        })),
        createdAt: now,
        updatedAt: now,
        createdBy: auth.userId,
        updatedBy: auth.userId,
        version: 1,
        deletedAt: null
    };

    let restock;

    assertTransactionSupport();
    const session = getMongoClient().startSession();
    try {
        await session.withTransaction(async () => {
            restock = await executeRestock(db, auth, restockDoc, addedItems, branchId, now, session);
        });
    } finally {
        await session.endSession();
    }

    await publishDomainEvent({
        event: 'restock_transactions.created',
        orgId: auth.orgId,
        branchId,
        entity: 'restock_transactions',
        entityId: String(restock._id),
        operation: 'create',
        version: restock.version,
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

    return restock;
}

async function executeRestock(db, auth, restockDoc, addedItems, branchId, now, session = null) {
    // Insert restock transaction
    const insertResult = await db.collection('restock_transactions').insertOne(restockDoc, session ? { session } : {});
    const restock = { ...restockDoc, _id: insertResult.insertedId };

    // Upsert stock batches for each added item
    for (const item of addedItems) {
        // Find the item by SKU to get its MongoDB _id
        const product = await db.collection('items').findOne(
            { orgId: auth.orgId, sku: item.sku, deletedAt: null },
            session ? { session, projection: { _id: 1, sku: 1 } } : { projection: { _id: 1, sku: 1 } }
        );

        const itemId = product?._id ? String(product._id) : null;

        const identityClauses = [
            { sku: item.sku, batchCode: item.batchCode },
            { sku: item.sku, batch_code: item.batchCode }
        ];
        if (itemId) {
            identityClauses.push(
                { itemId, batchCode: item.batchCode },
                { item_id: itemId, batch_code: item.batchCode },
                { itemId, batch_code: item.batchCode },
                { item_id: itemId, batchCode: item.batchCode }
            );
        }

        const batchFilter = {
            orgId: auth.orgId,
            deletedAt: null,
            $and: [
                { $or: [{ branchId }, { branch_id: branchId }] },
                { $or: identityClauses }
            ]
        };

        const existing = await db.collection('stock_batches').findOne(batchFilter, session ? { session } : {});

        if (existing) {
            // Update existing stock batch - increment quantity, update prices
            await db.collection('stock_batches').updateOne(
                { _id: existing._id },
                {
                    $inc: { quantity: item.quantity, version: 1 },
                    $set: {
                        stockPrice: item.stockPrice,
                        stock_price: item.stockPrice,
                        retailPrice: item.retailPrice,
                        retail_price: item.retailPrice,
                        sellingPricePerKg: item.sellingPricePerKg,
                        selling_price_per_kg: item.sellingPricePerKg,
                        sellingPricePerLiter: item.sellingPricePerLiter,
                        selling_price_per_liter: item.sellingPricePerLiter,
                        uomSymbol: item.uomSymbol,
                        uom_symbol: item.uomSymbol,
                        expiryDate: item.expiryDate,
                        expiry_date: item.expiryDate,
                        branch_id: branchId,
                        updatedAt: now,
                        updatedBy: auth.userId
                    }
                },
                session ? { session } : {}
            );
        } else {
            // Create new stock batch
            const newBatch = {
                orgId: auth.orgId,
                branchId,
                branch_id: branchId,
                itemId: itemId || null,
                item_id: itemId || null,
                sku: item.sku,
                batchCode: item.batchCode,
                batch_code: item.batchCode,
                quantity: item.quantity,
                stockPrice: item.stockPrice,
                stock_price: item.stockPrice,
                retailPrice: item.retailPrice,
                retail_price: item.retailPrice,
                sellingPricePerKg: item.sellingPricePerKg,
                selling_price_per_kg: item.sellingPricePerKg,
                sellingPricePerLiter: item.sellingPricePerLiter,
                selling_price_per_liter: item.sellingPricePerLiter,
                uomSymbol: item.uomSymbol,
                uom_symbol: item.uomSymbol,
                expiryDate: item.expiryDate,
                expiry_date: item.expiryDate,
                thresholdLimit: 0,
                threshold_limit: 0,
                availability: true,
                createdAt: now,
                updatedAt: now,
                createdBy: auth.userId,
                updatedBy: auth.userId,
                version: 1,
                deletedAt: null
            };
            await db.collection('stock_batches').insertOne(newBatch, session ? { session } : {});
        }
    }

    return restock;
}

module.exports = {
    createRestock
};
