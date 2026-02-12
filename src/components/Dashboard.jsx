import { useState, useMemo, useEffect } from 'react';
import { useDataStore } from '../hooks/useDataStore';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, TrendingDown, Target, BarChart3, Users, Info, Activity, Zap, CheckCircle, XCircle, AlertTriangle, AlertCircle, Shield, ShieldCheck, Clock, Eye, Globe, ArrowLeftRight, Star } from 'lucide-react';
import { CLIENT_TYPES, SMART_MONEY_TYPES, getEnhancedAlertLevel, calculatePatternStrength, calculateConsensusScore, getSentimentLevel, calculateForeignFlowSignal, calculateWeightedSentiment, FOREIGN_FLOW_TYPE, FOREIGN_FLOW_EDA, TYPE_PREDICTIVE_QUALITY } from '../lib/smartMoney';
import InfoTooltip, { METRIC_EXPLANATIONS } from './InfoTooltip';

const COLORS = {
  bullish: '#10B981',
  bearish: '#EF4444',
  neutral: '#6B7280',
  high: '#DC2626',
  medium: '#F59E0B',
  teal: '#14B8A6',
  green: '#22C55E',
};

export default function Dashboard() {
  const { 
    processedData, traders, selectedTrader, filterByTrader, 
    smartMoneyLoaded, getHistoricalPerformance, getSmartMoneySentiment,
    detectSmartMoneyPattern, getPatternOutcomes, isinToSecurity, sessionDate
  } = useDataStore();
  
  // Calculate historical performance if smart money data is loaded
  const historicalPerf = smartMoneyLoaded ? getHistoricalPerformance(5) : null;

  // Portfolio-wide smart money analysis
  const portfolioAnalysis = useMemo(() => {
    if (!smartMoneyLoaded || !processedData?.traderPortfolios) return null;
    
    const currentTrader = selectedTrader === 'all' ? Object.keys(processedData.traderPortfolios)[0] : selectedTrader;
    const portfolio = processedData.traderPortfolios[currentTrader] || [];
    
    if (portfolio.length === 0) return null;
    
    const redAlerts = [];
    const yellowAlerts = [];
    const tealAlerts = [];
    const greenPositions = [];
    const noData = [];
    
    let totalSentiment = 0;
    let sentimentCount = 0;
    const clientTypeTotals = {};
    [...SMART_MONEY_TYPES, FOREIGN_FLOW_TYPE].forEach(t => clientTypeTotals[t] = { total: 0, count: 0 });
    
    // Foreign flow tracking
    let foreignFlowBullish = 0;
    let foreignFlowBearish = 0;
    let foreignFlowNeutral = 0;
    let contrarianCount = 0;
    let totalWeightedSentiment = 0;
    let weightedSentimentCount = 0;
    let gDataCount = 0; // positions with Foreign G data (high confidence)
    
    for (const isin of portfolio) {
      const sentiment = getSmartMoneySentiment(isin, sessionDate);
      const secInfo = isinToSecurity.get(isin.toUpperCase());
      const pattern = detectSmartMoneyPattern(isin, sessionDate, 10);
      const patternOutcomes = sentiment?.smartMoneySentiment < -0.3 
        ? getPatternOutcomes(isin, sentiment.smartMoneySentiment, 5) 
        : null;
      const patternStrength = calculatePatternStrength(pattern, sentiment?.smartMoneySentiment);
      const consensus = sentiment?.typeSentiments 
        ? calculateConsensusScore(sentiment.typeSentiments)
        : null;
      
      // Foreign flow signal
      const foreignFlow = sentiment ? calculateForeignFlowSignal(sentiment) : null;
      
      // Weighted sentiment
      const weighted = sentiment?.typeSentiments 
        ? calculateWeightedSentiment(sentiment.typeSentiments, sentiment.byType)
        : null;
      
      const item = {
        isin,
        symbol: secInfo?.symbol || isin.substring(0, 8),
        companyName: secInfo?.companyName,
        sentiment: sentiment?.smartMoneySentiment,
        typeSentiments: sentiment?.typeSentiments,
        buyVolume: sentiment?.smartMoneyBuy,
        sellVolume: sentiment?.smartMoneySell,
        pattern,
        patternOutcomes,
        patternStrength,
        consensus,
        foreignFlow,
        weighted,
      };
      
      // Check both if sentiment exists AND has valid data
      if (!sentiment || sentiment.smartMoneySentiment === null) {
        noData.push(item);
        continue;
      }
      
      // Accumulate for averages
      totalSentiment += sentiment.smartMoneySentiment;
      sentimentCount++;
      
      // Accumulate foreign flow stats
      if (foreignFlow) {
        gDataCount++;
        if (foreignFlow.direction === 'BULLISH') foreignFlowBullish++;
        else if (foreignFlow.direction === 'BEARISH') foreignFlowBearish++;
        else foreignFlowNeutral++;
        if (foreignFlow.isContrarian) contrarianCount++;
      }
      
      // Accumulate weighted sentiment
      if (weighted?.weightedSentiment !== null && weighted?.weightedSentiment !== undefined) {
        totalWeightedSentiment += weighted.weightedSentiment;
        weightedSentimentCount++;
      }
      
      // Accumulate client type sentiments (including G for foreign flow)
      if (sentiment.typeSentiments) {
        [...SMART_MONEY_TYPES, FOREIGN_FLOW_TYPE].forEach(type => {
          const typeSentiment = sentiment.typeSentiments[type];
          if (typeSentiment !== undefined && typeSentiment !== null) {
            clientTypeTotals[type].total += typeSentiment;
            clientTypeTotals[type].count++;
          }
        });
      }
      
      // Categorize by alert level
      const enhancedAlert = getEnhancedAlertLevel(sentiment.smartMoneySentiment, pattern);
      item.alertLevel = enhancedAlert.level;
      item.alertReason = enhancedAlert.reason;
      item.alertAction = enhancedAlert.action;
      
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
    
    // Sort by sentiment/strength
    redAlerts.sort((a, b) => (a.sentiment || 0) - (b.sentiment || 0));
    yellowAlerts.sort((a, b) => (a.sentiment || 0) - (b.sentiment || 0));
    tealAlerts.sort((a, b) => (b.sentiment || 0) - (a.sentiment || 0));
    
    // Calculate client type averages
    const clientTypeAvg = {};
    [...SMART_MONEY_TYPES, FOREIGN_FLOW_TYPE].forEach(type => {
      if (clientTypeTotals[type].count > 0) {
        clientTypeAvg[type] = clientTypeTotals[type].total / clientTypeTotals[type].count;
      }
    });
    
    return {
      totalSecurities: portfolio.length,
      withData: sentimentCount,
      avgSentiment: sentimentCount > 0 ? totalSentiment / sentimentCount : 0,
      avgWeightedSentiment: weightedSentimentCount > 0 ? totalWeightedSentiment / weightedSentimentCount : 0,
      redAlerts,
      yellowAlerts,
      tealAlerts,
      greenPositions,
      noData,
      clientTypeAvg,
      patternAlerts: redAlerts.filter(a => a.pattern?.flagged).length + 
                     yellowAlerts.filter(a => a.pattern?.flagged).length,
      foreignFlow: {
        bullish: foreignFlowBullish,
        bearish: foreignFlowBearish,
        neutral: foreignFlowNeutral,
        contrarianSignals: contrarianCount,
        total: foreignFlowBullish + foreignFlowBearish + foreignFlowNeutral,
      },
      gCoverage: {
        count: gDataCount,
        total: sentimentCount,
        percent: sentimentCount > 0 ? (gDataCount / sentimentCount * 100) : 0,
      },
    };
  }, [smartMoneyLoaded, processedData, selectedTrader, sessionDate, getSmartMoneySentiment, detectSmartMoneyPattern, getPatternOutcomes, isinToSecurity]);

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
            Please upload the Smart Money EOD and Securities Mapping files to enable the dashboard.
          </p>
        </div>
      </div>
    );
  }

  const { stats, traderStats } = processedData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Smart Money Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Institutional trading activity and sentiment analysis
          </p>
        </div>
        
        {sessionDate && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-blue-700 dark:text-blue-300">Analysis Date: <strong>{sessionDate}</strong></span>
          </div>
        )}
      </div>

      {/* Alert Summary Bar */}
      {portfolioAnalysis && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <span className="font-semibold text-gray-900 dark:text-white">Alert Summary</span>
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3">
              <AlertBadge 
                count={portfolioAnalysis.redAlerts.length} 
                label="HIGH" 
                color="red" 
                icon={AlertTriangle}
                explanation={METRIC_EXPLANATIONS.alertHigh}
              />
              <AlertBadge 
                count={portfolioAnalysis.yellowAlerts.length} 
                label="MEDIUM" 
                color="yellow" 
                icon={AlertCircle}
                explanation={METRIC_EXPLANATIONS.alertMedium}
              />
              <AlertBadge 
                count={portfolioAnalysis.tealAlerts.length} 
                label="BULLISH" 
                color="teal" 
                icon={TrendingUp}
                explanation={METRIC_EXPLANATIONS.alertBullish}
              />
              <AlertBadge 
                count={portfolioAnalysis.greenPositions.length} 
                label="CLEAR" 
                color="green" 
                icon={CheckCircle}
                explanation={METRIC_EXPLANATIONS.alertClear}
              />
            </div>
          </div>
        </div>
      )}

      {/* Key Metrics */}
      {portfolioAnalysis && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <MetricCard
            icon={BarChart3}
            label="Securities Tracked"
            value={portfolioAnalysis.totalSecurities.toString()}
            subtext={`${portfolioAnalysis.withData} with sentiment data`}
            color="blue"
            explanation={METRIC_EXPLANATIONS.securitiesTracked}
          />
          <MetricCard
            icon={Activity}
            label="EDA-Weighted Sentiment"
            value={`${portfolioAnalysis.avgWeightedSentiment >= 0 ? '+' : ''}${(portfolioAnalysis.avgWeightedSentiment * 100).toFixed(1)}%`}
            subtext={portfolioAnalysis.avgWeightedSentiment >= 0.1 ? 'Bullish bias' : portfolioAnalysis.avgWeightedSentiment <= -0.1 ? 'Bearish bias' : 'Neutral'}
            color={portfolioAnalysis.avgWeightedSentiment >= 0 ? 'green' : 'red'}
            explanation={METRIC_EXPLANATIONS.portfolioSentiment}
          />
          <MetricCard
            icon={ShieldCheck}
            label="G Coverage"
            value={`${portfolioAnalysis.gCoverage.count}/${portfolioAnalysis.gCoverage.total}`}
            subtext={`${portfolioAnalysis.gCoverage.percent.toFixed(0)}% high confidence`}
            color={portfolioAnalysis.gCoverage.percent >= 50 ? 'green' : 'amber'}
            explanation={METRIC_EXPLANATIONS.signalConfidence}
          />
          <MetricCard
            icon={AlertTriangle}
            label="Pattern Alerts"
            value={portfolioAnalysis.patternAlerts.toString()}
            subtext="Selling patterns detected"
            color="amber"
            explanation={METRIC_EXPLANATIONS.patternAlerts}
          />
          <MetricCard
            icon={Users}
            label="High Alerts"
            value={portfolioAnalysis.redAlerts.length.toString()}
            subtext="Require attention"
            color="red"
            explanation={METRIC_EXPLANATIONS.highAlerts}
          />
        </div>
      )}

      {/* Foreign Flow Summary & Weighted Sentiment (Phase 1 & 5) */}
      {portfolioAnalysis && portfolioAnalysis.foreignFlow.total > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Foreign Flow Overview */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Globe className="w-5 h-5 text-cyan-600" />
              <h3 className="font-semibold text-gray-900 dark:text-white">Foreign Flow (G) Summary</h3>
              <InfoTooltip title={METRIC_EXPLANATIONS.foreignFlowSummary?.title || 'Foreign Flow Summary'} position="right">
                {METRIC_EXPLANATIONS.foreignFlowSummary?.description || 'Portfolio-wide breakdown of Foreign Other (G) sentiment across your securities.'}
              </InfoTooltip>
              <span className="text-sm px-2.5 py-0.5 rounded bg-cyan-100 text-cyan-700 font-medium">EDA: +5.76% spread</span>
            </div>
            
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <p className="text-xl font-bold text-green-600">{portfolioAnalysis.foreignFlow.bullish}</p>
                <p className="text-xs text-green-700">Bullish</p>
              </div>
              <div className="text-center p-2 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <p className="text-xl font-bold text-red-600">{portfolioAnalysis.foreignFlow.bearish}</p>
                <p className="text-xs text-red-700">Bearish</p>
              </div>
              <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-xl font-bold text-gray-600 dark:text-gray-300">{portfolioAnalysis.foreignFlow.neutral}</p>
                <p className="text-xs text-gray-500">Neutral</p>
              </div>
            </div>
            
            {portfolioAnalysis.foreignFlow.contrarianSignals > 0 && (
              <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-amber-600" />
                <span className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>{portfolioAnalysis.foreignFlow.contrarianSignals}</strong> contrarian signals — foreign vs smart money disagree
                </span>
              </div>
            )}
          </div>
          
          {/* Weighted Sentiment — Primary Portfolio Signal */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-purple-300 dark:border-purple-700 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-5 h-5 text-purple-500" />
              <h3 className="font-semibold text-gray-900 dark:text-white">EDA-Weighted Portfolio Sentiment</h3>
              <span className="px-1.5 py-0.5 rounded text-xs font-bold bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 uppercase tracking-wide">Primary</span>
              <InfoTooltip title={METRIC_EXPLANATIONS.weightedSentiment?.title || 'Weighted Sentiment'} position="right">
                {METRIC_EXPLANATIONS.weightedSentiment?.description || 'Sentiment weighted by EDA-derived predictive power per investor type.'}
              </InfoTooltip>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">EDA-Weighted (Primary)</p>
                <p className={`text-2xl font-bold ${portfolioAnalysis.avgWeightedSentiment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioAnalysis.avgWeightedSentiment >= 0 ? '+' : ''}{(portfolioAnalysis.avgWeightedSentiment * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Raw Composite</p>
                <p className={`text-lg font-bold ${portfolioAnalysis.avgSentiment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolioAnalysis.avgSentiment >= 0 ? '+' : ''}{(portfolioAnalysis.avgSentiment * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-3">
              Optimized weights (G=3.0, O=1.5, F=0.45 with G; F=3.0, O=1.69 without G) drive the traffic light decisions.
            </p>
            <p className="text-sm mt-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
              <span className="text-gray-500 dark:text-gray-400">
                <strong className="text-gray-700 dark:text-gray-300">{portfolioAnalysis.gCoverage.count}</strong> of {portfolioAnalysis.gCoverage.total} positions have high-confidence signal (G available)
              </span>
            </p>
          </div>
        </div>
      )}

      {/* Critical Alerts & Bullish Signals Row */}
      {portfolioAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Critical Alerts Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <h3 className="font-semibold text-red-800 dark:text-red-200">Critical Alerts</h3>
                <span className="ml-auto text-sm text-red-600 dark:text-red-400">{portfolioAnalysis.redAlerts.length} positions</span>
              </div>
            </div>
            <div className="p-4 max-h-[300px] overflow-y-auto">
              {portfolioAnalysis.redAlerts.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">No critical alerts - portfolio looks healthy</p>
              ) : (
                <div className="space-y-3">
                  {portfolioAnalysis.redAlerts.slice(0, 5).map((item, idx) => (
                    <AlertItem key={idx} item={item} type="red" />
                  ))}
                  {portfolioAnalysis.redAlerts.length > 5 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                      +{portfolioAnalysis.redAlerts.length - 5} more alerts
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bullish Signals Panel */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-hidden">
            <div className="p-4 bg-teal-50 dark:bg-teal-900/20 border-b border-teal-200 dark:border-teal-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                <h3 className="font-semibold text-teal-800 dark:text-teal-200">Bullish Signals</h3>
                <span className="ml-auto text-sm text-teal-600 dark:text-teal-400">{portfolioAnalysis.tealAlerts.length} positions</span>
              </div>
            </div>
            <div className="p-4 max-h-[300px] overflow-y-auto">
              {portfolioAnalysis.tealAlerts.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-4">No strong bullish signals detected</p>
              ) : (
                <div className="space-y-3">
                  {portfolioAnalysis.tealAlerts.slice(0, 5).map((item, idx) => (
                    <AlertItem key={idx} item={item} type="teal" />
                  ))}
                  {portfolioAnalysis.tealAlerts.length > 5 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
                      +{portfolioAnalysis.tealAlerts.length - 5} more bullish signals
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Client Type Sentiment Breakdown */}
      {portfolioAnalysis && Object.keys(portfolioAnalysis.clientTypeAvg).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Client Type Sentiment Overview</h3>
            <InfoTooltip title="Client Type Sentiment" position="right">
              Shows average sentiment for each of the 5 institutional investor types (F, M, N, P, O) across all securities in your portfolio. Different investor types may have different time horizons and trading motivations.
            </InfoTooltip>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Average sentiment by institutional investor type across your portfolio
          </p>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[...SMART_MONEY_TYPES, FOREIGN_FLOW_TYPE].map(type => {
              const avgSentiment = portfolioAnalysis.clientTypeAvg[type];
              if (avgSentiment === undefined) return null;
              
              const typeInfo = CLIENT_TYPES[type];
              const typeExplanation = METRIC_EXPLANATIONS[`clientType${type}`];
              const quality = TYPE_PREDICTIVE_QUALITY[type];
              const isForeign = type === FOREIGN_FLOW_TYPE;
              
              return (
                <div key={type} className={`p-3 sm:p-4 rounded-lg border-2 ${
                  isForeign 
                    ? 'bg-cyan-50 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700'
                    : avgSentiment >= 0.1 ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700' :
                      avgSentiment <= -0.1 ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700' :
                      'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                }`} title={typeInfo?.name}>
                  <div className="flex items-center gap-1 mb-1">
                    {isForeign && <Globe className="w-3 h-3 text-cyan-600" />}
                    <p className={`text-xs ${isForeign ? 'text-cyan-700 dark:text-cyan-400 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                      {typeInfo?.shortName || type}
                    </p>
                    {typeExplanation && (
                      <InfoTooltip title={typeExplanation.title} position="bottom">
                        {typeExplanation.description}
                      </InfoTooltip>
                    )}
                  </div>
                  <p className={`text-xl sm:text-2xl font-bold ${
                    avgSentiment >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {avgSentiment >= 0 ? '+' : ''}{(avgSentiment * 100).toFixed(0)}%
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {avgSentiment >= 0.3 ? 'Buying' : avgSentiment <= -0.3 ? 'Selling' : 'Neutral'}
                    </p>
                    {quality && (
                      <span className={`text-sm px-2 py-0.5 rounded font-medium ${
                        quality.quality === 'STRONG' ? 'bg-green-100 text-green-700' :
                        quality.quality === 'MODERATE' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {quality.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Smart Money Performance Analysis */}
      {historicalPerf && (historicalPerf.withSmartMoney.trades > 0 || historicalPerf.againstSmartMoney.trades > 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Zap className="w-6 h-6 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Historical Win Rate Analysis</h3>
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">5-day outcomes</span>
            <InfoTooltip title="Win Rate Analysis" position="right">
              Compares your historical trading performance when aligned with vs against institutional sentiment. Win = trade was profitable after 5 trading days. Based on actual trades in your transaction history.
            </InfoTooltip>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Your historical win rate when trading with or against institutional sentiment
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {/* With Smart Money */}
            <div className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                <span className="font-medium text-green-800 dark:text-green-300">With Smart Money</span>
                <InfoTooltip title={METRIC_EXPLANATIONS.winRateWith.title} position="bottom">
                  {METRIC_EXPLANATIONS.winRateWith.description}
                </InfoTooltip>
              </div>
              <p className="text-3xl font-bold text-green-700 dark:text-green-400">
                {historicalPerf.withSmartMoney.winRate.toFixed(0)}%
              </p>
              <p className="text-sm text-green-600 dark:text-green-400">
                Win rate ({historicalPerf.withSmartMoney.wins}/{historicalPerf.withSmartMoney.trades} trades)
              </p>
            </div>
            
            {/* Against Smart Money */}
            <div className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                <span className="font-medium text-red-800 dark:text-red-300">Against Smart Money</span>
                <InfoTooltip title={METRIC_EXPLANATIONS.winRateAgainst.title} position="bottom">
                  {METRIC_EXPLANATIONS.winRateAgainst.description}
                </InfoTooltip>
              </div>
              <p className="text-3xl font-bold text-red-700 dark:text-red-400">
                {historicalPerf.againstSmartMoney.winRate.toFixed(0)}%
              </p>
              <p className="text-sm text-red-600 dark:text-red-400">
                Win rate ({historicalPerf.againstSmartMoney.wins}/{historicalPerf.againstSmartMoney.trades} trades)
              </p>
            </div>
            
            {/* Neutral */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <span className="font-medium text-gray-800 dark:text-gray-200">Neutral Sentiment</span>
                <InfoTooltip title="Neutral Sentiment" position="bottom">
                  Trades executed when institutional sentiment was near zero (between -30% and +30%). Neither strongly aligned nor against smart money.
                </InfoTooltip>
              </div>
              <p className="text-3xl font-bold text-gray-700 dark:text-gray-300">
                {historicalPerf.neutral.winRate.toFixed(0)}%
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Win rate ({historicalPerf.neutral.wins}/{historicalPerf.neutral.trades} trades)
              </p>
            </div>
          </div>
          
          {/* Breakdown by Investor Type */}
          <div className="border-t dark:border-gray-700 pt-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Win Rate by Investor Type Alignment</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b dark:border-gray-700">
                    <th className="text-left py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Investor Type</th>
                    <th className="text-center py-2 px-3 font-medium text-green-600 dark:text-green-400">With (Win Rate)</th>
                    <th className="text-center py-2 px-3 font-medium text-red-600 dark:text-red-400">Against (Win Rate)</th>
                    <th className="text-center py-2 px-3 font-medium text-gray-600 dark:text-gray-400">Difference</th>
                  </tr>
                </thead>
                <tbody>
                  {SMART_MONEY_TYPES.map(type => {
                    const typeData = historicalPerf.byType[type];
                    if (!typeData || (typeData.with.trades === 0 && typeData.against.trades === 0)) return null;
                    
                    const diff = typeData.with.winRate - typeData.against.winRate;
                    
                    return (
                      <tr key={type} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-2 px-3">
                          <span className="font-medium dark:text-gray-200">{CLIENT_TYPES[type]?.name || type}</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">({type})</span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          {typeData.with.trades > 0 ? (
                            <span className="text-green-600 font-medium">
                              {typeData.with.winRate.toFixed(0)}%
                              <span className="text-xs text-gray-400 ml-1">({typeData.with.trades})</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {typeData.against.trades > 0 ? (
                            <span className="text-red-600 font-medium">
                              {typeData.against.winRate.toFixed(0)}%
                              <span className="text-xs text-gray-400 ml-1">({typeData.against.trades})</span>
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {typeData.with.trades > 0 && typeData.against.trades > 0 ? (
                            <span className={`font-bold ${diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                              {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
            <p className="text-sm text-purple-800 dark:text-purple-200">
              <strong>Insight:</strong> {
                historicalPerf.withSmartMoney.winRate > historicalPerf.againstSmartMoney.winRate
                  ? `Trading WITH smart money has historically performed ${(historicalPerf.withSmartMoney.winRate - historicalPerf.againstSmartMoney.winRate).toFixed(0)}% better than trading against them.`
                  : historicalPerf.againstSmartMoney.winRate > historicalPerf.withSmartMoney.winRate
                    ? `Interestingly, your contrarian trades have outperformed by ${(historicalPerf.againstSmartMoney.winRate - historicalPerf.withSmartMoney.winRate).toFixed(0)}%.`
                    : 'Smart money alignment has had similar win rates in both directions.'
              }
            </p>
          </div>
        </div>
      )}

      {/* Pattern Detection Summary */}
      {portfolioAnalysis && (portfolioAnalysis.redAlerts.some(a => a.pattern?.flagged) || portfolioAnalysis.yellowAlerts.some(a => a.pattern?.flagged)) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Eye className="w-6 h-6 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Selling Patterns</h3>
            <InfoTooltip title="Active Selling Patterns" position="right">
              Securities with detected institutional selling patterns. EDA analysis found that consecutive selling days (3+) and volume spikes correlate with increased probability of price decline within 5 trading days.
            </InfoTooltip>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Securities showing consecutive institutional selling or volume spikes
          </p>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Security</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Consecutive Sells</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Volume Spike</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Sentiment</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-600 dark:text-gray-400">Pattern Score</th>
                </tr>
              </thead>
              <tbody>
                {[...portfolioAnalysis.redAlerts, ...portfolioAnalysis.yellowAlerts]
                  .filter(a => a.pattern?.flagged)
                  .slice(0, 10)
                  .map((item, idx) => (
                    <tr key={idx} className="border-b dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900 dark:text-white">{item.symbol}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{item.companyName}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.pattern?.consecutiveSellDays >= 2 ? (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded text-xs font-medium">
                            {item.pattern.consecutiveSellDays} days
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.pattern?.hasVolumeSpike ? (
                          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
                            {(item.pattern.latestVolume / item.pattern.avgVolume).toFixed(1)}x
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-medium ${item.sentiment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {item.sentiment != null ? `${item.sentiment >= 0 ? '+' : ''}${(item.sentiment * 100).toFixed(0)}%` : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.patternStrength && (
                          <span className={`px-2 py-1 rounded text-xs font-bold text-white ${
                            item.patternStrength.level === 'CRITICAL' ? 'bg-red-600' :
                            item.patternStrength.level === 'HIGH' ? 'bg-orange-500' :
                            item.patternStrength.level === 'MODERATE' ? 'bg-yellow-500' :
                            'bg-gray-400'
                          }`}>
                            {item.patternStrength.score}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-Trader Comparison (if multiple traders) */}
      {selectedTrader === 'all' && traderStats && Object.keys(traderStats).length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-6 h-6 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Trader Overview</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-600">Trader</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Total Trades</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-600">Portfolio Size</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(traderStats)
                  .sort((a, b) => b[1].total - a[1].total)
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
                      <td className="text-right py-3 px-4 font-mono">
                        {processedData.traderPortfolios[trader]?.length || 0} ISINs
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

function AlertBadge({ count, label, color, icon: Icon, explanation }) {
  const colorClasses = {
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800',
    teal: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  };
  
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${colorClasses[color]}`}>
      <Icon className="w-4 h-4" />
      <span className="font-bold">{count}</span>
      <span className="text-sm">{label}</span>
      {explanation && (
        <InfoTooltip title={explanation.title} position="bottom">
          {explanation.description}
        </InfoTooltip>
      )}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, subtext, color, explanation }) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    amber: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    red: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 p-4 sm:p-5 w-full">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
        {explanation && (
          <InfoTooltip title={explanation.title} position="bottom">
            {explanation.description}
          </InfoTooltip>
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtext}</p>
    </div>
  );
}

function AlertItem({ item, type }) {
  const bgClass = type === 'red' ? 'hover:bg-red-50 dark:hover:bg-red-900/20' : 'hover:bg-teal-50 dark:hover:bg-teal-900/20';
  const borderClass = type === 'red' ? 'border-red-100 dark:border-red-800' : 'border-teal-100 dark:border-teal-800';
  
  return (
    <div className={`flex items-center justify-between p-3 rounded-lg border ${borderClass} ${bgClass}`}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">{item.symbol}</p>
        {item.companyName && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.companyName}</p>
        )}
        {item.alertReason && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{item.alertReason}</p>
        )}
      </div>
      <div className="ml-4 text-right">
        <p className={`text-lg font-bold ${item.sentiment >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {item.sentiment != null ? `${item.sentiment >= 0 ? '+' : ''}${(item.sentiment * 100).toFixed(0)}%` : '-'}
        </p>
        {item.patternStrength && item.patternStrength.score > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">Score: {item.patternStrength.score}</p>
        )}
      </div>
    </div>
  );
}
