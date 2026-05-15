const express = require('express');
const teaCoopSyncService = require('../services/teaCoopSyncService.cjs');
const { asyncHandler, ok } = require('../utils/http.cjs');
const {
    requireAuth,
    requireOrgScope,
    requireSalesPermission
} = require('../middleware/auth.cjs');

const router = express.Router();

router.use(requireAuth, requireOrgScope);

router.get('/tea-coop/status', requireSalesPermission, asyncHandler(async (req, res) => {
    const status = await teaCoopSyncService.getStatus(req.auth);
    return ok(res, status);
}));

router.post('/tea-coop/sync', requireSalesPermission, asyncHandler(async (req, res) => {
    const result = await teaCoopSyncService.syncAll(req.auth, req.body || {});
    return ok(res, result, 'Tea Coop sync completed');
}));

router.post('/tea-coop/sync/members', requireSalesPermission, asyncHandler(async (req, res) => {
    const result = await teaCoopSyncService.syncMembers(req.auth);
    return ok(res, result, 'Tea Coop members synced');
}));

router.post('/tea-coop/sync/payments', requireSalesPermission, asyncHandler(async (req, res) => {
    const result = await teaCoopSyncService.syncPayments(req.auth, req.body || {});
    return ok(res, result, 'Tea Coop payments synced');
}));

module.exports = router;
