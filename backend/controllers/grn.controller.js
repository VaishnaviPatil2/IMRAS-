const { GRN, PurchaseOrder, Item, Warehouse, User, StockLocation } = require('../models');
const sendEmail = require('../utils/sendEmail');

// Create GRN
exports.createGRN = async (req, res) => {
  try {
    const { poId, quantityReceived, batchNumber, expiryDate, notes } = req.body;

    // Only warehouse staff can create GRN
    if (req.user.role !== 'warehouse') {
      return res.status(403).json({
        success: false,
        message: 'Only warehouse staff can create GRN'
      });
    }

    // Find PO and verify it's acknowledged
    const purchaseOrder = await PurchaseOrder.findByPk(poId, {
      include: [
        { model: Item, as: 'item' },
        { model: Warehouse, as: 'warehouse' },
        { model: User, as: 'createdBy', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    if (purchaseOrder.status !== 'acknowledged') {
      return res.status(400).json({
        success: false,
        message: 'PO must be acknowledged by supplier before creating GRN'
      });
    }

    // Check if GRN already exists for this PO
    const existingGRN = await GRN.findOne({ where: { poId } });
    if (existingGRN) {
      return res.status(400).json({
        success: false,
        message: 'GRN already exists for this PO'
      });
    }

    // Validate quantity
    if (quantityReceived <= 0 || quantityReceived > purchaseOrder.orderedQuantity) {
      return res.status(400).json({
        success: false,
        message: `Invalid quantity. Must be between 1 and ${purchaseOrder.orderedQuantity}`
      });
    }

    // Create GRN
    const grn = await GRN.create({
      poId,
      itemId: purchaseOrder.itemId,
      warehouseId: purchaseOrder.warehouseId,
      quantityOrdered: purchaseOrder.orderedQuantity,
      quantityReceived,
      batchNumber,
      expiryDate,
      receivedById: req.user.id,
      notes,
      status: 'pending' // Needs inventory manager approval
    });

    // Update PO status to partially_received (GRN created, awaiting approval)
    await purchaseOrder.update({ status: 'partially_received' });

    // Send email to inventory manager for approval
    try {
      const inventoryManager = await User.findOne({ where: { role: 'manager' } });
      if (inventoryManager) {
        await sendEmail(
          inventoryManager.email,
          `GRN Approval Required - ${grn.grnNumber}`,
          `
          A new GRN has been created and requires your approval.
          
          GRN Details:
          - GRN Number: ${grn.grnNumber}
          - PO Number: ${purchaseOrder.poNumber}
          - Item: ${purchaseOrder.item.name}
          - Quantity Ordered: ${purchaseOrder.orderedQuantity}
          - Quantity Received: ${quantityReceived}
          - Received by: ${req.user.name}
          
          Please log in to approve/reject this GRN.
          `
        );
      }
    } catch (emailError) {
      console.error('Failed to send GRN approval email:', emailError);
    }

    const createdGRN = await GRN.findByPk(grn.id, {
      include: [
        { model: PurchaseOrder, as: 'purchaseOrder' },
        { model: Item, as: 'item' },
        { model: Warehouse, as: 'warehouse' },
        { model: User, as: 'receivedBy', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'GRN created successfully. Awaiting inventory manager approval.',
      data: createdGRN
    });

  } catch (error) {
    console.error('Error creating GRN:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create GRN',
      error: error.message
    });
  }
};

// Approve GRN
exports.approveGRN = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // action: 'approve' or 'reject'

    // Only inventory manager can approve GRN
    if (req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Only inventory manager can approve GRN'
      });
    }

    const grn = await GRN.findByPk(id, {
      include: [
        { model: PurchaseOrder, as: 'purchaseOrder' },
        { model: Item, as: 'item' },
        { model: Warehouse, as: 'warehouse' },
        { model: User, as: 'receivedBy', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: 'GRN not found'
      });
    }

    if (grn.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'GRN is not pending approval'
      });
    }

    if (action === 'approve') {
      // Approve GRN and update stock
      await grn.update({
        status: 'approved',
        approvedById: req.user.id,
        approvedAt: new Date(),
        notes: `${grn.notes || ''}\n\nApproved by ${req.user.name}: ${notes || 'No additional notes'}`
      });

      // Update stock location
      const stockLocation = await StockLocation.findOne({
        where: {
          itemId: grn.itemId,
          warehouseId: grn.warehouseId
        }
      });

      if (stockLocation) {
        const oldStock = stockLocation.currentStock;
        const newStock = oldStock + grn.quantityReceived;
        
        await stockLocation.update({
          currentStock: newStock
        });
        
        console.log(`GRN Stock Update: ${grn.item.name} at ${grn.warehouse.name}: ${oldStock} → ${newStock} (+${grn.quantityReceived})`);
        console.log(`STOCK ADDITION VISIBLE IN: Dashboard → Stock Alerts, Stock Warehouse → Updated levels`);
      } else {
        // Create new stock location if doesn't exist
        await StockLocation.create({
          itemId: grn.itemId,
          warehouseId: grn.warehouseId,
          currentStock: grn.quantityReceived,
          minStock: 10, // Default values
          maxStock: 100
        });
        
        console.log(`GRN New Stock Location: ${grn.item.name} at ${grn.warehouse.name}: 0 → ${grn.quantityReceived}`);
        console.log(`NEW STOCK LOCATION VISIBLE IN: Dashboard → Stock Alerts, Stock Warehouse → New entry`);
      }

      // Trigger automatic system after GRN stock update
      try {
        const AutomaticTriggerService = require('../services/automaticTriggerService');
        
        // Run automatic check in background (don't wait for it)
        setTimeout(async () => {
          console.log('Triggering automatic check after GRN stock update...');
          await AutomaticTriggerService.executeAutomaticCheck();
        }, 2000); // 2 second delay to ensure all updates are committed
        
      } catch (triggerError) {
        console.error('Failed to trigger automatic check after GRN:', triggerError.message);
        // Don't fail the GRN if automatic trigger fails
      }

      // Update PO status to completed
      await grn.purchaseOrder.update({ status: 'completed' });

      console.log(`GRN ${grn.grnNumber} approved - Stock updated for ${grn.item.name}`);

    } else if (action === 'reject') {
      // Reject GRN
      await grn.update({
        status: 'rejected',
        approvedById: req.user.id,
        approvedAt: new Date(),
        notes: `${grn.notes || ''}\n\nRejected by ${req.user.name}: ${notes || 'No reason provided'}`
      });

      // Set PO status to cancelled (since rejected is not available in PO enum)
      await grn.purchaseOrder.update({ status: 'cancelled' });

      console.log(`GRN ${grn.grnNumber} rejected by ${req.user.name} - PO marked as cancelled`);

    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Use "approve" or "reject"'
      });
    }

    const updatedGRN = await GRN.findByPk(id, {
      include: [
        { model: PurchaseOrder, as: 'purchaseOrder' },
        { model: Item, as: 'item' },
        { model: Warehouse, as: 'warehouse' },
        { model: User, as: 'receivedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'approvedBy', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.json({
      success: true,
      message: `GRN ${action}d successfully${action === 'approve' ? ' and stock updated' : ''}`,
      data: updatedGRN
    });

  } catch (error) {
    console.error('Error approving GRN:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process GRN approval',
      error: error.message
    });
  }
};

// Get all GRNs
exports.getAllGRNs = async (req, res) => {
  try {
    const { status } = req.query;
    
    const whereClause = {};
    if (status) whereClause.status = status;

    // Role-based access
    if (!['admin', 'manager', 'warehouse'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const grns = await GRN.findAll({
      where: whereClause,
      include: [
        { model: PurchaseOrder, as: 'purchaseOrder', attributes: ['poNumber'] },
        { model: Item, as: 'item', attributes: ['name', 'sku'] },
        { model: Warehouse, as: 'warehouse', attributes: ['name'] },
        { model: User, as: 'receivedBy', attributes: ['id', 'name'] },
        { model: User, as: 'approvedBy', attributes: ['id', 'name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: grns,
      count: grns.length
    });

  } catch (error) {
    console.error('Error fetching GRNs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch GRNs',
      error: error.message
    });
  }
};

// Get single GRN
exports.getGRNById = async (req, res) => {
  try {
    const { id } = req.params;

    const grn = await GRN.findByPk(id, {
      include: [
        { model: PurchaseOrder, as: 'purchaseOrder' },
        { model: Item, as: 'item' },
        { model: Warehouse, as: 'warehouse' },
        { model: User, as: 'receivedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'approvedBy', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!grn) {
      return res.status(404).json({
        success: false,
        message: 'GRN not found'
      });
    }

    res.json({
      success: true,
      data: grn
    });

  } catch (error) {
    console.error('Error fetching GRN:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch GRN',
      error: error.message
    });
  }
};