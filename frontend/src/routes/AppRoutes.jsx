import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Layout from "../layouts/Layout";

// Import all pages
import Login from "../pages/Login";
import MedicineCatalog from "../pages/MedicineCatalog";
import PrescriptionUpload from "../pages/PrescriptionUpload";
import Cart from "../pages/Cart";
import Orders from "../pages/Orders";
import DeliveryDashboard from "../pages/DeliveryDashboard";
import AdminDashboard from "../pages/AdminDashboard";
import InventoryManagement from "../pages/InventoryManagement";

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ height: "100vh", flexDirection: "column", gap: "1rem" }}>
        <div className="spinner"></div>
        <p style={{ color: "var(--light-text)" }}>Loading user session...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // If delivery is logged in and tries to access customer/admin routes, redirect to /delivery
    if (user.role === "delivery") {
      return <Navigate to="/delivery" replace />;
    }
    // If customer tries to access dashboard, redirect to /
    return <Navigate to="/" replace />;
  }

  return <Layout>{children}</Layout>;
};

// Home Redirect Component (to send user to the correct starting page)
const HomeRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex-center" style={{ height: "100vh", flexDirection: "column", gap: "1rem" }}>
        <div className="spinner"></div>
        <p style={{ color: "var(--light-text)" }}>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  switch (user.role) {
    case "admin":
    case "pharmacist":
      // If admin/pharmacist, catalog is accessible, but dashboard is their primary hub in Layout sidebar.
      // We can let "/" be MedicineCatalog.
      return <MedicineCatalog />;
    case "delivery":
      return <Navigate to="/delivery" replace />;
    case "customer":
      return <MedicineCatalog />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          user ? (
            user.role === "delivery" ? (
              <Navigate to="/delivery" replace />
            ) : user.role === "admin" || user.role === "pharmacist" ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <Navigate to="/" replace />
            )
          ) : (
            <Login />
          )
        }
      />

      {/* Protected Customer Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute allowedRoles={["customer", "pharmacist", "admin"]}>
            <HomeRedirect />
          </ProtectedRoute>
        }
      />
      <Route
        path="/prescription-upload"
        element={
          <ProtectedRoute allowedRoles={["customer"]}>
            <PrescriptionUpload />
          </ProtectedRoute>
        }
      />
      <Route
        path="/cart"
        element={
          <ProtectedRoute allowedRoles={["customer"]}>
            <Cart />
          </ProtectedRoute>
        }
      />
      <Route
        path="/orders"
        element={
          <ProtectedRoute allowedRoles={["customer"]}>
            <Orders />
          </ProtectedRoute>
        }
      />

      {/* Protected Admin/Pharmacist Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute allowedRoles={["admin", "pharmacist"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/inventory"
        element={
          <ProtectedRoute allowedRoles={["admin", "pharmacist"]}>
            <InventoryManagement />
          </ProtectedRoute>
        }
      />

      {/* Protected Delivery Routes */}
      <Route
        path="/delivery"
        element={
          <ProtectedRoute allowedRoles={["delivery"]}>
            <DeliveryDashboard />
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
