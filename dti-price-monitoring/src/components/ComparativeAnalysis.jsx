import React, { useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

export default function ComparativeAnalysis({ prices }) {
  const [selectedCommodity, setSelectedCommodity] = useState("all");
  const [selectedStore, setSelectedStore] = useState("all");

  // Handle null or undefined prices
  const pricesArray = Array.isArray(prices) ? prices : [];

  // Get unique commodities and stores for filters
  const uniqueCommodities = [...new Set(pricesArray.map(p => p.commodity).filter(Boolean))];
  const uniqueStores = [...new Set(pricesArray.map(p => p.store).filter(Boolean))];

  // Group data by commodity and store
  const getComparativeData = () => {
    // Group by commodity and store
    const grouped = {};
    
    pricesArray.forEach(item => {
      if (!item || !item.commodity || !item.store) return;
      
      const key = `${item.commodity}_${item.store}`;
      if (!grouped[key]) {
        grouped[key] = {
          commodity: item.commodity,
          store: item.store,
          municipality: item.municipality || "N/A",
          prices: []
        };
      }
      grouped[key].prices.push({
        price: item.price || 0,
        prevPrice: item.prevPrice || item.price || 0,
        timestamp: item.timestamp ? new Date(item.timestamp) : new Date()
      });
    });

    // Calculate price change for each group
    const results = Object.values(grouped).map(group => {
      // Sort by timestamp to get latest and previous
      const sortedPrices = group.prices.sort((a, b) => b.timestamp - a.timestamp);
      const latestPrice = sortedPrices[0]?.price || 0;
      const previousPrice = sortedPrices[0]?.prevPrice || (sortedPrices[1]?.price || latestPrice) || 0;
      
      const priceChange = latestPrice - previousPrice;
      const percentChange = previousPrice !== 0 ? ((priceChange / previousPrice) * 100) : 0;

      return {
        commodity: group.commodity,
        store: group.store,
        municipality: group.municipality,
        currentPrice: latestPrice,
        previousPrice: previousPrice,
        priceChange: priceChange,
        percentChange: percentChange,
        status: priceChange > 0 ? "increased" : priceChange < 0 ? "decreased" : "stable"
      };
    });

    // Apply filters
    let filtered = results;
    if (selectedCommodity !== "all") {
      filtered = filtered.filter(item => item.commodity === selectedCommodity);
    }
    if (selectedStore !== "all") {
      filtered = filtered.filter(item => item.store === selectedStore);
    }

    // Sort by absolute price change (priority to largest changes)
    return filtered.sort((a, b) => Math.abs(b.priceChange) - Math.abs(a.priceChange));
  };

  const comparativeData = getComparativeData();

  // Summary statistics
  const increasedCount = comparativeData.filter(d => d.status === "increased").length;
  const decreasedCount = comparativeData.filter(d => d.status === "decreased").length;
  const stableCount = comparativeData.filter(d => d.status === "stable").length;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", marginBottom: "24px" }}>
        <div style={{ ...cardStyle, borderLeft: "4px solid #ef4444" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingUp size={20} color="#ef4444" />
            <span style={labelStyle}>Price Increases</span>
          </div>
          <div style={{ ...valueStyle, color: "#ef4444" }}>{increasedCount}</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: "4px solid #22c55e" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingDown size={20} color="#22c55e" />
            <span style={labelStyle}>Price Decreases</span>
          </div>
          <div style={{ ...valueStyle, color: "#22c55e" }}>{decreasedCount}</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: "4px solid #64748b" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Minus size={20} color="#64748b" />
            <span style={labelStyle}>Stable Prices</span>
          </div>
          <div style={{ ...valueStyle, color: "#64748b" }}>{stableCount}</div>
        </div>
      </div>

      {/* Filters and Table */}
      <div style={containerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a" }}>
              Comparative Price Analysis by Store & Commodity
            </h3>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.85rem" }}>
              Monitor price changes across different establishments
            </p>
          </div>
          
          {/* Filters */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <select 
              value={selectedCommodity} 
              onChange={(e) => setSelectedCommodity(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Commodities</option>
              {uniqueCommodities.map(commodity => (
                <option key={commodity} value={commodity}>{commodity}</option>
              ))}
            </select>
            
            <select 
              value={selectedStore} 
              onChange={(e) => setSelectedStore(e.target.value)}
              style={selectStyle}
            >
              <option value="all">All Stores</option>
              {uniqueStores.map(store => (
                <option key={store} value={store}>{store}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={thStyle}>COMMODITY</th>
                <th style={thStyle}>STORE</th>
                <th style={thStyle}>MUNICIPALITY</th>
                <th style={thStyle}>PREVIOUS PRICE</th>
                <th style={thStyle}>CURRENT PRICE</th>
                <th style={thStyle}>CHANGE (₱)</th>
                <th style={thStyle}>CHANGE (%)</th>
                <th style={thStyle}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {comparativeData.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                    No data available for the selected filters
                  </td>
                </tr>
              ) : (
                comparativeData.map((item, index) => {
                  const isIncrease = item.status === "increased";
                  const isDecrease = item.status === "decreased";
                  const isStable = item.status === "stable";

                  return (
                    <tr key={index} style={rowStyle}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: "600", color: "#1e293b" }}>{item.commodity}</div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ color: "#475569" }}>{item.store}</div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ color: "#64748b", fontSize: "0.9rem" }}>{item.municipality}</div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: "#64748b" }}>₱{(item.previousPrice || 0).toFixed(2)}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: "1.05rem", fontWeight: "600" }}>₱{(item.currentPrice || 0).toFixed(2)}</span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "4px",
                          color: isIncrease ? "#ef4444" : isDecrease ? "#22c55e" : "#64748b",
                          fontWeight: "600"
                        }}>
                          {isIncrease && <TrendingUp size={16} />}
                          {isDecrease && <TrendingDown size={16} />}
                          {isStable && <Minus size={16} />}
                          <span>
                            {item.priceChange > 0 ? "+" : ""}
                            ₱{(item.priceChange || 0).toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ 
                          color: isIncrease ? "#ef4444" : isDecrease ? "#22c55e" : "#64748b",
                          fontWeight: "600"
                        }}>
                          {item.percentChange > 0 ? "+" : ""}
                          {(item.percentChange || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={getBadgeStyle(item.status)}>
                          {item.status === "increased" ? "● Increased" : 
                           item.status === "decreased" ? "● Decreased" : 
                           "● Stable"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// --- STYLES ---

const containerStyle = {
  background: "white",
  padding: "24px",
  borderRadius: "16px",
  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)",
  border: "1px solid #e2e8f0"
};

const cardStyle = {
  background: "white",
  padding: "16px 20px",
  borderRadius: "12px",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
  border: "1px solid #e2e8f0"
};

const labelStyle = {
  fontSize: "0.75rem",
  color: "#64748b",
  fontWeight: "600",
  textTransform: "uppercase",
  letterSpacing: "0.5px"
};

const valueStyle = {
  fontSize: "2rem",
  fontWeight: "800",
  marginTop: "8px"
};

const selectStyle = {
  padding: "8px 12px",
  borderRadius: "8px",
  border: "1px solid #cbd5e1",
  fontSize: "0.9rem",
  outline: "none",
  cursor: "pointer",
  background: "white"
};

const thStyle = {
  padding: "12px 16px",
  fontSize: "0.75rem",
  fontWeight: "700",
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  borderBottom: "2px solid #e2e8f0",
  background: "#f8fafc"
};

const tdStyle = {
  padding: "16px",
  fontSize: "0.9rem",
  borderBottom: "1px solid #f1f5f9"
};

const rowStyle = {
  transition: "background 0.15s",
  cursor: "pointer"
};

const getBadgeStyle = (status) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: "4px",
  padding: "4px 12px",
  borderRadius: "6px",
  fontSize: "0.8rem",
  fontWeight: "600",
  background: status === "increased" ? "#fee2e2" : 
              status === "decreased" ? "#dcfce7" : 
              "#f1f5f9",
  color: status === "increased" ? "#dc2626" : 
         status === "decreased" ? "#16a34a" : 
         "#64748b"
});
