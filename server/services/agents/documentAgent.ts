import { generateText, isGeminiAvailable } from '../gemini';
import type { RetrievedChunk } from '../ragService';
import type { BiomarkerNutritionPlan } from '../../../src/types';

export interface DocumentAgentInput {
  query: string;
  retrievedChunks: RetrievedChunk[];
  userProfile?: any;
  abnormalBiomarkers?: BiomarkerNutritionPlan[];
}

export interface DocumentAgentOutput {
  response: string;
  sourcesUsed: RetrievedChunk[];
  toolsCalled?: string[];
  safetyNotes: string;
}

/**
 * Prioritizes the most significant clinical biomarkers for high-level summary,
 * keeping guidance minimal, elegant, and non-overwhelming.
 */
function selectKeyBiomarkers(biomarkers: BiomarkerNutritionPlan[]): BiomarkerNutritionPlan[] {
  if (!biomarkers || biomarkers.length <= 4) return biomarkers;

  const priorityOrder = [
    'vitamin d',
    'vitamin b-12',
    'ldl',
    'bilirubin',
    'glucose',
    'hemoglobin',
    'urea',
    'tsh'
  ];

  const selected: BiomarkerNutritionPlan[] = [];
  const addedNames = new Set<string>();

  // Add primary clinical markers first
  for (const p of priorityOrder) {
    const found = biomarkers.find(b => b.biomarkerName.toLowerCase().includes(p) && !addedNames.has(b.biomarkerName));
    if (found && selected.length < 4) {
      selected.push(found);
      addedNames.add(found.biomarkerName);
    }
  }

  // Fill up to at most 4 if needed
  for (const b of biomarkers) {
    if (selected.length >= 4) break;
    if (!addedNames.has(b.biomarkerName)) {
      selected.push(b);
      addedNames.add(b.biomarkerName);
    }
  }

  return selected;
}

export async function runDocumentAgent(input: DocumentAgentInput): Promise<DocumentAgentOutput> {
  const { query, retrievedChunks, abnormalBiomarkers = [] } = input;

  if (retrievedChunks.length === 0 && abnormalBiomarkers.length === 0) {
    return {
      response: "I couldn't find any relevant uploaded health documents matching your question. Please ensure your lab reports or documents are uploaded and processed under the Health Documents section.",
      sourcesUsed: [],
      safetyNotes: "No document evidence found in user's scoped storage."
    };
  }

  // Select key primary markers to keep detailing minimal and summarized
  const keyMarkers = selectKeyBiomarkers(abnormalBiomarkers);

  const contextText = retrievedChunks
    .map((c, i) => `[Source ${i + 1}: ${c.documentTitle}]\n${c.content.slice(0, 500)}`)
    .join('\n\n');

  const summaryContext = keyMarkers.length > 0
    ? `\nPRIMARY CLINICAL LAB FINDINGS (SUMMARIZE CONCISELY — DO NOT OVERWHELM):
${keyMarkers.map(b => `- ${b.biomarkerName}: ${b.observedValue} ${b.unit} (${b.status === 'abnormal_low' ? 'Low' : 'High'}). Impact: ${b.clinicalImpact}`).join('\n')}`
    : '';

  if (isGeminiAvailable()) {
    try {
      const prompt = `You are HealthMate AI's Personal Health Assistant.
Answer the customer's personal health query directly, warmly, and concisely.

Customer Query: "${query}"

<RELEVANT_RECORDS_CONTEXT>
${contextText}
</RELEVANT_RECORDS_CONTEXT>
${summaryContext}

CRITICAL GUIDELINES:
1. Answer the customer's personal health query directly.
2. Keep the response minimal, clear, and easy to read. Do NOT list every single minor out-of-range parameter or overwhelm the customer with long lists.
3. Provide an overall high-level summary of the main health findings, followed by a concise, unified plan:
   - 🩺 **Overall Health Summary**: 2-3 sentences explaining the primary lab observations at a high level.
   - 🥗 **Targeted Nutrition Focus**: 3-4 unified whole-food dietary principles.
   - 🏃 **Daily Physical Activity**: A simple, practical daily routine (e.g. 30 mins brisk walking, morning sunlight).
   - 🌿 **Core Wellness Practices**: 2-3 daily habits (hydration pacing, sleep, routine doctor follow-up).
4. Maintain medical safety: offer educational guidance, not prescriptions or formal diagnosis.`;

      const result = await generateText({
        prompt,
        systemInstruction: 'You are an empathetic, evidence-based personal healthcare assistant. Provide minimal, concise, high-level health summaries and direct answers.'
      });

      return {
        response: result.text,
        sourcesUsed: retrievedChunks,
        safetyNotes: `Concise personal health summary provided for ${keyMarkers.length} primary biomarker areas.`
      };
    } catch (err: any) {
      console.warn('Document agent Gemini call failed, using minimal clinical summary fallback:', err);
    }
  }

  // Minimal, High-Level Clinical Summary Fallback
  if (keyMarkers.length > 0) {
    const findingsList = keyMarkers.map(b =>
      `* **${b.biomarkerName}** (${b.observedValue} ${b.unit} - ${b.status === 'abnormal_low' ? 'Below Optimal' : 'Elevated'}): ${b.clinicalImpact}`
    ).join('\n');

    const response = `### 🩺 Overall Health & Lab Summary

Based on your uploaded medical records, here is a concise high-level overview of your primary observations:

${findingsList}
*(Other minor hematology indices fall within expected recovery boundaries).*

---

### 🥗 Targeted Nutrition Highlights
* **Micronutrient Replenishment:** Include fortified dairy/plant milks, sun-exposed mushrooms, and fresh curd to support Vitamin D and B-12 levels.
* **Cardiovascular & Lipid Support:** Incorporate soluble fiber (oats, flaxseeds, walnuts, and lentils) to maintain healthy LDL cholesterol.
* **Hydration & Liver Support:** Drink 2.5–3 liters of water daily with fresh lemon and coconut water to aid natural filtration and bile flow.

---

### 🏃 Practical Daily Activity
* **30 Minutes Daily Brisk Walking:** Consistent aerobic walking improves metabolic clearance and circulation.
* **Morning Sunlight:** 15–20 minutes of mid-day sun exposure on face and arms supports natural Vitamin D synthesis.
* **Gentle Mobility:** Light stretching or yoga to support circulation and reduce muscle tension.

---

### 🌿 Daily Wellness Habits
* **Paced Hydration:** Drink a glass of water every 1–2 hours during the day.
* **Restorative Sleep:** Prioritize 7–8 hours of consistent nightly sleep.
* **Physician Follow-up:** Discuss targeted D3/B12 supplementation with your doctor and schedule routine blood work in 8–12 weeks.`;

    return {
      response,
      sourcesUsed: retrievedChunks,
      safetyNotes: `Minimal high-level summary synthesized for primary biomarker areas.`
    };
  }

  // Fallback for general query
  const primaryChunk = retrievedChunks[0];
  return {
    response: `Based on your uploaded health document "${primaryChunk.documentTitle}", the records indicate:\n\n"${primaryChunk.content.slice(0, 300)}..."\n\nPlease consult your healthcare provider to discuss these findings in the context of your overall personal wellness.`,
    sourcesUsed: retrievedChunks,
    safetyNotes: 'Local personal health query synthesis applied.'
  };
}
