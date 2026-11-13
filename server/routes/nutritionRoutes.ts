import { Router } from 'express';
import crypto from 'crypto';
import { query } from '../db/pool';
import { requireGuestSession } from '../middleware/session';
import { executeTool } from '../services/tools';
import { isGeminiAvailable, generateText } from '../services/gemini';
import { generateBiomarkerNormalizationPlans } from '../services/biomarkerNutrition';
import type { NutritionPreferences, DailyMealPlan, BiomarkerNutritionPlan, UserBiometricSummary } from '../../src/types';

const router = Router();

// GET /api/nutrition/preferences
router.get('/preferences', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;

  try {
    const [prefRes, profileRes] = await Promise.all([
      query('SELECT * FROM nutrition_preferences WHERE guest_id = $1', [guestId]),
      query('SELECT * FROM health_profiles WHERE guest_id = $1', [guestId])
    ]);

    const prefRow = prefRes.rows[0];
    const profileRow = profileRes.rows[0];

    const preferences: NutritionPreferences = {
      dietaryPreference: prefRow?.dietary_preference || profileRow?.dietary_preference || 'vegetarian',
      regionalCuisine: prefRow?.regional_cuisine || 'North Indian',
      budgetLevel: prefRow?.budget_level || 'moderate',
      healthGoal: prefRow?.health_goal || 'maintenance',
      allergies: prefRow?.allergies || profileRow?.allergies || [],
      foodExclusions: prefRow?.food_exclusions || []
    };

    const biometrics = profileRow ? {
      weightKg: profileRow.weight_kg ? Number(profileRow.weight_kg) : 60,
      heightCm: profileRow.height_cm ? Number(profileRow.height_cm) : 165,
      age: profileRow.age ? Number(profileRow.age) : 25,
      gender: profileRow.gender || 'female'
    } : {
      weightKg: 60,
      heightCm: 165,
      age: 25,
      gender: 'female'
    };

    res.json({ preferences, biometrics });
  } catch (error: any) {
    console.error('Failed to get nutrition preferences:', error);
    res.status(500).json({ error: 'Failed to retrieve preferences', details: error.message });
  }
});

// GET /api/nutrition/biomarker-plans - Returns normalization plans for all out-of-range lab results
router.get('/biomarker-plans', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;

  try {
    const valRes = await query(
      `SELECT name, value, unit, reference_range, status 
       FROM extracted_health_values 
       WHERE guest_id = $1 AND status != 'normal' 
       ORDER BY id DESC`,
      [guestId]
    );

    const biomarkerPlans: BiomarkerNutritionPlan[] = await generateBiomarkerNormalizationPlans(
      valRes.rows.map(r => ({
        name: r.name,
        value: Number(r.value),
        unit: r.unit,
        referenceRange: r.reference_range,
        status: r.status
      }))
    );

    res.json({ biomarkerPlans, totalAbnormal: biomarkerPlans.length });
  } catch (error: any) {
    console.error('Failed to fetch biomarker plans:', error);
    res.status(500).json({ error: 'Failed to compute biomarker plans', details: error.message });
  }
});

// GET /api/nutrition/mealplan
router.get('/mealplan', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;

  try {
    const result = await query(
      'SELECT * FROM meal_plans WHERE guest_id = $1 ORDER BY created_at DESC LIMIT 1',
      [guestId]
    );

    if (result.rows.length === 0) {
      return res.json({ mealPlan: null });
    }

    const row = result.rows[0];
    const mealPlan: DailyMealPlan = typeof row.plan_data_json === 'string'
      ? JSON.parse(row.plan_data_json)
      : row.plan_data_json;

    // If existing meal plan doesn't have biomarkerPlans, refresh them dynamically
    if (!mealPlan.biomarkerPlans || mealPlan.biomarkerPlans.length === 0) {
      const valRes = await query(
        `SELECT name, value, unit, reference_range, status 
         FROM extracted_health_values 
         WHERE guest_id = $1 AND status != 'normal' 
         ORDER BY id DESC`,
        [guestId]
      );
      if (valRes.rows.length > 0) {
        mealPlan.biomarkerPlans = await generateBiomarkerNormalizationPlans(
          valRes.rows.map(r => ({
            name: r.name,
            value: Number(r.value),
            unit: r.unit,
            referenceRange: r.reference_range,
            status: r.status
          }))
        );
      }
    }

    res.json({ mealPlan });
  } catch (error: any) {
    console.error('Failed to get meal plan:', error);
    res.status(500).json({ error: 'Failed to retrieve meal plan', details: error.message });
  }
});

// POST /api/nutrition/generate
router.post('/generate', requireGuestSession, async (req, res) => {
  const guestId = req.guest!.id;
  const preferences: NutritionPreferences = req.body.preferences || {
    dietaryPreference: 'vegetarian',
    regionalCuisine: 'North Indian',
    allergies: [],
    foodExclusions: [],
    budgetLevel: 'moderate',
    healthGoal: 'maintenance'
  };

  const reqBiometrics = req.body.biometrics;

  try {
    // 1. Fetch or update health profile for biometrics
    const profileRes = await query('SELECT * FROM health_profiles WHERE guest_id = $1', [guestId]);
    const existingProfile = profileRes.rows[0];

    const weightKg = Number(reqBiometrics?.weightKg || existingProfile?.weight_kg || 60);
    const heightCm = Number(reqBiometrics?.heightCm || existingProfile?.height_cm || 165);
    const age = Number(reqBiometrics?.age || existingProfile?.age || 25);
    const gender = String(reqBiometrics?.gender || existingProfile?.gender || 'female');
    const activityLevel = String(reqBiometrics?.activityLevel || 'moderate');

    // Update profile with newest biometric readings
    await query(
      `INSERT INTO health_profiles (
        id, guest_id, display_name, age, gender, height_cm, weight_kg, dietary_preference, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (guest_id) DO UPDATE SET
        age = COALESCE(EXCLUDED.age, health_profiles.age),
        gender = COALESCE(EXCLUDED.gender, health_profiles.gender),
        height_cm = COALESCE(EXCLUDED.height_cm, health_profiles.height_cm),
        weight_kg = COALESCE(EXCLUDED.weight_kg, health_profiles.weight_kg),
        dietary_preference = COALESCE(EXCLUDED.dietary_preference, health_profiles.dietary_preference),
        updated_at = NOW()`,
      [
        crypto.randomUUID(),
        guestId,
        req.guest!.displayName || 'Guest User',
        age,
        gender,
        heightCm,
        weightKg,
        preferences.dietaryPreference
      ]
    );

    // 2. Deterministic BMI and Calorie Targets calculation
    const bmiResult = await executeTool('calculateBMI', { weightKg, heightCm });
    const calorieCalc = await executeTool('calculateNutritionTargets', {
      weightKg,
      heightCm,
      age,
      gender,
      activityLevel,
      goal: preferences.healthGoal || 'maintenance'
    });

    const calories = calorieCalc.targetDailyCalories;
    const protein = calorieCalc.macronutrients.proteinGrams;
    const carbs = calorieCalc.macronutrients.carbGrams;
    const fat = calorieCalc.macronutrients.fatGrams;

    const userBiometrics: UserBiometricSummary = {
      heightCm,
      weightKg,
      age,
      gender,
      bmi: bmiResult.bmi,
      bmiCategory: bmiResult.category,
      healthyWeightRange: bmiResult.healthyWeightRangeKg,
      bmr: calorieCalc.bmr,
      tdee: calorieCalc.tdee,
      targetDailyCalories: calories
    };

    // 3. Query all out-of-range biomarkers from uploaded lab documents
    const valRes = await query(
      `SELECT name, value, unit, reference_range, status 
       FROM extracted_health_values 
       WHERE guest_id = $1 AND status != 'normal' 
       ORDER BY id DESC`,
      [guestId]
    );

    const biomarkerPlans: BiomarkerNutritionPlan[] = await generateBiomarkerNormalizationPlans(
      valRes.rows.map(r => ({
        name: r.name,
        value: Number(r.value),
        unit: r.unit,
        referenceRange: r.reference_range,
        status: r.status
      }))
    );

    // Compile normalization guidelines for meal generation
    const therapeuticFoods = Array.from(new Set(biomarkerPlans.flatMap(bp => bp.recommendedFoods))).slice(0, 8);
    const therapeuticAvoid = Array.from(new Set(biomarkerPlans.flatMap(bp => bp.foodsToAvoid))).slice(0, 6);

    let mealPlan: DailyMealPlan;

    if (isGeminiAvailable()) {
      try {
        const abnormalContext = biomarkerPlans.length > 0
          ? `\nOUT-OF-RANGE LAB BIOMARKERS DETECTED (MUST TARGET THESE IN MEALS):
${biomarkerPlans.map(bp => `- ${bp.biomarkerName}: ${bp.observedValue} ${bp.unit} (${bp.status}) -> Target foods: ${bp.recommendedFoods.slice(0, 3).join(', ')} | Avoid: ${bp.foodsToAvoid.slice(0, 2).join(', ')}`).join('\n')}
Priority Therapeutic Foods to integrate into recipes: ${therapeuticFoods.join(', ')}
Foods to restrict due to lab values: ${therapeuticAvoid.join(', ')}`
          : '';

        const prompt = `Generate a personalized, culturally authentic 1-day meal plan in JSON format based on:
User Biometrics: Weight: ${weightKg}kg, Height: ${heightCm}cm, Age: ${age}, Gender: ${gender}, BMI: ${bmiResult.bmi} (${bmiResult.category})
Dietary preference: ${preferences.dietaryPreference}
Regional cuisine: ${preferences.regionalCuisine}
Strict Allergies to avoid: ${preferences.allergies.join(', ') || 'None'}
Excluded foods: ${preferences.foodExclusions.join(', ') || 'None'}
Budget level: ${preferences.budgetLevel}
Health Goal: ${preferences.healthGoal}
Deterministic Target Daily Calories: ${calories} kcal
Target Macros: Protein: ${protein}g, Carbs: ${carbs}g, Fat: ${fat}g
${abnormalContext}

CRITICAL: 
1. Breakfast, lunch, dinner, and snacks combined MUST approximately total ${calories} kcal (+/- 50 kcal).
2. Explicitly include therapeutic ingredients that help normalize the out-of-range biomarkers.
3. Every meal item should list healthy substitutions.

Respond with ONLY raw JSON matching this schema:
{
  "breakfast": [{"name": "string", "portion": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "substitutions": ["string"]}],
  "lunch": [{"name": "string", "portion": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "substitutions": ["string"]}],
  "dinner": [{"name": "string", "portion": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "substitutions": ["string"]}],
  "snacks": [{"name": "string", "portion": "string", "calories": number, "protein": number, "carbs": number, "fat": number, "substitutions": ["string"]}],
  "totalCalories": ${calories},
  "totalProtein": ${protein},
  "totalCarbs": ${carbs},
  "totalFat": ${fat},
  "guidelines": ["string", "string", "string"]
}`;

        const aiRes = await generateText({ prompt, temperature: 0.3 });
        const cleanedJson = aiRes.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        mealPlan = JSON.parse(cleanedJson);
      } catch (aiErr) {
        console.warn('Gemini meal plan generation fallback:', aiErr);
        mealPlan = createFallbackMealPlan(preferences, calories, protein, carbs, fat, biomarkerPlans);
      }
    } else {
      mealPlan = createFallbackMealPlan(preferences, calories, protein, carbs, fat, biomarkerPlans);
    }

    // Attach biometrics and normalization plans
    mealPlan.userBiometrics = userBiometrics;
    mealPlan.biomarkerPlans = biomarkerPlans;

    // 4. Persist preferences into nutrition_preferences table
    await query(
      `INSERT INTO nutrition_preferences (
        id, guest_id, dietary_preference, regional_cuisine, budget_level, health_goal,
        target_daily_calories, allergies, food_exclusions, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (guest_id) DO UPDATE SET
        dietary_preference = EXCLUDED.dietary_preference,
        regional_cuisine = EXCLUDED.regional_cuisine,
        budget_level = EXCLUDED.budget_level,
        health_goal = EXCLUDED.health_goal,
        target_daily_calories = EXCLUDED.target_daily_calories,
        allergies = EXCLUDED.allergies,
        food_exclusions = EXCLUDED.food_exclusions,
        updated_at = NOW()`,
      [
        crypto.randomUUID(),
        guestId,
        preferences.dietaryPreference,
        preferences.regionalCuisine,
        preferences.budgetLevel,
        preferences.healthGoal,
        calories,
        JSON.stringify(preferences.allergies),
        JSON.stringify(preferences.foodExclusions)
      ]
    );

    // 5. Persist generated plan into meal_plans table
    const planId = crypto.randomUUID();
    await query(
      `INSERT INTO meal_plans (
        id, guest_id, title, total_calories, total_protein, total_carbs, total_fat,
        guidelines, plan_data_json, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        planId,
        guestId,
        `Meal Plan (${preferences.dietaryPreference} - ${calories} kcal)`,
        mealPlan.totalCalories,
        mealPlan.totalProtein,
        mealPlan.totalCarbs,
        mealPlan.totalFat,
        JSON.stringify(mealPlan.guidelines),
        JSON.stringify(mealPlan)
      ]
    );

    res.json({ mealPlan, preferences, userBiometrics, biomarkerPlans });
  } catch (error: any) {
    console.error('Failed to generate meal plan:', error);
    res.status(500).json({ error: 'Failed to generate meal plan', details: error.message });
  }
});

function createFallbackMealPlan(
  prefs: NutritionPreferences,
  totalCal: number,
  protein: number,
  carbs: number,
  fat: number,
  biomarkerPlans: BiomarkerNutritionPlan[] = []
): DailyMealPlan {
  const isVeg = prefs.dietaryPreference === 'vegetarian' || prefs.dietaryPreference === 'jain';

  const breakfastCal = Math.round(totalCal * 0.25);
  const lunchCal = Math.round(totalCal * 0.35);
  const dinnerCal = Math.round(totalCal * 0.28);
  const snackCal = totalCal - breakfastCal - lunchCal - dinnerCal;

  const guidelines = [
    `Energy target of ~${totalCal} kcal/day aligned with your BMI and metabolic requirements.`,
    'Maintain adequate hydration (2.5 to 3.5 liters of clean water throughout the day).',
    'Consume dinner at least 2.5 hours before sleep to support optimal metabolic digestion.'
  ];

  if (biomarkerPlans.length > 0) {
    const names = biomarkerPlans.map(b => b.biomarkerName).join(', ');
    guidelines.push(`Biomarker normalization active: Meals integrate therapeutic ingredients targeting ${names}.`);
  }

  return {
    breakfast: [
      {
        name: isVeg ? 'Sprouted Moong & Spinach Chilla with Mint-Curd Chutney' : 'Boiled Eggs with Multigrain Toast & Avocado',
        portion: '2 chillas (approx 160g)',
        calories: breakfastCal,
        protein: Math.round(protein * 0.25),
        carbs: Math.round(carbs * 0.25),
        fat: Math.round(fat * 0.25),
        substitutions: ['Steel-cut oats with chia seeds & almonds', 'Besan chilla with grated vegetables']
      }
    ],
    lunch: [
      {
        name: 'Whole Grain Phulkas / Jowar Rotis with Yellow Dal & Palak Paneer',
        portion: '2 rotis + 1 cup dal + 1 cup sabzi',
        calories: Math.round(lunchCal * 0.8),
        protein: Math.round(protein * 0.35),
        carbs: Math.round(carbs * 0.35),
        fat: Math.round(fat * 0.35),
        substitutions: ['Brown rice with mixed bean rajma', 'Tofu bhurji with bell peppers and roti']
      },
      {
        name: 'Cucumber, Beetroot & Carrot Kachumber with Roasted Jeera Curd',
        portion: '1 medium bowl (150g)',
        calories: Math.round(lunchCal * 0.2),
        protein: 5,
        carbs: 12,
        fat: 3,
        substitutions: ['Sprouted methi raita', 'Fresh flaxseed spiced buttermilk']
      }
    ],
    dinner: [
      {
        name: 'Light Yellow Moong Dal Khichdi with Steamed Lauki (Bottle Gourd)',
        portion: '1.5 cups',
        calories: dinnerCal,
        protein: Math.round(protein * 0.28),
        carbs: Math.round(carbs * 0.28),
        fat: Math.round(fat * 0.28),
        substitutions: ['Vegetable daliya porridge', 'Quinoa vegetable pulao with cucumber raita']
      }
    ],
    snacks: [
      {
        name: 'Roasted Makhana (Foxnuts) with Turmeric & Walnuts',
        portion: '1 bowl (40g)',
        calories: snackCal,
        protein: Math.round(protein * 0.12),
        carbs: Math.round(carbs * 0.12),
        fat: Math.round(fat * 0.12),
        substitutions: ['Roasted chana (chickpeas)', 'Fresh tender coconut water with an apple']
      }
    ],
    totalCalories: totalCal,
    totalProtein: protein,
    totalCarbs: carbs,
    totalFat: fat,
    guidelines
  };
}

export default router;
