import React, { useState, useMemo } from "react";
import { TrendingUp, TrendingDown, Search, X, ChevronLeft, ChevronRight } from "lucide-react";

export default function ComparativeAnalysis({ prices, prevailingReport = [] }) {
  const [selectedCommodity, setSelectedCommodity] = useState("all");
  const [selectedStore, setSelectedStore] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Handle null or undefined prices
  const pricesArray = Array.isArray(prices) ? prices : [];

  // Get unique commodities and stores for filters
  const uniqueCommodities = [...new Set(pricesArray.map(p => p.commodity).filter(Boolean))];
  const uniqueStores = [...new Set(pricesArray.map(p => p.store).filter(Boolean))];

  // Create SRP lookup from prevailingReport
  const srpLookup = {};
  const prevailingLookup = {};
  prevailingReport.forEach(r => {
    srpLookup[r.commodity] = r.srp;
    prevailingLookup[r.commodity] = r.prevailing;
  });

  // Get combined data
  const getCombinedData = () => {
    // Group by commodity and store
    const grouped = {};
    
    pricesArray.forEach(item => {
      if (!item || !item.commodity || !item.store) return;
      
      const key = `${item.commodity}_${item.store}`;
      if (!grouped[key]) {
        grouped[key] = {
          commodity: item.commodity,
          store: item.store,
          prices: []
        };
      }
      grouped[key].prices.push({
        price: item.price || 0,
        timestamp: item.timestamp ? new Date(item.timestamp) : new Date()
      });
    });

    // Calculate price change for each group and add SRP/Prevailing info
    const results = Object.values(grouped).map(group => {
      // Sort by timestamp to get latest
      const sortedPrices = group.prices.sort((a, b) => b.timestamp - a.timestamp);
      const currentPrice = sortedPrices[0]?.price || 0;
      const previousPrice = sortedPrices[1]?.price || currentPrice || 0;
      
      const priceChange = currentPrice - previousPrice;
      const percentChange = previousPrice !== 0 ? ((priceChange / previousPrice) * 100) : 0;
      
      const srp = srpLookup[group.commodity] || 0;
      const prevailingPrice = prevailingLookup[group.commodity] || 0;
      const isCompliant = currentPrice <= srp;

      return {
        commodity: group.commodity,
        store: group.store,
        prevailingPrice: prevailingPrice,
        srp: srp,
        currentPrice: currentPrice,
        previousPrice: previousPrice,
        priceChange: priceChange,
        percentChange: percentChange,
        isCompliant: isCompliant
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
    
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.commodity.toLowerCase().includes(searchLower) ||
        item.store.toLowerCase().includes(searchLower)
      );
    }

    // Sort by commodity first, then by store
    return filtered.sort((a, b) => {
      if (a.commodity !== b.commodity) {
        return a.commodity.localeCompare(b.commodity);
      }
      return a.store.localeCompare(b.store);
    });
  };

  const filteredData = getCombinedData();

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredData, currentPage]);

  // Calculate summary statistics
  const compliantCount = filteredData.filter(d => d.isCompliant).length;
  const nonCompliantCount = filteredData.filter(d => !d.isCompliant).length;
  const totalRecords = filteredData.length;

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Summary Cards - Organized */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ ...cardStyle, borderLeft: "4px solid #0f172a" }}>
          <span style={labelStyle}>Total Records</span>
          <div style={valueStyle}>{totalRecords}</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: "4px solid #22c55e" }}>
          <span style={labelStyle}>Compliant</span>
          <div style={{ ...valueStyle, color: "#22c55e" }}>{compliantCount}</div>
        </div>
        <div style={{ ...cardStyle, borderLeft: "4px solid #ef4444" }}>
          <span style={labelStyle}>Non-Compliant</span>
          <div style={{ ...valueStyle, color: "#ef4444" }}>{nonCompliantCount}</div>
        </div>
      </div>

      {/* Combined Table */}
      <div style={containerStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", color: "#0f172a" }}>
              Comparative Price Analysis
            </h3>
            <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.85rem" }}>
              Prevailing prices and compliance status across all stores
            </p>
          </div>
          
          {/* Filters */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <select 
              value={selectedCommodity} 
              onChange={(e) => {
                setSelectedCommodity(e.target.value);
                setCurrentPage(1);
              }}
              style={selectStyle}
            >
              <option value="all">All Commodities</option>
              {uniqueCommodities.map(commodity => (
                <option key={commodity} value={commodity}>{commodity}</option>
              ))}
            </select>
            
            <select 
              value={selectedStore} 
              onChange={(e) => {
                setSelectedStore(e.target.value);
                setCurrentPage(1);
              }}
              style={selectStyle}
            >
              <option value="all">All Stores</option>
              {uniqueStores.map(store => (
                <option key={store} value={store}>{store}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ marginBottom: "20px", display: "flex", gap: "12px", alignItems: "center" }}>
          <Search size={18} color="#64748b" />
          <input
            type="text"
            placeholder="Search by commodity or store..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{ ...selectStyle, flex: 1, minWidth: "200px" }}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              style={{ 
                background: "none", 
                border: "none", 
                cursor: "pointer", 
                color: "#64748b",
                padding: "4px"
              }}
            >
              <X size={18} />
            </button>
          )}
          <span style={{ fontSize: "0.85rem", color: "#64748b", marginLeft: "auto" }}>
            Showing <strong>{paginatedData.length}</strong> of <strong>{totalRecords}</strong>
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={thStyle}>COMMODITY</th>
                <th style={thStyle}>STORE</th>
                <th style={thStyle}>PREVAILING PRICE</th>
                <th style={thStyle}>SRP LIMIT</th>
                <th style={thStyle}>CURRENT PRICE</th>
                <th style={thStyle}>PRICE CHANGE</th>
                <th style={thStyle}>CHANGE %</th>
                <th style={thStyle}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                    {searchTerm ? "No records match your search" : "No data available for the selected filters"}
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => {
                  const isCompliant = item.isCompliant;

                  return (
                    <tr key={index} style={rowStyle}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: "600", color: "#1e293b" }}>{item.commodity}</div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ color: "#475569" }}>{item.store}</div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: "1rem", fontWeight: "600" }}>₱{(item.prevailingPrice || 0).toFixed(2)}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: "#64748b" }}>₱{(item.srp || 0).toFixed(2)}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: "1.05rem", fontWeight: "600", color: isCompliant ? "#22c55e" : "#ef4444" }}>
                          ₱{(item.currentPrice || 0).toFixed(2)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          gap: "4px",
                          color: item.priceChange > 0 ? "#ef4444" : item.priceChange < 0 ? "#22c55e" : "#64748b",
                          fontWeight: "600"
                        }}>
                          {item.priceChange > 0 && <TrendingUp size={16} />}
                          {item.priceChange < 0 && <TrendingDown size={16} />}
                          <span>
                            {item.priceChange > 0 ? "+" : ""}
                            ₱{(item.priceChange || 0).toFixed(2)}
                          </span>
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ 
                          color: item.priceChange > 0 ? "#ef4444" : item.priceChange < 0 ? "#22c55e" : "#64748b",
                          fontWeight: "600"
                        }}>
                          {item.percentChange > 0 ? "+" : ""}
                          {(item.percentChange || 0).toFixed(1)}%
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={getBadgeStyle(isCompliant ? "compliant" : "non-compliant")}>
                          {isCompliant ? "● Compliant" : "● Non-Compliant"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid #e2e8f0" }}>
            <button
              style={{ ...paginationButtonStyle, opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={18} />
            </button>
            <span style={{ fontSize: "0.9rem", color: "#64748b" }}>
              Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <button
              style={{ ...paginationButtonStyle, opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
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
  background: status === "compliant" ? "#dcfce7" : "#fee2e2",
  color: status === "compliant" ? "#16a34a" : "#dc2626"
});

const paginationButtonStyle = {
  background: "white",
  border: "1px solid #cbd5e1",
  borderRadius: "6px",
  padding: "8px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#64748b",
  transition: "all 0.2s ease"
};
