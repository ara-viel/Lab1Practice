/**
 * Utility functions for flexible schema handling
 */

/**
 * Extract all unique column names from data array
 */
export const getDynamicColumns = (data) => {
  if (!data || data.length === 0) return [];
  
  const columnSet = new Set();
  data.forEach(item => {
    Object.keys(item).forEach(key => {
      if (key !== 'id' && key !== '_id' && key !== '__v') {
        columnSet.add(key);
      }
    });
  });
  
  return Array.from(columnSet);
};

/**
 * Get columns in a preferred order (common columns first)
 */
export const getOrderedColumns = (data) => {
  const allColumns = getDynamicColumns(data);
  // New schema order: BRAND, COMMODITY, MONTH, PRICE, SIZE, STORE, VARIANT, YEARS
  const preferredOrder = ['brand', 'commodity', 'month', 'price', 'size', 'store', 'variant', 'years', 'timestamp'];
  
  // Sort with preferred order first, then rest alphabetically
  const ordered = [];
  
  preferredOrder.forEach(col => {
    if (allColumns.includes(col)) {
      ordered.push(col);
      allColumns.splice(allColumns.indexOf(col), 1);
    }
  });
  
  // Add remaining columns alphabetically
  allColumns.sort().forEach(col => ordered.push(col));
  
  return ordered;
};

/**
 * Format column name for display
 */
export const formatColumnName = (columnName) => {
  return columnName
    .replace(/([A-Z])/g, ' $1') // Add space before capitals
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/^./, str => str.toUpperCase()) // Capitalize first letter
    .trim();
};

/**
 * Format cell value for display
 */
export const formatCellValue = (value, columnName) => {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  
  if (columnName.toLowerCase().includes('price') || columnName.toLowerCase().includes('srp')) {
    return typeof value === 'number' ? `₱${value.toFixed(2)}` : value;
  }
  
  if (columnName.toLowerCase().includes('timestamp') || columnName.toLowerCase().includes('date')) {
    return new Date(value).toLocaleDateString();
  }
  
  return String(value);
};

/**
 * Check if column is numeric
 */
export const isNumericColumn = (values) => {
  return values.every(v => typeof v === 'number' || !isNaN(parseFloat(v)));
};
