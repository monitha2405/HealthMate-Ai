import { describe, it, expect } from 'vitest';
import { executeTool } from '../server/services/tools';
import { generateBiomarkerNormalizationPlans } from '../server/services/biomarkerNutrition';

describe('Biometrics & Nutrition Tooling', () => {
  it('calculates BMI and category accurately', async () => {
    const res = await executeTool('calculateBMI', {
      weightKg: 60,
      heightCm: 165
    });

    expect(res.bmi).toBe(22.0);
    expect(res.category).toBe('Normal weight');
    expect(res.healthyWeightRangeKg).toContain('50.4');
  });

  it('calculates BMR and TDEE calorie requirements using Mifflin-St Jeor', async () => {
    const res = await executeTool('calculateNutritionTargets', {
      weightKg: 60,
      heightCm: 165,
      age: 25,
      gender: 'female',
      activityLevel: 'moderate',
      goal: 'maintenance'
    });

    // BMR = 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 -> 1345
    expect(res.bmr).toBe(1345);
    expect(res.tdee).toBe(Math.round(1345 * 1.55));
    expect(res.targetDailyCalories).toBe(res.tdee);
    expect(res.macronutrients.proteinGrams).toBeGreaterThan(0);
    expect(res.macronutrients.carbGrams).toBeGreaterThan(0);
    expect(res.macronutrients.fatGrams).toBeGreaterThan(0);
  });
});

describe('Biomarker Normalization Plans', () => {
  it('generates clinical normalization plans for out-of-range lab markers', async () => {
    const sampleAbnormalBiomarkers = [
      {
        name: 'Vitamin D (25-OH)',
        value: 28.5,
        unit: 'ng/mL',
        referenceRange: '30.0 - 100.0',
        status: 'abnormal_low'
      },
      {
        name: 'Vitamin B-12',
        value: 172,
        unit: 'pg/mL',
        referenceRange: '197 - 771',
        status: 'abnormal_low'
      },
      {
        name: 'LDL Cholesterol',
        value: 101,
        unit: 'mg/dL',
        referenceRange: '< 100',
        status: 'abnormal_high'
      },
      {
        name: 'Total Bilirubin',
        value: 1.31,
        unit: 'mg/dL',
        referenceRange: '0.3 - 1.2',
        status: 'abnormal_high'
      }
    ];

    const plans = await generateBiomarkerNormalizationPlans(sampleAbnormalBiomarkers);

    expect(plans).toHaveLength(4);

    // Vitamin D
    const vitD = plans.find(p => p.biomarkerName.includes('Vitamin D'));
    expect(vitD).toBeDefined();
    expect(vitD?.recommendedFoods.length).toBeGreaterThan(0);
    expect(vitD?.foodsToAvoid.length).toBeGreaterThan(0);
    expect(vitD?.lifestyleTip).toContain('sun');

    // Vitamin B12
    const vitB12 = plans.find(p => p.biomarkerName.includes('B-12'));
    expect(vitB12).toBeDefined();
    expect(vitB12?.recommendedFoods).toContain('Fresh curd (yogurt) and buttermilk (chaas)');

    // LDL Cholesterol
    const ldl = plans.find(p => p.biomarkerName.includes('LDL'));
    expect(ldl).toBeDefined();
    expect(ldl?.foodsToAvoid).toContain('Vanaspati, hydrogenated palm oils & commercial shortening');

    // Bilirubin
    const bili = plans.find(p => p.biomarkerName.includes('Bilirubin'));
    expect(bili).toBeDefined();
    expect(bili?.recommendedFoods).toContain('Abundant pure hydration (3 to 3.5 liters of clean water daily)');
  });
});
