import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || 'cfut_l0PDRuG7slPkY2Q9zMAE9qhXzkD15c0sFQa12hS77cc92973';
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || '2a6584ba17918eeea6ea4c659abb1782';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const providers = [];

  // Anthropic
  if (process.env.ANTHROPIC_API_KEY) {
    const t = Date.now();
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] }),
      });
      providers.push({ id: 'anthropic', name: 'Anthropic Claude', available: r.ok, latency_ms: Date.now() - t, primary: true });
    } catch {
      providers.push({ id: 'anthropic', name: 'Anthropic Claude', available: false, latency_ms: null, primary: true });
    }
  } else {
    providers.push({ id: 'anthropic', name: 'Anthropic Claude', available: false, latency_ms: null, primary: true, error: 'API key not configured' });
  }

  // Cloudflare Workers AI
  {
    const t = Date.now();
    try {
      const r = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/ai/v1/chat/completions`,
        {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${CF_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: '@cf/meta/llama-3.1-8b-instruct', messages: [{ role: 'user', content: 'ping' }], max_tokens: 1 }),
        },
      );
      providers.push({ id: 'cloudflare', name: 'Cloudflare Workers AI', available: r.ok, latency_ms: Date.now() - t, primary: false, model: '@cf/meta/llama-3.1-8b-instruct' });
    } catch {
      providers.push({ id: 'cloudflare', name: 'Cloudflare Workers AI', available: false, latency_ms: null, primary: false });
    }
  }

  // OpenRouter
  if (process.env.OPENROUTER_API_KEY) {
    const t = Date.now();
    try {
      const r = await fetch('https://openrouter.ai/api/v1/models', { headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}` } });
      providers.push({ id: 'openrouter', name: 'OpenRouter', available: r.ok, latency_ms: Date.now() - t, primary: false });
    } catch {
      providers.push({ id: 'openrouter', name: 'OpenRouter', available: false, latency_ms: null, primary: false });
    }
  } else {
    providers.push({ id: 'openrouter', name: 'OpenRouter', available: false, latency_ms: null, primary: false, error: 'API key not configured' });
  }

  return NextResponse.json({ providers });
}
