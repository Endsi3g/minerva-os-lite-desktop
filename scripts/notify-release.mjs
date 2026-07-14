#!/usr/bin/env node
/**
 * Send a release notification to all workspace owners in Minerva OS.
 * Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from env (pulled via vercel env pull).
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const TITLE = '✨ Mise à jour Minerva OS disponible';
const BODY  = 'Bilan de semaine accessible depuis la sidebar, profils d\'équipe enrichis avec statistiques et graphiques, tâches d\'équipe assignables, et meilleure expérience mobile !';
const LINK  = '/weekly-report';
const TYPE  = 'system_update';

async function main() {
  // Get all workspace owners (unique user IDs from workspaces table)
  const { data: workspaces, error } = await admin
    .from('workspaces')
    .select('owner_id')
    .not('owner_id', 'is', null);

  if (error) { console.error('DB error:', error); process.exit(1); }

  const ownerIds = [...new Set((workspaces || []).map(w => w.owner_id).filter(Boolean))];
  console.log(`Broadcasting to ${ownerIds.length} workspace owners...`);

  // Also get all active team members
  const { data: members } = await admin
    .from('team_members')
    .select('member_user_id')
    .eq('status', 'active')
    .not('member_user_id', 'is', null);

  const memberIds = (members || []).map(m => m.member_user_id).filter(Boolean);
  const allUserIds = [...new Set([...ownerIds, ...memberIds])];

  console.log(`Total unique users: ${allUserIds.length}`);

  const nowStr = new Date().toISOString();
  const rows = allUserIds.map(uid => ({
    user_id: uid,
    workspace_id: null,
    type: TYPE,
    title: TITLE,
    body: BODY,
    link: LINK,
    is_read: false,
    created_at: nowStr,
    updated_at: nowStr,
  }));

  const { error: insertErr } = await admin.from('notifications').insert(rows);
  if (insertErr) {
    console.error('Insert error:', insertErr);
    process.exit(1);
  }

  console.log(`✅ Sent ${rows.length} notifications successfully.`);
}

main().catch(e => { console.error(e); process.exit(1); });
