const express = require('express');
const router = express.Router();
const purchaseRequestController = require('../controllers/purchaseRequest.controller');
const { verifyUser, verifyAdminOrManager, verifyWarehouse } = require('../middleware/authMiddleware');
const { PurchaseRequest } = require('../models');

console.log('Purchase Request routes loaded');

// Custom middleware for role-based access
const verifyManagerOrAdminOverride = (req, res, next) => {
  console.log('Checking Manager/Admin access...');
  console.log('User from token:', req.user);
  
  if (req.user.role === 'manager' || req.user.role === 'admin') {
    console.log('Access granted for role:', req.user.role);
    next();
  } else {
    console.log('Access denied for role:', req.user.role);
    res.status(403).json({ success: false, message: 'Only inventory managers and admin can perform this action' });
  }
};

const verifyAdminManagerOrWarehouse = (req, res, next) => {
  if (['admin', 'manager', 'warehouse'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied' });
  }
};

const verifyAdminOverride = (req, res, next) => {
  if (req.user.role === 'admin') {
    // Log admin override action
    console.log(`Admin Override: ${req.user.name} (${req.user.email}) performed ${req.method} ${req.originalUrl}`);
    next();
  } else {
    res.status(403).json({ success: false, message: 'Admin override required for this action' });
  }
};

// Apply authentication middleware to all routes
router.use(verifyUser);

// GET /api/purchase-requests/low-stock-summary - Get low stock summary (Admin/Manager only)
router.get('/low-stock-summary', verifyAdminOrManager, purchaseRequestController.getLowStockSummary);

// POST /api/purchase-requests/auto-generate - Trigger automatic PO generation (Admin/Manager/Warehouse)
router.post('/auto-generate', verifyAdminManagerOrWarehouse, purchaseRequestController.triggerAutoPoGeneration);

// GET /api/purchase-requests - Get all purchase requests (Role-based filtering in controller)
router.get('/', purchaseRequestController.getAllPurchaseRequests);

// POST /api/purchase-requests/validate-quantity - Validate quantity before submission
router.post('/validate-quantity', verifyManagerOrAdminOverride, purchaseRequestController.validateQuantity);

// POST /api/purchase-requests - Create new purchase request (Manager + Admin override)
router.post('/', verifyManagerOrAdminOverride, purchaseRequestController.createPurchaseRequest);

// POST /api/purchase-requests/:id/create-po - Create PO from PR (Manager + Admin override)
router.post('/:id/create-po', verifyManagerOrAdminOverride, purchaseRequestController.createPOFromPR);

// PUT /api/purchase-requests/:id/status - Approve/Reject purchase request (Manager + Admin override)
router.put('/:id/status', verifyManagerOrAdminOverride, purchaseRequestController.updatePurchaseRequestStatus);

// PUT /api/purchase-requests/:id - Edit purchase request (Manager + Admin override)
router.put('/:id', verifyManagerOrAdminOverride, purchaseRequestController.editPurchaseRequest);

// DELETE /api/purchase-requests/:id - Delete purchase request (Manager + Admin override)
router.delete('/:id', verifyManagerOrAdminOverride, purchaseRequestController.deletePurchaseRequest);

module.exports = router;