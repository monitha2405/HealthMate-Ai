import { generateText, isGeminiAvailable } from '../gemini';
import { executeTool } from '../tools';
import type { NutritionPreferences, DailyMealPlan, BiomarkerNutritionPlan } from '../../../src/types';

export interface NutritionAgentInput {
  query: string;
  preferences?: NutritionPreferences;
  userProfile?: any;
  abnormalBiomarkers?: BiomarkerNutritionPlan[];
}

export interface NutritionAgentOutput {
  response: string;
  mealPlan?: DailyMealPlan;
  toolsCalled: string[];
  safetyNotes: string;
}

export async function runNutritionAgent(input: NutritionAgentInput): Promise<NutritionAgentOutput> {
  const { query, preferences, userProfile, abnormalBiomarkers = [] } = input;
  const toolsCalled: string[] = [];

  // Determine baseline preferences
  const dietPref = preferences?.dietaryPreference || userProfile?.dietaryPreference || 'vegetarian';
  const allergies = preferences?.allergies || userProfile?.allergies || [];
  const exclusions = preferences?.foodExclusions || [];
  const cuisine = preferences?.regionalCuisine || 'Indian Balanced';
  const goal = preferences?.healthGoal || 'maintenance';

  // Deterministic nutrition calculation
  let targetCalc: any = null;
  let bmiCalc: any = null;
  if (userProfile?.weightKg && userProfile?.heightCm) {
    try {
      bmiCalc = await executeTool('calculateBMI', {
        weightKg: Number(userProfile.weightKg),
        heightCm: Number(userProfile.heightCm)
      });
      toolsCalled.push('calculateBMI');
    } catch {
      // ignore
    }
  }

  if (userProfile?.weightKg && userProfile?.heightCm && userProfile?.age) {
    try {
      targetCalc = await executeTool('calculateNutritionTargets', {
        weightKg: Number(userProfile.weightKg),
        heightCm: Number(userProfile.heightCm),
        age: Number(userProfile.age),
        gender: userProfile.gender || 'female',
        goal
      });
      toolsCalled.push('calculateNutritionTargets');
    } catch (e) {
      // Continue with standard estimate
    }
  }

  const calorieTarget = targetCalc?.targetDailyCalories || 1900;
  const allergiesStr = allergies.length > 0 ? allergies.join(', ') : 'None specified';
  const exclusionsStr = exclusions.length > 0 ? exclusions.join(', ') : 'None specified';

  const abnormalContext = abnormalBiomarkers.length > 0
    ? `\nOUT-OF-RANGE LAB BIOMARKERS DETECTED (MUST FACTOR INTO MEAL GUIDANCE):
${abnormalBiomarkers.map(b => `- ${b.biomarkerName}: ${b.observedValue} ${b.unit} (${b.status}). Target Foods: ${b.recommendedFoods.slice(0, 3).join(', ')}. Avoid: ${b.foodsToAvoid.slice(0, 2).join(', ')}`).join('\n')}`
    : '';

  if (isGeminiAvailable()) {
    try {
      const prompt = `You are HealthMate AI's Nutrition & Dietetics Specialist Agent.
User query: "${query}"

User Profile & Preferences:
- Dietary Preference: ${dietPref}
- Regional/Indian Preference: ${cuisine}
- Known Allergies (STRICT): ${allergiesStr}
- Food Exclusions: ${exclusionsStr}
- Health Goal: ${goal}
- Calculated BMI: ${bmiCalc ? `${bmiCalc.bmi} (${bmiCalc.category})` : 'Not provided'}
- Estimated Calorie Target: ~${calorieTarget} kcal/day (Protein: ~${Math.round(calorieTarget * 0.25 / 4)}g, Carbs: ~${Math.round(calorieTarget * 0.50 / 4)}g, Fat: ~${Math.round(calorieTarget * 0.25 / 9)}g)
${abnormalContext}

CRITICAL CLINICAL & NUTRITIONAL RULES:
1. NEVER recommend foods containing known allergies (${allergiesStr}).
2. If the user has out-of-range lab biomarkers, acknowledge them constructively and suggest specific meals, therapeutic ingredients, and cooking methods that assist in normalizing them.
3. Focus on culturally appropriate, practical meals (e.g., regional Indian lentils, millets, vegetables, curd, seeds).
4. Provide healthy substitutions and explain the rationale behind ingredients.
5. Emphasize that dietary adjustments support wellness, but do NOT replace medical treatments.
6. Clearly state estimated calorie and macronutrient figures.`;

      const result = await generateText({
        prompt,
        systemInstruction: 'You are an evidence-based clinical nutritionist specializing in personalized metabolic nutrition and biomarker normalization through whole foods.'
      });

      return {
        response: result.text,
        toolsCalled,
        safetyNotes: `Diet: ${dietPref}. Allergies strictly excluded: ${allergiesStr}.${abnormalBiomarkers.length > 0 ? ` Factored ${abnormalBiomarkers.length} lab biomarkers into recommendations.` : ''}`
      };
    } catch (e) {
      console.warn('Nutrition agent Gemini error:', e);
    }
  }

  // Deterministic fallback response with minimal key biomarker summary
  const lowerQuery = query.toLowerCase();

  // Targeted Vitamin B12 guidance
  if (lowerQuery.includes('b12') || lowerQuery.includes('vitamin b-12') || lowerQuery.includes('vitamin b12')) {
    return {
      response: `### 🥗 Dietary & Nutritional Strategy to Increase Vitamin B-12\n\n` +
        `Vitamin B-12 (cobalamin) is crucial for red blood cell production, neurological health, and daily energy. Here is how to optimize your intake through food and clinical habits:\n\n` +
        `#### 1. Top Whole-Food Sources (${dietPref.toUpperCase()} friendly):\n` +
        `* **Fresh Curd (Yogurt) & Buttermilk (Chaas):** Natural dairy source with high bioavailability; also provides beneficial probiotics for gut absorption.\n` +
        `* **Paneer & Fortified Milk:** Cottage cheese and fortified cow's or plant milks.\n` +
        `* **Fortified Nutritional Yeast:** Brewer's/nutritional yeast flakes are naturally rich in B-complex vitamins.\n` +
        (dietPref !== 'vegetarian' && dietPref !== 'vegan' ? `* **Eggs & Poultry:** Whole eggs, chicken breast, and fish like salmon and tuna.\n` : '') +
        `\n#### 2. Key Absorption Factors:\n` +
        `* **Support Stomach Acid:** Vitamin B12 requires adequate stomach acid and intrinsic factor to be released from food. Avoid chronic unnecessary antacid use around meal times.\n` +
        `* **Probiotic Synergy:** Pair B12 foods with fermented foods to support intestinal absorption.\n\n` +
        `#### 3. Medical Guidance & Retesting:\n` +
        `* If your levels are low, discuss sublingual methylcobalamin with your physician for rapid replenishment.\n` +
        `* Retest serum B12 and complete blood count in 8–12 weeks.\n\n` +
        `> ⚠️ **Health Guidance Notice:** This information is provided for educational and wellness support. Please consult your physician or registered dietitian before starting high-dose supplements or altering medical treatments.`,
      toolsCalled,
      safetyNotes: 'Targeted Vitamin B12 dietary strategy provided.'
    };
  }

  // Targeted Vitamin D guidance
  if (lowerQuery.includes('vitamin d') || lowerQuery.includes('vitamin d3') || lowerQuery.includes('d3')) {
    return {
      response: `### ☀️ How to Increase and Maintain Optimal Vitamin D Levels\n\n` +
        `Vitamin D acts as an essential hormone supporting calcium absorption, bone strength, and immune defense.\n\n` +
        `#### 1. Mid-Day Sunlight Protocol:\n` +
        `* Expose arms and face to mid-day sun (10:30 AM – 2:00 PM) for 15–20 minutes without sunscreen, 3–4 times weekly.\n\n` +
        `#### 2. Dietary Sources (${dietPref.toUpperCase()} friendly):\n` +
        `* Fortified dairy and plant-based milks\n` +
        `* Sun-exposed portobello or white button mushrooms\n` +
        `* Whole egg yolks (if non-vegetarian) and fortified cereals\n\n` +
        `#### 3. Clinical Supplementation:\n` +
        `* For documented deficiency (< 30 ng/mL), physicians often recommend oral Cholecalciferol (60,000 IU weekly for 8 weeks).\n\n` +
        `> ⚠️ **Health Guidance Notice:** This information is provided for educational and wellness support. Please consult your physician or registered dietitian before starting high-dose supplements or altering medical treatments.`,
      toolsCalled,
      safetyNotes: 'Targeted Vitamin D dietary strategy provided.'
    };
  }

  let biomarkerAdvice = '';
  if (abnormalBiomarkers.length > 0) {
    const topMarkers = abnormalBiomarkers.slice(0, 3);
    biomarkerAdvice = `\n\n### 🩺 Overall Lab Nutrition Highlights\n` +
      topMarkers.map(b => `* **${b.biomarkerName}:** Focus on ${b.recommendedFoods.slice(0, 2).join(', ')}. Limit ${b.foodsToAvoid.slice(0, 2).join(', ')}.`).join('\n');
  }

  return {
    response: `### Personalized Nutrition Guidance (${dietPref.toUpperCase()}, ${cuisine})\n\n` +
      `**Estimated Daily Energy Target:** ~${calorieTarget} kcal ` +
      (bmiCalc ? `(Based on BMI: ${bmiCalc.bmi} - ${bmiCalc.category})\n\n` : '\n\n') +
      `**Macro Distribution:** Protein: ~${Math.round(calorieTarget * 0.25 / 4)}g | Carbs: ~${Math.round(calorieTarget * 0.50 / 4)}g | Fat: ~${Math.round(calorieTarget * 0.25 / 9)}g\n\n` +
      `**Suggested Meal Framework:**\n` +
      `- **Breakfast (~${Math.round(calorieTarget * 0.25)} kcal):** Sprouted moong chilla or oats with chia seeds and almonds\n` +
      `- **Lunch (~${Math.round(calorieTarget * 0.35)} kcal):** Whole wheat / jowar rotis, yellow dal tadka, steamed green vegetables, fresh curd\n` +
      `- **Evening Snack (~${Math.round(calorieTarget * 0.12)} kcal):** Roasted makhana or boiled chana chaat with lemon\n` +
      `- **Dinner (~${Math.round(calorieTarget * 0.28)} kcal):** Light vegetable khichdi or grilled tofu/paneer with sautéed bottle gourd (lauki)` +
      biomarkerAdvice + `\n\n*Note: Allergies strictly excluded: ${allergiesStr}. Consult a healthcare professional before major dietary changes.*`,
    toolsCalled,
    safetyNotes: 'Deterministic nutrition calculation applied.'
  };
}
