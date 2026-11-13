-- HealthMate AI — PostgreSQL 16 Schema (No pgvector required)
-- Uses JSONB for embedding storage with Node.js cosine similarity
-- ============================================================

-- 1. Guest Sessions
CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name TEXT NOT NULL DEFAULT 'Guest User',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS guest_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    session_token_hash TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_hash ON guest_sessions(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_guest_sessions_guest_id ON guest_sessions(guest_id);

-- 2. Health Profiles
CREATE TABLE IF NOT EXISTS health_profiles (
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
CREATE INDEX IF NOT EXISTS idx_health_profiles_guest_id ON health_profiles(guest_id);

-- 3. Health Documents
CREATE TABLE IF NOT EXISTS health_documents (
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
CREATE INDEX IF NOT EXISTS idx_health_documents_guest_id ON health_documents(guest_id);

CREATE TABLE IF NOT EXISTS extracted_health_values (
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
CREATE INDEX IF NOT EXISTS idx_extracted_values_guest_id ON extracted_health_values(guest_id);
CREATE INDEX IF NOT EXISTS idx_extracted_values_document_id ON extracted_health_values(document_id);

-- 4. RAG — Document Chunks & Embeddings (JSONB, no pgvector)
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES health_documents(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_chunks_guest_id ON document_chunks(guest_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);

-- Embeddings stored as JSONB array — cosine similarity computed in Node.js
CREATE TABLE IF NOT EXISTS document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chunk_id UUID NOT NULL UNIQUE REFERENCES document_chunks(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    embedding JSONB NOT NULL DEFAULT '[]'::jsonb,
    dimensions INTEGER NOT NULL DEFAULT 768,
    model TEXT NOT NULL DEFAULT 'text-embedding-004',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_guest_id ON document_embeddings(guest_id);
CREATE INDEX IF NOT EXISTS idx_document_embeddings_chunk_id ON document_embeddings(chunk_id);

-- 5. Health Measurements & Tracker
CREATE TABLE IF NOT EXISTS health_measurements (
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
CREATE INDEX IF NOT EXISTS idx_health_measurements_guest_id ON health_measurements(guest_id);
CREATE INDEX IF NOT EXISTS idx_health_measurements_type ON health_measurements(guest_id, type);

-- 6. AI Conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    title TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_conversations_guest_id ON conversations(guest_id);

CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    agent_used TEXT,
    tools_invoked JSONB NOT NULL DEFAULT '[]'::jsonb,
    sources JSONB NOT NULL DEFAULT '[]'::jsonb,
    safety_warning TEXT,
    is_emergency BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_guest_id ON conversation_messages(guest_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_convo_id ON conversation_messages(conversation_id);

CREATE TABLE IF NOT EXISTS user_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_memories_guest_id ON user_memories(guest_id);

-- 7. Nutrition Tables
CREATE TABLE IF NOT EXISTS nutrition_preferences (
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
CREATE INDEX IF NOT EXISTS idx_nutrition_preferences_guest_id ON nutrition_preferences(guest_id);

CREATE TABLE IF NOT EXISTS meal_plans (
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
CREATE INDEX IF NOT EXISTS idx_meal_plans_guest_id ON meal_plans(guest_id);

CREATE TABLE IF NOT EXISTS meal_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_plan_id UUID NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    meal_type TEXT NOT NULL,
    name TEXT NOT NULL,
    portion TEXT NOT NULL DEFAULT '1 serving',
    calories INTEGER NOT NULL DEFAULT 0,
    protein INTEGER NOT NULL DEFAULT 0,
    carbs INTEGER NOT NULL DEFAULT 0,
    fat INTEGER NOT NULL DEFAULT 0,
    substitutions JSONB NOT NULL DEFAULT '[]'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_guest_id ON meal_plan_items(guest_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_items_plan_id ON meal_plan_items(meal_plan_id);

CREATE TABLE IF NOT EXISTS food_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    food_name TEXT NOT NULL,
    meal_type TEXT DEFAULT 'other',
    calories INTEGER DEFAULT 0,
    protein_g NUMERIC(6,2) DEFAULT 0,
    carbs_g NUMERIC(6,2) DEFAULT 0,
    fat_g NUMERIC(6,2) DEFAULT 0,
    portion TEXT DEFAULT '1 serving',
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_food_records_guest_id ON food_records(guest_id);

-- 8. Wellness & Habits
CREATE TABLE IF NOT EXISTS wellness_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    title TEXT NOT NULL,
    target_value NUMERIC(10,2) NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wellness_goals_guest_id ON wellness_goals(guest_id);

CREATE TABLE IF NOT EXISTS habits (
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
CREATE INDEX IF NOT EXISTS idx_habits_guest_id ON habits(guest_id);

CREATE TABLE IF NOT EXISTS habit_logs (
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
CREATE INDEX IF NOT EXISTS idx_habit_logs_guest_id ON habit_logs(guest_id);
CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_id ON habit_logs(habit_id);

CREATE TABLE IF NOT EXISTS sleep_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    hours NUMERIC(4,2) NOT NULL,
    quality TEXT DEFAULT 'good',
    notes TEXT,
    log_date DATE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sleep_records_guest_id ON sleep_records(guest_id);

CREATE TABLE IF NOT EXISTS activity_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    steps INTEGER NOT NULL DEFAULT 0,
    active_minutes INTEGER NOT NULL DEFAULT 0,
    activity_type TEXT DEFAULT 'walk',
    log_date DATE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_activity_records_guest_id ON activity_records(guest_id);

CREATE TABLE IF NOT EXISTS hydration_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    glasses INTEGER NOT NULL DEFAULT 0,
    milliliters INTEGER NOT NULL DEFAULT 0,
    log_date DATE NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_hydration_records_guest_id ON hydration_records(guest_id);

-- 9. AI Evaluation & Telemetry
CREATE TABLE IF NOT EXISTS agent_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    intent TEXT NOT NULL,
    agent_selected TEXT NOT NULL,
    reasoning TEXT,
    tools_invoked JSONB NOT NULL DEFAULT '[]'::jsonb,
    rag_chunks_count INTEGER NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    tokens_estimated INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'success',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agent_logs_guest_id ON agent_execution_logs(guest_id);

CREATE TABLE IF NOT EXISTS tool_execution_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    input_args JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_result JSONB NOT NULL DEFAULT '{}'::jsonb,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tool_logs_guest_id ON tool_execution_logs(guest_id);

CREATE TABLE IF NOT EXISTS evaluation_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_tests INTEGER NOT NULL DEFAULT 0,
    passed_tests INTEGER NOT NULL DEFAULT 0,
    accuracy_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evaluation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID REFERENCES evaluation_runs(id) ON DELETE CASCADE,
    test_id TEXT NOT NULL,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    actual_outcome TEXT NOT NULL,
    expected_outcome TEXT NOT NULL DEFAULT '',
    latency_ms INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_eval_results_run_id ON evaluation_results(run_id);
