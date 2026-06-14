const { createClient } = require('@supabase/supabase-js');
const db = require('./database.cjs');

let supabase = null;
let currentUserId = null;
let syncTimer = null;

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
  stopSyncTimer();
  // Sync every 5 minutes (300000 ms)
  syncTimer = setInterval(() => {
    triggerSync().catch(err => console.error("Periodic sync failed:", err));
  }, 300000);
}

function stopSyncTimer() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}

async function triggerSync() {
  if (!supabase || !currentUserId) return;

  try {
    await syncPush();
    await syncPull();
  } catch (err) {
    console.error("Sync error:", err);
  }
}

async function syncPush() {
  // 1. Leads
  const pendingLeads = await db.all("SELECT * FROM leads WHERE sync_status != 'synced'");
  for (const lead of pendingLeads) {
    if (lead.sync_status === 'pending_insert') {
      const { id, user_id, business_name, contact_name, contact_email, niche, city, source, status, temperature, next_action, next_action_date, owner, image_url, workspace_id } = lead;
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
        workspace_id
      });
      if (!error) {
        await db.run("UPDATE leads SET sync_status = 'synced' WHERE id = ?", [id]);
      } else {
        console.error("Error pushing insert for lead", id, error);
      }
    } else if (lead.sync_status === 'pending_update') {
      const { id, business_name, contact_name, contact_email, niche, city, source, status, temperature, next_action, next_action_date, owner, image_url } = lead;
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
        image_url
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

  // 4. Tasks
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
      const { id, name, owner_id, created_at } = ws;
      const { error } = await supabase.from('workspaces').upsert({
        id,
        name,
        owner_id,
        created_at
      });
      if (!error) {
        await db.run("UPDATE workspaces SET sync_status = 'synced' WHERE id = ?", [id]);
      } else {
        console.error("Error pushing insert for workspace", id, error);
      }
    } else if (ws.sync_status === 'pending_update') {
      const { id, name } = ws;
      const { error } = await supabase.from('workspaces').update({
        name
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
    const { user_id, full_name, last_name, phone, email, company_name, timezone, niches, cities, ai_tone, ai_density, quick_note, focus_title, focus_items } = setting;
    const { error } = await supabase.from('settings').upsert({
      user_id,
      full_name,
      last_name,
      phone,
      email,
      company_name,
      timezone,
      niches: JSON.parse(niches || '[]'),
      cities: JSON.parse(cities || '[]'),
      ai_tone,
      ai_density,
      quick_note,
      focus_title,
      focus_items: JSON.parse(focus_items || '[]')
    });
    if (!error) {
      await db.run("UPDATE settings SET sync_status = 'synced' WHERE user_id = ?", [user_id]);
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
      const { user_id, full_name, last_name, phone, email, company_name, timezone, niches, cities, ai_tone, ai_density, quick_note, focus_title, focus_items, updated_at } = remoteSettings;
      await db.run(`INSERT INTO settings (user_id, full_name, last_name, phone, email, company_name, timezone, niches, cities, ai_tone, ai_density, quick_note, focus_title, focus_items, updated_at, sync_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')
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
          updated_at = excluded.updated_at,
          sync_status = 'synced'`,
        [user_id, full_name, last_name, phone, email, company_name, timezone, JSON.stringify(niches || []), JSON.stringify(cities || []), ai_tone, ai_density, quick_note, focus_title, JSON.stringify(focus_items || []), updated_at]
      );
    }
  }

  // 2. Leads Pull (Last-Write-Wins)
  const { data: remoteLeads, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .eq('user_id', currentUserId);

  if (!leadsError && remoteLeads) {
    for (const lead of remoteLeads) {
      const { id, user_id, business_name, contact_name, contact_email, niche, city, source, status, temperature, next_action, next_action_date, owner, image_url, workspace_id, created_at, updated_at } = lead;
      
      const localLead = await db.get("SELECT updated_at, sync_status FROM leads WHERE id = ?", [id]);
      if (!localLead) {
        await db.run(`INSERT INTO leads (id, user_id, business_name, contact_name, contact_email, niche, city, source, status, temperature, next_action, next_action_date, owner, image_url, workspace_id, created_at, updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'synced')`,
          [id, user_id, business_name, contact_name, contact_email, niche, city, source, status, temperature, next_action, next_action_date, owner, image_url, workspace_id, created_at, updated_at]
        );
      } else {
        const isRemoteNewer = new Date(updated_at) > new Date(localLead.updated_at || 0);
        const canOverwrite = localLead.sync_status === 'synced' || isRemoteNewer;
        if (canOverwrite) {
          await db.run(`UPDATE leads SET
            user_id = ?, business_name = ?, contact_name = ?, contact_email = ?, niche = ?, city = ?, source = ?,
            status = ?, temperature = ?, next_action = ?, next_action_date = ?, owner = ?, image_url = ?,
            workspace_id = ?, created_at = ?, updated_at = ?, sync_status = 'synced'
            WHERE id = ?`,
            [user_id, business_name, contact_name, contact_email, niche, city, source, status, temperature, next_action, next_action_date, owner, image_url, workspace_id, created_at, updated_at, id]
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
    for (const task of remoteTasks) {
      const { id, user_id, title, completed, category, due_date, workspace_id, created_at } = task;
      const localTask = await db.get("SELECT sync_status FROM tasks WHERE id = ?", [id]);
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
    .select('*');

  if (!workspacesError && remoteWorkspaces) {
    for (const ws of remoteWorkspaces) {
      const { id, name, owner_id, created_at } = ws;
      const localWs = await db.get("SELECT sync_status FROM workspaces WHERE id = ?", [id]);
      if (!localWs) {
        await db.run(`INSERT INTO workspaces (id, name, owner_id, created_at, sync_status)
          VALUES (?, ?, ?, ?, 'synced')`,
          [id, name, owner_id, created_at]
        );
      } else if (localWs.sync_status === 'synced') {
        await db.run(`UPDATE workspaces SET name = ?, owner_id = ?, created_at = ? WHERE id = ?`,
          [name, owner_id, created_at, id]
        );
      }
    }
  }
}

module.exports = {
  setSession,
  triggerSync
};
