export interface ProviderPingResult {
  id: 'cloudflare' | 'openrouter' | 'anthropic';
  name: string;
  available: boolean;
  latency_ms: number | null;
  priority: number;
  model?: string;
  error?: string;
}

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || '';

// Ordre de priorité réel (voir lib/ai.ts resolveAIProvider) :
// 1. Cloudflare Workers AI — 2. OpenRouter — 3. Anthropic Claude.
export async function pingAllProviders(): Promise<ProviderPingResult[]> {
  const providers: ProviderPingResult[] = [];

  // Cloudflare Workers AI (priorité 1 — primaire)
  if (CF_TOKEN && CF_ACCOUNT) {
    const t = Date.now();
    try {
      const r = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/v1/chat/completions`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: '@cf/moonshotai/kimi-k2.7-code', messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
        },
      );
      providers.push({ id: 'cloudflare', name: 'Cloudflare Workers AI', available: r.ok, latency_ms: Date.now() - t, priority: 1, model: '@cf/moonshotai/kimi-k2.7-code' });
    } catch {
      providers.push({ id: 'cloudflare', name: 'Cloudflare Workers AI', available: false, latency_ms: null, priority: 1 });
    }
  } else {
    providers.push({ id: 'cloudflare', name: 'Cloudflare Workers AI', available: false, latency_ms: null, priority: 1, error: 'API token not configured' });
  }

  // OpenRouter (priorité 2 — secondaire)
  if (process.env.OPENROUTER_API_KEY) {
    const t = Date.now();
    try {
      const r = await fetch('https://openrouter.ai/api/v1/models', { headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` } });
      providers.push({ id: 'openrouter', name: 'OpenRouter', available: r.ok, latency_ms: Date.now() - t, priority: 2 });
    } catch {
      providers.push({ id: 'openrouter', name: 'OpenRouter', available: false, latency_ms: null, priority: 2 });
    }
  } else {
    providers.push({ id: 'openrouter', name: 'OpenRouter', available: false, latency_ms: null, priority: 2, error: 'API key not configured' });
  }

  // Anthropic (priorité 3 — tertiaire)
  if (process.env.ANTHROPIC_API_KEY) {
    const t = Date.now();
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
      });
      providers.push({ id: 'anthropic', name: 'Anthropic Claude', available: r.ok, latency_ms: Date.now() - t, priority: 3 });
    } catch {
      providers.push({ id: 'anthropic', name: 'Anthropic Claude', available: false, latency_ms: null, priority: 3 });
    }
  } else {
    providers.push({ id: 'anthropic', name: 'Anthropic Claude', available: false, latency_ms: null, priority: 3, error: 'API key not configured' });
  }

  return providers;
}

export async function checkAiHealth(): Promise<{ ok: boolean; anyAvailable: boolean; providers: ProviderPingResult[] }> {
  const providers = await pingAllProviders();
  const anyAvailable = providers.some(p => p.available);
  return { ok: anyAvailable, anyAvailable, providers };
}
