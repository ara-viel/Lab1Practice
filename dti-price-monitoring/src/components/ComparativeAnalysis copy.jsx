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
const tdStyle = modalTdStyle;
import React, { useState, useMemo, useRef, useEffect } from "react";
import { TrendingUp, TrendingDown, Search, X, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { generatePDF, generateWord } from "../services/reportGenerator";
import "../assets/ComparativeAnalysis.css";

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

export default function ComparativeAnalysis({ prices, prevailingReport = [] }) {
  // For case-sensitive table behavior keep original casing but trim whitespace
  const canonical = (s) => (s === undefined || s === null) ? "" : String(s).trim();
  const [selectedCommodity, setSelectedCommodity] = useState("all");
  const [selectedStore, setSelectedStore] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
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


  // Handle null or undefined prices and support several shapes
  let pricesArray = [];
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

  // Get available months and years from data
  const availableMonths = useMemo(() => {
    const months = new Set();
    pricesArray.forEach(p => {
      if (!p) return;
      const normalized = normalizeMonthValue(p.month);
      if (typeof normalized === 'number') months.add(normalized);
    });
    return Array.from(months).sort((a, b) => a - b);
  }, [pricesArray]);

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
  }, [pricesArray]);

  // Get unique commodities and stores for filters (dedupe case-insensitively)
  const uniqueCommodities = useMemo(() => {
    const map = new Map();
    pricesArray.forEach(p => {
      if (!p || !p.commodity) return;
      const key = canonical(p.commodity);
      if (!map.has(key)) map.set(key, p.commodity);
    });
    return ["all", ...Array.from(map.values())];
  }, [pricesArray]);

  const uniqueStores = useMemo(() => {
    const map = new Map();
    pricesArray.forEach(p => {
      if (!p || !p.store) return;
      const key = canonical(p.store);
      if (!map.has(key)) map.set(key, p.store);
    });
    return ["all", ...Array.from(map.values())];
  }, [pricesArray]);


  // SRP lookup: take latest non-zero SRP per commodity; fallback to prevailingReport
  const srpLookup = {};
  const prevailingLookup = {};

  // Populate from prevailingReport first (baseline)
  prevailingReport.forEach(r => {
    if (r.commodity && r.srp) {
      // build composite key including brand and size if available
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
      // normalize brand
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
        if (monthFilterVal && mKey !== monthFilterVal) return false;
        if (yearFilterVal && yKey !== yearFilterVal) return false;
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

        // filter out records that don't match the active table filters
        if (monthFilterVal && monthKey !== monthFilterVal) return;
        if (yearFilterVal && yearKey !== yearFilterVal) return;

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
        grouped[key].prices.push({
          // Keep original imported month/year and include normalized keys for grouping
          price: Number(item.price) || 0,
          srp: Number(item.srp) || 0,
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
        } catch (e) { /* ignore brand parsing errors */ }
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
        prevailingBuckets[key].push({ price: Number(item.price) || 0, ts: item.timestamp ? new Date(item.timestamp).getTime() : 0 });
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
          let bestPrice = 0;
          let bestTs = -1;
          Object.keys(freq).forEach(pKey => {
            const count = freq[pKey];
            if (count === maxCount) {
              const ts = lastTs[pKey] || 0;
              const pNum = Number(pKey);
              if (ts > bestTs || (ts === bestTs && pNum > bestPrice)) {
                bestTs = ts;
                bestPrice = pNum;
              }
            }
          });
          prevailingMap[k] = bestPrice;
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

      // Produce one result row per imported record (preserves all raw records)
      const recordBuckets = {};
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
        const mKey = normalizeMonthValue(item.month);
        const yKey = normalizeYearValue((item.year ?? item.years) ?? (item.timestamp ? new Date(item.timestamp).getFullYear() : undefined));
        const bucketKey = `${item.commodity}__${itemBrand}__${item.size || ""}__${item.store || "Unknown"}__${mKey}__${yKey}`;
        if (!recordBuckets[bucketKey]) recordBuckets[bucketKey] = [];
        recordBuckets[bucketKey].push({ raw: item, price: Number(item.price) || 0, srp: Number(item.srp) || 0, ts: item.timestamp ? new Date(item.timestamp).getTime() : 0, monthKey: mKey, yearKey: yKey, brand: itemBrand });
      });

      const results = [];
      Object.values(recordBuckets).forEach(bucket => {
        bucket.sort((a, b) => (a.ts || 0) - (b.ts || 0));
        for (let i = 0; i < bucket.length; i++) {
          const entry = bucket[i];
          const prev = i > 0 ? bucket[i - 1] : null;
          const currentPrice = entry.price;
          const previousPrice = prev ? prev.price : 0;
          const priceChange = currentPrice - previousPrice;
          const percentChange = previousPrice !== 0 ? ((priceChange / previousPrice) * 100) : 0;

          // SRP lookup
          const srpKey = `${entry.raw.commodity}__${entry.brand || ""}__${entry.raw.size || ""}`;
          const srpEntry = srpLookup[srpKey] || srpLookup[entry.raw.commodity] || { value: 0 };
          const srp = srpEntry?.value || 0;

          // Prevailing price across stores
          const prevailingLookupKey = `${entry.raw.commodity}__${entry.raw.size || ""}__${entry.monthKey}__${entry.yearKey}`;
          let prevailingPrice = prevailingMap[prevailingLookupKey];
          if (prevailingPrice === undefined) {
            const pb = prevailingBuckets[prevailingLookupKey] || [];
            if (pb.length > 0) {
              let best = { price: -Infinity, ts: -1 };
              pb.forEach(v => {
                if (v.price > best.price || (v.price === best.price && (v.ts || 0) > (best.ts || 0))) {
                  best = { price: v.price, ts: v.ts || 0 };
                }
              });
              prevailingPrice = best.price === -Infinity ? 0 : best.price;
            } else prevailingPrice = 0;
          }

          let statusType = "decreased";
          if (currentPrice > previousPrice) statusType = "higher-than-previous";
          else if (currentPrice > srp && srp > 0) statusType = "higher-than-srp";
          else if (currentPrice < previousPrice) statusType = "decreased";

          const isCompliant = srp > 0 ? (currentPrice < srp * 1.10 && currentPrice > srp * 0.90) : true;

          results.push({
            commodity: entry.raw.commodity,
            brand: entry.brand || "",
            store: entry.raw.store || "Unknown",
            size: entry.raw.size || "",
            prevailingPrice: prevailingPrice,
            srp: srp,
            currentPrice: currentPrice,
            previousPrice: previousPrice,
            priceChange: priceChange,
            percentChange: percentChange,
            isCompliant: isCompliant,
            statusType: statusType,
            month: entry.monthKey === "ALL" ? "" : entry.monthKey,
            year: entry.yearKey === "ALL" ? "" : entry.yearKey
          });
        }
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
        filtered = filtered.filter(item => canonical(item.store) === ss);
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
      // find any original price record for this commodity/store that matches the report selection (case-insensitive)
      const entries = pricesArray.filter(p => p && canonical(p.commodity) === canonical(item.commodity) && canonical(p.store || 'Unknown') === canonical(item.store || 'Unknown'));
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
      .sort((a, b) => (b.priceChange || 0) - (a.priceChange || 0))
      .slice(0, 5);
  };

  // Get top 5 lowest price changes
  const getTop5Lowest = () => {
    return [...dataForAnalysis]
      .sort((a, b) => (a.priceChange || 0) - (b.priceChange || 0))
      .slice(0, 5);
  };

  // Get stores with highest SRP
  const getStoresWithHighestSRP = () => {
    const storeData = {};
    dataForAnalysis.forEach(item => {
      if (item.store && item.srp) {
        if (!storeData[item.store]) storeData[item.store] = [];
        storeData[item.store].push(Number(item.srp) || 0);
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
  const avgPriceChangeAbs = totalRecords > 0
    ? (dataForAnalysis.reduce((acc, curr) => acc + (curr.priceChange || 0), 0) / totalRecords).toFixed(2)
    : "0.00";

  const [topIncrease] = [...dataForAnalysis].sort((a, b) => (b.priceChange || 0) - (a.priceChange || 0));
  const [topDecrease] = [...dataForAnalysis].sort((a, b) => (a.priceChange || 0) - (b.priceChange || 0));
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
  
  // Build enhanced narrative summary
  const top5HighestList = getTop5Highest();
  const top5LowestList = getTop5Lowest();
  const storesHighestList = getStoresWithHighestSRP();
  
  const topIncreaseAmount = topIncrease?.priceChange || 0;
  const topDecreaseAmount = topDecrease?.priceChange || 0;
  
  const summaryNarrative = useMemo(() => {
    const header = (selectedReportMonth && selectedReportYear)
      ? `Report for ${MONTHS[selectedReportMonth - 1]} ${selectedReportYear}`
      : selectedReportYear
        ? `Report for ${selectedReportYear}`
        : "Report for all months/years";

    const topMovers = topIncrease ? `The highest increase was ${topIncrease.commodity} at ${topIncrease.store} (₱${topIncreaseAmount.toFixed(2)}).` : "No data available";
    const topDecr = (topDecrease && topDecreaseAmount !== 0) ? `The largest decrease was ${topDecrease.commodity} at ${topDecrease.store} (₱${topDecreaseAmount.toFixed(2)}).` : "";
    const topStore = storesHighestList[0]?.store || "N/A";
    const topStoreAvg = storesHighestList[0]?.avgSRP ? storesHighestList[0].avgSRP.toFixed(2) : "0.00";

    return `
${header}
Price Movement Summary: Across ${totalRecords} monitored products, the average price change is ${avgChangeSign}₱${avgChangeValue}.
Status breakdown: ${higherPreviousCount} higher than previous price, ${higherSRPCount} higher than SRP, ${decreasedCount} decreased.

Top Movers: ${topMovers} ${topDecr}

SRP Landscape: The store with the highest average SRP is ${topStore} at ₱${topStoreAvg}.
`;
  }, [selectedReportMonth, selectedReportYear, MONTHS, totalRecords, avgChangeSign, avgChangeValue, higherPreviousCount, higherSRPCount, decreasedCount, topIncrease, topDecrease, topIncreaseAmount, topDecreaseAmount, storesHighestList]);

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

  // PDF Export Functions
  // PDF generation moved to src/services/reportGenerator.js


  // Download as Word (docx) with PDF-like format
  // Word generation moved to src/services/reportGenerator.js

  const previewRows = (selectedReportMonth || selectedReportYear) ? reportData.slice(0, 5) : paginatedData.slice(0, 5);

  // Get status label and color
  const getStatusLabel = (statusType) => {
    const statusMap = {
      "higher-than-previous": { label: "HIGHER THAN PREVIOUS PRICE", color: "#ef4444", bgColor: "#fee2e2" },
      "higher-than-srp": { label: "HIGHER THAN SRP", color: "#ea580c", bgColor: "#fed7aa" },
      "higher-than-price-freeze": { label: "HIGHER THAN PRICE FREEZE", color: "#d97706", bgColor: "#ffedd5" },
      "decreased": { label: "DECREASED", color: "#22c55e", bgColor: "#dcfce7" }
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
            <div>
              <h3 className="ca-title">Comparative Price Analysis</h3>
            </div>
            
            <div className="ca-filters-selects" style={{ display: "flex", gap: 8, marginLeft: "auto", flexWrap: "wrap", alignItems: "center" }}>
              <select
                className="ca-select"
                value={selectedCommodity}
                onChange={e => {
                  setSelectedCommodity(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Commodities</option>
                {uniqueCommodities.map(commodity => (
                  <option key={commodity} value={commodity}>{commodity}</option>
                ))}
              </select>
              <select
                className="ca-select"
                value={selectedStore}
                onChange={e => {
                  setSelectedStore(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="all">All Stores</option>
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
                <option value="">All Months</option>
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
                <option value="">All Years</option>
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        {/* Search Bar */}
        <div className="ca-search-row">
          <Search size={18} color="#64748b" />
          <input
            type="text"
            className="ca-search-input"
            placeholder="Search by brand, commodity, size, store, year, month..."
            value={searchTerm}
            onChange={e => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
          {searchTerm && (
            <button
              onClick={() => {
                setSearchTerm("");
                setCurrentPage(1);
              }}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", padding: "4px" }}
            >
              <X size={18} />
            </button>
          )}
          <span style={{ fontSize: "0.85rem", color: "#64748b", marginLeft: "auto" }}>
            Showing <strong>{paginatedData.length}</strong> of <strong>{totalRecords}</strong>
          </span>
        </div>
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
                  <th className="ca-th" onClick={() => { setSortBy('year'); setSortDir(sortBy === 'year' && sortDir === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>
                    YEAR {sortBy === 'year' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
                  </th>
                  <th className="ca-th" onClick={() => { setSortBy('month'); setSortDir(sortBy === 'month' && sortDir === 'asc' ? 'desc' : 'asc'); }} style={{ cursor: 'pointer' }}>
                    MONTH {sortBy === 'month' ? (sortDir === 'asc' ? '▲' : '▼') : ''}
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
                  <td colSpan="13" style={{ textAlign: "center", padding: "32px", color: "#94a3b8" }}>
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
                        <div style={{ color: "#475569" }}>{item.store}</div>
                      </td>
                      <td className="ca-td">
                        <div style={{ color: "#475569", fontWeight: 700 }}>{(item.year && String(item.year).trim() !== "") ? item.year : "--"}</div>
                      </td>
                      <td className="ca-td">
                        <div style={{ color: "#475569" }}>{(item.month && String(item.month).trim() !== "") ? (typeof item.month === 'number' ? MONTHS[item.month - 1] || item.month : item.month) : "--"}</div>
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
              <span style={{ color: "#64748b", fontSize: "0.9rem" }}>
                {selectedReportMonth && selectedReportYear
                  ? `Report for ${MONTHS[selectedReportMonth - 1]} ${selectedReportYear}`
                  : selectedReportYear
                    ? `Report for ${selectedReportYear}`
                    : "Report for all months/years"}
              </span>
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
                      <td colSpan="9" style={{ textAlign: "center", padding: "16px", color: "#94a3b8" }}>No data to preview</td>
                    </tr>
                  ) : (
                    previewRows.map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={modalTdStyle}>{row.brand || "--"}</td>
                        <td style={modalTdStyle}>{row.commodity}</td>
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

