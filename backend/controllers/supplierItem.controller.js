const { SupplierItem, Supplier, Item, Category } = require('../models');

// Get all supplier-item relationships
exports.getAllSupplierItems = async (req, res) => {
  try {
    const { supplierId, itemId } = req.query;
    
    const whereClause = {};
    if (supplierId) whereClause.supplierId = supplierId;
    if (itemId) whereClause.itemId = itemId;

    const supplierItems = await SupplierItem.findAll({
      where: whereClause,
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'email', 'leadTimeDays']
        },
        {
          model: Item,
          as: 'item',
          attributes: ['id', 'name', 'sku'],
          include: [
            {
              model: Category,
              as: 'category',
              attributes: ['id', 'name']
            }
          ]
        }
      ],
      order: [['supplier', 'name'], ['item', 'name']]
    });

    res.json({
      success: true,
      data: supplierItems,
      count: supplierItems.length
    });

  } catch (error) {
    console.error('Error fetching supplier items:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch supplier items',
      error: error.message
    });
  }
};

// Add item to supplier catalog
exports.addSupplierItem = async (req, res) => {
  try {
    const {
      supplierId,
      itemId,
      supplierSku,
      unitPrice,
      minimumOrderQuantity,
      leadTimeDays,
      isPreferred,
      notes
    } = req.body;

    // Check if relationship already exists
    const existing = await SupplierItem.findOne({
      where: { supplierId, itemId }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'This supplier already supplies this item. Use update instead.'
      });
    }

    const supplierItem = await SupplierItem.create({
      supplierId,
      itemId,
      supplierSku,
      unitPrice: unitPrice || 0,
      minimumOrderQuantity: minimumOrderQuantity || 1,
      leadTimeDays,
      isPreferred: isPreferred || false,
      notes
    });

    const createdSupplierItem = await SupplierItem.findByPk(supplierItem.id, {
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Item,
          as: 'item',
          attributes: ['id', 'name', 'sku']
        }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Item added to supplier catalog successfully',
      data: createdSupplierItem
    });

  } catch (error) {
    console.error('Error adding supplier item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add item to supplier catalog',
      error: error.message
    });
  }
};

// Update supplier-item relationship
exports.updateSupplierItem = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      supplierSku,
      unitPrice,
      minimumOrderQuantity,
      leadTimeDays,
      isActive,
      isPreferred,
      notes
    } = req.body;

    const supplierItem = await SupplierItem.findByPk(id);
    if (!supplierItem) {
      return res.status(404).json({
        success: false,
        message: 'Supplier item relationship not found'
      });
    }

    await supplierItem.update({
      supplierSku: supplierSku !== undefined ? supplierSku : supplierItem.supplierSku,
      unitPrice: unitPrice !== undefined ? unitPrice : supplierItem.unitPrice,
      minimumOrderQuantity: minimumOrderQuantity !== undefined ? minimumOrderQuantity : supplierItem.minimumOrderQuantity,
      leadTimeDays: leadTimeDays !== undefined ? leadTimeDays : supplierItem.leadTimeDays,
      isActive: isActive !== undefined ? isActive : supplierItem.isActive,
      isPreferred: isPreferred !== undefined ? isPreferred : supplierItem.isPreferred,
      notes: notes !== undefined ? notes : supplierItem.notes,
      lastPriceUpdate: unitPrice !== undefined ? new Date() : supplierItem.lastPriceUpdate
    });

    const updatedSupplierItem = await SupplierItem.findByPk(id, {
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'email']
        },
        {
          model: Item,
          as: 'item',
          attributes: ['id', 'name', 'sku']
        }
      ]
    });

    res.json({
      success: true,
      message: 'Supplier item updated successfully',
      data: updatedSupplierItem
    });

  } catch (error) {
    console.error('Error updating supplier item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update supplier item',
      error: error.message
    });
  }
};

// Remove item from supplier catalog
exports.removeSupplierItem = async (req, res) => {
  try {
    const { id } = req.params;

    const supplierItem = await SupplierItem.findByPk(id);
    if (!supplierItem) {
      return res.status(404).json({
        success: false,
        message: 'Supplier item relationship not found'
      });
    }

    await supplierItem.destroy();

    res.json({
      success: true,
      message: 'Item removed from supplier catalog successfully'
    });

  } catch (error) {
    console.error('Error removing supplier item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove supplier item',
      error: error.message
    });
  }
};

// Get suppliers for a specific item
exports.getSuppliersForItem = async (req, res) => {
  try {
    const { itemId } = req.params;

    const suppliers = await SupplierItem.findAll({
      where: {
        itemId: itemId,
        isActive: true
      },
      include: [
        {
          model: Supplier,
          as: 'supplier',
          attributes: ['id', 'name', 'email', 'leadTimeDays', 'pricingTier']
        }
      ],
      order: [
        ['isPreferred', 'DESC'],
        ['unitPrice', 'ASC'],
        ['leadTimeDays', 'ASC']
      ]
    });

    res.json({
      success: true,
      data: suppliers,
      count: suppliers.length
    });

  } catch (error) {
    console.error('Error fetching suppliers for item:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch suppliers for item',
      error: error.message
    });
  }
};