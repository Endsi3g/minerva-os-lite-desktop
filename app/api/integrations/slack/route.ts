import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, webhookUrl } = await req.json();

    if (action === 'test') {
      if (!webhookUrl?.startsWith('https://hooks.slack.com/')) {
        return NextResponse.json({ error: 'URL de webhook Slack invalide.' }, { status: 400 });
      }
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: '✅ *Minerva OS* — Test de connexion réussi ! Vos notifications CRM apparaîtront ici.',
        }),
      });
      if (!res.ok) return NextResponse.json({ error: 'Slack a rejeté le webhook.' }, { status: 400 });
      return NextResponse.json({ success: true });
    }

    if (action === 'save') {
      await supabase.from('settings')
        .update({ slack_webhook_url: webhookUrl?.trim() || null, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
  } catch (err) {
    console.error('[integrations/slack]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
