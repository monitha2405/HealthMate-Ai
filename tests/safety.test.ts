import { describe, it, expect } from 'vitest';
import { detectEmergency, classifyIntent } from '../server/services/agents/orchestrator';
import { executeTool } from '../server/services/tools';

describe('Medical Safety & Deterministic Tool Tests', () => {
  it('1. Detects acute crushing chest pain emergency', () => {
    expect(detectEmergency('Patient is having severe crushing chest pain')).toBe(true);
    const classification = classifyIntent('Severe crushing chest pain radiating to my neck');
    expect(classification.intent).toBe('emergency');
    expect(classification.agent).toBe('Emergency Safety Interceptor');
  });

  it('2. Detects acute stroke signs emergency', () => {
    expect(detectEmergency('My father has sudden arm numbness and facial drooping')).toBe(true);
  });

  it('3. Detects severe shortness of breath emergency', () => {
    expect(detectEmergency('I have severe trouble breathing')).toBe(true);
  });

  it('4. Classifies medical lab report query to Document Agent', () => {
    const classification = classifyIntent('What does my blood test report say about my HbA1c?');
    expect(classification.intent).toBe('document');
    expect(classification.agent).toBe('Health Document Agent');
  });

  it('5. Classifies nutrition query to Nutrition Agent', () => {
    const classification = classifyIntent('Suggest a high protein vegetarian Indian dinner');
    expect(classification.intent).toBe('nutrition');
    expect(classification.agent).toBe('Nutrition Agent');
  });

  it('6. Classifies trend query to Trend Agent', () => {
    const classification = classifyIntent('Compare my historical weight trend over time');
    expect(classification.intent).toBe('trend');
    expect(classification.agent).toBe('Health Trend Analysis Agent');
  });

  it('7. Deterministic BMI tool calculates exact value and category', async () => {
    const res = await executeTool('calculateBMI', { weightKg: 70, heightCm: 175 });
    expect(res.bmi).toBe(22.9);
    expect(res.category).toBe('Normal weight');
  });

  it('8. Deterministic BMI tool throws on invalid non-positive inputs', async () => {
    await expect(executeTool('calculateBMI', { weightKg: -5, heightCm: 175 })).rejects.toThrow();
  });

  it('9. Deterministic MAP calculation formula', async () => {
    const res = await executeTool('calculateMeanArterialPressure', { systolic: 120, diastolic: 80 });
    // MAP = 80 + (120-80)/3 = 93.3
    expect(res.map).toBe(93.3);
  });

  it('10. MAP calculation rejects diastolic greater than systolic', async () => {
    await expect(executeTool('calculateMeanArterialPressure', { systolic: 80, diastolic: 120 })).rejects.toThrow();
  });

  it('11. Deterministic lab evaluation accurately tags abnormal high glucose', async () => {
    const res = await executeTool('evaluateLabReference', { testName: 'glucose_fasting', value: 135 });
    expect(res.status).toBe('abnormal_high');
    expect(res.unit).toBe('mg/dL');
  });
});
