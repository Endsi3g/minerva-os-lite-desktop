import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken } from '@/lib/google/google-auth-service';
import { listDriveFiles } from '@/lib/google/google-drive-service';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const parentFolderId = searchParams.get('parentFolderId') || undefined;

    const token = await getFreshAccessToken(supabase, user.id);
    const files = await listDriveFiles(token, parentFolderId);

    return NextResponse.json(files);
  } catch (err: any) {
    console.error('[google/drive/files]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
