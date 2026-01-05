const express = require("express");
const router = express.Router();
const {
  getAllWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse
} = require("../controllers/warehouse.controller");
const { verifyUser } = require("../middleware/authMiddleware");

// Apply authentication middleware to all routes
router.use(verifyUser);

// GET all warehouses
router.get("/", getAllWarehouses);

// GET warehouse by ID
router.get("/:id", getWarehouseById);

// CREATE new warehouse (admin only)
router.post("/", createWarehouse);

// UPDATE warehouse (admin only)
router.put("/:id", updateWarehouse);

// DELETE warehouse (admin only)
router.delete("/:id", deleteWarehouse);

module.exports = router;