import { useState, useMemo, useCallback } from 'react';
import { Search, AlertTriangle, CheckCircle, Info, AlertCircle, TrendingUp, TrendingDown, Activity, Users, Zap, ThumbsUp, ThumbsDown, Minus, History, BarChart2, Clock } from 'lucide-react';
import { useDataStore } from '../hooks/useDataStore';
import { getTrafficLight, getSentimentLevel, CLIENT_TYPES, SMART_MONEY_TYPES, calculateConsensusScore, calculateSentimentTrend, getConfidenceLevel, calculatePatternStrength, getEnhancedAlertLevel } from '../lib/smartMoney';
import InfoTooltip, { METRIC_EXPLANATIONS } from './InfoTooltip';
import LoadingSpinner, { ButtonSpinner } from './LoadingSpinner';

// Format volume with appropriate suffix (M for millions, K for thousands)
function formatVolume(value) {
  if (value === null || value === undefined) return '₪0';
  if (value >= 1000000) {
    return `₪${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `₪${(value / 1000).toFixed(1)}K`;
  } else if (value > 0) {
    return `₪${Math.round(value)}`;
  }
  return '₪0';
}

export default function TradeChecker() {
  const { 
    tradingData, processedData,
    smartMoneyLoaded, smartMoneyAggregated, getSmartMoneySentiment, getSmartMoneyHistory, getPatternOutcomes, 
    detectSmartMoneyPattern, isinToSecurity,
    sessionDate
  } = useDataStore();
  const [isin, setIsin] = useState('');
  const [action, setAction] = useState('buy');
  const [isChecking, setIsChecking] = useState(false);
  const [sentimentData, setSentimentData] = useState(null);
  const [historicalContext, setHistoricalContext] = useState(null);
  const [pattern, setPattern] = useState(null);
  const [securityInfo, setSecurityInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [noDataFound, setNoDataFound] = useState(false);

  // Use session date (simulated present day)
  const currentDate = sessionDate || '';

  // Get unique ISINs that have smart money data FOR THE CURRENT SESSION DATE
  const availableIsins = useMemo(() => {
    if (!smartMoneyAggregated || smartMoneyAggregated.size === 0 || !currentDate) return [];
    
    // Extract ISINs that have valid sentiment data on the current session date
    const isinsWithData = new Set();
    
    for (const [key, value] of smartMoneyAggregated) {
      // Key format is "ISIN_DATE" - only include if date matches current session
      const [isin, date] = key.split('_');
      if (date === currentDate && value.smartMoneySentiment !== null) {
        isinsWithData.add(isin);
      }
    }
    
    return Array.from(isinsWithData).sort();
  }, [smartMoneyAggregated, currentDate]);

  const handleCheck = async () => {
    if (!isin || !currentDate) {
      setSentimentData(null);
      setHistoricalContext(null);
      setPattern(null);
      setSecurityInfo(null);
      setNoDataFound(false);
      return;
    }

    setIsChecking(true);
    setNoDataFound(false);
    
    // Small delay for UI feedback
    await new Promise(resolve => setTimeout(resolve, 300));

    const cleanIsin = isin.toUpperCase().trim();
    const secInfo = isinToSecurity.get(cleanIsin);
    setSecurityInfo(secInfo);
    
    // Fetch smart money sentiment data
    if (smartMoneyLoaded) {
      const sentiment = getSmartMoneySentiment(cleanIsin, currentDate);
      setSentimentData(sentiment);
      
      // Fetch pattern data
      const patternData = detectSmartMoneyPattern(cleanIsin, currentDate, 10);
      setPattern(patternData);
      
      // Fetch historical context for pattern outcomes
      // Check if sentiment exists AND has actual data (smartMoneySentiment is not null)
      const hasValidSentiment = sentiment && sentiment.smartMoneySentiment !== null;
      
      if (hasValidSentiment) {
        const historyData = getSmartMoneyHistory ? getSmartMoneyHistory(cleanIsin, currentDate, 10) : [];
        const patternOutcomes = getPatternOutcomes ? getPatternOutcomes(cleanIsin, sentiment.smartMoneySentiment, 5) : null;
        const trend = calculateSentimentTrend(sentiment.smartMoneySentiment, historyData, 5);
        const consensus = calculateConsensusScore(sentiment.typeSentiments);
        const patternStrength = calculatePatternStrength(patternData, sentiment.smartMoneySentiment);
        const alertLevel = getEnhancedAlertLevel(sentiment.smartMoneySentiment, patternData);
        
        setHistoricalContext({
          patternOutcomes,
          trend,
          consensus,
          historyLength: historyData.length,
          patternStrength,
          alertLevel,
        });
        setNoDataFound(false);
      } else {
        setSentimentData(null); // Clear sentiment data if no valid sentiment
        setHistoricalContext(null);
        setNoDataFound(true);
      }
      
      // Add to history only if there's valid sentiment data
      if (hasValidSentiment) {
        setHistory(prev => [{
          isin: cleanIsin,
          symbol: secInfo?.symbol || cleanIsin.substring(0, 8),
          action,
          date: currentDate,
          timestamp: new Date().toLocaleTimeString(),
          smartMoneySentiment: sentiment.smartMoneySentiment,
          trafficLight: getTrafficLight(action === 'buy', sentiment.smartMoneySentiment),
        }, ...prev.slice(0, 9)]);
      }
    } else {
      setSentimentData(null);
      setHistoricalContext(null);
      setPattern(null);
      setNoDataFound(false);
    }
    
    setIsChecking(false);
  };

  const handleIsinChange = (value) => {
    setIsin(value.toUpperCase());
    if (noDataFound) {
      setNoDataFound(false);
    }
  };

  if (!processedData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No data loaded. Please upload your files first.</p>
      </div>
    );
  }

  if (!smartMoneyLoaded) {
    return (
      <div className="text-center py-12">
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-8 max-w-lg mx-auto">
          <Zap className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-amber-800 dark:text-amber-200 mb-2">Smart Money Data Required</h3>
          <p className="text-amber-700 dark:text-amber-300">
            Please upload the Smart Money EOD and Securities Mapping files to enable trade checking.
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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Trade Checker</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Check institutional sentiment before executing a trade
          </p>
        </div>
        
        {sessionDate && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-blue-700 dark:text-blue-300">Session: <strong>{sessionDate}</strong></span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Trade Details</h3>
          
          <div className="space-y-4">
            {/* ISIN Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                ISIN
              </label>
              <input
                type="text"
                value={isin}
                onChange={(e) => handleIsinChange(e.target.value)}
                placeholder="e.g., IL0010811243"
                list="isin-list"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <datalist id="isin-list">
                {availableIsins.slice(0, 500).map(isin => (
                  <option key={isin} value={isin} />
                ))}
              </datalist>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {availableIsins.length.toLocaleString()} ISINs with data on {currentDate || 'selected date'}
              </p>
            </div>

            {/* Action Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Action
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAction('buy')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    action === 'buy'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Buy
                </button>
                <button
                  onClick={() => setAction('sell')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    action === 'sell'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  <TrendingDown className="w-4 h-4 inline mr-2" />
                  Sell
                </button>
              </div>
            </div>

            {/* Current Date Display */}
            {currentDate && (
              <div className="text-xs text-gray-500 text-center py-2 bg-gray-50 rounded-lg">
                Analysis Date: <span className="font-medium text-gray-700">{currentDate}</span>
              </div>
            )}

            {/* Check Button */}
            <button
              onClick={handleCheck}
              disabled={isChecking || !isin}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isChecking ? (
                <>
                  <ButtonSpinner />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Check Smart Money Sentiment
                </>
              )}
            </button>
          </div>
        </div>

        {/* Result Card */}
        <div className="space-y-4">
          {sentimentData ? (
            <>
              {/* Smart Money Sentiment Panel */}
              <SmartMoneySentimentCard 
                sentimentData={sentimentData} 
                isBuy={action === 'buy'}
                securityInfo={securityInfo}
                pattern={pattern}
                historicalContext={historicalContext}
              />
            </>
          ) : noDataFound ? (
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-amber-200 dark:border-amber-700 p-8 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
              <AlertCircle className="w-12 h-12 text-amber-500 dark:text-amber-400 mb-4" />
              <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-200 mb-2">
                No Data Available
              </h3>
              <p className="text-amber-700 dark:text-amber-300 mb-4">
                No institutional trading data found for this ISIN on the selected date.
              </p>
              <div className="text-sm text-amber-600 dark:text-amber-400 space-y-2 text-left max-w-md">
                <p className="flex items-start gap-2">
                  <span className="font-semibold">•</span>
                  <span>The ISIN may not exist in your dataset</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-semibold">•</span>
                  <span>There may be no smart money activity for this security on {currentDate}</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="font-semibold">•</span>
                  <span>Try checking a different date or verify the ISIN code</span>
                </p>
              </div>
              {securityInfo && (
                <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Security found: <strong className="text-gray-900 dark:text-white">{securityInfo.symbol}</strong>
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">{securityInfo.companyName}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-8 text-center h-full flex flex-col items-center justify-center min-h-[400px]">
              <Search className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                Enter trade details and click "Check" to see smart money sentiment
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                <Zap className="w-3 h-3" />
                Smart money sentiment analysis enabled
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* Historical Context Panel */}
      {historicalContext && (
        <HistoricalContextPanel 
          context={historicalContext}
          sentiment={sentimentData?.smartMoneySentiment}
        />
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Check History</h3>
            <button
              onClick={() => setHistory([])}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Clear
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">Time</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">Symbol</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">Action</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">Sentiment</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-600 dark:text-gray-400">Signal</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => (
                  <tr key={idx} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="py-2 px-3 text-sm text-gray-500 dark:text-gray-400">{item.timestamp}</td>
                    <td className="py-2 px-3 text-sm font-mono dark:text-gray-200">{item.symbol}</td>
                    <td className="py-2 px-3 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        item.action === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {item.action.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-sm text-right font-mono">
                      {item.smartMoneySentiment != null ? (
                        <span className={item.smartMoneySentiment >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {item.smartMoneySentiment >= 0 ? '+' : ''}{(item.smartMoneySentiment * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <TrafficLightMini color={item.trafficLight?.color} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function TrafficLightMini({ color }) {
  // Handle "No Data" case
  if (color === 'GRAY') {
    return (
      <div className="flex justify-center gap-1">
        <div className="w-3 h-3 rounded-full bg-gray-400" />
      </div>
    );
  }
  
  return (
    <div className="flex justify-center gap-1">
      <div className={`w-3 h-3 rounded-full ${color === 'RED' ? 'bg-red-500' : 'bg-red-200'}`} />
      <div className={`w-3 h-3 rounded-full ${color === 'YELLOW' ? 'bg-yellow-500' : 'bg-yellow-200'}`} />
      <div className={`w-3 h-3 rounded-full ${color === 'GREEN' ? 'bg-green-500' : 'bg-green-200'}`} />
    </div>
  );
}

/**
 * Smart Money Sentiment Card with Traffic Light
 */
function SmartMoneySentimentCard({ sentimentData, isBuy, securityInfo, pattern, historicalContext }) {
  const trafficLight = getTrafficLight(isBuy, sentimentData.smartMoneySentiment);
  
  const trafficColors = {
    GREEN: {
      bg: 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700',
      light: 'bg-green-500',
      text: 'text-green-700 dark:text-green-400',
      icon: ThumbsUp,
    },
    YELLOW: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700',
      light: 'bg-yellow-500',
      text: 'text-yellow-700 dark:text-yellow-400',
      icon: Minus,
    },
    RED: {
      bg: 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700',
      light: 'bg-red-500',
      text: 'text-red-700 dark:text-red-400',
      icon: ThumbsDown,
    },
    GRAY: {
      bg: 'bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600',
      light: 'bg-gray-400',
      text: 'text-gray-700 dark:text-gray-400',
      icon: Info,
    },
  };
  
  const config = trafficColors[trafficLight.color];
  const Icon = config.icon;
  
  return (
    <div className={`rounded-xl border-2 p-4 sm:p-5 ${config.bg} w-full`}>
      {/* Header with Security Info */}
      <div className="flex items-start justify-between mb-4">
        <div>
          {securityInfo && (
            <>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">{securityInfo.symbol}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">{securityInfo.companyName}</p>
            </>
          )}
        </div>
        
        {/* Traffic Light */}
        <div className="flex items-center gap-2">
          {trafficLight.color === 'GRAY' ? (
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded-full bg-gray-400" />
            </div>
          ) : (
            <div className="flex gap-1">
              <div className={`w-4 h-4 rounded-full ${trafficLight.color === 'RED' ? 'bg-red-500' : 'bg-red-200 dark:bg-red-800'}`} />
              <div className={`w-4 h-4 rounded-full ${trafficLight.color === 'YELLOW' ? 'bg-yellow-500' : 'bg-yellow-200 dark:bg-yellow-800'}`} />
              <div className={`w-4 h-4 rounded-full ${trafficLight.color === 'GREEN' ? 'bg-green-500' : 'bg-green-200 dark:bg-green-800'}`} />
            </div>
          )}
          <span className={`font-bold ${config.text}`}>{trafficLight.label}</span>
          <InfoTooltip title={METRIC_EXPLANATIONS.trafficLight.title} position="left">
            {METRIC_EXPLANATIONS.trafficLight.description}
          </InfoTooltip>
        </div>
      </div>
      
      {/* Recommendation Badge */}
      <div className={`mb-4 p-3 rounded-lg ${config.light} text-white`}>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <span className="font-bold text-lg">{trafficLight.recommendation}</span>
        </div>
        <p className="text-sm mt-1 opacity-90">{trafficLight.message}</p>
      </div>
      
      {/* Alert Level from EDA */}
      {historicalContext?.alertLevel && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          historicalContext.alertLevel.level === 'HIGH' ? 'bg-red-100 text-red-800' :
          historicalContext.alertLevel.level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
          historicalContext.alertLevel.level === 'BULLISH' ? 'bg-teal-100 text-teal-800' :
          'bg-gray-100 text-gray-700'
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-medium">{historicalContext.alertLevel.level} Signal</span>
          </div>
          <p className="mt-1">{historicalContext.alertLevel.reason}</p>
          {historicalContext.alertLevel.action && (
            <p className="mt-1 font-medium">Recommended: {historicalContext.alertLevel.action}</p>
          )}
        </div>
      )}
      
      {/* Overall Sentiment Score */}
      <div className="mb-4 p-3 bg-white rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1">
            <span className="text-sm text-gray-600">Institutional Sentiment</span>
            <InfoTooltip title={METRIC_EXPLANATIONS.sentiment.title} position="bottom">
              {METRIC_EXPLANATIONS.sentiment.description}
            </InfoTooltip>
          </div>
          <span className={`text-lg font-bold ${
            sentimentData.smartMoneySentiment >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {sentimentData.smartMoneySentiment >= 0 ? '+' : ''}{(sentimentData.smartMoneySentiment * 100).toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 relative overflow-hidden">
          <div 
            className={`absolute h-2.5 rounded-full ${sentimentData.smartMoneySentiment >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ 
              width: `${Math.abs(sentimentData.smartMoneySentiment) * 50}%`,
              left: sentimentData.smartMoneySentiment >= 0 ? '50%' : `${50 - Math.abs(sentimentData.smartMoneySentiment) * 50}%`,
            }}
          />
          {/* Center line marker */}
          <div className="absolute left-1/2 top-0 w-0.5 h-2.5 bg-gray-400" />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Strong Sell</span>
          <span>Neutral</span>
          <span>Strong Buy</span>
        </div>
      </div>
      
      {/* Pattern Strength Score */}
      {historicalContext?.patternStrength && historicalContext.patternStrength.score > 0 && (
        <div className="mb-4 p-3 bg-white rounded-lg border border-amber-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-700">Pattern Strength</span>
              <InfoTooltip title={METRIC_EXPLANATIONS.patternStrength.title} position="bottom">
                {METRIC_EXPLANATIONS.patternStrength.description}
              </InfoTooltip>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-bold text-white ${
                historicalContext.patternStrength.level === 'CRITICAL' ? 'bg-red-600' :
                historicalContext.patternStrength.level === 'HIGH' ? 'bg-orange-500' :
                historicalContext.patternStrength.level === 'MODERATE' ? 'bg-yellow-500' :
                'bg-gray-400'
              }`}>
                {historicalContext.patternStrength.score}
              </span>
              <span className="text-sm text-gray-600">{historicalContext.patternStrength.level}</span>
            </div>
          </div>
          <p className="text-xs text-amber-700 mt-2">{historicalContext.patternStrength.description}</p>
        </div>
      )}
      
      {/* Pattern Flags */}
      {pattern?.flagged && (
        <div className="mb-4 flex flex-wrap gap-2">
          {pattern.consecutiveSellDays >= 2 && (
            <div className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium flex items-center gap-1">
              <TrendingDown className="w-3 h-3" />
              {pattern.consecutiveSellDays} consecutive sell days
              <InfoTooltip title={METRIC_EXPLANATIONS.consecutiveSells.title} position="bottom">
                {METRIC_EXPLANATIONS.consecutiveSells.description}
              </InfoTooltip>
            </div>
          )}
          {pattern.hasVolumeSpike && (
            <div className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium flex items-center gap-1">
              <Activity className="w-3 h-3" />
              Volume spike ({(pattern.latestVolume / pattern.avgVolume).toFixed(1)}x avg)
              <InfoTooltip title={METRIC_EXPLANATIONS.volumeSpike.title} position="bottom">
                {METRIC_EXPLANATIONS.volumeSpike.description}
              </InfoTooltip>
            </div>
          )}
        </div>
      )}
      
      {/* Breakdown by Investor Type */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">By Investor Type</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {SMART_MONEY_TYPES.map(type => {
            const typeSentiment = sentimentData.typeSentiments?.[type];
            if (typeSentiment === undefined || typeSentiment === null) return null;
            
            const typeInfo = CLIENT_TYPES[type];
            const typeData = sentimentData.byType?.[type];
            const buyVol = typeData?.buy || 0;
            const sellVol = typeData?.sell || 0;
            
            return (
              <div key={type} className="p-2 bg-white rounded border min-w-0" title={typeInfo?.name}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-gray-700">{typeInfo?.shortName || type}</span>
                  <span className={`text-sm font-bold font-mono ${typeSentiment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {typeSentiment >= 0 ? '+' : ''}{(typeSentiment * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-500 border-t border-gray-100 pt-1 mt-1">
                  <span className="text-green-600">B:{formatVolume(buyVol)}</span>
                  <span className="text-red-600">S:{formatVolume(sellVol)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Volume Info */}
      <div className="mt-4 pt-3 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-500">Total Buy Volume</span>
          <p className="font-mono text-green-600">{formatVolume(sentimentData.smartMoneyBuy)}</p>
        </div>
        <div>
          <span className="text-gray-500">Total Sell Volume</span>
          <p className="font-mono text-red-600">{formatVolume(sentimentData.smartMoneySell)}</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Historical Context Panel - Shows pattern outcomes based on EDA findings
 */
function HistoricalContextPanel({ context, sentiment }) {
  if (!context) return null;
  
  const { patternOutcomes, trend, consensus } = context;
  const confidence = patternOutcomes ? getConfidenceLevel(patternOutcomes.totalPatterns) : null;
  
  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl border-2 border-amber-200 dark:border-amber-700 p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        <h4 className="font-semibold text-amber-900 dark:text-amber-200">Historical Context</h4>
        <span className="text-xs text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-800/50 px-2 py-0.5 rounded">EDA-Powered</span>
        <InfoTooltip title="Historical Context" position="right">
          Analysis based on historical patterns from the smart money EDA. Shows what happened in the past when sentiment was at similar levels, helping predict likely outcomes.
        </InfoTooltip>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Pattern Outcomes */}
        {patternOutcomes && patternOutcomes.totalPatterns > 0 && (
          <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Similar Patterns</span>
                <InfoTooltip title={METRIC_EXPLANATIONS.similarPatterns.title} position="bottom">
                  {METRIC_EXPLANATIONS.similarPatterns.description}
                </InfoTooltip>
              </div>
              {confidence && (
                <span className={`text-xs px-2 py-0.5 rounded ${
                  confidence.level === 'HIGH' ? 'bg-green-100 text-green-700' :
                  confidence.level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {confidence.label}
                </span>
              )}
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500 dark:text-gray-400">Occurrences</span>
                <span className="text-base sm:text-lg font-bold text-amber-700 dark:text-amber-400">{patternOutcomes.totalPatterns}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Led to Decline</span>
                  <InfoTooltip title={METRIC_EXPLANATIONS.declineRate.title} position="left">
                    {METRIC_EXPLANATIONS.declineRate.description}
                  </InfoTooltip>
                </div>
                <span className={`text-base sm:text-lg font-bold ${patternOutcomes.declineRate > 50 ? 'text-red-600' : 'text-green-600'}`}>
                  {patternOutcomes.declineRate.toFixed(0)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Avg 5d Return</span>
                  <InfoTooltip title={METRIC_EXPLANATIONS.avgReturn.title} position="left">
                    {METRIC_EXPLANATIONS.avgReturn.description}
                  </InfoTooltip>
                </div>
                <span className={`text-base sm:text-lg font-bold ${patternOutcomes.avgChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {patternOutcomes.avgChange >= 0 ? '+' : ''}{patternOutcomes.avgChange.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Sentiment Trend */}
        {trend && trend.trend !== 'UNKNOWN' && (
          <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-700">
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sentiment Trend</span>
              <InfoTooltip title={METRIC_EXPLANATIONS.sentimentTrend.title} position="bottom">
                {METRIC_EXPLANATIONS.sentimentTrend.description}
              </InfoTooltip>
            </div>
            <div className="mt-2 flex items-center gap-2">
              {trend.trend === 'IMPROVING' || trend.trend === 'SLIGHTLY_IMPROVING' ? (
                <TrendingUp className="w-5 h-5 text-green-500" />
              ) : trend.trend === 'DETERIORATING' || trend.trend === 'SLIGHTLY_DETERIORATING' ? (
                <TrendingDown className="w-5 h-5 text-red-500" />
              ) : (
                <Activity className="w-5 h-5 text-gray-400" />
              )}
              <span className={`text-base sm:text-lg font-bold ${
                trend.trend.includes('IMPROVING') ? 'text-green-600' :
                trend.trend.includes('DETERIORATING') ? 'text-red-600' : 'text-gray-600'
              }`}>
                {trend.trend.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Delta vs {trend.lookbackDays || 5}-day avg: {trend.delta >= 0 ? '+' : ''}{(trend.delta * 100).toFixed(1)}%
            </p>
          </div>
        )}
        
        {/* Consensus Indicator */}
        {consensus && consensus.totalTypes > 0 && (
          <div className="p-3 sm:p-4 bg-white dark:bg-gray-800 rounded-lg border border-amber-200 dark:border-amber-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Client Consensus</span>
                <InfoTooltip title={METRIC_EXPLANATIONS.consensus.title} position="bottom">
                  {METRIC_EXPLANATIONS.consensus.description}
                </InfoTooltip>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                consensus.consensusLevel === 'UNANIMOUS' ? 'bg-purple-100 text-purple-700' :
                consensus.consensusLevel === 'STRONG' ? 'bg-green-100 text-green-700' :
                consensus.consensusLevel === 'MODERATE' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {consensus.consensusLevel}
              </span>
            </div>
            
            {/* Visual dots showing agreement */}
            <div className="flex items-center gap-3 mt-2">
              <div className="flex gap-1">
                {[...Array(5)].map((_, i) => {
                  let dotColor = 'bg-gray-200 dark:bg-gray-600';
                  if (i < consensus.bullishCount) dotColor = 'bg-green-500';
                  else if (i < consensus.bullishCount + consensus.bearishCount) dotColor = 'bg-red-500';
                  else if (i < consensus.totalTypes) dotColor = 'bg-gray-400 dark:bg-gray-500';
                  return <div key={i} className={`w-3 h-3 rounded-full ${dotColor}`} />;
                })}
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              {consensus.bullishCount} bullish, {consensus.bearishCount} bearish, {consensus.neutralCount} neutral
            </p>
            
            <p className="text-xs text-amber-700 dark:text-amber-400 mt-2">
              {consensus.consensusLevel === 'STRONG' || consensus.consensusLevel === 'UNANIMOUS'
                ? 'Strong agreement - signal is more reliable.'
                : consensus.consensusLevel === 'MODERATE'
                  ? 'Moderate agreement - some support.'
                  : 'Weak consensus - investors divided.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function SentimentBadge({ sentiment }) {
  let bgClass = 'bg-gray-100 text-gray-700';
  let label = 'Neutral';
  
  if (sentiment >= 0.3) {
    bgClass = 'bg-green-100 text-green-700';
    label = sentiment >= 0.7 ? 'Strong Buy' : 'Buy';
  } else if (sentiment <= -0.3) {
    bgClass = 'bg-red-100 text-red-700';
    label = sentiment <= -0.7 ? 'Strong Sell' : 'Sell';
  }
  
  return (
    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${bgClass}`}>
      {label}
    </span>
  );
}
