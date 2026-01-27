/**
 * Smart Money Analysis Utilities
 * Calculates sentiment and patterns from institutional trading data
 */

// Client type definitions
export const CLIENT_TYPES = {
  F: { id: 'F', name: 'Pension/Insurance', description: 'קרן פנסיה/קופת גמל/חברת ביטוח', isSmartMoney: true },
  M: { id: 'M', name: 'Mutual Funds', description: 'משקיע מוסדי מסוג קרן נאמנות', isSmartMoney: true },
  N: { id: 'N', name: 'Nostro', description: 'נוסטרו', isSmartMoney: true },
  P: { id: 'P', name: 'Portfolio Managers', description: 'מנהל תיקים/לקוח מנוהל', isSmartMoney: true },
  O: { id: 'O', name: 'Foreign Investors', description: 'תושב חוץ', isSmartMoney: true },
  D: { id: 'D', name: 'Foreign Individual', description: 'תושב חוץ - יחיד', isSmartMoney: false },
  G: { id: 'G', name: 'Foreign Other', description: 'תושב חוץ - אחר', isSmartMoney: false },
  E: { id: 'E', name: 'ETF/Market Maker', description: 'קרן סל/עושה שוק', isSmartMoney: false },
  Z: { id: 'Z', name: 'Israeli Retail', description: 'משקיע ישראלי', isSmartMoney: false },
  A: { id: 'A', name: 'Israeli Individual', description: 'תושב ישראל - יחיד', isSmartMoney: false },
  B: { id: 'B', name: 'Israeli Corporate', description: 'תושב ישראל - תאגיד', isSmartMoney: false },
};

// Smart money types (institutional investors)
export const SMART_MONEY_TYPES = ['F', 'M', 'N', 'P', 'O'];

/**
 * Calculate sentiment score: (Buy - Sell) / (Buy + Sell)
 * Returns value between -1 (all sell) and +1 (all buy)
 * @param {number} buyAmount - Buy turnover in NIS
 * @param {number} sellAmount - Sell turnover in NIS
 * @returns {number} - Sentiment score between -1 and 1
 */
export function calculateSentiment(buyAmount, sellAmount) {
  const total = buyAmount + sellAmount;
  if (total === 0) return 0;
  return (buyAmount - sellAmount) / total;
}

/**
 * Get sentiment level based on score
 * @param {number} sentiment - Sentiment score (-1 to 1)
 * @returns {string} - 'STRONG_BUY', 'BUY', 'NEUTRAL', 'SELL', 'STRONG_SELL'
 */
export function getSentimentLevel(sentiment) {
  if (sentiment >= 0.7) return 'STRONG_BUY';
  if (sentiment >= 0.3) return 'BUY';
  if (sentiment >= -0.3) return 'NEUTRAL';
  if (sentiment >= -0.7) return 'SELL';
  return 'STRONG_SELL';
}

/**
 * Get alert level for portfolio monitoring based on sentiment
 * @param {number} sentiment - Sentiment score
 * @returns {string} - 'RED', 'YELLOW', 'GREEN'
 */
export function getSentimentAlertLevel(sentiment) {
  if (sentiment < -0.7) return 'RED';
  if (sentiment < -0.4) return 'YELLOW';
  return 'GREEN';
}

/**
 * Get traffic light color for trade checker
 * @param {boolean} isBuy - Is the user buying
 * @param {number} institutionalSentiment - Combined institutional sentiment
 * @returns {object} - { color: 'GREEN'|'YELLOW'|'RED', label, recommendation }
 */
export function getTrafficLight(isBuy, institutionalSentiment) {
  const userDirection = isBuy ? 1 : -1;
  const alignment = userDirection * institutionalSentiment;
  
  if (alignment > 0.3) {
    return {
      color: 'GREEN',
      label: 'Aligned',
      recommendation: 'PROCEED',
      message: 'Your trade direction matches smart money sentiment',
    };
  } else if (alignment > -0.3) {
    return {
      color: 'YELLOW',
      label: 'Mixed',
      recommendation: 'ADJUST',
      message: 'Mixed signals from institutional investors',
    };
  } else {
    return {
      color: 'RED',
      label: 'Counter',
      recommendation: 'RECONSIDER',
      message: 'Your trade opposes smart money sentiment',
    };
  }
}

/**
 * Aggregate smart money data by security and date
 * @param {Array} smartMoneyData - Raw smart money EOD data
 * @param {Map} securityToIsin - Map of securityId to ISIN
 * @returns {Map} - Map of "ISIN_DATE" to aggregated sentiment data
 */
export function aggregateSmartMoneyData(smartMoneyData, securityToIsin) {
  const aggregated = new Map();
  
  for (const row of smartMoneyData) {
    const isin = securityToIsin.get(String(row.securityId));
    if (!isin) continue;
    
    const dateStr = row.tradeDate.split('T')[0].split(' ')[0];
    const key = `${isin}_${dateStr}`;
    
    if (!aggregated.has(key)) {
      aggregated.set(key, {
        isin,
        date: dateStr,
        byType: {},
        totalBuy: 0,
        totalSell: 0,
        smartMoneyBuy: 0,
        smartMoneySell: 0,
      });
    }
    
    const entry = aggregated.get(key);
    const buyNis = parseFloat(row.turnoverBuyNis) || 0;
    const sellNis = parseFloat(row.turnoverSellNis) || 0;
    const clientType = row.clientTypeId;
    
    // Store by type
    if (!entry.byType[clientType]) {
      entry.byType[clientType] = { buy: 0, sell: 0 };
    }
    entry.byType[clientType].buy += buyNis;
    entry.byType[clientType].sell += sellNis;
    
    // Aggregate totals
    entry.totalBuy += buyNis;
    entry.totalSell += sellNis;
    
    // Aggregate smart money (institutional) totals
    if (SMART_MONEY_TYPES.includes(clientType)) {
      entry.smartMoneyBuy += buyNis;
      entry.smartMoneySell += sellNis;
    }
  }
  
  // Calculate sentiments
  for (const [key, entry] of aggregated) {
    entry.totalSentiment = calculateSentiment(entry.totalBuy, entry.totalSell);
    entry.smartMoneySentiment = calculateSentiment(entry.smartMoneyBuy, entry.smartMoneySell);
    
    // Calculate per-type sentiments
    entry.typeSentiments = {};
    for (const [type, data] of Object.entries(entry.byType)) {
      entry.typeSentiments[type] = calculateSentiment(data.buy, data.sell);
    }
  }
  
  return aggregated;
}

/**
 * Detect selling patterns over multiple days
 * @param {Array} dailyData - Array of daily sentiment data sorted by date
 * @param {number} consecutiveDays - Number of consecutive sell days to flag
 * @param {number} volumeSpikeThreshold - Volume spike multiplier (e.g., 2 = 2x average)
 * @returns {object} - { consecutiveSellDays, hasVolumeSpike, avgVolume, latestVolume }
 */
export function detectSellingPattern(dailyData, consecutiveDays = 3, volumeSpikeThreshold = 2) {
  if (!dailyData || dailyData.length === 0) {
    return { consecutiveSellDays: 0, hasVolumeSpike: false };
  }
  
  // Count consecutive sell days (smart money sentiment < 0)
  let consecutiveSellDays = 0;
  for (let i = dailyData.length - 1; i >= 0; i--) {
    if (dailyData[i].smartMoneySentiment < 0) {
      consecutiveSellDays++;
    } else {
      break;
    }
  }
  
  // Check for volume spike
  const volumes = dailyData.map(d => d.smartMoneyBuy + d.smartMoneySell);
  const avgVolume = volumes.slice(0, -1).reduce((a, b) => a + b, 0) / Math.max(volumes.length - 1, 1);
  const latestVolume = volumes[volumes.length - 1] || 0;
  const hasVolumeSpike = avgVolume > 0 && latestVolume > avgVolume * volumeSpikeThreshold;
  
  return {
    consecutiveSellDays,
    hasVolumeSpike,
    avgVolume,
    latestVolume,
    flagged: consecutiveSellDays >= consecutiveDays || hasVolumeSpike,
  };
}

/**
 * Get historical data for a security over a date range
 * @param {Map} aggregatedData - Aggregated smart money data
 * @param {string} isin - Security ISIN
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {number} lookbackDays - Number of days to look back
 * @returns {Array} - Array of daily data sorted by date
 */
export function getHistoricalData(aggregatedData, isin, endDate, lookbackDays = 30) {
  const results = [];
  const endDateObj = new Date(endDate);
  
  for (let i = 0; i < lookbackDays; i++) {
    const checkDate = new Date(endDateObj);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    const key = `${isin}_${dateStr}`;
    
    if (aggregatedData.has(key)) {
      results.unshift(aggregatedData.get(key));
    }
  }
  
  return results;
}

/**
 * Calculate win rate when trading against a specific client type
 * @param {Array} trades - Array of trades with outcome data
 * @param {string} clientType - Client type to analyze
 * @param {boolean} againstSentiment - Whether to calculate rate when trading against sentiment
 * @returns {object} - { winRate, totalTrades, wins, losses }
 */
export function calculateWinRateAgainstType(trades, clientType, againstSentiment = true) {
  const relevantTrades = trades.filter(trade => {
    const typeSentiment = trade.typeSentiments?.[clientType];
    if (typeSentiment === undefined) return false;
    
    const userDirection = trade.isBuy ? 1 : -1;
    const isAgainst = userDirection * typeSentiment < 0;
    
    return againstSentiment ? isAgainst : !isAgainst;
  });
  
  const wins = relevantTrades.filter(t => t.outcome > 0).length;
  const losses = relevantTrades.filter(t => t.outcome <= 0).length;
  const total = relevantTrades.length;
  
  return {
    winRate: total > 0 ? (wins / total) * 100 : 0,
    totalTrades: total,
    wins,
    losses,
  };
}

/**
 * Analyze historical outcomes after similar sentiment patterns
 * @param {Map} aggregatedData - Aggregated smart money data
 * @param {Array} tradingData - Trading EOD data for price changes
 * @param {string} isin - Security ISIN
 * @param {number} sentimentThreshold - Sentiment threshold to match
 * @param {number} lookforwardDays - Days to look forward for outcome
 * @returns {object} - Historical pattern analysis
 */
export function analyzePatternOutcomes(aggregatedData, tradingData, isin, sentimentThreshold = -0.5, lookforwardDays = 5) {
  const isinClean = isin.toUpperCase();
  const outcomes = [];
  
  // Build a map of trading data by ISIN and date
  const tradingMap = new Map();
  tradingData.forEach(row => {
    const rowIsin = String(row.isin).trim().toUpperCase();
    const dateStr = row.tradeDate.split('T')[0].split(' ')[0];
    tradingMap.set(`${rowIsin}_${dateStr}`, row);
  });
  
  // Find all dates where sentiment was below threshold for this ISIN
  const matchingDates = [];
  for (const [key, entry] of aggregatedData) {
    if (entry.isin === isinClean && entry.smartMoneySentiment <= sentimentThreshold) {
      matchingDates.push(entry);
    }
  }
  
  // Sort by date
  matchingDates.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Calculate outcomes for each pattern occurrence
  for (const entry of matchingDates) {
    const startDate = new Date(entry.date);
    let cumulativeChange = 0;
    let daysWithData = 0;
    
    // Look forward N days
    for (let i = 1; i <= lookforwardDays; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(checkDate.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];
      const key = `${isinClean}_${dateStr}`;
      
      const dayData = tradingMap.get(key);
      if (dayData) {
        cumulativeChange += parseFloat(dayData.change) || 0;
        daysWithData++;
      }
    }
    
    if (daysWithData > 0) {
      outcomes.push({
        date: entry.date,
        sentiment: entry.smartMoneySentiment,
        outcomeChange: cumulativeChange,
        daysWithData,
        isPositive: cumulativeChange > 0,
      });
    }
  }
  
  // Calculate statistics
  const totalPatterns = outcomes.length;
  const positiveOutcomes = outcomes.filter(o => o.isPositive).length;
  const negativeOutcomes = outcomes.filter(o => !o.isPositive).length;
  const avgChange = totalPatterns > 0 
    ? outcomes.reduce((sum, o) => sum + o.outcomeChange, 0) / totalPatterns 
    : 0;
  
  return {
    totalPatterns,
    positiveOutcomes,
    negativeOutcomes,
    declineRate: totalPatterns > 0 ? (negativeOutcomes / totalPatterns) * 100 : 0,
    avgChange,
    recentOutcomes: outcomes.slice(-5), // Last 5 occurrences
    lookforwardDays,
    sentimentThreshold,
  };
}

/**
 * Calculate historical performance when trading with/against smart money
 * @param {Array} transactions - User transactions
 * @param {Map} aggregatedData - Aggregated smart money data
 * @param {Array} tradingData - Trading EOD data
 * @param {number} holdingDays - Days to calculate outcome
 * @returns {object} - Performance analysis
 */
export function calculateHistoricalPerformance(transactions, aggregatedData, tradingData, holdingDays = 5) {
  const results = {
    withSmartMoney: { trades: 0, wins: 0, totalReturn: 0 },
    againstSmartMoney: { trades: 0, wins: 0, totalReturn: 0 },
    neutral: { trades: 0, wins: 0, totalReturn: 0 },
    byType: {},
  };
  
  // Initialize by type
  SMART_MONEY_TYPES.forEach(type => {
    results.byType[type] = {
      with: { trades: 0, wins: 0 },
      against: { trades: 0, wins: 0 },
    };
  });
  
  // Build trading map
  const tradingMap = new Map();
  tradingData.forEach(row => {
    const rowIsin = String(row.isin).trim().toUpperCase();
    const dateStr = row.tradeDate.split('T')[0].split(' ')[0];
    tradingMap.set(`${rowIsin}_${dateStr}`, row);
  });
  
  for (const tx of transactions) {
    const isin = String(tx.ISIN).trim().toUpperCase();
    let dateStr = tx.OrderDate;
    
    // Parse date
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    } else {
      dateStr = dateStr.split('T')[0].split(' ')[0];
    }
    
    const sentimentKey = `${isin}_${dateStr}`;
    const sentiment = aggregatedData.get(sentimentKey);
    
    if (!sentiment) continue;
    
    const isBuy = tx.Action.toLowerCase().includes('buy') || 
                  tx.Action.includes('קניה') || 
                  tx.Action.includes('קנייה');
    const userDirection = isBuy ? 1 : -1;
    
    // Calculate outcome
    let cumulativeChange = 0;
    const startDate = new Date(dateStr);
    
    for (let i = 1; i <= holdingDays; i++) {
      const checkDate = new Date(startDate);
      checkDate.setDate(checkDate.getDate() + i);
      const checkDateStr = checkDate.toISOString().split('T')[0];
      const dayData = tradingMap.get(`${isin}_${checkDateStr}`);
      if (dayData) {
        cumulativeChange += parseFloat(dayData.change) || 0;
      }
    }
    
    const outcome = userDirection * cumulativeChange; // Positive if trade direction matches price movement
    const isWin = outcome > 0;
    
    // Categorize by alignment with smart money
    const alignment = userDirection * sentiment.smartMoneySentiment;
    
    if (alignment > 0.1) {
      results.withSmartMoney.trades++;
      results.withSmartMoney.totalReturn += outcome;
      if (isWin) results.withSmartMoney.wins++;
    } else if (alignment < -0.1) {
      results.againstSmartMoney.trades++;
      results.againstSmartMoney.totalReturn += outcome;
      if (isWin) results.againstSmartMoney.wins++;
    } else {
      results.neutral.trades++;
      results.neutral.totalReturn += outcome;
      if (isWin) results.neutral.wins++;
    }
    
    // Track by type
    SMART_MONEY_TYPES.forEach(type => {
      const typeSentiment = sentiment.typeSentiments?.[type];
      if (typeSentiment === undefined) return;
      
      const typeAlignment = userDirection * typeSentiment;
      if (typeAlignment > 0.1) {
        results.byType[type].with.trades++;
        if (isWin) results.byType[type].with.wins++;
      } else if (typeAlignment < -0.1) {
        results.byType[type].against.trades++;
        if (isWin) results.byType[type].against.wins++;
      }
    });
  }
  
  // Calculate win rates
  results.withSmartMoney.winRate = results.withSmartMoney.trades > 0 
    ? (results.withSmartMoney.wins / results.withSmartMoney.trades) * 100 : 0;
  results.againstSmartMoney.winRate = results.againstSmartMoney.trades > 0 
    ? (results.againstSmartMoney.wins / results.againstSmartMoney.trades) * 100 : 0;
  results.neutral.winRate = results.neutral.trades > 0 
    ? (results.neutral.wins / results.neutral.trades) * 100 : 0;
  
  SMART_MONEY_TYPES.forEach(type => {
    const typeData = results.byType[type];
    typeData.with.winRate = typeData.with.trades > 0 
      ? (typeData.with.wins / typeData.with.trades) * 100 : 0;
    typeData.against.winRate = typeData.against.trades > 0 
      ? (typeData.against.wins / typeData.against.trades) * 100 : 0;
  });
  
  return results;
}

/**
 * Build security ID to ISIN mapping from trade_securities data
 * @param {Array} securitiesData - Trade securities CSV data
 * @returns {Map} - Map of securityId to ISIN
 */
export function buildSecurityToIsinMap(securitiesData) {
  const map = new Map();
  
  for (const row of securitiesData) {
    if (row.securityId && row.isin) {
      map.set(String(row.securityId), String(row.isin).trim().toUpperCase());
    }
  }
  
  return map;
}

/**
 * Build ISIN to security info mapping
 * @param {Array} securitiesData - Trade securities CSV data
 * @returns {Map} - Map of ISIN to security info
 */
export function buildIsinToSecurityMap(securitiesData) {
  const map = new Map();
  
  for (const row of securitiesData) {
    if (row.isin) {
      const isin = String(row.isin).trim().toUpperCase();
      map.set(isin, {
        securityId: row.securityId,
        symbol: row.symbol,
        securityName: row.securityName,
        companyName: row.companyName,
        sector: row.companySector,
        subSector: row.companySubSector,
      });
    }
  }
  
  return map;
}
