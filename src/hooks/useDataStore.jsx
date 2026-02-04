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

export function DataProvider({ children }) {
  const [transactions, setTransactions] = useState([]);
  const [tradingData, setTradingData] = useState([]);
  const [indicesData, setIndicesData] = useState([]);
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

  // Load all data from pre-parsed ZIP data (for auto-loading)
  const loadFromZipData = useCallback((zipResult) => {
    const { data } = zipResult;
    let secToIsinMap = new Map();
    
    // Load transactions (required)
    if (data.transactions) {
      loadTransactions(data.transactions);
    }
    
    // Load trading data (required)
    if (data.trading) {
      loadTradingData(data.trading);
    }
    
    // Load indices data (optional - kept for backward compatibility)
    if (data.indices) {
      loadIndicesData(data.indices);
    }
    
    // Load securities mapping (optional) - must load before smart money
    if (data.securities) {
      const cleaned = data.securities.filter(row => row.securityId && row.isin);
      setSecuritiesData(cleaned);
      secToIsinMap = buildSecurityToIsinMap(cleaned);
      const isinToSec = buildIsinToSecurityMap(cleaned);
      setSecurityToIsin(secToIsinMap);
      setIsinToSecurity(isinToSec);
    }
    
    // Load smart money data (optional)
    if (data.smartmoney && secToIsinMap.size > 0) {
      const cleaned = data.smartmoney.filter(row => row.tradeDate && row.securityId && row.clientTypeId);
      setSmartMoneyRaw(cleaned);
      const aggregated = aggregateSmartMoneyData(cleaned, secToIsinMap);
      setSmartMoneyAggregated(aggregated);
      setSmartMoneyLoaded(true);
    }
    
    return true;
  }, [loadTransactions, loadTradingData, loadIndicesData]);

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

  const processData = useCallback((traderFilter = 'all', maxDate = null) => {
    if (transactions.length === 0 || tradingData.length === 0) {
      return null;
    }

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
      
      const isBuy = tx.Action.toLowerCase().includes('buy') || 
                    tx.Action.includes('קניה') || 
                    tx.Action.includes('קנייה');
      
      const securityChange = marketData?.change || 0;
      
      return {
        ...tx,
        dateStr,
        securityChange,
        symbol: marketData?.symbol || '',
        hasMarketData: !!marketData,
        isBuy,
      };
    });

    // Calculate statistics
    const withMarketData = merged.filter(tx => tx.hasMarketData);
    
    const buyTrades = withMarketData.filter(tx => tx.isBuy);
    const sellTrades = withMarketData.filter(tx => !tx.isBuy);

    // Calculate per-trader stats
    const traderStats = {};
    const traderList = [...new Set(merged.map(tx => tx.InvestmentManager))];
    for (const trader of traderList) {
      const traderTxs = merged.filter(tx => tx.InvestmentManager === trader && tx.hasMarketData);
      traderStats[trader] = {
        total: traderTxs.length,
        buyCount: traderTxs.filter(tx => tx.isBuy).length,
        sellCount: traderTxs.filter(tx => !tx.isBuy).length,
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
        buyTrades: buyTrades.length,
        sellTrades: sellTrades.length,
      },
      traderStats,
      traderPortfolios,
      currentTrader: traderFilter,
    };

    setProcessedData(result);
    setSelectedTrader(traderFilter);
    setIsLoaded(true);
    return result;
  }, [transactions, tradingData]);

  const reset = useCallback(() => {
    setTransactions([]);
    setTradingData([]);
    setIndicesData([]);
    setProcessedData(null);
    setIsLoaded(false);
    setSelectedTrader('all');
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
    processData(trader, date);
  }, [processData]);

  // End session - keep data loaded but clear session
  const endSession = useCallback(() => {
    setSessionTrader(null);
    setSessionDate(null);
    setIsSessionActive(false);
    setProcessedData(null);
    setSelectedTrader('all');
  }, []);

  const filterByTrader = useCallback((trader) => {
    processData(trader, sessionDate);
  }, [processData, sessionDate]);

  return (
    <DataContext.Provider value={{
      transactions,
      tradingData,
      indicesData,
      processedData,
      isLoaded,
      traders,
      selectedTrader,
      loadTransactions,
      loadTradingData,
      loadIndicesData,
      processData,
      filterByTrader,
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
      loadFromZipData,
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
