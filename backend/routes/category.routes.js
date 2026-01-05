const express = require("express");
const router = express.Router();
const {
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory
} = require("../controllers/category.controller");

const {
  verifyAdmin,
  verifyUser
} = require("../middleware/authMiddleware");

// GET all categories (all authenticated users can view)
router.get("/", verifyUser, getAllCategories);

// GET category by ID (all authenticated users can view)
router.get("/:id", verifyUser, getCategoryById);

// CREATE category (admin only)
router.post("/", verifyAdmin, createCategory);

// UPDATE category (admin only)
router.put("/:id", verifyAdmin, updateCategory);

// DELETE category (admin only)
router.delete("/:id", verifyAdmin, deleteCategory);

module.exports = router;