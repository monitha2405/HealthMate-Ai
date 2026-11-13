export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, string>;
  execute: (args: any) => Promise<any> | any;
}

export const toolsRegistry: Record<string, ToolDefinition> = {
  calculateBMI: {
    name: 'calculateBMI',
    description: 'Calculates Body Mass Index (BMI) and health category deterministically using weight in kg and height in cm.',
    parameters: {
      weightKg: 'number (user weight in kilograms)',
      heightCm: 'number (user height in centimeters)'
    },
    execute: ({ weightKg, heightCm }: { weightKg: number; heightCm: number }) => {
      if (!weightKg || !heightCm || weightKg <= 0 || heightCm <= 0) {
        throw new Error('Weight (kg) and Height (cm) must be positive non-zero numbers.');
      }
      const heightM = heightCm / 100;
      const bmi = parseFloat((weightKg / (heightM * heightM)).toFixed(1));

      let category = 'Normal weight';
      let riskLevel = 'Low risk';
      if (bmi < 18.5) {
        category = 'Underweight';
        riskLevel = 'Potential nutritional deficiency risk';
      } else if (bmi >= 25 && bmi < 30) {
        category = 'Overweight';
        riskLevel = 'Increased risk for cardiovascular issues';
      } else if (bmi >= 30) {
        category = 'Obesity';
        riskLevel = 'High risk for metabolic complications';
      }

      const minHealthyWeight = parseFloat((18.5 * heightM * heightM).toFixed(1));
      const maxHealthyWeight = parseFloat((24.9 * heightM * heightM).toFixed(1));

      return {
        bmi,
        category,
        riskLevel,
        healthyWeightRangeKg: `${minHealthyWeight} - ${maxHealthyWeight} kg`
      };
    }
  },

  calculateMeanArterialPressure: {
    name: 'calculateMeanArterialPressure',
    description: 'Calculates Mean Arterial Pressure (MAP) deterministically from systolic and diastolic blood pressure.',
    parameters: {
      systolic: 'number (systolic mmHg)',
      diastolic: 'number (diastolic mmHg)'
    },
    execute: ({ systolic, diastolic }: { systolic: number; diastolic: number }) => {
      if (!systolic || !diastolic || systolic <= 0 || diastolic <= 0) {
        throw new Error('Systolic and Diastolic values must be positive numbers.');
      }
      if (diastolic >= systolic) {
        throw new Error('Systolic pressure must be strictly greater than diastolic pressure.');
      }
      // Formula: MAP = Diastolic + 1/3 (Systolic - Diastolic)
      const map = parseFloat((diastolic + (systolic - diastolic) / 3).toFixed(1));
      let interpretation = 'Normal organ perfusion pressure (70-100 mmHg).';
      if (map < 65) {
        interpretation = 'Low MAP: may indicate insufficient organ perfusion (hypotension).';
      } else if (map > 105) {
        interpretation = 'Elevated MAP: indicates excessive vascular resistance (hypertension).';
      }

      return {
        systolic,
        diastolic,
        map,
        unit: 'mmHg',
        interpretation
      };
    }
  },

  calculateNutritionTargets: {
    name: 'calculateNutritionTargets',
    description: 'Calculates Basal Metabolic Rate (BMR), Total Daily Energy Expenditure (TDEE), and macronutrient split based on Mifflin-St Jeor formula.',
    parameters: {
      weightKg: 'number',
      heightCm: 'number',
      age: 'number',
      gender: "'male' | 'female'",
      activityLevel: "'sedentary' | 'light' | 'moderate' | 'active'",
      goal: "'weight_loss' | 'maintenance' | 'muscle_gain' | 'diabetic_friendly'"
    },
    execute: (args: {
      weightKg: number;
      heightCm: number;
      age: number;
      gender?: string;
      activityLevel?: string;
      goal?: string;
    }) => {
      const { weightKg, heightCm, age, gender = 'female', activityLevel = 'moderate', goal = 'maintenance' } = args;
      if (!weightKg || !heightCm || !age || weightKg <= 0 || heightCm <= 0 || age <= 0) {
        throw new Error('Valid weight, height, and age must be provided.');
      }

      // Mifflin-St Jeor Formula
      let bmr = 10 * weightKg + 6.25 * heightCm - 5 * age;
      if (gender.toLowerCase() === 'male') {
        bmr += 5;
      } else {
        bmr -= 161;
      }

      const activityMultipliers: Record<string, number> = {
        sedentary: 1.2,
        light: 1.375,
        moderate: 1.55,
        active: 1.725
      };

      const multiplier = activityMultipliers[activityLevel] || 1.375;
      const tdee = Math.round(bmr * multiplier);

      let targetCalories = tdee;
      if (goal === 'weight_loss') targetCalories = Math.round(tdee - 450);
      else if (goal === 'muscle_gain') targetCalories = Math.round(tdee + 350);
      else if (goal === 'diabetic_friendly') targetCalories = Math.round(tdee - 200);

      // Macronutrient split
      const proteinGrams = Math.round((targetCalories * 0.25) / 4); // 25% calories from protein
      const fatGrams = Math.round((targetCalories * 0.25) / 9);     // 25% calories from healthy fat
      const carbGrams = Math.round((targetCalories * 0.50) / 4);    // 50% calories from complex carbs

      return {
        bmr: Math.round(bmr),
        tdee,
        targetDailyCalories: targetCalories,
        macronutrients: {
          proteinGrams,
          carbGrams,
          fatGrams
        },
        formulaUsed: 'Mifflin-St Jeor equation'
      };
    }
  },

  compareMeasurements: {
    name: 'compareMeasurements',
    description: 'Compares two numerical health readings over time to compute delta and trend direction.',
    parameters: {
      baselineValue: 'number',
      currentValue: 'number',
      metricName: 'string'
    },
    execute: ({ baselineValue, currentValue, metricName = 'metric' }: { baselineValue: number; currentValue: number; metricName?: string }) => {
      if (baselineValue === undefined || currentValue === undefined) {
        throw new Error('Baseline and current values are required.');
      }
      const delta = parseFloat((currentValue - baselineValue).toFixed(2));
      const percentChange = baselineValue !== 0 ? parseFloat(((delta / baselineValue) * 100).toFixed(1)) : 0;
      const direction = delta > 0 ? 'increase' : delta < 0 ? 'decrease' : 'stable';

      return {
        metricName,
        baselineValue,
        currentValue,
        delta,
        percentChange: `${percentChange > 0 ? '+' : ''}${percentChange}%`,
        direction
      };
    }
  },

  evaluateLabReference: {
    name: 'evaluateLabReference',
    description: 'Deterministic clinical reference range lookup for standard biomarkers.',
    parameters: {
      testName: 'string',
      value: 'number'
    },
    execute: ({ testName, value }: { testName: string; value: number }) => {
      const standardRanges: Record<string, { min: number; max: number; unit: string; name: string }> = {
        glucose_fasting: { min: 70, max: 99, unit: 'mg/dL', name: 'Fasting Blood Glucose' },
        glucose_postprandial: { min: 70, max: 140, unit: 'mg/dL', name: 'Postprandial Blood Glucose' },
        hba1c: { min: 4.0, max: 5.6, unit: '%', name: 'HbA1c' },
        total_cholesterol: { min: 125, max: 200, unit: 'mg/dL', name: 'Total Cholesterol' },
        ldl: { min: 0, max: 100, unit: 'mg/dL', name: 'LDL Cholesterol' },
        hdl: { min: 40, max: 60, unit: 'mg/dL', name: 'HDL Cholesterol' },
        triglycerides: { min: 0, max: 150, unit: 'mg/dL', name: 'Triglycerides' },
        creatinine: { min: 0.6, max: 1.2, unit: 'mg/dL', name: 'Serum Creatinine' },
        hemoglobin: { min: 12.0, max: 17.5, unit: 'g/dL', name: 'Hemoglobin' },
        tsh: { min: 0.4, max: 4.0, unit: 'mIU/L', name: 'Thyroid Stimulating Hormone (TSH)' }
      };

      const key = testName.toLowerCase().replace(/[\s\-_]/g, '');
      const matched = Object.entries(standardRanges).find(([k]) => key.includes(k.replace('_', '')));

      if (!matched) {
        return {
          testName,
          value,
          status: 'unknown',
          message: 'No pre-configured standard reference range available for this biomarker.'
        };
      }

      const [, ref] = matched;
      let status: 'normal' | 'abnormal_high' | 'abnormal_low' = 'normal';
      if (value < ref.min) status = 'abnormal_low';
      else if (value > ref.max) status = 'abnormal_high';

      return {
        biomarker: ref.name,
        value,
        unit: ref.unit,
        standardRange: `${ref.min} - ${ref.max} ${ref.unit}`,
        status
      };
    }
  }
};

export async function executeTool(name: string, args: any) {
  const tool = toolsRegistry[name];
  if (!tool) {
    throw new Error(`Tool "${name}" is not registered in the controlled tool laboratory.`);
  }
  return tool.execute(args);
}
