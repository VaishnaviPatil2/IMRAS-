const express = require('express');
const router = express.Router();
const { verifyUser, verifyAdmin, verifyAdminOrManager } = require('../middleware/authMiddleware');
const {
  getAllPurchaseOrders,
  getSupplierPurchaseOrders,
  respondToPurchaseOrder,
  getPurchaseOrderById,
  approvePurchaseOrder,
  approveDelayRequest,
  editPurchaseOrder,
  cancelPurchaseOrder
} = require('../controllers/purchaseOrder.controller');

// Custom middleware for role-based access
const verifyAdminOnly = (req, res, next) => {
  if (req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Only admin can perform this action' });
  }
};

const verifySupplierOnly = (req, res, next) => {
  if (req.user.role === 'supplier') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Only suppliers can access this endpoint' });
  }
};

const verifyAdminManagerOrWarehouse = (req, res, next) => {
  if (['admin', 'manager', 'warehouse'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied' });
  }
};

// Admin routes - PO approvals and management (Admin only)
router.put('/:id/approve', verifyUser, verifyAdminOnly, approvePurchaseOrder);
router.put('/:id/delay-approval', verifyUser, verifyAdminOrManager, approveDelayRequest);
router.put('/:id/edit', verifyUser, verifyAdminOnly, editPurchaseOrder);
router.put('/:id/cancel', verifyUser, verifyAdminOnly, cancelPurchaseOrder);

// Admin/Manager/Warehouse routes - View POs (with role-based filtering in controller)
router.get('/all', verifyUser, verifyAdminManagerOrWarehouse, getAllPurchaseOrders);

// Get single PO details (role-based access handled in controller)
router.get('/:id', verifyUser, getPurchaseOrderById);

// Supplier routes - View and respond to their POs
router.get('/supplier/my-orders', verifyUser, verifySupplierOnly, getSupplierPurchaseOrders);

router.put('/supplier/respond/:id', verifyUser, verifySupplierOnly, respondToPurchaseOrder);

module.exports = router;