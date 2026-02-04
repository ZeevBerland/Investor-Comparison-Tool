import { useState } from 'react';
import { DataProvider } from './hooks/useDataStore';
import { ThemeProvider } from './hooks/useTheme';
import Layout from './components/Layout';
import FileUpload from './components/FileUpload';
import TraderSelection from './components/TraderSelection';
import Dashboard from './components/Dashboard';
import TradeChecker from './components/TradeChecker';

// Inner component that has access to DataProvider context
function AppContent() {
  // App phases: 'upload' | 'selectTrader' | 'main'
  const [appPhase, setAppPhase] = useState('upload');
  const [activeTab, setActiveTab] = useState('dashboard');

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
        </>
      )}
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </ThemeProvider>
  );
}

export default App;
