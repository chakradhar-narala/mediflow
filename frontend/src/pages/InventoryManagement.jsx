import React, { useEffect, useState } from "react";
import API from "../services/api";
import Modal from "../components/Modal";
import { toast } from "react-toastify";

const InventoryManagement = () => {
  const [activeTab, setActiveTab] = useState("medicines"); // 'medicines', 'categories', 'suppliers', 'logs'
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [logs, setLogs] = useState([]);

  // Selections & Modals
  const [isMedModalOpen, setIsMedModalOpen] = useState(false);
  const [isSupModalOpen, setIsSupModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const [editingMed, setEditingMed] = useState(null);
  const [editingSup, setEditingSup] = useState(null);

  // Pagination states
  const [medPage, setMedPage] = useState(1);
  const [medTotalPages, setMedTotalPages] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [logTotalPages, setLogTotalPages] = useState(1);

  // Forms states
  // Medicine Form
  const [medName, setMedName] = useState("");
  const [medDesc, setMedDesc] = useState("");
  const [medPrice, setMedPrice] = useState("");
  const [medStock, setMedStock] = useState("");
  const [medExpiry, setMedExpiry] = useState("");
  const [medCatId, setMedCatId] = useState("");
  const [medSupId, setMedSupId] = useState("");
  const [medRx, setMedRx] = useState(false);

  // Category Form
  const [catName, setCatName] = useState("");

  // Supplier Form
  const [supName, setSupName] = useState("");
  const [supContact, setSupContact] = useState("");
  const [supEmail, setSupEmail] = useState("");
  const [supAddress, setSupAddress] = useState("");

  // Stock Adjust Form
  const [adjustMedId, setAdjustMedId] = useState("");
  const [adjustQty, setAdjustQty] = useState("");
  const [adjustType, setAdjustType] = useState("restock");
  const [adjustNotes, setAdjustNotes] = useState("");

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
  }, []);

  useEffect(() => {
    if (activeTab === "medicines") fetchMedicines();
    if (activeTab === "logs") fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, medPage, logPage]);

  const fetchMedicines = async () => {
    try {
      const res = await API.get(`/medicines?page=${medPage}&limit=10`);
      setMedicines(res.data.medicines);
      setMedTotalPages(res.data.pagination.totalPages);
    } catch (e) {
      toast.error("Failed to load medicines");
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await API.get("/categories");
      setCategories(res.data);
    } catch (e) {
      toast.error("Failed to load categories");
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await API.get("/suppliers");
      setSuppliers(res.data);
    } catch (e) {
      toast.error("Failed to load suppliers");
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await API.get(`/inventory/logs?page=${logPage}&limit=12`);
      setLogs(res.data.logs);
      setLogTotalPages(res.data.pagination.totalPages);
    } catch (e) {
      toast.error("Failed to load stock history logs");
    }
  };

  // Medicine CRUD Actions
  const openAddMedModal = () => {
    setEditingMed(null);
    setMedName("");
    setMedDesc("");
    setMedPrice("");
    setMedStock("");
    setMedExpiry("");
    setMedCatId("");
    setMedSupId("");
    setMedRx(false);
    setIsMedModalOpen(true);
  };

  const openEditMedModal = (med) => {
    setEditingMed(med);
    setMedName(med.name);
    setMedDesc(med.description || "");
    setMedPrice(med.price);
    setMedStock(med.stock);
    setMedExpiry(med.expiry_date);
    setMedCatId(med.category_id || "");
    setMedSupId(med.supplier_id || "");
    setMedRx(med.requires_prescription === 1);
    setIsMedModalOpen(true);
  };

  const handleSaveMedicine = async (e) => {
    e.preventDefault();
    const payload = {
      name: medName,
      description: medDesc,
      price: parseFloat(medPrice),
      stock: parseInt(medStock),
      expiry_date: medExpiry,
      category_id: medCatId ? parseInt(medCatId) : null,
      supplier_id: medSupId ? parseInt(medSupId) : null,
      requires_prescription: medRx ? 1 : 0
    };

    try {
      if (editingMed) {
        await API.put(`/medicines/${editingMed.id}`, payload);
        toast.success("Medicine updated successfully!");
      } else {
        await API.post("/medicines", payload);
        toast.success("Medicine added successfully!");
      }
      setIsMedModalOpen(false);
      fetchMedicines();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save medicine");
    }
  };

  const handleDeleteMed = async (id) => {
    if (!window.confirm("Are you sure you want to delete this medicine?")) return;
    try {
      await API.delete(`/medicines/${id}`);
      toast.success("Medicine deleted successfully!");
      fetchMedicines();
    } catch (e) {
      toast.error("Failed to delete medicine");
    }
  };

  // Category Actions
  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!catName.trim()) return;
    try {
      await API.post("/categories", { name: catName });
      toast.success("Category added successfully!");
      setCatName("");
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add category");
    }
  };

  const handleDeleteCat = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      await API.delete(`/categories/${id}`);
      toast.success("Category deleted successfully!");
      fetchCategories();
    } catch (e) {
      toast.error("Failed to delete category");
    }
  };

  // Supplier CRUD Actions
  const openAddSupModal = () => {
    setEditingSup(null);
    setSupName("");
    setSupContact("");
    setSupEmail("");
    setSupAddress("");
    setIsSupModalOpen(true);
  };

  const openEditSupModal = (sup) => {
    setEditingSup(sup);
    setSupName(sup.name);
    setSupContact(sup.contact || "");
    setSupEmail(sup.email || "");
    setSupAddress(sup.address || "");
    setIsSupModalOpen(true);
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    const payload = { name: supName, contact: supContact, email: supEmail, address: supAddress };
    try {
      if (editingSup) {
        await API.put(`/suppliers/${editingSup.id}`, payload);
        toast.success("Supplier updated successfully!");
      } else {
        await API.post("/suppliers", payload);
        toast.success("Supplier added successfully!");
      }
      setIsSupModalOpen(false);
      fetchSuppliers();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save supplier");
    }
  };

  const handleDeleteSup = async (id) => {
    if (!window.confirm("Are you sure you want to delete this supplier?")) return;
    try {
      await API.delete(`/suppliers/${id}`);
      toast.success("Supplier deleted successfully!");
      fetchSuppliers();
    } catch (e) {
      toast.error("Failed to delete supplier");
    }
  };

  // Stock Adjustment Action
  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!adjustMedId || !adjustQty) return;
    
    try {
      await API.post("/inventory/adjust", {
        medicine_id: parseInt(adjustMedId),
        quantity: parseInt(adjustQty),
        change_type: adjustType,
        notes: adjustNotes
      });
      toast.success("Inventory stock level adjusted!");
      setIsAdjustModalOpen(false);
      setAdjustMedId("");
      setAdjustQty("");
      setAdjustNotes("");
      setAdjustType("restock");
      if (activeTab === "medicines") fetchMedicines();
      if (activeTab === "logs") fetchLogs();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to adjust stock");
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1>Inventory Management</h1>
          <p style={{ color: "var(--light-text)" }}>Track medicines, suppliers, categories, and stock movement logs</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn btn-secondary" onClick={() => setIsAdjustModalOpen(true)}>
            🔄 Quick Restock
          </button>
          <button className="btn btn-primary" onClick={openAddMedModal}>
            ➕ Add Medicine
          </button>
        </div>
      </div>

      {/* Tab Navigation Headers */}
      <div className="filter-bar" style={{ padding: "0.5rem", gap: "0.25rem" }}>
        <button className={`btn ${activeTab === "medicines" ? "btn-primary" : "btn-outline"}`} onClick={() => setActiveTab("medicines")} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
          💊 Medicines Grid
        </button>
        <button className={`btn ${activeTab === "categories" ? "btn-primary" : "btn-outline"}`} onClick={() => setActiveTab("categories")} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
          🏷️ Categories
        </button>
        <button className={`btn ${activeTab === "suppliers" ? "btn-primary" : "btn-outline"}`} onClick={() => setActiveTab("suppliers")} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
          🏢 Suppliers
        </button>
        <button className={`btn ${activeTab === "logs" ? "btn-primary" : "btn-outline"}`} onClick={() => setActiveTab("logs")} style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}>
          📜 Stock Ledger Logs
        </button>
      </div>

      {/* TAB 1: MEDICINES */}
      {activeTab === "medicines" && (
        <div>
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th>Category</th>
                  <th>Supplier</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Expiry Date</th>
                  <th>Prescription Req</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {medicines.map((m) => (
                  <tr key={m.id}>
                    <td style={{ fontWeight: "700" }}>{m.name}</td>
                    <td>{m.category_name || "-"}</td>
                    <td>{m.supplier_name || "-"}</td>
                    <td style={{ fontWeight: "600" }}>₹{m.price.toFixed(2)}</td>
                    <td>
                      <span className={`badge badge-${m.stock === 0 ? "danger" : m.stock < 10 ? "warning" : "success"}`}>
                        {m.stock} units
                      </span>
                    </td>
                    <td>{m.expiry_date}</td>
                    <td>
                      <span className={`badge badge-${m.requires_prescription === 1 ? "danger" : "info"}`} style={{ fontSize: "0.65rem" }}>
                        {m.requires_prescription === 1 ? "Rx Required" : "OTC (Over Counter)"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button className="btn btn-outline" onClick={() => openEditMedModal(m)} style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem" }}>
                          ✏️ Edit
                        </button>
                        <button className="btn btn-danger" onClick={() => handleDeleteMed(m.id)} style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem" }}>
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {medTotalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" onClick={() => medPage > 1 && setMedPage(medPage - 1)} disabled={medPage === 1}>
                &laquo;
              </button>
              {Array.from({ length: medTotalPages }, (_, i) => (
                <button key={i + 1} className={`page-btn ${medPage === i + 1 ? "active" : ""}`} onClick={() => setMedPage(i + 1)}>
                  {i + 1}
                </button>
              ))}
              <button className="page-btn" onClick={() => medPage < medTotalPages && setMedPage(medPage + 1)} disabled={medPage === medTotalPages}>
                &raquo;
              </button>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CATEGORIES */}
      {activeTab === "categories" && (
        <div className="grid-3" style={{ alignItems: "start" }}>
          {/* Add Category */}
          <div className="card">
            <h2>Add New Category</h2>
            <form onSubmit={handleAddCategory}>
              <div className="form-group">
                <label className="form-label">Category Name</label>
                <input type="text" className="form-control" placeholder="e.g. Inhalers" value={catName} onChange={(e) => setCatName(e.target.value)} required />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                Add Category
              </button>
            </form>
          </div>

          {/* List Categories (Grid right span 2) */}
          <div style={{ gridColumn: "span 2" }} className="card">
            <h2>Existing Categories</h2>
            <div className="table-container" style={{ border: "none", boxShadow: "none", margin: 0 }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Category Name</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td style={{ width: "80px" }}>#{c.id}</td>
                      <td style={{ fontWeight: "700" }}>{c.name}</td>
                      <td>
                        <button className="btn btn-danger" onClick={() => handleDeleteCat(c.id)} style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem" }}>
                          🗑️ Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SUPPLIERS */}
      {activeTab === "suppliers" && (
        <div>
          <div style={{ marginBottom: "1rem", textAlign: "right" }}>
            <button className="btn btn-primary" onClick={openAddSupModal} style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}>
              ➕ Add Supplier
            </button>
          </div>

          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id}>
                    <td>#{s.id}</td>
                    <td style={{ fontWeight: "700" }}>{s.name}</td>
                    <td>{s.contact || "-"}</td>
                    <td>{s.email || "-"}</td>
                    <td>{s.address || "-"}</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button className="btn btn-outline" onClick={() => openEditSupModal(s)} style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem" }}>
                          ✏️ Edit
                        </button>
                        <button className="btn btn-danger" onClick={() => handleDeleteSup(s.id)} style={{ padding: "0.2rem 0.4rem", fontSize: "0.75rem" }}>
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === "logs" && (
        <div>
          <div className="table-container">
            <table className="custom-table" style={{ fontSize: "0.85rem" }}>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Medicine</th>
                  <th>Event Type</th>
                  <th>Change Qty</th>
                  <th>Final Stock</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td>{new Date(l.created_at).toLocaleString()}</td>
                    <td style={{ fontWeight: "700" }}>{l.medicine_name || "Deleted Medicine"}</td>
                    <td>
                      <span className={`badge badge-${l.change_type === "sale" ? "info" : l.change_type === "cancellation" ? "success" : "pending"}`}>
                        {l.change_type}
                      </span>
                    </td>
                    <td style={{ fontWeight: "700", color: l.quantity < 0 ? "var(--danger-hover)" : "var(--success-hover)" }}>
                      {l.quantity > 0 ? `+${l.quantity}` : l.quantity}
                    </td>
                    <td style={{ fontWeight: "600" }}>{l.current_stock}</td>
                    <td>{l.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {logTotalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" onClick={() => logPage > 1 && setLogPage(logPage - 1)} disabled={logPage === 1}>
                &laquo;
              </button>
              {Array.from({ length: logTotalPages }, (_, i) => (
                <button key={i + 1} className={`page-btn ${logPage === i + 1 ? "active" : ""}`} onClick={() => setLogPage(i + 1)}>
                  {i + 1}
                </button>
              ))}
              <button className="page-btn" onClick={() => logPage < logTotalPages && setLogPage(logPage + 1)} disabled={logPage === logTotalPages}>
                &raquo;
              </button>
            </div>
          )}
        </div>
      )}

      {/* Medicine Form Modal */}
      <Modal isOpen={isMedModalOpen} onClose={() => setIsMedModalOpen(false)} title={editingMed ? "Edit Medicine Record" : "Register New Medicine"}>
        <form onSubmit={handleSaveMedicine}>
          <div className="form-group">
            <label className="form-label">Medicine Name</label>
            <input type="text" className="form-control" value={medName} onChange={(e) => setMedName(e.target.value)} placeholder="e.g. Lipitor 10mg" required />
          </div>

          <div className="form-group">
            <label className="form-label">Description / Uses</label>
            <textarea className="form-control" rows="2" value={medDesc} onChange={(e) => setMedDesc(e.target.value)} placeholder="Enter details about this medicine..." />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Price (INR)</label>
              <input type="number" step="0.01" className="form-control" value={medPrice} onChange={(e) => setMedPrice(e.target.value)} placeholder="99.00" required />
            </div>
            <div className="form-group">
              <label className="form-label">Stock Quantity</label>
              <input type="number" className="form-control" value={medStock} onChange={(e) => setMedStock(e.target.value)} placeholder="100" required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Expiry Date</label>
            <input type="date" className="form-control" value={medExpiry} onChange={(e) => setMedExpiry(e.target.value)} required />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <select className="form-control" value={medCatId} onChange={(e) => setMedCatId(e.target.value)}>
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Supplier</label>
              <select className="form-control" value={medSupId} onChange={(e) => setMedSupId(e.target.value)}>
                <option value="">Select Supplier</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "1rem" }}>
            <input type="checkbox" id="medRxBox" checked={medRx} onChange={(e) => setMedRx(e.target.checked)} style={{ width: "18px", height: "18px" }} />
            <label htmlFor="medRxBox" style={{ fontWeight: "700", cursor: "pointer", fontSize: "0.95rem" }}>
              Requires Doctor Prescription
            </label>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.75rem", marginTop: "1rem" }}>
            {editingMed ? "Save Changes" : "Register Medicine"}
          </button>
        </form>
      </Modal>

      {/* Supplier Modal */}
      <Modal isOpen={isSupModalOpen} onClose={() => setIsSupModalOpen(false)} title={editingSup ? "Edit Supplier Info" : "Register New Supplier"}>
        <form onSubmit={handleSaveSupplier}>
          <div className="form-group">
            <label className="form-label">Supplier Name</label>
            <input type="text" className="form-control" value={supName} onChange={(e) => setSupName(e.target.value)} placeholder="e.g. Pfizer Dist." required />
          </div>
          <div className="form-group">
            <label className="form-label">Contact Phone</label>
            <input type="text" className="form-control" value={supContact} onChange={(e) => setSupContact(e.target.value)} placeholder="+1-555-1234" />
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input type="email" className="form-control" value={supEmail} onChange={(e) => setSupEmail(e.target.value)} placeholder="contact@supplier.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Office Address</label>
            <textarea className="form-control" rows="2" value={supAddress} onChange={(e) => setSupAddress(e.target.value)} placeholder="Street, City, Country" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
            {editingSup ? "Save Changes" : "Register Supplier"}
          </button>
        </form>
      </Modal>

      {/* Quick Stock Adjust Modal */}
      <Modal isOpen={isAdjustModalOpen} onClose={() => setIsAdjustModalOpen(false)} title="Quick Inventory Restock">
        <form onSubmit={handleAdjustStock}>
          <div className="form-group">
            <label className="form-label">Select Medicine</label>
            <select className="form-control" value={adjustMedId} onChange={(e) => setAdjustMedId(e.target.value)} required>
              <option value="">Select Medicine</option>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>{m.name} (Current Stock: {m.stock})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Quantity to Add (use negative to reduce)</label>
            <input type="number" className="form-control" value={adjustQty} onChange={(e) => setAdjustQty(e.target.value)} placeholder="e.g. 50" required />
          </div>

          <div className="form-group">
            <label className="form-label">Adjustment Reason</label>
            <select className="form-control" value={adjustType} onChange={(e) => setAdjustType(e.target.value)}>
              <option value="restock">Restock</option>
              <option value="adjustment">Manual Adjustment</option>
              <option value="expiry_removal">Expired Stock Removal</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Internal Notes</label>
            <input type="text" className="form-control" value={adjustNotes} onChange={(e) => setAdjustNotes(e.target.value)} placeholder="e.g. Received new shipment from supplier" />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }}>
            Submit Stock Adjustment
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default InventoryManagement;
