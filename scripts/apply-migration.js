#!/usr/bin/env node
/**
 * Script to apply Drizzle migrations to the database
 * Run this on Vercel or locally to apply pending migrations
 */

const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
const postgres = require('postgres');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

async function main() {
  console.log('🔄 Connecting to database...');
  
  const sql = postgres(DATABASE_URL, { max: 1 });
  const db = drizzle(sql);

  console.log('🔄 Applying migrations...');
  
  await migrate(db, { migrationsFolder: './drizzle' });

  console.log('✅ Migrations applied successfully!');
  
  await sql.end();
}

main().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
