const express = require("express");
const router = express.Router();

const {
  placeOrder,
  getOrders,
  getOrderDetails,
  updateOrderStatus
} = require("../controllers/orderController");

const { verifyToken } = require("../middleware/authMiddleware");

router.post("/", verifyToken, placeOrder);
router.get("/", verifyToken, getOrders);
router.get("/:id", verifyToken, getOrderDetails);
router.put("/:id/status", verifyToken, updateOrderStatus);

module.exports = router;