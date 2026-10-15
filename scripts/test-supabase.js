// Diagnostic tool: Tests connectivity to Supabase Cloud and checks required tables/permissions.
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSupabaseClient } from '../server/supabase.js';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
try { process.loadEnvFile(join(ROOT, '.env')); } catch (_) {}

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
const isServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

console.log('='.repeat(70));
console.log('  Apeiron Solutions — Supabase Cloud Connection Diagnostics');
console.log('='.repeat(70));

if (!url || !key) {
  console.error('\n❌ Missing Supabase credentials in .env!\n');
  console.log('Please add the following to your .env file:');
  console.log('--------------------------------------------------');
  console.log('SUPABASE_URL=https://<your-project-id>.supabase.co');
  console.log('SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>');
  console.log('--------------------------------------------------');
  console.log('Where to find these in your Supabase dashboard:');
  console.log('1. Go to https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Click Project Settings (gear icon in sidebar) -> API');
  console.log('4. Copy "Project URL" and "service_role" (secret) API key\n');
  process.exit(1);
}

console.log(`\nEndpoint: ${url}`);
console.log(`Auth Key: ${key.slice(0, 12)}...${key.slice(-6)} (${isServiceRole ? 'service_role key (Admin/RLS-bypass)' : 'anon public key'})`);

const client = createSupabaseClient(process.env);
if (!client) {
  console.error('❌ Failed to initialize Supabase client.');
  process.exit(1);
}

const TABLES = [
  'meta',
  'users',
  'sessions',
  'enquiries',
  'clients',
  'login_codes',
  'csessions',
  'quotes',
  'quote_comments',
  'audit_log',
];

console.log('\nChecking Supabase tables...');
let missingCount = 0;

for (const table of TABLES) {
  const { error } = await client.from(table).select('*', { count: 'exact', head: true });
  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      console.log(`  ❌ [${table}] Table does NOT exist`);
      missingCount++;
    } else {
      console.log(`  ⚠️  [${table}] Error querying table: ${error.message} (${error.code || 'unknown'})`);
      missingCount++;
    }
  } else {
    console.log(`  ✅ [${table}] Table exists and accessible`);
  }
}

if (missingCount > 0) {
  console.log('\n' + '!'.repeat(70));
  console.log(`  ACTION NEEDED: ${missingCount} table(s) missing or inaccessible in Supabase.`);
  console.log('!'.repeat(70));
  console.log('\nTo set up your database in Supabase:');
  console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Click "SQL Editor" in the left sidebar');
  console.log('4. Click "New Query"');
  console.log('5. Copy the entire contents of "supabase/schema.sql" from this repository');
  console.log('6. Paste into the SQL editor and click "Run"');
  console.log('7. Re-run "npm run test-supabase"\n');
  process.exit(1);
} else {
  console.log('\n🎉 SUCCESS: All Supabase tables are ready and accessible!');
  
  // Test ip_salt check/creation
  const { data: saltRow } = await client.from('meta').select('v').eq('k', 'ip_salt').maybeSingle();
  if (saltRow) {
    console.log(`✅ System IP salt verified: ${saltRow.v.slice(0, 10)}...`);
  } else {
    console.log('ℹ️  No ip_salt present yet; will be automatically initialized when the server starts.');
  }

  console.log('\nYou are ready to start the server with Supabase:');
  console.log('  npm start\n');
}
