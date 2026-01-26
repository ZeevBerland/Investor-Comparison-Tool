import { useDataStore } from '../hooks/useDataStore';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Target, BarChart3, Trophy, Users, Filter, Info, Activity } from 'lucide-react';

const COLORS = {
  counter: '#F59E0B',
  aligned: '#10B981',
  buy: '#3B82F6',
  sell: '#EF4444',
};

export default function Dashboard() {
  const { processedData, traders, selectedTrader, filterByTrader, availableIndices, selectedIndex, commonIndices, getIndexName, changeIndex } = useDataStore();

  if (!processedData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No data loaded. Please upload your files first.</p>
      </div>
    );
  }

  const { stats, traderStats } = processedData;

  // Prepare chart data
  const pieData = [
    { name: 'Counter-Market', value: stats.counterCount, color: COLORS.counter },
    { name: 'Aligned', value: stats.alignedCount, color: COLORS.aligned },
  ];

  const barData = [
    { 
      name: 'Buy Trades', 
      counter: stats.buyCounterPct, 
      aligned: 100 - stats.buyCounterPct,
      total: stats.buyTrades,
    },
    { 
      name: 'Sell Trades', 
      counter: stats.sellCounterPct, 
      aligned: 100 - stats.sellCounterPct,
      total: stats.sellTrades,
    },
  ];

  // Determine winner (simplified - in real app would use return data)
  const winner = stats.contrarianRatio > 50 ? 'COUNTER' : 'ALIGNED';

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Retrospective Dashboard</h2>
          <p className="text-gray-600 mt-1">
            Analysis of trading behavior compared to market direction
          </p>
        </div>
        
        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-4">
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
          
          {/* Trader Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-blue-500" />
            <select
              value={selectedTrader}
              onChange={(e) => filterByTrader(e.target.value)}
              className="px-3 py-2 border border-blue-300 rounded-lg bg-blue-50 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none min-w-[180px]"
            >
              <option value="all">All Traders ({traders.length})</option>
              {traders.map(trader => (
                <option key={trader} value={trader}>{trader}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Data Source Indicator */}
      {stats.hasIndexData && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Info className="w-5 h-5 text-amber-600" />
          <p className="text-sm text-amber-800">
            Using <strong>{stats.indexName}</strong> index for counter-market analysis
          </p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard
          icon={BarChart3}
          label="Total Transactions"
          value={stats.totalTransactions.toLocaleString()}
          subtext={`${stats.withMarketData.toLocaleString()} with market data`}
          color="blue"
        />
        <MetricCard
          icon={Target}
          label="Contrarian Ratio"
          value={`${stats.contrarianRatio.toFixed(1)}%`}
          subtext={`${stats.counterCount.toLocaleString()} counter-market trades`}
          color="amber"
        />
        <MetricCard
          icon={TrendingUp}
          label="Buy Trades"
          value={stats.buyTrades.toLocaleString()}
          subtext={`${stats.buyCounterPct.toFixed(1)}% counter-market`}
          color="green"
        />
        <MetricCard
          icon={TrendingDown}
          label="Sell Trades"
          value={stats.sellTrades.toLocaleString()}
          subtext={`${stats.sellCounterPct.toFixed(1)}% counter-market`}
          color="red"
        />
      </div>

      {/* Winner Analysis Card */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-4">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <h3 className="text-lg font-semibold text-gray-900">Winner Analysis</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-medium text-gray-600">Strategy</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Trades</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Percentage</th>
                <th className="text-center py-3 px-4 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b hover:bg-gray-50">
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                    Counter-Market
                  </span>
                </td>
                <td className="text-right py-3 px-4 font-mono">{stats.counterCount.toLocaleString()}</td>
                <td className="text-right py-3 px-4 font-mono">{stats.contrarianRatio.toFixed(1)}%</td>
                <td className="text-center py-3 px-4">
                  {winner === 'COUNTER' ? (
                    <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-700 rounded">
                      More Frequent
                    </span>
                  ) : null}
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-3 px-4">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                    Aligned with Market
                  </span>
                </td>
                <td className="text-right py-3 px-4 font-mono">{stats.alignedCount.toLocaleString()}</td>
                <td className="text-right py-3 px-4 font-mono">{(100 - stats.contrarianRatio).toFixed(1)}%</td>
                <td className="text-center py-3 px-4">
                  {winner === 'ALIGNED' ? (
                    <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded">
                      More Frequent
                    </span>
                  ) : null}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Insight:</strong> You trade counter to market direction {stats.contrarianRatio.toFixed(1)}% of the time.
            {stats.contrarianRatio > 50 
              ? ' This suggests a contrarian trading style.'
              : ' This suggests you tend to follow market momentum.'}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trade Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [value.toLocaleString(), 'Trades']}
                />
                <Legend 
                  verticalAlign="bottom"
                  formatter={(value, entry) => {
                    const item = pieData.find(d => d.name === value);
                    const total = pieData.reduce((sum, d) => sum + d.value, 0);
                    const pct = item ? ((item.value / total) * 100).toFixed(0) : 0;
                    return `${value}: ${pct}%`;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Counter-Market % by Action</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip 
                  formatter={(value) => [`${value.toFixed(1)}%`]}
                />
                <Legend />
                <Bar dataKey="counter" name="Counter-Market" fill={COLORS.counter} stackId="a" />
                <Bar dataKey="aligned" name="Aligned" fill={COLORS.aligned} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Action Breakdown */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Action Breakdown</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ActionCard
            action="BUY"
            total={stats.buyTrades}
            counterPct={stats.buyCounterPct}
            description="When you buy, the market is down"
            color="blue"
          />
          <ActionCard
            action="SELL"
            total={stats.sellTrades}
            counterPct={stats.sellCounterPct}
            description="When you sell, the market is up"
            color="red"
          />
        </div>
      </div>

      {/* Per-Trader Comparison */}
      {selectedTrader === 'all' && traderStats && Object.keys(traderStats).length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Trader Comparison</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Trader</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Trades</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Counter</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Aligned</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Contrarian %</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Style</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(traderStats)
                  .sort((a, b) => b[1].contrarianRatio - a[1].contrarianRatio)
                  .map(([trader, tStats]) => (
                    <tr 
                      key={trader} 
                      className="border-b last:border-0 hover:bg-gray-50 cursor-pointer"
                      onClick={() => filterByTrader(trader)}
                    >
                      <td className="py-3 px-4">
                        <span className="font-medium text-blue-600 hover:underline">{trader}</span>
                      </td>
                      <td className="text-right py-3 px-4 font-mono">{tStats.total.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 font-mono text-amber-600">{tStats.counter.toLocaleString()}</td>
                      <td className="text-right py-3 px-4 font-mono text-green-600">{tStats.aligned.toLocaleString()}</td>
                      <td className="text-right py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-amber-500 h-2 rounded-full"
                              style={{ width: `${tStats.contrarianRatio}%` }}
                            />
                          </div>
                          <span className="font-mono text-sm w-12">{tStats.contrarianRatio.toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          tStats.contrarianRatio > 55 
                            ? 'bg-amber-100 text-amber-700' 
                            : tStats.contrarianRatio < 45
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}>
                          {tStats.contrarianRatio > 55 ? 'Contrarian' : tStats.contrarianRatio < 45 ? 'Momentum' : 'Balanced'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          
          <p className="mt-4 text-xs text-gray-500">
            Click on a trader name to filter the dashboard to that trader only.
          </p>
        </div>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, subtext, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    amber: 'bg-amber-50 text-amber-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-gray-600">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{subtext}</p>
    </div>
  );
}

function ActionCard({ action, total, counterPct, description, color }) {
  const bgColor = color === 'blue' ? 'bg-blue-500' : 'bg-red-500';
  
  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className={`px-3 py-1 text-white text-sm font-medium rounded ${bgColor}`}>
          {action}
        </span>
        <span className="text-sm text-gray-500">{total.toLocaleString()} trades</span>
      </div>
      
      <div className="mb-2">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">Counter-Market</span>
          <span className="font-medium">{counterPct.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-amber-500 h-2 rounded-full transition-all"
            style={{ width: `${counterPct}%` }}
          />
        </div>
      </div>
      
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}
