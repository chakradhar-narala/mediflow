import React, { useEffect, useState } from "react";
import API from "../services/api";
import Modal from "../components/Modal";
import { toast } from "react-toastify";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetails, setOrderDetails] = useState(null);
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
      toast.error("Failed to load order history");
      console.error(error);
    }
    setLoading(false);
  };

  const handleViewDetails = async (orderId) => {
    setSelectedOrder(orderId);
    try {
      const res = await API.get(`/orders/${orderId}`);
      setOrderDetails(res.data);
    } catch (error) {
      toast.error("Failed to load order details");
      console.error(error);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm("Are you sure you want to cancel this order? This will restore medicine stock.")) return;

    setActionLoading(true);
    try {
      await API.put(`/orders/${orderId}/status`, { status: "cancelled" });
      toast.success("Order cancelled successfully!");
      fetchOrders();
      // Reload details if open
      if (selectedOrder === orderId) {
        handleViewDetails(orderId);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to cancel order");
      console.error(error);
    }
    setActionLoading(false);
  };

  const closeDetails = () => {
    setSelectedOrder(null);
    setOrderDetails(null);
  };

  // Helper to determine status steps for visual timeline
  const getTimelineSteps = (order) => {
    const steps = [];
    const status = order.status;

    // Step 1: Placed
    steps.push({
      title: "Order Placed",
      description: `Your order was received.`,
      date: new Date(order.created_at).toLocaleString(),
      state: "completed"
    });

    // Step 2: Verification (if prescription was required)
    const hasRx = order.items?.some(i => i.requires_prescription === 1);
    if (hasRx || order.prescription) {
      const rxStatus = order.prescription?.status || "pending";
      let rxState = "pending";
      let rxDesc = "Waiting for pharmacist approval.";

      if (rxStatus === "approved") {
        rxState = "completed";
        rxDesc = `Approved by Pharmacist.`;
      } else if (rxStatus === "rejected") {
        rxState = "failed";
        rxDesc = `Rejected: ${order.prescription.notes || "Invalid prescription document"}.`;
      } else if (status === "cancelled") {
        rxState = "failed";
        rxDesc = "Cancelled.";
      }

      steps.push({
        title: "Prescription Verification",
        description: rxDesc,
        date: order.prescription?.uploaded_at ? new Date(order.prescription.uploaded_at).toLocaleString() : "",
        state: rxState
      });
    }

    // Step 3: Shipped
    let shipState = "pending";
    if (status === "shipped" || status === "delivered") {
      shipState = "completed";
    } else if (status === "cancelled" || status === "rejected") {
      shipState = "failed";
    }
    steps.push({
      title: "Order Shipped",
      description: status === "shipped" || status === "delivered" ? "In transit to your address." : "Waiting to ship.",
      state: shipState
    });

    // Step 4: Delivered
    let delState = "pending";
    if (status === "delivered") {
      delState = "completed";
    } else if (status === "cancelled" || status === "rejected") {
      delState = "failed";
    }
    steps.push({
      title: "Order Delivered",
      description: status === "delivered" ? "Package handed over safely." : "Pending delivery.",
      state: delState
    });

    return steps;
  };

  return (
    <div>
      <h1>Your Orders</h1>
      <p style={{ color: "var(--light-text)", marginBottom: "2rem" }}>Track package shipments and view invoice details</p>

      {loading ? (
        <div style={{ textAlign: "center", padding: "3rem", fontSize: "1.2rem", fontWeight: "600", color: "var(--light-text)" }}>
          Loading your orders...
        </div>
      ) : orders.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem" }}>
          <span style={{ fontSize: "4rem" }}>📦</span>
          <h2 style={{ marginTop: "1rem" }}>No orders placed yet</h2>
          <p style={{ marginBottom: "1.5rem" }}>You haven't ordered any medicines yet.</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Date</th>
                <th>Items Count</th>
                <th>Total Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td style={{ fontWeight: "700" }}>#{order.id}</td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td>{order.item_count} items</td>
                  <td style={{ fontWeight: "600", color: "var(--primary)" }}>₹{order.total_amount.toFixed(2)}</td>
                  <td>
                    <span className={`badge badge-${order.status}`}>{order.status}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className="btn btn-outline"
                        onClick={() => handleViewDetails(order.id)}
                        style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}
                      >
                        👁️ Details
                      </button>
                      {(order.status === "pending" || order.status === "approved") && (
                        <button
                          className="btn btn-danger"
                          onClick={() => handleCancelOrder(order.id)}
                          disabled={actionLoading}
                          style={{ padding: "0.25rem 0.6rem", fontSize: "0.8rem" }}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Details and Tracking Timeline Modal */}
      <Modal
        isOpen={!!selectedOrder}
        onClose={closeDetails}
        title={`Order Details #${selectedOrder}`}
      >
        {orderDetails ? (
          <div>
            {/* Delivery address */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontWeight: "700", fontSize: "0.95rem" }}>Shipping Address</div>
              <p style={{ fontSize: "0.9rem", color: "var(--grey-text)" }}>{orderDetails.delivery_address}</p>
            </div>

            {/* Order Items Table */}
            <div style={{ marginBottom: "1.5rem" }}>
              <div style={{ fontWeight: "700", fontSize: "0.95rem", marginBottom: "0.5rem" }}>Items Summary</div>
              <div className="table-container" style={{ margin: 0 }}>
                <table className="custom-table" style={{ fontSize: "0.85rem" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "0.5rem 1rem" }}>Item</th>
                      <th style={{ padding: "0.5rem 1rem" }}>Price</th>
                      <th style={{ padding: "0.5rem 1rem" }}>Qty</th>
                      <th style={{ padding: "0.5rem 1rem" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderDetails.items?.map((item) => (
                      <tr key={item.id}>
                        <td style={{ padding: "0.5rem 1rem", fontWeight: "600" }}>{item.medicine_name}</td>
                        <td style={{ padding: "0.5rem 1rem" }}>₹{item.price.toFixed(2)}</td>
                        <td style={{ padding: "0.5rem 1rem" }}>{item.quantity}</td>
                        <td style={{ padding: "0.5rem 1rem", fontWeight: "600" }}>₹{(item.price * item.quantity).toFixed(2)}</td>
                      </tr>
                    ))}
                    <tr style={{ backgroundColor: "var(--bg-app)" }}>
                      <td colSpan="3" style={{ padding: "0.5rem 1rem", fontWeight: "800", textAlign: "right" }}>Total Amount:</td>
                      <td style={{ padding: "0.5rem 1rem", fontWeight: "800", color: "var(--primary)" }}>₹{orderDetails.total_amount.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Timeline */}
            <div>
              <div style={{ fontWeight: "700", fontSize: "0.95rem", marginBottom: "1rem" }}>Shipment Progress Tracking</div>
              <div className="timeline">
                {getTimelineSteps(orderDetails).map((step, idx) => (
                  <div
                    key={idx}
                    className={`timeline-item ${step.state === "completed" ? "completed" : step.state === "failed" ? "failed" : "active"}`}
                  >
                    <div
                      className="timeline-dot"
                      style={{
                        backgroundColor:
                          step.state === "completed"
                            ? "var(--success)"
                            : step.state === "failed"
                            ? "var(--danger)"
                            : "var(--light-text)"
                      }}
                    ></div>
                    <div className="timeline-content">
                      <div className="timeline-title" style={{ color: step.state === "failed" ? "var(--danger)" : "inherit" }}>
                        {step.title}
                      </div>
                      <p style={{ fontSize: "0.8rem", margin: 0 }}>{step.description}</p>
                      {step.date && <div className="timeline-date">{step.date}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "2rem" }}>Loading details...</div>
        )}
      </Modal>
    </div>
  );
};

export default Orders;
