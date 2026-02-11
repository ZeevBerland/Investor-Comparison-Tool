/**
 * Smart Money Analysis Utilities
 * Calculates sentiment and patterns from institutional trading data
 */

// Client type definitions
export const CLIENT_TYPES = {
  F: { id: 'F', name: 'Pension/Insurance', shortName: 'Pension', description: 'קרן פנסיה/קופת גמל/חברת ביטוח', isSmartMoney: true },
  M: { id: 'M', name: 'Mutual Funds', shortName: 'Mutual', description: 'משקיע מוסדי מסוג קרן נאמנות', isSmartMoney: true },
  N: { id: 'N', name: 'Nostro', shortName: 'Nostro', description: 'נוסטרו', isSmartMoney: true },
  P: { id: 'P', name: 'Portfolio Managers', shortName: 'Portfolio', description: 'מנהל תיקים/לקוח מנוהל', isSmartMoney: true },
  O: { id: 'O', name: 'Foreign Investors', shortName: 'Foreign', description: 'תושב חוץ', isSmartMoney: true },
  D: { id: 'D', name: 'Foreign Individual', shortName: 'Foreign Indiv', description: 'תושב חוץ - יחיד', isSmartMoney: false },
  G: { id: 'G', name: 'Foreign Other', shortName: 'Foreign Other', description: 'תושב חוץ - אחר', isSmartMoney: false },
  E: { id: 'E', name: 'ETF/Market Maker', shortName: 'ETF/MM', description: 'קרן סל/עושה שוק', isSmartMoney: false },
  Z: { id: 'Z', name: 'Israeli Retail', shortName: 'IL Retail', description: 'משקיע ישראלי', isSmartMoney: false },
  A: { id: 'A', name: 'Israeli Individual', shortName: 'IL Indiv', description: 'תושב ישראל - יחיד', isSmartMoney: false },
  B: { id: 'B', name: 'Israeli Corporate', shortName: 'IL Corp', description: 'תושב ישראל - תאגיד', isSmartMoney: false },
};

// Smart money types (institutional investors)
export const SMART_MONEY_TYPES = ['F', 'M', 'N', 'P', 'O'];

/**
 * Calculate sentiment score: (Buy - Sell) / (Buy + Sell)
 * Returns value between -1 (all sell) and +1 (all buy)
 * @param {number} buyAmount - Buy turnover in NIS
 * @param {number} sellAmount - Sell turnover in NIS
 * @returns {number|null} - Sentiment score between -1 and 1, or null if no data
 */
export function calculateSentiment(buyAmount, sellAmount) {
  const total = buyAmount + sellAmount;
  if (total === 0) return null; // No trading data
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
 * @param {number|null} institutionalSentiment - Combined institutional sentiment
 * @returns {object} - { color: 'GREEN'|'YELLOW'|'RED'|'GRAY', label, recommendation }
 */
export function getTrafficLight(isBuy, institutionalSentiment, weightedSentiment = null) {
  // Use EDA-weighted sentiment as primary signal when available (aligns with EDA insights)
  // Falls back to raw composite if weighted is not provided
  const primarySentiment = (weightedSentiment !== null && weightedSentiment !== undefined)
    ? weightedSentiment
    : institutionalSentiment;

  // Check for no data case
  if (primarySentiment === null || primarySentiment === undefined) {
    return {
      color: 'GRAY',
      label: 'No Data',
      recommendation: 'NONE',
      message: 'No institutional trading data available for this security',
    };
  }
  
  const userDirection = isBuy ? 1 : -1;
  const alignment = userDirection * primarySentiment;
  
  if (alignment > 0.3) {
    return {
      color: 'GREEN',
      label: 'Aligned',
      recommendation: 'PROCEED',
      message: 'Your trade direction aligns with EDA-weighted institutional sentiment',
    };
  } else if (alignment > -0.3) {
    return {
      color: 'YELLOW',
      label: 'Mixed',
      recommendation: 'ADJUST',
      message: 'Mixed signals from EDA-weighted institutional analysis',
    };
  } else {
    return {
      color: 'RED',
      label: 'Counter',
      recommendation: 'RECONSIDER',
      message: 'Your trade opposes EDA-weighted institutional sentiment',
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
    if (typeSentiment === undefined || typeSentiment === null) return false;
    
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
      if (typeSentiment === undefined || typeSentiment === null) return;
      
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

// ============================================================================
// FOREIGN FLOW ANALYSIS (EDA Phase 1: Foreign Other (G) has +5.760% spread)
// ============================================================================

// Foreign investor types for separate tracking
export const FOREIGN_FLOW_TYPE = 'G'; // Foreign Other - the USEFUL predictor

/**
 * EDA-derived constants for Foreign Other (G) predictive power
 * Source: smart_money_eda.ipynb Section 9
 */
export const FOREIGN_FLOW_EDA = {
  spread: 5.760,         // % quintile spread
  bullWinRate: 52.3,     // % bull win rate
  bearWinRate: 42.7,     // % bear win rate
  correlation: 0.0126,   // correlation with 5-day forward returns
  verdict: 'USEFUL',
  // Multi-period analysis
  periods: [
    { days: 1,  spread: 12.429, corr: 0.0332 },
    { days: 3,  spread: 5.849,  corr: 0.0145 },
    { days: 5,  spread: 4.953,  corr: 0.0126 },
    { days: 10, spread: 4.674,  corr: 0.0099 },
    { days: 20, spread: 2.035,  corr: 0.0055 },
  ],
  // Correlation with smart money types (negative = contrarian)
  correlations: {
    F: -0.428, // Pension/Insurance - moderate negative
    M: -0.362, // Mutual Funds - moderate negative
    N: +0.023, // Nostro - weak positive
    P: -0.150, // Portfolio Managers - weak negative
  },
  disagreementRate: 42.2, // % of days foreign vs local disagree
};

/**
 * EDA-derived quintile boundaries and expected returns for smart money sentiment
 * Source: smart_money_eda.ipynb Section 4 (Quintile Analysis)
 */
export const SENTIMENT_QUINTILES = [
  { quintile: 'Q1', label: 'Most Bearish', min: -1.0,  max: -0.6, avgReturn: 0.071, winRate: 48.6 },
  { quintile: 'Q2', label: 'Bearish',      min: -0.6,  max: -0.2, avgReturn: 0.068, winRate: 48.2 },
  { quintile: 'Q3', label: 'Neutral',      min: -0.2,  max: 0.2,  avgReturn: 0.065, winRate: 47.8 },
  { quintile: 'Q4', label: 'Bullish',      min: 0.2,   max: 0.6,  avgReturn: 0.068, winRate: 48.3 },
  { quintile: 'Q5', label: 'Most Bullish', min: 0.6,   max: 1.0,  avgReturn: 0.066, winRate: 48.0 },
];

/**
 * EDA-derived predictive quality rating for each investor type
 * Source: smart_money_eda.ipynb Sections 4 & 9
 */
export const TYPE_PREDICTIVE_QUALITY = {
  G: { quality: 'STRONG',   label: 'Strong Signal',   spread: 5.760,  color: 'green' },
  F: { quality: 'MODERATE', label: 'Moderate Signal',  spread: null,   color: 'yellow' },
  M: { quality: 'MODERATE', label: 'Moderate Signal',  spread: null,   color: 'yellow' },
  N: { quality: 'MODERATE', label: 'Moderate Signal',  spread: null,   color: 'yellow' },
  P: { quality: 'WEAK',     label: 'Weak Signal',      spread: null,   color: 'gray' },
  O: { quality: 'WEAK',     label: 'Weak Signal',      spread: null,   color: 'gray' },
};

/**
 * EDA-derived day-of-week foreign investor patterns
 * Source: smart_money_eda.ipynb Section 9.5
 */
export const FOREIGN_DAY_OF_WEEK = {
  0: { name: 'Sunday',    buyRatio: 46.1, note: 'Lowest foreign buy ratio' },
  1: { name: 'Monday',    buyRatio: 47.6, note: null },
  2: { name: 'Tuesday',   buyRatio: 47.0, note: null },
  3: { name: 'Wednesday', buyRatio: 46.8, note: null },
  4: { name: 'Thursday',  buyRatio: 47.1, note: 'Highest foreign volume day' },
};

/**
 * Calculate Foreign Flow signal for type G (Foreign Other)
 * EDA Finding: G has +5.760% predictive spread, 52.3% bull win rate
 * @param {object} sentimentEntry - Aggregated sentiment entry (from aggregateSmartMoneyData)
 * @returns {object|null} - Foreign flow signal analysis
 */
export function calculateForeignFlowSignal(sentimentEntry) {
  if (!sentimentEntry || !sentimentEntry.byType) return null;
  
  const gData = sentimentEntry.byType[FOREIGN_FLOW_TYPE];
  if (!gData) return null;
  
  const gSentiment = calculateSentiment(gData.buy, gData.sell);
  if (gSentiment === null) return null;
  
  const smartMoneySentiment = sentimentEntry.smartMoneySentiment;
  
  // Determine direction
  let direction = 'NEUTRAL';
  if (gSentiment > 0.1) direction = 'BULLISH';
  else if (gSentiment < -0.1) direction = 'BEARISH';
  
  // Determine strength
  let strength = 'WEAK';
  if (Math.abs(gSentiment) >= 0.7) strength = 'STRONG';
  else if (Math.abs(gSentiment) >= 0.3) strength = 'MODERATE';
  
  // Check for contrarian signal (foreign vs smart money disagreement)
  let isContrarian = false;
  let contrarianDetail = null;
  if (smartMoneySentiment !== null && smartMoneySentiment !== undefined) {
    const smartMoneyDirection = smartMoneySentiment > 0.1 ? 1 : smartMoneySentiment < -0.1 ? -1 : 0;
    const foreignDirection = gSentiment > 0.1 ? 1 : gSentiment < -0.1 ? -1 : 0;
    
    if (smartMoneyDirection !== 0 && foreignDirection !== 0 && smartMoneyDirection !== foreignDirection) {
      isContrarian = true;
      contrarianDetail = `Foreign investors are ${direction.toLowerCase()} while smart money is ${smartMoneySentiment > 0 ? 'bullish' : 'bearish'} (disagree ${FOREIGN_FLOW_EDA.disagreementRate}% of days historically)`;
    }
  }
  
  return {
    sentiment: gSentiment,
    direction,
    strength,
    buyVolume: gData.buy,
    sellVolume: gData.sell,
    isContrarian,
    contrarianDetail,
    eda: FOREIGN_FLOW_EDA,
  };
}

/**
 * Map a sentiment value to its EDA-derived quintile and expected return
 * @param {number} sentiment - Sentiment score (-1 to 1)
 * @returns {object} - Quintile info with expected return and win rate
 */
export function getSentimentQuintile(sentiment) {
  if (sentiment === null || sentiment === undefined) {
    return { quintile: 'N/A', label: 'No Data', avgReturn: 0, winRate: 0 };
  }
  
  for (const q of SENTIMENT_QUINTILES) {
    if (sentiment >= q.min && sentiment < q.max) {
      return { ...q };
    }
  }
  // Edge case: sentiment === 1.0
  return { ...SENTIMENT_QUINTILES[SENTIMENT_QUINTILES.length - 1] };
}

/**
 * Calculate weighted sentiment giving more weight to types with stronger predictive power
 * EDA Finding: G (+0.0126 corr) outperforms baseline (-0.0000)
 * @param {object} typeSentiments - Object mapping client type to sentiment
 * @param {object} byType - Object mapping client type to {buy, sell}
 * @returns {object} - Weighted sentiment analysis
 */
export function calculateWeightedSentiment(typeSentiments, byType) {
  if (!typeSentiments) return { weightedSentiment: null, strongestType: null };
  
  // Weights based on EDA predictive quality (higher = more predictive)
  const weights = { F: 1.0, M: 1.0, N: 1.0, P: 0.8, O: 0.5, G: 1.5 };
  
  let weightedSum = 0;
  let totalWeight = 0;
  let strongestType = null;
  let strongestMagnitude = 0;
  
  const allTypes = [...SMART_MONEY_TYPES, FOREIGN_FLOW_TYPE];
  
  for (const type of allTypes) {
    const sentiment = typeSentiments[type];
    if (sentiment === undefined || sentiment === null) continue;
    
    const weight = weights[type] || 1.0;
    weightedSum += sentiment * weight;
    totalWeight += weight;
    
    // Track strongest signal (magnitude * quality weight)
    const signalStrength = Math.abs(sentiment) * weight;
    if (signalStrength > strongestMagnitude) {
      strongestMagnitude = signalStrength;
      strongestType = type;
    }
  }
  
  return {
    weightedSentiment: totalWeight > 0 ? weightedSum / totalWeight : null,
    strongestType,
    strongestTypeName: strongestType ? (CLIENT_TYPES[strongestType]?.shortName || strongestType) : null,
    strongestQuality: strongestType ? (TYPE_PREDICTIVE_QUALITY[strongestType] || null) : null,
  };
}

/**
 * Get day-of-week foreign investor context
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {object|null} - Day-of-week context or null
 */
export function getForeignDayContext(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const dayOfWeek = date.getDay(); // 0=Sunday, 1=Monday, ...
  return FOREIGN_DAY_OF_WEEK[dayOfWeek] || null;
}

/**
 * Check if date is in month-end rebalancing period
 * EDA Finding: Foreign volume +11.1% higher during month-end (day >= 25)
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @returns {object} - Month-end context
 */
export function getMonthEndContext(dateStr) {
  if (!dateStr) return { isMonthEnd: false, isQuarterEnd: false };
  const date = new Date(dateStr);
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1; // 1-indexed
  const isMonthEnd = dayOfMonth >= 25;
  const isQuarterEnd = isMonthEnd && [3, 6, 9, 12].includes(month);
  
  return {
    isMonthEnd,
    isQuarterEnd,
    volumeImpact: isMonthEnd ? '+11.1%' : null,
    note: isMonthEnd 
      ? 'Month-end period — foreign volume typically +11.1% higher due to portfolio rebalancing'
      : null,
  };
}

// ============================================================================
// NEW FUNCTIONS BASED ON EDA FINDINGS
// ============================================================================

/**
 * Calculate consensus score across client types
 * EDA Finding: When multiple client types agree, signals are more reliable
 * @param {object} typeSentiments - Object mapping client type to sentiment
 * @returns {object} - Consensus analysis
 */
export function calculateConsensusScore(typeSentiments, includeForeignFlow = false) {
  if (!typeSentiments) {
    return {
      bullishCount: 0,
      bearishCount: 0,
      neutralCount: 0,
      totalTypes: 0,
      consensusLevel: 'UNKNOWN',
      dominantDirection: 'UNKNOWN',
      agreementRatio: 0,
      foreignFlowIncluded: false,
    };
  }
  
  let bullish = 0;
  let bearish = 0;
  let neutral = 0;
  
  const typesToCheck = includeForeignFlow 
    ? [...SMART_MONEY_TYPES, FOREIGN_FLOW_TYPE]
    : SMART_MONEY_TYPES;
  
  for (const type of typesToCheck) {
    const sentiment = typeSentiments[type];
    if (sentiment === undefined || sentiment === null) continue;
    
    if (sentiment > 0.1) {
      bullish++;
    } else if (sentiment < -0.1) {
      bearish++;
    } else {
      neutral++;
    }
  }
  
  const totalTypes = bullish + bearish + neutral;
  const maxAgreement = Math.max(bullish, bearish, neutral);
  
  // Determine consensus level (thresholds adjust when foreign flow included)
  const unanimousThreshold = includeForeignFlow ? 6 : 5;
  const strongThreshold = includeForeignFlow ? 5 : 4;
  const moderateThreshold = includeForeignFlow ? 4 : 3;
  
  let consensusLevel = 'WEAK';
  if (maxAgreement >= unanimousThreshold) {
    consensusLevel = 'UNANIMOUS';
  } else if (maxAgreement >= strongThreshold) {
    consensusLevel = 'STRONG';
  } else if (maxAgreement >= moderateThreshold) {
    consensusLevel = 'MODERATE';
  }
  
  // Determine dominant direction
  let dominantDirection = 'MIXED';
  if (bullish > bearish && bullish > neutral) {
    dominantDirection = 'BULLISH';
  } else if (bearish > bullish && bearish > neutral) {
    dominantDirection = 'BEARISH';
  } else if (neutral > bullish && neutral > bearish) {
    dominantDirection = 'NEUTRAL';
  }
  
  return {
    bullishCount: bullish,
    bearishCount: bearish,
    neutralCount: neutral,
    totalTypes,
    consensusLevel,
    dominantDirection,
    agreementRatio: totalTypes > 0 ? maxAgreement / totalTypes : 0,
    foreignFlowIncluded: includeForeignFlow,
  };
}

/**
 * Calculate sentiment trend (change vs recent average)
 * EDA Finding: Sentiment change over time may be more predictive than absolute values
 * @param {number} currentSentiment - Current day's sentiment
 * @param {Array} historicalData - Array of historical sentiment data
 * @param {number} lookbackDays - Number of days to average
 * @returns {object} - Trend analysis
 */
export function calculateSentimentTrend(currentSentiment, historicalData, lookbackDays = 5) {
  if (!historicalData || historicalData.length === 0) {
    return {
      trend: 'UNKNOWN',
      delta: 0,
      avgSentiment: 0,
      currentSentiment: currentSentiment || 0,
      momentum: 'UNKNOWN',
    };
  }
  
  // Get the most recent N days (excluding today if it's in the data)
  const recentData = historicalData.slice(-lookbackDays);
  
  if (recentData.length === 0) {
    return {
      trend: 'UNKNOWN',
      delta: 0,
      avgSentiment: 0,
      currentSentiment: currentSentiment || 0,
      momentum: 'UNKNOWN',
    };
  }
  
  // Calculate average sentiment over lookback period
  const avgSentiment = recentData.reduce((sum, d) => {
    const sent = d.smartMoneySentiment ?? d.sentiment ?? 0;
    return sum + sent;
  }, 0) / recentData.length;
  
  const delta = (currentSentiment || 0) - avgSentiment;
  
  // Determine trend direction
  let trend = 'STABLE';
  let momentum = 'NEUTRAL';
  
  if (delta > 0.15) {
    trend = 'IMPROVING';
    momentum = 'ACCELERATING_BULLISH';
  } else if (delta > 0.05) {
    trend = 'SLIGHTLY_IMPROVING';
    momentum = 'BULLISH';
  } else if (delta < -0.15) {
    trend = 'DETERIORATING';
    momentum = 'ACCELERATING_BEARISH';
  } else if (delta < -0.05) {
    trend = 'SLIGHTLY_DETERIORATING';
    momentum = 'BEARISH';
  }
  
  return {
    trend,
    delta,
    avgSentiment,
    currentSentiment: currentSentiment || 0,
    momentum,
    lookbackDays: recentData.length,
  };
}

/**
 * Calculate pattern strength score (0-100)
 * EDA Finding: Consecutive selling + volume spikes are more predictive than raw sentiment
 * @param {object} pattern - Pattern detection result from detectSellingPattern()
 * @param {number} sentiment - Current sentiment value
 * @returns {object} - Pattern strength analysis
 */
export function calculatePatternStrength(pattern, sentiment) {
  let score = 0;
  const factors = [];
  
  if (!pattern) {
    return {
      score: 0,
      level: 'NONE',
      factors: [],
      description: 'No pattern data available',
    };
  }
  
  // Consecutive selling contributes up to 50 points
  const consecutiveSells = pattern.consecutiveSellDays || 0;
  if (consecutiveSells >= 5) {
    score += 50;
    factors.push({ name: 'Extended selling streak', points: 50, detail: `${consecutiveSells} consecutive days` });
  } else if (consecutiveSells >= 3) {
    score += 30;
    factors.push({ name: 'Selling streak', points: 30, detail: `${consecutiveSells} consecutive days` });
  } else if (consecutiveSells >= 2) {
    score += 15;
    factors.push({ name: 'Short selling streak', points: 15, detail: `${consecutiveSells} consecutive days` });
  }
  
  // Volume spike adds up to 25 points
  if (pattern.hasVolumeSpike) {
    const volumeRatio = pattern.latestVolume / Math.max(pattern.avgVolume, 1);
    if (volumeRatio >= 3) {
      score += 25;
      factors.push({ name: 'Major volume spike', points: 25, detail: `${volumeRatio.toFixed(1)}x average` });
    } else {
      score += 15;
      factors.push({ name: 'Volume spike', points: 15, detail: `${volumeRatio.toFixed(1)}x average` });
    }
  }
  
  // Strong negative sentiment adds up to 25 points
  if (sentiment !== undefined && sentiment !== null) {
    if (sentiment <= -0.7) {
      score += 25;
      factors.push({ name: 'Strong selling pressure', points: 25, detail: `${(sentiment * 100).toFixed(0)}% sentiment` });
    } else if (sentiment <= -0.5) {
      score += 20;
      factors.push({ name: 'Heavy selling', points: 20, detail: `${(sentiment * 100).toFixed(0)}% sentiment` });
    } else if (sentiment <= -0.3) {
      score += 10;
      factors.push({ name: 'Moderate selling', points: 10, detail: `${(sentiment * 100).toFixed(0)}% sentiment` });
    }
  }
  
  // Cap at 100
  score = Math.min(score, 100);
  
  // Determine level
  let level = 'LOW';
  let description = 'Minimal concern';
  
  if (score >= 70) {
    level = 'CRITICAL';
    description = 'Multiple strong warning signals detected';
  } else if (score >= 50) {
    level = 'HIGH';
    description = 'Significant selling pressure patterns';
  } else if (score >= 30) {
    level = 'MODERATE';
    description = 'Some warning signals present';
  } else if (score > 0) {
    level = 'LOW';
    description = 'Minor signals, monitor closely';
  } else {
    level = 'NONE';
    description = 'No concerning patterns detected';
  }
  
  return {
    score,
    level,
    factors,
    description,
  };
}

/**
 * Get enhanced alert level based on EDA findings
 * EDA Finding: Combining multiple signals produces better alerts than single-metric thresholds
 * @param {number} sentiment - Smart money sentiment (-1 to 1)
 * @param {object} pattern - Pattern detection result
 * @returns {object} - Enhanced alert with level and reason
 */
export function getEnhancedAlertLevel(sentiment, pattern) {
  const consecutiveSells = pattern?.consecutiveSellDays || 0;
  const hasVolumeSpike = pattern?.hasVolumeSpike || false;
  
  // HIGH (RED): Strong negative sentiment + pattern confirmation
  // EDA showed 3+ consecutive selling days elevate decline probability
  if (sentiment < -0.5 && consecutiveSells >= 3) {
    return {
      level: 'HIGH',
      color: 'RED',
      reason: 'Strong selling sentiment with sustained selling pattern',
      action: 'Consider hedging or exit',
      confidence: 'HIGH',
    };
  }
  
  // HIGH: Extreme negative sentiment even without pattern
  if (sentiment < -0.7) {
    return {
      level: 'HIGH',
      color: 'RED',
      reason: 'Extreme institutional selling pressure',
      action: 'Review position urgently',
      confidence: 'MODERATE',
    };
  }
  
  // MEDIUM (YELLOW): Either moderate negative OR selling pattern
  if (sentiment < -0.3 || consecutiveSells >= 2) {
    const reasons = [];
    if (sentiment < -0.3) reasons.push('Moderate selling sentiment');
    if (consecutiveSells >= 2) reasons.push(`${consecutiveSells} consecutive sell days`);
    if (hasVolumeSpike) reasons.push('Volume spike detected');
    
    return {
      level: 'MEDIUM',
      color: 'YELLOW',
      reason: reasons.join('; '),
      action: 'Monitor closely',
      confidence: 'MODERATE',
    };
  }
  
  // BULLISH_VOLUME (TEAL): Volume spike + bullish sentiment
  // EDA showed this combo improves win rate to 50.4% (vs 47.8% baseline)
  if (sentiment > 0.3 && hasVolumeSpike) {
    return {
      level: 'BULLISH',
      color: 'TEAL',
      reason: 'Volume spike with bullish sentiment — historically wins 50.4% (vs 47.8% baseline)',
      action: 'Potential opportunity — volume confirms buying pressure',
      confidence: 'MODERATE',
    };
  }
  
  // BULLISH (TEAL): Strong positive even without volume spike
  if (sentiment > 0.5) {
    return {
      level: 'BULLISH',
      color: 'TEAL',
      reason: 'Strong institutional buying pressure',
      action: 'Potential opportunity',
      confidence: 'LOW',
    };
  }
  
  // LOW (BLUE): Slightly negative
  if (sentiment < -0.1) {
    return {
      level: 'LOW',
      color: 'BLUE',
      reason: 'Slight institutional selling bias',
      action: 'Normal monitoring',
      confidence: 'LOW',
    };
  }
  
  // NONE (GREEN): Neutral or positive
  return {
    level: 'NONE',
    color: 'GREEN',
    reason: 'No concerning signals',
    action: 'Continue holding',
    confidence: 'LOW',
  };
}

/**
 * Get confidence level based on sample size
 * Used for historical pattern analysis
 * @param {number} sampleSize - Number of historical patterns found
 * @returns {object} - Confidence assessment
 */
export function getConfidenceLevel(sampleSize) {
  if (sampleSize >= 50) {
    return { level: 'HIGH', label: 'High Confidence', color: 'green' };
  }
  if (sampleSize >= 20) {
    return { level: 'MEDIUM', label: 'Moderate Confidence', color: 'yellow' };
  }
  if (sampleSize >= 5) {
    return { level: 'LOW', label: 'Low Confidence', color: 'orange' };
  }
  return { level: 'INSUFFICIENT', label: 'Insufficient Data', color: 'gray' };
}
