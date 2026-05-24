const express = require("express");
const router = express.Router();

const { getAdminAnalytics } = require("../controllers/dashboardController");
const {
  verifyToken,
  verifyRole
} = require("../middleware/authMiddleware");

router.get("/admin", verifyToken, verifyRole("admin", "pharmacist"), getAdminAnalytics);

module.exports = router;
