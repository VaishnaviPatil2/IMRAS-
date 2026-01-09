const { Category, Item } = require("../models");
const { Op } = require("sequelize");

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const { active = 'true', includeItemCount = 'false' } = req.query;

    const whereClause = {};
    if (active !== 'all') {
      whereClause.isActive = active === 'true';
    }

    const includeOptions = [];
    if (includeItemCount === 'true') {
      includeOptions.push({
        model: Item,
        as: 'items',
        attributes: [],
        required: false
      });
    }

    const categories = await Category.findAll({
      where: whereClause,
      include: includeOptions,
      attributes: includeItemCount === 'true' 
        ? ['id', 'name', 'description', 'isActive', 'createdAt', 'updatedAt', 
           [Category.sequelize.fn('COUNT', Category.sequelize.col('items.id')), 'itemCount']]
        : ['id', 'name', 'description', 'isActive', 'createdAt', 'updatedAt'],
      group: includeItemCount === 'true' ? ['Category.id'] : undefined,
      order: [['name', 'ASC']]
    });

    res.json(categories);
  } catch (error) {
    console.error("Get categories error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findByPk(id, {
      include: [
        {
          model: Item,
          as: 'items',
          attributes: ['id', 'sku', 'name', 'isActive']
        }
      ]
    });

    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    res.json(category);
  } catch (error) {
    console.error("Get category error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Create category
exports.createCategory = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can create categories" });
    }

    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Category name is required" });
    }

    // Check if category name already exists
    const existingCategory = await Category.findOne({ 
      where: { name: { [Op.iLike]: name } } 
    });
    
    if (existingCategory) {
      return res.status(400).json({ error: "Category name already exists" });
    }

    const category = await Category.create({
      name,
      description
    });

    res.status(201).json({
      message: "Category created successfully",
      category
    });
  } catch (error) {
    console.error("Create category error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can update categories" });
    }

    const { id } = req.params;
    const { name, description, isActive } = req.body;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Check if new name conflicts with existing category
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ 
        where: { 
          name: { [Op.iLike]: name },
          id: { [Op.ne]: id }
        } 
      });
      
      if (existingCategory) {
        return res.status(400).json({ error: "Category name already exists" });
      }
    }

    await category.update({
      name: name || category.name,
      description: description !== undefined ? description : category.description,
      isActive: isActive !== undefined ? isActive : category.isActive
    });

    res.json({
      message: "Category updated successfully",
      category
    });
  } catch (error) {
    console.error("Update category error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admins can delete categories" });
    }

    const { id } = req.params;

    const category = await Category.findByPk(id);
    if (!category) {
      return res.status(404).json({ error: "Category not found" });
    }

    // Check if category has items
    const itemCount = await Item.count({ where: { categoryId: id } });
    if (itemCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete category. It has ${itemCount} items associated with it.` 
      });
    }

    await category.destroy();

    res.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Delete category error:", error);
    res.status(500).json({ error: error.message });
  }
};