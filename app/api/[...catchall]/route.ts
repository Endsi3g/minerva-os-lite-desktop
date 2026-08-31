// Automatically generated catchall router to consolidate API routes
import { NextRequest, NextResponse } from 'next/server';

import * as route_ads_attribution_1 from '../ads/attribution/handler';
import * as route_ads_facebook_callback_2 from '../ads/facebook/callback/handler';
import * as route_ads_facebook_3 from '../ads/facebook/handler';
import * as route_ads_facebook_webhook_4 from '../ads/facebook/webhook/handler';
import * as route_agency_setup_5 from '../agency-setup/handler';
import * as route_agenda_book_6 from '../agenda/book/handler';
import * as route_agent_actions_7 from '../agent/actions/handler';
import * as route_agent_campaigns_summary_8 from '../agent/campaigns/summary/handler';
import * as route_agent_field_briefing_9 from '../agent/field/briefing/handler';
import * as route_agent_field_10 from '../agent/field/handler';
import * as route_agent_hermes_11 from '../agent/hermes/handler';
import * as route_agent_inbox_suggest_reply_12 from '../agent/inbox/suggest-reply/handler';
import * as route_agent_leads_search_13 from '../agent/leads/search/handler';
import * as route_agent_loop_14 from '../agent/loop/handler';
import * as route_agent_memory_15 from '../agent/memory/handler';
import * as route_agent_next_action_16 from '../agent/next-action/handler';
import * as route_agent_playbooks_deploy_17 from '../agent/playbooks/deploy/handler';
import * as route_agent_relance_18 from '../agent/relance/handler';
import * as route_agent_sequences_create_19 from '../agent/sequences/create/handler';
import * as route_agent_tasks_create_20 from '../agent/tasks/create/handler';
import * as route_agent_today_stats_21 from '../agent/today-stats/handler';
import * as route_agents__id__reviews_22 from '../agents/[id]/reviews/handler';
import * as route_agents_23 from '../agents/handler';
import * as route_agents_run_24 from '../agents/run/handler';
import * as route_agents_team_overview_25 from '../agents/team-overview/handler';
import * as route_ai_gateway_completions_26 from '../ai/gateway/completions/handler';
import * as route_ai_gateway_health_27 from '../ai/gateway/health/handler';
import * as route_ai_gateway_logs__requestId__28 from '../ai/gateway/logs/[requestId]/handler';
import * as route_ai_gateway_providers_29 from '../ai/gateway/providers/handler';
import * as route_ai_gateway_status_30 from '../ai/gateway/status/handler';
import * as route_ai_gateway_wake_31 from '../ai/gateway/wake/handler';
import * as route_ai_health_check_32 from '../ai/health-check/handler';
import * as route_ai_setup_33 from '../ai/setup/handler';
import * as route_analyze_screenshot_186 from '../analyze-screenshot/handler';
import * as route_audit_seo_export_pdf_34 from '../audit-seo/export-pdf/handler';
import * as route_audit_seo_35 from '../audit-seo/handler';
import * as route_auth_confirm_reset_36 from '../auth/confirm-reset/handler';
import * as route_automations_trigger_37 from '../automations/trigger/handler';
import * as route_booking_appointments_38 from '../booking/appointments/handler';
import * as route_booking_settings_39 from '../booking/settings/handler';
import * as route_booking_slots_40 from '../booking/slots/handler';
import * as route_calls_stats_190 from '../calls/stats/handler';
import * as route_campaigns__id__autopilot_41 from '../campaigns/[id]/autopilot/handler';
import * as route_chat_42 from '../chat/handler';
import * as route_create_draft_43 from '../create-draft/handler';
import * as route_cron_agent_loop_44 from '../cron/agent-loop/handler';
import * as route_cron_ai_health_check_45 from '../cron/ai-health-check/handler';
import * as route_cron_autopilot_guardrail_46 from '../cron/autopilot-guardrail/handler';
import * as route_cron_batch_outreach_47 from '../cron/batch-outreach/handler';
import * as route_cron_daily_digest_48 from '../cron/daily-digest/handler';
import * as route_cron_email_sequences_49 from '../cron/email-sequences/handler';
import * as route_cron_enrich_leads_50 from '../cron/enrich-leads/handler';
import * as route_cron_gmail_check_replies_51 from '../cron/gmail-check-replies/handler';
import * as route_cron_overdue_check_52 from '../cron/overdue-check/handler';
import * as route_cron_process_queue_53 from '../cron/process-queue/handler';
import * as route_cron_weekly_report_54 from '../cron/weekly-report/handler';
import * as route_cron_weekly_report_reminder_55 from '../cron/weekly-report-reminder/handler';
import * as route_email_sequences_56 from '../email-sequences/handler';
import * as route_enrich_contact_57 from '../enrich-contact/handler';
import * as route_export_drive_58 from '../export-drive/handler';
import * as route_generate_draft_59 from '../generate-draft/handler';
import * as route_generate_script_60 from '../generate-script/handler';
import * as route_generate_sequence_61 from '../generate-sequence/handler';
import * as route_generate_website_62 from '../generate-website/handler';
import * as route_google_auth_callback_63 from '../google/auth/callback/handler';
import * as route_google_auth_disconnect_64 from '../google/auth/disconnect/handler';
import * as route_google_auth_refresh_65 from '../google/auth/refresh/handler';
import * as route_google_auth_start_66 from '../google/auth/start/handler';
import * as route_google_auth_status_67 from '../google/auth/status/handler';
import * as route_google_calendar_events__id__68 from '../google/calendar/events/[id]/handler';
import * as route_google_calendar_events_create_69 from '../google/calendar/events/create/handler';
import * as route_google_calendar_freebusy_70 from '../google/calendar/freebusy/handler';
import * as route_google_calendar_lead_events_71 from '../google/calendar/lead-events/handler';
import * as route_google_calendar_list_72 from '../google/calendar/list/handler';
import * as route_google_calendar_sync_73 from '../google/calendar/sync/handler';
import * as route_google_calendar_today_74 from '../google/calendar/today/handler';
import * as route_google_contacts_list_75 from '../google/contacts/list/handler';
import * as route_google_contacts_76 from '../google/contacts/handler';
import * as route_google_drive_export_77 from '../google/drive/export/handler';
import * as route_google_drive_files__id__78 from '../google/drive/files/[id]/handler';
import * as route_google_drive_files_79 from '../google/drive/files/handler';
import * as route_google_drive_upload_80 from '../google/drive/upload/handler';
import * as route_google_gmail_draft_81 from '../google/gmail/draft/handler';
import * as route_google_gmail_lead_threads_82 from '../google/gmail/lead-threads/handler';
import * as route_google_gmail_send_83 from '../google/gmail/send/handler';
import * as route_google_gmail_sync_84 from '../google/gmail/sync/handler';
import * as route_google_gmail_threads__id__85 from '../google/gmail/threads/[id]/handler';
import * as route_google_gmail_threads_86 from '../google/gmail/threads/handler';
import * as route_google_meet__id__artifacts_87 from '../google/meet/[id]/artifacts/handler';
import * as route_google_meet__id__88 from '../google/meet/[id]/handler';
import * as route_google_meet_create_89 from '../google/meet/create/handler';
import * as route_google_places_details__placeId__90 from '../google/places/details/[placeId]/handler';
import * as route_google_places_search_91 from '../google/places/search/handler';
import * as route_inbox_archive_92 from '../inbox/archive/handler';
import * as route_inbox_classify_93 from '../inbox/classify/handler';
import * as route_inbox_drafts_94 from '../inbox/drafts/handler';
import * as route_inbox_reply_95 from '../inbox/reply/handler';
import * as route_inbox_suggest_reply_96 from '../inbox/suggest-reply/handler';
import * as route_inbox_thread__threadId__97 from '../inbox/thread/[threadId]/handler';
import * as route_inbox_threads_98 from '../inbox/threads/handler';
import * as route_insights_weekly_activity_99 from '../insights/weekly/activity/handler';
import * as route_insights_weekly_history_100 from '../insights/weekly/history/handler';
import * as route_insights_weekly_101 from '../insights/weekly/handler';
import * as route_integrations_notion_102 from '../integrations/notion/handler';
import * as route_integrations_slack_103 from '../integrations/slack/handler';
import * as route_leads__id__enrich_google_reviews_scrape_104 from '../leads/[id]/enrich-google-reviews-scrape/handler';
import * as route_leads__id__livrables_105 from '../leads/[id]/livrables/handler';
import * as route_leads__id__place_photo_106 from '../leads/[id]/place-photo/handler';
import * as route_leads_assigned_107 from '../leads/assigned/handler';
import * as route_leads_create_share_108 from '../leads/create-share/handler';
import * as route_leads_dedup_109 from '../leads/dedup/handler';
import * as route_leads_enrich_advanced_110 from '../leads/enrich-advanced/handler';
import * as route_leads_enrich_batch_111 from '../leads/enrich-batch/handler';
import * as route_leads_enrich_google_112 from '../leads/enrich-google/handler';
import * as route_leads_enrichment_review_113 from '../leads/enrichment-review/handler';
import * as route_leads_instagram_posts_114 from '../leads/instagram-posts/handler';
import * as route_leads_merge_115 from '../leads/merge/handler';
import * as route_leads_rescue_116 from '../leads/rescue/handler';
import * as route_leads_score_117 from '../leads/score/handler';
import * as route_leads_share_preview_118 from '../leads/share-preview/handler';
import * as route_leverage_library_119 from '../leverage-library/handler';
import * as route_link_preview_120 from '../link-preview/handler';
import * as route_nba_assign_121 from '../nba/assign/handler';
import * as route_nba_automations_122 from '../nba/automations/handler';
import * as route_nba_explain_123 from '../nba/explain/handler';
import * as route_nba_insights_124 from '../nba/insights/handler';
import * as route_nba_score_125 from '../nba/score/handler';
import * as route_notifications_email_126 from '../notifications/email/handler';
import * as route_notifications_error_127 from '../notifications/error/handler';
import * as route_notifications_team_128 from '../notifications/team/handler';
import * as route_outreach_approvals_129 from '../outreach/approvals/handler';
import * as route_outreach_batch_generate_130 from '../outreach/batch-generate/handler';
import * as route_outreach_cadence_131 from '../outreach/cadence/handler';
import * as route_outreach_campaigns_132 from '../outreach/campaigns/handler';
import * as route_outreach_channel_switch_133 from '../outreach/channel-switch/handler';
import * as route_outreach_queue_process_now_134 from '../outreach/queue/process-now/handler';
import * as route_outreach_queue_135 from '../outreach/queue/handler';
import * as route_outreach_reply_classify_136 from '../outreach/reply-classify/handler';
import * as route_outreach_sequences_enrollments_137 from '../outreach/sequences/enrollments/handler';
import * as route_outreach_sequences_138 from '../outreach/sequences/handler';
import * as route_outreach_smartlead_139 from '../outreach/smartlead/handler';
import * as route_outreach_voicemail_140 from '../outreach/voicemail/handler';
import * as route_playbook_runs_141 from '../playbook-runs/handler';
import * as route_proposals_generate_section_142 from '../proposals/generate-section/handler';
import * as route_prospect_search_143 from '../prospect/search/handler';
import * as route_push_register_device_144 from '../push/register-device/handler';
import * as route_push_subscribe_145 from '../push/subscribe/handler';
import * as route_recovery_146 from '../recovery/handler';
import * as route_route_plans_147 from '../route-plans/handler';
import * as route_route_plans_visits_148 from '../route-plans/visits/handler';
import * as route_routing_149 from '../routing/handler';
import * as route_scrape_apify_150 from '../scrape-apify/handler';
import * as route_scrape_maps_151 from '../scrape-maps/handler';
import * as route_scrape_website_152 from '../scrape-website/handler';
import * as route_script_templates_187 from '../script-templates/handler';
import * as route_script_templates__id__188 from '../script-templates/[id]/handler';
import * as route_script_templates_extract_189 from '../script-templates/extract/handler';
import * as route_send_email_153 from '../send-email/handler';
import * as route_settings_ai_keys_154 from '../settings/ai-keys/handler';
import * as route_settings_monitoring_155 from '../settings/monitoring/handler';
import * as route_settings_user_prefs_156 from '../settings/user-prefs/handler';
import * as route_sms_daily_briefing_157 from '../sms/daily-briefing/handler';
import * as route_sms_send_158 from '../sms/send/handler';
import * as route_strategy_learnings_159 from '../strategy/learnings/handler';
import * as route_strategy_memory_160 from '../strategy/memory/handler';
import * as route_support_contact_161 from '../support/contact/handler';
import * as route_team_accept_invite_162 from '../team/accept-invite/handler';
import * as route_team_accept_link_163 from '../team/accept-link/handler';
import * as route_team_create_invite_link_164 from '../team/create-invite-link/handler';
import * as route_team_invite_165 from '../team/invite/handler';
import * as route_team_invite_preview_166 from '../team/invite-preview/handler';
import * as route_team_leave_167 from '../team/leave/handler';
import * as route_team_members_168 from '../team/members/handler';
import * as route_team_my_permissions_169 from '../team/my-permissions/handler';
import * as route_team_role_170 from '../team/role/handler';
import * as route_team_roles_171 from '../team/roles/handler';
import * as route_team_sla_172 from '../team/sla/handler';
import * as route_team_workload_173 from '../team/workload/handler';
import * as route_tools_tool_search_firecrawl_174 from '../tools/tool-search-firecrawl/handler';
import * as route_triggers_reply_positive_175 from '../triggers/reply-positive/handler';
import * as route_version_176 from '../version/handler';
import * as route_webhooks_inbound__token__177 from '../webhooks/inbound/[token]/handler';
import * as route_webhooks_inbound_178 from '../webhooks/inbound/handler';
import * as route_webhooks_manage__id__179 from '../webhooks/manage/[id]/handler';
import * as route_webhooks_outbound__id__test_180 from '../webhooks/outbound/[id]/test/handler';
import * as route_webhooks_outbound_181 from '../webhooks/outbound/handler';
import * as route_webhooks_resend_182 from '../webhooks/resend/handler';
import * as route_webhooks_twilio_183 from '../webhooks/twilio/handler';
import * as route_websites_184 from '../websites/handler';
import * as route_workspaces_185 from '../workspaces/handler';

const routes: Record<string, any> = {
  "ads/attribution": route_ads_attribution_1,
  "ads/facebook/callback": route_ads_facebook_callback_2,
  "ads/facebook": route_ads_facebook_3,
  "ads/facebook/webhook": route_ads_facebook_webhook_4,
  "agency-setup": route_agency_setup_5,
  "agenda/book": route_agenda_book_6,
  "agent/actions": route_agent_actions_7,
  "agent/campaigns/summary": route_agent_campaigns_summary_8,
  "agent/field/briefing": route_agent_field_briefing_9,
  "agent/field": route_agent_field_10,
  "agent/hermes": route_agent_hermes_11,
  "agent/inbox/suggest-reply": route_agent_inbox_suggest_reply_12,
  "agent/leads/search": route_agent_leads_search_13,
  "agent/loop": route_agent_loop_14,
  "agent/memory": route_agent_memory_15,
  "agent/next-action": route_agent_next_action_16,
  "agent/playbooks/deploy": route_agent_playbooks_deploy_17,
  "agent/relance": route_agent_relance_18,
  "agent/sequences/create": route_agent_sequences_create_19,
  "agent/tasks/create": route_agent_tasks_create_20,
  "agent/today-stats": route_agent_today_stats_21,
  "agents/[id]/reviews": route_agents__id__reviews_22,
  "agents": route_agents_23,
  "agents/run": route_agents_run_24,
  "agents/team-overview": route_agents_team_overview_25,
  "ai/gateway/completions": route_ai_gateway_completions_26,
  "ai/gateway/health": route_ai_gateway_health_27,
  "ai/gateway/logs/[requestId]": route_ai_gateway_logs__requestId__28,
  "ai/gateway/providers": route_ai_gateway_providers_29,
  "ai/gateway/status": route_ai_gateway_status_30,
  "ai/gateway/wake": route_ai_gateway_wake_31,
  "ai/health-check": route_ai_health_check_32,
  "ai/setup": route_ai_setup_33,
  "analyze-screenshot": route_analyze_screenshot_186,
  "audit-seo/export-pdf": route_audit_seo_export_pdf_34,
  "audit-seo": route_audit_seo_35,
  "auth/confirm-reset": route_auth_confirm_reset_36,
  "automations/trigger": route_automations_trigger_37,
  "booking/appointments": route_booking_appointments_38,
  "booking/settings": route_booking_settings_39,
  "booking/slots": route_booking_slots_40,
  "calls/stats": route_calls_stats_190,
  "campaigns/[id]/autopilot": route_campaigns__id__autopilot_41,
  "chat": route_chat_42,
  "create-draft": route_create_draft_43,
  "cron/agent-loop": route_cron_agent_loop_44,
  "cron/ai-health-check": route_cron_ai_health_check_45,
  "cron/autopilot-guardrail": route_cron_autopilot_guardrail_46,
  "cron/batch-outreach": route_cron_batch_outreach_47,
  "cron/daily-digest": route_cron_daily_digest_48,
  "cron/email-sequences": route_cron_email_sequences_49,
  "cron/enrich-leads": route_cron_enrich_leads_50,
  "cron/gmail-check-replies": route_cron_gmail_check_replies_51,
  "cron/overdue-check": route_cron_overdue_check_52,
  "cron/process-queue": route_cron_process_queue_53,
  "cron/weekly-report": route_cron_weekly_report_54,
  "cron/weekly-report-reminder": route_cron_weekly_report_reminder_55,
  "email-sequences": route_email_sequences_56,
  "enrich-contact": route_enrich_contact_57,
  "export-drive": route_export_drive_58,
  "generate-draft": route_generate_draft_59,
  "generate-script": route_generate_script_60,
  "generate-sequence": route_generate_sequence_61,
  "generate-website": route_generate_website_62,
  "google/auth/callback": route_google_auth_callback_63,
  "google/auth/disconnect": route_google_auth_disconnect_64,
  "google/auth/refresh": route_google_auth_refresh_65,
  "google/auth/start": route_google_auth_start_66,
  "google/auth/status": route_google_auth_status_67,
  "google/calendar/events/[id]": route_google_calendar_events__id__68,
  "google/calendar/events/create": route_google_calendar_events_create_69,
  "google/calendar/freebusy": route_google_calendar_freebusy_70,
  "google/calendar/lead-events": route_google_calendar_lead_events_71,
  "google/calendar/list": route_google_calendar_list_72,
  "google/calendar/sync": route_google_calendar_sync_73,
  "google/calendar/today": route_google_calendar_today_74,
  "google/contacts/list": route_google_contacts_list_75,
  "google/contacts": route_google_contacts_76,
  "google/drive/export": route_google_drive_export_77,
  "google/drive/files/[id]": route_google_drive_files__id__78,
  "google/drive/files": route_google_drive_files_79,
  "google/drive/upload": route_google_drive_upload_80,
  "google/gmail/draft": route_google_gmail_draft_81,
  "google/gmail/lead-threads": route_google_gmail_lead_threads_82,
  "google/gmail/send": route_google_gmail_send_83,
  "google/gmail/sync": route_google_gmail_sync_84,
  "google/gmail/threads/[id]": route_google_gmail_threads__id__85,
  "google/gmail/threads": route_google_gmail_threads_86,
  "google/meet/[id]/artifacts": route_google_meet__id__artifacts_87,
  "google/meet/[id]": route_google_meet__id__88,
  "google/meet/create": route_google_meet_create_89,
  "google/places/details/[placeId]": route_google_places_details__placeId__90,
  "google/places/search": route_google_places_search_91,
  "inbox/archive": route_inbox_archive_92,
  "inbox/classify": route_inbox_classify_93,
  "inbox/drafts": route_inbox_drafts_94,
  "inbox/reply": route_inbox_reply_95,
  "inbox/suggest-reply": route_inbox_suggest_reply_96,
  "inbox/thread/[threadId]": route_inbox_thread__threadId__97,
  "inbox/threads": route_inbox_threads_98,
  "insights/weekly/activity": route_insights_weekly_activity_99,
  "insights/weekly/history": route_insights_weekly_history_100,
  "insights/weekly": route_insights_weekly_101,
  "integrations/notion": route_integrations_notion_102,
  "integrations/slack": route_integrations_slack_103,
  "leads/[id]/enrich-google-reviews-scrape": route_leads__id__enrich_google_reviews_scrape_104,
  "leads/[id]/livrables": route_leads__id__livrables_105,
  "leads/[id]/place-photo": route_leads__id__place_photo_106,
  "leads/assigned": route_leads_assigned_107,
  "leads/create-share": route_leads_create_share_108,
  "leads/dedup": route_leads_dedup_109,
  "leads/enrich-advanced": route_leads_enrich_advanced_110,
  "leads/enrich-batch": route_leads_enrich_batch_111,
  "leads/enrich-google": route_leads_enrich_google_112,
  "leads/enrichment-review": route_leads_enrichment_review_113,
  "leads/instagram-posts": route_leads_instagram_posts_114,
  "leads/merge": route_leads_merge_115,
  "leads/rescue": route_leads_rescue_116,
  "leads/score": route_leads_score_117,
  "leads/share-preview": route_leads_share_preview_118,
  "leverage-library": route_leverage_library_119,
  "link-preview": route_link_preview_120,
  "nba/assign": route_nba_assign_121,
  "nba/automations": route_nba_automations_122,
  "nba/explain": route_nba_explain_123,
  "nba/insights": route_nba_insights_124,
  "nba/score": route_nba_score_125,
  "notifications/email": route_notifications_email_126,
  "notifications/error": route_notifications_error_127,
  "notifications/team": route_notifications_team_128,
  "outreach/approvals": route_outreach_approvals_129,
  "outreach/batch-generate": route_outreach_batch_generate_130,
  "outreach/cadence": route_outreach_cadence_131,
  "outreach/campaigns": route_outreach_campaigns_132,
  "outreach/channel-switch": route_outreach_channel_switch_133,
  "outreach/queue/process-now": route_outreach_queue_process_now_134,
  "outreach/queue": route_outreach_queue_135,
  "outreach/reply-classify": route_outreach_reply_classify_136,
  "outreach/sequences/enrollments": route_outreach_sequences_enrollments_137,
  "outreach/sequences": route_outreach_sequences_138,
  "outreach/smartlead": route_outreach_smartlead_139,
  "outreach/voicemail": route_outreach_voicemail_140,
  "playbook-runs": route_playbook_runs_141,
  "proposals/generate-section": route_proposals_generate_section_142,
  "prospect/search": route_prospect_search_143,
  "push/register-device": route_push_register_device_144,
  "push/subscribe": route_push_subscribe_145,
  "recovery": route_recovery_146,
  "route-plans": route_route_plans_147,
  "route-plans/visits": route_route_plans_visits_148,
  "routing": route_routing_149,
  "scrape-apify": route_scrape_apify_150,
  "scrape-maps": route_scrape_maps_151,
  "scrape-website": route_scrape_website_152,
  "script-templates": route_script_templates_187,
  "script-templates/[id]": route_script_templates__id__188,
  "script-templates/extract": route_script_templates_extract_189,
  "send-email": route_send_email_153,
  "settings/ai-keys": route_settings_ai_keys_154,
  "settings/monitoring": route_settings_monitoring_155,
  "settings/user-prefs": route_settings_user_prefs_156,
  "sms/daily-briefing": route_sms_daily_briefing_157,
  "sms/send": route_sms_send_158,
  "strategy/learnings": route_strategy_learnings_159,
  "strategy/memory": route_strategy_memory_160,
  "support/contact": route_support_contact_161,
  "team/accept-invite": route_team_accept_invite_162,
  "team/accept-link": route_team_accept_link_163,
  "team/create-invite-link": route_team_create_invite_link_164,
  "team/invite": route_team_invite_165,
  "team/invite-preview": route_team_invite_preview_166,
  "team/leave": route_team_leave_167,
  "team/members": route_team_members_168,
  "team/my-permissions": route_team_my_permissions_169,
  "team/role": route_team_role_170,
  "team/roles": route_team_roles_171,
  "team/sla": route_team_sla_172,
  "team/workload": route_team_workload_173,
  "tools/tool-search-firecrawl": route_tools_tool_search_firecrawl_174,
  "triggers/reply-positive": route_triggers_reply_positive_175,
  "version": route_version_176,
  "webhooks/inbound/[token]": route_webhooks_inbound__token__177,
  "webhooks/inbound": route_webhooks_inbound_178,
  "webhooks/manage/[id]": route_webhooks_manage__id__179,
  "webhooks/outbound/[id]/test": route_webhooks_outbound__id__test_180,
  "webhooks/outbound": route_webhooks_outbound_181,
  "webhooks/resend": route_webhooks_resend_182,
  "webhooks/twilio": route_webhooks_twilio_183,
  "websites": route_websites_184,
  "workspaces": route_workspaces_185
};

function matchPath(requestPath: string, patterns: string[]): { module: any; params: Record<string, string> } | null {
  const cleanPath = requestPath.replace(/^\/+|\/+$/g, '');
  if (routes[cleanPath]) {
    return { module: routes[cleanPath], params: {} };
  }

  const reqSegments = cleanPath.split('/').filter(Boolean);
  
  for (const pattern of patterns) {
    const patternSegments = pattern.split('/').filter(Boolean);
    if (reqSegments.length !== patternSegments.length) continue;
    
    const params: Record<string, string> = {};
    let matches = true;
    
    for (let i = 0; i < patternSegments.length; i++) {
      const pSeg = patternSegments[i];
      const rSeg = reqSegments[i];
      
      if (pSeg.startsWith('[') && pSeg.endsWith(']')) {
        const paramName = pSeg.slice(1, -1);
        params[paramName] = rSeg;
      } else if (pSeg !== rSeg) {
        matches = false;
        break;
      }
    }
    
    if (matches) {
      return { module: routes[pattern], params };
    }
  }
  
  return null;
}

async function handleRequest(method: string, req: NextRequest, rawSegments?: string[] | null) {
  let segments = rawSegments;
  if (!Array.isArray(segments) || segments.length === 0) {
    const pathname = req.nextUrl?.pathname || '';
    segments = pathname.replace(/^\/?api\/?/, '').split('/').filter(Boolean);
  }

  const requestPath = segments.join('/');
  const patterns = Object.keys(routes);
  
  const match = matchPath(requestPath, patterns);
  if (!match) {
    return NextResponse.json({ error: `Route /api/${requestPath} Not Found` }, { status: 404 });
  }
  
  const handler = match.module[method];
  if (!handler) {
    return NextResponse.json({ error: `Method ${method} not allowed for /api/${requestPath}` }, { status: 405 });
  }
  
  try {
    return await handler(req, { params: match.params });
  } catch (err: any) {
    console.error(`Error handling ${method} /api/${requestPath}:`, err);
    return NextResponse.json({ error: err?.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ catchall: string[] }> }) {
  const p = await params.catch(() => ({ catchall: [] }));
  return handleRequest('GET', req, p?.catchall);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ catchall: string[] }> }) {
  const p = await params.catch(() => ({ catchall: [] }));
  return handleRequest('POST', req, p?.catchall);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ catchall: string[] }> }) {
  const p = await params.catch(() => ({ catchall: [] }));
  return handleRequest('PUT', req, p?.catchall);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ catchall: string[] }> }) {
  const p = await params.catch(() => ({ catchall: [] }));
  return handleRequest('PATCH', req, p?.catchall);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ catchall: string[] }> }) {
  const p = await params.catch(() => ({ catchall: [] }));
  return handleRequest('DELETE', req, p?.catchall);
}
