import { isCounterMarket, getAlertLevel, isBuyAction } from './analysis';

/**
 * Check a single trade for counter-market alert using INDEX data
 * @param {string} isin - Security ISIN
 * @param {string} action - Trade action (buy/sell)
 * @param {string} date - Trade date (YYYY-MM-DD)
 * @param {Array} tradingData - Trading EOD data (for security info)
 * @param {Array} indicesData - Indices EOD data
 * @param {string} selectedIndex - Selected index ID
 * @returns {Object} - Alert result
 */
export function checkTradeWithIndex(isin, action, date, tradingData, indicesData, selectedIndex) {
  // Normalize inputs
  const isinClean = String(isin).trim().toUpperCase();
  const dateClean = date.split('T')[0];
  
  // Find security data for symbol info
  const securityData = tradingData.find(row => {
    const rowIsin = String(row.isin).trim().toUpperCase();
    const rowDate = row.tradeDate.split('T')[0].split(' ')[0];
    return rowIsin === isinClean && rowDate === dateClean;
  });
  
  // Find index data for the date
  const indexData = indicesData.find(row => {
    const rowDate = row.tradeDate.split('T')[0].split(' ')[0];
    return String(row.indexId) === String(selectedIndex) && rowDate === dateClean;
  });
  
  if (!indexData) {
    return {
      found: false,
      isin: isinClean,
      action,
      date: dateClean,
      symbol: securityData?.symbol || 'N/A',
      marketChange: null,
      securityChange: securityData?.change || null,
      isCounter: false,
      alertLevel: 'NONE',
      message: 'No index data found for this date',
    };
  }
  
  const indexChange = parseFloat(indexData.change) || 0;
  const securityChange = securityData ? parseFloat(securityData.change) || 0 : null;
  const isCounter = isCounterMarket(action, indexChange);
  const alertLevel = getAlertLevel(isCounter, Math.abs(indexChange));
  
  const direction = indexChange > 0 ? 'UP' : indexChange < 0 ? 'DOWN' : 'FLAT';
  const isBuy = isBuyAction(action);
  
  let message;
  if (alertLevel === 'HIGH') {
    message = `STRONG COUNTER-MARKET: ${isBuy ? 'Buying' : 'Selling'} while index is ${direction} ${Math.abs(indexChange).toFixed(2)}%`;
  } else if (alertLevel === 'MEDIUM') {
    message = `Counter-market: ${isBuy ? 'Buying' : 'Selling'} while index is ${direction} ${Math.abs(indexChange).toFixed(2)}%`;
  } else if (alertLevel === 'LOW') {
    message = `Slight counter-market: ${isBuy ? 'Buying' : 'Selling'} while index is ${direction} ${Math.abs(indexChange).toFixed(2)}%`;
  } else {
    message = `Trade aligned with market (index ${indexChange >= 0 ? '+' : ''}${indexChange.toFixed(2)}%)`;
  }
  
  return {
    found: true,
    isin: isinClean,
    action,
    date: dateClean,
    symbol: securityData?.symbol || isinClean,
    marketChange: indexChange,
    securityChange,
    isCounter,
    alertLevel,
    message,
  };
}

/**
 * Check a single trade for counter-market alert (legacy - uses security data)
 * @param {string} isin - Security ISIN
 * @param {string} action - Trade action (buy/sell)
 * @param {string} date - Trade date (YYYY-MM-DD)
 * @param {Array} tradingData - Trading EOD data
 * @returns {Object} - Alert result
 */
export function checkTrade(isin, action, date, tradingData) {
  // Normalize inputs
  const isinClean = String(isin).trim().toUpperCase();
  const dateClean = date.split('T')[0];
  
  // Find market data for this ISIN and date
  const marketData = tradingData.find(row => {
    const rowIsin = String(row.isin).trim().toUpperCase();
    const rowDate = row.tradeDate.split('T')[0].split(' ')[0];
    return rowIsin === isinClean && rowDate === dateClean;
  });
  
  if (!marketData) {
    return {
      found: false,
      isin: isinClean,
      action,
      date: dateClean,
      symbol: 'N/A',
      marketChange: null,
      isCounter: false,
      alertLevel: 'NONE',
      message: 'No market data found for this security and date',
    };
  }
  
  const marketChange = parseFloat(marketData.change) || 0;
  const isCounter = isCounterMarket(action, marketChange);
  const alertLevel = getAlertLevel(isCounter, Math.abs(marketChange));
  
  const direction = marketChange > 0 ? 'UP' : marketChange < 0 ? 'DOWN' : 'FLAT';
  const isBuy = isBuyAction(action);
  
  let message;
  if (alertLevel === 'HIGH') {
    message = `STRONG COUNTER-MARKET: ${isBuy ? 'Buying' : 'Selling'} while market is ${direction} ${Math.abs(marketChange).toFixed(1)}%`;
  } else if (alertLevel === 'MEDIUM') {
    message = `Counter-market: ${isBuy ? 'Buying' : 'Selling'} while market is ${direction} ${Math.abs(marketChange).toFixed(1)}%`;
  } else if (alertLevel === 'LOW') {
    message = `Slight counter-market: ${isBuy ? 'Buying' : 'Selling'} while market is ${direction} ${Math.abs(marketChange).toFixed(1)}%`;
  } else {
    message = `Trade aligned with market direction (${marketChange >= 0 ? '+' : ''}${marketChange.toFixed(1)}%)`;
  }
  
  return {
    found: true,
    isin: isinClean,
    action,
    date: dateClean,
    symbol: marketData.symbol || isinClean,
    marketChange,
    isCounter,
    alertLevel,
    message,
  };
}

/**
 * Scan portfolio for momentum alerts with index comparison
 * @param {Array<string>} isins - List of ISINs to check
 * @param {string} date - Date to check
 * @param {number} threshold - Momentum threshold percentage
 * @param {Array} tradingData - Trading EOD data
 * @param {Array} indicesData - Indices EOD data (optional)
 * @param {string} selectedIndex - Selected index ID (optional)
 * @returns {Object} - Alerts and noAlerts arrays
 */
export function scanPortfolio(isins, date, threshold, tradingData, indicesData = [], selectedIndex = null) {
  const dateClean = date.split('T')[0];
  const alerts = [];
  const noAlerts = [];
  
  // Find index data for the date
  let indexChange = null;
  if (indicesData && selectedIndex) {
    const indexData = indicesData.find(row => {
      const rowDate = row.tradeDate.split('T')[0].split(' ')[0];
      return String(row.indexId) === String(selectedIndex) && rowDate === dateClean;
    });
    if (indexData) {
      indexChange = parseFloat(indexData.change) || 0;
    }
  }
  
  for (const isin of isins) {
    const isinClean = String(isin).trim().toUpperCase();
    if (!isinClean) continue;
    
    // Find market data
    const marketData = tradingData.find(row => {
      const rowIsin = String(row.isin).trim().toUpperCase();
      const rowDate = row.tradeDate.split('T')[0].split(' ')[0];
      return rowIsin === isinClean && rowDate === dateClean;
    });
    
    if (!marketData) {
      noAlerts.push({
        isin: isinClean,
        symbol: 'N/A',
        change: null,
        indexChange,
        status: 'No Data',
      });
      continue;
    }
    
    const change = parseFloat(marketData.change) || 0;
    const absChange = Math.abs(change);
    const symbol = marketData.symbol || isinClean;
    
    // Calculate relative change (vs index)
    const relativeChange = indexChange != null ? change - indexChange : null;
    
    if (absChange >= threshold) {
      const direction = change > 0 ? 'UP' : 'DOWN';
      const level = absChange > 3 ? 'HIGH' : 'MEDIUM';
      
      alerts.push({
        isin: isinClean,
        symbol,
        change,
        indexChange,
        relativeChange,
        direction,
        level,
        message: `${symbol} is ${direction} ${absChange.toFixed(1)}% today`,
      });
    } else {
      noAlerts.push({
        isin: isinClean,
        symbol,
        change,
        indexChange,
        relativeChange,
        status: 'Normal',
      });
    }
  }
  
  // Sort alerts by absolute change (strongest first)
  alerts.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  
  return { alerts, noAlerts, indexChange };
}
