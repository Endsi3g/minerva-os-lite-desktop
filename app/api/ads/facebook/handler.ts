import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const FB_APP_ID = process.env.FACEBOOK_APP_ID || '';
const FB_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');
  const workspaceId = searchParams.get('workspaceId');

  if (action === 'auth_url') {
    if (!FB_APP_ID || !FB_APP_SECRET) {
      return NextResponse.json({ error: 'not_configured' }, { status: 501 });
    }
    const redirectUri = `${APP_URL}/api/ads/facebook/callback`;
    const scope = 'leads_retrieval,pages_read_engagement,pages_manage_ads,pages_show_list';
    const state = Buffer.from(JSON.stringify({ workspaceId, userId: user.id })).toString('base64');
    const url = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&response_type=code`;
    return NextResponse.json({ url });
  }

  if (action === 'config_status') {
    return NextResponse.json({ configured: !!(FB_APP_ID && FB_APP_SECRET) });
  }

  if (action === 'pages' && workspaceId) {
    const { data: tokenRow } = await supabase
      .from('fb_connections')
      .select('access_token, pages')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!tokenRow?.access_token) return NextResponse.json({ pages: [], connected: false });

    try {
      const res = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${tokenRow.access_token}`);
      const data = await res.json();
      const pages = (data.data || []).map((p: { id: string; name: string; access_token: string }) => ({
        id: p.id,
        name: p.name,
        accessToken: p.access_token,
      }));
      return NextResponse.json({ pages, connected: true });
    } catch {
      return NextResponse.json({ pages: [], connected: false });
    }
  }

  if (action === 'forms' && workspaceId) {
    const pageId = searchParams.get('pageId');
    const { data: tokenRow } = await supabase
      .from('fb_connections')
      .select('access_token')
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (!tokenRow?.access_token || !pageId) return NextResponse.json({ forms: [] });

    try {
      const pageRes = await fetch(`https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token&access_token=${tokenRow.access_token}`);
      const pageData = await pageRes.json();
      const page = pageData.data?.find((p: { id: string; access_token: string }) => p.id === pageId);
      if (!page) return NextResponse.json({ forms: [] });

      const formsRes = await fetch(`https://graph.facebook.com/v18.0/${pageId}/leadgen_forms?fields=id,name,status,leads_count&access_token=${page.access_token}`);
      const formsData = await formsRes.json();
      return NextResponse.json({ forms: formsData.data || [] });
    } catch {
      return NextResponse.json({ forms: [] });
    }
  }

  if (action === 'status' && workspaceId) {
    const { data } = await supabase
      .from('fb_connections')
      .select('id, page_id, page_name, form_id, form_name, status, leads_count, connected_at')
      .eq('workspace_id', workspaceId)
      .order('connected_at', { ascending: false });
    return NextResponse.json({ connections: data || [] });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { action, workspaceId } = body;

  if (action === 'disconnect' && workspaceId) {
    await supabase.from('fb_connections').delete().eq('workspace_id', workspaceId);
    return NextResponse.json({ ok: true });
  }

  if (action === 'connect_form' && workspaceId) {
    const { pageId, pageName, formId, formName, pageAccessToken } = body;

    // Subscribe to webhooks for this form
    try {
      await fetch(`https://graph.facebook.com/v18.0/${pageId}/subscribed_apps?subscribed_fields=leadgen&access_token=${pageAccessToken}`, {
        method: 'POST',
      });
    } catch { /* webhook subscription — best effort */ }

    const { error } = await supabase.from('fb_connections').upsert({
      workspace_id: workspaceId,
      page_id: pageId,
      page_name: pageName,
      form_id: formId,
      form_name: formName,
      page_access_token: pageAccessToken,
      status: 'active',
      leads_count: 0,
      connected_at: new Date().toISOString(),
    }, { onConflict: 'workspace_id,page_id,form_id' });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}

// Suppress unused warning
void FB_APP_SECRET;
