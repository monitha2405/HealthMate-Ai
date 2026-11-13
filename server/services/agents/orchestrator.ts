import crypto from 'crypto';
import { query as dbQuery } from '../../db/pool';
import { retrieveRelevantChunks } from '../ragService';
import { runDocumentAgent } from './documentAgent';
import { runTrendAgent } from './trendAgent';
import { runNutritionAgent } from './nutritionAgent';
import { runWellnessAgent } from './wellnessAgent';
import { runKnowledgeAgent } from './knowledgeAgent';
import { generateBiomarkerNormalizationPlans } from '../biomarkerNutrition';
import type { ChatMessage, HealthMeasurement, WellnessHabit, NutritionPreferences } from '../../../src/types';

export interface OrchestratorInput {
  guestId: string;
  query: string;
  conversationHistory?: ChatMessage[];
  enableMemory?: boolean;
}

export interface OrchestrationResult {
  message: ChatMessage;
  trace: {
    id: string;
    intent: string;
    agentSelected: string;
    reasoning: string;
    toolsInvoked: string[];
    chunksRetrieved: number;
    latencyMs: number;
  };
}

// Emergency symptoms detector for immediate safety interception
const EMERGENCY_PATTERNS = [
  /\b(?:crushing|severe)\s+chest\s+pain\b/i,
  /\b(?:difficulty|trouble|can't)\s+breath(?:ing)?\b/i,
  /\b(?:shortness\s+of\s+breath|suffocating)\b/i,
  /\b(?:stroke|facial\s+droop(?:ing)?|arm\s+numbness|slurred\s+speech)\b/i,
  /\b(?:coughing\s+up\s+blood|massive\s+bleed(?:ing)?|hemorrhage)\b/i,
  /\b(?:loss\s+of\s+consciousness|fainted\s+and\s+unresponsive)\b/i,
  /\b(?:anaphylaxis|throat\s+closing\s+up)\b/i,
  /\b(?:suicide|kill\s+myself|want\s+to\s+die|overdose)\b/i
];

export function detectEmergency(query: string): boolean {
  return EMERGENCY_PATTERNS.some(regex => regex.test(query));
}

/**
 * Deterministic intent classifier with fallback
 */
export function classifyIntent(query: string): {
  intent: 'emergency' | 'document' | 'trend' | 'nutrition' | 'wellness' | 'general_knowledge';
  agent: string;
  reasoning: string;
  confidence: number;
} {
  const lower = query.toLowerCase();

  if (detectEmergency(query)) {
    return {
      intent: 'emergency',
      agent: 'Emergency Safety Interceptor',
      reasoning: 'Critical medical symptoms detected requiring immediate emergency triage guidance.',
      confidence: 1.0
    };
  }

  // Normalization & Out-of-Range biomarker recovery intent
  if (
    lower.includes('out of range') ||
    lower.includes('abnormal') ||
    lower.includes('normal condition') ||
    lower.includes('back to normal') ||
    lower.includes('to normal') ||
    lower.includes('normalize') ||
    lower.includes('normalise') ||
    lower.includes('health practice') ||
    (lower.includes('exercise') && (lower.includes('value') || lower.includes('report') || lower.includes('test') || lower.includes('biomarker'))) ||
    (lower.includes('food') && (lower.includes('value') || lower.includes('out of range') || lower.includes('report') || lower.includes('biomarker')))
  ) {
    return {
      intent: 'document',
      agent: 'Health Document & Normalization Agent',
      reasoning: 'User is requesting foods, exercise routines, or clinical health practices to normalize out-of-range lab biomarkers.',
      confidence: 0.98
    };
  }

  // Document intent keywords
  if (
    lower.includes('report') ||
    lower.includes('document') ||
    lower.includes('test result') ||
    lower.includes('lab') ||
    lower.includes('blood test') ||
    lower.includes('uploaded') ||
    lower.includes('extracted') ||
    lower.includes('pdf') ||
    lower.includes('my hba1c value') ||
    lower.includes('my glucose reading')
  ) {
    return {
      intent: 'document',
      agent: 'Health Document Agent',
      reasoning: 'Query references uploaded medical documents, lab results, or test values.',
      confidence: 0.92
    };
  }

  // Trend analysis intent
  if (
    lower.includes('trend') ||
    lower.includes('over time') ||
    lower.includes('compared to') ||
    lower.includes('progress') ||
    lower.includes('delta') ||
    lower.includes('historical') ||
    lower.includes('fluctuat') ||
    lower.includes('tracker history')
  ) {
    return {
      intent: 'trend',
      agent: 'Health Trend Analysis Agent',
      reasoning: 'User is asking to evaluate trends and numerical changes across historical readings.',
      confidence: 0.88
    };
  }

  // Nutrition intent
  if (
    lower.includes('diet') ||
    lower.includes('meal') ||
    lower.includes('eat') ||
    lower.includes('food') ||
    lower.includes('calorie') ||
    lower.includes('protein') ||
    lower.includes('carbohydrate') ||
    lower.includes('nutrition') ||
    lower.includes('vegetarian') ||
    lower.includes('dinner') ||
    lower.includes('breakfast') ||
    lower.includes('snack') ||
    lower.includes('vitamin') ||
    lower.includes('b12') ||
    lower.includes('iron') ||
    lower.includes('calcium') ||
    lower.includes('supplement')
  ) {
    return {
      intent: 'nutrition',
      agent: 'Nutrition Agent',
      reasoning: 'Query pertains to dietary choices, meal plans, macro distribution, or food recommendations.',
      confidence: 0.94
    };
  }

  // Wellness and habits intent
  if (
    lower.includes('habit') ||
    lower.includes('sleep') ||
    lower.includes('water') ||
    lower.includes('hydration') ||
    lower.includes('step') ||
    lower.includes('exercise') ||
    lower.includes('workout') ||
    lower.includes('meditat') ||
    lower.includes('stress') ||
    lower.includes('wellness') ||
    lower.includes('routine')
  ) {
    return {
      intent: 'wellness',
      agent: 'Wellness and Habit Agent',
      reasoning: 'User is asking about daily habits, lifestyle routines, hydration, or sleep hygiene.',
      confidence: 0.90
    };
  }

  // Default to general knowledge
  return {
    intent: 'general_knowledge',
    agent: 'General Health Knowledge Agent',
    reasoning: 'Educational inquiry about general biological or healthcare terminology.',
    confidence: 0.85
  };
}

export async function orchestrateQuery(input: OrchestratorInput): Promise<OrchestrationResult> {
  const startTime = Date.now();
  const traceId = crypto.randomUUID();
  const { guestId, query, enableMemory = false } = input;

  // 1. Intent Classification
  const classification = classifyIntent(query);

  let finalResponse = '';
  let sourcesUsed: any[] = [];
  let toolsInvoked: string[] = [];
  let safetyWarning = '';
  let isEmergency = false;
  let chunksRetrieved = 0;

  // 2. Emergency Interception
  if (classification.intent === 'emergency') {
    isEmergency = true;
    finalResponse = `🚨 **URGENT MEDICAL NOTICE**\n\n` +
      `Your query indicates symptoms that may require urgent medical evaluation. ` +
      `HealthMate AI is an educational decision-support platform and **cannot provide emergency triage or medical diagnosis**.\n\n` +
      `**Recommended Immediate Actions:**\n` +
      `- Call your local emergency helpline immediately (911 in USA/Canada, 112 in Europe/India, or your regional equivalent).\n` +
      `- If you are alone, alert a family member, neighbor, or emergency contact.\n` +
      `- Proceed immediately to the nearest hospital emergency department.\n\n` +
      `Please seek prompt human medical care.`;
    safetyWarning = 'Emergency symptoms detected; emergency guidance provided immediately.';
  } else {
    // Fetch guest health profile from PostgreSQL
    const profileRes = await dbQuery('SELECT * FROM health_profiles WHERE guest_id = $1', [guestId]);
    const userRow = profileRes.rows[0];
    const userProfile = userRow ? {
      age: userRow.age,
      gender: userRow.gender,
      heightCm: userRow.height_cm,
      weightKg: userRow.weight_kg,
      bloodGroup: userRow.blood_group,
      dietaryPreference: userRow.dietary_preference,
      allergies: userRow.allergies || []
    } : null;

    // 3. Dispatch to selected specialist agent
    switch (classification.intent) {
      case 'document': {
        let retrieved: any[] = [];
        try {
          retrieved = await retrieveRelevantChunks(query, guestId, 3);
        } catch (e: any) {
          console.warn('[Orchestrator] Document chunk retrieval error:', e.message);
        }
        chunksRetrieved = retrieved.length;

        // Fetch abnormal biomarkers from uploaded lab documents
        let abnormalBiomarkers: any[] = [];
        try {
          const valRes = await dbQuery(
            `SELECT name, value, unit, reference_range, status 
             FROM extracted_health_values 
             WHERE guest_id = $1 AND status != 'normal' 
             ORDER BY id DESC`,
            [guestId]
          );
          if (valRes.rows.length > 0) {
            abnormalBiomarkers = await generateBiomarkerNormalizationPlans(
              valRes.rows.map(r => ({
                name: r.name,
                value: Number(r.value),
                unit: r.unit,
                referenceRange: r.reference_range,
                status: r.status
              }))
            );
          }
        } catch (e) {
          console.warn('Could not fetch abnormal biomarkers for document agent:', e);
        }

        const result = await runDocumentAgent({
          query,
          retrievedChunks: retrieved,
          userProfile,
          abnormalBiomarkers
        });
        finalResponse = result.response;
        sourcesUsed = result.sourcesUsed;
        safetyWarning = result.safetyNotes;
        break;
      }

      case 'trend': {
        const measRes = await dbQuery('SELECT * FROM health_measurements WHERE guest_id = $1 ORDER BY recorded_at ASC', [guestId]);
        const measurements: HealthMeasurement[] = measRes.rows.map(r => ({
          id: r.id,
          userId: r.guest_id,
          type: r.type,
          value: Number(r.value),
          secondaryValue: r.secondary_value !== null ? Number(r.secondary_value) : undefined,
          unit: r.unit,
          timestamp: r.recorded_at,
          notes: r.notes,
          source: r.source,
          documentId: r.document_id
        }));

        const result = await runTrendAgent({
          query,
          measurements,
          userProfile
        });
        finalResponse = result.response;
        toolsInvoked = result.toolsCalled;
        safetyWarning = result.safetyNotes;
        break;
      }

      case 'nutrition': {
        const prefRes = await dbQuery('SELECT * FROM nutrition_preferences WHERE guest_id = $1', [guestId]);
        const prefRow = prefRes.rows[0];
        const preferences: NutritionPreferences | undefined = prefRow ? {
          dietaryPreference: prefRow.dietary_preference,
          regionalCuisine: prefRow.regional_cuisine,
          allergies: prefRow.allergies || [],
          foodExclusions: prefRow.food_exclusions || [],
          budgetLevel: prefRow.budget_level,
          healthGoal: prefRow.health_goal,
          targetDailyCalories: prefRow.target_daily_calories
        } : undefined;

        // Fetch abnormal biomarkers from uploaded lab documents
        let abnormalBiomarkers: any[] = [];
        try {
          const valRes = await dbQuery(
            `SELECT name, value, unit, reference_range, status 
             FROM extracted_health_values 
             WHERE guest_id = $1 AND status != 'normal' 
             ORDER BY id DESC`,
            [guestId]
          );
          if (valRes.rows.length > 0) {
            abnormalBiomarkers = await generateBiomarkerNormalizationPlans(
              valRes.rows.map(r => ({
                name: r.name,
                value: Number(r.value),
                unit: r.unit,
                referenceRange: r.reference_range,
                status: r.status
              }))
            );
          }
        } catch (e) {
          console.warn('Could not fetch abnormal biomarkers for nutrition agent:', e);
        }

        const result = await runNutritionAgent({
          query,
          preferences,
          userProfile,
          abnormalBiomarkers
        });
        finalResponse = result.response;
        toolsInvoked = result.toolsCalled;
        safetyWarning = result.safetyNotes;
        break;
      }

      case 'wellness': {
        const habitsRes = await dbQuery('SELECT * FROM habits WHERE guest_id = $1', [guestId]);
        const habits: WellnessHabit[] = habitsRes.rows.map(h => ({
          id: h.id,
          userId: h.guest_id,
          category: h.category,
          name: h.name,
          targetValue: Number(h.target_value),
          currentValue: 0,
          unit: h.unit,
          completed: false,
          streakDays: 1,
          date: new Date().toISOString().slice(0, 10)
        }));

        const result = await runWellnessAgent({
          query,
          habits,
          userProfile
        });
        finalResponse = result.response;
        toolsInvoked = result.toolsCalled;
        safetyWarning = result.safetyNotes;
        break;
      }

      default: {
        const result = await runKnowledgeAgent({
          query,
          userProfile
        });
        finalResponse = result.response;
        toolsInvoked = result.toolsCalled;
        safetyWarning = result.safetyNotes;
        break;
      }
    }
  }

  // 4. Append medical safety disclaimer banner
  if (!isEmergency) {
    finalResponse += `\n\n---\n*Disclaimer: HealthMate AI provides educational decision support only. It does not provide medical diagnoses, treatment plans, or clinical prescriptions. Always consult a licensed healthcare professional for medical decisions.*`;
  }

  const latencyMs = Date.now() - startTime;
  const messageId = crypto.randomUUID();
  const timestamp = new Date().toISOString();

  // 5. Store message in PostgreSQL
  await dbQuery(
    `INSERT INTO conversation_messages (id, guest_id, role, content, timestamp, agent_used, tools_invoked, sources, safety_warning, is_emergency)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      messageId,
      guestId,
      'assistant',
      finalResponse,
      timestamp,
      classification.agent,
      JSON.stringify(toolsInvoked),
      JSON.stringify(sourcesUsed),
      safetyWarning,
      isEmergency
    ]
  );

  // 6. Handle optional memory saving
  if (enableMemory && !isEmergency) {
    try {
      await dbQuery(
        `INSERT INTO user_memories (id, guest_id, category, content, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [crypto.randomUUID(), guestId, classification.intent, `Query: "${query.slice(0, 150)}" -> Interacted with ${classification.agent}`]
      );
    } catch (e) {
      console.warn('Memory saving skipped:', e);
    }
  }

  // 7. Log observability telemetry
  await dbQuery(
    `INSERT INTO agent_execution_logs (id, guest_id, query, intent, agent_selected, reasoning, tools_invoked, rag_chunks_count, latency_ms, tokens_estimated, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
    [
      traceId,
      guestId,
      query,
      classification.intent,
      classification.agent,
      classification.reasoning,
      JSON.stringify(toolsInvoked),
      chunksRetrieved,
      latencyMs,
      Math.ceil(finalResponse.split(/\s+/).length * 1.3),
      isEmergency ? 'safety_intercepted' : 'success'
    ]
  );

  const message: ChatMessage = {
    id: messageId,
    role: 'assistant',
    content: finalResponse,
    timestamp,
    agentUsed: classification.agent,
    toolsInvoked,
    sources: sourcesUsed.map(s => ({
      documentId: s.documentId,
      documentTitle: s.documentTitle,
      chunkIndex: s.chunkIndex,
      text: s.content.slice(0, 200) + '...',
      similarity: s.similarity
    })),
    intentClassification: {
      intent: classification.intent,
      confidence: classification.confidence,
      reasoning: classification.reasoning
    },
    safetyWarning,
    isEmergencyAlert: isEmergency
  };

  return {
    message,
    trace: {
      id: traceId,
      intent: classification.intent,
      agentSelected: classification.agent,
      reasoning: classification.reasoning,
      toolsInvoked,
      chunksRetrieved,
      latencyMs
    }
  };
}
