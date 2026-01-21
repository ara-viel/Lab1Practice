/**
 * Data Validator & Normalizer
 * Handles inconsistent data formats and validates fields
 */

export const DataValidator = {
  // Normalize commodity name (consistent case, trim whitespace)
  normalizeCommodity: (value) => {
    if (!value) return "";
    return String(value)
      .trim()
      .toLowerCase()
      .split(" ")
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  },

  // Normalize store/location name
  normalizeStore: (value) => {
    if (!value) return "";
    return String(value)
      .trim()
      .toUpperCase();
  },

  // Normalize municipality (title case, remove extra spaces)
  normalizeMunicipality: (value) => {
    if (!value) return "";
    return String(value)
      .trim()
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  },

  // Normalize price (remove currency symbols, convert to number)
  normalizePrice: (value) => {
    if (!value && value !== 0) return 0;
    
    // Remove common currency symbols and whitespace
    const cleaned = String(value)
      .replace(/[₱$€¥]/g, "")
      .replace(/,/g, "")
      .trim();
    
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : parseFloat(num.toFixed(2));
  },

  // Normalize date (convert various formats to ISO string)
  normalizeDate: (value) => {
    if (!value) return new Date().toISOString();
    
    try {
      let date;
      
      // If already a valid date
      if (value instanceof Date) {
        date = value;
      } else {
        const str = String(value).trim();
        
        // Try parsing different formats
        date = new Date(str);
        
        // If invalid, try other formats
        if (isNaN(date.getTime())) {
          // Try MM/DD/YYYY
          const parts = str.split("/");
          if (parts.length === 3) {
            date = new Date(parts[2], parts[0] - 1, parts[1]);
          }
          
          // Try DD-MM-YYYY
          const parts2 = str.split("-");
          if (parts2.length === 3 && isNaN(date.getTime())) {
            date = new Date(parts2[2], parts2[1] - 1, parts2[0]);
          }
        }
      }
      
      return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    } catch (e) {
      console.warn("Invalid date format:", value);
      return new Date().toISOString();
    }
  },

  // Validate individual record
  validateRecord: (record) => {
    const errors = [];
    
    // Required fields
    if (!record.commodity || record.commodity.toString().trim() === "") {
      errors.push("Commodity is required");
    }
    if (!record.price && record.price !== 0) {
      errors.push("Price is required");
    } else if (isNaN(DataValidator.normalizePrice(record.price))) {
      errors.push("Price must be a valid number");
    }
    
    // Price validation
    if (record.price && DataValidator.normalizePrice(record.price) < 0) {
      errors.push("Price cannot be negative");
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Clean and normalize entire record
  cleanRecord: (record) => {
    if (!record || typeof record !== "object") {
      return null;
    }

    return {
      commodity: DataValidator.normalizeCommodity(record.commodity),
      brand: record.brand ? String(record.brand).trim() : "",
      price: DataValidator.normalizePrice(record.price),
      month: record.month ? String(record.month).trim() : "",
      years: record.years ? String(record.years).trim() : new Date().getFullYear().toString(),
      size: record.size ? String(record.size).trim() : "",
      store: DataValidator.normalizeStore(record.store || ""),
      variant: record.variant ? String(record.variant).trim() : "",
      timestamp: DataValidator.normalizeDate(record.timestamp)
    };
  },

  // Validate and clean batch of records
  validateBatch: (records) => {
    if (!Array.isArray(records)) {
      return { valid: [], invalid: [] };
    }

    const valid = [];
    const invalid = [];

    records.forEach((record, index) => {
      const cleaned = DataValidator.cleanRecord(record);
      
      if (!cleaned) {
        invalid.push({
          row: index + 1,
          record,
          errors: ["Record is empty or invalid"]
        });
        return;
      }

      const validation = DataValidator.validateRecord(cleaned);
      
      if (validation.isValid) {
        valid.push(cleaned);
      } else {
        invalid.push({
          row: index + 1,
          record: cleaned,
          errors: validation.errors
        });
      }
    });

    return { valid, invalid };
  },

  // Detect duplicate records (optimized)
  findDuplicates: (records) => {
    const seen = new Map();
    const duplicates = [];

    records.forEach((record, index) => {
      const key = `${record.commodity}|${record.brand}|${record.store}|${record.variant}|${record.price}`;
      
      if (seen.has(key)) {
        duplicates.push({
          current: { ...record, rowIndex: index },
          previous: { ...seen.get(key).record, rowIndex: seen.get(key).index }
        });
      } else {
        seen.set(key, { record, index });
      }
    });

    return duplicates;
  },

  // Generate data quality report (optimized for new schema)
  generateQualityReport: (records) => {
    const report = {
      totalRecords: records.length,
      byMunicipality: {},
      byCommodity: {},
      priceRange: { min: Infinity, max: -Infinity },
      missingFields: {
        brand: 0,
        store: 0,
        variant: 0,
        month: 0,
        years: 0
      }
    };

    records.forEach(record => {
      // By store (replacing municipality grouping)
      if (record.store) {
        report.byMunicipality[record.store] = 
          (report.byMunicipality[record.store] || 0) + 1;
      }

      // By commodity
      if (record.commodity) {
        report.byCommodity[record.commodity] = 
          (report.byCommodity[record.commodity] || 0) + 1;
      }

      // Price range
      if (record.price && !isNaN(record.price)) {
        report.priceRange.min = Math.min(report.priceRange.min, record.price);
        report.priceRange.max = Math.max(report.priceRange.max, record.price);
      }

      // Missing fields
      if (!record.brand) report.missingFields.brand++;
      if (!record.store) report.missingFields.store++;
      if (!record.variant) report.missingFields.variant++;
      if (!record.month) report.missingFields.month++;
      if (!record.years) report.missingFields.years++;
    });

    return report;
  }
};

export default DataValidator;
