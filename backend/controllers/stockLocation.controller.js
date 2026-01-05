const { StockLocation, Warehouse, Item, Category, User, sequelize } = require("../models");
const { Op } = require("sequelize");

// =========================
// HELPER FUNCTION: Calculate Effective Reorder Threshold
// =========================
const calculateEffectiveReorderThreshold = (stockLocation, item) => {
  // Item-level reorder threshold: reorderPoint + safetyStock
  const itemReorderThreshold = (item.reorderPoint || 0) + (item.safetyStock || 0);
  
  // Use the higher of: location minStock OR item reorder threshold
  return Math.max(stockLocation.minStock || 0, itemReorderThreshold);
};

// =========================
// HELPER FUNCTION: Determine Stock Status (Updated with very_low_stock)
// =========================
const getStockStatus = (stockLocation, item) => {
  const currentStock = stockLocation.currentStock || 0;
  const effectiveMinimum = calculateEffectiveReorderThreshold(stockLocation, item);
  
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
// GET ALL STOCK LOCATIONS
// =========================
exports.getAllStockLocations = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      warehouse = '', 
      stockStatus = '',
      active = 'true'
    } = req.query;
    
    const offset = (page - 1) * limit;

    const whereClause = {};
    
    if (active !== 'all') {
      whereClause.isActive = active === 'true';
    }

    if (warehouse) {
      whereClause.warehouseId = warehouse;
    }

    // Handle stock status filters
    // NOTE: Only apply SQL-level filtering for 'out' status (simple case)
    // All other status filtering will be done post-query for accuracy
    if (stockStatus === 'out') {
      // Out of stock: current stock = 0 (simple SQL filter)
      whereClause.currentStock = 0;
    }
    // For 'low' and 'sufficient' status, we'll filter after calculating effective minimum

    // Enhanced search functionality - simplified approach
    const includeClause = [
      { 
        model: Warehouse, 
        as: 'warehouse', 
        attributes: ['id', 'name', 'code']
      },
      { 
        model: Item, 
        as: 'item', 
        attributes: ['id', 'sku', 'name', 'unitOfMeasure', 'reorderPoint', 'safetyStock'],
        include: [
          { model: Category, as: 'category', attributes: ['id', 'name'] }
        ]
      },
      { model: User, as: 'createdBy', attributes: ['id', 'name'] },
      { model: User, as: 'updatedBy', attributes: ['id', 'name'] }
    ];

    // Build comprehensive where clause
    let finalWhereClause = whereClause;
    
    if (search) {
      // Add search conditions to main where clause
      finalWhereClause = {
        ...whereClause,
        [Op.or]: [
          { locationCode: { [Op.iLike]: `%${search}%` } },
          { aisle: { [Op.iLike]: `%${search}%` } },
          { rack: { [Op.iLike]: `%${search}%` } },
          { bin: { [Op.iLike]: `%${search}%` } },
          { '$warehouse.name$': { [Op.iLike]: `%${search}%` } },
          { '$item.name$': { [Op.iLike]: `%${search}%` } },
          { '$item.sku$': { [Op.iLike]: `%${search}%` } }
        ]
      };
    }

    const stockLocations = await StockLocation.findAndCountAll({
      where: finalWhereClause,
      include: includeClause,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      subQuery: false // Important for searching in included models
    });

    // Add calculated fields to each stock location
    let enhancedStockLocations = stockLocations.rows.map(location => {
      const locationData = location.toJSON();
      const item = locationData.item;
      
      // Calculate effective reorder threshold
      const itemReorderThreshold = (item.reorderPoint || 0) + (item.safetyStock || 0);
      const effectiveMinimum = Math.max(locationData.minStock || 0, itemReorderThreshold);
      
      // Determine stock status
      const stockStatus = getStockStatus(locationData, item);
      
      return {
        ...locationData,
        effectiveMinimum,
        itemReorderThreshold,
        stockStatus
      };
    });

    // Apply accurate stock status filter post-query for all status types
    if (stockStatus && stockStatus !== 'out') {
      enhancedStockLocations = enhancedStockLocations.filter(location => {
        switch (stockStatus) {
          case 'low':
            return location.stockStatus === 'low_stock';
          case 'very_low':
            return location.stockStatus === 'very_low_stock';
          case 'sufficient':
            return location.stockStatus === 'sufficient';
          default:
            return true;
        }
      });
    }

    res.json({
      stockLocations: enhancedStockLocations,
      totalItems: stockLocations.count,
      totalPages: Math.ceil(stockLocations.count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error("Get stock locations error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// GET STOCK LOCATION BY ID
// =========================
exports.getStockLocationById = async (req, res) => {
  try {
    const { id } = req.params;

    const stockLocation = await StockLocation.findByPk(id, {
      include: [
        { 
          model: Warehouse, 
          as: 'warehouse'
        },
        { 
          model: Item, 
          as: 'item',
          include: [
            { model: Category, as: 'category' }
          ]
        },
        { model: User, as: 'createdBy', attributes: ['id', 'name'] },
        { model: User, as: 'updatedBy', attributes: ['id', 'name'] }
      ]
    });

    if (!stockLocation) {
      return res.status(404).json({ error: "Stock location not found" });
    }

    res.json(stockLocation);
  } catch (error) {
    console.error("Get stock location error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// CREATE STOCK LOCATION (WAREHOUSE/ADMIN)
// =========================
exports.createStockLocation = async (req, res) => {
  try {
    console.log('Create stock location request:', req.body);
    console.log('User role:', req.user.role);
    
    if (!['warehouse', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: "Only warehouse staff and admins can create stock locations" });
    }

    const {
      warehouseId,
      itemId,
      aisle,
      rack,
      bin,
      minStock = 0,
      maxStock = 100,
      currentStock = 0
    } = req.body;

    if (!warehouseId || !itemId || !aisle || !rack || !bin) {
      return res.status(400).json({ error: "Warehouse, item, aisle, rack, and bin are required" });
    }

    // Verify warehouse exists
    const warehouse = await Warehouse.findByPk(warehouseId);
    if (!warehouse) {
      return res.status(400).json({ error: "Warehouse not found" });
    }

    // Verify item exists
    const item = await Item.findByPk(itemId);
    if (!item) {
      return res.status(400).json({ error: "Item not found in catalog" });
    }

    // Check if location already exists for this warehouse-item-aisle-rack-bin combination
    const existingLocation = await StockLocation.findOne({
      where: {
        warehouseId,
        itemId,
        aisle: aisle.toUpperCase(),
        rack: rack.toUpperCase(),
        bin: bin.toUpperCase()
      }
    });

    if (existingLocation) {
      return res.status(400).json({ error: "Stock location already exists for this item at this location" });
    }

    // Validate and parse numeric values
    const parsedMinStock = parseInt(minStock) || 0;
    const parsedMaxStock = parseInt(maxStock) || 100;
    const parsedCurrentStock = parseInt(currentStock) || 0;
    
    // Additional validation checks
    if (isNaN(parsedMinStock) || parsedMinStock < 0) {
      return res.status(400).json({ error: "Minimum stock must be a non-negative number" });
    }
    
    if (isNaN(parsedMaxStock) || parsedMaxStock < 1) {
      return res.status(400).json({ error: "Maximum stock must be at least 1" });
    }
    
    if (isNaN(parsedCurrentStock) || parsedCurrentStock < 0) {
      return res.status(400).json({ error: "Current stock must be a non-negative number" });
    }
    
    if (parsedMinStock >= parsedMaxStock) {
      return res.status(400).json({ error: "Maximum stock must be greater than minimum stock" });
    }

    if (parsedCurrentStock > parsedMaxStock) {
      return res.status(400).json({ error: "Current stock cannot exceed maximum stock" });
    }

    // Generate location code manually
    const locationCode = `${warehouse.code}-${aisle.toUpperCase()}-${rack.toUpperCase()}-${bin.toUpperCase()}`;
    console.log('Generated locationCode in controller:', locationCode);

    // Validate locationCode is not empty
    if (!locationCode || locationCode.includes('undefined') || locationCode.includes('null')) {
      return res.status(400).json({ error: "Failed to generate location code. Please check warehouse, aisle, rack, and bin values." });
    }

    console.log('Raw input values:', {
      minStock: minStock, 
      maxStock: maxStock, 
      currentStock: currentStock,
      types: {
        minStock: typeof minStock,
        maxStock: typeof maxStock,
        currentStock: typeof currentStock
      }
    });

    console.log('Parsed values:', {
      warehouseId: parseInt(warehouseId),
      itemId: parseInt(itemId),
      aisle: aisle.toUpperCase(),
      rack: rack.toUpperCase(),
      bin: bin.toUpperCase(),
      minStock: parsedMinStock,
      maxStock: parsedMaxStock,
      currentStock: parsedCurrentStock,
      locationCode: locationCode
    });

    console.log('About to create StockLocation with data:', {
      warehouseId: parseInt(warehouseId),
      itemId: parseInt(itemId),
      locationCode: locationCode,
      aisle: aisle.toUpperCase(),
      rack: rack.toUpperCase(),
      bin: bin.toUpperCase(),
      minStock: parsedMinStock,
      maxStock: parsedMaxStock,
      currentStock: parsedCurrentStock,
      createdById: req.user.id
    });

    const stockLocation = await StockLocation.create({
      warehouseId: parseInt(warehouseId),
      itemId: parseInt(itemId),
      locationCode: locationCode,
      aisle: aisle.toUpperCase(),
      rack: rack.toUpperCase(),
      bin: bin.toUpperCase(),
      minStock: parsedMinStock,
      maxStock: parsedMaxStock,
      currentStock: parsedCurrentStock,
      createdById: req.user.id
    });

    const createdStockLocation = await StockLocation.findByPk(stockLocation.id, {
      include: [
        { model: Warehouse, as: 'warehouse', attributes: ['id', 'name', 'code'] },
        { 
          model: Item, 
          as: 'item', 
          attributes: ['id', 'sku', 'name', 'unitOfMeasure'],
          include: [
            { model: Category, as: 'category', attributes: ['id', 'name'] }
          ]
        },
        { model: User, as: 'createdBy', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json({
      message: "Stock location created successfully",
      stockLocation: createdStockLocation
    });
  } catch (error) {
    console.error("Create stock location error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// UPDATE STOCK LOCATION (WAREHOUSE/ADMIN)
// =========================
exports.updateStockLocation = async (req, res) => {
  try {
    if (!['warehouse', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ error: "Only warehouse staff and admins can update stock locations" });
    }

    const { id } = req.params;
    const {
      aisle,
      rack,
      bin,
      minStock,
      maxStock,
      currentStock,
      isActive
    } = req.body;

    const stockLocation = await StockLocation.findByPk(id);
    if (!stockLocation) {
      return res.status(404).json({ error: "Stock location not found" });
    }

    // Validate min/max stock if provided
    const newMinStock = minStock !== undefined ? minStock : stockLocation.minStock;
    const newMaxStock = maxStock !== undefined ? maxStock : stockLocation.maxStock;
    const newCurrentStock = currentStock !== undefined ? currentStock : stockLocation.currentStock;

    if (newMinStock >= newMaxStock) {
      return res.status(400).json({ error: "Maximum stock must be greater than minimum stock" });
    }

    if (newCurrentStock > newMaxStock) {
      return res.status(400).json({ error: "Current stock cannot exceed maximum stock" });
    }

    await stockLocation.update({
      aisle: aisle ? aisle.toUpperCase() : stockLocation.aisle,
      rack: rack ? rack.toUpperCase() : stockLocation.rack,
      bin: bin ? bin.toUpperCase() : stockLocation.bin,
      minStock: newMinStock,
      maxStock: newMaxStock,
      currentStock: newCurrentStock,
      isActive: isActive !== undefined ? isActive : stockLocation.isActive,
      updatedById: req.user.id
    });

    const updatedStockLocation = await StockLocation.findByPk(id, {
      include: [
        { model: Warehouse, as: 'warehouse', attributes: ['id', 'name', 'code'] },
        { 
          model: Item, 
          as: 'item', 
          attributes: ['id', 'sku', 'name', 'unitOfMeasure'],
          include: [
            { model: Category, as: 'category', attributes: ['id', 'name'] }
          ]
        },
        { model: User, as: 'createdBy', attributes: ['id', 'name'] },
        { model: User, as: 'updatedBy', attributes: ['id', 'name'] }
      ]
    });

    res.json({
      message: "Stock location updated successfully",
      stockLocation: updatedStockLocation
    });
  } catch (error) {
    console.error("Update stock location error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// DELETE STOCK LOCATION (ADMIN ONLY)
// =========================
exports.deleteStockLocation = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can delete stock locations" });
    }

    const { id } = req.params;

    const stockLocation = await StockLocation.findByPk(id);
    if (!stockLocation) {
      return res.status(404).json({ error: "Stock location not found" });
    }

    if (stockLocation.currentStock > 0) {
      return res.status(400).json({ 
        error: "Cannot delete stock location with current stock. Please transfer stock first." 
      });
    }

    await stockLocation.destroy();

    res.json({ message: "Stock location deleted successfully" });
  } catch (error) {
    console.error("Delete stock location error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// GET LOW STOCK ITEMS
// =========================
exports.getLowStockItems = async (req, res) => {
  try {
    // Get all active stock locations with their items
    const stockLocations = await StockLocation.findAll({
      where: {
        isActive: true
      },
      include: [
        { model: Warehouse, as: 'warehouse', attributes: ['id', 'name', 'code'] },
        { 
          model: Item, 
          as: 'item', 
          attributes: ['id', 'sku', 'name', 'unitOfMeasure', 'reorderPoint', 'safetyStock'],
          include: [
            { model: Category, as: 'category', attributes: ['id', 'name'] }
          ]
        }
      ]
    });

    // Filter for low stock items using proper reorder logic
    const lowStockItems = stockLocations.filter(location => {
      const item = location.item;
      
      // Calculate total reorder threshold: Item's reorderPoint + safetyStock
      const itemReorderThreshold = (item.reorderPoint || 0) + (item.safetyStock || 0);
      
      // Use the higher of: location minStock OR item reorder threshold
      const effectiveMinimum = Math.max(location.minStock, itemReorderThreshold);
      
      // Item is low stock if current stock <= effective minimum
      return location.currentStock <= effectiveMinimum;
    });

    // Sort by urgency (lowest stock first)
    lowStockItems.sort((a, b) => a.currentStock - b.currentStock);

    res.json(lowStockItems);
  } catch (error) {
    console.error("Get low stock items error:", error);
    res.status(500).json({ error: error.message });
  }
};