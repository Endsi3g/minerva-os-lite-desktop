import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify user is authenticated in Minerva OS Reach
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    
    if (!clientId || clientId.includes('placeholder')) {
      // Fallback/test help message if env variables aren't set yet
      return NextResponse.json({ 
        error: "Google OAuth non configuré. Veuillez renseigner GOOGLE_CLIENT_ID dans vos variables d'environnement (.env.local)." 
      }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const redirectParam = searchParams.get('redirect') || '/settings';
    
    const state = `${user.id}:${redirectParam}`;

    const redirectUri = `${new URL(req.url).origin}/api/auth/google/callback`;
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/drive.file'
    ].join(' ');

    const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&access_type=offline` +
      `&prompt=consent` +
      `&state=${encodeURIComponent(state)}`;

    return NextResponse.redirect(oauthUrl);
  } catch (err) {
    console.error("Error starting Google OAuth:", err);
    return NextResponse.json({ error: 'Erreur lors de la redirection' }, { status: 500 });
  }
}
