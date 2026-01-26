# Investor Comparison Tool

A lightweight React web application for analyzing investor/trader behavior against market indices. Built for the Tel Aviv Stock Exchange (TASE) market.

## Features

### 1. Retrospective Dashboard
- View contrarian ratio (% of counter-market trades)
- Winner analysis table comparing Counter-Market vs Aligned trades
- Visual charts showing trade distribution and action breakdown
- Per-trader comparison with trading style classification
- Multi-index support (TA-125, TA-35, TA-90, TA-20, TA-200, and 70+ more)

### 2. Trade Checker
- Check individual trades for counter-market alerts
- Input ISIN, action (Buy/Sell), and date
- Get instant alert levels (HIGH/MEDIUM/LOW/NONE)
- Compare security change vs index change
- Auto-update when switching indices
- View check history

### 3. Portfolio Monitor
- Load trader portfolios automatically from transaction data
- Scan for momentum alerts on a specific date
- Configurable momentum threshold
- Compare position performance vs market index
- See sorted alerts and normal positions

## Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn

### Installation

```bash
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

## Deploy to Vercel

### Option 1: Vercel CLI

```bash
npm i -g vercel
vercel
```

### Option 2: GitHub Integration

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Vercel will auto-detect Vite and deploy

### Option 3: Manual Deploy

1. Build the app: `npm run build`
2. Deploy the `dist` folder to Vercel

## Data Requirements

Upload three CSV files:

### 1. Transactions file (`menora_transactions.csv`)
- Required columns: `ISIN`, `Action`, `OrderDate`
- Optional: `InvestmentManager`

### 2. Trading EOD file (`trading_eod.csv`)
- Required columns: `tradeDate`, `isin`, `change`
- Optional: `symbol`

### 3. Indices EOD file (`indices_eod.csv`)
- Required columns: `tradeDate`, `indexId`, `closingIndexPrice`
- Used for counter-market analysis against market indices

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first styling
- **Recharts** - Charts and visualizations
- **PapaParse** - CSV parsing in browser
- **Lucide React** - Icons

## Counter-Market Logic

A trade is considered **counter-market** when:
- **BUY** while market index is **DOWN** (negative change)
- **SELL** while market index is **UP** (positive change)

Alert levels:
- **HIGH**: Counter-market + index move > 3%
- **MEDIUM**: Counter-market + index move 2-3%
- **LOW**: Counter-market + index move < 2%
- **NONE**: Trade aligned with market direction

## Supported Indices

The app supports 70+ TASE indices including:
- ת״א-125 (TA-125) - Default
- ת״א-35 (TA-35)
- ת״א-90 (TA-90)
- ת״א-20 (TA-20)
- ת״א-200 (TA-200)
- ת״א All-Share
- Sector indices (Technology, Real Estate, Banks, etc.)
- Bond indices (Tel-Bond series)

## License

MIT
