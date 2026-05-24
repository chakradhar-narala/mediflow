const Razorpay = require("razorpay");
const crypto = require("crypto");

let razorpayInstance = null;
const isRazorpayConfigured = !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

if (isRazorpayConfigured) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
  console.log("Razorpay SDK initialized with test credentials.");
} else {
  console.log("Razorpay credentials missing. Running in MOCK payment mode.");
}

exports.createOrder = async (req, res) => {
  const { amount } = req.body; // Amount in INR (Rupees)

  if (!amount || isNaN(amount) || amount <= 0) {
    return res.status(400).json({ message: "Valid transaction amount is required" });
  }

  const amountInPaise = Math.round(amount * 100);

  if (isRazorpayConfigured) {
    try {
      const options = {
        amount: amountInPaise,
        currency: "INR",
        receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`
      };

      const order = await razorpayInstance.orders.create(options);

      res.status(201).json({
        isMock: false,
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency
      });
    } catch (error) {
      console.error("Razorpay order creation error:", error);
      res.status(500).json({ message: error.message || "Failed to create Razorpay order" });
    }
  } else {
    // Generate mock order details for development environment
    const mockOrderId = `order_mock_${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    res.status(201).json({
      isMock: true,
      keyId: "mock_razorpay_key_id",
      orderId: mockOrderId,
      amount: amountInPaise,
      currency: "INR"
    });
  }
};

exports.verifyPayment = (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ message: "Missing required signature verification parameters" });
  }

  // 1. If it's a mock transaction
  if (razorpay_order_id.startsWith("order_mock_") || !isRazorpayConfigured) {
    console.log(`Verified MOCK transaction: Order ${razorpay_order_id}, Payment ${razorpay_payment_id}`);
    return res.json({
      success: true,
      message: "Mock transaction verified successfully"
    });
  }

  // 2. Real signature verification
  try {
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    if (generated_signature === razorpay_signature) {
      console.log(`Verified REAL transaction: Order ${razorpay_order_id}, Payment ${razorpay_payment_id}`);
      res.json({
        success: true,
        message: "Payment signature verified successfully"
      });
    } else {
      res.status(400).json({
        success: false,
        message: "Invalid payment signature verification failed"
      });
    }
  } catch (error) {
    console.error("Razorpay signature verification error:", error);
    res.status(500).json({ message: "Signature verification failed internally" });
  }
};
