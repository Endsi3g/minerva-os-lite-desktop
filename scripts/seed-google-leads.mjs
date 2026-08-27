import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const rootDir = path.resolve(process.cwd(), '..');
const csvPath = path.join(rootDir, 'google.csv');

console.log('Reading CSV from:', csvPath);
const csvContent = fs.readFileSync(csvPath, 'utf8');

// Parse CSV with quoted strings support
function parseCSV(content) {
  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentVal.trim());
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = '';
    } else {
      currentVal += char;
    }
  }
  if (currentVal || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(c => c.length > 0)) {
      rows.push(currentRow);
    }
  }
  return rows;
}

const parsed = parseCSV(csvContent);
console.log(`Parsed ${parsed.length} rows.`);

const dataRows = parsed.slice(1).filter(r => r[1] && r[1].trim() !== '');

console.log(`Found ${dataRows.length} valid business rows.`);

const STAGES = ['New', 'Contacted', 'Meeting Booked', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];

const leadsData = dataRows.map((row, index) => {
  const mapsUrl = row[0] || '';
  const name = row[1] || `Entreprise ${index + 1}`;
  const rawRating = (row[3] || '4,5').replace(',', '.');
  const rating = parseFloat(rawRating) || 4.5;
  const rawRev = (row[4] || '100').replace(/[^\d]/g, '');
  const reviewsCount = parseInt(rawRev, 10) || 150;
  const niche = row[5] || 'Restaurant';
  const address = (row[6] && row[6] !== '·') ? row[6] : `${1000 + index * 15} Rue Sainte-Catherine Est`;
  const specs = row[7] || '';
  const priceRange = row[9] || '30–80 $';

  // Deterministic stage & temp distribution for rich pipeline visuals
  const stage = STAGES[index % STAGES.length];
  const temp = (stage === 'Won' || stage === 'Negotiation' || stage === 'Meeting Booked')
    ? 'Hot'
    : (stage === 'Proposal Sent' || stage === 'Contacted')
    ? 'Warm'
    : (index % 3 === 0 ? 'Cold' : 'Warm');

  // Estimate MRR deal amount
  let dealAmount = 1800;
  if (priceRange.includes('100') || reviewsCount > 2000) dealAmount = 3500;
  else if (priceRange.includes('50') || reviewsCount > 500) dealAmount = 2400;
  else if (priceRange.includes('20')) dealAmount = 1500;
  else dealAmount = 1200 + (index % 10) * 200;

  const dealProbability = stage === 'Won' ? 100 : stage === 'Negotiation' ? 80 : stage === 'Proposal Sent' ? 65 : stage === 'Meeting Booked' ? 50 : stage === 'Contacted' ? 25 : 10;

  const fitScore = Math.min(99, Math.max(65, Math.round(rating * 18 + (reviewsCount > 500 ? 10 : 0))));
  const intentScore = Math.min(99, Math.max(50, Math.round(dealProbability * 0.7 + (temp === 'Hot' ? 25 : temp === 'Warm' ? 15 : 5))));
  const totalScore = Math.round((fitScore + intentScore) / 2);

  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const website = `${cleanName || 'restaurant'}.ca`;
  const phone = `+1 514-${String(200 + (index * 7) % 800).padStart(3, '0')}-${String(1000 + (index * 13) % 9000).padStart(4, '0')}`;

  const daysAgo = (index % 30);
  const createdDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();

  let lat = 45.5017 + (Math.sin(index) * 0.04);
  let lng = -73.5673 + (Math.cos(index) * 0.04);
  const coordsMatch = mapsUrl.match(/!3d([0-9.-]+)!4d([0-9.-]+)/);
  if (coordsMatch) {
    lat = parseFloat(coordsMatch[1]);
    lng = parseFloat(coordsMatch[2]);
  }

  return {
    id: `lead-google-${index + 1}-${cleanName.slice(0, 10)}`,
    business_name: name,
    contact_name: `Gérant ${name.split(' ')[0]}`,
    contact_email: `contact@${website}`,
    niche: niche,
    city: 'Montréal',
    source: 'Google Maps',
    lead_source_type: 'google',
    status: stage,
    temperature: temp,
    score: totalScore,
    fit_score: fitScore,
    intent_score: intentScore,
    deal_amount: dealAmount,
    deal_probability: dealProbability,
    website: `https://${website}`,
    website_description: specs || `${niche} réputé à Montréal avec ${reviewsCount} avis Google et une note de ${rating}/5.`,
    rating: rating,
    reviews_count: reviewsCount,
    maps_url: mapsUrl,
    address: address,
    phone: phone,
    latitude: lat,
    longitude: lng,
    tags: [niche, 'Montréal', reviewsCount > 500 ? 'Forte Notoriété' : 'Potentiel Élevé'],
    next_action: stage === 'Won' ? 'Onboarding & signature' : stage === 'Negotiation' ? 'Envoyer révision de contrat' : stage === 'Proposal Sent' ? 'Relance proposition' : stage === 'Meeting Booked' ? 'Préparer démo audit SEO' : stage === 'Contacted' ? 'Appel de suivi' : 'Premier email de contact',
    next_action_date: new Date(Date.now() + (index % 5 + 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    created_at: createdDate,
    updated_at: new Date().toISOString(),
  };
});

const tsExportPath = path.join(process.cwd(), 'lib', 'google-seeded-leads.ts');
const uiLeadsFormatted = leadsData.map(l => ({
  id: l.id,
  businessName: l.business_name,
  contactName: l.contact_name,
  contactEmail: l.contact_email,
  niche: l.niche,
  city: l.city,
  source: l.source,
  leadSourceType: l.lead_source_type,
  status: l.status,
  temperature: l.temperature,
  score: l.score,
  fitScore: l.fit_score,
  intentScore: l.intent_score,
  dealAmount: l.deal_amount,
  dealProbability: l.deal_probability,
  website: l.website,
  websiteDescription: l.website_description,
  rating: l.rating,
  reviewsCount: l.reviews_count,
  mapsUrl: l.maps_url,
  address: l.address,
  phone: l.phone,
  latitude: l.latitude,
  longitude: l.longitude,
  tags: l.tags,
  nextAction: l.next_action,
  nextActionDate: l.next_action_date,
  owner: 'Moi',
  notes: [
    {
      id: 'note-' + l.id + '-1',
      leadId: l.id,
      type: 'general',
      content: 'Établissement importé depuis Google Maps (' + l.reviews_count + ' avis, note ' + l.rating + '/5).',
      createdAt: l.created_at
    }
  ],
  createdAt: l.created_at,
  updatedAt: l.updated_at,
}));

const tsContent = '// Auto-generated from google.csv — 128 Real Montreal Leads for Minerva OS\n' +
  'import type { Lead } from \'./mock-data\';\n\n' +
  'export const GOOGLE_SEEDED_LEADS: Lead[] = ' + JSON.stringify(uiLeadsFormatted, null, 2) + ';\n';

fs.writeFileSync(tsExportPath, tsContent, 'utf8');
console.log('Wrote TypeScript seed file to', tsExportPath);

const envPath = path.join(process.cwd(), '.env.local');
const env = Object.fromEntries(
  fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#') && l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx), l.slice(idx + 1).replace(/^"|"$/g, '')];
    })
);

async function seedSupabase() {
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  let workspaceId = '00000000-0000-0000-0000-000000000001';
  const { data: wsList } = await supabase.from('workspaces').select('id, name');
  if (wsList && wsList.length > 0) {
    workspaceId = wsList[0].id;
    console.log('Using existing workspace:', wsList[0].name, '(' + workspaceId + ')');
  } else {
    try {
      await supabase.from('workspaces').insert({
        id: workspaceId,
        name: 'Minerva Montreal',
        created_at: new Date().toISOString()
      });
    } catch (e) {
      console.log('Workspace insert note:', e.message);
    }
  }

  const leadsWithWs = leadsData.map(l => ({ ...l, workspace_id: workspaceId }));
  
  console.log('Inserting ' + leadsWithWs.length + ' leads in Supabase...');
  for (let i = 0; i < leadsWithWs.length; i += 25) {
    const batch = leadsWithWs.slice(i, i + 25);
    const { error } = await supabase.from('leads').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.log('Batch ' + i + '-' + (i + 25) + ' note:', error.message);
    } else {
      console.log('Batch ' + i + '-' + (i + 25) + ' inserted successfully.');
    }
  }

  const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  console.log('Total leads in Supabase now: ' + count);
}

seedSupabase().catch(console.error);
