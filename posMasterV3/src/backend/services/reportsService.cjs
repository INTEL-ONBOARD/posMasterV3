const { ObjectId } = require('mongodb');
const { getDb } = require('../../online-server/db/mongo.cjs');
const { config } = require('../../online-server/config.cjs');

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toDate(value) {
    if (!value) return null;
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date) {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
}

function endOfDay(date) {
    const result = new Date(date);
    result.setHours(23, 59, 59, 999);
    return result;
}

function getWindowLengthDays(query = {}) {
    const parsed = Number.parseInt(query.days, 10);
    return Math.max(Number.isFinite(parsed) ? parsed : 30, 1);
}

function buildComparisonWindows(query = {}) {
    const explicitStart = toDate(query.startDate);
    const explicitEnd = toDate(query.endDate);

    const currentEnd = endOfDay(explicitEnd || new Date());
    const currentStart = startOfDay(explicitStart || (() => {
        const start = new Date(currentEnd);
        start.setDate(start.getDate() - getWindowLengthDays(query));
        return start;
    })());

    const currentDays = Math.max(
        Math.round((currentEnd.getTime() - currentStart.getTime()) / (24 * 60 * 60 * 1000)),
        1
    );

    const previousEnd = new Date(currentStart.getTime() - 1);
    const previousStart = new Date(previousEnd);
    previousStart.setDate(previousStart.getDate() - currentDays);

    return {
        current: { start: currentStart, end: currentEnd },
        previous: { start: previousStart, end: previousEnd }
    };
}

function buildCreatedAtExpression() {
    return {
        $ifNull: [
            '$createdAt',
            {
                $cond: [
                    { $ne: ['$created_at', null] },
                    { $toDate: '$created_at' },
                    null
                ]
            }
        ]
    };
}

function buildRangeMatch(range) {
    return {
        effectiveCreatedAt: {
            $gte: range.start,
            $lte: range.end
        }
    };
}

function formatItem(desc, formNo, sub, previousValue, currentValue) {
    const prev = toNumber(previousValue);
    const curr = toNumber(currentValue);

    return {
        desc,
        formNo,
        sub,
        prevDay: prev,
        prevDayTotal: prev,
        currDayTotal: curr
    };
}

function normalizePaymentMethod(value) {
    const method = String(value || '').trim().toLowerCase();
    if (!method) return 'cash';
    if (method === 'cash' || method === 'credit') return method;
    return 'cash';
}

async function fetchRestockSummary(db, range) {
    const rows = await db.collection('restock_transactions').aggregate([
        {
            $addFields: {
                effectiveCreatedAt: buildCreatedAtExpression()
            }
        },
        {
            $match: {
                orgId: config.defaultOrgId,
                deletedAt: null,
                ...buildRangeMatch(range)
            }
        },
        {
            $project: {
                totalAmount: { $ifNull: ['$totalAmount', '$total_amount'] },
                returnItems: { $ifNull: ['$returnItems', '$return_items'] },
                paymentMethod: { $ifNull: ['$paymentMethod', '$payment_method'] }
            }
        }
    ]).toArray();

    return rows.reduce((summary, row) => {
        summary.total += toNumber(row.totalAmount);
        summary.returnTotal += (Array.isArray(row.returnItems) ? row.returnItems : []).reduce((sum, item) => {
            const quantity = toNumber(item.qty ?? item.quantity);
            const unitPrice = toNumber(
                item.stock_price ??
                item.stockPrice ??
                item.retail_price ??
                item.retailPrice ??
                item.price ??
                item.unit_price ??
                item.unitPrice
            );
            return sum + quantity * unitPrice;
        }, 0);
        return summary;
    }, { total: 0, returnTotal: 0 });
}

async function fetchSalesSummary(db, range) {
    const rows = await db.collection('sales').aggregate([
        {
            $addFields: {
                effectiveCreatedAt: buildCreatedAtExpression()
            }
        },
        {
            $match: {
                orgId: config.defaultOrgId,
                deletedAt: null,
                ...buildRangeMatch(range),
                $or: [
                    { is_held: { $ne: true } },
                    { isHeld: { $ne: true } },
                    { status: { $ne: 'held' } }
                ]
            }
        },
        {
            $project: {
                totalAmount: { $ifNull: ['$totalAmount', '$total_amount'] },
                paymentMethod: { $ifNull: ['$paymentMethod', '$payment_method'] }
            }
        }
    ]).toArray();

    return rows.reduce((summary, row) => {
        const amount = toNumber(row.totalAmount);
        const method = normalizePaymentMethod(row.paymentMethod);

        if (method === 'credit') {
            summary.credit += amount;
        } else {
            summary.cash += amount;
        }

        summary.total += amount;
        return summary;
    }, { cash: 0, credit: 0, total: 0 });
}

async function fetchDisposalSummary(db, range) {
    const rows = await db.collection('disposed_items').aggregate([
        {
            $addFields: {
                effectiveCreatedAt: buildCreatedAtExpression()
            }
        },
        {
            $match: {
                orgId: config.defaultOrgId,
                deletedAt: null,
                ...buildRangeMatch(range)
            }
        },
        {
            $project: {
                stockId: { $ifNull: ['$stockId', '$stock_id'] },
                quantity: { $ifNull: ['$quantity', '$qty'] }
            }
        }
    ]).toArray();

    const stockIdList = [...new Set(rows.map((row) => row.stockId).filter(Boolean))];
    const stockIds = stockIdList
        .map((id) => (ObjectId.isValid(String(id)) ? new ObjectId(String(id)) : null))
        .filter(Boolean);

    const stockDocs = stockIds.length
        ? await db.collection('stock_batches').find({
            orgId: config.defaultOrgId,
            deletedAt: null,
            _id: { $in: stockIds }
        }).project({
            _id: 1,
            stock_price: 1,
            stockPrice: 1,
            retail_price: 1,
            retailPrice: 1
        }).toArray()
        : [];

    const stockLookup = new Map(stockDocs.map((doc) => [String(doc._id), doc]));

    const total = rows.reduce((sum, row) => {
        const stock = stockLookup.get(String(row.stockId));
        const unitPrice = toNumber(stock?.stock_price ?? stock?.stockPrice ?? stock?.retail_price ?? stock?.retailPrice);
        return sum + (toNumber(row.quantity) * unitPrice);
    }, 0);

    return { total };
}

async function getPettyCashReport(query = {}) {
    const db = getDb();
    const startDate = query?.startDate ?? query?.start_date ?? null;
    const endDate = query?.endDate ?? query?.end_date ?? null;
    const windows = buildComparisonWindows({ ...query, startDate, endDate });

    const [restockPrevious, restockCurrent, salesPrevious, salesCurrent, disposalPrevious, disposalCurrent] = await Promise.all([
        fetchRestockSummary(db, windows.previous),
        fetchRestockSummary(db, windows.current),
        fetchSalesSummary(db, windows.previous),
        fetchSalesSummary(db, windows.current),
        fetchDisposalSummary(db, windows.previous),
        fetchDisposalSummary(db, windows.current)
    ]);

    const report = [
        {
            title: 'Price increases',
            subsections: [
                {
                    title: 'Section 1',
                    items: [
                        formatItem('Supplier restocks', 'P01', '01', restockPrevious.total, restockCurrent.total),
                        formatItem('Supplier returns', 'P01', '02', restockPrevious.returnTotal, restockCurrent.returnTotal)
                    ]
                },
                {
                    title: 'Section 2',
                    items: [
                        formatItem('Other increases', 'P02', '01', 0, 0)
                    ]
                }
            ]
        },
        {
            title: 'Price deductions',
            subsections: [
                {
                    title: 'Section 3',
                    items: [
                        formatItem('Cash sales', 'D01', '01', salesPrevious.cash, salesCurrent.cash),
                        formatItem('Credit sales', 'D01', '02', salesPrevious.credit, salesCurrent.credit)
                    ]
                },
                {
                    title: 'Section 4',
                    items: [
                        formatItem('Disposed stock', 'D02', '01', disposalPrevious.total, disposalCurrent.total),
                        formatItem('Other deductions', 'D02', '02', 0, 0)
                    ]
                }
            ]
        }
    ];

    return {
        success: true,
        status: 'success',
        data: report,
        meta: {
            period: {
                current: windows.current,
                previous: windows.previous
            },
            totals: {
                restockCurrent: restockCurrent.total,
                restockPrevious: restockPrevious.total,
                restockReturnsCurrent: restockCurrent.returnTotal,
                restockReturnsPrevious: restockPrevious.returnTotal,
                cashSalesCurrent: salesCurrent.cash,
                cashSalesPrevious: salesPrevious.cash,
                creditSalesCurrent: salesCurrent.credit,
                creditSalesPrevious: salesPrevious.credit,
                disposalCurrent: disposalCurrent.total,
                disposalPrevious: disposalPrevious.total
            }
        }
    };
}

module.exports = {
    getPettyCashReport
};
