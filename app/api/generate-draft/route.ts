import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCompletion } from '@/lib/ai';

interface LeadData {
  business_name: string;
  contact_name?: string | null;
  city?: string | null;
  contact_email?: string | null;
  niche?: string | null;
  source?: string | null;
}

interface NoteData {
  type: string;
  content: string;
}

// Safe fallback generator if Anthropic API key is placeholder
function generateMockDraft(lead: LeadData, notes: NoteData[], channel: string, tone: string, companyName: string, fullName: string): string {
  const notesSummary = notes.map(n => `- ${n.content}`).join('\n');
  const signature = fullName ? `${fullName} (${companyName})` : `L'équipe ${companyName}`;

  if (channel === 'DM') {
    return `Salut ${lead.contact_name || lead.business_name},\n\nJe suis passé devant ton établissement à ${lead.city || 'Montréal'} l'autre jour. J'ai remarqué quelques opportunités pour attirer plus de clients (notamment sur ton référencement local et ton site mobile).\n\nTu serais ouvert à ce que je t'envoie un court audit vidéo de 2 minutes ?\n\nBonne journée,\n${fullName || 'Minerva'}`;
  }

  if (channel === 'Call') {
    return `SCRIPT D'APPEL téléphonique - Ton: ${tone}\n\n1. Entrée en matière : "Bonjour ${lead.contact_name || 'le gérant'}, c'est ${fullName || 'Minerva'} de ${companyName}. Je me permets de vous contacter car je suis passé près de ${lead.business_name} à ${lead.city}..."\n\n2. Accroche terrain :\n${notes.length > 0 ? notes[0].content : "J'ai vu que votre fiche Google n'était pas encore revendiquée."}\n\n3. Proposition de valeur : "On aide les commerces locaux à capter 15 à 20% de clients en plus en corrigeant cela."\n\n4. Appel à l'action : Proposer un rendez-vous rapide vendredi matin.`;
  }

  return `Bonjour ${lead.contact_name || 'l\'équipe de ' + lead.business_name},\n\nJ'ai récemment analysé la visibilité en ligne de ${lead.business_name} à ${lead.city || 'Montréal'}.\n\nEn observant votre activité sur le terrain et sur le web, j'ai noté quelques points clés :\n${notesSummary || '- Votre fiche Google Maps n\'est pas encore optimisée\n- Absence de site adapté aux mobiles'}\n\nChez ${companyName}, nous aidons les professionnels de votre secteur à capter les clients locaux avant qu'ils n'aillent chez la concurrence.\n\nSeriez-vous disponible pour un rapide appel de 5 minutes ce jeudi à 14h ?\n\nBien cordialement,\n${signature}`;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verify Authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { leadId, channel = 'Email', tone, instructions = '' } = await req.json();

    if (!leadId) {
      return NextResponse.json({ error: 'leadId manquant' }, { status: 400 });
    }

    const VALID_TONES = ['Calme & Conseil', 'Direct', 'Dynamique'];
    if (tone && !VALID_TONES.includes(tone)) {
      return NextResponse.json({ error: `Ton invalide. Valeurs acceptées : ${VALID_TONES.join(', ')}` }, { status: 400 });
    }

    // 2. Fetch Lead Context
    const { data: lead, error: leadErr } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadErr || !lead) {
      return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 });
    }

    // 3. Fetch Associated Notes
    const { data: notes } = await supabase
      .from('notes')
      .select('*')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true });

    // 4. Fetch User Settings
    const { data: settings } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    const companyName = settings?.company_name || 'Uprising Studio';
    const fullName = settings?.full_name || 'Moi';
    const aiTone = tone || settings?.ai_tone || 'Calme & Conseil';
    const emailSignature = settings?.email_signature || null;

    let draftContent = '';
    const notesText = (notes || []).map(n => `- [${n.type}] : ${n.content}`).join('\n');

    const systemPrompt = `Tu es un copilote de prospection pour ${fullName} de l'agence "${companyName}".
Ton but est de rédiger un message de prospection ultra-personnalisé, court et percutant en français.
Il doit être rédigé pour le canal : ${channel}.
Ton de rédaction ciblé : ${aiTone}.

Directives :
1. Pas de formules de politesse bateau comme "J'espère que vous allez bien" ou "En tant que leader...". Sois direct, naturel, et humain.
2. Utilise les observations terrain et les notes du prospect ci-dessous pour rendre le message unique et hautement personnalisé.
3. Reste concis (maximum 3 paragraphes pour un e-mail, très court pour un DM ou SMS).
4. Termine par un appel à l'action simple et direct (ex: proposer un appel de 5 minutes).${emailSignature ? `\n5. Termine le message par cette signature exacte :\n${emailSignature}` : ''}`;

    const userPrompt = `Prospect : ${lead.business_name}
Contact : ${lead.contact_name || 'Inconnu'} (E-mail: ${lead.contact_email || 'Inconnu'})
Secteur : ${lead.niche}
Ville : ${lead.city}
Source : ${lead.source}

Notes terrain / observations :
${notesText || 'Aucune note spécifique disponible.'}

Instructions spécifiques supplémentaires de l'utilisateur :
${instructions}

Rédige uniquement le corps du message final en français :`;

    try {
      draftContent = await generateCompletion({
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        settings: {
          ai_provider: settings?.ai_provider,
          ai_model: settings?.ai_model,
          openrouter_key: settings?.openrouter_key,
          groq_api_key: settings?.groq_api_key,
          together_api_key: settings?.together_api_key,
        },
        maxTokens: 1024,
      });
    } catch (err) {
      // Try Anthropic as hard fallback before using mock
      try {
        console.warn("Primary AI provider failed, retrying with Anthropic:", (err as Error).message);
        draftContent = await generateCompletion({
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
          settings: { ai_provider: 'anthropic', ai_model: 'claude-haiku-4-5-20251001' },
          maxTokens: 1024,
        });
      } catch (fallbackErr) {
        console.warn("Anthropic fallback also failed, using mock:", (fallbackErr as Error).message);
        draftContent = generateMockDraft(lead, notes || [], channel, aiTone, companyName, fullName);
      }
    }

    // 6. Save draft in database
    const { data: newDbDraft, error: draftErr } = await supabase
      .from('drafts')
      .insert({
        lead_id: leadId,
        user_id: user.id,
        workspace_id: lead.workspace_id,
        channel,
        tone: aiTone,
        content: draftContent,
        status: 'Draft'
      })
      .select()
      .single();

    if (draftErr) {
      console.error("Error saving draft in database:", draftErr);
    }

    return NextResponse.json({
      id: newDbDraft?.id || `draft-mock-${Date.now()}`,
      leadId,
      channel,
      tone: aiTone,
      content: draftContent,
      createdAt: newDbDraft?.created_at || new Date().toISOString()
    });

  } catch (err) {
    console.error("Error in generate-draft route:", err);
    const errorMessage = err instanceof Error ? err.message : 'Erreur interne';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
