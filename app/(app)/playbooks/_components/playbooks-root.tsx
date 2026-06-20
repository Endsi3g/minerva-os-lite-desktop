'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { BookOpen, ChevronRight, X, CheckCircle2, Loader2, Phone, Mail, FileText, User, Play, BarChart2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PlaybookSequenceStep {
  day: number;
  channel: string;
  subject?: string;
  template: string;
}

export interface Playbook {
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

export const PLAYBOOKS: Playbook[] = [
  {
    id: 'dentistes-mtl',
    emoji: '🦷',
    title: 'Dentistes sans site moderne — Montréal',
    description: 'Cliniques dentaires avec une présence web datée ou absente. Fort potentiel de refonte + SEO local.',
    category: 'Santé',
    icp: {
      persona: 'Dr. Martin, 45 ans, clinique de 2 dentistes à NDG. Site Wix 2015, aucun avis Google. Débordé, délègue la gestion marketing à sa réceptionniste.',
      painPoints: ['Patients perdus au profit de centres dentaires modernes', 'Aucune présence sur Google Maps', 'Site non mobile-friendly'],
      budget: '1 500 – 4 000 $/mois',
      sector: 'Clinique dentaire',
    },
    scraping: { niches: ['Clinique dentaire'], cities: ['Montréal', 'Laval', 'Longueuil'], radius: 15000, sources: ['google', 'here'] },
    sequence: [
      { day: 0, channel: 'email', subject: 'Audit gratuit — votre visibilité sur Google Maps', template: "Bonjour {{prenom}},\n\nJ'ai regardé la fiche Google Maps de {{entreprise}} et j'ai identifié 3 points bloquants qui vous font perdre des patients chaque mois.\n\nJe vous envoie l'audit complet gratuitement si vous me répondez d'ici vendredi.\n\nCordialement,\n{{signature}}" },
      { day: 3, channel: 'call', template: "Bonjour, je suis {{nom}} de {{agence}}. Je vous appelais suite à un email envoyé il y a 3 jours au sujet de votre visibilité sur Google. Est-ce que vous avez eu le temps de le lire ?" },
      { day: 7, channel: 'email', subject: "Résultat de l'audit SEO — {{entreprise}}", template: "Bonjour {{prenom}},\n\nVoici les 3 lacunes principales identifiées pour {{entreprise}} :\n1. Fiche Google My Business incomplète (note 3.2/5)\n2. Site non indexé sur mobile\n3. Aucune mention locale dans un rayon de 5 km\n\nProposition : Pack Visibilité Local à 1 800 $/mois, résultats en 60 jours.\n\nDisponible pour un appel de 15 min ?" },
    ],
    callScript: "Bonjour [Prénom],\n\nJe suis [Votre nom] de [Agence]. Je vous contacte car j'ai analysé la fiche Google de [Clinique] et j'ai trouvé 3 problèmes qui coûtent probablement 10-15 nouveaux patients par mois.\n\n[PAUSE]\n\nEst-ce que vous avez 2 minutes pour que je vous explique ce que j'ai trouvé ?\n\n[Si oui] → Expliquer les 3 points, proposer un audit complet gratuit\n[Si non] → Demander un meilleur moment, laisser un message court",
    proposalTemplate: "PROPOSITION — Pack Visibilité Dentaire\nClient : [Clinique]\nDate : [Date]\n\n1. Refonte Google My Business — 400 $\n2. Optimisation SEO local (3 mois) — 900 $/mois\n3. Campagne d'avis Google — 300 $/mois\n4. Rapport mensuel de performance — inclus\n\nTotal : 1 600 $/mois\nEngagement : 3 mois minimum\nGarantie : +20% de visibilité en 60 jours ou remboursement du premier mois",
  },
  {
    id: 'restos-note-faible',
    emoji: '🍕',
    title: 'Restaurants note <4★ — Québec',
    description: 'Restaurants avec mauvaise réputation en ligne. Opportunité de gestion de réputation + SEO.',
    category: 'Restauration',
    icp: {
      persona: "Marco, propriétaire d'un restaurant italien à Québec, note 3.6 sur Google, plusieurs avis négatifs sur le service. Pas de stratégie de réponse aux avis.",
      painPoints: ['Note Google en baisse', 'Avis négatifs sans réponse', 'Perdent face aux chaînes'],
      budget: '800 – 2 500 $/mois',
      sector: 'Restaurant / Café',
    },
    scraping: { niches: ['Restaurant / Café', 'Pizzeria / Fast-food', 'Boulangerie / Pâtisserie'], cities: ['Québec', 'Montréal', 'Sherbrooke', 'Gatineau'], radius: 12000, sources: ['google', 'yelp'] },
    sequence: [
      { day: 0, channel: 'email', subject: 'Votre note Google — comment l\'améliorer rapidement', template: "Bonjour {{prenom}},\n\nJ'ai vu que {{entreprise}} a une note de {{note}}/5 sur Google.\n\n87% des clients regardent les avis avant de choisir un restaurant. Avec la bonne stratégie, vous pouvez remonter à 4.3+ en 90 jours.\n\nVoulez-vous qu'on en parle 15 minutes ?\n\n{{signature}}" },
      { day: 5, channel: 'email', subject: 'Étude de cas — restaurant passé de 3.4 à 4.6 en 3 mois', template: "Bonjour {{prenom}},\n\nJe vous partage l'histoire d'un restaurant similaire à {{entreprise}} que nous avons accompagné.\n\n[Lien étude de cas]\n\nRésultat : +42% de réservations en 3 mois.\n\nDisponible pour un appel ?" },
    ],
    callScript: "Bonjour [Prénom], je vous appelle car j'ai analysé les avis Google de [Restaurant] — vous avez [X] avis négatifs récents sans réponse. Ça coûte probablement [Y] couverts par semaine. J'ai une méthode pour retourner ça en 60 jours. 15 minutes pour vous expliquer ?",
    proposalTemplate: "PROPOSITION — Gestion de Réputation Restaurant\n1. Audit complet des avis — 300 $ (one-time)\n2. Réponses aux avis (illimitées) — 400 $/mois\n3. Campagne de collecte d'avis positifs — 300 $/mois\n4. Rapport mensuel — inclus\nTotal : 700 $/mois + 300 $ setup",
  },
  {
    id: 'plombiers-artisans',
    emoji: '🔧',
    title: 'Plombiers & Électriciens — Grand Montréal',
    description: 'Artisans sans site web ou site non mobile. Forte demande locale, faible présence digitale.',
    category: 'Artisans',
    icp: {
      persona: "Robert, plombier indépendant à Laval, travaille via bouche-à-oreille, pas de site, une fiche Google incomplète avec 4 avis. Veut développer sans payer un salarié commercial.",
      painPoints: ["100% dépendant du bouche-à-oreille", "Pas de site web", "Perd des appels d'urgence au profit de concurrents mieux référencés"],
      budget: '500 – 1 500 $/mois',
      sector: 'Artisan / Service',
    },
    scraping: { niches: ['Plombier', 'Électricien', 'Peintre en bâtiment', 'Couvreur / Toiture', 'Menuisier / Charpentier'], cities: ['Montréal', 'Laval', 'Longueuil', 'Brossard', 'Repentigny'], radius: 20000, sources: ['google', 'here'] },
    sequence: [
      { day: 0, channel: 'email', subject: 'Vos concurrents captent vos clients urgence — voici comment', template: "Bonjour {{prenom}},\n\nQuand quelqu'un cherche \"plombier urgence {{ville}}\", votre nom n'apparaît pas dans les 3 premiers résultats. Ça représente 20-30 appels manqués par mois.\n\nJe peux changer ça en 30 jours. On en parle ?" },
    ],
    callScript: "Bonjour [Prénom], je vous appelle car quand on cherche [métier] à [ville] sur Google, vous n'êtes pas visible. Vos concurrents captent les urgences à votre place. J'ai une solution à [prix] par mois, résultat en 30 jours. Est-ce que vous avez 10 minutes ?",
    proposalTemplate: "PROPOSITION — Visibilité Artisan Local\n1. Création site 3 pages (rapide) — 800 $ one-time\n2. Google My Business optimisé — 200 $ one-time\n3. SEO local mensuel — 500 $/mois\nTotal : 1 000 $ first month, puis 500 $/mois",
  },
  {
    id: 'salons-coiffure',
    emoji: '✂️',
    title: 'Salons de coiffure sans réservation en ligne — Montréal',
    description: 'Salons sans système de booking digital. Potentiel d\'automatisation + SEO local.',
    category: 'Beauté',
    icp: {
      persona: "Sophie, gérante d'un salon de 4 coiffeurs à Rosemont. Prend encore les RDV par téléphone, perd des clients qui ne rappellent pas.",
      painPoints: ["Pas de réservation en ligne", "Clients perdus hors heures d'ouverture", "Pas d'emails de rappel automatiques"],
      budget: '400 – 1 200 $/mois',
      sector: 'Salon de coiffure / Barbier',
    },
    scraping: { niches: ['Salon de coiffure', 'Barbier', 'Esthéticienne / Spa', 'Tatoueur / Perceur'], cities: ['Montréal', 'Laval', 'Québec'], radius: 10000, sources: ['google', 'yelp'] },
    sequence: [
      { day: 0, channel: 'email', subject: "Clients perdus hors heures d'ouverture — la solution", template: "Bonjour {{prenom}},\n\nSaviez-vous que 40% des demandes de RDV arrivent après 18h ?\n\nSans réservation en ligne, ces clients appellent vos concurrents. Je vous aide à capturer ces RDV automatiquement. Démonstration gratuite de 20 minutes ?" },
    ],
    callScript: "Bonjour, je suis [Nom] de [Agence]. Je vous appelle car j'ai un outil qui permet à [Salon] d'accepter des réservations 24/7 sans décrocher le téléphone. Vous perdez probablement 15-20 RDV par semaine le soir et le weekend. Est-ce que vous avez quelques minutes ?",
    proposalTemplate: "PROPOSITION — Automatisation Salon\n1. Système de réservation en ligne (Calendly/Square) — 200 $/mois\n2. Email & SMS de rappel automatiques — 150 $/mois\n3. Page Google My Business optimisée — 200 $ one-time\nTotal : 350 $/mois",
  },
  {
    id: 'osteopathes-physios',
    emoji: '🏥',
    title: 'Ostéopathes & Physiothérapeutes — Québec',
    description: 'Cliniques de santé avec peu de présence en ligne. Fort bouche-à-oreille mais croissance plafonnée.',
    category: 'Santé',
    icp: {
      persona: "Claire, ostéopathe solo à Sherbrooke, 8 ans d'expérience, agenda souvent plein mais dépendante du bouche-à-oreille. Souhaite avoir une liste d'attente et développer sa clientèle.",
      painPoints: ['Pas de système pour capturer les nouveaux patients', 'Site web basique non référencé', 'Pas de présence sur les réseaux sociaux'],
      budget: '600 – 2 000 $/mois',
      sector: 'Santé & Bien-être',
    },
    scraping: { niches: ['Physiothérapie / Chiro', 'Psychologue / Thérapeute', 'Clinique médicale', 'Optique / Opticien'], cities: ['Québec', 'Sherbrooke', 'Gatineau', 'Trois-Rivières', 'Saguenay'], radius: 15000, sources: ['google', 'here'] },
    sequence: [
      { day: 0, channel: 'email', subject: '3 patients par mois supplémentaires — sans publicité payante', template: "Bonjour {{prenom}},\n\nJ'ai regardé votre présence en ligne et j'ai identifié 3 ajustements simples qui pourraient vous amener 3 nouveaux patients par mois sans budget pub.\n\nJe vous les partage gratuitement si vous me répondez.\n\n{{signature}}" },
    ],
    callScript: "Bonjour [Prénom], je vous contacte car votre clinique n'apparaît pas quand on cherche [spécialité] à [ville] sur Google. La moitié de vos patients potentiels ne vous trouvent pas. J'ai des solutions simples, est-ce qu'on peut en parler ?",
    proposalTemplate: "PROPOSITION — Visibilité Clinique Santé\n1. Optimisation fiche Google My Business — 300 $ one-time\n2. Campagne d'avis patients — 200 $/mois\n3. SEO local 3 mots-clés — 600 $/mois\nROI attendu : 3-5 nouveaux patients/mois dès le 2ème mois",
  },
  {
    id: 'agences-immo',
    emoji: '🏠',
    title: 'Agences immobilières indépendantes — Québec',
    description: 'Courtiers immobiliers sans outils CRM ni présence digitale structurée.',
    category: 'Immobilier',
    icp: {
      persona: "Jean-François, courtier immobilier indépendant à Brossard depuis 12 ans. Pas de CRM, gère ses clients sur Excel. Perd des deals par manque de suivi.",
      painPoints: ['Pas de CRM — suivi par Excel ou mémoire', 'Pas de nurturing des leads froids', 'Site non à jour'],
      budget: '700 – 2 500 $/mois',
      sector: 'Agence immobilière',
    },
    scraping: { niches: ['Agence immobilière'], cities: ['Montréal', 'Laval', 'Longueuil', 'Brossard', 'Blainville', 'Mirabel'], radius: 20000, sources: ['google', 'here'] },
    sequence: [
      { day: 0, channel: 'email', subject: 'Vos leads froids vous coûtent des commissions', template: "Bonjour {{prenom}},\n\nUn courtier moyen perd 30% de ses commissions faute de suivi systématique de ses leads froids.\n\nJ'ai un système qui automatise ce suivi. Résultat moyen : +2 deals par trimestre.\n\nAppel de 15 min ?" },
    ],
    callScript: "Bonjour [Prénom], j'ai un système qui transforme vos leads froids en clients actifs automatiquement. Combien de prospects avez-vous qui n'ont pas rappelé dans les 3 derniers mois ? [Écouter] Ces gens-là pourraient vous apporter [X $] de commission. On en parle ?",
    proposalTemplate: "PROPOSITION — CRM & Automatisation Immobilier\n1. Setup CRM (Minerva) + import données — 500 $ one-time\n2. Séquences de nurturing email — 300 $/mois\n3. Reporting mensuel performance — inclus\nTotal : 800 $/mois après setup",
  },
  {
    id: 'cpa-comptables',
    emoji: '📊',
    title: 'Comptables & CPA PME — Québec',
    description: "Cabinets comptables qui recrutent des clients par réseau seulement. Fort potentiel d'acquisition digitale.",
    category: 'Finance',
    icp: {
      persona: "Marie-Hélène, CPA associée dans un cabinet de 3 comptables à Québec. Nouveau cabinet depuis 2 ans, clients via bouche-à-oreille uniquement. Objectif : 15 nouveaux clients PME en 6 mois.",
      painPoints: ['Acquisition 100% réseau — plafonné', 'Pas de contenu en ligne', 'Perd face aux grandes firmes sur Google'],
      budget: '1 000 – 3 000 $/mois',
      sector: 'Finance & Comptabilité',
    },
    scraping: { niches: ['Comptable / CPA', 'Assurance', 'Avocat', 'Notaire'], cities: ['Québec', 'Montréal', 'Gatineau', 'Sherbrooke'], radius: 15000, sources: ['google', 'here'] },
    sequence: [
      { day: 0, channel: 'email', subject: '15 nouveaux clients PME en 6 mois — stratégie concrète', template: "Bonjour {{prenom}},\n\nLa plupart des PME cherchent un comptable sur Google. Si {{entreprise}} n'y est pas, elles vont chez vos concurrents.\n\nJ'ai une stratégie d'acquisition digitale qui a amené 12 nouveaux clients à un cabinet similaire en 4 mois.\n\nÇa vous intéresse ?\n\n{{signature}}" },
    ],
    callScript: "Bonjour [Prénom], je vous appelle car quand une PME cherche un comptable à [ville] sur Google, [Cabinet] n'apparaît pas. Ça représente des dizaines de prospects qui vont chez vos concurrents chaque mois. J'ai une solution. 20 minutes de votre temps ?",
    proposalTemplate: "PROPOSITION — Acquisition Digitale Cabinet Comptable\n1. Positionnement Google (3 mots-clés PME) — 800 $/mois\n2. Contenu LinkedIn (4 posts/mois) — 400 $/mois\n3. Lead magnet fiscal (guide PDF) — 600 $ one-time\nROI : 1 seul nouveau client = 2 000-5 000 $/an récurrent",
  },
  {
    id: 'gyms-studios',
    emoji: '💪',
    title: 'Gyms & Studios de fitness — Grand Montréal',
    description: "Studios indépendants face aux grandes chaînes. Différenciation par service personnalisé + présence locale.",
    category: 'Sport & Bien-être',
    icp: {
      persona: "Alex, propriétaire d'un studio de yoga à Plateau, 60 membres. Lutte contre Equinox et les apps comme Peloton. Ses membres adorent le studio mais il n'arrive pas à recruter.",
      painPoints: ['Visibilité faible vs les chaînes', "Peu d'avis Google", "Pas de stratégie de rétention numérique"],
      budget: '500 – 1 500 $/mois',
      sector: 'Sport & Fitness',
    },
    scraping: { niches: ['Gym / Fitness', 'Studio yoga / Pilates', 'Salle de danse', 'Physiothérapie / Chiro'], cities: ['Montréal', 'Laval', 'Québec', 'Longueuil'], radius: 8000, sources: ['google', 'yelp'] },
    sequence: [
      { day: 0, channel: 'email', subject: 'Comment un studio de yoga a doublé ses membres en 90 jours', template: "Bonjour {{prenom}},\n\n{{entreprise}} offre quelque chose qu'Equinox ne peut pas : une vraie communauté.\n\nMais si les gens ne vous trouvent pas sur Google, ils vont chez la grande chaîne du coin.\n\nJe vous explique comment cibler exactement les bonnes personnes autour de votre studio. Appel gratuit de 20 min ?" },
    ],
    callScript: "Bonjour [Prénom], mon agence aide les studios de fitness indépendants à attirer des membres qui n'abandonneront pas après 2 mois. On cible les personnes dans votre quartier qui cherchent exactement ce que vous offrez. Vous avez 10 minutes ?",
    proposalTemplate: "PROPOSITION — Croissance Studio Fitness\n1. Google My Business optimisé + avis — 300 $ one-time\n2. Campagne Meta Ads géolocalisée (1 km autour du studio) — 500 $/mois + budget ads\n3. Email nurturing nouveaux membres — 200 $/mois\nTotal : 700 $/mois hors budget pub",
  },
  {
    id: 'serruriers-urgences',
    emoji: '🔑',
    title: 'Serruriers & Urgences dépannage — Montréal',
    description: "Artisans urgentistes sans visibilité locale. La recherche Google décide qui obtient l'appel.",
    category: 'Urgences & Dépannage',
    icp: {
      persona: "Tony, serrurier indépendant, Montréal. Disponible 24/7 mais n'apparaît pas dans le top 3 Google quand quelqu'un est enfermé dehors à 2h du matin.",
      painPoints: ["Absent du top 3 Google pour les mots-clés urgence", "Concurrent mieux référencé capte les appels nuit/weekend", "Aucune présence en ligne structurée"],
      budget: '400 – 1 000 $/mois',
      sector: 'Urgences & Artisans',
    },
    scraping: { niches: ['Serrurier', 'Électricien', 'Plombier'], cities: ['Montréal', 'Laval', 'Longueuil', 'Brossard', 'Saint-Jérôme'], radius: 25000, sources: ['google', 'here'] },
    sequence: [
      { day: 0, channel: 'email', subject: "Urgence lockout à 2h du matin — qui capte l'appel ?", template: "Bonjour {{prenom}},\n\nJ'ai testé \"serrurier urgence Montréal\" sur Google à 2h du matin la semaine passée. Votre nom n'est pas dans les 3 premiers.\n\nCes appels urgence, c'est 80-150 $ chacun. Je peux vous mettre dans le top 3 en 30 jours.\n\nRépond-moi et je t'envoie le plan détaillé gratuitement." },
    ],
    callScript: "Bonjour [Prénom], je fais un test rapide — cherchez 'serrurier urgence [ville]' sur Google maintenant. Vous êtes là ? Non. Ces appels vont chez vos concurrents. 400 $/mois pour être en top 3. Ça paie en moins d'une semaine. On en parle ?",
    proposalTemplate: "PROPOSITION — Top 3 Google Urgences\n1. Optimisation Google My Business urgences — 200 $ one-time\n2. SEO local 'serrurier urgence [ville]' — 400 $/mois\n3. Ads Google (optionnel) — budget ads + 150 $/mois gestion\nROI : 1 appel urgence = 100-150 $, objectif +15 appels/mois",
  },
  {
    id: 'avocats-notaires',
    emoji: '⚖️',
    title: 'Avocats & Notaires — PME et particuliers',
    description: 'Cabinets juridiques sans présence SEO locale. Fort besoin de crédibilité en ligne.',
    category: 'Juridique',
    icp: {
      persona: "Maître Dubois, avocat d'affaires à Montréal, cabinet de 2 avocats. Pas de blog, pas de fiche Google optimisée, 5 avis. Cherche des clients PME pour des contrats récurrents.",
      painPoints: ['Pas de contenu juridique en ligne (perd en autorité)', 'Fiche Google incomplète', 'Concurrence des grandes firmes sur Google'],
      budget: '1 500 – 5 000 $/mois',
      sector: 'Juridique',
    },
    scraping: { niches: ['Avocat', 'Notaire', 'Comptable / CPA'], cities: ['Montréal', 'Québec', 'Gatineau', 'Laval'], radius: 15000, sources: ['google', 'here'] },
    sequence: [
      { day: 0, channel: 'email', subject: 'Vos clients PME vous trouvent-ils sur Google ?', template: "Bonjour Maître {{prenom}},\n\nJ'ai analysé la présence en ligne de {{entreprise}}. Voici ce que j'ai trouvé :\n\n❌ Fiche Google incomplète\n❌ Aucun article de blog (perte d'autorité juridique)\n❌ 5 avis seulement vs 47 pour votre concurrent direct\n\nJe peux changer les trois points en 60 jours.\n\nDisponible pour un appel ?" },
    ],
    callScript: "Bonjour Maître [Nom], j'ai analysé votre présence en ligne et comparé avec 3 cabinets concurrents à [ville]. Ils ont 10x plus d'avis et apparaissent systématiquement avant vous. J'ai une stratégie pour inverser ça. 20 minutes de votre temps ?",
    proposalTemplate: "PROPOSITION — Autorité Digitale Cabinet Juridique\n1. Contenu juridique SEO (2 articles/mois) — 800 $/mois\n2. Optimisation Google My Business + avis — 300 $ one-time\n3. Profil LinkedIn cabinet (4 posts/mois) — 400 $/mois\nTotal : 1 200 $/mois\nROI : 1 nouveau client = 3 000-15 000 $ de valeur vie",
  },
];

export const CATEGORY_COLORS: Record<string, string> = {
  'Santé': 'bg-blue-50 text-blue-700 border-blue-200',
  'Restauration': 'bg-orange-50 text-orange-700 border-orange-200',
  'Artisans': 'bg-stone-100 text-stone-700 border-stone-200',
  'Beauté': 'bg-pink-50 text-pink-700 border-pink-200',
  'Immobilier': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Finance': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'Sport & Bien-être': 'bg-lime-50 text-lime-700 border-lime-200',
  'Urgences & Dépannage': 'bg-red-50 text-red-700 border-red-200',
  'Juridique': 'bg-amber-50 text-amber-700 border-amber-200',
};

export const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-3.5 w-3.5" />,
  call: <Phone className="h-3.5 w-3.5" />,
};

export function PlaybooksRoot() {
  const router = useRouter();
  const { activeWorkspace } = useReach();
  const [activeCategory, setActiveCategory] = useState<string>('Tous');
  const [runs, setRuns] = useState<Array<{ id: string; playbook_id: string; status: string; created_at: string; campaign_id: string }>>([]);
  const [runsLoading, setRunsLoading] = useState(false);

  const categories = ['Tous', ...Array.from(new Set(PLAYBOOKS.map((p) => p.category)))];

  const filtered =
    activeCategory === 'Tous'
      ? PLAYBOOKS
      : PLAYBOOKS.filter((p) => p.category === activeCategory);

  const fetchRuns = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setRunsLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/playbook-runs?workspace_id=${activeWorkspace.id}`));
      if (res.ok) setRuns(await res.json());
    } catch {
      // silent
    } finally {
      setRunsLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => { fetchRuns(); }, [fetchRuns]);

  const handleDeploy = (playbook: Playbook) => {
    router.push(`/playbooks/${playbook.id}`);
  };

  // Count runs per playbook
  const runCountMap: Record<string, number> = {};
  runs.forEach((r) => {
    runCountMap[r.playbook_id] = (runCountMap[r.playbook_id] || 0) + 1;
  });
  const recentRuns = [...runs].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 pb-24 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-[#059669]" />
            <h1 className="text-base font-bold text-[#26251e]">Playbooks</h1>
          </div>
          <p className="text-xs text-[#7a7a76] mt-0.5">
            {PLAYBOOKS.length} stratégies de prospection prêtes à l&apos;emploi — cliquez pour lancer un wizard guidé.
          </p>
        </div>

        {/* Recent runs */}
        {recentRuns.length > 0 && (
          <div className="border border-[#e5e5e0] rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <BarChart2 className="h-3.5 w-3.5 text-[#7a7a76]" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Dernières exécutions</span>
            </div>
            <div className="space-y-1.5">
              {recentRuns.map((run) => {
                const pb = PLAYBOOKS.find((p) => p.id === run.playbook_id);
                return (
                  <div key={run.id} className="flex items-center gap-3 text-xs">
                    <span className="text-base shrink-0">{pb?.emoji ?? '📋'}</span>
                    <span className="flex-1 font-medium text-[#26251e] truncate">{pb?.title ?? run.playbook_id}</span>
                    <span className={cn(
                      'text-[9px] font-bold px-1.5 py-0.5 rounded-full border',
                      run.status === 'done' ? 'text-[#059669] bg-[#059669]/10 border-[#059669]/20' :
                      run.status === 'running' ? 'text-amber-600 bg-amber-50 border-amber-200' :
                      'text-red-600 bg-red-50 border-red-200'
                    )}>
                      {run.status === 'done' ? 'Terminé' : run.status === 'running' ? 'En cours' : 'Erreur'}
                    </span>
                    <span className="text-[10px] text-[#7a7a76] shrink-0 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(run.created_at).toLocaleDateString('fr-CA')}
                    </span>
                    {run.campaign_id && (
                      <Link href={`/campaigns`} className="text-[10px] text-[#059669] underline shrink-0">Campagne</Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category filter */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold border transition-colors',
                activeCategory === cat
                  ? 'bg-[#26251e] text-white border-[#26251e]'
                  : 'bg-white text-[#555552] border-[#e5e5e0] hover:border-[#26251e] hover:text-[#26251e]'
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((pb) => (
            <div
              key={pb.id}
              className="rounded-xl border border-[#e5e5e0] bg-white p-5 space-y-3 hover:border-[#059669]/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-2xl shrink-0 mt-0.5">{pb.emoji}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#26251e] leading-snug">{pb.title}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span
                        className={cn(
                          'inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                          CATEGORY_COLORS[pb.category] ?? 'bg-neutral-100 text-neutral-600 border-neutral-200'
                        )}
                      >
                        {pb.category}
                      </span>
                      {runCountMap[pb.id] > 0 && (
                        <span className="text-[10px] text-[#7a7a76] flex items-center gap-0.5">
                          <Play className="h-2.5 w-2.5" />
                          {runCountMap[pb.id]} run{runCountMap[pb.id] > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#7a7a76] leading-relaxed">{pb.description}</p>

              <div className="text-[10px] text-[#7a7a76]">
                <span className="font-semibold text-[#26251e]">Budget cible :</span>{' '}
                {pb.icp.budget}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => router.push(`/playbooks/${pb.id}/view`)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[#e5e5e0] text-xs font-semibold text-[#555552] hover:bg-[#f4f4f3] hover:text-[#26251e] transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                  Voir les détails
                </button>
                <button
                  onClick={() => handleDeploy(pb)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors"
                >
                  <Play className="h-3.5 w-3.5" />
                  Lancer le wizard
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
