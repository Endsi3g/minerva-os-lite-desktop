import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCompletion } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { messages, model, max_tokens = 1024, system, provider } = body;
  if (!messages?.length) return NextResponse.json({ error: 'messages required' }, { status: 400 });

  const startTime = Date.now();
  try {
    const content = await generateCompletion({
      messages,
      system,
      maxTokens: max_tokens,
      userId: user.id,
      settings: provider ? { ai_provider: provider, ai_model: model } : undefined,
    });

    return NextResponse.json({
      content,
      latency_ms: Date.now() - startTime,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, latency_ms: Date.now() - startTime },
      { status: 500 },
    );
  }
}
