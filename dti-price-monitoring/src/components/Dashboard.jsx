import React, { useMemo, useState, useRef } from "react";
import { ShoppingCart, Package, ListChecks, TrendingUp, ArrowUp, ArrowDown, Filter, Calendar, Download } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "../assets/Dashboard.css";

export default function Dashboard({ prices }) {
  const [selectedCommodity, setSelectedCommodity] = useState("all");
  const [selectedStore, setSelectedStore] = useState("all");
  const [dateRange, setDateRange] = useState("90d");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [selectedYear, setSelectedYear] = useState("all");
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
    if (selectedMonth !== "all") {
      const monthName = new Date(2000, Number(selectedMonth), 1).toLocaleString("default", { month: "long" });
      parts.push(`Month: ${monthName}`);
    }
    if (selectedYear !== "all") parts.push(`Year: ${selectedYear}`);
    if (selectedMonth === "all" && selectedYear === "all") {
      if (dateRange === "30d") parts.push("Range: Last 30d");
      else if (dateRange === "90d") parts.push("Range: Last 90d");
      else parts.push("Range: All time");
    }
    return parts.length ? parts.join(" • ") : "All data";
  }, [selectedCommodity, selectedStore, selectedMonth, selectedYear, dateRange]);

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
      if (!p || !p.timestamp) return;
      const d = new Date(p.timestamp);
      if (Number.isNaN(d.getTime())) return;
      monthSet.add(d.getMonth());
      yearSet.add(d.getFullYear());
    });
    return {
      availableMonths: Array.from(monthSet).sort((a, b) => a - b),
      availableYears: Array.from(yearSet).sort((a, b) => b - a)
    };
  }, [pricesArray]);

  const dateThreshold = useMemo(() => {
    if (selectedMonth !== "all" || selectedYear !== "all") return null;
    const now = new Date();
    if (dateRange === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (dateRange === "90d") return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return null;
  }, [dateRange, selectedMonth, selectedYear]);

  const filteredPrices = useMemo(() => {
    return pricesArray.filter((p) => {
      if (!p) return false;
      if (selectedCommodity !== "all" && p.commodity !== selectedCommodity) return false;
      if (selectedStore !== "all" && p.store !== selectedStore) return false;
      const ts = p.timestamp ? new Date(p.timestamp) : null;
      if (selectedYear !== "all") {
        if (!ts || ts.getFullYear() !== Number(selectedYear)) return false;
      }
      if (selectedMonth !== "all") {
        if (!ts || ts.getMonth() !== Number(selectedMonth)) return false;
      }
      if (dateThreshold) {
        if (!ts || ts < dateThreshold) return false;
      }
      return true;
    });
  }, [pricesArray, selectedCommodity, selectedStore, dateThreshold, selectedMonth, selectedYear]);

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
      if (!p || !p.timestamp) return;
      const day = new Date(p.timestamp).toISOString().split("T")[0];
      if (!buckets[day]) buckets[day] = { date: day, total: 0, count: 0 };
      buckets[day].total += Number(p.price) || 0;
      buckets[day].count += 1;
    });
    return Object.values(buckets)
      .map((b) => ({ date: b.date, avgPrice: b.count ? b.total / b.count : 0 }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [filteredPrices]);

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

  return (
    <div className="dashboard-wrapper">
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

      {/* FILTERED INSIGHTS */}
      <div className="dashboard-container filtered-insights">
        <h3 className="dashboard-section-title">
          Filtered Insights
        </h3>
        <div className="filters-wrapper">
          <div className="filter-group">
            <div className="filter-label">Commodity</div>
            <div className="filter-select-wrapper">
              <Filter size={16} color="#94a3b8" />
              <select
                value={selectedCommodity}
                onChange={(e) => setSelectedCommodity(e.target.value)}
                className="filter-select"
              >
                <option value="all">All commodities</option>
                {uniqueCommodities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-label">Store</div>
            <div className="filter-select-wrapper">
              <Filter size={16} color="#94a3b8" />
              <select
                value={selectedStore}
                onChange={(e) => setSelectedStore(e.target.value)}
                className="filter-select"
              >
                <option value="all">All stores</option>
                {uniqueStores.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-label">Month</div>
            <div className="filter-select-wrapper">
              <Calendar size={16} color="#94a3b8" />
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="filter-select"
              >
                <option value="all">All months</option>
                {availableMonths.map((m) => (
                  <option key={m} value={m}>{new Date(2000, m, 1).toLocaleString("default", { month: "long" })}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-group filter-year">
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

          <div className="filter-group">
            <div className="filter-label">Date Range</div>
            <div className="date-range-buttons">
              {["30d", "90d", "all"].map((range) => (
                <button
                  key={range}
                  onClick={() => setDateRange(range)}
                  className={`date-range-button ${dateRange === range ? 'active' : ''}`}
                >
                  <Calendar size={16} />
                  {range === "30d" && "Last 30d"}
                  {range === "90d" && "Last 90d"}
                  {range === "all" && "All time"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="filter-tag">Filtered: {filterLabel}</div>

        <div className="charts-grid-2col">
          <div className="chart-container">
            <div className="chart-header">
              <div className="chart-title">Average Price Timeline</div>
              <button onClick={() => downloadChart(timelineChartRef, "PriceTimeline")} className="chart-download-button" title="Download chart">
                <Download size={14} />
              </button>
            </div>
            <div ref={timelineChartRef}>
              {timeSeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: "0.8rem" }} />
                  <YAxis stroke="#64748b" style={{ fontSize: "0.85rem" }} label={{ value: "Avg Price (₱)", angle: -90, position: "insideLeft" }} />
                  <Tooltip formatter={(value) => `₱${value.toFixed ? value.toFixed(2) : value}`} contentStyle={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                  <Line type="monotone" dataKey="avgPrice" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-message">No trend data available</div>
            )}
            </div>
          </div>

          <div className="chart-container">
            <div className="chart-header">
              <div className="chart-title">Compliance Snapshot</div>
              <button onClick={() => downloadChart(complianceChartRef, "ComplianceSnapshot")} className="chart-download-button" title="Download chart">
                <Download size={14} />
              </button>
            </div>
            <div ref={complianceChartRef}>
              {complianceBreakdown.some((c) => c.value > 0) ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={complianceBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {complianceBreakdown.map((entry, index) => (
                      <Cell key={entry.name} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [`${value} items`, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-message">No compliance data yet</div>
            )}
            </div>
          </div>
        </div>

        <div className="charts-grid-2col-margin">
          <div className="chart-container">
            <div className="chart-header">
              <div className="chart-title">SRP vs Current (Top 10)</div>
              <button onClick={() => downloadChart(srpChartRef, "SRPvsCurrent")} className="chart-download-button" title="Download chart">
                <Download size={14} />
              </button>
            </div>
            <div ref={srpChartRef}>
              {srpVsCurrentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={srpVsCurrentData} margin={{ bottom: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="commodity" stroke="#64748b" style={{ fontSize: "0.75rem" }} angle={-35} textAnchor="end" height={60} />
                  <YAxis stroke="#64748b" style={{ fontSize: "0.85rem" }} label={{ value: "Price (₱)", angle: -90, position: "insideLeft" }} />
                  <Tooltip formatter={(value) => `₱${value}`} />
                  <Legend />
                  <Bar dataKey="current" name="Current" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="srp" name="SRP" fill="#94a3b8" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="no-data-message">No SRP comparison data</div>
            )}
            </div>
          </div>

          <div className="chart-container">
            <div className="top-movers-container">Top Movers</div>
            {topMovers.topUp.length === 0 && topMovers.topDown.length === 0 ? (
              <div className="no-data-small">No change detected</div>
            ) : (
              <div className="top-movers-grid">
                <div>
                  <div className="top-movers-column-title top-movers-upticks">Largest Upticks</div>
                  {topMovers.topUp.map((item) => (
                    <div key={item.key} className="extreme-item up">
                      <div className="extreme-item-title">{item.key.replace("_", " • ")}</div>
                      <div className="extreme-item-value">+₱{item.change.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="top-movers-column-title top-movers-drops">Largest Drops</div>
                  {topMovers.topDown.map((item) => (
                    <div key={item.key} className="extreme-item down">
                      <div className="extreme-item-title">{item.key.replace("_", " • ")}</div>
                      <div className="extreme-item-value">₱{item.change.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PREVAILING PRICES */}
      <div className="dashboard-container prevailing">
        <div className="chart-header" style={{ marginBottom: "12px" }}>
          <div>
            <h3 className="dashboard-section-title">
              Prevailing Prices for the Month
            </h3>
          </div>
          <button onClick={() => downloadChart(prevailingChartRef, "PrevailingPrices")} className="chart-download-button" title="Download chart">
            <Download size={14} />
          </button>
        </div>
        <div className="filter-tag">Filtered: {filterLabel}</div>
        <div ref={prevailingChartRef}>
          <div className="prevailing-cards-grid">
            {prevailingPrices.length > 0 ? (
              prevailingPrices.map((item, idx) => (
                <div key={idx} className="prevailing-card">
                  <div className="prevailing-card-content">
                    <div className="commodity-info">
                      <div className="commodity-label">
                        {item.commodity}
                      </div>
                      <div className="commodity-price">
                        ₱{item.prevailing}
                      </div>
                    </div>
                    <div className="commodity-meta">
                      <div>SRP: ₱{item.srp}</div>
                      <div className="commodity-meta-item">{item.count} stores</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ gridColumn: "1/-1" }} className="no-data-small">
                No data available yet
              </div>
            )}
          </div>
        </div>

        {/* Prevailing Prices Comparison Chart */}
        {prevailingPrices.length > 0 && (
          <div className="comparison-chart-wrapper">
            <h4 className="dashboard-subsection-title">
              Prevailing vs SRP Comparison
            </h4>
            <div className="comparison-chart-button">
              <button onClick={() => downloadChart(prevailingChartRef, "PrevailingComparison")} className="chart-download-button" title="Download chart">
                <Download size={14} />
              </button>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={prevailingPrices}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="commodity" 
                  stroke="#64748b"
                  style={{ fontSize: "0.85rem" }}
                />
                <YAxis 
                  stroke="#64748b"
                  style={{ fontSize: "0.85rem" }}
                  label={{ value: "Price (₱)", angle: -90, position: "insideLeft" }}
                />
                <Tooltip 
                  formatter={(value) => `₱${value}`}
                  contentStyle={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}
                />
                <Legend />
                <Bar dataKey="prevailing" fill="#38bdf8" radius={[8, 8, 0, 0]} name="Prevailing Price" />
                <Bar dataKey="srp" fill="#94a3b8" radius={[8, 8, 0, 0]} name="SRP" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* PRICE TREND VISUALIZATION */}
      <div className="dashboard-container trends">
        <div className="chart-header" style={{ marginBottom: "12px" }}>
          <div>
            <h3 className="dashboard-section-title">
              Price Trends by Location
            </h3>
          </div>
          <button onClick={() => downloadChart(municipalityChartRef, "PriceTrends")} className="chart-download-button" title="Download chart">
            <Download size={14} />
          </button>
        </div>
        <div className="filter-tag">Filtered: {filterLabel}</div>
        <div ref={municipalityChartRef}>
          {municipalityTrends.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={municipalityTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis 
                dataKey="municipality" 
                stroke="#64748b"
                style={{ fontSize: "0.85rem" }}
              />
              <YAxis 
                stroke="#64748b"
                style={{ fontSize: "0.85rem" }}
                label={{ value: "Avg Price (₱)", angle: -90, position: "insideLeft" }}
              />
              <Tooltip 
                formatter={(value) => `₱${value}`}
                contentStyle={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="avgPrice" 
                stroke="#0f172a" 
                strokeWidth={2}
                dot={{ fill: "#38bdf8", r: 5 }}
                activeDot={{ r: 7 }}
                name="Average Price"
              />
            </LineChart>
          </ResponsiveContainer>
          ) : (
          <div className="no-data-message">
            No data available for visualization
          </div>
          )}
        </div>
      </div>

      {/* TOP 5 PRICE EXTREMES */}
      <div className="dashboard-container extremes">
        <h3 className="dashboard-section-title" style={{ marginBottom: "16px" }}>
          Top 5 Price Extremes
        </h3>
        <div className="filter-tag">Filtered: {filterLabel}</div>
        <div className="charts-grid-equal">
          
          {/* Highest Prices Chart */}
          <div>
            <div className="price-extreme-header">
              <h4 className="price-extreme-title highest">
                <ArrowUp size={16} /> Highest Prices
              </h4>
              <button onClick={() => downloadChart(highestChartRef, "HighestPrices")} className="chart-download-button" title="Download chart">
                <Download size={14} />
              </button>
            </div>
            <div ref={highestChartRef}>
              {highest.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={highest}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="commodity" 
                      stroke="#64748b"
                      style={{ fontSize: "0.75rem" }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#64748b"
                      style={{ fontSize: "0.85rem" }}
                      label={{ value: "Price (₱)", angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip 
                      formatter={(value) => `₱${value}`}
                      contentStyle={{ background: "#fee2e2", border: "1px solid #dc2626", borderRadius: "8px" }}
                    />
                    <Bar dataKey="price" fill="#dc2626" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data-message">
                  No data available
                </div>
              )}
            </div>
          </div>

          {/* Lowest Prices Chart */}
          <div>
            <div className="price-extreme-header">
              <h4 className="price-extreme-title lowest">
                <ArrowDown size={16} /> Lowest Prices
              </h4>
              <button onClick={() => downloadChart(lowestChartRef, "LowestPrices")} className="chart-download-button" title="Download chart">
                <Download size={14} />
              </button>
            </div>
            <div ref={lowestChartRef}>
              {lowest.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={lowest}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="commodity" 
                    stroke="#64748b"
                    style={{ fontSize: "0.75rem" }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    stroke="#64748b"
                    style={{ fontSize: "0.85rem" }}
                    label={{ value: "Price (₱)", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip 
                    formatter={(value) => `₱${value}`}
                    contentStyle={{ background: "#dcfce7", border: "1px solid #16a34a", borderRadius: "8px" }}
                  />
                  <Bar dataKey="price" fill="#16a34a" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              ) : (
              <div className="no-data-message">
                No data available
              </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
