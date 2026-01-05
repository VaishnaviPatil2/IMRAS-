const express = require("express");
const router = express.Router();
const Inventory = require("../models/Inventory");
const { Parser } = require("json2csv");
const { verifyAdminOrManager } = require("../middleware/authMiddleware");

// 📈 Stock Ageing Report - Admin / Manager only
router.get("/stock-ageing", verifyAdminOrManager, async (req, res) => {
  try {
    // Use lean() to get plain JS objects without Mongoose metadata
    const items = await Inventory.find().sort({ lastUpdated: 1 }).lean();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 📤 Export CSV Report
router.get("/export-csv", async (req, res) => {
  try {
    const items = await Inventory.find();

    // Convert Mongoose documents to plain JS objects
    const plainItems = items.map(item => ({
      productName: item.productName,
      quantity: item.quantity,
      reorderLevel: item.reorderLevel,
      supplierEmail: item.supplierEmail,
      lastUpdated: item.lastUpdated,
      batchNumber: item.batchNumber || "",
      expiryDate: item.expiryDate || "",
      location: item.location || "",
      warehouse: item.warehouse || "",
      serialNumber: item.serialNumber || ""
    }));

    const { Parser } = require("json2csv");
    const parser = new Parser({ fields: Object.keys(plainItems[0]) });
    const csv = parser.parse(plainItems);

    // Set headers for download
    res.header("Content-Type", "text/csv");
    res.attachment("inventory_report.csv"); // filename for download
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


module.exports = router;
