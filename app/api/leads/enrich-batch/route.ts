import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
      .select('auto_email_on_enrichment, auto_email_template_id, auto_email_delay_hours, daily_email_limit')
      .eq('user_id', user.id)
      .maybeSingle();

    let enriched = 0;
    let failed = 0;
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
      body:
        failed > 0
          ? `${failed} échec(s). ${settings?.auto_email_on_enrichment ? 'Emails de prospection envoyés.' : ''}`
          : settings?.auto_email_on_enrichment
            ? 'Emails de prospection envoyés automatiquement.'
            : 'Toutes les données ont été mises à jour.',
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
