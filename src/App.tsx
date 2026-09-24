import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useRouletteStore } from './store/useRouletteStore';
import { Sidebar } from './components/common/Sidebar';
import { Header } from './components/common/Header';
import { Toast } from './components/common/Toast';
import { OverviewPage } from './pages/OverviewPage';
import { CasinoScoresConnectPage } from './pages/CasinoScoresConnectPage';
import { EnterResultsPage } from './pages/EnterResultsPage';
import { PatternAnalysisPage } from './pages/PatternAnalysisPage';
import { PredictionCenterPage } from './pages/PredictionCenterPage';
import { RouletteTablePage } from './pages/RouletteTablePage';
import { SpinHistoryPage } from './pages/SpinHistoryPage';
import { PerformanceAnalyticsPage } from './pages/PerformanceAnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Loader2 } from 'lucide-react';

export const App: React.FC = () => {
  const { initializeStore, isLoading, sidebarOpen } = useRouletteStore();

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#080B12] flex flex-col items-center justify-center text-slate-100 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-[#D4AF37]" />
        <span className="text-xs font-bold tracking-widest uppercase text-[#D4AF37]">
          Loading Roulette Intelligence Engine...
        </span>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-[#080B12] text-[#F8FAFC]">
        <Sidebar />
        <Header />

        <main
          className={`transition-all duration-300 p-6 min-h-[calc(100vh-4rem)] ${
            sidebarOpen ? 'ml-64' : 'ml-20'
          }`}
        >
          <Routes>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/casinoscores" element={<CasinoScoresConnectPage />} />
            <Route path="/enter" element={<EnterResultsPage />} />
            <Route path="/patterns" element={<PatternAnalysisPage />} />
            <Route path="/predictions" element={<PredictionCenterPage />} />
            <Route path="/table" element={<RouletteTablePage />} />
            <Route path="/history" element={<SpinHistoryPage />} />
            <Route path="/performance" element={<PerformanceAnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <Toast />
      </div>
    </Router>
  );
};

export default App;
