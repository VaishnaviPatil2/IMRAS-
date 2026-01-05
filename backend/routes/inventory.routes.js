const express = require("express");
const router = express.Router();
const Inventory = require("../models/Inventory");
const sendEmail = require("../utils/sendEmail");
const { verifyAdmin } = require("../middleware/authMiddleware");

// ➕ Add new inventory item (ADMIN only)
router.post("/add", verifyAdmin, async (req, res) => {
  try {
    const { productName, quantity, reorderLevel, safetyStock, supplierEmail } = req.body;

    // 🔹 Check existing item by name
    const existingItem = await Inventory.findOne({ productName });
    if (existingItem) {
      existingItem.quantity += Number(quantity);
      existingItem.reorderLevel = reorderLevel ?? existingItem.reorderLevel;
      existingItem.safetyStock = safetyStock ?? existingItem.safetyStock;
      await existingItem.save();

      // ✅ Check Low Stock / Out of Stock
      const totalThreshold = existingItem.reorderLevel + existingItem.safetyStock;
      let status = "Available";
      if (existingItem.quantity === 0) status = "Out of Stock";
      else if (existingItem.quantity <= totalThreshold) status = "Low Stock";

      if (status !== "Available" && supplierEmail) {
        await sendEmail(
          supplierEmail,
          `IMRAS ${status} Alert`,
          `Product ${existingItem.productName} is ${status}. Current Quantity: ${existingItem.quantity}, Threshold: ${totalThreshold}`
        );
      }

      return res.json({ message: "Item quantity merged", status, sku: existingItem.sku, item: existingItem });
    }

    // 🔹 New item
    const sku = productName.substring(0, 3).toUpperCase() + Date.now().toString();
    const item = new Inventory({
      productName,
      quantity,
      reorderLevel,
      safetyStock,
      sku,
      supplierEmail
    });
    await item.save();

    // ✅ Check Low Stock / Out of Stock
    const totalThreshold = item.reorderLevel + item.safetyStock;
    let status = "Available";
    if (item.quantity === 0) status = "Out of Stock";
    else if (item.quantity <= totalThreshold) status = "Low Stock";

    if (status !== "Available" && supplierEmail) {
      await sendEmail(
        supplierEmail,
        `IMRAS ${status} Alert`,
        `Product ${item.productName} is ${status}. Current Quantity: ${item.quantity}, Threshold: ${totalThreshold}`
      );
    }

    res.json({ message: "Product added successfully", status, sku: item.sku, item });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔄 Update inventory item (ADMIN only)
router.put("/update/:id", verifyAdmin, async (req, res) => {
  try {
    const { productName, quantity, reorderLevel, safetyStock, supplierEmail } = req.body;
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Inventory item not found" });

    if (productName !== undefined) item.productName = productName;
    if (quantity !== undefined) item.quantity = quantity;
    if (reorderLevel !== undefined) item.reorderLevel = reorderLevel;
    if (safetyStock !== undefined) item.safetyStock = safetyStock;
    if (supplierEmail !== undefined) item.supplierEmail = supplierEmail;

    await item.save();

    // ✅ Check Low Stock / Out of Stock
    const totalThreshold = item.reorderLevel + item.safetyStock;
    let status = "Available";
    if (item.quantity === 0) status = "Out of Stock";
    else if (item.quantity <= totalThreshold) status = "Low Stock";

    if (status !== "Available" && supplierEmail) {
      await sendEmail(
        supplierEmail,
        `IMRAS ${status} Alert`,
        `Product ${item.productName} is ${status}. Current Quantity: ${item.quantity}, Threshold: ${totalThreshold}`
      );
    }

    res.json({ message: "Inventory updated successfully", status, sku: item.sku, item });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 🔴 Delete inventory item
router.delete("/delete/:id", verifyAdmin, async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ message: "Inventory item not found" });
    await Inventory.findByIdAndDelete(req.params.id);
    res.json({ message: "Inventory item deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📦 Get all inventory items
router.get("/", async (req, res) => {
  try {
    const items = await Inventory.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Get single inventory item by ID
router.get("/:id", async (req, res) => {
  try {
    const item = await Inventory.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Inventory item not found" });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
