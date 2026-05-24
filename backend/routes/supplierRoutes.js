const express = require("express");
const router = express.Router();

const {
  getSuppliers,
  addSupplier,
  updateSupplier,
  deleteSupplier
} = require("../controllers/supplierController");

const {
  verifyToken,
  verifyRole
} = require("../middleware/authMiddleware");

// Admins and pharmacists can view suppliers. Only Admins can modify.
router.get("/", verifyToken, verifyRole("admin", "pharmacist"), getSuppliers);
router.post("/", verifyToken, verifyRole("admin"), addSupplier);
router.put("/:id", verifyToken, verifyRole("admin"), updateSupplier);
router.delete("/:id", verifyToken, verifyRole("admin"), deleteSupplier);

module.exports = router;
