const { createClient } = require('@supabase/supabase-js');
const { app, powerMonitor } = require('electron');
const db = require('./database.cjs');

let supabase = null;
let currentUserId = null;
let syncTimer = null;
let syncInProgress = false;

app.whenReady().then(() => {
  powerMonitor.on('suspend', () => {
    console.log('[sync] System suspending, stopping sync timer...');
    stopSyncTimer();
  });

  powerMonitor.on('resume', () => {
    console.log('[sync] System resumed, waiting 45s for network to stabilize before starting sync timer...');
    setTimeout(() => {
      if (supabase && currentUserId) {
        startSyncTimer();
        triggerSync().catch(err => console.error("Sync on resume failed:", err));
      }
    }, 45000);
  });
});

function setSession(session) {
  if (!session || !session.accessToken || !session.supabaseUrl || !session.supabaseKey) {
    supabase = null;
    currentUserId = null;
    stopSyncTimer();
    return;
  }

  const { accessToken, supabaseUrl, supabaseKey, userId } = session;
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  supabase.auth.setSession({ access_token: accessToken, refresh_token: '' });
  currentUserId = userId;

  startSyncTimer();
  // Trigger immediate sync
  triggerSync().catch(err => console.error("Initial sync failed:", err));
}

function startSyncTimer() {
  // Sync disabled - everything goes direct to Supabase
}

function stopSyncTimer() {
  // Sync disabled
}

async function triggerSync() {
  // Sync disabled
}

async function syncPush() {
  // 1. Leads
  const pendingLeads = await db.all("SELECT * FROM leads WHERE sync_status != 'synced'");
  for (const lead of pendingLeads) {
    if (lead.sync_status === 'pending_insert') {
      const { id, user_id, business_name, contact_name, contact_email, niche, city, source, status, temperature, next_action, next_action_date, owner, image_url, workspace_id, website, rating, reviews_count, maps_url, latitude, longitude, phone, score, fit_score, intent_score, reply_status, nba_score, nba_action, nba_reason, nba_channel, nba_computed_at, email_opens_count, email_clicks_count, pipeline_stagnation_days, cadence_phase, cadence_started_at, cadence_updated_at } = lead;
      const { error } = await supabase.from('leads').upsert({
        id,
        user_id,
        business_name,
        contact_name,
        contact_email,
        niche,
        city,
        source,
        status,
        temperature,
        next_action,
        next_action_date,
        owner,
        image_url,
        workspace_id,
        website,
        rating,
        reviews_count,
        maps_url,
        latitude,
        longitude,
        phone,
        score,
        fit_score,
        intent_score,
        reply_status,
        nba_score: nba_score ?? 0,
        nba_action: nba_action ?? null,
        nba_reason: nba_reason ?? null,
        nba_channel: nba_channel ?? 'email',
        nba_computed_at: nba_computed_at ?? null,
        email_opens_count: email_opens_count ?? 0,
        email_clicks_count: email_clicks_count ?? 0,
        pipeline_stagnation_days: pipeline_stagnation_days ?? 0,
        cadence_phase: cadence_phase ?? 'initial_email',
        cadence_started_at: cadence_started_at ?? null,
        cadence_updated_at: cadence_updated_at ?? null,
      });
      if (!error) {
        await db.run("UPDATE leads SET sync_status = 'synced' WHERE id = ?", [id]);
      } else {
        console.error("Error pushing insert for lead", id, error);
      }
    } else if (lead.sync_status === 'pending_update') {
      const { id, business_name, contact_name, contact_email, niche, city, source, status, temperature, next_action, next_action_date, owner, image_url, reply_status, website, rating, reviews_count, maps_url, latitude, longitude, phone, score, fit_score, intent_score, nba_score, nba_action, nba_reason, nba_channel, nba_computed_at, email_opens_count, email_clicks_count, pipeline_stagnation_days, cadence_phase, cadence_started_at, cadence_updated_at } = lead;
      const { error } = await supabase.from('leads').update({
        business_name,
        contact_name,
        contact_email,
        niche,
        city,
        source,
        status,
        temperature,
        next_action,
        next_action_date,
        owner,
        image_url,
        reply_status: reply_status ?? null,
        website,
        rating,
        reviews_count,
        maps_url,
        latitude,
        longitude,
        phone,
        score,
        fit_score,
        intent_score,
        nba_score: nba_score ?? 0,
        nba_action: nba_action ?? null,
        nba_reason: nba_reason ?? null,
        nba_channel: nba_channel ?? 'email',
        nba_computed_at: nba_computed_at ?? null,
        email_opens_count: email_opens_count ?? 0,
        email_clicks_count: email_clicks_count ?? 0,
        pipeline_stagnation_days: pipeline_stagnation_days ?? 0,
        cadence_phase: cadence_phase ?? 'initial_email',
        cadence_started_at: cadence_started_at ?? null,
        cadence_updated_at: cadence_updated_at ?? null,
      }).eq('id', id);
      if (!error) {
        await db.run("UPDATE leads SET sync_status = 'synced' WHERE id = ?", [id]);
      } else {
        console.error("Error pushing update for lead", id, error);
      }
    } else if (lead.sync_status === 'pending_delete') {
      const { error } = await supabase.from('leads').delete().eq('id', lead.id);
      if (!error) {
        await db.run("DELETE FROM leads WHERE id = ?", [lead.id]);
      } else {
        console.error("Error pushing delete for lead", lead.id, error);
      }
    }
  }

  // 2. Drafts
  const pendingDrafts = await db.all("SELECT * FROM drafts WHERE sync_status != 'synced'");
  for (const draft of pendingDrafts) {
    if (draft.sync_status === 'pending_insert') {
      const { id, lead_id, user_id, channel, tone, content, status, workspace_id } = draft;
      const { error } = await supabase.from('drafts').upsert({
        id,
        lead_id,
        user_id,
        channel,
        tone,
        content,
        status,
        workspace_id
      });
      if (!error) {
        await db.run("UPDATE drafts SET sync_status = 'synced' WHERE id = ?", [id]);
      }
    } else if (draft.sync_status === 'pending_update') {
      const { id, channel, tone, content, status } = draft;
      const { error } = await supabase.from('drafts').update({
        channel,
        tone,
        content,
        status
      }).eq('id', id);
      if (!error) {
        await db.run("UPDATE drafts SET sync_status = 'synced' WHERE id = ?", [id]);
      }
    } else if (draft.sync_status === 'pending_delete') {
      const { error } = await supabase.from('drafts').delete().eq('id', draft.id);
      if (!error) {
        await db.run("DELETE FROM drafts WHERE id = ?", [draft.id]);
      }
    }
  }

  // 3. Notes
  const pendingNotes = await db.all("SELECT * FROM notes WHERE sync_status != 'synced'");
  for (const note of pendingNotes) {
    if (note.sync_status === 'pending_insert') {
      const { id, lead_id, user_id, type, content, workspace_id } = note;
      const { error } = await supabase.from('notes').upsert({
        id,
        lead_id,
        user_id,
        type,
        content,
        workspace_id
      });
      if (!error) {
        await db.run("UPDATE notes SET sync_status = 'synced' WHERE id = ?", [id]);
      }
    } else if (note.sync_status === 'pending_delete') {
      const { error } = await supabase.from('notes').delete().eq('id', note.id);
      if (!error) {
        await db.run("DELETE FROM notes WHERE id = ?", [note.id]);
      }
    }
  }

  // 4. Team Messages
  const pendingMessages = await db.all("SELECT * FROM team_messages WHERE sync_status = 'pending_insert'");
  for (const msg of pendingMessages) {
    try {
      const { error } = await supabase.from('team_messages').upsert({
        id: msg.id,
        workspace_id: msg.workspace_id,
        sender_id: msg.sender_id,
        sender_name: msg.sender_name,
        content: msg.content,
        created_at: msg.created_at,
        updated_at: msg.updated_at
      });
      if (!error) {
        await db.run("UPDATE team_messages SET sync_status = 'synced' WHERE id = ?", [msg.id]);
      }
    } catch (e) {
      console.error("Error syncing team message:", e);
    }
  }

  // 5. Tasks
  const pendingTasks = await db.all("SELECT * FROM tasks WHERE sync_status != 'synced'");
  for (const task of pendingTasks) {
    if (task.sync_status === 'pending_insert') {
      const { id, user_id, title, completed, category, due_date, workspace_id } = task;
      const { error } = await supabase.from('tasks').upsert({
        id,
        user_id,
        title,
        completed: completed === 1,
        category,
        due_date,
        workspace_id
      });
      if (!error) {
        await db.run("UPDATE tasks SET sync_status = 'synced' WHERE id = ?", [id]);
      } else {
        console.error("Error pushing insert for task", id, error);
      }
    } else if (task.sync_status === 'pending_update') {
      const { id, title, completed, category, due_date } = task;
      const { error } = await supabase.from('tasks').update({
        title,
        completed: completed === 1,
        category,
        due_date
      }).eq('id', id);
      if (!error) {
        await db.run("UPDATE tasks SET sync_status = 'synced' WHERE id = ?", [id]);
      } else {
        console.error("Error pushing update for task", id, error);
      }
    } else if (task.sync_status === 'pending_delete') {
      const { error } = await supabase.from('tasks').delete().eq('id', task.id);
      if (!error) {
        await db.run("DELETE FROM tasks WHERE id = ?", [task.id]);
      } else {
        console.error("Error pushing delete for task", task.id, error);
      }
    }
  }

  // 4b. Workspaces
  const pendingWorkspaces = await db.all("SELECT * FROM workspaces WHERE sync_status != 'synced'");
  for (const ws of pendingWorkspaces) {
    if (ws.sync_status === 'pending_insert') {
      const { id, name, owner_id, description, tag, accent_color, logo_base64, created_at } = ws;
      const { error } = await supabase.from('workspaces').upsert({
        id,
        name,
        owner_id,
        description,
        tag,
        accent_color,
        logo_base64,
        created_at
      });
      if (!error) {
        await db.run("UPDATE workspaces SET sync_status = 'synced' WHERE id = ?", [id]);
      } else {
        console.error("Error pushing insert for workspace", id, error);
      }
    } else if (ws.sync_status === 'pending_update') {
      const { id, name, description, tag, accent_color, logo_base64 } = ws;
      const { error } = await supabase.from('workspaces').update({
        name,
        description,
        tag,
        accent_color,
        logo_base64
      }).eq('id', id);
      if (!error) {
        await db.run("UPDATE workspaces SET sync_status = 'synced' WHERE id = ?", [id]);
      } else {
        console.error("Error pushing update for workspace", id, error);
      }
    } else if (ws.sync_status === 'pending_delete') {
      const { error } = await supabase.from('workspaces').delete().eq('id', ws.id);
      if (!error) {
        await db.run("DELETE FROM workspaces WHERE id = ?", [ws.id]);
      } else {
        console.error("Error pushing delete for workspace", ws.id, error);
      }
    }
  }

  // 5. Settings
  const pendingSettings = await db.all("SELECT * FROM settings WHERE sync_status != 'synced'");
  for (const setting of pendingSettings) {
    const { user_id, full_name, last_name, phone, email, company_name, timezone, niches, cities, ai_tone, ai_density, quick_note, focus_title, focus_items, smtp_config, groq_api_key, together_api_key, openrouter_key, ai_provider, ai_model, avatar_base64, user_role, bio, email_signature, active_workspace_id } = setting;
    const { error } = await supabase.from('settings').upsert({
      user_id,
      full_name,
      last_name,
      phone,
      email,
      company_name,
      timezone,
      niches: (() => { try { return JSON.parse(niches || '[]'); } catch { return []; } })(),
      cities: (() => { try { return JSON.parse(cities || '[]'); } catch { return []; } })(),
      ai_tone,
      ai_density,
      quick_note,
      focus_title,
      focus_items: (() => { try { return JSON.parse(focus_items || '[]'); } catch { return []; } })(),
      smtp_config: smtp_config || null,
      groq_api_key: groq_api_key || null,
      together_api_key: together_api_key || null,
      openrouter_key: openrouter_key || null,
      ai_provider: ai_provider || 'anthropic',
      ai_model: ai_model || 'openrouter/free',
      avatar_base64: avatar_base64 || null,
      user_role: user_role || null,
      bio: bio || null,
      email_signature: email_signature || null,
      active_workspace_id: active_workspace_id || null,
    });
    if (!error) {
      await db.run("UPDATE settings SET sync_status = 'synced' WHERE user_id = ?", [user_id]);
    }
  }

  // 6. Route Plans Push
  const pendingRoutePlans = await db.all("SELECT * FROM route_plans WHERE sync_status != 'synced'");
  for (const plan of pendingRoutePlans) {
    if (plan.sync_status === 'pending_insert') {
      const { id, workspace_id, user_id, campaign_id, lead_ids, distance_km, duration_min, status, created_at } = plan;
      const { error } = await supabase.from('route_plans').upsert({
        id,
        workspace_id: workspace_id || null,
        user_id: user_id || currentUserId,
        campaign_id: campaign_id || null,
        lead_ids: (() => { try { return JSON.parse(lead_ids || '[]'); } catch { return []; } })(),
        distance_km,
        duration_min,
        status,
        created_at
      });
      if (!error) {
        await db.run("UPDATE route_plans SET sync_status = 'synced' WHERE id = ?", [id]);
      } else {
        console.error("Error pushing insert for route_plan", id, error);
      }
    } else if (plan.sync_status === 'pending_update') {
      const { id, distance_km, duration_min, status } = plan;
      const { error } = await supabase.from('route_plans').update({
        distance_km,
        duration_min,
        status
      }).eq('id', id);
      if (!error) {
        await db.run("UPDATE route_plans SET sync_status = 'synced' WHERE id = ?", [id]);
      } else {
        console.error("Error pushing update for route_plan", id, error);
      }
    } else if (plan.sync_status === 'pending_delete') {
      const { error } = await supabase.from('route_plans').delete().eq('id', plan.id);
      if (!error) {
        await db.run("DELETE FROM route_plans WHERE id = ?", [plan.id]);
      } else {
        console.error("Error pushing delete for route_plan", plan.id, error);
      }
    }
  }

  // 7. Field Visits Push
  const pendingVisits = await db.all("SELECT * FROM field_visits WHERE sync_status != 'synced'");
  for (const visit of pendingVisits) {
    if (visit.sync_status === 'pending_insert' || visit.sync_status === 'pending_update') {
      const { id, route_plan_id, lead_id, workspace_id, outcome, notes, visited_at, meeting_datetime, follow_up_added, deal_created, created_at } = visit;
      
      const { error } = await supabase.from('field_visits').upsert({
        id,
        route_plan_id,
        lead_id,
        workspace_id: workspace_id || null,
        outcome,
        notes: notes || null,
        visited_at: visited_at || new Date().toISOString(),
        meeting_datetime: meeting_datetime || null,
        follow_up_added: follow_up_added === 1,
        deal_created: deal_created === 1,
        created_at
      });

      if (!error) {
        await db.run("UPDATE field_visits SET sync_status = 'synced' WHERE id = ?", [id]);
        
        // --- POST-SYNC AUTOMATION LOGIC ---
        // Retrieve lead details first
        const lead = await db.get("SELECT * FROM leads WHERE id = ?", [lead_id]);
        if (lead) {
          // A. if outcome is 'meeting_booked' and deal has not been created yet
          if (outcome === 'meeting_booked' && !deal_created) {
            console.log(`[sync] Auto-creating deal for lead: ${lead.business_name}`);
            
            // 1. Update lead status to 'Won' locally
            await db.run(
              "UPDATE leads SET status = 'Won', updated_at = ?, sync_status = 'pending_update' WHERE id = ?",
              [new Date().toISOString(), lead_id]
            );

            // 2. Create task 'Appel de closing' locally
            const taskId = require('crypto').randomUUID();
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const due_date = tomorrow.toISOString().split('T')[0];
            const nowIso = new Date().toISOString();

            await db.run(
              `INSERT INTO tasks (id, user_id, title, completed, category, due_date, workspace_id, created_at, updated_at, sync_status)
               VALUES (?, ?, ?, 0, 'Meeting', ?, ?, ?, ?, 'pending_insert')`,
              [taskId, currentUserId, `Appel de closing — ${lead.business_name}`, due_date, workspace_id || null, nowIso, nowIso]
            );

            // 3. Mark deal_created = 1 in local field_visits
            await db.run(
              "UPDATE field_visits SET deal_created = 1, updated_at = ?, sync_status = 'pending_update' WHERE id = ?",
              [new Date().toISOString(), id]
            );
          }

          // B. if outcome is 'absent' and follow-up sequence has not been added yet
          if (outcome === 'absent' && !follow_up_added) {
            console.log(`[sync] Auto-creating sequence 'Passé vous voir' for lead: ${lead.business_name}`);

            // Fetch user's settings to customize signature
            const settings = await db.get("SELECT full_name FROM settings WHERE user_id = ?", [currentUserId]);
            const userName = settings?.full_name || 'L\'équipe';

            // Check if lead has email
            if (lead.contact_email) {
              // 1. Create a sequence in Supabase
              const seqId = require('crypto').randomUUID();
              const { error: seqErr } = await supabase.from('email_sequences').insert({
                id: seqId,
                user_id: currentUserId,
                workspace_id: workspace_id || null,
                lead_id: lead.id,
                lead_name: lead.business_name,
                lead_email: lead.contact_email,
                name: `Séquence — Passé vous voir — ${lead.business_name}`,
                status: 'active'
              });

              if (!seqErr) {
                // 2. Create steps in Supabase
                const now = new Date();
                const step1Scheduled = now.toISOString();
                
                const step2Scheduled = new Date(now);
                step2Scheduled.setDate(step2Scheduled.getDate() + 3);
                
                const steps = [
                  {
                    id: require('crypto').randomUUID(),
                    sequence_id: seqId,
                    step_number: 1,
                    delay_days: 0,
                    subject: `Suite à mon passage chez ${lead.business_name}`,
                    body: `Bonjour,\n\nJe suis passé dans vos locaux aujourd'hui pour vous rencontrer, mais vous n'étiez pas disponible.\n\nJe souhaitais échanger brièvement avec vous sur l'optimisation de votre visibilité locale et la génération de leads.\n\nQuand seriez-vous disponible pour un court appel de 5 minutes cette semaine ?\n\nBien cordialement,\n${userName}`,
                    status: 'pending',
                    scheduled_at: step1Scheduled,
                    channel: 'Email'
                  },
                  {
                    id: require('crypto').randomUUID(),
                    sequence_id: seqId,
                    step_number: 2,
                    delay_days: 3,
                    subject: 'Relance appel',
                    body: 'Appeler le prospect pour faire suite à l\'email envoyé J+0 suite au passage physique.',
                    status: 'pending',
                    scheduled_at: step2Scheduled.toISOString(),
                    channel: 'Call'
                  }
                ];

                const { error: stepsErr } = await supabase.from('email_sequence_steps').insert(steps);
                if (stepsErr) {
                  console.error("Error creating sequence steps on Supabase:", stepsErr);
                }
              } else {
                console.error("Error creating email sequence on Supabase:", seqErr);
              }
            } else {
              console.log(`[sync] Skip email sequence creation: Lead has no contact email`);
            }

            // 2. Create task 'Rappel dans 2 jours' locally
            const taskId = require('crypto').randomUUID();
            const in2Days = new Date();
            in2Days.setDate(in2Days.getDate() + 2);
            const due_date = in2Days.toISOString().split('T')[0];
            const nowIso = new Date().toISOString();

            await db.run(
              `INSERT INTO tasks (id, user_id, title, completed, category, due_date, workspace_id, created_at, updated_at, sync_status)
               VALUES (?, ?, ?, 0, 'Follow-up', ?, ?, ?, ?, 'pending_insert')`,
              [taskId, currentUserId, `Rappel dans 2 jours — ${lead.business_name}`, due_date, workspace_id || null, nowIso, nowIso]
            );

            // 3. Mark follow_up_added = 1 in local field_visits
            await db.run(
              "UPDATE field_visits SET follow_up_added = 1, updated_at = ?, sync_status = 'pending_update' WHERE id = ?",
              [new Date().toISOString(), id]
            );
          }
        }
      } else {
        console.error("Error pushing field_visit", id, error);
      }
    } else if (visit.sync_status === 'pending_delete') {
      const { error } = await supabase.from('field_visits').delete().eq('id', visit.id);
      if (!error) {
        await db.run("DELETE FROM field_visits WHERE id = ?", [visit.id]);
      } else {
        console.error("Error pushing delete for field_visit", visit.id, error);
      }
    }
  }

  // 8. Campaigns Push
  const pendingCampaigns = await db.all("SELECT * FROM campaigns WHERE sync_status != 'synced'");
  for (const cmp of pendingCampaigns) {
    if (cmp.sync_status === 'pending_insert') {
      const { id, workspace_id, user_id, name, description, niches, cities, status, start_date, end_date, created_at, updated_at, persona_id, sequence_config, goals, playbook_run_id } = cmp;
      const { error } = await supabase.from('campaigns').upsert({
        id,
        workspace_id,
        user_id,
        name,
        description,
        niches: (() => { try { return JSON.parse(niches || '[]'); } catch { return []; } })(),
        cities: (() => { try { return JSON.parse(cities || '[]'); } catch { return []; } })(),
        status,
        start_date,
        end_date,
        created_at,
        updated_at,
        persona_id: persona_id || null,
        sequence_config: (() => { try { return sequence_config ? JSON.parse(sequence_config) : null; } catch { return null; } })(),
        goals: (() => { try { return goals ? JSON.parse(goals) : null; } catch { return null; } })(),
        playbook_run_id: playbook_run_id || null
      });
      if (!error) {
        await db.run("UPDATE campaigns SET sync_status = 'synced' WHERE id = ?", [id]);
      } else {
        console.error("Error pushing insert for campaign", id, error);
      }
    } else if (cmp.sync_status === 'pending_update') {
      const { id, name, description, niches, cities, status, start_date, end_date, updated_at, persona_id, sequence_config, goals, playbook_run_id } = cmp;
      const { error } = await supabase.from('campaigns').update({
        name,
        description,
        niches: (() => { try { return JSON.parse(niches || '[]'); } catch { return []; } })(),
        cities: (() => { try { return JSON.parse(cities || '[]'); } catch { return []; } })(),
        status,
        start_date,
        end_date,
        updated_at,
        persona_id: persona_id || null,
        sequence_config: (() => { try { return sequence_config ? JSON.parse(sequence_config) : null; } catch { return null; } })(),
        goals: (() => { try { return goals ? JSON.parse(goals) : null; } catch { return null; } })(),
        playbook_run_id: playbook_run_id || null
      }).eq('id', id);
      if (!error) {
        await db.run("UPDATE campaigns SET sync_status = 'synced' WHERE id = ?", [id]);
      } else {
        console.error("Error pushing update for campaign", id, error);
      }
    } else if (cmp.sync_status === 'pending_delete') {
      const { error } = await supabase.from('campaigns').delete().eq('id', cmp.id);
      if (!error) {
        await db.run("DELETE FROM campaigns WHERE id = ?", [cmp.id]);
      } else {
        console.error("Error pushing delete for campaign", cmp.id, error);
      }
    }
  }

  // 9. Lead Validations Push
  const pendingValidations = await db.all("SELECT * FROM lead_validations WHERE sync_status != 'synced'");
  for (const val of pendingValidations) {
    if (val.sync_status === 'pending_insert') {
      const { id, user_id, workspace_id, business_name, niche, city, phone, email, website, address, rating, reviews_count, latitude, longitude, source, status, original_tags, quality_score, completeness_score, local_fit_score, opportunity_score, created_at, updated_at } = val;
      const { error } = await supabase.from('lead_validations').upsert({
        id,
        user_id,
        workspace_id,
        business_name,
        niche,
        city,
        phone,
        email,
        website,
        address,
        rating,
        reviews_count,
        latitude,
        longitude,
        source,
        status,
        original_tags: (() => { try { return JSON.parse(original_tags || '{}'); } catch { return {}; } })(),
        quality_score,
        completeness_score,
        local_fit_score,
        opportunity_score,
        created_at,
        updated_at
      });
      if (!error) {
        await db.run("UPDATE lead_validations SET sync_status = 'synced' WHERE id = ?", [id]);
      } else {
        console.error("Error pushing insert for lead_validation", id, error);
      }
    } else if (val.sync_status === 'pending_update') {
      const { id, business_name, phone, email, website, address, status, quality_score, completeness_score, local_fit_score, opportunity_score, updated_at } = val;
      const { error } = await supabase.from('lead_validations').update({
        business_name,
        phone,
        email,
        website,
        address,
        status,
        quality_score,
        completeness_score,
        local_fit_score,
        opportunity_score,
        updated_at
      }).eq('id', id);
      if (!error) {
        await db.run("UPDATE lead_validations SET sync_status = 'synced' WHERE id = ?", [id]);
      } else {
        console.error("Error pushing update for lead_validation", id, error);
      }
    } else if (val.sync_status === 'pending_delete') {
      const { error } = await supabase.from('lead_validations').delete().eq('id', val.id);
      if (!error) {
        await db.run("DELETE FROM lead_validations WHERE id = ?", [val.id]);
      } else {
        console.error("Error pushing delete for lead_validation", val.id, error);
      }
    }
  }

  // 10. OSM Feedback Push
  const pendingFeedback = await db.all("SELECT * FROM osm_feedback WHERE sync_status = 'pending_insert'");
  for (const fb of pendingFeedback) {
    const { id, user_id, workspace_id, niche, city, action_type, original_value, corrected_value, osm_id, created_at } = fb;
    const { error } = await supabase.from('osm_feedback').upsert({
      id,
      user_id,
      workspace_id,
      niche,
      city,
      action_type,
      original_value,
      corrected_value,
      osm_id,
      created_at
    });
    if (!error) {
      await db.run("UPDATE osm_feedback SET sync_status = 'synced' WHERE id = ?", [id]);
    } else {
      console.error("Error pushing osm_feedback", id, error);
    }
  }
}


async function syncPull() {
  // 1. Settings Pull (Last-Write-Wins)
  const localSetting = await db.get("SELECT updated_at, sync_status FROM settings WHERE user_id = ?", [currentUserId]);
  const { data: remoteSettings, error: settingsError } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', currentUserId)
    .maybeSingle();

  if (!settingsError && remoteSettings) {
    const shouldUpdate = !localSetting || 
                         (localSetting.sync_status === 'synced' && 
                          new Date(remoteSettings.updated_at) > new Date(localSetting.updated_at || 0));
    if (shouldUpdate) {
      const { user_id, full_name, last_name, phone, email, company_name, timezone, niches, cities, ai_tone, ai_density, quick_note, focus_title, focus_items, smtp_config, groq_api_key, together_api_key, openrouter_key, ai_provider, ai_model, avatar_base64, user_role, bio, email_signature, active_workspace_id, updated_at } = remoteSettings;
      await db.run(`INSERT INTO settings (user_id, full_name, last_name, phone, email, company_name, timezone, niches, cities, ai_tone, ai_density, quick_note, focus_title, focus_items, smtp_config, groq_api_key, together_api_key, openrouter_key, ai_provider, ai_model, avatar_base64, user_role, bio, email_signature, active_workspace_id, updated_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
        ON CONFLICT(user_id) DO UPDATE SET
          full_name = excluded.full_name,
          last_name = excluded.last_name,
          phone = excluded.phone,
          email = excluded.email,
          company_name = excluded.company_name,
          timezone = excluded.timezone,
          niches = excluded.niches,
          cities = excluded.cities,
          ai_tone = excluded.ai_tone,
          ai_density = excluded.ai_density,
          quick_note = excluded.quick_note,
          focus_title = excluded.focus_title,
          focus_items = excluded.focus_items,
          smtp_config = excluded.smtp_config,
          groq_api_key = excluded.groq_api_key,
          together_api_key = excluded.together_api_key,
          openrouter_key = excluded.openrouter_key,
          ai_provider = excluded.ai_provider,
          ai_model = excluded.ai_model,
          avatar_base64 = excluded.avatar_base64,
          user_role = excluded.user_role,
          bio = excluded.bio,
          email_signature = excluded.email_signature,
          active_workspace_id = excluded.active_workspace_id,
          updated_at = excluded.updated_at,
          sync_status = 'synced'`,
        [user_id, full_name, last_name, phone, email, company_name, timezone, JSON.stringify(niches || []), JSON.stringify(cities || []), ai_tone, ai_density, quick_note, focus_title, JSON.stringify(focus_items || []), smtp_config || null, groq_api_key || null, together_api_key || null, openrouter_key || null, ai_provider || 'anthropic', ai_model || 'openrouter/free', avatar_base64 || null, user_role || null, bio || null, email_signature || null, active_workspace_id || null, updated_at]
      );
    }
  }

  // 2. Leads Pull (Last-Write-Wins)
  const { data: remoteLeads, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', currentUserId);

  if (!leadsError && remoteLeads) {
    const localLeadsRows = await db.all("SELECT id, updated_at, sync_status FROM leads WHERE user_id = ?", [currentUserId]);
    const localLeadsMap = new Map(localLeadsRows.map(l => [l.id, l]));

    for (const lead of remoteLeads) {
      const { id, user_id, business_name, contact_name, contact_email, niche, city, source, status, temperature, next_action, next_action_date, owner, image_url, workspace_id, created_at, updated_at, website, rating, reviews_count, maps_url, latitude, longitude, phone, score, fit_score, intent_score, reply_status, nba_score, nba_action, nba_reason, nba_channel, nba_computed_at, email_opens_count, email_clicks_count, pipeline_stagnation_days, cadence_phase, cadence_started_at, cadence_updated_at } = lead;

      const localLead = localLeadsMap.get(id);
      if (!localLead) {
        await db.run(`INSERT INTO leads (id, user_id, business_name, contact_name, contact_email, niche, city, source, status, temperature, next_action, next_action_date, owner, image_url, workspace_id, created_at, updated_at, website, rating, reviews_count, maps_url, latitude, longitude, phone, score, fit_score, intent_score, reply_status, nba_score, nba_action, nba_reason, nba_channel, nba_computed_at, email_opens_count, email_clicks_count, pipeline_stagnation_days, cadence_phase, cadence_started_at, cadence_updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
          [id, user_id, business_name, contact_name, contact_email, niche, city, source, status, temperature, next_action, next_action_date, owner, image_url, workspace_id, created_at, updated_at, website, rating, reviews_count, maps_url, latitude, longitude, phone, score, fit_score, intent_score, reply_status, nba_score ?? 0, nba_action ?? null, nba_reason ?? null, nba_channel ?? 'email', nba_computed_at ?? null, email_opens_count ?? 0, email_clicks_count ?? 0, pipeline_stagnation_days ?? 0, cadence_phase ?? 'initial_email', cadence_started_at ?? null, cadence_updated_at ?? null]
        );
      } else {
        const isRemoteNewer = new Date(updated_at) > new Date(localLead.updated_at || 0);
        const canOverwrite = localLead.sync_status === 'synced' || isRemoteNewer;
        if (canOverwrite) {
          await db.run(`UPDATE leads SET
            user_id = ?, business_name = ?, contact_name = ?, contact_email = ?, niche = ?, city = ?, source = ?,
            status = ?, temperature = ?, next_action = ?, next_action_date = ?, owner = ?, image_url = ?,
            workspace_id = ?, created_at = ?, updated_at = ?, website = ?, rating = ?, reviews_count = ?, maps_url = ?, latitude = ?, longitude = ?, phone = ?, score = ?, fit_score = ?, intent_score = ?, reply_status = ?,
            nba_score = ?, nba_action = ?, nba_reason = ?, nba_channel = ?, nba_computed_at = ?, email_opens_count = ?, email_clicks_count = ?, pipeline_stagnation_days = ?,
            cadence_phase = ?, cadence_started_at = ?, cadence_updated_at = ?, sync_status = 'synced'
            WHERE id = ?`,
            [user_id, business_name, contact_name, contact_email, niche, city, source, status, temperature, next_action, next_action_date, owner, image_url, workspace_id, created_at, updated_at, website, rating, reviews_count, maps_url, latitude, longitude, phone, score, fit_score, intent_score, reply_status, nba_score ?? 0, nba_action ?? null, nba_reason ?? null, nba_channel ?? 'email', nba_computed_at ?? null, email_opens_count ?? 0, email_clicks_count ?? 0, pipeline_stagnation_days ?? 0, cadence_phase ?? 'initial_email', cadence_started_at ?? null, cadence_updated_at ?? null, id]
          );
        }
      }
    }
  }

  // 3. Drafts Pull
  const { data: remoteDrafts, error: draftsError } = await supabase
    .from('drafts')
    .select('*')
    .eq('user_id', currentUserId);

  if (!draftsError && remoteDrafts) {
    for (const draft of remoteDrafts) {
      const { id, lead_id, user_id, channel, tone, content, status, workspace_id, created_at } = draft;
      await db.run(`INSERT INTO drafts (id, lead_id, user_id, channel, tone, content, status, workspace_id, created_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
        ON CONFLICT(id) DO UPDATE SET
          channel = excluded.channel,
          tone = excluded.tone,
          content = excluded.content,
          status = excluded.status,
          workspace_id = excluded.workspace_id,
          sync_status = 'synced'
        WHERE sync_status = 'synced'`,
        [id, lead_id, user_id, channel, tone, content, status, workspace_id, created_at]
      );
    }
  }

  // 4. Notes Pull
  const { data: remoteNotes, error: notesError } = await supabase
    .from('notes')
    .select('*')
    .eq('user_id', currentUserId);

  if (!notesError && remoteNotes) {
    for (const note of remoteNotes) {
      const { id, lead_id, user_id, type, content, workspace_id, created_at } = note;
      await db.run(`INSERT INTO notes (id, lead_id, user_id, type, content, workspace_id, created_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
        ON CONFLICT(id) DO UPDATE SET
          type = excluded.type,
          content = excluded.content,
          workspace_id = excluded.workspace_id,
          sync_status = 'synced'
        WHERE sync_status = 'synced'`,
        [id, lead_id, user_id, type, content, workspace_id, created_at]
      );
    }
  }

  // 5. Tasks Pull
  const { data: remoteTasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', currentUserId);

  if (!tasksError && remoteTasks) {
    const localTasksRows = await db.all("SELECT id, sync_status FROM tasks WHERE user_id = ?", [currentUserId]);
    const localTasksMap = new Map(localTasksRows.map(t => [t.id, t]));

    for (const task of remoteTasks) {
      const { id, user_id, title, completed, category, due_date, workspace_id, created_at } = task;
      const localTask = localTasksMap.get(id);
      const completedInt = completed ? 1 : 0;
      if (!localTask) {
        await db.run(`INSERT INTO tasks (id, user_id, title, completed, category, due_date, workspace_id, created_at, updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
          [id, user_id, title, completedInt, category, due_date, workspace_id, created_at, created_at]
        );
      } else if (localTask.sync_status === 'synced') {
        await db.run(`UPDATE tasks SET
          user_id = ?, title = ?, completed = ?, category = ?, due_date = ?, workspace_id = ?, updated_at = ?
          WHERE id = ?`,
          [user_id, title, completedInt, category, due_date, workspace_id, created_at, id]
        );
      }
    }
  }

  // 6. Workspaces Pull
  const { data: remoteWorkspaces, error: workspacesError } = await supabase
    .from('workspaces')
    .select('*')
    .eq('owner_id', currentUserId);

  if (!workspacesError && remoteWorkspaces) {
    const localWsRows = await db.all("SELECT id, sync_status FROM workspaces");
    const localWsMap = new Map(localWsRows.map(w => [w.id, w]));

    for (const ws of remoteWorkspaces) {
      const { id, name, owner_id, description, tag, accent_color, logo_base64, created_at } = ws;
      const localWs = localWsMap.get(id);
      if (!localWs) {
        await db.run(`INSERT INTO workspaces (id, name, owner_id, description, tag, accent_color, logo_base64, created_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
          [id, name, owner_id, description, tag, accent_color, logo_base64, created_at]
        );
      } else if (localWs.sync_status === 'synced') {
        await db.run(`UPDATE workspaces SET name = ?, owner_id = ?, description = ?, tag = ?, accent_color = ?, logo_base64 = ?, created_at = ? WHERE id = ?`,
          [name, owner_id, description, tag, accent_color, logo_base64, created_at, id]
        );
      }
    }
  }

  // 7. Route Plans Pull
  const { data: remoteRoutePlans, error: routePlansError } = await supabase
    .from('route_plans')
    .select('*')
    .eq('user_id', currentUserId);

  if (!routePlansError && remoteRoutePlans) {
    const localPlansRows = await db.all("SELECT id, sync_status, updated_at FROM route_plans WHERE user_id = ?", [currentUserId]);
    const localPlansMap = new Map(localPlansRows.map(p => [p.id, p]));

    for (const plan of remoteRoutePlans) {
      const { id, workspace_id, user_id, campaign_id, lead_ids, distance_km, duration_min, status, created_at, updated_at } = plan;
      const localPlan = localPlansMap.get(id);

      if (!localPlan) {
        await db.run(`INSERT INTO route_plans (id, workspace_id, user_id, campaign_id, lead_ids, distance_km, duration_min, status, created_at, updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
          [id, workspace_id, user_id, campaign_id, JSON.stringify(lead_ids || []), distance_km, duration_min, status, created_at, updated_at]
        );
      } else {
        const isRemoteNewer = new Date(updated_at) > new Date(localPlan.updated_at || 0);
        const canOverwrite = localPlan.sync_status === 'synced' || isRemoteNewer;
        if (canOverwrite) {
          await db.run(`UPDATE route_plans SET
            workspace_id = ?, campaign_id = ?, lead_ids = ?, distance_km = ?, duration_min = ?, status = ?, updated_at = ?, sync_status = 'synced'
            WHERE id = ?`,
            [workspace_id, campaign_id, JSON.stringify(lead_ids || []), distance_km, duration_min, status, updated_at, id]
          );
        }
      }
    }
  }

  // 8. Field Visits Pull
  const { data: remoteFieldVisits, error: fieldVisitsError } = await supabase
    .from('field_visits')
    .select('*, route_plans!inner(user_id)')
    .eq('route_plans.user_id', currentUserId);

  if (!fieldVisitsError && remoteFieldVisits) {
    const localVisitsRows = await db.all("SELECT id, sync_status, updated_at FROM field_visits");
    const localVisitsMap = new Map(localVisitsRows.map(v => [v.id, v]));

    for (const visit of remoteFieldVisits) {
      const { id, route_plan_id, lead_id, workspace_id, outcome, notes, visited_at, meeting_datetime, follow_up_added, deal_created, created_at, updated_at } = visit;
      const localVisit = localVisitsMap.get(id);

      const followUpAddedInt = follow_up_added ? 1 : 0;
      const dealCreatedInt = deal_created ? 1 : 0;

      if (!localVisit) {
        await db.run(`INSERT INTO field_visits (id, route_plan_id, lead_id, workspace_id, outcome, notes, visited_at, meeting_datetime, follow_up_added, deal_created, created_at, updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
          [id, route_plan_id, lead_id, workspace_id, outcome, notes, visited_at, meeting_datetime, followUpAddedInt, dealCreatedInt, created_at, updated_at]
        );
      } else {
        const isRemoteNewer = new Date(updated_at) > new Date(localVisit.updated_at || 0);
        const canOverwrite = localVisit.sync_status === 'synced' || isRemoteNewer;
        if (canOverwrite) {
          await db.run(`UPDATE field_visits SET
            route_plan_id = ?, lead_id = ?, workspace_id = ?, outcome = ?, notes = ?, visited_at = ?, meeting_datetime = ?, follow_up_added = ?, deal_created = ?, updated_at = ?, sync_status = 'synced'
            WHERE id = ?`,
            [route_plan_id, lead_id, workspace_id, outcome, notes, visited_at, meeting_datetime, followUpAddedInt, dealCreatedInt, updated_at, id]
          );
        }
      }
    }
  }

  // 9. Campaigns Pull
  const { data: remoteCampaigns, error: campaignsError } = await supabase
    .from('campaigns')
    .select('*')
    .eq('user_id', currentUserId);

  if (!campaignsError && remoteCampaigns) {
    const localCampaignsRows = await db.all("SELECT id, updated_at, sync_status FROM campaigns WHERE user_id = ?", [currentUserId]);
    const localCampaignsMap = new Map(localCampaignsRows.map(c => [c.id, c]));

    for (const cmp of remoteCampaigns) {
      const { id, workspace_id, user_id, name, description, niches, cities, status, start_date, end_date, created_at, updated_at, persona_id, sequence_config, goals, playbook_run_id } = cmp;
      const localCmp = localCampaignsMap.get(id);
      
      const nichesStr = JSON.stringify(niches || []);
      const citiesStr = JSON.stringify(cities || []);
      const seqStr = sequence_config ? JSON.stringify(sequence_config) : null;
      const goalsStr = goals ? JSON.stringify(goals) : null;

      if (!localCmp) {
        await db.run(`INSERT INTO campaigns (id, workspace_id, user_id, name, description, niches, cities, status, start_date, end_date, created_at, updated_at, persona_id, sequence_config, goals, playbook_run_id, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
          [id, workspace_id, user_id, name, description, nichesStr, citiesStr, status, start_date, end_date, created_at, updated_at, persona_id, seqStr, goalsStr, playbook_run_id]
        );
      } else {
        const isRemoteNewer = new Date(updated_at) > new Date(localCmp.updated_at || 0);
        const canOverwrite = localCmp.sync_status === 'synced' || isRemoteNewer;
        if (canOverwrite) {
          await db.run(`UPDATE campaigns SET
            workspace_id = ?, user_id = ?, name = ?, description = ?, niches = ?, cities = ?, status = ?,
            start_date = ?, end_date = ?, created_at = ?, updated_at = ?, persona_id = ?,
            sequence_config = ?, goals = ?, playbook_run_id = ?, sync_status = 'synced'
            WHERE id = ?`,
            [workspace_id, user_id, name, description, nichesStr, citiesStr, status, start_date, end_date, created_at, updated_at, persona_id, seqStr, goalsStr, playbook_run_id, id]
          );
        }
      }
    }
  }

  // 11. Lead Validations Pull
  const { data: remoteValidations, error: valError } = await supabase
    .from('lead_validations')
    .select('*')
    .eq('user_id', currentUserId);

  if (!valError && remoteValidations) {
    const localValRows = await db.all("SELECT id, updated_at, sync_status FROM lead_validations WHERE user_id = ?", [currentUserId]);
    const localValMap = new Map(localValRows.map(v => [v.id, v]));

    for (const val of remoteValidations) {
      const { id, user_id, workspace_id, business_name, niche, city, phone, email, website, address, rating, reviews_count, latitude, longitude, source, status, original_tags, quality_score, completeness_score, local_fit_score, opportunity_score, created_at, updated_at } = val;
      const localVal = localValMap.get(id);

      if (!localVal) {
        await db.run(`INSERT INTO lead_validations (id, user_id, workspace_id, business_name, niche, city, phone, email, website, address, rating, reviews_count, latitude, longitude, source, status, original_tags, quality_score, completeness_score, local_fit_score, opportunity_score, created_at, updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
          [id, user_id, workspace_id, business_name, niche, city, phone, email, website, address, rating, reviews_count, latitude, longitude, source, status, JSON.stringify(original_tags || {}), quality_score, completeness_score, local_fit_score, opportunity_score, created_at, updated_at]
        );
      } else {
        const isRemoteNewer = new Date(updated_at) > new Date(localVal.updated_at || 0);
        if (localVal.sync_status === 'synced' || isRemoteNewer) {
          await db.run(`UPDATE lead_validations SET
            business_name = ?, phone = ?, email = ?, website = ?, address = ?, status = ?, quality_score = ?, completeness_score = ?, local_fit_score = ?, opportunity_score = ?, updated_at = ?, sync_status = 'synced'
            WHERE id = ?`,
            [business_name, phone, email, website, address, status, quality_score, completeness_score, local_fit_score, opportunity_score, updated_at, id]
          );
        }
      }
    }
  }
}

module.exports = {
  setSession,
  triggerSync
};

