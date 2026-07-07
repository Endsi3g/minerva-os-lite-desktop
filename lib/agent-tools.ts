import { generateCompletion, type AISettings } from '@/lib/ai';
import { logLeadEvent } from '@/lib/timeline-logger';
import { resolveAccessToken } from '@/lib/google/google-auth-service';
import { generateEmailDraftForLead } from '@/lib/generate-email-draft';
import type { SupabaseClient } from '@supabase/supabase-js';

export type AutonomyLevel = 'off' | 'suggest' | 'prepare' | 'act_with_approval' | 'auto';

export interface AgentAutonomy {
  tasks: AutonomyLevel;
  pipeline: AutonomyLevel;
  sequences: AutonomyLevel;
  emails: AutonomyLevel;
  field: AutonomyLevel;
  // Outreach granular autonomy
  outreach_draft: AutonomyLevel;
  outreach_initial_send: AutonomyLevel;
  outreach_followup: AutonomyLevel;
  outreach_reply: AutonomyLevel;
  outreach_sequence_pause: AutonomyLevel;
  outreach_pipeline_update: AutonomyLevel;
}

export interface AgentContext {
  workspaceId: string;
  userId: string;
  supabase: SupabaseClient;
  settings?: AISettings;
  autonomy?: Partial<AgentAutonomy>;
}

export interface AgentAction {
  tool: string;
  params: Record<string, unknown>;
  reasoning: string;
  data_signals: string;
  autonomy_level: AutonomyLevel;
}

export interface AgentActionResult extends AgentAction {
  id: string;
  result: Record<string, unknown> | null;
  executed: boolean;
  created_at: string;
}

// ── Tool: list leads to follow up ────────────────────────────────────────────

export async function listLeadsToFollowUp(
  ctx: AgentContext,
  params: { threshold_days?: number; min_score?: number } = {},
) {
  const { threshold_days = 7, min_score = 40 } = params;
  const cutoff = new Date(Date.now() - threshold_days * 86_400_000).toISOString();

  const { data } = await ctx.supabase
    .from('leads')
    .select('id, business_name, niche, status, score, last_activity_at')
    .eq('workspace_id', ctx.workspaceId)
    .not('status', 'in', '("Won","Lost")')
    .or(`last_activity_at.lt.${cutoff},last_activity_at.is.null`)
    .gte('score', min_score)
    .order('score', { ascending: false })
    .limit(20);

  return data ?? [];
}

// ── Tool: create task ─────────────────────────────────────────────────────────

export async function createTask(
  ctx: AgentContext,
  params: { lead_id: string; type: string; due_date: string; description: string },
) {
  const { data, error } = await ctx.supabase.from('tasks').insert({
    workspace_id: ctx.workspaceId,
    lead_id: params.lead_id,
    type: params.type,
    due_date: params.due_date,
    description: params.description,
    status: 'pending',
    created_by: ctx.userId,
    source: 'agent',
  }).select('id').single();

  if (error) throw new Error(`createTask failed: ${error.message}`);
  return { task_id: data.id };
}

// ── Tool: update pipeline stage ───────────────────────────────────────────────

export async function updatePipelineStage(
  ctx: AgentContext,
  params: { lead_id: string; stage: string; reason: string },
) {
  const { error } = await ctx.supabase
    .from('leads')
    .update({ pipeline_stage: params.stage, updated_at: new Date().toISOString() })
    .eq('id', params.lead_id)
    .eq('workspace_id', ctx.workspaceId);

  if (error) throw new Error(`updatePipelineStage failed: ${error.message}`);
  return { updated: true, stage: params.stage };
}

// ── Tool: generate email draft ────────────────────────────────────────────────

export async function generateEmailDraft(
  ctx: AgentContext,
  params: { lead_id: string; template_type: 'follow_up' | 'introduction' | 'closing' | 'reactivation'; source?: string },
) {
  // Thin wrapper around the canonical generator (lib/generate-email-draft.ts) — this
  // is what gives every caller (agent tool, manual batch, auto-draft cron) the rich
  // context (decision-maker, company vibe, Google reviews, persona) for free.
  const draft = await generateEmailDraftForLead(ctx.supabase, ctx.userId, ctx.workspaceId, {
    leadId: params.lead_id,
    templateType: params.template_type,
  });

  const { data, error } = await ctx.supabase.from('drafts').insert({
    workspace_id: ctx.workspaceId,
    user_id: ctx.userId,
    lead_id: params.lead_id,
    subject: draft.subject,
    content: draft.content,
    source: params.source ?? 'agent',
    created_at: new Date().toISOString(),
  }).select('id').single();

  if (error) throw new Error(`generateEmailDraft insert failed: ${error.message}`);
  return { draft_id: data.id, subject: draft.subject };
}

// ── Tool: enroll in sequence ──────────────────────────────────────────────────

export async function enrollInSequence(
  ctx: AgentContext,
  params: { lead_id: string; sequence_id: string },
) {
  const { data: existing } = await ctx.supabase
    .from('sequence_enrollments')
    .select('id')
    .eq('lead_id', params.lead_id)
    .eq('sequence_id', params.sequence_id)
    .maybeSingle();

  if (existing) return { enrolled: false, reason: 'already_enrolled' };

  const { data, error } = await ctx.supabase.from('sequence_enrollments').insert({
    workspace_id: ctx.workspaceId,
    lead_id: params.lead_id,
    sequence_id: params.sequence_id,
    status: 'active',
    enrolled_by: 'agent',
    enrolled_at: new Date().toISOString(),
  }).select('id').single();

  if (error) throw new Error(`enrollInSequence failed: ${error.message}`);

  logLeadEvent({
    lead_id: params.lead_id,
    workspace_id: ctx.workspaceId,
    user_id: ctx.userId,
    event_type: 'sequence_enrolled',
    title: 'Inscrit en séquence par l\'agent',
    metadata: { sequence_id: params.sequence_id, enrollment_id: data.id, enrolled_by: 'agent' },
  });

  return { enrolled: true, enrollment_id: data.id };
}

// ── Tool: update agent memory ─────────────────────────────────────────────────

export async function updateAgentMemory(
  ctx: AgentContext,
  params: { type: string; key: string; content: string; metadata?: Record<string, unknown> },
) {
  const { error } = await ctx.supabase.from('agent_memory').upsert({
    workspace_id: ctx.workspaceId,
    type: params.type,
    key: params.key,
    content: params.content,
    metadata: params.metadata ?? {},
    updated_at: new Date().toISOString(),
  }, { onConflict: 'workspace_id,type,key' });

  if (error) throw new Error(`updateAgentMemory failed: ${error.message}`);
  return { stored: true };
}

// ── Tool: summarize pipeline ──────────────────────────────────────────────────

export async function summarizePipeline(
  ctx: AgentContext,
) {
  const { data: leads } = await ctx.supabase
    .from('leads')
    .select('status, pipeline_stage, score')
    .eq('workspace_id', ctx.workspaceId);

  if (!leads?.length) return { summary: 'Aucun lead dans le pipeline.' };

  const byStage = leads.reduce<Record<string, number>>((acc, l) => {
    const stage = l.pipeline_stage || l.status || 'Non défini';
    acc[stage] = (acc[stage] || 0) + 1;
    return acc;
  }, {});

  const avgScore = leads.reduce((s, l) => s + (l.score || 0), 0) / leads.length;

  return {
    total: leads.length,
    by_stage: byStage,
    avg_score: Math.round(avgScore),
  };
}

// ── Tool: pause sequence enrollment ──────────────────────────────────────────

export async function pauseSequence(
  ctx: AgentContext,
  params: { enrollment_id: string; reason?: string },
) {
  const { error } = await ctx.supabase
    .from('sequence_enrollments')
    .update({ status: 'paused', paused_at: new Date().toISOString(), paused_reason: params.reason ?? 'agent_pause' })
    .eq('id', params.enrollment_id)
    .eq('workspace_id', ctx.workspaceId);

  if (error) throw new Error(`pauseSequence failed: ${error.message}`);
  return { paused: true, enrollment_id: params.enrollment_id };
}

// ── Tool: resume sequence enrollment ─────────────────────────────────────────

export async function resumeSequence(
  ctx: AgentContext,
  params: { enrollment_id: string },
) {
  const { error } = await ctx.supabase
    .from('sequence_enrollments')
    .update({ status: 'active', paused_at: null, paused_reason: null })
    .eq('id', params.enrollment_id)
    .eq('workspace_id', ctx.workspaceId);

  if (error) throw new Error(`resumeSequence failed: ${error.message}`);
  return { resumed: true, enrollment_id: params.enrollment_id };
}

// ── Tool: tag lead ────────────────────────────────────────────────────────────

export async function tagLead(
  ctx: AgentContext,
  params: { lead_id: string; tags: string[] },
) {
  const { data: lead } = await ctx.supabase
    .from('leads')
    .select('outreach_tags')
    .eq('id', params.lead_id)
    .single();

  const existing: string[] = lead?.outreach_tags ?? [];
  const merged = Array.from(new Set([...existing, ...params.tags]));

  const { error } = await ctx.supabase
    .from('leads')
    .update({ outreach_tags: merged, updated_at: new Date().toISOString() })
    .eq('id', params.lead_id)
    .eq('workspace_id', ctx.workspaceId);

  if (error) throw new Error(`tagLead failed: ${error.message}`);
  return { tags_added: params.tags, total_tags: merged.length };
}

// ── Tool: send email (Gmail réel — même logique que app/api/send-email) ──────

function makeMimeMessage(to: string, subject: string, body: string) {
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
  const message = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body).toString('base64'),
  ].join('\r\n');
  return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sendEmail(
  ctx: AgentContext,
  params: { lead_id: string; subject: string; body: string },
) {
  const { data: lead } = await ctx.supabase.from('leads').select('*').eq('id', params.lead_id).single();
  if (!lead) throw new Error('Lead introuvable');
  const recipientEmail = lead.contact_email;
  if (!recipientEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) {
    throw new Error("Ce prospect n'a pas d'adresse e-mail valide");
  }

  const tokenData = await resolveAccessToken(ctx.supabase, ctx.userId);
  if (!tokenData) {
    throw new Error('Connecte ton compte Gmail (Paramètres → Intégrations) avant d\'envoyer un e-mail.');
  }
  const { accessToken: currentToken } = tokenData;

  const rawMime = makeMimeMessage(recipientEmail, params.subject, params.body);
  const gmailRes = await fetch('https://gmail.googleapis.com/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: rawMime }),
  });
  if (!gmailRes.ok) {
    const err = await gmailRes.json();
    throw new Error(err.error?.message || "Erreur de l'API Gmail");
  }
  const gmailData = await gmailRes.json();

  const nextActionDate = new Date();
  nextActionDate.setDate(nextActionDate.getDate() + 3);
  await ctx.supabase.from('leads').update({
    status: 'Contacted',
    gmail_thread_id: gmailData.threadId ?? lead.gmail_thread_id,
    next_action: 'Relance e-mail / Appel téléphonique suite à premier contact',
    next_action_date: nextActionDate.toISOString().split('T')[0],
    updated_at: new Date().toISOString(),
  }).eq('id', params.lead_id);

  await ctx.supabase.from('notes').insert({
    lead_id: params.lead_id, user_id: ctx.userId, workspace_id: lead.workspace_id,
    type: 'email', content: `E-mail envoyé via l'assistant IA :\n\nSujet : ${params.subject}\n\n${params.body}`,
  });

  return { sent: true, recipient: recipientEmail };
}

// ── Tool: trigger enrichment (délègue à /api/leads/enrich-batch existant) ────

export async function triggerEnrichment(
  ctx: AgentContext,
  params: { lead_ids: string[] },
  requestInfo?: { origin: string; cookie: string },
) {
  if (!requestInfo) throw new Error('Enrichissement indisponible dans ce contexte (pas de session HTTP).');
  const res = await fetch(`${requestInfo.origin}/api/leads/enrich-batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', cookie: requestInfo.cookie },
    body: JSON.stringify({ leadIds: params.lead_ids, workspaceId: ctx.workspaceId, mode: 'full' }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Échec de l'enrichissement");
  return data;
}

// ── Tool: classify reply ──────────────────────────────────────────────────────

export async function classifyReply(
  ctx: AgentContext,
  params: { lead_id: string; subject: string; snippet: string; thread_id?: string },
) {
  const result = await generateCompletion({
    system: 'Tu es un assistant de classification d\'emails commerciaux. Réponds uniquement en JSON valide.',
    messages: [{
      role: 'user',
      content: `Classe cette réponse email. Sujet: "${params.subject}". Contenu: "${params.snippet}".
JSON uniquement:
{
  "intent": "interested" | "not_interested" | "scheduling" | "info_request" | "objection" | "other",
  "confidence": 0-100,
  "summary": "phrase de 1 ligne",
  "next_action": "recommandation d'action concrète",
  "should_pause_sequence": true | false
}`,
    }],
    jsonMode: true,
    maxTokens: 300,
    settings: ctx.settings,
    userId: ctx.userId,
  });

  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(result); }
  catch { parsed = { intent: 'other', confidence: 0, summary: result }; }

  // Persist intent on lead
  await ctx.supabase
    .from('leads')
    .update({ last_reply_intent: parsed.intent, updated_at: new Date().toISOString() })
    .eq('id', params.lead_id)
    .eq('workspace_id', ctx.workspaceId);

  if (params.thread_id) {
    await ctx.supabase
      .from('gmail_threads')
      .update({ reply_intent: parsed.intent, intent_confidence: parsed.confidence, next_action: parsed.next_action })
      .eq('thread_id', params.thread_id);
  }

  // Log to lead timeline
  logLeadEvent({
    lead_id: params.lead_id,
    workspace_id: ctx.workspaceId,
    user_id: ctx.userId,
    event_type: 'reply_classified',
    title: `Réponse classifiée : ${parsed.intent ?? 'inconnu'}`,
    body: (parsed.summary as string) ?? undefined,
    metadata: {
      intent: parsed.intent,
      confidence: parsed.confidence,
      next_action: parsed.next_action,
      should_pause_sequence: parsed.should_pause_sequence,
      thread_id: params.thread_id,
    },
  });

  return parsed;
}

// ── Tool: summarize inbox ─────────────────────────────────────────────────────

export async function summarizeInbox(ctx: AgentContext) {
  const { data: threads } = await ctx.supabase
    .from('gmail_threads')
    .select('reply_intent, workspace_id')
    .eq('workspace_id', ctx.workspaceId)
    .not('reply_intent', 'is', null)
    .limit(50);

  const counts = (threads ?? []).reduce<Record<string, number>>((acc, t: any) => {
    acc[t.reply_intent] = (acc[t.reply_intent] || 0) + 1;
    return acc;
  }, {});

  return { total_classified: threads?.length ?? 0, by_intent: counts };
}

// ── Tool: suggest follow up ───────────────────────────────────────────────────

export async function suggestFollowUp(
  ctx: AgentContext,
  params: { lead_id: string },
) {
  const { data: lead } = await ctx.supabase
    .from('leads')
    .select('business_name, contact_name, status, score, last_activity_at, last_reply_intent, outreach_tags')
    .eq('id', params.lead_id)
    .single();

  if (!lead) return { suggestion: null };

  const suggestion = await generateCompletion({
    system: 'Tu es un coach commercial. Donne une recommandation courte et actionnable pour la prochaine interaction avec ce lead.',
    messages: [{
      role: 'user',
      content: `Lead: ${lead.contact_name || 'le/la gérant(e)'} chez ${lead.business_name}. Statut: ${lead.status}. Score: ${lead.score}. Dernier contact: ${lead.last_activity_at || 'jamais'}. Intent détecté: ${lead.last_reply_intent || 'inconnu'}. Tags: ${(lead.outreach_tags || []).join(', ') || 'aucun'}.
Quelle est la meilleure prochaine action ? En 1 phrase concrète.`,
    }],
    maxTokens: 150,
    settings: ctx.settings,
    userId: ctx.userId,
  });

  return { lead_id: params.lead_id, suggestion: suggestion.trim() };
}

// ── Autonomy gate ─────────────────────────────────────────────────────────────

const TOOL_DOMAIN_MAP: Record<string, keyof AgentAutonomy> = {
  create_task: 'tasks',
  update_pipeline_stage: 'pipeline',
  enroll_in_sequence: 'sequences',
  generate_email_draft: 'outreach_draft',
  pause_sequence: 'outreach_sequence_pause',
  resume_sequence: 'outreach_sequence_pause',
  classify_reply: 'outreach_draft',
  suggest_follow_up: 'outreach_followup',
  tag_lead: 'tasks',
  plan_field_route: 'field',
  send_email: 'outreach_initial_send',
  trigger_enrichment: 'pipeline',
};

export function canExecute(tool: string, autonomy: Partial<AgentAutonomy>): boolean {
  const domain = TOOL_DOMAIN_MAP[tool];
  if (!domain) return true; // read-only tools always execute
  const level: AutonomyLevel = autonomy[domain] ?? 'suggest';
  return level === 'act_with_approval' || level === 'auto';
}

export function shouldSuggest(tool: string, autonomy: Partial<AgentAutonomy>): boolean {
  const domain = TOOL_DOMAIN_MAP[tool];
  if (!domain) return false;
  const level: AutonomyLevel = autonomy[domain] ?? 'suggest';
  return level === 'suggest' || level === 'prepare';
}

// ── Tool dispatcher ───────────────────────────────────────────────────────────

export async function dispatchTool(
  tool: string,
  params: Record<string, unknown>,
  ctx: AgentContext,
  requestInfo?: { origin: string; cookie: string },
): Promise<Record<string, unknown>> {
  switch (tool) {
    case 'list_leads_to_follow_up':
      return { leads: await listLeadsToFollowUp(ctx, params as any) };
    case 'create_task':
      return createTask(ctx, params as any);
    case 'update_pipeline_stage':
      return updatePipelineStage(ctx, params as any);
    case 'generate_email_draft':
      return generateEmailDraft(ctx, params as any);
    case 'enroll_in_sequence':
      return enrollInSequence(ctx, params as any);
    case 'update_agent_memory':
      return updateAgentMemory(ctx, params as any);
    case 'summarize_pipeline':
      return summarizePipeline(ctx);
    case 'pause_sequence':
      return pauseSequence(ctx, params as any);
    case 'resume_sequence':
      return resumeSequence(ctx, params as any);
    case 'tag_lead':
      return tagLead(ctx, params as any);
    case 'classify_reply':
      return classifyReply(ctx, params as any);
    case 'summarize_inbox':
      return summarizeInbox(ctx);
    case 'suggest_follow_up':
      return suggestFollowUp(ctx, params as any);
    case 'send_email':
      return sendEmail(ctx, params as any);
    case 'trigger_enrichment':
      return triggerEnrichment(ctx, params as any, requestInfo);
    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

// ── Tool schema for Claude ────────────────────────────────────────────────────

export const TOOL_DESCRIPTIONS = `
Tu as accès aux outils suivants (utilise-les via JSON actions[]):

PIPELINE & LEADS:
- list_leads_to_follow_up(threshold_days, min_score) : retourne les leads inactifs à relancer
- create_task(lead_id, type, due_date, description) : crée une tâche de suivi
- update_pipeline_stage(lead_id, stage, reason) : met à jour l'étape pipeline
- summarize_pipeline() : résume l'état du pipeline
- tag_lead(lead_id, tags[]) : ajoute des tags outreach à un lead

OUTREACH:
- generate_email_draft(lead_id, template_type) : génère un brouillon email (follow_up/introduction/closing/reactivation)
- enroll_in_sequence(lead_id, sequence_id) : inscrit un lead dans une séquence
- pause_sequence(enrollment_id, reason) : met en pause un enrollment de séquence
- resume_sequence(enrollment_id) : reprend un enrollment en pause
- classify_reply(lead_id, subject, snippet, thread_id?) : classifie l'intention d'une réponse
- summarize_inbox() : résume l'état de la boîte de réception par intent
- suggest_follow_up(lead_id) : suggère la prochaine action pour un lead spécifique
- send_email(lead_id, subject, body) : envoie un vrai email via Gmail au lead (nécessite Gmail connecté)
- trigger_enrichment(lead_ids[]) : lance un enrichissement réel (Google Places, site web) sur les leads donnés

MÉMOIRE:
- update_agent_memory(type, key, content) : mémorise un apprentissage

Réponds UNIQUEMENT avec du JSON valide :
{
  "reasoning": "Explication courte de ce que tu fais et pourquoi",
  "actions": [
    {
      "tool": "nom_outil",
      "params": { ... },
      "reasoning": "Pourquoi cet outil pour ce lead/contexte",
      "data_signals": "Les données qui justifient cette décision"
    }
  ]
}
`;
