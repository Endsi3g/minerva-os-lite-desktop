import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { activateAutopilot, suspendProgram, resumeProgram } from '@/lib/autopilot-controller';

// Transitions manuelles du contrôleur Autopilot (voir lib/autopilot-controller.ts).
// RLS sur `campaigns`/`program_actions_log` borne déjà l'accès au workspace de
// l'utilisateur — pas de vérification d'appartenance supplémentaire ici.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { action, reason } = await req.json().catch(() => ({}));

  if (action === 'activate') {
    await activateAutopilot(supabase, id);
  } else if (action === 'resume') {
    await resumeProgram(supabase, id);
  } else if (action === 'suspend') {
    await suspendProgram(supabase, id, reason?.trim() || 'Suspendu manuellement.', { incident: false });
  } else {
    return NextResponse.json({ error: "action doit être 'activate', 'suspend' ou 'resume'" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
