import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken } from '@/lib/google/google-auth-service';
import { getDriveFileDetails } from '@/lib/google/google-drive-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing file id' }, { status: 400 });
    }

    const token = await getFreshAccessToken(supabase, user.id);
    const fileDetails = await getDriveFileDetails(token, id);

    return NextResponse.json(fileDetails);
  } catch (err: any) {
    console.error(`[google/drive/files/${req.url}]`, err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
