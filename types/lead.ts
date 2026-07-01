/** Raw DB row (snake_case) for the leads table — v7.1/v8.2 inclusive */
export interface DbLead {
  id: string;
  user_id: string | null;
  business_name: string | null;
  contact_name: string | null;
  contact_email: string | null;
  niche: string | null;
  city: string | null;
  source: string | null;
  status: string | null;
  temperature: string | null;
  next_action: string | null;
  next_action_date: string | null;
  owner: string | null;
  image_url: string | null;
  workspace_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  sync_status: string | null;
  // Enrichment
  website: string | null;
  website_description: string | null;
  rating: number | null;
  reviews_count: number | null;
  maps_url: string | null;
  photos: string | null;
  social_links: string | null;
  assigned_to: string | null;
  phone: string | null;
  latitude: number | null;
  longitude: number | null;
  score: number | null;
  // Qualification v2.34
  fit_score: number | null;
  intent_score: number | null;
  bant_budget: number | null;
  bant_authority: number | null;
  bant_need: number | null;
  bant_timing: number | null;
  suggested_emails: string | null;
  decision_maker_name: string | null;
  decision_maker_role: string | null;
  deal_amount: number | null;
  deal_probability: number | null;
  deal_closing_date: string | null;
  campaign_id: string | null;
  last_activity_at: string | null;
  reply_detected_at: string | null;
  gmail_thread_id: string | null;
  reply_status: string | null;
  // Acquisition v4.1
  lead_source_type: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  // Scoring v4.4
  score_icp: number | null;
  score_engagement: number | null;
  score_urgency: number | null;
  score_revenue: number | null;
  // Tags v4.11
  tags: string | null;
  // v7.1 NBA Engine
  nba_score: number;
  nba_action: string | null;
  nba_reason: string | null;
  nba_channel: string;
  nba_computed_at: string | null;
  email_opens_count: number;
  email_clicks_count: number;
  pipeline_stagnation_days: number;
  // v8.2 Cadence
  cadence_phase: string;
  cadence_started_at: string | null;
  cadence_updated_at: string | null;
}
