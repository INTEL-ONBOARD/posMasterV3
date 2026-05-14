#!/usr/bin/env node

require('dotenv').config({ path: '.env.online' });
require('dotenv').config({ path: '.env', override: false });

const { connectMongo, closeMongo } = require('../src/online-server/db/mongo.cjs');
const {
    createUnitsForRestock,
    isUnitTracked,
    writeStockMovement
} = require('../src/online-server/services/inventoryTrackingService.cjs');
const { config } = require('../src/online-server/config.cjs');

const apply = process.argv.includes('--apply');

async function main() {
    const db = await connectMongo();
    const now = new Date();
    const auth = {
        orgId: config.defaultOrgId,
        userId: 'inventory-unit-backfill'
    };

    const unitTrackedItems = await db.collection('items')
        .find({
            orgId: auth.orgId,
            deletedAt: null,
            $or: [
                { tracking_mode: 'unit' },
                { trackingMode: 'unit' }
            ]
        })
        .project({ _id: 1, sku: 1, tracking_mode: 1, trackingMode: 1 })
        .toArray();

    let planned = 0;
    let created = 0;

    for (const item of unitTrackedItems) {
        if (!isUnitTracked(item)) continue;

        const stocks = await db.collection('stock_batches')
            .find({
                orgId: auth.orgId,
                deletedAt: null,
                sku: item.sku,
                quantity: { $gt: 0 }
            })
            .toArray();

        for (const stockBatch of stocks) {
            const stockBatchId = String(stockBatch._id);
            const existingUnits = await db.collection('inventory_units').countDocuments({
                orgId: auth.orgId,
                deletedAt: null,
                $or: [
                    { stockBatchId: stockBatchId },
                    { stock_batch_id: stockBatchId }
                ]
            });
            const missingCount = Math.max(Number(stockBatch.quantity || 0) - existingUnits, 0);
            if (!missingCount) continue;
            planned += missingCount;

            const branchId = stockBatch.branchId || stockBatch.branch_id || null;
            if (!branchId) {
                console.warn(`[backfill:inventory-units] skipped ${item.sku} ${stockBatchId}: missing branch`);
                continue;
            }

            console.log(`[backfill:inventory-units] ${apply ? 'creating' : 'would create'} ${missingCount} units for ${item.sku} / ${stockBatch.batchCode || stockBatch.batch_code || stockBatchId}`);
            if (!apply) continue;

            const units = await createUnitsForRestock(db, auth, {
                item,
                stockBatch,
                restock: { _id: `backfill:${stockBatchId}` },
                restockItem: {
                    sku: item.sku,
                    batchCode: stockBatch.batchCode || stockBatch.batch_code || null,
                    quantity: missingCount
                },
                branchId,
                now
            });
            created += units.length;

            await writeStockMovement(db, auth, {
                movementType: 'inventory_unit_backfill',
                movement_type: 'inventory_unit_backfill',
                direction: 'in',
                branchId,
                itemId: String(item._id),
                item_id: String(item._id),
                stockBatchId,
                stock_batch_id: stockBatchId,
                sku: item.sku,
                batchCode: stockBatch.batchCode || stockBatch.batch_code || null,
                batch_code: stockBatch.batch_code || stockBatch.batchCode || null,
                quantity: missingCount,
                unitCount: units.length,
                unit_count: units.length,
                unitCodes: units.map((unit) => unit.unitCode),
                unit_codes: units.map((unit) => unit.unitCode),
                referenceType: 'inventory_unit_backfill',
                reference_type: 'inventory_unit_backfill',
                referenceId: stockBatchId,
                reference_id: stockBatchId
            });
        }
    }

    console.log(`[backfill:inventory-units] ${apply ? 'created' : 'planned'} ${apply ? created : planned} unit records`);
    if (!apply && planned > 0) {
        console.log('[backfill:inventory-units] rerun with --apply to write records');
    }
}

main()
    .catch((error) => {
        console.error('[backfill:inventory-units] failed', error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await closeMongo();
    });
