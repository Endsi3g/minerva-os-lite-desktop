export interface SOPStep {
  number: number;
  title: string;
  action: string;
  uiTarget: string;
  keyboardShortcut?: string;
  tip?: string;
}

export interface SOPItem {
  id: string;
  number: string;
  title: string;
  tagline: string;
  category: 'onboarding' | 'daily' | 'prospecting' | 'sales' | 'outreach' | 'collaboration' | 'ads' | 'reporting';
  role: 'all' | 'sdr' | 'closer' | 'manager';
  estimatedTime: string;
  frequency: string;
  objective: string;
  definitionOfDone: string;
  visualScreenId: 'today' | 'prospecting' | 'lead-360' | 'composer' | 'tasks' | 'ads' | 'weekly-report';
  steps: SOPStep[];
  pitfalls: string[];
  kpis: string[];
}

export const SOP_ROLES = [
  { id: 'all', label: 'Tous les profils' },
  { id: 'sdr', label: 'SDR & Prospection' },
  { id: 'closer', label: 'Closer & Vente' },
  { id: 'manager', label: 'Direction & Manager' },
] as const;

export const SOPS_DATA: SOPItem[] = [
  {
    id: 'sop-01-setup',
    number: 'SOP-01',
    title: 'Initialisation & Paramétrage du Workspace',
    tagline: 'Connecter vos comptes et configurer votre environnement de prospection.',
    category: 'onboarding',
    role: 'all',
    estimatedTime: '10 minutes',
    frequency: 'À l\'installation / Nouvel employé',
    objective: 'Établir une base saine et opérationnelle : connexion Gmail OAuth, configuration du profil commercial, paramétrage du nom de l\'entreprise et vérification de la délivrabilité.',
    definitionOfDone: 'Le compte Gmail est authentifié avec succès, le profil utilisateur affiche un nom et un avatar, et le domaine d\'envoi est validé.',
    visualScreenId: 'today',
    steps: [
      {
        number: 1,
        title: 'Accéder aux Paramètres Généraux',
        action: 'Dans la barre latérale inférieure, cliquez sur "Paramètres" puis vérifiez les informations du profil (Prénom, Nom, Titre et Fuseau horaire).',
        uiTarget: 'Menu Latéral → Paramètres → Profil',
        keyboardShortcut: 'Cmd/Ctrl + ,',
      },
      {
        number: 2,
        title: 'Authentifier le compte d\'envoi Gmail',
        action: 'Naviguez vers l\'onglet "Intégrations" et cliquez sur "Se connecter avec Google". Validez les autorisations OAuth pour permettre l\'envoi direct et la synchronisation des réponses.',
        uiTarget: 'Paramètres → Intégrations → Gmail',
        tip: 'Utilisez de préférence une adresse professionnelle dédiée à la prospection (ex: prenom@votre-domaine.com).',
      },
      {
        number: 3,
        title: 'Régler la densité et l\'affichage',
        action: 'Dans Paramètres → Apparence, sélectionnez votre densité préférée ("Confortable" pour un usage aéré ou "Compact" pour maximiser les lignes de leads visibles).',
        uiTarget: 'Paramètres → Apparence → Densité',
      },
      {
        number: 4,
        title: 'Valider le Workspace actif',
        action: 'Vérifiez dans le sélecteur de workspace en haut à gauche que vous êtes positionné sur le workspace client ou pôle d\'activité adéquat.',
        uiTarget: 'Topbar → Sélecteur de Workspace',
      },
    ],
    pitfalls: [
      'Ne pas utiliser une adresse email personnelle grand public (@gmail.com) pour de la prospection B2B volumineuse.',
      'Ne pas négliger la photo de profil : elle est automatiquement insérée dans vos signatures de courriels.',
    ],
    kpis: ['Statut OAuth : Connecté', 'Délivrabilité initiale : > 95%'],
  },
  {
    id: 'sop-02-morning-routine',
    number: 'SOP-02',
    title: 'Routine Matinale de 15 min sur le Cockpit /today',
    tagline: 'La séquence quotidienne infaillible pour démarrer sa journée de vente.',
    category: 'daily',
    role: 'sdr',
    estimatedTime: '15 minutes',
    frequency: 'Quotidien (08h30 - 08h45)',
    objective: 'Passer en revue les urgences du jour, traiter les relances programmées sans friction, valider les suggestions de l\'IA et contacter les prospects les plus chauds.',
    definitionOfDone: 'Zéro relance en retard dans l\'Agenda, toutes les actions d\'agents en attente ont été validées ou rejetées, et les 3 premiers prospects chauds ont été contactés.',
    visualScreenId: 'today',
    steps: [
      {
        number: 1,
        title: 'Ouvrir le Cockpit Quotidien (/today)',
        action: 'Connectez-vous à Minerva OS et consultez l\'en-tête du jour. Vérifiez le nombre total de tâches dues et de relances inscrites dans l\'Agenda.',
        uiTarget: 'Menu Latéral → Accueil / Today',
        keyboardShortcut: 'T',
      },
      {
        number: 2,
        title: 'Traiter l\'Agenda du Jour en 1 Clic',
        action: 'Cochez les tâches exécutées. Pour les relances de leads : cliquez sur l\'icône verte (✓) pour archiver, ou sur l\'horloge ambrée pour reporter de 3 jours si le prospect est injoignable.',
        uiTarget: 'Carte "Agenda du jour" → Boutons Check & Snooze',
        tip: 'Le clic sur "Brouillon" génère immédiatement un email de relance adapté au contexte du lead.',
      },
      {
        number: 3,
        title: 'Arbitrer les actions dans l\'Agent Feed',
        action: 'Dans le volet "Agent Feed", examinez les actions préparées par l\'IA Minerva. Cliquez sur "Approuver" pour exécuter ou "Rejeter" avec un motif.',
        uiTarget: 'Carte "Agent Feed" → Actions Approuver / Rejeter',
      },
      {
        number: 4,
        title: 'Attaquer la liste des Prospects Chauds',
        action: 'Examinez la carte "Prospects chauds". Cliquez sur le prospect ayant le score le plus élevé (> 80 pts) pour ouvrir sa fiche 360° et passer votre premier appel.',
        uiTarget: 'Carte "Prospects chauds" → Liens fiches leads',
      },
    ],
    pitfalls: [
      'Reporter systématiquement une relance sans laisser de note sur le motif.',
      'Laisser plus de 5 actions d\'agents s\'accumuler sans arbitrage quotidien.',
    ],
    kpis: ['Zéro relance en souffrance', 'Temps moyen de traitement : < 15 min'],
  },
  {
    id: 'sop-03-scraping-prospecting',
    number: 'SOP-03',
    title: 'Scraping & Acquisition de Leads Géographiques',
    tagline: 'Extraire des commerces qualifiés sur Google Maps et OpenStreetMap.',
    category: 'prospecting',
    role: 'sdr',
    estimatedTime: '20 minutes',
    frequency: '2 à 3 fois par semaine',
    objective: 'Alimenter le haut de l\'entonnoir avec 30 à 50 nouveaux commerces locaux vérifiés (nom, adresse, téléphone, note Google, avis, site web) dans la zone ciblée.',
    definitionOfDone: 'Les nouveaux leads sont importés dans le CRM avec le statut "Nouveau", dédoublonnés automatiquement et prêts pour la phase de qualification.',
    visualScreenId: 'prospecting',
    steps: [
      {
        number: 1,
        title: 'Définir les critères géographiques et sectoriels',
        action: 'Allez dans "Prospection" (/prospecting). Renseignez la niche commerciale ciblée (ex: "Boulangerie", "Clinique dentaire", "Rénovation") et la ville cible (ex: "Montréal - Plateau").',
        uiTarget: 'Prospection → Formulaire de recherche',
      },
      {
        number: 2,
        title: 'Lancer l\'extraction cartographique',
        action: 'Cliquez sur "Lancer la recherche". Minerva interroge les sources cartographiques et filtre automatiquement les entreprises déjà enregistrées dans votre base.',
        uiTarget: 'Prospection → Bouton "Lancer la recherche"',
        tip: 'Les résultats sans numéro de téléphone sont automatiquement signalés pour enrichissement ultérieur.',
      },
      {
        number: 3,
        title: 'Filtrer et sélectionner les opportunités prioritaires',
        action: 'Triez le tableau de résultats par note Google ou statut de site web. Ciblez en priorité les commerces ayant soit une mauvaise note (opportunité d\'audit e-réputation), soit pas de site web moderne.',
        uiTarget: 'Prospection → Tableau de résultats → Filtres',
      },
      {
        number: 4,
        title: 'Importer dans le Pipeline Commercial',
        action: 'Sélectionnez les lignes retenues puis cliquez sur "Importer dans le CRM". Les leads sont créés instantanément et visibles dans votre Pipeline.',
        uiTarget: 'Prospection → Bouton "Importer"',
      },
    ],
    pitfalls: [
      'Scraper plus de 200 leads par jour sans avoir la capacité commerciale de les traiter sous 48h.',
      'Importer des doublons en utilisant des variantes de noms sans vérifier le numéro de téléphone.',
    ],
    kpis: ['Taux d\'enrichissement téléphonique : > 80%', 'Dédoublonnage : 100%'],
  },
  {
    id: 'sop-04-lead-qualification',
    number: 'SOP-04',
    title: 'Qualification 360° & Traitement de la Fiche Lead',
    tagline: 'Maîtriser le cycle de vie du prospect et faire progresser le pipeline.',
    category: 'sales',
    role: 'closer',
    estimatedTime: '5 minutes par fiche',
    frequency: 'En continu au fil des échanges',
    objective: 'Évaluer le potentiel réel du prospect, documenter chaque interaction (notes, objection, budget) et faire progresser son statut dans le pipeline Kanban.',
    definitionOfDone: 'La fiche lead contient un contact vérifié, une température à jour (Chaud, Tiède, Froid), un statut de pipeline synchronisé et une tâche de suivi calendaire.',
    visualScreenId: 'lead-360',
    steps: [
      {
        number: 1,
        title: 'Ouvrir la Fiche 360° depuis le Pipeline',
        action: 'Dans /leads ou /pipeline, cliquez sur la ligne du prospect pour afficher le volet latéral complet Compte 360°.',
        uiTarget: 'Pipeline / Leads → Ligne Lead',
      },
      {
        number: 2,
        title: 'Consulter l\'Audit IA & les Avis Clients',
        action: 'Examinez l\'onglet "Audit" et l\'onglet "Avis Google". Identifiez les 2 points de douleur majeurs du commerce à utiliser comme accroche lors de la prise de contact.',
        uiTarget: 'Fiche Lead → Onglets Audit & Avis',
        tip: 'Si aucun avis n\'est disponible, un état vide propre s\'affiche sans bloquer la navigation.',
      },
      {
        number: 3,
        title: 'Faire progresser le Stepper de Pipeline',
        action: 'Cliquez sur le jalon correspondant à l\'avancement : "Nouveau" → "Contacté" (premier email/appel) → "RDV Fixé" (démo calée) → "Signé / Gagné".',
        uiTarget: 'Fiche Lead → Stepper horizontal de statut',
      },
      {
        number: 4,
        title: 'Consigner l\'échange et planifier la prochaine action',
        action: 'Rédigez un compte-rendu dans le journal de notes et définissez la date de la prochaine relance.',
        uiTarget: 'Fiche Lead → Bloc "Notes & Activités"',
      },
    ],
    pitfalls: [
      'Déplacer un lead dans "Gagné" sans avoir consigné le montant du contrat.',
      'Ne pas renseigner de prochaine date d\'action : le lead disparaît alors de l\'Agenda matinal.',
    ],
    kpis: ['Taux de fiches complètes : > 90%', 'Délai moyen de qualification : < 24h'],
  },
  {
    id: 'sop-05-composer-outreach',
    number: 'SOP-05',
    title: 'Studio Composer & Campagnes d\'Outreach',
    tagline: 'Rédiger et envoyer des messages personnalisés haute délivrabilité.',
    category: 'outreach',
    role: 'sdr',
    estimatedTime: '10 minutes par lot de 10 leads',
    frequency: 'Quotidien',
    objective: 'Générer des emails de prospection percutants avec variables dynamiques, valider le score de délivrabilité anti-spam, et programmer les envois.',
    definitionOfDone: 'Les courriels sont personnalisés sans aucune balise non résolue, le score de délivrabilité dépasse 90%, et les envois sont tracés dans le CRM.',
    visualScreenId: 'composer',
    steps: [
      {
        number: 1,
        title: 'Ouvrir le Studio Composer',
        action: 'Naviguez vers /composer depuis le menu latéral pour accéder à l\'éditeur haute densité plein écran.',
        uiTarget: 'Menu Latéral → Composer Studio',
      },
      {
        number: 2,
        title: 'Insérer les Variables Dynamiques',
        action: 'Utilisez le panneau latéral gauche pour insérer en un clic les jetons personnalisés : {{prenom}}, {{entreprise}}, {{ville}}, {{niche}} ou {{note_moyenne}}.',
        uiTarget: 'Composer → Panneau Variables Dynamiques',
        tip: 'Ne modifiez pas manuellement les accolades : cliquez simplement sur le badge de variable.',
      },
      {
        number: 3,
        title: 'Contrôler la Jauge de Délivrabilité',
        action: 'Surveillez l\'analyse en direct dans le panneau de droite. Vérifiez l\'absence de mots interdits ("gratuit", "urgent", "100% garanti") et confirmez la note de santé de l\'email.',
        uiTarget: 'Composer → Panneau Délivrabilité & Anti-Spam',
      },
      {
        number: 4,
        title: 'Prévisualiser et Transmettre',
        action: 'Basculez en mode "Aperçu Réel" pour inspecter le rendu avec les données réelles du prospect, puis cliquez sur "Envoyer via Gmail".',
        uiTarget: 'Composer → Bouton "Envoyer"',
      },
    ],
    pitfalls: [
      'Envoyer un email avec une balise vide ou mal orthographiée.',
      'Dépasser 40 envois froids par jour depuis une même adresse de messagerie.',
    ],
    kpis: ['Taux d\'ouverture cible : > 45%', 'Taux de réponse cible : > 8%'],
  },
  {
    id: 'sop-06-collaboration-minerva-ai',
    number: 'SOP-06',
    title: 'Délégation à Minerva IA & Canaux d\'Équipe',
    tagline: 'Collaborer en temps réel avec vos collègues et le copilote IA.',
    category: 'collaboration',
    role: 'all',
    estimatedTime: '5 minutes',
    frequency: 'Au besoin tout au long de la journée',
    objective: 'Attribuer des tâches opérationnelles au copilote IA Minerva ou aux collaborateurs, et échanger dans des canaux de discussion ciblés par groupe de travail.',
    definitionOfDone: 'Les tâches sont assignées avec un responsable clair (Minerva IA ou humain), et les échanges clés sont archivés dans les canaux de messagerie.',
    visualScreenId: 'tasks',
    steps: [
      {
        number: 1,
        title: 'Créer une tâche d\'équipe dans /tasks',
        action: 'Ouvrez la page Tâches et cliquez sur "Nouvelle Tâche". Saisissez le titre et la date d\'échéance.',
        uiTarget: 'Tâches → Bouton "Nouvelle Tâche"',
        keyboardShortcut: 'N',
      },
      {
        number: 2,
        title: 'Assigner à Minerva Copilote IA',
        action: 'Dans le menu déroulant des assignés, sélectionnez "Minerva Copilote IA" (icône robot émeraude). L\'IA prend en charge la recherche ou la préparation du brouillon.',
        uiTarget: 'Modal Tâche → Sélecteur d\'assigné → Minerva Copilote IA',
      },
      {
        number: 3,
        title: 'Créer un Canal de Groupe Personnalisé',
        action: 'Dans la page Messages (/messages), cliquez sur "Nouveau" à côté des groupes. Choisissez un nom (ex: "Pôle Médical", "Closers") et cochez les membres concernés.',
        uiTarget: 'Messages → Section Groupes → Bouton "Nouveau"',
      },
      {
        number: 4,
        title: 'Interpeller Minerva IA par mention',
        action: 'Dans n\'importe quel canal ou en DM direct, écrivez un message en mentionnant @minerva ou @ia pour obtenir une synthèse ou une recommandation tactique immédiate.',
        uiTarget: 'Messages → Barre de saisie → "@minerva ..."',
      },
    ],
    pitfalls: [
      'Assigner une tâche à l\'IA sans donner un contexte précis dans la description.',
      'Créer des groupes en doublon pour une même équipe.',
    ],
    kpis: ['Temps de réponse IA : < 3 secondes', 'Taux de tâches résolues dans les délais : > 85%'],
  },
  {
    id: 'sop-07-ads-hub',
    number: 'SOP-07',
    title: 'Pilotage Publicitaire & Générateur de Copies /ads',
    tagline: 'Gérer les campagnes Meta Lead Ads et générer des textes à fort ROI.',
    category: 'ads',
    role: 'manager',
    estimatedTime: '15 minutes',
    frequency: 'Hebdomadaire (Mardi matin)',
    objective: 'Surveiller les métriques d\'acquisition payante (CPA, clics, leads entrants), vérifier l\'intégration des formulaires instantanés Facebook et produire des copies d\'annonces avec l\'IA.',
    definitionOfDone: 'Les webhooks Facebook Lead Ads sont connectés, le CPA moyen est inférieur au seuil cible de 25 $, et 3 variantes de copies sont testées.',
    visualScreenId: 'ads',
    steps: [
      {
        number: 1,
        title: 'Ouvrir le Hub Publicitaire Unifié (/ads)',
        action: 'Dans la barre latérale, accédez à la section Publicités & Acquisition pour observer la synthèse multi-canaux.',
        uiTarget: 'Menu Latéral → Publicités & Hub Ads',
      },
      {
        number: 2,
        title: 'Vérifier la connexion Facebook Lead Ads',
        action: 'Assurez-vous que le statut affiche "Connecté". En cas de déconnexion, cliquez sur "Re-synchroniser" pour rétablir les jetons OAuth.',
        uiTarget: 'Hub Ads → Carte Meta Lead Ads → Statut',
      },
      {
        number: 3,
        title: 'Analyser le CPA et le Taux de Conversion',
        action: 'Vérifiez que le Coût Par Acquisition (CPA) reste sous vos seuils de rentabilité. Comparez les performances Facebook vs Google Ads.',
        uiTarget: 'Hub Ads → Tuiles KPI (CPA, ROI, Leads Générés)',
      },
      {
        number: 4,
        title: 'Générer des déclinaisons d\'annonces avec l\'IA',
        action: 'Dans le générateur de copies publicitaires, sélectionnez la niche cible et cliquez sur "Générer 3 angles". Copiez le meilleur hook pour l\'insérer dans le gestionnaire Meta Ads.',
        uiTarget: 'Hub Ads → Générateur de copies publicitaires',
      },
    ],
    pitfalls: [
      'Laisser tourner une campagne dont le CPA dépasse 35 $ sans couper les créations sous-performantes.',
      'Oublier de tester les webhooks de réception des formulaires instantanés.',
    ],
    kpis: ['CPA moyen cible : < 20 $', 'Délai de rappel des leads ads : < 15 min'],
  },
  {
    id: 'sop-08-weekly-closing',
    number: 'SOP-08',
    title: 'Clôture Hebdomadaire & Export du Bilan /weekly-report',
    tagline: 'Consolider les chiffres réels, exporter en PDF et préparer la semaine.',
    category: 'reporting',
    role: 'manager',
    estimatedTime: '20 minutes',
    frequency: 'Vendredi après-midi (16h00 - 16h30)',
    objective: 'Générer le compte-rendu de performance basé sur les données réelles du CRM, exporter la version PDF pour la direction, et archiver les résultats.',
    definitionOfDone: 'Le bilan hebdomadaire est téléchargé en PDF officiel, le texte résumé est partagé dans le canal de direction, et les objectifs de la semaine suivante sont fixés.',
    visualScreenId: 'weekly-report',
    steps: [
      {
        number: 1,
        title: 'Ouvrir le Bilan Hebdomadaire (/weekly-report)',
        action: 'Accédez à la page /weekly-report pour charger automatiquement les statistiques réelles extraites du CRM pour la semaine en cours.',
        uiTarget: 'Menu Latéral → Bilan Hebdomadaire',
      },
      {
        number: 2,
        title: 'Contrôler les Métriques Réelles',
        action: 'Vérifiez les 4 indicateurs réels : Nombre total de leads créés, Leads contactés, Rendez-vous fixés, et Valeur totale des contrats gagnés (aucune valeur simulée).',
        uiTarget: 'Bilan Hebdomadaire → Grille de 4 cartes KPI',
        tip: 'Si aucune activité n\'a eu lieu, les compteurs indiquent honnêtement 0.',
      },
      {
        number: 3,
        title: 'Copier la synthèse structurée dans le presse-papier',
        action: 'Cliquez sur le bouton "Copier" en haut à droite. Un texte propre et formaté avec émoticônes et ratios est prêt à être collé dans Slack, Teams ou WhatsApp.',
        uiTarget: 'Bilan Hebdomadaire → Bouton "Copier"',
      },
      {
        number: 4,
        title: 'Télécharger le Rapport Officiel en PDF',
        action: 'Cliquez sur le bouton "PDF". La boîte de dialogue d\'impression s\'ouvre préconfigurée avec des marges soignées pour enregistrer le document PDF de direction.',
        uiTarget: 'Bilan Hebdomadaire → Bouton "PDF"',
        keyboardShortcut: 'Cmd/Ctrl + P',
      },
    ],
    pitfalls: [
      'Modifier manuellement les chiffres de conversion pour masquer des performances réelles.',
      'Oublier de clôturer les fiches de leads orphelines avant le calcul du vendredi.',
    ],
    kpis: ['Bilan édité chaque vendredi avant 17h', 'Exactitude des données CRM : 100%'],
  },
];
