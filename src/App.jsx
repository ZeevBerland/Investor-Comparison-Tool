import { useState, useEffect, useRef } from 'react';
import { DataProvider, useDataStore } from './hooks/useDataStore';
import { autoLoadData } from './lib/autoLoader';
import Layout from './components/Layout';
import FileUpload from './components/FileUpload';
import TraderSelection from './components/TraderSelection';
import Dashboard from './components/Dashboard';
import TradeChecker from './components/TradeChecker';
import PortfolioMonitor from './components/PortfolioMonitor';
import { Loader2 } from 'lucide-react';

// Inner component that has access to DataProvider context
function AppContent() {
  const { loadFromZipData } = useDataStore();
  
  // App phases: 'loading' | 'upload' | 'selectTrader' | 'main'
  const [appPhase, setAppPhase] = useState('loading');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loadError, setLoadError] = useState(null);
  const [loadProgress, setLoadProgress] = useState({ message: 'Starting...', percent: 0 });
  
  // Use ref to prevent multiple loads and to store stable function reference
  const hasStartedLoading = useRef(false);
  const loadFromZipDataRef = useRef(loadFromZipData);
  loadFromZipDataRef.current = loadFromZipData;

  // Auto-load data on mount (runs only once)
  useEffect(() => {
    if (hasStartedLoading.current) return;
    hasStartedLoading.current = true;
    
    async function loadData() {
      try {
        const result = await autoLoadData((progress) => {
          setLoadProgress({ message: progress.message, percent: progress.percent });
        });
        
        if (result.missingRequired.length > 0) {
          throw new Error(`Missing required files: ${result.missingRequired.join(', ')}`);
        }
        
        setLoadProgress({ message: 'Initializing app...', percent: 100 });
        loadFromZipDataRef.current(result);
        setAppPhase('selectTrader');
      } catch (error) {
        console.error('Auto-load failed:', error);
        setLoadError(error.message);
        // Fall back to manual upload
        setAppPhase('upload');
      }
    }
    
    loadData();
  }, []);

  // Handle file upload completion - go to trader selection
  const handleUploadComplete = () => {
    setAppPhase('selectTrader');
  };

  // Handle session start - go to main app
  const handleSessionStart = () => {
    setAppPhase('main');
    setActiveTab('dashboard');
  };

  // Handle logout - go back to trader selection (keep data loaded)
  const handleLogout = () => {
    setAppPhase('selectTrader');
    setActiveTab('dashboard');
  };

  // Handle full reset - go back to upload
  const handleReset = () => {
    setAppPhase('upload');
    setActiveTab('dashboard');
  };

  // Loading screen
  if (appPhase === 'loading') {
    return (
      <Layout 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        appPhase={appPhase}
        onLogout={handleLogout}
        onReset={handleReset}
      >
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-6">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <div className="w-80 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">{loadProgress.message}</span>
              <span className="text-gray-500">{loadProgress.percent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${loadProgress.percent}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-gray-400">Loading ~100MB of market data...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      appPhase={appPhase}
      onLogout={handleLogout}
      onReset={handleReset}
    >
      {appPhase === 'upload' && (
        <FileUpload onComplete={handleUploadComplete} />
      )}
      {appPhase === 'selectTrader' && (
        <TraderSelection onSessionStart={handleSessionStart} />
      )}
      {appPhase === 'main' && (
        <>
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'checker' && <TradeChecker />}
          {activeTab === 'monitor' && <PortfolioMonitor />}
        </>
      )}
    </Layout>
  );
}

function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}

export default App;
