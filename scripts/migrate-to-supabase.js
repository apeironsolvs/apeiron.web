// One-time data migration from local SQLite (data/apeiron.db) to Supabase Cloud
import { existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSqliteDb } from '../server/db.js';
import { createSupabaseClient, createSupabaseDb } from '../server/supabase.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
try { process.loadEnvFile(join(ROOT, '.env')); } catch (_) {}

const sqliteFile = resolve(process.env.DATA_DIR || join(ROOT, 'data'), 'apeiron.db');
if (!existsSync(sqliteFile)) {
  console.log(`No existing SQLite database found at: ${sqliteFile}`);
  console.log('Skipping data migration.');
  process.exit(0);
}

const client = createSupabaseClient(process.env);
if (!client) {
  console.error('❌ Supabase credentials missing in .env. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const local = createSqliteDb(resolve(process.env.DATA_DIR || join(ROOT, 'data')));
const cloud = createSupabaseDb(client);

console.log('='.repeat(70));
console.log('  Apeiron Solutions — Migrate SQLite to Supabase Cloud');
console.log('='.repeat(70));

async function migrateTable(name, selectSql, transform = r => r) {
  try {
    const rows = local.raw.prepare(selectSql).all();
    if (!rows.length) {
      console.log(`- [${name}] 0 rows in SQLite.`);
      return;
    }
    const transformed = rows.map(transform);
    const { error } = await client.from(name).upsert(transformed);
    if (error) {
      console.error(`❌ [${name}] Error migrating: ${error.message}`);
    } else {
      console.log(`✅ [${name}] Migrated ${rows.length} row(s).`);
    }
  } catch (err) {
    console.error(`❌ [${name}] Failed: ${err.message}`);
  }
}

await migrateTable('meta', 'SELECT * FROM meta');
await migrateTable('users', 'SELECT * FROM users');
await migrateTable('enquiries', 'SELECT * FROM enquiries');
await migrateTable('clients', 'SELECT * FROM clients');
await migrateTable('login_codes', 'SELECT * FROM login_codes');
await migrateTable('quotes', 'SELECT * FROM quotes');
await migrateTable('quote_comments', 'SELECT * FROM quote_comments');
await migrateTable('audit_log', 'SELECT * FROM audit_log');

console.log('\nMigration complete.');
await local.close();
process.exit(0);
