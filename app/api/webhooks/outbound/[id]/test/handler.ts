import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { data: webhook } = await supabase
    .from('outbound_webhooks')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!webhook) {
    return NextResponse.json({ error: 'Webhook non trouvé' }, { status: 404 });
  }

  const testPayload = {
    event: 'test',
    timestamp: new Date().toISOString(),
    data: {
      lead: {
        id: 'test-123',
        business_name: 'Test Business',
        city: 'Montréal',
        status: 'New',
        source: 'test',
      },
    },
  };

  let httpStatus = 0;
  let success = false;
  let lastError: string | null = null;

  try {
    const res = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(webhook.secret ? { 'X-Webhook-Secret': webhook.secret } : {}),
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000),
    });
    httpStatus = res.status;
    success = res.ok;
  } catch (err: unknown) {
    lastError = err instanceof Error ? err.message : 'Erreur réseau';
  }

  await supabase
    .from('outbound_webhooks')
    .update({
      last_triggered_at: new Date().toISOString(),
      last_status: httpStatus,
      last_error: lastError,
    })
    .eq('id', webhook.id);

  return NextResponse.json({ success, status: httpStatus, error: lastError });
}
