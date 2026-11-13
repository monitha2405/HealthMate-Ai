import { generateText, isGeminiAvailable } from '../gemini';

export interface KnowledgeAgentInput {
  query: string;
  userProfile?: any;
}

export interface KnowledgeAgentOutput {
  response: string;
  toolsCalled: string[];
  safetyNotes: string;
}

const COMMON_HEALTH_TOPICS: Array<{
  keywords: string[];
  title: string;
  content: string;
}> = [
  // Vitamin B12
  {
    keywords: ['b12', 'vitamin b12', 'vitamin b-12', 'cobalamin', 'cyanocobalamin', 'methylcobalamin'],
    title: 'How to Safely and Effectively Increase Vitamin B12',
    content: `Vitamin B12 (cobalamin) is an essential micronutrient vital for red blood cell formation, neurological integrity, DNA synthesis, and cellular energy metabolism. Because B12 is synthesized by microorganisms and predominantly found in animal products, vegetarians and vegans must be especially proactive.

### 🥗 1. Dietary Sources to Boost B12
* **Dairy & Fermented Products:** Plain fresh curd (yogurt), paneer (cottage cheese), buttermilk (chaas), and fortified cow's milk.
* **Fortified Plant Foods:** Fortified nutritional yeast (1–2 tablespoons provide more than 100% of daily RDA), fortified soy or almond milks, and fortified whole-grain cereals.
* **Eggs & Poultry (if non-vegetarian):** Whole pasture-raised eggs, chicken breast, salmon, and mackerel.

### 🔬 2. Key Absorption Factors
* **Stomach Acid & Intrinsic Factor:** B12 requires adequate gastric acid and intrinsic factor produced in the stomach to be cleaved and absorbed in the terminal ileum. Chronic overuse of antacids or PPIs can blunt absorption.
* **Gut Health:** Probiotic foods (curd, fermented batter) support healthy gut mucosa for optimal nutrient assimilation.

### 💊 3. Supplementation Protocols (Under Medical Guidance)
* **Oral or Sublingual Methylcobalamin:** Sublingual tablets dissolve under the tongue and absorb directly through the oral mucosa, bypassing gastrointestinal absorption hurdles.
* **Dosage Guidance:** Maintenance doses typically range from 500 to 1,500 mcg daily or weekly as directed by your physician.
* **Injectable B12:** Recommended by physicians when severe deficiency or neurological symptoms (numbness, tingling) are present.

### ⏱️ 4. Recommended Monitoring
* Retest serum Vitamin B12 and a Complete Blood Count (CBC) in 8–12 weeks to ensure normalization.`
  },

  // Vitamin D
  {
    keywords: ['vitamin d', 'vitamin d3', 'cholecalciferol', 'd3', 'sunlight'],
    title: 'How to Increase and Maintain Optimal Vitamin D Levels',
    content: `Vitamin D functions as a secosteroid hormone regulating calcium homeostasis, bone mineral density, immune defense, and mood regulation.

### ☀️ 1. Sunlight Exposure Protocol
* **Timing:** Expose arms, face, and legs to mid-day sunlight (between 10:30 AM and 2:00 PM) for 15–20 minutes without sunscreen, 3–4 times a week.
* **Synthesis:** UV-B rays trigger the conversion of 7-dehydrocholesterol in the skin into cholecalciferol (Vitamin D3).

### 🥗 2. Dietary Sources
* **Fortified Foods:** Fortified milks, fortified plant milks, and fortified whole grains.
* **Sun-Exposed Mushrooms:** Button or portobello mushrooms placed in sunlight before cooking produce natural Vitamin D2.
* **Dairy & Eggs:** Whole eggs (yolks contain the vitamin), paneer, and fortified ghee.

### 💊 3. Therapeutic Supplementation
* Standard clinical replenishment for deficiency often involves oral Cholecalciferol (e.g. 60,000 IU once weekly for 8 weeks), followed by monthly maintenance under medical supervision.`
  },

  // Iron & Hemoglobin
  {
    keywords: ['iron', 'hemoglobin', 'ferritin', 'anemia', 'anaemia', 'hb'],
    title: 'How to Increase Iron and Hemoglobin Naturally',
    content: `Iron is the core element of hemoglobin, which binds oxygen in the lungs and delivers it to tissues throughout your body.

### 🥗 1. High-Iron Whole Foods
* **Plant-Based (Non-Heme Iron):** Dark leafy greens (spinach, moringa/drumstick leaves, methi), roasted black chana, beetroot, pomegranate, soaked raisins, dried figs, and sesame seeds.
* **Cooking Tip:** Cooking acidic gravies in cast-iron skillets increases bioavailable iron content.

### 🍋 2. Absorption Enhancers vs Inhibitors
* **Always Pair with Vitamin C:** Squeezing fresh lemon juice over lentils or spinach can triple non-heme iron absorption.
* **Avoid Tannins Around Meals:** Do NOT drink tea (chai) or coffee within 60–90 minutes of iron-rich meals, as tannins and polyphenols bind iron and inhibit absorption.`
  },

  // Energy & Fatigue
  {
    keywords: ['energy', 'fatigue', 'tired', 'tiredness', 'exhaust', 'letharg'],
    title: 'Evidence-Based Strategies to Boost Daily Energy and Combat Fatigue',
    content: `Chronic tiredness and afternoon energy crashes typically stem from a combination of nutritional deficiencies, sleep architecture, and metabolic pacing.

### ⚡ 1. Practical Energy Recovery Steps
* **Screen Key Biomarkers:** Rule out common deficiencies including Vitamin D3, Vitamin B12, serum Ferritin, and thyroid hormones (TSH).
* **Hydration Pacing:** Mild dehydration (even 1.5% body water loss) triggers daytime fatigue, headaches, and brain fog. Drink a glass of water every 90 minutes.
* **Balanced Blood Sugar Meals:** Avoid isolated refined carbohydrates (white bread, sugar) that cause rapid spikes and reactive crashes. Pair complex carbs with protein and healthy fats.
* **Daily Outdoor Movement:** A 20–30 minute brisk walk in morning light resets your circadian rhythm and boosts dopamine and cortisol at the appropriate times.`
  },

  // Sleep Quality
  {
    keywords: ['sleep', 'insomnia', 'asleep', 'wake up', 'restless'],
    title: 'Evidence-Based Protocols for Restorative, Deep Sleep',
    content: `Quality sleep is essential for hormonal regulation, muscle protein synthesis, immune memory consolidation, and cardiovascular recovery.

### 🌙 1. Sleep Hygiene Protocol
* **Consistent Sleep Window:** Go to bed and wake up at the exact same times every day (even on weekends) to anchor your circadian rhythm.
* **Digital Sunset:** Discontinue screens and smartphones 60 minutes before bed, or use warm amber night filters to allow natural melatonin production.
* **Caffeine Cutoff:** Eliminate caffeinated drinks (coffee, dark tea, energy drinks) at least 8 hours before bedtime.
* **Cool, Dark Environment:** Keep your bedroom slightly cool (around 19–21°C) and completely dark.`
  }
];

export async function runKnowledgeAgent(input: KnowledgeAgentInput): Promise<KnowledgeAgentOutput> {
  const { query } = input;
  const lower = query.toLowerCase();

  // Try live Gemini generation first for open-ended, tailored answers
  if (isGeminiAvailable()) {
    try {
      const prompt = `You are HealthMate AI's Personal Health Knowledge Specialist.
The user is asking: "${query}"

CRITICAL INSTRUCTIONS:
1. Provide a direct, thorough, and highly informative answer to the user's specific health question.
2. Structure your response clearly with helpful headings:
   - Practical dietary recommendations (therapeutic whole foods, specific ingredients)
   - Lifestyle habits, absorption factors, or daily physical practices
   - Safe supplementation guidelines and what to discuss with a healthcare provider
3. Keep the tone empathetic, practical, and evidence-based.
4. At the very end of your answer, include this exact warning text:
> ⚠️ **Health Guidance Notice:** This information is provided for educational and wellness support. Please consult your physician or registered dietitian before starting high-dose supplements or altering medical treatments.`;

      const result = await generateText({
        prompt,
        systemInstruction: 'You are an evidence-based clinical healthcare assistant. Provide comprehensive, helpful, practical answers to personal health questions, always including the standard health guidance notice.'
      });

      return {
        response: result.text,
        toolsCalled: [],
        safetyNotes: 'Evidence-based health knowledge delivered.'
      };
    } catch (e) {
      console.warn('Knowledge agent Gemini error, using rich clinical fallback:', e);
    }
  }

  // Check matching common health topics
  const matchedTopic = COMMON_HEALTH_TOPICS.find(t =>
    t.keywords.some(kw => lower.includes(kw))
  );

  if (matchedTopic) {
    const response = `## ${matchedTopic.title}\n\n${matchedTopic.content}\n\n---\n> ⚠️ **Health Guidance Notice:** This information is provided for educational and wellness support. Please consult your physician or registered dietitian before starting high-dose supplements or altering medical treatments.`;
    return {
      response,
      toolsCalled: [],
      safetyNotes: `Grounded clinical topic synthesized for: ${matchedTopic.title}`
    };
  }

  // General helpful medical knowledge responder (never an evasive refusal)
  const generalResponse = `### Evidence-Based Health Guidance: "${query}"

When addressing this health and wellness objective, medical science emphasizes a multi-factor approach combining targeted nutrition, metabolic habits, and regular clinical monitoring:

1. **Targeted Nutrition & Micronutrient Sufficiency:**
   * Prioritize whole, unprocessed foods rich in essential vitamins, bioavailable minerals, and dietary antioxidants.
   * Ensure balanced macronutrient distribution (adequate lean protein, complex slow-digesting carbohydrates, and heart-healthy unsaturated fats).

2. **Daily Physical Activity & Metabolic Circulation:**
   * Engage in at least 30 minutes of moderate aerobic activity (brisk walking, cycling) 5 days weekly to promote cardiovascular perfusion and nutrient delivery.
   * Include 2–3 sessions of strength or mobility exercises to maintain lean mass and bone density.

3. **Restorative Lifestyle Protocols:**
   * Maintain consistent 7–8 hour sleep schedules to support hormonal regulation and cellular regeneration.
   * Practice paced hydration (2.5 to 3 liters of water daily).

4. **Next Steps with Your Healthcare Provider:**
   * Review recent blood panels (such as Complete Blood Count, metabolic panel, and vitamin levels) to correlate lifestyle adjustments with your objective biological baseline.

---
> ⚠️ **Health Guidance Notice:** This information is provided for educational and wellness support. Please consult your physician or registered dietitian before starting high-dose supplements or altering medical treatments.`;

  return {
    response: generalResponse,
    toolsCalled: [],
    safetyNotes: 'General evidence-based clinical guidance delivered with standard health notice.'
  };
}
