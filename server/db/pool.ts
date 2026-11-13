/**
 * HealthMate AI — PostgreSQL 16 Connection Pool
 * 
 * Uses real PostgreSQL exclusively. No in-memory fallback.
 * Embedding similarity computed in Node.js using JSONB-stored vectors.
 * Does NOT require pgvector extension.
 */
import pg from 'pg';

const { Pool } = pg;

const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/healthmate_ai';

export interface DbQueryResult<T = any> {
  rows: T[];
  rowCount: number;
}

export interface DbClient {
  query: <T = any>(text: string, params?: any[]) => Promise<DbQueryResult<T>>;
  release: () => void;
}

// Real PostgreSQL pool — only instance used in this application
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('[PostgreSQL] Unexpected pool error:', err.message);
});

/**
 * Execute a parameterized SQL query against PostgreSQL.
 * Throws if the database is unreachable — no silent fallback.
 */
export async function query<T = any>(
  text: string,
  params: any[] = []
): Promise<DbQueryResult<T>> {
  const client = await pool.connect();
  try {
    const res = await client.query(text, params);
    return { rows: res.rows as T[], rowCount: res.rowCount ?? 0 };
  } finally {
    client.release();
  }
}

/**
 * Obtain a dedicated client for multi-statement transactions.
 * Caller must call client.release() when done.
 */
export async function getClient(): Promise<DbClient> {
  const client = await pool.connect();
  return {
    query: async (text: string, params?: any[]) => {
      const res = await client.query(text, params);
      return { rows: res.rows, rowCount: res.rowCount ?? 0 };
    },
    release: () => client.release(),
  };
}

/**
 * Health check — verifies the PostgreSQL connection is alive.
 */
export async function checkDbHealth(): Promise<{
  status: string;
  engine: string;
  poolSize: number;
  databaseUrl: string;
}> {
  const res = await pool.query('SELECT version() as v, NOW() as ts');
  const version = res.rows[0]?.v ?? 'unknown';
  return {
    status: 'healthy',
    engine: `PostgreSQL (JSONB embeddings, no pgvector)`,
    poolSize: pool.totalCount,
    databaseUrl: DATABASE_URL.replace(/:[^:@]*@/, ':***@'), // mask password
  };
}

/**
 * Node.js cosine similarity — replaces pgvector <=> operator.
 * Returns similarity in [0, 1]. Returns 0 for invalid/zero vectors.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!Array.isArray(a) || !Array.isArray(b)) return 0;
  if (a.length === 0 || a.length !== b.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const ai = a[i];
    const bi = b[i];
    // Reject NaN or Infinity
    if (!isFinite(ai) || !isFinite(bi)) return 0;
    dotProduct += ai * bi;
    normA += ai * ai;
    normB += bi * bi;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0; // zero-vector guard

  const similarity = dotProduct / magnitude;
  // Clamp to [0, 1] to handle floating-point drift
  return Math.max(0, Math.min(1, similarity));
}

/**
 * Validate an embedding array before storing or comparing.
 * Returns true only if array is non-empty, all finite, correct dimensions.
 */
export function validateEmbedding(
  embedding: unknown,
  expectedDimensions?: number
): embedding is number[] {
  if (!Array.isArray(embedding) || embedding.length === 0) return false;
  if (expectedDimensions !== undefined && embedding.length !== expectedDimensions) return false;
  return embedding.every(
    (v) => typeof v === 'number' && isFinite(v) && !isNaN(v)
  );
}

export { pool };
