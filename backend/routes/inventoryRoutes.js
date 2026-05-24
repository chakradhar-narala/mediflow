const express = require("express");
const router = express.Router();

const {
  getInventoryLogs,
  adjustStock
} = require("../controllers/inventoryController");

const {
  verifyToken,
  verifyRole
} = require("../middleware/authMiddleware");

// Admins and pharmacists can read and adjust stock
router.get("/logs", verifyToken, verifyRole("admin", "pharmacist"), getInventoryLogs);
router.post("/adjust", verifyToken, verifyRole("admin", "pharmacist"), adjustStock);

module.exports = router;
