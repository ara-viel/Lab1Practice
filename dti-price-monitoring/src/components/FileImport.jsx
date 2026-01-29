import React, { useState } from "react";
import { Upload, AlertCircle, CheckCircle, X } from "lucide-react";
import { importFile } from "../services/fileImportService";
import { getOrderedColumns, formatColumnName, formatCellValue } from "../services/schemaUtils";

export default function FileImport({ onImportSuccess, onClose }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [importedData, setImportedData] = useState(null);
  const [category, setCategory] = useState("");

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setMessage(null);

    try {
      const data = await importFile(file);
      setImportedData(data);
      setMessage({
        type: "success",
        text: `Successfully loaded ${data.length} records from ${file.name}.`
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: `Error importing file: ${error.message}`
      });
      setImportedData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importedData) return;
    if (!category) {
      setMessage({ type: "error", text: "Please select a category before importing." });
      return;
    }

    setLoading(true);
    try {
      // If BPCM is selected, keep the parsed category from the file (auto-sort)
      // Otherwise, use the selected category
      const dataWithCategory = importedData.map(item => ({
        ...item,
        category: category === "BPCM" ? item.category : 
                  category === "BASIC NECESSITIES" ? "basic" :
                  category === "PRIME COMMODITIES" ? "prime" :
                  category === "CONSTRUCTION MATERIALS" ? "construction" :
                  category === "NOCHE BUENA" ? "noche-buena" :
                  category === "SCHOOL SUPPLIES" ? "school-supplies" :
                  item.category
      }));

      await onImportSuccess(dataWithCategory, category);
      setMessage({
        type: "success",
        text: `${importedData.length} records imported successfully!`
      });
      
      // Close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      setMessage({
        type: "error",
        text: `Error saving records: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  const modalStyle = {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000
  };

  const dialogStyle = {
    background: "white",
    borderRadius: "12px",
    padding: "32px",
    maxWidth: "500px",
    width: "90%",
    boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)"
  };

  return (
    <div style={modalStyle}>
    <div style={dialogStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h2 style={{ margin: 0, fontSize: "1.3rem", color: "#0f172a", fontWeight: "700" }}>
            Import Price Data
          </h2>
          <button 
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <X size={24} color="#64748b" />
          </button>
        </div>

        {/* Category Select */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontWeight: 600, color: "#0f172a", marginBottom: "8px" }}>
            Import Category *
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={loading}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "white",
              fontWeight: 600,
              color: "#0f172a"
            }}
          >
            <option value="">-- Select Category --</option>
            <option value="BPCM">BPCM (Auto-Sort All Categories)</option>
            <option value="BASIC NECESSITIES">Basic Necessities Only</option>
            <option value="PRIME COMMODITIES">Prime Commodities Only</option>
            <option value="CONSTRUCTION MATERIALS">Construction Materials Only</option>
            <option value="NOCHE BUENA">Noche Buena Only</option>
            <option value="SCHOOL SUPPLIES">School Supplies Only</option>
          </select>
        </div>

        {/* File Input */}
        <div style={{
          border: "2px dashed #e2e8f0",
          borderRadius: "8px",
          padding: "32px",
          textAlign: "center",
          marginBottom: "20px",
          background: "#f8fafc",
          cursor: "pointer",
          transition: "all 0.2s"
        }}>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            disabled={loading}
            style={{
              display: "none"
            }}
            id="file-input"
          />
          <label htmlFor="file-input" style={{ cursor: "pointer", display: "block" }}>
            <Upload size={32} color="#64748b" style={{ marginBottom: "12px" }} />
            <div style={{ fontSize: "0.95rem", color: "#1e293b", fontWeight: "600", marginBottom: "4px" }}>
              {loading ? "Processing..." : "Click to select file"}
            </div>
            <div style={{ fontSize: "0.85rem", color: "#64748b" }}>
              Supports CSV and XLSX formats
            </div>
          </label>
        </div>

        {/* Message Display */}
        {message && (
          <div style={{
            display: "flex",
            gap: "12px",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "20px",
            background: message.type === "success" ? "#dcfce7" : message.type === "info" ? "#dbeafe" : "#fee2e2",
            border: `1px solid ${message.type === "success" ? "#86efac" : message.type === "info" ? "#bfdbfe" : "#fca5a5"}`
          }}>
            {message.type === "success" ? (
              <CheckCircle size={20} color="#16a34a" style={{ flexShrink: 0 }} />
            ) : (
              <AlertCircle size={20} color={message.type === "info" ? "#0284c7" : "#dc2626"} style={{ flexShrink: 0 }} />
            )}
            <div style={{ color: message.type === "success" ? "#16a34a" : message.type === "info" ? "#0284c7" : "#dc2626", fontSize: "0.9rem" }}>
              {message.text}
            </div>
          </div>
        )}

        {/* Preview */}
        {importedData && importedData.length > 0 && (
          <div style={{
            background: "#f8fafc",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "20px",
            maxHeight: "200px",
            overflowY: "auto"
          }}>
            <div style={{ fontSize: "0.85rem", color: "#475569", fontWeight: "600", marginBottom: "8px" }}>
              Preview ({importedData.length} records):
            </div>
            <div style={{ overflowX: "auto" }}>
              <PreviewTable data={importedData} />
            </div>
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "1px solid #e2e8f0",
              background: "white",
              color: "#1e293b",
              fontWeight: "600",
              cursor: "pointer",
              fontSize: "0.9rem"
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!importedData || loading || !category}
            style={{
              padding: "10px 16px",
              borderRadius: "8px",
              border: "none",
              background: importedData && category && !loading ? "#0f172a" : "#cbd5e1",
              color: "white",
              fontWeight: "600",
              cursor: importedData && category && !loading ? "pointer" : "not-allowed",
              fontSize: "0.9rem"
            }}
          >
            {loading ? "Importing..." : "Confirm Import"}
          </button>
        </div>
      </div>
      </div>
  );
}

/**
 * Dynamic Preview Table - shows all columns from imported data
 */
function PreviewTable({ data }) {
  if (data.length === 0) return null;
  
  const columns = getOrderedColumns(data);
  const previewData = data.slice(0, 5);

  // Color mapping for each column
  const getColumnColor = (col) => {
    const colorMap = {
      'brand': '#3b82f6',
      'commodity': '#22c55e',
      'month': '#1e3a8a',
      'price': '#06b6d4',
      'size': '#eab308',
      'store': '#f59e0b',
      'variant': '#d97706',
      'years': '#16a34a'
    };
    return colorMap[col.toLowerCase()] || '#64748b';
  };

  return (
    <table style={{
      width: "100%",
      fontSize: "0.8rem",
      borderCollapse: "collapse"
    }}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th 
              key={col}
              style={{
                textAlign: "left",
                padding: "8px",
                color: "white",
                fontWeight: "700",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                backgroundColor: getColumnColor(col),
                borderRight: "1px solid rgba(255,255,255,0.3)"
              }}
            >
              {col.toUpperCase()}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {previewData.map((item, idx) => (
          <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
            {columns.map((col) => (
              <td 
                key={`${idx}-${col}`}
                style={{
                  padding: "6px",
                  color: "#1e293b",
                  maxWidth: "100px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap"
                }}
                title={String(item[col] || '')}
              >
                {formatCellValue(item[col], col)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
