import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * Parse CSV file
 */
export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: false,
      skipEmptyLines: false,
      complete: (results) => {
        const rows = results.data;
        const parsedData = parseDTIFormat(rows);
        console.log(`📊 CSV: Parsed ${parsedData.length} records`);
        resolve(parsedData);
      },
      error: reject
    });
  });
};

/**
 * Main DTI format parser
 * Handles format:
 * BASIC NECESSITIES | PRODUCT NAME | UNIT | SRP | Store1 | Store2 | Store3 | ...
 */
const parseDTIFormat = (rows, sheetName = '') => {
  console.log('🔍 Parsing DTI format...');
  
  const parsedData = [];
  let headerRow = null;
  let headerRowIdx = -1;
  let categoryBrand = '';
  
  // Find header row - starts with BASIC NECESSITIES or PRIME COMMODITIES
  // Also check column 0 for these keywords anywhere in the row (headers might be shifted)
  for (let i = 0; i < Math.min(50, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    
    // Check all cells in this row for category keywords
    let foundCategory = '';
    for (let j = 0; j < row.length; j++) {
      const cell = String(row[j] || '').trim().toUpperCase();
      if (cell === 'BASIC NECESSITIES' || cell === 'PRIME COMMODITIES') {
        foundCategory = cell;
        break;
      }
    }
    
    if (foundCategory) {
      // Verify this row also has "PRODUCT NAME" - confirms it's the header
      const rowStr = row.map(c => String(c || '').toUpperCase()).join('|');
      if (rowStr.includes('PRODUCT NAME') || rowStr.includes('PRODUCT')) {
        headerRow = rows[i];
        headerRowIdx = i;
        categoryBrand = foundCategory;
        console.log(`✅ Found header row at ${i}: ${categoryBrand}`);
        break;
      }
    }
  }
  
  if (!headerRow) {
    console.log('❌ No DTI header found');
    return [];
  }
  
  // Extract month and year from sheet name first (most reliable), then rows, then default
  // Prioritize sheet name for year since it's most accurate (e.g., "PMR 2023_ILIGAN" = 2023)
  let fileMonth = extractMonthFromSheetName(sheetName) || extractMonthFromRows(rows) || 'January';
  let fileYear = extractYearFromSheetName(sheetName) || '2023';  // Default to 2023, don't scan rows for year
  
  console.log(`📅 Date: ${fileMonth} ${fileYear}`);
  
  // Parse header to find column indices
  const headers = headerRow.map(h => String(h || '').trim());
  const productNameCol = 1;  // Column B - PRODUCT NAME
  const unitCol = 2;          // Column C - UNIT (goes to SIZE)
  const srpCol = 3;           // Column D - SRP
  
  // Store columns start at column 4 (E) and continue until we hit metadata/empty
  const storeColumns = [];
  for (let col = srpCol + 1; col < headers.length; col++) {
    const header = headers[col].trim();
    
    // Stop at metadata columns or date patterns (e.g., "SRP as of Feb. 8, 2023", "Feb 2020")
    if (header === '' || header.includes('Remarks') || header.includes('No. of') ||
        header.includes('Average') || header.includes('Modality') || header.includes('Max Value') ||
        header.includes('PF') || header.includes('vs. SRP') || header.includes('SRP as of') ||
        /\d{4}|^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)/.test(header.toUpperCase())) {
      break;
    }
    
    if (header && header.length > 0) {
      storeColumns.push({ index: col, name: header });
    }
  }
  
  console.log(`✅ Found ${storeColumns.length} stores: ${storeColumns.map(s => s.name).slice(0, 5).join(', ')}...`);
  
  // Track current commodity group (like "Canned Sardines in tomato sauce")
  let currentCommodityGroup = '';
  
  // Process data rows
  for (let rowIdx = headerRowIdx + 1; rowIdx < rows.length; rowIdx++) {
    const row = rows[rowIdx];
    
    if (!row || row.length === 0) continue;
    
    const col0 = String(row[0] || '').trim();
    const col1 = String(row[1] || '').trim();
    
    // Check if this is another category marker (stop processing)
    if (col0 === 'PRIME COMMODITIES' || col0 === 'CONSTRUCTION MATERIALS') {
      break;
    }
    
    // If column 0 has text but column 1 is empty OR no valid SRP, this is a commodity group header
    const col3 = String(row[srpCol] || '').trim();

    // Treat as a group header only when column 1 (product name) is empty.
    // Do NOT require SRP to be present; products with missing SRP should still be parsed.
    if (col0 && col0 !== '' && (!col1 || col1 === '')) {
      currentCommodityGroup = col0;
      console.log(`🍱 Commodity group: ${currentCommodityGroup}`);
      continue;
    }
    
    // If we have col0 text and it's different from the product name, use it as commodity group
    if (col0 && col0 !== '' && col1 && col0 !== col1 && col0.length > 10) {
      currentCommodityGroup = col0;
    }
    
    // Extract product data
    const productName = col1;
    const unit = String(row[unitCol] || '').trim();
    const srpStr = String(row[srpCol] || '').trim();
    
    // Skip if no product name
    if (!productName || productName === '') continue;
    
    const srpNum = srpStr === '' ? '' : parsePrice(srpStr);
    
    console.log(`📦 Processing: ${productName} (${unit}) - SRP: ${srpNum} - Variant: ${currentCommodityGroup}`);
    
    // Process each store column
    for (const store of storeColumns) {
      if (store.index >= row.length) continue;
      
      const priceStr = String(row[store.index] || '').trim();
      
      // Skip empty prices
      if (!priceStr || priceStr === '' || priceStr === '#N/A' || priceStr === '#DIV/0!') continue;
      
      const price = parsePrice(priceStr);
      
      // Skip invalid prices
      if (isNaN(price) || price <= 0) continue;
      
      parsedData.push({
        brand: categoryBrand,                           // BASIC NECESSITIES
        commodity: productName,                         // King Cup Sardines (Non-Easy Open)
        variant: currentCommodityGroup,                 // Canned Sardines in tomato sauce
        size: unit,                                     // 155g
        store: store.name,                              // PureGold, Ma. Del Carmen Mart, etc.
        price: price,
        srp: srpNum,
        month: fileMonth,
        years: fileYear,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  console.log(`✅ Parsed ${parsedData.length} records`);
  return parsedData;
};

/**
 * Parse price value
 */
const parsePrice = (priceValue) => {
  if (!priceValue || priceValue === '' || priceValue === '#N/A' || priceValue === '#DIV/0!') {
    return 0;
  }
  
  if (typeof priceValue === 'number') {
    return isNaN(priceValue) ? 0 : Number(priceValue.toFixed(2));
  }
  
  const priceStr = String(priceValue)
    .replace(/[₱$,]/g, '')
    .trim();
  
  if (priceStr === '' || priceStr === '-') return 0;
  
  const price = parseFloat(priceStr);
  return isNaN(price) ? 0 : Number(price.toFixed(2));
};

/**
 * Extract year from sheet name (e.g., "PER STORE_JAN (2023)" → "2023")
 */
const extractYearFromSheetName = (sheetName) => {
  const yearMatch = String(sheetName).match(/\b(20\d{2})\b/);
  return yearMatch ? yearMatch[1] : '';
};

/**
 * Extract year from data rows (look for year patterns in first few rows)
 */
const extractYearFromRows = (rows) => {
  // Check first 10 rows for year patterns like "2023", "(2023)", etc.
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    
    for (let j = 0; j < row.length; j++) {
      const cellValue = String(row[j] || '');
      const yearMatch = cellValue.match(/\b(20\d{2})\b/);
      if (yearMatch && yearMatch[1] !== '2026') {
        return yearMatch[1];
      }
    }
  }
  return '';
};

/**
 * Extract month from data rows (look for month patterns in first few rows)
 */
const extractMonthFromRows = (rows) => {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];
  const monthAbbrev = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                       'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  
  // Check first 10 rows for month patterns
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const row = rows[i];
    if (!row) continue;
    
    for (let j = 0; j < row.length; j++) {
      const cellValue = String(row[j] || '').toUpperCase();
      
      // Check for full month names
      for (const month of months) {
        if (cellValue.includes(month.toUpperCase())) {
          return month;
        }
      }
      
      // Check for abbreviated month names
      for (let k = 0; k < monthAbbrev.length; k++) {
        if (cellValue.includes(monthAbbrev[k])) {
          return months[k];
        }
      }
    }
  }
  return '';
};

/**
 * Extract month from sheet name (e.g., "PER STORE_JAN" → "January")
 */
const extractMonthFromSheetName = (sheetName) => {
  const monthMap = {
    'JAN': 'January', 'FEB': 'February', 'MAR': 'March', 'APR': 'April',
    'MAY': 'May', 'JUN': 'June', 'JUL': 'July', 'AUG': 'August',
    'SEP': 'September', 'OCT': 'October', 'NOV': 'November', 'DEC': 'December'
  };
  
  const sheetUpper = String(sheetName).toUpperCase();
  
  for (const [short, long] of Object.entries(monthMap)) {
    if (sheetUpper.includes(short)) {
      return long;
    }
  }
  
  return '';
};

/**
 * Parse XLSX file
 */
export const parseXLSX = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        const allParsedData = [];
        
        // Process each sheet
        workbook.SheetNames.forEach(sheetName => {
          console.log(`\n📊 Processing sheet: ${sheetName}`);
          
          const worksheet = workbook.Sheets[sheetName];
          const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          
          const parsedData = parseDTIFormat(rawRows, sheetName);
          allParsedData.push(...parsedData);
          console.log(`✅ Sheet ${sheetName}: ${parsedData.length} records`);
        });
        
        console.log(`\n📊 TOTAL: ${allParsedData.length} records`);
        resolve(allParsedData);
      } catch (error) {
        console.error('❌ Error parsing XLSX:', error);
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

/**
 * Main import function
 */
export const importFile = async (file) => {
  const fileName = file.name.toLowerCase();
  console.log(`📁 Importing file: ${fileName}`);
  
  if (fileName.endsWith('.csv')) {
    return await parseCSV(file);
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return await parseXLSX(file);
  } else {
    throw new Error('Unsupported file format. Please use CSV or XLSX.');
  }
};

export default { parseCSV, parseXLSX, importFile };