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
}

const OPENROUTER_DEFAULT = 'meta-llama/llama-3.3-70b-instruct:free';

const getGlobalKeys = () => ({
  openrouterKey: process.env.OPENROUTER_API_KEY || '',
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
});

export function resolveAIProvider(settings?: AISettings | null) {
  const keys = getGlobalKeys();
  const userOpenrouterKey = settings?.openrouter_key || '';
  const openrouterKey = userOpenrouterKey || keys.openrouterKey;
  const anthropicKey = keys.anthropicKey;

  // OpenRouter is the sole active provider — Anthropic is fallback only when no OpenRouter key
  const provider = openrouterKey ? 'openrouter' : (anthropicKey ? 'anthropic' : 'openrouter');

  const rawModel = settings?.ai_model;
  const STALE_MODELS = new Set([
    'openrouter/free', 'meta-llama/llama-3-8b-instruct:free',
    'meta-llama/llama-3.1-8b-instruct:free', 'google/gemma-2-9b-it:free',
    'qwen/qwen-2-7b-instruct:free', 'llama-3.3-70b-versatile',
    'meta-llama/Llama-3-70b-chat-hf',
  ]);

  let model = (rawModel && !STALE_MODELS.has(rawModel) && !rawModel.startsWith('claude'))
    ? rawModel
    : OPENROUTER_DEFAULT;

  const apiKey = provider === 'openrouter' ? openrouterKey : anthropicKey;

  return { provider, model, apiKey };
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
  const anthropicModel = model.startsWith('claude') ? model : 'claude-3-5-sonnet-20241022';
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

function doCall(
  provider: string,
  model: string,
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  system: string | undefined,
  opts: Pick<AICallOptions, 'jsonMode' | 'maxTokens' | 'temperature'>,
): Promise<string> {
  if (provider === 'anthropic') return callAnthropic(apiKey, model, messages, system, opts);
  return callOpenRouter(apiKey, model, messages, system, opts);
}

function getFallback(primary: string): { provider: string; model: string; apiKey: string } | null {
  const keys = getGlobalKeys();
  if (primary === 'anthropic' && keys.openrouterKey) {
    return { provider: 'openrouter', model: OPENROUTER_DEFAULT, apiKey: keys.openrouterKey };
  }
  if (primary === 'openrouter' && keys.anthropicKey) {
    return { provider: 'anthropic', model: 'claude-sonnet-4-6', apiKey: keys.anthropicKey };
  }
  return null;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function generateCompletion(options: AICallOptions): Promise<string> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const { provider, model, apiKey } = resolveAIProvider(options.settings);
  const messages = options.messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
    content: m.content,
  }));

  if (!apiKey) throw new Error(`Clé API manquante pour le provider : ${provider}`);

  try {
    const result = await doCall(provider, model, apiKey, messages, options.system, options);
    logCall({ id: requestId, userId: options.userId, provider, model, latencyMs: Date.now() - startTime, success: true });
    return result;
  } catch {
    const fallback = getFallback(provider);
    if (fallback) {
      try {
        const result = await doCall(fallback.provider, fallback.model, fallback.apiKey, messages, options.system, options);
        logCall({ id: requestId, userId: options.userId, provider: `${fallback.provider} (fallback)`, model: fallback.model, latencyMs: Date.now() - startTime, success: true });
        return result;
      } catch (fallbackErr: any) {
        logCall({ id: requestId, userId: options.userId, provider: `${fallback.provider} (fallback-failed)`, model: fallback.model, latencyMs: Date.now() - startTime, success: false });
        throw new Error(`Tous les providers IA ont échoué : ${fallbackErr.message}`);
      }
    }
    logCall({ id: requestId, userId: options.userId, provider, model, latencyMs: Date.now() - startTime, success: false });
    throw new Error('Le modèle IA est temporairement indisponible. Réessaie dans quelques minutes.');
  }
}

export async function generateStreamCompletion(options: AICallOptions): Promise<ReadableStream> {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  const { provider, model, apiKey } = resolveAIProvider(options.settings);
  if (!apiKey) throw new Error(`Clé API manquante pour le provider : ${provider}`);

  const messages = options.messages.map(m => ({
    role: m.role === 'assistant' ? 'assistant' : m.role === 'system' ? 'system' : 'user',
    content: m.content,
  }));
  const encoder = new TextEncoder();

  // ── OpenRouter streaming ──────────────────────────────────────────────────
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
      if (!resp.ok) throw new Error('Le modèle IA est temporairement saturé.');
    }
    if (!resp.ok) {
      logCall({ id: requestId, userId: options.userId, provider, model, latencyMs: Date.now() - startTime, success: false });
      throw new Error(`OpenRouter streaming error ${resp.status}`);
    }
    logCall({ id: requestId, userId: options.userId, provider, model, latencyMs: Date.now() - startTime, success: true });
    return new ReadableStream({
      async start(controller) {
        const reader = resp.body!.getReader();
        try { while (true) { const { done, value } = await reader.read(); if (done) break; controller.enqueue(value); } }
        catch (e) { controller.error(e); }
        finally { controller.close(); }
      }
    });
  }

  // ── Anthropic streaming ───────────────────────────────────────────────────
  const anthropicModel = model.startsWith('claude') ? model : 'claude-3-5-sonnet-20241022';
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
  if (!resp.ok) {
    logCall({ id: requestId, userId: options.userId, provider, model: anthropicModel, latencyMs: Date.now() - startTime, success: false });
    throw new Error(`Anthropic streaming error ${resp.status}`);
  }
  logCall({ id: requestId, userId: options.userId, provider, model: anthropicModel, latencyMs: Date.now() - startTime, success: true });
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
