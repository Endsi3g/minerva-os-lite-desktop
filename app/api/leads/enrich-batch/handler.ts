import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deepSearchBusiness } from '@/lib/enrichment-deep-search';

// Confiance de correspondance entreprise ↔ résultat web (0-100). Au-dessus,
// on applique les données directement au lead ; en dessous mais au-dessus de
// 0, on stocke une suggestion à valider manuellement (leads.enrichment_review)
// plutôt que de risquer d'écraser le lead avec les infos d'une entreprise
// homonyme dans une autre ville.
const DEEP_SEARCH_AUTO_APPLY_THRESHOLD = 70;

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { leadIds, workspaceId, mode = 'full' } = await req.json();
    if (!leadIds?.length) return NextResponse.json({ error: 'leadIds required' }, { status: 400 });

    // Load settings
    const { data: settings } = await supabase
      .from('settings')
      .select('auto_email_on_enrichment, auto_email_template_id, auto_email_delay_hours, daily_email_limit, ai_provider, ai_model, openrouter_key')
      .eq('user_id', user.id)
      .maybeSingle();

    let enriched = 0;
    let failed = 0;
    let pendingReviews = 0;
    const errors: string[] = [];
    const origin = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    for (const leadId of leadIds) {
      try {
        // Fetch lead data
        const { data: lead } = await supabase
          .from('leads')
          .select('*')
          .eq('id', leadId)
          .maybeSingle();
        if (!lead) { failed++; continue; }

        // Enrich contact
        if (mode === 'full' || mode === 'contact') {
          const enrichRes = await fetch(`${origin}/api/enrich-contact`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': req.headers.get('cookie') || '',
            },
            body: JSON.stringify({
              leadId,
              website: lead.website,
              businessName: lead.business_name,
              contactName: lead.contact_name,
              city: lead.city,
              niche: lead.niche,
              rating: lead.rating,
              reviewsCount: lead.reviews_count,
            }),
          });
          if (!enrichRes.ok) {
            const errText = await enrichRes.text().catch(() => enrichRes.statusText);
            throw new Error(`enrich-contact failed: ${enrichRes.status} — ${errText}`);
          }
        }

        // Enrich advanced
        if (mode === 'full' || mode === 'advanced') {
          await fetch(`${origin}/api/leads/enrich-advanced`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cookie': req.headers.get('cookie') || '',
            },
            body: JSON.stringify({ leadId }),
          });
        }

        // Recherche web approfondie (auto) — si l'enrichissement standard n'a
        // trouvé ni site ni téléphone, on tente de retrouver l'entreprise sur
        // le web. Haute confiance → appliqué directement ; confiance moyenne
        // → stocké comme suggestion à valider (leads.enrichment_review) ;
        // confiance trop basse → ignoré silencieusement.
        if (mode === 'full') {
          const { data: afterStandard } = await supabase
            .from('leads')
            .select('website, phone')
            .eq('id', leadId)
            .maybeSingle();

          if (afterStandard && !afterStandard.website && !afterStandard.phone) {
            try {
              const deepResult = await deepSearchBusiness({
                businessName: lead.business_name,
                city: lead.city,
                niche: lead.niche,
                settings: settings || undefined,
                userId: user.id,
              });

              if (deepResult && deepResult.confidence > 0) {
                if (deepResult.confidence >= DEEP_SEARCH_AUTO_APPLY_THRESHOLD) {
                  const updateFields: Record<string, unknown> = { updated_at: new Date().toISOString() };
                  if (deepResult.candidate.website) updateFields.website = deepResult.candidate.website;
                  if (deepResult.candidate.phone) updateFields.phone = deepResult.candidate.phone;
                  if (deepResult.candidate.address) updateFields.address = deepResult.candidate.address;
                  if (deepResult.candidate.socialLinks) updateFields.social_links = deepResult.candidate.socialLinks;
                  await supabase.from('leads').update(updateFields).eq('id', leadId);
                } else {
                  await supabase.from('leads').update({
                    enrichment_review: {
                      confidence: deepResult.confidence,
                      reasoning: deepResult.reasoning,
                      sourceUrl: deepResult.sourceUrl,
                      candidate: deepResult.candidate,
                      foundAt: new Date().toISOString(),
                    },
                    updated_at: new Date().toISOString(),
                  }).eq('id', leadId);
                  pendingReviews++;
                }
              }
            } catch (err) {
              console.warn(`[enrich-batch] deep search failed for ${leadId}:`, err);
            }
          }
        }

        // Update enriched_at
        await supabase
          .from('leads')
          .update({ enriched_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq('id', leadId);

        // Auto-email after enrichment
        if (settings?.auto_email_on_enrichment) {
          const { data: refreshedLead } = await supabase
            .from('leads')
            .select('contact_email, business_name, website_description')
            .eq('id', leadId)
            .maybeSingle();

          if (refreshedLead?.contact_email) {
            // Check daily cap
            const today = new Date().toISOString().slice(0, 10);
            const { count: sentToday } = await supabase
              .from('lead_events')
              .select('id', { count: 'exact', head: true })
              .eq('workspace_id', workspaceId)
              .eq('event_type', 'email_sent')
              .gte('created_at', `${today}T00:00:00`);

            const cap = (settings as any).daily_email_limit || 50;
            if ((sentToday || 0) < cap) {
              // Generate draft
              const draftRes = await fetch(`${origin}/api/generate-draft`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Cookie': req.headers.get('cookie') || '',
                },
                body: JSON.stringify({
                  leadId,
                  channel: 'Email',
                  instructions: `Génère un email de prospection personnalisé pour ${refreshedLead.business_name}. Utilise la description: ${refreshedLead.website_description || 'Pas de description disponible'}.`,
                }),
              });

              if (draftRes.ok) {
                const { content, subject } = await draftRes.json();
                if (content) {
                  await fetch(`${origin}/api/send-email`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Cookie': req.headers.get('cookie') || '',
                    },
                    body: JSON.stringify({
                      leadId,
                      subject: subject || `Opportunité — ${refreshedLead.business_name}`,
                      body: content,
                    }),
                  });
                }
              }
            }
          }
        }

        enriched++;
        // Throttle: 500ms between leads
        await new Promise(r => setTimeout(r, 500));
      } catch (err: unknown) {
        failed++;
        errors.push(`${leadId}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Notification
    await supabase.from('notifications').insert({
      id: crypto.randomUUID(),
      user_id: user.id,
      workspace_id: workspaceId,
      type: 'scraping_done',
      title: `Enrichissement terminé : ${enriched} lead${enriched > 1 ? 's' : ''} enrichi${enriched > 1 ? 's' : ''}`,
      body: [
        failed > 0 ? `${failed} échec(s).` : null,
        pendingReviews > 0 ? `${pendingReviews} suggestion${pendingReviews > 1 ? 's' : ''} trouvée${pendingReviews > 1 ? 's' : ''} en ligne à valider sur la fiche du lead.` : null,
        settings?.auto_email_on_enrichment ? 'Emails de prospection envoyés automatiquement.' : null,
      ].filter(Boolean).join(' ') || 'Toutes les données ont été mises à jour.',
      link: '/leads',
      is_read: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({ enriched, failed, errors });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
