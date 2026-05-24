const db = require("./db");
const bcrypt = require("bcryptjs");

db.serialize(() => {
  // 1. Users Table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('customer', 'pharmacist', 'delivery', 'admin'))
    )
  `);

  // 2. Medicine Categories Table
  db.run(`
    CREATE TABLE IF NOT EXISTS medicine_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )
  `);

  // 3. Suppliers Table
  db.run(`
    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      contact TEXT,
      email TEXT,
      address TEXT
    )
  `);

  // 4. Medicines Table
  db.run(`
    CREATE TABLE IF NOT EXISTS medicines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL CHECK(price >= 0),
      stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
      expiry_date TEXT NOT NULL,
      category_id INTEGER,
      supplier_id INTEGER,
      requires_prescription INTEGER NOT NULL DEFAULT 0 CHECK(requires_prescription IN (0, 1)),
      image TEXT,
      FOREIGN KEY(category_id) REFERENCES medicine_categories(id) ON DELETE SET NULL,
      FOREIGN KEY(supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
    )
  `);

  // 5. Orders Table
  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      total_amount REAL NOT NULL CHECK(total_amount >= 0),
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected', 'shipped', 'delivered', 'cancelled')),
      delivery_address TEXT NOT NULL,
      razorpay_order_id TEXT,
      razorpay_payment_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Migration for existing database
  db.run("ALTER TABLE orders ADD COLUMN razorpay_order_id TEXT", (err) => {
    // Ignore error (e.g. if column already exists)
  });
  db.run("ALTER TABLE orders ADD COLUMN razorpay_payment_id TEXT", (err) => {
    // Ignore error (e.g. if column already exists)
  });

  // 6. Order Items Table
  db.run(`
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      medicine_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL CHECK(quantity > 0),
      price REAL NOT NULL CHECK(price >= 0),
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY(medicine_id) REFERENCES medicines(id)
    )
  `);

  // 7. Prescriptions Table
  db.run(`
    CREATE TABLE IF NOT EXISTS prescriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_id INTEGER,
      image TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      notes TEXT,
      verified_by INTEGER,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE SET NULL,
      FOREIGN KEY(verified_by) REFERENCES users(id)
    )
  `);

  // 8. Inventory (Stock Logs) Table
  db.run(`
    CREATE TABLE IF NOT EXISTS inventory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medicine_id INTEGER NOT NULL,
      change_type TEXT NOT NULL, -- 'initial', 'restock', 'sale', 'adjustment', 'expiry_removal', 'cancellation'
      quantity INTEGER NOT NULL,
      current_stock INTEGER NOT NULL,
      reference_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
    )
  `);

  console.log("Database schema initialized.");

  // Seeding Logic
  // Check if categories exist, if not seed them
  db.get("SELECT COUNT(*) as count FROM medicine_categories", (err, row) => {
    if (err) return console.error("Error checking categories:", err.message);
    if (row.count === 0) {
      console.log("Seeding categories...");
      const stmt = db.prepare("INSERT INTO medicine_categories (name) VALUES (?)");
      const categories = ["Antibiotics", "Painkillers", "Cardiology", "Vitamins", "Diabetes"];
      categories.forEach(cat => stmt.run(cat));
      stmt.finalize();
    }
  });

  // Check if suppliers exist, if not seed them
  db.get("SELECT COUNT(*) as count FROM suppliers", (err, row) => {
    if (err) return console.error("Error checking suppliers:", err.message);
    if (row.count === 0) {
      console.log("Seeding suppliers...");
      const stmt = db.prepare(`
        INSERT INTO suppliers (name, contact, email, address)
        VALUES (?, ?, ?, ?)
      `);
      stmt.run("AstraZeneca Dist.", "+1-555-0199", "orders@astrazeneca.com", "London, UK");
      stmt.run("Pfizer Labs", "+1-555-0144", "distribution@pfizer.com", "New York, USA");
      stmt.run("Novartis India", "+91-22-555021", "sales@novartis.in", "Mumbai, India");
      stmt.run("Sun Pharma", "+91-11-555078", "info@sunpharma.com", "Delhi, India");
      stmt.finalize();
    }
  });

  // Check and seed/sync demo users individually
  const demoUsers = [
    { name: "System Admin", email: "admin@mediflow.com", password: "admin123", role: "admin" },
    { name: "Pharmacist John", email: "pharmacist@mediflow.com", password: "pharma123", role: "pharmacist" },
    { name: "Delivery Agent Sam", email: "delivery@mediflow.com", password: "delivery123", role: "delivery" },
    { name: "John Customer", email: "customer@mediflow.com", password: "customer123", role: "customer" }
  ];

  demoUsers.forEach(u => {
    db.get("SELECT id FROM users WHERE email = ?", [u.email], (err, row) => {
      if (err) return console.error(`Error checking user ${u.email}:`, err.message);
      if (!row) {
        db.run(
          "INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)",
          [u.name, u.email, bcrypt.hashSync(u.password, 10), u.role],
          (err) => {
            if (err) console.error(`Error seeding demo user ${u.email}:`, err.message);
            else console.log(`Seeded demo user: ${u.email}`);
          }
        );
      } else {
        db.run(
          "UPDATE users SET name = ?, password = ?, role = ? WHERE email = ?",
          [u.name, bcrypt.hashSync(u.password, 10), u.role, u.email],
          (err) => {
            if (err) console.error(`Error syncing demo user ${u.email}:`, err.message);
          }
        );
      }
    });
  });

  // Check if medicines exist, if not seed them
  db.get("SELECT COUNT(*) as count FROM medicines", (err, row) => {
    if (err) return console.error("Error checking medicines:", err.message);
    if (row.count === 0) {
      console.log("Seeding medicines...");
      const stmt = db.prepare(`
        INSERT INTO medicines (name, description, price, stock, expiry_date, category_id, supplier_id, requires_prescription, image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      // We'll calculate a few dates (some soon to expire)
      const now = new Date();
      
      const farDate = new Date(now.getFullYear() + 2, now.getMonth(), now.getDate()).toISOString().split('T')[0];
      
      const soonDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 15).toISOString().split('T')[0]; // 15 days from now
      
      const expiredDate = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate()).toISOString().split('T')[0]; // Expired 2 months ago

      // 1. Amoxicillin (requires prescription, Pfizer Labs)
      stmt.run("Amoxicillin 500mg", "Broad-spectrum antibiotic used to treat bacterial infections.", 120.00, 50, farDate, 1, 2, 1, "");
      // 2. Paracetamol (no prescription, AstraZeneca Dist.)
      stmt.run("Paracetamol 650mg", "Analgesic and antipyretic medicine for fever and mild pain relief.", 20.00, 150, farDate, 2, 1, 0, "");
      // 3. Lipitor (requires prescription, Novartis India)
      stmt.run("Lipitor 20mg", "Statim medication used to prevent cardiovascular disease and lower lipids.", 450.00, 30, farDate, 3, 3, 1, "");
      // 4. Vitamin C (no prescription, Sun Pharma)
      stmt.run("Vitamin C 1000mg", "Immunity booster chewable tablets for daily health support.", 80.00, 200, farDate, 4, 4, 0, "");
      // 5. Metformin (requires prescription, Novartis India)
      stmt.run("Metformin 500mg", "Oral diabetes medicine that helps control blood sugar levels.", 110.00, 40, farDate, 5, 3, 1, "");
      // 6. Ibuprofen (no prescription, AstraZeneca Dist. - Low stock!)
      stmt.run("Ibuprofen 400mg", "Nonsteroidal anti-inflammatory drug (NSAID) for pain and inflammation relief.", 60.00, 8, farDate, 2, 1, 0, "");
      // 7. Aspirin (no prescription, AstraZeneca Dist. - Out of stock!)
      stmt.run("Aspirin 75mg", "Low-dose blood thinner for heart attack and stroke prevention.", 35.00, 0, farDate, 2, 1, 0, "");
      // 8. Cough Syrup (no prescription, Sun Pharma - Soon to expire!)
      stmt.run("Cough Relief Syrup", "Soothing expectorant syrup for throat irritation and dry cough.", 150.00, 25, soonDate, 2, 4, 0, "");
      // 9. Expired Allergy Pill (no prescription, Pfizer Labs - Already Expired!)
      stmt.run("Allergy Relief 10mg", "Antihistamine for seasonal allergy symptoms.", 95.00, 15, expiredDate, 2, 2, 0, "");

      stmt.finalize(() => {
        // Once medicines are seeded, create initial stock movement logs in inventory
        db.all("SELECT id, stock FROM medicines", [], (err, meds) => {
          if (!err && meds) {
            const logStmt = db.prepare(`
              INSERT INTO inventory (medicine_id, change_type, quantity, current_stock, notes)
              VALUES (?, 'initial', ?, ?, 'Initial inventory stock seed')
            `);
            meds.forEach(med => {
              logStmt.run(med.id, med.stock, med.stock);
            });
            logStmt.finalize();
            console.log("Seeded inventory stock movement logs.");
          }
        });
      });
    }
  });
});