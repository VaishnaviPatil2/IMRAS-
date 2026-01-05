const express = require('express');
const router = express.Router();
const supplierItemController = require('../controllers/supplierItem.controller');
const { verifyUser, verifyAdmin } = require('../middleware/authMiddleware');

// Get all supplier-item relationships
router.get('/', verifyUser, supplierItemController.getAllSupplierItems);

// Get suppliers for a specific item
router.get('/item/:itemId', verifyUser, supplierItemController.getSuppliersForItem);

// Add item to supplier catalog (Admin only)
router.post('/', verifyAdmin, supplierItemController.addSupplierItem);

// Update supplier-item relationship (Admin only)
router.put('/:id', verifyAdmin, supplierItemController.updateSupplierItem);

// Remove item from supplier catalog (Admin only)
router.delete('/:id', verifyAdmin, supplierItemController.removeSupplierItem);

module.exports = router;