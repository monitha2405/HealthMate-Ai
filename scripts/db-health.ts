import dotenv from 'dotenv';
dotenv.config();
import { checkDbHealth } from '../server/db/pool.js';

async function main() {
  console.log('Testing PostgreSQL 16 database connection (No pgvector)...');
  try {
    const health = await checkDbHealth();
    console.log('[PostgreSQL] Connection SUCCESSFUL:');
    console.log(`  Engine:   ${health.engine}`);
    console.log(`  Status:   ${health.status}`);
    console.log(`  PoolSize: ${health.poolSize}`);
    console.log(`  Database: ${health.databaseUrl}`);
    process.exit(0);
  } catch (err: any) {
    console.error('[PostgreSQL] Connection FAILED:');
    console.error(`  Error: ${err.message}`);
    console.error('  Please ensure PostgreSQL 16 is running and DATABASE_URL is configured in .env');
    process.exit(1);
  }
}

main();
