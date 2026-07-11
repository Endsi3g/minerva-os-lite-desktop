import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { runAutopilotCycle } from '@/lib/autopilot-controller';

// Cycle quotidien du contrôleur Autopilot (état + garde-fou + journal) — la
// logique complète vit dans lib/autopilot-controller.ts (partagée avec la
// route de transition manuelle app/api/campaigns/[id]/autopilot). Ce cron
// n'est plus qu'un déclencheur planifié (vercel.json: "0 10 * * *").
export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    const authHeader = req.headers.get('authorization');
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const result = await runAutopilotCycle(supabase);
  return NextResponse.json({ ok: true, ...result });
}
