import React, { useEffect, useState } from "react";
import API, { getUploadsUrl } from "../services/api";
import Modal from "../components/Modal";
import { toast } from "react-toastify";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [pendingPresc, setPendingPresc] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewPresc, setReviewPresc] = useState(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const statsRes = await API.get("/dashboard/admin");
      setStats(statsRes.data);

      const prescRes = await API.get("/prescriptions?status=pending");
      setPendingPresc(prescRes.data);
    } catch (error) {
      toast.error("Failed to load dashboard metrics");
      console.error(error);
    }
    setLoading(false);
  };

  const handleUpdatePrescStatus = async (prescId, status) => {
    setActionLoading(true);
    try {
      await API.put(`/prescriptions/${prescId}/status`, {
        status,
        notes: reviewNotes
      });
      toast.success(`Prescription ${status} successfully!`);
      setReviewPresc(null);
      setReviewNotes("");
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update prescription status");
      console.error(error);
    }
    setActionLoading(false);
  };

  if (loading || !stats) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", fontSize: "1.2rem", fontWeight: "600", color: "var(--light-text)" }}>
        Loading Dashboard Metrics...
      </div>
    );
  }

  return (
    <div>
      <h1>Pharmacy Dashboard</h1>
      <p style={{ color: "var(--light-text)", marginBottom: "2rem" }}>
        Overview of store operations, analytics, low stock levels, and approvals
      </p>

      {/* Metric Cards Grid */}
      <div className="metric-grid">
        <div className="metric-card">
          <div className="metric-info">
            <h3>Total Sales</h3>
            <div className="metric-value">₹{stats.totalSales.toFixed(2)}</div>
          </div>
          <div className="metric-icon" style={{ backgroundColor: "var(--success-light)", color: "var(--success-hover)" }}>
            💰
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h3>Total Orders</h3>
            <div className="metric-value">{stats.totalOrders}</div>
          </div>
          <div className="metric-icon" style={{ backgroundColor: "#e0f2fe", color: "var(--secondary-hover)" }}>
            📦
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h3>Low Stock Warnings</h3>
            <div className="metric-value">{stats.lowStockCount}</div>
          </div>
          <div className="metric-icon" style={{ backgroundColor: "var(--warning-light)", color: "var(--warning-hover)" }}>
            ⚠️
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-info">
            <h3>Pending Reviews</h3>
            <div className="metric-value">{stats.pendingPrescriptions}</div>
          </div>
          <div className="metric-icon" style={{ backgroundColor: "var(--danger-light)", color: "var(--danger-hover)" }}>
            📄
          </div>
        </div>
      </div>

      <div className="grid-3" style={{ alignItems: "start", marginBottom: "2rem" }}>
        {/* Category Sales Breakdown */}
        <div style={{ gridColumn: "span 2" }} className="card">
          <h2>Sales by Category</h2>
          {stats.salesByCategory.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--light-text)" }}>
              No category sales recorded yet.
            </div>
          ) : (
            <div className="table-container" style={{ border: "none", boxShadow: "none", margin: 0 }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Items Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.salesByCategory.map((c, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: "700" }}>{c.category_name}</td>
                      <td>{c.items_sold} units</td>
                      <td style={{ fontWeight: "600", color: "var(--primary)" }}>₹{c.revenue.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <h2>Low Stock Alerts</h2>
          {stats.lowStockMedicines.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--success-hover)", fontWeight: "600" }}>
              ✅ All stock levels healthy!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {stats.lowStockMedicines.slice(0, 5).map((med) => (
                <div key={med.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-app)" }}>
                  <span style={{ fontWeight: "600" }}>{med.name}</span>
                  <span className={`badge badge-${med.stock === 0 ? "danger" : "warning"}`} style={{ fontSize: "0.7rem" }}>
                    Stock: {med.stock}
                  </span>
                </div>
              ))}
              {stats.lowStockMedicines.length > 5 && (
                <div style={{ textAlign: "center", fontSize: "0.8rem", color: "var(--light-text)" }}>
                  + {stats.lowStockMedicines.length - 5} more items
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: "start", marginBottom: "2rem" }}>
        {/* Expiry Alerts */}
        <div className="card">
          <h2>Medicine Expiry Alerts</h2>
          {stats.soonToExpireMedicines.length === 0 && stats.expiredMedicines.length === 0 ? (
            <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--success-hover)", fontWeight: "600" }}>
              ✅ No medicine close to expiry!
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {/* Expired medicines */}
              {stats.expiredMedicines.map((med) => (
                <div key={med.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", border: "1px solid rgba(244, 63, 94, 0.2)", borderRadius: "var(--radius-md)", backgroundColor: "var(--danger-light)" }}>
                  <div>
                    <div style={{ fontWeight: "700", color: "var(--danger-hover)" }}>{med.name}</div>
                    <span style={{ fontSize: "0.75rem", color: "var(--grey-text)" }}>Expired on: {med.expiry_date}</span>
                  </div>
                  <span className="badge badge-danger">Expired</span>
                </div>
              ))}

              {/* Soon to expire */}
              {stats.soonToExpireMedicines.map((med) => (
                <div key={med.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem", border: "1px solid rgba(245, 158, 11, 0.2)", borderRadius: "var(--radius-md)", backgroundColor: "var(--warning-light)" }}>
                  <div>
                    <div style={{ fontWeight: "700", color: "var(--warning-hover)" }}>{med.name}</div>
                    <span style={{ fontSize: "0.75rem", color: "var(--grey-text)" }}>Expires on: {med.expiry_date}</span>
                  </div>
                  <span className="badge badge-warning">Soon</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Prescription Approvals */}
        <div className="card">
          <h2>Pending Prescription Reviews</h2>
          {pendingPresc.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--light-text)" }}>
              No prescriptions waiting for verification.
            </div>
          ) : (
            <div className="table-container" style={{ border: "none", boxShadow: "none", margin: 0 }}>
              <table className="custom-table" style={{ fontSize: "0.85rem" }}>
                <thead>
                  <tr>
                    <th style={{ padding: "0.5rem" }}>Date</th>
                    <th style={{ padding: "0.5rem" }}>Customer</th>
                    <th style={{ padding: "0.5rem" }}>Order</th>
                    <th style={{ padding: "0.5rem" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPresc.map((p) => (
                    <tr key={p.id}>
                      <td style={{ padding: "0.5rem" }}>{new Date(p.uploaded_at).toLocaleDateString()}</td>
                      <td style={{ padding: "0.5rem", fontWeight: "600" }}>{p.customer_name}</td>
                      <td style={{ padding: "0.5rem" }}>{p.order_id ? `#${p.order_id}` : "-"}</td>
                      <td style={{ padding: "0.5rem" }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => setReviewPresc(p)}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        >
                          📋 Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Review Prescription Modal */}
      <Modal
        isOpen={!!reviewPresc}
        onClose={() => { setReviewPresc(null); setReviewNotes(""); }}
        title={`Review Prescription Upload`}
      >
        {reviewPresc && (
          <div>
            <div className="grid-2" style={{ gap: "1rem", marginBottom: "1.5rem" }}>
              <div>
                <strong>Customer:</strong> {reviewPresc.customer_name}
              </div>
              <div>
                <strong>Linked Order:</strong> {reviewPresc.order_id ? `#${reviewPresc.order_id}` : "None"}
              </div>
            </div>

            {/* Document preview */}
            <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem", backgroundColor: "var(--bg-app)", padding: "1rem", borderRadius: "var(--radius-md)" }}>
              <img
                src={getUploadsUrl(reviewPresc.image)}
                alt="Prescription uploaded by customer"
                style={{ maxWidth: "100%", maxHeight: "35vh", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}
                onError={(e) => {
                  e.target.src = "https://placehold.co/600x400?text=Prescription+Document";
                }}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Review Notes / Reason (Optional)</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Enter approval note or rejection reasons..."
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <button
                className="btn btn-danger"
                onClick={() => handleUpdatePrescStatus(reviewPresc.id, "rejected")}
                disabled={actionLoading}
                style={{ flexGrow: 1 }}
              >
                ❌ Reject & Cancel Order
              </button>
              <button
                className="btn btn-primary"
                onClick={() => handleUpdatePrescStatus(reviewPresc.id, "approved")}
                disabled={actionLoading}
                style={{ flexGrow: 1, backgroundColor: "var(--success)" }}
              >
                ✅ Verify & Approve
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminDashboard;
