import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { timingSafeEqual } from 'crypto';

function verifyServiceToken(req: NextRequest): boolean {
  const expectedToken = process.env.HERMES_SERVICE_TOKEN;
  if (!expectedToken) return false;
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const provided = authHeader.substring(7);
  const a = Buffer.from(provided);
  const b = Buffer.from(expectedToken);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyServiceToken(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { workspaceId, userId, leadId, title, dueDate, category } = await req.json();
    if (!workspaceId || !userId || !title) {
      return NextResponse.json({ error: 'workspaceId, userId and title are required' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const now = new Date().toISOString();
    const taskId = crypto.randomUUID();

    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        id: taskId,
        user_id: userId,
        workspace_id: workspaceId,
        title,
        category: category || 'Suivi',
        due_date: dueDate || now.split('T')[0],
        completed: false,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (error) throw error;

    // Optional: Log an activity note to the lead if leadId is provided
    if (leadId) {
      await supabase.from('notes').insert({
        id: crypto.randomUUID(),
        lead_id: leadId,
        user_id: userId,
        content: `Tâche autonome créée par Hermes Agent : "${title}" (Échéance : ${dueDate || 'aujourd\'hui'})`,
        type: 'call', // custom task activity type
        created_at: now,
        updated_at: now,
      });
    }

    return NextResponse.json({ success: true, taskId, task });
  } catch (err: any) {
    console.error('[agent-tasks-create]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
