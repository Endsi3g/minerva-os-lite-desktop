import { NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { generateCompletion } from '@/lib/ai';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HermesRequest {
  task: string;
  workspace_id?: string;
  max_iterations?: number;
}

type NdjsonEvent =
  | { type: 'thought'; content: string }
  | { type: 'action'; tool: string; params: Record<string, unknown> }
  | { type: 'observation'; content: string }
  | { type: 'error'; tool: string; message: string }
  | { type: 'final'; content: string; actions_executed: number };

interface ClaudeStep {
  thought?: string;
  action?: { tool: string; params: Record<string, unknown> };
  final?: string;
}

// ── NDJSON encoding ───────────────────────────────────────────────────────────

const encoder = new TextEncoder();

function encodeEvent(event: NdjsonEvent): Uint8Array {
  return encoder.encode(JSON.stringify(event) + '\n');
}

// ── System prompt ─────────────────────────────────────────────────────────────

const HERMES_SYSTEM = `Tu es Hermès, un agent IA commercial autonome spécialisé en CRM et prospection B2B.
Tu résous des tâches complexes étape par étape en utilisant les outils disponibles.

À chaque tour, réponds UNIQUEMENT en JSON valide, sans texte avant ni après.
Format pour agir :
{"thought": "Ton raisonnement concis sur la prochaine étape", "action": {"tool": "nom_outil", "params": {...}}}

Format pour terminer (quand tout est accompli) :
{"thought": "Résumé de ce qui a été réalisé", "final": "Message de confirmation clair pour l'utilisateur"}

Outils disponibles :
- search_leads(has_website?, status?, city?, niche?, temperature?, limit?) : cherche des leads dans la base CRM
- get_lead_details(lead_id) : récupère tous les détails d'un lead spécifique
- firecrawl_search(query, limit?) : recherche web pour enrichir les informations
- generate_email(lead_id, lead_name, lead_website?, campaign_type) : génère un email personnalisé pour un lead
- create_campaign(name, description?, lead_ids[]) : crée une campagne d'outreach
- enroll_leads(campaign_id, lead_ids[], email_subject?, email_body_template?) : inscrit des leads dans une campagne
- create_task(lead_id, title, due_date?) : crée une tâche de suivi (due_date format YYYY-MM-DD)
- update_lead_status(lead_id, status) : met à jour le statut pipeline d'un lead
- store_learning(task_type, steps[], result_summary) : mémorise ce workflow réussi pour les prochaines fois

Règles importantes :
- Utilise les outils dans l'ordre logique : cherche d'abord, crée ensuite
- Si un outil échoue, continue avec les données disponibles
- Garde tes thoughts courts et précis (1-2 phrases)
- Termine TOUJOURS avec {"final": "..."} quand la tâche est complètement accomplie
- Ne fais pas de recherche web si tu as déjà les données nécessaires en base`;

// ── Tool implementations ──────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DbClient = SupabaseClient<any, 'public', any>;

async function toolSearchLeads(
  params: {
    has_website?: boolean;
    status?: string;
    city?: string;
    niche?: string;
    temperature?: string;
    limit?: number;
  },
  db: DbClient,
  workspaceId: string,
): Promise<unknown[]> {
  let query = db
    .from('leads')
    .select(
      'id, business_name, contact_name, contact_email, phone, status, city, niche, website, website_description, temperature, score, pipeline_stage, last_activity_at',
    )
    .eq('workspace_id', workspaceId)
    .limit(params.limit ?? 20);

  if (params.has_website === true) {
    query = query.not('website', 'is', null).neq('website', '');
  } else if (params.has_website === false) {
    query = query.or('website.is.null,website.eq.');
  }
  if (params.status) query = query.eq('status', params.status);
  if (params.city) query = query.ilike('city', `%${params.city}%`);
  if (params.niche) query = query.ilike('niche', `%${params.niche}%`);
  if (params.temperature) query = query.eq('temperature', params.temperature);

  const { data, error } = await query;
  if (error) throw new Error(`search_leads: ${error.message}`);
  return data ?? [];
}

async function toolGetLeadDetails(
  params: { lead_id: string },
  db: DbClient,
  workspaceId: string,
): Promise<unknown> {
  const { data, error } = await db
    .from('leads')
    .select('*')
    .eq('id', params.lead_id)
    .eq('workspace_id', workspaceId)
    .single();
  if (error) throw new Error(`get_lead_details: ${error.message}`);
  return data;
}

async function toolFirecrawlSearch(params: {
  query: string;
  limit?: number;
}): Promise<{ results: { title: string; url: string; snippet: string }[]; skipped?: boolean; reason?: string }> {
  if (!process.env.FIRECRAWL_API_KEY) {
    return {
      results: [],
      skipped: true,
      reason: 'FIRECRAWL_API_KEY non configuré — recherche web ignorée',
    };
  }

  const res = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.FIRECRAWL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: params.query, limit: params.limit ?? 3 }),
  });

  if (!res.ok) throw new Error(`Firecrawl HTTP ${res.status}`);
  const data = await res.json();

  return {
    results: (data.data ?? []).map((r: { title?: string; url?: string; description?: string; snippet?: string }) => ({
      title: r.title ?? '',
      url: r.url ?? '',
      snippet: r.description ?? r.snippet ?? '',
    })),
  };
}

async function toolGenerateEmail(
  params: {
    lead_id: string;
    lead_name: string;
    lead_website?: string;
    campaign_type: string;
  },
  db: DbClient,
  userId: string,
): Promise<{ lead_id: string; subject: string; body: string }> {
  // Fetch lead context for personalisation
  const { data: lead } = await db
    .from('leads')
    .select('business_name, contact_name, city, niche, website_description, score')
    .eq('id', params.lead_id)
    .maybeSingle();

  const context = lead?.website_description
    ? `Description du site : ${lead.website_description}`
    : `Business : ${lead?.business_name ?? params.lead_name}, Niche : ${lead?.niche ?? 'non renseignée'}${lead?.city ? `, Ville : ${lead.city}` : ''}`;

  const raw = await generateCompletion({
    system:
      'Tu es un expert en prospection B2B. Génère un email court (max 120 mots), personnalisé, professionnel, en français. Réponds UNIQUEMENT en JSON valide : {"subject": "...", "body": "..."}',
    messages: [
      {
        role: 'user',
        content: `Prospect : ${params.lead_name}${params.lead_website ? ` — site : ${params.lead_website}` : ''}.\n${context}\nType de campagne : ${params.campaign_type}.`,
      },
    ],
    jsonMode: true,
    maxTokens: 500,
    userId,
  });

  let parsed: { subject: string; body: string };
  try {
    const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    parsed = {
      subject: `Campagne ${params.campaign_type} — ${params.lead_name}`,
      body: raw,
    };
  }

  return { lead_id: params.lead_id, subject: parsed.subject, body: parsed.body };
}

// Écrit dans `campaigns` (niches/cities en tableaux) — la seule table que lit
// vraiment l'UI (/campaigns, /campaigns/[id], onglet Campagnes d'Outreach, wizard
// Playbooks). Les anciennes tables outreach_campaigns/campaign_leads existent
// toujours en base mais ne sont lues par aucune surface UI — une campagne créée
// là était invisible partout dans l'app.
async function toolCreateCampaign(
  params: { name: string; description?: string; lead_ids: string[] },
  db: DbClient,
  workspaceId: string,
  userId: string,
): Promise<{ campaign_id: string; name: string; lead_count: number; persisted: boolean }> {
  const now = new Date().toISOString();
  const { data, error } = await db
    .from('campaigns')
    .insert({
      workspace_id: workspaceId,
      user_id: userId,
      name: params.name,
      description: params.description ?? null,
      niches: [],
      cities: [],
      status: 'active',
      created_at: now,
      updated_at: now,
    })
    .select('id')
    .single();

  if (!error && data?.id) {
    return {
      campaign_id: data.id,
      name: params.name,
      lead_count: params.lead_ids.length,
      persisted: true,
    };
  }

  // Graceful fallback: return a synthetic ID so the loop can continue
  const fallbackId = `hermes_camp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    campaign_id: fallbackId,
    name: params.name,
    lead_count: params.lead_ids.length,
    persisted: false,
  };
}

// Associe des leads à une campagne via `leads.campaign_id` — le même mécanisme
// que lit campaign-detail-root.tsx (`leads.filter(l => l.campaignId === id)`),
// au lieu d'une table de jonction que rien d'autre ne consulte.
async function toolEnrollLeads(
  params: {
    campaign_id: string;
    lead_ids: string[];
    email_subject?: string;
    email_body_template?: string;
  },
  db: DbClient,
  workspaceId: string,
): Promise<{ enrolled: number; campaign_id: string }> {
  const { data, error } = await db
    .from('leads')
    .update({ campaign_id: params.campaign_id, updated_at: new Date().toISOString() })
    .in('id', params.lead_ids)
    .eq('workspace_id', workspaceId)
    .select('id');

  if (error) throw new Error(`enroll_leads: ${error.message}`);
  return { enrolled: data?.length ?? 0, campaign_id: params.campaign_id };
}

async function toolCreateTask(
  params: { lead_id: string; title: string; due_date?: string },
  db: DbClient,
  workspaceId: string,
  userId: string,
): Promise<{ task_id: string; title: string }> {
  const defaultDue = new Date(Date.now() + 3 * 86_400_000).toISOString().split('T')[0];

  const { data, error } = await db
    .from('tasks')
    .insert({
      workspace_id: workspaceId,
      lead_id: params.lead_id,
      type: 'follow_up',
      description: params.title,
      due_date: params.due_date ?? defaultDue,
      status: 'pending',
      created_by: userId,
      source: 'hermes',
    })
    .select('id')
    .single();

  if (error) throw new Error(`create_task: ${error.message}`);
  return { task_id: data.id, title: params.title };
}

async function toolUpdateLeadStatus(
  params: { lead_id: string; status: string },
  db: DbClient,
  workspaceId: string,
): Promise<{ updated: boolean; lead_id: string; status: string }> {
  const { error } = await db
    .from('leads')
    .update({ status: params.status, updated_at: new Date().toISOString() })
    .eq('id', params.lead_id)
    .eq('workspace_id', workspaceId);

  if (error) throw new Error(`update_lead_status: ${error.message}`);
  return { updated: true, lead_id: params.lead_id, status: params.status };
}

async function toolStoreLearning(
  params: { task_type: string; steps: string[]; result_summary: string },
  db: DbClient,
  workspaceId: string,
  userId: string,
): Promise<{ stored: boolean; key: string }> {
  const key = `hermes:${params.task_type.toLowerCase().replace(/\s+/g, '_')}`;

  const { error } = await db.from('agent_memory').upsert(
    {
      workspace_id: workspaceId,
      user_id: userId,
      type: 'recipe',
      key,
      content: JSON.stringify({
        steps: params.steps,
        result_summary: params.result_summary,
        learned_at: new Date().toISOString(),
      }),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'workspace_id,type,key' },
  );

  if (error) throw new Error(`store_learning: ${error.message}`);
  return { stored: true, key };
}

// ── Tool dispatcher ───────────────────────────────────────────────────────────

async function executeTool(
  tool: string,
  params: Record<string, unknown>,
  db: DbClient,
  workspaceId: string,
  userId: string,
): Promise<unknown> {
  switch (tool) {
    case 'search_leads':
      return toolSearchLeads(params as Parameters<typeof toolSearchLeads>[0], db, workspaceId);
    case 'get_lead_details':
      return toolGetLeadDetails(params as { lead_id: string }, db, workspaceId);
    case 'firecrawl_search':
      return toolFirecrawlSearch(params as { query: string; limit?: number });
    case 'generate_email':
      return toolGenerateEmail(
        params as { lead_id: string; lead_name: string; lead_website?: string; campaign_type: string },
        db,
        userId,
      );
    case 'create_campaign':
      return toolCreateCampaign(
        params as { name: string; description?: string; lead_ids: string[] },
        db,
        workspaceId,
        userId,
      );
    case 'enroll_leads':
      return toolEnrollLeads(
        params as { campaign_id: string; lead_ids: string[]; email_subject?: string; email_body_template?: string },
        db,
        workspaceId,
      );
    case 'create_task':
      return toolCreateTask(params as { lead_id: string; title: string; due_date?: string }, db, workspaceId, userId);
    case 'update_lead_status':
      return toolUpdateLeadStatus(params as { lead_id: string; status: string }, db, workspaceId);
    case 'store_learning':
      return toolStoreLearning(
        params as { task_type: string; steps: string[]; result_summary: string },
        db,
        workspaceId,
        userId,
      );
    default:
      throw new Error(`Outil inconnu : ${tool}`);
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Auth: user-scoped client for session validation
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Parse body
  let body: HermesRequest;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON body', { status: 400 });
  }

  const { task, max_iterations = 8 } = body;
  if (!task?.trim()) {
    return new Response(JSON.stringify({ error: '"task" is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Use admin client for all DB ops (bypasses RLS for agent autonomy)
  const admin = getAdminClient();

  // Resolve workspace: body → settings → workspaces
  let workspaceId = body.workspace_id;

  if (!workspaceId) {
    const { data: settings } = await supabase
      .from('settings')
      .select('workspace_id')
      .eq('user_id', user.id)
      .maybeSingle();
    workspaceId = settings?.workspace_id ?? undefined;
  }

  if (!workspaceId) {
    const { data: ws } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1)
      .maybeSingle();
    workspaceId = ws?.id ?? undefined;
  }

  if (!workspaceId) {
    return new Response(JSON.stringify({ error: 'Workspace introuvable' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const finalWorkspaceId = workspaceId;
  const safeIterations = Math.min(Math.max(1, max_iterations), 15);

  // Load prior Hermès recipes for context injection
  const { data: priorMemory } = await admin
    .from('agent_memory')
    .select('key, content')
    .eq('workspace_id', finalWorkspaceId)
    .like('key', 'hermes:%')
    .order('updated_at', { ascending: false })
    .limit(3);

  const memoryBlock =
    priorMemory?.length
      ? `\nApprentissages mémorisés :\n${priorMemory
          .map((m: { key: string; content: string }) => {
            try {
              const c = JSON.parse(m.content);
              return `[${m.key}] ${c.result_summary ?? m.content}`;
            } catch {
              return `[${m.key}] ${m.content}`;
            }
          })
          .join('\n')}`
      : '';

  // ── NDJSON streaming ────────────────────────────────────────────────────────

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: NdjsonEvent) => {
        try {
          controller.enqueue(encodeEvent(event));
        } catch {
          // Controller already closed — ignore
        }
      };

      // Build the ReAct conversation
      const conversation: Array<{ role: string; content: string }> = [
        {
          role: 'user',
          content: `Tâche CRM : ${task.trim()}${memoryBlock}\n\nDécompose et exécute cette tâche étape par étape.`,
        },
      ];

      let actionsExecuted = 0;
      let finalReached = false;
      const executedSteps: string[] = [];

      for (let iter = 0; iter < safeIterations; iter++) {
        // ── 1. THINK: call the AI ──────────────────────────────────────────────
        let rawResponse: string;
        try {
          rawResponse = await generateCompletion({
            system: HERMES_SYSTEM,
            messages: conversation,
            jsonMode: true,
            maxTokens: 1200,
            userId: user.id,
          });
        } catch (aiErr: unknown) {
          const msg = aiErr instanceof Error ? aiErr.message : String(aiErr);
          emit({ type: 'error', tool: 'ai', message: msg });
          break;
        }

        // ── 2. PARSE Claude's JSON step ───────────────────────────────────────
        let step: ClaudeStep;
        try {
          // Strip <think>...</think> tags some models insert
          const cleaned = rawResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
          step = JSON.parse(cleaned);
        } catch {
          // Try to extract the first JSON object if there's surrounding text
          const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              step = JSON.parse(jsonMatch[0]);
            } catch {
              emit({ type: 'error', tool: 'parser', message: `Réponse non-JSON à l'itération ${iter + 1}` });
              break;
            }
          } else {
            emit({ type: 'error', tool: 'parser', message: `Impossible de parser la réponse IA (itération ${iter + 1})` });
            break;
          }
        }

        // Stream the thought
        if (step.thought) {
          emit({ type: 'thought', content: step.thought });
          executedSteps.push(step.thought);
        }

        // ── 3. CHECK for FINAL ────────────────────────────────────────────────
        if (step.final) {
          // Auto-store the successful workflow pattern
          if (actionsExecuted > 0) {
            const taskSlug = task
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, '')
              .split(' ')
              .slice(0, 4)
              .join('_');
            try {
              await toolStoreLearning(
                {
                  task_type: taskSlug,
                  steps: executedSteps,
                  result_summary: step.final,
                },
                admin,
                finalWorkspaceId,
                user.id,
              );
            } catch {
              // Non-blocking: learning storage failure must not break the response
            }
          }

          emit({ type: 'final', content: step.final, actions_executed: actionsExecuted });
          finalReached = true;
          break;
        }

        // ── 4. ACT: execute the tool ──────────────────────────────────────────
        if (step.action?.tool) {
          const { tool, params = {} } = step.action;
          emit({ type: 'action', tool, params });

          let observation: string;
          try {
            const result = await executeTool(tool, params, admin, finalWorkspaceId, user.id);
            observation = JSON.stringify(result);
            actionsExecuted++;
          } catch (toolErr: unknown) {
            const msg = toolErr instanceof Error ? toolErr.message : String(toolErr);
            emit({ type: 'error', tool, message: msg });
            // Inform Claude of the failure and let it decide how to recover
            observation = `Erreur lors de l'exécution de ${tool} : ${msg}`;
          }

          emit({ type: 'observation', content: observation });

          // ── 5. REFLECT: extend the conversation ───────────────────────────
          conversation.push({ role: 'assistant', content: rawResponse });
          conversation.push({
            role: 'user',
            content: `Résultat de ${tool} : ${observation}\n\nContinue vers la prochaine étape. Si la tâche est entièrement terminée, retourne {"thought": "...", "final": "..."}.`,
          });
        } else {
          // Claude returned neither an action nor a final — guard infinite loop
          emit({
            type: 'error',
            tool: 'loop',
            message: `Réponse incomplète à l'itération ${iter + 1} (ni action ni final) — arrêt.`,
          });
          break;
        }
      }

      // Emit a synthetic final if the loop exhausted iterations without completing
      if (!finalReached) {
        emit({
          type: 'final',
          content: `Hermès a atteint la limite de ${safeIterations} itérations. ${actionsExecuted} action(s) exécutée(s).`,
          actions_executed: actionsExecuted,
        });
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
