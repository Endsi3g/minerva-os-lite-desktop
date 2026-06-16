import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const KEY_FIELDS = ['openrouter_key', 'groq_api_key', 'together_api_key'] as const;
type KeyField = (typeof KEY_FIELDS)[number];

async function getAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );
}

function maskKey(value: string | null): string | null {
  if (!value) return null;
  const last4 = value.slice(-4);
  return `••••${last4}`;
}

// GET /api/settings/ai-keys — returns masked status only, never the raw key value
export async function GET() {
  const supabase = await getAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: settings } = await supabase
    .from('settings')
    .select('openrouter_key, groq_api_key, together_api_key')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json({
    openrouterKeySet: !!settings?.openrouter_key,
    openrouterKeyMasked: maskKey(settings?.openrouter_key ?? null),
    groqKeySet: !!settings?.groq_api_key,
    groqKeyMasked: maskKey(settings?.groq_api_key ?? null),
    togetherKeySet: !!settings?.together_api_key,
    togetherKeyMasked: maskKey(settings?.together_api_key ?? null),
  });
}

// POST /api/settings/ai-keys { field, value } — stores a new key, returns only the masked value
export async function POST(request: NextRequest) {
  const supabase = await getAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { field, value } = await request.json();

  if (!KEY_FIELDS.includes(field)) {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
  }
  if (typeof value !== 'string' || !value.trim()) {
    return NextResponse.json({ error: 'Value required' }, { status: 400 });
  }

  const { error: upsertError } = await supabase
    .from('settings')
    .upsert({ user_id: user.id, [field as KeyField]: value.trim() }, { onConflict: 'user_id' });

  if (upsertError) {
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, masked: maskKey(value.trim()) });
}

// DELETE /api/settings/ai-keys?field=openrouter_key — clears a key
export async function DELETE(request: NextRequest) {
  const supabase = await getAuthClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const field = request.nextUrl.searchParams.get('field');
  if (!KEY_FIELDS.includes(field as KeyField)) {
    return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from('settings')
    .update({ [field as KeyField]: null })
    .eq('user_id', user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
