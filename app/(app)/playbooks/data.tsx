import React from 'react';
import { Mail, Phone } from 'lucide-react';

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
    proposalTemplate: "PROPOSITION — Croissance Restaurant\n1. Gestion de réputation (réponse aux avis) — 250 $/mois\n2. Optimisation fiche Google & SEO local — 300 $/mois\n3. QR code de collecte d'avis sur les tables — 100 $ installation\nTotal : 550 $/mois",
  },
  {
    id: 'salons-beaute-fidelisation',
    emoji: '💅',
    title: 'Salons de coiffure & esthétique — Rive-Sud',
    description: 'Commerces dépendants du trafic local mais sans programme de fidélisation par SMS/Email.',
    category: 'Beauté',
    icp: {
      persona: "Sophie, propriétaire d'un salon de coiffure à Longueuil, 3 chaises de coiffure. Bon flux de clients, mais 50% ne reviennent jamais. Ne collecte pas les coordonnées de ses clients.",
      painPoints: ["Manque de fidélisation client (churn élevé)", "Pas de base de données clients propre", "Créneaux vides en milieu de semaine"],
      budget: '600 – 1 800 $/mois',
      sector: 'Salons & Esthétique',
    },
    scraping: { niches: ['Salon de coiffure', 'Salon d\'esthétique', 'Spa / Massage'], cities: ['Longueuil', 'Brossard', 'Boucherville', 'Saint-Hubert'], radius: 10000, sources: ['google', 'here'] },
    sequence: [
      { day: 0, channel: 'email', subject: 'Comment remplir vos créneaux vides le mardi et mercredi', template: "Bonjour {{prenom}},\n\nLes salons de coiffure perdent en moyenne 15-20% de leur chiffre d'affaires à cause des créneaux vides en milieu de semaine.\n\nEn mettant en place un système simple de relance automatique par SMS pour les clients qui ne sont pas venus depuis 6 semaines, vous pouvez récupérer ces revenus.\n\nEst-ce que ça vous intéresse d'avoir le plan d'action ?\n\n{{signature}}" },
    ],
    callScript: "Bonjour [Prénom], j'aide les salons à automatiser leur fidélisation. J'ai mis en place un système qui relance les clients inactifs pour remplir les mardis après-midi. Ça prend 1 heure à installer et génère 800-1200 $ de plus par mois. Je peux vous montrer comment ça marche ?",
    proposalTemplate: "PROPOSITION — Relance Clients Automatique\n1. Création base de données & RGPD — 200 $ one-time\n2. Campagne SMS/Email automatisée — 300 $/mois\n3. Offres spéciales créneaux creux — inclus\nTotal : 300 $/mois",
  },
  {
    id: 'plombiers-seo-local',
    emoji: '🔧',
    title: 'Plombiers & Entrepreneurs généraux — Rive-Nord',
    description: 'Services à domicile avec un fort panier moyen mais absents des recherches de proximité.',
    category: 'Artisans',
    icp: {
      persona: "Jean, plombier à Laval, 2 camions. Excellent service, vit du bouche-à-oreille mais souhaite scaler. Ne sait pas comment se positionner devant les gros agrégateurs sur Google.",
      painPoints: ['Bouche-à-oreille insuffisant pour saturer 2 camions', 'Absence du top 3 Google local', 'Concurrents achètent des leads chers'],
      budget: '1 000 – 3 000 $/mois',
      sector: 'Services résidentiels',
    },
    scraping: { niches: ['Plombier', 'Électricien', 'Excavation / Paysagiste', 'Couvreur / Toiture'], cities: ['Laval', 'Terrebonne', 'Saint-Eustache', 'Blainville'], radius: 20000, sources: ['google', 'here'] },
    sequence: [
      { day: 0, channel: 'email', subject: "Vos camions roulent-ils à pleine capacité à Laval ?", template: "Bonjour {{prenom}},\n\nChaque jour, des dizaines de propriétaires à Laval cherchent un plombier en urgence sur Google. Si vous n'êtes pas dans le top 3, vous donnez ces contrats à vos concurrents.\n\nJ'ai analysé votre site et j'ai trouvé 2 modifications simples à faire sur votre fiche Google Maps pour passer devant [Concurrent].\n\nOn s'appelle 10 minutes pour que je vous montre ?\n\n{{signature}}" },
    ],
    callScript: "Bonjour [Prénom], je travaille avec des entrepreneurs en rénovation et plomberie pour générer des appels directs sans passer par des sites de leads qui prennent 50 $ par contact. On optimise votre référencement Google pour que les clients vous appellent en premier. Vous êtes disponible cette semaine ?",
    proposalTemplate: "PROPOSITION — Pack Référencement Artisan\n1. Optimisation profil Google Maps (fiche GMB) — 400 $ one-time\n2. Création de pages de services locales (Laval, Blainville, etc.) — 600 $/mois\n3. Gestion de réputation et avis — 200 $/mois\nTotal : 800 $/mois",
  },
  {
    id: 'courtier-immo-ads',
    emoji: '🏠',
    title: 'Courtiers immobiliers — Génération de listings',
    description: 'Courtiers immobiliers autonomes cherchant à obtenir des mandats de vente exclusifs.',
    category: 'Immobilier',
    icp: {
      persona: "Karine, courtier immobilier à Montréal (Remax), 3 ans d'expérience. Fait beaucoup de cold calling et de porte-à-porte, cherche un canal prévisible pour obtenir des mandats de vente.",
      painPoints: ['Prospection terrain épuisante', 'Marché très concurrentiel', 'Besoin de listings vendeurs exclusifs'],
      budget: '1 200 – 3 500 $/mois',
      sector: 'Immobilier / Courtage',
    },
    scraping: { niches: ['Courtier immobilier', 'Agence immobilière'], cities: ['Montréal', 'Brossard', 'Sherbrooke', 'Québec'], radius: 15000, sources: ['google', 'here'] },
    sequence: [
      { day: 0, channel: 'email', subject: 'Comment générer 3 nouveaux mandats de vente par mois en automatique', template: "Bonjour {{prenom}},\n\nLe cold calling et les dépliants dans les boîtes aux lettres prennent un temps fou pour un retour minime.\n\nNous avons développé un système de publicité ciblée sur Facebook qui attire uniquement les propriétaires qui souhaitent vendre leur maison dans les 90 prochains jours.\n\nEst-ce que vous auriez 15 minutes pour voir notre étude de cas ?\n\n{{signature}}" },
    ],
    callScript: "Bonjour Karine, je vous contacte car j'accompagne les courtiers à automatiser leur entrée de mandats. Contrairement aux agences traditionnelles, on met en place un tunnel de capture d'adresses pour des évaluations gratuites en ligne. Ça vous intéresse de voir comment ça marche ?",
    proposalTemplate: "PROPOSITION — Tunnel Vendeurs Immo\n1. Setup de la landing page d'évaluation — 500 $ one-time\n2. Gestion des campagnes publicitaires Facebook/Google — 800 $/mois\nTotal : 800 $/mois + budget publicitaire minimum de 600 $/mois",
  },
  {
    id: 'comptables-cpa-fiduciaires',
    emoji: '📈',
    title: 'Cabinets comptables & Fiscalité — Saison des impôts',
    description: 'Cabinets locaux cherchant à acquérir des clients corporatifs à haute valeur avant la fin fiscale.',
    category: 'Finance',
    icp: {
      persona: "Luc, comptable agréé (CPA), cabinet de 3 personnes à Sherbrooke. Surtout des clients particuliers, souhaite migrer vers une clientèle de PME et de fiscalité corporative.",
      painPoints: ["Dépendance aux impôts de particuliers (faible marge)", "Manque de visibilité auprès des entrepreneurs locaux", "Site web corporatif austère et non convertisseur"],
      budget: '1 000 – 2 500 $/mois',
      sector: 'Comptabilité / CPA',
    },
    scraping: { niches: ['Comptable / CPA', 'Fiscaliste', 'Planificateur financier'], cities: ['Sherbrooke', 'Trois-Rivières', 'Drummondville'], radius: 20000, sources: ['google', 'here'] },
    sequence: [
      { day: 0, channel: 'email', subject: 'Générez-vous assez de clients corporatifs (PME) pour votre cabinet ?', template: "Bonjour {{prenom}},\n\nLa saison des impôts des particuliers approche, mais vous savez aussi bien que moi que la vraie valeur réside dans les tenues de livres corporatives récurrentes.\n\nJ'ai optimisé le positionnement de cabinets comptables pour attirer des PME locales sur Google. Est-ce que vous seriez disponible pour un court appel exploratoire ?\n\n{{signature}}" },
    ],
    callScript: "Bonjour [Prénom], j'aide les cabinets comptables à signer des mandats de tenue de livres avec des PME locales. On remplace votre site statique par une machine d'acquisition de leads corporatifs. Est-ce que vous seriez ouvert à un échange de 10 minutes ?",
    proposalTemplate: "PROPOSITION — Acquisition Clients Corpo\n1. Refonte de site web orientée PME — 1 500 $ one-time\n2. SEO Local & Campagne Google Search 'comptable entreprise' — 700 $/mois\nTotal : 700 $/mois + création de site",
  },
  {
    id: 'gyms-studios-fitness',
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
    proposalTemplate: "PROPOSITION — Cour du Soir Cabinet Juridique\n1. Contenu juridique SEO (2 articles/mois) — 800 $/mois\n2. Optimisation Google My Business + avis — 300 $ one-time\n3. Profil LinkedIn cabinet (4 posts/mois) — 400 $/mois\nTotal : 1 200 $/mois\nROI : 1 nouveau client = 3 000-15 000 $ de valeur vie",
  },
];

export const CATEGORY_COLORS: Record<string, string> = {
  'Santé': 'bg-blue-50 text-blue-700 border-blue-200',
  'Restauration': 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
