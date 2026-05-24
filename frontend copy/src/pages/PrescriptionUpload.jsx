import React, { useState, useEffect } from "react";
import API from "../services/api";
import Modal from "../components/Modal";
import { toast } from "react-toastify";

const PrescriptionUpload = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const fetchPrescriptions = async () => {
    try {
      const res = await API.get("/prescriptions");
      setPrescriptions(res.data);
    } catch (error) {
      toast.error("Failed to load prescription history");
      console.error(error);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.value = e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      return toast.error("Please select a prescription image file to upload");
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("image", file);
    formData.append("notes", notes);

    try {
      await API.post("/prescriptions", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      toast.success("Prescription uploaded successfully!");
      setFile(null);
      setNotes("");
      // Reset file input element
      const fileInput = document.getElementById("presc-file-input");
      if (fileInput) fileInput.value = "";
      fetchPrescriptions();
    } catch (error) {
      toast.error(error.response?.data?.message || "Error uploading prescription");
      console.error(error);
    }
    setLoading(false);
  };

  return (
    <div>
      <h1>Prescriptions</h1>
      <p style={{ color: "var(--light-text)", marginBottom: "2rem" }}>
        Upload doctor prescriptions to buy restricted medicines. Pharmacists will review your upload.
      </p>

      <div className="grid-2" style={{ alignItems: "start" }}>
        {/* Upload Form */}
        <div className="card">
          <h2 style={{ marginBottom: "1.5rem" }}>Upload New Prescription</h2>
          <form onSubmit={handleUpload}>
            <div className="form-group">
              <label className="form-label" htmlFor="presc-file-input">Select Image (PNG, JPG, JPEG)</label>
              <input
                id="presc-file-input"
                type="file"
                className="form-control"
                accept="image/*"
                onChange={handleFileChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Notes / Instructions (Optional)</label>
              <textarea
                className="form-control"
                rows="4"
                placeholder="Mention medicine details, duration, or special requests..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.75rem" }} disabled={loading}>
              {loading ? "Uploading..." : "Upload Prescription"}
            </button>
          </form>
        </div>

        {/* Prescription History List */}
        <div className="card">
          <h2 style={{ marginBottom: "1.5rem" }}>Your Upload History</h2>
          {prescriptions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--light-text)" }}>
              No prescriptions uploaded yet.
            </div>
          ) : (
            <div className="table-container" style={{ border: "none", boxShadow: "none", margin: 0 }}>
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Prescription</th>
                    <th>Status</th>
                    <th>Pharmacist Note</th>
                  </tr>
                </thead>
                <tbody>
                  {prescriptions.map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.uploaded_at).toLocaleDateString()}</td>
                      <td>
                        <button
                          className="btn btn-outline"
                          onClick={() => setPreviewImage(p.image)}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.8rem" }}
                        >
                          👁️ View File
                        </button>
                      </td>
                      <td>
                        <span className={`badge badge-${p.status}`}>{p.status}</span>
                      </td>
                      <td>
                        <span style={{ fontSize: "0.85rem", color: "var(--grey-text)" }}>
                          {p.notes || "-"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      <Modal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        title="Prescription Document Preview"
      >
        {previewImage && (
          <div style={{ display: "flex", justifyContent: "center" }}>
            <img
              src={`http://localhost:5000/uploads/${previewImage}`}
              alt="Prescription document preview"
              style={{ maxWidth: "100%", maxHeight: "50vh", borderRadius: "var(--radius-md)" }}
              onError={(e) => {
                e.target.src = "https://placehold.co/600x400?text=Prescription+File";
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PrescriptionUpload;
