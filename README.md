# Investor Comparison Tool - Web App

A lightweight React web application for analyzing investor trading behavior against market direction.

## Features

### 1. Retrospective Dashboard
- View contrarian ratio (% of counter-market trades)
- Winner analysis table comparing Counter-Market vs Aligned trades
- Visual charts showing trade distribution and action breakdown

### 2. Trade Checker
- Check individual trades for counter-market alerts
- Input ISIN, action (Buy/Sell), and date
- Get instant alert levels (HIGH/MEDIUM/LOW/NONE)
- View check history

### 3. Portfolio Monitor
- Add portfolio positions (ISINs)
- Scan for momentum alerts on a specific date
- Configurable momentum threshold
- See sorted alerts and normal positions

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Installation

```bash
cd menora-web
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

## Data Requirements

Upload two CSV files:

1. **Transactions file** (`menora_transactions.csv`)
   - Required columns: `ISIN`, `Action`, `OrderDate`
   - Optional: `InvestmentManager`

2. **Trading EOD file** (`trading_eod.csv`)
   - Required columns: `tradeDate`, `isin`, `change`
   - Optional: `symbol`

## Tech Stack

- React 18 with Vite
- Tailwind CSS
- Recharts (charts)
- PapaParse (CSV parsing)
- Lucide React (icons)

## Counter-Market Logic

A trade is considered **counter-market** when:
- **BUY** while market is **DOWN** (negative change)
- **SELL** while market is **UP** (positive change)

Alert levels:
- **HIGH**: Counter-market + market move > 3%
- **MEDIUM**: Counter-market + market move > 2%
- **LOW**: Counter-market + market move < 2%
- **NONE**: Trade aligned with market direction
