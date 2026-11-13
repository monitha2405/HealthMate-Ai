# HealthMate AI — PostgreSQL 16 Database Schema & Data Models

## 1. Storage Strategy & Architecture
HealthMate AI uses **PostgreSQL 16 as the single persistent database** with **JSONB embedding storage** and application-layer vector operations in Node.js. No external C-extensions like `pgvector` are required, making installation on Windows seamless and dependable.

### Core Architectural Principles:
1. **Normalized Relations:** Native primary keys (`UUID DEFAULT gen_random_uuid()`), foreign keys with `ON DELETE CASCADE`, and indexing on lookup columns.
2. **JSONB Vector Storage:** 768-dimensional Gemini embeddings stored as JSONB arrays, queried with parameterized SQL and compared using Node.js vector similarity.
3. **Strict Guest Isolation:** Every user-owned record is linked to a `guest_id`. Queries always scope filtering to the authenticated guest (`WHERE guest_id = $1`).
4. **Parameterized Queries:** All SQL statements use positional parameters (`$1`, `$2`, ...) to eliminate SQL injection vulnerabilities.
5. **Atomic Multi-Table Reset:** Data purge operations cleanly delete all records linked to a guest across every table in a single database transaction.

---

## 2. PostgreSQL Table Definitions

### 2.1 Guest Sessions
```sql
CREATE TABLE guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL DEFAULT 'Guest User',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE guest_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    session_token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT
);
CREATE INDEX idx_guest_sessions_hash ON guest_sessions(session_token_hash);
CREATE INDEX idx_guest_sessions_guest_id ON guest_sessions(guest_id);
```

### 2.2 Health Profiles & Measurements
```sql
CREATE TABLE health_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL UNIQUE REFERENCES guests(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL DEFAULT 'Guest User',
    age INTEGER,
    gender TEXT,
    height_cm NUMERIC(5,2),
    weight_kg NUMERIC(5,2),
    blood_group TEXT,
    known_conditions JSONB NOT NULL DEFAULT '[]'::jsonb,
    allergies JSONB NOT NULL DEFAULT '[]'::jsonb,
    dietary_preference TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE health_measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    value NUMERIC(10,2) NOT NULL,
    secondary_value NUMERIC(10,2),
    unit TEXT NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    document_id UUID REFERENCES health_documents(id) ON DELETE SET NULL
);
CREATE INDEX idx_health_measurements_guest_id ON health_measurements(guest_id);
```

### 2.3 Health Documents, Chunks & Embeddings (JSONB)
```sql
CREATE TABLE health_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'processing',
    summary TEXT,
    raw_text TEXT,
    verified BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE extracted_health_values (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES health_documents(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    value NUMERIC(10,2) NOT NULL,
    unit TEXT NOT NULL,
    reference_range TEXT,
    status TEXT NOT NULL DEFAULT 'normal',
    confidence NUMERIC(3,2) NOT NULL DEFAULT 1.0,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    source_text TEXT
);

CREATE TABLE document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES health_documents(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL UNIQUE REFERENCES document_chunks(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    embedding JSONB NOT NULL DEFAULT '[]'::jsonb,
    dimensions INTEGER NOT NULL DEFAULT 768,
    model TEXT NOT NULL DEFAULT 'text-embedding-004',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 2.4 Nutrition & Wellness
```sql
CREATE TABLE nutrition_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL UNIQUE REFERENCES guests(id) ON DELETE CASCADE,
    dietary_preference TEXT NOT NULL DEFAULT 'vegetarian',
    regional_cuisine TEXT DEFAULT 'indian',
    allergies JSONB NOT NULL DEFAULT '[]'::jsonb,
    food_exclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
    budget_level TEXT DEFAULT 'moderate',
    health_goal TEXT DEFAULT 'maintenance',
    target_daily_calories INTEGER DEFAULT 2000,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Meal Plan',
    total_calories INTEGER NOT NULL DEFAULT 0,
    total_protein INTEGER NOT NULL DEFAULT 0,
    total_carbs INTEGER NOT NULL DEFAULT 0,
    total_fat INTEGER NOT NULL DEFAULT 0,
    total_protein_g NUMERIC(6,2) DEFAULT 0,
    total_carbs_g NUMERIC(6,2) DEFAULT 0,
    total_fat_g NUMERIC(6,2) DEFAULT 0,
    guidelines JSONB NOT NULL DEFAULT '[]'::jsonb,
    plan_data_json JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE habits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    target_value NUMERIC(10,2) NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    color TEXT DEFAULT '#0FAEAE',
    icon TEXT DEFAULT 'check',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE habit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    logged_date DATE DEFAULT CURRENT_DATE,
    current_value NUMERIC(10,2) NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    streak_days INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```
