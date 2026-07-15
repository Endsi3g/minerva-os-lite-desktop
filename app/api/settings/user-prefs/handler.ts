import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/settings/user-prefs
 * Returns user-specific preferences stored in Supabase settings table.
 * Replaces localStorage keys:
 *   - acquisition_budgets
 *   - acquisition_goals
 *   - ui_preferences (radius, density, gridOpacity)
 *   - active_ai_sessions  (workspaceId → sessionId map)
 *   - active_canvases     (workspaceId → canvasId map)
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const { data, error } = await supabase
      .from('settings')
      .select('acquisition_budgets, acquisition_goals, ui_preferences, active_ai_sessions, active_canvases')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({
      acquisition_budgets:  data?.acquisition_budgets  ?? {},
      acquisition_goals:    data?.acquisition_goals    ?? { leads: 100, clients: 10, revenue: 50000 },
      ui_preferences:       data?.ui_preferences       ?? { radius: '10px', density: 'default', gridOpacity: 100 },
      active_ai_sessions:   data?.active_ai_sessions   ?? {},
      active_canvases:      data?.active_canvases      ?? {},
    });
  } catch (err: any) {
    console.error('[user-prefs GET]', err);
    return NextResponse.json({ error: err?.message ?? 'Erreur interne' }, { status: 500 });
  }
}

/**
 * PATCH /api/settings/user-prefs
 * Partially updates user preferences. Only provided fields are updated.
 * Body: any subset of { acquisition_budgets, acquisition_goals, ui_preferences,
 *                       active_ai_sessions, active_canvases }
 */
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

    const body = await req.json();

    const allowed = ['acquisition_budgets', 'acquisition_goals', 'ui_preferences', 'active_ai_sessions', 'active_canvases'] as const;
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) patch[key] = body[key];
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'Aucun champ valide fourni' }, { status: 400 });
    }

    const { error } = await supabase
      .from('settings')
      .upsert({ user_id: user.id, ...patch }, { onConflict: 'user_id' });

    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[user-prefs PATCH]', err);
    return NextResponse.json({ error: err?.message ?? 'Erreur interne' }, { status: 500 });
  }
}
