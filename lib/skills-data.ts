// Built-in AI Skills — instructions that extend the assistant's capabilities.
// A "skill" injects its `instructions` into the assistant's system prompt when
// selected via the chat @ menu. Skills are grouped into department "packs".

export interface Skill {
  id: string;
  name: string;
  description: string;
  instructions: string;
  pack: string;        // department / pack label
  builtIn: boolean;
}

export interface SkillPack {
  id: string;
  name: string;
  description: string;
  skills: Skill[];
}

// Helper to define a built-in skill concisely
const s = (id: string, name: string, description: string, instructions: string, pack: string): Skill => ({
  id, name, description, instructions, pack, builtIn: true,
});

export const SKILL_PACKS: SkillPack[] = [
  {
    id: 'sales',
    name: 'Ventes',
    description: 'Préparer des appels, rédiger des relances, gérer le pipeline.',
    skills: [
      s('sales-cold-email', 'Email à froid', 'Rédige des emails de prospection percutants.', "Tu es expert en prospection B2B. Rédige des emails à froid courts, personnalisés, avec une accroche, une proposition de valeur claire et un call-to-action unique. Évite le jargon.", 'Ventes'),
      s('sales-followup', 'Relance', 'Crée des séquences de relance polies et efficaces.', "Tu rédiges des relances commerciales : rappelle le contexte, apporte une nouvelle valeur, propose un créneau précis. Ton professionnel et concis.", 'Ventes'),
      s('sales-call-script', "Script d'appel", 'Génère un script de découverte/closing.', "Tu génères des scripts d'appel structurés : ouverture, questions de découverte (BANT), traitement des objections, proposition et prise de RDV. En français naturel.", 'Ventes'),
    ],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    description: 'Voix de marque, campagnes, contenus et mesure.',
    skills: [
      s('mkt-social', 'Post réseaux sociaux', 'Rédige des posts engageants par plateforme.', "Tu rédiges des posts pour réseaux sociaux adaptés à la plateforme (LinkedIn, Instagram, X). Accroche forte, valeur, CTA, hashtags pertinents.", 'Marketing'),
      s('mkt-landing', 'Page de destination', 'Structure une landing page qui convertit.', "Tu structures des landing pages : titre bénéfice, sous-titre, preuves sociales, fonctionnalités orientées bénéfices, CTA répétés.", 'Marketing'),
    ],
  },
  {
    id: 'product',
    name: 'Produit',
    description: 'Specs, roadmaps et synthèses de retours utilisateurs.',
    skills: [
      s('prod-spec', 'Spécification produit', "Rédige une spec claire d'une fonctionnalité.", "Tu rédiges des spécifications produit : problème, utilisateurs cibles, user stories, critères d'acceptation, cas limites, métriques de succès.", 'Produit'),
      s('prod-feedback', 'Synthèse de retours', 'Synthétise des retours utilisateurs en thèmes.', "Tu synthétises des retours utilisateurs : regroupe par thème, quantifie, identifie les irritants majeurs et propose des priorités.", 'Produit'),
    ],
  },
  {
    id: 'data',
    name: 'Données',
    description: 'Analyses, visualisations et requêtes.',
    skills: [
      s('data-viz', 'Visualisation de données', 'Recommande la bonne visualisation et la décrit.', "Tu conseilles des visualisations de données : choisis le bon type de graphique selon la question, décris les axes/séries, et résume l'insight principal.", 'Données'),
      s('data-analysis', 'Analyse de variance', 'Analyse des écarts et tendances.', "Tu analyses des données chiffrées : tendances, écarts, corrélations plausibles, et recommandations actionnables. Sois rigoureux et prudent sur la causalité.", 'Données'),
    ],
  },
  {
    id: 'ops',
    name: 'Opérations',
    description: 'Process, comptes-rendus et automatisations.',
    skills: [
      s('ops-meeting', 'Compte-rendu de réunion', 'Transforme des notes en compte-rendu structuré.', "Tu transformes des notes de réunion en compte-rendu : décisions, actions (responsable + échéance), points en suspens. Format clair et bref.", 'Opérations'),
      s('ops-sop', 'Procédure (SOP)', 'Rédige une procédure opératoire standard.', "Tu rédiges des SOP : objectif, prérequis, étapes numérotées, points de contrôle, et cas d'erreur.", 'Opérations'),
    ],
  },
  {
    id: 'support',
    name: 'Support client',
    description: 'Réponses, onboarding et rétention.',
    skills: [
      s('cs-reply', 'Réponse support', 'Rédige des réponses empathiques et précises.', "Tu rédiges des réponses de support client : accuse réception, empathie, solution claire étape par étape, et proposition de suivi. Ton chaleureux et pro.", 'Support client'),
      s('cs-onboarding', 'Onboarding client', "Crée un plan d'onboarding client.", "Tu conçois des plans d'onboarding client : objectifs des 30/60/90 jours, jalons, ressources et points de contact.", 'Support client'),
    ],
  },
];

export const ALL_BUILTIN_SKILLS: Skill[] = SKILL_PACKS.flatMap(p => p.skills);

export function findSkill(id: string): Skill | undefined {
  return ALL_BUILTIN_SKILLS.find(sk => sk.id === id);
}
