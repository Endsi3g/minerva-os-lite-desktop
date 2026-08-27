import Anthropic from '@anthropic-ai/sdk';
import { getAdminClient } from '@/lib/supabase/admin';

export interface AISettings {
  ai_provider?: string | null;
  ai_model?: string | null;
  openrouter_key?: string | null;
  gemini_key?: string | null;
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

const DEFAULT_GEMINI_KEY = 'AQ.Ab8RN6JLYfvAxa1AdhDpIAs8jIgcRnzfrC_Ezr1gLYjiG7njwQ';
const GEMINI_DEFAULT_MODEL = 'gemini-3.7-flash';
const OPENROUTER_DEFAULT = 'meta-llama/llama-3.3-70b-instruct:free';
const CLOUDFLARE_DEFAULT_MODEL = '@cf/moonshotai/kimi-k2.7-code';

const getGlobalKeys = () => ({
  geminiKey: process.env.GEMINI_API_KEY || DEFAULT_GEMINI_KEY,
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

const STALE_CLOUDFLARE_MODELS = new Set([
  '@cf/meta/llama-3.1-8b-instruct',
]);

/** Compresses messages and system instructions to minimize token consumption */
function compressPrompt(text: string): string {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function geminiModel(rawModel?: string | null): string {
  if (!rawModel) return GEMINI_DEFAULT_MODEL;
  if (rawModel.includes('3.7')) return 'gemini-3.7-flash';
  if (rawModel.includes('2.5')) return 'gemini-2.5-flash';
  if (rawModel.includes('2.0')) return 'gemini-2.0-flash';
  if (rawModel.includes('1.5')) return 'gemini-1.5-flash';
  return GEMINI_DEFAULT_MODEL;
}

function cloudflareModel(rawModel?: string | null): string {
  return (rawModel && rawModel.startsWith('@cf/') && !STALE_CLOUDFLARE_MODELS.has(rawModel))
    ? rawModel
    : CLOUDFLARE_DEFAULT_MODEL;
}

function openrouterModel(rawModel?: string | null): string {
  return (rawModel && !STALE_OPENROUTER_MODELS.has(rawModel) && !rawModel.startsWith('claude') && !rawModel.startsWith('@cf/'))
    ? rawModel
    : OPENROUTER_DEFAULT;
}

// Ordre de priorité par défaut : Gemini 3.7 Flash → Cloudflare → OpenRouter → Anthropic
export function resolveAIProvider(settings?: AISettings | null) {
  const keys = getGlobalKeys();
  const explicitProvider = settings?.ai_provider;
  const rawModel = settings?.ai_model;
  const geminiKey = settings?.gemini_key || keys.geminiKey;
  const orKey = settings?.openrouter_key || keys.openrouterKey;

  // 1. Explicit Gemini selection (ou modèle gemini demandé)
  if ((explicitProvider === 'gemini' || (rawModel?.toLowerCase().includes('gemini') && !explicitProvider)) && geminiKey) {
    return { provider: 'gemini', model: geminiModel(rawModel), apiKey: geminiKey };
  }

  // 2. Explicit Anthropic selection — or model name starts with "claude"
  if (
    (explicitProvider === 'anthropic' || (rawModel?.startsWith('claude') && !explicitProvider))
    && keys.anthropicKey
  ) {
    const model = rawModel?.startsWith('claude') ? rawModel : 'claude-sonnet-5';
    return { provider: 'anthropic', model, apiKey: keys.anthropicKey };
  }

  // 3. Explicit OpenRouter selection
  if (explicitProvider === 'openrouter' && orKey) {
    return { provider: 'openrouter', model: openrouterModel(rawModel), apiKey: orKey };
  }

  // 4. Explicit Cloudflare selection — or model name starts with "@cf/"
  if ((explicitProvider === 'cloudflare' || rawModel?.startsWith('@cf/')) && keys.cloudflareToken && keys.cloudflareAccountId) {
    return { provider: 'cloudflare', model: cloudflareModel(rawModel), apiKey: keys.cloudflareToken };
  }

  // 5. Défaut #1 — Google Gemini Flash (ultra rapide & économe en tokens)
  if (geminiKey) {
    return { provider: 'gemini', model: geminiModel(rawModel), apiKey: geminiKey };
  }

  // 6. Défaut #2 — Cloudflare Workers AI
  if (keys.cloudflareToken && keys.cloudflareAccountId) {
    return { provider: 'cloudflare', model: cloudflareModel(rawModel), apiKey: keys.cloudflareToken };
  }

  // 7. Défaut #3 — OpenRouter
  if (orKey) {
    return { provider: 'openrouter', model: openrouterModel(rawModel), apiKey: orKey };
  }

  // 8. Défaut #4 — Anthropic
  if (keys.anthropicKey) {
    const model = rawModel?.startsWith('claude') ? rawModel : 'claude-sonnet-5';
    return { provider: 'anthropic', model, apiKey: keys.anthropicKey };
  }

  return { provider: 'gemini', model: GEMINI_DEFAULT_MODEL, apiKey: DEFAULT_GEMINI_KEY };
}

function buildProviderChain(
  primary: { provider: string; model: string; apiKey: string },
  settings?: AISettings | null,
): Array<{ provider: string; model: string; apiKey: string }> {
  const keys = getGlobalKeys();
  const geminiKey = settings?.gemini_key || keys.geminiKey;
  const orKey = settings?.openrouter_key || keys.openrouterKey;
  const candidates: Array<{ provider: string; model: string; apiKey: string } | null> = [
    primary,
    geminiKey
      ? { provider: 'gemini', model: geminiModel(settings?.ai_model), apiKey: geminiKey }
      : null,
    keys.cloudflareToken && keys.cloudflareAccountId
      ? { provider: 'cloudflare', model: CLOUDFLARE_DEFAULT_MODEL, apiKey: keys.cloudflareToken }
      : null,
    orKey ? { provider: 'openrouter', model: openrouterModel(settings?.ai_model), apiKey: orKey } : null,
    keys.anthropicKey ? { provider: 'anthropic', model: 'claude-sonnet-5', apiKey: keys.anthropicKey } : null,
  ];
  const seen = new Set<string>();
  const chain: Array<{ provider: string; model: string; apiKey: string }> = [];
  for (const c of candidates) {
    if (!c || !c.apiKey || seen.has(c.provider)) continue;
    seen.add(c.provider);
    chain.push(c);
  }
  return chain;
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

  const { error: insertErr } = await admin.from(table).insert({ user_id: userId, last_notified_at: now });
  return !insertErr;
}

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

const AI_RATE_LIMIT_MAX_CALLS = 120;
const AI_RATE_LIMIT_WINDOW_MS = 60 * 1000;

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
    return { allowed: true };
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

// ── Google Gemini Provider (Ultra Token-Friendly) ─────────────────────────────

async function callGemini(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  system: string | undefined,
  opts: Pick<AICallOptions, 'jsonMode' | 'maxTokens' | 'temperature'>,
): Promise<string> {
  const cleanSystem = compressPrompt(system || '');
  const cleanMessages = messages.map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
    content: compressPrompt(m.content),
  }));

  // Direct OpenAI-compatible Gemini endpoint
  const targetModel = model.includes('gemini') ? model : 'gemini-3.7-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;

  const body = {
    model: targetModel,
    messages: [
      ...(cleanSystem ? [{ role: 'system', content: cleanSystem }] : []),
      ...cleanMessages,
    ],
    response_format: opts.jsonMode ? { type: 'json_object' } : undefined,
    max_tokens: opts.maxTokens || 800,
    temperature: opts.temperature ?? 0.3,
  };

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify(body),
    });

    if (resp.status === 429) {
      throw new Error('Google Gemini est temporairement saturé (429).');
    }

    if (!resp.ok) {
      // Fallback to native generateContent endpoint
      return await callGeminiNative(apiKey, targetModel, cleanMessages, cleanSystem, opts);
    }

    const data = await resp.json();
    let content = data.choices?.[0]?.message?.content?.trim() || '';
    if (opts.jsonMode) {
      content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
    }
    return content;
  } catch {
    return await callGeminiNative(apiKey, targetModel, cleanMessages, cleanSystem, opts);
  }
}

async function callGeminiNative(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  system: string,
  opts: Pick<AICallOptions, 'jsonMode' | 'maxTokens' | 'temperature'>,
): Promise<string> {
  const candidateModels = [model, 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'].filter(
    (m, idx, arr) => arr.indexOf(m) === idx
  );

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const payload: any = {
    contents,
    generationConfig: {
      maxOutputTokens: opts.maxTokens || 800,
      temperature: opts.temperature ?? 0.3,
      ...(opts.jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  };

  if (system) {
    payload.systemInstruction = { parts: [{ text: system }] };
  }

  let lastErr = '';
  for (const m of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey.trim()}`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        const text = await resp.text();
        lastErr = `Google Gemini (${m}) error ${resp.status}: ${text}`;
        continue;
      }

      const data = await resp.json();
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      if (opts.jsonMode) {
        text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();
      }
      if (text) return text;
    } catch (e: any) {
      lastErr = e?.message || 'Network error';
    }
  }

  throw new Error(lastErr || 'Google Gemini indisponible');
}

// ── OpenRouter ────────────────────────────────────────────────────────────────

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
      ...(system ? [{ role: 'system', content: compressPrompt(system) }] : []),
      ...messages.map(m => ({ ...m, content: compressPrompt(m.content) })),
    ],
    response_format: opts.jsonMode ? { type: 'json_object' } : undefined,
    max_tokens: opts.maxTokens || 800,
    temperature: opts.temperature ?? 0.3,
  };

  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST', headers, body: JSON.stringify(body),
  });

  if (resp.status === 429) {
    throw new Error('Le modèle IA (OpenRouter) est temporairement saturé.');
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`OpenRouter error ${resp.status}: ${text}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

// ── Anthropic ─────────────────────────────────────────────────────────────────

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
    max_tokens: opts.maxTokens || 800,
    system: system ? compressPrompt(system) : undefined,
    messages: userMessages.map(m => ({ ...m, content: compressPrompt(m.content) })) as any,
    temperature: opts.temperature ?? 0.3,
  });

  return msg.content[0].type === 'text' ? msg.content[0].text.trim() : '';
}

// ── Cloudflare ────────────────────────────────────────────────────────────────

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
      ...(system ? [{ role: 'system', content: compressPrompt(system) }] : []),
      ...messages.map(m => ({ ...m, content: compressPrompt(m.content) })),
    ],
    max_tokens: opts.maxTokens || 800,
    temperature: opts.temperature ?? 0.3,
  };

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
  const resp = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (resp.status === 429) {
    throw new Error('Cloudflare Workers AI est temporairement limité (429).');
  }
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Cloudflare Workers AI error ${resp.status}: ${text}`);
  }
  const data = await resp.json();
  let content: string = data.choices?.[0]?.message?.content?.trim() || '';
  content = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim();

  if (!content) {
    const reasoningPreview = (data.choices?.[0]?.message?.reasoning_content || '').slice(0, 120);
    throw new Error(
      reasoningPreview
        ? `Cloudflare Workers AI réponse vide (${reasoningPreview}...)`
        : 'Cloudflare Workers AI a renvoyé une réponse vide'
    );
  }

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
  if (provider === 'gemini') return callGemini(apiKey, model, messages, system, opts);
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

  const messages = options.messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
    content: m.content,
  }));

  const primary = resolveAIProvider(options.settings);
  const chain = buildProviderChain(primary, options.settings);
  if (chain.length === 0) {
    const message = `Clé API manquante pour le provider : ${primary.provider}`;
    await notifyAiFailure(options.userId, options.workspaceId, message);
    throw new Error(message);
  }

  const failures: string[] = [];
  for (const step of chain) {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    try {
      const result = await doCall(step.provider, step.model, step.apiKey, messages, options.system, {
        jsonMode: options.jsonMode,
        maxTokens: options.maxTokens,
        temperature: options.temperature,
      });
      logCall({
        id: requestId,
        userId: options.userId,
        provider: step.provider,
        model: step.model,
        latencyMs: Date.now() - startTime,
        success: true,
      });
      return result;
    } catch (err: any) {
      logCall({
        id: requestId,
        userId: options.userId,
        provider: step.provider,
        model: step.model,
        latencyMs: Date.now() - startTime,
        success: false,
      });
      failures.push(`${step.provider} (${step.model}): ${err?.message || 'erreur inconnue'}`);
    }
  }

  const message = failures.length > 0
    ? `Tous les providers IA configurés ont échoué — ${failures.join(' · ')}`
    : 'Le modèle IA est temporairement indisponible.';
  await notifyAiFailure(options.userId, options.workspaceId, message);
  throw new Error(message);
}

// ── Streaming Implementation ──────────────────────────────────────────────────

async function fetchStreamUpstream(
  provider: string,
  model: string,
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  options: AICallOptions,
): Promise<{ resp: Response; model: string }> {
  if (provider === 'gemini') {
    const targetModel = model.includes('gemini') ? model : 'gemini-3.7-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions`;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey.trim()}`,
    };
    const body = {
      model: targetModel,
      messages: [
        ...(options.system ? [{ role: 'system', content: compressPrompt(options.system) }] : []),
        ...messages.map(m => ({ ...m, content: compressPrompt(m.content) })),
      ],
      stream: true,
      max_tokens: options.maxTokens || 800,
      temperature: options.temperature ?? 0.3,
    };
    const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (resp.status === 429) throw new Error('Google Gemini est temporairement saturé (429).');
    if (!resp.ok) throw new Error(`Google Gemini streaming error ${resp.status}`);
    return { resp, model: targetModel };
  }

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
        ...(options.system ? [{ role: 'system', content: compressPrompt(options.system) }] : []),
        ...messages.map(m => ({ ...m, content: compressPrompt(m.content) })),
      ],
      stream: true,
      max_tokens: options.maxTokens || 800,
      temperature: options.temperature ?? 0.3,
    };
    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', headers, body: JSON.stringify(body) });
    if (resp.status === 429) throw new Error('Le modèle IA (OpenRouter) est temporairement saturé.');
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
        ...(options.system ? [{ role: 'system', content: compressPrompt(options.system) }] : []),
        ...messages.map(m => ({ ...m, content: compressPrompt(m.content) })),
      ],
      stream: true,
      max_tokens: options.maxTokens || 800,
      temperature: options.temperature ?? 0.3,
    };
    const url = `https://api.cloudflare.com/client/v4/accounts/${keys.cloudflareAccountId}/ai/v1/chat/completions`;
    const resp = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) });
    if (resp.status === 429) throw new Error('Cloudflare Workers AI est temporairement limité (429).');
    if (!resp.ok) throw new Error(`Cloudflare streaming error ${resp.status}`);
    return { resp, model: cfModel };
  }

  // Anthropic
  const anthropicModel = model.startsWith('claude') ? model : 'claude-sonnet-5';
  const userMessages = messages.filter(m => m.role !== 'system');
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey.trim(), 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: anthropicModel,
      ...(options.system ? { system: compressPrompt(options.system) } : {}),
      messages: userMessages.map(m => ({ ...m, content: compressPrompt(m.content) })),
      stream: true,
      max_tokens: options.maxTokens || 800,
      temperature: options.temperature ?? 0.3,
    }),
  });
  if (!resp.ok) throw new Error(`Anthropic streaming error ${resp.status}`);
  return { resp, model: anthropicModel };
}

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
            } catch { /* ignore */ }
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

  const messages = options.messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
    content: m.content,
  }));

  const primary = resolveAIProvider(options.settings);
  const chain = buildProviderChain(primary, options.settings);
  if (chain.length === 0) {
    const message = `Clé API manquante pour le provider : ${primary.provider}`;
    await notifyAiFailure(options.userId, options.workspaceId, message);
    throw new Error(message);
  }

  const failures: string[] = [];
  for (const step of chain) {
    const startTime = Date.now();
    const requestId = crypto.randomUUID();
    try {
      const { resp, model: usedModel } = await fetchStreamUpstream(step.provider, step.model, step.apiKey, messages, options);
      logCall({ id: requestId, userId: options.userId, provider: step.provider, model: usedModel, latencyMs: Date.now() - startTime, success: true });
      return wrapStreamResponse(step.provider, resp);
    } catch (err: any) {
      logCall({ id: requestId, userId: options.userId, provider: step.provider, model: step.model, latencyMs: Date.now() - startTime, success: false });
      failures.push(`${step.provider}: ${err?.message || 'erreur inconnue'}`);
    }
  }

  const message = failures.length > 0
    ? `Tous les providers IA configurés ont échoué — ${failures.join(' · ')}`
    : 'Le modèle IA est temporairement indisponible.';
  await notifyAiFailure(options.userId, options.workspaceId, message);
  throw new Error(message);
}
