import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const CF_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID || '';

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
      providers.push({ id: 'cloudflare', name: 'Cloudflare Workers AI', available: r.ok, latency_ms: Date.now() - t, primary: false, model: '@cf/moonshotai/kimi-k2.7-code' });
    } catch {
      providers.push({ id: 'cloudflare', name: 'Cloudflare Workers AI', available: false, latency_ms: null, primary: false });
    }
  } else {
    providers.push({ id: 'cloudflare', name: 'Cloudflare Workers AI', available: false, latency_ms: null, primary: false, error: 'API token not configured' });
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
