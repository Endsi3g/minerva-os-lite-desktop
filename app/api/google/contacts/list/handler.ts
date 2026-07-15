import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFreshAccessToken } from '@/lib/google/google-auth-service';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let accessToken: string;
    try {
      accessToken = await getFreshAccessToken(supabase, user.id);
    } catch {
      return NextResponse.json({ connected: false, contacts: [] });
    }

    const url = new URL('https://people.googleapis.com/v1/people/me/connections');
    url.searchParams.set('personFields', 'names,emailAddresses,phoneNumbers,organizations');
    url.searchParams.set('pageSize', '100');
    url.searchParams.set('sortOrder', 'LAST_MODIFIED_DESCENDING');

    const resp = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!resp.ok) {
      const err = await resp.json();
      return NextResponse.json(
        { connected: true, contacts: [], error: err?.error?.message || 'People API error' },
        { status: 200 }
      );
    }

    const data = await resp.json();
    const connections: any[] = data.connections || [];

    const contacts = connections
      .map((person: any) => {
        const name =
          person.names?.[0]?.displayName ||
          [person.names?.[0]?.givenName, person.names?.[0]?.familyName]
            .filter(Boolean)
            .join(' ') ||
          '';
        const email = person.emailAddresses?.[0]?.value || '';
        const phone = person.phoneNumbers?.[0]?.value || '';
        const company = person.organizations?.[0]?.name || '';
        const resourceName: string = person.resourceName || '';
        const id = resourceName.replace('people/', '');

        return { id, name, email, phone, company };
      })
      .filter((c) => c.name || c.email); // must have at least a name or email

    return NextResponse.json({ connected: true, contacts });
  } catch (err: any) {
    console.error('[google/contacts/list]', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
