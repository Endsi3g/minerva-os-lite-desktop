import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken } from '@/lib/google/google-auth-service';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await getFreshAccessToken(supabase, user.id);

    // Fetch primary calendar events from Google Calendar API
    const url = 'https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=15&orderBy=startTime&singleEvents=true';
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch events from Google Calendar: ${response.statusText}`);
    }

    const data = await response.json();
    const events = data.items || [];
    let syncedCount = 0;

    // Check each event, and if it's a Minerva meeting, upsert it as a CRM task
    for (const event of events) {
      if (!event.summary) continue;
      
      // Let's create a task for meetings
      const isMeeting = event.summary.toLowerCase().includes('minerva') || 
                        event.summary.toLowerCase().includes('démo') || 
                        event.summary.toLowerCase().includes('rdv') ||
                        event.attendees?.length > 0;
      
      if (isMeeting) {
        syncedCount++;
        const dateVal = event.start?.dateTime || event.start?.date || new Date().toISOString();
        const dueDate = dateVal.split('T')[0];

        // Insert into tasks table
        await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            title: `[RDV Google Calendar] ${event.summary}`,
            completed: false,
            category: 'Meeting',
            due_date: dueDate
          });
      }
    }

    return NextResponse.json({ success: true, syncedCount });
  } catch (err: any) {
    console.error('[google/calendar/sync]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
