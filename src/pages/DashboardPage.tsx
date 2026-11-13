import React, { useEffect, useState } from 'react';
import {
  FileText,
  Activity,
  Utensils,
  CalendarCheck,
  Upload,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Heart
} from 'lucide-react';
import { StatCard } from '../components/common/StatCard';
import { DisclaimerBanner } from '../components/common/DisclaimerBanner';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import type { PageId } from '../components/layout/Sidebar';
import type { HealthDocument, HealthMeasurement, WellnessHabit, DailyMealPlan } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

export const DashboardPage: React.FC<{ onNavigate: (page: PageId) => void }> = ({ onNavigate }) => {
  const { profile } = useAuth();
  const [documents, setDocuments] = useState<HealthDocument[]>([]);
  const [measurements, setMeasurements] = useState<HealthMeasurement[]>([]);
  const [habits, setHabits] = useState<WellnessHabit[]>([]);
  const [mealPlan, setMealPlan] = useState<DailyMealPlan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [docs, meas, habs, plan] = await Promise.all([
          api.getDocuments().catch(() => []),
          api.getMeasurements().catch(() => []),
          api.getWellnessHabits().catch(() => []),
          api.getMealPlan().catch(() => null)
        ]);
        setDocuments(docs);
        setMeasurements(meas);
        setHabits(habs);
        setMealPlan(plan);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const verifiedDocsCount = documents.filter(d => d.verified).length;
  const completedHabitsCount = habits.filter(h => h.completed).length;
  const habitCompletionRate = habits.length > 0 ? Math.round((completedHabitsCount / habits.length) * 100) : 0;

  // Filter latest readings
  const latestBP = measurements.find(m => m.type === 'blood_pressure');
  const latestGlucose = measurements.find(m => m.type === 'blood_glucose');
  const latestWeight = measurements.find(m => m.type === 'weight');

  // Chart data from real measurements
  const chartData = measurements
    .filter(m => m.type === 'blood_glucose' || m.type === 'weight')
    .slice(0, 10)
    .reverse()
    .map(m => ({
      date: new Date(m.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value: m.value,
      type: m.type
    }));

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <DisclaimerBanner />

      {/* Hero Welcome Card */}
      <div className="bg-gradient-to-br from-[#07566A] to-[#0A6D86] text-white rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-teal-200 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-[#21C4B8]" />
            <span>Authenticated Anonymous Guest Session</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            Welcome, {profile?.displayName || 'Guest User'}
          </h2>
          <p className="text-sm text-teal-100/90 leading-relaxed">
            Your personal healthcare decision-support hub. Upload your clinical lab reports to leverage persistent RAG grounding, analyze vitals, and receive coordinated multi-agent wellness guidance.
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button
            onClick={() => onNavigate('documents')}
            className="px-4 py-2.5 rounded-xl bg-[#0FAEAE] hover:bg-[#21C4B8] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Health Document</span>
          </button>
          <button
            onClick={() => onNavigate('assistant')}
            className="px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold flex items-center gap-2 transition-all border border-white/20"
          >
            <span>Ask Health Assistant</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Core Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Uploaded Documents"
          value={documents.length}
          unit="files"
          subtitle={`${verifiedDocsCount} verified by you`}
          icon={FileText}
          iconColor="text-teal-600"
          badge={{
            text: documents.length > 0 ? 'RAG Ready' : 'Empty',
            type: documents.length > 0 ? 'positive' : 'neutral'
          }}
        />

        <StatCard
          title="Fasting Glucose"
          value={latestGlucose ? latestGlucose.value : '--'}
          unit={latestGlucose ? latestGlucose.unit : 'mg/dL'}
          subtitle={latestGlucose ? `Logged ${new Date(latestGlucose.timestamp).toLocaleDateString()}` : 'No readings yet'}
          icon={Activity}
          iconColor="text-blue-600"
          badge={{
            text: latestGlucose ? (latestGlucose.value > 100 ? 'Borderline' : 'Normal') : 'No Data',
            type: latestGlucose ? (latestGlucose.value > 100 ? 'warning' : 'positive') : 'neutral'
          }}
        />

        <StatCard
          title="Blood Pressure"
          value={latestBP ? `${latestBP.value}/${latestBP.secondaryValue || 80}` : '--/--'}
          unit={latestBP ? latestBP.unit : 'mmHg'}
          subtitle={latestBP ? `Logged ${new Date(latestBP.timestamp).toLocaleDateString()}` : 'No readings yet'}
          icon={Heart}
          iconColor="text-rose-600"
          badge={{
            text: latestBP ? 'Recorded' : 'No Data',
            type: latestBP ? 'neutral' : 'neutral'
          }}
        />

        <StatCard
          title="Daily Wellness"
          value={`${habitCompletionRate}%`}
          subtitle={`${completedHabitsCount} of ${habits.length} habits completed`}
          icon={CalendarCheck}
          iconColor="text-emerald-600"
          badge={{
            text: habitCompletionRate >= 75 ? 'On Track' : 'In Progress',
            type: habitCompletionRate >= 75 ? 'positive' : 'warning'
          }}
        />
      </div>

      {/* Middle Grid: Trend Chart & Quick Feature Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Real Measurement Trend Visualization */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#0FAEAE]" />
                <span>Health Metrics Trend</span>
              </h3>
              <p className="text-xs text-slate-500">Historical readings tracked over time</p>
            </div>
            <button
              onClick={() => onNavigate('tracker')}
              className="text-xs font-semibold text-[#0FAEAE] hover:text-[#07566A] flex items-center gap-1"
            >
              <span>View Tracker</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {chartData.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0FAEAE" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0FAEAE" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#07566A', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                    itemStyle={{ color: '#21C4B8' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#0FAEAE" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
              <Activity className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-700">No Historical Measurements Logged</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Log your blood glucose, blood pressure, or weight in the Health Tracker to view trend lines.
              </p>
              <button
                onClick={() => onNavigate('tracker')}
                className="mt-3 px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold hover:bg-teal-100 transition-colors"
              >
                Add First Reading
              </button>
            </div>
          )}
        </div>

        {/* Quick Access & Modules */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900">HealthMate Modules</h3>

          <div className="space-y-2.5">
            <button
              onClick={() => onNavigate('documents')}
              className="w-full p-3 rounded-xl border border-slate-100 hover:border-teal-200 bg-slate-50/50 hover:bg-teal-50/30 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-100 text-[#07566A] rounded-lg">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-[#07566A]">Health Documents</div>
                  <div className="text-[11px] text-slate-500">{documents.length} report(s) indexed</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => onNavigate('nutrition')}
              className="w-full p-3 rounded-xl border border-slate-100 hover:border-teal-200 bg-slate-50/50 hover:bg-teal-50/30 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 text-orange-700 rounded-lg">
                  <Utensils className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-[#07566A]">Food & Nutrition</div>
                  <div className="text-[11px] text-slate-500">
                    {mealPlan ? `${mealPlan.totalCalories} kcal daily plan` : 'Configure meal plan'}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => onNavigate('wellness')}
              className="w-full p-3 rounded-xl border border-slate-100 hover:border-teal-200 bg-slate-50/50 hover:bg-teal-50/30 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                  <CalendarCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-[#07566A]">Wellness Planner</div>
                  <div className="text-[11px] text-slate-500">{completedHabitsCount} of {habits.length} habits done</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => onNavigate('lab')}
              className="w-full p-3 rounded-xl border border-purple-100 hover:border-purple-300 bg-purple-50/40 text-left transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-purple-950">LLM Engineering Lab</div>
                  <div className="text-[11px] text-purple-700/80">Inspect RAG & Agent Routing</div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-purple-500 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
