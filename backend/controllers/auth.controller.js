const { User, Supplier } = require("../models");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// =========================
// REGISTER USER
// =========================
exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    console.log("Register payload:", req.body);

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // ------------------------
    // SAFE ROLE ASSIGNMENT
    // ------------------------
    let assignedRole = "warehouse"; // default public register

    if (req.user?.role === "admin" && role) {
      if (["admin", "manager", "warehouse", "supplier"].includes(role)) {
        assignedRole = role;
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: assignedRole,
    });

    console.log("✅ User saved:", user.email, "Role:", user.role);

    res.status(201).json({
      message: "User registered successfully",
      role: user.role,
    });
  } catch (error) {
    console.error("Register error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// LOGIN USER
// =========================
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Wrong password" });
    }

    // ------------------------
    // SUPPLIER ID ATTACHMENT
    // ------------------------
    let supplierId = null;

    if (user.role === "supplier") {
      const supplier = await Supplier.findOne({ where: { userId: user.id } });
      if (supplier) {
        supplierId = supplier.id;
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        name: user.name,
        supplierId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      role: user.role,
      name: user.name,
      supplierId,
    });
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// ADMIN: CREATE USER WITH ANY ROLE
// =========================
exports.createUserByAdmin = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    if (!["admin", "manager", "warehouse", "supplier"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    console.log("✅ Admin created user:", user.email, "Role:", user.role);

    res.status(201).json({
      message: "User created successfully",
      role: user.role,
    });
  } catch (error) {
    console.error("Admin create user error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// ADMIN: UPDATE USER ROLE
// =========================
exports.updateUserRole = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!["admin", "manager", "warehouse", "supplier"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.role = role;
    await user.save();

    console.log(
      "✅ Admin updated user role:",
      user.email,
      "New Role:",
      user.role
    );

    res.json({
      message: `Role updated to ${role}`,
      user,
    });
  } catch (error) {
    console.error("Admin update role error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// ADMIN: GET ALL USERS
// =========================
exports.getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      message: "Users retrieved successfully",
      users
    });
  } catch (error) {
    console.error("Get all users error:", error.message);
    res.status(500).json({ error: error.message });
  }
};

// =========================
// ADMIN: DELETE USER
// =========================
exports.deleteUser = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }

    const { id } = req.params;

    // Prevent admin from deleting themselves
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ message: "Cannot delete your own account" });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.destroy();

    console.log("✅ Admin deleted user:", user.email);

    res.json({
      message: "User deleted successfully"
    });
  } catch (error) {
    console.error("Delete user error:", error.message);
    res.status(500).json({ error: error.message });
  }
};