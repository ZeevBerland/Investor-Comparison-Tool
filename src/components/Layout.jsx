import { BarChart3, Upload, Search, Activity, RotateCcw } from 'lucide-react';
import { useDataStore } from '../hooks/useDataStore';

const tabs = [
  { id: 'upload', label: 'Upload', labelFull: 'Upload Data', icon: Upload },
  { id: 'dashboard', label: 'Dashboard', labelFull: 'Dashboard', icon: BarChart3 },
  { id: 'checker', label: 'Checker', labelFull: 'Trade Checker', icon: Search },
  { id: 'monitor', label: 'Monitor', labelFull: 'Portfolio Monitor', icon: Activity },
];

export default function Layout({ children, activeTab, setActiveTab }) {
  const { isLoaded, reset } = useDataStore();

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
                Investor Comparison
              </h1>
            </div>
            
            {isLoaded && (
              <button
                onClick={() => {
                  reset();
                  setActiveTab('upload');
                }}
                className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 hover:text-gray-700 px-2 sm:px-3 py-1.5 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
              >
                <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Navigation Tabs - Horizontally scrollable on mobile */}
      <nav className="bg-white border-b sticky top-14 sm:top-16 z-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex overflow-x-auto scrollbar-hide">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const isDisabled = tab.id !== 'upload' && !isLoaded;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  disabled={isDisabled}
                  className={`
                    flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap flex-shrink-0
                    ${isActive 
                      ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                    ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <p className="text-center text-xs sm:text-sm text-gray-500">
            Investor Comparison Tool - POC Demo
          </p>
        </div>
      </footer>
    </div>
  );
}
