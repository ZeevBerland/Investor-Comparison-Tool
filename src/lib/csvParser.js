import Papa from 'papaparse';

/**
 * Parse a CSV file and return the data
 * @param {File} file - The CSV file to parse
 * @returns {Promise<Array>} - Array of row objects
 */
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          console.warn('CSV parsing warnings:', results.errors);
        }
        resolve(results.data);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Detect which type of CSV file was uploaded
 * @param {Array} data - Parsed CSV data
 * @returns {string} - 'transactions', 'trading', 'indices', or 'unknown'
 */
export function detectFileType(data) {
  if (!data || data.length === 0) return 'unknown';
  
  const columns = Object.keys(data[0]);
  
  // Check for transaction file columns
  if (columns.some(c => c === 'ISIN' || c === 'Action' || c === 'OrderDate')) {
    return 'transactions';
  }
  
  // Check for indices EOD file columns (has indexId, closingIndexPrice)
  if (columns.some(c => c === 'indexId' || c === 'closingIndexPrice')) {
    return 'indices';
  }
  
  // Check for trading EOD file columns
  if (columns.some(c => c === 'isin' || c === 'tradeDate' || c === 'change')) {
    return 'trading';
  }
  
  return 'unknown';
}
