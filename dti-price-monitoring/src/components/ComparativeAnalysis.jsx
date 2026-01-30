const exportButtonStyle = {
  background: "#2563eb",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "8px 18px",
  fontWeight: 600,
  fontSize: 15,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  boxShadow: "0 2px 8px rgba(37,99,235,0.08)",
  transition: "background 0.2s, color 0.2s",
  cursor: "pointer"
};
// Modal and style helpers
const modalOverlayStyle = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100vw",
  height: "100vh",
  background: "rgba(30, 41, 59, 0.25)",
  zIndex: 1000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
};

const modalContentStyle = {
  background: "#fff",
  borderRadius: "12px",
  boxShadow: "0 8px 32px rgba(30,41,59,0.18)",
  padding: "28px 24px 20px 24px",
  minWidth: 340,
  maxWidth: 540,
  width: "95vw",
  maxHeight: "90vh",
  overflowY: "auto",
  position: "relative"
};

const modalCloseButtonStyle = {
  background: "none",
  border: "none",
  fontSize: 22,
  color: "#64748b",
  cursor: "pointer",
  padding: 0,
  marginLeft: 8
};

const selectStyle = {
  padding: "6px 12px",
  borderRadius: 6,
  border: "1px solid #e2e8f0",
  fontSize: 15,
  color: "#0f172a",
  background: "#f8fafc"
};

const summaryChipStyle = {
  background: "#f1f5f9",
  color: "#0f172a",
  borderRadius: 8,
  padding: "6px 14px",
  fontWeight: 600,
  fontSize: 15,
  display: "inline-block"
};

const narrativeBoxStyle = {
  background: "#f8fafc",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: "10px 16px",
  marginBottom: 16
};

const modalThStyle = {
  padding: "8px 10px",
  fontWeight: 700,
  color: "#0f172a",
  fontSize: "0.95rem"
};

const modalTdStyle = {
  padding: "7px 10px",
  color: "#334155",
  fontSize: "0.97rem"
};

// General table cell style alias used in main table rows
import React, { useState, useMemo, useRef, useEffect } from "react";
import { TrendingUp, TrendingDown, Search, X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { generatePDF, generateWord } from "../services/reportGenerator";
import { computePrevailingPrice } from "../services/prevailingCalculator";
import "../assets/ComparativeAnalysis.css";
const tdStyle = modalTdStyle;

// Helper to get month names
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// Normalizers: accept full month names, common abbreviations (e.g. "Jan"), numeric strings, and numbers
const normalizeMonthValue = (val) => {
  // Accept numbers, numeric strings, full month names, common abbreviations
  // Be robust to case (upper/lower/mixed) and trailing periods (e.g. 'JAN.', 'Feb')
  if (val === undefined || val === null || String(val).trim() === "") return "ALL";
  if (typeof val === 'number') {
    if (val >= 1 && val <= 12) return Number(val);
    return "ALL";
  }
  // coerce to string and normalize
  const sRaw = String(val).trim();
  try {
    const d1 = new Date(sRaw);
    if (!Number.isNaN(d1.getTime())) return d1.getMonth() + 1;
  } catch (e) { }

  // handle compact yyyymm (e.g. '201402')
  const compactMatch = String(sRaw).trim().match(/^(\d{4})(\d{2})$/);
  if (compactMatch) {
    const mm = Number(compactMatch[2]);
    if (mm >= 1 && mm <= 12) return mm;
  }

  // remove trailing periods and extra whitespace, then lowercase
  const s = sRaw.replace(/\./g, '').trim().toLowerCase();

  // check numeric string
  const asNum = Number(s);
  if (Number.isFinite(asNum) && asNum >= 1 && asNum <= 12) return asNum;

  // exact full month match
  let idx = MONTHS.findIndex(mon => mon.toLowerCase() === s);
  if (idx !== -1) return idx + 1;

  // check common 3-letter (or longer) abbreviations from start
  idx = MONTHS.findIndex(mon => mon.toLowerCase().startsWith(s));
  if (idx !== -1) return idx + 1;

  return "ALL";
};

const normalizeYearValue = (val) => {
  if (val === undefined || val === null || String(val).trim() === "") return "ALL";
  const n = Number(val);
  return Number.isFinite(n) ? n : "ALL";
};

// Component entry is declared below; keep helpers at module scope
export default function ComparativeAnalysis({ prices, monitoringData = null, prevailingReport = [], initialFilters = {} }) {

  // For case-sensitive table behavior keep original casing but trim whitespace
  const canonical = (s) => (s === undefined || s === null) ? "" : String(s).trim();
  const [selectedCommodity, setSelectedCommodity] = useState("all");
  const [selectedStore, setSelectedStore] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("store");
  const [sortDir, setSortDir] = useState("asc");
  const itemsPerPage = 25;
  const tableRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  // Month/year selection for report
  const [selectedReportMonth, setSelectedReportMonth] = useState("");
  const [selectedReportYear, setSelectedReportYear] = useState("");
  // Table filters for month/year (separate from report modal selections)
  const [selectedMonthFilter, setSelectedMonthFilter] = useState("");
  const [selectedYearFilter, setSelectedYearFilter] = useState("");
  const [reportNarrative, setReportNarrative] = useState("");
  const [isNarrativeEdited, setIsNarrativeEdited] = useState(false);
  // Stores modal for aggregated buckets
  const [showStoresModal, setShowStoresModal] = useState(false);
  const [storesModalItems, setStoresModalItems] = useState([]);

  const openStoresModal = (storesArr) => {
    setStoresModalItems(Array.isArray(storesArr) ? storesArr : [storesArr]);
    setShowStoresModal(true);
  };

  // Apply initial filters when provided
  useEffect(() => {
    if (initialFilters.commodity) {
      setSelectedCommodity(initialFilters.commodity);
      setSearchTerm(initialFilters.commodity);
    }
    if (initialFilters.store) {
      setSelectedStore(initialFilters.store);
    }
  }, [initialFilters]);


  // Handle null or undefined prices and support several shapes
  // If `monitoringData` is provided (processed dataset from Monitoring), prefer it as the source
  let pricesArray = [];
  if (Array.isArray(monitoringData)) {
    pricesArray = monitoringData;
  }
  // otherwise fall back to `prices` parsing below
  else {
  try {
    if (!prices) pricesArray = [];
    else if (Array.isArray(prices)) pricesArray = prices;
    else if (typeof prices === 'string') {
      try {
        const parsed = JSON.parse(prices);
        if (Array.isArray(parsed)) pricesArray = parsed;
        else if (parsed && Array.isArray(parsed.history)) pricesArray = parsed.history;
        else if (parsed && Array.isArray(parsed.data)) pricesArray = parsed.data;
      } catch (e) {
        pricesArray = [];
      }
    } else if (typeof prices === 'object') {
      // Common wrapper keys used by different endpoints
      const keys = ['history', 'data', 'prices', 'rows', 'items'];
      for (const k of keys) {
        if (Array.isArray(prices[k])) {
          pricesArray = prices[k];
          break;
        }
      }
      // Some APIs may nest history under a data property
      if (pricesArray.length === 0 && prices.history && Array.isArray(prices.history.data)) {
        pricesArray = prices.history.data;
      }
      // Fallback to treating the object itself as a single record array when it has a commodity
      if (pricesArray.length === 0 && prices.commodity) pricesArray = [prices];
    }
  } catch (e) {
    pricesArray = [];
  }
  }

  // Get available months and years from data
  const availableMonths = useMemo(() => {
    const months = new Set();
    pricesArray.forEach(p => {
      if (!p) return;
      const normalized = normalizeMonthValue(p.month);
      if (typeof normalized === 'number') months.add(normalized);
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [pricesArray, selectedStore]);

  const availableYears = useMemo(() => {
    const years = new Set();
    pricesArray.forEach(p => {
      const y = p?.year ?? p?.years;
      if (y !== undefined && y !== null && String(y).trim() !== "") {
        const n = Number(y);
        if (!Number.isNaN(n)) years.add(n);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [pricesArray, selectedStore, selectedCommodity]);

  // Get unique commodities and stores for filters (dedupe case-insensitively)
  const uniqueCommodities = useMemo(() => {
    const map = new Map();
    pricesArray.forEach(p => {
      if (!p || !p.commodity) return;
      // when a store filter is active, only include commodities available in that store
      if (selectedStore && selectedStore !== 'all') {
        const pStore = canonical(p.store || 'Unknown');
        if (pStore !== canonical(selectedStore)) return;
      }
      const key = canonical(p.commodity);
      if (!map.has(key)) map.set(key, p.commodity);
    });
    // return alphabetically sorted list (preserve original casing)
    const arr = Array.from(map.values()).sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
    return ["all", ...arr];
  }, [pricesArray, selectedStore]);

  

  // Unique brands for brand filter (sorted alphabetically)
  const uniqueBrands = useMemo(() => {
    const map = new Map();
    pricesArray.forEach(p => {
      if (!p) return;
      // if filtering by store, only include brands available in that store
      if (selectedStore && selectedStore !== 'all') {
        const pStore = canonical(p.store || 'Unknown');
        if (pStore !== canonical(selectedStore)) return;
      }
      // if a commodity is selected, limit brands to that commodity
      if (selectedCommodity && selectedCommodity !== 'all') {
        const pComm = canonical(p.commodity || "");
        if (pComm !== canonical(selectedCommodity)) return;
      }
      let b = "";
      try {
        if (p.brand) b = Array.isArray(p.brand) ? String(p.brand[0] || "") : String(p.brand || "");
        else if (p.brands) b = Array.isArray(p.brands) ? String(p.brands[0] || "") : String(p.brands || "");
      } catch (e) { b = ""; }
      if (!b) return;
      const key = canonical(b);
      if (!map.has(key)) map.set(key, b);
    });
    const arr = Array.from(map.values()).sort((a, b) => String(a).localeCompare(String(b), undefined, { sensitivity: 'base' }));
    return arr;
  }, [pricesArray, selectedStore, selectedCommodity]);

  // SRP and prevailing lookups (populated from prevailingReport and then overridden by prices)
  const srpLookup = {};
  const prevailingLookup = {};

  // Populate from prevailingReport first (baseline)
  prevailingReport.forEach(r => {
    if (r.commodity && r.srp) {
      const b = r.brand || r.brands || "";
      const brandKey = Array.isArray(b) ? String(b[0] || "") : String(b || "");
      const sizeKey = r.size || "";
      const key = `${r.commodity}__${brandKey}__${sizeKey}`;
      srpLookup[key] = { value: Number(r.srp) || 0, ts: 0 };
    }
    if (r.commodity && r.prevailing) {
      const b = r.brand || r.brands || "";
      const brandKey = Array.isArray(b) ? String(b[0] || "") : String(b || "");
      const sizeKey = r.size || "";
      const key = `${r.commodity}__${brandKey}__${sizeKey}`;
      prevailingLookup[key] = Number(r.prevailing) || 0;
    }
  });

  // Override with latest SRP from prices
  pricesArray.forEach(p => {
    if (!p || !p.commodity) return;
    const srpNum = Number(p.srp);
    if (!Number.isNaN(srpNum) && srpNum > 0) {
      const ts = p.timestamp ? new Date(p.timestamp).getTime() : 0;
      let itemBrand = "";
      try {
        if (p.brand) {
          if (Array.isArray(p.brand)) itemBrand = String(p.brand[0] || "");
          else itemBrand = String(p.brand);
        } else if (p.brands) {
          if (Array.isArray(p.brands)) itemBrand = String(p.brands[0] || "");
          else itemBrand = String(p.brands);
        }
      } catch (e) { itemBrand = ""; }
      const sizeKey = p.size || "";
      const key = `${p.commodity}__${itemBrand}__${sizeKey}`;
      const current = srpLookup[key];
      if (!current || ts >= current.ts) {
        srpLookup[key] = { value: srpNum, ts };
      }
    }
  });


  // Get combined data, filtered by selected month/year if set
  const getCombinedData = () => {
    try {
      // Group by commodity and store
      // Respect table month/year filters when provided
      const monthFilterVal = selectedMonthFilter ? Number(selectedMonthFilter) : null;
      const yearFilterVal = selectedYearFilter ? Number(selectedYearFilter) : null;
      // build a filtered list once so all subsequent passes respect the month/year table filters
      const activePrices = pricesArray.filter(item => {
        if (!item || !item.commodity) return false;
        const mKey = normalizeMonthValue(item.month);
        const rawYear2 = (item.year ?? item.years) ?? (item.timestamp ? new Date(item.timestamp).getFullYear() : undefined);
        const yKey = normalizeYearValue(rawYear2);

        // If month filter is set, include both the selected month and the immediate previous month
        if (monthFilterVal) {
          const selM = Number(monthFilterVal);
          if (yearFilterVal) {
            const selY = Number(yearFilterVal);
            const prevM = selM === 1 ? 12 : selM - 1;
            const prevY = selM === 1 ? selY - 1 : selY;
            // Accept selected-month rows matching the selected year OR rows missing an explicit year (yKey === "ALL").
            // Also accept previous-month rows that match the previous year OR lack an explicit year.
            const matchesSelected = (mKey === selM && (yKey === selY || yKey === "ALL"));
            const matchesPrev = (mKey === prevM && (yKey === prevY || yKey === "ALL"));
            if (!(matchesSelected || matchesPrev)) return false;
          } else {
            const prevM = selM === 1 ? 12 : selM - 1;
            if (!(mKey === selM || mKey === prevM)) return false;
          }
        } else if (yearFilterVal) {
          if (yKey !== yearFilterVal) return false;
        }

        return true;
      });

      const grouped = {};
      activePrices.forEach(item => {
        if (!item || !item.commodity) return;
        let itemBrand = "";
        try {
          if (item.brand) {
            if (Array.isArray(item.brand)) itemBrand = String(item.brand[0] || "");
            else itemBrand = String(item.brand);
          } else if (item.brands) {
            if (Array.isArray(item.brands)) itemBrand = String(item.brands[0] || "");
            else itemBrand = String(item.brands);
          }
        } catch (e) { itemBrand = ""; }

        // normalize month/year for grouping so each month/year becomes its own group
        const itemMonthKey = normalizeMonthValue(item.month);
        // year fallback to timestamp when missing
        const rawYear = (item.year ?? item.years) ?? (item.timestamp ? new Date(item.timestamp).getFullYear() : undefined);
        const itemYearKey = normalizeYearValue(rawYear);

        const monthKey = itemMonthKey;
        const yearKey = itemYearKey;

        // Note: activePrices already respects table filters (including previous-month inclusion)

        const key = `${item.commodity}_${itemBrand || "UnknownBrand"}_${item.size || ""}_${item.store || "Unknown"}_${monthKey}_${yearKey}`;
        if (!grouped[key]) {
          grouped[key] = {
            commodity: item.commodity,
            brand: itemBrand || "",
            store: item.store || "Unknown",
            size: item.size || "",
            prices: [],
            brands: new Set()
          };
        }
        // Keep original imported month/year and preserve null/undefined prices
        const parsedPrice = (item.price === undefined || item.price === null || String(item.price).trim() === "") ? null : Number(item.price);
        const parsedSrp = (item.srp === undefined || item.srp === null || String(item.srp).trim() === "") ? null : Number(item.srp);
        grouped[key].prices.push({
          price: parsedPrice,
          srp: parsedSrp,
          month: item.month,
          year: item.year ?? item.years ?? "",
          monthKey: monthKey,
          yearKey: yearKey,
          // Store numeric timestamp (ms) if provided
          ts: item.timestamp ? new Date(item.timestamp).getTime() : 0,
          originalTimestamp: item.timestamp
        });
        // Collect brand information (support `brand` or `brands`, arrays or strings)
        try {
          if (itemBrand) grouped[key].brands.add(itemBrand);
          else if (item.brand) {
            if (Array.isArray(item.brand)) item.brand.forEach(b => b && grouped[key].brands.add(String(b)));
            else grouped[key].brands.add(String(item.brand));
          } else if (item.brands) {
            if (Array.isArray(item.brands)) item.brands.forEach(b => b && grouped[key].brands.add(String(b)));
            else grouped[key].brands.add(String(item.brands));
          }
        } catch (e) { }
      });

      // Build prevailing map across stores per commodity+brand+size+month+year using mode (most frequent price)
      const prevailingBuckets = {};
      activePrices.forEach(item => {
        if (!item || !item.commodity) return;
        // normalize brand
        let itemBrand = "";
        try {
          if (item.brand) {
            if (Array.isArray(item.brand)) itemBrand = String(item.brand[0] || "");
            else itemBrand = String(item.brand);
          } else if (item.brands) {
            if (Array.isArray(item.brands)) itemBrand = String(item.brands[0] || "");
            else itemBrand = String(item.brands);
          }
        } catch (e) { itemBrand = ""; }

        // normalize month/year (accept names, abbreviations, numbers); fallback to timestamp for year
        const m = normalizeMonthValue(item.month);
        const yRaw = (item.year ?? item.years) ?? (item.timestamp ? new Date(item.timestamp).getFullYear() : undefined);
        const y = normalizeYearValue(yRaw);

        const monthKey = m;
        const yearKey = y;

        // bucket key groups across stores: commodity + size + month + year
        const key = `${item.commodity}__${item.size || ""}__${monthKey}__${yearKey}`;
        if (!prevailingBuckets[key]) prevailingBuckets[key] = [];
        // preserve nulls: only include entries with a valid numeric price
        const pVal = (item.price === undefined || item.price === null || String(item.price).trim() === "") ? null : Number(item.price);
        if (pVal !== null) prevailingBuckets[key].push({ price: pVal, ts: item.timestamp ? new Date(item.timestamp).getTime() : 0 });
      });

      const prevailingMap = {};
      Object.entries(prevailingBuckets).forEach(([k, arr]) => {
        const freq = {};
        const lastTs = {};
        arr.forEach(v => {
          const p = v.price;
          freq[p] = (freq[p] || 0) + 1;
          lastTs[p] = Math.max(lastTs[p] || 0, v.ts || 0);
        });

        // find max frequency
        const counts = Object.values(freq);
        const maxCount = counts.length ? Math.max(...counts) : 0;

        // if there is a mode (frequency > 1), pick the price with highest frequency; tie-break by latest timestamp then higher price
        if (maxCount > 1) {
          // prefer the highest price among those with the max frequency; tie-break with latest timestamp
          let bestPrice = -Infinity;
          let bestTs = -1;
          Object.keys(freq).forEach(pKey => {
            const count = freq[pKey];
            if (count === maxCount) {
              const ts = lastTs[pKey] || 0;
              const pNum = Number(pKey);
              if (pNum > bestPrice || (pNum === bestPrice && ts > bestTs)) {
                bestPrice = pNum;
                bestTs = ts;
              }
            }
          });
          prevailingMap[k] = bestPrice === -Infinity ? 0 : bestPrice;
        } else {
          // no repeated price (no mode) -> pick highest price across same commodity+size+month+year
            const parts = k.split('__');
            const commodityKey = parts[0];
            const sizeKey = parts[1];
            const monthKey = parts[2];
            const yearKey = parts[3];

          let bestPrice = -Infinity;
          let bestTs = -1;
          Object.entries(prevailingBuckets).forEach(([k2, arr2]) => {
            const p2 = k2.split('__');
              if (p2[0] === commodityKey && p2[1] === sizeKey && p2[2] === monthKey && p2[3] === yearKey) {
              arr2.forEach(v => {
                if (v.price > bestPrice || (v.price === bestPrice && (v.ts || 0) > bestTs)) {
                  bestPrice = v.price;
                  bestTs = v.ts || 0;
                }
              });
            }
          });
          prevailingMap[k] = bestPrice === -Infinity ? 0 : bestPrice;
        }
      });

      // Produce one aggregated row per commodity+brand+size (collapse stores/months/years)
      const aggregatedBuckets = {};
      const itemBrandFromRaw = (it) => {
        try {
          if (!it) return "";
          if (it.brand) return Array.isArray(it.brand) ? String(it.brand[0] || "") : String(it.brand);
          if (it.brands) return Array.isArray(it.brands) ? String(it.brands[0] || "") : String(it.brands);
        } catch (e) { }
        return "";
      };

      activePrices.forEach(item => {
        if (!item || !item.commodity) return;
        const itemBrand = itemBrandFromRaw(item) || "";
        const sizeKey = item.size || "";
        const storeKey = item.store || "Unknown";
        const key = `${item.commodity}__${itemBrand}__${sizeKey}__${storeKey}`;
        if (!aggregatedBuckets[key]) aggregatedBuckets[key] = { commodity: item.commodity, brand: itemBrand, size: sizeKey, records: [], stores: new Set() };
        const mKey = normalizeMonthValue(item.month);
        const yKey = normalizeYearValue((item.year ?? item.years) ?? (item.timestamp ? new Date(item.timestamp).getFullYear() : undefined));
        const recPrice = (item.price === undefined || item.price === null || String(item.price).trim() === "") ? null : Number(item.price);
        const recSrp = (item.srp === undefined || item.srp === null || String(item.srp).trim() === "") ? null : Number(item.srp);
        aggregatedBuckets[key].records.push({ raw: item, price: recPrice, srp: recSrp, ts: item.timestamp ? new Date(item.timestamp).getTime() : 0, monthKey: mKey, yearKey: yKey, store: storeKey });
        aggregatedBuckets[key].stores.add(storeKey);
      });

      const results = [];
      Object.values(aggregatedBuckets).forEach(bucket => {
        // sort by timestamp descending so index 0 is the latest and index 1 is the previous (second-latest)
        const recs = bucket.records.slice().sort((a, b) => (b.ts || 0) - (a.ts || 0));
        const currentRec = recs.length ? recs[0] : null;
        const previousRec = recs.length > 1 ? recs[1] : null;
        const currentPrice = currentRec ? currentRec.price : null;
        const previousPrice = previousRec ? previousRec.price : null;
        const priceChange = (currentPrice !== null && previousPrice !== null) ? (currentPrice - previousPrice) : null;
        const percentChange = (previousPrice !== null && previousPrice !== 0 && priceChange !== null) ? ((priceChange / previousPrice) * 100) : null;
        
        
        // SRP lookup using brand+size key then fallback to commodity
        const srpKey = `${bucket.commodity}__${bucket.brand || ""}__${bucket.size || ""}`;
        const srpEntry = srpLookup[srpKey] || srpLookup[bucket.commodity] || { value: 0 };
        const srp = srpEntry?.value || 0;
        // Prevailing price rules moved to shared calculator: mode > highest, cap at SRP
        const prevailingPrice = computePrevailingPrice(recs, srp);

        // Determine status based on price changes
        let statusType = "decreased";
        if (currentPrice !== null && previousPrice !== null) {
          if (currentPrice > previousPrice) {
            statusType = "higher-than-previous";
          } else if (currentPrice === previousPrice) {
            statusType = "stable";
          } else {
            statusType = "decreased";
          }
        } else if (currentPrice !== null && srp > 0 && currentPrice > srp) {
          statusType = "higher-than-srp";
        } else if (currentPrice !== null && previousPrice === null) {
          statusType = "stable";
        }

        const isCompliant = srp > 0 ? (currentPrice < srp * 1.10 && currentPrice > srp * 0.90) : true;

        const storesArr = Array.from(bucket.stores || []);
        const storeDisplay = storesArr.length === 0 ? "Unknown" : storesArr.join(', ');

        results.push({
          commodity: bucket.commodity,
          brand: bucket.brand || "",
          store: storeDisplay,
          _stores: storesArr,
          size: bucket.size || "",
          prevailingPrice: prevailingPrice,
          srp: srp,
          currentPrice: currentPrice,
          previousPrice: previousPrice,
          priceChange: priceChange,
          percentChange: percentChange,
          isCompliant: isCompliant,
          statusType: statusType,
          month: currentRec && currentRec.monthKey !== "ALL" ? currentRec.monthKey : "",
          year: currentRec && currentRec.yearKey !== "ALL" ? currentRec.yearKey : ""
        });
      });

      // ...existing code...
      // Apply filters (case-insensitive)
      let filtered = results;
      if (selectedCommodity !== "all") {
        const sc = canonical(selectedCommodity);
        filtered = filtered.filter(item => canonical(item.commodity) === sc);
      }
      if (selectedStore !== "all") {
        const ss = canonical(selectedStore);
        filtered = filtered.filter(item => {
          if (canonical(item.store) === ss) return true;
          if (Array.isArray(item._stores) && item._stores.length > 0) {
            return item._stores.some(s => canonical(s) === ss);
          }
          return false;
        });
      }
      // Apply brand filter
      if (selectedBrand !== "all") {
        const sb = canonical(selectedBrand);
        filtered = filtered.filter(item => canonical(item.brand) === sb);
      }
      
      // Apply search filter across BRAND, COMMODITY, SIZE, STORE, YEAR, MONTH (CASE-SENSITIVE)
      if (searchTerm) {
        const tokens = String(searchTerm).split(/\s+/).filter(Boolean);
        filtered = filtered.filter(item => {
          const brand = (item.brand || "").toString();
          const commodity = (item.commodity || "").toString();
          const size = (item.size || "").toString();
          const store = (item.store || "").toString();
          const year = (item.year || item.years || "").toString();

          // normalize month to full name when possible (preserve case)
          let monthField = "";
          if (item.month !== undefined && item.month !== null && String(item.month).trim() !== "") {
            const m = item.month;
            if (typeof m === 'number') monthField = MONTHS[m - 1] || String(m);
            else {
              const idx = MONTHS.findIndex(mon => mon.toLowerCase() === String(m).toLowerCase());
              monthField = idx !== -1 ? MONTHS[idx] : String(m);
            }
          }
          const month = monthField;

          const fields = [brand, commodity, size, store, year, month];
          return tokens.every(tok => fields.some(f => f.includes(tok)));
        });
      }

      // Sort according to `sortBy` and `sortDir`. Default to store then commodity.
      const getSortValue = (item, col) => {
        if (!item) return "";
        switch (col) {
          case "brand": return (item.brand || "").toString().toLowerCase();
          case "commodity": return (item.commodity || "").toString().toLowerCase();
          case "size": return (item.size || "").toString().toLowerCase();
          case "store": return (item.store || "").toString().toLowerCase();
          case "year": {
            const y = item.year ?? item.years ?? "";
            const n = Number(y);
            return Number.isFinite(n) ? n : 0;
          }
          case "month": {
            const m = item.month;
            if (typeof m === 'number') return Number(m);
            if (typeof m === 'string') {
              const idx = MONTHS.findIndex(mon => mon.toLowerCase() === m.toLowerCase());
              if (idx !== -1) return idx + 1;
              const n = Number(m);
              return Number.isFinite(n) ? n : 0;
            }
            return 0;
          }
          default:
            return (item[sortBy] || "").toString();
        }
      };

      const cmp = (a, b) => {
        // primary sort
        const vA = getSortValue(a, sortBy);
        const vB = getSortValue(b, sortBy);

        if (typeof vA === 'number' || typeof vB === 'number') {
          if (vA !== vB) return (vA - vB) * (sortDir === 'asc' ? 1 : -1);
        } else {
          const comp = String(vA).localeCompare(String(vB), undefined, { sensitivity: 'variant' });
          if (comp !== 0) return comp * (sortDir === 'asc' ? 1 : -1);
        }

        // fallback sorts
        const storeCompare = (a.store || "").toString().localeCompare((b.store || "").toString(), undefined, { sensitivity: 'variant' });
        if (storeCompare !== 0) return storeCompare;
        return (a.commodity || "").toString().localeCompare((b.commodity || "").toString(), undefined, { sensitivity: 'base' });
      };

      return filtered.sort(cmp);
    } catch (error) {
      console.error("Error in getCombinedData:", error);
      return [];
    }
  };

  // Get filtered data first so it can be used in other hooks
  const filteredData = useMemo(() => getCombinedData(), [pricesArray, selectedCommodity, selectedStore, searchTerm, srpLookup, prevailingLookup, selectedReportMonth, selectedReportYear, selectedMonthFilter, selectedYearFilter]);

  // Unique stores for store filter: derive from raw prices but respect selected commodity/brand.
  const uniqueStores = useMemo(() => {
    const map = new Map();
    pricesArray.forEach(p => {
      if (!p || !p.store) return;
      // if a commodity filter is active, only include stores that have matching commodity text
      if (selectedCommodity && selectedCommodity !== 'all') {
        const pComm = canonical(p.commodity || "");
        if (!pComm.toLowerCase().includes(canonical(selectedCommodity).toLowerCase())) return;
      }
      // if a brand filter is active, ensure the store has that brand
      if (selectedBrand && selectedBrand !== 'all') {
        let b = "";
        try {
          if (p.brand) b = Array.isArray(p.brand) ? String(p.brand[0] || "") : String(p.brand || "");
          else if (p.brands) b = Array.isArray(p.brands) ? String(p.brands[0] || "") : String(p.brands || "");
        } catch (e) { b = ""; }
        if (!b) return;
        if (canonical(b).toLowerCase() !== canonical(selectedBrand).toLowerCase()) return;
      }

      const key = canonical(p.store);
      if (!map.has(key)) map.set(key, p.store);
    });
    return Array.from(map.values());
  }, [pricesArray, selectedCommodity, selectedBrand, selectedStore]);

  // Report-specific data: filter combined results to only entries that match the selected report month/year
  const reportData = useMemo(() => {
    const base = getCombinedData();
    if (!selectedReportMonth && !selectedReportYear) return base;

    const matchesEntry = (p) => {
      // derive year and month from imported fields or timestamp (no default to current year)
      let y = p?.year ?? p?.years;
      if ((y === undefined || y === null || String(y).trim() === "") && p?.timestamp) {
        const d = new Date(p.timestamp);
        if (!isNaN(d.getTime())) y = d.getFullYear();
      }
      let m = p?.month;
      if (typeof m === 'string') {
        const idx = MONTHS.findIndex(mon => mon.toLowerCase() === m.toLowerCase());
        if (idx !== -1) m = idx + 1;
      }
      if (m !== undefined && m !== null) m = Number(m);
      if (y !== undefined && y !== null) y = Number(y);

      if (selectedReportYear && selectedReportMonth) {
        return Number(y) === Number(selectedReportYear) && Number(m) === Number(selectedReportMonth);
      }
      if (selectedReportYear) return Number(y) === Number(selectedReportYear);
      if (selectedReportMonth) return Number(m) === Number(selectedReportMonth);
      return false;
    };

    return base.filter(item => {
      // find any original price record for this commodity/store/size that matches the report selection (case-insensitive)
      const entries = pricesArray.filter(p => p &&
        canonical(p.commodity) === canonical(item.commodity) &&
        canonical(p.store || 'Unknown') === canonical(item.store || 'Unknown') &&
        canonical(p.size || '') === canonical(item.size || '')
      );
      return entries.some(matchesEntry);
    });
  }, [pricesArray, selectedReportMonth, selectedReportYear, selectedCommodity, selectedStore, searchTerm, srpLookup, prevailingLookup]);

  // Count unique commodities and stores in filteredData
  const filteredCommodityCount = useMemo(() => {
    const set = new Set();
    filteredData.forEach(item => {
      if (item.commodity) set.add(item.commodity.trim().toLowerCase());
    });
    return set.size;
  }, [filteredData]);

  const filteredStoreCount = useMemo(() => {
    const set = new Set();
    filteredData.forEach(item => {
      if (item.store) set.add(item.store.trim().toLowerCase());
    });
    return set.size;
  }, [filteredData]);

  // (moved above)

  // Get top 5 highest price changes
  const getTop5Highest = () => {
    return [...dataForAnalysis]
      .sort((a, b) => ((b.priceChange !== null && b.priceChange !== undefined) ? b.priceChange : -Infinity) - ((a.priceChange !== null && a.priceChange !== undefined) ? a.priceChange : -Infinity))
      .slice(0, 5);
  };

  // Get top 5 lowest price changes
  const getTop5Lowest = () => {
    return [...dataForAnalysis]
      .sort((a, b) => ((a.priceChange !== null && a.priceChange !== undefined) ? a.priceChange : Infinity) - ((b.priceChange !== null && b.priceChange !== undefined) ? b.priceChange : Infinity))
      .slice(0, 5);
  };

  // Get stores with highest SRP
  const getStoresWithHighestSRP = () => {
    const storeData = {};
    dataForAnalysis.forEach(item => {
      if (item.store && item.srp !== null && item.srp !== undefined) {
        const n = Number(item.srp);
        if (!Number.isNaN(n)) {
          if (!storeData[item.store]) storeData[item.store] = [];
          storeData[item.store].push(n);
        }
      }
    });
    
    const storesWithAvgSRP = Object.entries(storeData)
      .map(([store, srps]) => ({
        store,
        avgSRP: srps.reduce((a, b) => a + b, 0) / srps.length,
        maxSRP: Math.max(...srps),
        productCount: srps.length
      }))
      .sort((a, b) => b.avgSRP - a.avgSRP)
      .slice(0, 5);
    
    return storesWithAvgSRP;
  };

  // Use reportData when month/year is selected, otherwise use filteredData for analysis
  const dataForAnalysis = (selectedReportMonth || selectedReportYear) ? reportData : filteredData;

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  useEffect(() => {
    // Clamp current page to valid range when totalPages changes
    const maxPage = Math.max(1, totalPages);
    if (currentPage > maxPage) setCurrentPage(maxPage);
    if (currentPage < 1) setCurrentPage(1);
  }, [totalPages]);
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredData.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredData, currentPage]);

  // Determine the source used for exports: when a month/year is selected use reportData, otherwise prefer filteredData then paginatedData
  const reportSource = (selectedReportMonth || selectedReportYear) ? reportData : (filteredData.length > 0 ? filteredData : paginatedData);


  // Calculate summary statistics (use dataForAnalysis so it follows selected month/year)
  const compliantCount = dataForAnalysis.filter(d => d.isCompliant).length;
  const nonCompliantCount = dataForAnalysis.filter(d => !d.isCompliant).length;
  const totalRecords = dataForAnalysis.length;
  const complianceRate = totalRecords > 0 ? ((compliantCount / totalRecords) * 100).toFixed(1) : 0;

  // Compute average price change using only valid numeric `priceChange` values
  const validPriceChanges = dataForAnalysis
    .map(d => d.priceChange)
    .filter(v => typeof v === 'number' && !Number.isNaN(v));
  const validCount = validPriceChanges.length;
  const avgPriceChange = validCount > 0
    ? (validPriceChanges.reduce((acc, curr) => acc + curr, 0) / validCount)
    : null;
  const avgPriceChangeAbs = avgPriceChange !== null ? Math.abs(avgPriceChange).toFixed(2) : null;

  const [topIncrease] = [...dataForAnalysis].sort((a, b) => ((b.priceChange !== null && b.priceChange !== undefined) ? b.priceChange : -Infinity) - ((a.priceChange !== null && a.priceChange !== undefined) ? a.priceChange : -Infinity));
  const [topDecrease] = [...dataForAnalysis].sort((a, b) => ((a.priceChange !== null && a.priceChange !== undefined) ? a.priceChange : Infinity) - ((b.priceChange !== null && b.priceChange !== undefined) ? b.priceChange : Infinity));
  const topNonCompliant = [...dataForAnalysis]
    .filter((d) => !d.isCompliant)
    .sort((a, b) => {
      const overA = a.srp ? (a.currentPrice || 0) - a.srp : 0;
      const overB = b.srp ? (b.currentPrice || 0) - b.srp : 0;
      return overB - overA;
    })[0];

  // Format the average price change sign correctly
  const avgChangeSign = parseFloat(avgPriceChangeAbs) > 0 ? "+" : parseFloat(avgPriceChangeAbs) < 0 ? "-" : "";
  const avgChangeValue = Math.abs(parseFloat(avgPriceChangeAbs)).toFixed(2);

  // Count status types
  const higherPreviousCount = dataForAnalysis.filter(d => d.statusType === "higher-than-previous").length;
  const higherSRPCount = dataForAnalysis.filter(d => d.statusType === "higher-than-srp").length;
  const decreasedCount = dataForAnalysis.filter(d => d.statusType === "decreased").length;
  const stableCount = dataForAnalysis.filter(d => d.statusType === "stable").length;
  
  // Build enhanced narrative summary
  const top5HighestList = getTop5Highest();
  const top5LowestList = getTop5Lowest();
  const topIncreaseAmount = topIncrease?.priceChange || 0;
  const topDecreaseAmount = topDecrease?.priceChange || 0;

  const summaryNarrative = useMemo(() => {
    const topMovers = topIncrease ? `The highest increase was ${topIncrease.commodity} at ${topIncrease.store} (₱${topIncreaseAmount.toFixed(2)}).` : "No data available";
    const topDecr = (topDecrease && topDecreaseAmount !== 0) ? `The largest decrease was ${topDecrease.commodity} at ${topDecrease.store} (₱${topDecreaseAmount.toFixed(2)}).` : "";

    // Only report average when we have realistic numeric data
    const avgSentence = avgPriceChange !== null
      ? `the average price change is ${avgPriceChange > 0 ? '+' : avgPriceChange < 0 ? '-' : ''}₱${Math.abs(avgPriceChange).toFixed(2)} (n=${validCount}).`
      : `insufficient numeric data to compute average price change.`;

    return `
Summary: Across ${totalRecords} monitored products, ${avgSentence}
Status breakdown: ${higherPreviousCount} higher than previous price, ${higherSRPCount} higher than SRP, ${decreasedCount} decreased.

Top Movers: ${topMovers} ${topDecr}
`;
  }, [selectedReportMonth, selectedReportYear, MONTHS, totalRecords, avgPriceChange, validCount, higherPreviousCount, higherSRPCount, decreasedCount, topIncrease, topDecrease, topIncreaseAmount, topDecreaseAmount]);

  useEffect(() => {
    if (!isNarrativeEdited) {
      setReportNarrative(summaryNarrative);
    }
  }, [summaryNarrative, isNarrativeEdited]);

  useEffect(() => {
    if (showReportModal) {
      setReportNarrative(summaryNarrative);
      setIsNarrativeEdited(false);
    }
  }, [selectedReportMonth, selectedReportYear, showReportModal, summaryNarrative]);

  // Track previous commodity selection but do NOT auto-open the report modal
  const _prevCommodity = useRef(selectedCommodity);
  const _mounted = useRef(false);
  useEffect(() => {
    if (!_mounted.current) {
      _mounted.current = true;
      _prevCommodity.current = selectedCommodity;
      return;
    }
    // update previous commodity tracking when user changes selection
    _prevCommodity.current = selectedCommodity;
  }, [selectedCommodity]);

  // Auto-select commodity when a brand is chosen (only when commodity is not already selected)
  useEffect(() => {
    if (!selectedBrand || selectedBrand === 'all') return;
    if (selectedCommodity && selectedCommodity !== 'all') return; // don't override an existing commodity selection

    const matchedCommodities = new Set();
    pricesArray.forEach(p => {
      if (!p) return;
      // respect store filter when matching
      if (selectedStore && selectedStore !== 'all') {
        const pStore = canonical(p.store || 'Unknown');
        if (pStore !== canonical(selectedStore)) return;
      }
      // normalize brand from record (support `brand` or `brands`)
      let b = "";
      try {
        if (p.brand) b = Array.isArray(p.brand) ? String(p.brand[0] || "") : String(p.brand || "");
        else if (p.brands) b = Array.isArray(p.brands) ? String(p.brands[0] || "") : String(p.brands || "");
      } catch (e) { b = ""; }
      if (!b) return;
      if (canonical(b) === canonical(selectedBrand) && p.commodity) matchedCommodities.add(p.commodity);
    });

    const arr = Array.from(matchedCommodities);
    if (arr.length === 1) {
      setSelectedCommodity(arr[0]);
      setSearchTerm(arr[0]);
      setCurrentPage(1);
    }
  }, [selectedBrand, selectedStore, pricesArray]);

  // PDF Export Functions
  // PDF generation moved to src/services/reportGenerator.js


  // Download as Word (docx) with PDF-like format
  // Word generation moved to src/services/reportGenerator.js

  const previewRows = (selectedReportMonth || selectedReportYear) ? reportData.slice(0, 5) : paginatedData.slice(0, 5);

  // Get status label and color
  const getStatusLabel = (statusType) => {
    const statusMap = {
      "higher-than-previous": { label: "HIGHER THAN PREVIOUS PRICE", color: "#ef4444", bgColor: "#fee2e2" },
      "higher-than-srp": { label: "HIGHER THAN SRP", color: "#ff8441", bgColor: "#fed7aa" },
      "higher-than-price-freeze": { label: "HIGHER THAN PRICE FREEZE", color: "#d97706", bgColor: "#ffedd5" },
      "decreased": { label: "DECREASED", color: "#22c55e", bgColor: "#dcfce7" },
      "stable": { label: "STABLE", color: "#2563eb", bgColor: "#eff6ff" }
    };
    return statusMap[statusType] || { label: "UNKNOWN", color: "#64748b", bgColor: "#e2e8f0" };
  };

  return (
    <div className="ca-root">
      {/* Summary Cards - Organized */}
      <div className="ca-summary-cards">
        <div className="ca-summary-card" style={{ borderLeft: "4px solid #0f172a" }}>
          <span className="ca-label">Total Commodities</span>
          <div className="ca-value">{filteredCommodityCount}</div>
        </div>
        <div className="ca-summary-card" style={{ borderLeft: "4px solid #ef4444" }}>
          <span className="ca-label">Higher than Previous</span>
          <div className="ca-value" style={{ color: "#ef4444" }}>{higherPreviousCount}</div>
        </div>
        <div className="ca-summary-card" style={{ borderLeft: "4px solid #ea580c" }}>
          <span className="ca-label">Higher than SRP</span>
          <div className="ca-value" style={{ color: "#ea580c" }}>{higherSRPCount}</div>
        </div>
        <div className="ca-summary-card" style={{ borderLeft: "4px solid #22c55e" }}>
          <span className="ca-label">Decreased</span>
          <div className="ca-value" style={{ color: "#22c55e" }}>{decreasedCount}</div>
        </div>
        <div className="ca-summary-card" style={{ borderLeft: "4px solid #2563eb" }}>
          <span className="ca-label">Stable</span>
          <div className="ca-value" style={{ color: "#2563eb" }}>{stableCount}</div>
        </div>
      </div>

      {/* Combined Table */}
      <div className="ca-container">
        <div className="ca-counts-row">
          <span>Commodities: <strong>{filteredCommodityCount}</strong></span>
          <span>Stores: <strong>{filteredStoreCount}</strong></span>
          <div style={{ marginLeft: "auto" }}>
            <button
              className="ca-export-btn"
              onClick={() => {
                setReportNarrative(summaryNarrative);
                setShowReportModal(true);
              }}
              disabled={paginatedData.length === 0}
            >
              <Download size={16} />
              Generate Report
            </button>
          </div>
        </div>
        <div className="ca-header-row">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ marginLeft: "auto", display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ fontWeight: 600, color: '#0f172a', marginRight: 8 }}>Filter by:</div>
              <select
                className="ca-select"
                value={selectedStore}
                onChange={e => {
                  setSelectedStore(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">Store</option>
                {uniqueStores.map(store => (
                  <option key={store} value={store}>{store}</option>
                ))}
              </select>
              {/* Month / Year table filters */}
              <select
                className="ca-select"
                value={selectedMonthFilter}
                onChange={e => { setSelectedMonthFilter(e.target.value); setCurrentPage(1); }}
                style={{ minWidth: 110 }}
              >
                <option value="">Month</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{MONTHS[m - 1]}</option>
                ))}
              </select>
              <select
                className="ca-select"
                value={selectedYearFilter}
                onChange={e => { setSelectedYearFilter(e.target.value); setCurrentPage(1); }}
                style={{ minWidth: 100 }}
              >
                <option value="">Year</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {/* Search Bar with commodity datalist embedded */}
        <div className="ca-search-row">
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, minWidth: 360, marginRight: 8 }}>
            <Search size={18} color="#64748b" style={{ position: 'absolute', left: 10 }} />
            <input
              type="text"
              className="ca-search-input"
              placeholder="Enter commodity"
              value={searchTerm}
              onFocus={() => setShowSuggestions(true)}
              onChange={e => {
                const v = e.target.value;
                setSearchTerm(v);
                setCurrentPage(1);
              }}
              onBlur={e => {
                const v = e.target.value;
                const match = uniqueCommodities.find(c => canonical(c).toLowerCase() === canonical(v).toLowerCase());
                if (match && match !== 'all') setSelectedCommodity(match);
                else setSelectedCommodity('all');
                // delay hiding to allow click on suggestion
                setTimeout(() => setShowSuggestions(false), 120);
              }}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  const v = e.currentTarget.value;
                  const match = uniqueCommodities.find(c => canonical(c).toLowerCase() === canonical(v).toLowerCase());
                  if (match && match !== 'all') setSelectedCommodity(match);
                  else setSelectedCommodity('all');
                }
              }}
              style={{ paddingLeft: 36, minWidth: 260 }}
            />
            {showSuggestions && (
              (() => {
                const q = String(searchTerm || "").trim().toLowerCase();
                const suggestions = uniqueCommodities.filter(c => c && c !== 'all' && c.toLowerCase().includes(q));
                // show all matching suggestions; the container keeps its size via maxHeight and scroll
                const limited = suggestions;
                if (limited.length === 0) return null;
                return (
                  <div style={{ position: 'absolute', top: '42px', left: 0, right: 'auto', zIndex: 1200, width: '100%', maxWidth: 520 }}>
                    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, boxShadow: '0 8px 24px rgba(2,6,23,0.08)', maxHeight: 200, overflowY: 'auto' }}>
                      {limited.map((c, i) => (
                        <div
                          key={c + '_' + i}
                          onMouseDown={e => e.preventDefault()}
                          onClick={() => { setSearchTerm(c); setSelectedCommodity(c); setShowSuggestions(false); setCurrentPage(1); }}
                          style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: i < limited.length - 1 ? '1px solid #f1f5f9' : 'none' }}
                        >
                          {c}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(""); setCurrentPage(1); setSelectedCommodity('all'); }}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "4px", marginLeft: 4 }}
              >
                <X size={18} />
              </button>
            )}
          </div>
          <select
            className="ca-select"
            value={selectedBrand}
            onChange={e => { setSelectedBrand(e.target.value); setCurrentPage(1); }}
            style={{ minWidth: 160, marginRight: 8 }}
          >
            <option value="all">Select brand</option>
            {uniqueBrands.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
          <span style={{ fontSize: "0.85rem", color: "#64748b", marginLeft: "auto" }}>
            Showing <strong>{paginatedData.length}</strong> of <strong>{totalRecords}</strong>
          </span>
        </div>
        {selectedCommodity !== "all" ? (
          <>
            <div className="ca-table-container" ref={tableRef}>
              <table className="ca-table">
                <thead>
                <tr style={{ textAlign: "left" }}>
                  <th className="ca-th" onClick={() => { setSortBy('brand'); setSortDir(sortBy === 'brand' && sortDir === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>
                    BRAND {sortBy === 'brand' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="ca-th" onClick={() => { setSortBy('commodity'); setSortDir(sortBy === 'commodity' && sortDir === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>
                    COMMODITY {sortBy === 'commodity' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="ca-th" onClick={() => { setSortBy('size'); setSortDir(sortBy === 'size' && sortDir === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>
                    SIZE {sortBy === 'size' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="ca-th" onClick={() => { setSortBy('store'); setSortDir(sortBy === 'store' && sortDir === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>
                    STORE {sortBy === 'store' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="ca-th">PREVAILING PRICE</th>
                  <th className="ca-th">SRP</th>
                  <th className="ca-th">CURRENT PRICE</th>
                  <th className="ca-th">PREVIOUS PRICE</th>
                  <th className="ca-th">PRICE CHANGE</th>
                  <th className="ca-th">CHANGE %</th>
                  <th className="ca-th">STATUS</th>
                </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan="11" style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
                    {searchTerm ? "No records match your search" : "No data available for the selected filters"}
                  </td>
                </tr>
              ) : (
                paginatedData.map((item, index) => {
                  const statusInfo = getStatusLabel(item.statusType);
                  const currentPriceColor = statusInfo?.color || "#1e293b";
                  // Use canonical month/year attached to combined result (set during grouping). Fallback to a single lookup if missing.
                  let monthDisplay = "--";
                  if (item && item.commodity && item.store) {
                    if (item.month !== undefined && item.month !== null) {
                      const m = item.month;
                      if (typeof m === "number") {
                        monthDisplay = MONTHS[m - 1] || m;
                      } else if (typeof m === "string") {
                        const idx = MONTHS.findIndex(mon => mon.toLowerCase() === m.toLowerCase());
                        monthDisplay = idx !== -1 ? MONTHS[idx] : m;
                      }
                    } else {
                      // Fallback: find any matching imported row for this commodity/store and use its month
                      const matchedEntry = pricesArray.find(p => p.commodity === item.commodity && (p.store || "Unknown") === item.store);
                      if (matchedEntry) {
                        const m = matchedEntry.month;
                        if (typeof m === "number") {
                          monthDisplay = MONTHS[m - 1] || m;
                        } else if (typeof m === "string") {
                          const idx = MONTHS.findIndex(mon => mon.toLowerCase() === m.toLowerCase());
                          monthDisplay = idx !== -1 ? MONTHS[idx] : m;
                        }
                      }
                    }
                  }
                    return (
                    <tr key={index} className="ca-row">
                      <td className="ca-td">
                        <div style={{ fontWeight: "600", color: "#1e293b" }}>{item.brand || "--"}</div>
                      </td>
                      <td className="ca-td">
                        <div style={{ fontWeight: "600", color: "#1e293b" }}>{item.commodity}</div>
                      </td>
                      <td className="ca-td">
                        <div style={{ color: "#475569" }}>{item.size || "--"}</div>
                      </td>
                      <td className="ca-td">
                        <div style={{ color: "#475569" }}>
                          <div style={{ color: '#475569' }}>{item.store}</div>
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <span style={{ fontSize: "0.9rem", fontWeight: "600" }}>
                          {Number(item.prevailingPrice) === 0 || !item.prevailingPrice
                            ? "--"
                            : `₱${Number(item.prevailingPrice).toFixed(2)}`}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: "0.9rem", color: "#64748b" }}>
                          {Number(item.srp) === 0 || !item.srp
                            ? "--"
                            : `₱${Number(item.srp).toFixed(2)}`}
                        </span>
                      </td>
                      <td className="ca-td">
                        <span style={{ fontSize: "0.9rem", fontWeight: "600", color: currentPriceColor }}>
                          {Number(item.currentPrice) === 0 || Number.isNaN(Number(item.currentPrice))
                            ? "--"
                            : `₱${Number(item.currentPrice).toFixed(2)}`}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: "0.9rem", color: "#64748b" }}>
                          {Number(item.previousPrice) === 0 || Number.isNaN(Number(item.previousPrice))
                            ? "--"
                            : `₱${Number(item.previousPrice).toFixed(2)}`}
                        </span>
                      </td>
                      <td className="ca-td">
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: (item.priceChange === 0 || item.priceChange === undefined || item.priceChange === null) ? "#64748b" : (item.priceChange > 0 ? "#ef4444" : item.priceChange < 0 ? "#22c55e" : "#64748b"), fontWeight: "600" }}>
                          {(item.priceChange === 0 || item.priceChange === undefined || item.priceChange === null) ? (
                            <span>--</span>
                          ) : (
                            <>
                              {item.priceChange > 0 && <TrendingUp size={16} color="#ef4444" />}
                              {item.priceChange < 0 && <TrendingDown size={16} color="#22c55e" />}
                              <span style={{ color: (item.priceChange > 0 ? "#ef4444" : item.priceChange < 0 ? "#22c55e" : "#64748b") }}>
                                {item.priceChange > 0 ? "+" : ""}
                                ₱{item.priceChange.toFixed(2)}
                              </span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="ca-td">
                        <span style={{ color: item.priceChange > 0 ? "#ef4444" : item.priceChange < 0 ? "#22c55e" : "#64748b", fontWeight: "600" }}>
                          {item.percentChange === 0 || !item.percentChange
                            ? "--"
                            : `${item.percentChange > 0 ? "+" : ""}${item.percentChange.toFixed(1)}%`}
                        </span>
                      </td>
                      <td className="ca-td">
                        <span className="ca-status-badge" style={{ background: statusInfo.bgColor, color: statusInfo.color }}>
                          ● {statusInfo.label}
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
            {totalPages > 0 && (
              <div className="ca-pagination" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  className="ca-pagination-btn"
                  style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? "not-allowed" : "pointer" }}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={18} />
                </button>
                <span style={{ fontSize: "0.9rem", color: "#64748b" }}>
                  Page
                </span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 1;
                    const clamped = Math.max(1, Math.min(totalPages, Math.floor(v)));
                    setCurrentPage(clamped);
                  }}
                  style={{ width: 64, padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0' }}
                />
                <span style={{ fontSize: "0.9rem", color: "#64748b" }}>
                  of <strong>{totalPages}</strong>
                </span>
                <button
                  className="ca-pagination-btn"
                  style={{ opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: 32, color: "#64748b" }}>
            Please select a commodity or brand to view the table.
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

            {/* Month/Year selection */}
            <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "16px", flexWrap: "wrap" }}>
              <div style={{ fontWeight: 600, color: "#0f172a" }}>Select Month & Year:</div>
              <select
                value={selectedReportMonth}
                onChange={e => setSelectedReportMonth(e.target.value)}
                style={{ ...selectStyle, minWidth: 100 }}
              >
                <option value="">All Months</option>
                {availableMonths.map(m => (
                  <option key={m} value={m}>{MONTHS[m - 1]}</option>
                ))}
              </select>
              <select
                value={selectedReportYear}
                onChange={e => setSelectedReportYear(e.target.value)}
                style={{ ...selectStyle, minWidth: 100 }}
              >
                <option value="">All Years</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              {/* Report label intentionally hidden per user preference */}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "12px" }}>
              <div style={summaryChipStyle}>Total Records: {totalRecords}</div>
              <div style={summaryChipStyle}>Higher than Previous: {higherPreviousCount}</div>
              <div style={summaryChipStyle}>Higher than SRP: {higherSRPCount}</div>
              <div style={summaryChipStyle}>Decreased: {decreasedCount}</div>
            </div>

              <div style={narrativeBoxStyle}>
                <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: "8px" }}>Situationer</div>
                <textarea
                  value={reportNarrative}
                  onChange={(e) => { setReportNarrative(e.target.value); setIsNarrativeEdited(true); }}
                  style={{
                    width: "100%",
                    minHeight: 120,
                    resize: "vertical",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    color: "#475569",
                    lineHeight: 1.4,
                    fontSize: "0.95rem",
                    background: "#fff"
                  }}
                />
              </div>

            <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflowX: "auto", overflowY: "hidden", marginBottom: "16px" }}>
              <table style={{ width: "100%", minWidth: 720, borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", textAlign: "left" }}>
                    <th style={modalThStyle}>Brand</th>
                    <th style={modalThStyle}>Commodity</th>
                    <th style={modalThStyle}>Size</th>
                    <th style={modalThStyle}>Store</th>
                    <th style={modalThStyle}>Prevailing Price</th>
                    <th style={modalThStyle}>SRP</th>
                    <th style={modalThStyle}>Current Price</th>
                    <th style={modalThStyle}>Previous Price</th>
                    <th style={modalThStyle}>Price Change</th>
                    <th style={modalThStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.length === 0 ? (
                    <tr>
                      <td colSpan="10" style={{ textAlign: "center", padding: "16px", color: "#94a3b8" }}>No data to preview</td>
                    </tr>
                  ) : (
                    previewRows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={modalTdStyle}>{row.brand || "--"}</td>
                        <td style={modalTdStyle}>{row.commodity}</td>
                        <td style={modalTdStyle}>{row.size || "--"}</td>
                        <td style={modalTdStyle}>{row.store}</td>
                        <td style={modalTdStyle}>{Number(row.prevailingPrice) === 0 || Number.isNaN(Number(row.prevailingPrice)) ? "--" : `₱${Number(row.prevailingPrice).toFixed(2)}`}</td>
                        <td style={modalTdStyle}>{Number(row.srp) === 0 || Number.isNaN(Number(row.srp)) ? "--" : `₱${Number(row.srp).toFixed(2)}`}</td>
                        <td style={modalTdStyle}>{Number(row.currentPrice) === 0 || Number.isNaN(Number(row.currentPrice)) ? "--" : `₱${Number(row.currentPrice).toFixed(2)}`}</td>
                        <td style={modalTdStyle}>{Number(row.previousPrice) === 0 || Number.isNaN(Number(row.previousPrice)) ? "--" : `₱${Number(row.previousPrice).toFixed(2)}`}</td>
                        <td style={modalTdStyle}>
                          {row.priceChange === 0 || row.priceChange === undefined || row.priceChange === null
                            ? "--"
                            : `${row.priceChange > 0 ? "+" : ""}₱${Number(row.priceChange).toFixed(2)} (${row.percentChange > 0 ? "+" : ""}${Number(row.percentChange).toFixed(1)}%)`
                          }
                        </td>
                        <td style={modalTdStyle}>
                          <span style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "4px 12px",
                            borderRadius: "6px",
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            background: getStatusLabel(row.statusType).bgColor,
                            color: getStatusLabel(row.statusType).color,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px"
                          }}>
                            ● {getStatusLabel(row.statusType).label}
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
                  onClick={async () => {
                    setIsExporting(true);
                    try {
                      await generatePDF({
                        reportSource,
                        selectedReportMonth,
                        selectedReportYear,
                        summaryNarrative: reportNarrative || summaryNarrative,
                        MONTHS,
                        getStatusLabel
                      });
                      if (window.toast && window.toast.success) window.toast.success('PDF successfully exported!');
                    } catch (e) {
                      console.error('PDF export failed', e);
                      if (window.toast && window.toast.error) window.toast.error('PDF export failed');
                    } finally {
                      setIsExporting(false);
                      setShowReportModal(false);
                    }
                  }}
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
                  onClick={async () => {
                    try {
                      await generateWord({
                        reportSource,
                        selectedReportMonth,
                        selectedReportYear,
                        summaryNarrative: reportNarrative || summaryNarrative,
                        getStatusLabel
                      });
                      if (window.toast && window.toast.success) window.toast.success('Word exported');
                    } catch (e) {
                      console.error('Word export failed', e);
                      if (window.toast && window.toast.error) window.toast.error('Word export failed');
                    } finally {
                      setShowReportModal(false);
                    }
                  }}
                  disabled={totalRecords === 0}
                  style={{
                    ...exportButtonStyle,
                    background: "#0f172a",
                    boxShadow: "0 2px 4px rgba(15, 23, 42, 0.2)",
                    opacity: totalRecords === 0 ? 0.6 : 1,
                    cursor: totalRecords === 0 ? "not-allowed" : "pointer"
                  }}
                >
                  <Download size={16} /> Word
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

