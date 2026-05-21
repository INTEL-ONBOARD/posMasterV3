const { config } = require('../config.cjs');
const { getDb } = require('../db/mongo.cjs');
const { publishDomainEvent } = require('./domainEvents.cjs');

let cachedAuthToken = null;
let cachedAuthTokenExpiresAt = 0;

function requireTeaCoopConfig() {
    if (!config.teaCoopApiUrl) {
        const error = new Error('Tea Coop API is not configured. Set TEA_COOP_API_URL before syncing.');
        error.statusCode = 503;
        error.code = 'TEA_COOP_NOT_CONFIGURED';
        throw error;
    }
}

function buildTeaCoopUrl(path, query = {}, params = {}) {
    const base = String(config.teaCoopApiUrl || '').replace(/\/+$/, '');
    const resolvedPath = String(path || '').replace(/\{(\w+)\}/g, (_, key) => {
        const value = params[key];
        return value === undefined || value === null ? '' : encodeURIComponent(String(value));
    });
    const suffix = resolvedPath.startsWith('/') ? resolvedPath : `/${resolvedPath}`;
    const url = new URL(`${base}${suffix}`);
    for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null && value !== '') {
            url.searchParams.set(key, value);
        }
    }
    return url;
}

function parseJson(text) {
    if (!text) return null;
    try {
        return JSON.parse(text);
    } catch {
        return { raw: text };
    }
}

function extractAuthToken(payload) {
    return payload?.token
        || payload?.accessToken
        || payload?.access_token
        || payload?.data?.token
        || payload?.data?.accessToken
        || payload?.data?.access_token
        || null;
}

async function getTeaCoopAuthToken() {
    if (config.teaCoopApiToken) return config.teaCoopApiToken;
    if (!config.teaCoopUsername || !config.teaCoopPassword) return null;

    const now = Date.now();
    if (cachedAuthToken && now < cachedAuthTokenExpiresAt) {
        return cachedAuthToken;
    }

    const response = await fetch(buildTeaCoopUrl(config.teaCoopAuthPath), {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: config.teaCoopUsername,
            password: config.teaCoopPassword
        })
    });
    const payload = parseJson(await response.text());
    if (!response.ok) {
        const message = payload?.message || payload?.error || `Tea Coop login failed: ${response.status}`;
        const error = new Error(message);
        error.statusCode = response.status;
        error.payload = payload;
        throw error;
    }

    const token = extractAuthToken(payload);
    if (!token) {
        const error = new Error('Tea Coop login did not return an access token');
        error.statusCode = 502;
        error.payload = payload;
        throw error;
    }

    cachedAuthToken = token;
    cachedAuthTokenExpiresAt = now + (55 * 60 * 1000);
    return cachedAuthToken;
}

async function fetchTeaCoopJson(path, query = {}, params = {}) {
    requireTeaCoopConfig();
    const headers = {
        Accept: 'application/json'
    };
    const token = await getTeaCoopAuthToken();
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(buildTeaCoopUrl(path, query, params), { headers });
    const text = await response.text();
    const payload = parseJson(text);
    if (!response.ok) {
        const message = payload?.message || payload?.error || `Tea Coop API request failed: ${response.status}`;
        const error = new Error(message);
        error.statusCode = response.status;
        error.payload = payload;
        throw error;
    }
    return payload;
}

function extractRecords(payload, keys) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    for (const key of keys) {
        if (Array.isArray(payload?.[key])) return payload[key];
        if (Array.isArray(payload?.data?.[key])) return payload.data[key];
    }
    return [];
}

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function firstValue(source, keys, fallback = null) {
    for (const key of keys) {
        const value = source?.[key];
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return fallback;
}

function normalizeApiMember(raw) {
    if (!raw?.member && !raw?.totals) return raw;
    const member = raw.member || {};
    const totals = raw.totals || {};
    return {
        ...raw,
        member_id: member.memberNumber,
        memberId: member.memberNumber,
        member_no: member.memberNumber,
        memberNo: member.memberNumber,
        full_name: member.nameWithInitials,
        fullName: member.nameWithInitials,
        name: member.nameWithInitials,
        contact: member.phoneNumber,
        phone: member.phoneNumber,
        memberType: member.memberType,
        status: member.status,
        lineName: member.lineName,
        green_leaf_value: totals.greenLeafValue,
        greenLeafValue: totals.greenLeafValue,
        additions: totals.additions,
        deductions: totals.deductions,
        loans: totals.loans,
        net_amount: totals.netAmount,
        netAmount: totals.netAmount
    };
}

function normalizeApiPayment(raw) {
    if (!raw?.totals) return raw;
    const totals = raw.totals || {};
    return {
        ...raw,
        green_leaf_value: totals.greenLeafValue,
        greenLeafValue: totals.greenLeafValue,
        additions: totals.additions,
        deductions: totals.deductions,
        loans: totals.loans,
        net_amount: totals.netAmount,
        netAmount: totals.netAmount
    };
}

function normalizeMember(raw, auth) {
    raw = normalizeApiMember(raw);
    const memberId = String(firstValue(raw, ['member_id', 'memberId', 'member_no', 'memberNo', 'id', '_id'], '')).trim();
    if (!memberId) return null;
    const memberNo = String(firstValue(raw, ['member_no', 'memberNo', 'member_id', 'memberId'], memberId)).trim();
    const fullName = String(firstValue(raw, ['full_name', 'fullName', 'name', 'member_name', 'memberName'], '')).trim();

    return {
        orgId: auth.orgId,
        org_id: auth.orgId,
        memberId,
        member_id: memberId,
        memberNo,
        member_no: memberNo,
        fullName,
        full_name: fullName,
        contact: firstValue(raw, ['contact', 'phone', 'phone_no', 'phoneNo', 'mobile'], ''),
        address: firstValue(raw, ['address', 'member_address', 'memberAddress'], ''),
        green_leaf_value: toNumber(firstValue(raw, ['green_leaf_value', 'greenLeafValue', 'greenLeaf'], 0)),
        additions: toNumber(firstValue(raw, ['additions', 'addition'], 0)),
        deductions: toNumber(firstValue(raw, ['deductions', 'deduction'], 0)),
        loans: toNumber(firstValue(raw, ['loans', 'loan'], 0)),
        net_amount: toNumber(firstValue(raw, ['net_amount', 'netAmount'], 0)),
        isActive: firstValue(raw, ['isActive', 'is_active', 'active'], true) !== false,
        is_active: firstValue(raw, ['isActive', 'is_active', 'active'], true) !== false,
        deletedAt: null,
        lastFetchedAt: new Date(),
        last_fetched_at: new Date(),
        syncStatus: 'synced',
        sync_status: 'synced',
        legacySource: 'tea_coop_api',
        updatedAt: new Date(),
        updated_at: new Date()
    };
}

function normalizePayment(raw, auth, explicitMemberId = null) {
    raw = normalizeApiPayment(raw);
    const memberId = String(explicitMemberId || firstValue(raw, ['member_id', 'memberId', 'member_no', 'memberNo'], '')).trim();
    if (!memberId) return null;

    const paymentDateValue = firstValue(raw, ['payment_date', 'paymentDate', 'date'], null);
    const paymentDate = paymentDateValue ? new Date(paymentDateValue) : null;
    const year = toNumber(firstValue(raw, ['year'], paymentDate?.getFullYear()), null);
    const month = toNumber(firstValue(raw, ['month'], paymentDate ? paymentDate.getMonth() + 1 : null), null);
    if (!year || !month) return null;

    return {
        orgId: auth.orgId,
        org_id: auth.orgId,
        memberId,
        member_id: memberId,
        year,
        month,
        green_leaf_value: toNumber(firstValue(raw, ['green_leaf_value', 'greenLeafValue', 'greenLeaf'], 0)),
        additions: toNumber(firstValue(raw, ['additions', 'addition'], 0)),
        deductions: toNumber(firstValue(raw, ['deductions', 'deduction'], 0)),
        loans: toNumber(firstValue(raw, ['loans', 'loan'], 0)),
        net_amount: toNumber(firstValue(raw, ['net_amount', 'netAmount', 'amount'], 0)),
        paymentDate,
        payment_date: paymentDate,
        factory_id: firstValue(raw, ['factory_id', 'factoryId'], null),
        deletedAt: null,
        lastFetchedAt: new Date(),
        last_fetched_at: new Date(),
        syncStatus: 'synced',
        sync_status: 'synced',
        legacySource: 'tea_coop_api',
        updatedAt: new Date(),
        updated_at: new Date()
    };
}

async function writeSyncRun(auth, type, status, data = {}) {
    const db = getDb();
    await db.collection('tea_coop_sync_runs').insertOne({
        orgId: auth.orgId,
        userId: auth.userId,
        type,
        status,
        ...data,
        createdAt: new Date()
    });
}

async function syncMembers(auth) {
    const payload = await fetchTeaCoopJson(config.teaCoopMembersPath, { page: 1, limit: 100 });
    const records = extractRecords(payload, ['members', 'teaCoopMembers']);
    const db = getDb();
    const operations = [];

    for (const raw of records) {
        const member = normalizeMember(raw, auth);
        if (!member) continue;
        operations.push({
            updateOne: {
                filter: { orgId: auth.orgId, member_id: member.member_id, deletedAt: null },
                update: {
                    $set: member,
                    $setOnInsert: {
                        createdAt: new Date(),
                        created_at: new Date()
                    },
                    $inc: { version: 1 }
                },
                upsert: true
            }
        });
    }

    const result = operations.length
        ? await db.collection('tea_coop_members').bulkWrite(operations, { ordered: false })
        : { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };

    await publishDomainEvent({
        event: 'tea_coop_members.synced',
        orgId: auth.orgId,
        branchId: null,
        entity: 'tea_coop_members',
        entityId: 'tea_coop_members',
        operation: 'sync',
        changedBy: auth.userId
    });
    await writeSyncRun(auth, 'members', 'success', { total: records.length, valid: operations.length });

    return {
        total: records.length,
        valid: operations.length,
        matched: result.matchedCount || 0,
        modified: result.modifiedCount || 0,
        upserted: result.upsertedCount || 0
    };
}

async function syncPayments(auth, { memberId = null, months = 6 } = {}) {
    if (!memberId && String(config.teaCoopPaymentsPath || '').includes('{memberId}')) {
        return {
            total: 0,
            valid: 0,
            matched: 0,
            modified: 0,
            upserted: 0,
            skipped: true,
            message: 'Tea Coop payment sync requires a memberId for the configured endpoint'
        };
    }

    const query = {};
    if (memberId && !String(config.teaCoopPaymentsPath || '').includes('{memberId}')) query.member_id = memberId;
    if (months) {
        const now = new Date();
        const pastDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);
        query.months = months;
        query.monthLimit = months;
        query.startYear = pastDate.getFullYear();
        query.startMonth = pastDate.getMonth() + 1;
        query.factory = 1;
    }
    const payload = await fetchTeaCoopJson(config.teaCoopPaymentsPath, query, { memberId });
    const records = extractRecords(payload, ['payments', 'paymentHistory', 'teaCoopPayments', 'monthlyData']);
    const db = getDb();
    const operations = [];

    for (const raw of records) {
        const payment = normalizePayment(raw, auth, memberId);
        if (!payment) continue;
        operations.push({
            updateOne: {
                filter: {
                    orgId: auth.orgId,
                    member_id: payment.member_id,
                    year: payment.year,
                    month: payment.month,
                    factory_id: payment.factory_id,
                    deletedAt: null
                },
                update: {
                    $set: payment,
                    $setOnInsert: {
                        createdAt: new Date(),
                        created_at: new Date()
                    },
                    $inc: { version: 1 }
                },
                upsert: true
            }
        });
    }

    const result = operations.length
        ? await db.collection('tea_coop_payments').bulkWrite(operations, { ordered: false })
        : { matchedCount: 0, modifiedCount: 0, upsertedCount: 0 };

    await publishDomainEvent({
        event: 'tea_coop_payments.synced',
        orgId: auth.orgId,
        branchId: null,
        entity: 'tea_coop_payments',
        entityId: memberId || 'tea_coop_payments',
        operation: 'sync',
        changedBy: auth.userId
    });
    await writeSyncRun(auth, 'payments', 'success', { total: records.length, valid: operations.length, memberId });

    return {
        total: records.length,
        valid: operations.length,
        matched: result.matchedCount || 0,
        modified: result.modifiedCount || 0,
        upserted: result.upsertedCount || 0
    };
}

async function syncAll(auth, options = {}) {
    const members = await syncMembers(auth);
    const payments = await syncPayments(auth, options);
    return { members, payments };
}

async function getStatus(auth) {
    const db = getDb();
    const latest = await db.collection('tea_coop_sync_runs')
        .find({ orgId: auth.orgId })
        .sort({ createdAt: -1 })
        .limit(1)
        .toArray();

    return {
        configured: Boolean(config.teaCoopApiUrl),
        apiUrlConfigured: Boolean(config.teaCoopApiUrl),
        tokenConfigured: Boolean(config.teaCoopApiToken),
        credentialLoginConfigured: Boolean(config.teaCoopUsername && config.teaCoopPassword),
        authPath: config.teaCoopAuthPath,
        membersPath: config.teaCoopMembersPath,
        paymentsPath: config.teaCoopPaymentsPath,
        latestSync: latest[0] || null
    };
}

module.exports = {
    syncAll,
    syncMembers,
    syncPayments,
    getStatus
};
