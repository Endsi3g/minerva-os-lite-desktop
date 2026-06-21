// Google People API — bidirectional contacts sync

import { createClient } from '@/lib/supabase/server';

const PEOPLE_API_BASE = 'https://people.googleapis.com/v1';

export interface GoogleContact {
  resourceName: string;
  displayName?: string;
  givenName?: string;
  familyName?: string;
  names?: Array<{ displayName?: string; givenName?: string; familyName?: string }>;
  emailAddresses?: Array<{ value: string; type?: string }>;
  phoneNumbers?: Array<{ value: string; type?: string }>;
  organizations?: Array<{ name?: string; title?: string }>;
  addresses?: Array<{ formattedValue?: string }>;
  biographies?: Array<{ value: string }>;
}

export interface MinervaContact {
  resourceName: string;
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  address?: string;
  notes?: string;
}

async function getAccessToken(supabase: any, userId: string): Promise<string | null> {
  const { data: account } = await supabase
    .from('google_accounts')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (!account) return null;

  const expiresAt = new Date(account.token_expires_at).getTime();
  if (Date.now() < expiresAt - 60000) return account.access_token;

  // Refresh
  try {
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: account.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const tokens = await r.json();
    if (!tokens.access_token) return null;
    await supabase.from('google_accounts').update({
      access_token: tokens.access_token,
      token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
    }).eq('user_id', userId);
    return tokens.access_token;
  } catch {
    return null;
  }
}

export async function listContacts(
  supabase: any,
  userId: string,
  pageSize = 100,
): Promise<MinervaContact[]> {
  const token = await getAccessToken(supabase, userId);
  if (!token) return [];

  const params = new URLSearchParams({
    personFields: 'names,emailAddresses,phoneNumbers,organizations,addresses,biographies',
    pageSize: String(pageSize),
    sortOrder: 'LAST_MODIFIED_DESCENDING',
  });

  const res = await fetch(`${PEOPLE_API_BASE}/people/me/connections?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return [];

  const data = await res.json();
  const connections: GoogleContact[] = data.connections ?? [];

  return connections
    .map((c): MinervaContact | null => {
      const email = c.emailAddresses?.[0]?.value;
      if (!email) return null;
      const name = c.names?.[0];
      const fullName = name?.displayName ?? [name?.givenName, name?.familyName].filter(Boolean).join(' ') ?? email;
      return {
        resourceName: c.resourceName,
        fullName,
        email,
        phone: c.phoneNumbers?.[0]?.value,
        company: c.organizations?.[0]?.name,
        title: c.organizations?.[0]?.title,
        address: c.addresses?.[0]?.formattedValue,
        notes: c.biographies?.[0]?.value,
      };
    })
    .filter(Boolean) as MinervaContact[];
}

export async function createContact(
  supabase: any,
  userId: string,
  contact: Omit<MinervaContact, 'resourceName'>,
): Promise<GoogleContact | null> {
  const token = await getAccessToken(supabase, userId);
  if (!token) return null;

  const body: Record<string, unknown> = {
    names: [{ givenName: contact.fullName.split(' ')[0], familyName: contact.fullName.split(' ').slice(1).join(' ') }],
    emailAddresses: [{ value: contact.email, type: 'work' }],
    ...(contact.phone ? { phoneNumbers: [{ value: contact.phone, type: 'work' }] } : {}),
    ...(contact.company ? { organizations: [{ name: contact.company, title: contact.title }] } : {}),
    ...(contact.address ? { addresses: [{ formattedValue: contact.address }] } : {}),
    ...(contact.notes ? { biographies: [{ value: contact.notes }] } : {}),
  };

  const res = await fetch(`${PEOPLE_API_BASE}/people:createContact`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return res.ok ? res.json() : null;
}

export async function importContactsAsLeads(
  supabase: any,
  userId: string,
  workspaceId: string,
): Promise<{ imported: number; skipped: number }> {
  const contacts = await listContacts(supabase, userId);
  if (!contacts.length) return { imported: 0, skipped: 0 };

  let imported = 0;
  let skipped = 0;

  for (const c of contacts) {
    // Check if a lead with this email already exists
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('contact_email', c.email)
      .maybeSingle();

    if (existing) { skipped++; continue; }

    await supabase.from('leads').insert({
      workspace_id: workspaceId,
      business_name: c.company || c.fullName,
      contact_email: c.email,
      phone: c.phone,
      address: c.address,
      niche: c.title,
      ai_notes: c.notes,
      status: 'New',
      temperature: 'Cold',
      source: 'google_contacts',
      google_contact_resource: c.resourceName,
    });
    imported++;
  }

  return { imported, skipped };
}
