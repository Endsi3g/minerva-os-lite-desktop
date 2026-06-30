#!/usr/bin/env node
/**
 * Pre-migration safety check.
 * Run BEFORE any supabase_migration_*.sql file.
 *
 * Usage:
 *   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/pre-migration-check.js
 *
 * The script exits 1 if any critical table is empty (= data loss risk).
 * If all counts are > 0 and look sane, it exits 0 and prints a safe-to-proceed message.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.');
  process.exit(1);
}

const CRITICAL_TABLES = ['leads', 'workspaces', 'settings', 'team_members', 'tasks'];
const WARNING_TABLES = ['drafts', 'field_visits', 'gmail_threads', 'agent_actions'];

async function count(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=id&limit=1`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      Prefer: 'count=exact',
    },
  });
  if (!res.ok) return { count: null, error: res.statusText };
  const raw = res.headers.get('content-range') || '';
  const match = raw.match(/\/(\d+)$/);
  return { count: match ? parseInt(match[1], 10) : 0, error: null };
}

async function main() {
  console.log('\n🔍  Pre-migration safety check\n' + '─'.repeat(44));

  let safe = true;

  for (const table of CRITICAL_TABLES) {
    const { count: n, error } = await count(table);
    if (error) {
      console.log(`  ⚠️   ${table.padEnd(20)} ERROR: ${error}`);
      safe = false;
    } else if (n === 0) {
      console.log(`  🚨  ${table.padEnd(20)} 0 rows  ← STOP — data may already be missing`);
      safe = false;
    } else {
      console.log(`  ✅  ${table.padEnd(20)} ${n} rows`);
    }
  }

  console.log('\n  (warning-only tables)');
  for (const table of WARNING_TABLES) {
    const { count: n, error } = await count(table);
    if (error) {
      console.log(`  ⚠️   ${table.padEnd(20)} ERROR: ${error}`);
    } else {
      console.log(`  ℹ️   ${table.padEnd(20)} ${n} rows`);
    }
  }

  console.log('\n' + '─'.repeat(44));
  if (!safe) {
    console.error('\n🚫  STOP — one or more critical tables are empty. Do NOT run the migration.\n');
    process.exit(1);
  }

  console.log('\n✅  All critical tables have data. Safe to run the migration.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
