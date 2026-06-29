// POST — Sauvegarde le résultat du flow d'onboarding IA
// Body: { systemPrompt, persona, emailTemplates, objectionResponses, terrainScript }
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { systemPrompt, persona, emailTemplates, objectionResponses, terrainScript } = await req.json();

  const { error } = await supabase
    .from('settings')
    .upsert({
      user_id: user.id,
      ai_system_prompt: systemPrompt,
      ai_setup_complete: true,
      ai_persona: persona || {},
      ai_email_templates: emailTemplates || [],
      ai_objection_responses: objectionResponses || [],
      ai_terrain_script: terrainScript || '',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { data } = await supabase
    .from('settings')
    .select('ai_system_prompt, ai_setup_complete, ai_persona, ai_email_templates, ai_objection_responses, ai_terrain_script')
    .eq('user_id', user.id)
    .maybeSingle();

  return NextResponse.json(data || {});
}
