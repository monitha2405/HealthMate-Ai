import React, { useState, useEffect } from 'react';
import {
  Activity,
  Plus,
  Trash2,
  TrendingUp,
  Heart,
  Droplet,
  Scale,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { api } from '../lib/api';
import { DisclaimerBanner } from '../components/common/DisclaimerBanner';
import type { HealthMeasurement, MeasurementType } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

export const TrackerPage: React.FC = () => {
  const [measurements, setMeasurements] = useState<HealthMeasurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<MeasurementType>('blood_glucose');
  const [formType, setFormType] = useState<MeasurementType>('blood_glucose');
  const [val1, setVal1] = useState<string>('');
  const [val2, setVal2] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await api.getMeasurements();
      setMeasurements(data);
    } catch (e) {
      console.warn('Failed to load tracker measurements:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddMeasurement = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const num1 = parseFloat(val1);
    if (isNaN(num1) || num1 <= 0) {
      setError('Please enter a valid positive numerical measurement.');
      return;
    }

    let num2: number | undefined = undefined;
    let unit = 'mg/dL';

    if (formType === 'blood_pressure') {
      const systolic = num1;
      const diastolic = parseFloat(val2);
      if (isNaN(diastolic) || diastolic <= 0) {
        setError('Please enter both systolic and diastolic blood pressure.');
        return;
      }
      if (diastolic >= systolic) {
        setError('Systolic must be strictly greater than diastolic.');
        return;
      }
      num2 = diastolic;
      unit = 'mmHg';
    } else if (formType === 'weight') {
      unit = 'kg';
    } else if (formType === 'heart_rate') {
      unit = 'bpm';
    } else if (formType === 'hba1c') {
      unit = '%';
    }

    try {
      const newMeasurement = await api.addMeasurement({
        type: formType,
        value: num1,
        secondaryValue: num2,
        unit,
        notes: notes.trim() || undefined,
        timestamp: new Date().toISOString()
      });

      setMeasurements(prev => [newMeasurement, ...prev]);
      setVal1('');
      setVal2('');
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to save measurement.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteMeasurement(id);
      setMeasurements(prev => prev.filter(m => m.id !== id));
    } catch (e: any) {
      alert('Delete failed: ' + e.message);
    }
  };

  // Filter measurements for chart
  const filtered = measurements.filter(m => m.type === selectedType);
  const chartData = filtered.slice().reverse().map(m => ({
    date: new Date(m.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    value: m.value,
    secondary: m.secondaryValue
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <DisclaimerBanner />

      {/* Log New Measurement Form */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Plus className="w-5 h-5 text-[#0FAEAE]" />
          <span>Record Health Measurement</span>
        </h3>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleAddMeasurement} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Measurement Type</label>
            <select
              value={formType}
              onChange={e => setFormType(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0FAEAE]"
            >
              <option value="blood_glucose">Fasting Blood Glucose (mg/dL)</option>
              <option value="blood_pressure">Blood Pressure (Systolic/Diastolic mmHg)</option>
              <option value="weight">Body Weight (kg)</option>
              <option value="heart_rate">Resting Heart Rate (bpm)</option>
              <option value="hba1c">HbA1c (%)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">
              {formType === 'blood_pressure' ? 'Systolic (mmHg)' : 'Value'}
            </label>
            <input
              type="number"
              step="0.1"
              value={val1}
              onChange={e => setVal1(e.target.value)}
              placeholder={formType === 'blood_glucose' ? 'e.g. 98' : formType === 'weight' ? 'e.g. 72.5' : '120'}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0FAEAE]"
            />
          </div>

          {formType === 'blood_pressure' ? (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Diastolic (mmHg)</label>
              <input
                type="number"
                step="0.1"
                value={val2}
                onChange={e => setVal2(e.target.value)}
                placeholder="e.g. 80"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0FAEAE]"
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Clinical Notes (Optional)</label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Before breakfast, fasting 10 hrs"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0FAEAE]"
              />
            </div>
          )}

          <div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#0FAEAE] hover:bg-[#21C4B8] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Log Reading</span>
            </button>
          </div>
        </form>
      </div>

      {/* Historical Trend Chart Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#0FAEAE]" />
              <span>Historical Trend Analysis</span>
            </h3>
            <p className="text-xs text-slate-500">Select a biomarker to visualize long-term trajectory</p>
          </div>

          {/* Metric Selector Tabs */}
          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
            {(['blood_glucose', 'blood_pressure', 'weight', 'heart_rate', 'hba1c'] as MeasurementType[]).map(type => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  selectedType === type
                    ? 'bg-white text-[#07566A] shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {type === 'blood_glucose' ? 'Glucose' : type === 'blood_pressure' ? 'BP' : type === 'weight' ? 'Weight' : type === 'heart_rate' ? 'Heart Rate' : 'HbA1c'}
              </button>
            ))}
          </div>
        </div>

        {chartData.length > 0 ? (
          <div className="h-64 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#07566A', borderRadius: '12px', color: '#fff', fontSize: '12px' }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={selectedType === 'blood_pressure' ? 'Systolic' : 'Value'}
                  stroke="#0FAEAE"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#0FAEAE' }}
                  activeDot={{ r: 6 }}
                />
                {selectedType === 'blood_pressure' && (
                  <Line
                    type="monotone"
                    dataKey="secondary"
                    name="Diastolic"
                    stroke="#F43F5E"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#F43F5E' }}
                    activeDot={{ r: 6 }}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
            <Activity className="w-8 h-8 text-slate-300 mb-1" />
            <p className="text-xs font-semibold text-slate-700">No {selectedType.replace('_', ' ')} readings logged</p>
            <p className="text-xs text-slate-500 mt-0.5">Use the form above to add your first reading.</p>
          </div>
        )}
      </div>

      {/* Measurement History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Recorded Vitals Log ({measurements.length})
          </h4>
          <span className="text-xs text-slate-400">All data stored persistently in SQLite</span>
        </div>

        {measurements.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No health measurements recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-6">Date & Time</th>
                  <th className="py-2.5 px-6">Measurement</th>
                  <th className="py-2.5 px-6">Recorded Value</th>
                  <th className="py-2.5 px-6">Notes</th>
                  <th className="py-2.5 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {measurements.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/60">
                    <td className="py-3 px-6 text-slate-600 font-mono text-[11px]">
                      {new Date(m.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-6 font-bold text-slate-800 capitalize">
                      {m.type.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-6 font-mono font-semibold text-teal-800">
                      {m.type === 'blood_pressure' ? `${m.value}/${m.secondaryValue} ${m.unit}` : `${m.value} ${m.unit}`}
                    </td>
                    <td className="py-3 px-6 text-slate-500">
                      {m.notes || '--'}
                    </td>
                    <td className="py-3 px-6 text-right">
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                        title="Delete reading"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
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
