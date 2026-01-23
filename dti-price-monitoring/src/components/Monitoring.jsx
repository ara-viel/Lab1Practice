import React from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { getOrderedColumns, formatColumnName, formatCellValue } from '../services/schemaUtils';

export default function Monitoring({ prices, form, handleChange, handleSave }) {
  // Sort and take top 5 for the bar chart
  const top5Data = [...prices]
    .sort((a, b) => b.price - a.price)
    .slice(0, 5);

  // Reusable card style
  const cardStyle = {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
    border: "1px solid #e2e8f0"
  };

  const inputStyle = {
    padding: "10px 14px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "0.95rem",
    outline: "none",
    transition: "border-color 0.2s",
    width: "100%"
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: "'Inter', sans-serif" }}>
      
      {/* 1. DATA ENTRY SECTION */}
      <div style={cardStyle}>
        <h4 style={{ margin: "0 0 16px 0", color: "#1e293b", fontSize: "1.1rem" }}>
          📝 Conduct Monitoring Entry
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", alignItems: "end" }}>
          <div>
            <label style={labelStyle}>Commodity</label>
            <input style={inputStyle} name="commodity" placeholder="e.g. Rice" value={form.commodity} onChange={handleChange} />
          </div>
          <div>
            <label style={labelStyle}>Store</label>
            <input style={inputStyle} name="store" placeholder="e.g. Savemore" value={form.store} onChange={handleChange} />
          </div>
          <div>
            <label style={labelStyle}>SRP (₱)</label>
            <input style={inputStyle} name="srp" type="number" placeholder="0.00" value={form.srp} onChange={handleChange} />
          </div>
          <div>
            <label style={labelStyle}>Current Price (₱)</label>
            <input style={inputStyle} name="price" type="number" placeholder="0.00" value={form.price} onChange={handleChange} />
          </div>
          <button 
            onClick={handleSave} 
            style={{ 
              background: "#2563eb", 
              color: "white", 
              border: "none", 
              padding: "12px 20px", 
              borderRadius: "8px", 
              fontWeight: "600", 
              cursor: "pointer",
              transition: "background 0.2s"
            }}
            onMouseOver={(e) => e.target.style.background = "#1d4ed8"}
            onMouseOut={(e) => e.target.style.background = "#2563eb"}
          >
            Save Entry
          </button>
        </div>
      </div>

      {/* 2. ANALYTICS VISUALIZATION */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        
        {/* Price Trend Chart */}
        <div style={cardStyle}>
          <h4 style={{ margin: "0 0 20px 0", color: "#1e293b" }}>📈 Price Trends</h4>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={prices} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="commodity" tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
              <YAxis tick={{fill: '#64748b', fontSize: 12}} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
              <Line 
                type="monotone" 
                dataKey="price" 
                stroke="#6366f1" 
                strokeWidth={3} 
                dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Top 5 Bar Chart */}
        <div style={cardStyle}>
          <h4 style={{ margin: "0 0 20px 0", color: "#1e293b" }}>🔥 Top 5 Expensive Items</h4>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={top5Data} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis dataKey="commodity" type="category" tick={{fill: '#1e293b', fontWeight: 500, fontSize: 12}} width={100} axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none' }} />
              <Bar dataKey="price" radius={[0, 4, 4, 0]} barSize={20}>
                {top5Data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* 3. DYNAMIC DATA TABLE */}
      {prices.length > 0 && (
        <div style={cardStyle}>
          <h4 style={{ margin: "0 0 16px 0", color: "#1e293b", fontSize: "1.1rem" }}>
            📊 All Records ({prices.length})
          </h4>
          <div style={{ overflowX: "auto" }}>
            <DynamicTable data={prices} />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Dynamic Table Component - automatically renders all columns from data
 */
function DynamicTable({ data }) {
  const columns = getOrderedColumns(data).filter(col => {
    const norm = (col || '').toString().replace(/[_\s]/g, '').toLowerCase();
    return !['timestamp', 'category', 'createdat', 'updatedat'].includes(norm);
  });

  if (columns.length === 0) {
    return <div style={{ textAlign: "center", color: "#94a3b8", padding: "20px" }}>No data to display</div>;
  }

  return (
    <table style={{
      width: "100%",
      borderCollapse: "collapse",
      fontSize: "0.9rem"
    }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #e2e8f0", background: "#f8fafc" }}>
          {columns.map((col) => (
            <th 
              key={col} 
              style={{
                textAlign: "left",
                padding: "12px",
                fontWeight: "700",
                color: "#475569",
                fontSize: "0.85rem",
                textTransform: "uppercase",
                letterSpacing: "0.5px"
              }}
            >
              {formatColumnName(col)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, idx) => (
          <tr 
            key={row.id || row._id || idx} 
            style={{
              borderBottom: "1px solid #f1f5f9",
              background: idx % 2 === 0 ? "#ffffff" : "#f8fafc",
              transition: "background 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "#f0f4f8"}
            onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? "#ffffff" : "#f8fafc"}
          >
            {columns.map((col) => (
              <td 
                key={`${row.id || row._id}-${col}`}
                style={{
                  padding: "12px",
                  color: "#1e293b",
                  borderRight: "1px solid #f1f5f9"
                }}
              >
                {formatCellValue(row[col], col)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const labelStyle = {
  display: "block",
  fontSize: "0.75rem",
  fontWeight: "600",
  textTransform: "uppercase",
  color: "#64748b",
  marginBottom: "6px"
};