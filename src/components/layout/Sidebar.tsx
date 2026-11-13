import React from 'react';
import {
  LayoutDashboard,
  FileText,
  BotMessageSquare,
  Utensils,
  Activity,
  CalendarCheck,
  LineChart,
  FlaskConical,
  ShieldCheck,
  RotateCcw,
  HeartPulse
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export type PageId = 'dashboard' | 'documents' | 'assistant' | 'nutrition' | 'tracker' | 'wellness' | 'reports' | 'lab';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  onOpenResetModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onSelectPage, onOpenResetModal }) => {
  const { user, profile } = useAuth();

  const navItems = [
    { id: 'dashboard' as PageId, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'documents' as PageId, label: 'Health Documents', icon: FileText, badge: 'RAG' },
    { id: 'assistant' as PageId, label: 'AI Health Assistant', icon: BotMessageSquare, badge: '5 Agents' },
    { id: 'nutrition' as PageId, label: 'Food & Nutrition', icon: Utensils },
    { id: 'tracker' as PageId, label: 'Health Tracker', icon: Activity },
    { id: 'wellness' as PageId, label: 'Wellness Planner', icon: CalendarCheck },
    { id: 'reports' as PageId, label: 'Reports & Insights', icon: LineChart },
    { id: 'lab' as PageId, label: 'LLM Lab', icon: FlaskConical, badge: 'Lab' },
  ];

  return (
    <aside className="w-68 bg-[#07566A] text-white flex flex-col shrink-0 h-screen border-r border-[#096a83] select-none">
      {/* Brand Header */}
      <div className="p-5 flex items-center gap-3 border-b border-[#0b6c85]">
        <div className="w-10 h-10 rounded-xl bg-[#0FAEAE] flex items-center justify-center text-white shadow-md shadow-teal-950/20">
          <HeartPulse className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
            HealthMate <span className="text-[#21C4B8] text-xs font-semibold px-1.5 py-0.5 rounded bg-[#096a83]">AI</span>
          </h1>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-teal-300/60">
          Application Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectPage(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 ${
                isActive
                  ? 'bg-[#0FAEAE] text-white shadow-sm font-bold'
                  : 'text-teal-100/90 hover:bg-[#0c6b84] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-teal-300/80'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[#0b657c] text-teal-200'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Guest Session Status & Data Reset */}
      <div className="p-3.5 border-t border-[#0b6c85] bg-[#054353] space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#21C4B8] animate-ping" />
            <span className="text-xs font-semibold text-white">
              {profile?.displayName || 'Guest User'}
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0a5a6f] text-teal-200 font-medium border border-teal-500/20">
            Login-Free
          </span>
        </div>

        <div className="px-2 py-1.5 rounded-lg bg-[#073845] text-[10px] text-teal-200/80 font-mono flex items-center justify-between">
          <span>UID: {user?.uid ? `${user.uid.slice(0, 8)}...` : 'Connecting...'}</span>
          <ShieldCheck className="w-3.5 h-3.5 text-[#21C4B8]" />
        </div>

        <button
          onClick={onOpenResetModal}
          className="w-full py-2 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-200 border border-rose-500/30 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Guest Data</span>
        </button>
      </div>
    </aside>
  );
};
