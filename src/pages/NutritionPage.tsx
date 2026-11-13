import React, { useState, useEffect, useMemo } from 'react';
import {
  Utensils,
  Sparkles,
  ShieldCheck,
  Coffee,
  Sun,
  Moon,
  Apple,
  Loader2,
  AlertCircle,
  Activity,
  Heart,
  Scale,
  Flame,
  CheckCircle2,
  XCircle,
  FileText,
  HelpCircle,
  ChevronRight
} from 'lucide-react';
import { api } from '../lib/api';
import { DisclaimerBanner } from '../components/common/DisclaimerBanner';
import type { NutritionPreferences, DailyMealPlan, BiomarkerNutritionPlan } from '../types';

interface BiometricInputs {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: string;
  activityLevel: string;
}

export const NutritionPage: React.FC = () => {
  const [preferences, setPreferences] = useState<NutritionPreferences>({
    dietaryPreference: 'vegetarian',
    regionalCuisine: 'North Indian',
    allergies: [],
    foodExclusions: [],
    budgetLevel: 'moderate',
    healthGoal: 'maintenance'
  });

  const [biometrics, setBiometrics] = useState<BiometricInputs>({
    weightKg: 60,
    heightCm: 165,
    age: 25,
    gender: 'female',
    activityLevel: 'moderate'
  });

  const [biomarkerPlans, setBiomarkerPlans] = useState<BiomarkerNutritionPlan[]>([]);
  const [mealPlan, setMealPlan] = useState<DailyMealPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [newAllergy, setNewAllergy] = useState('');

  // Initial Data Loading
  useEffect(() => {
    async function loadNutritionData() {
      try {
        const [prefData, plan, abnormalList] = await Promise.all([
          api.getNutritionPreferences().catch(() => null),
          api.getMealPlan().catch(() => null),
          api.getBiomarkerPlans().catch(() => [])
        ]);

        if (prefData?.preferences) {
          setPreferences(prefData.preferences);
        }
        if (prefData?.biometrics) {
          setBiometrics(prev => ({
            ...prev,
            weightKg: prefData.biometrics.weightKg || prev.weightKg,
            heightCm: prefData.biometrics.heightCm || prev.heightCm,
            age: prefData.biometrics.age || prev.age,
            gender: prefData.biometrics.gender || prev.gender
          }));
        }

        if (plan) {
          setMealPlan(plan);
          if (plan.userBiometrics) {
            setBiometrics(prev => ({
              ...prev,
              weightKg: plan.userBiometrics?.weightKg || prev.weightKg,
              heightCm: plan.userBiometrics?.heightCm || prev.heightCm,
              age: plan.userBiometrics?.age || prev.age,
              gender: plan.userBiometrics?.gender || prev.gender
            }));
          }
          if (plan.biomarkerPlans && plan.biomarkerPlans.length > 0) {
            setBiomarkerPlans(plan.biomarkerPlans);
          }
        }

        if (abnormalList && abnormalList.length > 0) {
          setBiomarkerPlans(abnormalList);
        }
      } catch (e) {
        console.warn('Failed to load initial nutrition data:', e);
      } finally {
        setLoading(false);
      }
    }
    loadNutritionData();
  }, []);

  // Real-time client-side calculation of BMI, BMR, and Calorie Target
  const calculatedMetrics = useMemo(() => {
    const hM = biometrics.heightCm / 100;
    const bmi = hM > 0 ? parseFloat((biometrics.weightKg / (hM * hM)).toFixed(1)) : 0;

    let category = 'Normal weight';
    let categoryColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
    if (bmi < 18.5) {
      category = 'Underweight';
      categoryColor = 'text-amber-700 bg-amber-50 border-amber-200';
    } else if (bmi >= 25 && bmi < 30) {
      category = 'Overweight';
      categoryColor = 'text-orange-700 bg-orange-50 border-orange-200';
    } else if (bmi >= 30) {
      category = 'Obesity';
      categoryColor = 'text-rose-700 bg-rose-50 border-rose-200';
    }

    const minWeight = hM > 0 ? parseFloat((18.5 * hM * hM).toFixed(1)) : 0;
    const maxWeight = hM > 0 ? parseFloat((24.9 * hM * hM).toFixed(1)) : 0;

    // Mifflin-St Jeor Formula
    let bmr = 10 * biometrics.weightKg + 6.25 * biometrics.heightCm - 5 * biometrics.age;
    if (biometrics.gender.toLowerCase() === 'male') {
      bmr += 5;
    } else {
      bmr -= 161;
    }
    bmr = Math.max(1000, Math.round(bmr));

    const multipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725
    };
    const tdee = Math.round(bmr * (multipliers[biometrics.activityLevel] || 1.375));

    let targetCalories = tdee;
    if (preferences.healthGoal === 'weight_loss') targetCalories = Math.max(1200, Math.round(tdee - 450));
    else if (preferences.healthGoal === 'muscle_gain') targetCalories = Math.round(tdee + 350);
    else if (preferences.healthGoal === 'diabetic_friendly') targetCalories = Math.round(tdee - 200);

    return {
      bmi,
      category,
      categoryColor,
      minWeight,
      maxWeight,
      bmr,
      tdee,
      targetCalories,
      protein: Math.round((targetCalories * 0.25) / 4),
      carbs: Math.round((targetCalories * 0.50) / 4),
      fat: Math.round((targetCalories * 0.25) / 9)
    };
  }, [biometrics, preferences.healthGoal]);

  const handleGeneratePlan = async () => {
    setGenerating(true);
    try {
      const generated = await api.generateMealPlan(preferences, biometrics);
      setMealPlan(generated);
      if (generated.biomarkerPlans && generated.biomarkerPlans.length > 0) {
        setBiomarkerPlans(generated.biomarkerPlans);
      }
    } catch (e: any) {
      alert('Failed to generate meal plan: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const addAllergy = (allergy: string) => {
    if (!allergy.trim() || preferences.allergies.includes(allergy.trim())) return;
    setPreferences(p => ({ ...p, allergies: [...p.allergies, allergy.trim()] }));
    setNewAllergy('');
  };

  const removeAllergy = (allergy: string) => {
    setPreferences(p => ({ ...p, allergies: p.allergies.filter(a => a !== allergy) }));
  };

  const commonAllergens = ['Peanuts', 'Tree Nuts', 'Dairy', 'Gluten / Wheat', 'Soy', 'Shellfish', 'Eggs'];

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <DisclaimerBanner />

      {/* 1. User Biometrics & Energy Calculator Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-[#0FAEAE]" />
              <span>Biometric Assessment & Energy Target</span>
            </h3>
            <p className="text-xs text-slate-500">
              Deterministic BMI calculation and Mifflin-St Jeor metabolic calorie requirement
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Formula</span>
            <span className="px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 text-xs font-mono font-bold">
              Mifflin-St Jeor & WHO BMI
            </span>
          </div>
        </div>

        {/* Inputs & Live Calculation Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls (7 Cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Weight */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Weight (kg)</span>
                <span className="text-[#0FAEAE] font-mono">{biometrics.weightKg} kg</span>
              </label>
              <input
                type="number"
                min="30"
                max="250"
                step="0.5"
                value={biometrics.weightKg}
                onChange={e => setBiometrics(b => ({ ...b, weightKg: Number(e.target.value) || 0 }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-[#0FAEAE]"
              />
            </div>

            {/* Height */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Height (cm)</span>
                <span className="text-[#0FAEAE] font-mono">{biometrics.heightCm} cm</span>
              </label>
              <input
                type="number"
                min="100"
                max="240"
                step="1"
                value={biometrics.heightCm}
                onChange={e => setBiometrics(b => ({ ...b, heightCm: Number(e.target.value) || 0 }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-[#0FAEAE]"
              />
            </div>

            {/* Age & Gender */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Age (years)</label>
              <input
                type="number"
                min="10"
                max="110"
                value={biometrics.age}
                onChange={e => setBiometrics(b => ({ ...b, age: Number(e.target.value) || 0 }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:outline-hidden focus:ring-2 focus:ring-[#0FAEAE]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Biological Gender</label>
              <select
                value={biometrics.gender}
                onChange={e => setBiometrics(b => ({ ...b, gender: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0FAEAE]"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>

            {/* Physical Activity Level */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Physical Activity Factor</label>
              <select
                value={biometrics.activityLevel}
                onChange={e => setBiometrics(b => ({ ...b, activityLevel: e.target.value }))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0FAEAE]"
              >
                <option value="sedentary">Sedentary (desk job, minimal exercise - 1.2x)</option>
                <option value="light">Light Activity (light exercise 1-3 days/week - 1.375x)</option>
                <option value="moderate">Moderate Activity (moderate exercise 3-5 days/week - 1.55x)</option>
                <option value="active">Very Active (hard daily exercise or sports - 1.725x)</option>
              </select>
            </div>
          </div>

          {/* Real-time Computed Cards (5 Cols) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-50 to-teal-50/40 rounded-2xl border border-teal-100 p-5 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-teal-600" />
                  <span>Calculated Body Mass Index</span>
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${calculatedMetrics.categoryColor}`}>
                  {calculatedMetrics.category}
                </span>
              </div>

              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                  {calculatedMetrics.bmi}
                </div>
                <div className="text-xs text-slate-500 font-medium">kg/m²</div>
              </div>

              <div className="text-xs text-slate-600 bg-white/80 rounded-xl p-2.5 border border-slate-200/60">
                <span className="font-semibold text-slate-800">Healthy Weight Range: </span>
                <span className="font-mono text-teal-700 font-bold">
                  {calculatedMetrics.minWeight} – {calculatedMetrics.maxWeight} kg
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-teal-100/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>Basal Metabolic Rate (BMR):</span>
                </span>
                <span className="font-bold text-slate-800 font-mono">{calculatedMetrics.bmr} kcal</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">TDEE Equilibrium:</span>
                <span className="font-bold text-slate-800 font-mono">{calculatedMetrics.tdee} kcal</span>
              </div>

              <div className="bg-[#07566A] text-white rounded-xl p-3 flex items-center justify-between shadow-xs">
                <div>
                  <div className="text-[10px] text-teal-200 uppercase tracking-wider font-semibold">Recommended Daily Intake</div>
                  <div className="text-xl font-extrabold font-mono mt-0.5">{calculatedMetrics.targetCalories} kcal/day</div>
                </div>
                <div className="text-right text-[11px] text-teal-100">
                  <div>P: ~{calculatedMetrics.protein}g</div>
                  <div>C: ~{calculatedMetrics.carbs}g | F: ~{calculatedMetrics.fat}g</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Biomarker Normalization Plans (from Uploaded Lab Reports) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" />
              <span>Biomarker Normalization Plans (from Uploaded Lab Reports)</span>
            </h3>
            <p className="text-xs text-slate-500">
              Evidence-based clinical dietary recommendations formulated for detected out-of-range biomarkers
            </p>
          </div>

          {biomarkerPlans.length > 0 && (
            <span className="px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-1.5 self-start sm:self-auto">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{biomarkerPlans.length} Out-of-Range Biomarkers Detected</span>
            </span>
          )}
        </div>

        {biomarkerPlans.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {biomarkerPlans.map((plan, idx) => {
              const isLow = plan.status === 'abnormal_low';
              return (
                <div
                  key={idx}
                  className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3.5 hover:border-teal-300 transition-colors"
                >
                  {/* Biomarker Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">{plan.biomarkerName}</h4>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-sm font-extrabold font-mono text-slate-900">
                          {plan.observedValue}
                        </span>
                        <span className="text-[11px] text-slate-500 font-medium">{plan.unit}</span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        isLow
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-rose-50 text-rose-800 border-rose-200'
                      }`}
                    >
                      {isLow ? 'Low' : 'Elevated'}
                    </span>
                  </div>

                  {plan.referenceRange && (
                    <div className="text-[11px] text-slate-500 bg-white rounded-lg px-2.5 py-1 border border-slate-200/80 font-mono">
                      Reference: {plan.referenceRange}
                    </div>
                  )}

                  {/* Clinical Impact */}
                  <p className="text-[11px] text-slate-600 leading-relaxed bg-white/70 rounded-xl p-2.5 border border-slate-200/60">
                    {plan.clinicalImpact}
                  </p>

                  {/* Target Foods */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Target Foods to Include:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.recommendedFoods.slice(0, 4).map((food, fIdx) => (
                        <span
                          key={fIdx}
                          className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-medium"
                        >
                          {food}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Foods to Avoid */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-bold text-rose-800 flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Foods to Limit / Restrict:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {plan.foodsToAvoid.slice(0, 3).map((food, fIdx) => (
                        <span
                          key={fIdx}
                          className="px-2 py-0.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-medium"
                        >
                          {food}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Lifestyle Tip */}
                  {plan.lifestyleTip && (
                    <div className="text-[10px] text-teal-900 bg-teal-50/70 rounded-xl p-2.5 border border-teal-200/60 leading-relaxed">
                      <span className="font-bold">Action Tip: </span>
                      {plan.lifestyleTip}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center space-y-2">
            <FileText className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-xs font-bold text-slate-800">No Out-of-Range Biomarkers Active</h4>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              Upload diagnostic lab reports (blood tests, vitamin panels, lipid profiles, metabolic reports) in the{' '}
              <span className="font-semibold text-slate-700">Health Documents</span> section. HealthMate AI will automatically detect abnormal values and design targeted normalization plans.
            </p>
          </div>
        )}
      </div>

      {/* 3. Preferences Configuration Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Utensils className="w-5 h-5 text-[#0FAEAE]" />
              <span>Dietary Preferences & Goal Setting</span>
            </h3>
            <p className="text-xs text-slate-500">Configure regional cuisine style and strict allergy exclusions</p>
          </div>

          <button
            onClick={handleGeneratePlan}
            disabled={generating}
            className="px-5 py-2.5 rounded-xl bg-[#0FAEAE] hover:bg-[#21C4B8] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Formulating Clinical Plan...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Tailored Plan ({calculatedMetrics.targetCalories} kcal)</span>
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Diet Type */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Diet Type</label>
            <select
              value={preferences.dietaryPreference}
              onChange={e => setPreferences(p => ({ ...p, dietaryPreference: e.target.value as any }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0FAEAE]"
            >
              <option value="vegetarian">Vegetarian (Lacto-vegetarian)</option>
              <option value="non-vegetarian">Non-Vegetarian</option>
              <option value="vegan">Vegan (100% Plant-based)</option>
              <option value="eggetarian">Eggetarian</option>
              <option value="jain">Jain Vegetarian (No root vegetables)</option>
            </select>
          </div>

          {/* Regional Indian Cuisine */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Regional Cuisine Style</label>
            <select
              value={preferences.regionalCuisine || 'North Indian'}
              onChange={e => setPreferences(p => ({ ...p, regionalCuisine: e.target.value }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0FAEAE]"
            >
              <option value="North Indian">North Indian (Rotis, Dals, Paneer, Sabzis)</option>
              <option value="South Indian">South Indian (Idli, Dosa, Sambar, Rasam, Rice)</option>
              <option value="Maharashtrian">Maharashtrian (Bhakhri, Usal, Pithla, Dal)</option>
              <option value="Gujarati">Gujarati (Khichdi, Thepla, Kadhi, Shaak)</option>
              <option value="Bengali">Bengali (Rice, Dal, Shukto, Fish/Paneer)</option>
              <option value="Continental Balanced">Continental / Global Balanced</option>
            </select>
          </div>

          {/* Health Goal */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">Health Objective</label>
            <select
              value={preferences.healthGoal}
              onChange={e => setPreferences(p => ({ ...p, healthGoal: e.target.value as any }))}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#0FAEAE]"
            >
              <option value="maintenance">Balanced Maintenance (TDEE equilibrium)</option>
              <option value="weight_loss">Healthy Weight Loss (~450 kcal deficit)</option>
              <option value="muscle_gain">Lean Muscle Growth (+350 kcal surplus)</option>
              <option value="diabetic_friendly">Diabetic-Friendly (Low Glycemic Index)</option>
              <option value="heart_healthy">Cardiovascular Heart-Healthy (Low Sodium & Saturated Fat)</option>
            </select>
          </div>
        </div>

        {/* Allergy Safeguards Section */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Strict Allergy Restrictions (Never recommended in meals)</span>
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            {commonAllergens.map(allergen => {
              const selected = preferences.allergies.includes(allergen);
              return (
                <button
                  key={allergen}
                  type="button"
                  onClick={() => selected ? removeAllergy(allergen) : addAllergy(allergen)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    selected
                      ? 'bg-rose-50 border-rose-300 text-rose-700 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {selected ? `✕ ${allergen}` : `+ ${allergen}`}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Generated Meal Plan Display */}
      {mealPlan ? (
        <div className="space-y-6">
          {/* Daily Macros Target Banner */}
          <div className="bg-gradient-to-r from-[#07566A] to-[#0A6D86] text-white rounded-2xl p-6 shadow-xs flex flex-wrap items-center justify-between gap-6">
            <div>
              <div className="text-xs font-semibold text-teal-200 uppercase tracking-wider">
                Tailored Energy Target
              </div>
              <div className="text-3xl font-extrabold tracking-tight mt-0.5">
                {mealPlan.totalCalories} <span className="text-sm font-medium text-teal-200">kcal/day</span>
              </div>
              <p className="text-xs text-teal-100 mt-1">
                Calibrated to your calculated BMI of{' '}
                <span className="font-bold underline decoration-teal-300">
                  {mealPlan.userBiometrics?.bmi || calculatedMetrics.bmi} ({mealPlan.userBiometrics?.bmiCategory || calculatedMetrics.category})
                </span>
                {biomarkerPlans.length > 0 && ` and ${biomarkerPlans.length} lab biomarker normalization targets`}
              </p>
            </div>

            <div className="flex items-center gap-4 text-center">
              <div className="bg-white/10 rounded-xl px-4 py-2 border border-white/10">
                <div className="text-base font-bold text-white">{mealPlan.totalProtein}g</div>
                <div className="text-[11px] text-teal-200">Protein (25%)</div>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-2 border border-white/10">
                <div className="text-base font-bold text-white">{mealPlan.totalCarbs}g</div>
                <div className="text-[11px] text-teal-200">Carbs (50%)</div>
              </div>
              <div className="bg-white/10 rounded-xl px-4 py-2 border border-white/10">
                <div className="text-base font-bold text-white">{mealPlan.totalFat}g</div>
                <div className="text-[11px] text-teal-200">Healthy Fats (25%)</div>
              </div>
            </div>
          </div>

          {/* 4 Meals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Breakfast */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <Coffee className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Breakfast</h4>
                </div>
              </div>

              <div className="space-y-2.5">
                {mealPlan.breakfast.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>{item.name}</span>
                      <span className="text-teal-700 font-mono text-[11px]">{item.calories} kcal</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">Portion: {item.portion}</div>
                    <div className="text-[11px] text-slate-600 font-mono">
                      P: {item.protein}g | C: {item.carbs}g | F: {item.fat}g
                    </div>
                    {item.substitutions && item.substitutions.length > 0 && (
                      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                        <span className="font-semibold text-slate-700">Substitutions: </span>
                        {item.substitutions.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Lunch */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                    <Sun className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Lunch</h4>
                </div>
              </div>

              <div className="space-y-2.5">
                {mealPlan.lunch.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>{item.name}</span>
                      <span className="text-teal-700 font-mono text-[11px]">{item.calories} kcal</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">Portion: {item.portion}</div>
                    <div className="text-[11px] text-slate-600 font-mono">
                      P: {item.protein}g | C: {item.carbs}g | F: {item.fat}g
                    </div>
                    {item.substitutions && item.substitutions.length > 0 && (
                      <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                        <span className="font-semibold text-slate-700">Substitutions: </span>
                        {item.substitutions.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Healthy Snacks */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <Apple className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Healthy Snacks</h4>
                </div>
              </div>

              <div className="space-y-2.5">
                {mealPlan.snacks.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>{item.name}</span>
                      <span className="text-teal-700 font-mono text-[11px]">{item.calories} kcal</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">Portion: {item.portion}</div>
                    <div className="text-[11px] text-slate-600 font-mono">
                      P: {item.protein}g | C: {item.carbs}g | F: {item.fat}g
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dinner */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                    <Moon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Dinner</h4>
                </div>
              </div>

              <div className="space-y-2.5">
                {mealPlan.dinner.map((item, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-3 text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-slate-800">
                      <span>{item.name}</span>
                      <span className="text-teal-700 font-mono text-[11px]">{item.calories} kcal</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">Portion: {item.portion}</div>
                    <div className="text-[11px] text-slate-600 font-mono">
                      P: {item.protein}g | C: {item.carbs}g | F: {item.fat}g
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Clinical Guidelines & Hydration Footer */}
          {mealPlan.guidelines && mealPlan.guidelines.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0FAEAE]" />
                <span>Clinical Nutrition Guidelines & Lifestyle Recommendations</span>
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 pt-1">
                {mealPlan.guidelines.map((g, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                    <ChevronRight className="w-3.5 h-3.5 text-[#0FAEAE] shrink-0 mt-0.5" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center space-y-3">
          <Utensils className="w-10 h-10 text-slate-300 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800">No Meal Plan Generated Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click "Generate Tailored Plan" above to create an energy-calibrated, allergy-safe meal plan tailored to your BMI ({calculatedMetrics.bmi}) and lab biomarkers.
          </p>
          <button
            onClick={handleGeneratePlan}
            className="px-5 py-2.5 rounded-xl bg-[#0FAEAE] text-white text-xs font-bold hover:bg-[#21C4B8] transition-colors cursor-pointer shadow-xs"
          >
            Generate Meal Plan ({calculatedMetrics.targetCalories} kcal)
          </button>
        </div>
      )}
    </div>
  );
};
