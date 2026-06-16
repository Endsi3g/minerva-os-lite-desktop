export interface GuideStep {
  title: string;
  description: string;
}

export interface HelpGuide {
  slug: string;
  title: string;
  duration: string;
  level: 'Débutant' | 'Intermédiaire' | 'Avancé';
  description: string;
  steps: GuideStep[];
}

export const HELP_GUIDES: HelpGuide[] = [
  {
    slug: 'premiere-campagne',
    title: 'Lancer votre première campagne de prospection locale',
    duration: '5 min',
    level: 'Débutant',
    description: 'Créez un workspace, définissez votre zone géographique et lancez votre premier scraping de leads.',
    steps: [
      {
        title: 'Créer ou choisir un workspace',
        description: 'Dans le menu latéral, ouvrez le sélecteur de workspace et créez-en un nouveau (ex: "Prospection Montréal"). Chaque workspace isole ses propres leads, tâches et pipelines.',
      },
      {
        title: 'Configurer vos niches et villes cibles',
        description: 'Allez dans Paramètres → Prospection. Ajoutez les niches d\'activité que vous ciblez (ex: Boulangerie, Coiffure & Beauté) et les villes à scraper (ex: Montréal, Laval).',
      },
      {
        title: 'Lancer un scraping',
        description: 'Rendez-vous sur la page Prospection et lancez une recherche. Minerva interroge Google Maps ou OpenStreetMap selon votre configuration et insère les nouveaux commerces trouvés comme leads "nouveau".',
      },
      {
        title: 'Suivre les leads dans le pipeline',
        description: 'Ouvrez Pipeline pour visualiser vos leads sous forme de Kanban (Nouveau → Contacté → RDV → Signé) et commencer à les qualifier.',
      },
    ],
  },
  {
    slug: 'pipeline-kanban',
    title: 'Gérer vos prospects dans le pipeline Kanban',
    duration: '4 min',
    level: 'Débutant',
    description: 'Organisez vos leads par statut (Nouveau → Contacté → RDV → Signé) avec le vue Kanban.',
    steps: [
      {
        title: 'Ouvrir la vue Pipeline',
        description: 'Le menu latéral donne accès à la page Pipeline, qui affiche vos leads sous forme de colonnes par statut.',
      },
      {
        title: 'Déplacer un lead entre les colonnes',
        description: 'Glissez-déposez une carte de lead d\'une colonne à l\'autre pour faire avancer son statut (Nouveau → Contacté → RDV → Signé). Le changement est synchronisé immédiatement.',
      },
      {
        title: 'Basculer entre vue Kanban et vue Table',
        description: 'Utilisez le sélecteur de vue en haut de la page pour passer à une vue tableau si vous préférez trier et filtrer vos leads en liste plutôt qu\'en colonnes.',
      },
      {
        title: 'Ouvrir la fiche détaillée d\'un lead',
        description: 'Cliquez sur une carte pour ouvrir sa fiche complète : coordonnées, notes, tâches, audit IA et historique d\'échanges.',
      },
    ],
  },
  {
    slug: 'workspace-equipe',
    title: 'Configurer un workspace d\'équipe avec rôles et permissions',
    duration: '7 min',
    level: 'Intermédiaire',
    description: 'Invitez des collaborateurs, définissez les rôles et suivez l\'activité en temps réel.',
    steps: [
      {
        title: 'Ouvrir la page Équipe',
        description: 'Le menu latéral donne accès à la page Équipe, qui liste les membres déjà invités dans le workspace actif.',
      },
      {
        title: 'Inviter un collaborateur',
        description: 'Cliquez sur "Inviter un membre", saisissez son adresse email et choisissez un rôle : admin (gestion complète), éditeur (modifie les leads/tâches) ou lecteur (consultation seule).',
      },
      {
        title: 'Comprendre les permissions par rôle',
        description: 'Seuls les propriétaires de workspace et les membres admin peuvent inviter de nouveaux membres ou changer les rôles existants. Les éditeurs et lecteurs ne voient que les données du workspace auquel ils appartiennent.',
      },
      {
        title: 'Suivre l\'utilisation de l\'équipe',
        description: 'La page Facturation affiche les limites d\'utilisation et de dépenses associées à votre forfait pour l\'ensemble des membres du workspace.',
      },
    ],
  },
  {
    slug: 'email-ia',
    title: 'Générer et envoyer des emails de prospection avec l\'IA',
    duration: '6 min',
    level: 'Intermédiaire',
    description: 'Utilisez la génération IA pour produire des emails personnalisés et les envoyer via Gmail.',
    steps: [
      {
        title: 'Connecter Gmail',
        description: 'Allez dans Intégrations → Gmail → "Se connecter" pour autoriser Minerva à envoyer des emails depuis votre compte via OAuth Google. Aucun mot de passe n\'est stocké.',
      },
      {
        title: 'Générer un brouillon depuis une fiche lead',
        description: 'Ouvrez un lead, puis utilisez le bouton de génération de brouillon. L\'IA produit un email personnalisé en fonction du profil du commerce et du ton défini dans Paramètres → IA.',
      },
      {
        title: 'Relire et ajuster le brouillon',
        description: 'Le brouillon généré reste éditable avant envoi — ajustez le ton, ajoutez des détails spécifiques au prospect, puis validez.',
      },
      {
        title: 'Envoyer l\'email',
        description: 'Cliquez sur "Envoyer" pour que Minerva transmette le message via l\'API Gmail connectée. L\'envoi est enregistré dans l\'historique de la fiche lead.',
      },
    ],
  },
  {
    slug: 'agents-ia',
    title: 'Configurer un agent IA personnalisé',
    duration: '8 min',
    level: 'Avancé',
    description: 'Créez des agents spécialisés avec votre propre ton et style de prospection.',
    steps: [
      {
        title: 'Ouvrir la page Agents',
        description: 'Le menu latéral donne accès à la page Agents, qui liste les agents IA disponibles dans votre workspace.',
      },
      {
        title: 'Créer un nouvel agent',
        description: 'Cliquez sur "Créer un agent", donnez-lui un nom et une description qui reflètent son rôle (ex: "Closer immobilier", "Audit SEO restauration").',
      },
      {
        title: 'Définir le ton et le style',
        description: 'Configurez le ton de l\'agent (Calme & Conseil, Direct & Closer, Storytelling) et son niveau de personnalisation depuis Paramètres → IA, ou directement dans la fiche de l\'agent.',
      },
      {
        title: 'Utiliser l\'agent dans le chat',
        description: 'Depuis la page Chat, sélectionnez votre agent personnalisé pour que ses réponses et brouillons générés respectent le style configuré.',
      },
    ],
  },
  {
    slug: 'export-drive',
    title: 'Exporter vos rapports vers Google Drive',
    duration: '3 min',
    level: 'Débutant',
    description: 'Exportez des audits PDF directement dans votre Google Drive depuis la fiche prospect.',
    steps: [
      {
        title: 'Connecter Google Drive',
        description: 'Allez dans Intégrations → Google Drive → "Se connecter" pour autoriser l\'accès via OAuth Google.',
      },
      {
        title: 'Générer un audit sur une fiche lead',
        description: 'Ouvrez la fiche d\'un lead et générez un audit SEO ou un rapport de prospection via l\'IA.',
      },
      {
        title: 'Exporter vers Drive',
        description: 'Depuis la fiche lead, utilisez le bouton d\'export Google Drive pour envoyer le rapport au format PDF directement dans votre Drive connecté.',
      },
      {
        title: 'Retrouver l\'export',
        description: 'L\'action d\'export est journalisée dans les notes de la fiche lead, avec un lien vers le fichier déposé dans Drive.',
      },
    ],
  },
];

export function getHelpGuide(slug: string): HelpGuide | undefined {
  return HELP_GUIDES.find((guide) => guide.slug === slug);
}
