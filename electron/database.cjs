const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { app } = require('electron');

let db;

function initDb() {
  const dbPath = path.join(app.getPath('userData'), 'minerva.db');
  db = new sqlite3.Database(dbPath);

  db.serialize(() => {
    // 1. Settings table
    db.run(`CREATE TABLE IF NOT EXISTS settings (
      user_id TEXT PRIMARY KEY,
      full_name TEXT,
      last_name TEXT,
      phone TEXT,
      email TEXT,
      company_name TEXT,
      timezone TEXT,
      niches TEXT,
      cities TEXT,
      ai_tone TEXT,
      ai_density TEXT,
      quick_note TEXT,
      focus_title TEXT,
      focus_items TEXT,
      last_scrape_at TEXT,
      todoist_token TEXT,
      todoist_project_id TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);

    db.run(`ALTER TABLE settings ADD COLUMN last_name TEXT`, () => {
      // Ignore if column already exists
    });
    db.run(`ALTER TABLE settings ADD COLUMN phone TEXT`, () => {
      // Ignore if column already exists
    });
    db.run(`ALTER TABLE settings ADD COLUMN email TEXT`, () => {
      // Ignore if column already exists
    });
    db.run(`ALTER TABLE settings ADD COLUMN todoist_token TEXT`, () => {
      // Ignore if column already exists
    });
    db.run(`ALTER TABLE settings ADD COLUMN todoist_project_id TEXT`, () => {
      // Ignore if column already exists
    });

    // 2. Leads table
    db.run(`CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      business_name TEXT,
      contact_name TEXT,
      contact_email TEXT,
      niche TEXT,
      city TEXT,
      source TEXT,
      status TEXT DEFAULT 'New',
      temperature TEXT DEFAULT 'Warm',
      next_action TEXT,
      next_action_date TEXT,
      owner TEXT DEFAULT 'Moi',
      image_url TEXT,
      workspace_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);

    // 3. Drafts table
    db.run(`CREATE TABLE IF NOT EXISTS drafts (
      id TEXT PRIMARY KEY,
      lead_id TEXT,
      user_id TEXT,
      channel TEXT DEFAULT 'Email',
      tone TEXT,
      content TEXT,
      status TEXT DEFAULT 'Draft',
      workspace_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);

    // 4. Notes table
    db.run(`CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      lead_id TEXT,
      user_id TEXT,
      type TEXT DEFAULT 'general',
      content TEXT,
      workspace_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);

    // 5. Tasks table
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      title TEXT,
      completed INTEGER DEFAULT 0,
      category TEXT DEFAULT 'General',
      due_date TEXT,
      workspace_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);

    // 6. Workspaces table
    db.run(`CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT,
      owner_id TEXT,
      description TEXT,
      tag TEXT,
      accent_color TEXT,
      logo_base64 TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);

    db.run(`ALTER TABLE workspaces ADD COLUMN description TEXT`, () => {});
    db.run(`ALTER TABLE workspaces ADD COLUMN tag TEXT`, () => {});
    db.run(`ALTER TABLE workspaces ADD COLUMN accent_color TEXT`, () => {});
    db.run(`ALTER TABLE workspaces ADD COLUMN logo_base64 TEXT`, () => {});

    // 7. Notifications table
    db.run(`CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      workspace_id TEXT,
      type TEXT DEFAULT 'info',
      title TEXT,
      body TEXT,
      link TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)`);

    // v2.9.0 migrations
    db.run(`ALTER TABLE leads ADD COLUMN score INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN smtp_config TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN groq_api_key TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN together_api_key TEXT DEFAULT NULL`, () => {});

    // v2.9.1 profile migrations
    db.run(`ALTER TABLE settings ADD COLUMN avatar_base64 TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN user_role TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN bio TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN email_signature TEXT DEFAULT NULL`, () => {});

    // v2.12.0 notification migrations (safe re-run)
    db.run(`ALTER TABLE notifications ADD COLUMN workspace_id TEXT`, () => {});

    // v2.12.0 lead enrichment migrations
    db.run(`ALTER TABLE leads ADD COLUMN website TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN rating REAL DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN reviews_count INTEGER DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN maps_url TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN photos TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN social_links TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN assigned_to TEXT DEFAULT NULL`, () => {});

    // 8. Team messages table
    db.run(`CREATE TABLE IF NOT EXISTS team_messages (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      sender_id TEXT,
      sender_name TEXT,
      content TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_team_messages_workspace_id ON team_messages(workspace_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_team_messages_created_at ON team_messages(created_at)`);

    // v2.12.0 team_messages migrations (safe re-run)
    db.run(`ALTER TABLE team_messages ADD COLUMN sender_name TEXT`, () => {});

    // 9. Projects table
    db.run(`CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      owner_id TEXT,
      name TEXT,
      description TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects(workspace_id)`);
    // v2.12.0 project migrations (safe re-run)
    db.run(`ALTER TABLE projects ADD COLUMN description TEXT`, () => {});

    // v2.30.0 — Agent reviews table
    db.run(`CREATE TABLE IF NOT EXISTS agent_reviews (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL,
      user_id TEXT,
      user_name TEXT,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at TEXT
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_agent_reviews_agent_id ON agent_reviews(agent_id)`);

    // v2.34.0 — qualification, enrichissement, deal, campaign migrations
    db.run(`ALTER TABLE leads ADD COLUMN fit_score INTEGER DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN intent_score INTEGER DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN bant_budget INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN bant_authority INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN bant_need INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN bant_timing INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN suggested_emails TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN decision_maker_name TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN decision_maker_role TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN deal_amount REAL DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN deal_probability INTEGER DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN deal_closing_date TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN campaign_id TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN last_activity_at TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN reply_detected_at TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN gmail_thread_id TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN latitude REAL DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN longitude REAL DEFAULT NULL`, () => {});

    // v2.35.0 — campaigns table
    db.run(`CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      user_id TEXT,
      name TEXT,
      description TEXT,
      niches TEXT,
      cities TEXT,
      status TEXT DEFAULT 'active',
      start_date TEXT,
      end_date TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_campaigns_workspace_id ON campaigns(workspace_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_leads_campaign_id ON leads(campaign_id)`);

    // v2.37.0 — activities table
    db.run(`CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      user_id TEXT,
      lead_id TEXT,
      campaign_id TEXT,
      type TEXT,
      title TEXT,
      body TEXT,
      metadata TEXT,
      created_at TEXT
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_activities_workspace_id ON activities(workspace_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities(lead_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_activities_campaign_id ON activities(campaign_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities(created_at)`);

    // v2.40.0 — goals table
    db.run(`CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      user_id TEXT,
      metric TEXT,
      target INTEGER,
      period TEXT DEFAULT 'month',
      created_at TEXT,
      updated_at TEXT
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_goals_workspace_id ON goals(workspace_id)`);

    // v2.41.0 — scrape_jobs table
    db.run(`CREATE TABLE IF NOT EXISTS scrape_jobs (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      user_id TEXT,
      campaign_id TEXT,
      niches TEXT,
      cities TEXT,
      radius INTEGER DEFAULT 10,
      sources TEXT,
      status TEXT DEFAULT 'pending',
      results_count INTEGER DEFAULT 0,
      error TEXT,
      created_at TEXT,
      completed_at TEXT
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_scrape_jobs_workspace_id ON scrape_jobs(workspace_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status)`);

    // Indexes to avoid full table scans during sync
    db.run(`CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_leads_sync_status ON leads(sync_status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_leads_workspace_id ON leads(workspace_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON leads(assigned_to)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_sync_status ON tasks(sync_status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks(workspace_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_drafts_sync_status ON drafts(sync_status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_drafts_lead_id ON drafts(lead_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_notes_sync_status ON notes(sync_status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_notes_lead_id ON notes(lead_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_workspaces_sync_status ON workspaces(sync_status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id)`);
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error("Database not initialized"));
      return;
    }
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

module.exports = {
  initDb,
  run,
  all,
  get
};
