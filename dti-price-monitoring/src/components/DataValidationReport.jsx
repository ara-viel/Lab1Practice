import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, AlertTriangle, X } from "lucide-react";
import { DataValidator } from "../services/dataValidator.js";

export default function DataValidationReport({ records, onApprove, onCancel, selectedYear }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [selectedValidIndexes, setSelectedValidIndexes] = useState(new Set());

  const { valid, invalid } = DataValidator.validateBatch(records);
  const duplicates = DataValidator.findDuplicates(valid);
  const report = DataValidator.generateQualityReport(valid);

  useEffect(() => {
    // Default to all valid records selected when records change
    setSelectedValidIndexes(new Set(valid.map((_, idx) => idx)));
  }, [records, valid.length]);

  const toggleValidSelection = (idx) => {
    setSelectedValidIndexes(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const selectAllValid = () => setSelectedValidIndexes(new Set(valid.map((_, idx) => idx)));
  const unselectAllValid = () => setSelectedValidIndexes(new Set());

  const handleApprove = () => {
    const selectedRecords = valid.filter((_, idx) => selectedValidIndexes.has(idx));
    onApprove(selectedRecords);
  };

  return (
    <div style={modalOverlayStyle}>
      <div style={modalStyle}>
        {/* Header */}
        <div style={modalHeaderStyle}>
          <div>
            <h2 style={{ margin: 0, color: "#0f172a" }}>Data Validation Report</h2>
            {selectedYear && (
              <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "#64748b" }}>
                Importing data for year: <strong>{selectedYear}</strong>
              </p>
            )}
          </div>
          <button
            onClick={onCancel}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            <X size={24} color="#64748b" />
          </button>
        </div>

        {/* Tabs */}
        <div style={tabsStyle}>
          <button
            style={activeTab === "summary" ? tabActiveStyle : tabInactiveStyle}
            onClick={() => setActiveTab("summary")}
          >
            Summary
          </button>
          <button
            style={activeTab === "valid" ? tabActiveStyle : tabInactiveStyle}
            onClick={() => setActiveTab("valid")}
          >
            Valid Records ({valid.length})
          </button>
          {invalid.length > 0 && (
            <button
              style={activeTab === "invalid" ? tabActiveStyle : tabInactiveStyle}
              onClick={() => setActiveTab("invalid")}
            >
              Issues ({invalid.length})
            </button>
          )}
          {duplicates.length > 0 && (
            <button
              style={activeTab === "duplicates" ? tabActiveStyle : tabInactiveStyle}
              onClick={() => setActiveTab("duplicates")}
            >
              Duplicates ({duplicates.length})
            </button>
          )}
        </div>

        {/* Content */}
        <div style={contentStyle}>
          {/* Summary Tab */}
          {activeTab === "summary" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                <div style={summaryCardStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <CheckCircle size={20} color="#22c55e" />
                    <span style={summaryLabelStyle}>Valid Records</span>
                  </div>
                  <div style={summaryValueStyle}>{valid.length}</div>
                </div>
                <div style={summaryCardStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                    <AlertTriangle size={20} color={invalid.length > 0 ? "#ef4444" : "#22c55e"} />
                    <span style={summaryLabelStyle}>Issues Found</span>
                  </div>
                  <div style={summaryValueStyle}>{invalid.length}</div>
                </div>
              </div>

              <div style={sectionStyle}>
                <h4 style={{ margin: "0 0 12px 0", color: "#0f172a" }}>Data Distribution</h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <p style={{ margin: "0 0 8px 0", fontSize: "0.85rem", color: "#64748b", fontWeight: "600" }}>
                      BY MUNICIPALITY
                    </p>
                    {Object.entries(report.byMunicipality).map(([municipality, count]) => (
                      <div key={municipality} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ color: "#475569", fontSize: "0.9rem" }}>{municipality}</span>
                        <strong style={{ color: "#0f172a" }}>{count}</strong>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p style={{ margin: "0 0 8px 0", fontSize: "0.85rem", color: "#64748b", fontWeight: "600" }}>
                      BY COMMODITY
                    </p>
                    {Object.entries(report.byCommodity).map(([commodity, count]) => (
                      <div key={commodity} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid #f1f5f9" }}>
                        <span style={{ color: "#475569", fontSize: "0.9rem" }}>{commodity}</span>
                        <strong style={{ color: "#0f172a" }}>{count}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {report.priceRange.min !== Infinity && (
                <div style={sectionStyle}>
                  <h4 style={{ margin: "0 0 12px 0", color: "#0f172a" }}>Price Statistics</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                    <div>
                      <p style={{ margin: "0 0 4px 0", fontSize: "0.85rem", color: "#64748b" }}>Min Price</p>
                      <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: "600", color: "#22c55e" }}>
                        ₱{report.priceRange.min.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p style={{ margin: "0 0 4px 0", fontSize: "0.85rem", color: "#64748b" }}>Max Price</p>
                      <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: "600", color: "#ef4444" }}>
                        ₱{report.priceRange.max.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Valid Records Tab */}
          {activeTab === "valid" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ color: "#64748b", fontSize: "0.9rem" }}>
                  Showing {Math.min(10, valid.length)} of {valid.length} valid records • Selected {selectedValidIndexes.size}
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button
                    onClick={selectAllValid}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #cbd5e1", background: "white", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem" }}
                  >
                    Select All
                  </button>
                  <button
                    onClick={unselectAllValid}
                    style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontWeight: "600", fontSize: "0.85rem" }}
                  >
                    Unselect All
                  </button>
                </div>
              </div>
              <div style={{ overflowY: "auto", maxHeight: "300px" }}>
                {valid.map((record, idx) => {
                  if (idx >= 10) return null;
                  const checked = selectedValidIndexes.has(idx);
                  return (
                    <div key={idx} style={{ ...recordItemStyle, display: "flex", alignItems: "center", gap: "12px" }}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleValidSelection(idx)}
                        style={{ width: "16px", height: "16px", accentColor: "#0f172a", cursor: "pointer" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "600", color: "#1e293b" }}>{record.commodity}</div>
                        <div style={{ color: "#64748b", fontSize: "0.85rem" }}>
                          {record.store || ""} {record.brand ? `• ${record.brand}` : ""} {record.variant ? `• ${record.variant}` : ""} {record.price ? `• ₱${Number(record.price).toFixed(2)}` : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Invalid Records Tab */}
          {activeTab === "invalid" && invalid.length > 0 && (
            <div>
              <p style={{ margin: "0 0 12px 0", color: "#ef4444", fontSize: "0.9rem" }}>
                {invalid.length} record(s) with issues that will be skipped
              </p>
              <div style={{ overflowY: "auto", maxHeight: "300px" }}>
                {invalid.slice(0, 10).map((item, idx) => (
                  <div key={idx} style={errorRecordItemStyle}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <AlertCircle size={16} color="#ef4444" style={{ marginTop: "2px", flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>
                          Row {item.row}
                        </div>
                        {item.errors.map((error, i) => (
                          <div key={i} style={{ color: "#dc2626", fontSize: "0.85rem", marginBottom: "2px" }}>
                            • {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Duplicates Tab */}
          {activeTab === "duplicates" && duplicates.length > 0 && (
            <div>
              <p style={{ margin: "0 0 12px 0", color: "#f59e0b", fontSize: "0.9rem" }}>
                {duplicates.length} potential duplicate(s) detected
              </p>
              <div style={{ overflowY: "auto", maxHeight: "300px" }}>
                {duplicates.slice(0, 5).map((dup, idx) => (
                  <div key={idx} style={errorRecordItemStyle}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                      <AlertTriangle size={16} color="#f59e0b" style={{ marginTop: "2px", flexShrink: 0 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "600", color: "#1e293b", marginBottom: "4px" }}>
                          Possible Duplicate
                        </div>
                        <div style={{ color: "#64748b", fontSize: "0.85rem" }}>
                          {dup.previous.commodity} • {dup.previous.store} • ₱{dup.previous.price}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={modalFooterStyle}>
          <button style={cancelButtonStyle} onClick={onCancel}>
            Cancel
          </button>
          <button 
            style={approveButtonStyle} 
            onClick={handleApprove}
            disabled={selectedValidIndexes.size === 0}
          >
            Import {selectedValidIndexes.size} Selected Record{selectedValidIndexes.size !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// Styles
const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: "rgba(0, 0, 0, 0.5)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000
};

const modalStyle = {
  background: "white",
  borderRadius: "12px",
  width: "90%",
  maxWidth: "700px",
  maxHeight: "90vh",
  display: "flex",
  flexDirection: "column",
  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)"
};

const modalHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "24px",
  borderBottom: "1px solid #e2e8f0"
};

const tabsStyle = {
  display: "flex",
  gap: "0",
  padding: "0 24px",
  borderBottom: "1px solid #e2e8f0",
  overflow: "auto"
};

const tabInactiveStyle = {
  padding: "12px 16px",
  border: "none",
  background: "none",
  color: "#64748b",
  cursor: "pointer",
  fontSize: "0.9rem",
  fontWeight: "500",
  borderBottom: "2px solid transparent",
  whiteSpace: "nowrap"
};

const tabActiveStyle = {
  ...tabInactiveStyle,
  color: "#0f172a",
  borderBottomColor: "#0f172a",
  fontWeight: "600"
};

const contentStyle = {
  flex: 1,
  padding: "24px",
  overflowY: "auto"
};

const sectionStyle = {
  marginBottom: "24px",
  padding: "16px",
  background: "#f8fafc",
  borderRadius: "8px",
  border: "1px solid #e2e8f0"
};

const summaryCardStyle = {
  background: "white",
  padding: "16px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0"
};

const summaryLabelStyle = {
  color: "#64748b",
  fontSize: "0.85rem",
  fontWeight: "600"
};

const summaryValueStyle = {
  fontSize: "2rem",
  fontWeight: "800",
  color: "#0f172a"
};

const recordItemStyle = {
  padding: "12px",
  borderBottom: "1px solid #f1f5f9",
  "&:last-child": { borderBottom: "none" }
};

const errorRecordItemStyle = {
  padding: "12px",
  marginBottom: "12px",
  background: "#fef2f2",
  border: "1px solid #fee2e2",
  borderRadius: "6px"
};

const modalFooterStyle = {
  display: "flex",
  gap: "12px",
  justifyContent: "flex-end",
  padding: "24px",
  borderTop: "1px solid #e2e8f0"
};

const cancelButtonStyle = {
  padding: "10px 20px",
  border: "1px solid #cbd5e1",
  background: "white",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "0.9rem",
  fontWeight: "600",
  color: "#0f172a"
};

const approveButtonStyle = {
  padding: "10px 20px",
  border: "none",
  background: "#22c55e",
  color: "white",
  borderRadius: "6px",
  cursor: "pointer",
  fontSize: "0.9rem",
  fontWeight: "600"
};
