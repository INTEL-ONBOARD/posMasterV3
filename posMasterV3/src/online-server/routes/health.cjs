const express = require('express');
const { getDb, supportsTransactions } = require('../db/mongo.cjs');
const { ok, fail, asyncHandler } = require('../utils/http.cjs');

const router = express.Router();

router.get('/health', asyncHandler(async (req, res) => {
    const db = getDb();
    await db.command({ ping: 1 });
    return ok(res, {
        online: true,
        database: 'mongodb',
        transactionsSupported: supportsTransactions(),
        realtime: 'socket.io',
        checkedAt: new Date().toISOString()
    });
}));

router.get('/ready', asyncHandler(async (req, res) => {
    try {
        const db = getDb();
        await db.command({ ping: 1 });
        return ok(res, {
            ready: true,
            transactionsSupported: supportsTransactions()
        });
    } catch (error) {
        return fail(res, 503, 'Online backend is not ready');
    }
}));

module.exports = router;
