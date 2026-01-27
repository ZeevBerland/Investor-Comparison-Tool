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
 * Parse CSV text directly (faster than creating File objects)
 * Uses worker thread for large files to avoid blocking UI
 * @param {string} csvText - The CSV text content
 * @param {boolean} useWorker - Whether to use web worker (for large files)
 * @returns {Promise<Array>} - Array of row objects
 */
export function parseCSVText(csvText, useWorker = false) {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      worker: useWorker,
      complete: (results) => {
        if (results.errors.length > 0 && results.errors.length < 10) {
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
 * Parse large CSV with streaming (memory efficient)
 * @param {string} csvText - The CSV text content  
 * @param {function} onProgress - Progress callback (0-100)
 * @returns {Promise<Array>} - Array of row objects
 */
export function parseCSVStreaming(csvText, onProgress = null) {
  return new Promise((resolve, reject) => {
    const rows = [];
    const totalSize = csvText.length;
    let processedSize = 0;
    let lastProgress = 0;
    
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      step: (result, parser) => {
        if (result.data) {
          rows.push(result.data);
        }
        // Update progress roughly
        processedSize += 100; // Approximate bytes per row
        if (onProgress) {
          const progress = Math.min(99, Math.floor((processedSize / totalSize) * 100));
          if (progress > lastProgress + 5) {
            lastProgress = progress;
            onProgress(progress);
          }
        }
      },
      complete: () => {
        if (onProgress) onProgress(100);
        resolve(rows);
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
