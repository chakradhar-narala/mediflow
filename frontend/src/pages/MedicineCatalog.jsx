import React, { useEffect, useState } from "react";
import API from "../services/api";
import MedicineCard from "../components/MedicineCard";
import { toast } from "react-toastify";

const MedicineCatalog = () => {
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [expiryStatus, setExpiryStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalItems: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
    fetchRecommendations();
  }, []);

  useEffect(() => {
    fetchMedicines();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, selectedCategory, stockStatus, expiryStatus, page]);

  const fetchCategories = async () => {
    try {
      const res = await API.get("/categories");
      setCategories(res.data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchRecommendations = async () => {
    try {
      const res = await API.get("/medicines/recommendations?limit=4");
      setRecommendations(res.data);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
    }
  };

  const fetchMedicines = async () => {
    setLoading(true);
    try {
      const res = await API.get("/medicines", {
        params: {
          q: search,
          category_id: selectedCategory,
          stock_status: stockStatus,
          expiry_status: expiryStatus,
          page,
          limit: 8
        }
      });
      setMedicines(res.data.medicines);
      setPagination(res.data.pagination);
    } catch (error) {
      toast.error("Error loading medicine catalog");
      console.error(error);
    }
    setLoading(false);
  };

  const handleResetFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setStockStatus("");
    setExpiryStatus("");
    setPage(1);
  };

  const handlePrevPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (page < pagination.totalPages) setPage(page + 1);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1>Medicine Catalog</h1>
          <p style={{ color: "var(--light-text)" }}>Search and order healthcare essentials</p>
        </div>
        <button className="btn btn-outline" onClick={handleResetFilters}>
          Clear Filters
        </button>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <div className="filter-item">
          <label className="form-label" style={{ marginBottom: "0.25rem" }}>Search Medicine</label>
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, description..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ padding: "0.5rem 0.75rem" }}
          />
        </div>

        <div className="filter-item">
          <label className="form-label" style={{ marginBottom: "0.25rem" }}>Category</label>
          <select
            className="form-control"
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
            style={{ padding: "0.5rem 0.75rem" }}
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        <div className="filter-item">
          <label className="form-label" style={{ marginBottom: "0.25rem" }}>Stock Status</label>
          <select
            className="form-control"
            value={stockStatus}
            onChange={(e) => { setStockStatus(e.target.value); setPage(1); }}
            style={{ padding: "0.5rem 0.75rem" }}
          >
            <option value="">All Stock Levels</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock (&lt; 10)</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>

        <div className="filter-item">
          <label className="form-label" style={{ marginBottom: "0.25rem" }}>Expiry Status</label>
          <select
            className="form-control"
            value={expiryStatus}
            onChange={(e) => { setExpiryStatus(e.target.value); setPage(1); }}
            style={{ padding: "0.5rem 0.75rem" }}
          >
            <option value="">All Expiries</option>
            <option value="normal">Normal (&gt; 30 days)</option>
            <option value="soon">Soon to Expire (&le; 30 days)</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Catalog Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", fontSize: "1.2rem", fontWeight: "600", color: "var(--light-text)" }}>
          Loading Catalog...
        </div>
      ) : medicines.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem" }}>
          <span style={{ fontSize: "3rem" }}>🔍</span>
          <h2 style={{ marginTop: "1rem" }}>No medicines found</h2>
          <p>Try adjusting your search query or filters.</p>
        </div>
      ) : (
        <>
          <div className="grid-4">
            {medicines.map((medicine) => (
              <MedicineCard key={medicine.id} medicine={medicine} />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button className="page-btn" onClick={handlePrevPage} disabled={page === 1}>
                &laquo;
              </button>
              {Array.from({ length: pagination.totalPages }, (_, idx) => (
                <button
                  key={idx + 1}
                  className={`page-btn ${page === idx + 1 ? "active" : ""}`}
                  onClick={() => setPage(idx + 1)}
                >
                  {idx + 1}
                </button>
              ))}
              <button className="page-btn" onClick={handleNextPage} disabled={page === pagination.totalPages}>
                &raquo;
              </button>
            </div>
          )}
        </>
      )}

      {/* Recommendations Panel */}
      {recommendations.length > 0 && (
        <div style={{ marginTop: "4rem", borderTop: "1px solid var(--border-color)", paddingTop: "2rem" }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>🌟</span> Recommended for You
          </h2>
          <p style={{ color: "var(--light-text)", marginBottom: "1.5rem" }}>Popular items in stock and ready to ship</p>
          <div className="grid-4">
            {recommendations.map((rec) => (
              <MedicineCard key={rec.id} medicine={rec} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicineCatalog;