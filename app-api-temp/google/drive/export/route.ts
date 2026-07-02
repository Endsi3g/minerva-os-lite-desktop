import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken } from '@/lib/google/google-auth-service';
import { exportToGoogleDocs } from '@/lib/google/google-drive-service';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await getFreshAccessToken(supabase, user.id);
    const body = await req.json();
    const { name, htmlContent, parentFolderId, leadId } = body;

    if (!name || !htmlContent) {
      return NextResponse.json(
        { error: 'Missing parameters: name and htmlContent are required' },
        { status: 400 }
      );
    }

    const file = await exportToGoogleDocs(token, name, htmlContent, parentFolderId);

    // Save to drive_files table if leadId or context is provided
    const { data: workspaces } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1);
    const workspaceId = workspaces?.[0]?.id || null;

    await supabase
      .from('drive_files')
      .insert({
        id: file.id,
        user_id: user.id,
        workspace_id: workspaceId,
        lead_id: leadId || null,
        name: file.name,
        mime_type: file.mimeType,
        web_view_link: file.webViewLink || null
      });

    return NextResponse.json(file);
  } catch (err: any) {
    console.error('[google/drive/export]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
