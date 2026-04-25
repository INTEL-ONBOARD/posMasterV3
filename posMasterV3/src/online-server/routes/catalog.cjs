const express = require('express');
const catalogService = require('../services/catalogService.cjs');
const salesService = require('../services/salesService.cjs');
const { asyncHandler, ok } = require('../utils/http.cjs');
const { requireAuth, requireOrgScope } = require('../middleware/auth.cjs');

const router = express.Router();

router.use(requireAuth, requireOrgScope);

router.get('/collections/:collection', asyncHandler(async (req, res) => {
    const records = await catalogService.list(req.params.collection, req.auth, req.query);
    return ok(res, records);
}));

router.get('/collections/:collection/:id', asyncHandler(async (req, res) => {
    const record = await catalogService.getById(req.params.collection, req.auth, req.params.id);
    return ok(res, record);
}));

router.post('/collections/:collection', asyncHandler(async (req, res) => {
    const record = await catalogService.create(req.params.collection, req.auth, req.body || {});
    return ok(res, record);
}));

router.patch('/collections/:collection/:id', asyncHandler(async (req, res) => {
    const record = await catalogService.update(req.params.collection, req.auth, req.params.id, req.body || {});
    return ok(res, record);
}));

router.delete('/collections/:collection/:id', asyncHandler(async (req, res) => {
    const record = await catalogService.softDelete(req.params.collection, req.auth, req.params.id);
    return ok(res, record);
}));

router.post('/sales/invoice-no', asyncHandler(async (req, res) => {
    const invoice = await salesService.generateInvoiceNo(req.auth, req.body?.type || 'SALE');
    return ok(res, invoice);
}));

router.post('/sales', asyncHandler(async (req, res) => {
    const sale = await salesService.createSale(req.auth, req.body || {});
    return ok(res, sale);
}));

module.exports = router;
