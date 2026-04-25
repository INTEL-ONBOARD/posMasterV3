const express = require('express');
const authService = require('../services/authService.cjs');
const { asyncHandler, ok } = require('../utils/http.cjs');
const { requireAuth } = require('../middleware/auth.cjs');

const router = express.Router();

router.post('/auth/login', asyncHandler(async (req, res) => {
    const result = await authService.login(req.body || {});
    if (!result.success) {
        return res.status(401).json(result);
    }
    return res.json(result);
}));

router.post('/auth/register', requireAuth, asyncHandler(async (req, res) => {
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
