/**
 * HealthMate AI — PostgreSQL Schema Migration Runner
 * 
 * Executes schema.sql statement by statement.
 * Does NOT require pgvector extension.
 * Fails hard if the database connection cannot be established.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query, checkDbHealth } from './pool.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<{ success: boolean; message: string }> {
  // Verify database connectivity first
  try {
    await checkDbHealth();
  } catch (err: any) {
    return {
      success: false,
      message: `Cannot run migrations — database unreachable: ${err.message}`,
    };
  }

  const schemaPath = path.resolve(__dirname, 'schema.sql');

  if (!fs.existsSync(schemaPath)) {
    return {
      success: false,
      message: `Schema file not found at: ${schemaPath}`,
    };
  }

  const sql = fs.readFileSync(schemaPath, 'utf8');

  // Split on semicolons, strip SQL comments, and filter out empty statements
  const statements = sql
    .split(';')
    .map((s) => s.replace(/--.*$/gm, '').trim())
    .filter((s) => s.length > 0);

  let executed = 0;
  let warnings = 0;

  for (const stmt of statements) {
    try {
      await query(stmt + ';');
      executed++;
    } catch (e: any) {
      // uuid-ossp extension may already exist — not fatal
      if (stmt.includes('CREATE EXTENSION')) {
        console.warn(`[Migration] Extension note: ${e.message}`);
        warnings++;
      } else if (e.message?.includes('already exists')) {
        // Idempotent DDL — expected behavior
        executed++;
      } else {
        console.error('[Migration] Statement failed:', stmt.substring(0, 80));
        console.error('[Migration] Error:', e.message);
        return {
          success: false,
          message: `Migration failed: ${e.message}`,
        };
      }
    }
  }

  return {
    success: true,
    message: `Executed ${executed} statements (${warnings} warnings). Schema ready.`,
  };
}

// Allow running directly: npx tsx server/db/migrate.ts
if (process.env.npm_lifecycle_event === 'db:migrate') {
  import('dotenv').then(({ default: dotenv }) => {
    dotenv.config();
    runMigrations()
      .then((result) => {
        if (result.success) {
          console.log('[Migration] ✓', result.message);
          process.exit(0);
        } else {
          console.error('[Migration] ✗', result.message);
          process.exit(1);
        }
      })
      .catch((err) => {
        console.error('[Migration] Fatal error:', err.message);
        process.exit(1);
      });
  });
}
