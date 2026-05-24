import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path) => {
    return location.pathname === path ? "active" : "";
  };

  // Define sidebar links based on user role
  const getSidebarLinks = () => {
    if (!user) return [];

    switch (user.role) {
      case "customer":
        return [
          { path: "/", label: "Medicine Catalog", icon: "🛍️" },
          { path: "/prescription-upload", label: "Upload Prescription", icon: "📄" },
          { path: "/orders", label: "My Orders", icon: "📦" }
        ];
      case "pharmacist":
        return [
          { path: "/dashboard", label: "Pharmacist Dashboard", icon: "📊" },
          { path: "/", label: "Medicine Catalog", icon: "🛍️" },
          { path: "/inventory", label: "Inventory Management", icon: "📦" }
        ];
      case "delivery":
        return [
          { path: "/delivery", label: "Delivery Dashboard", icon: "🛵" }
        ];
      case "admin":
        return [
          { path: "/dashboard", label: "Admin Dashboard", icon: "📊" },
          { path: "/", label: "Medicine Catalog", icon: "🛍️" },
          { path: "/inventory", label: "Inventory & Suppliers", icon: "⚙️" }
        ];
      default:
        return [];
    }
  };

  const sidebarLinks = getSidebarLinks();

  return (
    <div>
      {/* Top Navbar */}
      <header className="navbar">
        <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          <span>Medi</span>Flow
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          {/* Cart Icon (only for customers) */}
          {user && user.role === "customer" && (
            <div className="cart-indicator" onClick={() => navigate("/cart")}>
              <span style={{ fontSize: "1.4rem" }}>🛒</span>
              {cartCount > 0 && <span className="cart-count">{cartCount}</span>}
            </div>
          )}

          {/* User Profile */}
          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontWeight: "700", fontSize: "0.9rem" }}>{user.name}</div>
                <span className="badge badge-info" style={{ fontSize: "0.65rem", padding: "0.1rem 0.5rem" }}>
                  {user.role}
                </span>
              </div>
              <button className="btn btn-outline" onClick={handleLogout} style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
                Logout
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={() => navigate("/login")}>
              Login
            </button>
          )}
        </div>
      </header>

      {/* Main Container */}
      <div className="app-container">
        {/* Sidebar */}
        {user && sidebarLinks.length > 0 && (
          <aside className="sidebar">
            <div style={{ marginBottom: "1rem", paddingLeft: "1rem", color: "var(--light-text)", fontSize: "0.8rem", fontWeight: "700", textTransform: "uppercase" }}>
              Menu Options
            </div>
            {sidebarLinks.map((link) => (
              <Link key={link.path} to={link.path} className={`sidebar-link ${isActive(link.path)}`}>
                <span>{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </aside>
        )}

        {/* Content Area */}
        <main className="content-area">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
