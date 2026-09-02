export type ComposerChannel = 'email' | 'linkedin' | 'sms' | 'call';
export type ComposerViewMode = 'editor' | 'preview' | 'split';
export type TemplateCategory = 'all' | 'cold' | 'relance' | 'linkedin' | 'valeur' | 'custom';

export interface DynamicVariable {
  token: string;
  label: string;
  description: string;
  category: 'prospect' | 'signal' | 'sender';
  fallbackExample: string;
}

export interface CuratedTemplate {
  id: string;
  title: string;
  category: 'cold' | 'relance' | 'linkedin' | 'valeur';
  channel: ComposerChannel;
  subject?: string;
  body: string;
  tags: string[];
  description: string;
}

export interface StoredEmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  tags?: string[];
  created_at?: string;
}

export const DYNAMIC_VARIABLES: DynamicVariable[] = [
  // Prospect variables
  { token: '{{prenom}}', label: 'Prénom', description: 'Prénom du contact ou nom entreprise', category: 'prospect', fallbackExample: 'Alexandre' },
  { token: '{{nom}}', label: 'Nom de famille', description: 'Nom complet ou de famille', category: 'prospect', fallbackExample: 'Dupont' },
  { token: '{{entreprise}}', label: 'Entreprise', description: 'Raison sociale de la structure', category: 'prospect', fallbackExample: 'Apex Digital' },
  { token: '{{poste}}', label: 'Poste / Titre', description: 'Fonction du décideur (ex: DG)', category: 'prospect', fallbackExample: 'Directeur Général' },
  { token: '{{ville}}', label: 'Ville', description: 'Ville d\'implantation principale', category: 'prospect', fallbackExample: 'Bordeaux' },
  { token: '{{secteur}}', label: 'Secteur d\'activité', description: 'Niche / Marché métier', category: 'prospect', fallbackExample: 'Immobilier' },
  { token: '{{telephone}}', label: 'Téléphone', description: 'Numéro direct ou standard', category: 'prospect', fallbackExample: '06 12 34 56 78' },
  { token: '{{site_web}}', label: 'Site web', description: 'URL du site de l\'entreprise', category: 'prospect', fallbackExample: 'https://apex-digital.fr' },
  { token: '{{adresse}}', label: 'Adresse physique', description: 'Adresse postale complète', category: 'prospect', fallbackExample: '12 rue de la Paix' },
  
  // Intelligence & Signals
  { token: '{{signal_affaires}}', label: 'Signal d\'affaires', description: 'Actualité, croissance ou avis', category: 'signal', fallbackExample: 'Recrutement commercial en cours' },
  { token: '{{score}}', label: 'Score d\'intérêt', description: 'Score de qualification CRM (0-100)', category: 'signal', fallbackExample: '92' },
  { token: '{{avis_google}}', label: 'Nombre d\'avis', description: 'Volume total d\'avis Google Maps', category: 'signal', fallbackExample: '48 avis' },
  { token: '{{note_google}}', label: 'Note Google', description: 'Note moyenne des avis', category: 'signal', fallbackExample: '4.9★' },
  { token: '{{deal_montant}}', label: 'Montant opportunité', description: 'Valeur du deal estimé en €', category: 'signal', fallbackExample: '4 500 €' },

  // Sender variables
  { token: '{{mon_prenom}}', label: 'Mon prénom', description: 'Votre prénom utilisateur', category: 'sender', fallbackExample: 'Kael' },
  { token: '{{mon_nom}}', label: 'Mon nom', description: 'Votre nom complet', category: 'sender', fallbackExample: 'Belceus' },
  { token: '{{mon_entreprise}}', label: 'Mon agence/société', description: 'Nom de votre entreprise', category: 'sender', fallbackExample: 'Minerva OS' },
  { token: '{{signature}}', label: 'Signature', description: 'Bloc signature officiel', category: 'sender', fallbackExample: 'Kael Belceus — Minerva OS' },
  { token: '{{mon_calendrier}}', label: 'Lien Calendrier', description: 'Lien de prise de RDV / agenda', category: 'sender', fallbackExample: 'https://cal.com/minerva' },
];

export const CURATED_TEMPLATES: CuratedTemplate[] = [
  // COLD OUTREACH
  {
    id: 'cold-diagnostic',
    title: 'Diagnostic & Opportunité',
    category: 'cold',
    channel: 'email',
    subject: 'Question stratégique pour {{entreprise}}',
    body: `Bonjour {{prenom}},

En analysant la visibilité de {{entreprise}} à {{ville}}, j'ai remarqué une belle dynamique mais également une opportunité majeure d'accélération sur le secteur {{secteur}}.

Nous avons récemment aidé un confrère à générer +35% de leads qualifiés en 30 jours sans complexité supplémentaire.

Seriez-vous ouvert à un échange informel de 10 minutes ce jeudi pour voir comment répliquer cette méthode pour {{entreprise}} ?

Bien à vous,
{{mon_prenom}}
{{signature}}`,
    tags: ['Cold outreach', 'Diagnostic', 'Opportunité'],
    description: 'Accroche personnalisée basée sur la ville et le secteur avec proposition de valeur claire.',
  },
  {
    id: 'cold-conseil',
    title: 'Approche Conseil & Valeur Immédiate',
    category: 'cold',
    channel: 'email',
    subject: 'Idée concrète pour {{entreprise}} (secteur {{secteur}})',
    body: `Bonjour {{prenom}},

Je suis de près les acteurs innovants de {{ville}} et le positionnement de {{entreprise}} a tout de suite attiré mon attention.

J'ai compilé une courte synthèse des 3 leviers d'acquisition les plus rentables actuellement dans le secteur {{secteur}}.

Souhaitez-vous que je vous l'envoie directement par email ?

Excellente journée,
{{mon_prenom}}
{{signature}}`,
    tags: ['Cold outreach', 'Conseil', 'Ressource'],
    description: 'Offre une ressource à haute valeur ajoutée sans forcer la vente.',
  },
  {
    id: 'cold-provocant',
    title: 'Question Directe & Pain-Point',
    category: 'cold',
    channel: 'email',
    subject: '{{prenom}} — votre acquisition client chez {{entreprise}}',
    body: `Bonjour {{prenom}},

Une question directe : comment qualifiez-vous vos nouvelles opportunités chez {{entreprise}} lorsque les canaux traditionnels saturent ?

Nous mettons en place des systèmes de prospection automatisés et sur-mesure pour les dirigeants de {{secteur}}.

Avez-vous 5 minutes à m'accorder pour vous partager nos derniers chiffres ?

Cordialement,
{{signature}}`,
    tags: ['Cold outreach', 'Direct', 'Closing'],
    description: 'Format court et percutant qui interpelle le décideur sur un point bloquant.',
  },
  {
    id: 'cold-signal',
    title: 'Félicitations & Signal d\'Affaires',
    category: 'cold',
    channel: 'email',
    subject: 'Bravo pour le développement de {{entreprise}}',
    body: `Bonjour {{prenom}},

Félicitations pour le dynamisme de {{entreprise}} à {{ville}} ! {{signal_affaires}}

Quand une entreprise de {{secteur}} grandit à ce rythme, la fluidité de la prise de contact commerciale devient le facteur clé de succès.

Si vous souhaitez découvrir comment optimiser votre pipeline, faites-moi signe.

Bien cordialement,
{{mon_prenom}}`,
    tags: ['Cold outreach', 'Signal d\'affaires', 'Icebreaker'],
    description: 'Icebreaker puissant basé sur les signaux d\'affaires détectés par le CRM.',
  },

  // RELANCE
  {
    id: 'relance-j3-valeur',
    title: 'Relance J+3 — Cas Concret',
    category: 'relance',
    channel: 'email',
    subject: 'Re: Question stratégique pour {{entreprise}}',
    body: `Bonjour {{prenom}},

Je me permets de faire suite à mon message précédent. Je sais que vos journées chez {{entreprise}} sont bien remplies.

Pour illustrer concrètement mon propos, voici une étude de cas récente menée dans le secteur {{secteur}} qui montre un ROI mesurable en 3 semaines.

Seriez-vous disponible 10 min cette semaine (mardi ou jeudi matin) pour un point rapide ?

Bien à vous,
{{mon_prenom}}`,
    tags: ['Relance', 'J+3', 'Cas client'],
    description: 'Relance douce apportant une preuve sociale supplémentaire.',
  },
  {
    id: 'relance-j7-rapide',
    title: 'Relance J+7 — Question 30s',
    category: 'relance',
    channel: 'email',
    subject: 'Point rapide sur {{entreprise}} ?',
    body: `Bonjour {{prenom}},

Avez-vous eu l'opportunité de jeter un œil à ma précédente note concernant {{entreprise}} ?

Si ce n'est pas le sujet prioritaire du moment, aucun souci : dites-moi simplement si vous préférez que l'on se reparle au trimestre prochain.

Merci pour votre retour,
{{mon_prenom}}`,
    tags: ['Relance', 'J+7', 'Court'],
    description: 'Message de relance minimaliste facilitant une réponse rapide en 1 ligne.',
  },
  {
    id: 'relance-breakup',
    title: 'Relance Break-up Courtoise',
    category: 'relance',
    channel: 'email',
    subject: 'Dernier message — priorité pour {{entreprise}}',
    body: `Bonjour {{prenom}},

Sans retour de votre part, je suppose que l'optimisation commerciale n'est pas votre priorité actuelle pour {{entreprise}} à {{ville}}, ce que je comprends parfaitement.

Je ne vous relancerai plus. Si le sujet redevient d'actualité, vous pouvez réserver un créneau directement ici : {{mon_calendrier}}.

Je vous souhaite une excellente continuation.

Bien sincèrement,
{{mon_prenom}}
{{signature}}`,
    tags: ['Relance', 'Break-up', 'Urgence'],
    description: 'Le break-up email génère souvent le taux de réponse le plus élevé par désengagement élégant.',
  },
  {
    id: 'relance-reactivation',
    title: 'Relance Réactivation après silence',
    category: 'relance',
    channel: 'email',
    subject: 'Nouvelle perspective pour {{entreprise}}',
    body: `Bonjour {{prenom}},

Le marché de {{secteur}} évolue vite ces derniers mois à {{ville}}.

Nous venons de déployer une nouvelle stratégie d'approche directe particulièrement adaptée à {{entreprise}}.

Seriez-vous partant pour réévaluer le sujet ensemble autour d'un café virtuel ?

À très vite,
{{mon_prenom}}`,
    tags: ['Relance', 'Réactivation', 'Cold lead'],
    description: 'Réengage un prospect silencieux depuis plusieurs mois avec une actualité fraîche.',
  },

  // LINKEDIN
  {
    id: 'linkedin-invit-custom',
    title: 'Demande de Connexion Ciblée (< 300 car.)',
    category: 'linkedin',
    channel: 'linkedin',
    subject: 'Connexion LinkedIn',
    body: `Bonjour {{prenom}}, ravi de découvrir votre profil et l'activité de {{entreprise}} à {{ville}}. J'échange régulièrement avec des dirigeants du secteur {{secteur}} et serais ravi d'ajouter votre expertise à mon réseau !`,
    tags: ['LinkedIn', 'Invitation', 'Réseau'],
    description: 'Note d\'invitation LinkedIn concise, courtoise et sous la limite des 300 caractères.',
  },
  {
    id: 'linkedin-after-accept',
    title: 'Message après Acceptation',
    category: 'linkedin',
    channel: 'linkedin',
    subject: 'Merci pour la connexion',
    body: `Merci pour la connexion {{prenom}} !

Je suis avec attention le développement de {{entreprise}} à {{ville}}.

Au plaisir d'échanger sur vos enjeux actuels dans le secteur {{secteur}} si l'occasion se présente.

Bonne semaine à vous !`,
    tags: ['LinkedIn', 'Post-Acceptation', 'Relation'],
    description: 'Message de bienvenue poli sans pitch agressif immédiat pour créer la relation.',
  },
  {
    id: 'linkedin-post-rebound',
    title: 'Rebond sur Publication / Actualité',
    category: 'linkedin',
    channel: 'linkedin',
    subject: 'Rebond sur votre post',
    body: `Bonjour {{prenom}},

Votre récente publication sur le secteur {{secteur}} était très inspirante, notamment votre vision pour {{entreprise}}.

Nous accompagnons justement plusieurs acteurs à {{ville}} sur des défis similaires. Seriez-vous ouvert à confronter nos retours d'expérience lors d'un court appel ?`,
    tags: ['LinkedIn', 'Rebond', 'Social Selling'],
    description: 'Accroche contextuelle basée sur l\'activité LinkedIn du prospect.',
  },

  // PROPOSITION DE VALEUR
  {
    id: 'valeur-roi-2lignes',
    title: 'Pitch ROI en 2 Phrases',
    category: 'valeur',
    channel: 'email',
    subject: 'Accélérer la croissance de {{entreprise}}',
    body: `Bonjour {{prenom}},

Notre mission chez {{mon_entreprise}} : permettre à {{entreprise}} d'obtenir un flux constant de rendez-vous qualifiés dans le secteur {{secteur}} sans y passer plus de 15 minutes par semaine.

Nos clients à {{ville}} constatent en moyenne un retour sur investissement x4 dès le premier mois.

Discutons-en 10 minutes cette semaine : {{mon_calendrier}}.

Bien à vous,
{{signature}}`,
    tags: ['Proposition de valeur', 'Pitch ROI', 'Conversion'],
    description: 'Clarté maximale axée sur le résultat chiffré et le gain de temps.',
  },
  {
    id: 'valeur-etude-cas',
    title: 'Étude de Cas Similaire Chiffrée',
    category: 'valeur',
    channel: 'email',
    subject: 'Cas client : +42% de closing pour un acteur de {{secteur}}',
    body: `Bonjour {{prenom}},

Comme {{entreprise}}, notre client faisait face au défi de capter des décideurs qualifiés à {{ville}}.

En appliquant notre méthodologie ciblée, ils ont signé 6 nouveaux contrats en 4 semaines.

Souhaitez-vous découvrir les détails de cette implémentation appliquée à votre structure ?

À votre disposition,
{{mon_prenom}}
{{signature}}`,
    tags: ['Proposition de valeur', 'Étude de cas', 'Preuve sociale'],
    description: 'Apporte une preuve irréfutable et suscite la curiosité sans survendre.',
  },
  {
    id: 'valeur-audit-offert',
    title: 'Audit Stratégique Offert (15 min)',
    category: 'valeur',
    channel: 'email',
    subject: 'Audit commercial offert pour {{entreprise}}',
    body: `Bonjour {{prenom}},

Je vous propose un audit express et 100% offert de votre présence et de votre approche commerciale pour {{entreprise}}.

En 15 minutes, nous identifierons 3 actions concrètes à fort impact pour votre marché {{secteur}} à {{ville}}.

Réservez votre créneau ici : {{mon_calendrier}} ou répondez-moi simplement avec vos disponibilités.

Cordialement,
{{mon_prenom}}
{{signature}}`,
    tags: ['Proposition de valeur', 'Audit offert', 'Lead Magnet'],
    description: 'Lead magnet irrésistible créant une opportunité d\'échange sans engagement.',
  },
];
