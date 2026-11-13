import React, { useState } from 'react';
import { GuestProvider, useGuest } from './context/GuestContext';
import { Sidebar, type PageId } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ResetModal } from './components/layout/ResetModal';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { AssistantPage } from './pages/AssistantPage';
import { NutritionPage } from './pages/NutritionPage';
import { TrackerPage } from './pages/TrackerPage';
import { WellnessPage } from './pages/WellnessPage';
import { ReportsPage } from './pages/ReportsPage';
import { LLMLabPage } from './pages/LLMLabPage';
import { HeartPulse, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

const AppContent: React.FC = () => {
  const { loading, authError, retryAuth } = useGuest();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Loading Screen while anonymous guest session initializes in PostgreSQL
  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#07566A] flex flex-col items-center justify-center text-white space-y-4 select-none">
        <div className="w-16 h-16 rounded-2xl bg-[#0FAEAE] flex items-center justify-center shadow-xl animate-pulse">
          <HeartPulse className="w-9 h-9 text-white" />
        </div>
        <div className="text-center space-y-1">
          <h2 className="text-xl font-extrabold tracking-tight">HealthMate AI</h2>
          <p className="text-xs text-teal-200">Initializing Login-Free PostgreSQL Guest Session...</p>
        </div>
        <Loader2 className="w-5 h-5 animate-spin text-[#21C4B8] mt-2" />
      </div>
    );
  }

  // Friendly error and retry screen if session creation fails
  if (authError) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl border border-slate-200 p-6 shadow-xl text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Session Initialization Notice</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              HealthMate AI connects securely in the background using automatic PostgreSQL anonymous guest sessions.
            </p>
            <p className="text-[11px] text-slate-400 font-mono bg-slate-50 p-2 rounded-lg break-all">
              {authError}
            </p>
          </div>
          <button
            onClick={retryAuth}
            className="w-full py-2.5 px-4 bg-[#0FAEAE] hover:bg-[#21C4B8] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#F4F8FA] overflow-hidden font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
        onOpenResetModal={() => setIsResetModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          currentPage={currentPage}
          onOpenResetModal={() => setIsResetModalOpen(true)}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {currentPage === 'dashboard' && <DashboardPage onNavigate={setCurrentPage} />}
          {currentPage === 'documents' && <DocumentsPage />}
          {currentPage === 'assistant' && <AssistantPage />}
          {currentPage === 'nutrition' && <NutritionPage />}
          {currentPage === 'tracker' && <TrackerPage />}
          {currentPage === 'wellness' && <WellnessPage />}
          {currentPage === 'reports' && <ReportsPage />}
          {currentPage === 'lab' && <LLMLabPage />}
        </main>
      </div>

      {/* Reset Confirmation Modal */}
      <ResetModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onResetComplete={() => setCurrentPage('dashboard')}
      />
    </div>
  );
};

export default function App() {
  return (
    <GuestProvider>
      <AppContent />
    </GuestProvider>
  );
}
