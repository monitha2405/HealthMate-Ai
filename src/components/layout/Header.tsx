import React from 'react';
import { RotateCcw, Cpu, UserCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { PageId } from './Sidebar';

interface HeaderProps {
  currentPage: PageId;
  onOpenResetModal: () => void;
}

const PAGE_META: Record<PageId, { title: string; description: string }> = {
  dashboard: {
    title: 'HealthMate Dashboard',
    description: 'Personal health overview, recent clinical biomarkers, and daily wellness summary'
  },
  documents: {
    title: 'Health Documents & RAG Ingestion',
    description: 'Upload lab reports, extract biomarkers, verify clinical values, and index into vector store'
  },
  assistant: {
    title: 'AI Health Assistant',
    description: 'Multi-agent healthcare assistant grounded in your uploaded documents and verified records'
  },
  nutrition: {
    title: 'Food & Nutrition Planner',
    description: 'Allergy-aware personalized Indian & global meal plans with deterministic macro targets'
  },
  tracker: {
    title: 'Health Metrics Tracker',
    description: 'Track and visualize blood pressure, fasting glucose, weight, and clinical parameters over time'
  },
  wellness: {
    title: 'Wellness & Daily Habits',
    description: 'Monitor hydration, sleep hygiene, physical steps, and build sustainable wellness routines'
  },
  reports: {
    title: 'Reports & Clinical Insights',
    description: 'Comprehensive historical trend comparisons, abnormal lab values, and summary exports'
  },
  lab: {
    title: 'Academic LLM Engineering Laboratory',
    description: 'Interactive deep-dive into RAG cosine retrieval, prompt templates, agent routing, and evaluation benchmarks'
  }
};

export const Header: React.FC<HeaderProps> = ({ currentPage, onOpenResetModal }) => {
  const { profile } = useAuth();
  const meta = PAGE_META[currentPage];

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
      <div>
        <h2 className="text-lg font-bold text-slate-900 tracking-tight">{meta.title}</h2>
        <p className="text-xs text-slate-500">{meta.description}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Model Engine Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium">
          <Cpu className="w-3.5 h-3.5 text-[#0FAEAE]" />
          <span>Gemini 3.8 Flash + pgvector RAG</span>
        </div>

        {/* Guest User Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
          <UserCheck className="w-3.5 h-3.5 text-[#0FAEAE]" />
          <span>{profile?.displayName || 'Guest User'}</span>
        </div>

        {/* Quick Reset Button */}
        <button
          onClick={onOpenResetModal}
          title="Reset guest session and permanently wipe all data"
          className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
