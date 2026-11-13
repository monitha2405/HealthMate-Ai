import { generateText, isGeminiAvailable } from '../gemini';
import type { WellnessHabit } from '../../../src/types';

export interface WellnessAgentInput {
  query: string;
  habits: WellnessHabit[];
  userProfile?: any;
}

export interface WellnessAgentOutput {
  response: string;
  toolsCalled: string[];
  safetyNotes: string;
}

export async function runWellnessAgent(input: WellnessAgentInput): Promise<WellnessAgentOutput> {
  const { query, habits } = input;

  const totalHabits = habits.length;
  const completedHabits = habits.filter(h => h.completed).length;
  const completionRate = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;

  const habitSummary = habits.length > 0
    ? habits.map(h => `- ${h.name} (${h.category}): ${h.currentValue}/${h.targetValue} ${h.unit} [${h.completed ? 'Completed' : 'Pending'}] (Streak: ${h.streakDays}d)`).join('\n')
    : 'No daily habits recorded today.';

  if (isGeminiAvailable()) {
    try {
      const prompt = `You are HealthMate AI's Wellness & Habit Coaching Agent.
User Question: "${query}"

Current Wellness Data:
- Daily Completion: ${completedHabits}/${totalHabits} habits (${completionRate}%)
Habits list:
${habitSummary}

SAFETY & COACHING RULES:
1. Provide practical, incremental, and evidence-based wellness suggestions (e.g., consistent sleep schedules, mindful hydration, gentle walking).
2. Maintain an encouraging, positive tone.
3. Explicitly clarify that lifestyle coaching does NOT replace professional mental healthcare or psychiatric treatment.
4. Avoid prescribing extreme fitness regimes.`;

      const result = await generateText({
        prompt,
        systemInstruction: 'You are a supportive wellness coach. Provide actionable lifestyle habit guidance. Never replace mental health professionals.'
      });

      return {
        response: result.text,
        toolsCalled: [],
        safetyNotes: 'Wellness guidance provided. Non-clinical disclaimer enforced.'
      };
    } catch (e) {
      console.warn('Wellness agent Gemini error:', e);
    }
  }

  return {
    response: `### Wellness & Routine Summary\n\n` +
      `You have completed **${completedHabits} of ${totalHabits}** daily wellness activities today (${completionRate}% progress).\n\n` +
      `**Current Habits:**\n${habitSummary}\n\n` +
      `*Tip: Sustainable habits are built through small, consistent actions rather than drastic changes. Ensure adequate rest and hydration throughout your day.*`,
    toolsCalled: [],
    safetyNotes: 'Deterministic wellness calculation summary.'
  };
}
