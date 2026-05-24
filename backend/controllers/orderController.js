const db = require("../database/db");

exports.placeOrder = (req, res) => {
  const { items, delivery_address, prescription_image, razorpay_order_id, razorpay_payment_id } = req.body;
  const userId = req.user.id;

  if (!razorpay_order_id || !razorpay_payment_id) {
    return res.status(400).json({ message: "Payment transaction details (order ID and payment ID) are required to place an order." });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "No items in order" });
  }
  if (!delivery_address) {
    return res.status(400).json({ message: "Delivery address is required" });
  }

  // Fetch all medicines in the order to validate stock and prescription requirements
  const medicineIds = items.map(i => i.medicine_id);
  const placeholders = medicineIds.map(() => "?").join(",");

  db.all(`SELECT * FROM medicines WHERE id IN (${placeholders})`, medicineIds, (err, medicines) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }

    const medicineMap = {};
    medicines.forEach(m => {
      medicineMap[m.id] = m;
    });

    let requiresPrescription = false;
    let totalAmount = 0;

    // Validate stock and check prescription requirements
    for (const item of items) {
      const med = medicineMap[item.medicine_id];
      if (!med) {
        return res.status(404).json({ message: `Medicine ID ${item.medicine_id} not found` });
      }

      // 1. Prevent ordering out-of-stock or beyond stock quantity
      if (med.stock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for ${med.name}. Available: ${med.stock}, Ordered: ${item.quantity}`
        });
      }

      // Check if medicine is expired
      if (new Date(med.expiry_date) < new Date()) {
        return res.status(400).json({
          message: `${med.name} is expired and cannot be ordered.`
        });
      }

      if (med.requires_prescription === 1) {
        requiresPrescription = true;
      }

      // Calculate total using database price to prevent tampering
      totalAmount += med.price * item.quantity;
    }

    // 2. Validate prescription upload for restricted medicines
    if (requiresPrescription && !prescription_image) {
      return res.status(400).json({
        message: "Prescription upload is required because your cart contains restricted medicines."
      });
    }

    // Determine initial order status:
    // If it requires a prescription, it starts as 'pending' (waiting for prescription verification).
    // If it doesn't require a prescription, it starts as 'approved' (ready to ship).
    const initialStatus = requiresPrescription ? "pending" : "approved";

    // Insert Order
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      const insertOrderQuery = `
        INSERT INTO orders (user_id, total_amount, status, delivery_address, razorpay_order_id, razorpay_payment_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `;

      db.run(insertOrderQuery, [userId, totalAmount, initialStatus, delivery_address, razorpay_order_id, razorpay_payment_id], function (err) {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).json({ message: err.message });
        }

        const orderId = this.lastID;
        let itemsProcessed = 0;
        let hasError = false;

        // Insert Order Items and Update Stock
        items.forEach(item => {
          if (hasError) return;

          const med = medicineMap[item.medicine_id];
          const itemPrice = med.price;

          db.run(
            `INSERT INTO order_items (order_id, medicine_id, quantity, price) VALUES (?, ?, ?, ?)`,
            [orderId, item.medicine_id, item.quantity, itemPrice],
            (err) => {
              if (err) {
                hasError = true;
                db.run("ROLLBACK");
                return res.status(500).json({ message: err.message });
              }

              // Decrement Stock
              const newStock = med.stock - item.quantity;
              db.run(
                `UPDATE medicines SET stock = ? WHERE id = ?`,
                [newStock, item.medicine_id],
                (err) => {
                  if (err) {
                    hasError = true;
                    db.run("ROLLBACK");
                    return res.status(500).json({ message: err.message });
                  }

                  // Log inventory stock movement
                  db.run(
                    `INSERT INTO inventory (medicine_id, change_type, quantity, current_stock, reference_id, notes)
                     VALUES (?, 'sale', ?, ?, ?, ?)`,
                    [
                      item.medicine_id,
                      -item.quantity,
                      newStock,
                      orderId,
                      `Order placed (Order #${orderId})`
                    ]
                  );

                  itemsProcessed++;
                  if (itemsProcessed === items.length && !hasError) {
                    // Create prescription record if uploaded
                    if (requiresPrescription && prescription_image) {
                      db.run(
                        `INSERT INTO prescriptions (user_id, order_id, image, status, notes)
                         VALUES (?, ?, ?, 'pending', ?)`,
                        [userId, orderId, prescription_image, "Uploaded during checkout"],
                        (err) => {
                          if (err) {
                            db.run("ROLLBACK");
                            return res.status(500).json({ message: err.message });
                          }
                          db.run("COMMIT");
                          res.status(201).json({
                            message: "Order placed successfully",
                            orderId,
                            status: initialStatus
                          });
                        }
                      );
                    } else {
                      db.run("COMMIT");
                      res.status(201).json({
                        message: "Order placed successfully",
                        orderId,
                        status: initialStatus
                      });
                    }
                  }
                }
              );
            }
          );
        });
      });
    });
  });
};

exports.getOrders = (req, res) => {
  const role = req.user.role;
  const userId = req.user.id;
  const status = req.query.status || "";

  let query = `
    SELECT o.*, u.name as customer_name, u.email as customer_email,
           (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
    FROM orders o
    LEFT JOIN users u ON o.user_id = u.id
  `;
  let conditions = [];
  let params = [];

  // Role filtering
  if (role === "customer") {
    conditions.push("o.user_id = ?");
    params.push(userId);
  } else if (role === "delivery") {
    // Delivery staff can see approved, shipped, or delivered orders
    conditions.push("o.status IN ('approved', 'shipped', 'delivered')");
  }

  // Status filtering
  if (status) {
    conditions.push("o.status = ?");
    params.push(status);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY o.created_at DESC";

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    res.json(rows);
  });
};

exports.getOrderDetails = (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  const role = req.user.role;

  db.get(
    `SELECT o.*, u.name as customer_name, u.email as customer_email 
     FROM orders o 
     LEFT JOIN users u ON o.user_id = u.id 
     WHERE o.id = ?`,
    [id],
    (err, order) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Access control
      if (role === "customer" && order.user_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Fetch order items
      const itemsQuery = `
        SELECT oi.*, m.name as medicine_name, m.image as medicine_image, m.requires_prescription
        FROM order_items oi
        LEFT JOIN medicines m ON oi.medicine_id = m.id
        WHERE oi.order_id = ?
      `;

      db.all(itemsQuery, [id], (err, items) => {
        if (err) {
          return res.status(500).json({ message: err.message });
        }

        // Fetch prescription if any
        db.get(
          `SELECT * FROM prescriptions WHERE order_id = ?`,
          [id],
          (err, prescription) => {
            res.json({
              ...order,
              items,
              prescription: prescription || null
            });
          }
        );
      });
    }
  );
};

exports.updateOrderStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const userId = req.user.id;
  const role = req.user.role;

  if (!status) {
    return res.status(400).json({ message: "Status is required" });
  }

  db.get("SELECT * FROM orders WHERE id = ?", [id], (err, order) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Role-based status transition restrictions:
    // 1. Customer can only cancel pending/approved orders.
    // 2. Delivery staff can only transition approved -> shipped -> delivered.
    // 3. Pharmacist/Admin can update to any valid status.
    let allowed = false;

    if (role === "admin" || role === "pharmacist") {
      allowed = true;
    } else if (role === "customer") {
      if (order.user_id === userId && status === "cancelled" && (order.status === "pending" || order.status === "approved")) {
        allowed = true;
      }
    } else if (role === "delivery") {
      if (order.status === "approved" && status === "shipped") {
        allowed = true;
      } else if (order.status === "shipped" && status === "delivered") {
        allowed = true;
      }
    }

    if (!allowed) {
      return res.status(403).json({ message: "Action not allowed or invalid status transition" });
    }

    // Perform update
    db.serialize(() => {
      db.run("BEGIN TRANSACTION");

      db.run(`UPDATE orders SET status = ? WHERE id = ?`, [status, id], function (err) {
        if (err) {
          db.run("ROLLBACK");
          return res.status(500).json({ message: err.message });
        }

        // If order is cancelled or rejected, restore stock levels and log movement history!
        if (status === "cancelled" || status === "rejected") {
          db.all("SELECT medicine_id, quantity FROM order_items WHERE order_id = ?", [id], (err, items) => {
            if (err) {
              db.run("ROLLBACK");
              return res.status(500).json({ message: err.message });
            }

            let itemsProcessed = 0;
            let hasError = false;

            items.forEach(item => {
              if (hasError) return;

              // Get current stock
              db.get("SELECT stock, name FROM medicines WHERE id = ?", [item.medicine_id], (err, med) => {
                if (err || !med) {
                  hasError = true;
                  db.run("ROLLBACK");
                  return res.status(500).json({ message: "Error restoring stock" });
                }

                const restoredStock = med.stock + item.quantity;

                db.run(
                  `UPDATE medicines SET stock = ? WHERE id = ?`,
                  [restoredStock, item.medicine_id],
                  (err) => {
                    if (err) {
                      hasError = true;
                      db.run("ROLLBACK");
                      return res.status(500).json({ message: err.message });
                    }

                    // Log stock adjustment
                    db.run(
                      `INSERT INTO inventory (medicine_id, change_type, quantity, current_stock, reference_id, notes)
                       VALUES (?, 'cancellation', ?, ?, ?, ?)`,
                      [
                        item.medicine_id,
                        item.quantity,
                        restoredStock,
                        id,
                        `Order ${status} (Order #${id}) - Stock restored`
                      ]
                    );

                    itemsProcessed++;
                    if (itemsProcessed === items.length && !hasError) {
                      db.run("COMMIT");
                      res.json({ message: `Order status updated to ${status} and stock restored.` });
                    }
                  }
                );
              });
            });
          });
        } else {
          db.run("COMMIT");
          res.json({ message: `Order status updated to ${status}` });
        }
      });
    });
  });
};