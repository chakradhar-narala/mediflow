import React, { useState } from "react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";

// Loads the Razorpay checkout.js script dynamically
function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      return resolve(true);
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

const Cart = () => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    clearCart,
    cartRequiresPrescription,
    cartTotal
  } = useCart();

  const navigate = useNavigate();
  const { user } = useAuth();

  const [address, setAddress] = useState("");
  const [prescriptionFile, setPrescriptionFile] = useState(null);

  // Payment / checkout stages
  const [checkoutStage, setCheckoutStage] = useState("idle"); // 'idle', 'uploading_presc', 'creating_payment', 'awaiting_payment', 'placing_order', 'success'
  const [stageMessage, setStageMessage] = useState("");

  // Mock payment overlay state
  const [showMockModal, setShowMockModal] = useState(false);
  const [mockPaymentData, setMockPaymentData] = useState(null);

  const handleQtyChange = (itemId, newQty, stockLimit) => {
    const res = updateQuantity(itemId, newQty);
    if (!res.success) {
      toast.error(res.message);
    }
  };

  const handleFileChange = (e) => {
    setPrescriptionFile(e.target.files[0]);
  };

  const validateCheckout = () => {
    if (cartItems.length === 0) {
      toast.error("Your cart is empty");
      return false;
    }
    if (!address.trim()) {
      toast.error("Please enter a delivery address");
      return false;
    }
    if (cartRequiresPrescription && !prescriptionFile) {
      toast.error("This order requires a prescription upload. Please select a prescription image.");
      return false;
    }
    return true;
  };

  // Called after payment is successful (mock or real)
  const placeOrderAfterPayment = async (razorpay_order_id, razorpay_payment_id, prescriptionFilename) => {
    setCheckoutStage("placing_order");
    setStageMessage("Registering and placing your order...");

    const orderPayload = {
      items: cartItems.map(item => ({
        medicine_id: item.id,
        quantity: item.quantity
      })),
      delivery_address: address,
      prescription_image: prescriptionFilename || null,
      razorpay_order_id,
      razorpay_payment_id
    };

    const orderRes = await API.post("/orders", orderPayload);

    setCheckoutStage("success");
    setStageMessage(`Order #${orderRes.data.orderId} Placed Successfully!`);
    clearCart();

    await new Promise(resolve => setTimeout(resolve, 2000));
    navigate("/orders");
  };

  // Mock payment handler — simulates success after a brief delay
  const handleMockPaymentSuccess = async () => {
    setShowMockModal(false);
    try {
      const { razorpay_order_id, prescriptionFilename } = mockPaymentData;
      const mockPaymentId = `pay_mock_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const mockSignature = "mock_signature_" + Date.now();

      // Verify mock payment on backend
      await API.post("/payment/verify", {
        razorpay_order_id,
        razorpay_payment_id: mockPaymentId,
        razorpay_signature: mockSignature
      });

      await placeOrderAfterPayment(razorpay_order_id, mockPaymentId, prescriptionFilename);
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Mock payment or order failed.");
      setCheckoutStage("idle");
    }
  };

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (!validateCheckout()) return;

    try {
      let prescriptionFilename = "";

      // 1. Upload prescription if required
      if (cartRequiresPrescription && prescriptionFile) {
        setCheckoutStage("uploading_presc");
        setStageMessage("Uploading doctor prescription...");
        
        const prescData = new FormData();
        prescData.append("image", prescriptionFile);
        prescData.append("notes", "Uploaded during checkout");
        
        const uploadRes = await API.post("/prescriptions", prescData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        prescriptionFilename = uploadRes.data.filename;
      }

      // 2. Create Razorpay order
      setCheckoutStage("creating_payment");
      setStageMessage("Initiating payment gateway...");

      const paymentRes = await API.post("/payment/create-order", {
        amount: cartTotal
      });

      const { isMock, keyId, orderId, amount, currency } = paymentRes.data;

      if (isMock) {
        // Show a mock payment overlay instead of Razorpay
        setMockPaymentData({ razorpay_order_id: orderId, prescriptionFilename });
        setCheckoutStage("awaiting_payment");
        setStageMessage("Awaiting test payment...");
        setShowMockModal(true);
        return;
      }

      // 3. Load Razorpay SDK & open real checkout
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        toast.error("Failed to load Razorpay SDK. Check your internet connection.");
        setCheckoutStage("idle");
        return;
      }

      setCheckoutStage("awaiting_payment");
      setStageMessage("Complete your payment in the Razorpay window...");

      const options = {
        key: keyId,
        amount,
        currency,
        name: "MediFlow Pharmacy",
        description: `Order of ${cartItems.length} item(s)`,
        order_id: orderId,
        handler: async function (response) {
          try {
            // Verify signature
            await API.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });

            await placeOrderAfterPayment(
              response.razorpay_order_id,
              response.razorpay_payment_id,
              prescriptionFilename
            );
          } catch (err) {
            console.error(err);
            toast.error("Payment verification or order placement failed.");
            setCheckoutStage("idle");
          }
        },
        modal: {
          ondismiss: function () {
            toast.info("Payment cancelled by user.");
            setCheckoutStage("idle");
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || ""
        },
        theme: {
          color: "#6C63FF"
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Checkout failed.");
      setCheckoutStage("idle");
    }
  };

  // --- Mock Payment Modal Overlay ---
  if (showMockModal) {
    return (
      <div style={{
        position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999
      }}>
        <div className="card" style={{
          maxWidth: "420px", width: "90%", padding: "2.5rem", textAlign: "center",
          animation: "fadeInUp 0.3s ease-out"
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🧪</div>
          <h2 style={{ marginBottom: "0.5rem" }}>Razorpay Test Mode</h2>
          <p style={{ color: "var(--grey-text)", marginBottom: "0.75rem", fontSize: "0.9rem" }}>
            This is a simulated payment environment. No real money will be charged.
          </p>

          <div style={{
            backgroundColor: "var(--bg-app)", border: "1px solid var(--border-color)",
            borderRadius: "var(--radius-md)", padding: "1rem", marginBottom: "1.5rem"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
              <span style={{ color: "var(--grey-text)" }}>Order ID:</span>
              <span style={{ fontWeight: "600", fontFamily: "monospace", fontSize: "0.8rem" }}>
                {mockPaymentData?.razorpay_order_id}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--grey-text)" }}>Amount:</span>
              <span style={{ fontWeight: "800", color: "var(--primary)", fontSize: "1.1rem" }}>
                ₹{cartTotal.toFixed(2)}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              className="btn btn-primary"
              style={{ flex: 1, padding: "0.75rem" }}
              onClick={handleMockPaymentSuccess}
            >
              ✅ Simulate Payment Success
            </button>
            <button
              className="btn btn-danger"
              style={{ flex: 0.6, padding: "0.75rem" }}
              onClick={() => { setShowMockModal(false); setCheckoutStage("idle"); toast.info("Payment cancelled."); }}
            >
              Cancel
            </button>
          </div>

          <p style={{ fontSize: "0.7rem", color: "var(--grey-text)", marginTop: "1rem", opacity: 0.7 }}>
            💡 Set RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET in .env to enable real Razorpay checkout.
          </p>

          <style>{`
            @keyframes fadeInUp {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  // --- Processing / Success state ---
  if (checkoutStage !== "idle") {
    return (
      <div className="card" style={{ maxWidth: "500px", margin: "4rem auto", textAlign: "center", padding: "3rem" }}>
        {checkoutStage === "success" ? (
          <span style={{ fontSize: "5rem", color: "var(--success)" }}>✅</span>
        ) : (
          <div style={{ display: "inline-block", width: "64px", height: "64px", border: "6px solid var(--primary-light)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "2rem" }}></div>
        )}
        <h2 style={{ marginTop: "1rem" }}>
          {checkoutStage === "success" ? "Payment Successful!" : "Processing Order"}
        </h2>
        <p style={{ marginTop: "0.5rem", fontWeight: "600", color: "var(--grey-text)" }}>{stageMessage}</p>
        
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // --- Empty cart ---
  if (cartItems.length === 0) {
    return (
      <div className="card" style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center", padding: "4rem" }}>
        <span style={{ fontSize: "4rem" }}>🛒</span>
        <h2 style={{ marginTop: "1rem" }}>Your shopping cart is empty</h2>
        <p style={{ marginBottom: "2rem" }}>Add medicines from the catalog to place an order.</p>
        <button className="btn btn-primary" onClick={() => navigate("/")}>
          Browse Medicines
        </button>
      </div>
    );
  }

  // --- Main cart & checkout UI ---
  return (
    <div>
      <h1>Shopping Cart & Checkout</h1>
      <p style={{ color: "var(--light-text)", marginBottom: "2rem" }}>Review items, upload prescriptions, and pay securely</p>

      <div className="grid-3" style={{ alignItems: "start" }}>
        {/* Cart items list (Grid left span 2) */}
        <div style={{ gridColumn: "span 2" }} className="card">
          <h2 style={{ marginBottom: "1.5rem" }}>Cart Items</h2>
          <div className="table-container" style={{ border: "none", boxShadow: "none", margin: 0 }}>
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Price</th>
                  <th>Quantity</th>
                  <th>Total</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {cartItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: "700" }}>{item.name}</div>
                      {item.requires_prescription === 1 && (
                        <span className="badge badge-danger" style={{ fontSize: "0.6rem", padding: "0.05rem 0.3rem" }}>
                          Rx Req
                        </span>
                      )}
                    </td>
                    <td>₹{item.price.toFixed(2)}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <button
                          className="page-btn"
                          onClick={() => handleQtyChange(item.id, item.quantity - 1, item.stock)}
                          style={{ width: "28px", height: "28px" }}
                        >
                          -
                        </button>
                        <span style={{ fontWeight: "600", minWidth: "20px", textAlign: "center" }}>
                          {item.quantity}
                        </span>
                        <button
                          className="page-btn"
                          onClick={() => handleQtyChange(item.id, item.quantity + 1, item.stock)}
                          style={{ width: "28px", height: "28px" }}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td>₹{(item.price * item.quantity).toFixed(2)}</td>
                    <td>
                      <button
                        className="btn btn-danger"
                        onClick={() => removeFromCart(item.id)}
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Checkout panel (Grid right span 1) */}
        <div className="card">
          <h2 style={{ marginBottom: "1.5rem" }}>Order Summary</h2>
          
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem", fontSize: "1.1rem" }}>
            <span>Subtotal:</span>
            <span style={{ fontWeight: "600" }}>₹{cartTotal.toFixed(2)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem", color: "var(--light-text)", fontSize: "0.9rem" }}>
            <span>Delivery:</span>
            <span>FREE</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "1rem", marginBottom: "1.5rem", fontSize: "1.3rem", fontWeight: "800", color: "var(--primary)" }}>
            <span>Total:</span>
            <span>₹{cartTotal.toFixed(2)}</span>
          </div>

          <form onSubmit={handleCheckout}>
            {/* Delivery address */}
            <div className="form-group">
              <label className="form-label">Delivery Address</label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Enter complete shipping address..."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
              />
            </div>

            {/* Conditional prescription upload */}
            {cartRequiresPrescription && (
              <div className="form-group" style={{ backgroundColor: "var(--danger-light)", padding: "1rem", borderRadius: "var(--radius-md)", borderLeft: "4px solid var(--danger)", marginBottom: "1.5rem" }}>
                <label className="form-label" style={{ color: "var(--danger-hover)", display: "flex", alignItems: "center", gap: "0.25rem" }}>
                  ⚠️ Upload Prescription File
                </label>
                <p style={{ fontSize: "0.8rem", color: "var(--danger-hover)", marginBottom: "0.5rem" }}>
                  One or more items in your cart require a doctor's approval.
                </p>
                <input
                  type="file"
                  className="form-control"
                  accept="image/*"
                  onChange={handleFileChange}
                  required
                  style={{ border: "1px solid rgba(244, 63, 94, 0.4)" }}
                />
              </div>
            )}

            {/* Razorpay payment badge */}
            <div style={{ margin: "1.5rem 0", padding: "1rem", backgroundColor: "var(--bg-app)", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.25rem", color: "var(--primary)", fontWeight: "800", fontSize: "0.9rem", marginBottom: "0.25rem" }}>
                🔒 Secured by Razorpay (Test Mode)
              </div>
              <p style={{ fontSize: "0.75rem", color: "var(--grey-text)", margin: 0 }}>
                Payments are processed in test/sandbox mode. No real charges will be applied.
              </p>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
              Pay & Place Order (₹{cartTotal.toFixed(2)})
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Cart;
