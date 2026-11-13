export interface UserProfile {
  uid: string;
  isAnonymous: boolean;
  displayName: string;
  age?: number;
  gender?: string;
  heightCm?: number;
  weightKg?: number;
  bloodGroup?: string;
  knownConditions?: string[];
  allergies?: string[];
  dietaryPreference?: 'vegetarian' | 'non-vegetarian' | 'vegan' | 'eggetarian' | 'jain';
  updatedAt: string;
}

export type MedicalValueStatus = 'normal' | 'abnormal_high' | 'abnormal_low' | 'borderline' | 'unknown';

export interface MedicalValue {
  id: string;
  name: string;
  value: number;
  unit: string;
  referenceRange?: string;
  status: MedicalValueStatus;
  confidence: number;
  verified: boolean;
  sourceText?: string;
  clinicalNote?: string;
}

export interface HealthDocument {
  id: string;
  userId: string;
  title: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  status: 'processing' | 'ready' | 'error';
  rawText?: string;
  summary?: string;
  extractedValues: MedicalValue[];
  verified: boolean;
  chunksCount: number;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  userId: string;
  chunkIndex: number;
  content: string;
  similarity?: number;
  tokenCount?: number;
}

export type MeasurementType = 'weight' | 'blood_pressure' | 'blood_glucose' | 'heart_rate' | 'hba1c' | 'cholesterol' | 'other';

export interface HealthMeasurement {
  id: string;
  userId: string;
  type: MeasurementType;
  value: number;
  secondaryValue?: number; // e.g. diastolic for blood pressure
  unit: string;
  timestamp: string;
  notes?: string;
  source: 'manual' | 'document_extracted';
  documentId?: string;
}

export interface MealItem {
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  substitutions?: string[];
}

export interface BiomarkerNutritionPlan {
  biomarkerName: string;
  observedValue: number;
  unit: string;
  referenceRange?: string;
  status: MedicalValueStatus;
  clinicalImpact: string;
  recommendedFoods: string[];
  foodsToAvoid: string[];
  recommendedExercises?: string[];
  healthPractices?: string[];
  lifestyleTip: string;
}

export interface UserBiometricSummary {
  heightCm: number;
  weightKg: number;
  age: number;
  gender: string;
  bmi: number;
  bmiCategory: string;
  healthyWeightRange: string;
  bmr: number;
  tdee: number;
  targetDailyCalories: number;
}

export interface DailyMealPlan {
  breakfast: MealItem[];
  lunch: MealItem[];
  dinner: MealItem[];
  snacks: MealItem[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  guidelines: string[];
  userBiometrics?: UserBiometricSummary;
  biomarkerPlans?: BiomarkerNutritionPlan[];
}

export interface NutritionPreferences {
  dietaryPreference: 'vegetarian' | 'non-vegetarian' | 'vegan' | 'eggetarian' | 'jain';
  regionalCuisine?: string; // e.g., North Indian, South Indian, Maharashtrian
  allergies: string[];
  foodExclusions: string[];
  budgetLevel: 'budget' | 'moderate' | 'premium';
  healthGoal: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'diabetic_friendly' | 'heart_healthy';
  targetDailyCalories?: number;
}

export interface WellnessHabit {
  id: string;
  userId: string;
  category: 'sleep' | 'water' | 'activity' | 'meditation' | 'exercise' | 'nutrition';
  name: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  completed: boolean;
  streakDays: number;
  date: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  agentUsed?: string;
  toolsInvoked?: string[];
  sources?: {
    documentId: string;
    documentTitle: string;
    chunkIndex: number;
    text: string;
    similarity: number;
  }[];
  intentClassification?: {
    intent: string;
    confidence: number;
    reasoning: string;
  };
  safetyWarning?: string;
  isEmergencyAlert?: boolean;
}

export interface AgentExecutionTrace {
  id: string;
  timestamp: string;
  query: string;
  intent: string;
  agentSelected: string;
  agentReasoning: string;
  toolsCalled: { name: string; args: any; result: any }[];
  ragChunksRetrieved: number;
  latencyMs: number;
  tokensUsedEstimated?: number;
  status: 'success' | 'fallback' | 'safety_intercepted' | 'error';
}

export interface EvaluationTestCase {
  id: string;
  category: 'routing' | 'rag' | 'safety' | 'tools' | 'nutrition';
  name: string;
  input: string;
  expectedAgentOrOutcome: string;
  safetyCheckRequired?: boolean;
  expectedTool?: string;
}

export interface EvaluationResultItem {
  testId: string;
  category: string;
  name: string;
  passed: boolean;
  actualOutcome: string;
  latencyMs: number;
  notes?: string;
}

export interface EvaluationSummary {
  totalTests: number;
  passed: number;
  failed: number;
  accuracyPercent: number;
  categoryScores: Record<string, { total: number; passed: number; accuracy: number }>;
  executionTimestamp: string;
  results: EvaluationResultItem[];
}
