import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Programmes de croissance — Autopilot (PRD v12, Sprint 3) : garde-fou de
// suspension automatique. Le plafond quotidien (lib/autopilot-guard.ts) est
// appliqué au moment de l'envoi ; ce cron, lui, détecte les anomalies sur une
// fenêtre de 7 jours (taux de réponses négatives trop élevé) et suspend le
// programme avant que la relation client ne se dégrade davantage.
//
// Seuil volontairement conservateur : sous NEGATIVE_RATE_THRESHOLD de leads
// contactés, une petite série de refus normaux (ex: 2 sur 6) ne doit pas
// déclencher de suspension — MIN_SAMPLE_SIZE évite les faux positifs sur les
// programmes tout juste lancés.
const NEGATIVE_RATE_THRESHOLD = 0.4;
const MIN_SAMPLE_SIZE = 5;

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    const authHeader = req.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: autopilotCampaigns, error } = await supabase
    .from('campaigns')
    .select('id, name, user_id, workspace_id')
    .eq('autopilot_enabled', true)
    .eq('status', 'active');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!autopilotCampaigns || autopilotCampaigns.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, suspended: 0 });
  }

  let suspended = 0;
  const nowStr = new Date().toISOString();

  for (const campaign of autopilotCampaigns) {
    const { data: programLeads } = await supabase
      .from('leads')
      .select('status, reply_status')
      .eq('campaign_id', campaign.id);

    // Le taux se calcule sur l'ensemble des leads contactés du programme (pas
    // seulement une fenêtre récente) — un programme avec un historique de
    // rejets ne doit pas repasser sous le radar simplement parce que
    // l'activité récente est calme.
    const contacted = (programLeads ?? []).filter((l) => l.status !== 'New');
    if (contacted.length < MIN_SAMPLE_SIZE) continue;

    const negativeCount = contacted.filter((l) => l.reply_status === 'negative').length;
    const negativeRate = negativeCount / contacted.length;

    if (negativeRate > NEGATIVE_RATE_THRESHOLD) {
      const reason = `Suspendu automatiquement : ${Math.round(negativeRate * 100)}% de réponses négatives sur ${contacted.length} leads contactés (seuil ${Math.round(NEGATIVE_RATE_THRESHOLD * 100)}%)`;

      await supabase.from('campaigns').update({
        autopilot_enabled: false,
        status: 'paused',
        autopilot_paused_reason: reason,
        autopilot_paused_at: nowStr,
        updated_at: nowStr,
      }).eq('id', campaign.id);

      if (campaign.user_id) {
        await supabase.from('notifications').insert({
          user_id: campaign.user_id,
          workspace_id: campaign.workspace_id ?? null,
          type: 'autopilot_suspended',
          title: `Autopilot suspendu — ${campaign.name}`,
          body: reason,
          link: `/campaigns/${campaign.id}`,
          is_read: false,
          created_at: nowStr,
          updated_at: nowStr,
        });
      }

      suspended++;
    }
  }

  return NextResponse.json({ ok: true, checked: autopilotCampaigns.length, suspended });
}
