import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { listContacts, importContactsAsLeads, createContact } from '@/lib/google/google-contacts-service';

// GET /api/google/contacts — list contacts from Google People API
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pageSize = Number(request.nextUrl.searchParams.get('pageSize') ?? 100);

  const contacts = await listContacts(supabase, user.id, pageSize);
  return NextResponse.json({ contacts });
}

// POST /api/google/contacts
// Body: { action: 'import', workspaceId: string }  → import contacts as leads
// Body: { action: 'create', contact: {...} }         → create a new Google contact
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { action } = body;

  if (action === 'import') {
    const { workspaceId } = body;
    if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });
    const result = await importContactsAsLeads(supabase, user.id, workspaceId);
    return NextResponse.json(result);
  }

  if (action === 'create') {
    const { contact } = body;
    if (!contact?.email) return NextResponse.json({ error: 'contact.email required' }, { status: 400 });
    const created = await createContact(supabase, user.id, contact);
    if (!created) return NextResponse.json({ error: 'Failed to create contact in Google Contacts' }, { status: 500 });
    return NextResponse.json({ contact: created });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
