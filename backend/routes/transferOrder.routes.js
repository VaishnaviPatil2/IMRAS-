const express = require("express");
const router = express.Router();
const {
  getAllTransferOrders,
  getTransferOrderById,
  createTransferOrder,
  updateTransferOrder,
  submitTransferOrder,
  approveTransferOrder,
  completeTransferOrder,
  cancelTransferOrder
} = require("../controllers/transferOrder.controller");
const { verifyUser } = require("../middleware/authMiddleware");

// Apply authentication middleware to all routes
router.use(verifyUser);

// GET all transfer orders
router.get("/", getAllTransferOrders);

// GET transfer order by ID
router.get("/:id", getTransferOrderById);

// CREATE new transfer order (warehouse/admin)
router.post("/", createTransferOrder);

// UPDATE transfer order (warehouse/admin) - only for pending orders
router.put("/:id", updateTransferOrder);

// SUBMIT transfer order for approval (warehouse/admin) - changes draft to pending
router.patch("/:id/submit", submitTransferOrder);

// APPROVE/REJECT transfer order (manager/admin)
router.patch("/:id/approve", approveTransferOrder);

// COMPLETE transfer order (warehouse/admin)
router.patch("/:id/complete", completeTransferOrder);

// CANCEL transfer order
router.patch("/:id/cancel", cancelTransferOrder);

module.exports = router;