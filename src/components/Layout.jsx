import { BarChart3, Search, LogOut, RotateCcw, User, Calendar } from 'lucide-react';
import { useDataStore } from '../hooks/useDataStore';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', labelFull: 'Dashboard', icon: BarChart3 },
  { id: 'checker', label: 'Checker', labelFull: 'Trade Checker', icon: Search },
];

export default function Layout({ children, activeTab, setActiveTab, appPhase, onLogout, onReset }) {
  const { isSessionActive, sessionTrader, sessionDate, endSession, reset } = useDataStore();

  const handleLogout = () => {
    endSession();
    onLogout();
  };

  const handleReset = () => {
    reset();
    onReset();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <h1 className="text-base sm:text-xl font-semibold text-gray-900 truncate">
                Investor Helper
              </h1>
            </div>
            
            {/* Session Info & Actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Session Info - only show in main phase */}
              {isSessionActive && appPhase === 'main' && (
                <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-1.5 text-blue-700">
                    <User className="w-4 h-4" />
                    <span className="text-sm font-medium">{sessionTrader}</span>
                  </div>
                  <div className="w-px h-4 bg-blue-300" />
                  <div className="flex items-center gap-1.5 text-blue-600">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">{sessionDate}</span>
                  </div>
                </div>
              )}
              
              {/* Logout Button - only in main phase */}
              {isSessionActive && appPhase === 'main' && (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 hover:text-gray-700 px-2 sm:px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
                >
                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              )}
              
              {/* Reset Button - show in selectTrader or main phase */}
              {(appPhase === 'selectTrader' || appPhase === 'main') && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-xs sm:text-sm text-red-500 hover:text-red-700 px-2 sm:px-3 py-1.5 rounded-md hover:bg-red-50 transition-colors flex-shrink-0"
                >
                  <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Reset Data</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs - Only show in main phase */}
      {appPhase === 'main' && (
        <nav className="bg-white border-b sticky top-14 sm:top-16 z-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex overflow-x-auto scrollbar-hide">
              {tabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer
                      ${isActive 
                        ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="sm:hidden">{tab.label}</span>
                    <span className="hidden sm:inline">{tab.labelFull}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </nav>
      )}

      {/* Mobile Session Info Bar - only in main phase */}
      {isSessionActive && appPhase === 'main' && (
        <div className="sm:hidden bg-blue-50 border-b border-blue-200 px-3 py-2">
          <div className="flex items-center justify-center gap-3 text-blue-700 text-sm">
            <span className="font-medium">{sessionTrader}</span>
            <span className="text-blue-400">|</span>
            <span>{sessionDate}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 flex-1 w-full">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <p className="text-center text-xs sm:text-sm text-gray-500">
            Investor Helper - POC Demo
          </p>
        </div>
      </footer>
    </div>
  );
}
