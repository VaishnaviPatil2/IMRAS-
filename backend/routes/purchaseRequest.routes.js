const express = require('express');
const router = express.Router();
const purchaseRequestController = require('../controllers/purchaseRequest.controller');
const { verifyUser, verifyAdminOrManager, verifyWarehouse } = require('../middleware/authMiddleware');
const { PurchaseRequest } = require('../models');

console.log('🔄 Purchase Request routes loaded');

// Custom middleware for role-based access
const verifyManagerOrAdminOverride = (req, res, next) => {
  console.log('🔐 Checking Manager/Admin access...');
  console.log('User from token:', req.user);
  
  if (req.user.role === 'manager' || req.user.role === 'admin') {
    console.log('✅ Access granted for role:', req.user.role);
    next();
  } else {
    console.log('❌ Access denied for role:', req.user.role);
    res.status(403).json({ success: false, message: 'Only inventory managers and admin can perform this action' });
  }
};

const verifyAdminOverride = (req, res, next) => {
  if (req.user.role === 'admin') {
    // Log admin override action
    console.log(`🚨 Admin Override: ${req.user.name} (${req.user.email}) performed ${req.method} ${req.originalUrl}`);
    next();
  } else {
    res.status(403).json({ success: false, message: 'Admin override required for this action' });
  }
};

// Apply authentication middleware to all routes
router.use(verifyUser);

// Test route to check PR table and user auth
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Testing PR module...');
    console.log('User:', req.user);
    
    // Test database connection
    const count = await PurchaseRequest.count();
    console.log('PR table exists, count:', count);
    
    // Test user access
    const { User, Item, Warehouse } = require('../models');
    const user = await User.findByPk(req.user.id);
    console.log('User from DB:', user ? user.name : 'Not found');
    
    // Test items and warehouses
    const itemCount = await Item.count();
    const warehouseCount = await Warehouse.count();
    console.log('Items count:', itemCount);
    console.log('Warehouses count:', warehouseCount);
    
    // Get sample items and warehouses
    const sampleItems = await Item.findAll({ limit: 3, attributes: ['id', 'name', 'sku'] });
    const sampleWarehouses = await Warehouse.findAll({ limit: 3, attributes: ['id', 'name', 'code'] });
    
    res.json({
      success: true,
      message: 'PR module test successful',
      data: {
        user: req.user,
        prCount: count,
        userExists: !!user,
        itemCount,
        warehouseCount,
        sampleItems,
        sampleWarehouses
      }
    });
  } catch (error) {
    console.error('❌ PR test error:', error);
    res.status(500).json({
      success: false,
      message: 'PR module test failed',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// GET /api/purchase-requests/low-stock-summary - Get low stock summary (Admin/Manager only)
router.get('/low-stock-summary', verifyAdminOrManager, purchaseRequestController.getLowStockSummary);

// POST /api/purchase-requests/auto-generate - Trigger automatic PO generation (Admin/Manager only)
router.post('/auto-generate', verifyAdminOrManager, purchaseRequestController.triggerAutoPoGeneration);

// GET /api/purchase-requests - Get all purchase requests (Role-based filtering in controller)
router.get('/', purchaseRequestController.getAllPurchaseRequests);

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