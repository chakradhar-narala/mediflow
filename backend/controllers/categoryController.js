const db = require("../database/db");

exports.getCategories = (req, res) => {
  db.all("SELECT * FROM medicine_categories ORDER BY name ASC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    res.json(rows);
  });
};

exports.addCategory = (req, res) => {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Category name is required" });
  }

  db.run("INSERT INTO medicine_categories (name) VALUES (?)", [name], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ message: "Category already exists" });
      }
      return res.status(500).json({ message: err.message });
    }
    res.status(201).json({ message: "Category added successfully", id: this.lastID });
  });
};

exports.deleteCategory = (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM medicine_categories WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.json({ message: "Category deleted successfully" });
  });
};
