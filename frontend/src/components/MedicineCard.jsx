import React from "react";
import { useCart } from "../context/CartContext";
import { toast } from "react-toastify";

const MedicineCard = ({ medicine }) => {
  const { addToCart } = useCart();
  
  const isOutOfStock = medicine.stock === 0;
  const isLowStock = medicine.stock > 0 && medicine.stock < 10;
  
  // Calculate if expired or soon to expire
  const expiryDate = new Date(medicine.expiry_date);
  const today = new Date();
  const diffTime = expiryDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const isExpired = diffDays < 0;
  const isSoonToExpire = diffDays >= 0 && diffDays <= 30;

  const handleAddToCart = () => {
    const res = addToCart(medicine, 1);
    if (res.success) {
      toast.success(`${medicine.name} added to cart!`);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className={`card med-card ${isExpired ? "opacity-75" : ""}`}>
      <div className="med-image-wrapper">
        <span className="med-image-placeholder">💊</span>
        
        {medicine.requires_prescription === 1 && (
          <span className="badge badge-danger med-prescription-tag" title="Prescription Required">
            Rx Required
          </span>
        )}
      </div>

      <div className="med-details">
        <h3 className="med-name">{medicine.name}</h3>
        {medicine.category_name && (
          <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: "600", marginBottom: "0.5rem" }}>
            {medicine.category_name}
          </span>
        )}
        <p className="med-desc">{medicine.description || "No description available."}</p>

        {/* Stock Level Warning */}
        <div style={{ marginBottom: "0.5rem", fontSize: "0.85rem" }}>
          {isOutOfStock ? (
            <span style={{ color: "var(--danger)", fontWeight: "700" }}>Out of Stock</span>
          ) : isLowStock ? (
            <span style={{ color: "var(--warning)", fontWeight: "700" }}>Low Stock: Only {medicine.stock} left</span>
          ) : (
            <span style={{ color: "var(--success)", fontWeight: "600" }}>In Stock: {medicine.stock}</span>
          )}
        </div>

        {/* Expiry Warning */}
        <div style={{ marginBottom: "1rem", fontSize: "0.8rem" }}>
          {isExpired ? (
            <span className="badge badge-danger">Expired on {medicine.expiry_date}</span>
          ) : isSoonToExpire ? (
            <span className="badge badge-warning">Expiring soon ({diffDays} days left)</span>
          ) : (
            <span style={{ color: "var(--light-text)" }}>Expiry: {medicine.expiry_date}</span>
          )}
        </div>

        <div className="med-footer">
          <span className="med-price">₹{medicine.price.toFixed(2)}</span>
          <button
            className="btn btn-primary"
            onClick={handleAddToCart}
            disabled={isOutOfStock || isExpired}
            style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
          >
            {isOutOfStock ? "Sold Out" : isExpired ? "Expired" : "Add to Cart"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicineCard;
