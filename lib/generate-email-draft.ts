import { generateCompletion, type AISettings } from '@/lib/ai';

export interface GenerateDraftParams {
  leadId: string;
  channel?: 'Email' | 'DM' | 'Call';
  tone?: string;
  instructions?: string;
  websiteDescriptionOverride?: string | null;
  templateType?: 'follow_up' | 'introduction' | 'closing' | 'reactivation';
}

export interface GeneratedDraft {
  subject: string;
  content: string;
  tone: string;
}

const VALID_TONES = ['Calme & Conseil', 'Direct', 'Dynamique'];

// Canonical per-lead draft generator — the single function every entry point (the
// lead-detail composer, the AI agent tool, manual batch generation, and the auto-draft
// cron) calls to produce one personalized email. Pulls in every signal enrich-contact
// has gathered (decision-maker, company vibe, Google reviews) plus the user's
// configured persona/voice from the AI setup wizard, which nothing previously read.
export async function generateEmailDraftForLead(
  supabase: any,
  userId: string,
  workspaceId: string | null | undefined,
  params: GenerateDraftParams,
): Promise<GeneratedDraft> {
  const channel = params.channel || 'Email';
  const requestedTone = params.tone && VALID_TONES.includes(params.tone) ? params.tone : undefined;

  const { data: lead, error: leadErr } = await supabase
    .from('leads')
    .select('*, google_place_data')
    .eq('id', params.leadId)
    .single();
  if (leadErr || !lead) throw new Error('Lead introuvable');

  const { data: notes } = await supabase
    .from('notes')
    .select('*')
    .eq('lead_id', params.leadId)
    .order('created_at', { ascending: true });

  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const companyName = settings?.company_name || 'Uprising Studio';
  const fullName = settings?.full_name || 'Moi';
  const aiTone = requestedTone || settings?.ai_tone || 'Calme & Conseil';
  const emailSignature = settings?.email_signature || null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notesText = (notes || []).map((n: any) => `- [${n.type}] : ${n.content}`).join('\n');

  const gd = lead.google_place_data as Record<string, any> | null;
  let googleContext = '';
  if (gd) {
    const parts: string[] = [];
    if (gd.rating && gd.review_count) parts.push(`Note Google : ${gd.rating}/5 (${gd.review_count} avis)`);
    if (gd.generative_summary) parts.push(`Résumé Google IA : "${gd.generative_summary}"`);
    else if (gd.editorial_summary) parts.push(`Description Google : "${gd.editorial_summary}"`);
    if (gd.reviews?.length) {
      const topReview = gd.reviews[0];
      if (topReview.text) parts.push(`Meilleur avis client : "${topReview.text.slice(0, 180)}"`);
    }
    if (parts.length > 0) googleContext = `\nDonnées Google (utilise ces détails concrets pour l'accroche) :\n${parts.join('\n')}`;
  }

  const websiteDescription =
    params.websiteDescriptionOverride ||
    lead.website_description ||
    lead.description ||
    null;
  const websiteUrl = lead.website_url || lead.website || null;
  let webContext = '';
  if (websiteDescription) webContext = `\nDescription du site / activité : ${websiteDescription}`;
  else if (websiteUrl) webContext = `\nSite web : ${websiteUrl}`;

  const decisionMakerLine = lead.decision_maker_name
    ? `\nDécideur : ${lead.decision_maker_name}${lead.decision_maker_role ? ` (${lead.decision_maker_role})` : ''}`
    : '';
  const vibeLine = lead.company_vibe ? `\nVibe de l'entreprise : ${lead.company_vibe}` : '';

  let customContext = '';
  if (lead.custom_fields) {
    try {
      const fields = typeof lead.custom_fields === 'string'
        ? JSON.parse(lead.custom_fields)
        : lead.custom_fields;
      if (fields && typeof fields === 'object') {
        const entries = Object.entries(fields).filter(([, v]) => v);
        if (entries.length > 0) {
          customContext = `\nInformations de personnalisation supplémentaires (utilise-les intelligemment pour personnaliser le message) :\n${entries.map(([k, v]) => `- ${k} : ${v}`).join('\n')}`;
        }
      }
    } catch { /* ignore parse errors */ }
  }

  let personaContext = '';
  if (settings?.ai_persona) {
    try {
      const persona = typeof settings.ai_persona === 'string' ? JSON.parse(settings.ai_persona) : settings.ai_persona;
      personaContext = `\n\nPersona/positionnement configuré par l'utilisateur (à incarner) :\n${typeof persona === 'string' ? persona : JSON.stringify(persona)}`;
    } catch { /* malformed persona JSON — skip, not fatal */ }
  }

  let styleReferenceContext = '';
  if (settings?.ai_email_templates) {
    try {
      const templates = typeof settings.ai_email_templates === 'string' ? JSON.parse(settings.ai_email_templates) : settings.ai_email_templates;
      const sample = Array.isArray(templates) ? templates[0] : templates;
      if (sample) {
        styleReferenceContext = `\n\nStyle de référence de l'utilisateur (calibre le ton, ne PAS copier mot pour mot) :\n${typeof sample === 'string' ? sample : JSON.stringify(sample)}`;
      }
    } catch { /* malformed templates JSON — skip, not fatal */ }
  }

  const baseSystemPrompt = `Tu es un copilote de prospection pour ${fullName} de l'agence "${companyName}".
Ton but est de rédiger un message de prospection ultra-personnalisé, chaleureux et orienté relation d'affaires à long terme (pas une vente ponctuelle), court et percutant, en français.
Canal : ${channel}. Ton : ${aiTone}.
Retourne uniquement du JSON strict, sans markdown ni enrobage : { "subject": "...", "body": "..." }

RÈGLES ABSOLUES :
1. La PREMIÈRE phrase doit montrer que tu as réellement cherché / remarqué quelque chose de SPÉCIFIQUE sur ce business (utilise les données Google, la vibe de l'entreprise ou les notes terrain). PAS de "J'espère que vous allez bien". PAS de "En tant que leader". Parle comme un ami curieux qui a fait ses recherches.
2. Ligne 2-3 : valeur concrète et rapide que tu apportes (chiffre ou résultat).
3. Dernière ligne : appel à l'action simple (ex: "5 minutes cette semaine ?").
4. Sois concis : 3 paragraphes max pour email, 2 phrases pour DM.
5. Vouvoiement si email, tutoiement si DM Instagram/Facebook.
6. Le ton doit refléter une relation d'affaires à long terme, pas une vente ponctuelle — évoque une collaboration continue, pas juste "signer un contrat".${emailSignature ? `\n7. Signature exacte à utiliser :\n${emailSignature}` : ''}`;

  const systemPrompt = `${settings?.ai_system_prompt ? `${settings.ai_system_prompt}\n\n` : ''}${baseSystemPrompt}${personaContext}${styleReferenceContext}`;

  const userPrompt = `Prospect : ${lead.business_name}
Contact : ${lead.contact_name || 'le gérant/propriétaire'}
Email : ${lead.contact_email || 'non renseigné'}
Secteur : ${lead.niche || 'non précisé'}
Ville : ${lead.city || 'non précisée'}${decisionMakerLine}${vibeLine}${webContext}
${googleContext}${customContext}
${params.templateType ? `Type de relance : ${params.templateType}` : ''}
Notes terrain / observations :
${notesText || '(aucune note spécifique — utilise les données Google comme seul contexte personnel)'}

Instructions supplémentaires :
${params.instructions || 'Aucune'}

Réponds uniquement avec le JSON demandé.`;

  const aiSettings: AISettings = {
    ai_provider: settings?.ai_provider,
    ai_model: settings?.ai_model,
    openrouter_key: settings?.openrouter_key,
  };
  const resolvedWorkspaceId = workspaceId || lead.workspace_id;

  let raw: string;
  try {
    raw = await generateCompletion({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      settings: aiSettings,
      jsonMode: true,
      maxTokens: 1024,
      userId,
      workspaceId: resolvedWorkspaceId,
    });
  } catch (err) {
    console.warn('generateEmailDraftForLead: primary provider failed, retrying with Anthropic:', (err as Error).message);
    raw = await generateCompletion({
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      settings: { ai_provider: 'anthropic', ai_model: 'claude-haiku-4-5-20251001' },
      jsonMode: true,
      maxTokens: 1024,
      userId,
      workspaceId: resolvedWorkspaceId,
    });
  }

  let parsed: { subject?: string; body?: string };
  try { parsed = JSON.parse(raw); } catch { parsed = { subject: `Prospection — ${lead.business_name}`, body: raw }; }

  return {
    subject: parsed.subject || `Prospection — ${lead.business_name}`,
    content: parsed.body || raw,
    tone: aiTone,
  };
}
