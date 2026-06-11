export interface Note {
  id: string;
  leadId: string;
  type: 'visit' | 'call' | 'email' | 'general';
  content: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  businessName: string;
  contactName: string;
  contactEmail?: string;
  niche: string;
  city: string;
  source: string;
  status: 'New' | 'Contacted' | 'Meeting Booked' | 'Won' | 'Lost';
  temperature: 'Hot' | 'Warm' | 'Cold';
  nextAction: string;
  nextActionDate: string; // ISO date string (YYYY-MM-DD)
  notes: Note[];
  owner: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  category: 'Follow-up' | 'Preparation' | 'General' | 'Meeting';
  dueDate: string;
}

export interface AiSuggestion {
  id: string;
  leadId: string;
  leadName: string;
  actionText: string;
  suggestedChannel: 'Email' | 'DM' | 'Call';
  reasoning: string;
  draftPrompt: string;
}

export const initialLeads: Lead[] = [
  {
    id: "lead-1",
    businessName: "Boulangerie L'Épi d'Or",
    contactName: "Jean Dupont",
    contactEmail: "jean.dupont@epidor.fr",
    niche: "Boulangerie / Artisanat",
    city: "Lyon",
    source: "Recherche Google Maps",
    status: "Contacted",
    temperature: "Hot",
    nextAction: "Appeler pour confirmer le rendez-vous de démo",
    nextActionDate: new Date().toISOString().split('T')[0], // Due today
    owner: "Moi",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    notes: [
      {
        id: "note-1-1",
        leadId: "lead-1",
        type: "visit",
        content: "Visite rapide sur place : Le site web est très daté (pas responsive) et ils n'ont pas de système de commande en ligne. Le gérant est intéressé par une présentation de notre outil Minerva.",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  },
  {
    id: "lead-2",
    businessName: "Garage du Centre",
    contactName: "Michel Martin",
    contactEmail: "m.martin@garagecentre.fr",
    niche: "Automobile",
    city: "Villeurbanne",
    source: "Prospection Physique",
    status: "New",
    temperature: "Warm",
    nextAction: "Envoyer le message d'introduction par email avec l'audit SEO local",
    nextActionDate: new Date().toISOString().split('T')[0], // Due today
    owner: "Moi",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    notes: [
      {
        id: "note-2-1",
        leadId: "lead-2",
        type: "general",
        content: "Pas de fiche Google My Business optimisée, pas d'avis clients récents. Excellent angle d'attaque sur la visibilité locale.",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  },
  {
    id: "lead-3",
    businessName: "Zen & Co Coiffure",
    contactName: "Sophie Bernard",
    contactEmail: "sophie.b@zencoiffure.com",
    niche: "Salon de Coiffure / Beauté",
    city: "Lyon",
    source: "Instagram DM",
    status: "Meeting Booked",
    temperature: "Hot",
    nextAction: "Préparer la présentation sur la gestion de fidélité automatisée",
    nextActionDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Due tomorrow
    owner: "Collaborateur",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    notes: [
      {
        id: "note-3-1",
        leadId: "lead-3",
        type: "call",
        content: "Appel de qualification : Très active sur Instagram mais perd beaucoup de temps à planifier manuellement les rendez-vous par message privé. Rendez-vous fixé pour ce vendredi à 14h.",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  },
  {
    id: "lead-4",
    businessName: "Restaurant Le Bistrot Gourmand",
    contactName: "Antoine Lambert",
    contactEmail: "bistrot.gourmand@orange.fr",
    niche: "Restauration",
    city: "Lyon",
    source: "Recherche Google Maps",
    status: "New",
    temperature: "Cold",
    nextAction: "Passer sur place en fin de service d'après-midi",
    nextActionDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    owner: "Moi",
    createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    notes: []
  },
  {
    id: "lead-5",
    businessName: "Cabinet Dentaire Dr. Laurent",
    contactName: "Dr. Laurent",
    contactEmail: "cabinet.laurent@dentaire-lyon.fr",
    niche: "Santé / Cabinet médical",
    city: "Lyon",
    source: "Recommandation",
    status: "Won",
    temperature: "Hot",
    nextAction: "Contrat signé, initier l'onboarding technique",
    nextActionDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    owner: "Moi",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    notes: [
      {
        id: "note-5-1",
        leadId: "lead-5",
        type: "general",
        content: "Signature du contrat d'accompagnement digital et de mise en place de la suite Minerva. Début du projet le 15 du mois.",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      }
    ]
  }
];

export const initialTasks: Task[] = [
  {
    id: "task-1",
    title: "Appeler Jean Dupont (Boulangerie L'Épi d'Or)",
    completed: false,
    category: "Follow-up",
    dueDate: new Date().toISOString().split('T')[0]
  },
  {
    id: "task-2",
    title: "Rédiger l'audit SEO local pour Michel Martin (Garage du Centre)",
    completed: false,
    category: "Preparation",
    dueDate: new Date().toISOString().split('T')[0]
  },
  {
    id: "task-3",
    title: "Mettre à jour les slides de présentation Minerva Reach",
    completed: true,
    category: "General",
    dueDate: new Date().toISOString().split('T')[0]
  },
  {
    id: "task-4",
    title: "Réunion d'équipe hebdomadaire",
    completed: false,
    category: "Meeting",
    dueDate: new Date().toISOString().split('T')[0]
  }
];

export const initialAiSuggestions: AiSuggestion[] = [
  {
    id: "sug-1",
    leadId: "lead-1",
    leadName: "Boulangerie L'Épi d'Or",
    actionText: "Relancer par SMS pour le créneau de démo proposé hier.",
    suggestedChannel: "Call",
    reasoning: "Jean Dupont a montré un intérêt élevé lors de la visite mais n'a pas encore répondu par mail pour confirmer le créneau.",
    draftPrompt: "Écris un SMS court et chaleureux à Jean pour lui proposer de bloquer le créneau de vendredi matin à 10h pour notre démo Minerva."
  },
  {
    id: "sug-2",
    leadId: "lead-2",
    leadName: "Garage du Centre",
    actionText: "Envoyer un audit de visibilité Google Maps par Email.",
    suggestedChannel: "Email",
    reasoning: "Le garage n'a pas d'avis récents et son concurrent direct à 300m a une note de 4.8 avec 150 avis.",
    draftPrompt: "Rédige un e-mail d'introduction de 3 paragraphes pour Michel Martin. Souligne le manque d'avis récents sur sa fiche Maps par rapport à ses concurrents locaux, et propose une solution simple."
  }
];
