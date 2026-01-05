const express = require("express");
const router = express.Router();
const {
  getAllItems,
  getItemById,
  createItem,
  updateItem,
  deleteItem
} = require("../controllers/item.controller");

const {
  verifyAdmin,
  verifyUser
} = require("../middleware/authMiddleware");

// GET all items (all authenticated users can view)
router.get("/", verifyUser, getAllItems);

// GET item by ID (all authenticated users can view)
router.get("/:id", verifyUser, getItemById);

// CREATE item (admin only)
router.post("/", verifyAdmin, createItem);

// UPDATE item (admin only)
router.put("/:id", verifyAdmin, updateItem);

// DELETE item (admin only)
router.delete("/:id", verifyAdmin, deleteItem);

module.exports = router;