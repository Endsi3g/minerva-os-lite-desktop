import assert from 'node:assert/strict';
import { substituteVariables, detectTokens, analyzeDeliverability } from '../app/(app)/composer/_components/composer-utils.ts';
import { DYNAMIC_VARIABLES, CURATED_TEMPLATES } from '../app/(app)/composer/_components/composer-types.ts';

console.log('--- Testing Composer Studio Utilities & Genuine Logic ---');

// 1. Test variable substitution with lead data
const mockLead = {
  id: 'lead-123',
  businessName: 'Apex Immobilier',
  contactName: 'Alexandre Dupont',
  contactEmail: 'alexandre@apex-immo.fr',
  niche: 'Immobilier de prestige',
  city: 'Bordeaux',
  phone: '06 12 34 56 78',
  website: 'https://apex-immo.fr',
  address: '14 Allées de Tourny, 33000 Bordeaux',
  score: 94,
  rating: 4.9,
  reviewsCount: 52,
  companyVibe: 'Agence en forte croissance locale',
  decisionMakerRole: 'Fondateur & Associé',
  dealAmount: 8500,
};

const mockCtx = {
  lead: mockLead,
  userFirstName: 'Kael',
  userLastName: 'Belceus',
  userCompanyName: 'Minerva OS',
  userSignature: 'Kael Belceus — Minerva OS',
  calendarUrl: 'https://cal.com/minerva-demo',
};

// Test subject substitution
const rawSubject = 'Question pour {{prenom}} chez {{entreprise}} ({{ville}})';
const resolvedSubject = substituteVariables(rawSubject, mockCtx);
assert.equal(resolvedSubject, 'Question pour Alexandre chez Apex Immobilier (Bordeaux)');
console.log('✓ Subject substitution passed:', resolvedSubject);

// Test body substitution
const rawBody = `Bonjour {{prenom}},

Félicitations pour le développement de {{entreprise}} à {{ville}} dans le secteur {{secteur}}.
Votre signal : {{signal_affaires}} (Note : {{note_google}}, {{avis_google}}).

Bien cordialement,
{{mon_prenom}}
{{signature}}`;

const resolvedBody = substituteVariables(rawBody, mockCtx);
assert.ok(resolvedBody.includes('Bonjour Alexandre'));
assert.ok(resolvedBody.includes('Apex Immobilier à Bordeaux'));
assert.ok(resolvedBody.includes('Immobilier de prestige'));
assert.ok(resolvedBody.includes('Note : 4.9★, 52 avis'));
assert.ok(resolvedBody.includes('Kael Belceus — Minerva OS'));
console.log('✓ Body substitution passed');

// Test token detection
const tokens = detectTokens(rawBody);
assert.deepEqual(tokens.sort(), ['{{avis_google}}', '{{entreprise}}', '{{mon_prenom}}', '{{note_google}}', '{{prenom}}', '{{secteur}}', '{{signal_affaires}}', '{{signature}}', '{{ville}}'].sort());
console.log('✓ Token detection passed:', tokens.length, 'tokens detected');

// Test deliverability analyzer
const cleanAnalysis = analyzeDeliverability('Opportunité pour Alexandre', 'Bonjour Alexandre, seriez-vous disponible pour échanger ?', true);
assert.ok(cleanAnalysis.spamScore >= 90);
assert.equal(cleanAnalysis.spamWarnings.length, 0);
console.log('✓ Deliverability clean analysis passed, score:', cleanAnalysis.spamScore);

const spamAnalysis = analyzeDeliverability('OFFRE EXCLUSIVE GRATUIT $$$', 'Gagnez de l\'argent GRATUITEMENT et urgent !!!!!!!!', true);
assert.ok(spamAnalysis.spamScore < 60);
assert.ok(spamAnalysis.spamWarnings.length > 0);
console.log('✓ Deliverability spam penalty passed, detected warnings:', spamAnalysis.spamWarnings.length);

// Test curated template library categories
const categories = new Set(CURATED_TEMPLATES.map(t => t.category));
assert.ok(categories.has('cold'), 'Cold outreach category present');
assert.ok(categories.has('relance'), 'Relance category present');
assert.ok(categories.has('linkedin'), 'LinkedIn category present');
assert.ok(categories.has('valeur'), 'Proposition de valeur category present');
assert.ok(CURATED_TEMPLATES.length >= 10, 'Rich template catalog with 10+ templates');
console.log('✓ Curated templates catalog verified:', CURATED_TEMPLATES.length, 'templates across', categories.size, 'categories');

// Test dynamic variables catalog
assert.ok(DYNAMIC_VARIABLES.some(v => v.token === '{{prenom}}'));
assert.ok(DYNAMIC_VARIABLES.some(v => v.token === '{{nom}}'));
assert.ok(DYNAMIC_VARIABLES.some(v => v.token === '{{entreprise}}'));
assert.ok(DYNAMIC_VARIABLES.some(v => v.token === '{{poste}}'));
assert.ok(DYNAMIC_VARIABLES.some(v => v.token === '{{ville}}'));
assert.ok(DYNAMIC_VARIABLES.some(v => v.token === '{{secteur}}'));
assert.ok(DYNAMIC_VARIABLES.some(v => v.token === '{{signal_affaires}}'));
console.log('✓ Dynamic variables catalog verified:', DYNAMIC_VARIABLES.length, 'variables');

console.log('--- All Composer Studio Tests PASSED! ---');
