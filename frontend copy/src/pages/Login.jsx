import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

const Login = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("customer");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password || (isRegister && !name)) {
      return toast.error("Please fill in all required fields");
    }

    setLoading(true);
    if (isRegister) {
      const res = await register(name, email, password, role);
      if (res.success) {
        toast.success("Registration successful! Please log in.");
        setIsRegister(false);
        setName("");
        setPassword("");
      } else {
        toast.error(res.message);
      }
    } else {
      const res = await login(email, password);
      if (res.success) {
        toast.success("Logged in successfully!");
        navigate("/");
      } else {
        toast.error(res.message);
      }
    }
    setLoading(false);
  };

  const handleQuickLogin = async (roleType) => {
    setLoading(true);
    let demoEmail = "";
    let demoPass = "";

    switch (roleType) {
      case "admin":
        demoEmail = "admin@mediflow.com";
        demoPass = "admin123";
        break;
      case "pharmacist":
        demoEmail = "pharmacist@mediflow.com";
        demoPass = "pharma123";
        break;
      case "delivery":
        demoEmail = "delivery@mediflow.com";
        demoPass = "delivery123";
        break;
      case "customer":
        demoEmail = "customer@mediflow.com";
        demoPass = "customer123";
        break;
      default:
        break;
    }

    setEmail(demoEmail);
    setPassword(demoPass);

    const res = await login(demoEmail, demoPass);
    if (res.success) {
      toast.success(`Logged in as ${roleType}!`);
      navigate("/");
    } else {
      toast.error(res.message);
    }
    setLoading(false);
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ color: "var(--primary)", fontSize: "2.5rem", marginBottom: "0.25rem" }}>
            <span style={{ color: "var(--secondary)" }}>Medi</span>Flow
          </h1>
          <p style={{ color: "var(--light-text)", fontSize: "0.95rem" }}>
            {isRegister ? "Create a new pharmacy account" : "Sign in to manage your pharmacy orders"}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {isRegister && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label">Account Role</label>
              <select className="form-control" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="customer">Customer</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="delivery">Delivery Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ width: "100%", marginTop: "1rem", padding: "0.75rem" }} disabled={loading}>
            {loading ? "Processing..." : isRegister ? "Sign Up" : "Sign In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.9rem" }}>
          <span style={{ color: "var(--light-text)" }}>
            {isRegister ? "Already have an account? " : "Don't have an account? "}
          </span>
          <button
            onClick={() => setIsRegister(!isRegister)}
            style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: "700", cursor: "pointer", textDecoration: "underline" }}
          >
            {isRegister ? "Sign In" : "Register"}
          </button>
        </div>

        {/* Quick Test Accounts Card */}
        <div className="demo-account-box">
          <div style={{ fontWeight: "700", fontSize: "0.85rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
            ⚡ Quick Demo Login
          </div>
          <div className="demo-account-grid">
            <button className="demo-btn" onClick={() => handleQuickLogin("admin")}>
              🔑 Admin
            </button>
            <button className="demo-btn" onClick={() => handleQuickLogin("pharmacist")}>
              💊 Pharmacist
            </button>
            <button className="demo-btn" onClick={() => handleQuickLogin("delivery")}>
              🛵 Delivery
            </button>
            <button className="demo-btn" onClick={() => handleQuickLogin("customer")}>
              🛒 Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
