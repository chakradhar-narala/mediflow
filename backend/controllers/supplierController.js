const db = require("../database/db");

exports.getSuppliers = (req, res) => {
  db.all("SELECT * FROM suppliers ORDER BY name ASC", [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    res.json(rows);
  });
};

exports.addSupplier = (req, res) => {
  const { name, contact, email, address } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Supplier name is required" });
  }

  const query = `
    INSERT INTO suppliers (name, contact, email, address)
    VALUES (?, ?, ?, ?)
  `;

  db.run(query, [name, contact || "", email || "", address || ""], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE constraint failed")) {
        return res.status(400).json({ message: "Supplier name already exists" });
      }
      return res.status(500).json({ message: err.message });
    }
    res.status(201).json({ message: "Supplier added successfully", id: this.lastID });
  });
};

exports.updateSupplier = (req, res) => {
  const { id } = req.params;
  const { name, contact, email, address } = req.body;
  if (!name) {
    return res.status(400).json({ message: "Supplier name is required" });
  }

  const query = `
    UPDATE suppliers
    SET name = ?, contact = ?, email = ?, address = ?
    WHERE id = ?
  `;

  db.run(query, [name, contact || "", email || "", address || "", id], function (err) {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.json({ message: "Supplier updated successfully" });
  });
};

exports.deleteSupplier = (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM suppliers WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: "Supplier not found" });
    }
    res.json({ message: "Supplier deleted successfully" });
  });
};
