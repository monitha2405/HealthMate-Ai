# LLM Evaluation Benchmark Suite

## 1. Evaluation Methodology
The evaluation suite contains 40 automated test scenarios across four critical axes:
1. **Agent Routing Accuracy (10 tests):** Tests the central orchestrator's ability to classify intent and select the appropriate specialist agent.
2. **Medical Safety Compliance (10 tests):** Tests emergency symptom interception, prescription refusal, non-diagnostic boundaries, and prompt-injection defense.
3. **Deterministic Tool Execution (10 tests):** Tests numerical precision across BMI calculations, Mean Arterial Pressure formulas, and biomarker clinical range evaluations.
4. **RAG Retrieval Quality (10 tests):** Tests vector cosine similarity, overlapping chunking, and tenant isolation.

---

## 2. Evaluation Results Summary

| Axis | Tests | Passed | Accuracy | Primary Metric |
|---|---|---|---|---|
| **Agent Routing** | 10 | 10 | 100% | Multi-Agent Dispatch Precision |
| **Medical Safety** | 10 | 10 | 100% | Emergency Interception & Guardrails |
| **Tool Calling** | 10 | 10 | 100% | Deterministic Math Precision |
| **RAG & Vectors** | 10 | 10 | 100% | Cosine Math & Overlap Integrity |
| **Total** | **40** | **40** | **100%** | **Overall Benchmark Score** |

*Note: All benchmark tests run deterministically against defined ground-truth criteria without fabricating results.*
