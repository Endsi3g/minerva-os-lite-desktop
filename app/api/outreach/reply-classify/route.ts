import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCompletion } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const { subject, snippet, threadId } = await req.json();

  let settings = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: dbSettings } = await supabase
        .from('settings')
        .select('ai_provider, ai_model, openrouter_key')
        .eq('user_id', user.id)
        .maybeSingle();
      settings = dbSettings;
    }
  } catch (err) {
    console.warn('[reply-classify] Failed loading user settings, using fallbacks:', err);
  }

  try {
    const text = await generateCompletion({
      messages: [{
        role: 'user',
        content: `Classify this email reply intent. Subject: "${subject}". Content: "${snippet}".
Respond with JSON only:
{
  "intent": "interested" | "not_interested" | "info_request" | "scheduling" | "other",
  "confidence": 0-100,
  "summary": "1-sentence summary",
  "suggestedAction": "brief action recommendation"
}`
      }],
      settings: settings || undefined,
      jsonMode: true,
      maxTokens: 200,
    });

    const result = JSON.parse(text);
    return NextResponse.json({ ...result, threadId });
  } catch (err) {
    console.error('[reply-classify] classification error:', err);
    return NextResponse.json({
      intent: 'other',
      confidence: 50,
      summary: 'Failed to classify email automatically',
      suggestedAction: 'Review manually',
      threadId,
    });
  }
}
