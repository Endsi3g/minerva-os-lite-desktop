import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface DedupGroup {
  leads: Array<{
    id: string;
    businessName: string;
    contactEmail?: string;
    phone?: string;
    website?: string;
    city?: string;
    niche?: string;
    status: string;
    score?: number;
    createdAt: string;
    fieldCount: number;
    leadSourceType?: string;
  }>;
  matchReasons: Array<'domain' | 'phone' | 'name'>;
  similarity: number;
}

function extractDomain(value?: string): string {
  if (!value) return '';
  try {
    const url = value.startsWith('http') ? value : `https://${value}`;
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return value.toLowerCase().replace(/^www\./, '');
  }
}

function normalizePhone(phone?: string): string {
  if (!phone) return '';
  return phone.replace(/[\s\-().+]/g, '').slice(-9);
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20);
}

function stringSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  const editDistance = levenshtein(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function countFields(row: Record<string, unknown>): number {
  const fields = ['contact_email', 'phone', 'website', 'contact_name', 'niche', 'city', 'rating', 'reviews_count', 'maps_url', 'score'];
  return fields.filter(f => row[f] !== null && row[f] !== undefined && row[f] !== '').length;
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const workspaceId = searchParams.get('workspaceId');
  if (!workspaceId) return NextResponse.json({ error: 'workspaceId required' }, { status: 400 });

  const { data: rows, error } = await supabase
    .from('leads')
    .select('id, business_name, contact_email, phone, website, city, niche, status, score, created_at, lead_source_type, contact_name, rating, reviews_count, maps_url')
    .eq('workspace_id', workspaceId)
    .neq('status', 'Lost')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows || rows.length === 0) return NextResponse.json({ groups: [] });

  const groups: DedupGroup[] = [];
  const processedIds = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const a = rows[i];
    if (processedIds.has(a.id)) continue;

    const domainA = extractDomain(a.website);
    const phoneA = normalizePhone(a.phone);
    const nameA = normalizeName(a.business_name || '');

    const group: DedupGroup = {
      leads: [],
      matchReasons: [],
      similarity: 0,
    };

    for (let j = i + 1; j < rows.length; j++) {
      const b = rows[j];
      if (processedIds.has(b.id)) continue;

      const reasons: Array<'domain' | 'phone' | 'name'> = [];
      let score = 0;

      const domainB = extractDomain(b.website);
      if (domainA && domainB && domainA === domainB) {
        reasons.push('domain');
        score += 50;
      }

      const phoneB = normalizePhone(b.phone);
      if (phoneA && phoneB && phoneA === phoneB) {
        reasons.push('phone');
        score += 40;
      }

      const nameB = normalizeName(b.business_name || '');
      const nameSim = stringSimilarity(nameA, nameB);
      if (nameSim >= 0.8) {
        reasons.push('name');
        score += Math.round(nameSim * 30);
      }

      if (reasons.length > 0 && score >= 40) {
        if (group.leads.length === 0) {
          group.leads.push({
            id: a.id,
            businessName: a.business_name || '',
            contactEmail: a.contact_email,
            phone: a.phone,
            website: a.website,
            city: a.city,
            niche: a.niche,
            status: a.status,
            score: a.score,
            createdAt: a.created_at,
            fieldCount: countFields(a),
            leadSourceType: a.lead_source_type,
          });
          processedIds.add(a.id);
        }
        group.leads.push({
          id: b.id,
          businessName: b.business_name || '',
          contactEmail: b.contact_email,
          phone: b.phone,
          website: b.website,
          city: b.city,
          niche: b.niche,
          status: b.status,
          score: b.score,
          createdAt: b.created_at,
          fieldCount: countFields(b),
          leadSourceType: b.lead_source_type,
        });
        processedIds.add(b.id);
        reasons.forEach(r => { if (!group.matchReasons.includes(r)) group.matchReasons.push(r); });
        group.similarity = Math.min(100, Math.max(group.similarity, score));
      }
    }

    if (group.leads.length >= 2) {
      groups.push(group);
    }
  }

  return NextResponse.json({ groups, total: groups.reduce((acc, g) => acc + g.leads.length, 0) });
}
