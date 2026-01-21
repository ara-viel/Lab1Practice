import React from "react";
import { X, Check } from "lucide-react";
import "../assets/AddRecordModal.css";

export default function AddRecordModal({ isOpen, onClose, formData, onChange, onSave }) {
  if (!isOpen) return null;

  const handleSave = async () => {
    if (!formData.commodity || !formData.price) {
      alert("Please fill in commodity and price");
      return;
    }
    await onSave();
  };

  return (
    <div className="arm-overlay">
      <div className="arm-modal">
        <div className="arm-header">
          <h2 className="arm-title">Add New Record</h2>
          <button className="arm-close-btn" onClick={onClose} title="Close">
            <X size={24} />
          </button>
        </div>

        <div className="arm-form-grid">
          <div className="arm-form-group">
            <label className="arm-label">Brand</label>
            <input
              type="text"
              placeholder="Enter brand"
              value={formData.brand}
              onChange={(e) => onChange("brand", e.target.value)}
              className="arm-input"
            />
          </div>

          <div className="arm-form-group">
            <label className="arm-label">Commodity *</label>
            <input
              type="text"
              placeholder="Enter commodity"
              value={formData.commodity}
              onChange={(e) => onChange("commodity", e.target.value)}
              className="arm-input"
            />
          </div>

          <div className="arm-form-group">
            <label className="arm-label">Month</label>
            <input
              type="text"
              placeholder="Enter month"
              value={formData.month}
              onChange={(e) => onChange("month", e.target.value)}
              className="arm-input"
            />
          </div>

          <div className="arm-form-group">
            <label className="arm-label">Price *</label>
            <input
              type="number"
              placeholder="Enter price"
              value={formData.price}
              onChange={(e) => onChange("price", e.target.value)}
              className="arm-input"
            />
          </div>

          <div className="arm-form-group">
            <label className="arm-label">Size</label>
            <input
              type="text"
              placeholder="Enter size (e.g., 155g)"
              value={formData.size}
              onChange={(e) => onChange("size", e.target.value)}
              className="arm-input"
            />
          </div>

          <div className="arm-form-group">
            <label className="arm-label">Store</label>
            <input
              type="text"
              placeholder="Enter store"
              value={formData.store}
              onChange={(e) => onChange("store", e.target.value)}
              className="arm-input"
            />
          </div>

          <div className="arm-form-group">
            <label className="arm-label">Variant</label>
            <input
              type="text"
              placeholder="Enter variant"
              value={formData.variant}
              onChange={(e) => onChange("variant", e.target.value)}
              className="arm-input"
            />
          </div>

          <div className="arm-form-group">
            <label className="arm-label">Years</label>
            <input
              type="text"
              placeholder="Enter year"
              value={formData.years}
              onChange={(e) => onChange("years", e.target.value)}
              className="arm-input"
            />
          </div>
        </div>

        <div className="arm-footer">
          <button className="arm-btn arm-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="arm-btn arm-btn-save" onClick={handleSave}>
            <Check size={16} style={{ marginRight: "6px" }} />
            Save Record
          </button>
        </div>
      </div>
    </div>
  );
}
