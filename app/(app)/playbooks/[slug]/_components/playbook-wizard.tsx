'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, Play,
  User, MapPin, Mail, Phone, Link2, MessageSquare,
  Target, Zap, ChevronRight, AlertCircle,
} from 'lucide-react';

// ─── Playbook data (same as in playbooks-root.tsx) ───────────────────────────
interface PlaybookSequenceStep {
  day: number;
  channel: string;
  subject?: string;
  template: string;
}

interface Playbook {
  id: string;
  emoji: string;
  title: string;
  description: string;
  category: string;
  icp: {
    persona: string;
    painPoints: string[];
    budget: string;
    sector: string;
  };
  scraping: {
    niches: string[];
    cities: string[];
    radius: number;
    sources: string[];
  };
  sequence: PlaybookSequenceStep[];
  callScript: string;
  proposalTemplate: string;
}

const PLAYBOOKS: Record<string, Playbook> = {
  'dentistes-mtl': {
    id: 'dentistes-mtl', emoji: '🦷',
    title: 'Dentistes sans site moderne — Montréal', description: 'Cliniques dentaires avec une présence web datée ou absente. Fort potentiel de refonte + SEO local.',
    category: 'Santé',
    icp: { persona: 'Dr. Martin, 45 ans, clinique de 2 dentistes à NDG. Site Wix 2015, aucun avis Google. Débordé, délègue la gestion marketing à sa réceptionniste.', painPoints: ['Patients perdus au profit de centres dentaires modernes', 'Aucune présence sur Google Maps', 'Site non mobile-friendly'], budget: '1 500 – 4 000 $/mois', sector: 'Clinique dentaire' },
    scraping: { niches: ['Clinique dentaire'], cities: ['Montréal', 'Laval', 'Longueuil'], radius: 15, sources: ['google', 'here'] },
    sequence: [
      { day: 0, channel: 'email', subject: 'Audit gratuit — votre visibilité sur Google Maps', template: 'Bonjour {{prenom}},\n\nJ\'ai regardé la fiche Google Maps de {{entreprise}} et j\'ai identifié 3 points bloquants qui vous font perdre des patients chaque mois.\n\nJe vous envoie l\'audit complet gratuitement si vous me répondez d\'ici vendredi.\n\nCordialement,\n{{signature}}' },
      { day: 3, channel: 'call', template: 'Bonjour, je suis {{nom}} de {{agence}}. Je vous appelais suite à un email envoyé il y a 3 jours au sujet de votre visibilité sur Google. Est-ce que vous avez eu le temps de le lire ?' },
      { day: 7, channel: 'email', subject: 'Résultat de l\'audit SEO — {{entreprise}}', template: 'Bonjour {{prenom}},\n\nVoici les 3 lacunes principales identifiées pour {{entreprise}}…' },
    ],
    callScript: 'Bonjour [Prénom], je vous contacte car j\'ai analysé votre fiche Google…', proposalTemplate: 'PROPOSITION — Pack Visibilité Dentaire\n1. Refonte Google My Business — 400 $\n2. SEO local (3 mois) — 900 $/mois',
  },
  'restos-note-faible': {
    id: 'restos-note-faible', emoji: '🍕', title: 'Restaurants note <4★ — Québec', description: 'Restaurants avec mauvaise réputation en ligne. Opportunité de gestion de réputation + SEO.', category: 'Restauration',
    icp: { persona: 'Marco, propriétaire d\'un restaurant italien à Québec, note 3.6 sur Google, plusieurs avis négatifs sur le service. Pas de stratégie de réponse aux avis.', painPoints: ['Note Google en baisse', 'Avis négatifs sans réponse', 'Perdent face aux chaînes'], budget: '800 – 2 500 $/mois', sector: 'Restaurant / Café' },
    scraping: { niches: ['Restaurant / Café', 'Pizzeria / Fast-food', 'Boulangerie / Pâtisserie'], cities: ['Québec', 'Montréal', 'Sherbrooke', 'Gatineau'], radius: 12, sources: ['google', 'yelp'] },
    sequence: [
      { day: 0, channel: 'email', subject: 'Votre note Google — comment l\'améliorer rapidement', template: 'Bonjour {{prenom}},\n\n87% des clients regardent les avis avant de choisir un restaurant. Avec la bonne stratégie, vous pouvez remonter à 4.3+ en 90 jours.\n\nVoulez-vous qu\'on en parle 15 minutes ?' },
      { day: 5, channel: 'email', subject: 'Étude de cas — restaurant passé de 3.4 à 4.6 en 3 mois', template: 'Bonjour {{prenom}},\n\nJe vous partage l\'histoire d\'un restaurant similaire à {{entreprise}}…' },
    ],
    callScript: 'Bonjour [Prénom], je vous appelle car j\'ai analysé les avis Google de [Restaurant]…', proposalTemplate: 'PROPOSITION — Gestion de Réputation\n1. Audit complet — 300 $\n2. Réponses aux avis — 400 $/mois',
  },
  'plombiers-artisans': {
    id: 'plombiers-artisans', emoji: '🔧', title: 'Plombiers & Électriciens — Grand Montréal', description: 'Artisans sans site web ou site non mobile. Forte demande locale, faible présence digitale.', category: 'Artisans',
    icp: { persona: 'Robert, plombier indépendant à Laval, travaille via bouche-à-oreille, pas de site, une fiche Google incomplète.', painPoints: ['100% dépendant du bouche-à-oreille', 'Pas de site web', 'Perd des appels d\'urgence'], budget: '500 – 1 500 $/mois', sector: 'Artisan / Service' },
    scraping: { niches: ['Plombier', 'Électricien', 'Peintre en bâtiment', 'Couvreur / Toiture'], cities: ['Montréal', 'Laval', 'Longueuil', 'Brossard', 'Repentigny'], radius: 20, sources: ['google', 'here'] },
    sequence: [{ day: 0, channel: 'email', subject: 'Vos concurrents captent vos clients urgence', template: 'Bonjour {{prenom}},\n\nQuand quelqu\'un cherche "plombier urgence {{ville}}", votre nom n\'apparaît pas dans les 3 premiers résultats. Je peux changer ça en 30 jours.' }],
    callScript: 'Bonjour [Prénom], je vous appelle car quand on cherche [métier] à [ville] sur Google, vous n\'êtes pas visible.', proposalTemplate: 'PROPOSITION — Visibilité Artisan\n1. Site 3 pages — 800 $\n2. SEO local — 500 $/mois',
  },
  'salons-coiffure': {
    id: 'salons-coiffure', emoji: '✂️', title: 'Salons de coiffure sans réservation en ligne — Montréal', description: 'Salons sans système de booking digital. Potentiel d\'automatisation + SEO local.', category: 'Beauté',
    icp: { persona: 'Sophie, gérante d\'un salon de 4 coiffeurs à Rosemont. Prend encore les RDV par téléphone.', painPoints: ['Pas de réservation en ligne', 'Clients perdus hors heures d\'ouverture', 'Pas d\'emails de rappel'], budget: '400 – 1 200 $/mois', sector: 'Salon de coiffure / Barbier' },
    scraping: { niches: ['Salon de coiffure', 'Barbier', 'Esthéticienne / Spa', 'Tatoueur / Perceur'], cities: ['Montréal', 'Laval', 'Québec'], radius: 10, sources: ['google', 'yelp'] },
    sequence: [{ day: 0, channel: 'email', subject: 'Clients perdus hors heures d\'ouverture — la solution', template: 'Bonjour {{prenom}},\n\nSaviez-vous que 40% des demandes de RDV arrivent après 18h ? Sans réservation en ligne, ces clients appellent vos concurrents.' }],
    callScript: 'Bonjour, j\'ai un outil qui permet à [Salon] d\'accepter des réservations 24/7 sans décrocher le téléphone.', proposalTemplate: 'PROPOSITION — Automatisation Salon\n1. Réservation en ligne — 200 $/mois\n2. SMS rappel — 150 $/mois',
  },
  'osteopathes-physios': {
    id: 'osteopathes-physios', emoji: '🏥', title: 'Ostéopathes & Physiothérapeutes — Québec', description: 'Cliniques de santé avec peu de présence en ligne.', category: 'Santé',
    icp: { persona: 'Claire, ostéopathe solo à Sherbrooke, 8 ans d\'expérience, agenda souvent plein mais dépendante du bouche-à-oreille.', painPoints: ['Pas de système pour capturer les nouveaux patients', 'Site web basique', 'Pas de présence sociale'], budget: '600 – 2 000 $/mois', sector: 'Santé & Bien-être' },
    scraping: { niches: ['Physiothérapie / Chiro', 'Psychologue / Thérapeute', 'Clinique médicale'], cities: ['Québec', 'Sherbrooke', 'Gatineau', 'Trois-Rivières', 'Saguenay'], radius: 15, sources: ['google', 'here'] },
    sequence: [{ day: 0, channel: 'email', subject: '3 patients par mois supplémentaires — sans publicité payante', template: 'Bonjour {{prenom}},\n\nJ\'ai identifié 3 ajustements simples qui pourraient vous amener 3 nouveaux patients par mois sans budget pub.' }],
    callScript: 'Bonjour [Prénom], votre clinique n\'apparaît pas quand on cherche [spécialité] à [ville] sur Google.', proposalTemplate: 'PROPOSITION — Visibilité Clinique\n1. Google My Business — 300 $\n2. Avis patients — 200 $/mois',
  },
  'agences-immo': {
    id: 'agences-immo', emoji: '🏠', title: 'Agences immobilières indépendantes — Québec', description: 'Courtiers immobiliers sans outils CRM ni présence digitale structurée.', category: 'Immobilier',
    icp: { persona: 'Jean-François, courtier immobilier indépendant à Brossard depuis 12 ans. Pas de CRM, gère ses clients sur Excel.', painPoints: ['Pas de CRM — suivi par Excel', 'Pas de nurturing des leads froids', 'Site non à jour'], budget: '700 – 2 500 $/mois', sector: 'Agence immobilière' },
    scraping: { niches: ['Agence immobilière'], cities: ['Montréal', 'Laval', 'Longueuil', 'Brossard', 'Blainville', 'Mirabel'], radius: 20, sources: ['google', 'here'] },
    sequence: [{ day: 0, channel: 'email', subject: 'Vos leads froids vous coûtent des commissions', template: 'Bonjour {{prenom}},\n\nUn courtier moyen perd 30% de ses commissions faute de suivi systématique de ses leads froids.' }],
    callScript: 'Bonjour [Prénom], j\'ai un système qui transforme vos leads froids en clients actifs automatiquement.', proposalTemplate: 'PROPOSITION — CRM Immobilier\n1. Setup CRM — 500 $\n2. Séquences nurturing — 300 $/mois',
  },
  'cpa-comptables': {
    id: 'cpa-comptables', emoji: '📊', title: 'Comptables & CPA PME — Québec', description: 'Cabinets comptables qui recrutent des clients par réseau seulement.', category: 'Finance',
    icp: { persona: 'Marie-Hélène, CPA associée dans un cabinet de 3 comptables à Québec. Clients via bouche-à-oreille uniquement.', painPoints: ['Acquisition 100% réseau — plafonné', 'Pas de contenu en ligne', 'Perd face aux grandes firmes'], budget: '1 000 – 3 000 $/mois', sector: 'Finance & Comptabilité' },
    scraping: { niches: ['Comptable / CPA', 'Assurance', 'Avocat', 'Notaire'], cities: ['Québec', 'Montréal', 'Gatineau', 'Sherbrooke'], radius: 15, sources: ['google', 'here'] },
    sequence: [{ day: 0, channel: 'email', subject: '15 nouveaux clients PME en 6 mois — stratégie concrète', template: 'Bonjour {{prenom}},\n\nLa plupart des PME cherchent un comptable sur Google. Si {{entreprise}} n\'y est pas, elles vont chez vos concurrents.' }],
    callScript: 'Bonjour [Prénom], quand une PME cherche un comptable à [ville] sur Google, [Cabinet] n\'apparaît pas.', proposalTemplate: 'PROPOSITION — Acquisition Digitale\n1. SEO 3 mots-clés PME — 800 $/mois\n2. LinkedIn 4 posts/mois — 400 $/mois',
  },
  'gyms-studios': {
    id: 'gyms-studios', emoji: '💪', title: 'Gyms & Studios de fitness — Grand Montréal', description: 'Studios indépendants face aux grandes chaînes.', category: 'Sport & Bien-être',
    icp: { persona: 'Alex, propriétaire d\'un studio de yoga à Plateau, 60 membres. Lutte contre Equinox.', painPoints: ['Visibilité faible vs les chaînes', 'Peu d\'avis Google', 'Pas de stratégie de rétention'], budget: '500 – 1 500 $/mois', sector: 'Sport & Fitness' },
    scraping: { niches: ['Gym / Fitness', 'Studio yoga / Pilates', 'Salle de danse'], cities: ['Montréal', 'Laval', 'Québec', 'Longueuil'], radius: 8, sources: ['google', 'yelp'] },
    sequence: [{ day: 0, channel: 'email', subject: 'Comment un studio de yoga a doublé ses membres en 90 jours', template: 'Bonjour {{prenom}},\n\n{{entreprise}} offre quelque chose qu\'Equinox ne peut pas : une vraie communauté.' }],
    callScript: 'Bonjour [Prénom], mon agence aide les studios indépendants à attirer des membres qui n\'abandonneront pas.', proposalTemplate: 'PROPOSITION — Croissance Studio\n1. Google My Business — 300 $\n2. Meta Ads géolocalisées — 500 $/mois',
  },
  'serruriers-urgences': {
    id: 'serruriers-urgences', emoji: '🔑', title: 'Serruriers & Urgences dépannage — Montréal', description: 'Artisans urgentistes sans visibilité locale.', category: 'Urgences & Dépannage',
    icp: { persona: 'Tony, serrurier indépendant, Montréal. Disponible 24/7 mais n\'apparaît pas dans le top 3 Google.', painPoints: ['Absent du top 3 Google pour les mots-clés urgence', 'Concurrent capte les appels nuit/weekend', 'Aucune présence en ligne'], budget: '400 – 1 000 $/mois', sector: 'Urgences & Artisans' },
    scraping: { niches: ['Serrurier', 'Électricien', 'Plombier'], cities: ['Montréal', 'Laval', 'Longueuil', 'Brossard', 'Saint-Jérôme'], radius: 25, sources: ['google', 'here'] },
    sequence: [{ day: 0, channel: 'email', subject: 'Urgence lockout à 2h du matin — qui capte l\'appel ?', template: 'Bonjour {{prenom}},\n\nJ\'ai testé "serrurier urgence Montréal" sur Google à 2h du matin la semaine passée. Votre nom n\'est pas dans les 3 premiers.' }],
    callScript: 'Bonjour [Prénom], cherchez "serrurier urgence [ville]" sur Google maintenant. Vous êtes là ? Non.', proposalTemplate: 'PROPOSITION — Top 3 Google Urgences\n1. Google My Business urgences — 200 $\n2. SEO local — 400 $/mois',
  },
  'avocats-notaires': {
    id: 'avocats-notaires', emoji: '⚖️', title: 'Avocats & Notaires — PME et particuliers', description: 'Cabinets juridiques sans présence SEO locale.', category: 'Juridique',
    icp: { persona: 'Maître Dubois, avocat d\'affaires à Montréal, cabinet de 2 avocats. Pas de blog, pas de fiche Google optimisée.', painPoints: ['Pas de contenu juridique en ligne', 'Fiche Google incomplète', 'Concurrence des grandes firmes'], budget: '1 500 – 5 000 $/mois', sector: 'Juridique' },
    scraping: { niches: ['Avocat', 'Notaire', 'Comptable / CPA'], cities: ['Montréal', 'Québec', 'Gatineau', 'Laval'], radius: 15, sources: ['google', 'here'] },
    sequence: [{ day: 0, channel: 'email', subject: 'Vos clients PME vous trouvent-ils sur Google ?', template: 'Bonjour Maître {{prenom}},\n\nJ\'ai analysé la présence en ligne de {{entreprise}}. Voici ce que j\'ai trouvé :\n\n❌ Fiche Google incomplète\n❌ Aucun article de blog\n❌ 5 avis seulement' }],
    callScript: 'Bonjour Maître [Nom], j\'ai analysé votre présence en ligne et comparé avec 3 cabinets concurrents.', proposalTemplate: 'PROPOSITION — Autorité Digitale Juridique\n1. Contenu SEO (2 articles/mois) — 800 $/mois\n2. LinkedIn cabinet — 400 $/mois',
  },
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-3.5 w-3.5" />,
  call: <Phone className="h-3.5 w-3.5" />,
  linkedin: <Link2 className="h-3.5 w-3.5" />,
  sms: <MessageSquare className="h-3.5 w-3.5" />,
};

const SOURCES = [
  { id: 'google', label: 'Google Maps (Apify)' },
  { id: 'here', label: 'HERE Maps' },
  { id: 'yelp', label: 'Yelp' },
  { id: 'osm', label: 'OpenStreetMap' },
  { id: 'pagesjaunes', label: 'PagesJaunes' },
];

const STEPS = ['Persona & Objectifs', 'Scraping', 'Séquence', 'Lancement'];

interface WizardState {
  goalMetric: string;
  goalTarget: number;
  niches: string[];
  cities: string[];
  radius: number;
  sources: string[];
  useDefaultSequence: boolean;
  campaignName: string;
}

function TagInput({ tags, setTags, placeholder }: { tags: string[]; setTags: (t: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState('');
  const add = () => {
    const val = input.trim();
    if (val && !tags.includes(val)) setTags([...tags, val]);
    setInput('');
  };
  return (
    <div className="border border-[#e5e5e0] rounded-lg p-2 flex flex-wrap gap-1.5 min-h-[40px] focus-within:ring-1 focus-within:ring-[#059669]">
      {tags.map((t) => (
        <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-[#059669]/10 text-[#059669] rounded-full text-[10px] font-semibold border border-[#059669]/20">
          {t}
          <button onClick={() => setTags(tags.filter((x) => x !== t))} className="hover:text-red-500 leading-none">&times;</button>
        </span>
      ))}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
        placeholder={tags.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[120px] text-xs outline-none bg-transparent"
      />
    </div>
  );
}

export function PlaybookWizard({ slug }: { slug: string }) {
  const router = useRouter();
  const { addCampaign, activeWorkspace } = useReach();
  const pb = PLAYBOOKS[slug];
  const [step, setStep] = useState(0);
  const [launching, setLaunching] = useState(false);
  const [launched, setLaunched] = useState(false);
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [state, setState] = useState<WizardState>(() => ({
    goalMetric: 'leads',
    goalTarget: 50,
    niches: pb?.scraping.niches ?? [],
    cities: pb?.scraping.cities ?? [],
    radius: pb?.scraping.radius ?? 15,
    sources: pb?.scraping.sources ?? ['google', 'osm'],
    useDefaultSequence: true,
    campaignName: pb?.title ?? slug,
  }));

  if (!pb) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-[#f54e00] mx-auto" />
          <p className="text-sm font-bold text-[#26251e]">Playbook introuvable</p>
          <button onClick={() => router.push('/playbooks')} className="text-xs text-[#059669] underline">← Retour aux playbooks</button>
        </div>
      </div>
    );
  }

  const handleLaunch = async () => {
    setLaunching(true);
    setError(null);
    try {
      // 1. Create campaign
      const campaign = await addCampaign({
        name: state.campaignName,
        description: pb.description,
        niches: state.niches,
        cities: state.cities,
        personaId: pb.id,
        sequenceConfig: state.useDefaultSequence ? JSON.stringify(pb.sequence) : undefined,
        goals: JSON.stringify({ metric: state.goalMetric, target: state.goalTarget }),
      });

      const cId = (campaign as { id: string } | undefined)?.id ?? null;

      // 2. Create playbook_run
      try {
        const runRes = await fetch(getApiUrl('/api/playbook-runs'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playbook_id: pb.id,
            workspace_id: activeWorkspace?.id,
            campaign_id: cId,
            status: 'running',
          }),
        });
        if (!runRes.ok) console.warn('playbook_run creation failed (non-blocking)');
      } catch { /* non-blocking */ }

      // 3. Trigger scraping
      try {
        await fetch(getApiUrl('/api/scrape-maps'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            niches: state.niches,
            cities: state.cities,
            radius: state.radius * 1000,
            sources: state.sources,
            campaignId: cId,
            workspaceId: activeWorkspace?.id,
            maxResults: 100,
          }),
        });
      } catch { /* scraping runs in background */ }

      setCampaignId(cId);
      setLaunched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors du lancement');
    } finally {
      setLaunching(false);
    }
  };

  if (launched) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center space-y-5 max-w-sm">
          <div className="w-16 h-16 rounded-full bg-[#059669]/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-[#059669]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-[#26251e]">Playbook lancé ! 🎉</h2>
            <p className="text-xs text-[#7a7a76] mt-1">La campagne a été créée et le scraping est en cours en arrière-plan.</p>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/campaigns')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              Voir la campagne
            </button>
            <button
              onClick={() => router.push('/playbooks')}
              className="px-4 py-2 rounded-lg border border-[#e5e5e0] text-xs font-semibold text-[#555552] hover:bg-[#f4f4f3] transition-colors"
            >
              ← Playbooks
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8]">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div>
          <button onClick={() => router.push('/playbooks')} className="flex items-center gap-1.5 text-xs text-[#7a7a76] hover:text-[#26251e] transition-colors mb-4">
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour aux playbooks
          </button>
          <div className="flex items-center gap-3">
            <span className="text-3xl">{pb.emoji}</span>
            <div>
              <h1 className="text-base font-black text-[#26251e]">{pb.title}</h1>
              <p className="text-xs text-[#7a7a76]">{pb.description}</p>
            </div>
          </div>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className={cn(
                'flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all',
                i === step ? 'bg-[#26251e] text-white border-[#26251e]' :
                i < step ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/20' :
                'bg-white text-[#7a7a76] border-[#e5e5e0]'
              )}>
                {i < step ? <CheckCircle2 className="h-3 w-3" /> : <span className="w-3 h-3 flex items-center justify-center rounded-full border border-current text-[8px]">{i + 1}</span>}
                <span className="hidden sm:block">{s}</span>
              </div>
              {i < STEPS.length - 1 && <div className={cn('flex-1 h-px', i < step ? 'bg-[#059669]/30' : 'bg-[#e5e5e0]')} />}
            </React.Fragment>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl border border-[#e5e5e0] p-6 space-y-5">

          {/* ── Step 0: Persona & Objectifs ── */}
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="h-3.5 w-3.5 text-[#7a7a76]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Persona cible</span>
                </div>
                <div className="bg-[#f7f7f4] rounded-xl p-4 border border-[#e5e5e0]">
                  <p className="text-xs text-[#26251e] leading-relaxed">{pb.icp.persona}</p>
                  <div className="mt-3 space-y-1.5">
                    {pb.icp.painPoints.map((pt, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-[#555552]">
                        <span className="text-[#f54e00] shrink-0 font-bold mt-0.5">✗</span>
                        <span>{pt}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-6 mt-3 text-xs">
                    <div><span className="text-[10px] font-bold uppercase text-[#7a7a76]">Budget</span><p className="font-semibold text-[#26251e]">{pb.icp.budget}</p></div>
                    <div><span className="text-[10px] font-bold uppercase text-[#7a7a76]">Secteur</span><p className="font-semibold text-[#26251e]">{pb.icp.sector}</p></div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-3.5 w-3.5 text-[#7a7a76]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Objectifs de campagne</span>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-[#26251e] block mb-1.5">Nom de la campagne</label>
                    <input
                      value={state.campaignName}
                      onChange={(e) => setState((s) => ({ ...s, campaignName: e.target.value }))}
                      className="w-full text-xs border border-[#e5e5e0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="text-xs font-bold text-[#26251e] block mb-1.5">Métrique cible</label>
                      <select
                        value={state.goalMetric}
                        onChange={(e) => setState((s) => ({ ...s, goalMetric: e.target.value }))}
                        className="w-full text-xs border border-[#e5e5e0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#059669] bg-white"
                      >
                        <option value="leads">Leads scrapés</option>
                        <option value="emails_sent">Emails envoyés</option>
                        <option value="replies">Réponses reçues</option>
                        <option value="meetings">RDV pris</option>
                        <option value="deals">Deals signés</option>
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="text-xs font-bold text-[#26251e] block mb-1.5">Objectif chiffré</label>
                      <input
                        type="number"
                        min={1}
                        value={state.goalTarget}
                        onChange={(e) => setState((s) => ({ ...s, goalTarget: Number(e.target.value) }))}
                        className="w-full text-xs border border-[#e5e5e0] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 1: Scraping Presets ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="h-3.5 w-3.5 text-[#7a7a76]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Preset de scraping</span>
                </div>
                <p className="text-[10px] text-[#7a7a76] mb-4">Pré-rempli depuis le playbook — modifiez selon vos besoins. Appuyez sur Entrée pour ajouter une valeur.</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[#26251e] block mb-1.5">Niches ciblées</label>
                  <TagInput tags={state.niches} setTags={(t) => setState((s) => ({ ...s, niches: t }))} placeholder="ex. Dentiste, Restaurant…" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#26251e] block mb-1.5">Villes</label>
                  <TagInput tags={state.cities} setTags={(t) => setState((s) => ({ ...s, cities: t }))} placeholder="ex. Montréal, Laval…" />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#26251e] block mb-1.5">
                    Rayon de recherche — <span className="text-[#059669]">{state.radius} km</span>
                  </label>
                  <input
                    type="range" min={2} max={50} step={1}
                    value={state.radius}
                    onChange={(e) => setState((s) => ({ ...s, radius: Number(e.target.value) }))}
                    className="w-full accent-[#059669]"
                  />
                  <div className="flex justify-between text-[10px] text-[#7a7a76] mt-0.5"><span>2 km</span><span>50 km</span></div>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#26251e] block mb-1.5">Sources de données</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SOURCES.map((src) => (
                      <label key={src.id} className={cn(
                        'flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all text-xs',
                        state.sources.includes(src.id)
                          ? 'border-[#059669]/40 bg-[#059669]/5 text-[#059669] font-semibold'
                          : 'border-[#e5e5e0] text-[#555552] hover:border-[#26251e]/20'
                      )}>
                        <input
                          type="checkbox"
                          checked={state.sources.includes(src.id)}
                          onChange={(e) => setState((s) => ({
                            ...s,
                            sources: e.target.checked ? [...s.sources, src.id] : s.sources.filter((x) => x !== src.id),
                          }))}
                          className="accent-[#059669]"
                        />
                        {src.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Séquence ── */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="h-3.5 w-3.5 text-[#7a7a76]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Séquence de contact</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#7a7a76]">Utiliser telle quelle</span>
                  <button
                    onClick={() => setState((s) => ({ ...s, useDefaultSequence: !s.useDefaultSequence }))}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                      state.useDefaultSequence ? 'bg-[#059669]' : 'bg-muted-foreground/30'
                    )}
                  >
                    <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200', state.useDefaultSequence ? 'translate-x-4' : 'translate-x-0')} />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {pb.sequence.map((step_item, i) => (
                  <div key={i} className="rounded-xl border border-[#e5e5e0] p-3.5 space-y-2 bg-white">
                    <div className="flex items-center gap-2">
                      <div className="h-6 w-6 rounded-full bg-[#059669] text-white text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</div>
                      <span className="text-[#7a7a76]">{CHANNEL_ICONS[step_item.channel] ?? <Mail className="h-3.5 w-3.5" />}</span>
                      <span className="text-xs font-bold text-[#26251e] capitalize">{step_item.channel}</span>
                      <span className="text-[10px] text-[#7a7a76] ml-auto">Jour {step_item.day}</span>
                    </div>
                    {step_item.subject && (
                      <p className="text-[10px] font-semibold text-[#555552] pl-8">Objet : {step_item.subject}</p>
                    )}
                    <pre className="text-[10px] text-[#7a7a76] leading-relaxed whitespace-pre-wrap font-sans pl-8 line-clamp-3">
                      {step_item.template}
                    </pre>
                  </div>
                ))}
              </div>

              {!state.useDefaultSequence && (
                <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 text-xs text-amber-700">
                  <p className="font-semibold mb-1">Personnaliser la séquence</p>
                  <p>La séquence sera créée sans contenu pré-rempli. Vous pourrez la modifier dans <strong>/sequences/new</strong> après le lancement.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Step 3: Résumé & Lancement ── */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Play className="h-3.5 w-3.5 text-[#7a7a76]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Résumé du lancement</span>
                </div>
                <div className="space-y-3">
                  {[
                    { label: 'Campagne', value: state.campaignName },
                    { label: 'Objectif', value: `${state.goalTarget} ${state.goalMetric}` },
                    { label: 'Niches', value: state.niches.join(', ') || '—' },
                    { label: 'Villes', value: state.cities.join(', ') || '—' },
                    { label: 'Rayon', value: `${state.radius} km` },
                    { label: 'Sources', value: state.sources.join(', ') },
                    { label: 'Séquence', value: state.useDefaultSequence ? `${pb.sequence.length} steps pré-configurés` : 'Vide (à personnaliser)' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start gap-3 text-xs">
                      <span className="w-24 shrink-0 text-[#7a7a76] font-semibold">{label}</span>
                      <span className="text-[#26251e] font-medium flex-1">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-[#059669]/5 border border-[#059669]/20 rounded-xl p-4 text-xs text-[#059669]">
                <p className="font-semibold mb-1">Ce qui sera créé :</p>
                <ul className="space-y-0.5 text-[#059669]/80">
                  <li>✓ Une campagne &quot;{state.campaignName}&quot;</li>
                  <li>✓ Un run playbook pour le suivi</li>
                  <li>✓ Un job de scraping ({state.niches.length} niches × {state.cities.length} villes)</li>
                </ul>
              </div>

              {error && (
                <div className="border border-red-200 bg-red-50 rounded-xl p-3 text-xs text-red-600 flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => step === 0 ? router.push('/playbooks') : setStep((s) => s - 1)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[#e5e5e0] text-xs font-semibold text-[#555552] hover:bg-[#f4f4f3] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {step === 0 ? 'Annuler' : 'Précédent'}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#26251e] hover:bg-[#3a3930] text-white text-xs font-bold transition-colors"
            >
              Suivant
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              onClick={handleLaunch}
              disabled={launching || state.niches.length === 0 || state.cities.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors disabled:opacity-60"
            >
              {launching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {launching ? 'Lancement…' : 'Lancer le playbook'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
