/** Raw DB row (snake_case) for the settings table — v8.5 inclusive */
export interface DbSettings {
  user_id: string;
  full_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  company_name: string | null;
  timezone: string | null;
  niches: string | null;
  cities: string | null;
  ai_tone: string | null;
  ai_density: string | null;
  quick_note: string | null;
  focus_title: string | null;
  focus_items: string | null;
  last_scrape_at: string | null;
  todoist_token: string | null;
  todoist_project_id: string | null;
  active_workspace_id: string | null;
  openrouter_key: string | null;
  ai_provider: string;
  ai_model: string;
  updated_at: string | null;
  sync_status: string;
  // v3.6 behavioral
  auto_insights: number;
  auto_follow_ups: number;
  // v3.23 integrations
  slack_webhook_url: string | null;
  notion_token: string | null;
  notion_database_id: string | null;
  // v2.9
  smtp_config: string | null;
  groq_api_key: string | null;
  together_api_key: string | null;
  // v2.9.1 profile
  avatar_base64: string | null;
  user_role: string | null;
  bio: string | null;
  email_signature: string | null;
  daily_email_limit: number;
  // v2.62 APIs
  here_api_key: string | null;
  yelp_api_key: string | null;
  firecrawl_api_key: string | null;
  // v4.2 outreach
  outreach_daily_quota: number;
  outreach_window_start: string;
  outreach_window_end: string;
  outreach_window_days: string;
  outreach_warmup_delay: number;
  // v4.11 automation
  auto_enrich_on_import: number;
  auto_enrich_scheduled: number;
  auto_email_on_enrichment: number;
  auto_tag_replies: number;
  auto_email_template_id: string | null;
  auto_email_delay_hours: number;
  // v5.0 agent
  agent_autonomy: string;
  agent_enabled: number;
  // v7.1 strategy onboarding
  v7_strategy_niche: string | null;
  v7_strategy_goal: string | null;
  v7_strategy_done: number;
  // v8.5 SLA config
  sla_hot_lead_hours: number;
  sla_approval_hours: number;
  sla_proposal_followup_hours: number;
}
