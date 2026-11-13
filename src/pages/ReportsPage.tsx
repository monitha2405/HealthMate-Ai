import React, { useState, useEffect } from 'react';
import {
  LineChart as LineChartIcon,
  Download,
  AlertTriangle,
  FileText,
  Activity,
  CheckCircle,
  Calendar,
  Filter
} from 'lucide-react';
import { api } from '../lib/api';
import { DisclaimerBanner } from '../components/common/DisclaimerBanner';
import { StatCard } from '../components/common/StatCard';

export const ReportsPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    async function fetchSummary() {
      try {
        const summary = await api.getReportsSummary(timeRange);
        setData(summary);
      } catch (e) {
        console.warn('Failed to load reports summary:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchSummary();
  }, [timeRange]);

  const handleExportJSON = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HealthMate_Summary_Report_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (!data || !data.abnormalBiomarkers) return;
    const headers = 'ID,Name,Value,Unit,ReferenceRange,Status,Verified,DocumentTitle\n';
    const rows = data.abnormalBiomarkers.map((b: any) =>
      `"${b.id}","${b.name}","${b.value}","${b.unit}","${b.referenceRange || ''}","${b.status}","${b.verified}","${b.documentTitle}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HealthMate_Abnormal_Biomarkers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const abnormalBiomarkers = data?.abnormalBiomarkers || [];
  const recentMeasurements = data?.recentMeasurements || [];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <DisclaimerBanner />

      {/* Header with Export & Date Filter */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <LineChartIcon className="w-5 h-5 text-[#0FAEAE]" />
            <span>Health Reports & Clinical Insights</span>
          </h3>
          <p className="text-xs text-slate-500">Cross-document biomarker synthesis and historical metric summaries</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time range filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {['7d', '30d', '90d', 'all'].map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-2.5 py-1 rounded-lg uppercase cursor-pointer transition-all ${
                  timeRange === r ? 'bg-white text-[#07566A] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportJSON}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 rounded-xl bg-[#0FAEAE] hover:bg-[#21C4B8] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Indexed Reports"
          value={data?.documentStats?.total || 0}
          subtitle={`${data?.documentStats?.verified || 0} verified by user`}
          icon={FileText}
          iconColor="text-teal-600"
        />

        <StatCard
          title="Attention Biomarkers"
          value={abnormalBiomarkers.length}
          subtitle="Outside standard range"
          icon={AlertTriangle}
          iconColor="text-amber-600"
          badge={{
            text: abnormalBiomarkers.length > 0 ? 'Review Needed' : 'All Normal',
            type: abnormalBiomarkers.length > 0 ? 'warning' : 'positive'
          }}
        />

        <StatCard
          title="Vitals Tracked"
          value={recentMeasurements.length}
          subtitle="Historical readings"
          icon={Activity}
          iconColor="text-blue-600"
        />

        <StatCard
          title="Habit Completion"
          value={`${data?.wellnessStats?.completionRate || 0}%`}
          subtitle={`${data?.wellnessStats?.completedHabits || 0} completed today`}
          icon={CheckCircle}
          iconColor="text-emerald-600"
        />
      </div>

      {/* Abnormal Biomarkers Alert Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Flagged Laboratory Findings Across Uploads</span>
            </h4>
            <p className="text-xs text-slate-500">Biomarkers identified outside standard physiological reference thresholds</p>
          </div>
          <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            {abnormalBiomarkers.length} Flags Identified
          </span>
        </div>

        {abnormalBiomarkers.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 space-y-1">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No Abnormal Biomarkers Detected</p>
            <p className="text-slate-400">All parsed laboratory tests currently sit within standard clinical reference intervals.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Biomarker</th>
                  <th className="py-2.5 px-4">Found Value</th>
                  <th className="py-2.5 px-4">Standard Reference Interval</th>
                  <th className="py-2.5 px-4">Deviation Status</th>
                  <th className="py-2.5 px-4">Source Report</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {abnormalBiomarkers.map((b: any) => (
                  <tr key={b.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-slate-800">{b.name}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {b.value} {b.unit}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">{b.referenceRange || '--'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        b.status === 'abnormal_high'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {b.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 italic">{b.documentTitle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
