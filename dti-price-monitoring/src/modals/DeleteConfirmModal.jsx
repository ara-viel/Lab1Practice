import React from "react";
import { X, AlertTriangle } from "lucide-react";
import "../assets/DeleteConfirmModal.css";

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, itemCount = 1 }) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="dcm-overlay">
      <div className="dcm-modal">
        <div className="dcm-header">
          <div className="dcm-title-group">
            <AlertTriangle size={24} color="#ef4444" />
            <h2 className="dcm-title">Confirm Deletion</h2>
          </div>
          <button className="dcm-close-btn" onClick={onClose} title="Close">
            <X size={24} />
          </button>
        </div>

        <div className="dcm-content">
          <p className="dcm-message">
            Are you sure you want to delete <strong>{itemCount}</strong> record{itemCount !== 1 ? "s" : ""}?
          </p>
          <p className="dcm-warning">
            This action cannot be undone.
          </p>
        </div>

        <div className="dcm-footer">
          <button className="dcm-btn dcm-btn-cancel" onClick={onClose}>
            Cancel
          </button>
          <button className="dcm-btn dcm-btn-delete" onClick={handleConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
