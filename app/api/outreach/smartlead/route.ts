import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leadId, campaignId: bodyCampaignId } = await req.json();
  if (!leadId) return NextResponse.json({ error: 'leadId requis' }, { status: 400 });

  const { data: settings } = await supabase
    .from('settings')
    .select('smartlead_api_key, smartlead_campaign_id')
    .eq('user_id', user.id)
    .maybeSingle();

  const apiKey = settings?.smartlead_api_key;
  const campaignId = bodyCampaignId || settings?.smartlead_campaign_id;

  if (!apiKey) return NextResponse.json({ error: 'Clé API Smartlead non configurée (Paramètres → Intégrations)' }, { status: 400 });
  if (!campaignId) return NextResponse.json({ error: 'Campaign ID Smartlead non configuré' }, { status: 400 });

  const { data: lead } = await supabase
    .from('leads')
    .select('id, business_name, contact_name, contact_email, phone, city, niche')
    .eq('id', leadId)
    .maybeSingle();

  if (!lead) return NextResponse.json({ error: 'Lead introuvable' }, { status: 404 });
  if (!lead.contact_email) return NextResponse.json({ error: 'Le lead n\'a pas d\'email de contact' }, { status: 400 });

  const nameParts = (lead.contact_name || lead.business_name || '').split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const smartleadRes = await fetch(
    `https://server.smartlead.ai/api/v1/campaigns/${campaignId}/leads?api_key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lead_list: [{
          first_name: firstName,
          last_name: lastName,
          email: lead.contact_email,
          phone_number: lead.phone || '',
          company_name: lead.business_name || '',
          location: lead.city || '',
          custom_fields: { niche: lead.niche || '', minerva_lead_id: lead.id },
        }],
      }),
    }
  );

  if (!smartleadRes.ok) {
    const err = await smartleadRes.text();
    return NextResponse.json({ error: `Smartlead API error: ${err}` }, { status: 500 });
  }

  const result = await smartleadRes.json();
  return NextResponse.json({ ok: true, smartlead: result });
}
