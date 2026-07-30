const express = require('express');
const salesService = require('../services/salesService.cjs');
const authService = require('../services/authService.cjs');
const { asyncHandler, ok } = require('../utils/http.cjs');
const {
    requireAuth,
    requireOrgScope,
    requireSalesPermission,
    requireManagerRole
} = require('../middleware/auth.cjs');

const router = express.Router();

router.use(requireAuth, requireOrgScope);

router.get('/sales/summary', requireSalesPermission, asyncHandler(async (req, res) => {
    const data = await salesService.getSalesSummary(req.auth, {
        startDate: req.query.startDate,
        endDate: req.query.endDate
    });
    return ok(res, data);
}));

router.get('/sales/daily', requireSalesPermission, asyncHandler(async (req, res) => {
    const data = await salesService.getSalesDaily(req.auth, req.query.days);
    return ok(res, data);
}));

router.get('/sessions/active', requireManagerRole, asyncHandler(async (req, res) => {
    const data = await authService.listActiveSessions(req.auth, {
        limit: req.query.limit,
        skip: req.query.skip
    });
    return ok(res, data);
}));

router.get('/sessions/active/count', requireManagerRole, asyncHandler(async (req, res) => {
    const data = await authService.countActiveSessions(req.auth);
    return ok(res, data);
}));

module.exports = router;
