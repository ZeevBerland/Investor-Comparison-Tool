import { useState, useMemo } from 'react';
import { User, Calendar, ArrowRight, BarChart3 } from 'lucide-react';
import { useDataStore } from '../hooks/useDataStore';

export default function TraderSelection({ onSessionStart }) {
  const { traders, getAvailableDates, startSession } = useDataStore();
  const [selectedTrader, setSelectedTrader] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  const availableDates = useMemo(() => getAvailableDates(), [getAvailableDates]);

  const dateRange = useMemo(() => {
    if (availableDates.length === 0) return { min: '', max: '' };
    return {
      min: availableDates[0],
      max: availableDates[availableDates.length - 1],
    };
  }, [availableDates]);

  const handleStartSession = () => {
    if (!selectedTrader || !selectedDate) return;
    startSession(selectedTrader, selectedDate);
    onSessionStart();
  };

  const isValid = selectedTrader && selectedDate;

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-lg border p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Welcome</h2>
          <p className="text-gray-600 mt-2">
            Select your trader profile and simulation date to begin
          </p>
        </div>

        <div className="space-y-6">
          {/* Trader Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-2" />
              Investment Manager
            </label>
            <select
              value={selectedTrader}
              onChange={(e) => setSelectedTrader(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-gray-900 bg-white"
            >
              <option value="">Select a trader...</option>
              {traders.map(trader => (
                <option key={trader} value={trader}>{trader}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {traders.length} traders available
            </p>
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Simulation Date (Present Day)
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={dateRange.min}
              max={dateRange.max}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
            {dateRange.min && (
              <p className="text-xs text-gray-500 mt-1">
                Available range: {dateRange.min} to {dateRange.max}
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              The system will show only your transactions and data up to the selected date, 
              simulating that day as the present.
            </p>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartSession}
            disabled={!isValid}
            className={`w-full py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors ${
              isValid
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Start Session
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
