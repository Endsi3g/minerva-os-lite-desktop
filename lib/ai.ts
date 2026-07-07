import Anthropic from '@anthropic-ai/sdk';
import { getAdminClient } from '@/lib/supabase/admin';

export interface AISettings {
  ai_provider?: string | null;
  ai_model?: string | null;
  openrouter_key?: string | null;
}

export interface AICallOptions {
  system?: string;
  messages: Array<{ role: string; content: string }>;
  settings?: AISettings;
  jsonMode?: boolean;
  maxTokens?: number;
  temperature?: number;
  userId?: string;
  workspaceId?: string;
}

const OPENROUTER_DEFAULT = 'meta-llama/llama-3.3-70b-instruct:free';
const CLOUDFLARE_DEFAULT_MODEL = '@cf/moonshotai/kimi-k2.7-code';

const getGlobalKeys = () => ({
  openrouterKey: process.env.OPENROUTER_API_KEY || '',
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  cloudflareToken: process.env.CLOUDFLARE_API_TOKEN || '',
  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || '',
});

const STALE_OPENROUTER_MODELS = new Set([
  'openrouter/free', 'meta-llama/llama-3-8b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free', 'google/gemma-2-9b-it:free',
  'qwen/qwen-2-7b-instruct:free', 'llama-3.3-70b-versatile', 'meta-llama/Llama-3-70b-chat-hf',
]);

function openrouterModel(rawModel?: string | null): string {
  return (rawModel && !STALE_OPENROUTER_MODELS.has(rawModel) && !rawModel.startsWith('claude'))
    ? rawModel
    : OPENROUTER_DEFAULT;
}

// Ordre de priorité par défaut (aucune sélection explicite de l'utilisateur) :
// Cloudflare Workers AI → OpenRouter → Anthropic. Chaque palier n'est retenu
// que si sa clé est réellement configurée, sinon on passe au suivant.
export function resolveAIProvider(settings?: AISettings | null) {
  const keys = getGlobalKeys();
  const explicitProvider = settings?.ai_provider;
  const rawModel = settings?.ai_model;
  const orKey = settings?.openrouter_key || keys.openrouterKey;

  // 1. Explicit Anthropic selection — or model name starts with "claude"
  if (
    (explicitProvider === 'anthropic' || (rawModel?.startsWith('claude') && !explicitProvider))
    && keys.anthropicKey
  ) {
    const model = rawModel?.startsWith('claude') ? rawModel : 'claude-sonnet-5';
    return { provider: 'anthropic', model, apiKey: keys.anthropicKey };
  }

  // 2. Explicit OpenRouter selection
  if (explicitProvider === 'openrouter' && orKey) {
    return { provider: 'openrouter', model: openrouterModel(rawModel), apiKey: orKey };
  }

  // 3. Explicit Cloudflare selection — or model name starts with "@cf/"
  if ((explicitProvider === 'cloudflare' || rawModel?.startsWith('@cf/')) && keys.cloudflareToken && keys.cloudflareAccountId) {
    const model = rawModel?.startsWith('@cf/') ? rawModel : CLOUDFLARE_DEFAULT_MODEL;
    return { provider: 'cloudflare', model, apiKey: keys.cloudflareToken };
  }

  // 4. Défaut — Cloudflare Workers AI (primaire)
  if (keys.cloudflareToken && keys.cloudflareAccountId) {
    const model = rawModel?.startsWith('@cf/') ? rawModel : CLOUDFLARE_DEFAULT_MODEL;
    return { provider: 'cloudflare', model, apiKey: keys.cloudflareToken };
  }

  // 5. Défaut — OpenRouter (secondaire)
  if (orKey) {
    return { provider: 'openrouter', model: openrouterModel(rawModel), apiKey: orKey };
  }

  // 6. Défaut — Anthropic (tertiaire)
  if (keys.anthropicKey) {
    const model = rawModel?.startsWith('claude') ? rawModel : 'claude-sonnet-5';
    return { provider: 'anthropic', model, apiKey: keys.anthropicKey };
  }

  // 7. Aucune clé configurée nulle part — échoue proprement avec un message clair
  // plutôt qu'un 401 silencieux vers OpenRouter.
  return { provider: 'openrouter', model: OPENROUTER_DEFAULT, apiKey: '' };
}

// Provider de repli si l'appel primaire échoue, en respectant le même ordre
// de priorité (Cloudflare → OpenRouter → Anthropic), clé disponible uniquement.
function getFallback(
  primaryProvider: string,
  settings?: AISettings | null,
): { provider: string; model: string; apiKey: string } | null {
  const keys = getGlobalKeys();
  const orKey = settings?.openrouter_key || keys.openrouterKey;
  const candidates: Array<{ provider: string; model: string; apiKey: string } | null> = [
    keys.cloudflareToken && keys.cloudflareAccountId
      ? { provider: 'cloudflare', model: CLOUDFLARE_DEFAULT_MODEL, apiKey: keys.cloudflareToken }
      : null,
    orKey ? { provider: 'openrouter', model: OPENROUTER_DEFAULT, apiKey: orKey } : null,
    keys.anthropicKey ? { provider: 'anthropic', model: 'claude-sonnet-5', apiKey: keys.anthropicKey } : null,
  ];
  return candidates.find((c) => c && c.provider !== primaryProvider) ?? null;
}

// ── Logging ───────────────────────────────────────────────────────────────────

function logCall(params: {
  id: string;
  userId?: string;
  provider: string;
  model: string;
  latencyMs: number;
  success: boolean;
}) {
  try {
    getAdminClient()
      .from('ai_gateway_logs')
      .insert({
        id: params.id,
        user_id: params.userId ?? null,
        provider: params.provider,
        model: params.model,
        latency_ms: params.latencyMs,
        success: params.success,
        created_at: new Date().toISOString(),
      })
      .then(() => {}, () => {});
  } catch { /* never throw */ }
}

// Atomically claims a notification slot for a user in the given throttle table —
// only one concurrent caller ever gets `true` back, even if several calls fail at
// the exact same instant (e.g. a batch of concurrent draft generations all hitting
// a provider's rate limit together). The UPDATE...WHERE is what makes this safe:
// Postgres serializes concurrent updates to the same row, and only the first one
// to run sees a stale-enough last_notified_at — every later one re-evaluates the
// WHERE against the row the first one just wrote, so it matches zero rows. A plain
// "SELECT then upsert" (the previous implementation) has no such guarantee, which
// is exactly what let 3 simultaneous failures each fire their own notification.
async function claimNotificationSlot(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  table: string,
  userId: string,
  windowMs: number,
): Promise<boolean> {
  const now = new Date().toISOString();
  const cutoff = new Date(Date.now() - windowMs).toISOString();

  const { data: updated } = await admin
    .from(table)
    .update({ last_notified_at: now })
    .eq('user_id', userId)
    .lt('last_notified_at', cutoff)
    .select('user_id');
  if (updated && updated.length > 0) return true;

  // No existing (stale-enough) row to claim via UPDATE — either this is the very
  // first failure ever for this user (insert wins), or another concurrent call
  // already claimed the slot moments ago (insert fails on the user_id PK conflict).
  const { error: insertErr } = await admin.from(table).insert({ user_id: userId, last_notified_at: now });
  return !insertErr;
}

// Notifies the user once every 15 minutes at most when a call has exhausted every
// provider fallback (a "real" failure, not a transient hiccup absorbed by the retry).
// Fire-and-forget, mirrors logCall's never-throw contract.
async function notifyAiFailure(userId: string | undefined, workspaceId: string | undefined, errorMessage: string) {
  if (!userId) return;
  try {
    const admin = getAdminClient();
    const claimed = await claimNotificationSlot(admin, 'ai_failure_notifications', userId, 15 * 60 * 1000);
    if (!claimed) return;

    let resolvedWorkspaceId = workspaceId;
    if (!resolvedWorkspaceId) {
      const { data: settingsRow } = await admin.from('settings').select('workspace_id').eq('user_id', userId).maybeSingle();
      resolvedWorkspaceId = settingsRow?.workspace_id ?? undefined;
    }

    const now = new Date().toISOString();
    await admin.from('notifications').insert({
      id: crypto.randomUUID(),
      user_id: userId,
      workspace_id: resolvedWorkspaceId ?? null,
      type: 'ai_failure',
      title: 'Échec IA ⚠️',
      body: `L'IA n'a pas pu répondre : ${errorMessage.slice(0, 200)}`,
      link: '/settings',
      is_read: false,
      created_at: now,
      updated_at: now,
    });
  } catch { /* never throw */ }
}

// ── Rate limiting ─────────────────────────────────────────────────────────────

const AI_RATE_LIMIT_MAX_CALLS = 60;
const AI_RATE_LIMIT_WINDOW_MS = 60 * 1000;

// Self-imposed limit checked BEFORE calling any provider, so a burst (e.g. a batch
// draft-generation button) fails fast locally instead of hammering the provider
// until it 429s — which is what produced 3 near-simultaneous "Échec IA" notifications
// for what was really a single rate-limit event.
async function checkAiRateLimit(userId: string | undefined): Promise<{ allowed: boolean; retryAfterSeconds?: number }> {
  if (!userId) return { allowed: true };
  try {
    const admin = getAdminClient();
    const windowStart = new Date(Date.now() - AI_RATE_LIMIT_WINDOW_MS).toISOString();
    const { count } = await admin
      .from('ai_gateway_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', windowStart);
    if ((count ?? 0) >= AI_RATE_LIMIT_MAX_CALLS) {
      return { allowed: false, retryAfterSeconds: Math.ceil(AI_RATE_LIMIT_WINDOW_MS / 1000) };
    }
    return { allowed: true };
  } catch {
    return { allowed: true }; // fail open — never block a real call because the check itself errored
  }
}

async function notifyRateLimited(userId: string | undefined, workspaceId: string | undefined) {
  if (!userId) return;
  try {
    const admin = getAdminClient();
    const claimed = await claimNotificationSlot(admin, 'ai_rate_limit_notifications', userId, 5 * 60 * 1000);
    if (!claimed) return;

    let resolvedWorkspaceId = workspaceId;
    if (!resolvedWorkspaceId) {
      const { data: settingsRow } = await admin.from('settings').select('workspace_id').eq('user_id', userId).maybeSingle();
      resolvedWorkspaceId = settingsRow?.workspace_id ?? undefined;
    }

    const now = new Date().toISOString();
    await admin.from('notifications').insert({
      id: crypto.randomUUID(),
      user_id: userId,
      workspace_id: resolvedWorkspaceId ?? null,
      type: 'ai_rate_limit',
      title: 'Limite IA atteinte ⏳',
      body: `Trop de demandes IA en peu de temps (max ${AI_RATE_LIMIT_MAX_CALLS}/min) — réessayez dans une minute.`,
      link: '/settings',
      is_read: false,
      created_at: now,
      updated_at: now,
    });
  } catch { /* never throw */ }
}

// ── Provider helpers ──────────────────────────────────────────────────────────

async function callOpenRouter(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  system: string | undefined,
  opts: Pick<AICallOptions, 'jsonMode' | 'maxTokens' | 'temperature'>,
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    'X-Title': 'Minerva OS Reach Lite',
  };

  const body = {
    model,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages,
    ],
    response_format: opts.jsonMode ? { type: 'json_object' } : undefined,
    max_tokens: opts.maxTokens || 1500,
    temperature: opts.temperature ?? 0.7,
  };

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST', headers, body: JSON.stringify(body),
  });

  if (resp.status === 429) {
    await new Promise(r => setTimeout(r, 60_000));
    const retry = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers, body: JSON.stringify(body) });
    if (!retry.ok) throw new Error('Le modèle IA est temporairement saturé. Réessaie dans quelques minutes.');
    const d = await retry.json();
    return d.choices?.[0]?.message?.content?.trim() || '';
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenRouter error ${resp.status}: ${text}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

async function callAnthropic(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  system: string | undefined,
  opts: Pick<AICallOptions, 'maxTokens' | 'temperature'>,
): Promise<string> {
  const anthropicModel = model.startsWith('claude') ? model : 'claude-sonnet-5';
  const client = new Anthropic({ apiKey });
  const userMessages = messages.filter(m => m.role !== 'system');

  const msg = await client.messages.create({
    model: anthropicModel,
    max_tokens: opts.maxTokens || 1500,
    system,
    messages: userMessages as any,
    temperature: opts.temperature ?? 0.7,
  });

  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
}

async function callCloudflare(
  apiKey: string,
  accountId: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  system: string | undefined,
  opts: Pick<AICallOptions, 'jsonMode' | 'maxTokens' | 'temperature'>,
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  const cfModel = model.startsWith('@cf/') ? model : `@cf/${model}`;
  const body = {
    model: cfModel,
    messages: [
      ...(system ? [{ role: 'system', content: system }] : []),
      ...messages,
    ],
    max_tokens: opts.maxTokens || 1500,
    temperature: opts.temperature ?? 0.7,
  };

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Cloudflare Workers AI error ${resp.status}: ${text}`);
  }
  const data = await resp.json();
  let content: string = data.choices?.[0]?.message?.content?.trim() || '';
  // Strip markdown code fences that reasoning models (Kimi K2) wrap JSON in
  content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
  return content;
}

function doCall(
  provider: string,
  model: string,
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  system: string | undefined,
  opts: Pick<AICallOptions, 'jsonMode' | 'maxTokens' | 'temperature'>,
): Promise<string> {
  if (provider === 'anthropic') return callAnthropic(apiKey, model, messages, system, opts);
  if (provider === 'cloudflare') {
    const keys = getGlobalKeys();
    return callCloudflare(apiKey, keys.cloudflareAccountId, model, messages, system, opts);
  }
  return callOpenRouter(apiKey, model, messages, system, opts);
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateCompletion(options: AICallOptions): Promise<string> {
  const rateLimit = await checkAiRateLimit(options.userId);
  if (!rateLimit.allowed) {
    await notifyRateLimited(options.userId, options.workspaceId);
    throw new Error(`Limite IA atteinte — réessaie dans ${rateLimit.retryAfterSeconds}s.`);
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const { provider, model, apiKey } = resolveAIProvider(options.settings);
  const messages = options.messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
    content: m.content,
  }));

  if (!apiKey) {
    const fallback = getFallback(provider, options.settings);
    if (!fallback) {
      const message = `Clé API manquante pour le provider : ${provider}`;
      await notifyAiFailure(options.userId, options.workspaceId, message);
      throw new Error(message);
    }
    return callWithFallback(fallback.provider, fallback.model, fallback.apiKey, messages, options, requestId, startTime);
  }

  try {
    const result = await doCall(provider, model, apiKey, messages, options.system, options);
    logCall({ id: requestId, userId: options.userId, provider, model, latencyMs: Date.now() - startTime, success: true });
    return result;
  } catch (err: any) {
    logCall({ id: requestId, userId: options.userId, provider, model, latencyMs: Date.now() - startTime, success: false });
    const fallback = getFallback(provider, options.settings);
    if (!fallback) {
      const message = err?.message || 'Le modèle IA est temporairement indisponible. Réessaie dans quelques minutes.';
      await notifyAiFailure(options.userId, options.workspaceId, message);
      throw new Error(message);
    }
    return callWithFallback(fallback.provider, fallback.model, fallback.apiKey, messages, options, crypto.randomUUID(), Date.now());
  }
}

async function callWithFallback(
  provider: string,
  model: string,
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  options: AICallOptions,
  requestId: string,
  startTime: number,
): Promise<string> {
  try {
    const result = await doCall(provider, model, apiKey, messages, options.system, options);
    logCall({ id: requestId, userId: options.userId, provider, model, latencyMs: Date.now() - startTime, success: true });
    return result;
  } catch (err: any) {
    logCall({ id: requestId, userId: options.userId, provider, model, latencyMs: Date.now() - startTime, success: false });
    const message = err?.message || 'Le modèle IA est temporairement indisponible, même après repli sur un second provider.';
    await notifyAiFailure(options.userId, options.workspaceId, message);
    throw new Error(message);
  }
}

// Fait le fetch amont pour un provider donné et renvoie la Response brute (pas
// encore transformée en ReadableStream) — permet d'essayer un provider de repli
// avant d'avoir envoyé le moindre octet au client, exactement comme
// generateCompletion/callWithFallback le fait déjà pour les appels non-streaming.
async function fetchStreamUpstream(
  provider: string,
  model: string,
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  options: AICallOptions,
): Promise<{ resp: Response; model: string }> {
  if (provider === 'openrouter') {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'X-Title': 'Minerva OS Reach Lite',
    };
    const body = {
      model,
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        ...messages,
      ],
      stream: true,
      max_tokens: options.maxTokens || 1500,
      temperature: options.temperature ?? 0.7,
    };
    let resp = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers, body: JSON.stringify(body) });
    if (resp.status === 429) {
      await new Promise(r => setTimeout(r, 60_000));
      resp = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers, body: JSON.stringify(body) });
    }
    if (!resp.ok) throw new Error(`OpenRouter streaming error ${resp.status}`);
    return { resp, model };
  }

  if (provider === 'cloudflare') {
    const keys = getGlobalKeys();
    const headers: Record<string, string> = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };
    const cfModel = model.startsWith('@cf/') ? model : `@cf/${model}`;
    const body = {
      model: cfModel,
      messages: [
        ...(options.system ? [{ role: 'system', content: options.system }] : []),
        ...messages,
      ],
      stream: true,
      max_tokens: options.maxTokens || 1500,
      temperature: options.temperature ?? 0.7,
    };
    const url = `https://api.cloudflare.com/client/v4/accounts/${keys.cloudflareAccountId}/ai/v1/chat/completions`;
    const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!resp.ok) throw new Error(`Cloudflare streaming error ${resp.status}`);
    return { resp, model: cfModel };
  }

  // ── Anthropic ──────────────────────────────────────────────────────────────
  const anthropicModel = model.startsWith('claude') ? model : 'claude-sonnet-5';
  const userMessages = messages.filter(m => m.role !== 'system');
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey.trim(), 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: anthropicModel,
      ...(options.system ? { system: options.system } : {}),
      messages: userMessages,
      stream: true,
      max_tokens: options.maxTokens || 1500,
      temperature: options.temperature ?? 0.7,
    }),
  });
  if (!resp.ok) throw new Error(`Anthropic streaming error ${resp.status}`);
  return { resp, model: anthropicModel };
}

// Transforme la Response amont réussie en ReadableStream au format SSE attendu
// par le front (delta OpenAI-style) — passthrough brut pour OpenRouter/Cloudflare
// (déjà au bon format), reformatage pour Anthropic (format d'event différent).
function wrapStreamResponse(provider: string, resp: Response): ReadableStream {
  const encoder = new TextEncoder();

  if (provider !== 'anthropic') {
    return new ReadableStream({
      async start(controller) {
        const reader = resp.body!.getReader();
        try { while (true) { const { done, value } = await reader.read(); if (done) break; controller.enqueue(value); } }
        catch (e) { controller.error(e); }
        finally { controller.close(); }
      }
    });
  }

  return new ReadableStream({
    async start(controller) {
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ choices: [{ delta: { content: parsed.delta.text } }] })}\n\n`
                ));
              }
            } catch { /* ignore parse errors */ }
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (e) { controller.error(e); }
      finally { controller.close(); reader.releaseLock(); }
    }
  });
}

export async function generateStreamCompletion(options: AICallOptions): Promise<ReadableStream> {
  const rateLimit = await checkAiRateLimit(options.userId);
  if (!rateLimit.allowed) {
    await notifyRateLimited(options.userId, options.workspaceId);
    throw new Error(`Limite IA atteinte — réessaie dans ${rateLimit.retryAfterSeconds}s.`);
  }

  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const { provider, model, apiKey } = resolveAIProvider(options.settings);
  const messages = options.messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
    content: m.content,
  }));

  // Le provider primaire n'a pas de clé configurée — repli direct sur le suivant
  // de la cascade, sans même tenter l'appel (comme generateCompletion).
  if (!apiKey) {
    const fallback = getFallback(provider, options.settings);
    if (!fallback) {
      const message = `Clé API manquante pour le provider : ${provider}`;
      await notifyAiFailure(options.userId, options.workspaceId, message);
      throw new Error(message);
    }
    const { resp, model: usedModel } = await fetchStreamUpstream(fallback.provider, fallback.model, fallback.apiKey, messages, options);
    logCall({ id: crypto.randomUUID(), userId: options.userId, provider: fallback.provider, model: usedModel, latencyMs: Date.now() - startTime, success: true });
    return wrapStreamResponse(fallback.provider, resp);
  }

  try {
    const { resp, model: usedModel } = await fetchStreamUpstream(provider, model, apiKey, messages, options);
    logCall({ id: requestId, userId: options.userId, provider, model: usedModel, latencyMs: Date.now() - startTime, success: true });
    return wrapStreamResponse(provider, resp);
  } catch (err: any) {
    logCall({ id: requestId, userId: options.userId, provider, model, latencyMs: Date.now() - startTime, success: false });
    const fallback = getFallback(provider, options.settings);
    if (!fallback) {
      const message = err?.message || 'Le modèle IA est temporairement indisponible. Réessaie dans quelques minutes.';
      await notifyAiFailure(options.userId, options.workspaceId, message);
      throw new Error(message);
    }
    try {
      const { resp, model: usedModel } = await fetchStreamUpstream(fallback.provider, fallback.model, fallback.apiKey, messages, options);
      logCall({ id: crypto.randomUUID(), userId: options.userId, provider: fallback.provider, model: usedModel, latencyMs: Date.now() - startTime, success: true });
      return wrapStreamResponse(fallback.provider, resp);
    } catch (fallbackErr: any) {
      logCall({ id: crypto.randomUUID(), userId: options.userId, provider: fallback.provider, model: fallback.model, latencyMs: Date.now() - startTime, success: false });
      const message = fallbackErr?.message || 'Le modèle IA est temporairement indisponible, même après repli sur un second provider.';
      await notifyAiFailure(options.userId, options.workspaceId, message);
      throw new Error(message);
    }
  }
}
