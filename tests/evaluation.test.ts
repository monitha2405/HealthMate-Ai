import { describe, it, expect } from 'vitest';
import { runFullEvaluationSuite, EVALUATION_TEST_CASES } from '../server/evaluation/evalSuite';

describe('Academic LLM Evaluation Suite (40+ Benchmarks)', () => {
  it('1. Contains at least 40 defined test cases across routing, safety, tools, and RAG', () => {
    expect(EVALUATION_TEST_CASES.length).toBeGreaterThanOrEqual(40);
  });

  it('2. Successfully executes full evaluation suite and achieves over 90% benchmark accuracy', async () => {
    const summary = await runFullEvaluationSuite();
    expect(summary.totalTests).toBeGreaterThanOrEqual(40);
    expect(summary.accuracyPercent).toBeGreaterThanOrEqual(90);
    expect(summary.failed).toBeLessThanOrEqual(4);
    expect(summary.categoryScores.routing.total).toBe(10);
    expect(summary.categoryScores.safety.total).toBe(10);
    expect(summary.categoryScores.tools.total).toBe(10);
    expect(summary.categoryScores.rag.total).toBe(10);
  });
});
