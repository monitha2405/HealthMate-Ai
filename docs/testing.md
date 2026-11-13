# Testing & Quality Assurance Documentation

## 1. Automated Test Framework
HealthMate AI utilizes **Vitest** for fast unit and integration testing.

```bash
# Run the complete test suite
npm run test
```

## 2. Test Suites Summary

### A. Authentication & Security Audit (`tests/auth.test.ts`)
- Rejection of missing Authorization header (401)
- Rejection of non-Bearer schemes (401)
- Rejection of malformed JWT strings (401)
- Rejection of prohibited `guest-session-*` legacy tokens (401)
- Rejection of legacy `demo-academic-token` (401)
- Rejection of `demo-session-*` tokens (401)
- Rejection of expired tokens (401)
- Acceptance of valid anonymous Firebase tokens (200)
- Validation that request body UIDs cannot override verified identity
- Anonymous guests forbidden from admin endpoints (403)
- Fail-closed behavior for unconfigured administrators (403)

### B. Medical Safety & Deterministic Tools (`tests/safety.test.ts`)
- Detection of crushing chest pain emergency patterns
- Detection of acute stroke and respiratory distress symptoms
- Accurate intent classification to Document, Trend, and Nutrition agents
- Mathematical verification of BMI calculation and risk categorization
- Validation of Mean Arterial Pressure (MAP) formula
- Verification that diastolic pressure >= systolic is rejected
- Biomarker evaluation of fasting glucose intervals

### C. RAG, Vector Similarity & Reset (`tests/rag.test.ts`)
- Verification that identical vectors yield cosine similarity of 1.0
- Verification that orthogonal vectors yield cosine similarity of 0.0
- Protection against division by zero in zero-magnitude vectors
- Overlapping sliding-window chunking
- Guest reset multi-table purge verification with zero crosstalk to other users

### D. 40+ LLM Benchmark Suite (`tests/evaluation.test.ts`)
- Automated verification of 40 evaluation benchmark cases across routing, safety, tools, and RAG.
