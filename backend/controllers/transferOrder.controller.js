const { TransferOrder, Warehouse, Item, Category, User, StockLocation } = require("../models");
const { Op } = require("sequelize");

// Utility functions for stock calculations (shared logic)
const calculateEffectiveMinimum = (stockLocation, item) => {
  // Use reorderPoint directly as it already includes safetyStock in scientific formula
  const itemReorderThreshold = item.reorderPoint || 0;
  const locationMinStock = stockLocation.minStock || 0;
  return Math.max(locationMinStock, itemReorderThreshold);
};

const calculateUrgencyLevel = (stockLocation, item) => {
  const currentStock = stockLocation.currentStock || 0;
  const effectiveMinimum = calculateEffectiveMinimum(stockLocation, item);
  
  if (currentStock === 0) {
    return 'urgent';          // OUT OF STOCK - Emergency!
  } else if (currentStock <= (effectiveMinimum * 0.5)) {
    return 'high';            // ≤ 50% of minimum - High priority
  } else if (currentStock <= effectiveMinimum) {
    return 'medium';          // ≤ minimum threshold - Standard
  } else {
    return 'low';             // Above minimum - Low urgency
  }
};

const getStockStatus = (stockLocation, item) => {
  const currentStock = stockLocation.currentStock || 0;
  const effectiveMinimum = calculateEffectiveMinimum(stockLocation, item);
  
  if (currentStock === 0) {
    return 'out_of_stock';
  } else if (currentStock <= (effectiveMinimum * 0.5)) {
    return 'very_low_stock';
  } else if (currentStock <= effectiveMinimum) {
    return 'low_stock';
  } else {
    return 'sufficient';
  }
};

// =========================
// GET ALL TRANSFER ORDERS
// =========================
exports.getAllTransferOrders = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status = '', 
      priority = '',
      fromWarehouse = '',
      toWarehouse = '',
      requestedBy = '',
      search = ''
    } = req.query;
    
    const offset = (page - 1) * limit;

    const whereClause = {};
    
    if (status) {
      whereClause.status = status;
    }

    // Priority filtering will be done post-query after calculating auto priority

    if (fromWarehouse) {
      whereClause.fromWarehouseId = fromWarehouse;
    }

    if (toWarehouse) {
      whereClause.toWarehouseId = toWarehouse;
    }

    if (requestedBy) {
      whereClause.requestedById = requestedBy;
    }

    // Enhanced search functionality for transfer orders
    let searchConditions = {};
    if (search) {
      searchConditions = {
        [Op.or]: [
          { transferNumber: { [Op.iLike]: `%${search}%` } },
          { reason: { [Op.iLike]: `%${search}%` } },
          { notes: { [Op.iLike]: `%${search}%` } }
        ]
      };
    }

    // Combine search with other where conditions
    const finalWhereClause = search ? 
      { [Op.and]: [whereClause, searchConditions] } : 
      whereClause;

    // Enhanced include clause for search across related tables
    const includeClause = [
      { 
        model: Warehouse, 
        as: 'fromWarehouse', 
        attributes: ['id', 'name', 'code'],
        where: search ? { name: { [Op.iLike]: `%${search}%` } } : undefined,
        required: false
      },
      { 
        model: Warehouse, 
        as: 'toWarehouse', 
        attributes: ['id', 'name', 'code'],
        where: search ? { name: { [Op.iLike]: `%${search}%` } } : undefined,
        required: false
      },
      { 
        model: Item, 
        as: 'item', 
        attributes: ['id', 'sku', 'name', 'unitOfMeasure', 'reorderPoint', 'safetyStock'],
        include: [
          { model: Category, as: 'category', attributes: ['id', 'name'] }
        ],
        where: search ? {
          [Op.or]: [
            { name: { [Op.iLike]: `%${search}%` } },
            { sku: { [Op.iLike]: `%${search}%` } }
          ]
        } : undefined,
        required: false
      },
      { model: User, as: 'requestedBy', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'approvedBy', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'completedBy', attributes: ['id', 'name', 'email'] },
      { model: User, as: 'cancelledBy', attributes: ['id', 'name', 'email'] }
    ];

    const transferOrders = await TransferOrder.findAndCountAll({
      where: finalWhereClause,
      include: includeClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    // Enhance transfer orders with auto priority calculation
    const enhancedTransferOrders = await Promise.all(
      transferOrders.rows.map(async (order) => {
        const orderData = order.toJSON();
        
        // Get source warehouse stock location for auto priority calculation
        const sourceStockLocation = await StockLocation.findOne({
          where: {
            warehouseId: order.fromWarehouseId,
            itemId: order.itemId,
            isActive: true
          }
        });

        // Calculate auto priority based on source warehouse stock status
        let autoPriority = order.priority; // Fallback to manual priority
        
        if (sourceStockLocation) {
          autoPriority = calculateUrgencyLevel(sourceStockLocation, order.item);
        }

        return {
          ...orderData,
          autoPriority
        };
      })
    );

    // Apply priority filter after calculating auto priority
    let filteredTransferOrders = enhancedTransferOrders;
    if (priority) {
      filteredTransferOrders = enhancedTransferOrders.filter(order => {
        const effectivePriority = order.autoPriority || order.priority;
        return effectivePriority === priority;
      });
    }

    res.json({
      transferOrders: filteredTransferOrders,
      totalItems: transferOrders.count,
      totalPages: Math.ceil(transferOrders.count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error("Get transfer orders error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// GET TRANSFER ORDER BY ID
// =========================
exports.getTransferOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const transferOrder = await TransferOrder.findByPk(id, {
      include: [
        { model: Warehouse, as: 'fromWarehouse' },
        { model: Warehouse, as: 'toWarehouse' },
        { 
          model: Item, 
          as: 'item',
          include: [
            { model: Category, as: 'category' }
          ]
        },
        { model: User, as: 'requestedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'approvedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'completedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'cancelledBy', attributes: ['id', 'name', 'email'] }
      ]
    });

    if (!transferOrder) {
      return res.status(404).json({ error: "Transfer order not found" });
    }

    res.json(transferOrder);
  } catch (error) {
    console.error("Get transfer order error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// CREATE TRANSFER ORDER (WAREHOUSE ROLE)
// =========================
exports.createTransferOrder = async (req, res) => {
  try {
    if (!['warehouse', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: "Only warehouse staff and admins can create transfer orders" });
    }

    const {
      fromWarehouseId,
      toWarehouseId,
      itemId,
      requestedQuantity,
      priority = 'medium',
      reason,
      expectedDate
    } = req.body;

    if (!fromWarehouseId || !toWarehouseId || !itemId || !requestedQuantity) {
      return res.status(400).json({ error: "From warehouse, to warehouse, item, and quantity are required" });
    }

    // Validate that IDs are valid integers
    if (isNaN(parseInt(fromWarehouseId)) || isNaN(parseInt(toWarehouseId)) || isNaN(parseInt(itemId))) {
      return res.status(400).json({ error: "Invalid warehouse or item ID provided" });
    }

    // Validate quantity
    const parsedQuantity = parseInt(requestedQuantity);
    if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
      return res.status(400).json({ error: "Requested quantity must be a positive integer" });
    }

    if (parseInt(fromWarehouseId) === parseInt(toWarehouseId)) {
      return res.status(400).json({ error: "From and to warehouses cannot be the same" });
    }

    // Verify warehouses exist
    const fromWarehouse = await Warehouse.findByPk(fromWarehouseId);
    const toWarehouse = await Warehouse.findByPk(toWarehouseId);
    
    if (!fromWarehouse || !toWarehouse) {
      return res.status(400).json({ error: "One or both warehouses not found" });
    }

    // Verify item exists
    const item = await Item.findByPk(itemId);
    if (!item) {
      return res.status(400).json({ error: "Item not found" });
    }

    // Check if source warehouse has the item and calculate urgency
    const sourceStockLocation = await StockLocation.findOne({
      where: {
        warehouseId: fromWarehouseId,
        itemId: itemId,
        isActive: true
      }
    });

    // Auto-calculate priority based on stock status if not provided
    let calculatedPriority = priority;
    if (sourceStockLocation) {
      // If stock location exists, check if there's enough stock
      if (sourceStockLocation.currentStock < requestedQuantity) {
        return res.status(400).json({ 
          error: `Insufficient stock in ${fromWarehouse.name}. Available: ${sourceStockLocation.currentStock}, Requested: ${requestedQuantity}` 
        });
      }
      
      // Auto-calculate priority based on stock urgency level
      const stockUrgency = calculateUrgencyLevel(sourceStockLocation, item);
      calculatedPriority = stockUrgency; // Use calculated urgency as priority
    } else {
      // If no stock location exists, allow the transfer but with a warning
      console.log(`Warning: Creating transfer order for item ${item.name} (${item.sku}) that doesn't exist in source warehouse ${fromWarehouse.name}`);
    }

    // Generate transfer number manually
    const transferCount = await TransferOrder.count();
    const transferNumber = `TO${String(transferCount + 1).padStart(6, '0')}`;
    console.log('Generated transferNumber:', transferNumber);

    const transferOrder = await TransferOrder.create({
      transferNumber,
      fromWarehouseId,
      toWarehouseId,
      itemId,
      requestedQuantity,
      priority: calculatedPriority, // Use calculated priority
      reason,
      expectedDate,
      requestedById: req.user.id
      // Status defaults to 'pending' but we'll track submission separately
    });

    const createdTransferOrder = await TransferOrder.findByPk(transferOrder.id, {
      include: [
        { model: Warehouse, as: 'fromWarehouse', attributes: ['id', 'name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['id', 'name', 'code'] },
        { 
          model: Item, 
          as: 'item', 
          attributes: ['id', 'sku', 'name', 'unitOfMeasure'],
          include: [
            { model: Category, as: 'category', attributes: ['id', 'name'] }
          ]
        },
        { model: User, as: 'requestedBy', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.status(201).json({
      message: "Transfer order created successfully",
      transferOrder: createdTransferOrder
    });
  } catch (error) {
    console.error("Create transfer order error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// UPDATE TRANSFER ORDER (WAREHOUSE ROLE) - ONLY FOR PENDING ORDERS
// =========================
exports.updateTransferOrder = async (req, res) => {
  try {
    if (!['warehouse', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: "Only warehouse staff and admins can update transfer orders" });
    }

    const { id } = req.params;
    const {
      requestedQuantity,
      priority,
      reason,
      expectedDate
    } = req.body;

    // Find the transfer order
    const transferOrder = await TransferOrder.findByPk(id);
    if (!transferOrder) {
      return res.status(404).json({ error: "Transfer order not found" });
    }

    // Only allow updates for pending orders that haven't been submitted for approval yet
    if (transferOrder.status !== 'pending') {
      return res.status(400).json({ error: "Only pending transfer orders can be updated" });
    }

    // Don't allow updates if already submitted for approval (unless admin)
    if (transferOrder.submittedForApproval && req.user.role !== 'admin') {
      return res.status(400).json({ error: "Cannot update transfer order that has been submitted for approval" });
    }

    // Only allow the creator or admin to update
    if (req.user.role !== 'admin' && transferOrder.requestedById !== req.user.id) {
      return res.status(403).json({ error: "You can only update your own transfer orders" });
    }

    // Update the transfer order
    await transferOrder.update({
      requestedQuantity: requestedQuantity || transferOrder.requestedQuantity,
      priority: priority || transferOrder.priority,
      reason: reason || transferOrder.reason,
      expectedDate: expectedDate || transferOrder.expectedDate
    });

    // Fetch updated transfer order with associations
    const updatedTransferOrder = await TransferOrder.findByPk(id, {
      include: [
        { model: Warehouse, as: 'fromWarehouse' },
        { model: Warehouse, as: 'toWarehouse' },
        { 
          model: Item, 
          as: 'item',
          include: [
            { model: Category, as: 'category', attributes: ['id', 'name'] }
          ]
        },
        { model: User, as: 'requestedBy', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.json({
      message: "Transfer order updated successfully",
      transferOrder: updatedTransferOrder
    });
  } catch (error) {
    console.error("Update transfer order error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// SUBMIT TRANSFER ORDER FOR APPROVAL (WAREHOUSE ROLE)
// =========================
exports.submitTransferOrder = async (req, res) => {
  try {
    if (!['warehouse', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: "Only warehouse staff and admins can submit transfer orders" });
    }

    const { id } = req.params;

    // Find the transfer order
    const transferOrder = await TransferOrder.findByPk(id);
    if (!transferOrder) {
      return res.status(404).json({ error: "Transfer order not found" });
    }

    // Only allow submission for pending orders that haven't been submitted yet
    if (transferOrder.status !== 'pending') {
      return res.status(400).json({ error: "Only pending transfer orders can be submitted for approval" });
    }

    if (transferOrder.submittedForApproval) {
      return res.status(400).json({ error: "Transfer order has already been submitted for approval" });
    }

    // Only allow the creator or admin to submit
    if (req.user.role !== 'admin' && transferOrder.requestedById !== req.user.id) {
      return res.status(403).json({ error: "You can only submit your own transfer orders" });
    }

    // Mark as submitted for approval
    await transferOrder.update({
      submittedForApproval: true
    });

    // Fetch updated transfer order with associations
    const updatedTransferOrder = await TransferOrder.findByPk(id, {
      include: [
        { model: Warehouse, as: 'fromWarehouse' },
        { model: Warehouse, as: 'toWarehouse' },
        { 
          model: Item, 
          as: 'item',
          include: [
            { model: Category, as: 'category', attributes: ['id', 'name'] }
          ]
        },
        { model: User, as: 'requestedBy', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.json({
      message: "Transfer order submitted for approval successfully",
      transferOrder: updatedTransferOrder
    });
  } catch (error) {
    console.error("Submit transfer order error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// APPROVE/REJECT TRANSFER ORDER (MANAGER/ADMIN ONLY)
// =========================
exports.approveTransferOrder = async (req, res) => {
  try {
    console.log('🔍 Approve Transfer Order Request:', {
      userId: req.user.id,
      userRole: req.user.role,
      transferOrderId: req.params.id,
      requestBody: req.body
    });

    // Allow both manager and admin (admin has override access)
    if (!['manager', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: "Only inventory managers and admins can approve or reject transfer orders" });
    }

    const { id } = req.params;
    const { action, approvedQuantity, notes } = req.body;

    console.log('📋 Processing action:', action, 'for transfer order:', id);

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: "Action must be 'approve' or 'reject'" });
    }

    const transferOrder = await TransferOrder.findByPk(id);
    if (!transferOrder) {
      return res.status(404).json({ error: "Transfer order not found" });
    }

    console.log('📦 Transfer Order Status:', {
      status: transferOrder.status,
      submittedForApproval: transferOrder.submittedForApproval,
      requestedQuantity: transferOrder.requestedQuantity
    });

    if (transferOrder.status !== 'pending' || !transferOrder.submittedForApproval) {
      return res.status(400).json({ error: "Transfer order must be pending and submitted for approval" });
    }

    if (action === 'approve') {
      // Parse and validate approved quantity - use requested quantity if not provided
      const parsedApprovedQuantity = approvedQuantity ? parseInt(approvedQuantity) : transferOrder.requestedQuantity;
      
      if (isNaN(parsedApprovedQuantity) || parsedApprovedQuantity <= 0) {
        return res.status(400).json({ error: "Approved quantity must be greater than 0" });
      }

      if (parsedApprovedQuantity > transferOrder.requestedQuantity) {
        return res.status(400).json({ error: "Approved quantity cannot exceed requested quantity" });
      }

      // Check if source warehouse still has enough stock
      const sourceStockLocation = await StockLocation.findOne({
        where: {
          warehouseId: transferOrder.fromWarehouseId,
          itemId: transferOrder.itemId,
          isActive: true
        }
      });

      if (!sourceStockLocation || sourceStockLocation.currentStock < parsedApprovedQuantity) {
        return res.status(400).json({ 
          error: `Insufficient stock in source warehouse. Available: ${sourceStockLocation?.currentStock || 0}` 
        });
      }

      await transferOrder.update({
        status: 'approved',
        approvedQuantity: parsedApprovedQuantity,
        approvedById: req.user.id,
        approvedAt: new Date(),
        notes: notes || 'Approved by ' + (req.user.role === 'admin' ? 'admin' : 'manager')
      });
      console.log('✅ Transfer Order approved:', id, 'Quantity:', parsedApprovedQuantity);
    } else {
      // Rejection logic
      await transferOrder.update({
        status: 'rejected',
        approvedById: req.user.id,
        approvedAt: new Date(),
        notes: notes || 'Rejected by ' + (req.user.role === 'admin' ? 'admin' : 'manager')
      });
      console.log('❌ Transfer Order rejected:', id);
    }

    const updatedTransferOrder = await TransferOrder.findByPk(id, {
      include: [
        { model: Warehouse, as: 'fromWarehouse', attributes: ['id', 'name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['id', 'name', 'code'] },
        { 
          model: Item, 
          as: 'item', 
          attributes: ['id', 'sku', 'name', 'unitOfMeasure'],
          include: [
            { model: Category, as: 'category', attributes: ['id', 'name'] }
          ]
        },
        { model: User, as: 'requestedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'approvedBy', attributes: ['id', 'name', 'email'] }
      ]
    });

    console.log('✅ Transfer Order processed successfully:', action, id);

    res.json({
      success: true,
      message: `Transfer order ${action}d successfully`,
      transferOrder: updatedTransferOrder
    });
  } catch (error) {
    console.error("❌ Approve transfer order error:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      userRole: req.user?.role,
      transferOrderId: req.params.id
    });
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to process transfer order approval'
    });
  }
};

// =========================
// COMPLETE TRANSFER ORDER (WAREHOUSE ROLE)
// =========================
exports.completeTransferOrder = async (req, res) => {
  try {
    if (!['warehouse'].includes(req.user.role)) {
      return res.status(403).json({ error: "Only warehouse staff can complete transfer orders" });
    }

    const { id } = req.params;
    const { transferredQuantity } = req.body;

    const transferOrder = await TransferOrder.findByPk(id);
    if (!transferOrder) {
      return res.status(404).json({ error: "Transfer order not found" });
    }

    if (transferOrder.status !== 'approved') {
      return res.status(400).json({ error: "Transfer order is not approved" });
    }

    // Parse and validate transferred quantity
    const parsedTransferredQuantity = parseInt(transferredQuantity);
    
    if (!transferredQuantity || isNaN(parsedTransferredQuantity) || parsedTransferredQuantity <= 0) {
      return res.status(400).json({ error: "Transferred quantity must be greater than 0" });
    }

    if (parsedTransferredQuantity > transferOrder.approvedQuantity) {
      return res.status(400).json({ error: "Transferred quantity cannot exceed approved quantity" });
    }

    // Update stock locations
    const sourceStockLocation = await StockLocation.findOne({
      where: {
        warehouseId: transferOrder.fromWarehouseId,
        itemId: transferOrder.itemId,
        isActive: true
      }
    });

    const destinationStockLocation = await StockLocation.findOne({
      where: {
        warehouseId: transferOrder.toWarehouseId,
        itemId: transferOrder.itemId,
        isActive: true
      }
    });

    if (!sourceStockLocation) {
      return res.status(400).json({ error: "Source stock location not found" });
    }

    if (sourceStockLocation.currentStock < parsedTransferredQuantity) {
      return res.status(400).json({ 
        error: `Insufficient stock in source warehouse. Available: ${sourceStockLocation.currentStock}` 
      });
    }

    // Update source warehouse stock
    await sourceStockLocation.update({
      currentStock: sourceStockLocation.currentStock - parsedTransferredQuantity
    }, { userId: req.user.id });

    // Update destination warehouse stock (create if doesn't exist)
    if (destinationStockLocation) {
      await destinationStockLocation.update({
        currentStock: destinationStockLocation.currentStock + parsedTransferredQuantity
      }, { userId: req.user.id });
    } else {
      // Create new stock location in destination warehouse with proper location code
      const destinationWarehouse = await Warehouse.findByPk(transferOrder.toWarehouseId);
      if (!destinationWarehouse) {
        return res.status(400).json({ error: "Destination warehouse not found" });
      }
      
      // Find an available location code by checking existing locations
      let aisle = 'A';
      let rack = '01';
      let bin = '01';
      let locationCode = `${destinationWarehouse.code}-${aisle}-${rack}-${bin}`;
      
      // Check if this location code already exists, if so, increment bin number
      let binNumber = 1;
      while (await StockLocation.findOne({ where: { locationCode } })) {
        binNumber++;
        bin = String(binNumber).padStart(2, '0');
        locationCode = `${destinationWarehouse.code}-${aisle}-${rack}-${bin}`;
        
        // Prevent infinite loop - max 99 bins per rack
        if (binNumber > 99) {
          return res.status(400).json({ error: "No available location codes in destination warehouse" });
        }
      }
      
      console.log('Creating new stock location with unique locationCode:', locationCode);
      
      await StockLocation.create({
        warehouseId: transferOrder.toWarehouseId,
        itemId: transferOrder.itemId,
        locationCode: locationCode,
        aisle: aisle,
        rack: rack,
        bin: bin,
        minStock: 0,
        maxStock: 100,
        currentStock: parsedTransferredQuantity,
        createdById: req.user.id
      });
    }

    // Update transfer order
    await transferOrder.update({
      status: 'completed',
      transferredQuantity: parsedTransferredQuantity,
      completedById: req.user.id,
      completedAt: new Date()
    });

    const updatedTransferOrder = await TransferOrder.findByPk(id, {
      include: [
        { model: Warehouse, as: 'fromWarehouse', attributes: ['id', 'name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['id', 'name', 'code'] },
        { 
          model: Item, 
          as: 'item', 
          attributes: ['id', 'sku', 'name', 'unitOfMeasure'],
          include: [
            { model: Category, as: 'category', attributes: ['id', 'name'] }
          ]
        },
        { model: User, as: 'requestedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'approvedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'completedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'cancelledBy', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.json({
      message: "Transfer order completed successfully",
      transferOrder: updatedTransferOrder
    });
  } catch (error) {
    console.error("Complete transfer order error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// CANCEL TRANSFER ORDER
// =========================
exports.cancelTransferOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const transferOrder = await TransferOrder.findByPk(id);
    if (!transferOrder) {
      return res.status(404).json({ error: "Transfer order not found" });
    }

    // Only allow cancellation if pending or approved
    if (!['pending', 'approved'].includes(transferOrder.status)) {
      return res.status(400).json({ error: "Transfer order cannot be cancelled" });
    }

    // Only warehouse staff or the person who created the order can cancel
    if (req.user.role !== 'warehouse' && req.user.id !== transferOrder.requestedById) {
      return res.status(403).json({ error: "You don't have permission to cancel this transfer order" });
    }

    await transferOrder.update({
      status: 'cancelled',
      cancelledById: req.user.id,
      cancelledAt: new Date()
    });

    const updatedTransferOrder = await TransferOrder.findByPk(id, {
      include: [
        { model: Warehouse, as: 'fromWarehouse', attributes: ['id', 'name', 'code'] },
        { model: Warehouse, as: 'toWarehouse', attributes: ['id', 'name', 'code'] },
        { 
          model: Item, 
          as: 'item', 
          attributes: ['id', 'sku', 'name', 'unitOfMeasure'],
          include: [
            { model: Category, as: 'category', attributes: ['id', 'name'] }
          ]
        },
        { model: User, as: 'requestedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'approvedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'completedBy', attributes: ['id', 'name', 'email'] },
        { model: User, as: 'cancelledBy', attributes: ['id', 'name', 'email'] }
      ]
    });

    res.json({
      message: "Transfer order cancelled successfully",
      transferOrder: updatedTransferOrder
    });
  } catch (error) {
    console.error("Cancel transfer order error:", error);
    res.status(500).json({ error: error.message });
  }
};