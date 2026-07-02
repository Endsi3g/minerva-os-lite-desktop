import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const supabase = await createClient();

  const { data: webhook } = await supabase
    .from('inbound_webhooks')
    .select('*')
    .eq('token', token)
    .eq('active', true)
    .single();

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook non trouvé ou inactif' }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  const extractName = (): string => {
    if (body.form_response?.definition?.title) return body.form_response.definition.title;
    if (body.data?.respondentId) return 'Formulaire ' + body.data?.respondentId;
    return body.company_name ?? body.name ?? body.business_name ?? body.nom_entreprise ?? 'Inbound Lead';
  };

  const extractEmail = (): string =>
    body.email ?? body.contact_email ?? body.form_response?.hidden?.email ?? '';

  const extractPhone = (): string =>
    body.phone ?? body.tel ?? body.telephone ?? '';

  const extractCity = (): string =>
    body.city ?? body.ville ?? '';

  const extractNiche = (): string =>
    body.niche ?? body.sector ?? body.industry ?? '';

  const { data: lead } = await supabase
    .from('leads')
    .insert({
      user_id: webhook.user_id,
      workspace_id: webhook.workspace_id,
      business_name: extractName(),
      contact_email: extractEmail(),
      phone: extractPhone(),
      city: extractCity(),
      niche: extractNiche(),
      source: `inbound_form:${webhook.platform}`,
      status: 'New',
      temperature: 'Hot',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  await supabase
    .from('inbound_webhooks')
    .update({
      last_event_at: new Date().toISOString(),
      last_event_data: body,
      leads_created: (webhook.leads_created ?? 0) + 1,
    })
    .eq('id', webhook.id);

  return NextResponse.json({ success: true, lead_id: lead?.id });
}
