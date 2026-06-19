import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const {
      route_plan_id,
      lead_id,
      workspace_id,
      outcome,
      notes,
      visited_at,
      meeting_datetime,
    } = body;

    if (!route_plan_id || !lead_id || !outcome) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Insert the field visit
    const { data: visit, error: visitErr } = await supabase
      .from('field_visits')
      .insert({
        route_plan_id,
        lead_id,
        workspace_id: workspace_id || null,
        outcome,
        notes: notes || null,
        visited_at: visited_at || new Date().toISOString(),
        meeting_datetime: meeting_datetime || null,
        deal_created: false,
        follow_up_added: false,
      })
      .select()
      .single();

    if (visitErr) {
      return NextResponse.json({ error: visitErr.message }, { status: 500 });
    }

    // 2. Fetch the lead info for details
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single();

    if (lead) {
      // Outcome: meeting_booked -> Auto deal conversion
      if (outcome === 'meeting_booked') {
        // A. Update status to 'Won'
        await supabase
          .from('leads')
          .update({ status: 'Won', updated_at: new Date().toISOString() })
          .eq('id', lead_id);

        // B. Create a task for closing
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await supabase.from('tasks').insert({
          user_id: user.id,
          title: `Appel de closing — ${lead.business_name}`,
          completed: false,
          category: 'Meeting',
          due_date: tomorrow.toISOString().split('T')[0],
          workspace_id: workspace_id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // C. Update deal_created = true
        await supabase
          .from('field_visits')
          .update({ deal_created: true })
          .eq('id', visit.id);
      }

      // Outcome: absent -> Auto relance sequence + task
      if (outcome === 'absent') {
        // A. Fetch full_name from settings
        const { data: settings } = await supabase
          .from('settings')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();
        const userName = settings?.full_name || 'L\'équipe';

        // B. If lead has contact email, create sequence and steps
        if (lead.contact_email) {
          const { data: seq } = await supabase
            .from('email_sequences')
            .insert({
              user_id: user.id,
              workspace_id: workspace_id || null,
              lead_id: lead.id,
              lead_name: lead.business_name,
              lead_email: lead.contact_email,
              name: `Séquence — Passé vous voir — ${lead.business_name}`,
              status: 'active',
            })
            .select()
            .single();

          if (seq) {
            const now = new Date();
            const step1Scheduled = now.toISOString();
            const step2Scheduled = new Date(now);
            step2Scheduled.setDate(step2Scheduled.getDate() + 3);

            await supabase.from('email_sequence_steps').insert([
              {
                sequence_id: seq.id,
                step_number: 1,
                delay_days: 0,
                subject: `Suite à mon passage chez ${lead.business_name}`,
                body: `Bonjour,\n\nJe suis passé dans vos locaux aujourd'hui pour vous rencontrer, mais vous n'étiez pas disponible.\n\nJe souhaitais échanger brièvement avec vous sur l'optimisation de votre visibilité locale et la génération de leads.\n\nQuand seriez-vous disponible pour un court appel de 5 minutes cette semaine ?\n\nBien cordialement,\n${userName}`,
                status: 'pending',
                scheduled_at: step1Scheduled,
                channel: 'Email',
              },
              {
                sequence_id: seq.id,
                step_number: 2,
                delay_days: 3,
                subject: 'Relance appel',
                body: 'Appeler le prospect pour faire suite à l\'email envoyé J+0 suite au passage physique.',
                status: 'pending',
                scheduled_at: step2Scheduled.toISOString(),
                channel: 'Call',
              },
            ]);
          }
        }

        // C. Create reminder task in 2 days
        const in2Days = new Date();
        in2Days.setDate(in2Days.getDate() + 2);
        await supabase.from('tasks').insert({
          user_id: user.id,
          title: `Rappel dans 2 jours — ${lead.business_name}`,
          completed: false,
          category: 'Follow-up',
          due_date: in2Days.toISOString().split('T')[0],
          workspace_id: workspace_id || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // D. Update follow_up_added = true
        await supabase
          .from('field_visits')
          .update({ follow_up_added: true })
          .eq('id', visit.id);
      }
    }

    return NextResponse.json({ ok: true, visitId: visit.id });
  } catch (err) {
    console.error('[route-plans visits POST]', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
