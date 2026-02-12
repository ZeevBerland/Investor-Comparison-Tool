import { useState } from 'react';
import { Info, X } from 'lucide-react';

/**
 * InfoTooltip - A reusable tooltip component for explaining metrics
 * Shows info icon that reveals explanation on hover (desktop) or click (mobile)
 */
export default function InfoTooltip({ title, children, position = 'top' }) {
  const [isOpen, setIsOpen] = useState(false);
  
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };
  
  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800 border-t-transparent border-b-transparent border-l-transparent',
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="p-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none transition-colors"
        aria-label={`Info about ${title}`}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      
      {isOpen && (
        <div 
          className={`absolute z-50 ${positionClasses[position]}`}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="bg-gray-800 text-white text-xs rounded-lg shadow-lg p-3 w-64 max-w-[90vw]">
            {title && (
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-gray-100">{title}</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                  className="sm:hidden p-0.5 hover:bg-gray-700 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <div className="text-gray-300 leading-relaxed">
              {children}
            </div>
          </div>
          {/* Arrow */}
          <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`} />
        </div>
      )}
    </div>
  );
}

/**
 * Metric explanations for smart money analysis
 */
export const METRIC_EXPLANATIONS = {
  // Dashboard metrics
  securitiesTracked: {
    title: 'Securities Tracked',
    description: 'Total number of unique securities (ISINs) in your portfolio that are being monitored for institutional trading activity.',
  },
  portfolioSentiment: {
    title: 'Portfolio Sentiment',
    description: 'Average smart money sentiment across all securities in your portfolio. Calculated as: (Buy Volume - Sell Volume) / Total Volume for institutional investors (F, M, N, P, O types). Positive = net buying, Negative = net selling.',
  },
  patternAlerts: {
    title: 'Pattern Alerts',
    description: 'Number of securities showing concerning selling patterns: consecutive days of institutional selling (2+ days) or unusual volume spikes (2x+ average). Based on EDA findings that these patterns correlate with price declines.',
  },
  highAlerts: {
    title: 'High Alerts',
    description: 'Securities with strong sell signals: sentiment below -50% combined with 3+ consecutive selling days, OR sentiment below -70%. These require immediate attention based on historical pattern analysis.',
  },
  
  // Alert levels
  alertHigh: {
    title: 'HIGH Alert',
    description: 'Critical signal: Strong institutional selling (sentiment < -50%) with pattern confirmation (3+ consecutive sell days), OR very strong selling (sentiment < -70%). Historical data shows elevated decline probability.',
  },
  alertMedium: {
    title: 'MEDIUM Alert',
    description: 'Warning signal: Moderate institutional selling (sentiment < -30%) OR 2+ consecutive sell days. Monitor closely for further deterioration.',
  },
  alertBullish: {
    title: 'BULLISH Signal',
    description: 'Opportunity signal: Strong institutional buying (sentiment > 50%) combined with volume spike. Indicates institutional accumulation.',
  },
  alertClear: {
    title: 'CLEAR Status',
    description: 'No concerning patterns detected. Sentiment is neutral to positive with no consecutive selling or volume anomalies.',
  },
  
  // Client types
  clientTypeF: {
    title: 'Pension/Insurance (F)',
    description: 'Long-term institutional investors including pension funds and insurance companies. Their trading reflects strategic, long-term positioning decisions.',
  },
  clientTypeM: {
    title: 'Mutual Funds (M)',
    description: 'Mutual fund managers making active investment decisions. Their sentiment reflects professional fund management views.',
  },
  clientTypeN: {
    title: 'Nostro (N)',
    description: 'Bank proprietary trading desks. Often indicates short-term market positioning and liquidity provision.',
  },
  clientTypeP: {
    title: 'Portfolio Managers (P)',
    description: 'Professional portfolio managers handling discretionary accounts. Reflects active investment management decisions.',
  },
  clientTypeO: {
    title: 'Foreign Investors (O)',
    description: 'International institutional investors. Their activity can indicate global capital flows and foreign sentiment on Israeli securities.',
  },
  clientTypeG: {
    title: 'Foreign Other (G)',
    description: 'Foreign non-individual investors (corporations, funds, etc.). EDA finding: This type has the strongest predictive power with a +5.760% quintile spread, 52.3% bull win rate, and +0.0126 correlation with 5-day forward returns. Acts as a contrarian indicator vs local institutions (42.2% disagreement rate).',
  },
  clientTypeD: {
    title: 'Foreign Individual (D)',
    description: 'Foreign individual investors. Has some correlation with Foreign Other (G) but lower predictive power. Useful mainly as a confirmation signal alongside Foreign Other.',
  },
  
  // Sentiment & patterns
  sentiment: {
    title: 'Smart Money Sentiment',
    description: 'Calculated as: (Buy Volume - Sell Volume) / Total Volume. Range: -100% (all selling) to +100% (all buying). Only includes institutional investors (F, M, N, P, O types).',
  },
  patternStrength: {
    title: 'Pattern Strength Score',
    description: 'Combined risk score (0-100) based on: consecutive selling days (+15-40 points), volume spikes (+20 points), and negative sentiment (+10-30 points). Higher scores indicate stronger warning signals.',
  },
  consecutiveSells: {
    title: 'Consecutive Sell Days',
    description: 'Number of consecutive trading days with net institutional selling. EDA finding: 3+ consecutive days significantly increases probability of price decline.',
  },
  volumeSpike: {
    title: 'Volume Spike',
    description: 'Current volume exceeds 2x the 10-day average volume. Combined with negative sentiment, indicates accelerated institutional selling pressure.',
  },
  
  // Historical context
  similarPatterns: {
    title: 'Similar Patterns',
    description: 'Historical occurrences when sentiment was at similar levels. Used to calculate probability of future price movements based on past outcomes.',
  },
  declineRate: {
    title: 'Decline Rate',
    description: 'Percentage of similar historical patterns that led to price decline within 5 trading days. Higher rate = stronger warning signal.',
  },
  avgReturn: {
    title: 'Average 5-Day Return',
    description: 'Mean price change 5 trading days after similar sentiment patterns occurred historically. Negative values indicate typical price drops.',
  },
  sentimentTrend: {
    title: 'Sentiment Trend',
    description: 'Direction of sentiment change compared to 5-day average. IMPROVING = sentiment getting more positive, DETERIORATING = sentiment getting more negative.',
  },
  
  // Consensus
  consensus: {
    title: 'Client Type Consensus',
    description: 'Agreement level among the 5 institutional investor types. UNANIMOUS (5/5 agree), STRONG (4/5), MODERATE (3/5), WEAK (mixed). Stronger consensus = more reliable signal.',
  },
  
  // Win rates
  winRateWith: {
    title: 'Win Rate - With Smart Money',
    description: 'Historical percentage of trades that were profitable when trading in the same direction as institutional sentiment (buy when they buy, sell when they sell).',
  },
  winRateAgainst: {
    title: 'Win Rate - Against Smart Money',
    description: 'Historical percentage of trades that were profitable when trading opposite to institutional sentiment (contrarian strategy).',
  },
  
  // Traffic light
  trafficLight: {
    title: 'Traffic Light Signal',
    description: 'Quick trade recommendation based on your intended action vs institutional sentiment. GREEN = aligned, YELLOW = mixed signals, RED = opposing sentiment.',
  },
  
  // Foreign Flow (Phase 1)
  foreignFlow: {
    title: 'Foreign Flow Signal (G)',
    description: 'Sentiment from Foreign Other (G) investors. EDA found this type has a +5.760% predictive spread — the strongest of any investor type. Bullish foreign flow historically leads to 52.3% win rate on 5-day forward returns. Strongest at 1-day horizon (+12.4% spread).',
  },
  contrarianSignal: {
    title: 'Contrarian Signal',
    description: 'Foreign Other (G) and local smart money disagree on direction. This happens ~42.2% of the time. Foreign (G) has negative correlation with Pension (-0.428) and Mutual Funds (-0.362), meaning they often take opposite positions.',
  },
  foreignFlowSummary: {
    title: 'Foreign Flow Summary',
    description: 'Portfolio-wide breakdown of Foreign Other (G) sentiment. Shows how many securities have bullish, bearish, or neutral foreign flow, plus how many have contrarian signals (foreign vs smart money disagree).',
  },
  
  // Predictive Metrics (Phase 2)
  expectedReturn: {
    title: 'Expected Return (EDA Quintile)',
    description: 'Maps the current sentiment score to one of 5 quintiles (Q1=most bearish to Q5=most bullish) based on EDA analysis. Shows the historical average 5-day return and win rate when sentiment was in this quintile.',
  },
  signalHorizon: {
    title: 'Signal Horizon',
    description: 'Shows how the Foreign Other (G) predictive spread changes across time horizons. 1-day is strongest (+12.4%), weakening to +2.0% at 20 days. Use this to guide trade timing — shorter horizons benefit more from this signal.',
  },
  signalQuality: {
    title: 'Signal Quality',
    description: 'Predictive power rating per investor type based on EDA analysis. STRONG = high predictive spread and correlation (e.g., Foreign Other G). MODERATE = some predictive value (e.g., Pension, Mutual Funds). WEAK = low predictive value.',
  },
  
  // Weighted Sentiment (Phase 5)
  weightedSentiment: {
    title: 'Weighted Sentiment',
    description: 'Sentiment score where each investor type is weighted by its EDA-derived predictive power. Foreign Other (G) gets 1.5x weight due to its +5.760% spread and +0.0126 correlation. Portfolio Managers (P) gets 0.8x weight. Compare with equal-weighted sentiment to see the impact.',
  },
  strongestPredictor: {
    title: 'Strongest Predictor',
    description: 'The investor type with the most informative signal right now — based on both its current sentiment magnitude and its historical predictive quality. A strong signal from a high-quality type (like G) is more meaningful than from a lower-quality type.',
  },
  
  // Seasonality (Phase 4)
  dayOfWeek: {
    title: 'Day-of-Week Context',
    description: 'EDA found foreign investors trade differently by day of week. Sunday has the lowest buy ratio (46.1%), while Thursday has the highest volume. This is informational context, not a primary trading signal.',
  },
  monthEnd: {
    title: 'Month-End Rebalancing',
    description: 'During month-end (day >= 25), foreign trading volume is typically 11.1% higher due to portfolio rebalancing. Quarter-end effects are even more pronounced. Volume context helps interpret sentiment signals.',
  },
  signalConfidence: {
    title: 'Signal Confidence (G Coverage)',
    description: 'EDA validation showed the weighted sentiment is 3x stronger when Foreign Other (G) data is available (+0.048% spread, r=+0.0093) vs when G is missing (~0% spread). HIGH confidence means G data is present for this security — the traffic light signal is backed by the strongest predictor. LOW confidence means G data is unavailable — the signal relies on traditional institutional types with near-zero predictive power.',
  },
};
