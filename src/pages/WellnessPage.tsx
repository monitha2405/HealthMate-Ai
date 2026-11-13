import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Droplet,
  Moon,
  Footprints,
  Brain,
  Plus,
  CheckCircle2,
  Circle,
  Flame,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../lib/api';
import { DisclaimerBanner } from '../components/common/DisclaimerBanner';
import type { WellnessHabit } from '../types';

export const WellnessPage: React.FC = () => {
  const [habits, setHabits] = useState<WellnessHabit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newCategory, setNewCategory] = useState<'sleep' | 'water' | 'activity' | 'meditation'>('activity');
  const [newTarget, setNewTarget] = useState<number>(1);
  const [newUnit, setNewUnit] = useState('times');

  const loadHabits = async () => {
    try {
      const data = await api.getWellnessHabits();
      setHabits(data);
    } catch (e) {
      console.warn('Failed to load wellness habits:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHabits();
  }, []);

  const toggleHabit = async (habit: WellnessHabit) => {
    const updatedCompleted = !habit.completed;
    const updatedVal = updatedCompleted ? habit.targetValue : 0;
    try {
      const updated = await api.updateWellnessHabit(habit.id, {
        completed: updatedCompleted,
        currentValue: updatedVal
      });
      setHabits(prev => prev.map(h => h.id === habit.id ? updated : h));
    } catch (e: any) {
      alert('Failed to update habit: ' + e.message);
    }
  };

  const handleIncrement = async (habit: WellnessHabit, delta: number) => {
    const newVal = Math.max(0, habit.currentValue + delta);
    const completed = newVal >= habit.targetValue;
    try {
      const updated = await api.updateWellnessHabit(habit.id, {
        currentValue: newVal,
        completed
      });
      setHabits(prev => prev.map(h => h.id === habit.id ? updated : h));
    } catch (e: any) {
      console.warn('Increment failed:', e);
    }
  };

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) return;

    try {
      const created = await api.addWellnessHabit({
        name: newHabitName.trim(),
        category: newCategory,
        targetValue: newTarget,
        unit: newUnit
      });
      setHabits(prev => [...prev, created]);
      setNewHabitName('');
      setShowAddForm(false);
    } catch (e: any) {
      alert('Failed to add habit: ' + e.message);
    }
  };

  const completedCount = habits.filter(h => h.completed).length;
  const progressPercent = habits.length > 0 ? Math.round((completedCount / habits.length) * 100) : 0;

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'water': return <Droplet className="w-5 h-5 text-blue-500" />;
      case 'sleep': return <Moon className="w-5 h-5 text-indigo-500" />;
      case 'activity': return <Footprints className="w-5 h-5 text-emerald-500" />;
      case 'meditation': return <Brain className="w-5 h-5 text-purple-500" />;
      default: return <CalendarCheck className="w-5 h-5 text-teal-500" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <DisclaimerBanner />

      {/* Daily Progress Banner */}
      <div className="bg-gradient-to-r from-[#07566A] to-[#0A6D86] text-white rounded-3xl p-6 md:p-8 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-200">Today's Consistency</span>
          <h3 className="text-2xl font-bold tracking-tight">
            {completedCount} of {habits.length} Habits Completed
          </h3>
          <p className="text-xs text-teal-100 max-w-md">
            Consistent hydration, restful sleep cycles, and moderate daily steps build long-term physiological resilience.
          </p>
        </div>

        <div className="w-full sm:w-64 space-y-2 shrink-0">
          <div className="flex items-center justify-between text-xs font-bold">
            <span>Daily Goal</span>
            <span className="font-mono text-teal-200">{progressPercent}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden p-0.5">
            <div
              className="bg-[#21C4B8] h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="text-[11px] text-teal-200 text-right">
            {progressPercent === 100 ? '🎉 All goals achieved!' : `${habits.length - completedCount} habits remaining`}
          </div>
        </div>
      </div>

      {/* Habits Header & Actions */}
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Active Daily Wellness Routines
        </h4>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-3.5 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-[#07566A] text-xs font-bold hover:bg-teal-100 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddForm ? 'Cancel' : 'Add Custom Habit'}</span>
        </button>
      </div>

      {/* Add Habit Form */}
      {showAddForm && (
        <form onSubmit={handleCreateHabit} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs grid grid-cols-1 md:grid-cols-4 gap-4 items-end animate-in fade-in">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Habit Name</label>
            <input
              type="text"
              value={newHabitName}
              onChange={e => setNewHabitName(e.target.value)}
              placeholder="e.g. 15 min Post-Dinner Walk"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0FAEAE]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Category</label>
            <select
              value={newCategory}
              onChange={e => setNewCategory(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0FAEAE]"
            >
              <option value="activity">Physical Activity</option>
              <option value="water">Hydration</option>
              <option value="sleep">Sleep Hygiene</option>
              <option value="meditation">Mindfulness</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Daily Target</label>
            <div className="flex gap-1.5">
              <input
                type="number"
                value={newTarget}
                onChange={e => setNewTarget(parseFloat(e.target.value) || 1)}
                className="w-20 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
              />
              <input
                type="text"
                value={newUnit}
                onChange={e => setNewUnit(e.target.value)}
                placeholder="unit (e.g. mins, steps)"
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#0FAEAE] hover:bg-[#21C4B8] text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Save Habit
            </button>
          </div>
        </form>
      )}

      {/* Habits Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {habits.map(habit => (
          <div
            key={habit.id}
            className={`rounded-2xl border p-5 transition-all flex items-start justify-between gap-4 ${
              habit.completed
                ? 'bg-emerald-50/40 border-emerald-200 shadow-xs'
                : 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
            }`}
          >
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 shrink-0">
                {getCategoryIcon(habit.category)}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className={`text-xs font-bold ${habit.completed ? 'text-emerald-950 line-through' : 'text-slate-900'}`}>
                    {habit.name}
                  </h4>
                  {habit.streakDays > 1 && (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-200">
                      <Flame className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>{habit.streakDays}d streak</span>
                    </span>
                  )}
                </div>

                <div className="text-xs text-slate-500 font-mono">
                  {habit.currentValue} / {habit.targetValue} {habit.unit}
                </div>

                {/* Progress Mini Bar */}
                <div className="w-44 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      habit.completed ? 'bg-emerald-500' : 'bg-[#0FAEAE]'
                    }`}
                    style={{
                      width: `${Math.min(100, Math.round((habit.currentValue / habit.targetValue) * 100))}%`
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 shrink-0">
              <button
                onClick={() => toggleHabit(habit)}
                className="cursor-pointer transition-transform active:scale-95"
                title={habit.completed ? 'Mark pending' : 'Mark completed'}
              >
                {habit.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 fill-emerald-100" />
                ) : (
                  <Circle className="w-6 h-6 text-slate-300 hover:text-[#0FAEAE]" />
                )}
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleIncrement(habit, -1)}
                  className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center cursor-pointer"
                >
                  -
                </button>
                <button
                  onClick={() => handleIncrement(habit, 1)}
                  className="w-5 h-5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Practical Lifestyle Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-600 flex items-start gap-3">
        <Info className="w-4 h-4 text-[#0FAEAE] shrink-0 mt-0.5" />
        <p>
          <strong>Wellness & Habit Architecture:</strong> Habits are stored scoped strictly to your authenticated anonymous guest session in the database. Lifestyle tracking encourages balanced daily routines; it does not constitute clinical therapy or psychological treatment.
        </p>
      </div>
    </div>
  );
};
