const express = require("express");
const router = express.Router();

const {
  getCategories,
  addCategory,
  deleteCategory
} = require("../controllers/categoryController");

const {
  verifyToken,
  verifyRole
} = require("../middleware/authMiddleware");

router.get("/", getCategories);
router.post("/", verifyToken, verifyRole("admin"), addCategory);
router.delete("/:id", verifyToken, verifyRole("admin"), deleteCategory);

module.exports = router;
