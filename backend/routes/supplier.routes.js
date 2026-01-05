const express = require("express");
const router = express.Router();
const { Supplier, User } = require("../models");
const { Op } = require("sequelize");
const bcrypt = require("bcryptjs");
const { verifyAdmin, verifyUser} = require("../middleware/authMiddleware");

// ➕ Add new supplier (Admin only)
router.post("/add", verifyAdmin, async (req, res) => {
  try {
    const { name, email, contactNumber, address, leadTimeDays, pricingTier } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: "Name and Email are required" });
    }

    // Check if supplier with email already exists
    const existingSupplier = await Supplier.findOne({ where: { email } });
    if (existingSupplier) {
      return res.status(400).json({
        message: "Supplier with this email already exists",
      });
    }

    // Create supplier user account first
    const hashedPassword = await bcrypt.hash('supplier123', 10); // Default password - should be changed
    const supplierUser = await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'supplier'
    });

    // Create supplier profile
    const supplier = await Supplier.create({
      name,
      email,
      contactNumber: contactNumber || '',
      address: address || '',
      leadTimeDays: leadTimeDays || 7,
      pricingTier: pricingTier || 'Standard',
      userId: supplierUser.id
    });

    // Get supplier with user details
    const supplierWithUser = await Supplier.findByPk(supplier.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }
      ]
    });

    res.status(201).json({
      message: "Supplier added successfully",
      supplier: supplierWithUser,
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        message: "Supplier with this email already exists",
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// 🔄 Update supplier (Admin only)
router.put("/update/:id", verifyAdmin, async (req, res) => {
  try {
    const { name, email, contactNumber, address, leadTimeDays, pricingTier } = req.body;

    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    // Update supplier
    await supplier.update({
      name: name || supplier.name,
      email: email || supplier.email,
      contactNumber: contactNumber !== undefined ? contactNumber : supplier.contactNumber,
      address: address !== undefined ? address : supplier.address,
      leadTimeDays: leadTimeDays !== undefined ? leadTimeDays : supplier.leadTimeDays,
      pricingTier: pricingTier || supplier.pricingTier
    });

    // Update associated user if name or email changed
    if (name || email) {
      await User.update(
        {
          name: name || supplier.name,
          email: email || supplier.email
        },
        { where: { id: supplier.userId } }
      );
    }

    // Get updated supplier with user details
    const updatedSupplier = await Supplier.findByPk(supplier.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }
      ]
    });

    res.json({
      message: "Supplier updated successfully",
      supplier: updatedSupplier,
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        message: "Email already exists for another supplier",
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// 🗑 Delete supplier (Admin only)
router.delete("/delete/:id", verifyAdmin, async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    // Check if supplier has active purchase orders
    // Note: Uncomment when PO module is ready
    // const activePOs = await PurchaseOrder.count({ where: { supplierId: supplier.id, status: ['draft', 'sent', 'acknowledged'] } });
    // if (activePOs > 0) {
    //   return res.status(400).json({ message: "Cannot delete supplier with active purchase orders" });
    // }

    // Delete associated user account
    await User.destroy({ where: { id: supplier.userId } });
    
    // Delete supplier
    await supplier.destroy();

    res.json({ message: "Supplier deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📦 Get all suppliers (Logged-in users)
router.get("/", verifyUser, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', active = 'true' } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { email: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const suppliers = await Supplier.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      suppliers: suppliers.rows,
      totalSuppliers: suppliers.count,
      totalPages: Math.ceil(suppliers.count / limit),
      currentPage: parseInt(page)
    });
  } catch (error) {
    console.error('Error getting suppliers:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🧪 Simple ping test (No auth required) - MUST BE BEFORE /:id route
router.get("/ping", async (req, res) => {
  try {
    console.log('Backend: Ping route hit');
    res.json({
      message: "Supplier routes are working",
      timestamp: new Date().toISOString(),
      server: "IMRAS Backend"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔧 Fix admin user (No auth required - emergency route)
router.post("/fix-admin", async (req, res) => {
  try {
    console.log('Backend: Fix admin route hit');
    
    // Check if admin exists
    let admin = await User.findOne({ where: { email: "admin@example.com" } });
    
    if (!admin) {
      // Create admin if doesn't exist
      const hashedPassword = await bcrypt.hash("adminpassword", 10);
      admin = await User.create({
        name: "Super Admin",
        email: "admin@example.com",
        password: hashedPassword,
        role: "admin"
      });
      console.log("✅ Admin user created");
    } else {
      // Reset admin password if exists
      const hashedPassword = await bcrypt.hash("adminpassword", 10);
      await admin.update({ password: hashedPassword });
      console.log("✅ Admin password reset");
    }
    
    res.json({
      message: "Admin user fixed successfully",
      email: "admin@example.com",
      password: "adminpassword",
      adminId: admin.id
    });
  } catch (error) {
    console.error('Backend: Fix admin error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🔍 Diagnostic route to check supplier data consistency (Admin only)
router.get("/diagnose", verifyAdmin, async (req, res) => {
  try {
    console.log('Backend: Diagnose route hit');
    
    // Get all suppliers with their user data
    const suppliers = await Supplier.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }
      ]
    });

    // Get all users with supplier role
    const supplierUsers = await User.findAll({
      where: { role: 'supplier' },
      attributes: ['id', 'name', 'email', 'role']
    });

    // Check for inconsistencies
    const issues = [];
    
    // Check for suppliers without user accounts
    const suppliersWithoutUsers = suppliers.filter(s => !s.user);
    if (suppliersWithoutUsers.length > 0) {
      issues.push(`${suppliersWithoutUsers.length} suppliers without user accounts`);
    }

    // Check for supplier users without supplier profiles
    const userIdsWithSupplierProfiles = suppliers.map(s => s.userId);
    const usersWithoutProfiles = supplierUsers.filter(u => !userIdsWithSupplierProfiles.includes(u.id));
    if (usersWithoutProfiles.length > 0) {
      issues.push(`${usersWithoutProfiles.length} supplier users without supplier profiles`);
    }

    // Check for email mismatches
    const emailMismatches = suppliers.filter(s => s.user && s.email !== s.user.email);
    if (emailMismatches.length > 0) {
      issues.push(`${emailMismatches.length} suppliers with email mismatches`);
    }

    res.json({
      message: "Supplier data diagnosis complete",
      totalSuppliers: suppliers.length,
      totalSupplierUsers: supplierUsers.length,
      issues: issues,
      suppliers: suppliers.map(s => ({
        id: s.id,
        name: s.name,
        email: s.email,
        userId: s.userId,
        userExists: !!s.user,
        userEmail: s.user?.email,
        emailMatch: s.user ? s.email === s.user.email : false
      })),
      orphanedUsers: usersWithoutProfiles.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role
      }))
    });
  } catch (error) {
    console.error('Backend: Diagnose error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 🧪 Test route for debugging (Admin only) - MUST BE BEFORE /:id route
router.get("/test/:id", verifyAdmin, async (req, res) => {
  try {
    console.log('Backend: Test route hit with ID:', req.params.id);
    const supplier = await Supplier.findByPk(req.params.id);
    res.json({
      message: "Test route working",
      supplierId: req.params.id,
      supplierFound: !!supplier,
      supplier: supplier ? { id: supplier.id, name: supplier.name, userId: supplier.userId } : null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔑 Reset supplier password (Admin only) - MUST BE BEFORE /:id route
router.post("/reset-password/:id", verifyAdmin, async (req, res) => {
  try {
    console.log('Backend: Reset password route hit with ID:', req.params.id); // Debug log
    console.log('Backend: User from token:', req.user); // Debug log
    
    const supplierId = parseInt(req.params.id);
    if (isNaN(supplierId)) {
      return res.status(400).json({ message: "Invalid supplier ID" });
    }

    console.log('Backend: Looking for supplier with ID:', supplierId); // Debug log
    
    const supplier = await Supplier.findByPk(supplierId);
    if (!supplier) {
      console.log('Backend: Supplier not found with ID:', supplierId); // Debug log
      return res.status(404).json({ message: "Supplier not found" });
    }

    console.log('Backend: Found supplier:', supplier.name, 'User ID:', supplier.userId); // Debug log

    // Check if user exists
    const user = await User.findByPk(supplier.userId);
    if (!user) {
      console.log('Backend: User not found with ID:', supplier.userId); // Debug log
      return res.status(404).json({ message: "Supplier user account not found" });
    }

    console.log('Backend: Found user:', user.email); // Debug log

    // Reset password to default
    const hashedPassword = await bcrypt.hash('supplier123', 10);
    const updateResult = await User.update(
      { password: hashedPassword },
      { where: { id: supplier.userId } }
    );

    console.log('Backend: Password update result:', updateResult); // Debug log

    res.json({
      message: "Supplier password reset successfully",
      defaultPassword: "supplier123",
      supplierId: supplier.id,
      userId: supplier.userId,
      supplierName: supplier.name,
      userEmail: user.email
    });
  } catch (error) {
    console.error('Backend: Error resetting password:', error); // Debug log
    res.status(500).json({ 
      error: error.message,
      stack: error.stack 
    });
  }
});

// 📋 Get single supplier (Logged-in users) - MUST BE LAST among specific routes
router.get("/:id", verifyUser, async (req, res) => {
  try {
    const supplier = await Supplier.findByPk(req.params.id, {
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }
      ]
    });

    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🧹 Clean up supplier data inconsistencies (Admin only)
router.post("/cleanup", verifyAdmin, async (req, res) => {
  try {
    console.log('Backend: Cleanup route hit');
    
    const results = {
      orphanedUsersRemoved: 0,
      emailMismatchesFixed: 0,
      suppliersWithoutUsersRemoved: 0
    };

    // Get all suppliers with their user data
    const suppliers = await Supplier.findAll({
      include: [
        { model: User, as: 'user', attributes: ['id', 'name', 'email', 'role'] }
      ]
    });

    // Get all users with supplier role
    const supplierUsers = await User.findAll({
      where: { role: 'supplier' },
      attributes: ['id', 'name', 'email', 'role']
    });

    // 1. Remove orphaned supplier users (users without supplier profiles)
    const userIdsWithSupplierProfiles = suppliers.map(s => s.userId);
    const orphanedUsers = supplierUsers.filter(u => !userIdsWithSupplierProfiles.includes(u.id));
    
    for (const orphanedUser of orphanedUsers) {
      await User.destroy({ where: { id: orphanedUser.id } });
      results.orphanedUsersRemoved++;
      console.log(`Removed orphaned supplier user: ${orphanedUser.email}`);
    }

    // 2. Fix email mismatches (sync supplier email with user email)
    const emailMismatches = suppliers.filter(s => s.user && s.email !== s.user.email);
    
    for (const supplier of emailMismatches) {
      await supplier.update({ email: supplier.user.email });
      results.emailMismatchesFixed++;
      console.log(`Fixed email mismatch for supplier: ${supplier.name}`);
    }

    // 3. Remove suppliers without user accounts
    const suppliersWithoutUsers = suppliers.filter(s => !s.user);
    
    for (const supplier of suppliersWithoutUsers) {
      await supplier.destroy();
      results.suppliersWithoutUsersRemoved++;
      console.log(`Removed supplier without user account: ${supplier.name}`);
    }

    res.json({
      message: "Supplier data cleanup complete",
      results: results
    });
  } catch (error) {
    console.error('Backend: Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;