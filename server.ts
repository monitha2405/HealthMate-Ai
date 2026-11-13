import 'dotenv/config';
/**
 * HealthMate AI — Express Server Entry Point
 * 
 * Stack: Node.js + Express + PostgreSQL 16 (JSONB embeddings, no pgvector)
 * Session: Automatic anonymous guest sessions via HttpOnly cookies
 * AI: Google Gemini API (text generation + embeddings)
 */
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import sessionRoutes from './server/routes/sessionRoutes.js';
import documentRoutes from './server/routes/documentRoutes.js';
import chatRoutes from './server/routes/chatRoutes.js';
import trackerRoutes from './server/routes/trackerRoutes.js';
import nutritionRoutes from './server/routes/nutritionRoutes.js';
import wellnessRoutes from './server/routes/wellnessRoutes.js';
import labRoutes from './server/routes/labRoutes.js';
import reportRoutes from './server/routes/reportRoutes.js';
import resetRoutes from './server/routes/resetRoutes.js';
import { runMigrations } from './server/db/migrate.js';
import { checkDbHealth } from './server/db/pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Environment Validation ──────────────────────────────────────────────────
function validateEnvironment(): void {
  // If DATABASE_URL is not set, provide the standard local PostgreSQL 16 default
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/healthmate_ai';
    console.log('[Config] DATABASE_URL not set in environment — using default: postgresql://postgres:postgres@localhost:5432/healthmate_ai');
  }

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'healthmate-dev-session-secret-32-chars-minimum-key';
  }

  if (!process.env.GEMINI_API_KEY) {
    console.warn('[Config] NOTE: GEMINI_API_KEY is not set in .env. Add your key to .env to enable live Gemini AI chat & RAG embeddings.');
  }
}

validateEnvironment();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProd = process.env.NODE_ENV === 'production';

// ─── CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.APP_URL || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:3000',
];

const isLocalhostOrigin = (origin: string): boolean => {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    // Allow any localhost / 127.0.0.1 port (5173, 5174, 5175, 3000, etc.)
    if (isLocalhostOrigin(origin) || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS: Origin "${origin}" not allowed.`));
  },
  credentials: true, // Required for HttpOnly cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept'],
}));

// ─── Rate Limiting ─────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a moment and try again.' },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Chat rate limit reached. Please wait before sending another message.' },
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload rate limit reached. Please wait before uploading again.' },
});

app.use(generalLimiter);

// ─── Core Middleware ───────────────────────────────────────────────────────
const sessionSecret = process.env.SESSION_SECRET || 'healthmate-dev-secret-change-in-production';
app.use(cookieParser(sessionSecret));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Health Check Endpoint ─────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  try {
    const dbHealth = await checkDbHealth();
    res.json({
      status: 'online',
      app: 'HealthMate AI',
      version: '2.0.0',
      database: dbHealth,
      ai: {
        geminiConfigured: !!(process.env.GEMINI_API_KEY),
        textModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
        embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
        embeddingStorage: 'PostgreSQL JSONB (no pgvector)',
        similarityComputation: 'Node.js cosine similarity',
      },
      architecture: {
        authentication: 'Automatic anonymous guest sessions (HttpOnly cookies)',
        ragStrategy: 'JSONB embeddings + Node.js cosine similarity',
        vectorExtension: 'None required (pgvector not used)',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({
      status: 'error',
      error: 'Database health check failed',
      details: err.message,
    });
  }
});

// ─── API Routes ────────────────────────────────────────────────────────────
app.use('/api', sessionRoutes);
app.use('/api/user', resetRoutes);
app.use('/api/documents', uploadLimiter, documentRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);
app.use('/api/tracker', trackerRoutes);
app.use('/api/nutrition', nutritionRoutes);
app.use('/api/wellness', wellnessRoutes);
app.use('/api/lab', labRoutes);
app.use('/api/reports', reportRoutes);

// ─── Error Handler ─────────────────────────────────────────────────────────
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err.message);
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: 'Internal server error', details: isProd ? undefined : err.message });
});

// ─── Server Startup ────────────────────────────────────────────────────────
async function startServer() {
  // 1. Verify PostgreSQL connectivity before accepting requests
  try {
    const dbHealth = await checkDbHealth();
    console.log(`[PostgreSQL] Connected: ${dbHealth.engine}`);
  } catch (err: any) {
    console.error('[PostgreSQL] FATAL: Cannot connect to database:', err.message);
    console.error('[PostgreSQL] Ensure PostgreSQL is running and DATABASE_URL is correct.');
    process.exit(1);
  }

  // 2. Run schema migrations
  const migrationResult = await runMigrations();
  if (migrationResult.success) {
    console.log('[PostgreSQL] Migrations complete:', migrationResult.message);
  } else {
    console.error('[PostgreSQL] Migration error:', migrationResult.message);
    process.exit(1);
  }

  // 3. Serve frontend
  if (!isProd) {
    // Development: Vite handles the frontend on port 5173
    // Backend runs on port 3000, Vite proxies /api to 3000
    console.log('[Dev] Frontend: http://localhost:5173 (Vite)');
  } else {
    // Production: serve built frontend from dist/
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[HealthMate AI] Server running on http://localhost:${PORT}`);
    console.log(`[HealthMate AI] Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[HealthMate AI] Gemini AI: ${process.env.GEMINI_API_KEY ? 'Configured ✓' : 'NOT configured — set GEMINI_API_KEY'}`);
  });
}

// Export for test runner
export { app };

if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  startServer().catch((err) => {
    console.error('[Fatal] Server startup failed:', err);
    process.exit(1);
  });
}
