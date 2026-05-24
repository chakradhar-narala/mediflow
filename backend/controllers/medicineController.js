const db = require("../database/db");

exports.getMedicines = (req, res) => {
  const q = req.query.q || "";
  const category_id = req.query.category_id || "";
  const stock_status = req.query.stock_status || ""; // 'in_stock', 'low_stock', 'out_of_stock'
  const expiry_status = req.query.expiry_status || ""; // 'expired', 'soon', 'normal'
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 8;
  const offset = (page - 1) * limit;

  let queryParams = [];
  let filterConditions = [];

  // Search filter
  if (q) {
    filterConditions.push("(m.name LIKE ? OR m.description LIKE ?)");
    queryParams.push(`%${q}%`, `%${q}%`);
  }

  // Category filter
  if (category_id) {
    filterConditions.push("m.category_id = ?");
    queryParams.push(category_id);
  }

  // Stock status filter
  if (stock_status) {
    if (stock_status === "out_of_stock") {
      filterConditions.push("m.stock = 0");
    } else if (stock_status === "low_stock") {
      filterConditions.push("m.stock > 0 AND m.stock < 10");
    } else if (stock_status === "in_stock") {
      filterConditions.push("m.stock >= 10");
    }
  }

  // Expiry status filter
  if (expiry_status) {
    if (expiry_status === "expired") {
      filterConditions.push("date(m.expiry_date) < date('now')");
    } else if (expiry_status === "soon") {
      filterConditions.push("date(m.expiry_date) >= date('now') AND date(m.expiry_date) <= date('now', '+30 days')");
    } else if (expiry_status === "normal") {
      filterConditions.push("date(m.expiry_date) > date('now', '+30 days')");
    }
  }

  const whereClause = filterConditions.length > 0 ? " WHERE " + filterConditions.join(" AND ") : "";

  // Count query
  const countQuery = `
    SELECT COUNT(*) as count 
    FROM medicines m 
    ${whereClause}
  `;

  db.get(countQuery, queryParams, (err, countRow) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }

    const totalItems = countRow.count;
    const totalPages = Math.ceil(totalItems / limit);

    // Data query
    const dataQuery = `
      SELECT m.*, c.name as category_name, s.name as supplier_name 
      FROM medicines m 
      LEFT JOIN medicine_categories c ON m.category_id = c.id 
      LEFT JOIN suppliers s ON m.supplier_id = s.id 
      ${whereClause}
      ORDER BY m.id DESC
      LIMIT ? OFFSET ?
    `;

    const dataParams = [...queryParams, limit, offset];

    db.all(dataQuery, dataParams, (err, rows) => {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      res.json({
        medicines: rows,
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

exports.addMedicine = (req, res) => {
  const {
    name,
    description,
    price,
    stock,
    expiry_date,
    category_id,
    supplier_id,
    requires_prescription,
    image
  } = req.body;

  if (!name || price === undefined || stock === undefined || !expiry_date) {
    return res.status(400).json({ message: "Name, price, stock, and expiry date are required" });
  }

  const query = `
    INSERT INTO medicines 
    (name, description, price, stock, expiry_date, category_id, supplier_id, requires_prescription, image)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    query,
    [
      name,
      description,
      price,
      stock,
      expiry_date,
      category_id || null,
      supplier_id || null,
      requires_prescription ? 1 : 0,
      image || ""
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ message: err.message });
      }

      const medicineId = this.lastID;

      // Log initial stock in inventory
      db.run(
        `INSERT INTO inventory (medicine_id, change_type, quantity, current_stock, notes)
         VALUES (?, 'initial', ?, ?, 'Initial inventory stock creation')`,
        [medicineId, stock, stock]
      );

      res.status(201).json({
        message: "Medicine added successfully",
        id: medicineId
      });
    }
  );
};

exports.updateMedicine = (req, res) => {
  const { id } = req.params;
  const {
    name,
    description,
    price,
    stock,
    expiry_date,
    category_id,
    supplier_id,
    requires_prescription,
    image
  } = req.body;

  if (!name || price === undefined || stock === undefined || !expiry_date) {
    return res.status(400).json({ message: "Name, price, stock, and expiry date are required" });
  }

  // Get original stock level to log movement history
  db.get("SELECT stock FROM medicines WHERE id = ?", [id], (err, oldMed) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    if (!oldMed) {
      return res.status(404).json({ message: "Medicine not found" });
    }

    const oldStock = oldMed.stock;
    const stockChange = stock - oldStock;

    const query = `
      UPDATE medicines
      SET name = ?, description = ?, price = ?, stock = ?, expiry_date = ?, 
          category_id = ?, supplier_id = ?, requires_prescription = ?, image = ?
      WHERE id = ?
    `;

    db.run(
      query,
      [
        name,
        description,
        price,
        stock,
        expiry_date,
        category_id || null,
        supplier_id || null,
        requires_prescription ? 1 : 0,
        image || "",
        id
      ],
      function (err) {
        if (err) {
          return res.status(500).json({ message: err.message });
        }

        // Log stock level difference if stock changed
        if (stockChange !== 0) {
          db.run(
            `INSERT INTO inventory (medicine_id, change_type, quantity, current_stock, notes)
             VALUES (?, 'adjustment', ?, ?, ?)`,
            [
              id,
              stockChange,
              stock,
              `Manual stock adjustment by admin (from ${oldStock} to ${stock})`
            ]
          );
        }

        res.json({ message: "Medicine updated successfully" });
      }
    );
  });
};

exports.deleteMedicine = (req, res) => {
  const { id } = req.params;

  db.run("DELETE FROM medicines WHERE id = ?", [id], function (err) {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    if (this.changes === 0) {
      return res.status(404).json({ message: "Medicine not found" });
    }
    res.json({ message: "Medicine deleted successfully" });
  });
};

exports.getRecommendations = (req, res) => {
  const categoryId = req.query.category_id;
  const limit = parseInt(req.query.limit) || 4;

  let query = `
    SELECT m.*, c.name as category_name 
    FROM medicines m
    LEFT JOIN medicine_categories c ON m.category_id = c.id
    WHERE m.stock > 0 AND date(m.expiry_date) > date('now')
  `;
  let params = [];

  if (categoryId) {
    query += " AND m.category_id = ? ";
    params.push(categoryId);
  }

  query += " ORDER BY RANDOM() LIMIT ? ";
  params.push(limit);

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ message: err.message });
    }
    res.json(rows);
  });
};