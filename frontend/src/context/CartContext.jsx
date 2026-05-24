import React, { createContext, useState, useContext, useEffect } from "react";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem("cart");
    if (savedCart) {
      try {
        setCartItems(JSON.parse(savedCart));
      } catch (e) {
        console.error("Error loading cart:", e);
      }
    }
  }, []);

  // Sync cart to localStorage
  const saveCart = (newCart) => {
    setCartItems(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const addToCart = (medicine, quantity = 1) => {
    const existingIndex = cartItems.findIndex((item) => item.id === medicine.id);

    if (existingIndex > -1) {
      // Medicine already in cart, update quantity
      const newItems = [...cartItems];
      const newQty = newItems[existingIndex].quantity + quantity;

      if (newQty > medicine.stock) {
        return {
          success: false,
          message: `Cannot add more. Only ${medicine.stock} items are available in stock.`
        };
      }

      newItems[existingIndex].quantity = newQty;
      saveCart(newItems);
    } else {
      // New medicine in cart
      if (quantity > medicine.stock) {
        return {
          success: false,
          message: `Cannot add. Only ${medicine.stock} items are available in stock.`
        };
      }

      saveCart([
        ...cartItems,
        {
          id: medicine.id,
          name: medicine.name,
          price: medicine.price,
          description: medicine.description,
          quantity,
          stock: medicine.stock,
          requires_prescription: medicine.requires_prescription,
          image: medicine.image
        }
      ]);
    }

    return { success: true };
  };

  const removeFromCart = (medicineId) => {
    const newItems = cartItems.filter((item) => item.id !== medicineId);
    saveCart(newItems);
  };

  const updateQuantity = (medicineId, quantity) => {
    const index = cartItems.findIndex((item) => item.id === medicineId);
    if (index === -1) return { success: false, message: "Item not in cart" };

    if (quantity <= 0) {
      removeFromCart(medicineId);
      return { success: true };
    }

    const item = cartItems[index];
    if (quantity > item.stock) {
      return {
        success: false,
        message: `Cannot set quantity to ${quantity}. Only ${item.stock} items are available in stock.`
      };
    }

    const newItems = [...cartItems];
    newItems[index].quantity = quantity;
    saveCart(newItems);
    return { success: true };
  };

  const clearCart = () => {
    saveCart([]);
  };

  const cartRequiresPrescription = cartItems.some((item) => item.requires_prescription === 1);
  const cartTotal = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartRequiresPrescription,
        cartTotal,
        cartCount
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
export default CartContext;
