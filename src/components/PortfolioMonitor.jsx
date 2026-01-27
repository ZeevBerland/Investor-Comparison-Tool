import { useState, useMemo, useEffect } from 'react';
import { Activity, AlertTriangle, Search, Plus, X, RefreshCw, TrendingUp, TrendingDown, Users, Zap, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useDataStore } from '../hooks/useDataStore';
import { scanPortfolio } from '../lib/alerts';
import { getSentimentAlertLevel, detectSellingPattern, CLIENT_TYPES, SMART_MONEY_TYPES } from '../lib/smartMoney';

export default function PortfolioMonitor() {
  const { 
    tradingData, indicesData, processedData, traders, availableIndices, selectedIndex, commonIndices, getIndexName, changeIndex,
    smartMoneyLoaded, getSmartMoneySentiment, getSmartMoneyHistory, detectSmartMoneyPattern, isinToSecurity, getPatternOutcomes,
    sessionDate, sessionTrader
  } = useDataStore();
  const [isins, setIsins] = useState([]);
  const [newIsin, setNewIsin] = useState('');
  const [date, setDate] = useState(sessionDate || '');
  const [threshold, setThreshold] = useState(2);
  const [scanResult, setScanResult] = useState(null);
  const [sentimentScan, setSentimentScan] = useState(null);
  const [lastScanIndex, setLastScanIndex] = useState(null);
  const [viewMode, setViewMode] = useState('price'); // 'price' or 'sentiment'

  // Auto-load session trader's portfolio on mount
  useEffect(() => {
    if (sessionTrader && processedData?.traderPortfolios?.[sessionTrader]) {
      setIsins(processedData.traderPortfolios[sessionTrader].slice(0, 100));
    }
  }, [sessionTrader, processedData]);

  // Get date range - limited by session date
  const dateRange = useMemo(() => {
    if (!tradingData || tradingData.length === 0) return { min: '', max: '' };
    const dates = tradingData
      .map(row => row.tradeDate.split('T')[0].split(' ')[0])
      .sort();
    // Use session date as max if available, otherwise use the last date in data
    const maxDate = sessionDate || dates[dates.length - 1];
    return { min: dates[0], max: maxDate };
  }, [tradingData, sessionDate]);

  // Get trader portfolios from processed data
  const traderPortfolios = processedData?.traderPortfolios || {};

  // Get ISINs for the session trader
  const traderIsins = useMemo(() => {
    if (sessionTrader && traderPortfolios[sessionTrader]) {
      return traderPortfolios[sessionTrader];
    }
    return [];
  }, [sessionTrader, traderPortfolios]);

  const addIsin = () => {
    const cleaned = newIsin.trim().toUpperCase();
    if (cleaned && !isins.includes(cleaned)) {
      setIsins([...isins, cleaned]);
    }
    setNewIsin('');
  };

  const removeIsin = (isinToRemove) => {
    setIsins(isins.filter(i => i !== isinToRemove));
  };

  const reloadTraderPortfolio = () => {
    if (sessionTrader && traderPortfolios[sessionTrader]) {
      setIsins(traderPortfolios[sessionTrader].slice(0, 100));
    }
  };

  const handleScan = (indexOverride = null) => {
    if (isins.length === 0 || !date) {
      return;
    }
    const indexToUse = indexOverride || selectedIndex;
    const result = scanPortfolio(isins, date, threshold, tradingData, indicesData, indexToUse);
    setScanResult(result);
    setLastScanIndex(indexToUse);
    
    // Scan for smart money sentiment if data is loaded
    if (smartMoneyLoaded) {
      const sentimentResults = scanPortfolioSentiment(isins, date);
      setSentimentScan(sentimentResults);
    } else {
      setSentimentScan(null);
    }
  };
  
  // Scan portfolio for smart money sentiment
  const scanPortfolioSentiment = (isinList, scanDate) => {
    const redAlerts = [];
    const yellowAlerts = [];
    const greenPositions = [];
    const noData = [];
    
    for (const isin of isinList) {
      const isinClean = isin.toUpperCase().trim();
      const sentiment = getSmartMoneySentiment(isinClean, scanDate);
      const secInfo = isinToSecurity.get(isinClean);
      const pattern = detectSmartMoneyPattern(isinClean, scanDate, 10);
      
      // Get historical pattern outcomes for this security
      const patternOutcomes = sentiment?.smartMoneySentiment < -0.3 
        ? getPatternOutcomes(isinClean, sentiment.smartMoneySentiment, 5) 
        : null;
      
      const item = {
        isin: isinClean,
        symbol: secInfo?.symbol || isinClean,
        companyName: secInfo?.companyName,
        sentiment: sentiment?.smartMoneySentiment,
        typeSentiments: sentiment?.typeSentiments,
        buyVolume: sentiment?.smartMoneyBuy,
        sellVolume: sentiment?.smartMoneySell,
        pattern,
        patternOutcomes,
        date: scanDate,
      };
      
      if (!sentiment) {
        noData.push(item);
        continue;
      }
      
      const alertLevel = getSentimentAlertLevel(sentiment.smartMoneySentiment);
      item.alertLevel = alertLevel;
      
      if (alertLevel === 'RED' || (pattern?.flagged && pattern?.consecutiveSellDays >= 3)) {
        redAlerts.push(item);
      } else if (alertLevel === 'YELLOW' || pattern?.hasVolumeSpike) {
        yellowAlerts.push(item);
      } else {
        greenPositions.push(item);
      }
    }
    
    // Sort alerts by sentiment (worst first)
    redAlerts.sort((a, b) => (a.sentiment || 0) - (b.sentiment || 0));
    yellowAlerts.sort((a, b) => (a.sentiment || 0) - (b.sentiment || 0));
    
    return {
      redAlerts,
      yellowAlerts,
      greenPositions,
      noData,
      totalScanned: isinList.length,
    };
  };

  // Auto-rescan when index changes (if we have a previous scan)
  useEffect(() => {
    if (scanResult && isins.length > 0 && date && selectedIndex !== lastScanIndex) {
      handleScan(selectedIndex);
    }
  }, [selectedIndex]);

  if (!processedData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No data loaded. Please upload your files first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Index Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Portfolio Monitor</h2>
          <p className="text-gray-600 mt-1">
            Monitor positions for momentum and smart money alerts
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* View Mode Toggle */}
          {smartMoneyLoaded && (
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('price')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'price' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <TrendingUp className="w-4 h-4 inline mr-1" />
                Price
              </button>
              <button
                onClick={() => setViewMode('sentiment')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === 'sentiment' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="w-4 h-4 inline mr-1" />
                Smart Money
              </button>
            </div>
          )}
          
          {/* Index Selector */}
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-500" />
            <select
              value={selectedIndex}
              onChange={(e) => changeIndex(e.target.value)}
              className="px-3 py-2 border border-amber-300 rounded-lg bg-amber-50 text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            >
              {availableIndices
                .filter(id => commonIndices[id])
                .map(id => (
                  <option key={id} value={id}>{commonIndices[id]}</option>
                ))}
              <optgroup label="Other Indices">
                {availableIndices
                  .filter(id => !commonIndices[id])
                  .slice(0, 50)
                  .map(id => (
                    <option key={id} value={id}>{getIndexName(id)}</option>
                  ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>
      
      {/* Smart Money Status Banner */}
      {smartMoneyLoaded && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
          <Zap className="w-4 h-4 text-green-600" />
          <p className="text-sm text-green-700">
            Smart money sentiment analysis enabled - institutional trading patterns will be analyzed
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolio Input */}
        <div className="bg-white rounded-xl shadow-sm border p-6 min-w-[320px] h-[400px]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Positions</h3>
          
          {/* Session Trader Display */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Users className="w-4 h-4 inline mr-1" />
              Your Portfolio
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 border border-blue-300 rounded-lg bg-blue-50 text-sm text-blue-800 font-medium">
                {sessionTrader} ({traderIsins.length} ISINs)
              </div>
              <button
                onClick={reloadTraderPortfolio}
                className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                title="Reload portfolio"
              >
                <RefreshCw className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
          
          {/* Add ISIN */}
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newIsin}
              onChange={(e) => setNewIsin(e.target.value.toUpperCase())}
              onKeyPress={(e) => e.key === 'Enter' && addIsin()}
              placeholder="Add ISIN manually..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            <button
              onClick={addIsin}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* ISIN List */}
          <div className="max-h-48 overflow-y-auto border rounded-lg">
            {isins.length === 0 ? (
              <p className="p-4 text-center text-sm text-gray-500">
                No positions added. Enter ISINs above.
              </p>
            ) : (
              <ul className="divide-y">
                {isins.map((isin) => (
                  <li key={isin} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
                    <span className="font-mono text-sm">{isin}</span>
                    <button
                      onClick={() => removeIsin(isin)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <p className="mt-2 text-xs text-gray-500 text-center">
            {isins.length} positions
          </p>
        </div>

        {/* Scan Settings */}
        <div className="bg-white rounded-xl shadow-sm border p-6 min-w-[320px] h-[400px]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Scan Settings</h3>
          
          {/* Date */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Scan Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              min={dateRange.min}
              max={dateRange.max}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {dateRange.min && (
              <p className="text-xs text-gray-500 mt-1">
                Range: {dateRange.min} to {dateRange.max}
              </p>
            )}
          </div>

          {/* Threshold */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Momentum Threshold
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0.5"
                max="5"
                step="0.5"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="flex-1"
              />
              <span className="w-16 text-center font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                {threshold}%
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Alert when position moves more than {threshold}%
            </p>
          </div>

          {/* Scan Button */}
          <button
            onClick={handleScan}
            disabled={isins.length === 0 || !date}
            className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Activity className="w-5 h-5" />
            Scan Portfolio
          </button>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl shadow-sm border p-6 min-w-[320px] h-[400px]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Scan Summary</h3>
          
          {scanResult ? (
            <div className="space-y-4">
              {/* Price-based Summary */}
              {viewMode === 'price' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-2xl font-bold text-red-600">{scanResult.alerts.length}</p>
                    <p className="text-sm text-red-700">Price Alerts</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{scanResult.noAlerts.length}</p>
                    <p className="text-sm text-green-700">Normal</p>
                  </div>
                </div>
              )}
              
              {/* Sentiment-based Summary */}
              {viewMode === 'sentiment' && sentimentScan && (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 bg-red-50 rounded-lg">
                      <p className="text-xl font-bold text-red-600">{sentimentScan.redAlerts.length}</p>
                      <p className="text-xs text-red-700">RED</p>
                    </div>
                    <div className="text-center p-2 bg-yellow-50 rounded-lg">
                      <p className="text-xl font-bold text-yellow-600">{sentimentScan.yellowAlerts.length}</p>
                      <p className="text-xs text-yellow-700">YELLOW</p>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <p className="text-xl font-bold text-green-600">{sentimentScan.greenPositions.length}</p>
                      <p className="text-xs text-green-700">GREEN</p>
                    </div>
                  </div>
                  {sentimentScan.noData.length > 0 && (
                    <p className="text-xs text-gray-500 text-center">
                      {sentimentScan.noData.length} positions without sentiment data
                    </p>
                  )}
                </div>
              )}
              
              <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                <p className="text-sm text-gray-600">
                  <strong>Date:</strong> {date}
                </p>
                {viewMode === 'price' && (
                  <p className="text-sm text-gray-600">
                    <strong>Threshold:</strong> {threshold}%
                  </p>
                )}
                <p className="text-sm text-gray-600">
                  <strong>Positions:</strong> {isins.length}
                </p>
                {scanResult.indexChange != null && (
                  <p className="text-sm text-amber-700 flex items-center gap-1">
                    <Activity className="w-3 h-3" />
                    <strong>Index:</strong> 
                    <span className={scanResult.indexChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {scanResult.indexChange >= 0 ? '+' : ''}{scanResult.indexChange.toFixed(2)}%
                    </span>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                Add positions and click "Scan Portfolio"
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {scanResult && viewMode === 'price' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alerts Table */}
          <div className="bg-white rounded-xl shadow-sm border p-6 min-w-[480px] min-h-[400px]">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Momentum Alerts ({scanResult.alerts.length})
              </h3>
            </div>

            {scanResult.alerts.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                No alerts. All positions within threshold.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Symbol</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Change</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">vs Index</th>
                      <th className="text-center py-2 px-3 text-sm font-medium text-gray-600">Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResult.alerts.map((alert, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 px-3">
                          <div>
                            <p className="font-medium">{alert.symbol}</p>
                            <p className="text-xs text-gray-500 font-mono">{alert.isin}</p>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`inline-flex items-center gap-1 font-mono font-medium ${
                            alert.change >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {alert.change >= 0 ? (
                              <TrendingUp className="w-4 h-4" />
                            ) : (
                              <TrendingDown className="w-4 h-4" />
                            )}
                            {alert.change >= 0 ? '+' : ''}{alert.change.toFixed(2)}%
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {alert.relativeChange != null ? (
                            <span className={`text-xs font-mono ${
                              alert.relativeChange >= 0 ? 'text-blue-600' : 'text-purple-600'
                            }`}>
                              {alert.relativeChange >= 0 ? '+' : ''}{alert.relativeChange.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded ${
                            alert.level === 'HIGH' 
                              ? 'bg-red-100 text-red-700' 
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {alert.level}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* No Alerts Table */}
          <div className="bg-white rounded-xl shadow-sm border p-6 min-w-[480px] min-h-[400px]">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                Normal Positions ({scanResult.noAlerts.length})
              </h3>
            </div>

            {scanResult.noAlerts.length === 0 ? (
              <p className="text-center py-8 text-gray-500">
                All positions have alerts.
              </p>
            ) : (
              <div className="overflow-x-auto max-h-80">
                <table className="w-full">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b">
                      <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Symbol</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Change</th>
                      <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">vs Index</th>
                      <th className="text-center py-2 px-3 text-sm font-medium text-gray-600">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResult.noAlerts.map((item, idx) => (
                      <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 px-3">
                          <div>
                            <p className="font-medium text-sm">{item.symbol}</p>
                            <p className="text-xs text-gray-500 font-mono">{item.isin}</p>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-right text-sm font-mono">
                          {item.change != null ? (
                            <span className={item.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {item.change >= 0 ? '+' : ''}{item.change.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          {item.relativeChange != null ? (
                            <span className={`text-xs font-mono ${
                              item.relativeChange >= 0 ? 'text-blue-600' : 'text-purple-600'
                            }`}>
                              {item.relativeChange >= 0 ? '+' : ''}{item.relativeChange.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className={`px-2 py-0.5 text-xs rounded ${
                            item.status === 'Normal'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Smart Money Sentiment Results */}
      {scanResult && viewMode === 'sentiment' && sentimentScan && (
        <div className="space-y-6">
          {/* RED Alerts - Critical */}
          <SentimentAlertSection
            title="Critical Alerts (RED)"
            subtitle="Institutional investors are heavily selling - consider hedging or exit"
            items={sentimentScan.redAlerts}
            alertLevel="RED"
            icon={AlertTriangle}
            emptyMessage="No critical alerts. Smart money is not heavily selling any positions."
          />
          
          {/* YELLOW Alerts - Warning */}
          <SentimentAlertSection
            title="Warning Alerts (YELLOW)"
            subtitle="Mixed signals or volume spikes detected - monitor closely"
            items={sentimentScan.yellowAlerts}
            alertLevel="YELLOW"
            icon={AlertCircle}
            emptyMessage="No warning alerts."
          />
          
          {/* GREEN - Clear */}
          <SentimentAlertSection
            title="Clear Positions (GREEN)"
            subtitle="Smart money sentiment is neutral or positive"
            items={sentimentScan.greenPositions}
            alertLevel="GREEN"
            icon={CheckCircle}
            emptyMessage="No positions with positive sentiment data."
          />
          
          {/* No Data */}
          {sentimentScan.noData.length > 0 && (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-700">
                  No Sentiment Data ({sentimentScan.noData.length})
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {sentimentScan.noData.map((item, idx) => (
                  <span key={idx} className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs font-mono">
                    {item.symbol || item.isin}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Sentiment Alert Section Component
 */
function SentimentAlertSection({ title, subtitle, items, alertLevel, icon: Icon, emptyMessage }) {
  const levelConfig = {
    RED: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      headerBg: 'bg-red-100',
      iconColor: 'text-red-600',
      titleColor: 'text-red-800',
    },
    YELLOW: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      headerBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-800',
    },
    GREEN: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      headerBg: 'bg-green-100',
      iconColor: 'text-green-600',
      titleColor: 'text-green-800',
    },
  };
  
  const config = levelConfig[alertLevel];
  
  return (
    <div className={`rounded-xl border-2 ${config.border} ${config.bg}`}>
      <div className={`p-4 ${config.headerBg} rounded-t-lg`}>
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
          <h3 className={`text-lg font-semibold ${config.titleColor}`}>
            {title} ({items.length})
          </h3>
        </div>
        <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
      </div>
      
      <div className="p-4">
        {items.length === 0 ? (
          <p className="text-center py-4 text-gray-500">{emptyMessage}</p>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <SentimentAlertCard key={idx} item={item} alertLevel={alertLevel} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Individual Sentiment Alert Card
 */
function SentimentAlertCard({ item, alertLevel }) {
  const hasPattern = item.pattern?.flagged;
  const hasOutcomes = item.patternOutcomes?.totalPatterns > 0;
  
  return (
    <div className="bg-white rounded-lg border p-4 min-w-[400px] min-h-[200px]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900">{item.symbol}</p>
          {item.companyName && (
            <p className="text-xs text-gray-500">{item.companyName}</p>
          )}
          <p className="text-xs text-gray-400 font-mono">{item.isin}</p>
        </div>
        
        {/* Sentiment Score */}
        <div className="text-right w-[100px]">
          <p className={`text-xl font-bold ${
            item.sentiment >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {item.sentiment != null 
              ? `${item.sentiment >= 0 ? '+' : ''}${(item.sentiment * 100).toFixed(0)}%`
              : 'N/A'
            }
          </p>
          <p className="text-xs text-gray-500">Sentiment</p>
        </div>
      </div>
      
      {/* Pattern Flags */}
      {hasPattern && (
        <div className="mb-3 flex flex-wrap gap-2">
          {item.pattern.consecutiveSellDays >= 3 && (
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              {item.pattern.consecutiveSellDays} consecutive sell days
            </span>
          )}
          {item.pattern.hasVolumeSpike && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Volume spike ({(item.pattern.latestVolume / item.pattern.avgVolume).toFixed(1)}x avg)
            </span>
          )}
        </div>
      )}
      
      {/* Historical Pattern Outcomes */}
      {hasOutcomes && (
        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg h-[60px]">
          <p className="text-xs font-medium text-amber-800 mb-1">
            Historical Context (similar patterns)
          </p>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-600">
              <strong>{item.patternOutcomes.totalPatterns}</strong> occurrences
            </span>
            <span className="text-red-600">
              <strong>{item.patternOutcomes.declineRate.toFixed(0)}%</strong> led to decline
            </span>
            <span className={item.patternOutcomes.avgChange >= 0 ? 'text-green-600' : 'text-red-600'}>
              Avg: <strong>{item.patternOutcomes.avgChange >= 0 ? '+' : ''}{item.patternOutcomes.avgChange.toFixed(1)}%</strong> (5d)
            </span>
          </div>
        </div>
      )}
      
      {/* Investor Type Breakdown */}
      {item.typeSentiments && (
        <div className="grid grid-cols-5 gap-1 text-center">
          {SMART_MONEY_TYPES.map(type => {
            const typeSentiment = item.typeSentiments[type];
            if (typeSentiment === undefined) return (
              <div key={type} className="p-1 bg-gray-50 rounded h-[44px]">
                <p className="text-[10px] text-gray-400">{type}</p>
                <p className="text-xs text-gray-300">-</p>
              </div>
            );
            
            return (
              <div key={type} className={`p-1 rounded h-[44px] ${
                typeSentiment >= 0.3 ? 'bg-green-50' : 
                typeSentiment <= -0.3 ? 'bg-red-50' : 'bg-gray-50'
              }`}>
                <p className="text-[10px] text-gray-500">{CLIENT_TYPES[type]?.name?.split(' ')[0] || type}</p>
                <p className={`text-xs font-medium ${
                  typeSentiment >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {(typeSentiment * 100).toFixed(0)}%
                </p>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Volume Info */}
      {item.buyVolume != null && (
        <div className="mt-3 pt-3 border-t flex justify-between text-xs h-[40px]">
          <span className="text-green-600">Buy: ₪{(item.buyVolume / 1000000).toFixed(2)}M</span>
          <span className="text-red-600">Sell: ₪{(item.sellVolume / 1000000).toFixed(2)}M</span>
        </div>
      )}
    </div>
  );
}
