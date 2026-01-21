import React from "react";
import { X, Check } from "lucide-react";
import "../assets/EditRecordModal.css";

export default function EditRecordModal({ isOpen, onClose, formData, onChange, onSave }) {
  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formData.commodity || !formData.price) {
      alert("Please fill in commodity and price");
      return;
    }
    await onSave();
  };

  return (
    <div className="erm-overlay">
      <div className="erm-modal">
        <div className="erm-header">
          <h2 className="erm-title">Edit Record</h2>
          <button className="erm-close-btn" onClick={onClose} title="Close">
            <X size={24} />
          </button>
        </div>

        <div className="erm-form-grid">
          <div className="erm-form-group">
            <label className="erm-label">Brand</label>
            <input
              type="text"
              placeholder="Enter brand"
              value={formData.brand || ""}
              onChange={(e) => onChange("brand", e.target.value)}
              className="erm-input"
            />
          </div>

          <div className="erm-form-group">
            <label className="erm-label">Commodity *</label>
            <input
              type="text"
              placeholder="Enter commodity"
              value={formData.commodity || ""}
              onChange={(e) => onChange("commodity", e.target.value)}
              className="erm-input"
            />
          </div>

          <div className="erm-form-group">
            <label className="erm-label">Month</label>
            <input
              type="text"
              placeholder="Enter month"
              value={formData.month || ""}
              onChange={(e) => onChange("month", e.target.value)}
              className="erm-input"
            />
          </div>

          <div className="erm-form-group">
            <label className="erm-label">Price *</label>
            <input
              type="number"
              placeholder="Enter price"
              value={formData.price || ""}
              onChange={(e) => onChange("price", e.target.value)}
              className="erm-input"
            />
          </div>

          <div className="erm-form-group">
            <label className="erm-label">Size</label>
            <input
              type="text"
              placeholder="Enter size (e.g., 155g)"
              value={formData.size || ""}
              onChange={(e) => onChange("size", e.target.value)}
              className="erm-input"
            />
          </div>

          <div className="erm-form-group">
            <label className="erm-label">Store</label>
            <input
              type="text"
              placeholder="Enter store"
              value={formData.store || ""}
              onChange={(e) => onChange("store", e.target.value)}
              className="erm-input"
            />
          </div>

          <div className="erm-form-group">
            <label className="erm-label">Variant</label>
            <input
              type="text"
              placeholder="Enter variant"
              value={formData.variant || ""}
              onChange={(e) => onChange("variant", e.target.value)}
              className="erm-input"
            />
          </div>

          <div className="erm-form-group">
            <label className="erm-label">Years</label>
            <input
              type="text"
              placeholder="Enter year"
              value={formData.years || ""}
              onChange={(e) => onChange("years", e.target.value)}
              className="erm-input"
            />
          </div>
        </div>

        <div className="erm-footer">
          <button className="erm-btn erm-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="erm-btn erm-btn-save" onClick={handleSave}>
            <Check size={16} style={{ marginRight: "6px" }} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
