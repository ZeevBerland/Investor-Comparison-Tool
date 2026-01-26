import { useState, useMemo, useEffect } from 'react';
import { Activity, AlertTriangle, Search, Plus, X, RefreshCw, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { useDataStore } from '../hooks/useDataStore';
import { scanPortfolio } from '../lib/alerts';

export default function PortfolioMonitor() {
  const { tradingData, indicesData, processedData, traders, availableIndices, selectedIndex, commonIndices, getIndexName, changeIndex } = useDataStore();
  const [isins, setIsins] = useState([]);
  const [newIsin, setNewIsin] = useState('');
  const [date, setDate] = useState('');
  const [threshold, setThreshold] = useState(2);
  const [scanResult, setScanResult] = useState(null);
  const [selectedPortfolioTrader, setSelectedPortfolioTrader] = useState('all');
  const [lastScanIndex, setLastScanIndex] = useState(null);

  // Get date range
  const dateRange = useMemo(() => {
    if (!tradingData || tradingData.length === 0) return { min: '', max: '' };
    const dates = tradingData
      .map(row => row.tradeDate.split('T')[0].split(' ')[0])
      .sort();
    return { min: dates[0], max: dates[dates.length - 1] };
  }, [tradingData]);

  // Get trader portfolios from processed data
  const traderPortfolios = processedData?.traderPortfolios || {};

  // Get ISINs based on selected trader
  const traderIsins = useMemo(() => {
    if (selectedPortfolioTrader === 'all') {
      // Combine all traders' ISINs
      const allIsins = new Set();
      Object.values(traderPortfolios).forEach(portfolio => {
        portfolio.forEach(isin => allIsins.add(isin));
      });
      return Array.from(allIsins);
    }
    return traderPortfolios[selectedPortfolioTrader] || [];
  }, [selectedPortfolioTrader, traderPortfolios]);

  // Auto-load trader's portfolio when trader changes
  useEffect(() => {
    if (selectedPortfolioTrader !== 'all' && traderPortfolios[selectedPortfolioTrader]) {
      setIsins(traderPortfolios[selectedPortfolioTrader].slice(0, 100));
    }
  }, [selectedPortfolioTrader, traderPortfolios]);

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

  const loadTraderPortfolio = (trader) => {
    setSelectedPortfolioTrader(trader);
    if (trader === 'all') {
      // Load all unique ISINs (limited to 100)
      const allIsins = new Set();
      Object.values(traderPortfolios).forEach(portfolio => {
        portfolio.forEach(isin => allIsins.add(isin));
      });
      setIsins(Array.from(allIsins).slice(0, 100));
    } else if (traderPortfolios[trader]) {
      setIsins(traderPortfolios[trader].slice(0, 100));
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
            Monitor positions for strong momentum alerts
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Portfolio Input */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Positions</h3>
          
          {/* Trader Portfolio Selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Users className="w-4 h-4 inline mr-1" />
              Trader Portfolio
            </label>
            <select
              value={selectedPortfolioTrader}
              onChange={(e) => loadTraderPortfolio(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-blue-50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="all">All Traders ({Object.keys(traderPortfolios).length})</option>
              {traders.map(trader => (
                <option key={trader} value={trader}>
                  {trader} ({traderPortfolios[trader]?.length || 0} ISINs)
                </option>
              ))}
            </select>
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
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Scan Summary</h3>
          
          {scanResult ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-600">{scanResult.alerts.length}</p>
                  <p className="text-sm text-red-700">Alerts</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{scanResult.noAlerts.length}</p>
                  <p className="text-sm text-green-700">Normal</p>
                </div>
              </div>
              
              <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                <p className="text-sm text-gray-600">
                  <strong>Date:</strong> {date}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Threshold:</strong> {threshold}%
                </p>
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
      {scanResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alerts Table */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
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
          <div className="bg-white rounded-xl shadow-sm border p-6">
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
    </div>
  );
}
