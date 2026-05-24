const db = require("../database/db");

exports.uploadPrescription = (req, res) => {
  const file = req.file;
  const userId = req.user.id;
  const orderId = req.body.order_id || null;
  const notes = req.body.notes || "";

  if (!file) {
    return res.status(400).json({ message: "Prescription image file is required" });
  }

  const query = `
    INSERT INTO prescriptions (user_id, order_id, image, status, notes)
    VALUES (?, ?, ?, 'pending', ?)
  `;

  db.run(query, [userId, orderId, file.filename, notes], function (err) {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    res.status(201).json({
      message: "Prescription uploaded successfully",
      id: this.lastID,
      filename: file.filename
    });
  });
};

exports.getPrescriptions = (req, res) => {
  const role = req.user.role;
  const userId = req.user.id;
  const status = req.query.status || "";

  let query = `
    SELECT p.*, u.name as customer_name, u.email as customer_email,
           o.total_amount as order_total, o.status as order_status,
           v.name as verifier_name
    FROM prescriptions p
    LEFT JOIN users u ON p.user_id = u.id
    LEFT JOIN orders o ON p.order_id = o.id
    LEFT JOIN users v ON p.verified_by = v.id
  `;
  let conditions = [];
  let params = [];

  // Role filtering
  if (role === "customer") {
    conditions.push("p.user_id = ?");
    params.push(userId);
  }

  // Status filtering
  if (status) {
    conditions.push("p.status = ?");
    params.push(status);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY p.uploaded_at DESC";

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    res.json(rows);
  });
};

exports.updatePrescriptionStatus = (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body; // 'approved' or 'rejected'
  const verifierId = req.user.id;

  if (!status || !["approved", "rejected"].includes(status)) {
    return res.status(400).json({ message: "Valid status ('approved' or 'rejected') is required" });
  }

  // Start with finding the prescription
  db.get("SELECT order_id FROM prescriptions WHERE id = ?", [id], (err, row) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: "Prescription not found" });
    }

    const orderId = row.order_id;

    // Update prescription
    const updateQuery = `
      UPDATE prescriptions
      SET status = ?, notes = ?, verified_by = ?
      WHERE id = ?
    `;

    db.run(updateQuery, [status, notes || "", verifierId, id], function (err) {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      // If there is an associated order, update it
      if (orderId) {
        if (status === "approved") {
          // Update order status to 'approved' if it was pending
          db.run(
            `UPDATE orders SET status = 'approved' WHERE id = ? AND status = 'pending'`,
            [orderId]
          );
        } else if (status === "rejected") {
          // If rejected, order changes to 'rejected'
          db.get("SELECT status FROM orders WHERE id = ?", [orderId], (err, ord) => {
            if (!err && ord && ord.status === "pending") {
              db.run(`UPDATE orders SET status = 'rejected' WHERE id = ?`, [orderId], () => {
                // Restore stock and log
                db.all("SELECT medicine_id, quantity FROM order_items WHERE order_id = ?", [orderId], (err, items) => {
                  if (!err && items) {
                    items.forEach(item => {
                      db.run("UPDATE medicines SET stock = stock + ? WHERE id = ?", [item.quantity, item.medicine_id]);
                      // Log stock adjustment
                      db.get("SELECT stock FROM medicines WHERE id = ?", [item.medicine_id], (err, med) => {
                        if (!err && med) {
                          db.run(`
                            INSERT INTO inventory (medicine_id, change_type, quantity, current_stock, reference_id, notes)
                            VALUES (?, 'cancellation', ?, ?, ?, 'Stock restored due to prescription rejection')
                          `, [item.medicine_id, item.quantity, med.stock, orderId]);
                        }
                      });
                    });
                  }
                });
              });
            }
          });
        }
      }

      res.json({ message: `Prescription status updated to ${status}` });
    });
  });
};