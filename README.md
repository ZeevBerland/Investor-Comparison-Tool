# Investor Helper

A React-based web application for analyzing trading behavior against market direction, with smart money sentiment analysis.

## Overview

Investor Helper helps investment managers analyze their trading patterns by comparing their buy/sell decisions against market movements. It identifies "counter-market" trades (buying when the market is down, selling when it's up) and provides insights into trading styles.

### Key Features

- **Counter-Market Analysis**: Identifies trades that go against market direction
- **Smart Money Sentiment**: Shows institutional investor activity for each security
- **Trade Checker**: Real-time validation of proposed trades
- **Portfolio Monitor**: Scan entire portfolios for alerts
- **Multiple Index Support**: Compare against TA-125, TA-35, TA-90, and 50+ other indices
- **Session Simulation**: View data as of any historical date

---

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
cd Investor-Comparison-Tool
npm install
npm run dev
```

The app will be available at `https://investor-comparison-tool.vercel.app/`

### Data Files

The app requires a ZIP archive (`menora_data.zip`) containing:

| File | Description | Required |
|------|-------------|----------|
| `menora_transactions.csv` | Your trading transactions | Yes |
| `trading_eod.csv` | End-of-day security prices | Yes |
| `indices_eod.csv` | End-of-day index values | Yes |
| `trade_securities.csv` | Security ID to ISIN mapping | No |
| `smart_money_eod_2024_2025.csv` | Institutional trading data | No |

---

## User Guide

### Step 1: Upload Data

1. Click **"Upload ZIP Archive"** button
2. Select your `menora_data.zip` file
3. Wait for extraction and parsing (progress shown)
4. Click **"Process Data & Continue"** when all required files show green

### Step 2: Select Trader & Date

1. Choose your **Investment Manager** from the dropdown
2. Select a **Simulation Date** (the app will show data up to this date)
3. Click **"Start Session"**

### Step 3: Analyze Your Trading

The app has three main tabs:

---

## Dashboard Tab

The Dashboard provides a retrospective analysis of your trading behavior.

### Key Metrics

| Metric | Description |
|--------|-------------|
| **Total Transactions** | Number of trades in the selected period |
| **Contrarian Ratio** | Percentage of counter-market trades |
| **Buy Trades** | Total buys and their counter-market percentage |
| **Sell Trades** | Total sells and their counter-market percentage |

### Winner Analysis

Shows which strategy (counter-market vs aligned) was more frequent in your trading history.

### Charts

- **Trade Distribution**: Pie chart of counter-market vs aligned trades
- **Counter-Market % by Action**: Bar chart comparing buy vs sell behavior

### Smart Money Alignment (if data loaded)

Shows historical win rate when your trades aligned with or opposed institutional sentiment:

- **With Smart Money**: Win rate when you traded in the same direction as institutions
- **Against Smart Money**: Win rate when you traded opposite to institutions
- **By Investor Type**: Breakdown by Pension/Insurance, Mutual Funds, Nostro, Portfolio Managers

---

## Checker Tab

The Trade Checker validates proposed trades before execution.

### How to Use

1. Enter the **ISIN** of the security (autocomplete available)
2. Select **Buy** or **Sell**
3. Choose the **Trade Date**
4. Click **"Check Trade"**

### Alert Levels

| Level | Color | Meaning |
|-------|-------|---------|
| **HIGH** | Red | Strong counter-market signal (>2% divergence) |
| **MEDIUM** | Yellow | Moderate counter-market signal (1-2% divergence) |
| **LOW** | Blue | Slight counter-market signal (<1% divergence) |
| **NONE** | Green | Trade aligned with market direction |

### Smart Money Sentiment Panel

When smart money data is loaded, you'll also see:

- **Traffic Light**: GREEN (proceed), YELLOW (adjust), RED (reconsider)
- **Institutional Sentiment**: Net buying/selling by institutions (-100% to +100%)
- **By Investor Type**: Sentiment breakdown for each institutional category
- **Recommendation**: Contextual advice based on sentiment

### Check History

The last 10 checks are saved for reference, showing:
- Time, Symbol, Action, Index used
- Index change, Security change
- Smart money sentiment, Alert level

---

## Monitor Tab

The Portfolio Monitor scans your entire portfolio for alerts.

### How to Use

1. Your portfolio is auto-loaded based on your session trader
2. Adjust the **Alert Threshold** (default 2%)
3. Click **"Scan Portfolio"**

### View Modes

- **Price Alerts**: Shows securities with significant counter-market movement
- **Smart Money Alerts**: Shows securities with institutional selling patterns

### Alert Categories (Price Mode)

| Category | Description |
|----------|-------------|
| **Red Alerts** | Positions with significant counter-market signals |
| **Yellow Alerts** | Positions requiring attention |
| **Green Positions** | Positions aligned with market |
| **No Data** | Positions with insufficient market data |

### Alert Categories (Sentiment Mode)

| Category | Description |
|----------|-------------|
| **Red Alerts** | Heavy institutional selling detected |
| **Yellow Alerts** | Moderate institutional selling |
| **Green Positions** | Institutional sentiment positive or neutral |

### Position Cards

Each position card shows:
- Security symbol and ISIN
- Current market change vs index change
- Smart money sentiment (if available)
- Historical pattern outcomes
- Days of consecutive selling (if detected)

---

## Index Selection

The app supports 50+ Tel Aviv Stock Exchange indices:

### Common Indices
- TA-125 (default)
- TA-35
- TA-90
- TA All-Share
- TA-20
- TA-200

### Sector Indices
- TA-Technology
- TA-Financials
- TA-Real Estate
- TA-Biomed
- And many more...

Change the index using the yellow dropdown in the header of each tab.

---

## Smart Money Data

When smart money data is loaded, the app provides additional insights:

### Client Types Tracked

| Code | Type | Description |
|------|------|-------------|
| F | Pension/Insurance | Pension funds and insurance companies |
| M | Mutual Funds | Investment funds |
| N | Nostro | Bank proprietary trading |
| P | Portfolio Managers | Professional portfolio managers |

### Sentiment Calculation

Sentiment = (Buy Volume - Sell Volume) / Total Volume

- **+100%**: All institutional activity is buying
- **0%**: Equal buying and selling
- **-100%**: All institutional activity is selling

### Pattern Detection

The app detects selling patterns over time:
- **3+ days**: Selling pattern emerging
- **5+ days**: Sustained selling pattern
- **7+ days**: Strong selling pattern

---

## Data Format Reference

### menora_transactions.csv

```
ISIN,Action,OrderDate,InvestmentManager,Quantity,Price,...
IL0010811243,Buy,2024-01-15,John Smith,100,150.50,...
```

### trading_eod.csv

```
tradeDate,isin,symbol,change,openingPrice,closingPrice,...
2024-01-15,IL0010811243,TEVA,1.25,148.00,150.50,...
```

### indices_eod.csv

```
tradeDate,indexId,indexName,closingIndexPrice,change,...
2024-01-15,142,ת"א-125,1850.50,0.75,...
```

### trade_securities.csv

```
securityId,isin,symbol,companyName,...
12345,IL0010811243,TEVA,Teva Pharmaceutical,...
```

### smart_money_eod_2024_2025.csv

```
tradeDate,clientTypeId,securityId,turnoverBuyNis,turnoverSellNis,...
2024-01-15,F,12345,1500000,1200000,...
```

---

## Technical Details

### Built With

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Recharts** - Charts and visualizations
- **PapaParse** - CSV parsing
- **JSZip** - ZIP file extraction
- **Lucide React** - Icons

### Browser Support

- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

### Mobile Support

The app is fully responsive and works on mobile devices (390px+).

---

## Troubleshooting

### "Missing required files in ZIP"

Ensure your ZIP contains all three required files:
- menora_transactions.csv
- trading_eod.csv
- indices_eod.csv

### "No market data for this date"

The selected date may not have trading data. Try a different date within the available range shown.

### Smart money data not showing

1. Ensure both `trade_securities.csv` and `smart_money_eod.csv` are in the ZIP
2. The securities mapping must be loaded before smart money data

### Slow loading with large files

- Files over 100MB may take 30-60 seconds to parse
- Progress is shown during loading
- Consider using a subset of data for testing


