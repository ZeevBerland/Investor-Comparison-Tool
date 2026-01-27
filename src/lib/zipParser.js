import JSZip from 'jszip';
import { parseCSVText } from './csvParser';

/**
 * Mapping of filename patterns to data types
 * Ordered by priority - smaller/required files first for faster perceived load
 */
const FILE_TYPE_PATTERNS = [
  { pattern: 'indices_eod', type: 'indices', required: true, priority: 1 },
  { pattern: 'trade_securities', type: 'securities', required: false, priority: 2 },
  { pattern: 'menora_transactions', type: 'transactions', required: true, priority: 3 },
  { pattern: 'trading_eod', type: 'trading', required: true, priority: 4 },
  { pattern: 'smart_money_eod', type: 'smartmoney', required: false, priority: 5 },
];

/**
 * Extract the filename from a path (handles nested folders)
 */
function getFileName(path) {
  const parts = path.split('/');
  return parts[parts.length - 1];
}

/**
 * Match a filename to a data type
 */
function matchFileType(filename) {
  const lowerName = filename.toLowerCase();
  return FILE_TYPE_PATTERNS.find(p => lowerName.includes(p.pattern.toLowerCase()));
}

/**
 * Extract and parse all CSV files from a ZIP archive
 * Optimized with parallel processing and progress reporting
 * @param {File|Blob} zipFile - The ZIP file to extract
 * @param {function} onProgress - Progress callback ({ phase, file, percent })
 * @returns {Promise<object>} - Object with parsed data for each type
 */
export async function extractAndParseZip(zipFile, onProgress = null) {
  const report = (phase, file = '', percent = 0) => {
    if (onProgress) onProgress({ phase, file, percent });
  };

  report('extracting', '', 0);
  
  // Load ZIP with progress
  const zip = await JSZip.loadAsync(zipFile, {
    // This doesn't provide granular progress but at least we know it's working
  });
  
  report('extracting', '', 50);

  const results = {
    transactions: null,
    trading: null,
    indices: null,
    securities: null,
    smartmoney: null,
  };
  
  const fileInfo = {
    transactions: null,
    trading: null,
    indices: null,
    securities: null,
    smartmoney: null,
  };
  
  // Get all CSV files from the ZIP and match to types
  const csvFiles = [];
  zip.forEach((relativePath, zipEntry) => {
    if (!zipEntry.dir && relativePath.toLowerCase().endsWith('.csv')) {
      const filename = getFileName(relativePath);
      const matchedType = matchFileType(filename);
      if (matchedType) {
        csvFiles.push({ 
          path: relativePath, 
          entry: zipEntry, 
          filename,
          type: matchedType.type,
          priority: matchedType.priority,
        });
      }
    }
  });

  // Sort by priority (smaller files first)
  csvFiles.sort((a, b) => a.priority - b.priority);
  
  report('extracting', '', 100);

  // Process files - extract text content in parallel for speed
  report('parsing', '', 0);
  
  const totalFiles = csvFiles.length;
  let processedFiles = 0;

  // Extract all files to text in parallel (this is fast)
  const extractPromises = csvFiles.map(async (file) => {
    const content = await file.entry.async('text');
    return { ...file, content };
  });
  
  const extractedFiles = await Promise.all(extractPromises);
  
  report('parsing', '', 20);

  // Parse files sequentially to avoid memory spikes, but could parallelize smaller ones
  for (const file of extractedFiles) {
    try {
      report('parsing', file.filename, Math.floor(20 + (processedFiles / totalFiles) * 80));
      
      // Use worker for large files (> 10MB of text)
      const useWorker = file.content.length > 10 * 1024 * 1024;
      const data = await parseCSVText(file.content, useWorker);
      
      results[file.type] = data;
      fileInfo[file.type] = {
        name: file.filename,
        rows: data.length,
        path: file.path,
      };
      
      // Free memory
      file.content = null;
      
      processedFiles++;
    } catch (error) {
      console.error(`Error parsing ${file.filename}:`, error);
    }
  }
  
  report('complete', '', 100);
  
  // Check for required files
  const missingRequired = FILE_TYPE_PATTERNS
    .filter(p => p.required && !results[p.type])
    .map(p => p.pattern);
  
  if (missingRequired.length > 0) {
    console.warn('Missing required files:', missingRequired);
  }
  
  return {
    data: results,
    fileInfo: fileInfo,
    missingRequired: missingRequired,
  };
}

/**
 * Get list of expected file patterns for user guidance
 */
export function getExpectedFiles() {
  return FILE_TYPE_PATTERNS.map(p => ({
    pattern: p.pattern,
    type: p.type,
    required: p.required,
  }));
}
