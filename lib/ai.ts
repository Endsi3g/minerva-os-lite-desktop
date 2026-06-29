import Anthropic from '@anthropic-ai/sdk';
import { getAdminClient } from '@/lib/supabase/admin';

export interface AISettings {
  ai_provider?: string | null;
  ai_model?: string | null;
  openrouter_key?: string | null;
  groq_api_key?: string | null;
  together_api_key?: string | null;
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
  groqKey: process.env.GROQ_API_KEY || '',
  togetherKey: process.env.TOGETHER_API_KEY || '',
  anthropicKey: process.env.ANTHROPIC_API_KEY || '',
});

export function resolveAIProvider(settings?: AISettings | null) {
  const keys = getGlobalKeys();
  const userOpenrouterKey = settings?.openrouter_key || '';
  const openrouterKey = userOpenrouterKey || keys.openrouterKey;
  const groqKey = settings?.groq_api_key || keys.groqKey;
  const togetherKey = settings?.together_api_key || keys.togetherKey;
  const anthropicKey = keys.anthropicKey;

  const explicitProvider = settings?.ai_provider;
  const provider = (() => {
    if (explicitProvider === 'openrouter' && openrouterKey) return 'openrouter';
    if (explicitProvider === 'anthropic' && anthropicKey) return 'anthropic';
    if (explicitProvider === 'groq' && groqKey) return 'groq';
    if (explicitProvider === 'together' && togetherKey) return 'together';
    if (userOpenrouterKey) return 'openrouter';
    if (groqKey) return 'groq';
    if (togetherKey) return 'together';
    if (anthropicKey) return 'anthropic';
    if (openrouterKey) return 'openrouter';
    return 'anthropic';
  })();

  let model = settings?.ai_model || (
    provider === 'openrouter' ? OPENROUTER_DEFAULT :
    provider === 'groq' ? 'llama-3.3-70b-versatile' :
    provider === 'together' ? 'meta-llama/Llama-3-70b-chat-hf' :
    'claude-sonnet-4-6'
  );

  if (
    model === 'openrouter/free' ||
    model === 'meta-llama/llama-3-8b-instruct:free' ||
    model === 'meta-llama/llama-3.1-8b-instruct:free' ||
    model === 'google/gemma-2-9b-it:free' ||
    model === 'qwen/qwen-2-7b-instruct:free'
  ) {
    model = OPENROUTER_DEFAULT;
  }

  if (provider === 'openrouter' && model.startsWith('claude')) {
    model = OPENROUTER_DEFAULT;
  }

  const apiKey = (() => {
    if (provider === 'openrouter') return openrouterKey;
    if (provider === 'groq') return groqKey;
    if (provider === 'together') return togetherKey;
    return anthropicKey;
  })();

  return { provider, model, apiKey };
}

// ── Logging ──────────────────────────────────────────────────────────────────

function logCall(params: {
  id: string;
  userId?: string;
  provider: string;
  model: string;
  latencyMs: number;
  success: boolean;
}) {
  // Fire-and-forget — a logging failure must never break the AI call
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
  } catch {
    // never throw
  }
}

// ── Provider call helpers ─────────────────────────────────────────────────────

async function callOpenAICompatible(
  provider: 'openrouter' | 'groq' | 'together',
  apiKey: string,
  model: string,
  messages: Array<{ role: string; content: string }>,
  system: string | undefined,
  opts: Pick<AICallOptions, 'jsonMode' | 'maxTokens' | 'temperature'>,
): Promise<string> {
  const baseURL =
    provider === 'openrouter' ? 'https://openrouter.ai/api/v1' :
    provider === 'groq'       ? 'https://api.groq.com/openai/v1' :
                                'https://api.together.xyz/v1';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    headers['X-Title'] = 'Minerva OS Reach Lite';
  }

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

  const resp = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (resp.status === 429) {
    await new Promise(r => setTimeout(r, 60_000));
    const retry = await fetch(`${baseURL}/chat/completions`, { method: 'POST', headers, body: JSON.stringify(body) });
    if (!retry.ok) throw new Error(`Le modèle IA est temporairement saturé. Réessaie dans quelques minutes.`);
    const d = await retry.json();
    return d.choices?.[0]?.message?.content?.trim() || '';
  }

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`${provider} error ${resp.status}: ${text}`);
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

async function doCall(
  provider: string,
  model: string,
  apiKey: string,
  messages: Array<{ role: string; content: string }>,
  system: string | undefined,
  opts: Pick<AICallOptions, 'jsonMode' | 'maxTokens' | 'temperature'>,
): Promise<string> {
  if (provider === 'anthropic') return callAnthropic(apiKey, model, messages, system, opts);
  return callOpenAICompatible(provider as any, apiKey, model, messages, system, opts);
}

function getFallback(primary: string): { provider: string; model: string; apiKey: string } | null {
  const keys = getGlobalKeys();
  if (primary === 'anthropic' && keys.openrouterKey) {
    return { provider: 'openrouter', model: OPENROUTER_DEFAULT, apiKey: keys.openrouterKey };
  }
  if (primary !== 'anthropic' && keys.anthropicKey) {
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
    // Attempt fallback provider
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
    throw new Error(`Le modèle IA est temporairement saturé. Réessaie dans quelques minutes.`);
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

  // ── OpenAI-compatible streaming ───────────────────────────────────────────
  if (provider === 'openrouter' || provider === 'groq' || provider === 'together') {
    const baseURL =
      provider === 'openrouter' ? 'https://openrouter.ai/api/v1' :
      provider === 'groq'       ? 'https://api.groq.com/openai/v1' :
                                  'https://api.together.xyz/v1';

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      headers['X-Title'] = 'Minerva OS Reach Lite';
    }

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

    let resp = await fetch(`${baseURL}/chat/completions`, { method: 'POST', headers, body: JSON.stringify(body) });

    if (resp.status === 429) {
      await new Promise(r => setTimeout(r, 60_000));
      resp = await fetch(`${baseURL}/chat/completions`, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!resp.ok) throw new Error(`Le modèle IA est temporairement saturé. Réessaie dans quelques minutes.`);
    }

    if (!resp.ok) {
      logCall({ id: requestId, userId: options.userId, provider, model, latencyMs: Date.now() - startTime, success: false });
      const text = await resp.text();
      throw new Error(`${provider} streaming error ${resp.status}: ${text}`);
    }

    logCall({ id: requestId, userId: options.userId, provider, model, latencyMs: Date.now() - startTime, success: true });
    return new ReadableStream({
      async start(controller) {
        const reader = resp.body!.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (e) { controller.error(e); }
        finally { controller.close(); }
      }
    });
  }

  // ── Anthropic streaming ───────────────────────────────────────────────────
  if (provider === 'anthropic') {
    const anthropicModel = model.startsWith('claude') ? model : 'claude-3-5-sonnet-20241022';
    const userMessages = messages.filter(m => m.role !== 'system');

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
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
      const text = await resp.text();
      throw new Error(`Anthropic streaming error ${resp.status}: ${text}`);
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

  throw new Error(`Provider de streaming non supporté : ${provider}`);
}
