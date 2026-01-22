import React, { useState, useMemo, useRef } from "react";
import { TrendingUp, TrendingDown, Search, X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function ComparativeAnalysis({ prices, prevailingReport = [] }) {
  const [selectedCommodity, setSelectedCommodity] = useState("all");
  const [selectedStore, setSelectedStore] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;
  const tableRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Handle null or undefined prices
  const pricesArray = Array.isArray(prices) ? prices : [];

  // Get unique commodities and stores for filters
  const uniqueCommodities = [...new Set(pricesArray.map(p => p.commodity).filter(Boolean))];
  const uniqueStores = [...new Set(pricesArray.map(p => p.store).filter(Boolean))];

  // SRP lookup: take latest non-zero SRP per commodity; fallback to prevailingReport
  const srpLookup = {};
  const prevailingLookup = {};

  // Populate from prevailingReport first (baseline)
  prevailingReport.forEach(r => {
    if (r.commodity && r.srp) {
      srpLookup[r.commodity] = { value: Number(r.srp) || 0, ts: 0 };
    }
    if (r.commodity && r.prevailing) {
      prevailingLookup[r.commodity] = Number(r.prevailing) || 0;
    }
  });

  // Override with latest SRP from prices
  pricesArray.forEach(p => {
    if (!p || !p.commodity) return;
    const srpNum = Number(p.srp);
    if (!Number.isNaN(srpNum) && srpNum > 0) {
      const ts = p.timestamp ? new Date(p.timestamp).getTime() : 0;
      const current = srpLookup[p.commodity];
      if (!current || ts >= current.ts) {
        srpLookup[p.commodity] = { value: srpNum, ts };
      }
    }
  });

  // Get combined data
  const getCombinedData = () => {
    try {
      // Group by commodity and store
      const grouped = {};
      
      pricesArray.forEach(item => {
        if (!item || !item.commodity) return;
        
        const key = `${item.commodity}_${item.store || "Unknown"}`;
        if (!grouped[key]) {
          grouped[key] = {
            commodity: item.commodity,
            store: item.store || "Unknown",
            size: item.size || "",
            prices: []
          };
        }
        grouped[key].prices.push({
          price: Number(item.price) || 0,
          srp: Number(item.srp) || 0,
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
        
        const srpEntry = srpLookup[group.commodity];
        const srp = srpEntry?.value || 0;

        const pickHighestLatest = (arr) => {
          if (!arr || arr.length === 0) return 0;
          return arr.reduce((best, curr) => {
            if (!best) return curr;
            if (curr.price > best.price) return curr;
            if (curr.price === best.price && curr.timestamp > best.timestamp) return curr;
            return best;
          }, null).price || 0;
        };

        const withSrp = group.prices.filter(r => r.srp > 0 && r.price <= r.srp);
        const noSrp = group.prices.filter(r => !r.srp || Number.isNaN(r.srp) || r.srp === 0);
        const prevailingPrice = withSrp.length > 0 ? pickHighestLatest(withSrp) : pickHighestLatest(noSrp);

        // Compliant if: price is within ±10% of SRP
        // Non-compliant if: price >= SRP * 1.10 OR price <= SRP * 0.90 (outside ±10% threshold)
        const isCompliant = srp > 0 ? (currentPrice < srp * 1.10 && currentPrice > srp * 0.90) : true;

        return {
          commodity: group.commodity,
          store: group.store,
          size: group.size,
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
    } catch (error) {
      console.error("Error in getCombinedData:", error);
      return [];
    }
  };

  const filteredData = useMemo(() => getCombinedData(), [pricesArray, selectedCommodity, selectedStore, searchTerm, srpLookup, prevailingLookup]);

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
  const complianceRate = totalRecords > 0 ? ((compliantCount / totalRecords) * 100).toFixed(1) : 0;
  const avgPriceChangeAbs = totalRecords > 0
    ? (filteredData.reduce((acc, curr) => acc + (curr.priceChange || 0), 0) / totalRecords).toFixed(2)
    : "0.00";

  const [topIncrease] = [...filteredData].sort((a, b) => (b.priceChange || 0) - (a.priceChange || 0));
  const [topDecrease] = [...filteredData].sort((a, b) => (a.priceChange || 0) - (b.priceChange || 0));
  const topNonCompliant = [...filteredData]
    .filter((d) => !d.isCompliant)
    .sort((a, b) => {
      const overA = a.srp ? (a.currentPrice || 0) - a.srp : 0;
      const overB = b.srp ? (b.currentPrice || 0) - b.srp : 0;
      return overB - overA;
    })[0];
  
  // Format the average price change sign correctly
  const avgChangeSign = parseFloat(avgPriceChangeAbs) > 0 ? "+" : parseFloat(avgPriceChangeAbs) < 0 ? "-" : "";
  const avgChangeValue = Math.abs(parseFloat(avgPriceChangeAbs)).toFixed(2);
  
  const summaryNarrative = `Overall compliance is ${complianceRate}%. Average price change is ${avgChangeSign}₱${avgChangeValue}. ` +
    `${topIncrease ? `Largest uptick: ${topIncrease.commodity} at ${topIncrease.store} (+₱${(topIncrease.priceChange || 0).toFixed(2)}). ` : ""}` +
    `${topDecrease ? `Largest drop: ${topDecrease.commodity} at ${topDecrease.store} (-₱${Math.abs(topDecrease.priceChange || 0).toFixed(2)}). ` : ""}` +
    `${topNonCompliant ? `Top non-compliant: ${topNonCompliant.commodity} at ${topNonCompliant.store} (₱${(topNonCompliant.currentPrice || 0).toFixed(2)} vs SRP ₱${(topNonCompliant.srp || 0).toFixed(2)}).` : ""}`;

  // PDF Export Functions
  const generatePDFReport = async () => {
    setIsExporting(true);
    try {
      const pdf = new jsPDF("l", "mm", "letter");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15;
      const marginLeft = 15;
      const marginRight = 15;
      const contentWidth = pageWidth - marginLeft - marginRight;

      // Set default font
      pdf.setFont("helvetica", "normal");

      // Title and Date
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      pdf.text("Comparative Price Analysis Report", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 10;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth / 2, yPosition, { align: "center" });
      yPosition += 12;

      // Narrative Summary - Use safe width to prevent cutoff
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Executive Summary", marginLeft, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setFont("helvetica", "normal");
      
      // Replace peso sign with PHP for better PDF compatibility
      const pdfNarrative = summaryNarrative.replace(/₱/g, "Php ");
      const narrativeLines = pdf.splitTextToSize(pdfNarrative, contentWidth);
      narrativeLines.forEach((line) => {
        pdf.text(line, marginLeft, yPosition);
        yPosition += 5;
      });
      yPosition += 7;

      // Summary Statistics
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Key Metrics", marginLeft, yPosition);
      yPosition += 7;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Total Records: ${totalRecords}`, marginLeft, yPosition);
      yPosition += 5;
      pdf.text(`Compliant: ${compliantCount}`, marginLeft, yPosition);
      yPosition += 5;
      pdf.text(`Non-Compliant: ${nonCompliantCount}`, marginLeft, yPosition);
      yPosition += 5;
      pdf.text(`Compliance Rate: ${complianceRate}%`, marginLeft, yPosition);
      yPosition += 12;

      // Table Header
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 15;
      }

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "bold");
      pdf.text("Detailed Analysis", marginLeft, yPosition);
      yPosition += 8;

      // Table Data
      const exportSource = filteredData.length > 0 ? filteredData : paginatedData;
      const tableData = exportSource.map(item => [
        item.commodity,
        item.size || "--",
        item.store,
        `₱${item.prevailingPrice?.toFixed(2) || "0.00"}`,
        `₱${typeof item.srp === "number" ? item.srp.toFixed(2) : (item.srp ? Number(item.srp).toFixed(2) : "--")}`,
        `₱${item.currentPrice?.toFixed(2) || "0.00"}`,
        `${item.priceChange > 0 ? "+" : ""}₱${item.priceChange?.toFixed(2) || "0.00"}`,
        `${item.percentChange > 0 ? "+" : ""}${item.percentChange?.toFixed(1) || "0.0"}%`,
        item.isCompliant ? "Compliant" : "Non-Compliant"
      ]);

      autoTable(pdf, {
        head: [["Commodity", "Size", "Store", "Prevailing Price", "SRP", "Current Price", "Change (₱)", "Change (%)", "Status"]],
        body: tableData,
        startY: yPosition,
        margin: { top: 10, right: 10, bottom: 10, left: 10 },
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didDrawPage: (data) => {
          const pageCount = pdf.getNumberOfPages();
          pdf.setFontSize(8);
          pdf.text(`Page ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: "center" });
        }
      });

      // Footer Note
      const finalY = pdf.lastAutoTable.finalY || yPosition;
      if (finalY < pageHeight - 20) {
        pdf.setFontSize(9);
        pdf.text("This report summarizes prevailing prices and compliance status across monitored establishments.", 15, finalY + 10);
      }

      pdf.save(`Comparative_Analysis_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Failed to generate PDF");
    } finally {
      setIsExporting(false);
    }
  };

  // Download as CSV
  const downloadAsCSV = () => {
    const headers = ["Commodity", "Size", "Store", "Prevailing Price", "SRP", "Current Price", "Price Change", "Change %", "Status"];
    const rows = paginatedData.map(item => [
      item.commodity,
      item.size || "--",
      item.store,
      item.prevailingPrice?.toFixed(2) || "0.00",
      typeof item.srp === "number" ? item.srp.toFixed(2) : (item.srp ? Number(item.srp).toFixed(2) : "--"),
      item.currentPrice?.toFixed(2) || "0.00",
      item.priceChange?.toFixed(2) || "0.00",
      item.percentChange?.toFixed(1) || "0.0",
      item.isCompliant ? "Compliant" : "Non-Compliant"
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Comparative_Analysis_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const previewRows = paginatedData.slice(0, 5);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Summary Cards - Organized */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ ...cardStyle, borderLeft: "4px solid #0f172a" }}>
          <span style={labelStyle}>Total Commodities</span>
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
          
          {/* Export Button */}
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              onClick={() => setShowReportModal(true)}
              disabled={paginatedData.length === 0}
              style={{
                ...exportButtonStyle,
                opacity: paginatedData.length === 0 ? 0.6 : 1,
                cursor: paginatedData.length === 0 ? "not-allowed" : "pointer"
              }}
            >
              <Download size={16} />
              Generate Report
            </button>
          </div>
          
          {/* Filters */}
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ borderLeft: "1px solid #e2e8f0", paddingLeft: "12px", marginLeft: "12px" }}>
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

        <div style={{ overflowX: "auto" }} ref={tableRef}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={thStyle}>COMMODITY</th>
                <th style={thStyle}>SIZE</th>
                <th style={thStyle}>STORE</th>
                <th style={thStyle}>PREVAILING PRICE</th>
                <th style={thStyle}>SRP</th>
                <th style={thStyle}>CURRENT PRICE</th>
                <th style={thStyle}>PRICE CHANGE</th>
                <th style={thStyle}>CHANGE %</th>
                <th style={thStyle}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
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
                        <div style={{ color: "#475569" }}>{item.size || "--"}</div>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ color: "#475569" }}>{item.store}</div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: "1rem", fontWeight: "600" }}>₱{(item.prevailingPrice || 0).toFixed(2)}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: "#64748b" }}>₱{typeof item.srp === 'number' ? item.srp.toFixed(2) : (item.srp ? Number(item.srp).toFixed(2) : "--")}</span>
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

      {/* Report Modal */}
      {showReportModal && (
        <div style={modalOverlayStyle} onClick={() => setShowReportModal(false)}>
          <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div>
                <h4 style={{ margin: 0, color: "#0f172a" }}>Report Preview</h4>
                <p style={{ margin: "4px 0 0 0", color: "#64748b", fontSize: "0.9rem" }}>Summary and sample rows before export</p>
              </div>
              <button onClick={() => setShowReportModal(false)} style={modalCloseButtonStyle}>✕</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "12px" }}>
              <div style={summaryChipStyle}>Total Records: {totalRecords}</div>
              <div style={summaryChipStyle}>Compliant: {compliantCount}</div>
              <div style={summaryChipStyle}>Non-Compliant: {nonCompliantCount}</div>
            </div>

            <div style={narrativeBoxStyle}>
              <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "4px" }}>Narrative Summary</div>
              <div style={{ color: "#475569", lineHeight: 1.4 }}>{summaryNarrative}</div>
            </div>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden", marginBottom: "16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                    <th style={modalThStyle}>Commodity</th>
                    <th style={modalThStyle}>Store</th>
                    <th style={modalThStyle}>Prevailing</th>
                    <th style={modalThStyle}>SRP</th>
                    <th style={modalThStyle}>Current</th>
                    <th style={modalThStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", padding: "16px", color: "#94a3b8" }}>No data to preview</td>
                    </tr>
                  ) : (
                    previewRows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={modalTdStyle}>{row.commodity}</td>
                        <td style={modalTdStyle}>{row.store}</td>
                        <td style={modalTdStyle}>₱{(row.prevailingPrice || 0).toFixed(2)}</td>
                        <td style={modalTdStyle}>₱{typeof row.srp === "number" ? row.srp.toFixed(2) : (row.srp ? Number(row.srp).toFixed(2) : "--")}</td>
                        <td style={modalTdStyle}>₱{(row.currentPrice || 0).toFixed(2)}</td>
                        <td style={modalTdStyle}>
                          <span style={getBadgeStyle(row.isCompliant ? "compliant" : "non-compliant")}>
                            {row.isCompliant ? "Compliant" : "Non-Compliant"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" }}>
              <div style={{ color: "#64748b", fontSize: "0.9rem" }}>Choose export format:</div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button
                  onClick={() => { generatePDFReport(); setShowReportModal(false); }}
                  disabled={isExporting || totalRecords === 0}
                  style={{
                    ...exportButtonStyle,
                    opacity: isExporting || totalRecords === 0 ? 0.6 : 1,
                    cursor: isExporting || totalRecords === 0 ? "not-allowed" : "pointer"
                  }}
                >
                  <Download size={16} /> PDF
                </button>
                <button
                  onClick={() => { downloadAsCSV(); setShowReportModal(false); }}
                  disabled={totalRecords === 0}
                  style={{
                    ...exportButtonStyle,
                    background: "#0f172a",
                    boxShadow: "0 2px 4px rgba(15, 23, 42, 0.2)",
                    opacity: totalRecords === 0 ? 0.6 : 1,
                    cursor: totalRecords === 0 ? "not-allowed" : "pointer"
                  }}
                >
                  <Download size={16} /> CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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

const exportButtonStyle = {
  background: "#2563eb",
  color: "white",
  border: "none",
  borderRadius: "8px",
  padding: "8px 14px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: "6px",
  fontSize: "0.9rem",
  fontWeight: "600",
  transition: "all 0.2s ease",
  boxShadow: "0 2px 4px rgba(37, 99, 235, 0.2)"
};

const modalOverlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(15,23,42,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "16px",
  zIndex: 2000
};

const modalContentStyle = {
  background: "white",
  borderRadius: "12px",
  padding: "16px",
  maxWidth: "900px",
  width: "100%",
  boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
  border: "1px solid #e2e8f0"
};

const modalCloseButtonStyle = {
  background: "#e2e8f0",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  width: "32px",
  height: "32px",
  fontWeight: "700",
  color: "#0f172a"
};

const summaryChipStyle = {
  padding: "10px 12px",
  borderRadius: "10px",
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  fontWeight: 700,
  color: "#0f172a"
};

const modalThStyle = {
  padding: "10px",
  fontSize: "0.85rem",
  color: "#475569",
  fontWeight: 700,
  borderBottom: "1px solid #e2e8f0"
};

const modalTdStyle = {
  padding: "10px",
  fontSize: "0.9rem",
  color: "#0f172a"
};

const narrativeBoxStyle = {
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
  borderRadius: "8px",
  padding: "12px 14px",
  marginBottom: "14px"
};
