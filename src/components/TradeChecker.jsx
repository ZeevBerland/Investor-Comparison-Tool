import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, AlertTriangle, CheckCircle, Info, AlertCircle, TrendingUp, TrendingDown, Activity, Users, Zap, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import { useDataStore } from '../hooks/useDataStore';
import { checkTradeWithIndex } from '../lib/alerts';
import { getAlertBgColor } from '../lib/analysis';
import { getTrafficLight, getSentimentLevel, CLIENT_TYPES, SMART_MONEY_TYPES } from '../lib/smartMoney';

export default function TradeChecker() {
  const { 
    tradingData, indicesData, processedData, availableIndices, selectedIndex, commonIndices, getIndexName, changeIndex,
    smartMoneyLoaded, getSmartMoneySentiment, isinToSecurity,
    sessionDate
  } = useDataStore();
  const [isin, setIsin] = useState('');
  const [action, setAction] = useState('buy');
  const [date, setDate] = useState(sessionDate || '');
  const [result, setResult] = useState(null);
  const [sentimentData, setSentimentData] = useState(null);
  const [history, setHistory] = useState([]);
  const [lastCheckedIndex, setLastCheckedIndex] = useState(null);

  // Get unique ISINs for suggestions
  const availableIsins = useMemo(() => {
    if (!tradingData) return [];
    const isins = new Set(tradingData.map(row => String(row.isin).trim().toUpperCase()));
    return Array.from(isins).sort();
  }, [tradingData]);

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

  const runCheck = useCallback((indexToUse) => {
    if (!isin || !date) {
      return null;
    }
    return checkTradeWithIndex(isin, action, date, tradingData, indicesData, indexToUse);
  }, [isin, action, date, tradingData, indicesData]);

  const handleCheck = () => {
    if (!isin || !date) {
      setResult({
        found: false,
        message: 'Please enter ISIN and date',
        alertLevel: 'NONE',
      });
      setSentimentData(null);
      return;
    }

    const checkResult = runCheck(selectedIndex);
    setResult(checkResult);
    setLastCheckedIndex(selectedIndex);
    
    // Fetch smart money sentiment data
    if (smartMoneyLoaded) {
      const sentiment = getSmartMoneySentiment(isin, date);
      setSentimentData(sentiment);
    } else {
      setSentimentData(null);
    }
    
    // Add to history
    if (checkResult) {
      const sentiment = smartMoneyLoaded ? getSmartMoneySentiment(isin, date) : null;
      setHistory(prev => [{
        ...checkResult,
        indexUsed: getIndexName(selectedIndex),
        timestamp: new Date().toLocaleTimeString(),
        smartMoneySentiment: sentiment?.smartMoneySentiment,
      }, ...prev.slice(0, 9)]);
    }
  };

  // Auto-update result when index changes (if we have a previous check)
  useEffect(() => {
    if (result && isin && date && selectedIndex !== lastCheckedIndex) {
      const checkResult = runCheck(selectedIndex);
      if (checkResult) {
        setResult(checkResult);
        setLastCheckedIndex(selectedIndex);
      }
    }
  }, [selectedIndex, result, isin, date, lastCheckedIndex, runCheck]);

  const handleIsinChange = (value) => {
    setIsin(value.toUpperCase());
  };

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
          <h2 className="text-2xl font-bold text-gray-900">Trade Checker</h2>
          <p className="text-gray-600 mt-1">
            Check if a proposed trade is counter to market direction
          </p>
        </div>
        
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Form */}
        <div className="bg-white rounded-xl shadow-sm border p-6 min-w-[400px] h-[420px]">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trade Details</h3>
          
          <div className="space-y-4">
            {/* ISIN Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ISIN
              </label>
              <input
                type="text"
                value={isin}
                onChange={(e) => handleIsinChange(e.target.value)}
                placeholder="e.g., IL0010811243"
                list="isin-list"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              <datalist id="isin-list">
                {availableIsins.slice(0, 100).map(isin => (
                  <option key={isin} value={isin} />
                ))}
              </datalist>
              <p className="text-xs text-gray-500 mt-1">
                {availableIsins.length.toLocaleString()} ISINs available
              </p>
            </div>

            {/* Action Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setAction('buy')}
                  className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                    action === 'buy'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <TrendingDown className="w-4 h-4 inline mr-2" />
                  Sell
                </button>
              </div>
            </div>

            {/* Date Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trade Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={dateRange.min}
                max={dateRange.max}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              />
              {dateRange.min && (
                <p className="text-xs text-gray-500 mt-1">
                  Available: {dateRange.min} to {dateRange.max}
                </p>
              )}
            </div>

            {/* Check Button */}
            <button
              onClick={handleCheck}
              className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-5 h-5" />
              Check Trade
            </button>
          </div>
        </div>

        {/* Result Card */}
        <div className="space-y-4">
          {result ? (
            <>
              <AlertResultCard result={result} indexName={getIndexName(selectedIndex)} />
              
              {/* Smart Money Sentiment Panel */}
              {sentimentData && (
                <SmartMoneySentimentCard 
                  sentimentData={sentimentData} 
                  isBuy={action === 'buy'}
                  securityInfo={isinToSecurity.get(isin.toUpperCase())}
                />
              )}
              
              {/* No Smart Money Data Notice */}
              {!sentimentData && smartMoneyLoaded && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    No smart money data available for this security on this date
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center h-full flex flex-col items-center justify-center">
              <Search className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-500">
                Enter trade details and click "Check Trade" to see the alert
              </p>
              {smartMoneyLoaded && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  Smart money sentiment analysis enabled
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Check History</h3>
            <button
              onClick={() => setHistory([])}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Time</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Symbol</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Action</th>
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Index</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Idx Chg</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Sec Chg</th>
                  <th className="text-right py-2 px-3 text-sm font-medium text-gray-600">Smart $</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-600">Alert</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => (
                  <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-2 px-3 text-sm text-gray-500">{item.timestamp}</td>
                    <td className="py-2 px-3 text-sm font-mono">{item.symbol}</td>
                    <td className="py-2 px-3 text-sm">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        item.action === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {item.action.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-xs text-amber-600">{item.indexUsed || 'N/A'}</td>
                    <td className="py-2 px-3 text-sm text-right font-mono">
                      {item.marketChange != null ? (
                        <span className={item.marketChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {item.marketChange >= 0 ? '+' : ''}{item.marketChange?.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-sm text-right font-mono">
                      {item.securityChange != null ? (
                        <span className={item.securityChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {item.securityChange >= 0 ? '+' : ''}{item.securityChange?.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">N/A</span>
                      )}
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
                      <AlertBadge level={item.alertLevel} />
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

function AlertResultCard({ result, indexName }) {
  const alertConfig = {
    HIGH: {
      icon: AlertTriangle,
      title: 'HIGH ALERT',
      bgClass: 'bg-red-50 border-red-200',
      iconClass: 'text-red-500',
      titleClass: 'text-red-700',
    },
    MEDIUM: {
      icon: AlertCircle,
      title: 'MEDIUM ALERT',
      bgClass: 'bg-yellow-50 border-yellow-200',
      iconClass: 'text-yellow-500',
      titleClass: 'text-yellow-700',
    },
    LOW: {
      icon: Info,
      title: 'LOW ALERT',
      bgClass: 'bg-blue-50 border-blue-200',
      iconClass: 'text-blue-500',
      titleClass: 'text-blue-700',
    },
    NONE: {
      icon: CheckCircle,
      title: 'NO ALERT',
      bgClass: 'bg-green-50 border-green-200',
      iconClass: 'text-green-500',
      titleClass: 'text-green-700',
    },
  };

  const config = alertConfig[result.alertLevel] || alertConfig.NONE;
  const Icon = config.icon;

  return (
    <div className={`rounded-xl border-2 p-6 ${config.bgClass} w-[480px] min-h-[320px]`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <Icon className={`w-8 h-8 ${config.iconClass}`} />
        <h3 className={`text-xl font-bold ${config.titleClass}`}>{config.title}</h3>
      </div>

      {/* Symbol & ISIN */}
      <div className="flex items-center gap-4 mb-4 text-gray-600">
        <div>
          <span className="text-sm">Symbol:</span>
          <span className="ml-2 font-semibold text-gray-900">{result.symbol}</span>
        </div>
        <div>
          <span className="text-sm">ISIN:</span>
          <span className="ml-2 font-mono text-gray-700">{result.isin}</span>
        </div>
      </div>

      {/* Index vs Security Comparison */}
      {result.found && (
        <div className="mb-4 p-4 bg-white rounded-lg space-y-3 h-[140px]">
          {/* Index Change (Market) */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              {indexName || 'Index'} Change:
            </span>
            <span className={`text-xl font-bold ${
              result.marketChange >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {result.marketChange != null 
                ? `${result.marketChange >= 0 ? '+' : ''}${result.marketChange.toFixed(2)}%`
                : 'N/A'}
            </span>
          </div>
          
          {/* Security Change (Individual Stock) */}
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm text-gray-600 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Security Change:
            </span>
            <span className={`text-lg font-semibold ${
              result.securityChange != null
                ? (result.securityChange >= 0 ? 'text-green-600' : 'text-red-600')
                : 'text-gray-400'
            }`}>
              {result.securityChange != null 
                ? `${result.securityChange >= 0 ? '+' : ''}${result.securityChange.toFixed(2)}%`
                : 'N/A'}
            </span>
          </div>

          {/* Comparison Insight */}
          {result.marketChange != null && result.securityChange != null && (
            <div className="text-xs text-gray-500 border-t pt-2">
              {Math.abs(result.securityChange) > Math.abs(result.marketChange) 
                ? `Security moved ${(Math.abs(result.securityChange) - Math.abs(result.marketChange)).toFixed(2)}% more than index`
                : `Security moved ${(Math.abs(result.marketChange) - Math.abs(result.securityChange)).toFixed(2)}% less than index`}
            </div>
          )}
        </div>
      )}

      {/* No Data Case */}
      {!result.found && result.marketChange == null && (
        <div className="mb-4 p-4 bg-gray-100 rounded-lg text-gray-500 h-[60px]">
          No market data available for this date
        </div>
      )}

      {/* Message */}
      <p className="text-gray-700">{result.message}</p>

      {/* Counter-Market Indicator */}
      {result.found && (
        <div className="mt-4 pt-4 border-t border-gray-200 h-[40px]">
          {result.isCounter ? (
            <div className="flex items-center gap-2 text-amber-700">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">COUNTER-MARKET TRADE</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">ALIGNED WITH MARKET</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AlertBadge({ level }) {
  const classes = {
    HIGH: 'bg-red-500 text-white',
    MEDIUM: 'bg-yellow-500 text-white',
    LOW: 'bg-blue-500 text-white',
    NONE: 'bg-green-500 text-white',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${classes[level] || classes.NONE}`}>
      {level}
    </span>
  );
}

/**
 * Smart Money Sentiment Card with Traffic Light
 */
function SmartMoneySentimentCard({ sentimentData, isBuy, securityInfo }) {
  const trafficLight = getTrafficLight(isBuy, sentimentData.smartMoneySentiment);
  
  const trafficColors = {
    GREEN: {
      bg: 'bg-green-50 border-green-300',
      light: 'bg-green-500',
      text: 'text-green-700',
      icon: ThumbsUp,
    },
    YELLOW: {
      bg: 'bg-yellow-50 border-yellow-300',
      light: 'bg-yellow-500',
      text: 'text-yellow-700',
      icon: Minus,
    },
    RED: {
      bg: 'bg-red-50 border-red-300',
      light: 'bg-red-500',
      text: 'text-red-700',
      icon: ThumbsDown,
    },
  };
  
  const config = trafficColors[trafficLight.color];
  const Icon = config.icon;
  
  return (
    <div className={`rounded-xl border-2 p-5 ${config.bg} w-[480px] min-h-[520px]`}>
      {/* Header with Traffic Light */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Users className="w-5 h-5 text-gray-600" />
          <h4 className="font-semibold text-gray-900">Smart Money Sentiment</h4>
        </div>
        
        {/* Traffic Light */}
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className={`w-4 h-4 rounded-full ${trafficLight.color === 'RED' ? 'bg-red-500' : 'bg-red-200'}`} />
            <div className={`w-4 h-4 rounded-full ${trafficLight.color === 'YELLOW' ? 'bg-yellow-500' : 'bg-yellow-200'}`} />
            <div className={`w-4 h-4 rounded-full ${trafficLight.color === 'GREEN' ? 'bg-green-500' : 'bg-green-200'}`} />
          </div>
          <span className={`font-bold ${config.text}`}>{trafficLight.label}</span>
        </div>
      </div>
      
      {/* Recommendation Badge */}
      <div className={`mb-4 p-3 rounded-lg ${config.light} text-white h-[80px]`}>
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          <span className="font-bold text-lg">{trafficLight.recommendation}</span>
        </div>
        <p className="text-sm mt-1 opacity-90">{trafficLight.message}</p>
      </div>
      
      {/* Overall Sentiment Score */}
      <div className="mb-4 p-3 bg-white rounded-lg h-[100px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-600">Institutional Sentiment</span>
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
      
      {/* Breakdown by Investor Type */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">By Investor Type</p>
        <div className="grid grid-cols-2 gap-2">
          {SMART_MONEY_TYPES.map(type => {
            const typeSentiment = sentimentData.typeSentiments?.[type];
            if (typeSentiment === undefined) return null;
            
            const typeInfo = CLIENT_TYPES[type];
            const level = getSentimentLevel(typeSentiment);
            
            return (
              <div key={type} className="p-2 bg-white rounded border h-[60px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-700">{typeInfo?.name || type}</span>
                  <SentimentBadge sentiment={typeSentiment} />
                </div>
                <div className="text-right text-sm font-mono mt-1">
                  <span className={typeSentiment >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {typeSentiment >= 0 ? '+' : ''}{(typeSentiment * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Volume Info */}
      <div className="mt-4 pt-3 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm h-[60px]">
        <div>
          <span className="text-gray-500">Total Buy Volume</span>
          <p className="font-mono text-green-600">₪{(sentimentData.smartMoneyBuy / 1000000).toFixed(2)}M</p>
        </div>
        <div>
          <span className="text-gray-500">Total Sell Volume</span>
          <p className="font-mono text-red-600">₪{(sentimentData.smartMoneySell / 1000000).toFixed(2)}M</p>
        </div>
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
