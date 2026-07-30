const express = require('express');
const rateLimit = require('express-rate-limit');
const authService = require('../services/authService.cjs');
const { asyncHandler, ok } = require('../utils/http.cjs');
const { requireAuth, requireManagerRole } = require('../middleware/auth.cjs');

const router = express.Router();

// IP-level throttle backstops the per-account lockout in authService.login —
// this catches an attacker rotating usernames against the same till/IP.
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'error', message: 'Too many login attempts. Please try again later.' }
});

router.post('/auth/login', loginLimiter, asyncHandler(async (req, res) => {
    const result = await authService.login(req.body || {});
    if (!result.success) {
        return res.status(401).json(result);
    }
    return res.json(result);
}));

// Any authenticated user could previously create new accounts — including
// admin ones, by passing roles: ['admin'] in the body — since this only
// required a valid session, not a manager role. Bootstrap of the very first
// admin account happens via scripts/seed-online-admin.cjs (a direct DB
// write), not through this endpoint, so gating it here doesn't block setup.
router.post('/auth/register', requireAuth, requireManagerRole, asyncHandler(async (req, res) => {
    const result = await authService.register(req.body || {}, req.auth);
    return res.status(201).json(result);
}));

router.post('/auth/logout', requireAuth, asyncHandler(async (req, res) => {
    const result = await authService.logout(req.auth.token);
    return res.json(result);
}));

router.post('/auth/change-password', requireAuth, asyncHandler(async (req, res) => {
    const result = await authService.changePassword(req.auth, req.body || {});
    return res.json(result);
}));

router.get('/auth/session', requireAuth, asyncHandler(async (req, res) => {
    return ok(res, {
        valid: true,
        userId: req.auth.userId,
        orgId: req.auth.orgId,
        branchId: req.auth.branchId,
        roles: req.auth.roles
    });
}));

router.post('/users/:id/reset-password', requireAuth, asyncHandler(async (req, res) => {
    const result = await authService.resetPassword(req.auth, req.params.id, req.body?.newPassword || req.body?.password);
    return res.json(result);
}));

module.exports = router;
