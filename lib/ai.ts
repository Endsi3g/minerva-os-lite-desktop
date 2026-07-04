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
const CLOUDFLARE_DEFAULT_MODEL = '@cf/moonshotai/kimi-k2.7-code';

const getGlobalKeys = () => ({
  openrouterKey: process.env.OPENROUTER_API_KEY || '',
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
  cloudflareToken: process.env.CLOUDFLARE_API_TOKEN || 'cfut_l0PDRuG7slPkY2Q9zMAE9qhXzkD15c0sFQa12hS77cc92973',
  cloudflareAccountId: process.env.CLOUDFLARE_ACCOUNT_ID || '2a6584ba17918eeea6ea4c659abb1782',
});

export function resolveAIProvider(settings?: AISettings | null) {
  const keys = getGlobalKeys();
  const explicitProvider = settings?.ai_provider;
  const rawModel = settings?.ai_model;

  // 1. Explicit Anthropic selection — or model name starts with "claude"
  if (
    explicitProvider === 'anthropic' ||
    (rawModel?.startsWith('claude') && !explicitProvider)
  ) {
    if (keys.anthropicKey) {
      const model = rawModel?.startsWith('claude') ? rawModel : 'claude-sonnet-4-6';
      return { provider: 'anthropic', model, apiKey: keys.anthropicKey };
    }
  }

  // 2. Explicit OpenRouter selection
  if (explicitProvider === 'openrouter') {
    const apiKey = settings?.openrouter_key || keys.openrouterKey;
    const STALE = new Set(['openrouter/free', 'meta-llama/llama-3-8b-instruct:free',
      'meta-llama/llama-3.1-8b-instruct:free', 'google/gemma-2-9b-it:free',
      'qwen/qwen-2-7b-instruct:free', 'llama-3.3-70b-versatile', 'meta-llama/Llama-3-70b-chat-hf']);
    const model = (rawModel && !STALE.has(rawModel) && !rawModel.startsWith('claude')) ? rawModel : OPENROUTER_DEFAULT;
    return { provider: 'openrouter', model, apiKey };
  }

  // 3. Cloudflare — explicit selection OR model name starts with "@cf/"
  if (explicitProvider === 'cloudflare' || rawModel?.startsWith('@cf/')) {
    const model = rawModel?.startsWith('@cf/') ? rawModel : CLOUDFLARE_DEFAULT_MODEL;
    return { provider: 'cloudflare', model, apiKey: keys.cloudflareToken };
  }

  // 4. Anthropic if key is available
  if (keys.anthropicKey) {
    const model = rawModel?.startsWith('claude') ? rawModel : 'claude-sonnet-4-6';
    return { provider: 'anthropic', model, apiKey: keys.anthropicKey };
  }

  // 5. Cloudflare primary default — Kimi K2 (hardcoded creds always available)
  if (keys.cloudflareToken && keys.cloudflareAccountId) {
    const model = rawModel?.startsWith('@cf/') ? rawModel : CLOUDFLARE_DEFAULT_MODEL;
    return { provider: 'cloudflare', model, apiKey: keys.cloudflareToken };
  }

  // 6. OpenRouter fallback when key is configured
  const orKey = settings?.openrouter_key || keys.openrouterKey;
  if (orKey) {
    const STALE = new Set(['openrouter/free', 'meta-llama/llama-3-8b-instruct:free',
      'meta-llama/llama-3.1-8b-instruct:free', 'google/gemma-2-9b-it:free',
      'qwen/qwen-2-7b-instruct:free', 'llama-3.3-70b-versatile', 'meta-llama/Llama-3-70b-chat-hf']);
    const model = (rawModel && !STALE.has(rawModel) && !rawModel.startsWith('claude')) ? rawModel : OPENROUTER_DEFAULT;
    return { provider: 'openrouter', model, apiKey: orKey };
  }

  // 7. OpenRouter without key (will fail gracefully with 401)
  return { provider: 'openrouter', model: OPENROUTER_DEFAULT, apiKey: '' };
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

function getFallback(primary: string): { provider: string; model: string; apiKey: string } | null {
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
  } catch (err: any) {
    logCall({ id: requestId, userId: options.userId, provider, model, latencyMs: Date.now() - startTime, success: false });
    throw new Error(err?.message || 'Le modèle IA est temporairement indisponible. Réessaie dans quelques minutes.');
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

  // ── Cloudflare streaming ──────────────────────────────────────────────────
  if (provider === 'cloudflare') {
    const keys = getGlobalKeys();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };
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
    if (!resp.ok) {
      logCall({ id: requestId, userId: options.userId, provider, model, latencyMs: Date.now() - startTime, success: false });
      throw new Error(`Cloudflare streaming error ${resp.status}`);
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
