const jwt = require('jsonwebtoken');
const { io } = require('socket.io-client');

process.env.ONLINE_API_PORT = process.env.POS_ONLINE_VERIFY_PORT || process.env.ONLINE_API_PORT || '4199';

const { startOnlineServer, stopOnlineServer } = require('../src/online-server/runtime.cjs');
const { config } = require('../src/online-server/config.cjs');
const { getDb } = require('../src/online-server/db/mongo.cjs');
const { hashToken } = require('../src/online-server/utils/security.cjs');

async function readJson(response) {
    const text = await response.text();
    return text ? JSON.parse(text) : null;
}

async function makeSmokeToken(db) {
    const user = await db.collection('users').findOne(
        {
            orgId: config.defaultOrgId,
            deletedAt: null,
            roles: { $in: ['admin', 'superadmin', 'super_admin', 'owner'] }
        },
        { projection: { _id: 1, branchId: 1, branch_id: 1, roles: 1 } }
    ) || await db.collection('users').findOne(
        { orgId: config.defaultOrgId, deletedAt: null },
        { projection: { _id: 1, branchId: 1, branch_id: 1, roles: 1 } }
    );

    if (!user) {
        throw new Error('No active user exists for online smoke verification');
    }

    const fallbackBranch = await db.collection('branches').findOne(
        { orgId: config.defaultOrgId, deletedAt: null, is_active: { $ne: false }, isActive: { $ne: false } },
        { projection: { _id: 1 } }
    );
    const userId = String(user._id);
    const branchId = user.branchId || user.branch_id || (fallbackBranch?._id ? String(fallbackBranch._id) : null);
    const roles = Array.isArray(user.roles) && user.roles.length ? user.roles : ['admin'];
    const token = jwt.sign(
        { sub: userId, orgId: config.defaultOrgId, branchId, roles },
        config.jwtSecret,
        { expiresIn: '10m' }
    );

    await db.collection('sessions').insertOne({
        tokenHash: hashToken(token),
        userId,
        orgId: config.defaultOrgId,
        branchId,
        roles,
        active: true,
        smoke: true,
        createdAt: new Date(),
        lastSeenAt: new Date()
    });

    return token;
}

async function verifyRoute(name, url, options, expectedStatuses) {
    const response = await fetch(url, options);
    const payload = await readJson(response);
    if (!expectedStatuses.includes(response.status)) {
        throw new Error(`${name} returned ${response.status}: ${payload?.message || JSON.stringify(payload)}`);
    }
    console.log(`[verify:online] ${name}: ${response.status}`);
    return payload;
}

async function verifyJson(name, url, options, expectedStatus, assertPayload) {
    const response = await fetch(url, options);
    const payload = await readJson(response);
    if (response.status !== expectedStatus) {
        throw new Error(`${name} returned ${response.status}: ${payload?.message || JSON.stringify(payload)}`);
    }
    await assertPayload(payload);
    console.log(`[verify:online] ${name}: ${response.status}`);
}

async function verifyRealtime(baseUrl, token) {
    await new Promise((resolve, reject) => {
        const socket = io(baseUrl, {
            auth: { token },
            transports: ['websocket'],
            timeout: 5000
        });
        const timer = setTimeout(() => {
            socket.close();
            reject(new Error('Realtime connection timed out'));
        }, 6000);
        socket.on('realtime.connected', () => {
            clearTimeout(timer);
            socket.close();
            console.log('[verify:online] realtime: connected');
            resolve();
        });
        socket.on('connect_error', (error) => {
            clearTimeout(timer);
            socket.close();
            reject(error);
        });
    });
}

async function verifyRealtimeRejected(baseUrl, token) {
    await new Promise((resolve, reject) => {
        const socket = io(baseUrl, {
            auth: { token },
            transports: ['websocket'],
            timeout: 5000
        });
        const timer = setTimeout(() => {
            socket.close();
            reject(new Error('Rejected realtime connection timed out'));
        }, 6000);
        socket.on('realtime.connected', () => {
            clearTimeout(timer);
            socket.close();
            reject(new Error('Inactive realtime session was accepted'));
        });
        socket.on('connect_error', () => {
            clearTimeout(timer);
            socket.close();
            console.log('[verify:online] realtime inactive session: rejected');
            resolve();
        });
    });
}

async function main() {
    let token = null;
    await startOnlineServer();

    try {
        const port = config.port;
        const baseUrl = `http://127.0.0.1:${port}`;
        const apiUrl = `${baseUrl}/api`;
        const db = getDb();
        token = await makeSmokeToken(db);
        const headers = {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        };

        await verifyRoute('ready', `${apiUrl}/ready`, {}, [200]);
        await verifyRoute('session', `${apiUrl}/auth/session`, { headers }, [200]);
        await verifyRoute('collections/items', `${apiUrl}/collections/items?limit=1`, { headers }, [200]);
        await verifyJson('collections/users redaction', `${apiUrl}/collections/users?limit=1`, { headers }, 200, (payload) => {
            const user = payload?.data?.[0];
            if (user && ('passwordHash' in user || 'password' in user || 'tokenHash' in user)) {
                throw new Error('User collection returned sensitive auth fields');
            }
        });
        await verifyRoute('collections/payment_methods', `${apiUrl}/collections/payment_methods?limit=1`, { headers }, [200]);
        await verifyRoute('collections/branches', `${apiUrl}/collections/branches?limit=1`, { headers }, [200]);
        await verifyRoute('sales validation', `${apiUrl}/sales`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ items: [] })
        }, [400]);
        await verifyRoute('restock validation', `${apiUrl}/collections/restock_transactions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ added_items: [] })
        }, [400]);
        await verifyRoute('sales complete-held route', `${apiUrl}/sales/000000000000000000000000/complete-held`, {
            method: 'POST',
            headers,
            body: '{}'
        }, [404]);
        await verifyRoute('sales cancel route', `${apiUrl}/sales/000000000000000000000000/cancel`, {
            method: 'POST',
            headers,
            body: '{}'
        }, [404]);
        await verifyRoute('sales return route', `${apiUrl}/sales/000000000000000000000000/return-items`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ items: [{ item_id: 'smoke', batch_code: 'smoke', quantity: 1 }], reason: 'smoke' })
        }, [404]);
        await verifyRoute('transfer accept route', `${apiUrl}/inventory-transfers/000000000000000000000000/accept`, {
            method: 'POST',
            headers,
            body: '{}'
        }, [404]);
        await verifyRoute('transfer reject route', `${apiUrl}/inventory-transfers/000000000000000000000000/reject`, {
            method: 'POST',
            headers,
            body: '{}'
        }, [404]);

        await verifyRealtime(baseUrl, token);
        await getDb().collection('sessions').updateOne(
            { tokenHash: hashToken(token), smoke: true },
            { $set: { active: false, endReason: 'smoke_realtime_rejection_check', endedAt: new Date() } }
        );
        await verifyRealtimeRejected(baseUrl, token);
        console.log('[verify:online] OK');
    } finally {
        if (token) {
            await getDb().collection('sessions').deleteMany({ tokenHash: hashToken(token), smoke: true });
        }
        await stopOnlineServer();
    }
}

main().catch(async (error) => {
    console.error('[verify:online] FAILED', error);
    try {
        await stopOnlineServer();
    } catch {}
    process.exit(1);
});
