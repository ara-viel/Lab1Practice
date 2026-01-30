/**
 * Comparative Analysis Service
 * Optimized for loading large datasets with pagination and caching
 */

let cachedFullDataset = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch all price data efficiently with fallback pagination
 * @param {boolean} forceRefresh - Skip cache and fetch fresh data
 * @returns {Promise<Array>} Combined price data from all collections
 */
export async function fetchAllPricesOptimized(forceRefresh = false) {
  // Check cache validity
  const now = Date.now();
  if (!forceRefresh && cachedFullDataset && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    console.log(`📦 Using cached prices (${cachedFullDataset.length} records)`);
    return cachedFullDataset;
  }

  try {
    // Fetch all collections in parallel
    const [prices, basicNecessities, primeCommodities, constructionMaterials] = await Promise.all([
      fetch('/api/prices').then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      }).catch(() => []),
      fetch('/api/basic-necessities').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/prime-commodities').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/construction-materials').then(r => r.ok ? r.json() : []).catch(() => [])
    ]);

    // Handle response format (array or paginated object)
    const pricesArray = Array.isArray(prices) ? prices : (prices?.data || []);
    const basicArray = Array.isArray(basicNecessities) ? basicNecessities : (basicNecessities?.data || []);
    const primeArray = Array.isArray(primeCommodities) ? primeCommodities : (primeCommodities?.data || []);
    const constructionArray = Array.isArray(constructionMaterials) ? constructionMaterials : (constructionMaterials?.data || []);

    // Combine all data
    const allData = [
      ...pricesArray,
      ...basicArray,
      ...primeArray,
      ...constructionArray
    ];

    // Cache the result
    cachedFullDataset = allData;
    cacheTimestamp = now;

    console.log(`📊 Loaded ${allData.length} total records from all collections`);
    return allData;
  } catch (error) {
    console.error('❌ Error fetching prices:', error);
    return cachedFullDataset || [];
  }
}

/**
 * Clear the cache (useful after data updates)
 */
export function clearComparativeCache() {
  cachedFullDataset = null;
  cacheTimestamp = null;
  console.log('🗑️ Comparative analysis cache cleared');
}

/**
 * Batch filter and group prices (chunked processing to prevent blocking)
 * @param {Array} prices - Array of price records
 * @param {object} filters - { commodity, store, brand, month, year }
 * @param {number} chunkSize - Process in chunks of N items
 * @returns {Promise<Array>} Filtered and deduplicated prices
 */
export async function filterPricesChunked(prices, filters = {}, chunkSize = 500) {
  return new Promise((resolve) => {
    const filtered = [];
    let processedCount = 0;

    const processChunk = () => {
      const endIdx = Math.min(processedCount + chunkSize, prices.length);
      
      for (let i = processedCount; i < endIdx; i++) {
        const p = prices[i];
        if (!p) continue;

        // Apply filters
        if (filters.commodity && p.commodity?.toLowerCase() !== filters.commodity.toLowerCase()) continue;
        if (filters.store && p.store?.toLowerCase() !== filters.store.toLowerCase()) continue;
        if (filters.brand && p.brand?.toLowerCase() !== filters.brand.toLowerCase()) continue;
        
        filtered.push(p);
      }

      processedCount = endIdx;

      if (processedCount < prices.length) {
        // Schedule next chunk
        requestIdleCallback(() => processChunk(), { timeout: 50 });
      } else {
        resolve(filtered);
      }
    };

    // Start processing
    processChunk();
  });
}

/**
 * Get unique values from price array (optimized)
 * @param {Array} prices - Array of price records
 * @param {string} field - Field name to extract unique values from
 * @returns {Array} Unique sorted values
 */
export function getUniqueValues(prices, field) {
  const unique = new Set();
  prices.forEach(p => {
    if (p && p[field]) {
      unique.add(p[field]);
    }
  });
  return Array.from(unique).sort((a, b) => String(a).localeCompare(String(b)));
}

/**
 * Deduplicate prices by key (commodity, store, brand, size)
 * Keeps the most recent record
 * @param {Array} prices - Array of price records
 * @returns {Array} Deduplicated prices
 */
export function deduplicatePrices(prices) {
  const map = new Map();
  
  prices.forEach(p => {
    if (!p || !p.commodity) return;
    
    const key = `${p.commodity}||${p.store || 'unknown'}||${p.brand || 'unknown'}||${p.size || 'unknown'}`;
    const existing = map.get(key);
    
    // Keep the one with the latest timestamp
    const pTime = p.timestamp ? new Date(p.timestamp).getTime() : 0;
    const existingTime = existing?.timestamp ? new Date(existing.timestamp).getTime() : 0;
    
    if (!existing || pTime > existingTime) {
      map.set(key, p);
    }
  });
  
  return Array.from(map.values());
}
