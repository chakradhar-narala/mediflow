const db = require("../database/db");

exports.getInventoryLogs = (req, res) => {
  const medicine_id = req.query.medicine_id || "";
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 15;
  const offset = (page - 1) * limit;

  let query = `
    SELECT i.*, m.name as medicine_name 
    FROM inventory i
    LEFT JOIN medicines m ON i.medicine_id = m.id
  `;
  let countQuery = `SELECT COUNT(*) as count FROM inventory i`;
  
  let conditions = [];
  let params = [];

  if (medicine_id) {
    conditions.push("i.medicine_id = ?");
    params.push(medicine_id);
  }

  const whereClause = conditions.length > 0 ? " WHERE " + conditions.join(" AND ") : "";
  query += whereClause + " ORDER BY i.created_at DESC LIMIT ? OFFSET ?";
  countQuery += whereClause;

  db.get(countQuery, params, (err, countRow) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }

    const totalItems = countRow.count;
    const totalPages = Math.ceil(totalItems / limit);

    db.all(query, [...params, limit, offset], (err, rows) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      res.json({
        logs: rows,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          limit
        }
      });
    });
  });
};

exports.adjustStock = (req, res) => {
  const { medicine_id, quantity, change_type, notes } = req.body; // quantity can be positive (restock) or negative

  if (!medicine_id || quantity === undefined) {
    return res.status(400).json({ message: "Medicine ID and quantity are required" });
  }

  db.get("SELECT stock, name FROM medicines WHERE id = ?", [medicine_id], (err, med) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    if (!med) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    const newStock = med.stock + parseInt(quantity);
    if (newStock < 0) {
      return res.status(400).json({ message: "Stock level cannot fall below 0" });
    }

    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      db.run(
        `UPDATE medicines SET stock = ? WHERE id = ?`,
        [newStock, medicine_id],
        (err) => {
          if (err) {
            db.run("ROLLBACK");
            return res.status(500).json({ message: err.message });
          }

          db.run(
            `INSERT INTO inventory (medicine_id, change_type, quantity, current_stock, reference_id, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              medicine_id,
              change_type || "adjustment",
              quantity,
              newStock,
              req.user.id,
              notes || `Manual stock adjustment`
            ],
            (err) => {
              if (err) {
                db.run("ROLLBACK");
                return res.status(500).json({ message: err.message });
              }

              db.run("COMMIT");
              res.json({
                message: `Stock level for ${med.name} updated successfully to ${newStock}`,
                currentStock: newStock
              });
            }
          );
        }
      );
    });
  });
};
