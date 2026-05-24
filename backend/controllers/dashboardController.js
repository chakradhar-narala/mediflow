const db = require("../database/db");

exports.getAdminAnalytics = (req, res) => {
  const stats = {
    totalSales: 0,
    totalOrders: 0,
    lowStockCount: 0,
    soonToExpireCount: 0,
    expiredCount: 0,
    pendingPrescriptions: 0,
    lowStockMedicines: [],
    soonToExpireMedicines: [],
    expiredMedicines: [],
    salesByCategory: []
  };

  // Promise-like serial execution helper for queries
  const runQuery = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  };

  const getSingle = (sql, params = []) => {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  };

  async function compileStats() {
    try {
      // 1. Total sales and total orders (excluding cancelled/rejected)
      const salesRow = await getSingle(`
        SELECT COUNT(id) as order_count, SUM(total_amount) as total_revenue
        FROM orders
        WHERE status NOT IN ('cancelled', 'rejected')
      `);
      stats.totalOrders = salesRow.order_count || 0;
      stats.totalSales = salesRow.total_revenue || 0;

      // 2. Low-stock count
      const lowStockRow = await getSingle(`
        SELECT COUNT(id) as count FROM medicines WHERE stock < 10
      `);
      stats.lowStockCount = lowStockRow.count || 0;

      // 3. Expiry stats
      const soonRow = await getSingle(`
        SELECT COUNT(id) as count FROM medicines 
        WHERE date(expiry_date) >= date('now') AND date(expiry_date) <= date('now', '+30 days')
      `);
      stats.soonToExpireCount = soonRow.count || 0;

      const expiredRow = await getSingle(`
        SELECT COUNT(id) as count FROM medicines 
        WHERE date(expiry_date) < date('now')
      `);
      stats.expiredCount = expiredRow.count || 0;

      // 4. Pending prescriptions count
      const pendingPrescRow = await getSingle(`
        SELECT COUNT(id) as count FROM prescriptions WHERE status = 'pending'
      `);
      stats.pendingPrescriptions = pendingPrescRow.count || 0;

      // 5. Low stock list
      stats.lowStockMedicines = await runQuery(`
        SELECT id, name, stock, price FROM medicines WHERE stock < 10 ORDER BY stock ASC
      `);

      // 6. Soon to expire list (30 days)
      stats.soonToExpireMedicines = await runQuery(`
        SELECT id, name, expiry_date, stock FROM medicines 
        WHERE date(expiry_date) >= date('now') AND date(expiry_date) <= date('now', '+30 days')
        ORDER BY expiry_date ASC
      `);

      // 7. Expired list
      stats.expiredMedicines = await runQuery(`
        SELECT id, name, expiry_date, stock FROM medicines 
        WHERE date(expiry_date) < date('now')
        ORDER BY expiry_date ASC
      `);

      // 8. Sales by category
      stats.salesByCategory = await runQuery(`
        SELECT mc.name as category_name, SUM(oi.quantity * oi.price) as revenue, SUM(oi.quantity) as items_sold
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN medicines m ON oi.medicine_id = m.id
        JOIN medicine_categories mc ON m.category_id = mc.id
        WHERE o.status NOT IN ('cancelled', 'rejected')
        GROUP BY mc.id
        ORDER BY revenue DESC
      `);

      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  compileStats();
};
