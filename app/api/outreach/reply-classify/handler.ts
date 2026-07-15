import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';
import { generateCompletion } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const { subject, snippet, threadId, lead_id, workspace_id } = await req.json();

  let user = null;
  let settings = null;
  try {
    const supabase = await createClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (authUser) {
      user = authUser;
      const { data: dbSettings } = await supabase
        .from('settings')
        .select('ai_provider, ai_model, openrouter_key')
        .eq('user_id', authUser.id)
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
      // Un modèle de raisonnement (Cloudflare Kimi K2) peut consommer une
      // bonne partie du budget en reasoning_content avant de produire le
      // JSON final — un plafond trop bas fait échouer l'appel entier.
      maxTokens: 800,
    });

    const result = JSON.parse(text);

    if (
      user &&
      lead_id &&
      workspace_id &&
      (result.intent === 'interested' || result.intent === 'scheduling')
    ) {
      const admin = getAdminClient();
      try {
        const { data: lead } = await admin
          .from('leads')
          .update({
            status: 'Meeting Booked',
            temperature: 'Hot',
            reply_status: 'positive',
            reply_detected_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', lead_id)
          .select('business_name, niche, city')
          .single();

        await Promise.all([
          admin.from('agent_actions').insert({
            workspace_id,
            user_id: user.id,
            action_type: 'book_meeting',
            lead_id,
            suggested: true,
            executed: false,
            approved: null,
            reasoning: `${lead?.business_name ?? 'Ce lead'} a répondu positivement — planifiez un rendez-vous dans les 24h.`,
            data_signals: `Réponse positive détectée · Niche: ${lead?.niche ?? '—'} · Ville: ${lead?.city ?? '—'}`,
          }),
          admin.from('notifications').insert({
            workspace_id,
            user_id: user.id,
            type: 'email_received',
            title: `Réponse positive — ${lead?.business_name ?? 'Lead'}`,
            body: 'Ce prospect a répondu favorablement. Planifiez un rendez-vous dès maintenant.',
            link: `/leads/${lead_id}`,
            is_read: false,
          }),
        ]);
      } catch (loopErr) {
        console.warn('[reply-classify] closed-loop trigger failed:', loopErr);
      }
    }

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
