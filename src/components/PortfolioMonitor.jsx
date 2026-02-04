import { useState, useMemo, useEffect } from 'react';
import { Activity, AlertTriangle, Search, Plus, X, RefreshCw, TrendingUp, TrendingDown, Users, Zap, AlertCircle, CheckCircle, Clock, BarChart2, Shield, Filter, ArrowUpDown } from 'lucide-react';
import { useDataStore } from '../hooks/useDataStore';
import { getSentimentAlertLevel, CLIENT_TYPES, SMART_MONEY_TYPES, getEnhancedAlertLevel, calculatePatternStrength, calculateConsensusScore } from '../lib/smartMoney';
import InfoTooltip, { METRIC_EXPLANATIONS } from './InfoTooltip';
import LoadingSpinner, { ButtonSpinner } from './LoadingSpinner';

export default function PortfolioMonitor() {
  const { 
    tradingData, processedData, traders,
    smartMoneyLoaded, getSmartMoneySentiment, getSmartMoneyHistory, detectSmartMoneyPattern, isinToSecurity, getPatternOutcomes,
    sessionDate, sessionTrader
  } = useDataStore();
  const [isins, setIsins] = useState([]);
  const [newIsin, setNewIsin] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [sentimentScan, setSentimentScan] = useState(null);
  const [filterLevel, setFilterLevel] = useState('all'); // 'all', 'HIGH', 'MEDIUM', 'BULLISH', 'CLEAR'
  const [sortBy, setSortBy] = useState('alert'); // 'alert', 'sentiment', 'pattern'

  // Auto-load session trader's portfolio on mount
  useEffect(() => {
    if (sessionTrader && processedData?.traderPortfolios?.[sessionTrader]) {
      setIsins(processedData.traderPortfolios[sessionTrader].slice(0, 100));
    }
  }, [sessionTrader, processedData]);

  // Use session date (simulated present day)
  const currentDate = sessionDate || '';

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

  const handleScan = async () => {
    if (isins.length === 0 || !currentDate) {
      return;
    }
    
    setIsScanning(true);
    
    // Small delay for UI feedback
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Scan for smart money sentiment
    if (smartMoneyLoaded) {
      const sentimentResults = scanPortfolioSentiment(isins, currentDate);
      setSentimentScan(sentimentResults);
    } else {
      setSentimentScan(null);
    }
    
    setIsScanning(false);
  };
  
  // Scan portfolio for smart money sentiment using EDA-based thresholds
  const scanPortfolioSentiment = (isinList, scanDate) => {
    const redAlerts = [];
    const yellowAlerts = [];
    const tealAlerts = [];
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
      
      // Calculate pattern strength (based on EDA)
      const patternStrength = calculatePatternStrength(pattern, sentiment?.smartMoneySentiment);
      
      // Calculate consensus across client types (based on EDA)
      const consensus = sentiment?.typeSentiments 
        ? calculateConsensusScore(sentiment.typeSentiments)
        : null;
      
      const item = {
        isin: isinClean,
        symbol: secInfo?.symbol || isinClean.substring(0, 8),
        companyName: secInfo?.companyName,
        sentiment: sentiment?.smartMoneySentiment,
        typeSentiments: sentiment?.typeSentiments,
        buyVolume: sentiment?.smartMoneyBuy,
        sellVolume: sentiment?.smartMoneySell,
        pattern,
        patternOutcomes,
        patternStrength,
        consensus,
        date: scanDate,
      };
      
      // Check both if sentiment exists AND has valid data
      if (!sentiment || sentiment.smartMoneySentiment === null) {
        noData.push(item);
        continue;
      }
      
      // Use EDA-based enhanced alert level
      const enhancedAlert = getEnhancedAlertLevel(sentiment.smartMoneySentiment, pattern);
      item.alertLevel = enhancedAlert.level;
      item.alertColor = enhancedAlert.color;
      item.alertReason = enhancedAlert.reason;
      item.alertAction = enhancedAlert.action;
      item.alertConfidence = enhancedAlert.confidence;
      
      // Categorize by EDA-based alert levels
      if (enhancedAlert.level === 'HIGH') {
        redAlerts.push(item);
      } else if (enhancedAlert.level === 'MEDIUM') {
        yellowAlerts.push(item);
      } else if (enhancedAlert.level === 'BULLISH') {
        tealAlerts.push(item);
      } else {
        greenPositions.push(item);
      }
    }
    
    // Sort alerts by pattern strength (worst first for red/yellow, best first for bullish)
    redAlerts.sort((a, b) => (b.patternStrength?.score || 0) - (a.patternStrength?.score || 0));
    yellowAlerts.sort((a, b) => (b.patternStrength?.score || 0) - (a.patternStrength?.score || 0));
    tealAlerts.sort((a, b) => (b.sentiment || 0) - (a.sentiment || 0));
    
    return {
      redAlerts,
      yellowAlerts,
      tealAlerts,
      greenPositions,
      noData,
      totalScanned: isinList.length,
    };
  };

  // Filter and sort results
  const filteredResults = useMemo(() => {
    if (!sentimentScan) return null;
    
    let allItems = [];
    
    if (filterLevel === 'all' || filterLevel === 'HIGH') {
      allItems = allItems.concat(sentimentScan.redAlerts.map(i => ({ ...i, category: 'HIGH' })));
    }
    if (filterLevel === 'all' || filterLevel === 'MEDIUM') {
      allItems = allItems.concat(sentimentScan.yellowAlerts.map(i => ({ ...i, category: 'MEDIUM' })));
    }
    if (filterLevel === 'all' || filterLevel === 'BULLISH') {
      allItems = allItems.concat(sentimentScan.tealAlerts.map(i => ({ ...i, category: 'BULLISH' })));
    }
    if (filterLevel === 'all' || filterLevel === 'CLEAR') {
      allItems = allItems.concat(sentimentScan.greenPositions.map(i => ({ ...i, category: 'CLEAR' })));
    }
    
    // Sort
    if (sortBy === 'sentiment') {
      allItems.sort((a, b) => (a.sentiment || 0) - (b.sentiment || 0));
    } else if (sortBy === 'pattern') {
      allItems.sort((a, b) => (b.patternStrength?.score || 0) - (a.patternStrength?.score || 0));
    }
    // 'alert' is default - already sorted by category
    
    return allItems;
  }, [sentimentScan, filterLevel, sortBy]);

  if (!processedData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No data loaded. Please upload your files first.</p>
      </div>
    );
  }

  if (!smartMoneyLoaded) {
    return (
      <div className="text-center py-12">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 max-w-lg mx-auto">
          <Zap className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-amber-800 mb-2">Smart Money Data Required</h3>
          <p className="text-amber-700">
            Please upload the Smart Money EOD and Securities Mapping files to enable portfolio monitoring.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Portfolio Monitor</h2>
          <p className="text-gray-600 mt-1">
            Scan positions for institutional sentiment alerts
          </p>
        </div>
        
        {sessionDate && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm text-blue-700">Session: <strong>{sessionDate}</strong></span>
          </div>
        )}
      </div>
      
      {/* Smart Money Status Banner */}
      <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
        <Zap className="w-4 h-4 text-green-600" />
        <p className="text-sm text-green-700">
          Smart money sentiment analysis enabled - institutional trading patterns will be analyzed
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolio Input */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
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
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Scan Settings</h3>
          
          {/* Current Date Display */}
          {currentDate && (
            <div className="mb-4 text-xs text-gray-500 text-center py-2 bg-gray-50 rounded-lg">
              Analysis Date: <span className="font-medium text-gray-700">{currentDate}</span>
            </div>
          )}

          {/* Scan Button */}
          <button
            onClick={handleScan}
            disabled={isins.length === 0 || !currentDate || isScanning}
            className="w-full py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isScanning ? (
              <>
                <ButtonSpinner />
                Scanning...
              </>
            ) : (
              <>
                <Activity className="w-5 h-5" />
                Scan Smart Money Sentiment
              </>
            )}
          </button>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-2 mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Scan Summary</h3>
            <InfoTooltip title="Scan Summary" position="bottom">
              Overview of your portfolio's smart money sentiment. Securities are categorized by alert level based on institutional trading patterns and sentiment analysis.
            </InfoTooltip>
          </div>
          
          {sentimentScan ? (
            <div className="space-y-4">
              {/* Alert Summary */}
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center p-2 bg-red-50 rounded-lg relative group">
                  <p className="text-xl font-bold text-red-600">{sentimentScan.redAlerts.length}</p>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-xs text-red-700">HIGH ALERT</p>
                    <InfoTooltip title={METRIC_EXPLANATIONS.alertHigh.title} position="top">
                      {METRIC_EXPLANATIONS.alertHigh.description}
                    </InfoTooltip>
                  </div>
                </div>
                <div className="text-center p-2 bg-yellow-50 rounded-lg">
                  <p className="text-xl font-bold text-yellow-600">{sentimentScan.yellowAlerts.length}</p>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-xs text-yellow-700">MEDIUM</p>
                    <InfoTooltip title={METRIC_EXPLANATIONS.alertMedium.title} position="top">
                      {METRIC_EXPLANATIONS.alertMedium.description}
                    </InfoTooltip>
                  </div>
                </div>
                <div className="text-center p-2 bg-teal-50 rounded-lg">
                  <p className="text-xl font-bold text-teal-600">{sentimentScan.tealAlerts?.length || 0}</p>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-xs text-teal-700">BULLISH</p>
                    <InfoTooltip title={METRIC_EXPLANATIONS.alertBullish.title} position="top">
                      {METRIC_EXPLANATIONS.alertBullish.description}
                    </InfoTooltip>
                  </div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <p className="text-xl font-bold text-green-600">{sentimentScan.greenPositions.length}</p>
                  <div className="flex items-center justify-center gap-1">
                    <p className="text-xs text-green-700">CLEAR</p>
                    <InfoTooltip title={METRIC_EXPLANATIONS.alertClear.title} position="top">
                      {METRIC_EXPLANATIONS.alertClear.description}
                    </InfoTooltip>
                  </div>
                </div>
              </div>
              {sentimentScan.noData.length > 0 && (
                <p className="text-xs text-gray-500 text-center">
                  {sentimentScan.noData.length} positions without sentiment data
                </p>
              )}
              
              <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                <p className="text-sm text-gray-600">
                  <strong>Date:</strong> {date}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Positions:</strong> {isins.length}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>With Data:</strong> {sentimentScan.totalScanned - sentimentScan.noData.length}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                Add positions and click "Scan" to analyze
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Filter & Sort Controls */}
      {sentimentScan && (
        <div className="bg-white rounded-xl shadow-sm border p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Filter by Alert Level */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">Filter:</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {['all', 'HIGH', 'MEDIUM', 'BULLISH', 'CLEAR'].map(level => (
                  <button
                    key={level}
                    onClick={() => setFilterLevel(level)}
                    className={`px-2 sm:px-3 py-1 text-xs font-medium rounded transition-colors ${
                      filterLevel === level
                        ? level === 'HIGH' ? 'bg-red-500 text-white' :
                          level === 'MEDIUM' ? 'bg-yellow-500 text-white' :
                          level === 'BULLISH' ? 'bg-teal-500 text-white' :
                          level === 'CLEAR' ? 'bg-green-500 text-white' :
                          'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {level === 'all' ? 'All' : level}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Sort */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="alert">By Alert Level</option>
                <option value="sentiment">By Sentiment</option>
                <option value="pattern">By Pattern</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Smart Money Sentiment Results */}
      {sentimentScan && (
        <div className="space-y-6">
          {/* Filtered Results Grid */}
          {filteredResults && filteredResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredResults.map((item, idx) => (
                <SentimentAlertCard key={idx} item={item} />
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No positions match the current filter</p>
            </div>
          )}
          
          {/* No Data Section */}
          {sentimentScan.noData.length > 0 && filterLevel === 'all' && (
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
 * Individual Sentiment Alert Card - Enhanced with Pattern Strength Score
 */
function SentimentAlertCard({ item }) {
  const hasPattern = item.pattern?.flagged;
  const hasOutcomes = item.patternOutcomes?.totalPatterns > 0;
  const hasPatternStrength = item.patternStrength?.score > 0;
  const hasConsensus = item.consensus?.totalTypes > 0;
  
  const categoryColors = {
    HIGH: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-500' },
    MEDIUM: { bg: 'bg-yellow-50', border: 'border-yellow-200', badge: 'bg-yellow-500' },
    BULLISH: { bg: 'bg-teal-50', border: 'border-teal-200', badge: 'bg-teal-500' },
    CLEAR: { bg: 'bg-green-50', border: 'border-green-200', badge: 'bg-green-500' },
  };
  
  const colors = categoryColors[item.category] || categoryColors.CLEAR;
  
  return (
    <div className={`rounded-xl border-2 ${colors.border} ${colors.bg} p-4`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${colors.badge}`}>
              {item.category}
            </span>
            <p className="font-semibold text-gray-900 truncate">{item.symbol}</p>
          </div>
          {item.companyName && (
            <p className="text-xs text-gray-500 truncate mt-1">{item.companyName}</p>
          )}
        </div>
        
        {/* Scores Section */}
        <div className="flex gap-2 ml-2">
          {/* Pattern Strength Score */}
          {hasPatternStrength && (
            <div className="text-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                item.patternStrength.level === 'CRITICAL' ? 'bg-red-600' :
                item.patternStrength.level === 'HIGH' ? 'bg-orange-500' :
                item.patternStrength.level === 'MODERATE' ? 'bg-yellow-500' :
                'bg-gray-400'
              }`}>
                {item.patternStrength.score}
              </div>
            </div>
          )}
          
          {/* Sentiment Score */}
          <div className="text-right">
            <p className={`text-xl font-bold ${
              item.sentiment >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {item.sentiment != null 
                ? `${item.sentiment >= 0 ? '+' : ''}${(item.sentiment * 100).toFixed(0)}%`
                : 'N/A'
              }
            </p>
          </div>
        </div>
      </div>
      
      {/* Alert Reason */}
      {item.alertReason && (
        <div className={`mb-3 p-2 rounded-lg text-xs ${
          item.category === 'HIGH' ? 'bg-red-100 text-red-700' :
          item.category === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
          item.category === 'BULLISH' ? 'bg-teal-100 text-teal-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          <span className="font-medium">Signal: </span>{item.alertReason}
        </div>
      )}
      
      {/* Pattern Flags */}
      {hasPattern && (
        <div className="mb-3 flex flex-wrap gap-2">
          {item.pattern.consecutiveSellDays >= 2 && (
            <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              {item.pattern.consecutiveSellDays} sell days
            </span>
          )}
          {item.pattern.hasVolumeSpike && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium flex items-center gap-1">
              <Activity className="w-3 h-3" />
              {(item.pattern.latestVolume / item.pattern.avgVolume).toFixed(1)}x vol
            </span>
          )}
        </div>
      )}
      
      {/* Consensus Indicator */}
      {hasConsensus && (
        <div className="mb-3 flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500">Consensus:</span>
            <InfoTooltip title={METRIC_EXPLANATIONS.consensus.title} position="top">
              {METRIC_EXPLANATIONS.consensus.description}
            </InfoTooltip>
          </div>
          <div className="flex gap-0.5">
            {[...Array(5)].map((_, i) => {
              let dotColor = 'bg-gray-200';
              if (i < item.consensus.bullishCount) dotColor = 'bg-green-500';
              else if (i < item.consensus.bullishCount + item.consensus.bearishCount) dotColor = 'bg-red-500';
              else if (i < item.consensus.totalTypes) dotColor = 'bg-gray-400';
              return <div key={i} className={`w-2 h-2 rounded-full ${dotColor}`} />;
            })}
          </div>
          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
            item.consensus.consensusLevel === 'UNANIMOUS' || item.consensus.consensusLevel === 'STRONG' 
              ? 'bg-purple-100 text-purple-700' 
              : item.consensus.consensusLevel === 'MODERATE'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600'
          }`}>
            {item.consensus.consensusLevel}
          </span>
        </div>
      )}
      
      {/* Historical Pattern Outcomes */}
      {hasOutcomes && (
        <div className="mb-3 p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-center gap-1 mb-1">
            <p className="text-xs font-medium text-amber-800">Historical</p>
            <InfoTooltip title={METRIC_EXPLANATIONS.similarPatterns.title} position="top">
              {METRIC_EXPLANATIONS.similarPatterns.description}
            </InfoTooltip>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-gray-600">
              {item.patternOutcomes.totalPatterns} similar
            </span>
            <span className="text-red-600">
              {item.patternOutcomes.declineRate.toFixed(0)}% declined
            </span>
          </div>
        </div>
      )}
      
      {/* Investor Type Breakdown */}
      {item.typeSentiments && (
        <div className="grid grid-cols-5 gap-1 text-center">
          {SMART_MONEY_TYPES.map(type => {
            const typeSentiment = item.typeSentiments[type];
            const typeInfo = CLIENT_TYPES[type];
            
            if (typeSentiment === undefined || typeSentiment === null) return (
              <div key={type} className="p-1 bg-white dark:bg-gray-800 rounded" title={typeInfo?.name}>
                <p className="text-[10px] text-gray-400">{typeInfo?.shortName || type}</p>
                <p className="text-xs text-gray-300 dark:text-gray-600">-</p>
              </div>
            );
            
            return (
              <div key={type} className={`p-1 rounded ${
                typeSentiment >= 0.3 ? 'bg-green-100' : 
                typeSentiment <= -0.3 ? 'bg-red-100' : 'bg-white'
              }`} title={typeInfo?.name}>
                <p className="text-[10px] text-gray-500">{typeInfo?.shortName || type}</p>
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
        <div className="mt-3 pt-2 border-t border-gray-200 flex justify-between text-xs">
          <span className="text-green-600">Buy: ₪{(item.buyVolume / 1000000).toFixed(1)}M</span>
          <span className="text-red-600">Sell: ₪{(item.sellVolume / 1000000).toFixed(1)}M</span>
        </div>
      )}
    </div>
  );
}
