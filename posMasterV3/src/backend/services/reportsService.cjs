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

function formatDateKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function normalizeCustomerType(value) {
    const text = String(value || '').trim().toLowerCase();
    if (!text) return 'member';
    if (text.includes('staff') || text.includes('employee') || text.includes('worker')) return 'staff';
    if (text.includes('guest') || text.includes('walk')) return 'guest';
    if (text.includes('member') || ['regular', 'vip', 'wholesale', 'tea_coop'].includes(text)) return 'member';
    return 'member';
}

function normalizeB5CustomerType(transaction = {}, memberRecord = null) {
    const explicitType =
        transaction.customer_type ??
        transaction.customerType ??
        transaction.type ??
        transaction.member_type ??
        transaction.memberType ??
        memberRecord?.member_type ??
        memberRecord?.memberType ??
        '';

    const text = String(explicitType || '').trim().toLowerCase();
    if (text.includes('staff') || text.includes('employee') || text.includes('worker')) return 'staff';
    if (text.includes('guest') || text.includes('walk')) return 'guest';
    if (text.includes('member') || ['regular', 'vip', 'wholesale', 'tea_coop'].includes(text)) return 'member';

    if (transaction.is_staff || transaction.isStaff || transaction.staff_id || transaction.staffId) {
        return 'staff';
    }

    if (memberRecord?.is_staff || memberRecord?.isStaff) {
        return 'staff';
    }

    if (transaction.member_id || transaction.memberId || transaction.member_no || transaction.memberNo || memberRecord) {
        return 'member';
    }

    return 'staff';
}

function normalizeB5DurationBucket(value) {
    const text = String(value || '').trim().toLowerCase();
    if (!text) return 'long-term';

    const monthMatch = text.match(/(\d+)\s*(?:months?|mos?)/i);
    if (monthMatch) {
        const months = Number(monthMatch[1]);
        if (months <= 1) return 'monthly';
        if (months <= 3) return 'three-month';
        return 'long-term';
    }

    if (/^3$/.test(text) || /3\s*month/.test(text)) return 'three-month';
    if (/^1$/.test(text) || /monthly/.test(text) || /month/.test(text)) return 'monthly';
    return 'long-term';
}

function normalizeB5MemberRecord(member = {}) {
    const id = member.id ?? member._id ?? member.member_id ?? member.memberId ?? member.member_no ?? member.memberNo ?? null;

    return {
        ...member,
        id,
        _id: member._id ?? id,
        member_id: member.member_id ?? member.memberId ?? id,
        memberId: member.memberId ?? member.member_id ?? id,
        member_no: member.member_no ?? member.memberNo ?? '',
        memberNo: member.memberNo ?? member.member_no ?? '',
        full_name: member.full_name ?? member.fullName ?? member.member_name ?? member.memberName ?? member.name ?? '',
        fullName: member.fullName ?? member.full_name ?? member.member_name ?? member.memberName ?? member.name ?? '',
        member_type: member.member_type ?? member.memberType ?? member.customer_type ?? member.customerType ?? '',
        memberType: member.memberType ?? member.member_type ?? member.customer_type ?? member.customerType ?? '',
        is_staff: Boolean(
            member.is_staff ??
            member.isStaff ??
            /staff|employee|worker/i.test(String(member.member_type ?? member.memberType ?? member.customer_type ?? member.customerType ?? ''))
        )
    };
}

function buildB5MemberLookup(members = []) {
    const lookup = new Map();
    (Array.isArray(members) ? members : []).forEach((member) => {
        const normalized = normalizeB5MemberRecord(member);
        [
            normalized.id,
            normalized._id,
            normalized.member_id,
            normalized.memberId,
            normalized.member_no,
            normalized.memberNo
        ]
            .filter((value) => value !== undefined && value !== null && value !== '')
            .forEach((key) => lookup.set(String(key), normalized));
    });
    return lookup;
}

async function fetchB5MemberLookup(db, rows = []) {
    const keyValues = new Set();
    (Array.isArray(rows) ? rows : []).forEach((row) => {
        [
            row.memberId,
            row.member_id,
            row.memberNo,
            row.member_no
        ].forEach((value) => {
            if (value === undefined || value === null || value === '') return;
            keyValues.add(String(value));
        });
    });

    if (!keyValues.size) {
        return new Map();
    }

    const objectIds = [...keyValues].filter((value) => ObjectId.isValid(value)).map((value) => new ObjectId(value));
    const stringIds = [...keyValues].filter((value) => !ObjectId.isValid(value));

    const orClauses = [];
    if (objectIds.length) {
        orClauses.push({ _id: { $in: objectIds } });
    }
    if (stringIds.length) {
        orClauses.push({ id: { $in: stringIds } });
        orClauses.push({ member_id: { $in: stringIds } });
        orClauses.push({ member_no: { $in: stringIds } });
    }

    if (!orClauses.length) {
        return new Map();
    }

    const members = await db.collection('members').find({
        orgId: config.defaultOrgId,
        deletedAt: null,
        $or: orClauses
    }).project({
        _id: 1,
        id: 1,
        member_id: 1,
        memberId: 1,
        member_no: 1,
        memberNo: 1,
        full_name: 1,
        fullName: 1,
        member_name: 1,
        memberName: 1,
        name: 1,
        member_type: 1,
        memberType: 1,
        customer_type: 1,
        customerType: 1,
        is_staff: 1,
        isStaff: 1
    }).toArray();

    return buildB5MemberLookup(members);
}

async function fetchSalesB5Summary(db, range) {
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
                memberId: { $ifNull: ['$memberId', '$member_id'] },
                memberNo: { $ifNull: ['$memberNo', '$member_no'] },
                memberName: { $ifNull: ['$memberName', '$member_name'] },
                totalAmount: { $ifNull: ['$totalAmount', '$total_amount'] },
                paymentMethod: { $ifNull: ['$paymentMethod', '$payment_method'] },
                customerType: { $ifNull: ['$customer_type', { $ifNull: ['$customerType', { $ifNull: ['$transaction_type', '$type'] }] }] },
                creditDuration: { $ifNull: ['$credit_duration', { $ifNull: ['$creditDuration', { $ifNull: ['$duration', '$duration_label'] }] }] },
                isStaff: { $ifNull: ['$isStaff', '$is_staff'] },
                staffId: { $ifNull: ['$staffId', '$staff_id'] }
            }
        }
    ]).toArray();

    const memberLookup = await fetchB5MemberLookup(db, rows);

    return rows.reduce((summary, row) => {
        const amount = toNumber(row.totalAmount);
        const method = normalizePaymentMethod(row.paymentMethod);
        const memberRecordKeyCandidates = [row.memberId, row.memberNo].filter((value) => value !== undefined && value !== null && value !== '');
        const memberRecord = memberRecordKeyCandidates
            .map((value) => memberLookup.get(String(value)))
            .find(Boolean) || null;
        const customerType = normalizeB5CustomerType({
            ...row,
            member_type: row.customerType,
            is_staff: row.isStaff,
            staff_id: row.staffId
        }, memberRecord);
        const duration = normalizeB5DurationBucket(row.creditDuration);

        summary.totalSales += amount;

        if (method === 'credit') {
            summary.creditSales += amount;

            if (customerType === 'staff') {
                summary.staffCredit += amount;
            } else {
                summary.memberCredit += amount;
            }

            if (duration === 'three-month') {
                summary.threeMonthManure += amount;
            } else if (duration === 'monthly') {
                summary.monthlyManure += amount;
            } else if (duration === 'long-term') {
                summary.longTermCredit += amount;
            }
        } else {
            summary.cashSales += amount;
        }

        return summary;
    }, {
        totalSales: 0,
        cashSales: 0,
        creditSales: 0,
        memberCredit: 0,
        staffCredit: 0,
        threeMonthManure: 0,
        monthlyManure: 0,
        longTermCredit: 0
    });
}

function createB5Row({
    description,
    totalSales = 0,
    bop = 0,
    memberCredit = 0,
    staffCredit = 0,
    threeMonthManure = 0,
    monthlyManure = 0,
    longTermCredit = 0,
    creditTotal = 0,
    officeUse = null
}) {
    return {
        description,
        totalSales,
        bop,
        memberCredit,
        staffCredit,
        threeMonthManure,
        monthlyManure,
        longTermCredit,
        creditTotal,
        ...(officeUse ? { officeUse } : {})
    };
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

async function getTransactionB5Report(query = {}) {
    const db = getDb();
    const startDate = query?.startDate ?? query?.start_date ?? null;
    const endDate = query?.endDate ?? query?.end_date ?? null;
    const windows = buildComparisonWindows({ ...query, startDate, endDate });

    const [previousSales, currentSales, previousRestock, currentRestock, previousDisposal, currentDisposal] = await Promise.all([
        fetchSalesB5Summary(db, windows.previous),
        fetchSalesB5Summary(db, windows.current),
        fetchRestockSummary(db, windows.previous),
        fetchRestockSummary(db, windows.current),
        fetchDisposalSummary(db, windows.previous),
        fetchDisposalSummary(db, windows.current)
    ]);

    const currentDateKey = formatDateKey(windows.current.end || windows.current.start);
    const previousDateKey = formatDateKey(windows.previous.end || windows.previous.start);
    const previousClosingBalance = previousSales.totalSales;
    const currentClosingBalance = currentSales.totalSales;
    const currentCashMovement = currentSales.cashSales + currentSales.creditSales;
    const previousOutflowTotal = previousRestock.total + previousRestock.returnTotal + previousDisposal.total;
    const currentOutflowTotal = currentRestock.total + currentRestock.returnTotal + currentDisposal.total;

    const topTable = [
        createB5Row({
            description: 'Cash Sales',
            totalSales: currentSales.cashSales,
            bop: previousSales.cashSales,
            memberCredit: 0,
            staffCredit: 0,
            threeMonthManure: 0,
            monthlyManure: 0,
            longTermCredit: 0,
            creditTotal: currentSales.cashSales,
            officeUse: { type: 'label', value: 'received date' }
        }),
        createB5Row({
            description: 'Credit Collections',
            totalSales: currentSales.creditSales,
            bop: previousSales.creditSales,
            memberCredit: 0,
            staffCredit: 0,
            threeMonthManure: 0,
            monthlyManure: 0,
            longTermCredit: 0,
            creditTotal: currentSales.creditSales,
            officeUse: { type: 'label', value: 'inspected date' }
        }),
        createB5Row({
            description: 'Member Credit Sales',
            totalSales: currentSales.memberCredit,
            bop: previousSales.memberCredit,
            memberCredit: currentSales.memberCredit,
            staffCredit: 0,
            threeMonthManure: 0,
            monthlyManure: 0,
            longTermCredit: 0,
            creditTotal: currentSales.memberCredit,
            officeUse: { type: 'label', value: 'approved date' }
        }),
        createB5Row({
            description: 'Staff Credit Sales',
            totalSales: currentSales.staffCredit,
            bop: previousSales.staffCredit,
            memberCredit: 0,
            staffCredit: currentSales.staffCredit,
            threeMonthManure: 0,
            monthlyManure: 0,
            longTermCredit: 0,
            creditTotal: currentSales.staffCredit,
            officeUse: { type: 'center', value: 'After Inspection' }
        }),
        createB5Row({
            description: '3 Month Credit Sales',
            totalSales: currentSales.threeMonthManure,
            bop: previousSales.threeMonthManure,
            memberCredit: 0,
            staffCredit: 0,
            threeMonthManure: currentSales.threeMonthManure,
            monthlyManure: 0,
            longTermCredit: 0,
            creditTotal: currentSales.threeMonthManure
        }),
        createB5Row({
            description: 'Monthly Credit Sales',
            totalSales: currentSales.monthlyManure,
            bop: previousSales.monthlyManure,
            memberCredit: 0,
            staffCredit: 0,
            threeMonthManure: 0,
            monthlyManure: currentSales.monthlyManure,
            longTermCredit: 0,
            creditTotal: currentSales.monthlyManure
        }),
        createB5Row({
            description: 'Long-Term Credit Sales',
            totalSales: currentSales.longTermCredit,
            bop: previousSales.longTermCredit,
            memberCredit: 0,
            staffCredit: 0,
            threeMonthManure: 0,
            monthlyManure: 0,
            longTermCredit: currentSales.longTermCredit,
            creditTotal: currentSales.longTermCredit
        }),
        createB5Row({
            description: 'Total Sales for the Day',
            totalSales: currentSales.totalSales,
            bop: previousSales.totalSales,
            memberCredit: 0,
            staffCredit: 0,
            threeMonthManure: 0,
            monthlyManure: 0,
            longTermCredit: 0,
            creditTotal: currentSales.totalSales
        })
    ];

    const receivedRows = [
        {
            prevDay: previousSales.cashSales,
            description: 'Cash Sales Received',
            date: currentDateKey,
            todayTotal: currentSales.cashSales
        },
        {
            prevDay: previousSales.creditSales,
            description: 'Credit Collections Received',
            date: currentDateKey,
            todayTotal: currentSales.creditSales
        },
        {
            prevDay: previousSales.memberCredit,
            description: 'Member Credit Collections',
            date: currentDateKey,
            todayTotal: currentSales.memberCredit
        },
        {
            prevDay: previousSales.staffCredit,
            description: 'Staff Credit Collections',
            date: currentDateKey,
            todayTotal: currentSales.staffCredit
        },
        {
            prevDay: previousClosingBalance,
            description: 'Brought Forward Balance',
            date: '',
            todayTotal: currentClosingBalance
        },
        {
            prevDay: previousClosingBalance,
            description: 'Closing Balance',
            date: '',
            todayTotal: currentClosingBalance
        },
        {
            prevDay: previousSales.totalSales - previousSales.cashSales,
            description: 'Outstanding Credit Balance',
            date: '',
            todayTotal: currentClosingBalance - currentSales.cashSales
        },
        {
            prevDay: previousSales.cashSales,
            description: 'Total Receipts',
            date: '',
            todayTotal: currentCashMovement
        }
    ];

    const expensesRows = [
        {
            prevDay: previousRestock.total,
            invoice: 'Supplier Payments',
            description: 'Supplier Payments',
            date: currentDateKey,
            todayTotal: currentRestock.total
        },
        {
            prevDay: previousRestock.returnTotal,
            description: 'Supplier Return Adjustments',
            date: currentDateKey,
            todayTotal: currentRestock.returnTotal
        },
        {
            prevDay: previousDisposal.total,
            description: 'Disposed Stock Value',
            date: currentDateKey,
            todayTotal: currentDisposal.total
        },
        {
            prevDay: 0,
            description: 'Other Deductions',
            date: '',
            todayTotal: 0
        },
        {
            prevDay: previousOutflowTotal,
            description: 'Total Deductions',
            date: '',
            todayTotal: currentOutflowTotal
        },
        {
            prevDay: previousClosingBalance - previousOutflowTotal,
            description: 'Net Balance After Deductions',
            date: '',
            todayTotal: currentClosingBalance - currentOutflowTotal
        }
    ];

    const sumRows = (rows, field) => rows.reduce((sum, row) => sum + toNumber(row?.[field]), 0);

    const payload = {
        meta: {
            companyName: query?.companyName || 'Sample Cooperative Society',
            branchName: query?.branchName || 'Kotapola',
            reportTitle: query?.reportTitle || 'Sales Report (B5)',
            formNo: query?.formNo || '1120',
            reportDate: currentDateKey,
            preparedBy: query?.preparedBy || 'Accounts',
            currency: query?.currency || 'LKR',
            period: {
                current: {
                    startDate: formatDateKey(windows.current.start),
                    endDate: formatDateKey(windows.current.end)
                },
                previous: {
                    startDate: formatDateKey(windows.previous.start),
                    endDate: previousDateKey
                }
            }
        },
        topTable,
        receivedRows,
        expensesRows,
        totals: {
            topTable: {
                totalSales: currentSales.totalSales,
                cashSales: currentSales.cashSales,
                creditSales: currentSales.creditSales,
                memberCredit: currentSales.memberCredit,
                staffCredit: currentSales.staffCredit,
                threeMonthManure: currentSales.threeMonthManure,
                monthlyManure: currentSales.monthlyManure,
                longTermCredit: currentSales.longTermCredit
            },
            received: {
                prevDayTotal: sumRows(receivedRows, 'prevDay'),
                todayTotal: sumRows(receivedRows, 'todayTotal'),
                closingBalance: currentClosingBalance
            },
            expenses: {
                prevDayTotal: sumRows(expensesRows, 'prevDay'),
                todayTotal: sumRows(expensesRows, 'todayTotal'),
                previousClosingBalance,
                currentClosingBalance,
                previousOutflowTotal,
                currentOutflowTotal
            }
        }
    };

    return {
        success: true,
        status: 'success',
        data: payload
    };
}

module.exports = {
    getPettyCashReport,
    getTransactionB5Report
};
