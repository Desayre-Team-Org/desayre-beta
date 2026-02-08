import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { logTelemetry } from '@/lib/telemetry/logger';

const connectionString = process.env.DATABASE_URL!;

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, {
  prepare: false,
  debug: process.env.TELEMETRY_SQL === '1'
    ? (connection, query, parameters) => {
        void logTelemetry({
          ts: new Date().toISOString(),
          level: 'info',
          source: 'server',
          event: 'sql_query',
          payload: { query, parameters },
        });
      }
    : undefined,
});
export const db = drizzle(client, { schema });

export * from './schema';

// Re-export sql for use in queries
export { sql } from 'drizzle-orm';
