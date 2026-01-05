const express = require("express");
const router = express.Router();
const GRN = require("../models/GRN");
const PO = require("../models/PO");
const Inventory = require("../models/Inventory");
const sendEmail = require("../utils/sendEmail");
const { verifyAdminOrManager } = require("../middleware/authMiddleware");

// Create GRN from Approved PO
router.post("/", verifyAdminOrManager, async (req, res) => {
  try {
    const { poId, receivedQuantity, batchNumber, expiryDate } = req.body;

    if (!poId || !receivedQuantity) {
      return res.status(400).json({ error: "PO ID and received quantity are required" });
    }

    const po = await PO.findById(poId).populate("pr");
    if (!po) return res.status(404).json({ error: "PO not found" });

    if (!["Approved", "Completed"].includes(po.status)) {
      return res.status(400).json({ error: "PO must be approved before creating GRN" });
    }

    // Prevent duplicate GRN for same PO
    const existingGRN = await GRN.findOne({ po: poId });
    if (existingGRN) {
      return res.status(400).json({ error: "GRN already exists for this PO" });
    }

    // Validate quantity
    if (receivedQuantity > po.pr.quantityRequested) {
      return res.status(400).json({ error: "Received quantity cannot exceed ordered quantity" });
    }

    const grn = new GRN({
      po: poId,
      product: po.pr.product,
      quantityReceived,
      batchNumber: batchNumber || null,
      expiryDate: expiryDate || null,
      receivedBy: req.user.id,
      status: "Received"
    });

    await grn.save();

    // Update inventory
    const product = await Inventory.findById(po.pr.product);
    let stockStatus = "Stock level sufficient";
    if (product) {
      product.quantity += receivedQuantity;
      product.lastUpdated = Date.now();
      await product.save();

      const threshold = (product.reorderLevel || 0) + (product.safetyStock || 0);

      if (product.quantity === 0) stockStatus = "🔴 Out of Stock";
      else if (product.quantity <= threshold) stockStatus = "🟡 Low Stock";

      if (stockStatus !== "Stock level sufficient") {
        await sendEmail(
          product.supplierEmail,
          "IMRAS Stock Alert",
          `Product ${product.productName} is low. Current Quantity: ${product.quantity}, Threshold: ${threshold}`
        );
      }
    }

    // Mark PO as completed
    if (po.status !== "Completed") {
      po.status = "Completed";
      await po.save();
    }

    // Send stockStatus with response
    res.status(201).json({ message: "GRN created and inventory updated", grn, stockStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all GRNs
router.get("/", verifyAdminOrManager, async (req, res) => {
  try {
    const grns = await GRN.find()
      .populate({
        path: "po",
        populate: {
          path: "pr",
          populate: [
            { path: "product", select: "productName reorderLevel safetyStock" },
            { path: "supplier", select: "name" },
            { path: "requestedBy", select: "name" }
          ]
        }
      })
      .populate("receivedBy", "name")
      .sort({ createdAt: -1 });

    // Add stockStatus for each GRN
    const grnsWithStatus = grns.map(grn => {
      const product = grn.product;
      let stockStatus = "Stock level sufficient";
      if (product.quantity === 0) stockStatus = "🔴 Out of Stock";
      else if (product.quantity <= (product.reorderLevel + product.safetyStock)) stockStatus = "🟡 Low Stock";
      return { ...grn.toObject(), stockStatus };
    });

    res.json(grnsWithStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get single GRN
router.get("/:id", verifyAdminOrManager, async (req, res) => {
  try {
    const grn = await GRN.findById(req.params.id)
      .populate({
        path: "po",
        populate: {
          path: "pr",
          populate: [
            { path: "product", select: "productName reorderLevel safetyStock" },
            { path: "supplier", select: "name" },
            { path: "requestedBy", select: "name" }
          ]
        }
      })
      .populate("receivedBy", "name");

    if (!grn) return res.status(404).json({ error: "GRN not found" });

    const product = grn.product;
    let stockStatus = "Stock level sufficient";
    if (product.quantity === 0) stockStatus = "🔴 Out of Stock";
    else if (product.quantity <= (product.reorderLevel + product.safetyStock)) stockStatus = "🟡 Low Stock";

    res.json({ ...grn.toObject(), stockStatus });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
