import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateCompletion } from '@/lib/ai';
import { reportAppError } from '@/lib/error-notifications';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leadId, phone: bodyPhone, send = false } = await req.json();
  if (!leadId) return NextResponse.json({ error: 'leadId requis' }, { status: 400 });

  const [{ data: settings }, { data: lead }] = await Promise.all([
    supabase.from('settings').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('leads').select('*').eq('id', leadId).maybeSingle(),
  ]);

  if (!lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 });

  const phone = bodyPhone || lead.phone;
  if (send && !phone) return NextResponse.json({ error: 'Numéro de téléphone manquant' }, { status: 400 });

  // Generate AI voicemail script
  const firstName = (lead.contact_name || lead.business_name || '').split(' ')[0] || 'bonjour';
  const descSnippet = lead.website_description ? lead.website_description.slice(0, 200) : '';

  let scriptText: string;
  let aiGenerated = true;
  try {
    scriptText = await generateCompletion({
      messages: [{
        role: 'user',
        content: `Tu es un consultant commercial. Rédige un script de voicemail ultra-court (max 30 secondes = ~80 mots) pour laisser un message à ${firstName} de ${lead.business_name || 'cette entreprise'}.

Secteur: ${lead.niche || 'non précisé'}
Ville: ${lead.city || ''}
${descSnippet ? `Contexte: ${descSnippet}` : ''}

Le message doit:
1. Te présenter rapidement (ex: "Bonjour ${firstName}, c'est [Prénom] de [Agence].")
2. Mentionner une observation spécifique sur leur activité
3. Promettre une valeur concrète et rapide
4. Demander un rappel ou laisser un numéro
Ton direct, professionnel, pas de pression. Commence directement par le message.`,
      }],
      settings: settings || undefined,
      // Un modèle de raisonnement (Cloudflare Kimi K2) peut consommer une
      // bonne partie du budget en reasoning_content avant de produire le
      // texte final — un plafond trop bas fait échouer l'appel entier.
      maxTokens: 900,
      userId: user.id,
      workspaceId: settings?.workspace_id || lead.workspace_id || undefined,
    });
  } catch (err: any) {
    // Ne plus substituer silencieusement un script générique — l'utilisateur
    // croyait recevoir un script IA personnalisé alors que les 3 providers
    // avaient échoué, sans aucune trace ni notification.
    aiGenerated = false;
    scriptText = `Bonjour ${firstName}, c'est [Prénom] de [votre agence]. Je vous appelle au sujet de ${lead.business_name || 'votre entreprise'} — j'ai quelques idées concrètes pour développer votre clientèle. N'hésitez pas à me rappeler au [numéro]. Bonne journée !`;
    await reportAppError({
      userId: user.id,
      workspaceId: settings?.workspace_id || lead.workspace_id || undefined,
      source: 'outreach/voicemail',
      title: 'Script de voicemail générique utilisé (échec IA)',
      message: err?.message || 'Erreur inconnue lors de la génération du script IA',
      context: { leadId, businessName: lead.business_name },
    });
  }

  // Save to voicemail_queue
  const { data: queueItem } = await supabase.from('voicemail_queue').insert({
    workspace_id: settings?.workspace_id || lead.workspace_id,
    lead_id: leadId,
    script: scriptText,
    phone,
    status: send ? 'pending' : 'draft',
  }).select().maybeSingle();

  // If send=true and Drop Cowboy keys are configured, deliver
  if (send && settings?.drop_cowboy_username && settings?.drop_cowboy_api_key && phone) {
    const dcRes = await fetch('https://www.dropcowboy.com/api/send', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${settings.drop_cowboy_username}:${settings.drop_cowboy_api_key}`).toString('base64')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone,
        message: scriptText,
        // Drop Cowboy requires an audio file URL for real RVM — this queues for TTS
      }),
    }).catch(() => null);

    const dcBody = dcRes?.ok ? await dcRes.json().catch(() => null) : null;
    const dcId = dcBody?.id || null;

    if (queueItem?.id) {
      await supabase.from('voicemail_queue').update({
        status: dcRes?.ok ? 'sent' : 'failed',
        drop_cowboy_id: dcId,
        sent_at: dcRes?.ok ? new Date().toISOString() : null,
        error: dcRes?.ok ? null : 'Drop Cowboy API error',
      }).eq('id', queueItem.id);
    }

    return NextResponse.json({ ok: true, script: scriptText, aiGenerated, delivered: dcRes?.ok ?? false, dropCowboyId: dcId });
  }

  return NextResponse.json({ ok: true, script: scriptText, aiGenerated, delivered: false, queueId: queueItem?.id });
}

// GET: fetch voicemail queue for a lead or workspace
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leadId = req.nextUrl.searchParams.get('leadId');
  const workspaceId = req.nextUrl.searchParams.get('workspaceId');

  let query = supabase.from('voicemail_queue').select('*, leads(business_name, contact_name)').order('created_at', { ascending: false }).limit(50);
  if (leadId) query = query.eq('lead_id', leadId);
  if (workspaceId) query = query.eq('workspace_id', workspaceId);

  const { data } = await query;
  return NextResponse.json(data || []);
}
