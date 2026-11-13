import { generateText, isGeminiAvailable } from '../gemini';
import { executeTool } from '../tools';
import type { HealthMeasurement } from '../../../src/types';

export interface TrendAgentInput {
  query: string;
  measurements: HealthMeasurement[];
  userProfile?: any;
}

export interface TrendAgentOutput {
  response: string;
  toolsCalled: string[];
  trendCalculations?: any[];
  safetyNotes: string;
}

export async function runTrendAgent(input: TrendAgentInput): Promise<TrendAgentOutput> {
  const { query, measurements } = input;
  const toolsCalled: string[] = [];

  if (measurements.length === 0) {
    return {
      response: "You don't have any recorded health measurements yet in your Health Tracker. Once you log your blood pressure, blood glucose, or weight over time, I will analyze your historical trends and patterns.",
      toolsCalled: [],
      safetyNotes: 'No historical health data available for user.'
    };
  }

  // Group measurements by type and sort chronologically
  const byType: Record<string, HealthMeasurement[]> = {};
  for (const m of measurements) {
    if (!byType[m.type]) byType[m.type] = [];
    byType[m.type].push(m);
  }
  for (const t of Object.keys(byType)) {
    byType[t].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // Run deterministic trend calculation
  const calculations: any[] = [];
  for (const [type, list] of Object.entries(byType)) {
    if (list.length >= 2) {
      const first = list[0];
      const latest = list[list.length - 1];
      const comparison = await executeTool('compareMeasurements', {
        baselineValue: first.value,
        currentValue: latest.value,
        metricName: type
      });
      toolsCalled.push('compareMeasurements');
      calculations.push({
        type,
        baseline: `${first.value} ${first.unit} (${new Date(first.timestamp).toLocaleDateString()})`,
        latest: `${latest.value} ${latest.unit} (${new Date(latest.timestamp).toLocaleDateString()})`,
        ...comparison
      });
    }
  }

  const calcSummary = calculations.length > 0
    ? calculations.map(c => `- ${c.metricName.toUpperCase()}: Changed from ${c.baseline} to ${c.latest} (${c.delta > 0 ? '+' : ''}${c.delta}, ${c.percentChange})`).join('\n')
    : `Total recorded readings: ${measurements.length}. (At least two readings of the same metric are recommended for numerical delta comparison).`;

  if (isGeminiAvailable()) {
    try {
      const prompt = `You are HealthMate AI's Health Trend Analysis Agent.
The user is asking: "${query}"

Here are the deterministic calculations of their historical readings:
${calcSummary}

STRICT GUIDELINES:
1. Explain the observed historical patterns in simple, objective terms.
2. Distinguish clearly between observed numerical trends and clinical conclusions.
3. Do not diagnose conditions like hypertension or diabetes.
4. If measurements are fluctuating or increasing, suggest discussing the readings with a healthcare provider.`;

      const result = await generateText({
        prompt,
        systemInstruction: 'You analyze health metrics over time using factual trends. Do not diagnose.'
      });

      return {
        response: result.text,
        toolsCalled,
        trendCalculations: calculations,
        safetyNotes: 'Calculations generated via deterministic compareMeasurements tool.'
      };
    } catch (e) {
      console.warn('Trend agent Gemini error:', e);
    }
  }

  // Deterministic summary fallback
  return {
    response: `Here is a summary of your recorded health trends:\n\n${calcSummary}\n\nConsistency in tracking helps reveal long-term patterns. Consult your healthcare team to discuss these variations.`,
    toolsCalled,
    trendCalculations: calculations,
    safetyNotes: 'Deterministic comparison generated without LLM generation.'
  };
}
