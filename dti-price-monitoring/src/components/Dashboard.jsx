import React, { useMemo, useState, useRef, useEffect } from "react";
import { ShoppingCart, Package, ListChecks, TrendingUp, ArrowUp, ArrowDown, Filter, Calendar, Download, Loader } from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import "../assets/Dashboard.css";

export default function Dashboard({ prices: pricesProp }) {
  const [prices, setPrices] = useState(() => Array.isArray(pricesProp) ? pricesProp : []);
  const [loading, setLoading] = useState(true);
  const [chartsReady, setChartsReady] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCommodity, setSelectedCommodity] = useState("all");
  const [selectedStore, setSelectedStore] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [dateRange, setDateRange] = useState("90d");
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedSizeLabel, setSelectedSizeLabel] = useState("");
  
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
  
  // Use prop data directly - no fetching needed
  useEffect(() => {
    if (pricesProp && Array.isArray(pricesProp)) {
      setLoading(true);
      setChartsReady(false);
      setPrices(pricesProp);
      // Show loading for 300ms then data, then after another 500ms show charts
      const timer1 = setTimeout(() => setLoading(false), 300);
      const timer2 = setTimeout(() => setChartsReady(true), 800);
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [pricesProp]);
  
  const pieColors = ["#22c55e", "#f97316"];
  const timelineChartRef = useRef(null);
  const complianceChartRef = useRef(null);
  const srpChartRef = useRef(null);
  const prevailingChartRef = useRef(null);
  const municipalityChartRef = useRef(null);
  const highestChartRef = useRef(null);
  const decreasingChartRef = useRef(null);
  const lowestChartRef = useRef(null);
  const skipBrandEffectRef = useRef(false);
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

  const [fromMonth, setFromMonth] = useState("");
  const [toMonth, setToMonth] = useState("");

  const selectStyle = {
    padding: "6px 10px",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    backgroundColor: "#fff",
    minWidth: 140
  };

  const yearsAndMonths = useMemo(() => ({
    years: availableYears,
    months: availableMonths.map(m => ({ value: m, label: new Date(2000, m, 1).toLocaleString('default', { month: 'short' }) }))
  }), [availableYears, availableMonths]);

  // Sync `fromMonth`/`toMonth` and `selectedYear` into `selectedMonths` used by filters
  useEffect(() => {
    // If year is not selected, do not apply month filtering
    if (selectedYear === 'all') {
      if (selectedMonths && selectedMonths.length > 0) setSelectedMonths([]);
      return;
    }

    const parse = (v) => (v === '' || v === null || v === undefined ? null : Number(v));
    const f = parse(fromMonth);
    const t = parse(toMonth);

    if (f === null && t === null) {
      // no month range selected
      if (selectedMonths && selectedMonths.length > 0) setSelectedMonths([]);
      return;
    }

    if (f !== null && t !== null) {
      let start = f;
      let end = t;
      if (start > end) { const tmp = start; start = end; end = tmp; }
      const months = [];
      for (let m = start; m <= end; m++) months.push(m);
      setSelectedMonths(months);
      return;
    }

    // single-bound selection
    if (f !== null) { setSelectedMonths([f]); return; }
    if (t !== null) { setSelectedMonths([t]); return; }
  }, [fromMonth, toMonth, selectedYear]);

  // timeFilteredPrices: filter by selectedYear and selectedMonths (month range equivalent)
  const timeFilteredPrices = useMemo(() => {
    let filtered = [...pricesArray];

    if (selectedYear !== "all") {
      filtered = filtered.filter(p => {
        const dataYear = p?.years || (p?.timestamp ? new Date(p.timestamp).getFullYear() : null);
        return String(dataYear) === String(selectedYear);
      });
    }

    if (selectedMonths && selectedMonths.length > 0) {
      filtered = filtered.filter(p => {
        let monthNum = monthNameToNumber(p.month);
        if (monthNum === null && p.timestamp) {
          const d = new Date(p.timestamp);
          if (!Number.isNaN(d.getTime())) monthNum = d.getMonth();
        }
        return monthNum !== null && selectedMonths.includes(monthNum);
      });
    }

    // Filter by selected size/unit label when provided
    if (selectedSizeLabel) {
      filtered = filtered.filter(p => {
        const label = [p.size || '', p.unit || ''].filter(Boolean).join(' ').trim() || 'Unknown';
        return label === selectedSizeLabel;
      });
    }

    return filtered;
  }, [pricesArray, selectedYear, selectedMonths, monthNameToNumber, selectedSizeLabel]);

  // Brands list including an "All brands" option and a "No Brand" sentinel.
  // When a commodity is selected, only show brands available for that commodity.
  const availableBrands = useMemo(() => {
    const brandsSet = new Set();
    let hasNoBrand = false;
    timeFilteredPrices.forEach(p => {
      if (selectedCommodity && selectedCommodity !== 'all') {
        if (p.commodity !== selectedCommodity) return;
      }
      if (p.brand) brandsSet.add(p.brand);
      else hasNoBrand = true;
    });

    const brands = Array.from(brandsSet).sort();
    const options = [{ value: 'all', label: 'All brands' }];
    if (hasNoBrand) options.push({ value: 'No Brand', label: 'No Brand' });
    brands.forEach(b => options.push({ value: b, label: b }));
    return options;
  }, [timeFilteredPrices, selectedCommodity]);

  // When commodity changes, keep brand within available options or reset/auto-select
  useEffect(() => {
    if (selectedCommodity === 'all') {
      return;
    }

    // Compute brands for the selected commodity
    const brands = new Set();
    let hasNo = false;
    timeFilteredPrices.forEach(p => {
      if (p.commodity !== selectedCommodity) return;
      if (p.brand) brands.add(p.brand);
      else hasNo = true;
    });

    const arr = Array.from(brands).sort();
    if (arr.length === 1) {
      skipBrandEffectRef.current = true;
      setSelectedBrand(arr[0]);
      return;
    }

    // If current brand is not in the available list (and not No Brand), reset to 'all'
    if (selectedBrand !== 'all' && selectedBrand !== 'No Brand' && !arr.includes(selectedBrand)) {
      skipBrandEffectRef.current = true;
      setSelectedBrand('all');
    }
    // if there is no brand at all but some records lack brand, leave 'No Brand' option for user
    if (arr.length === 0 && hasNo) {
      skipBrandEffectRef.current = true;
      setSelectedBrand('No Brand');
    }
  }, [selectedCommodity, timeFilteredPrices]);

  // Map brand -> set of commodities (for auto-select when brand chosen first)
  const brandToCommodities = useMemo(() => {
    const map = {};
    timeFilteredPrices.forEach(p => {
      const b = p.brand || 'No Brand';
      if (!map[b]) map[b] = new Set();
      if (p.commodity) map[b].add(p.commodity);
    });
    // convert sets to arrays
    Object.keys(map).forEach(k => { map[k] = Array.from(map[k]); });
    return map;
  }, [timeFilteredPrices]);

  // If user chooses a brand first, auto-select the commodity if possible
  useEffect(() => {
    // When brand changes, update commodity selection to match available commodities
    if (!selectedBrand) return;

    // Ignore programmatic brand changes triggered by commodity-change handler
    if (skipBrandEffectRef.current) {
      skipBrandEffectRef.current = false;
      return;
    }

    // 'all' means clear commodity selection to all
    if (selectedBrand === 'all') {
      setSelectedCommodity('all');
      setProductSearch('');
      return;
    }

    const candidates = brandToCommodities[selectedBrand] || [];
    if (candidates.length === 1) {
      setSelectedCommodity(candidates[0]);
      setProductSearch(candidates[0]);
      setSelectedSizeLabel('');
      return;
    }

    // If multiple candidates exist, keep current commodity if it's one of them,
    // otherwise reset to 'all' and clear search.
    if (!selectedCommodity || selectedCommodity === 'all' || !candidates.includes(selectedCommodity)) {
      setSelectedCommodity('all');
      setProductSearch('');
    }
  }, [selectedBrand, brandToCommodities]);

  // (Sizes filter removed per UX request)

  const dateThreshold = useMemo(() => {
    if ((selectedMonths && selectedMonths.length > 0) || selectedYear !== "all") return null;
    const now = new Date();
    if (dateRange === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (dateRange === "90d") return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    return null;
  }, [dateRange, selectedMonths, selectedYear]);

  // Searchable product input state
  const [productSearch, setProductSearch] = useState("");
  const [showProductSuggestions, setShowProductSuggestions] = useState(false);
  const filteredCommodities = useMemo(() => {
    if (!productSearch) return uniqueCommodities.sort();
    const q = productSearch.toLowerCase();
    return uniqueCommodities.filter(c => c.toLowerCase().includes(q)).sort();
  }, [productSearch, uniqueCommodities]);

  // Available size/unit labels for the selected commodity (for comparison)
  const availableSizeLabels = useMemo(() => {
    if (!selectedCommodity || selectedCommodity === 'all') return [];
    const set = new Set();
    pricesArray.forEach(p => {
      if (!p) return;
      if (p.commodity !== selectedCommodity) return;
      const size = p.size || '';
      const unit = p.unit || '';
      const label = [size, unit].filter(Boolean).join(' ').trim();
      if (label) set.add(label);
    });
    return Array.from(set).sort();
  }, [pricesArray, selectedCommodity]);

  const filteredPrices = useMemo(() => {
    const result = pricesArray.filter((p) => {
      if (!p) return false;
      if (selectedCommodity !== "all" && p.commodity !== selectedCommodity) return false;
      if (selectedStore !== "all" && p.store !== selectedStore) return false;
      if (selectedSizeLabel) {
        const label = [p.size || '', p.unit || ''].filter(Boolean).join(' ').trim() || 'Unknown';
        if (label !== selectedSizeLabel) return false;
      }
      
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
  }, [pricesArray, selectedCommodity, selectedStore, dateThreshold, selectedMonths, selectedYear, monthNameToNumber, selectedSizeLabel]);

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
    // Build prevailing price per month using timeFilteredPrices and trend filters
    if (!timeFilteredPrices.length || selectedCommodity === 'all') return [];

    let filtered = [...timeFilteredPrices];
    filtered = filtered.filter(p => p.commodity === selectedCommodity);

    if (selectedBrand && selectedBrand !== 'all') {
      if (selectedBrand === 'No Brand') {
        filtered = filtered.filter(p => !p.brand);
      } else {
        filtered = filtered.filter(p => (p.brand || '') === selectedBrand);
      }
    }

    if (selectedStore !== 'all') filtered = filtered.filter(p => p.store === selectedStore);

    const monthMap = {};
    filtered.forEach(p => {
      let monthNum = monthNameToNumber(p.month);
      let yearNum = p.years ? Number(p.years) : null;
      if ((monthNum === null || Number.isNaN(yearNum)) && p.timestamp) {
        const d = new Date(p.timestamp);
        if (!Number.isNaN(d.getTime())) {
          monthNum = d.getMonth();
          yearNum = d.getFullYear();
        }
      }
      if (monthNum === null || Number.isNaN(yearNum)) return;

      const sortKey = `${yearNum}-${String(monthNum + 1).padStart(2, '0')}`;
      const monthLabel = new Date(yearNum, monthNum, 1).toLocaleString('default', { month: 'short', year: 'numeric' });

      if (!monthMap[sortKey]) monthMap[sortKey] = { month: monthLabel, prices: [], srps: [], sortKey };
      monthMap[sortKey].prices.push(Number(p.price) || 0);
      if (p.srp) monthMap[sortKey].srps.push(Number(p.srp));
    });

    const result = Object.values(monthMap).map(group => {
      const prices = group.prices;
      if (!prices || prices.length === 0) return null;
      const freq = {};
      let maxFreq = 0;
      prices.forEach(v => { freq[v] = (freq[v] || 0) + 1; if (freq[v] > maxFreq) maxFreq = freq[v]; });
      const modes = Object.keys(freq).filter(k => freq[k] === maxFreq).map(Number);
      const maxSrp = group.srps.length > 0 ? Math.max(...group.srps) : 0;

      let prevailing;
      if (maxFreq > 1 && modes.length === 1) {
        prevailing = modes[0];
      } else {
        const maxPrice = Math.max(...prices);
        prevailing = maxSrp > 0 ? Math.min(maxPrice, maxSrp) : maxPrice;
      }

      return { date: group.month, avgPrice: prevailing, sortKey: group.sortKey };
    }).filter(Boolean).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    return result;
  }, [timeFilteredPrices, selectedCommodity, selectedBrand, selectedStore, monthNameToNumber]);

  // Time series split by size/unit labels for the selected commodity
  const timeSeriesBySize = useMemo(() => {
    if (!timeFilteredPrices.length || selectedCommodity === 'all') return [];

    let filtered = [...timeFilteredPrices].filter(p => p.commodity === selectedCommodity);
    if (selectedBrand && selectedBrand !== 'all') {
      if (selectedBrand === 'No Brand') filtered = filtered.filter(p => !p.brand);
      else filtered = filtered.filter(p => (p.brand || '') === selectedBrand);
    }
    if (selectedStore !== 'all') filtered = filtered.filter(p => p.store === selectedStore);

    const monthMap = {};
    filtered.forEach(p => {
      let monthNum = monthNameToNumber(p.month);
      let yearNum = p.years ? Number(p.years) : null;
      if ((monthNum === null || Number.isNaN(yearNum)) && p.timestamp) {
        const d = new Date(p.timestamp);
        if (!Number.isNaN(d.getTime())) {
          monthNum = d.getMonth();
          yearNum = d.getFullYear();
        }
      }
      if (monthNum === null || Number.isNaN(yearNum)) return;

      const sortKey = `${yearNum}-${String(monthNum + 1).padStart(2, '0')}`;
      const monthLabel = new Date(yearNum, monthNum, 1).toLocaleString('default', { month: 'short', year: 'numeric' });

      const sizeLabel = [p.size || '', p.unit || ''].filter(Boolean).join(' ').trim() || 'Unknown';

      if (!monthMap[sortKey]) monthMap[sortKey] = { month: monthLabel, sizes: {}, sortKey };
      if (!monthMap[sortKey].sizes[sizeLabel]) monthMap[sortKey].sizes[sizeLabel] = { prices: [], srps: [] };
      monthMap[sortKey].sizes[sizeLabel].prices.push(Number(p.price) || 0);
      if (p.srp) monthMap[sortKey].sizes[sizeLabel].srps.push(Number(p.srp));
    });

    const result = Object.values(monthMap).map(group => {
      const obj = { date: group.month, sortKey: group.sortKey };
      Object.keys(group.sizes).forEach(lbl => {
        const prices = group.sizes[lbl].prices;
        const srps = group.sizes[lbl].srps || [];
        if (!prices || prices.length === 0) {
          obj[lbl] = null;
          return;
        }

        const freq = {};
        let maxFreq = 0;
        prices.forEach(v => { freq[v] = (freq[v] || 0) + 1; if (freq[v] > maxFreq) maxFreq = freq[v]; });
        const modes = Object.keys(freq).filter(k => freq[k] === maxFreq).map(Number);
        const maxSrp = srps.length > 0 ? Math.max(...srps) : 0;

        let prevailing;
        if (maxFreq > 1 && modes.length === 1) {
          prevailing = modes[0];
        } else {
          const maxPrice = Math.max(...prices);
          prevailing = maxSrp > 0 ? Math.min(maxPrice, maxSrp) : maxPrice;
        }

        obj[lbl] = prevailing;
      });
      return obj;
    }).filter(Boolean).sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    return result;
  }, [timeFilteredPrices, selectedCommodity, selectedBrand, selectedStore, monthNameToNumber]);

  const lineColors = ['#2563eb', '#f97316', '#16a34a', '#7c3aed', '#ef4444', '#0ea5e9', '#f59e0b', '#14b8a6'];

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

      // Build a size/unit label so we only compare like-for-like items
      const sizeLabel = [p.size || '', p.unit || ''].filter(Boolean).join(' ').trim() || 'Unknown';
      const key = `${p.commodity}_${p.store}_${sizeLabel}`;

      // Parse numeric price, skip records with invalid/missing price
      let priceNum = null;
      try {
        if (p.price !== undefined && p.price !== null && String(p.price).trim() !== '') {
          const n = Number(p.price);
          if (!Number.isNaN(n)) priceNum = n;
        }
      } catch (e) { priceNum = null; }
      if (priceNum === null) return;

      // Timestamp fallback: prefer explicit timestamp, else derive from years/month or month/year
      let ts = 0;
      if (p.timestamp) {
        const d = new Date(p.timestamp);
        if (!Number.isNaN(d.getTime())) ts = d.getTime();
      } else if (p.years && p.month !== undefined && p.month !== null) {
        const monthNum = monthNameToNumber(p.month);
        const yr = Number(p.years);
        if (!Number.isNaN(yr) && monthNum !== null) ts = new Date(yr, monthNum, 1).getTime();
      } else if (p.years) {
        const yr = Number(p.years);
        if (!Number.isNaN(yr)) ts = new Date(yr, 0, 1).getTime();
      }

      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({ price: priceNum, ts });
    });

    const deltas = Object.entries(grouped).map(([key, arr]) => {
      const sorted = arr.slice().sort((a, b) => b.ts - a.ts);
      const latest = sorted[0]?.price ?? null;
      const prev = sorted[1]?.price ?? latest;
      // if latest is null just skip
      if (latest === null) return null;
      return {
        key,
        change: latest - (prev ?? latest),
        latest,
        prev,
      };
    }).filter(Boolean);

    // Largest increases
    const topUp = [...deltas].filter(d => d.change > 0).sort((a, b) => b.change - a.change).slice(0, 5);
    // Smallest positive increases (lowest increasing items)
    const lowestIncreases = [...deltas].filter(d => d.change > 0).sort((a, b) => a.change - b.change).slice(0, 5);
    // Largest decreases (most negative change)
    const highestDecreases = [...deltas].filter(d => d.change < 0).sort((a, b) => a.change - b.change).slice(0, 5);

    return { topUp, lowestIncreases, highestDecreases };
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
      { ref: lowestChartRef, title: 'Top 5 lowest increasing items' },
      { ref: decreasingChartRef, title: 'Top 5 highest decreasing items' }
    ];

    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const topMargin = 36;
    const titleHeight = 28; 
    const remarksHeight = 140; 
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

        // Draw image
        const imgY = topMargin;
        pdf.addImage(imgData, 'PNG', 20, imgY, imgWidth, imgHeight);

        // Commodity label below the chart image
        const labelY = imgY + imgHeight + 8;
        pdf.setFontSize(10);
        pdf.setTextColor(100, 116, 139);
        const commodityLabel = `Commodity: ${selectedCommodity === 'all' ? 'All' : selectedCommodity}`;
        pdf.text(commodityLabel, 20, labelY);

        // Draw Remarks section on same page below the chart
        const remarksY = labelY + 12;
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
      {loading && (
        <div style={{
          textAlign: "center",
          padding: "60px 40px",
          fontSize: "1.1rem",
          color: "#64748b",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "400px"
        }}>
          <Loader size={48} style={{ marginBottom: "20px", animation: "spin 1s linear infinite" }} />
          <p style={{ marginBottom: "10px", fontWeight: "500" }}>Loading data from MongoDB...</p>
          <p style={{ fontSize: "0.95rem", color: "#94a3b8" }}>This may take a moment depending on the amount of data</p>
        </div>
      )}
      {error && (
        <div style={{
          textAlign: "center",
          padding: "40px",
          fontSize: "1.1rem",
          color: "#ef4444",
          backgroundColor: "#fee2e2",
          borderRadius: "8px",
          margin: "20px"
        }}>
          ❌ Error: {error}
        </div>
      )}
      {!loading && prices.length === 0 && (
        <div style={{
          textAlign: "center",
          padding: "40px",
          fontSize: "1.1rem",
          color: "#94a3b8",
          backgroundColor: "#f8fafc",
          borderRadius: "8px",
          margin: "20px"
        }}>
          📊 No data available. Please ensure the server is running.
        </div>
      )}
      
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
          <div className="filter-group" style={{ position: 'relative' }}>
            <div className="filter-label">Product</div>
            <div className="filter-select-wrapper" style={{ flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Filter size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search product..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  onFocus={() => setShowProductSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowProductSuggestions(false), 150)}
                  className="filter-select"
                  style={{ minWidth: 220 }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setProductSearch('');
                    setSelectedCommodity('all');
                    setSelectedSizeLabel('');
                    setSelectedBrand('all');
                    setShowProductSuggestions(false);
                  }}
                  className="chart-download-button"
                  title="Clear product"
                >
                  Clear
                </button>
              </div>
              {showProductSuggestions && filteredCommodities.length > 0 && (
                <div style={{ maxHeight: 180, overflowY: 'auto', border: '1px solid #e6eef8', background: '#fff', marginTop: 6, borderRadius: 6 }}>
                  {filteredCommodities.map(c => (
                    <div key={c} onMouseDown={(e) => { e.preventDefault(); skipBrandEffectRef.current = true; setSelectedBrand('all'); setSelectedCommodity(c); setProductSearch(c); setSelectedSizeLabel(''); setShowProductSuggestions(false); }} style={{ padding: '6px 10px', cursor: 'pointer' }}>
                      {c}
                    </div>
                  ))}
                </div>
              )}
              {/* show available sizes/units for the selected commodity */}
              {availableSizeLabels.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {availableSizeLabels.map(lbl => {
                    const active = selectedSizeLabel === lbl;
                    return (
                      <div
                        key={lbl}
                        onClick={() => setSelectedSizeLabel(active ? '' : lbl)}
                        style={{
                          background: active ? '#2563eb' : '#eef2ff',
                          color: active ? '#fff' : '#1e293b',
                          padding: '4px 8px',
                          borderRadius: 999,
                          fontSize: '0.85rem',
                          cursor: 'pointer',
                          border: active ? '1px solid #1e40af' : '1px solid transparent'
                        }}
                      >
                        {lbl}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="filter-group">
            <div className="filter-label">Brand</div>
            <div className="filter-select-wrapper">
              <Filter size={16} color="#94a3b8" />
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="filter-select"
              >
                {availableBrands.map((b) => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* GLOBAL FILTERS (corrected) */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", padding: "8px 12px", backgroundColor: "#f8fafc", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
            <div style={{ fontSize: "13px", fontWeight: 600, color: "#64748b", textTransform: "uppercase" }}>Filter By:</div>
            <select style={selectStyle} value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
              <option value="all">All years</option>
              {yearsAndMonths.years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select style={selectStyle} value={fromMonth} onChange={(e) => setFromMonth(e.target.value)}>
              <option value="">From Month</option>
              {yearsAndMonths.months.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
            <select style={selectStyle} value={toMonth} onChange={(e) => setToMonth(e.target.value)}>
              <option value="">To Month</option>
              {yearsAndMonths.months.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>

          {/* Sizes filter removed per request */}
        </div>
        <div className="filter-tag">Filtered: {filterLabel}</div>

        {!chartsReady && (
          <div style={{
            textAlign: "center",
            padding: "60px 40px",
            fontSize: "0.95rem",
            color: "#64748b",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "400px"
          }}>
            <Loader size={32} style={{ marginBottom: "16px", animation: "spin 1s linear infinite" }} />
            <p style={{ fontWeight: "500" }}>Preparing charts...</p>
          </div>
        )}

        {chartsReady && <>
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
            {(timeSeriesData.length > 0 || timeSeriesBySize.length > 0) ? (
            <ResponsiveContainer width="100%" height={420}>
              <LineChart data={timeSeriesBySize.length > 0 && availableSizeLabels.length > 0 ? timeSeriesBySize : timeSeriesData} margin={{ top: 5, right: 30, left: 0, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" interval={0} />
                <YAxis stroke="#64748b" style={{ fontSize: "0.85rem" }} label={{ value: "Prevailing Price (Php)", angle: -90, position: "insideLeft" }} />
                <Tooltip formatter={(value) => `Php ${value.toFixed ? value.toFixed(2) : value}`} contentStyle={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                <Legend />
                {timeSeriesBySize.length > 0 && availableSizeLabels.length > 0 ? (
                  availableSizeLabels.map((lbl, idx) => (
                    <Line key={lbl} type="monotone" dataKey={lbl} stroke={lineColors[idx % lineColors.length]} strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name={lbl} />
                  ))
                ) : (
                  <Line type="monotone" dataKey="avgPrice" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} name="Prevailing Price" />
                )}
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
            <div className="chart-title">Top Movers Analysis</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => downloadChart(highestChartRef, "TopIncreases")} className="chart-download-button" title="Download increases chart">
                <Download size={14} />
              </button>
              <button onClick={() => downloadChart(lowestChartRef, "TopLowestIncreases")} className="chart-download-button" title="Download lowest increases chart">
                <Download size={14} />
              </button>
            </div>
          </div>

            <div style={{ display: "flex", gap: "16px", marginTop: "16px" }}>
            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 8, fontSize: "0.95rem", fontWeight: 600 }}>Top 5 highest increasing items</div>
              <div style={{ fontSize: "0.9rem", color: "#64748b", marginTop: 6 }}>
                Commodity: {selectedCommodity === 'all' ? 'All' : selectedCommodity}
              </div>
              <div ref={highestChartRef}>
                {topMovers.topUp.length > 0 ? (
                  <ResponsiveContainer width="100%" height={420}>
                    <BarChart data={topMovers.topUp.map(item => ({ name: item.key.replace(/_/g, " • "), change: item.change }))} margin={{ top: 5, right: 30, left: 0, bottom: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis stroke="#64748b" style={{ fontSize: "0.85rem" }} />
                      <Tooltip formatter={(value) => `Php ${Number(value).toFixed(2)}`} contentStyle={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                      <Legend verticalAlign="top" height={36} />
                      <Bar dataKey="change" fill="#16a34a" name="Increase (Php)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data-message">No increase data available.</div>
                )}
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ marginBottom: 8, fontSize: "0.95rem", fontWeight: 600 }}>Top 5 lowest increasing items</div>
              <div style={{ fontSize: "0.9rem", color: "#64748b", marginTop: 6 }}>
                Commodity: {selectedCommodity === 'all' ? 'All' : selectedCommodity}
              </div>
              <div ref={lowestChartRef}>
                {topMovers.lowestIncreases.length > 0 ? (
                  <ResponsiveContainer width="100%" height={420}>
                    <BarChart data={topMovers.lowestIncreases.map(item => ({ name: item.key.replace(/_/g, " • "), change: item.change }))} margin={{ top: 5, right: 30, left: 0, bottom: 100 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                      <YAxis stroke="#64748b" style={{ fontSize: "0.85rem" }} />
                      <Tooltip formatter={(value) => `Php ${Number(value).toFixed(2)}`} contentStyle={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                        <Legend verticalAlign="top" height={36} />
                        <Bar dataKey="change" fill="#f59e0b" name="Lowest Increase (Php)" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="no-data-message">No decrease data available.</div>
                )}
              </div>
            </div>
          </div>

          {/* Additional chart: Top 5 highest decreasing items */}
          <div style={{ marginTop: 20 }}>
            <div style={{ marginBottom: 8, fontSize: "0.95rem", fontWeight: 600 }}>Top 5 highest decreasing items</div>
            <div style={{ fontSize: "0.9rem", color: "#64748b", marginTop: 6 }}>Commodity: {selectedCommodity === 'all' ? 'All' : selectedCommodity}</div>
            <div ref={decreasingChartRef} style={{ marginTop: 8 }}>
              {topMovers.highestDecreases.length > 0 ? (
                <ResponsiveContainer width="100%" height={420}>
                  <BarChart data={topMovers.highestDecreases.map(item => ({ name: item.key.replace(/_/g, " • "), change: item.change }))} margin={{ top: 5, right: 30, left: 0, bottom: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                    <YAxis stroke="#64748b" style={{ fontSize: "0.85rem" }} />
                    <Tooltip formatter={(value) => `Php ${Number(value).toFixed(2)}`} contentStyle={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }} />
                    <Legend verticalAlign="top" height={36} />
                    <Bar dataKey="change" fill="#ef4444" name="Decrease (Php)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="no-data-message">No decrease data available.</div>
              )}
            </div>
          </div>
        </div>
        </>}
      </div>
        </>
      )}
    </div>
  );
}
