import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";

// Simple slide-up animation for the modal
const animationStyles = `
  @keyframes slideUp {
    from { transform: translateY(12px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

const cardStyle = {
  background: "white",
  padding: "20px",
  borderRadius: "16px",
  boxShadow: "0 4px 8px rgba(15, 23, 42, 0.08)",
  border: "1px solid #e2e8f0"
};

const filterStyle = { display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginBottom: "12px" };

const selectStyle = {
  padding: "10px 12px",
  borderRadius: "10px",
  border: "1px solid #cbd5e1",
  fontSize: "14px",
  background: "white",
  minWidth: "160px",
  outline: "none"
};

// Calendar month ordering helper
const monthOrder = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];

const getMonthIndex = (month) => {
  const value = String(month || "").trim().toLowerCase();
  return monthOrder.findIndex(m => m.toLowerCase() === value);
};

const normalizeMonth = (month) => {
  if (!month) return "";
  const idx = getMonthIndex(month);
  if (idx >= 0) return monthOrder[idx].toUpperCase();
  return String(month).trim().toUpperCase();
};

export default function Monitoring({ prices = [], onSeeAnalysis = () => {}, hideStores = false }) {
  const pricesArray = Array.isArray(prices) ? prices : [];

  const [selectedYear, setSelectedYear] = useState("");
  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");

  // Price trend filters - separate commodity, brand, size
  const [selectedCommodity, setSelectedCommodity] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedTrendSizes, setSelectedTrendSizes] = useState(new Set());
  const [selectedStore, setSelectedStore] = useState("");
  const [showCommodityDropdown, setShowCommodityDropdown] = useState(false);

  // Legacy product search (for backward compatibility with range section)
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // Price range filters (commodity-only now)
  const [selectedProductRange, setSelectedProductRange] = useState("");
  const [productSearchRange, setProductSearchRange] = useState("");
  const [showProductDropdownRange, setShowProductDropdownRange] = useState(false);

  // Exception panels preview toggles
  const [showAllSRPStores, setShowAllSRPStores] = useState(false);
  const [showAllIncreaseStores, setShowAllIncreaseStores] = useState(false);
  
  // Track expanded stores (show all items per store)
  const [expandedSRPStores, setExpandedSRPStores] = useState(new Set());
  const [expandedIncreaseStores, setExpandedIncreaseStores] = useState(new Set());

  // Chart expand toggles
  const [isTrendExpanded, setIsTrendExpanded] = useState(false);

  // Commodity price list toggle (range section)
  const [showCommodityPrices, setShowCommodityPrices] = useState(false);

  // Exception modal states
  const [showExceptionModal, setShowExceptionModal] = useState(false);
  const [selectedExceptionItem, setSelectedExceptionItem] = useState(null);

  // Track hidden chart series (for size visibility toggle)
  const [hiddenSeries, setHiddenSeries] = useState(new Set());

  // Tab state for organizing sections
  const [activeTab, setActiveTab] = useState("trends");

  // Load filters from localStorage on mount
  useEffect(() => {
    const savedFilters = localStorage.getItem("monitoringFilters");
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        if (filters.selectedYear) setSelectedYear(filters.selectedYear);
        if (filters.fromMonth) setFromMonth(filters.fromMonth);
        if (filters.toMonth) setToMonth(filters.toMonth);
        if (filters.selectedCommodity) setSelectedCommodity(filters.selectedCommodity);
        if (filters.selectedBrand) setSelectedBrand(filters.selectedBrand);
        if (filters.selectedTrendSizes?.length > 0) setSelectedTrendSizes(new Set(filters.selectedTrendSizes));
        if (filters.selectedStore) setSelectedStore(filters.selectedStore);
        if (filters.selectedProduct) setSelectedProduct(filters.selectedProduct);
        if (filters.selectedSize) setSelectedSize(filters.selectedSize);
        if (filters.productSearch) setProductSearch(filters.productSearch);
        if (filters.selectedProductRange) setSelectedProductRange(filters.selectedProductRange);
        if (filters.productSearchRange) setProductSearchRange(filters.productSearchRange);
        if (filters.isTrendExpanded) setIsTrendExpanded(filters.isTrendExpanded);
        if (filters.showCommodityPrices) setShowCommodityPrices(filters.showCommodityPrices);
      } catch (e) {
        console.error("Failed to load monitoring filters:", e);
      }
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    const filters = {
      selectedYear,
      fromMonth,
      toMonth,
      selectedCommodity,
      selectedBrand,
      selectedTrendSizes: Array.from(selectedTrendSizes),
      selectedStore,
      selectedProduct,
      selectedSize,
      productSearch,
      selectedProductRange,
      productSearchRange,
      isTrendExpanded,
      showCommodityPrices
    };
    localStorage.setItem("monitoringFilters", JSON.stringify(filters));
  }, [selectedYear, fromMonth, toMonth, selectedCommodity, selectedBrand, selectedTrendSizes, selectedStore, selectedProduct, selectedSize, productSearch, selectedProductRange, productSearchRange, isTrendExpanded, showCommodityPrices]);

  // Base dataset filtered by selected year and month range
  const timeFilteredPrices = useMemo(() => {
    let filtered = [...pricesArray];

    if (selectedYear) {
      filtered = filtered.filter(p => {
        const dataYear = p?.years || (p?.timestamp ? new Date(p.timestamp).getFullYear() : null);
        return String(dataYear) === selectedYear;
      });
    }

    if (fromMonth || toMonth) {
      filtered = filtered.filter(p => {
        const monthIndex = getMonthIndex(p.month);
        if (monthIndex === -1) return false;

        if (fromMonth && toMonth) {
          const fromIndex = getMonthIndex(fromMonth);
          const toIndex = getMonthIndex(toMonth);
          return monthIndex >= fromIndex && monthIndex <= toIndex;
        } else if (fromMonth) {
          const fromIndex = getMonthIndex(fromMonth);
          return monthIndex >= fromIndex;
        } else if (toMonth) {
          const toIndex = getMonthIndex(toMonth);
          return monthIndex <= toIndex;
        }
        return true;
      });
    }

    return filtered;
  }, [pricesArray, selectedYear, fromMonth, toMonth]);

  // Years/months filters
  const yearsAndMonths = useMemo(() => {
    const years = new Set();
    const months = new Set();

    pricesArray.forEach(p => {
      const yearValue = p?.years || (p?.timestamp ? new Date(p.timestamp).getFullYear() : null);
      if (yearValue) years.add(String(yearValue));
      if (!selectedYear || String(yearValue) === selectedYear) {
        if (p?.month) months.add(normalizeMonth(p.month));
      }
    });
    
    const sortedMonths = Array.from(months).sort((a, b) => {
      const indexA = getMonthIndex(a);
      const indexB = getMonthIndex(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    
    return {
      years: Array.from(years).sort((a, b) => Number(b) - Number(a)),
      months: sortedMonths
    };
  }, [pricesArray, selectedYear]);

  // Reset month selections if they fall outside the available set for the chosen year
  useEffect(() => {
    if (fromMonth && !yearsAndMonths.months.includes(fromMonth)) {
      setFromMonth("");
    }
    if (toMonth && !yearsAndMonths.months.includes(toMonth)) {
      setToMonth("");
    }
  }, [yearsAndMonths, fromMonth, toMonth]);

  // Unique commodities for price trend
  const uniqueCommodities = useMemo(() => {
    const commodities = new Set();
    timeFilteredPrices.forEach(p => {
      if (p?.commodity) commodities.add(p.commodity);
    });
    return Array.from(commodities).sort();
  }, [timeFilteredPrices]);

  // Brands for selected commodity
  const availableBrands = useMemo(() => {
    if (!selectedCommodity) return [];
    const brands = new Set();
    timeFilteredPrices.forEach(p => {
      if (p.commodity === selectedCommodity && p.brand) {
        brands.add(p.brand);
      }
    });
    const brandList = Array.from(brands).sort();
    return ["No Brand", ...brandList];
  }, [timeFilteredPrices, selectedCommodity]);

  // Sizes for selected commodity and brand
  const availableTrendSizes = useMemo(() => {
    if (!selectedCommodity) return [];
    const sizes = new Set();
    timeFilteredPrices.forEach(p => {
      if (p.commodity === selectedCommodity) {
        if (!selectedBrand || (p.brand || "No Brand") === selectedBrand) {
          if (p.size) sizes.add(p.size);
        }
      }
    });
    return Array.from(sizes).sort();
  }, [timeFilteredPrices, selectedCommodity, selectedBrand]);

  // Common product list (commodity + brand) for legacy search
  const uniqueProducts = useMemo(() => {
    const map = new Map();
    timeFilteredPrices.forEach(p => {
      if (!p || !p.commodity) return;
      const key = `${p.commodity}|${p.brand || "No Brand"}`;
      if (!map.has(key)) {
        map.set(key, {
          commodity: p.commodity,
          brand: p.brand || "No Brand",
          label: `${p.commodity}${p.brand ? ` (${p.brand})` : ""}`
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [timeFilteredPrices]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return uniqueProducts;
    const q = productSearch.toLowerCase();
    return uniqueProducts.filter(p => p.label.toLowerCase().includes(q));
  }, [productSearch, uniqueProducts]);

  // Commodity list for range section (commodity-only, case-insensitive search)
  const uniqueCommoditiesForRange = useMemo(() => {
    const set = new Set();
    timeFilteredPrices.forEach(p => {
      if (p?.commodity) set.add(p.commodity);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [timeFilteredPrices]);

  const filteredCommoditiesRange = useMemo(() => {
    if (!productSearchRange) return uniqueCommoditiesForRange;
    const q = productSearchRange.toLowerCase();
    return uniqueCommoditiesForRange.filter(c => c.toLowerCase().includes(q));
  }, [productSearchRange, uniqueCommoditiesForRange]);

  // Cascade options
  const availableSizes = useMemo(() => {
    if (!selectedProduct) return [];
    const [commodity, brand] = selectedProduct.split("|");
    const sizes = new Set();
    timeFilteredPrices.forEach(p => {
      if (p.commodity === commodity && (p.brand || "No Brand") === brand && p.size) {
        sizes.add(p.size);
      }
    });
    return Array.from(sizes).sort();
  }, [timeFilteredPrices, selectedProduct]);

  const availableStores = useMemo(() => {
    if (hideStores || !selectedCommodity) return [];
    const stores = new Set();
    timeFilteredPrices.forEach(p => {
      if (p.commodity === selectedCommodity) {
        if (!selectedBrand || (p.brand || "No Brand") === selectedBrand) {
          if (selectedTrendSizes.size === 0 || selectedTrendSizes.has(p.size)) {
            if (p.store) stores.add(p.store);
          }
        }
      }
    });
    return Array.from(stores).sort();
  }, [timeFilteredPrices, selectedCommodity, selectedBrand, selectedTrendSizes, hideStores]);

  // Reset month selections if they fall outside the available set for the chosen year
  useEffect(() => {
    if (fromMonth && !yearsAndMonths.months.includes(fromMonth)) {
      setFromMonth("");
    }
    if (toMonth && !yearsAndMonths.months.includes(toMonth)) {
      setToMonth("");
    }
  }, [yearsAndMonths, fromMonth, toMonth]);

  const getColorForIndex = (index) => {
    const colors = ["#6366f1", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];
    return colors[index % colors.length];
  };

  const formatMonthYear = (month, year, timestamp) => {
    if (month && year) return `${month} ${year}`;
    if (timestamp) return new Date(timestamp).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return "Date not available";
  };

  const getMonthYearOrder = (month, year, timestamp) => {
    const monthIndex = getMonthIndex(month);
    const yearNum = Number(year);
    if (!Number.isNaN(yearNum) && monthIndex >= 0) {
      return new Date(yearNum, monthIndex, 1).getTime();
    }
    return timestamp ? new Date(timestamp).getTime() : 0;
  };

  // 1. Price Trend (prevailing)
  const priceTrendData = useMemo(() => {
    if (!timeFilteredPrices.length || !selectedCommodity) return { data: [], sizeLabels: [] };

    let filtered = [...timeFilteredPrices];
    filtered = filtered.filter(p => p.commodity === selectedCommodity);
    
    if (selectedBrand) {
      filtered = filtered.filter(p => (p.brand || "No Brand") === selectedBrand);
    }

    if (!hideStores && selectedStore) filtered = filtered.filter(p => p.store === selectedStore);

    if (selectedTrendSizes.size > 0) {
      filtered = filtered.filter(p => selectedTrendSizes.has(p.size));
      const monthMap = {};
      filtered.forEach(p => {
        const monthLabel = normalizeMonth(p.month) || "UNKNOWN MONTH";
        if (!monthMap[monthLabel]) monthMap[monthLabel] = { month: monthLabel, prices: [], srps: [] };
        monthMap[monthLabel].prices.push(Number(p.price) || 0);
        if (p.srp) monthMap[monthLabel].srps.push(Number(p.srp) || 0);
      });

      const data = Object.values(monthMap).map(group => {
        const freq = {};
        let maxFreq = 0;
        group.prices.forEach(val => {
          freq[val] = (freq[val] || 0) + 1;
          if (freq[val] > maxFreq) maxFreq = freq[val];
        });
        const modes = Object.keys(freq).filter(k => freq[k] === maxFreq).map(Number);
        const maxSrp = group.srps.length > 0 ? Math.max(...group.srps) : 0;
        let prevailing;
        if (maxFreq > 1 && modes.length === 1) {
          prevailing = modes[0];
        } else {
          const maxPrice = Math.max(...group.prices);
          prevailing = maxSrp > 0 ? Math.min(maxPrice, maxSrp) : maxPrice;
        }
        return { month: group.month, price: prevailing, srp: maxSrp };
      }).sort((a, b) => {
        const indexA = getMonthIndex(a.month);
        const indexB = getMonthIndex(b.month);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      return { data, sizeLabels: [] };
    }

    const monthMap = {};
    const sizeSet = new Set();
    filtered.forEach(p => {
      const monthLabel = normalizeMonth(p.month) || "UNKNOWN MONTH";
      const sizeLabel = p.size || "Unspecified size";
      const variantLabel = p.variant ? ` (${p.variant})` : "";
      const sizeKey = `${sizeLabel}${variantLabel}`;
      sizeSet.add(sizeKey);
      if (!monthMap[monthLabel]) monthMap[monthLabel] = { month: monthLabel, prices: {} };
      if (!monthMap[monthLabel].prices[sizeKey]) monthMap[monthLabel].prices[sizeKey] = [];
      monthMap[monthLabel].prices[sizeKey].push(Number(p.price) || 0);
    });

    const sizeLabels = Array.from(sizeSet);
    const data = Object.values(monthMap).map(group => {
      const row = { month: group.month };
      sizeLabels.forEach(sizeKey => {
        if (group.prices[sizeKey]?.length) {
          const prices = group.prices[sizeKey];
          const freq = {};
          let maxFreq = 0;
          prices.forEach(val => {
            freq[val] = (freq[val] || 0) + 1;
            if (freq[val] > maxFreq) maxFreq = freq[val];
          });
          const modes = Object.keys(freq).filter(k => freq[k] === maxFreq).map(Number);
          row[sizeKey] = maxFreq > 1 && modes.length === 1 ? modes[0] : Math.max(...prices);
        }
      });
      return row;
    }).sort((a, b) => {
      const indexA = getMonthIndex(a.month);
      const indexB = getMonthIndex(b.month);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return { data, sizeLabels };
  }, [timeFilteredPrices, selectedCommodity, selectedBrand, selectedTrendSizes, selectedStore, hideStores]);

  // 2. Price comparison by size/variant
  const priceRangeSummary = useMemo(() => {
    if (!timeFilteredPrices.length || !selectedProductRange) {
      return { min: null, max: null, prices: [] };
    }

    const commodity = selectedProductRange;
    const filtered = timeFilteredPrices.filter(p => p.commodity === commodity);
    if (!filtered.length) return { min: null, max: null, prices: [] };

    const pricesOnly = filtered.map(p => Number(p.price) || 0);
    const minPrice = Math.min(...pricesOnly);
    const maxPrice = Math.max(...pricesOnly);

    const prices = filtered
      .map(p => ({
        price: Number(p.price) || 0,
        order: getMonthYearOrder(p.month, p.years, p.timestamp),
        month: normalizeMonth(p.month) || "UNKNOWN MONTH",
        year: p.years || (p.timestamp ? new Date(p.timestamp).getFullYear() : ""),
        store: hideStores ? "Redacted" : (p.store || ""),
        brand: p.brand || "No Brand",
        size: p.size || "N/A",
        variant: p.variant || "N/A"
      }))
      .sort((a, b) => a.order - b.order);

    return { min: minPrice, max: maxPrice, prices };
  }, [timeFilteredPrices, selectedProductRange, hideStores]);

  // 3. Stores that exceeded SRP
  const storesExceededSRP = useMemo(() => {
    if (!timeFilteredPrices.length) return [];
    const filtered = [...timeFilteredPrices];

    const storeExceeded = {};
    filtered.forEach(p => {
      const price = Number(p.price) || 0;
      const srp = Number(p.srp) || 0;
      const storeName = hideStores ? "Redacted" : p.store;
      if (srp > 0 && price > srp) {
        if (!storeExceeded[storeName]) storeExceeded[storeName] = { store: storeName, count: 0, items: [] };
        storeExceeded[storeName].count += 1;
        storeExceeded[storeName].items.push({
          commodity: p.commodity,
          brand: p.brand || "No Brand",
          size: p.size || "N/A",
          variant: p.variant || "N/A",
          price,
          srp,
          excess: price - srp,
          date: formatMonthYear(p.month, p.years, p.timestamp),
          month: p.month,
          year: p.years
        });
      }
    });
    const result = Object.values(storeExceeded);
    result.forEach(store => {
      store.items.sort((a, b) => b.excess - a.excess);
    });
    return result.sort((a, b) => b.count - a.count);
  }, [timeFilteredPrices, hideStores]);

  // 4. Stores that exceeded 10% previous price
  const storesExceeded10Percent = useMemo(() => {
    if (!timeFilteredPrices.length) return [];
    const filtered = [...timeFilteredPrices];

    const grouped = {};
    filtered.forEach(p => {
      const storeName = hideStores ? "Redacted" : p.store;
      const key = `${p.commodity}_${storeName}_${p.brand || "No Brand"}_${p.size || "N/A"}_${p.variant || "N/A"}`;
      if (!grouped[key]) {
        grouped[key] = {
          commodity: p.commodity,
          brand: p.brand || "No Brand",
          store: storeName,
          size: p.size || "N/A",
          variant: p.variant || "N/A",
          prices: []
        };
      }
      grouped[key].prices.push({
        price: Number(p.price) || 0,
        order: getMonthYearOrder(p.month, p.years, p.timestamp),
        monthYear: formatMonthYear(p.month, p.years, p.timestamp),
        month: p.month,
        year: p.years
      });
    });

    const storeExceeded = {};
    Object.values(grouped).forEach(group => {
      const sorted = group.prices.sort((a, b) => a.order - b.order);
      for (let i = 1; i < sorted.length; i++) {
        const prevPrice = sorted[i - 1].price;
        const currPrice = sorted[i].price;
        const percentIncrease = prevPrice > 0 ? ((currPrice - prevPrice) / prevPrice) * 100 : 0;
        if (percentIncrease > 10) {
          const storeName = hideStores ? "Redacted" : group.store;
          if (!storeExceeded[storeName]) storeExceeded[storeName] = { store: storeName, count: 0, items: [] };
          storeExceeded[storeName].count += 1;
          storeExceeded[storeName].items.push({
            commodity: group.commodity,
            brand: group.brand,
            size: group.size,
            variant: group.variant,
            prevPrice,
            currPrice,
            percentIncrease,
            prevDate: sorted[i - 1].monthYear,
            currDate: sorted[i].monthYear,
            date: `${sorted[i - 1].monthYear} -> ${sorted[i].monthYear}`,
            month: sorted[i].month,
            year: sorted[i].year
          });
        }
      }
    });

    const result = Object.values(storeExceeded);
    result.forEach(store => {
      store.items.sort((a, b) => b.percentIncrease - a.percentIncrease);
    });
    return result.sort((a, b) => b.count - a.count);
  }, [timeFilteredPrices, hideStores]);

  const srpPreviewLimit = 3;
  const increasePreviewLimit = 3;
  const srpStoresToShow = showAllSRPStores ? storesExceededSRP : storesExceededSRP.slice(0, srpPreviewLimit);
  const increaseStoresToShow = showAllIncreaseStores ? storesExceeded10Percent : storesExceeded10Percent.slice(0, increasePreviewLimit);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px", fontFamily: "'Inter', sans-serif" }}>
      <style>{animationStyles}</style>

      {/* GLOBAL FILTERS */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", padding: "16px 24px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", textTransform: "uppercase" }}>Filter By:</div>
        <select style={selectStyle} value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
          <option value="">Select Year</option>
          {yearsAndMonths.years.map((year, idx) => (
            <option key={idx} value={year}>{year}</option>
          ))}
        </select>
        <select style={selectStyle} value={fromMonth} onChange={(e) => setFromMonth(e.target.value)}>
          <option value="">From Month</option>
          {yearsAndMonths.months.map((month, idx) => (
            <option key={idx} value={month}>{month}</option>
          ))}
        </select>
        <select style={selectStyle} value={toMonth} onChange={(e) => setToMonth(e.target.value)}>
          <option value="">To Month</option>
          {yearsAndMonths.months.map((month, idx) => (
            <option key={idx} value={month}>{month}</option>
          ))}
        </select>
      </div>

      {/* TABS NAVIGATION */}
      <div style={{ display: "flex", gap: "8px", borderBottom: "2px solid #e2e8f0", marginTop: "8px" }}>
        <button
          onClick={() => setActiveTab("trends")}
          style={{
            padding: "12px 24px",
            background: activeTab === "trends" ? "white" : "transparent",
            border: "none",
            borderBottom: activeTab === "trends" ? "3px solid #6366f1" : "3px solid transparent",
            color: activeTab === "trends" ? "#6366f1" : "#64748b",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "15px",
            transition: "all 0.2s"
          }}
        >
          📊 Price Analysis
        </button>
        <button
          onClick={() => setActiveTab("stores")}
          style={{
            padding: "12px 24px",
            background: activeTab === "stores" ? "white" : "transparent",
            border: "none",
            borderBottom: activeTab === "stores" ? "3px solid #6366f1" : "3px solid transparent",
            color: activeTab === "stores" ? "#6366f1" : "#64748b",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: "15px",
            transition: "all 0.2s"
          }}
        >
           Store Exceptions
        </button>
      </div>

      {/* PRICE ANALYSIS TAB */}
      {activeTab === "trends" && (
        <>
          {/* 1. PRICE TREND OF PRODUCTS */}
          <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <h4 style={{ margin: 0, color: "#29296E" }}>📈 Price Trends by Product (Prevailing Price)</h4>
          <button
            onClick={() => setIsTrendExpanded(prev => !prev)}
            style={{
              border: "1px solid #cbd5e1",
              background: "white",
              borderRadius: "8px",
              padding: "8px 12px",
              cursor: "pointer",
              fontWeight: 600,
              color: "#29296E"
            }}
          >
            {isTrendExpanded ? "Collapse Chart" : "Expand Chart"}
          </button>
        </div>
        <div style={filterStyle}>
          <div style={{ position: "relative", minWidth: "500px" }}>
            <input
              type="text"
              style={{ ...selectStyle, width: "85%" }}
              placeholder="Search commodity..."
              value={selectedCommodity}
              onChange={(e) => { setSelectedCommodity(e.target.value); setSelectedBrand(""); setSelectedTrendSizes(new Set()); setShowCommodityDropdown(true); }}
              onFocus={() => setShowCommodityDropdown(true)}
              onBlur={() => setTimeout(() => setShowCommodityDropdown(false), 200)}
            />
            {selectedCommodity && (
              <button
                onClick={() => {
                  setSelectedCommodity("");
                  setSelectedBrand("");
                  setSelectedTrendSizes(new Set());
                }}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94a3b8", padding: "4px 8px", display: "flex", alignItems: "center", justifyContent: "center" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#64748b"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#94a3b8"}
              >
                ✕
              </button>
            )}
            {showCommodityDropdown && uniqueCommodities.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, maxHeight: "200px", overflowY: "auto", background: "white", border: "1px solid #cbd5e1", borderRadius: "8px", marginTop: "4px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", zIndex: 1000 }}>
                {uniqueCommodities.filter(commodity => commodity.toLowerCase().includes(selectedCommodity.toLowerCase())).map((commodity, idx) => (
                  <div
                    key={idx}
                    style={{ padding: "8px 12px", cursor: "pointer", fontSize: "13px", borderBottom: idx < uniqueCommodities.filter(c => c.toLowerCase().includes(selectedCommodity.toLowerCase())).length - 1 ? "1px solid #f1f5f9" : "none" }}
                    onMouseEnter={(e) => e.target.style.background = "#f8fafc"}
                    onMouseLeave={(e) => e.target.style.background = "white"}
                    onMouseDown={() => {
                      setSelectedCommodity(commodity);
                      setSelectedBrand("");
                      setSelectedTrendSizes(new Set());
                      setShowCommodityDropdown(false);
                    }}
                  >
                    {commodity}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedCommodity && availableBrands.length > 0 && (
            <select style={selectStyle} value={selectedBrand} onChange={(e) => { setSelectedBrand(e.target.value); setSelectedTrendSizes(new Set()); }}>
              <option value="">Select Brand</option>
              {availableBrands.map((brand, idx) => (
                <option key={idx} value={brand}>{brand}</option>
              ))}
            </select>
          )}
        </div>

        {priceTrendData.data.length === 0 ? (
          <div style={{ color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>
            {selectedCommodity ? "No price data available for selected filters" : "Please select a commodity to view price trends"}
          </div>
        ) : (
          <>
            {priceTrendData.sizeLabels.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid #e2e8f0", justifyContent: "center" }}>
                {priceTrendData.sizeLabels.map((label, idx) => (
                  <div
                    key={label}
                    onClick={() => {
                      const newHidden = new Set(hiddenSeries);
                      if (newHidden.has(label)) {
                        newHidden.delete(label);
                      } else {
                        newHidden.add(label);
                      }
                      setHiddenSeries(newHidden);
                    }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      padding: "6px 12px",
                      borderRadius: "8px",
                      backgroundColor: hiddenSeries.has(label) ? "#f1f5f9" : "#fff",
                      border: "1px solid #e2e8f0",
                      opacity: hiddenSeries.has(label) ? 0.5 : 1,
                      transition: "all 0.2s"
                    }}
                  >
                    <div style={{ width: "16px", height: "3px", backgroundColor: getColorForIndex(idx), borderRadius: "2px" }}></div>
                    <span style={{ fontSize: "13px", color: "#29296E", fontWeight: "500", textDecoration: hiddenSeries.has(label) ? "line-through" : "none" }}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <ResponsiveContainer width="100%" height={isTrendExpanded ? 520 : 300}>
              <LineChart data={priceTrendData.data} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" angle={-30} textAnchor="end" height={80} tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#64748b", fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }} formatter={(value) => `₱${Number(value).toFixed(2)}`} />
                {priceTrendData.sizeLabels.length > 0 ? (
                  priceTrendData.sizeLabels.map((label, idx) => (
                    !hiddenSeries.has(label) && (
                      <Line key={label} type="monotone" dataKey={label} stroke={getColorForIndex(idx)} strokeWidth={2} dot={{ r: 3, fill: getColorForIndex(idx) }} activeDot={{ r: 5 }} name={label} />
                    )
                  ))
                ) : (
                  <Line type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: "#6366f1" }} name="Prevailing Price" />
                )}
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* 2. PRICE RANGE (MIN/MAX) */}
      <div style={cardStyle}>
        <h4 style={{ margin: "0 0 16px 0", color: "#29296E" }}>💰 Price Range (Min - Max)</h4>
        <div style={filterStyle}>
          <div style={{ position: "relative", minWidth: "500px" }}>
            <input
              type="text"
              style={{ ...selectStyle, width: "85%" }}
              placeholder="Search commodity..."
              value={productSearchRange}
              onChange={(e) => { setProductSearchRange(e.target.value); setShowProductDropdownRange(true); setShowCommodityPrices(false); }}
              onFocus={() => setShowProductDropdownRange(true)}
              onBlur={() => setTimeout(() => setShowProductDropdownRange(false), 200)}
              
            />
            {productSearchRange && (
              <button
                onClick={() => {
                  setProductSearchRange("");
                  setShowProductDropdownRange(false);
                  setSelectedProductRange("");
                  setShowCommodityPrices(false);
                }}
                style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", fontSize: "18px", cursor: "pointer", color: "#94a3b8", padding: "4px 8px", display: "flex", alignItems: "center", justifyContent: "center" }}
                onMouseEnter={(e) => e.currentTarget.style.color = "#64748b"}
                onMouseLeave={(e) => e.currentTarget.style.color = "#94a3b8"}
              >
                ✕
              </button>
            )}
            {showProductDropdownRange && filteredCommoditiesRange.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, maxHeight: "200px", overflowY: "auto", background: "white", border: "1px solid #cbd5e1", borderRadius: "8px", marginTop: "4px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)", zIndex: 1000 }}>
                {filteredCommoditiesRange.map((commodity, idx) => (
                  <div
                    key={idx}
                    style={{ padding: "8px 12px", cursor: "pointer", fontSize: "13px", borderBottom: idx < filteredCommoditiesRange.length - 1 ? "1px solid #f1f5f9" : "none" }}
                    onMouseEnter={(e) => e.target.style.background = "#f8fafc"}
                    onMouseLeave={(e) => e.target.style.background = "white"}
                    onMouseDown={() => {
                      setSelectedProductRange(commodity);
                      setProductSearchRange(commodity);
                      setShowCommodityPrices(false);
                      setShowProductDropdownRange(false);
                    }}
                  >
                    {commodity}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {!selectedProductRange || priceRangeSummary.min === null ? (
          <div style={{ color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>
            {selectedProductRange ? "No data available for selected filters" : "Please select a commodity to view its price range"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ padding: "18px 22px", border: "2px solid #6366f1", borderRadius: "14px", background: "linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)", fontWeight: 700, color: "#29296E", boxShadow: "0 6px 16px rgba(99, 102, 241, 0.12)" }}>
                <span style={{ fontSize: "16px", color: "#475569", fontWeight: 600, marginRight: "10px" }}>Price Range:</span>
                <span style={{ fontSize: "28px", color: "#4f46e5", fontWeight: 900, letterSpacing: "0.2px" }}>₱{priceRangeSummary.min.toFixed(2)} - ₱{priceRangeSummary.max.toFixed(2)}</span>
              </div>
              <div style={{ color: "#475569", fontWeight: 600 }}>Entries: {priceRangeSummary.prices.length}</div>
              <button
                onClick={() => setShowCommodityPrices(prev => !prev)}
                style={{
                  border: "1px solid #cbd5e1",
                  background: "white",
                  borderRadius: "8px",
                  padding: "8px 12px",
                  cursor: "pointer",
                  fontWeight: 600,
                  color: "#0f172a"
                }}
              >
                {showCommodityPrices ? "Hide Commodity Prices" : "Show Commodity Prices"}
              </button>
            </div>

            {showCommodityPrices && (
              <div style={{ border: "1px solid #e2e8f0", borderRadius: "12px", padding: "12px", background: "#f8fafc", maxHeight: "500px", overflowY: "auto" }}>
                <div style={{ display: "grid", gridTemplateColumns: hideStores ? "1fr 1fr 1fr" : "1fr 1fr 1fr 1fr", gap: "8px", fontSize: "13px", color: "#475569", fontWeight: 700, marginBottom: "8px", position: "sticky", top: 0, background: "#f8fafc", paddingBottom: "8px", zIndex: 1 }}>
                  <span>Date</span>
                  <span>Price</span>
                  {!hideStores && <span>Store</span>}
                  <span>Details</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {priceRangeSummary.prices.map((entry, idx) => (
                    <div key={idx} style={{ display: "grid", gridTemplateColumns: hideStores ? "1fr 1fr 1fr" : "1fr 1fr 1fr 1fr", gap: "8px", padding: "10px", borderRadius: "8px", background: "white", border: "1px solid #e2e8f0", alignItems: "center", fontSize: "13px", color: "#0f172a" }}>
                      <span>{`${entry.month} ${entry.year || ""}`.trim()}</span>
                      <span style={{ fontWeight: 700 }}>₱{entry.price.toFixed(2)}</span>
                      {!hideStores && <span style={{ color: "#475569" }}>{entry.store || "N/A"}</span>}
                      <span style={{ color: "#475569" }}>{entry.brand !== "No Brand" ? entry.brand : ""}{entry.size && entry.size !== "N/A" ? ` • ${entry.size}` : ""}{entry.variant && entry.variant !== "N/A" ? ` • ${entry.variant}` : ""}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
        </>
      )}

      {/* STORE EXCEPTIONS TAB */}
      {activeTab === "stores" && (
        <>
          {/* 3. STORES EXCEEDED SRP */}
          {!hideStores && (
            <div style={cardStyle}>
          <h4 style={{ margin: "0 0 20px 0", color: "#29296E", fontSize: "18px", fontWeight: "700" }}> Stores That Exceeded SRP</h4>
          {storesExceededSRP.length === 0 ? (
            <div style={{ color: "#22c55e", textAlign: "center", padding: "32px", background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)", borderRadius: "12px", fontSize: "15px", fontWeight: "500" }}>
              ✓ No stores exceeded SRP
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                {srpStoresToShow.map((store, idx) => {
                  const storeKey = store.store;
                  const isExpanded = expandedSRPStores.has(storeKey);
                  const itemsToShow = isExpanded ? store.items : store.items.slice(0, 2);
                  const hasMore = store.items.length > 2;
                  
                  return (
                    <div key={idx} style={{ border: "1px solid #fecaca", borderRadius: "12px", padding: "20px", background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)", boxShadow: "0 2px 4px rgba(220, 38, 38, 0.1)", transition: "all 0.2s ease", maxHeight: "500px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
                      <div style={{ fontWeight: "700", color: "#dc2626", marginBottom: "12px", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ background: "#dc2626", color: "white", padding: "4px 12px", borderRadius: "6px", fontSize: "14px", fontWeight: "600" }}>
                          {store.count}
                        </span>
                        {store.store}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {itemsToShow.map((item, i) => (
                          <div
                            key={i}
                            onClick={() => { setSelectedExceptionItem({ type: "srp", data: item, store: store.store }); setShowExceptionModal(true); }}
                            style={{ fontSize: "14px", color: "#991b1b", padding: "10px 12px", background: "rgba(255, 255, 255, 0.6)", borderRadius: "8px", border: "1px solid rgba(220, 38, 38, 0.2)", cursor: "pointer", transition: "all 0.2s ease" }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.6)"}
                          >
                            <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                              {item.commodity} {item.brand && item.brand !== "No Brand" && <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>({item.brand})</span>}
                            </div>
                            <div style={{ fontSize: "12px", color: "#7f1d1d", marginBottom: "6px" }}>{item.date}</div>
                            <div style={{ fontSize: "13px", color: "#7f1d1d", display: "flex", gap: "16px" }}>
                              <span>Price: ₱{item.price.toFixed(2)}</span>
                              <span>SRP: ₱{item.srp.toFixed(2)}</span>
                              <span style={{ fontWeight: "600", color: "#dc2626" }}>+₱{item.excess.toFixed(2)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {hasMore && (
                        <button
                          onClick={() => {
                            const newSet = new Set(expandedSRPStores);
                            if (isExpanded) {
                              newSet.delete(storeKey);
                            } else {
                              newSet.add(storeKey);
                            }
                            setExpandedSRPStores(newSet);
                          }}
                          style={{
                            marginTop: "8px",
                            background: "none",
                            border: "1px solid #fca5a5",
                            borderRadius: "6px",
                            padding: "6px 10px",
                            color: "#991b1b",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 600
                          }}
                        >
                          {isExpanded ? "Show less" : `Show ${store.items.length - 2} more`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {storesExceededSRP.length > srpPreviewLimit && (
                <button
                  onClick={() => setShowAllSRPStores(!showAllSRPStores)}
                  style={{
                    alignSelf: "flex-start",
                    marginTop: "8px",
                    background: "none",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "#0f172a",
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  {showAllSRPStores ? "Show less" : `Show more (${storesExceededSRP.length - srpPreviewLimit} more)`}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* 4. STORES EXCEEDED 10% PREVIOUS PRICE */}
      {!hideStores && (
        <div style={cardStyle}>
          <h4 style={{ margin: "0 0 20px 0", color: "#29296E", fontSize: "18px", fontWeight: "700" }}>📊 Stores with 10%+ Price Increase</h4>
          {storesExceeded10Percent.length === 0 ? (
            <div style={{ color: "#22c55e", textAlign: "center", padding: "32px", background: "linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)", borderRadius: "12px", fontSize: "15px", fontWeight: "500" }}>
              ✓ No stores with significant price increases (&gt;10%)
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                {increaseStoresToShow.map((store, idx) => {
                  const storeKey = store.store;
                  const isExpanded = expandedIncreaseStores.has(storeKey);
                  const itemsToShow = isExpanded ? store.items : store.items.slice(0, 2);
                  const hasMore = store.items.length > 2;
                  
                  return (
                    <div key={idx} style={{ border: "1px solid #fdba74", borderRadius: "12px", padding: "20px", background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)", boxShadow: "0 2px 4px rgba(234, 88, 12, 0.1)", transition: "all 0.2s ease", maxHeight: "500px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
                      <div style={{ fontWeight: "700", color: "#ea580c", marginBottom: "12px", fontSize: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ background: "#ea580c", color: "white", padding: "4px 12px", borderRadius: "6px", fontSize: "14px", fontWeight: "600" }}>
                          {store.count}
                        </span>
                        {store.store}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {itemsToShow.map((item, i) => (
                          <div
                            key={i}
                            onClick={() => { setSelectedExceptionItem({ type: "increase", data: item, store: store.store }); setShowExceptionModal(true); }}
                            style={{ fontSize: "14px", color: "#92400e", padding: "10px 12px", background: "rgba(255, 255, 255, 0.6)", borderRadius: "8px", border: "1px solid rgba(234, 88, 12, 0.2)", cursor: "pointer", transition: "all 0.2s ease" }}
                            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)"}
                            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.6)"}
                          >
                            <div style={{ fontWeight: "600", marginBottom: "4px" }}>
                              {item.commodity} {item.brand !== "No Brand" && <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>({item.brand})</span>}
                            </div>
                            <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
                              {item.size !== "N/A" && `Size: ${item.size}`}{item.size !== "N/A" && item.variant !== "N/A" && " • "}{item.variant !== "N/A" && `Variant: ${item.variant}`}
                            </div>
                            <div style={{ fontSize: "13px", color: "#78350f", display: "flex", gap: "12px", alignItems: "center" }}>
                              <span>₱{item.prevPrice.toFixed(2)}</span>
                              <span style={{ color: "#a16207" }}>→</span>
                              <span>₱{item.currPrice.toFixed(2)}</span>
                              <span style={{ fontWeight: "700", color: "#ea580c", background: "rgba(234, 88, 12, 0.1)", padding: "2px 8px", borderRadius: "4px" }}>
                                +{item.percentIncrease.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {hasMore && (
                        <button
                          onClick={() => {
                            const newSet = new Set(expandedIncreaseStores);
                            if (isExpanded) {
                              newSet.delete(storeKey);
                            } else {
                              newSet.add(storeKey);
                            }
                            setExpandedIncreaseStores(newSet);
                          }}
                          style={{
                            marginTop: "8px",
                            background: "none",
                            border: "1px solid #fdba74",
                            borderRadius: "6px",
                            padding: "6px 10px",
                            color: "#92400e",
                            cursor: "pointer",
                            fontSize: "13px",
                            fontWeight: 600
                          }}
                        >
                          {isExpanded ? "Show less" : `Show ${store.items.length - 2} more`}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {storesExceeded10Percent.length > increasePreviewLimit && (
                <button
                  onClick={() => setShowAllIncreaseStores(!showAllIncreaseStores)}
                  style={{
                    alignSelf: "flex-start",
                    marginTop: "8px",
                    background: "none",
                    border: "1px solid #cbd5e1",
                    borderRadius: "8px",
                    padding: "8px 12px",
                    color: "#0f172a",
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  {showAllIncreaseStores ? "Show less" : `Show more (${storesExceeded10Percent.length - increasePreviewLimit} more)`}
                </button>
              )}
            </>
          )}
        </div>
      )}
        </>
      )}

      {/* EXCEPTION DETAILS MODAL */}
      {showExceptionModal && selectedExceptionItem && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0, 0, 0, 0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ backgroundColor: "white", borderRadius: "16px", padding: "32px", maxWidth: "500px", width: "100%", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)", animation: "slideUp 0.3s ease-out" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", gap: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#29296E" }}>
                {selectedExceptionItem.type === "srp" ? "⚠️ SRP Exceeded Details" : "📊 Price Increase Details"}
              </h3>
              <button
                onClick={() => setShowExceptionModal(false)}
                style={{ background: "none", border: "none", fontSize: "24px", cursor: "pointer", color: "#64748b", padding: 0, width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ✕
              </button>
            </div>

            {selectedExceptionItem.type === "srp" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase" }}>Store</div>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>{hideStores ? "Redacted" : selectedExceptionItem.store}</div>
                </div>

                <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase" }}>Product</div>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>{selectedExceptionItem.data.commodity}</div>
                </div>

                <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase" }}>Brand</div>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>{selectedExceptionItem.data.brand || "N/A"}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase" }}>Size</div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>{selectedExceptionItem.data.size || "N/A"}</div>
                  </div>
                  <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase" }}>Variant</div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>{selectedExceptionItem.data.variant || "N/A"}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ backgroundColor: "#fef2f2", padding: "16px", borderRadius: "12px", border: "1px solid #fecaca" }}>
                    <div style={{ fontSize: "12px", color: "#991b1b", fontWeight: "600", marginBottom: "4px" }}>ACTUAL PRICE</div>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#dc2626" }}>₱{selectedExceptionItem.data.price.toFixed(2)}</div>
                  </div>
                  <div style={{ backgroundColor: "#fef2f2", padding: "16px", borderRadius: "12px", border: "1px solid #fecaca" }}>
                    <div style={{ fontSize: "12px", color: "#991b1b", fontWeight: "600", marginBottom: "4px" }}>SRP</div>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#991b1b" }}>₱{selectedExceptionItem.data.srp.toFixed(2)}</div>
                  </div>
                </div>

                <div style={{ backgroundColor: "#fef2f2", padding: "16px", borderRadius: "12px", border: "2px solid #dc2626" }}>
                  <div style={{ fontSize: "12px", color: "#991b1b", fontWeight: "600", marginBottom: "4px" }}>EXCESS AMOUNT</div>
                  <div style={{ fontSize: "28px", fontWeight: "700", color: "#dc2626" }}>+₱{selectedExceptionItem.data.excess.toFixed(2)}</div>
                </div>

                <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase" }}>Date</div>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>{selectedExceptionItem.data.date}</div>
                </div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase" }}>Store</div>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>{hideStores ? "Redacted" : selectedExceptionItem.store}</div>
                </div>

                <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase" }}>Product</div>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>{selectedExceptionItem.data.commodity}</div>
                </div>

                <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase" }}>Brand</div>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>{selectedExceptionItem.data.brand}</div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase" }}>Size</div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>{selectedExceptionItem.data.size}</div>
                  </div>
                  <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                    <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase" }}>Variant</div>
                    <div style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>{selectedExceptionItem.data.variant}</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  <div style={{ backgroundColor: "#fffbeb", padding: "16px", borderRadius: "12px", border: "1px solid #fdba74" }}>
                    <div style={{ fontSize: "12px", color: "#92400e", fontWeight: "600", marginBottom: "4px" }}>PREVIOUS PRICE</div>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#ea580c" }}>₱{selectedExceptionItem.data.prevPrice.toFixed(2)}</div>
                  </div>
                  <div style={{ backgroundColor: "#fffbeb", padding: "16px", borderRadius: "12px", border: "1px solid #fdba74" }}>
                    <div style={{ fontSize: "12px", color: "#92400e", fontWeight: "600", marginBottom: "4px" }}>CURRENT PRICE</div>
                    <div style={{ fontSize: "24px", fontWeight: "700", color: "#ea580c" }}>₱{selectedExceptionItem.data.currPrice.toFixed(2)}</div>
                  </div>
                </div>

                <div style={{ backgroundColor: "#fffbeb", padding: "16px", borderRadius: "12px", border: "2px solid #ea580c" }}>
                  <div style={{ fontSize: "12px", color: "#92400e", fontWeight: "600", marginBottom: "4px" }}>PRICE INCREASE</div>
                  <div style={{ fontSize: "28px", fontWeight: "700", color: "#ea580c" }}>+{selectedExceptionItem.data.percentIncrease.toFixed(1)}%</div>
                </div>

                <div style={{ backgroundColor: "#f8fafc", padding: "16px", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
                  <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600", marginBottom: "4px", textTransform: "uppercase" }}>Date</div>
                  <div style={{ fontSize: "16px", fontWeight: "700", color: "#1e293b" }}>{selectedExceptionItem.data.date}</div>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "24px" }}>
              <button
                onClick={() => {
                  if (!selectedExceptionItem) return;
                  const { data, store } = selectedExceptionItem;
                  onSeeAnalysis({
                    commodity: data?.commodity,
                    store: hideStores ? undefined : store,
                    size: data?.size,
                    variant: data?.variant,
                    brand: data?.brand,
                    year: data?.year || selectedYear,
                    month: data?.month || fromMonth || toMonth
                  });
                  setShowExceptionModal(false);
                }}
                style={{ background: "#1E4387", color: "white", border: "none", borderRadius: "8px", padding: "10px 14px", fontWeight: "700", cursor: "pointer" }}
              >
                See Analysis
              </button>
              <button
                onClick={() => setShowExceptionModal(false)}
                style={{ backgroundColor: "#29296E", color: "white", border: "none", borderRadius: "8px", padding: "10px 14px", fontSize: "14px", fontWeight: "600", cursor: "pointer", transition: "background-color 0.2s ease" }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#1E4387"}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#29296E"}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
