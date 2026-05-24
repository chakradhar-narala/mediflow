const express = require("express");
const router = express.Router();

const upload = require("../utils/multer");
const {
  uploadPrescription,
  getPrescriptions,
  updatePrescriptionStatus
} = require("../controllers/prescriptionController");

const {
  verifyToken,
  verifyRole
} = require("../middleware/authMiddleware");

router.post("/", verifyToken, upload.single("image"), uploadPrescription);
router.get("/", verifyToken, getPrescriptions);
router.put("/:id/status", verifyToken, verifyRole("pharmacist", "admin"), updatePrescriptionStatus);

module.exports = router;