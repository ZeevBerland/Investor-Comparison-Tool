/**
 * Check if an action is a buy
 * @param {string} action - Trade action string
 * @returns {boolean}
 */
export function isBuyAction(action) {
  if (!action) return false;
  const lower = action.toLowerCase();
  return lower.includes('buy') || 
         action.includes('קניה') || 
         action.includes('קנייה');
}

/**
 * Check if a trade is counter to market direction
 * @param {string} action - Trade action
 * @param {number} marketChange - Market change percentage
 * @returns {boolean}
 */
export function isCounterMarket(action, marketChange) {
  const isBuy = isBuyAction(action);
  // Counter-market: BUY when market DOWN, SELL when market UP
  return (isBuy && marketChange < 0) || (!isBuy && marketChange > 0);
}

/**
 * Get alert level based on counter-market status and momentum
 * @param {boolean} isCounter - Is this a counter-market trade
 * @param {number} absChange - Absolute market change
 * @returns {string} - 'HIGH', 'MEDIUM', 'LOW', or 'NONE'
 */
export function getAlertLevel(isCounter, absChange) {
  if (!isCounter) return 'NONE';
  if (absChange > 3) return 'HIGH';
  if (absChange > 2) return 'MEDIUM';
  return 'LOW';
}

/**
 * Get color class for alert level
 * @param {string} level - Alert level
 * @returns {string} - Tailwind color class
 */
export function getAlertColor(level) {
  switch (level) {
    case 'HIGH': return 'bg-red-500 text-white';
    case 'MEDIUM': return 'bg-yellow-500 text-white';
    case 'LOW': return 'bg-blue-500 text-white';
    default: return 'bg-green-500 text-white';
  }
}

/**
 * Get background color for alert cards
 * @param {string} level - Alert level
 * @returns {string} - Tailwind background class
 */
export function getAlertBgColor(level) {
  switch (level) {
    case 'HIGH': return 'bg-red-50 border-red-200';
    case 'MEDIUM': return 'bg-yellow-50 border-yellow-200';
    case 'LOW': return 'bg-blue-50 border-blue-200';
    default: return 'bg-green-50 border-green-200';
  }
}

/**
 * Calculate winner based on returns
 * @param {number} counterReturn - Counter-market average return
 * @param {number} alignedReturn - Aligned average return
 * @returns {string} - 'COUNTER', 'ALIGNED', or 'TIE'
 */
export function calculateWinner(counterReturn, alignedReturn) {
  const diff = Math.abs(counterReturn - alignedReturn);
  if (diff < 0.01) return 'TIE';
  return counterReturn > alignedReturn ? 'COUNTER' : 'ALIGNED';
}
