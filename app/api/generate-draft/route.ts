import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateEmailDraftForLead } from '@/lib/generate-email-draft';

const VALID_TONES = ['Calme & Conseil', 'Direct', 'Dynamique'];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { leadId, channel = 'Email', tone, instructions = '', websiteDescription: clientWebsiteDescription } = await req.json();

    if (!leadId) {
      return NextResponse.json({ error: 'leadId manquant' }, { status: 400 });
    }
    if (tone && !VALID_TONES.includes(tone)) {
      return NextResponse.json({ error: `Ton invalide. Valeurs acceptées : ${VALID_TONES.join(', ')}` }, { status: 400 });
    }

    const { data: lead } = await supabase.from('leads').select('workspace_id').eq('id', leadId).maybeSingle();
    if (!lead) {
      return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 });
    }

    let draft: { subject: string; content: string; tone: string };
    try {
      draft = await generateEmailDraftForLead(supabase, user.id, lead.workspace_id, {
        leadId,
        channel,
        tone,
        instructions,
        websiteDescriptionOverride: clientWebsiteDescription,
      });
    } catch (err) {
      const errMsg = (err as Error).message;
      console.error('generate-draft: draft generation failed:', errMsg);
      return NextResponse.json(
        { error: `Génération IA échouée — ${errMsg}. Vérifie ta clé API dans Paramètres → IA.` },
        { status: 502 }
      );
    }

    const { data: newDbDraft, error: draftErr } = await supabase
      .from('drafts')
      .insert({
        lead_id: leadId,
        user_id: user.id,
        workspace_id: lead.workspace_id,
        channel,
        tone: draft.tone,
        subject: draft.subject,
        content: draft.content,
        status: 'Draft',
      })
      .select()
      .single();

    if (draftErr) {
      console.error('Error saving draft in database:', draftErr);
    }

    return NextResponse.json({
      id: newDbDraft?.id || `draft-mock-${Date.now()}`,
      leadId,
      channel,
      tone: draft.tone,
      subject: draft.subject,
      content: draft.content,
      createdAt: newDbDraft?.created_at || new Date().toISOString(),
    });

  } catch (err) {
    console.error('Error in generate-draft route:', err);
    const errorMessage = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
