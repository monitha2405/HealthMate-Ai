import { isGeminiAvailable, generateText } from './gemini';
import type { BiomarkerNutritionPlan, MedicalValueStatus } from '../../src/types';

interface ClinicalMarkerRule {
  keywords: string[];
  statusTrigger: 'abnormal_high' | 'abnormal_low' | 'any_abnormal';
  clinicalImpact: string;
  recommendedFoods: string[];
  foodsToAvoid: string[];
  recommendedExercises: string[];
  healthPractices: string[];
  lifestyleTip: string;
}

const CLINICAL_KNOWLEDGE_BASE: ClinicalMarkerRule[] = [
  // Vitamin D
  {
    keywords: ['vitamin d', '25-oh', '25-hydroxy', 'cholecalciferol'],
    statusTrigger: 'abnormal_low',
    clinicalImpact: 'Suboptimal Vitamin D impairs calcium absorption, bone mineral density, and immune defense.',
    recommendedFoods: [
      'Fortified milk or fortified plant milks (almond/soy)',
      'Sun-exposed white or portobello mushrooms',
      'Fortified whole-grain cereals',
      'Egg yolks (pasture-raised)',
      'Paneer / Cottage cheese',
      'Fatty fish (salmon, mackerel, sardines - if non-veg)'
    ],
    foodsToAvoid: [
      'Carbonated dark sodas (high phosphoric acid impairs calcium/D absorption)',
      'Excessive caffeine (> 3 cups coffee/day)',
      'Ultra-processed snacks with zero micronutrient density'
    ],
    recommendedExercises: [
      'Outdoor morning brisk walking or jogging (combines UV-B exposure with physical activity)',
      'Weight-bearing resistance exercises (squats, lunges, light dumbbells) to stimulate bone remodeling and calcium uptake',
      'Outdoor yoga or Surya Namaskar sessions between 9:00 AM and 11:30 AM'
    ],
    healthPractices: [
      'Direct sunlight exposure: 15–20 minutes mid-day (10:30 AM – 2:00 PM) on face, arms, and legs without sunscreen',
      'Pair dietary calcium with Vitamin D to maximize gastrointestinal absorption',
      'Consult physician regarding clinical D3 oral supplementation (e.g. 60,000 IU weekly for 8 weeks)'
    ],
    lifestyleTip: 'Get 15–20 minutes of mid-day sun exposure on face and forearms without sunscreen. Discuss D3 supplementation with your physician.'
  },

  // Vitamin B-12
  {
    keywords: ['vitamin b-12', 'vitamin b12', 'cyanocobalamin', 'b12'],
    statusTrigger: 'abnormal_low',
    clinicalImpact: 'Low Vitamin B12 causes neurological tingling, fatigue, poor red blood cell maturation, and cognitive sluggishness.',
    recommendedFoods: [
      'Fresh curd (yogurt) and buttermilk (chaas)',
      'Fortified nutritional yeast (brewer’s yeast)',
      'Sprouted pulses & fermented batter foods (idli/dosa in moderation)',
      'Paneer (cottage cheese) and fortified milk',
      'Boiled whole eggs, poultry, and fish (if non-vegetarian)'
    ],
    foodsToAvoid: [
      'Excessive alcohol consumption (inhibits intrinsic factor and B12 absorption)',
      'Refined white sugar and empty calorie confectionery',
      'Unbalanced strict vegan diets lacking fortification'
    ],
    recommendedExercises: [
      'Moderate aerobic workouts (cycling, brisk walking) 30 mins/day to boost oxygen delivery and combat lethargy',
      'Balance and proprioception training (tai chi, single-leg stands) to support peripheral nervous system health',
      'Low-intensity stretching and breathing exercises to regulate energy levels'
    ],
    healthPractices: [
      'Include probiotic fermented foods (curd, kefir, fermented dal batter) daily to maintain healthy gut microbiota for micronutrient assimilation',
      'Avoid chronic unprescribed antacid / PPI overuse which blunts stomach acid required for B12 cleavage',
      'Discuss sublingual methylcobalamin or physician-administered B12 therapy for rapid neurological recovery'
    ],
    lifestyleTip: 'Prioritize fortified foods and consider sublingual methylcobalamin under medical guidance to restore neurological and blood reserves.'
  },

  // LDL Cholesterol
  {
    keywords: ['ldl', 'ldl cholesterol', 'bad cholesterol', 'low density lipoprotein'],
    statusTrigger: 'abnormal_high',
    clinicalImpact: 'Elevated LDL promotes atherosclerotic plaque deposition in coronary arteries, raising cardiovascular risk.',
    recommendedFoods: [
      'Oats & oat bran (rich in beta-glucan soluble fiber)',
      'Methi (fenugreek) seeds soaked overnight',
      'Walnuts, almonds & roasted flaxseeds',
      'Garlic cloves (crushed in cooking)',
      'Legumes, lentils (dal), and kidney beans (rajma)',
      'Cold-pressed mustard or extra virgin olive oil in moderation'
    ],
    foodsToAvoid: [
      'Vanaspati, hydrogenated palm oils & commercial shortening',
      'Deep-fried street snacks (samosas, pakoras, chips)',
      'Commercial bakery biscuits, puffs & pastries containing trans-fats',
      'Full-fat processed cheeses and butter in excess'
    ],
    recommendedExercises: [
      'Brisk aerobic walking: 40–50 minutes at 60–70% maximum heart rate at least 5 days a week',
      'Cardiorespiratory endurance training: cycling, lap swimming, or elliptical workouts',
      'Moderate resistance circuit training 2–3 days per week to improve insulin sensitivity and lipid clearance'
    ],
    healthPractices: [
      'Consume 10–15g of soluble fiber daily (oats, psyllium husk, chia seeds) to bind intestinal bile acids and excrete circulating cholesterol',
      'Replace all saturated and trans cooking fats with cold-pressed oils',
      'Ensure 7–8 hours of sound restorative sleep to curb nighttime hepatic lipid synthesis'
    ],
    lifestyleTip: 'Aim for 40 minutes of brisk walking 5 days a week and incorporate soaked methi seeds and oats daily to lower circulating LDL.'
  },

  // Total Cholesterol
  {
    keywords: ['total cholesterol', 'serum cholesterol'],
    statusTrigger: 'abnormal_high',
    clinicalImpact: 'High total cholesterol indicates elevated circulating lipids and potential vascular inflammation.',
    recommendedFoods: [
      'Soluble fiber rich foods: psyllium husk (isabgol), barley, oats',
      'Raw chia seeds and ground flaxseeds',
      'Green leafy vegetables (spinach, methi, moringa)',
      'Apples, citrus fruits, and guavas (rich in pectin fiber)'
    ],
    foodsToAvoid: [
      'Fried and re-heated cooking oils',
      'Ultra-processed meats and heavy red meats',
      'Creamy gravies with ghee/butter floats'
    ],
    recommendedExercises: [
      'Daily 30-minute moderate aerobic exercise (brisk walking, swimming, light jogging)',
      'Stair climbing and outdoor walking intervals to enhance lipid oxidation'
    ],
    healthPractices: [
      'Switch entirely to whole grains; replace white rice and maida with millets or brown rice',
      'Take 1 teaspoon of ground flaxseed daily in warm water or salad',
      'Eliminate tobacco and minimize processed food intake'
    ],
    lifestyleTip: 'Switch to whole grains, add ground flaxseed daily, and maintain regular aerobic physical activity.'
  },

  // Triglycerides
  {
    keywords: ['triglyceride', 'triglycerides', 'tg'],
    statusTrigger: 'abnormal_high',
    clinicalImpact: 'Elevated triglycerides correlate with metabolic syndrome, fatty liver, and increased arterial stiffness.',
    recommendedFoods: [
      'Omega-3 rich foods: chia seeds, walnuts, flaxseeds',
      'High-fiber cruciferous vegetables (cauliflower, cabbage, broccoli)',
      'Steamed sprouts chaat with lemon & coriander',
      'Green tea without added sugar'
    ],
    foodsToAvoid: [
      'Refined white sugar, syrups, candies, and packaged sweets',
      'Packaged fruit juices and high-fructose corn syrup beverages',
      'Refined flour (maida) products: naan, white bread, pizzas',
      'Alcoholic beverages'
    ],
    recommendedExercises: [
      'High-Intensity Interval Training (HIIT) or brisk interval walking: 20–30 minutes 3 times a week',
      'Post-dinner walking: 15 minutes of gentle walking after dinner to speed postprandial triglyceride clearance'
    ],
    healthPractices: [
      'Strictly eliminate liquid calories (sugary chai, sodas, packaged juices)',
      'Maintain an eating window of 10–12 hours (intermittent fasting schedule) to encourage hepatic fat utilization',
      'Achieve a modest 5–7% weight loss if overweight'
    ],
    lifestyleTip: 'Cut refined sugars and simple carbs; walk for 15 minutes after dinner to accelerate lipid clearance.'
  },

  // Bilirubin (Liver Function)
  {
    keywords: ['bilirubin', 'total bilirubin', 'direct bilirubin', 'serum bilirubin'],
    statusTrigger: 'abnormal_high',
    clinicalImpact: 'Elevated bilirubin reflects decreased hepatic glucuronidation, impaired biliary flow, or mild hemolysis/Gilbert’s syndrome.',
    recommendedFoods: [
      'Abundant pure hydration (3 to 3.5 liters of clean water daily)',
      'Fresh tender coconut water',
      'Antioxidant-rich Indian gooseberry (Amla) juice or fresh amla',
      'Papaya, watermelon, sweet lime (mosambi), and ripe pomegranates',
      'Boiled beetroot, radish, and steamed carrots',
      'Light yellow moong dal khichdi'
    ],
    foodsToAvoid: [
      'Alcohol in all forms (strains liver detox pathways)',
      'Heavy, deep-fried, oily or overly spicy curries',
      'Stale, fermented, or artificial food-colored items',
      'Excessive unprescribed OTC acetaminophen/paracetamol or pain medications'
    ],
    recommendedExercises: [
      'Gentle low-impact aerobic walking: 20–30 minutes daily in clean morning air',
      'Restorative yoga poses (Pranayama, Balasana, Marjaryasana) to stimulate abdominal blood circulation',
      'Avoid exhausting, high-intensity workouts or extreme heat while liver markers normalize'
    ],
    healthPractices: [
      'Hydration pacing: Drink 1 glass of water every 60–90 minutes throughout waking hours',
      'Avoid prolonged or unguided fasting (benign Gilbert’s syndrome bilirubin spikes during calorie deprivation)',
      'Ensure 8 hours of restful sleep to optimize nightly liver glycogen storage and detox cycles'
    ],
    lifestyleTip: 'Stay continuously hydrated (3L/day), avoid prolonged fasting, and eliminate alcohol to support hepatic clearance.'
  },

  // BUN & Creatinine (Kidney / Hydration)
  {
    keywords: ['bun', 'creatinine', 'urea', 'bun / sr.creatinine ratio', 'bun/creatinine'],
    statusTrigger: 'abnormal_high',
    clinicalImpact: 'Elevated BUN/Creatinine ratio often points to subclinical dehydration, high protein catabolism, or reduced renal filtration.',
    recommendedFoods: [
      'Structured hydration: 2.5–3.5 liters of water spaced evenly across the day',
      'High-water-content vegetables: cucumber, bottle gourd (lauki), ridge gourd (turai)',
      'Fresh coconut water and lemon-infused water',
      'Whole grain porridge and balanced plant-based proteins'
    ],
    foodsToAvoid: [
      'Excessive dietary sodium (> 2,300 mg/day) and salty packaged snacks',
      'Megadose unhydrated protein isolate shakes without adequate fluid intake',
      'Canned soups, pickles, and processed instant noodles'
    ],
    recommendedExercises: [
      'Moderate steady-state exercise: light swimming, cycling, or treadmill walking',
      'Gentle mobility training without causing heavy dehydration or excessive muscle breakdown'
    ],
    healthPractices: [
      'Pre-hydrate with 500 mL of water 30 minutes before any physical exercise',
      'Avoid habitual non-steroidal anti-inflammatory drugs (NSAIDs) which reduce renal blood flow',
      'Monitor blood pressure regularly to protect glomerular vascular beds'
    ],
    lifestyleTip: 'Drink 2.5–3.5L of water daily, limit sodium and salty snacks, and avoid overuse of painkiller medications.'
  },

  // Blood Glucose & HbA1c
  {
    keywords: ['glucose', 'fasting blood sugar', 'fbs', 'ppbs', 'hba1c', 'glycated hemoglobin', 'blood sugar'],
    statusTrigger: 'abnormal_high',
    clinicalImpact: 'Elevated blood glucose indicates insulin resistance or impaired beta-cell regulation, accelerating microvascular stress.',
    recommendedFoods: [
      'Millets: Jowar, Bajra, Ragi, Foxtail millet (lower glycemic index)',
      'Karela (bitter gourd) and methi (fenugreek) leaves',
      'Ceylon cinnamon powder in warm water or tea',
      'Whole legumes with skin (chana, rajma, black gram)',
      'Green salads with apple cider vinegar or lemon dressing before carbs'
    ],
    foodsToAvoid: [
      'Refined white sugars, jaggery in excess, honey syrups',
      'Maida (white flour), bakery buns, white pasta',
      'Sweetened beverages, sodas, and energy drinks',
      'Ultra-ripe tropical fruit juices without dietary pulp'
    ],
    recommendedExercises: [
      'Post-meal walks: 10–15 minutes of gentle walking immediately after lunch and dinner (activates muscle GLUT-4 glucose transporters)',
      'Full-body resistance training (squats, pushups, resistance bands) 3 days a week to expand glycogen storage capacity in skeletal muscle'
    ],
    healthPractices: [
      'Eat salads and protein before carbohydrates at every meal to flatten postprandial glucose curves',
      'Prioritize stress management: chronic cortisol elevations drive hepatic gluconeogenesis and morning fasting blood sugar spikes',
      'Maintain consistent sleep timings to optimize morning insulin sensitivity'
    ],
    lifestyleTip: 'Walk for 10–15 minutes after meals and replace refined grains with millets and whole lentils.'
  },

  // Hemoglobin & Iron (Low)
  {
    keywords: ['hemoglobin', 'hb', 'iron', 'ferritin', 'rbc count', 'pcv'],
    statusTrigger: 'abnormal_low',
    clinicalImpact: 'Subnormal hemoglobin reduces systemic oxygen transport capacity, leading to shortness of breath, pallor, and chronic fatigue.',
    recommendedFoods: [
      'Dark leafy greens (spinach, palak, methi, drumstick leaves/moringa)',
      'Roasted black chana paired with small piece of organic jaggery',
      'Pomegranate, black raisins soaked overnight, dried figs',
      'Beetroot salad with freshly squeezed lemon juice (Vitamin C enhances iron absorption)',
      'Lentils, beans, and sesame seeds'
    ],
    foodsToAvoid: [
      'Tea or coffee immediately with or after meals (polyphenols and tannins bind non-heme iron)',
      'High-calcium antacids taken directly alongside iron-rich meals'
    ],
    recommendedExercises: [
      'Low to moderate-intensity walking and light stretching; avoid heavy anaerobic exhaustion until hemoglobin normalizes',
      'Deep diaphragmatic breathing exercises (Pranayama) to improve oxygenation efficiency'
    ],
    healthPractices: [
      'Always pair non-heme plant iron with Vitamin C (lemon squeeze, amla, bell peppers) to boost absorption by up to 300%',
      'Allow a 2-hour buffer between tea/coffee and iron-rich meals',
      'Consult physician for clinical oral iron supplementation (ferrous bisglycinate / ascorbate)'
    ],
    lifestyleTip: 'Pair iron-rich lentils and greens with fresh lemon juice, and avoid drinking tea or coffee within 2 hours of meals.'
  },

  // TSH (Hypothyroidism)
  {
    keywords: ['tsh', 'thyroid stimulating hormone', 'thyrotropin'],
    statusTrigger: 'abnormal_high',
    clinicalImpact: 'Elevated TSH signals primary hypothyroidism; slowing metabolic rate, fluid retention, and lethargy.',
    recommendedFoods: [
      'Adequately iodized sea salt',
      'Selenium-rich seeds (sunflower seeds, pumpkin seeds, Brazil nuts)',
      'Zinc-rich whole grains and legumes',
      'Cooked cruciferous vegetables (cooking deactivates goitrogenic enzymes)'
    ],
    foodsToAvoid: [
      'Raw, un-steamed cruciferous vegetables in massive quantities (raw cabbage/kale)',
      'Soy products within 4 hours of thyroid hormone medication'
    ],
    recommendedExercises: [
      'Consistent moderate aerobic exercise (brisk walking, swimming) 30–45 mins daily to stimulate metabolic rate',
      'Strength training twice weekly to build lean muscle and counter sluggish thyroid metabolism'
    ],
    healthPractices: [
      'Take thyroid medications (if prescribed) on an empty stomach with plain water at least 45 minutes before food',
      'Maintain consistent sleep rhythms to support pituitary-thyroid axis regulation'
    ],
    lifestyleTip: 'Take thyroid medication on an empty stomach, stay active with daily brisk walking, and thoroughly cook all cruciferous vegetables.'
  },

  // Bilirubin (Total, Direct, Indirect - Liver / Biliary Clearance)
  {
    keywords: ['bilirubin', 'total bilirubin', 'direct bilirubin', 'indirect bilirubin'],
    statusTrigger: 'abnormal_high',
    clinicalImpact: 'Elevated bilirubin reflects reduced liver clearance, biliary sluggishness, or increased red cell turnover.',
    recommendedFoods: [
      'Cruciferous vegetables (steamed broccoli, cabbage, cauliflower) to induce phase II liver detox enzymes',
      'Fresh beetroots and grated carrots (rich in betaine and pectin for bile flow)',
      'Warm lemon water in the morning and brewed green tea',
      'High-fiber pulses, oats, and papayas to facilitate digestive elimination',
      'Turmeric brewed with a pinch of black pepper (enhances hepatic glutathione)'
    ],
    foodsToAvoid: [
      'Strict zero alcohol consumption (prevents toxic hepatocyte stress)',
      'Deep-fried snacks, vanaspati, and heavy creamy gravies',
      'Refined white sugar and high-fructose corn syrups'
    ],
    recommendedExercises: [
      'Moderate low-impact aerobic walking: 30–40 minutes daily to promote hepatic blood flow',
      'Gentle abdominal mobility and twists (such as Ardha Matsyendrasana in yoga) to stimulate liver circulation',
      'Avoid high-intensity exhaustive workouts until liver enzymes and bilirubin stabilize'
    ],
    healthPractices: [
      'Ensure 2.5–3 liters of clean water intake spaced evenly through the day to aid biliary excretion',
      'Avoid self-medicating with hepatotoxic OTC medications (e.g. excessive paracetamol/NSAIDs)',
      'Schedule a follow-up liver function panel (LFT) with your doctor in 4–6 weeks'
    ],
    lifestyleTip: 'Strictly avoid alcohol and fried foods; drink 2.5–3 liters of water with fresh lemon daily, and eat steamed cruciferous vegetables.'
  },

  // Urea / Creatinine Ratio & BUN / Creatinine Ratio (Dehydration & Renal Workload)
  {
    keywords: ['urea / sr.creatinine', 'bun / sr.creatinine', 'urea / creatinine', 'bun / creatinine', 'urea', 'bun'],
    statusTrigger: 'abnormal_high',
    clinicalImpact: 'An elevated BUN or Urea to Creatinine ratio typically indicates pre-renal dehydration, high catabolic stress, or excessive dietary protein relative to fluid intake.',
    recommendedFoods: [
      'Hydration-dense vegetables (bottle gourd/lauki, cucumber, zucchini, ridge gourd)',
      'Fresh tender coconut water (natural isotonic electrolytes)',
      'Barley water and fresh strained vegetable soups',
      'Moderate plant-based proteins (yellow moong dal) rather than heavy concentrates',
      'Fresh seasonal watermelons, melons, and citrus fruits'
    ],
    foodsToAvoid: [
      'Concentrated whey isolate protein shakes without adequate hydration volume',
      'High-sodium packaged snacks, chips, and salty papads',
      'Excessive caffeinated beverages (energy drinks, strong espresso) which act as diuretics'
    ],
    recommendedExercises: [
      'Low to moderate-intensity walking, cycling, or light swimming in comfortable temperatures',
      'Gentle stretching and mobility routines',
      'Avoid heavy anaerobic resistance sessions in hot environments without immediate electrolyte rehydration'
    ],
    healthPractices: [
      'Paced hydration protocol: drink 200–250 mL of water every 60–90 minutes throughout waking hours',
      'Monitor morning urine color (target pale clear straw yellow)',
      'Discuss results with your physician to evaluate kidney hydration dynamics'
    ],
    lifestyleTip: 'Increase fluids with coconut water and barley water; pace your hydration evenly and avoid excessive concentrated protein powders.'
  },

  // MCHC & Red Cell Indices (Low MCHC / Hypochromia)
  {
    keywords: ['mchc', 'mean corp.hemo.conc', 'mch'],
    statusTrigger: 'abnormal_low',
    clinicalImpact: 'Subnormal MCHC indicates reduced hemoglobin density within erythrocytes, commonly seen in early iron-deficiency microcytic states.',
    recommendedFoods: [
      'Dark green leafy vegetables (spinach, methi, drumstick/moringa leaves)',
      'Roasted black chana paired with a small piece of organic jaggery',
      'Beetroot and carrot salad dressed with freshly squeezed lemon juice (Vitamin C triples iron uptake)',
      'Pomegranate, soaked black raisins, and dried figs (anjeer)',
      'Sprouted lentils, beans, and sesame seeds'
    ],
    foodsToAvoid: [
      'Drinking strong chai (tea) or coffee within 60 minutes of meals (tannins inhibit mineral absorption)',
      'Refined white flour bakery products with depleted micronutrient profiles'
    ],
    recommendedExercises: [
      'Consistent daily 30-minute moderate brisk walking to stimulate bone marrow erythropoiesis',
      'Diaphragmatic breathing exercises (Pranayama) to optimize oxygen delivery to peripheral tissues'
    ],
    healthPractices: [
      'Cook acidic curries in seasoned cast-iron skillets to naturally enrich food with bioavailable iron',
      'Always combine plant-based iron foods with Vitamin C (lemon squeeze, amla, bell peppers)',
      'Consult your physician to verify serum ferritin and consider oral iron supplementation'
    ],
    lifestyleTip: 'Add fresh lemon juice to lentils and spinach to multiply iron absorption, and avoid tea around meal times.'
  },

  // RDW (Red Cell Distribution Width) - High
  {
    keywords: ['rdw', 'rdw-sd', 'rdw-cv', 'red cell distribution width'],
    statusTrigger: 'abnormal_high',
    clinicalImpact: 'High RDW indicates high variation in red blood cell dimensions (anisocytosis), often reflecting concurrent or resolving nutritional deficiencies (iron, B12, folate).',
    recommendedFoods: [
      'Sprouted moong and mixed legume salads',
      'Nuts and seeds (walnuts, almonds, chia seeds, roasted flaxseeds)',
      'Fortified nutritional yeast and fresh curd (probiotics + B-vitamins)',
      'Citrus fruits (oranges, mosambi, Indian gooseberry/amla)'
    ],
    foodsToAvoid: [
      'Refined sugars and ultra-processed snacks that deplete micronutrient stores',
      'Excessive alcohol intake which impairs bone marrow blood cell maturation'
    ],
    recommendedExercises: [
      'Consistent aerobic walking or light jogging 30–40 mins, 4–5 days weekly',
      'Full-body functional stretching and yoga'
    ],
    healthPractices: [
      'Ensure comprehensive multivitamin and mineral sufficiency, particularly Vitamin B12 and folate',
      'Schedule a complete hemogram (CBC) recheck with your doctor in 8–12 weeks'
    ],
    lifestyleTip: 'Address both iron and Vitamin B-complex status through balanced nutrition with dark greens, sprouts, and curd.'
  },

  // Platelet Indices (PDW / PLCR - Platelet Distribution Width & Large Cell Ratio)
  {
    keywords: ['pdw', 'platelet distribution width', 'plcr', 'platelet to large cell ratio', 'platelet'],
    statusTrigger: 'any_abnormal',
    clinicalImpact: 'Variations in platelet distribution width reflect platelet maturation kinetics and bone marrow thrombopoiesis rate.',
    recommendedFoods: [
      'Papaya fruit and fresh kiwi (naturally rich in platelet-supporting enzymes and micronutrients)',
      'Indian gooseberry (amla) and fresh berries for bioflavonoids',
      'Pumpkin seeds and sunflower seeds (rich in zinc and Vitamin K)',
      'Steamed green leafy vegetables (spinach, kale, moringa)'
    ],
    foodsToAvoid: [
      'Alcoholic drinks and tobacco smoke (damages vascular endothelium)',
      'Re-heated refined vegetable oils and trans fats'
    ],
    recommendedExercises: [
      'Regular moderate exercise: 30 minutes of jogging, brisk walking, or cycling',
      'Bodyweight resistance exercises (squats, lunges) to promote healthy circulation'
    ],
    healthPractices: [
      'Maintain 7–8 hours of consistent, restorative sleep for healthy hematopoietic cell turnover',
      'Avoid taking unprescribed anti-inflammatory or antiplatelet drugs without physician advice'
    ],
    lifestyleTip: 'Support vascular and platelet health with vitamin C-rich fruits (amla, papaya, kiwi) and consistent sleep.'
  },

  // Lymphocytes & White Blood Cells (High Lymphocyte Percentage)
  {
    keywords: ['lymphocyte', 'lymphocytes', 'lymphocyte percentage'],
    statusTrigger: 'abnormal_high',
    clinicalImpact: 'Mildly elevated lymphocyte percentage frequently indicates an active, recent, or resolving immune response or adaptive physiological recovery.',
    recommendedFoods: [
      'Warm immunity teas brewed with crushed ginger, holy basil (tulsi), and turmeric',
      'Probiotic-rich plain curd, homemade kefir, or traditional buttermilk (chaas)',
      'Fresh garlic crushed and lightly sautéed in foods (allicin content)',
      'Citrus fruits (amla, oranges, guavas) high in natural Vitamin C',
      'Zinc-rich pumpkin seeds and chickpeas'
    ],
    foodsToAvoid: [
      'Refined table sugar and high-sugar desserts (temporarily suppresses immune phagocytosis)',
      'Processed fast foods with artificial preservatives and industrial colorings'
    ],
    recommendedExercises: [
      'Gentle to moderate aerobic workouts (20–30 mins walking, light cycling)',
      'Avoid high-intensity exhaustive overtraining until white blood cell differentials normalize'
    ],
    healthPractices: [
      'Prioritize 8 hours of uninterrupted nocturnal sleep to facilitate immune memory consolidation',
      'Practice deep breathing or mindfulness meditation to lower cortisol levels'
    ],
    lifestyleTip: 'Support immune recovery with probiotic curd, warm turmeric water, and 8 hours of restorative sleep.'
  },

  // Monocytes (Absolute Count) - Low
  {
    keywords: ['monocyte', 'monocytes', 'monocytes - absolute count'],
    statusTrigger: 'abnormal_low',
    clinicalImpact: 'Mildly reduced circulating monocytes can occur transiently under acute physiological stress or post-viral recovery.',
    recommendedFoods: [
      'Colorful antioxidant vegetables (red bell peppers, carrots, tomatoes, purple cabbage)',
      'Extra virgin olive oil and cold-pressed mustard oil in moderation',
      'Warm broths, lentil stews, and herbal teas with clove and cinnamon',
      'Mixed raw nuts (almonds, walnuts) providing natural Vitamin E'
    ],
    foodsToAvoid: [
      'Unpasteurized dairy or unhygienic raw street food while immune defenses are suboptimal',
      'Excessive consumption of refined commercial confectionery'
    ],
    recommendedExercises: [
      'Regular low-impact cardiovascular conditioning (brisk walking 30 mins/day)',
      'Gentle mobility and restorative stretching'
    ],
    healthPractices: [
      'Maintain good food hygiene and frequent hand washing',
      'Prioritize rest and stress reduction to support healthy leukocyte production'
    ],
    lifestyleTip: 'Protect immunity by consuming colorful antioxidant vegetables, practicing good food hygiene, and resting adequately.'
  },

  // Blood Glucose & Average Glucose (ABG) - Low / Suboptimal
  {
    keywords: ['abg', 'average blood glucose', 'glucose'],
    statusTrigger: 'abnormal_low',
    clinicalImpact: 'Low average blood glucose may reflect extended fasting windows, reactive hypoglycemia, or insufficient complex carbohydrate replenishment.',
    recommendedFoods: [
      'Complex slow-digesting carbohydrates: steel-cut oats, brown rice, whole wheat rotis, sweet potatoes',
      'Protein-carb pairings: roasted chana with a handful of almonds or walnuts',
      'Lentil soups (dal) with vegetables and a teaspoon of cold-pressed oil',
      'Whole fresh apples, pears, and guavas with their edible skin'
    ],
    foodsToAvoid: [
      'Skipping scheduled meals or prolonged unbuffered fasting',
      'Isolated high-glycemic sweets or sugary sodas that trigger rapid insulin surges followed by reactive sugar drops'
    ],
    recommendedExercises: [
      'Schedule workouts 45–60 minutes after consuming a balanced snack or meal',
      'Avoid high-intensity aerobic exercise while in a fasting state'
    ],
    healthPractices: [
      'Eat balanced smaller meals every 3.5–4 hours to maintain steady plasma glucose levels',
      'Keep a portable healthy snack (such as roasted chana and almonds) available during busy days'
    ],
    lifestyleTip: 'Prevent blood sugar dips by eating complex carbohydrates paired with protein every 3–4 hours.'
  }
];

export async function generateBiomarkerNormalizationPlans(
  abnormalValues: Array<{
    name: string;
    value: number;
    unit: string;
    referenceRange?: string;
    status: string;
  }>
): Promise<BiomarkerNutritionPlan[]> {
  if (!abnormalValues || abnormalValues.length === 0) {
    return [];
  }

  const plans: BiomarkerNutritionPlan[] = [];
  const processedKeys = new Set<string>();

  for (const item of abnormalValues) {
    const rawName = item.name.toLowerCase().trim();
    const dedupKey = rawName.replace(/[^a-z0-9]/g, '');
    if (processedKeys.has(dedupKey)) continue;
    processedKeys.add(dedupKey);

    const statusNorm: MedicalValueStatus =
      item.status === 'abnormal_high' ? 'abnormal_high' :
      item.status === 'abnormal_low' ? 'abnormal_low' : 'abnormal_high';

    const matchedRule = CLINICAL_KNOWLEDGE_BASE.find(rule => {
      const matchKeyword = rule.keywords.some(kw => rawName.includes(kw) || kw.includes(rawName));
      if (!matchKeyword) return false;
      if (rule.statusTrigger === 'any_abnormal') return true;
      return rule.statusTrigger === statusNorm;
    });

    if (matchedRule) {
      plans.push({
        biomarkerName: item.name,
        observedValue: Number(item.value),
        unit: item.unit,
        referenceRange: item.referenceRange,
        status: statusNorm,
        clinicalImpact: matchedRule.clinicalImpact,
        recommendedFoods: matchedRule.recommendedFoods,
        foodsToAvoid: matchedRule.foodsToAvoid,
        recommendedExercises: matchedRule.recommendedExercises,
        healthPractices: matchedRule.healthPractices,
        lifestyleTip: matchedRule.lifestyleTip
      });
    } else {
      plans.push(buildDefaultPlan(item, statusNorm));
    }
  }

  return plans;
}

function buildDefaultPlan(item: any, statusNorm: MedicalValueStatus): BiomarkerNutritionPlan {
  const isHigh = statusNorm === 'abnormal_high';
  return {
    biomarkerName: item.name,
    observedValue: Number(item.value),
    unit: item.unit,
    referenceRange: item.referenceRange,
    status: statusNorm,
    clinicalImpact: `${item.name} is currently ${isHigh ? 'elevated above' : 'depleted below'} standard laboratory reference thresholds.`,
    recommendedFoods: [
      'Nutrient-dense whole grains and pulses',
      'Antioxidant-rich fresh seasonal vegetables and fruits',
      'Adequate hydration (2.5 - 3 liters daily)'
    ],
    foodsToAvoid: [
      'Ultra-processed convenience foods with artificial additives',
      'Excessive refined sugars, trans fats, and excess dietary sodium'
    ],
    recommendedExercises: [
      '30 minutes of moderate cardiovascular aerobic exercise (brisk walking, swimming, cycling)',
      'Post-meal gentle walking (10-15 minutes) to optimize metabolic processing'
    ],
    healthPractices: [
      'Ensure 2.5–3 liters of clean water intake spaced evenly through the day',
      'Prioritize 7–8 hours of sound sleep and manage mental stress'
    ],
    lifestyleTip: 'Bring this report to your medical specialist or primary care provider to establish targeted monitoring.'
  };
}
