import React, { useMemo, useState, useRef, useEffect } from "react";
import { ShoppingCart, Package, ListChecks, TrendingUp, ArrowUp, ArrowDown, Filter, Calendar, Download } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "../assets/Dashboard.css";

export default function Dashboard({ prices: pricesProp }) {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCommodity, setSelectedCommodity] = useState("all");
  const [selectedStore, setSelectedStore] = useState("all");
  const [dateRange, setDateRange] = useState("90d");
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedYear, setSelectedYear] = useState("all");
  
  // Helper function to convert month names to numbers (0-11)
  const monthNameToNumber = (monthStr) => {
    if (!monthStr) return null;
    const monthUpper = String(monthStr).toUpperCase().trim();
    const monthMap = {
      'JANUARY': 0, 'FEBRUARY': 1, 'MARCH': 2, 'APRIL': 3,
      'MAY': 4, 'JUNE': 5, 'JULY': 6, 'AUGUST': 7,
      'SEPTEMBER': 8, 'OCTOBER': 9, 'NOVEMBER': 10, 'DECEMBER': 11,
      'FEBUARY': 1, // Handle common typo
      'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3,
      'JUN': 5, 'JUL': 6, 'AUG': 7, 'SEP': 8,
      'OCT': 9, 'NOV': 10, 'DEC': 11
    };
    
    // First try month name lookup
    if (monthMap.hasOwnProperty(monthUpper)) {
      return monthMap[monthUpper];
    }
    
    // If it's already a number, convert it
    const num = Number(monthStr);
    if (!Number.isNaN(num) && num >= 0 && num <= 12) {
      return num;
    }
    
    return null;
  };
  
  // Fetch prices from server on component mount
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('http://localhost:5000/api/prices');
        if (!response.ok) throw new Error('Failed to fetch prices');
        const data = await response.json();
        console.log('Fetched prices from server:', data);
        setPrices(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error fetching prices:', err);
        setError(err.message);
        // Fallback to prop data if available
        if (pricesProp) setPrices(Array.isArray(pricesProp) ? pricesProp : []);
      } finally {
        setLoading(false);
      }
    };
    fetchPrices();
  }, [pricesProp]);
  
  const pieColors = ["#22c55e", "#f97316"];
  const timelineChartRef = useRef(null);
  const complianceChartRef = useRef(null);
  const srpChartRef = useRef(null);
  const prevailingChartRef = useRef(null);
  const municipalityChartRef = useRef(null);
  const highestChartRef = useRef(null);
  const lowestChartRef = useRef(null);
  const filterLabel = useMemo(() => {
    const parts = [];
    if (selectedCommodity !== "all") parts.push(`Commodity: ${selectedCommodity}`);
    if (selectedStore !== "all") parts.push(`Store: ${selectedStore}`);
    if (selectedMonths && selectedMonths.length > 0) {
      const monthNames = selectedMonths.map(m => new Date(2000, m, 1).toLocaleString("default", { month: "short" })).join(", ");
      parts.push(`Months: ${monthNames}`);
    }
    if (selectedYear !== "all") parts.push(`Year: ${selectedYear}`);
    if ((!selectedMonths || selectedMonths.length === 0) && selectedYear === "all") {
      if (dateRange === "30d") parts.push("Range: Last 30d");
      else if (dateRange === "90d") parts.push("Range: Last 90d");
      else parts.push("Range: All time");
    }
    return parts.length ? parts.join(" • ") : "All data";
  }, [selectedCommodity, selectedStore, selectedMonths, selectedYear, dateRange]);

  const pricesArray = Array.isArray(prices) ? prices : [];

  const uniqueCommodities = useMemo(
    () => [...new Set(pricesArray.map((p) => p.commodity).filter(Boolean))],
    [pricesArray]
  );
  const uniqueStores = useMemo(
    () => [...new Set(pricesArray.map((p) => p.store).filter(Boolean))],
    [pricesArray]
  );

  const { availableMonths, availableYears } = useMemo(() => {
    const monthSet = new Set();
    const yearSet = new Set();
    pricesArray.forEach((p) => {
      if (!p) return;
      
      // Try to get month from month field (could be text or number)
      if (p.month) {
        const monthNum = monthNameToNumber(p.month);
        if (monthNum !== null) {
          monthSet.add(monthNum);
        }
      }
      
      // Try to get year from years field
      if (p.years) {
        const yearNum = Number(p.years);
        if (!Number.isNaN(yearNum) && yearNum > 1900) {
          yearSet.add(yearNum);
        }
      }
      
      // Fallback to timestamp if month/years not available
      if (!p.month && !p.years && p.timestamp) {
        const d = new Date(p.timestamp);
        if (!Number.isNaN(d.getTime())) {
          monthSet.add(d.getMonth());
          yearSet.add(d.getFullYear());
        }
      }
    });
    
    return {
      availableMonths: Array.from(monthSet).sort((a, b) => a - b),
      availableYears: Array.from(yearSet).sort((a, b) => b - a)
    };
  }, [pricesArray, monthNameToNumber]);

  const dateThreshold = useMemo(() => {
    if ((selectedMonths && selectedMonths.length > 0) || selectedYear !== "all") return null;
    const now = new Date();
    if (dateRange === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (dateRange === "90d") return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return null;
  }, [dateRange, selectedMonths, selectedYear]);

  const filteredPrices = useMemo(() => {
    const result = pricesArray.filter((p) => {
      if (!p) return false;
      if (selectedCommodity !== "all" && p.commodity !== selectedCommodity) return false;
      if (selectedStore !== "all" && p.store !== selectedStore) return false;
      
      if (selectedYear !== "all") {
        const yearNum = Number(p.years);
        if (Number.isNaN(yearNum) || yearNum !== Number(selectedYear)) return false;
      }
      
      if (selectedMonths && selectedMonths.length > 0) {
        let monthNum = monthNameToNumber(p.month);
        if (monthNum === null && p.timestamp) {
          const d = new Date(p.timestamp);
          if (!Number.isNaN(d.getTime())) monthNum = d.getMonth();
        }
        if (monthNum === null || !selectedMonths.includes(monthNum)) return false;
      }
      
      if (dateThreshold && p.timestamp) {
        const ts = new Date(p.timestamp);
        if (ts < dateThreshold) return false;
      }
      
      return true;
    });
    
    return result;
  }, [pricesArray, selectedCommodity, selectedStore, dateThreshold, selectedMonths, selectedYear, monthNameToNumber]);

  const totalEntries = filteredPrices.length;
  const uniqueCommoditiesCount = new Set(filteredPrices.map((p) => p.commodity)).size;
  const uniqueStoresCount = new Set(filteredPrices.map((p) => p.store)).size;
  
  const avgChange = filteredPrices.length > 0 
    ? (filteredPrices.reduce((acc, curr) => acc + (curr.price - (curr.prevPrice || curr.price)), 0) / filteredPrices.length).toFixed(2)
    : 0;

  const calculatePrevailing = (source) => {
    const grouped = source.reduce((acc, item) => {
      if (!item || !item.commodity) return acc;
      if (!acc[item.commodity]) acc[item.commodity] = [];
      acc[item.commodity].push(item);
      return acc;
    }, {});

    return Object.keys(grouped)
      .map(name => {
        const items = grouped[name];
        const pList = items.map(i => Number(i.price) || 0).filter((v) => !Number.isNaN(v));
        const srp = items.find(i => Number(i.srp) > 0)?.srp || 0;
        if (pList.length === 0) return null;

        const freq = {};
        let maxFreq = 0;
        pList.forEach(p => { 
          freq[p] = (freq[p] || 0) + 1; 
          if(freq[p] > maxFreq) maxFreq = freq[p]; 
        });
        const modes = Object.keys(freq).filter(p => freq[p] === maxFreq);

        let prevailing;
        if (maxFreq > 1 && modes.length === 1) {
          prevailing = Number(modes[0]);
        } else {
          const validUnderSRP = srp ? pList.filter(p => p <= srp) : [];
          prevailing = validUnderSRP.length > 0 ? Math.max(...validUnderSRP) : Math.max(...pList);
        }
        
        const avgPrice = (pList.reduce((a, b) => a + b, 0) / pList.length).toFixed(2);
        return { commodity: name, prevailing, srp, count: items.length, avgPrice };
      })
      .filter(Boolean)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  };

  const getTop5HighLow = () => {
    const sorted = [...filteredPrices].sort((a, b) => (b.price || 0) - (a.price || 0));
    return {
      highest: sorted.slice(0, 5),
      lowest: sorted.slice(-5).reverse()
    };
  };

  const getPriceTrendByMunicipality = () => {
    const grouped = filteredPrices.reduce((acc, item) => {
      const key = item.municipality || "Unspecified";
      if (!acc[key]) acc[key] = [];
      acc[key].push(Number(item.price) || 0);
      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([municipality, priceList]) => ({
        municipality,
        avgPrice: (priceList.reduce((a, b) => a + b, 0) / priceList.length).toFixed(2),
        count: priceList.length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  };

  const prevailingPrices = calculatePrevailing(filteredPrices);
  const { highest, lowest } = getTop5HighLow();
  const municipalityTrends = getPriceTrendByMunicipality();

  const latestPerCommodity = useMemo(() => {
    const map = {};
    filteredPrices.forEach((p) => {
      if (!p || !p.commodity) return;
      const ts = p.timestamp ? new Date(p.timestamp).getTime() : 0;
      const current = map[p.commodity];
      if (!current || ts >= current.ts) {
        map[p.commodity] = {
          commodity: p.commodity,
          price: Number(p.price) || 0,
          srp: Number(p.srp) || 0,
          ts,
          store: p.store || "Unknown"
        };
      }
    });
    return Object.values(map);
  }, [filteredPrices]);

  const complianceBreakdown = useMemo(() => {
    let compliant = 0;
    let nonCompliant = 0;
    latestPerCommodity.forEach((item) => {
      const { price, srp } = item;
      const ok = srp > 0 ? price <= srp : true;
      if (ok) compliant += 1; else nonCompliant += 1;
    });
    return [
      { name: "Compliant", value: compliant },
      { name: "Non-Compliant", value: nonCompliant }
    ];
  }, [latestPerCommodity]);

  const srpVsCurrentData = useMemo(() => {
    return latestPerCommodity.map((item) => ({
      commodity: item.commodity,
      current: item.price,
      srp: item.srp || 0,
    })).slice(0, 10);
  }, [latestPerCommodity]);

  const timeSeriesData = useMemo(() => {
    const buckets = {};
    filteredPrices.forEach((p) => {
      if (!p) return;
      
      // Use month/years if available (imported data), otherwise use timestamp
      let dateKey = null;
      if (p.month && p.years) {
        const monthNum = monthNameToNumber(p.month);
        const yearNum = Number(p.years);
        if (monthNum !== null && !Number.isNaN(yearNum)) {
          // Create YYYY-MM format (add 1 since months are 0-11)
          dateKey = `${yearNum}-${String(monthNum + 1).padStart(2, '0')}`;
        }
      } else if (p.timestamp) {
        const day = new Date(p.timestamp).toISOString().split("T")[0];
        dateKey = day;
      }
      
      if (!dateKey) return;
      
      if (!buckets[dateKey]) buckets[dateKey] = { date: dateKey, total: 0, count: 0 };
      buckets[dateKey].total += Number(p.price) || 0;
      buckets[dateKey].count += 1;
    });
    
    const result = Object.values(buckets)
      .map((b) => ({ date: b.date, avgPrice: b.count ? b.total / b.count : 0 }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return result;
  }, [filteredPrices, monthNameToNumber]);

  // Prevailing price by month
  const prevailingByMonth = useMemo(() => {
    const monthlyData = {};
    
    filteredPrices.forEach((p) => {
      if (!p || !p.commodity) return;
      
      let monthKey = null;
      let monthName = null;
      
      if (p.month !== undefined && p.years) {
        const monthNum = monthNameToNumber(p.month);
        const yearNum = Number(p.years);
        if (monthNum !== null && !Number.isNaN(yearNum)) {
          monthKey = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
          monthName = new Date(yearNum, monthNum, 1).toLocaleString('default', { month: 'short', year: 'numeric' });
        }
      } else if (p.timestamp) {
        const d = new Date(p.timestamp);
        const monthNum = d.getMonth();
        const yearNum = d.getFullYear();
        monthKey = `${yearNum}-${String(monthNum).padStart(2, '0')}`;
        monthName = d.toLocaleString('default', { month: 'short', year: 'numeric' });
      }
      
      if (!monthKey || !monthName) return;
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { month: monthName, prices: [], sortKey: monthKey };
      }
      monthlyData[monthKey].prices.push(Number(p.price) || 0);
    });
    
    // Calculate prevailing price for each month
    const result = Object.values(monthlyData)
      .map((data) => {
        const prices = data.prices;
        const freq = {};
        let maxFreq = 0;
        
        prices.forEach(p => {
          freq[p] = (freq[p] || 0) + 1;
          if (freq[p] > maxFreq) maxFreq = freq[p];
        });
        
        const modes = Object.keys(freq).filter(p => freq[p] === maxFreq);
        let prevailing;
        
        if (maxFreq > 1 && modes.length === 1) {
          prevailing = Number(modes[0]);
        } else {
          prevailing = Math.max(...prices);
        }
        
        return {
          month: data.month,
          prevailing: prevailing,
          sortKey: data.sortKey
        };
      })
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    
    return result;
  }, [filteredPrices, monthNameToNumber]);

  // Price range per commodity per month for selected year
  const priceRangeData = useMemo(() => {
    if (selectedYear === "all") {
      return [];
    }
    
    const commodityMonthData = {};
    
    filteredPrices.forEach((p) => {
      if (!p || !p.commodity) return;
      
      const yearNum = Number(p.years);
      if (Number.isNaN(yearNum) || yearNum !== Number(selectedYear)) return;
      
      const monthNum = monthNameToNumber(p.month);
      if (monthNum === null) return;
      
      const monthName = new Date(2000, monthNum, 1).toLocaleString('default', { month: 'short' });
      const key = `${p.commodity}-${monthNum}`;
      
      if (!commodityMonthData[key]) {
        commodityMonthData[key] = {
          commodity: p.commodity,
          month: monthName,
          monthNum: monthNum,
          prices: []
        };
      }
      
      commodityMonthData[key].prices.push(Number(p.price) || 0);
    });
    
    // Calculate min and max for each commodity-month combination
    const result = Object.values(commodityMonthData)
      .map((data) => ({
        commodity: data.commodity,
        month: data.month,
        monthNum: data.monthNum,
        minPrice: Math.min(...data.prices),
        maxPrice: Math.max(...data.prices),
        avgPrice: (data.prices.reduce((a, b) => a + b, 0) / data.prices.length).toFixed(2)
      }))
      .sort((a, b) => {
        const commodityCompare = a.commodity.localeCompare(b.commodity);
        if (commodityCompare !== 0) return commodityCompare;
        return a.monthNum - b.monthNum;
      });
    
    return result;
  }, [filteredPrices, selectedYear, monthNameToNumber]);

  const topMovers = useMemo(() => {
    const grouped = {};
    filteredPrices.forEach((p) => {
      if (!p || !p.commodity || !p.store) return;
      const key = `${p.commodity}_${p.store}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ price: Number(p.price) || 0, ts: p.timestamp ? new Date(p.timestamp).getTime() : 0 });
    });

    const deltas = Object.entries(grouped).map(([key, arr]) => {
      const sorted = arr.sort((a, b) => b.ts - a.ts);
      const latest = sorted[0]?.price ?? 0;
      const prev = sorted[1]?.price ?? latest;
      return {
        key,
        change: latest - prev,
        latest,
        prev,
      };
    });

    const topUp = [...deltas].sort((a, b) => b.change - a.change).slice(0, 5);
    const topDown = [...deltas].sort((a, b) => a.change - b.change).slice(0, 5);
    return { topUp, topDown };
  }, [filteredPrices]);

  const downloadChart = async (ref, fileName) => {
    if (!ref?.current) return;
    try {
      const canvas = await html2canvas(ref.current, { backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `${fileName}_${new Date().toISOString().split("T")[0]}.png`;
      link.click();
    } catch (error) {
      console.error("Chart download error:", error);
    }
  };

  const downloadAllCharts = async () => {
    const chartEntries = [
      { ref: timelineChartRef, title: 'Prevailing Price Trend Over Time' },
      { ref: prevailingChartRef, title: 'Prevailing Price by Month' },
      { ref: srpChartRef, title: 'Price Range per Commodity per Month' },
      { ref: municipalityChartRef, title: 'Prevailing Price by Municipality' },
      { ref: complianceChartRef, title: 'Compliance Breakdown' },
      { ref: highestChartRef, title: 'Top 5 highest increasing items' },
      { ref: lowestChartRef, title: 'Top 5 lowest increasing items' }
    ];

    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const topMargin = 36;
    const titleHeight = 28; // space for title + subtitle
    const remarksHeight = 140; // reserve space for remarks under each chart
    let pageIndex = 0;

    for (const entry of chartEntries) {
      const ref = entry.ref;
      if (!ref?.current) continue;
      try {
        const canvas = await html2canvas(ref.current, { backgroundColor: '#ffffff', scale: 2 });
        const imgData = canvas.toDataURL('image/png');
        const imgProps = pdf.getImageProperties(imgData);

        // Compute available area for the image (leave room for title at top and remarks at bottom)
        const availableHeight = pageHeight - topMargin - titleHeight - remarksHeight - 20;
        let imgWidth = pageWidth - 40;
        let imgHeight = imgWidth * (imgProps.height / imgProps.width);
        if (imgHeight > availableHeight) {
          imgHeight = availableHeight;
          imgWidth = imgHeight * (imgProps.width / imgProps.height);
        }

        if (pageIndex > 0) pdf.addPage();

        // Title
        pdf.setFontSize(16);
        pdf.setTextColor(20, 20, 20);
        pdf.text(entry.title, 20, topMargin);

        // Subtitle (commodity)
        pdf.setFontSize(10);
        pdf.setTextColor(100, 116, 139);
        const commodityLabel = `Commodity: ${selectedCommodity === 'all' ? 'All' : selectedCommodity}`;
        pdf.text(commodityLabel, 20, topMargin + 16);

        // Draw image
        const imgY = topMargin + titleHeight;
        pdf.addImage(imgData, 'PNG', 20, imgY, imgWidth, imgHeight);

        // Draw Remarks section on same page below the chart
        const remarksY = imgY + imgHeight + 12;
        pdf.setFontSize(12);
        pdf.setTextColor(20, 20, 20);
        pdf.text('Remarks:', 20, remarksY);
        pdf.setLineWidth(0.5);
        let y = remarksY + 18;
        const lines = Math.floor((remarksHeight - 30) / 20);
        for (let i = 0; i < lines; i++) {
          pdf.line(20, y, pageWidth - 20, y);
          y += 20;
        }

        pageIndex += 1;
      } catch (err) {
        console.error('Error capturing chart for combined PDF', err);
      }
    }

    const fileName = `All_Charts_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  };

  return (
    <div className="dashboard-wrapper">
      {loading && <div style={{ textAlign: "center", padding: "40px", fontSize: "1.1rem", color: "#64748b" }}>Loading data...</div>}
      {error && <div style={{ textAlign: "center", padding: "40px", fontSize: "1.1rem", color: "#ef4444" }}>Error: {error}</div>}
      {!loading && prices.length === 0 && <div style={{ textAlign: "center", padding: "40px", fontSize: "1.1rem", color: "#94a3b8" }}>No data available. Please ensure the server is running.</div>}
      
      {!loading && prices.length > 0 && (
        <>
      {/* QUICK STATS */}
      <div className="dashboard-container">
        <div className="dashboard-section-header">
          <h2>
            Market Situationer Overview
          </h2>
          <p>
            Summary of price and supply monitoring activities for the current period.
          </p>
        </div>


        <div className="stat-cards-grid">
          
          {/* Total Entries Card */}
          <div className="stat-card blue">
            <div className="icon-wrapper blue">
              <ListChecks size={24} color="#2563eb" />
            </div>
            <div>
              <div className="stat-value">{totalEntries}</div>
              <div className="stat-label">Total Records</div>
            </div>
          </div>

          {/* Commodities Card */}
          <div className="stat-card purple">
            <div className="icon-wrapper purple">
              <Package size={24} color="#9333ea" />
            </div>
            <div>
              <div className="stat-value">{uniqueCommoditiesCount}</div>
              <div className="stat-label">Commodities Monitored</div>
            </div>
          </div>

          {/* Stores Card */}
          <div className="stat-card green">
            <div className="icon-wrapper green">
              <ShoppingCart size={24} color="#059669" />
            </div>
            <div>
              <div className="stat-value">{uniqueStoresCount}</div>
              <div className="stat-label">Active Establishments</div>
            </div>
          </div>

        </div>
      </div>

      {/* PRICE TREND FILTERS */}
      <div className="dashboard-container filtered-insights">
        <h3 className="dashboard-section-title">
          Prevailing Price Trend by Product
        </h3>
        <div className="filters-wrapper">
          <div className="filter-group">
            <div className="filter-label">Product</div>
            <div className="filter-select-wrapper">
              <Filter size={16} color="#94a3b8" />
              <select
                value={selectedCommodity}
                onChange={(e) => setSelectedCommodity(e.target.value)}
                className="filter-select"
              >
                <option value="all">All products</option>
                {uniqueCommodities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-label">Year</div>
            <div className="filter-select-wrapper">
              <Calendar size={16} color="#94a3b8" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="filter-select"
              >
                <option value="all">All years</option>
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-group filter-year">
            <div className="filter-label">Months</div>
            <div className="filter-select-wrapper" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {availableMonths.map((m) => (
                    <label key={m} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.9rem" }}>
                      <input
                        type="checkbox"
                        checked={selectedMonths.includes(m)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedMonths(prev => Array.from(new Set([...(prev||[]), m])));
                          else setSelectedMonths(prev => (prev||[]).filter(x => x !== m));
                        }}
                      />
                      {new Date(2000, m, 1).toLocaleString("default", { month: "short" })}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="filter-tag">Filtered: {filterLabel}</div>

        <div className="chart-container" style={{ marginTop: "24px" }}>
          <div className="chart-header">
            <div className="chart-title">Prevailing Price Trend Over Time</div>
            <div style={{ fontSize: "0.9rem", color: "#64748b", marginTop: 6 }}>
              Commodity: {selectedCommodity === 'all' ? 'All' : selectedCommodity}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => downloadChart(timelineChartRef, "PrevailingPriceTrend")} className="chart-download-button" title="Download chart">
                <Download size={14} />
              </button>
              <button onClick={downloadAllCharts} className="chart-download-button" title="Download all charts">
                <Download size={14} /> All
              </button>
            </div>
          </div>
          <div ref={timelineChartRef}>
            {timeSeriesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={timeSeriesData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: "0.85rem" }} />
                <YAxis stroke="#64748b" style={{ fontSize: "0.85rem" }} label={{ value: "Prevailing Price (Php)", angle: -90, position: "insideLeft" }} />
                <Tooltip formatter={(value) => `Php ${value.toFixed ? value.toFixed(2) : value}`} contentStyle={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                <Legend />
                <Line type="monotone" dataKey="avgPrice" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Prevailing Price" />
              </LineChart>
            </ResponsiveContainer>
            ) : (
            <div className="no-data-message">No trend data available. Select a product or adjust filters.</div>
            )}
          </div>
        </div>

        {/* TOP MOVERS: Highest Increases and Largest Decreases */}
        <div className="chart-container" style={{ marginTop: "24px" }}>
          <div className="chart-header">
            <div className="chart-title"></div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => downloadChart(highestChartRef, "TopIncreases")} className="chart-download-button" title="Download increases chart">
                <Download size={14} />
              </button>
              <button onClick={() => downloadChart(lowestChartRef, "TopDecreases")} className="chart-download-button" title="Download decreases chart">
                <Download size={14} />
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
            <div style={{ flex: 1 }} ref={highestChartRef}>
              <div style={{ marginBottom: 8, fontSize: "0.95rem", fontWeight: 600 }}>Top 5 highest increasing items</div>
                <div style={{ fontSize: "0.9rem", color: "#64748b", marginTop: 6 }}>
                  Commodity: {selectedCommodity === 'all' ? 'All' : selectedCommodity}
                </div>
              {topMovers.topUp.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topMovers.topUp.map(item => ({ name: item.key.replace(/_/g, " • "), change: item.change }))} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: "0.85rem" }} />
                    <YAxis stroke="#64748b" style={{ fontSize: "0.85rem" }} />
                    <Tooltip formatter={(value) => `Php ${Number(value).toFixed(2)}`} contentStyle={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                    <Bar dataKey="change" fill="#16a34a" name="Increase" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data-message">No increase data available.</div>
              )}
            </div>

            <div style={{ flex: 1 }} ref={lowestChartRef}>
              <div style={{ marginBottom: 8, fontSize: "0.95rem", fontWeight: 600 }}>Top 5 lowest increasing items</div>
              {topMovers.topDown.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topMovers.topDown.map(item => ({ name: item.key.replace(/_/g, " • "), change: item.change }))} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: "0.85rem" }} />
                    <YAxis stroke="#64748b" style={{ fontSize: "0.85rem" }} />
                    <Tooltip formatter={(value) => `Php ${Number(value).toFixed(2)}`} contentStyle={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                    <Bar dataKey="change" fill="#ef4444" name="Decrease" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data-message">No decrease data available.</div>
              )}
            </div>
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
}
