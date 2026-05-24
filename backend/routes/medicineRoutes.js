const express = require("express");
const router = express.Router();

const {
  addMedicine,
  getMedicines,
  updateMedicine,
  deleteMedicine,
  getRecommendations
} = require("../controllers/medicineController");

const {
  verifyToken,
  verifyRole
} = require("../middleware/authMiddleware");

router.get("/", getMedicines);
router.get("/recommendations", getRecommendations);

router.post(
  "/",
  verifyToken,
  verifyRole("admin"),
  addMedicine
);

router.put(
  "/:id",
  verifyToken,
  verifyRole("admin"),
  updateMedicine
);

router.delete(
  "/:id",
  verifyToken,
  verifyRole("admin"),
  deleteMedicine
);

module.exports = router;