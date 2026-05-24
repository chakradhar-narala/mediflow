const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

require("dotenv").config();
require("./database/initDB");

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("Created uploads directory");
}

const authRoutes = require("./routes/authRoutes");
const medicineRoutes = require("./routes/medicineRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const supplierRoutes = require("./routes/supplierRoutes");
const orderRoutes = require("./routes/orderRoutes");
const prescriptionRoutes = require("./routes/prescriptionRoutes");
const inventoryRoutes = require("./routes/inventoryRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const paymentRoutes = require("./routes/paymentRoutes");

const app = express();

app.use(cors());
app.use(express.json());

// Serve uploads statically
app.use("/uploads", express.static(uploadsDir));

app.get("/", (req, res) => {
  res.send("MediFlow API Running");
});

app.use("/api/auth", authRoutes);
app.use("/api/medicines", medicineRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/prescriptions", prescriptionRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/payment", paymentRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});