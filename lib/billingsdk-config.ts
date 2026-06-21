export interface Plan {
  id: string;
  title: string;
  description: string;
  highlight?: boolean;
  type?: "monthly" | "yearly";
  currency?: string;
  monthlyPrice: string;
  yearlyPrice: string;
  buttonText: string;
  badge?: string;
  features: {
    name: string;
    icon: string;
    iconColor?: string;
  }[];
}

export interface CurrentPlan {
  plan: Plan;
  type: "monthly" | "yearly" | "custom";
  price?: string;
  nextBillingDate: string;
  paymentMethod: string;
  status: "active" | "inactive" | "past_due" | "cancelled";
}

export const plans: Plan[] = [
  {
    id: "free",
    title: "Gratuit",
    description: "Démarrez votre prospection locale sans engagement.",
    currency: "$",
    monthlyPrice: "0",
    yearlyPrice: "0",
    buttonText: "Plan actuel",
    features: [
      { name: "200 leads / mois", icon: "check", iconColor: "text-emerald-500" },
      { name: "1 workspace", icon: "check", iconColor: "text-emerald-500" },
      { name: "Scraping OSM & Google Maps", icon: "check", iconColor: "text-emerald-500" },
      { name: "IA : chat, email, audit", icon: "check", iconColor: "text-emerald-500" },
      { name: "Pipeline Kanban", icon: "check", iconColor: "text-emerald-500" },
      { name: "Équipe (1 utilisateur)", icon: "minus", iconColor: "text-zinc-400" },
      { name: "Séquences automatisées", icon: "minus", iconColor: "text-zinc-400" },
      { name: "Support prioritaire", icon: "minus", iconColor: "text-zinc-400" },
    ],
  },
  {
    id: "pro",
    title: "Pro",
    description: "Pour les commerciaux terrain qui veulent scaler leur prospection.",
    currency: "$",
    monthlyPrice: "29",
    yearlyPrice: "290",
    buttonText: "Passer au Pro",
    badge: "Le plus populaire",
    highlight: true,
    features: [
      { name: "Leads illimités", icon: "check", iconColor: "text-emerald-500" },
      { name: "3 workspaces", icon: "check", iconColor: "text-emerald-500" },
      { name: "Scraping OSM + Firecrawl", icon: "check", iconColor: "text-emerald-500" },
      { name: "IA avancée (script pitch, enrichissement)", icon: "check", iconColor: "text-emerald-500" },
      { name: "Pipeline + séquences email", icon: "check", iconColor: "text-emerald-500" },
      { name: "Équipe jusqu'à 5 membres", icon: "check", iconColor: "text-emerald-500" },
      { name: "Carte terrain + route planner", icon: "check", iconColor: "text-emerald-500" },
      { name: "Support par email (< 24h)", icon: "check", iconColor: "text-emerald-500" },
    ],
  },
  {
    id: "business",
    title: "Business",
    description: "Pour les équipes avec des besoins avancés et un volume élevé.",
    currency: "$",
    monthlyPrice: "79",
    yearlyPrice: "790",
    buttonText: "Passer au Business",
    features: [
      { name: "Leads illimités", icon: "check", iconColor: "text-emerald-500" },
      { name: "Workspaces illimités", icon: "check", iconColor: "text-emerald-500" },
      { name: "Toutes les sources de scraping", icon: "check", iconColor: "text-emerald-500" },
      { name: "IA premium (agents personnalisés)", icon: "check", iconColor: "text-emerald-500" },
      { name: "Séquences & campagnes illimitées", icon: "check", iconColor: "text-emerald-500" },
      { name: "Équipe illimitée + rôles", icon: "check", iconColor: "text-emerald-500" },
      { name: "Booking links publics", icon: "check", iconColor: "text-emerald-500" },
      { name: "Support prioritaire + onboarding", icon: "check", iconColor: "text-emerald-500" },
    ],
  },
  {
    id: "enterprise",
    title: "Entreprise",
    description: "Pour les grandes organisations avec des besoins sur mesure.",
    currency: "",
    monthlyPrice: "Sur devis",
    yearlyPrice: "Sur devis",
    buttonText: "Nous contacter",
    features: [
      { name: "Tout Business inclus", icon: "check", iconColor: "text-emerald-500" },
      { name: "SLA garanti", icon: "check", iconColor: "text-emerald-500" },
      { name: "SSO / SAML", icon: "check", iconColor: "text-emerald-500" },
      { name: "Déploiement on-premise possible", icon: "check", iconColor: "text-emerald-500" },
      { name: "Intégrations sur mesure", icon: "check", iconColor: "text-emerald-500" },
      { name: "Account manager dédié", icon: "check", iconColor: "text-emerald-500" },
      { name: "Audit & conformité", icon: "check", iconColor: "text-emerald-500" },
      { name: "Support 24/7", icon: "check", iconColor: "text-emerald-500" },
    ],
  },
];

// Demo current plan (Gratuit / essai 14 jours)
export const demoCurrentPlan: CurrentPlan = {
  plan: plans[0],
  type: "monthly",
  price: "0",
  nextBillingDate: "—",
  paymentMethod: "Aucun",
  status: "active",
};
