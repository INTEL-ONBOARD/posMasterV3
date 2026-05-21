const express = require('express');
const catalogService = require('../services/catalogService.cjs');
const salesService = require('../services/salesService.cjs');
const inventoryTransferService = require('../services/inventoryTransferService.cjs');
const { asyncHandler, ok } = require('../utils/http.cjs');
const {
    requireAuth,
    requireOrgScope,
    requireCatalogReadPermission,
    requireCatalogPermission,
    requireSalesPermission,
    requireInventoryPermission
} = require('../middleware/auth.cjs');

const router = express.Router();

router.use(requireAuth, requireOrgScope);

router.get('/collections/:collection', requireCatalogReadPermission, asyncHandler(async (req, res) => {
    const records = await catalogService.list(req.params.collection, req.auth, req.query);
    return ok(res, records);
}));

router.get('/collections/:collection/:id', requireCatalogReadPermission, asyncHandler(async (req, res) => {
    const record = await catalogService.getById(req.params.collection, req.auth, req.params.id);
    return ok(res, record);
}));

router.post('/collections/:collection', requireCatalogPermission, asyncHandler(async (req, res) => {
    const record = await catalogService.create(req.params.collection, req.auth, req.body || {});
    return ok(res, record);
}));

router.patch('/collections/:collection/:id', requireCatalogPermission, asyncHandler(async (req, res) => {
    const record = await catalogService.update(req.params.collection, req.auth, req.params.id, req.body || {});
    return ok(res, record);
}));

router.delete('/collections/:collection/:id', requireCatalogPermission, asyncHandler(async (req, res) => {
    const record = await catalogService.softDelete(req.params.collection, req.auth, req.params.id);
    return ok(res, record);
}));

router.post('/sales/invoice-no', requireSalesPermission, asyncHandler(async (req, res) => {
    const invoice = await salesService.generateInvoiceNo(
        req.auth,
        req.body?.type || 'SALE',
        req.body?.branchId || req.body?.branch_id || null
    );
    return ok(res, invoice);
}));

router.post('/sales', requireSalesPermission, asyncHandler(async (req, res) => {
    const sale = await salesService.createSale(req.auth, req.body || {});
    return ok(res, sale);
}));

router.post('/sales/:id/complete-held', requireSalesPermission, asyncHandler(async (req, res) => {
    const sale = await salesService.completeHeldSale(req.auth, req.params.id, req.body || {});
    return ok(res, sale);
}));

router.post('/sales/:id/cancel', requireSalesPermission, asyncHandler(async (req, res) => {
    const sale = await salesService.cancelSale(req.auth, req.params.id, req.body || {});
    return ok(res, sale);
}));

router.post('/sales/:id/return-items', requireSalesPermission, asyncHandler(async (req, res) => {
    const sale = await salesService.returnSaleItems(req.auth, req.params.id, req.body || {});
    return ok(res, sale);
}));

router.post('/sales/daily-report', requireSalesPermission, asyncHandler(async (req, res) => {
    const report = await salesService.getDailyTransactionReport(req.auth, req.body || {});
    return ok(res, report);
}));

router.post('/inventory-transfers/:id/accept', requireInventoryPermission, asyncHandler(async (req, res) => {
    const transfer = await inventoryTransferService.acceptTransfer(req.auth, req.params.id, req.body || {});
    return ok(res, transfer);
}));

router.post('/inventory-transfers/:id/reject', requireInventoryPermission, asyncHandler(async (req, res) => {
    const transfer = await inventoryTransferService.rejectTransfer(req.auth, req.params.id, req.body || {});
    return ok(res, transfer);
}));

module.exports = router;
