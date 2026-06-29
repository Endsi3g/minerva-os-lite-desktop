import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import Anthropic from '@anthropic-ai/sdk';

async function callAnthropic(messages: any[], model: string, maxTokens: number, system?: string) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await client.messages.create({
    model: model || 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: system || 'You are a helpful CRM assistant for Minerva OS.',
    messages,
  });
  return (response.content[0] as any).text as string;
}

async function callOpenRouter(messages: any[], model: string, maxTokens: number, system?: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set');
  const allMessages = system ? [{ role: 'system', content: system }, ...messages] : messages;
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://minerva-os.com',
    },
    body: JSON.stringify({ model: model || 'anthropic/claude-sonnet-4-6', messages: allMessages, max_tokens: maxTokens }),
  });
  if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`);
  const data = await res.json();
  return data.choices[0].message.content as string;
}

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { messages, model, max_tokens = 1024, system, provider } = body;
    if (!messages?.length) return NextResponse.json({ error: 'messages required' }, { status: 400 });

    let content: string;
    let providerUsed = provider || 'anthropic';

    try {
      if (providerUsed === 'anthropic') {
        content = await callAnthropic(messages, model || 'claude-sonnet-4-6', max_tokens, system);
      } else {
        content = await callOpenRouter(messages, model, max_tokens, system);
      }
    } catch {
      try {
        if (providerUsed === 'anthropic') {
          content = await callOpenRouter(messages, model, max_tokens, system);
          providerUsed = 'openrouter (fallback)';
        } else {
          content = await callAnthropic(messages, model || 'claude-sonnet-4-6', max_tokens, system);
          providerUsed = 'anthropic (fallback)';
        }
      } catch (fallbackErr: any) {
        throw new Error(`All providers failed: ${fallbackErr.message}`);
      }
    }

    const latencyMs = Date.now() - startTime;
    supabase.from('ai_gateway_logs').insert({ id: requestId, user_id: user.id, provider: providerUsed, model: model || 'claude-sonnet-4-6', latency_ms: latencyMs, success: true, created_at: new Date().toISOString() }).then(() => {}, () => {});

    return NextResponse.json({ id: requestId, content, provider: providerUsed, latency_ms: latencyMs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, request_id: requestId, latency_ms: Date.now() - startTime }, { status: 500 });
  }
}
