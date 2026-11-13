# HealthMate AI — Intelligent Healthcare Assistant & Clinical Document Analysis

> **Architecture:** PostgreSQL 16 (Standard JSONB Embeddings — No pgvector, No Docker, No WSL Required)  
> **AI Engine:** Official Google GenAI SDK (`@google/genai` / Gemini 1.5 Flash & text-embedding-004)  
> **Session Security:** Cryptographic Login-Free Automatic Guest Sessions with HttpOnly Cookies  
> **Medical Disclaimer:** HealthMate AI is an educational decision-support platform designed to demonstrate Large Language Model architectures, application-layer cosine vector Retrieval-Augmented Generation (RAG), and multi-agent coordination. It does **not** provide clinical diagnosis, prescribe medication, or offer emergency triage. Always consult qualified healthcare professionals.

---

## 1. System Architecture Overview

HealthMate AI is an end-to-end full-stack healthcare assistance platform designed to run natively on Windows 10/11 using standard, accessible developer tools:

```
+--------------------------------------------------------------------------------------------------+
|                                    CLIENT APPLICATION (Browser)                                  |
|  React 18 + TypeScript + Vite + Tailwind CSS + Lucide Icons + Recharts Analytics                 |
+--------------------------------------------------------------------------------------------------+
                                                │
                                    REST APIs / HttpOnly Cookies
                                                ▼
+--------------------------------------------------------------------------------------------------+
|                                    NODE.JS & EXPRESS BACKEND                                     |
|  • Express Router & Zod Input Validation & Middleware Rate Limiting                              |
|  • Cryptographic Guest Session Engine (SHA-256 Hashed Tokens, HttpOnly Cookie)                   |
|  • Central Multi-Agent Orchestrator (Intent Classifier, Tool Dispatcher, Safety Guardrails)     |
|  • Application-Layer Cosine Similarity Engine (High-Performance Vector Math in Node.js)          |
+---------------------------------------┬───────────────────────────────┬--------------------------+
                                        │                               │
                                        ▼                               ▼
+-----------------------------------------------+   +----------------------------------------------+
|             POSTGRESQL 16 DATABASE            |   |               GOOGLE GEMINI AI               |
|  • 16 Normalized Tables + Foreign Key Cascades|   |  • Gemini 1.5 Flash (Generative Responses)   |
|  • JSONB Storage for Real 768-dim Embeddings  |   |  • text-embedding-004 (Vector Embeddings)    |
|  • Multi-table Atomic Reset Transactions      |   |  • Configurable Model Names via .env         |
|  • Zero External Extension Dependencies       |   |  • Strict Medical Safety Guardrails          |
+-----------------------------------------------+   +----------------------------------------------+
```

---

## 2. Key Architecture Decisions

### 2.1 Genuine Vector RAG Without pgvector
- **The Problem:** Compiling and installing the `pgvector` C-extension on Windows workstations frequently requires Visual Studio C++ Build Tools, Docker, or WSL.
- **The HealthMate AI Solution:**
  1. Document chunks are generated via sentence-aware sliding window overlap.
  2. Genuine 768-dimensional semantic embeddings are obtained from the Gemini `text-embedding-004` API.
  3. Vectors are validated (finite numbers, dimension check) and stored directly in PostgreSQL 16 using native `JSONB` columns.
  4. At query time, the user's query vector is generated, authorized chunk vectors belonging exclusively to the authenticated guest are retrieved, and cosine similarity is computed in Node.js.
  5. Chunks are sorted descending by similarity, top-K candidates are selected, and grounded responses with real citations are returned.

### 2.2 Direct Dashboard Access — Zero Login, Zero Admin
- Opens directly into the Dashboard with **no login, no signup, no Google OAuth, and no password forms**.
- On first visit, a cryptographically secure 32-byte token is minted, hashed using SHA-256 before storage in PostgreSQL (`guest_sessions`), and issued via a secure HttpOnly cookie.
- All administrator pages, admin routes, allowlists, and backdoors have been completely removed.
- **Reset My Data:** Triggers an atomic multi-table transaction that permanently purges all records, documents, chunks, embeddings, habits, and chat histories belonging to the current guest, revokes the session token, and establishes a clean session.

---

## 3. The Eight Complete Application Modules

1. **Dashboard:** Healthcare cockpit displaying vitals summary, Recharts blood glucose/pressure graphs, document counts, and wellness completion metrics.
2. **Health Documents:** PDF/image report upload, biomarker extraction (Glucose, HbA1c, Cholesterol, Creatinine, TSH), reference interval evaluation, and human-in-the-loop verification with automatic RAG re-indexing.
3. **AI Health Assistant:** Multi-agent healthcare assistant grounded in verified user documents with emergency triage interception.
4. **Food & Nutrition:** Culturally authentic Indian and global meal planning (North Indian, South Indian, Maharashtrian, Gujarati, Bengali), allergy safeguards, and deterministic Mifflin-St Jeor caloric targets.
5. **Health Tracker:** Historical tracking of blood pressure, blood glucose, weight, height, BMI calculation, and trend visualization.
6. **Wellness Planner:** Daily habit formation, hydration tracker, sleep hygiene, activity streaks, and lifestyle recommendations.
7. **Reports & Insights:** Comprehensive multi-metric clinical summaries, biomarker anomaly reports, and document history.
8. **LLM Lab:** Academic demonstration laboratory featuring:
   - Prompt Engineering Playground
   - Standard Parametric LLM vs. RAG Grounded Model Comparison
   - Agent Routing Visualizer with Confidence Scores
   - Deterministic Tool Calling (BMI, MAP, Delta Comparison, Lab Ranges)
   - Conversational Memory Inspector
   - **40+ Test Benchmark Evaluation Suite**
   - Telemetry & Observability Traces

---

## 4. Five Specialized AI Agents & Central Orchestrator

1. **Agent 1 — Health Document Agent:** Explains uploaded lab reports, medical terminology, and flags values outside reference ranges using grounded document citations.
2. **Agent 2 — Health Trend Analysis Agent:** Evaluates historical measurements over time, calculates exact numerical deltas using deterministic tools, and explains physiological patterns.
3. **Agent 3 — Nutrition Agent:** Designs personalized Indian and international meal plans, enforces dietary restrictions, prevents allergen conflicts, and estimates macros deterministically.
4. **Agent 4 — Wellness and Habit Agent:** Tracks sleep, hydration, and exercise habits, computes completion rates and streaks, and provides evidence-aware lifestyle coaching.
5. **Agent 5 — General Health Knowledge Agent:** Answers educational healthcare questions, biological concepts, and terminology without providing diagnostic prescriptions.

**Central Orchestrator:** Inspects incoming user queries, intercepts emergency symptoms (chest pain, stroke, respiratory distress) for immediate triage guidance, classifies intent, retrieves relevant context from PostgreSQL/RAG, invokes approved calculation tools, and records observability metrics.

---

## 5. Technology Stack

- **Frontend:** React 18, TypeScript 5, Vite, Tailwind CSS, Recharts, Lucide React
- **Backend:** Node.js, Express, TypeScript, Zod, Multer, PDF-Parse, Tesseract.js, Cookie-Parser, CORS, Express-Rate-Limit
- **Database:** PostgreSQL 16 (Native JSONB vectors, parameterized SQL, foreign key cascades)
- **AI SDK:** Official Google GenAI SDK (`@google/genai`)
- **Testing:** Vitest, Supertest

---

## 6. Windows PowerShell Setup Guide

### 6.1 Prerequisites
1. **Node.js:** v18 or later (v20+ recommended). Check with `node -v`.
2. **PostgreSQL 16:** Installed and running locally. Check with `Get-Service *postgres*`.
3. **Gemini API Key:** Obtain from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 6.2 Installation Steps

Open Windows PowerShell in the project directory:

```powershell
# 1. Install all dependencies (standard npm install — no --force needed)
npm install

# 2. Configure environment variables
# Copy .env.example to .env and insert your database password and Gemini API key
Copy-Item .env.example .env

# Edit .env with your PostgreSQL password and Gemini API key:
# DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/healthmate_ai
# GEMINI_API_KEY=YOUR_GEMINI_KEY

# 3. Check database health and connection
npm run db:health

# 4. Run database migrations to initialize all tables
npm run db:migrate

# 5. Run the test suite to verify functionality
npm test

# 6. Start the development server (runs backend on :3000 and frontend on :5173)
npm run dev

# 7. Build for production
npm run build

# 8. Start production server
npm start
```

Open your browser to: **http://localhost:5173** (in dev mode) or **http://localhost:3000** (in production mode).

---

## 7. PostgreSQL Database Schema Summary

The database uses 16 normalized tables:
- `guests`: Guest identity records
- `guest_sessions`: Cryptographically hashed session tokens and expiration timestamps
- `health_profiles`: Biometrics, age, gender, blood group, allergies, dietary preference
- `health_documents`: Uploaded PDFs and images, raw text, and verification status
- `extracted_health_values`: Extracted clinical biomarkers, reference intervals, confidence scores
- `document_chunks`: Semantic text chunks with sliding overlap
- `document_embeddings`: Real 768-dim Gemini embeddings stored as JSONB
- `health_measurements`: Blood pressure, blood glucose, weight, heart rate logs
- `conversations`: Chat session threads
- `conversation_messages`: Message history, agent used, citations, tools invoked
- `user_memories`: Scoped episodic memory records
- `nutrition_preferences`: Cultural cuisine, dietary goals, food exclusions
- `meal_plans`: Generated daily meal plans and macronutrient breakdowns
- `meal_plan_items`: Individual meal items, portions, calories, and substitutions
- `habits`: Daily wellness habits and targets
- `habit_logs`: Daily habit completion records and streak counters
- `agent_execution_logs`: Telemetry traces, latency, intent, and tool logs
- `evaluation_runs` & `evaluation_results`: Academic benchmark test audit records

---

## 8. Medical Safety Principles

HealthMate AI enforces strict non-diagnostic and non-prescriptive safety protocols:
1. **Never Diagnoses:** Refuses to confirm or diagnose clinical diseases (e.g., diabetes, hypertension).
2. **Never Prescribes:** Refuses to suggest medication dosages or prescribe pharmaceuticals.
3. **Emergency Interception:** Queries containing acute emergency indicators (e.g., crushing chest pain, facial droop, severe respiratory distress) trigger an immediate high-priority emergency guidance banner.
4. **Mandatory Disclaimer:** Every AI response includes a clear clinical disclaimer recommending human physician consultation.
5. **Human-in-the-Loop Verification:** Newly extracted lab report values are flagged for user review before official verification.

---
