const { Item, Category, User, Supplier, StockLocation, PurchaseRequest, PurchaseOrder } = require("../models");
const { Op } = require("sequelize");

// =========================
// GET ALL ITEMS
// =========================
exports.getAllItems = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', category = '', active = 'true' } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { sku: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (category) {
      whereClause.categoryId = category;
    }

    if (active !== 'all') {
      whereClause.isActive = active === 'true';
    }

    const items = await Item.findAndCountAll({
      where: whereClause,
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        { model: User, as: 'createdBy', attributes: ['id', 'name'] },
        { model: User, as: 'updatedBy', attributes: ['id', 'name'] },
        { 
          model: Supplier, 
          as: 'preferredSupplier', 
          attributes: ['id', 'name', 'email', 'leadTimeDays'], 
          required: false 
        }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    // Force include supplier data in response
    const itemsWithSupplierData = items.rows.map(item => {
      return item.toJSON();
    });

    res.json({
      items: itemsWithSupplierData,
      totalItems: items.count,
      totalPages: Math.ceil(items.count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error("Get items error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// GET ITEM BY ID
// =========================
exports.getItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const item = await Item.findByPk(id, {
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'createdBy', attributes: ['id', 'name'] },
        { model: User, as: 'updatedBy', attributes: ['id', 'name'] },
        { model: Supplier, as: 'preferredSupplier', attributes: ['id', 'name', 'email', 'leadTimeDays'], required: false }
      ]
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(item);
  } catch (error) {
    console.error("Get item error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// CREATE ITEM (ADMIN ONLY)
// =========================
exports.createItem = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can create items" });
    }

    const {
      sku,
      name,
      description,
      categoryId,
      unitOfMeasure,
      leadTimeDays,
      dailyConsumption,
      safetyStock,
      reorderPoint,
      preferredSupplierId,
      unitPrice
    } = req.body;

    // Check if SKU already exists
    const existingItem = await Item.findOne({ where: { sku } });
    if (existingItem) {
      return res.status(400).json({ error: "SKU already exists" });
    }

    // Verify category exists
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(400).json({ error: "Category not found" });
    }

    const item = await Item.create({
      sku,
      name,
      description,
      categoryId,
      unitOfMeasure,
      leadTimeDays,
      dailyConsumption: dailyConsumption || 1.0,
      safetyStock,
      reorderPoint,
      preferredSupplierId: preferredSupplierId || null,
      unitPrice: unitPrice || 0,
      createdById: req.user.id
    });

    const createdItem = await Item.findByPk(item.id, {
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'createdBy', attributes: ['id', 'name'] },
        { model: Supplier, as: 'preferredSupplier', attributes: ['id', 'name', 'email', 'leadTimeDays'], required: false }
      ]
    });

    res.status(201).json({
      message: "Item created successfully",
      item: createdItem
    });
  } catch (error) {
    console.error("Create item error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// UPDATE ITEM (ADMIN ONLY)
// =========================
exports.updateItem = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can update items" });
    }

    const { id } = req.params;
    const {
      sku,
      name,
      description,
      categoryId,
      unitOfMeasure,
      leadTimeDays,
      dailyConsumption,
      safetyStock,
      reorderPoint,
      preferredSupplierId,
      unitPrice,
      isActive
    } = req.body;

    const item = await Item.findByPk(id);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Check if new SKU conflicts with existing item
    if (sku && sku !== item.sku) {
      const existingItem = await Item.findOne({ 
        where: { 
          sku,
          id: { [Op.ne]: id }
        } 
      });
      
      if (existingItem) {
        return res.status(400).json({ error: "SKU already exists" });
      }
    }

    // Verify category exists if provided
    if (categoryId && categoryId !== item.categoryId) {
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(400).json({ error: "Category not found" });
      }
    }

    await item.update({
      sku: sku || item.sku,
      name: name || item.name,
      description: description !== undefined ? description : item.description,
      categoryId: categoryId || item.categoryId,
      unitOfMeasure: unitOfMeasure || item.unitOfMeasure,
      leadTimeDays: leadTimeDays !== undefined ? leadTimeDays : item.leadTimeDays,
      dailyConsumption: dailyConsumption !== undefined ? dailyConsumption : item.dailyConsumption,
      safetyStock: safetyStock !== undefined ? safetyStock : item.safetyStock,
      reorderPoint: reorderPoint !== undefined ? reorderPoint : item.reorderPoint,
      preferredSupplierId: preferredSupplierId !== undefined ? (preferredSupplierId || null) : item.preferredSupplierId,
      unitPrice: unitPrice !== undefined ? unitPrice : item.unitPrice,
      isActive: isActive !== undefined ? isActive : item.isActive
    }, { userId: req.user.id });

    const updatedItem = await Item.findByPk(id, {
      include: [
        { model: Category, as: 'category' },
        { model: User, as: 'createdBy', attributes: ['id', 'name'] },
        { model: User, as: 'updatedBy', attributes: ['id', 'name'] },
        { model: Supplier, as: 'preferredSupplier', attributes: ['id', 'name', 'email', 'leadTimeDays'], required: false }
      ]
    });

    res.json({
      message: "Item updated successfully",
      item: updatedItem
    });
  } catch (error) {
    console.error("Update item error:", error);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// DELETE ITEM (ADMIN ONLY)
// =========================
exports.deleteItem = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can delete items" });
    }

    const { id } = req.params;

    const item = await Item.findByPk(id);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    // Check if item is used in stock locations
    const stockLocationCount = await StockLocation.count({ where: { itemId: id } });
    if (stockLocationCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete item. It is used in ${stockLocationCount} stock location(s). Please remove all stock locations first.` 
      });
    }

    // Check if item is used in purchase requests
    const prCount = await PurchaseRequest.count({ where: { itemId: id } });
    if (prCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete item. It is used in ${prCount} purchase request(s).` 
      });
    }

    // Check if item is used in purchase orders
    const poCount = await PurchaseOrder.count({ where: { itemId: id } });
    if (poCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete item. It is used in ${poCount} purchase order(s).` 
      });
    }

    await item.destroy();

    res.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Delete item error:", error);
    res.status(500).json({ error: error.message });
  }
};