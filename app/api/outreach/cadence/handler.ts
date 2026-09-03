import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

type CadencePhase =
  | 'initial_email'
  | 'followup_email'
  | 'call'
  | 'field_visit'
  | 'booking'
  | 'proposal'
  | 'post_proposal'
  | 'closed';

const PHASE_LABELS: Record<CadencePhase, string> = {
  initial_email: 'Email initial',
  followup_email: 'Relance email',
  call: 'Appel téléphonique',
  field_visit: 'Visite terrain',
  booking: 'Prise de rendez-vous',
  proposal: 'Envoi de proposition',
  post_proposal: 'Suivi de proposition',
  closed: 'Cycle terminé',
};

const PHASE_ORDER: CadencePhase[] = [
  'initial_email',
  'followup_email',
  'call',
  'field_visit',
  'booking',
  'proposal',
  'post_proposal',
  'closed',
];

const PHASE_CHANNEL: Record<CadencePhase, string> = {
  initial_email: 'email',
  followup_email: 'email',
  call: 'call',
  field_visit: 'visit',
  booking: 'email',
  proposal: 'email',
  post_proposal: 'email',
  closed: 'none',
};

function nextPhase(current: CadencePhase): CadencePhase {
  const idx = PHASE_ORDER.indexOf(current);
  if (idx === -1 || idx >= PHASE_ORDER.length - 1) return 'closed';
  return PHASE_ORDER[idx + 1];
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leadId = req.nextUrl.searchParams.get('lead_id');
  const workspaceId = req.nextUrl.searchParams.get('workspace_id');
  if (!leadId || !workspaceId) {
    return NextResponse.json({ error: 'lead_id and workspace_id required' }, { status: 400 });
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(leadId);
  let lead: any = null;

  if (isUuid) {
    const { data } = await supabase
      .from('leads')
      .select('id, status, last_activity_at, reply_detected_at, reply_status, email_opens_count, created_at, nba_action, nba_channel')
      .eq('id', leadId)
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    lead = data;
  }

  if (!lead) {
    lead = {
      id: leadId,
      status: 'New',
      created_at: new Date().toISOString(),
      last_activity_at: null,
      reply_detected_at: null,
      reply_status: null,
      email_opens_count: 0,
      nba_action: 'email_followup',
      nba_channel: 'email',
    };
  }

  const now = new Date();
  const referenceDate = lead.last_activity_at
    ? new Date(lead.last_activity_at)
    : new Date(lead.created_at);
  const daysSinceLastActivity = Math.floor(
    (now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  let currentPhase: CadencePhase;

  if (lead.status === 'Won' || lead.status === 'Lost') {
    currentPhase = 'closed';
  } else if (lead.status === 'Negotiation') {
    currentPhase = 'post_proposal';
  } else if (lead.status === 'Proposal Sent') {
    currentPhase = 'proposal';
  } else if (
    lead.reply_status === 'positive' ||
    lead.status === 'Meeting Booked'
  ) {
    currentPhase = 'booking';
  } else {
    if (daysSinceLastActivity < 3) {
      currentPhase = 'initial_email';
    } else if (daysSinceLastActivity < 5) {
      currentPhase = 'followup_email';
    } else if (daysSinceLastActivity < 10) {
      currentPhase = 'call';
    } else {
      currentPhase = 'field_visit';
    }
  }

  const next = nextPhase(currentPhase);

  let recommendedAt: string;
  let urgency: 'high' | 'medium' | 'low';

  if (currentPhase === 'initial_email') {
    recommendedAt = now.toISOString();
    urgency = 'high';
  } else if (currentPhase === 'followup_email') {
    recommendedAt = daysSinceLastActivity >= 3 ? now.toISOString() : addDays(referenceDate, 3);
    urgency = daysSinceLastActivity >= 3 ? 'high' : 'medium';
  } else if (currentPhase === 'call') {
    recommendedAt = daysSinceLastActivity >= 5 ? now.toISOString() : addDays(referenceDate, 5);
    urgency = daysSinceLastActivity >= 5 ? 'high' : 'medium';
  } else if (currentPhase === 'field_visit') {
    recommendedAt = daysSinceLastActivity >= 10 ? now.toISOString() : addDays(referenceDate, 10);
    urgency = daysSinceLastActivity >= 10 ? 'high' : 'medium';
  } else if (currentPhase === 'post_proposal') {
    recommendedAt = addDays(referenceDate, 7);
    urgency = daysSinceLastActivity >= 7 ? 'high' : 'medium';
  } else if (currentPhase === 'closed') {
    recommendedAt = now.toISOString();
    urgency = 'low';
  } else {
    recommendedAt = now.toISOString();
    urgency = 'medium';
  }

  const phaseLabel = PHASE_LABELS[currentPhase];
  const nextLabel = PHASE_LABELS[next];

  let reasoning: string;
  if (currentPhase === 'closed') {
    reasoning = 'Le cycle commercial est terminé pour ce prospect.';
  } else if (currentPhase === 'initial_email') {
    reasoning = `Aucun contact établi. Envoyez un premier email de présentation dès aujourd'hui.`;
  } else if (currentPhase === 'followup_email') {
    reasoning = `Email initial envoyé il y a ${daysSinceLastActivity} jour(s) sans réponse. Une relance email augmente le taux de réponse de 30%.`;
  } else if (currentPhase === 'call') {
    reasoning = `Pas de réponse après ${daysSinceLastActivity} jour(s). Un appel téléphonique direct est recommandé pour établir le contact.`;
  } else if (currentPhase === 'field_visit') {
    reasoning = `Aucune réponse après ${daysSinceLastActivity} jour(s). Une visite terrain peut débloquer la situation et démontrer votre engagement.`;
  } else if (currentPhase === 'booking') {
    reasoning = `Le prospect a montré un intérêt positif. Proposez rapidement un rendez-vous pour concrétiser.`;
  } else if (currentPhase === 'proposal') {
    reasoning = `Le rendez-vous a eu lieu. Préparez et envoyez votre proposition commerciale personnalisée.`;
  } else if (currentPhase === 'post_proposal') {
    reasoning = `Proposition envoyée il y a ${daysSinceLastActivity} jour(s). Un suivi à J+7 maximise les chances de signature.`;
  } else {
    reasoning = `Prochaine étape recommandée : ${phaseLabel}.`;
  }

  return NextResponse.json({
    currentPhase,
    nextPhase: next,
    currentPhaseLabel: phaseLabel,
    nextPhaseLabel: nextLabel,
    channel: PHASE_CHANNEL[currentPhase],
    recommendedAt,
    reasoning,
    urgency,
    daysSinceLastActivity,
  });
}
