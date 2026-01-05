const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");

const { User, Category, Item, Warehouse, StockLocation, TransferOrder } = require("../models");

const { verifyUser } = require("../middleware/authMiddleware");

router.get("/", verifyUser, async (req, res) => {
  try {
    const role = req.user.role;

    // USERS
    const totalUsers = await User.count();

    // CATEGORIES & ITEMS
    const totalCategories = await Category.count();
    const totalItems = await Item.count();

    // WAREHOUSES
    const totalWarehouses = await Warehouse.count();

    // STOCK LOCATIONS
    const totalStockLocations = await StockLocation.count();

    // LOW STOCK - stock locations using proper reorder logic
    const allStockLocations = await StockLocation.findAll({
      where: {
        isActive: true
      },
      include: [
        { 
          model: Item, 
          as: 'item', 
          attributes: ['name', 'sku', 'reorderPoint', 'safetyStock'],
          where: { isActive: true }
        },
        { 
          model: Warehouse, 
          as: 'warehouse', 
          attributes: ['name', 'code'],
          where: { isActive: true }
        }
      ]
    });

    // Filter for low stock using proper reorder logic
    const lowStockLocations = allStockLocations.filter(location => {
      const item = location.item;
      
      // Calculate total reorder threshold: Item's reorderPoint + safetyStock
      const itemReorderThreshold = (item.reorderPoint || 0) + (item.safetyStock || 0);
      
      // Use the higher of: location minStock OR item reorder threshold
      const effectiveMinimum = Math.max(location.minStock || 0, itemReorderThreshold);
      
      // Item is low stock if current stock <= effective minimum
      return location.currentStock <= effectiveMinimum;
    });

    // TRANSFER ORDERS
    const transferOrdersPending = await TransferOrder.count({ where: { status: "pending" } });
    const transferOrdersApproved = await TransferOrder.count({ where: { status: "approved" } });
    const transferOrdersCompleted = await TransferOrder.count({ where: { status: "completed" } });

    res.json({
      role,

      counts: {
        users: totalUsers,
        categories: totalCategories,
        items: totalItems,
        warehouses: totalWarehouses,
        stockLocations: totalStockLocations,

        transferOrders: {
          pending: transferOrdersPending,
          approved: transferOrdersApproved,
          completed: transferOrdersCompleted
        }
      },

      lowStockLocations
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
