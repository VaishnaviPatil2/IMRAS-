const express = require("express");
const router = express.Router();
const {
  getAllStockLocations,
  getStockLocationById,
  createStockLocation,
  updateStockLocation,
  deleteStockLocation,
  getLowStockItems
} = require("../controllers/stockLocation.controller");
const { verifyUser } = require("../middleware/authMiddleware");

// Apply authentication middleware to all routes
router.use(verifyUser);

// GET low stock items (MUST be before /:id route)
router.get("/low-stock", getLowStockItems);

// GET all stock locations
router.get("/", getAllStockLocations);

// GET stock location by ID
router.get("/:id", getStockLocationById);

// CREATE new stock location (warehouse/admin)
router.post("/", createStockLocation);

// UPDATE stock location (warehouse/admin)
router.put("/:id", updateStockLocation);

// DELETE stock location (admin only)
router.delete("/:id", deleteStockLocation);

module.exports = router;