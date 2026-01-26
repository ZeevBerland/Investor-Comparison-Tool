import { useState, useMemo, useEffect, useCallback } from 'react';
import { Search, AlertTriangle, CheckCircle, Info, AlertCircle, TrendingUp, TrendingDown, Activity } from 'lucide-react';
import { useDataStore } from '../hooks/useDataStore';
import { checkTradeWithIndex } from '../lib/alerts';
import { getAlertBgColor } from '../lib/analysis';

export default function TradeChecker() {
  const { tradingData, indicesData, processedData, availableIndices, selectedIndex, commonIndices, getIndexName, changeIndex } = useDataStore();
  const [isin, setIsin] = useState('');
  const [action, setAction] = useState('buy');
  const [date, setDate] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [lastCheckedIndex, setLastCheckedIndex] = useState(null);

  // Get unique ISINs for suggestions
  const availableIsins = useMemo(() => {
    if (!tradingData) return [];
    const isins = new Set(tradingData.map(row => String(row.isin).trim().toUpperCase()));
    return Array.from(isins).sort();
  }, [tradingData]);

  // Get date range
  const dateRange = useMemo(() => {
    if (!tradingData || tradingData.length === 0) return { min: '', max: '' };
    const dates = tradingData
      .map(row => row.tradeDate.split('T')[0].split(' ')[0])
      .sort();
    return { min: dates[0], max: dates[dates.length - 1] };
  }, [tradingData]);

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
      return;
    }

    const checkResult = runCheck(selectedIndex);
    setResult(checkResult);
    setLastCheckedIndex(selectedIndex);
    
    // Add to history
    if (checkResult) {
      setHistory(prev => [{
        ...checkResult,
        indexUsed: getIndexName(selectedIndex),
        timestamp: new Date().toLocaleTimeString(),
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
        <div className="bg-white rounded-xl shadow-sm border p-6">
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
        <div>
          {result ? (
            <AlertResultCard result={result} indexName={getIndexName(selectedIndex)} />
          ) : (
            <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-8 text-center h-full flex flex-col items-center justify-center">
              <Search className="w-12 h-12 text-gray-400 mb-4" />
              <p className="text-gray-500">
                Enter trade details and click "Check Trade" to see the alert
              </p>
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
    <div className={`rounded-xl border-2 p-6 ${config.bgClass}`}>
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
        <div className="mb-4 p-4 bg-white rounded-lg space-y-3">
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
        <div className="mb-4 p-4 bg-gray-100 rounded-lg text-gray-500">
          No market data available for this date
        </div>
      )}

      {/* Message */}
      <p className="text-gray-700">{result.message}</p>

      {/* Counter-Market Indicator */}
      {result.found && (
        <div className="mt-4 pt-4 border-t border-gray-200">
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
