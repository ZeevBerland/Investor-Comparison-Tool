import { useState } from 'react';
import { DataProvider } from './hooks/useDataStore';
import Layout from './components/Layout';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import TradeChecker from './components/TradeChecker';
import PortfolioMonitor from './components/PortfolioMonitor';

function App() {
  const [activeTab, setActiveTab] = useState('upload');

  return (
    <DataProvider>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {activeTab === 'upload' && <FileUpload onComplete={() => setActiveTab('dashboard')} />}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'checker' && <TradeChecker />}
        {activeTab === 'monitor' && <PortfolioMonitor />}
      </Layout>
    </DataProvider>
  );
}

export default App;
