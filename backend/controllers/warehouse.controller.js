const { Warehouse, User, StockLocation } = require("../models");
const { Op } = require("sequelize");

// Get all warehouses
exports.getAllWarehouses = async (req, res) => {
  try {
    const { active = 'true', includeStockCount = 'false' } = req.query;

    const whereClause = {};
    if (active !== 'all') {
      whereClause.isActive = active === 'true';
    }

    const includeOptions = [
      { model: User, as: 'createdBy', attributes: ['id', 'name'] }
    ];

    if (includeStockCount === 'true') {
      includeOptions.push({
        model: StockLocation,
        as: 'stockLocations',
        attributes: [],
        required: false
      });
    }

    const warehouses = await Warehouse.findAll({
      where: whereClause,
      include: includeOptions,
      attributes: includeStockCount === 'true' 
        ? ['id', 'name', 'code', 'address', 'contactPerson', 'contactPhone', 'contactEmail', 'isActive', 'createdAt',
           [Warehouse.sequelize.fn('COUNT', Warehouse.sequelize.col('stockLocations.id')), 'stockLocationCount']]
        : ['id', 'name', 'code', 'address', 'contactPerson', 'contactPhone', 'contactEmail', 'isActive', 'createdAt'],
      group: includeStockCount === 'true' ? ['Warehouse.id', 'createdBy.id'] : undefined,
      order: [['name', 'ASC']]
    });

    res.json(warehouses);
  } catch (error) {
    console.error("Get warehouses error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get warehouse by id
exports.getWarehouseById = async (req, res) => {
  try {
    const { id } = req.params;

    const warehouse = await Warehouse.findByPk(id, {
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'name'] },
        {
          model: StockLocation,
          as: 'stockLocations',
          include: [
            { model: Item, as: 'item', attributes: ['id', 'sku', 'name'] }
          ]
        }
      ]
    });

    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    res.json(warehouse);
  } catch (error) {
    console.error("Get warehouse error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Create warehouse (Admin only)
exports.createWarehouse = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can create warehouses" });
    }

    const { name, code, address, contactPerson, contactPhone, contactEmail } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: "Warehouse name and code are required" });
    }

    // Check if warehouse name or code already exists
    const existingWarehouse = await Warehouse.findOne({ 
      where: { 
        [Op.or]: [
          { name: { [Op.iLike]: name } },
          { code: { [Op.iLike]: code } }
        ]
      } 
    });
    
    if (existingWarehouse) {
      return res.status(400).json({ error: "Warehouse name or code already exists" });
    }

    const warehouse = await Warehouse.create({
      name,
      code: code.toUpperCase(),
      address,
      contactPerson,
      contactPhone,
      contactEmail,
      createdById: req.user.id
    });

    const createdWarehouse = await Warehouse.findByPk(warehouse.id, {
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'name'] }
      ]
    });

    res.status(201).json({
      message: "Warehouse created successfully",
      warehouse: createdWarehouse
    });
  } catch (error) {
    console.error("Create warehouse error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update warehouse (Admin only)
exports.updateWarehouse = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can update warehouses" });
    }

    const { id } = req.params;
    const { name, code, address, contactPerson, contactPhone, contactEmail, isActive } = req.body;

    const warehouse = await Warehouse.findByPk(id);
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    // Check if new name or code conflicts with existing warehouse
    if ((name && name !== warehouse.name) || (code && code !== warehouse.code)) {
      const existingWarehouse = await Warehouse.findOne({ 
        where: { 
          [Op.or]: [
            { name: { [Op.iLike]: name || warehouse.name } },
            { code: { [Op.iLike]: code || warehouse.code } }
          ],
          id: { [Op.ne]: id }
        } 
      });
      
      if (existingWarehouse) {
        return res.status(400).json({ error: "Warehouse name or code already exists" });
      }
    }

    await warehouse.update({
      name: name || warehouse.name,
      code: code ? code.toUpperCase() : warehouse.code,
      address: address !== undefined ? address : warehouse.address,
      contactPerson: contactPerson !== undefined ? contactPerson : warehouse.contactPerson,
      contactPhone: contactPhone !== undefined ? contactPhone : warehouse.contactPhone,
      contactEmail: contactEmail !== undefined ? contactEmail : warehouse.contactEmail,
      isActive: isActive !== undefined ? isActive : warehouse.isActive
    });

    const updatedWarehouse = await Warehouse.findByPk(id, {
      include: [
        { model: User, as: 'createdBy', attributes: ['id', 'name'] }
      ]
    });

    res.json({
      message: "Warehouse updated successfully",
      warehouse: updatedWarehouse
    });
  } catch (error) {
    console.error("Update warehouse error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete warehouse (Admin only)
exports.deleteWarehouse = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can delete warehouses" });
    }

    const { id } = req.params;

    const warehouse = await Warehouse.findByPk(id);
    if (!warehouse) {
      return res.status(404).json({ error: "Warehouse not found" });
    }

    // Check if warehouse has stock locations
    const stockLocationCount = await StockLocation.count({ where: { warehouseId: id } });
    if (stockLocationCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete warehouse. It has ${stockLocationCount} stock locations.` 
      });
    }

    await warehouse.destroy();

    res.json({ message: "Warehouse deleted successfully" });
  } catch (error) {
    console.error("Delete warehouse error:", error);
    res.status(500).json({ error: error.message });
  }
};