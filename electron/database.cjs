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
      active_workspace_id TEXT DEFAULT NULL,
      openrouter_key TEXT DEFAULT NULL,
      ai_provider TEXT DEFAULT 'anthropic',
      ai_model TEXT DEFAULT 'openrouter/free',
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
    // v3.6.0 — behavioral intelligence toggles
    db.run(`ALTER TABLE settings ADD COLUMN auto_insights INTEGER DEFAULT 1`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN auto_follow_ups INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN todoist_project_id TEXT`, () => {
      // Ignore if column already exists
    });
    db.run(`ALTER TABLE settings ADD COLUMN active_workspace_id TEXT DEFAULT NULL`, () => {
      // Ignore if column already exists
    });
    // v3.23.0 — Slack + Notion integration columns
    db.run(`ALTER TABLE settings ADD COLUMN slack_webhook_url TEXT`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN notion_token TEXT`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN notion_database_id TEXT`, () => {});

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
    db.run(`ALTER TABLE settings ADD COLUMN daily_email_limit INTEGER DEFAULT 50`, () => {});

    // v2.12.0 notification migrations (safe re-run)
    db.run(`ALTER TABLE notifications ADD COLUMN workspace_id TEXT`, () => {});

    // v2.62.0 HERE & Yelp API key migrations
    db.run(`ALTER TABLE settings ADD COLUMN here_api_key TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN yelp_api_key TEXT DEFAULT NULL`, () => {});

    // v2.63.0 Firecrawl API key migration
    db.run(`ALTER TABLE settings ADD COLUMN firecrawl_api_key TEXT DEFAULT NULL`, () => {});

    // OpenRouter and AI configuration migrations (replicated from Supabase settings schema)
    db.run(`ALTER TABLE settings ADD COLUMN openrouter_key TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN ai_provider TEXT DEFAULT 'anthropic'`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN ai_model TEXT DEFAULT 'openrouter/free'`, () => {});

    // v2.12.0 lead enrichment migrations
    db.run(`ALTER TABLE leads ADD COLUMN website TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN website_description TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN rating REAL DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN reviews_count INTEGER DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN maps_url TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN photos TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN social_links TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN assigned_to TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN phone TEXT DEFAULT NULL`, () => {});

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
    // v2.50.0 — inbox reply_status
    db.run(`ALTER TABLE leads ADD COLUMN reply_status TEXT DEFAULT NULL`, () => {});
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

    // v3.0.0 — playbooks + playbook_runs
    db.run(`CREATE TABLE IF NOT EXISTS playbooks (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      persona_id TEXT,
      default_cities TEXT DEFAULT '[]',
      default_niches TEXT DEFAULT '[]',
      default_radius_km INTEGER DEFAULT 15,
      default_sequence_config TEXT DEFAULT '{}',
      default_goals TEXT DEFAULT '{}',
      category TEXT,
      description TEXT,
      emoji TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_playbooks_slug ON playbooks(slug)`);

    db.run(`CREATE TABLE IF NOT EXISTS playbook_runs (
      id TEXT PRIMARY KEY,
      playbook_id TEXT REFERENCES playbooks(id),
      workspace_id TEXT,
      campaign_id TEXT,
      status TEXT DEFAULT 'running',
      leads_scraped INTEGER DEFAULT 0,
      emails_sent INTEGER DEFAULT 0,
      created_at TEXT,
      completed_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'pending_insert'
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_playbook_runs_workspace_id ON playbook_runs(workspace_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_playbook_runs_campaign_id ON playbook_runs(campaign_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_playbook_runs_playbook_id ON playbook_runs(playbook_id)`);

    // v3.0.0 — route_plans + field_visits (Mode Terrain)
    db.run(`CREATE TABLE IF NOT EXISTS route_plans (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      user_id TEXT,
      campaign_id TEXT,
      lead_ids TEXT NOT NULL DEFAULT '[]',
      distance_km REAL,
      duration_min INTEGER,
      status TEXT DEFAULT 'planned',
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'pending_insert'
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_route_plans_workspace_id ON route_plans(workspace_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_route_plans_campaign_id ON route_plans(campaign_id)`);

    db.run(`CREATE TABLE IF NOT EXISTS field_visits (
      id TEXT PRIMARY KEY,
      route_plan_id TEXT,
      lead_id TEXT,
      workspace_id TEXT,
      outcome TEXT,
      notes TEXT,
      visited_at TEXT,
      meeting_datetime TEXT,
      follow_up_added INTEGER DEFAULT 0,
      deal_created INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'pending_insert'
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_field_visits_route_plan_id ON field_visits(route_plan_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_field_visits_lead_id ON field_visits(lead_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_field_visits_sync_status ON field_visits(sync_status)`);
    // v3.1.0 — richer field-visit context (Phase 1)
    db.run(`ALTER TABLE field_visits ADD COLUMN contact_met TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE field_visits ADD COLUMN interest_level TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE field_visits ADD COLUMN proof_image TEXT DEFAULT NULL`, () => {});

    // v3.0.0 — campaigns enrichment (persona, sequence_config, goals, playbook_run_id)
    db.run(`ALTER TABLE campaigns ADD COLUMN persona_id TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE campaigns ADD COLUMN sequence_config TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE campaigns ADD COLUMN goals TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE campaigns ADD COLUMN playbook_run_id TEXT DEFAULT NULL`, () => {});

    // v2.64.0 — inbound/outbound webhooks
    db.run(`CREATE TABLE IF NOT EXISTS inbound_webhooks (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      workspace_id TEXT,
      platform TEXT DEFAULT 'other',
      name TEXT,
      token TEXT UNIQUE,
      active INTEGER DEFAULT 1,
      last_event_at TEXT,
      last_event_data TEXT,
      leads_created INTEGER DEFAULT 0,
      created_at TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS outbound_webhooks (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      workspace_id TEXT,
      name TEXT,
      url TEXT,
      events TEXT DEFAULT '[]',
      active INTEGER DEFAULT 1,
      secret TEXT,
      last_triggered_at TEXT,
      last_status INTEGER,
      last_error TEXT,
      created_at TEXT
    )`);

    // v3.0.0 — personas table (migrated from local storage)
    db.run(`CREATE TABLE IF NOT EXISTS personas (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      name TEXT,
      description TEXT,
      target_niches TEXT DEFAULT '[]',
      target_cities TEXT DEFAULT '[]',
      scoring_criteria TEXT DEFAULT '{}',
      case_studies TEXT DEFAULT '[]',
      faqs TEXT DEFAULT '[]',
      call_scripts TEXT DEFAULT '{}',
      email_templates TEXT DEFAULT '{}',
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'pending_insert'
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_personas_workspace_id ON personas(workspace_id)`);

    // v4.0.0 — automations and logs
    db.run(`CREATE TABLE IF NOT EXISTS automations (
      id TEXT PRIMARY KEY,
      workspace_id TEXT,
      name TEXT,
      trigger_type TEXT,
      conditions TEXT DEFAULT '[]',
      actions TEXT DEFAULT '[]',
      is_active INTEGER DEFAULT 1,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'pending_insert'
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_automations_workspace_id ON automations(workspace_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_automations_is_active ON automations(is_active)`);

    db.run(`CREATE TABLE IF NOT EXISTS automation_logs (
      id TEXT PRIMARY KEY,
      automation_id TEXT,
      workspace_id TEXT,
      trigger_event TEXT,
      status TEXT,
      error TEXT,
      created_at TEXT
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_automation_logs_workspace_id ON automation_logs(workspace_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_automation_logs_automation_id ON automation_logs(automation_id)`);

    // v5.0.0 — lead_validations table
    db.run(`CREATE TABLE IF NOT EXISTS lead_validations (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      workspace_id TEXT,
      business_name TEXT,
      niche TEXT,
      city TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      address TEXT,
      rating REAL,
      reviews_count INTEGER,
      latitude REAL,
      longitude REAL,
      source TEXT,
      status TEXT DEFAULT 'to_verify',
      original_tags TEXT DEFAULT '{}',
      quality_score INTEGER DEFAULT 0,
      completeness_score INTEGER DEFAULT 0,
      local_fit_score INTEGER DEFAULT 0,
      opportunity_score INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_lead_validations_workspace_id ON lead_validations(workspace_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_lead_validations_status ON lead_validations(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_lead_validations_sync_status ON lead_validations(sync_status)`);

    // v5.0.0 — osm_feedback table
    db.run(`CREATE TABLE IF NOT EXISTS osm_feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      workspace_id TEXT,
      niche TEXT,
      city TEXT,
      action_type TEXT,
      original_value TEXT,
      corrected_value TEXT,
      osm_id TEXT,
      created_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_osm_feedback_workspace_id ON osm_feedback(workspace_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_osm_feedback_sync_status ON osm_feedback(sync_status)`);

    // v4.1.0 — Acquisition: lead_source_type + UTM + lead_events
    db.run(`ALTER TABLE leads ADD COLUMN lead_source_type TEXT DEFAULT 'manual'`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN utm_source TEXT`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN utm_medium TEXT`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN utm_campaign TEXT`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN utm_content TEXT`, () => {});
    db.run(`CREATE TABLE IF NOT EXISTS lead_events (
      id TEXT PRIMARY KEY,
      lead_id TEXT NOT NULL,
      workspace_id TEXT NOT NULL,
      user_id TEXT,
      event_type TEXT NOT NULL,
      title TEXT,
      body TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL,
      sync_status TEXT DEFAULT 'pending_insert'
    )`, () => {});

    // v4.2.0 — Outreach: sequence_templates, sequence_enrollments, email_queue
    db.run(`CREATE TABLE IF NOT EXISTS sequence_templates (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL,
      name TEXT NOT NULL, description TEXT,
      steps TEXT DEFAULT '[]', status TEXT DEFAULT 'active', tags TEXT DEFAULT '[]',
      created_by TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
      sync_status TEXT DEFAULT 'pending_insert'
    )`, () => {});
    db.run(`CREATE TABLE IF NOT EXISTS sequence_enrollments (
      id TEXT PRIMARY KEY, template_id TEXT, lead_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
      current_step INTEGER DEFAULT 0, status TEXT DEFAULT 'active',
      next_action_at TEXT, enrolled_at TEXT NOT NULL, completed_at TEXT,
      enrolled_by TEXT, metadata TEXT DEFAULT '{}', sync_status TEXT DEFAULT 'pending_insert'
    )`, () => {});
    db.run(`CREATE TABLE IF NOT EXISTS email_queue (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, lead_id TEXT, enrollment_id TEXT,
      to_email TEXT NOT NULL, to_name TEXT, subject TEXT NOT NULL, body_html TEXT NOT NULL,
      body_text TEXT, status TEXT DEFAULT 'pending', scheduled_at TEXT, sent_at TEXT,
      error_message TEXT, gmail_message_id TEXT, gmail_thread_id TEXT,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL, sync_status TEXT DEFAULT 'pending_insert'
    )`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN outreach_daily_quota INTEGER DEFAULT 50`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN outreach_window_start TEXT DEFAULT '09:00'`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN outreach_window_end TEXT DEFAULT '18:00'`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN outreach_window_days TEXT DEFAULT 'mon,tue,wed,thu,fri'`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN outreach_warmup_delay INTEGER DEFAULT 30`, () => {});

    // v4.3.0 — Team DMs
    db.run(`ALTER TABLE team_messages ADD COLUMN recipient_id TEXT`, () => {});

    // v4.4.0 — Scoring v2: sub-scores multidimensionnels
    db.run(`ALTER TABLE leads ADD COLUMN score_icp INTEGER DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN score_engagement INTEGER DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN score_urgency INTEGER DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE leads ADD COLUMN score_revenue INTEGER DEFAULT NULL`, () => {});

    // v4.11.0 — Lead tags + Automation settings
    db.run(`ALTER TABLE leads ADD COLUMN tags TEXT DEFAULT '[]'`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN auto_enrich_on_import INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN auto_enrich_scheduled INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN auto_email_on_enrichment INTEGER DEFAULT 0`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN auto_tag_replies INTEGER DEFAULT 1`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN auto_email_template_id TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN auto_email_delay_hours INTEGER DEFAULT 0`, () => {});

    // v5.1.0 — AI Assistant sessions, messages, and canvas
    db.run(`CREATE TABLE IF NOT EXISTS assistant_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      workspace_id TEXT,
      title TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_assistant_sessions_workspace_id ON assistant_sessions(workspace_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_assistant_sessions_user_id ON assistant_sessions(user_id)`);

    // v2.87.0 — assistant_sessions: project linking + pinning
    db.run(`ALTER TABLE assistant_sessions ADD COLUMN project_id TEXT DEFAULT NULL`, () => {});
    db.run(`ALTER TABLE assistant_sessions ADD COLUMN pinned INTEGER DEFAULT 0`, () => {});

    db.run(`CREATE TABLE IF NOT EXISTS assistant_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES assistant_sessions(id) ON DELETE CASCADE,
      user_id TEXT,
      role TEXT,
      content TEXT,
      attached_file_name TEXT,
      attached_file_type TEXT,
      created_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_assistant_messages_session_id ON assistant_messages(session_id)`);

    db.run(`CREATE TABLE IF NOT EXISTS assistant_canvas (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      workspace_id TEXT,
      title TEXT,
      content TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced'
    )`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_assistant_canvas_workspace_id ON assistant_canvas(workspace_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_assistant_canvas_user_id ON assistant_canvas(user_id)`);


    // v2.85.0 - google integration tables for local SQLite
    db.run(`CREATE TABLE IF NOT EXISTS google_accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      workspace_id TEXT,
      google_email TEXT NOT NULL,
      status TEXT DEFAULT 'connected',
      created_at TEXT,
      updated_at TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS google_tokens (
      account_id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TEXT,
      created_at TEXT,
      updated_at TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS google_scope_grants (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      scope TEXT NOT NULL,
      granted_at TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS gmail_threads (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      workspace_id TEXT,
      lead_id TEXT,
      subject TEXT,
      last_message_at TEXT,
      snippet TEXT,
      unread INTEGER DEFAULT 0,
      sync_status TEXT DEFAULT 'synced',
      created_at TEXT,
      updated_at TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS calendar_links (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      lead_id TEXT,
      google_event_id TEXT NOT NULL,
      title TEXT,
      start_time TEXT,
      end_time TEXT,
      meet_link TEXT,
      created_at TEXT,
      updated_at TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS drive_files (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      workspace_id TEXT,
      lead_id TEXT,
      name TEXT NOT NULL,
      mime_type TEXT,
      web_view_link TEXT,
      created_at TEXT,
      updated_at TEXT
    )`);
    db.run(`CREATE TABLE IF NOT EXISTS meet_sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      calendar_link_id TEXT,
      google_meet_code TEXT,
      status TEXT DEFAULT 'scheduled',
      start_time TEXT,
      end_time TEXT,
      created_at TEXT,
      updated_at TEXT
    )`);

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
    db.run(`ALTER TABLE drafts ADD COLUMN subject TEXT`, () => {});
    db.run(`ALTER TABLE drafts ADD COLUMN draft_type TEXT DEFAULT 'email'`, () => {});
    db.run(`CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_notes_sync_status ON notes(sync_status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_notes_lead_id ON notes(lead_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_workspaces_sync_status ON workspaces(sync_status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces(owner_id)`);

    // v4.12.0 — Proposals table (multi-section proposal builder)
    db.run(`CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY, lead_id TEXT, workspace_id TEXT, user_id TEXT,
      title TEXT, status TEXT DEFAULT 'draft', amount REAL,
      section_intro TEXT, section_problem TEXT, section_solution TEXT,
      section_pricing TEXT DEFAULT '{}', section_terms TEXT,
      valid_days INTEGER DEFAULT 30, sent_at TEXT, accepted_at TEXT,
      created_at TEXT, updated_at TEXT, sync_status TEXT DEFAULT 'pending_insert'
    )`, () => {});
    db.run(`CREATE INDEX IF NOT EXISTS idx_proposals_lead_id ON proposals(lead_id)`, () => {});
    db.run(`CREATE INDEX IF NOT EXISTS idx_proposals_workspace_id ON proposals(workspace_id)`, () => {});

    // v5.0.0 — Agent memory + actions
    db.run(`CREATE TABLE IF NOT EXISTS agent_memory (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL,
      type TEXT NOT NULL, key TEXT NOT NULL, content TEXT NOT NULL,
      metadata TEXT DEFAULT '{}', created_at TEXT, updated_at TEXT,
      UNIQUE(workspace_id, type, key)
    )`, () => {});
    db.run(`CREATE INDEX IF NOT EXISTS idx_agent_memory_workspace ON agent_memory(workspace_id)`, () => {});

    db.run(`CREATE TABLE IF NOT EXISTS agent_actions (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL, user_id TEXT,
      action_type TEXT NOT NULL, lead_id TEXT,
      reasoning TEXT, data_signals TEXT, result TEXT DEFAULT '{}',
      autonomy_level TEXT DEFAULT 'suggest',
      executed INTEGER DEFAULT 0, suggested INTEGER DEFAULT 1, approved INTEGER,
      created_at TEXT
    )`, () => {});
    db.run(`CREATE INDEX IF NOT EXISTS idx_agent_actions_workspace ON agent_actions(workspace_id)`, () => {});
    db.run(`CREATE INDEX IF NOT EXISTS idx_agent_actions_created ON agent_actions(workspace_id, created_at)`, () => {});

    // v5.0.0 — agent_autonomy column on settings
    db.run(`ALTER TABLE settings ADD COLUMN agent_autonomy TEXT DEFAULT '{}'`, () => {});
    db.run(`ALTER TABLE settings ADD COLUMN agent_enabled INTEGER DEFAULT 1`, () => {});

    // v5.0.0 — source column on tasks/drafts for agent attribution
    db.run(`ALTER TABLE tasks ADD COLUMN source TEXT DEFAULT 'user'`, () => {});
    db.run(`ALTER TABLE drafts ADD COLUMN source TEXT DEFAULT 'user'`, () => {});
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
