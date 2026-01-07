const express = require("express");
const router = express.Router();
const { verifyUser, verifyAdminOrManager } = require("../middleware/authMiddleware");
const {
  createGRN,
  approveGRN,
  getAllGRNs,
  getGRNById
} = require("../controllers/grn.controller");

// Warehouse staff creates GRN
router.post("/", verifyUser, createGRN);

// Inventory manager approves/rejects GRN
router.put("/:id/approve", verifyUser, approveGRN);

// Get all GRNs (Admin/Manager/Warehouse)
router.get("/", verifyUser, getAllGRNs);

// Get single GRN
router.get("/:id", verifyUser, getGRNById);

module.exports = router;