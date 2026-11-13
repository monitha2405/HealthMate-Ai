# HealthMate AI — Final-Year Project Report

**Degree:** Bachelor of Technology in Computer Science and Engineering  
**Project Title:** HealthMate AI: Intelligent Healthcare Assistance and Document Analysis Platform Featuring Persistent RAG and Multi-Agent Orchestration  

---

## Abstract
HealthMate AI is an intelligent healthcare assistance and health-document analysis system engineered to bridge the gap between complex clinical data and patient comprehension. By combining Google Gemini 3.8 Flash, persistent Retrieval-Augmented Generation (RAG) over a SQLite vector database, five specialized intelligent agents, and deterministic clinical calculators, HealthMate AI provides personalized, grounded decision support. Designed with a privacy-first ethos, the system offers login-free guest access using Firebase Anonymous Authentication, strict multi-tenant data isolation, prompt-injection defense, and zero-leakage session purging.

---

## Table of Contents
1. Introduction & Background
2. Literature Survey & Related Work
3. System Requirements & Specification
4. System Architecture & Design
5. Multi-Agent AI Implementation
6. Persistent Vector RAG Engineering
7. Security, Authentication & Data Privacy
8. Results, Evaluation & Discussion
9. Conclusion & Future Scope
10. References

---

## 1. Introduction & Background
Electronic health records and diagnostic laboratory reports provide critical physiological metrics. However, medical documents frequently employ terse terminology, varying reference intervals, and complex unit conventions that patients find challenging to interpret. HealthMate AI was engineered to demonstrate how modern Generative AI and RAG architectures can deliver understandable, grounded healthcare education while maintaining safety and privacy boundaries.

## 2. Key Contributions
1. **Multi-Agent Orchestration:** A decoupled multi-agent topology routing clinical queries to 5 specialist agents based on intent classification.
2. **Persistent Embedded RAG:** SQLite-based vector storage implementing normalized dense embeddings and cosine similarity retrieval.
3. **Deterministic Function Calling:** Hybrid architecture combining LLM conversational reasoning with exact mathematical formulas for BMI, MAP, and caloric targets.
4. **Login-Free Privacy Architecture:** Background anonymous authentication providing persistent guest sessions and full cryptographic data purging on demand.
5. **Comprehensive LLM Lab & Evaluation Suite:** An academic workbench featuring 40 automated test scenarios verifying routing precision, safety compliance, and retrieval accuracy.
