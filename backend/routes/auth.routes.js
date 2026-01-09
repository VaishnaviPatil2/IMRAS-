const express = require("express");
const router = express.Router();
const {
  login,
  createUserByAdmin,
  updateUserRole,
  getAllUsers,
  deleteUser
} = require("../controllers/auth.controller");
const { verifyAdmin, verifyUser } = require("../middleware/authMiddleware");

// Admin creates user → protected
router.post("/create", verifyAdmin, createUserByAdmin);

// Admin updates a user's role → protected
router.put("/update-role/:id", verifyAdmin, updateUserRole);

// Admin gets all users → protected
router.get("/users", verifyAdmin, getAllUsers);

// Admin deletes user → protected
router.delete("/users/:id", verifyAdmin, deleteUser);

// Login (all roles)
router.post("/login", login);

// Validate token
router.get("/validate", verifyUser, (req, res) => {
  res.json({ 
    valid: true, 
    user: {
      id: req.user.id,
      role: req.user.role,
      name: req.user.name
    }
  });
});

module.exports = router;
