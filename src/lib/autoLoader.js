import { extractAndParseZip } from './zipParser';

/**
 * Auto-load data from the bundled menora_data.zip file
 * This fetches the ZIP from the public folder and extracts all CSVs
 * @param {function} onProgress - Progress callback ({ phase, message, percent })
 * @returns {Promise<object>} - Parsed data from the ZIP
 */
export async function autoLoadData(onProgress = null) {
  const report = (phase, message, percent) => {
    if (onProgress) onProgress({ phase, message, percent });
  };

  try {
    report('download', 'Downloading data archive...', 0);
    
    // Fetch ZIP from Vercel Blob storage with progress tracking
    const response = await fetch('https://gle5y2rdkn5p66fn.public.blob.vercel-storage.com/menora_data.zip');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ZIP: ${response.status} ${response.statusText}`);
    }
    
    // Get content length for progress
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength, 10) : 0;
    
    let loaded = 0;
    const reader = response.body.getReader();
    const chunks = [];
    
    // Read with progress
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      chunks.push(value);
      loaded += value.length;
      
      if (total > 0) {
        const percent = Math.floor((loaded / total) * 100);
        report('download', `Downloading... ${Math.floor(loaded / 1024 / 1024)}MB / ${Math.floor(total / 1024 / 1024)}MB`, percent);
      } else {
        report('download', `Downloading... ${Math.floor(loaded / 1024 / 1024)}MB`, 50);
      }
    }
    
    // Combine chunks into blob
    const blob = new Blob(chunks);
    report('download', 'Download complete', 100);
    
    // Extract and parse with progress
    const result = await extractAndParseZip(blob, (progress) => {
      if (progress.phase === 'extracting') {
        report('extract', 'Extracting archive...', progress.percent);
      } else if (progress.phase === 'parsing') {
        const file = progress.file ? `: ${progress.file}` : '';
        report('parse', `Parsing data${file}`, progress.percent);
      } else if (progress.phase === 'complete') {
        report('complete', 'Loading complete!', 100);
      }
    });
    
    return result;
  } catch (error) {
    console.error('Auto-load failed:', error);
    throw error;
  }
}
