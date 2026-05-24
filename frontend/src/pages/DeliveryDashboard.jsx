import React, { useEffect, useState } from "react";
import API from "../services/api";
import { toast } from "react-toastify";

const DeliveryDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await API.get("/orders");
      setOrders(res.data);
    } catch (error) {
      toast.error("Failed to load delivery orders");
      console.error(error);
    }
    setLoading(false);
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    setActionLoading(true);
    try {
      await API.put(`/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Order status updated to ${newStatus}!`);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update order status");
      console.error(error);
    }
    setActionLoading(false);
  };

  const approvedOrders = orders.filter((o) => o.status === "approved");
  const shippedOrders = orders.filter((o) => o.status === "shipped");
  const deliveredOrders = orders.filter((o) => o.status === "delivered");

  return (
    <div>
      <h1>Delivery Dashboard</h1>
      <p style={{ color: "var(--light-text)", marginBottom: "2rem" }}>
        Claim packages ready for dispatch and update delivery status
      </p>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", fontSize: "1.2rem", fontWeight: "600", color: "var(--light-text)" }}>
          Loading delivery jobs...
        </div>
      ) : (
        <div className="grid-2" style={{ alignItems: "start" }}>
          {/* Section 1: Ready to Dispatch */}
          <div className="card">
            <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--primary)" }}>
              <span>📦</span> Ready for Pickup ({approvedOrders.length})
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--light-text)", marginBottom: "1.5rem" }}>
              Approved orders waiting to be claimed and shipped
            </p>

            {approvedOrders.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--light-text)" }}>
                No packages waiting for pickup.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {approvedOrders.map((o) => (
                  <div key={o.id} style={{ border: "1px solid var(--border-color)", padding: "1rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-app)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: "700" }}>Order #{o.id}</span>
                      <span style={{ fontWeight: "600", color: "var(--primary)" }}>₹{o.total_amount.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                      <strong>Customer:</strong> {o.customer_name} ({o.customer_email})
                    </div>
                    <div style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      <strong>Address:</strong> {o.delivery_address}
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleUpdateStatus(o.id, "shipped")}
                      disabled={actionLoading}
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", width: "100%" }}
                    >
                      🛵 Claim & Ship Package
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Active Shipments */}
          <div className="card">
            <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--warning-hover)" }}>
              <span>🛵</span> In Transit ({shippedOrders.length})
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--light-text)", marginBottom: "1.5rem" }}>
              Packages currently claimed by you and out for delivery
            </p>

            {shippedOrders.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "var(--light-text)" }}>
                No active shipments in transit.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {shippedOrders.map((o) => (
                  <div key={o.id} style={{ border: "1px solid var(--border-color)", padding: "1rem", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-app)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <span style={{ fontWeight: "700" }}>Order #{o.id}</span>
                      <span style={{ fontWeight: "600", color: "var(--primary)" }}>₹{o.total_amount.toFixed(2)}</span>
                    </div>
                    <div style={{ fontSize: "0.85rem", marginBottom: "0.25rem" }}>
                      <strong>Customer:</strong> {o.customer_name} ({o.customer_email})
                    </div>
                    <div style={{ fontSize: "0.85rem", marginBottom: "0.75rem" }}>
                      <strong>Address:</strong> {o.delivery_address}
                    </div>
                    <button
                      className="btn btn-primary"
                      onClick={() => handleUpdateStatus(o.id, "delivered")}
                      disabled={actionLoading}
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", width: "100%", backgroundColor: "var(--success)" }}
                    >
                      ✅ Mark as Delivered
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section 3: Completed Deliveries */}
      {!loading && deliveredOrders.length > 0 && (
        <div className="card" style={{ marginTop: "2rem" }}>
          <h2>📬 Completed Deliveries History</h2>
          <div className="table-container" style={{ border: "none", boxShadow: "none", margin: 0 }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Delivery Address</th>
                  <th>Amount Paid</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {deliveredOrders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: "700" }}>#{o.id}</td>
                    <td>{o.customer_name}</td>
                    <td>{o.delivery_address}</td>
                    <td style={{ fontWeight: "600" }}>₹{o.total_amount.toFixed(2)}</td>
                    <td>
                      <span className="badge badge-success">{o.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryDashboard;
