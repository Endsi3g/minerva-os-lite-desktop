import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { lead_id, workspace_id } = await req.json().catch(() => ({}));
  if (!lead_id || !workspace_id) {
    return NextResponse.json({ error: 'lead_id et workspace_id requis' }, { status: 400 });
  }

  const admin = getAdminClient();

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

  const { data: action } = await admin
    .from('agent_actions')
    .insert({
      workspace_id,
      user_id: user.id,
      action_type: 'book_meeting',
      lead_id,
      suggested: true,
      executed: false,
      approved: null,
      reasoning: `${lead?.business_name ?? 'Ce lead'} a répondu positivement — planifiez un rendez-vous dans les 24h.`,
      data_signals: `Réponse positive détectée · Niche: ${lead?.niche ?? '—'} · Ville: ${lead?.city ?? '—'}`,
    })
    .select('id')
    .single();

  await admin.from('notifications').insert({
    workspace_id,
    user_id: user.id,
    type: 'email_received',
    title: `Réponse positive — ${lead?.business_name ?? 'Lead'}`,
    body: 'Ce prospect a répondu favorablement. Planifiez un rendez-vous dès maintenant.',
    link: `/leads/${lead_id}`,
    is_read: false,
  });

  return NextResponse.json({
    success: true,
    action_id: action?.id ?? null,
    message: `Pipeline mis à jour — action de booking créée pour ${lead?.business_name ?? 'ce lead'}`,
  });
}
