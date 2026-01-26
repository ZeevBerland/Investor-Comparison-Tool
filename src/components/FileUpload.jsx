import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import { parseCSV, detectFileType } from '../lib/csvParser';
import { useDataStore } from '../hooks/useDataStore';

export default function FileUpload({ onComplete }) {
  const { loadTransactions, loadTradingData, loadIndicesData, processData, transactions, tradingData, indicesData } = useDataStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [transactionFile, setTransactionFile] = useState(null);
  const [tradingFile, setTradingFile] = useState(null);
  const [indicesFile, setIndicesFile] = useState(null);

  const handleFileUpload = useCallback(async (file, expectedType) => {
    setLoading(true);
    setError(null);

    try {
      const data = await parseCSV(file);
      const detectedType = detectFileType(data);
      
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
  }, [loadTransactions, loadTradingData, loadIndicesData]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      if (file.name.endsWith('.csv')) {
        handleFileUpload(file);
      }
    });
  }, [handleFileUpload]);

  const handleProcess = () => {
    const result = processData();
    if (result) {
      onComplete();
    } else {
      setError('Could not process data. Please upload all three files.');
    }
  };

  const canProcess = transactions.length > 0 && tradingData.length > 0 && indicesData.length > 0;

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
            <p className="text-gray-600">Processing file...</p>
          </div>
        ) : (
          <>
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg text-gray-700 mb-2">
              Drag & drop CSV files here
            </p>
            <p className="text-sm text-gray-500 mb-4">
              or click the buttons below to select files
            </p>
            
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
        <p className="text-xs text-gray-500 mt-2">
          Counter-market analysis compares trades against market index direction (default: TA-125).
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
