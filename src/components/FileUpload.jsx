import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, TrendingUp, Users, Database, Archive } from 'lucide-react';
import { parseCSV, detectFileType } from '../lib/csvParser';
import { extractAndParseZip } from '../lib/zipParser';
import { useDataStore } from '../hooks/useDataStore';

export default function FileUpload({ onComplete }) {
  const { 
    loadTransactions, loadTradingData, loadIndicesData, processData, 
    transactions, tradingData, indicesData,
    loadSecuritiesData, loadSmartMoneyData, aggregateSmartMoney,
    smartMoneyRaw, securitiesData, securityToIsin
  } = useDataStore();
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Processing file...');
  const [error, setError] = useState(null);
  const [transactionFile, setTransactionFile] = useState(null);
  const [tradingFile, setTradingFile] = useState(null);
  const [indicesFile, setIndicesFile] = useState(null);
  const [securitiesFile, setSecuritiesFile] = useState(null);
  const [smartMoneyFile, setSmartMoneyFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);

  // Handle ZIP file upload - extracts and loads all CSVs at once
  const handleZipUpload = useCallback(async (file) => {
    setLoading(true);
    setLoadingMessage('Extracting ZIP archive...');
    setError(null);

    try {
      const { data, fileInfo, missingRequired } = await extractAndParseZip(file);

      // Check for missing required files
      if (missingRequired.length > 0) {
        setError(`Missing required files in ZIP: ${missingRequired.join(', ')}`);
        setLoading(false);
        return;
      }

      setLoadingMessage('Loading extracted data...');

      // Load transactions
      if (data.transactions) {
        const count = loadTransactions(data.transactions);
        setTransactionFile({ name: fileInfo.transactions.name, rows: count });
      }

      // Load trading data
      if (data.trading) {
        const count = loadTradingData(data.trading);
        setTradingFile({ name: fileInfo.trading.name, rows: count });
      }

      // Load indices data
      if (data.indices) {
        const count = loadIndicesData(data.indices);
        setIndicesFile({ name: fileInfo.indices.name, rows: count });
      }

      // Load securities mapping (optional)
      if (data.securities) {
        const count = loadSecuritiesData(data.securities);
        setSecuritiesFile({ name: fileInfo.securities.name, rows: count });
      }

      // Load smart money data (optional) - must load after securities for mapping
      if (data.smartmoney) {
        const count = loadSmartMoneyData(data.smartmoney, securityToIsin);
        setSmartMoneyFile({ name: fileInfo.smartmoney.name, rows: count });
      }

      setZipFile({ name: file.name });

    } catch (err) {
      setError(`Error processing ZIP file: ${err.message}`);
    }

    setLoading(false);
    setLoadingMessage('Processing file...');
  }, [loadTransactions, loadTradingData, loadIndicesData, loadSecuritiesData, loadSmartMoneyData, securityToIsin]);

  const handleFileUpload = useCallback(async (file, expectedType) => {
    setLoading(true);
    setError(null);

    try {
      const data = await parseCSV(file);
      const detectedType = detectFileType(data);
      
      // Allow explicit type for new file types
      if (expectedType === 'securities' || expectedType === 'smartmoney') {
        if (expectedType === 'securities') {
          const count = loadSecuritiesData(data);
          setSecuritiesFile({ name: file.name, rows: count });
        } else if (expectedType === 'smartmoney') {
          const count = loadSmartMoneyData(data, securityToIsin);
          setSmartMoneyFile({ name: file.name, rows: count });
        }
        setLoading(false);
        return;
      }
      
      if (detectedType === 'unknown') {
        setError('Could not detect file type. Please ensure correct CSV format.');
        setLoading(false);
        return;
      }

      if (expectedType && detectedType !== expectedType) {
        setError(`Expected ${expectedType} file but got ${detectedType}`);
        setLoading(false);
        return;
      }

      if (detectedType === 'transactions') {
        const count = loadTransactions(data);
        setTransactionFile({ name: file.name, rows: count });
      } else if (detectedType === 'trading') {
        const count = loadTradingData(data);
        setTradingFile({ name: file.name, rows: count });
      } else if (detectedType === 'indices') {
        const count = loadIndicesData(data);
        setIndicesFile({ name: file.name, rows: count });
      }
    } catch (err) {
      setError(`Error parsing file: ${err.message}`);
    }

    setLoading(false);
  }, [loadTransactions, loadTradingData, loadIndicesData, loadSecuritiesData, loadSmartMoneyData, securityToIsin]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (file.name.endsWith('.zip')) {
        handleZipUpload(file);
      } else if (file.name.endsWith('.csv')) {
        handleFileUpload(file);
      }
    });
  }, [handleFileUpload, handleZipUpload]);

  const handleProcess = () => {
    const result = processData();
    if (result) {
      // Aggregate smart money data if both files are loaded
      if (smartMoneyRaw.length > 0 && securityToIsin.size > 0) {
        aggregateSmartMoney();
      }
      onComplete();
    } else {
      setError('Could not process data. Please upload all three required files.');
    }
  };

  const canProcess = transactions.length > 0 && tradingData.length > 0 && indicesData.length > 0;
  const hasSmartMoneyData = smartMoneyRaw.length > 0 && securitiesData.length > 0;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Data</h2>
        <p className="text-gray-600">
          Upload your transaction, trading, and indices CSV files to start analyzing
        </p>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors bg-white"
      >
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
            <p className="text-gray-600">{loadingMessage}</p>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-700 mb-2">
              Drag & drop ZIP or CSV files here
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click the buttons below to select files
            </p>

            {/* Prominent ZIP Upload Button */}
            <label className="cursor-pointer block mb-6">
              <input
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleZipUpload(file);
                }}
              />
              <span className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg text-lg font-medium">
                <Archive className="w-5 h-5" />
                Upload ZIP Archive
              </span>
              <p className="text-xs text-gray-500 mt-2">Recommended: Load all files at once from menora_data.zip</p>
            </label>

            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or upload individual files</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-3 justify-center">
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'transactions');
                  }}
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <FileText className="w-4 h-4" />
                  Transactions
                </span>
              </label>
              
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'trading');
                  }}
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                  <FileText className="w-4 h-4" />
                  Trading EOD
                </span>
              </label>

              <label className="cursor-pointer">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file, 'indices');
                  }}
                />
                <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                  <TrendingUp className="w-4 h-4" />
                  Indices EOD
                </span>
              </label>
            </div>
            
            {/* Smart Money Data Files */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500 mb-3">Smart Money Data (Optional - enables sentiment analysis)</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'securities');
                    }}
                  />
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                    <Database className="w-4 h-4" />
                    Securities Mapping
                  </span>
                </label>
                
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file, 'smartmoney');
                    }}
                  />
                  <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                    <Users className="w-4 h-4" />
                    Smart Money EOD
                  </span>
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* ZIP File Loaded Banner */}
      {zipFile && (
        <div className="mt-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center gap-3">
          <Archive className="w-5 h-5 text-indigo-600" />
          <div>
            <p className="font-medium text-indigo-900">ZIP Archive Loaded</p>
            <p className="text-sm text-indigo-700">{zipFile.name} - All files extracted successfully</p>
          </div>
        </div>
      )}

      {/* File Status */}
      <div className="mt-6 space-y-3">
        <FileStatus
          label="Transactions File"
          file={transactionFile}
          example="menora_transactions.csv"
          required
        />
        <FileStatus
          label="Trading EOD File"
          file={tradingFile}
          example="trading_eod.csv"
          required
        />
        <FileStatus
          label="Indices EOD File"
          file={indicesFile}
          example="indices_eod.csv"
          required
        />
        
        {/* Smart Money Files */}
        <div className="pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 mb-2">Smart Money Data (enables sentiment-based alerts)</p>
          <div className="space-y-2">
            <FileStatus
              label="Securities Mapping"
              file={securitiesFile}
              example="trade_securities.csv"
              optional
            />
            <FileStatus
              label="Smart Money EOD"
              file={smartMoneyFile}
              example="smart_money_eod.csv"
              optional
            />
          </div>
        </div>
        
        {hasSmartMoneyData && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Smart money sentiment analysis enabled
            </p>
          </div>
        )}
      </div>

      {/* Process Button */}
      {canProcess && (
        <div className="mt-8 text-center">
          <button
            onClick={handleProcess}
            className="px-8 py-3 bg-green-600 text-white text-lg font-medium rounded-lg hover:bg-green-700 transition-colors shadow-lg"
          >
            Process Data & Continue
          </button>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Expected File Formats</h3>
        <div className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>Transactions:</strong> ISIN, Action, OrderDate, InvestmentManager, ...
          </p>
          <p>
            <strong>Trading EOD:</strong> tradeDate, isin, change, symbol, ...
          </p>
          <p>
            <strong>Indices EOD:</strong> tradeDate, indexId, closingIndexPrice, ...
          </p>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-sm text-gray-600 font-medium mb-1">Smart Money Files (Optional):</p>
          <div className="text-sm text-gray-600 space-y-1">
            <p>
              <strong>Securities Mapping:</strong> securityId, isin, symbol, companyName, ...
            </p>
            <p>
              <strong>Smart Money EOD:</strong> tradeDate, clientTypeId, securityId, turnoverBuyNis, turnoverSellNis, ...
            </p>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Smart money data enables sentiment-based alerts showing institutional investor activity.
        </p>
      </div>
    </div>
  );
}

function FileStatus({ label, file, example, required, optional }) {
  return (
    <div className={`p-4 rounded-lg border flex items-center justify-between ${
      file ? 'bg-green-50 border-green-200' : optional ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="flex items-center gap-3">
        {file ? (
          <CheckCircle className="w-5 h-5 text-green-600" />
        ) : (
          <FileText className={`w-5 h-5 ${optional ? 'text-amber-400' : 'text-gray-400'}`} />
        )}
        <div>
          <p className="font-medium text-gray-900">
            {label}
            {optional && !file && <span className="ml-2 text-xs text-amber-600">(Optional)</span>}
          </p>
          <p className="text-sm text-gray-500">
            {file ? `${file.name} (${file.rows.toLocaleString()} rows)` : `e.g., ${example}`}
          </p>
        </div>
      </div>
      {file && (
        <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded">
          Loaded
        </span>
      )}
    </div>
  );
}
