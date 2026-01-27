import { createContext, useContext, useState, useCallback } from 'react';
import { 
  aggregateSmartMoneyData, 
  buildSecurityToIsinMap, 
  buildIsinToSecurityMap,
  CLIENT_TYPES,
  SMART_MONEY_TYPES,
  getHistoricalData,
  detectSellingPattern,
  analyzePatternOutcomes,
  calculateHistoricalPerformance,
} from '../lib/smartMoney';

const DataContext = createContext(null);

// Default index: TA-125 (code 137)
const DEFAULT_INDEX = '137';

// Complete index names mapping from indices_codes.csv
const INDEX_NAMES = {
  // Main market indices (most commonly used)
  '137': 'ת״א-125',
  '142': 'ת״א-35',
  '143': 'ת״א-90',
  '197': 'ת״א-20',
  '199': 'ת״א-200',
  '168': 'ת״א All-Share',
  '147': 'ת״א-SME60',
  '163': 'ת״א-צמיחה',
  '198': 'ת״א-50 ריאלי',
  '175': 'ת״א-רימון',
  '189': 'ת״א 125 משקל שווה',
  '195': 'ת״א-125 ערך',
  '185': 'ת״א-125 אקלים נקי',
  '176': 'ת״א-90 ו-CAP 0.8% SME60',
  '177': 'ת״א סקטור-באלאנס',
  '196': 'ת״א 90 ובנקים',
  '202': 'ת״א-90 מודל רווחיות משקל שווה',
  '203': 'ת״א SME60 מודל רווחיות משקל שווה',
  '174': 'ת״א-35 דולר',
  // Sector indices
  '148': 'ת״א-פיננסים',
  '149': 'ת״א-נדל״ן',
  '164': 'ת״א בנקים-5',
  '194': 'ת״א בנקים',
  '169': 'ת״א-טכנולוגיה',
  '167': 'ת״א-ביומד',
  '170': 'ת״א-נפט וגז',
  '171': 'ת״א-ביטוח ושירותים פיננסיים',
  '172': 'ת״א תקשורת וטכנולוגיות מידע',
  '173': 'ת״א טק - עילית',
  '178': 'ת״א-תעשייה',
  '180': 'ת״א-תשתיות אנרגיה',
  '181': 'ת״א-בנייה',
  '182': 'ת״א-מניב ישראל',
  '183': 'ת״א-מניב חו״ל',
  '184': 'ת״א-קלינטק',
  '188': 'ת״א-רשתות שיווק',
  '145': 'ת״א גלובל-בלוטק',
  '33': 'ת״א-ביטוח',
  '204': 'ת״א בנקים5- משקל שווה',
  '205': 'ת״א-בנקים וביטוח משקל שווה',
  '206': 'ת״א תשתיות',
  '207': 'ת״א בטחוניות',
  '208': 'ת״א נדל״ן-35',
  // Special indices
  '166': 'תל-דיב',
  '150': 'ת״א-מעלה',
  '179': 'ת״א-פמילי',
  '187': 'ת״א-דואליות',
  '200': 'תל דיב אריסטוקרט',
  // General indices
  '1': 'מניות והמירים כללי',
  '2': 'מניות כללי',
  '3': 'אופציות כללי',
  '4': 'אג״ח להמרה כללי',
  '162': 'יתר מניות',
  '161': 'יתר מניות והמירים',
  // Bond indices
  '601': 'All-Bond כללי',
  '604': 'All-Bond צמודות',
  '740': 'All-Bond שקלי',
  '602': 'תל גוב-כללי',
  '605': 'תל גוב-צמודות',
  '700': 'תל גוב-שקלי',
  '603': 'אג״ח כללי - קונצרני',
  '606': 'אג״ח צמודות מדד - קונצרני',
  '710': 'תל בונד-שקלי',
  '711': 'תל בונד צמודות',
  '707': 'תל בונד 20 צמודות',
  '708': 'תל בונד 40 צמודות',
  '709': 'תל בונד 60 צמודות',
  '720': 'תל בונד שקלי-50',
  '715': 'תל בונד-מאגר',
};

// Priority indices for dropdown (shown first)
const COMMON_INDICES = {
  '137': 'ת״א-125',
  '142': 'ת״א-35',
  '143': 'ת״א-90',
  '197': 'ת״א-20',
  '199': 'ת״א-200',
  '168': 'ת״א All-Share',
};

// Function to get index name by code
const getIndexName = (code) => {
  return INDEX_NAMES[String(code)] || `מדד ${code}`;
};

export function DataProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [tradingData, setTradingData] = useState([]);
  const [indicesData, setIndicesData] = useState([]);
  const [availableIndices, setAvailableIndices] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(DEFAULT_INDEX);
  const [isLoaded, setIsLoaded] = useState(false);
  const [processedData, setProcessedData] = useState(null);
  const [selectedTrader, setSelectedTrader] = useState('all');
  const [traders, setTraders] = useState([]);
  
  // Smart money data state
  const [smartMoneyRaw, setSmartMoneyRaw] = useState([]);
  const [securitiesData, setSecuritiesData] = useState([]);
  const [securityToIsin, setSecurityToIsin] = useState(new Map());
  const [isinToSecurity, setIsinToSecurity] = useState(new Map());
  const [smartMoneyAggregated, setSmartMoneyAggregated] = useState(new Map());
  const [smartMoneyLoaded, setSmartMoneyLoaded] = useState(false);

  // Session state
  const [sessionTrader, setSessionTrader] = useState(null);
  const [sessionDate, setSessionDate] = useState(null);
  const [isSessionActive, setIsSessionActive] = useState(false);

  const loadTransactions = useCallback((data) => {
    // Normalize and clean transaction data
    const cleaned = data
      .filter(row => row.ISIN && row.Action && row.OrderDate)
      .map(row => ({
        ...row,
        ISIN: String(row.ISIN).trim().toUpperCase(),
        Action: String(row.Action).trim(),
        OrderDate: row.OrderDate,
        InvestmentManager: row.InvestmentManager || 'Unknown',
      }));
    setTransactions(cleaned);
    
    // Extract unique traders
    const uniqueTraders = [...new Set(cleaned.map(tx => tx.InvestmentManager))].sort();
    setTraders(uniqueTraders);
    
    return cleaned.length;
  }, []);

  const loadTradingData = useCallback((data) => {
    // Normalize trading data
    const cleaned = data
      .filter(row => row.isin && row.tradeDate)
      .map(row => ({
        ...row,
        isin: String(row.isin).trim().toUpperCase(),
        tradeDate: row.tradeDate,
        change: parseFloat(row.change) || 0,
        symbol: row.symbol || '',
      }));
    setTradingData(cleaned);
    return cleaned.length;
  }, []);

  const loadIndicesData = useCallback((data) => {
    // Get unique index IDs
    const uniqueIndices = [...new Set(data.map(row => String(row.indexId).trim()))].sort();
    setAvailableIndices(uniqueIndices);
    
    // Group by indexId first, then sort by date and calculate changes
    const byIndex = {};
    data.forEach(row => {
      if (!row.tradeDate || !row.closingIndexPrice) return;
      const indexId = String(row.indexId).trim();
      if (!byIndex[indexId]) byIndex[indexId] = [];
      byIndex[indexId].push(row);
    });
    
    // Calculate changes for each index
    const allWithChanges = [];
    Object.entries(byIndex).forEach(([indexId, rows]) => {
      const sorted = rows.sort((a, b) => new Date(a.tradeDate) - new Date(b.tradeDate));
      
      sorted.forEach((row, idx) => {
        const prevRow = idx > 0 ? sorted[idx - 1] : null;
        const closePrice = parseFloat(row.closingIndexPrice) || 0;
        const prevClose = prevRow ? parseFloat(prevRow.closingIndexPrice) : closePrice;
        const change = prevClose ? ((closePrice - prevClose) / prevClose) * 100 : 0;
        
        allWithChanges.push({
          ...row,
          tradeDate: row.tradeDate,
          indexId: indexId,
          closingPrice: closePrice,
          change: change,
        });
      });
    });
    
    setIndicesData(allWithChanges);
    return allWithChanges.length;
  }, []);

  // Load securities mapping data (trade_securities.csv)
  const loadSecuritiesData = useCallback((data) => {
    const cleaned = data.filter(row => row.securityId && row.isin);
    setSecuritiesData(cleaned);
    
    const secToIsin = buildSecurityToIsinMap(cleaned);
    const isinToSec = buildIsinToSecurityMap(cleaned);
    
    setSecurityToIsin(secToIsin);
    setIsinToSecurity(isinToSec);
    
    return cleaned.length;
  }, []);

  // Load smart money EOD data
  const loadSmartMoneyData = useCallback((data, existingSecToIsin = null) => {
    const cleaned = data.filter(row => row.tradeDate && row.securityId && row.clientTypeId);
    setSmartMoneyRaw(cleaned);
    
    // Use provided mapping or current state
    const mapping = existingSecToIsin || securityToIsin;
    
    if (mapping.size > 0) {
      const aggregated = aggregateSmartMoneyData(cleaned, mapping);
      setSmartMoneyAggregated(aggregated);
      setSmartMoneyLoaded(true);
    }
    
    return cleaned.length;
  }, [securityToIsin]);

  // Aggregate smart money data (call after both datasets are loaded)
  const aggregateSmartMoney = useCallback(() => {
    if (smartMoneyRaw.length === 0 || securityToIsin.size === 0) {
      return;
    }
    
    const aggregated = aggregateSmartMoneyData(smartMoneyRaw, securityToIsin);
    setSmartMoneyAggregated(aggregated);
    setSmartMoneyLoaded(true);
    
    return aggregated.size;
  }, [smartMoneyRaw, securityToIsin]);

  // Get smart money sentiment for a specific ISIN and date
  const getSmartMoneySentiment = useCallback((isin, date) => {
    const isinClean = String(isin).trim().toUpperCase();
    const dateClean = date.split('T')[0].split(' ')[0];
    const key = `${isinClean}_${dateClean}`;
    
    return smartMoneyAggregated.get(key) || null;
  }, [smartMoneyAggregated]);

  // Get smart money history for a security
  const getSmartMoneyHistory = useCallback((isin, endDate, lookbackDays = 30) => {
    return getHistoricalData(smartMoneyAggregated, isin.toUpperCase(), endDate, lookbackDays);
  }, [smartMoneyAggregated]);

  // Detect selling patterns for a security
  const detectSmartMoneyPattern = useCallback((isin, endDate, lookbackDays = 10) => {
    const history = getHistoricalData(smartMoneyAggregated, isin.toUpperCase(), endDate, lookbackDays);
    return detectSellingPattern(history);
  }, [smartMoneyAggregated]);

  // Analyze historical outcomes for similar patterns
  const getPatternOutcomes = useCallback((isin, sentimentThreshold = -0.5, lookforwardDays = 5) => {
    if (!smartMoneyLoaded || tradingData.length === 0) return null;
    return analyzePatternOutcomes(smartMoneyAggregated, tradingData, isin, sentimentThreshold, lookforwardDays);
  }, [smartMoneyAggregated, tradingData, smartMoneyLoaded]);

  // Calculate historical performance trading with/against smart money
  const getHistoricalPerformance = useCallback((holdingDays = 5) => {
    if (!smartMoneyLoaded || transactions.length === 0 || tradingData.length === 0) return null;
    return calculateHistoricalPerformance(transactions, smartMoneyAggregated, tradingData, holdingDays);
  }, [transactions, smartMoneyAggregated, tradingData, smartMoneyLoaded]);

  // Get available dates from trading data
  const getAvailableDates = useCallback(() => {
    if (tradingData.length === 0) return [];
    const dates = [...new Set(tradingData.map(row => 
      row.tradeDate.split('T')[0].split(' ')[0]
    ))].sort();
    return dates;
  }, [tradingData]);

  const processData = useCallback((traderFilter = 'all', indexId = null, maxDate = null) => {
    if (transactions.length === 0 || tradingData.length === 0) {
      return null;
    }

    // Use provided index or current selected index
    const useIndex = indexId || selectedIndex;

    // Helper to parse date string to YYYY-MM-DD format
    const parseDateStr = (dateStr) => {
      if (dateStr.includes('/')) {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      return dateStr.split('T')[0].split(' ')[0];
    };

    // Filter transactions by trader if specified
    let filteredTransactions = traderFilter === 'all' 
      ? transactions 
      : transactions.filter(tx => tx.InvestmentManager === traderFilter);

    // Filter by max date if specified (session date filter)
    if (maxDate) {
      filteredTransactions = filteredTransactions.filter(tx => {
        const txDate = parseDateStr(tx.OrderDate);
        return txDate <= maxDate;
      });
    }

    // Create a lookup map for trading data by ISIN + date
    const tradingMap = new Map();
    tradingData.forEach(row => {
      const dateStr = row.tradeDate.split('T')[0].split(' ')[0];
      const key = `${row.isin}_${dateStr}`;
      tradingMap.set(key, row);
    });

    // Create a lookup map for index data by date (filter by selected index)
    const indexMap = new Map();
    indicesData
      .filter(row => String(row.indexId) === String(useIndex))
      .forEach(row => {
        const dateStr = row.tradeDate.split('T')[0].split(' ')[0];
        indexMap.set(dateStr, row);
      });

    // Merge transactions with market data
    const merged = filteredTransactions.map(tx => {
      // Parse the order date
      let dateStr = tx.OrderDate;
      if (dateStr.includes('/')) {
        // Handle DD/MM/YYYY format
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          dateStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      } else {
        dateStr = dateStr.split('T')[0].split(' ')[0];
      }
      
      const key = `${tx.ISIN}_${dateStr}`;
      const marketData = tradingMap.get(key);
      const indexData = indexMap.get(dateStr);
      
      const isBuy = tx.Action.toLowerCase().includes('buy') || 
                    tx.Action.includes('קניה') || 
                    tx.Action.includes('קנייה');
      
      // Use index change if available, otherwise fall back to security change
      const securityChange = marketData?.change || 0;
      const indexChange = indexData?.change || 0;
      const marketChange = indicesData.length > 0 ? indexChange : securityChange;
      
      const isCounter = (isBuy && marketChange < 0) || (!isBuy && marketChange > 0);
      
      return {
        ...tx,
        dateStr,
        securityChange,
        indexChange,
        marketChange,
        symbol: marketData?.symbol || '',
        hasMarketData: !!marketData || !!indexData,
        hasIndexData: !!indexData,
        isBuy,
        isCounter,
      };
    });

    // Calculate statistics
    const withMarketData = merged.filter(tx => tx.hasMarketData);
    const counterCount = withMarketData.filter(tx => tx.isCounter).length;
    const alignedCount = withMarketData.length - counterCount;
    
    const buyTrades = withMarketData.filter(tx => tx.isBuy);
    const sellTrades = withMarketData.filter(tx => !tx.isBuy);
    
    const buyCounterPct = buyTrades.length > 0 
      ? (buyTrades.filter(tx => tx.isCounter).length / buyTrades.length) * 100 
      : 0;
    const sellCounterPct = sellTrades.length > 0 
      ? (sellTrades.filter(tx => tx.isCounter).length / sellTrades.length) * 100 
      : 0;

    // Calculate per-trader stats
    const traderStats = {};
    const traderList = [...new Set(merged.map(tx => tx.InvestmentManager))];
    for (const trader of traderList) {
      const traderTxs = merged.filter(tx => tx.InvestmentManager === trader && tx.hasMarketData);
      const traderCounter = traderTxs.filter(tx => tx.isCounter).length;
      traderStats[trader] = {
        total: traderTxs.length,
        counter: traderCounter,
        aligned: traderTxs.length - traderCounter,
        contrarianRatio: traderTxs.length > 0 ? (traderCounter / traderTxs.length) * 100 : 0,
      };
    }

    // Get trader portfolios (unique ISINs per trader) - filtered by maxDate if set
    const traderPortfolios = {};
    const txsForPortfolios = maxDate 
      ? transactions.filter(tx => parseDateStr(tx.OrderDate) <= maxDate)
      : transactions;
    txsForPortfolios.forEach(tx => {
      const trader = tx.InvestmentManager;
      if (!traderPortfolios[trader]) traderPortfolios[trader] = new Set();
      traderPortfolios[trader].add(tx.ISIN);
    });
    // Convert Sets to Arrays
    Object.keys(traderPortfolios).forEach(trader => {
      traderPortfolios[trader] = Array.from(traderPortfolios[trader]);
    });

    const result = {
      merged,
      stats: {
        totalTransactions: filteredTransactions.length,
        withMarketData: withMarketData.length,
        counterCount,
        alignedCount,
        contrarianRatio: withMarketData.length > 0 
          ? (counterCount / withMarketData.length) * 100 
          : 0,
        buyTrades: buyTrades.length,
        sellTrades: sellTrades.length,
        buyCounterPct,
        sellCounterPct,
        hasIndexData: indicesData.length > 0,
        selectedIndex: useIndex,
        indexName: COMMON_INDICES[useIndex] || `Index ${useIndex}`,
      },
      traderStats,
      traderPortfolios,
      currentTrader: traderFilter,
    };

    setProcessedData(result);
    setSelectedTrader(traderFilter);
    setIsLoaded(true);
    return result;
  }, [transactions, tradingData, indicesData, selectedIndex]);

  const reset = useCallback(() => {
    setTransactions([]);
    setTradingData([]);
    setIndicesData([]);
    setAvailableIndices([]);
    setProcessedData(null);
    setIsLoaded(false);
    setSelectedTrader('all');
    setSelectedIndex(DEFAULT_INDEX);
    setTraders([]);
    // Reset smart money data
    setSmartMoneyRaw([]);
    setSecuritiesData([]);
    setSecurityToIsin(new Map());
    setIsinToSecurity(new Map());
    setSmartMoneyAggregated(new Map());
    setSmartMoneyLoaded(false);
    // Reset session
    setSessionTrader(null);
    setSessionDate(null);
    setIsSessionActive(false);
  }, []);

  // Start session - filter to trader and date
  const startSession = useCallback((trader, date) => {
    setSessionTrader(trader);
    setSessionDate(date);
    setIsSessionActive(true);
    processData(trader, selectedIndex, date);
  }, [processData, selectedIndex]);

  // End session - keep data loaded but clear session
  const endSession = useCallback(() => {
    setSessionTrader(null);
    setSessionDate(null);
    setIsSessionActive(false);
    setProcessedData(null);
    setSelectedTrader('all');
  }, []);

  const filterByTrader = useCallback((trader) => {
    processData(trader, selectedIndex, sessionDate);
  }, [processData, selectedIndex, sessionDate]);

  const changeIndex = useCallback((indexId) => {
    setSelectedIndex(indexId);
    processData(selectedTrader, indexId, sessionDate);
  }, [processData, selectedTrader, sessionDate]);

  return (
    <DataContext.Provider value={{
      transactions,
      tradingData,
      indicesData,
      processedData,
      isLoaded,
      traders,
      selectedTrader,
      availableIndices,
      selectedIndex,
      commonIndices: COMMON_INDICES,
      indexNames: INDEX_NAMES,
      getIndexName,
      loadTransactions,
      loadTradingData,
      loadIndicesData,
      processData,
      filterByTrader,
      changeIndex,
      reset,
      // Session state and functions
      sessionTrader,
      sessionDate,
      isSessionActive,
      getAvailableDates,
      startSession,
      endSession,
      // Smart money data and functions
      smartMoneyRaw,
      securitiesData,
      securityToIsin,
      isinToSecurity,
      smartMoneyAggregated,
      smartMoneyLoaded,
      loadSecuritiesData,
      loadSmartMoneyData,
      aggregateSmartMoney,
      getSmartMoneySentiment,
      getSmartMoneyHistory,
      detectSmartMoneyPattern,
      getPatternOutcomes,
      getHistoricalPerformance,
      CLIENT_TYPES,
      SMART_MONEY_TYPES,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDataStore() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useDataStore must be used within a DataProvider');
  }
  return context;
}
