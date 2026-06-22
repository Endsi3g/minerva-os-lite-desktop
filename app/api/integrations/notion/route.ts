import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

    const { action, token, databaseId } = await req.json();

    if (action === 'test') {
      if (!token?.startsWith('secret_') && !token?.startsWith('ntn_')) {
        return NextResponse.json({ error: 'Token Notion invalide (doit commencer par secret_ ou ntn_).' }, { status: 400 });
      }
      const res = await fetch('https://api.notion.com/v1/users/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Notion-Version': '2022-06-28',
        },
      });
      if (!res.ok) return NextResponse.json({ error: 'Token Notion rejeté par l\'API.' }, { status: 400 });
      const userData = await res.json();
      return NextResponse.json({ success: true, name: userData.name });
    }

    if (action === 'save') {
      await supabase.from('settings')
        .update({
          notion_token: token?.trim() || null,
          notion_database_id: databaseId?.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 });
  } catch (err) {
    console.error('[integrations/notion]', err);
    return NextResponse.json({ error: 'Erreur serveur.' }, { status: 500 });
  }
}
