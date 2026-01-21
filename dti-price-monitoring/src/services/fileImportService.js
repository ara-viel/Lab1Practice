import Papa from 'papaparse';
import * as XLSX from 'xlsx';

/**
 * Parse CSV file and preserve all columns dynamically
 */
export const parseCSV = (file) => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data.map((row) => {
          // Convert all fields, keeping original names and trying to parse numbers
          const converted = {};
          Object.entries(row).forEach(([key, value]) => {
            const keyLower = key.trim().toLowerCase();
            // Keep size, brand, variant, store, commodity, month as strings always
            if (['size', 'brand', 'variant', 'store', 'commodity', 'month', 'years'].includes(keyLower)) {
              converted[key.trim()] = String(value || '').trim();
            } else {
              // Try to parse as number for price field
              const numValue = parseFloat(value);
              converted[key.trim()] = !isNaN(numValue) && String(value).trim() !== '' ? numValue : value;
            }
          });
          return converted;
        }).filter(item => Object.keys(item).length > 0 && Object.values(item).some(v => v !== ''));

        resolve(data);
      },
      error: (error) => reject(error)
    });
  });
};

/**
 * Parse XLSX file and preserve all columns dynamically
 */
export const parseXLSX = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);

        const parsedData = rows.map((row) => {
          // Convert all fields, keeping original names and trying to parse numbers
          const converted = {};
          Object.entries(row).forEach(([key, value]) => {
            const keyLower = key.trim().toLowerCase();
            // Keep size, brand, variant, store, commodity, month as strings always
            if (['size', 'brand', 'variant', 'store', 'commodity', 'month', 'years'].includes(keyLower)) {
              converted[key.trim()] = String(value || '').trim();
            } else {
              // Try to parse as number for price field
              const numValue = parseFloat(value);
              converted[key.trim()] = !isNaN(numValue) && String(value).trim() !== '' ? numValue : value;
            }
          });
          return converted;
        }).filter(item => Object.keys(item).length > 0 && Object.values(item).some(v => v !== ''));

        resolve(parsedData);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

/**
 * Import file and determine format
 */
export const importFile = async (file) => {
  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.csv')) {
    return await parseCSV(file);
  } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return await parseXLSX(file);
  } else {
    throw new Error('Unsupported file format. Please use CSV or XLSX.');
  }
};
