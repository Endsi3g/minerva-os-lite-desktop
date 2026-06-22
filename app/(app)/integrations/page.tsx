'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plug,
  ChevronDown,
  Globe,
  CheckCircle2,
  Lock,
  MoreHorizontal,
  UserPlus,
  Plus,
  Loader2,
  Check,
  Cpu,
  Wrench,
  X,
  Mail,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  GoogleCalendarIcon,
  GoogleDriveIcon,
  SharePointIcon,
  ZoomIcon,
  TeamsIcon,
  GoogleMeetIcon,
  TodoistIcon,
  ApifyIcon,
  NotionIcon,
  SlackIcon,
} from '@/components/icons';
import {
  getConnectedIntegrations,
  connectIntegration,
  disconnectIntegration,
  getImportedIntegrations
} from '@/lib/onboarding-store';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage } from '@/lib/language-context';
import { GoogleConnectModal } from '@/components/google-connect-modal';
import { useReach } from '@/lib/reach-context';
import { TranslationKey } from '@/lib/translations';
import { toast } from 'sonner';

interface IntegrationItem {
  id: string;
  name: string;
  nameKey?: TranslationKey;
  category: string;
  owner: string;
  email: string;
  accEmail: string;
  accEmailKey?: TranslationKey;
  icon: React.ComponentType<{ size?: number; className?: string }> | (() => React.ReactNode);
  status: string;
  statusKey?: TranslationKey;
  assets: string;
  assetsKey?: TranslationKey;
  access: string;
  accessKey?: TranslationKey;
  description: string;
  descriptionKey?: TranslationKey;
  custom?: boolean;
  steps?: string[];
}

const DEFAULT_INTEGRATIONS: IntegrationItem[] = [
  {
    id: 'google-gmail',
    name: 'Gmail',
    nameKey: 'integrations.google_gmail.name',
    category: 'communication',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'gmail.readonly, gmail.send',
    accEmailKey: 'integrations.google_gmail.acc_email',
    icon: () => <Mail className="w-5 h-5 text-[#EA4335]" />,
    status: 'Inactive',
    statusKey: 'integrations.status.inactive',
    assets: '—',
    access: 'Private',
    accessKey: 'integrations.access.private',
    description: 'Connectez Gmail pour lire, rédiger et synchroniser vos échanges d\'emails avec vos prospects CRM.',
    descriptionKey: 'integrations.google_gmail.description',
    steps: [
      'Cliquez sur « Se connecter » pour autoriser Minerva à accéder à votre messagerie Gmail.',
      'Configurez les scopes nécessaires (lecture et envoi).',
      'Vos échanges par emails seront alors automatiquement reliés à vos prospects dans Minerva.'
    ]
  },
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    nameKey: 'integrations.google_calendar.name',
    category: 'calendar',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'calendar.events, calendar.freebusy',
    accEmailKey: 'integrations.google_calendar.acc_email',
    icon: GoogleCalendarIcon,
    status: 'Inactive',
    statusKey: 'integrations.status.inactive',
    assets: '—',
    access: 'Private',
    accessKey: 'integrations.access.private',
    description: 'Synchronisez votre agenda Google pour gérer vos rendez-vous clients, relances et visites terrain.',
    descriptionKey: 'integrations.google_calendar.description',
    steps: [
      'Cliquez sur « Se connecter » pour autoriser Minerva à accéder à votre Google Calendar.',
      'Sélectionnez les calendriers de votre choix.',
      'Vos événements et plannings seront synchronisés avec Minerva.'
    ]
  },
  {
    id: 'google-meet',
    name: 'Google Meet',
    nameKey: 'integrations.google_meet.name',
    category: 'meeting',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'meeting.create, artifacts',
    accEmailKey: 'integrations.google_meet.acc_email',
    icon: GoogleMeetIcon,
    status: 'Inactive',
    statusKey: 'integrations.status.inactive',
    assets: '—',
    access: 'Private',
    accessKey: 'integrations.access.private',
    description: 'Planifiez des visioconférences Google Meet et associez les comptes-rendus à vos opportunités.',
    descriptionKey: 'integrations.google_meet.description',
    steps: [
      'L\'intégration nécessite l\'autorisation de votre compte Google principal (Gmail & Calendar).',
      'Lors de la création de rendez-vous dans Minerva, un lien Google Meet sera généré automatiquement.',
      'Les enregistrements et transcriptions associés dans votre Google Drive seront synchronisés.'
    ]
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    nameKey: 'integrations.google_drive.name',
    category: 'document',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'drive.file, metadata.readonly',
    accEmailKey: 'integrations.google_drive.acc_email',
    icon: GoogleDriveIcon,
    status: 'Inactive',
    statusKey: 'integrations.status.inactive',
    assets: '—',
    access: 'Private',
    accessKey: 'integrations.access.private',
    description: 'Stockez et exportez vos propositions commerciales et audits sous format de fichier Google Docs.',
    descriptionKey: 'integrations.google_drive.description',
    steps: [
      'Cliquez sur « Se connecter » pour autoriser l\'accès progressive à Google Drive (sensible).',
      'Autorisez l\'accès aux fichiers créés ou ouverts par l\'application (scope drive.file).',
      'Exportez vos audits SEO ou propositions commerciales de Minerva directement en un clic dans votre Drive.'
    ]
  },
  {
    id: 'google-places',
    name: 'Google Places',
    nameKey: 'integrations.google_places.name',
    category: 'scraping',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'Clé API Serveur',
    accEmailKey: 'integrations.google_places.acc_email',
    icon: () => <MapPin className="w-5 h-5 text-[#34A853]" />,
    status: 'Active',
    statusKey: 'integrations.status.active',
    assets: 'Illimité',
    access: 'Entire workspace',
    accessKey: 'integrations.access.entire_workspace',
    description: 'Recherchez et enrichissez vos prospects locaux en utilisant l\'API officielle Google Places (New).',
    descriptionKey: 'integrations.google_places.description',
    steps: [
      'Cette intégration est activée globalement côté serveur à l\'aide d\'une clé d\'API Google Cloud Maps.',
      'Elle est disponible dans l\'outil de prospection pour enrichir les fiches et coordonnées des commerces.',
      'Aucune authentification OAuth individuelle n\'est nécessaire pour vos utilisateurs.'
    ]
  },
  {
    id: 'demo-website-1',
    name: 'Demo - Why AI Will Save the ...',
    category: 'website',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'This is a demo website integration',
    accEmailKey: 'integrations.demo_website.acc_email',
    icon: () => (
      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
        <CheckCircle2 className="w-4 h-4 text-[#26251e]" />
      </div>
    ),
    status: 'Active',
    statusKey: 'integrations.status.active',
    assets: '1',
    access: 'Entire workspace',
    accessKey: 'integrations.access.entire_workspace',
    description: 'Why AI Will Save the World — Article page analysis and content parsing.',
    descriptionKey: 'integrations.demo_website_1.description'
  },
  {
    id: 'demo-website-2',
    name: 'Demo - NVIDIA Announces Fi...',
    category: 'website',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'This is a demo website integration',
    accEmailKey: 'integrations.demo_website.acc_email',
    icon: () => (
      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
        <CheckCircle2 className="w-4 h-4 text-[#26251e]" />
      </div>
    ),
    status: 'Active',
    statusKey: 'integrations.status.active',
    assets: '1',
    access: 'Entire workspace',
    accessKey: 'integrations.access.entire_workspace',
    description: 'NVIDIA Announces Financial Results — Parsing dynamic charts and financial data.',
    descriptionKey: 'integrations.demo_website_2.description'
  },
  {
    id: 'meeting-recorder',
    name: 'Meeting recorder',
    nameKey: 'integrations.meeting_recorder.name',
    category: 'meeting',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'alexsmith.meetings@minerva-os.com',
    icon: () => (
      <div className="flex items-center gap-1.5 py-1">
        <GoogleCalendarIcon size={16} />
        <ZoomIcon size={16} />
        <TeamsIcon size={16} />
        <GoogleMeetIcon size={16} />
      </div>
    ),
    status: 'Active',
    statusKey: 'integrations.status.active',
    assets: '—',
    access: 'Private',
    accessKey: 'integrations.access.private',
    description: 'Record, transcribe, and unlock knowledge from your meetings in Google Meet, Zoom, or Microsoft Teams.',
    descriptionKey: 'integrations.meeting_recorder.description'
  },
  {
    id: 'sharepoint',
    name: 'Microsoft SharePoint',
    category: 'document',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'alexsmith.sharepoint@minerva-os.com',
    icon: SharePointIcon,
    status: 'Active',
    statusKey: 'integrations.status.active',
    assets: '—',
    access: 'Private',
    accessKey: 'integrations.access.private',
    description: 'Find and access all of your SharePoint content. Limited to your 1,000 most recent files in the Free tier.',
    descriptionKey: 'integrations.sharepoint.description'
  },
  {
    id: 'website',
    name: 'Website',
    nameKey: 'integrations.website.name',
    category: 'website',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'https://minerva-os-lite.com',
    icon: () => <Globe className="w-[18px] h-[18px] text-[#7a7a76]" />,
    status: 'Active',
    statusKey: 'integrations.status.active',
    assets: '100 pages limit',
    assetsKey: 'integrations.website.assets_limit',
    access: 'Entire workspace',
    accessKey: 'integrations.access.entire_workspace',
    description: 'Update to enterprise to index more pages. Limited to 100 pages',
    descriptionKey: 'integrations.website.description'
  },
  {
    id: 'todoist',
    name: 'Todoist',
    category: 'task',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'Todoist Task Connector',
    accEmailKey: 'integrations.todoist.acc_email',
    icon: TodoistIcon,
    status: 'Inactive',
    statusKey: 'integrations.status.inactive',
    assets: '—',
    access: 'Private',
    accessKey: 'integrations.access.private',
    description: 'Synchronisez vos tâches et objectifs de la journée avec vos projets Todoist.',
    descriptionKey: 'integrations.todoist.description',
    steps: [
      'Ouvrez Todoist → Paramètres → Intégrations → API et copiez votre token.',
      'Collez le token dans Paramètres Minerva > Intégrations > Todoist et choisissez un projet cible.',
      'Vos tâches du projet apparaîtront dans le widget "Aujourd\'hui" et seront synchronisées à chaque ouverture.',
    ],
  },
  {
    id: 'apify',
    name: 'Apify (Google Places)',
    category: 'scraping',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'Apify Scraper Connector',
    icon: ApifyIcon,
    status: 'Inactive',
    statusKey: 'integrations.status.inactive',
    assets: '—',
    access: 'Private',
    accessKey: 'integrations.access.private',
    description: 'Scrape enrichi Google Places (photos, emails réels, horaires) via l\'acteur compass~crawler-google-places d\'Apify.',
    steps: [
      'Créez un compte sur apify.com et copiez votre clé API dans Paramètres (profil → API tokens).',
      'Collez la clé dans Paramètres Minerva > Intégrations > Clé Apify (format apify_api_…).',
      'Dans la page Prospection, cochez la source "Apify" et lancez un scrape multi-niche pour des données enrichies.',
    ],
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'document',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'Notion Workspace Connector',
    icon: NotionIcon,
    status: 'Inactive',
    statusKey: 'integrations.status.inactive',
    assets: '—',
    access: 'Private',
    accessKey: 'integrations.access.private',
    description: 'Connectez vos bases de données Notion pour importer des prospects, des notes ou des tâches directement dans Minerva.',
    steps: [
      'Allez sur notion.so/my-integrations, créez une intégration et copiez le secret.',
      'Partagez les bases de données Notion cibles avec votre intégration (bouton "Partager" dans Notion).',
      'Configurez la connexion dans l\'éditeur et choisissez les propriétés à synchroniser avec Minerva.',
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    category: 'communication',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'Slack Workspace Connector',
    icon: SlackIcon,
    status: 'Inactive',
    statusKey: 'integrations.status.inactive',
    assets: '—',
    access: 'Private',
    accessKey: 'integrations.access.private',
    description: 'Envoyez des notifications Minerva (nouveau lead, lead assigné, rapport hebdomadaire) directement dans vos canaux Slack.',
    steps: [
      'Créez une app Slack sur api.slack.com/apps, activez "Incoming Webhooks" et copiez l\'URL du webhook.',
      'Collez l\'URL dans l\'éditeur de cette intégration sous "Authentification > Webhook URL".',
      'Choisissez les événements à envoyer (nouveau lead, rapport, rappel) dans l\'onglet "Déclencheurs".',
    ],
  },
];

export default function IntegrationsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const { user: contextUser } = useReach();
  const [searchQuery, setSearchQuery] = useState('');
  const [availableSearchQuery, setAvailableSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'connected' | 'custom' | 'needs-config'>('all');

  // Store-backed states
  const [connectedIds, setConnectedIds] = useState<string[]>([]);

  const [googleStatus, setGoogleStatus] = useState<{
    connected: boolean;
    email?: string;
    scopes: string[];
  }>({ connected: false, scopes: [] });
  const [loadingGoogle, setLoadingGoogle] = useState(true);

  const fetchGoogleStatus = async () => {
    try {
      const res = await fetch('/api/google/auth/status');
      if (res.ok) {
        const data = await res.json();
        setGoogleStatus(data);
      }
    } catch (err) {
      console.error('Error fetching Google status:', err);
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (id.startsWith('google-') && id !== 'google-places') {
      try {
        const res = await fetch('/api/google/auth/disconnect', { method: 'POST' });
        if (res.ok) {
          await fetchGoogleStatus();
          toast.success(t('integrations.disconnected_success', 'Intégration Google déconnectée avec succès.'));
        } else {
          toast.error('Erreur lors de la déconnexion Google.');
        }
      } catch (err) {
        console.error(err);
      }
    } else {
      disconnectIntegration(id);
      setConnectedIds(prev => prev.filter(item => item !== id));
    }
    setActiveIntegrationEditId(null);
    setDetailIntegration(null);
  };

  useEffect(() => {
    fetchGoogleStatus();
  }, []);

  // Todoist States
  const [todoistToken, setTodoistToken] = useState('');
  const [todoistProjectId, setTodoistProjectId] = useState('');
  const [todoistProjects, setTodoistProjects] = useState<{ id: string; name: string }[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Selection state for connect modal
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationItem | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [googleModal, setGoogleModal] = useState<{ open: boolean; pack: 'identity' | 'communication' | 'documents' }>({ open: false, pack: 'communication' });

  // Add Custom Integration states
  const [showAddScratchModal, setShowAddScratchModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customType, setCustomType] = useState<'scratch' | 'mcp' | 'a2a' | 'json'>('scratch');
  const [jsonManifestInput, setJsonManifestInput] = useState('');
  const [jsonManifestError, setJsonManifestError] = useState('');

  // Detail panel (intermediate view before full editor or connect)
  const [detailIntegration, setDetailIntegration] = useState<IntegrationItem | null>(null);
  const [integrationsList, setIntegrationsList] = useState<IntegrationItem[]>(DEFAULT_INTEGRATIONS);

  // Edit Workspace states
  const [activeIntegrationEditId, setActiveIntegrationEditId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'build' | 'share' | 'insights'>('build');
  const [activeBuildSubTab, setActiveBuildSubTab] = useState<'auth' | 'actions' | 'triggers'>('auth');
  
  // Custom Edit inputs
  const [authType, setAuthType] = useState<'none' | 'key' | 'oauth'>('none');
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [generalAccessType, setGeneralAccessType] = useState<'restricted' | 'public'>('restricted');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSavedSuccess, setEditSavedSuccess] = useState(false);

  // Invite Users modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer' | 'admin'>('editor');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // User details
  const [userName, setUserName] = useState('Moi');
  const [userEmail, setUserEmail] = useState('');

  // Todoist Functions
  const fetchTodoistProjects = async (token: string) => {
    if (!token) return;
    setLoadingProjects(true);
    try {
      const res = await fetch('https://api.todoist.com/rest/v2/projects', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTodoistProjects(data);
      } else {
        toast.error(t('integrations.todoist.error_load_projects'));
      }
    } catch (err) {
      console.error(err);
      toast.error(t('integrations.todoist.error_connection'));
    } finally {
      setLoadingProjects(false);
    }
  };

  const saveTodoistSettings = async () => {
    if (!contextUser) return;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;

    const applyConnected = () => {
      setConnectedIds(prev => Array.from(new Set([...prev, 'todoist'])));
      setIntegrationsList(prev => prev.map(item =>
        item.id === 'todoist'
          ? { ...item, status: 'Active', statusKey: 'integrations.status.active' as TranslationKey, accEmail: 'Compte connecté', accEmailKey: 'integrations.todoist.acc_email_connected' as TranslationKey }
          : item
      ));
    };

    try {
      if (electronObj) {
        const nowStr = new Date().toISOString();
        await electronObj.dbRun(
          "UPDATE settings SET todoist_token = ?, todoist_project_id = ?, updated_at = ?, sync_status = 'pending_update' WHERE user_id = ?",
          [todoistToken, todoistProjectId, nowStr, contextUser.id]
        );
      } else {
        const supabase = createClient();
        const { error } = await supabase.from('settings').upsert({
          user_id: contextUser.id,
          todoist_token: todoistToken,
          todoist_project_id: todoistProjectId,
          updated_at: new Date().toISOString(),
        });
        if (error) throw new Error(error.message);
      }
      applyConnected();
      toast.success(t('integrations.todoist.saved_success'));
      setActiveIntegrationEditId(null);
    } catch (err) {
      console.error(err);
      toast.error(t('integrations.todoist.error_save'));
    }
  };

  useEffect(() => {
    const syncStore = () => {
      const baseConnected = getConnectedIntegrations();
      const googleConnected: string[] = [];

      if (googleStatus.connected) {
        if (googleStatus.scopes.some(s => s.includes('gmail.readonly'))) {
          googleConnected.push('google-gmail');
        }
        if (googleStatus.scopes.some(s => s.includes('calendar.events'))) {
          googleConnected.push('google-calendar');
          googleConnected.push('google-meet');
        }
        if (googleStatus.scopes.some(s => s.includes('drive.file'))) {
          googleConnected.push('google-drive');
        }
      }
      googleConnected.push('google-places');

      const allConnected = Array.from(new Set([...baseConnected, ...googleConnected]));
      setConnectedIds(allConnected);

      const imported = getImportedIntegrations();
      setIntegrationsList(prev => {
        // Map the default and imported list with current statuses
        const listToMap = prev.length > 0 ? prev : DEFAULT_INTEGRATIONS;
        const mappedList = listToMap.map(item => {
          if (item.id === 'google-gmail') {
            const isConnected = googleStatus.connected && googleStatus.scopes.some(s => s.includes('gmail.readonly'));
            return {
              ...item,
              status: isConnected ? 'Active' : 'Inactive',
              statusKey: (isConnected ? 'integrations.status.active' : 'integrations.status.inactive') as TranslationKey,
              accEmail: isConnected ? (googleStatus.email || '') : 'gmail.readonly, gmail.send',
              accEmailKey: undefined
            };
          }
          if (item.id === 'google-calendar') {
            const isConnected = googleStatus.connected && googleStatus.scopes.some(s => s.includes('calendar.events'));
            return {
              ...item,
              status: isConnected ? 'Active' : 'Inactive',
              statusKey: (isConnected ? 'integrations.status.active' : 'integrations.status.inactive') as TranslationKey,
              accEmail: isConnected ? (googleStatus.email || '') : 'calendar.events, calendar.freebusy',
              accEmailKey: undefined
            };
          }
          if (item.id === 'google-meet') {
            const isConnected = googleStatus.connected && googleStatus.scopes.some(s => s.includes('calendar.events'));
            return {
              ...item,
              status: isConnected ? 'Active' : 'Inactive',
              statusKey: (isConnected ? 'integrations.status.active' : 'integrations.status.inactive') as TranslationKey,
              accEmail: isConnected ? (googleStatus.email || '') : 'meeting.create, artifacts',
              accEmailKey: undefined
            };
          }
          if (item.id === 'google-drive') {
            const isConnected = googleStatus.connected && googleStatus.scopes.some(s => s.includes('drive.file'));
            return {
              ...item,
              status: isConnected ? 'Active' : 'Inactive',
              statusKey: (isConnected ? 'integrations.status.active' : 'integrations.status.inactive') as TranslationKey,
              accEmail: isConnected ? (googleStatus.email || '') : 'drive.file, metadata.readonly',
              accEmailKey: undefined
            };
          }
          if (item.id === 'google-places') {
            return {
              ...item,
              status: 'Active',
              statusKey: 'integrations.status.active' as TranslationKey,
              accEmail: 'Clé API Serveur',
              accEmailKey: 'integrations.google_places.acc_email' as TranslationKey
            };
          }
          return item;
        });

        const existingIds = new Set(mappedList.map(item => item.id));
        const newItems: IntegrationItem[] = imported
          .filter(imp => !existingIds.has(imp.id))
          .map(imp => ({
            id: imp.id,
            name: imp.name,
            category: imp.category,
            owner: 'Moi',
            email: '',
            accEmail: imp.authMethod === 'oauth' ? 'OAuth' : imp.authMethod === 'key' ? 'Clé API' : 'Aucune authentification',
            accEmailKey: (imp.authMethod === 'oauth' ? 'integrations.auth.oauth' : imp.authMethod === 'key' ? 'integrations.auth.api_key' : 'integrations.auth.none') as TranslationKey,
            icon: () => (
              <div className="w-7 h-7 rounded-lg bg-[#059669]/10 flex items-center justify-center border border-[#059669]/20 shrink-0">
                <Plug className="w-4 h-4 text-[#059669]" />
              </div>
            ),
            status: 'Active',
            statusKey: 'integrations.status.active' as TranslationKey,
            assets: '—',
            access: 'Private',
            accessKey: 'integrations.access.private' as TranslationKey,
            description: imp.description,
            custom: true
          }));

        return [...mappedList, ...newItems];
      });
    };
    syncStore();
    window.addEventListener('minerva_store_update', syncStore);
    return () => window.removeEventListener('minerva_store_update', syncStore);
  }, [googleStatus]);

  useEffect(() => {
    const fetchUser = async () => {
      const user = contextUser;
      try {
        if (user) {
          if (user.email) {
            setUserEmail(user.email);
          }
          const supabase = createClient();
          const { data: settings } = await supabase
            .from('settings')
            .select('full_name')
            .eq('user_id', user.id)
            .maybeSingle();

          let currentUserName = 'Moi';
          if (settings?.full_name) {
            currentUserName = settings.full_name;
            setUserName(settings.full_name);
          } else if (user.email) {
            currentUserName = user.email.split('@')[0];
            setUserName(currentUserName);
          }

          const dynamicEmail = user.email || 'user@example.com';
          const emailPrefix = dynamicEmail.split('@')[0];
          const emailDomain = dynamicEmail.split('@')[1] || 'example.com';

          setIntegrationsList(prev => prev.map(item => {
            if (item.owner === 'Alex Smith') {
              const updatedItem = { ...item };
              updatedItem.owner = currentUserName;
              
              if (item.email && item.email.includes('alexsmith')) {
                updatedItem.email = item.email.replace('alexsmith', emailPrefix);
              }
              
              if (item.accEmail && item.accEmail.includes('alexsmith')) {
                if (item.accEmail.includes('gmail.com')) {
                  updatedItem.accEmail = `${emailPrefix}.drive@gmail.com`;
                } else if (item.accEmail.includes('meetings')) {
                  updatedItem.accEmail = `${emailPrefix}.meetings@${emailDomain}`;
                } else if (item.accEmail.includes('sharepoint')) {
                  updatedItem.accEmail = `${emailPrefix}.sharepoint@${emailDomain}`;
                } else {
                  updatedItem.accEmail = item.accEmail.replace('alexsmith', emailPrefix);
                }
              }
              return updatedItem;
            }
            return item;
          }));
          // Fetch Todoist configurations (Electron → SQLite, web → Supabase)
          const electronObj = typeof window !== 'undefined' && (window as any).electron;
          const applyTodoistToken = (token: string, projectId: string) => {
            setTodoistToken(token);
            setTodoistProjectId(projectId);
            setConnectedIds(prev => Array.from(new Set([...prev, 'todoist'])));
            fetchTodoistProjects(token);
            setIntegrationsList(prev => prev.map(item =>
              item.id === 'todoist'
                ? { ...item, status: 'Active', statusKey: 'integrations.status.active' as TranslationKey, accEmail: 'Compte connecté', accEmailKey: 'integrations.todoist.acc_email_connected' as TranslationKey }
                : item
            ));
          };
          if (electronObj) {
            try {
              const dbSettings = await electronObj.dbGet(
                "SELECT todoist_token, todoist_project_id FROM settings WHERE user_id = ? LIMIT 1",
                [user.id]
              );
              if (dbSettings?.todoist_token) {
                applyTodoistToken(dbSettings.todoist_token, dbSettings.todoist_project_id || '');
              }
            } catch (dbErr) {
              console.error("Error loading Todoist local settings on mount:", dbErr);
            }
          } else {
            try {
              const supabase = createClient();
              const { data: dbSettings } = await supabase
                .from('settings')
                .select('todoist_token, todoist_project_id')
                .eq('user_id', user.id)
                .maybeSingle();
              if (dbSettings?.todoist_token) {
                applyTodoistToken(dbSettings.todoist_token, dbSettings.todoist_project_id || '');
              }
            } catch (dbErr) {
              console.error("Error loading Todoist Supabase settings on mount:", dbErr);
            }
          }
        }
      } catch (err) {
        console.error("Error loading settings in integrations:", err);
      }
    };
    fetchUser();
  }, [contextUser]);

  const handleCreateCustomIntegration = (e: React.FormEvent) => {
    e.preventDefault();
    setJsonManifestError('');

    let resolvedName = customName.trim();
    let resolvedDescription = customDescription.trim();

    if (customType === 'json') {
      try {
        const manifest = JSON.parse(jsonManifestInput);
        if (!manifest.name || typeof manifest.name !== 'string') {
          setJsonManifestError('Le champ "name" est requis (string).');
          return;
        }
        const validAuthTypes = ['none', 'key', 'oauth', 'bearer', 'basic'];
        if (manifest.authType && !validAuthTypes.includes(manifest.authType)) {
          setJsonManifestError(`"authType" invalide. Valeurs acceptées : ${validAuthTypes.join(', ')}.`);
          return;
        }
        if (manifest.endpoints !== undefined && !Array.isArray(manifest.endpoints)) {
          setJsonManifestError('"endpoints" doit être un tableau.');
          return;
        }
        resolvedName = manifest.name;
        resolvedDescription = manifest.description ?? '';
      } catch {
        setJsonManifestError('JSON invalide — vérifiez la syntaxe.');
        return;
      }
    }

    if (!resolvedName) return;

    const newId = 'custom-' + Date.now();
    const newIntegration: IntegrationItem = {
      id: newId,
      name: resolvedName,
      category: 'custom',
      owner: userName,
      email: userEmail || `${userName.toLowerCase().replace(/\s/g, '')}@minerva-os-lite.com`,
      accEmail: 'Custom Connected Integration',
      accEmailKey: 'integrations.custom.acc_email',
      icon: () => (
        <div className="w-7 h-7 rounded-lg bg-[#059669]/10 flex items-center justify-center border border-[#059669]/20 shrink-0">
          <Plug className="w-4 h-4 text-[#059669]" />
        </div>
      ),
      status: 'Active',
      statusKey: 'integrations.status.active',
      assets: '—',
      access: 'Private',
      accessKey: 'integrations.access.private',
      description: resolvedDescription || 'Custom created integration connector.',
      descriptionKey: resolvedDescription ? undefined : 'integrations.custom.default_description',
      custom: true
    };

    setIntegrationsList(prev => [...prev, newIntegration]);
    connectIntegration(newId);
    setConnectedIds(prev => [...prev, newId]);

    setCustomName('');
    setCustomDescription('');
    setCustomType('scratch');
    setJsonManifestInput('');
    setShowAddScratchModal(false);

    // Open full screen editor workspace for this newly created integration
    setActiveIntegrationEditId(newId);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsSendingInvite(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setIsSendingInvite(false);
    setInviteSuccess(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    setInviteEmail('');
    setInviteSuccess(false);
    setShowInviteModal(false);
  };

  const handleSaveEditChanges = async () => {
    setIsSavingEdit(true);
    await new Promise(r => setTimeout(r, 1000));
    setIsSavingEdit(false);
    setEditSavedSuccess(true);
    await new Promise(r => setTimeout(r, 1200));
    setEditSavedSuccess(false);
  };

  // Filter integration list
  const filteredConnected = integrationsList.filter(item => {
    const isConnected = connectedIds.includes(item.id);
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    if (!isConnected || !matchesSearch) return false;

    if (filterTab === 'custom') return item.custom;
    return true;
  });

  const filteredAvailable = integrationsList.filter(item => {
    const isNotConnected = !connectedIds.includes(item.id);
    const matchesSearch = item.name.toLowerCase().includes(availableSearchQuery.toLowerCase());
    return isNotConnected && matchesSearch;
  });

  const activeEditIntegration = integrationsList.find(i => i.id === activeIntegrationEditId);

  const resolveItemName = (item: IntegrationItem) => item.nameKey ? t(item.nameKey, item.name) : item.name;
  const resolveItemDescription = (item: IntegrationItem) => item.descriptionKey ? t(item.descriptionKey, item.description) : item.description;
  const resolveItemStatus = (item: IntegrationItem) => item.statusKey ? t(item.statusKey, item.status) : item.status;
  const resolveItemAccess = (item: IntegrationItem) => item.accessKey ? t(item.accessKey, item.access) : item.access;
  const resolveItemAccEmail = (item: IntegrationItem) => item.accEmailKey ? t(item.accEmailKey, item.accEmail) : item.accEmail;
  const resolveItemAssets = (item: IntegrationItem) => item.assetsKey ? t(item.assetsKey, item.assets) : item.assets;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white text-[#26251e] font-sans selection:bg-[#059669]/10 relative">
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />
      
      {/* Integration Editor View */}
      {activeIntegrationEditId && activeEditIntegration ? (
        <div className="flex-1 overflow-y-auto bg-transparent p-8 animate-in fade-in duration-200 relative z-10">
            <div className="max-w-4xl mx-auto space-y-8">
              
              {/* Editor Header Section */}
              <div className="flex items-start justify-between border-b border-[#e5e5e0] pb-6 text-left">
                <div className="flex gap-4 items-center">
                  {/* Icon */}
                  {typeof activeEditIntegration.icon === 'function' ? (
                    <div className="w-14 h-14 rounded-2xl bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center text-[#059669] shrink-0 shadow-2xs">
                      <activeEditIntegration.icon size={28} />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center text-[#059669] shrink-0 shadow-2xs">
                      <Plug className="w-6 h-6" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <h1 className="text-xl font-bold leading-none">{resolveItemName(activeEditIntegration)}</h1>
                    <p className="text-xs text-[#7a7a76] line-clamp-1">{resolveItemDescription(activeEditIntegration)}</p>
                    <p className="text-[10px] text-[#7a7a76]">{t('integrations.editor.by')} <span className="font-semibold text-[#26251e]">{activeEditIntegration.owner}</span></p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8.5 text-xs font-semibold px-3.5 border-[#e5e5e0] text-[#555552] hover:text-[#26251e] bg-white rounded-md"
                  >
                    {t('integrations.editor.export')}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button title={t('integrations.editor.more_options')} aria-label={t('integrations.editor.more_options')} className="h-8.5 w-8.5 flex items-center justify-center rounded-md border border-[#e5e5e0] hover:bg-slate-50 text-[#7a7a76]">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44 text-xs font-semibold bg-white border-[#e5e5e0] shadow-md rounded-md p-1 font-sans">
                      <DropdownMenuItem
                        onClick={() => handleDisconnect(activeEditIntegration.id)}
                        className="hover:bg-red-50 cursor-pointer p-2 rounded text-red-600"
                      >
                        {t('integrations.editor.disconnect')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Editor Tabs Navigation */}
              <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-px">
                <div className="flex gap-6 text-xs font-bold text-[#7a7a76]">
                  <button
                    onClick={() => setActiveTab('build')}
                    className={`pb-2.5 transition-colors border-b-2 -mb-px ${activeTab === 'build' ? 'border-[#059669] text-[#26251e]' : 'border-transparent hover:text-[#26251e]'}`}
                  >
                    &lt;/&gt; {t('integrations.editor.tab_build')}
                  </button>
                  <button
                    onClick={() => setActiveTab('share')}
                    className={`pb-2.5 transition-colors border-b-2 -mb-px ${activeTab === 'share' ? 'border-[#059669] text-[#26251e]' : 'border-transparent hover:text-[#26251e]'}`}
                  >
                    👥 {t('integrations.editor.tab_share')}
                  </button>
                  <button
                    onClick={() => setActiveTab('insights')}
                    className={`pb-2.5 transition-colors border-b-2 -mb-px ${activeTab === 'insights' ? 'border-[#059669] text-[#26251e]' : 'border-transparent hover:text-[#26251e]'}`}
                  >
                    📈 {t('integrations.editor.tab_insights')}
                  </button>
                </div>
              </div>

              {/* Tab Content Area */}
              <div className="text-left">

                {/* Build Tab */}
                {activeTab === 'build' && (
                  <div className="space-y-6">
                    <div className="flex gap-4 border-b border-[#e5e5e0] pb-px text-xs font-bold text-[#7a7a76] mb-4">
                      <button
                        onClick={() => setActiveBuildSubTab('auth')}
                        className={`pb-2 ${activeBuildSubTab === 'auth' ? 'text-[#26251e] border-b-2 border-[#26251e]' : 'hover:text-[#26251e]'}`}
                      >
                        {t('integrations.editor.subtab_authentication')}
                      </button>
                      <button
                        onClick={() => setActiveBuildSubTab('actions')}
                        className={`pb-2 ${activeBuildSubTab === 'actions' ? 'text-[#26251e] border-b-2 border-[#26251e]' : 'hover:text-[#26251e]'}`}
                      >
                        {t('integrations.editor.subtab_actions')}
                      </button>
                      <button
                        onClick={() => setActiveBuildSubTab('triggers')}
                        className={`pb-2 ${activeBuildSubTab === 'triggers' ? 'text-[#26251e] border-b-2 border-[#26251e]' : 'hover:text-[#26251e]'}`}
                      >
                        {t('integrations.editor.subtab_triggers')}
                      </button>
                    </div>

                    {activeBuildSubTab === 'auth' && (
                      activeEditIntegration.id === 'todoist' ? (
                        <div className="border border-[#e5e5e0] rounded-xl bg-white p-6 space-y-6 shadow-2xs">
                          <div className="flex items-center justify-between border-b border-[#e5e5e0]/60 pb-3">
                            <h2 className="font-bold text-sm">{t('integrations.todoist.config_title')}</h2>
                            <Button
                              onClick={saveTodoistSettings}
                              disabled={!todoistToken}
                              className="h-8 font-bold text-xs rounded-lg px-4 bg-[#059669] hover:bg-[#047857] text-white"
                            >
                              {t('integrations.editor.save')}
                            </Button>
                          </div>

                          <div className="space-y-4 max-w-md">
                            <div className="space-y-1.5">
                              <h3 className="text-xs font-bold text-[#26251e]">{t('integrations.todoist.token_label')}</h3>
                              <p className="text-[11px] text-[#7a7a76] leading-relaxed">{t('integrations.todoist.token_desc')}</p>
                              <div className="flex gap-2 pt-1">
                                <input
                                  type="password"
                                  placeholder={t('integrations.todoist.token_placeholder')}
                                  value={todoistToken}
                                  onChange={(e) => setTodoistToken(e.target.value)}
                                  className="flex-1 text-xs p-2 bg-white border border-[#e6e5e0] rounded focus:outline-none focus:ring-1 focus:ring-[#059669]"
                                />
                                <Button
                                  type="button"
                                  onClick={() => fetchTodoistProjects(todoistToken)}
                                  disabled={loadingProjects || !todoistToken}
                                  className="h-8 text-xs font-semibold px-3 border border-[#e5e5e0] text-[#555552] bg-white hover:bg-slate-50 shrink-0"
                                >
                                  {loadingProjects ? <Loader2 className="w-3 animate-spin" /> : t('integrations.todoist.load_projects')}
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-1.5 pt-2">
                              <h3 className="text-xs font-bold text-[#26251e]">{t('integrations.todoist.target_project_label')}</h3>
                              <p className="text-[11px] text-[#7a7a76]">{t('integrations.todoist.target_project_desc')}</p>
                              <select
                                value={todoistProjectId}
                                onChange={(e) => setTodoistProjectId(e.target.value)}
                                className="w-full text-xs p-2 bg-white border border-[#e6e5e0] rounded focus:outline-none focus:ring-1 focus:ring-[#059669] mt-1"
                              >
                                <option value="">{t('integrations.todoist.choose_project_option')}</option>
                                {todoistProjects.map(proj => (
                                  <option key={proj.id} value={proj.id}>{proj.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="pt-4 border-t border-[#e5e5e0]/60 flex items-center justify-between">
                              <Button
                                type="button"
                                onClick={async () => {
                                  if (!contextUser) return;
                                  const electronObj = typeof window !== 'undefined' && (window as any).electron;
                                  try {
                                    if (electronObj) {
                                      await electronObj.dbRun("UPDATE settings SET todoist_token = NULL, todoist_project_id = NULL WHERE user_id = ?", [contextUser.id]);
                                    } else {
                                      const supabase = createClient();
                                      await supabase.from('settings').upsert({ user_id: contextUser.id, todoist_token: null, todoist_project_id: null, updated_at: new Date().toISOString() });
                                    }
                                    setConnectedIds(prev => prev.filter(id => id !== 'todoist'));
                                    setTodoistToken('');
                                    setTodoistProjectId('');
                                    setTodoistProjects([]);
                                    setIntegrationsList(prev => prev.map(item =>
                                      item.id === 'todoist'
                                        ? { ...item, status: 'Inactive', statusKey: 'integrations.status.inactive' as TranslationKey, accEmail: 'Todoist Task Connector', accEmailKey: 'integrations.todoist.acc_email' as TranslationKey }
                                        : item
                                    ));
                                    toast.success(t('integrations.todoist.disconnected_success'));
                                    setActiveIntegrationEditId(null);
                                  } catch (err) {
                                    console.error(err);
                                  }
                                }}
                                className="h-8 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 font-bold text-xs rounded-lg px-4"
                              >
                                {t('integrations.editor.disconnect_integration')}
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => setActiveIntegrationEditId(null)}
                                className="h-8 text-xs text-[#555552]"
                              >
                                {t('integrations.editor.back')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : activeEditIntegration.id.startsWith('google-') ? (
                        <div className="border border-[#e5e5e0] rounded-xl bg-white p-6 space-y-6 shadow-2xs">
                          <div className="flex items-center justify-between border-b border-[#e5e5e0]/60 pb-3">
                            <h2 className="font-bold text-sm">Configuration Google Integration</h2>
                          </div>

                          <div className="space-y-4 max-w-xl text-xs text-left">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#7a7a76]">Statut de connexion :</span>
                              {googleStatus.connected ? (
                                <span className="font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 rounded px-2 py-0.5">Connecté</span>
                              ) : (
                                <span className="font-semibold text-slate-500 bg-slate-50 border border-slate-100 rounded px-2 py-0.5">Non connecté</span>
                              )}
                            </div>

                            {googleStatus.connected && googleStatus.email && (
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#7a7a76]">Compte Google :</span>
                                <span className="font-mono text-[#26251e] bg-slate-50 border border-slate-200 rounded px-2 py-0.5">{googleStatus.email}</span>
                              </div>
                            )}

                            {activeEditIntegration.id === 'google-places' ? (
                              <div className="p-4 bg-emerald-50/50 border border-emerald-200/50 rounded-xl space-y-2">
                                <p className="text-[11px] text-emerald-800 leading-relaxed font-semibold">
                                  L'intégration Google Places utilise la clé d'API serveur de Minerva.
                                </p>
                                <p className="text-[11px] text-[#7a7a76] leading-relaxed">
                                  Elle est active pour tout l'espace de travail et prête pour la recherche de prospects et POIs locaux.
                                </p>
                              </div>
                            ) : (
                              <>
                                <div className="space-y-2">
                                  <span className="font-bold text-[#7a7a76]">{t('integrations.google.connected_scopes')}</span>
                                  <div className="flex flex-wrap gap-1.5 pt-1">
                                    {googleStatus.scopes.length > 0 ? (
                                      googleStatus.scopes.map((sc, index) => (
                                        <span key={index} className="bg-slate-100 text-[#555552] border border-slate-200 rounded px-2 py-0.5 font-mono text-[9px]">
                                          {sc.replace('https://www.googleapis.com/auth/', '')}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-[#7a7a76] italic">Aucune permission accordée.</span>
                                    )}
                                  </div>
                                </div>

                                {activeEditIntegration.id === 'google-drive' && googleStatus.connected && !googleStatus.scopes.some(s => s.includes('drive.file')) && (
                                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-3">
                                    <p className="text-[11px] text-amber-800 leading-relaxed font-semibold">
                                      {t('integrations.google.drive_auth_warning')}
                                    </p>
                                    <Button
                                      onClick={() => {
                                        window.location.href = `/api/google/auth/start?pack=documents&redirect=/integrations`;
                                      }}
                                      className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg px-4"
                                    >
                                      {t('integrations.google.drive_auth_cta')}
                                    </Button>
                                  </div>
                                )}

                                <div className="pt-4 border-t border-[#e5e5e0]/60">
                                  <Button
                                    type="button"
                                    onClick={() => handleDisconnect(activeEditIntegration.id)}
                                    className="h-8 border border-red-200 text-red-600 bg-red-50 hover:bg-red-100 font-bold text-xs rounded-lg px-4"
                                  >
                                    {t('integrations.editor.disconnect_integration')}
                                  </Button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="border border-[#e5e5e0] rounded-xl bg-white p-6 space-y-6 shadow-2xs">
                          <div className="flex items-center justify-between border-b border-[#e5e5e0]/60 pb-3">
                            <h2 className="font-bold text-sm">{t('integrations.editor.subtab_authentication')}</h2>
                            <Button
                              onClick={handleSaveEditChanges}
                              disabled={isSavingEdit || editSavedSuccess}
                              className={`h-8 font-bold text-xs rounded-lg px-4 flex items-center gap-1.5 transition-all ${editSavedSuccess ? 'bg-[#059669]/10 text-[#059669] border border-[#059669]/20 hover:bg-[#059669]/10' : 'bg-[#059669] hover:bg-[#047857] text-white'}`}
                            >
                              {isSavingEdit ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : editSavedSuccess ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>{t('integrations.editor.saved_success')}</span>
                                </>
                              ) : (
                                <span>{t('integrations.editor.save')}</span>
                              )}
                            </Button>
                          </div>

                          <div className="space-y-4 max-w-md">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold bg-[#f4f4f3] px-2 py-0.5 border border-[#e5e5e0] rounded">{t('integrations.editor.step_1')}</span>
                              <h3 className="text-xs font-bold mt-1 text-[#26251e]">{t('integrations.editor.auth_type_title')}</h3>
                              <p className="text-[11px] text-[#7a7a76]">{t('integrations.editor.auth_type_desc')}</p>
                            </div>

                            <select
                              id="auth-type-select"
                              title={t('integrations.editor.auth_type_select_title')}
                              value={authType}
                              onChange={(e) => setAuthType(e.target.value as 'none' | 'key' | 'oauth')}
                              className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669]"
                            >
                              <option value="none">{t('integrations.editor.auth_option_none')}</option>
                              <option value="key">{t('integrations.editor.auth_option_key')}</option>
                              <option value="oauth">{t('integrations.editor.auth_option_oauth')}</option>
                            </select>
                          </div>
                        </div>
                      )
                    )}

                    {activeBuildSubTab === 'actions' && (
                      <div className="border border-[#e5e5e0] rounded-xl bg-white p-6 space-y-4 shadow-2xs flex flex-col items-center justify-center py-12">
                        <Cpu className="w-8 h-8 text-[#7a7a76]" />
                        <div className="text-center space-y-1">
                          <h3 className="font-bold text-xs">{t('integrations.editor.no_actions_title')}</h3>
                          <p className="text-[11px] text-[#7a7a76] max-w-xs leading-relaxed">{t('integrations.editor.no_actions_desc')}</p>
                        </div>
                        <Button className="h-8 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white">{t('integrations.editor.add_action')}</Button>
                      </div>
                    )}

                    {activeBuildSubTab === 'triggers' && (
                      <div className="border border-[#e5e5e0] rounded-xl bg-white p-6 space-y-4 shadow-2xs flex flex-col items-center justify-center py-12">
                        <Cpu className="w-8 h-8 text-[#7a7a76]" />
                        <div className="text-center space-y-1">
                          <h3 className="font-bold text-xs">{t('integrations.editor.no_triggers_title')}</h3>
                          <p className="text-[11px] text-[#7a7a76] max-w-xs leading-relaxed">{t('integrations.editor.no_triggers_desc')}</p>
                        </div>
                        <Button className="h-8 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white">{t('integrations.editor.add_trigger')}</Button>
                      </div>
                    )}

                  </div>
                )}

                {/* Share Tab */}
                {activeTab === 'share' && (
                  <div className="border border-[#e5e5e0] rounded-xl bg-white p-6 space-y-6 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-[#e5e5e0]/60 pb-3">
                      <h2 className="font-bold text-sm">{t('integrations.editor.share_title')}</h2>
                      <Button
                        onClick={handleSaveEditChanges}
                        disabled={isSavingEdit || editSavedSuccess}
                        className={`h-8 font-bold text-xs rounded-lg px-4 flex items-center gap-1.5 transition-all ${editSavedSuccess ? 'bg-[#059669]/10 text-[#059669] border border-[#059669]/20 hover:bg-[#059669]/10' : 'bg-[#059669] hover:bg-[#047857] text-white'}`}
                      >
                        {isSavingEdit ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : editSavedSuccess ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>{t('integrations.editor.shared_success')}</span>
                          </>
                        ) : (
                          <span>{t('integrations.editor.save')}</span>
                        )}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {/* Invite input */}
                      <div className="space-y-1.5">
                        <label htmlFor="invite-email-input-field" className="text-xs font-bold text-[#26251e]">{t('integrations.editor.invite_users_label')}</label>
                        <div className="flex gap-2">
                          <Input
                            id="invite-email-input-field"
                            title={t('integrations.editor.invite_users_label')}
                            placeholder={t('integrations.editor.invite_users_placeholder')}
                            value={inviteEmailInput}
                            onChange={(e) => setInviteEmailInput(e.target.value)}
                            className="h-9 text-xs border-[#e5e5e0] focus-visible:ring-[#059669]"
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              if (inviteEmailInput.trim()) {
                                setInviteEmailInput('');
                                toast.success(t('integrations.editor.invite_user_success'));
                              }
                            }}
                            className="h-9 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white"
                          >
                            {t('integrations.editor.add')}
                          </Button>
                        </div>
                      </div>

                      {/* People with access list */}
                      <div className="space-y-2">
                        <label htmlFor="access-role-select" className="text-xs font-bold text-[#26251e] block">{t('integrations.editor.people_with_access')}</label>
                        <div className="border border-[#e5e5e0]/60 rounded-xl p-3 bg-[#fdfdfc] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#059669]/10 flex items-center justify-center font-bold text-xs text-[#059669]">
                              {userName.substring(0, 1).toUpperCase()}
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold text-[#26251e]">{userName} {t('integrations.editor.you_suffix')}</p>
                              <p className="text-[10px] text-[#7a7a76]">{activeEditIntegration.email}</p>
                            </div>
                          </div>
                          <select id="access-role-select" title={t('integrations.editor.access_role_title')} className="text-xs bg-white border border-[#e5e5e0] p-1.5 rounded cursor-pointer">
                            <option value="editor">{t('integrations.editor.role_editor')}</option>
                            <option value="viewer">{t('integrations.editor.role_viewer')}</option>
                            <option value="admin">{t('integrations.editor.role_owner')}</option>
                          </select>
                        </div>
                      </div>

                      {/* General access */}
                      <div className="space-y-2">
                        <label htmlFor="general-access-select" className="text-xs font-bold text-[#26251e] block">{t('integrations.editor.general_access')}</label>
                        <div className="flex items-start gap-3 bg-[#fcfcfb] border border-[#e5e5e0] p-4 rounded-xl">
                          <div className="w-7 h-7 rounded-full bg-[#e5e5e2]/80 flex items-center justify-center text-[#7a7a76] shrink-0">
                            {generalAccessType === 'restricted' ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                          </div>
                          <div className="space-y-1">
                            <select
                              id="general-access-select"
                              title={t('integrations.editor.general_access')}
                              value={generalAccessType}
                              onChange={(e) => setGeneralAccessType(e.target.value as 'restricted' | 'public')}
                              className="text-xs bg-transparent border-none font-bold text-[#26251e] focus:outline-none p-0 cursor-pointer"
                            >
                              <option value="restricted">{t('integrations.editor.access_restricted')}</option>
                              <option value="public">{t('integrations.editor.access_public')}</option>
                            </select>
                            <p className="text-[10px] text-[#7a7a76] leading-relaxed">
                              {generalAccessType === 'restricted' ? t('integrations.editor.access_restricted_desc') : t('integrations.editor.access_public_desc')}
                            </p>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* Insights Tab */}
                {activeTab === 'insights' && (
                  <div className="border border-[#e5e5e0] rounded-xl bg-white p-6 space-y-6 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-[#e5e5e0]/60 pb-3">
                      <h2 className="font-bold text-sm">{t('integrations.editor.insights_title')}</h2>
                      <div className="flex gap-2">
                        <select id="time-filter-select" title={t('integrations.editor.time_filter_title')} className="text-xs bg-white border border-[#e5e5e0] p-1.5 rounded cursor-pointer">
                          <option value="30">{t('integrations.editor.last_30_days')}</option>
                          <option value="7">{t('integrations.editor.last_7_days')}</option>
                        </select>
                        <div className="text-xs bg-slate-50 border border-[#e5e5e0] px-3 py-1.5 rounded font-mono text-[#555552]">
                          Mar 23 - Apr 21
                        </div>
                      </div>
                    </div>

                    <div className="py-16 flex flex-col items-center justify-center space-y-3">
                      <div className="w-10 h-10 rounded-full bg-[#f4f4f3] flex items-center justify-center text-[#7a7a76]">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div className="text-center space-y-1">
                        <h4 className="font-bold text-xs text-[#26251e]">{t('integrations.editor.no_actions_configured_title')}</h4>
                        <p className="text-[11px] text-[#7a7a76] max-w-xs leading-relaxed">{t('integrations.editor.no_actions_configured_desc')}</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>
          </div>
        ) : (
          /* Main Integrations Scrollable list */
          <div className="flex-1 overflow-y-auto relative z-10">
            <div className="max-w-5xl mx-auto p-8 space-y-10">
              
              {/* Connected Integrations Section */}
              <div className="space-y-5">
                
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
                  <div className="space-y-1">
                    <h1 className="text-xl font-bold tracking-tight text-[#26251e]">{t('integrations.connected_title')}</h1>
                    <p className="text-xs text-[#7a7a76]">{t('integrations.connected_subtitle')}</p>
                  </div>

                  {/* Dropdown Menu for Add integration */}
                  <div className="shrink-0 self-start sm:self-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          className="h-8.5 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white flex items-center gap-1.5 rounded-md px-3.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>{t('integrations.add_integration')}</span>
                          <ChevronDown className="h-3 w-3 ml-0.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 text-xs font-semibold bg-white border-[#e5e5e0] shadow-md rounded-md p-1 font-sans">
                        <DropdownMenuItem
                          onClick={() => setShowAddScratchModal(true)}
                          className="hover:bg-slate-50 cursor-pointer p-2 rounded text-[#26251e]"
                        >
                          + {t('integrations.start_from_scratch')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => router.push('/integrations/import')}
                          className="hover:bg-slate-50 cursor-pointer p-2 rounded text-[#26251e]"
                        >
                          {t('integrations.import_integration')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Filters row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#e5e5e0] pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative w-64">
                      <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#7a7a76]" />
                      <Input
                        id="search-integrations-input"
                        title={t('integrations.search_title')}
                        placeholder={t('integrations.search_placeholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-8.5 pl-8.5 text-xs bg-white border-[#e5e5e0] focus-visible:ring-1 focus-visible:ring-[#059669] rounded-md"
                      />
                    </div>

                    {/* Filter tabs */}
                    <div className="flex border border-[#e5e5e0] rounded-md bg-[#f4f4f3]/40 p-0.5 text-xs">
                      <button
                        onClick={() => setFilterTab('all')}
                        className={`px-3 py-1 rounded font-semibold transition-all ${filterTab === 'all' ? 'bg-white text-[#26251e] shadow-2xs' : 'text-[#7a7a76] hover:text-[#26251e]'}`}
                      >
                        {t('integrations.filter_all')}
                      </button>
                      <button
                        onClick={() => setFilterTab('connected')}
                        className={`px-3 py-1 rounded font-semibold transition-all ${filterTab === 'connected' ? 'bg-white text-[#26251e] shadow-2xs' : 'text-[#7a7a76] hover:text-[#26251e]'}`}
                      >
                        {t('integrations.filter_connected')}
                      </button>
                      <button
                        onClick={() => setFilterTab('custom')}
                        className={`px-3 py-1 rounded font-semibold transition-all ${filterTab === 'custom' ? 'bg-white text-[#26251e] shadow-2xs' : 'text-[#7a7a76] hover:text-[#26251e]'}`}
                      >
                        {t('integrations.filter_built_by_me')}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Connected Integrations Table */}
                <div className="border border-[#e5e5e0] rounded-xl overflow-hidden shadow-xs bg-white text-left">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#f4f4f3]/40 border-b border-[#e5e5e0] text-[#7a7a76] font-semibold">
                        <th className="py-2.5 px-4 font-bold flex items-center gap-1 cursor-pointer hover:text-[#26251e]">
                          <span>{t('integrations.table_name')}</span>
                          <ChevronDown className="h-3 w-3" />
                        </th>
                        <th className="py-2.5 px-4 font-bold">{t('integrations.table_connection_status')}</th>
                        <th className="py-2.5 px-4 font-bold">{t('integrations.table_assets')}</th>
                        <th className="py-2.5 px-4 font-bold flex items-center gap-1 cursor-pointer hover:text-[#26251e]">
                          <span>{t('integrations.table_access')}</span>
                          <ChevronDown className="h-3 w-3" />
                        </th>
                        <th className="py-2.5 px-4 font-bold">Added by</th>
                        <th className="py-2.5 px-4 font-bold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e5e5e0]">
                      {filteredConnected.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-xs text-[#7a7a76]">
                            {t('integrations.no_connected_match')}
                          </td>
                        </tr>
                      ) : (
                        filteredConnected.map((item) => {
                          const IconComponent = item.icon;
                          return (
                            <tr key={item.id} className="hover:bg-[#f4f4f3]/10 transition-colors">
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-3">
                                  {typeof IconComponent === 'function' ? (
                                    <IconComponent size={28} className="shrink-0" />
                                  ) : (
                                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                      <Plug className="w-4 h-4 text-slate-500" />
                                    </div>
                                  )}
                                  <div className="flex flex-col text-left">
                                    <span className="font-semibold text-sm text-[#26251e]">{resolveItemName(item)}</span>
                                    <span className="text-[10px] text-[#7a7a76]">{resolveItemAccEmail(item)}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="font-medium text-[#26251e]">{resolveItemStatus(item)}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-[#7a7a76] font-medium text-left">{resolveItemAssets(item)}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1 bg-[#f4f4f3] px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#555552] w-fit">
                                  {item.access === 'Private' ? <Lock className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5 text-[#7a7a76]" />}
                                  <span>{resolveItemAccess(item)}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex flex-col text-left">
                                  <span className="font-semibold text-[#26251e]">{item.owner}</span>
                                  <span className="text-[10px] text-[#7a7a76]">{item.email}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <Button
                                  onClick={() => setDetailIntegration(item)}
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs font-semibold px-2 text-[#7a7a76] hover:text-[#059669] hover:bg-emerald-50/50"
                                >
                                  {t('integrations.configure')}
                                </Button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

              </div>

              {/* Available Integrations Section */}
              <div className="space-y-5 text-left">

                {/* Header */}
                <div className="space-y-1">
                  <h2 className="text-xl font-bold tracking-tight text-[#26251e]">{t('integrations.available_title')}</h2>
                  <p className="text-xs text-[#7a7a76]">{t('integrations.available_subtitle')}</p>
                </div>

                {/* Search Available integrations */}
                <div className="relative w-64 pb-2">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#7a7a76]" />
                  <Input
                    id="search-available-integrations-input"
                    title={t('integrations.search_available_title')}
                    placeholder={t('integrations.search_placeholder')}
                    value={availableSearchQuery}
                    onChange={(e) => setAvailableSearchQuery(e.target.value)}
                    className="h-8.5 pl-8.5 text-xs bg-white border-[#e5e5e0] focus-visible:ring-1 focus-visible:ring-[#059669] rounded-md"
                  />
                </div>

                {/* Grid of Available Integrations cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAvailable.length === 0 ? (
                    <div className="col-span-2 py-8 text-center text-xs text-[#7a7a76]">
                      {t('integrations.all_available_connected')}
                    </div>
                  ) : (
                    filteredAvailable.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <div
                          key={item.id}
                          onClick={() => setDetailIntegration(item)}
                          className="p-5 border border-[#e5e5e0] hover:border-[#7a7a76] bg-[#f4f4f3]/10 hover:bg-[#f4f4f3]/20 transition-all rounded-xl flex flex-col justify-between h-[160px] shadow-2xs group cursor-pointer"
                        >
                          <div className="space-y-2">
                            <div className="pb-1 text-left">
                              {typeof IconComponent === 'function' ? (
                                <IconComponent size={20} className="text-[#7a7a76]" />
                              ) : (
                                <Plug className="w-5 h-5 text-[#7a7a76]" />
                              )}
                            </div>
                            <h3 className="font-bold text-sm text-[#26251e] text-left">{resolveItemName(item)}</h3>
                            <p className="text-[11px] text-[#7a7a76] leading-relaxed text-left">
                              {resolveItemDescription(item)}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider group-hover:text-[#26251e] transition-colors mt-2 text-left">
                            {t('integrations.connect')}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>

              </div>

            </div>
          </div>
        )}


      {/* Integration Detail Panel */}
      {detailIntegration && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white border border-[#e6e5e0] rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
            {/* Header */}
            <div className="flex items-start gap-4 p-6 border-b border-[#e5e5e0]">
              <div className="w-14 h-14 rounded-2xl bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center text-[#059669] shrink-0">
                {typeof detailIntegration.icon === 'function' ? (
                  <detailIntegration.icon size={28} />
                ) : (
                  <Plug className="w-6 h-6" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-[#26251e]">{resolveItemName(detailIntegration)}</h3>
                <p className="text-xs text-[#7a7a76] mt-0.5 leading-relaxed">{resolveItemDescription(detailIntegration)}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full ${detailIntegration.status === 'Active' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                    {resolveItemStatus(detailIntegration)}
                  </span>
                  <span className="text-[9px] text-[#7a7a76]">{resolveItemAccess(detailIntegration)}</span>
                </div>
              </div>
              <button
                onClick={() => setDetailIntegration(null)}
                className="text-[#7a7a76] hover:text-[#26251e] p-1 rounded-md hover:bg-slate-100 shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* How to use */}
            <div className="p-6 space-y-3 text-left">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Comment utiliser</h4>
              <ol className="space-y-2 text-xs text-[#555552] list-none">
                {(detailIntegration.steps ?? [
                  'Connectez votre compte via le bouton « Se connecter » ci-dessous.',
                  'Configurez les permissions et le niveau d\'accès dans l\'éditeur.',
                  'L\'intégration sera disponible dans vos agents et espaces de travail.',
                ]).map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-[#059669]/10 text-[#059669] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 px-6 py-4 bg-[#fafaf8] border-t border-[#e5e5e0]">
              <Button
                variant="ghost"
                onClick={() => setDetailIntegration(null)}
                className="h-8 text-xs text-[#555552]"
              >
                Fermer
              </Button>
              {connectedIds.includes(detailIntegration.id) ? (
                <Button
                  onClick={() => {
                    setDetailIntegration(null);
                    setActiveIntegrationEditId(detailIntegration.id);
                  }}
                  className="h-8 text-xs bg-[#059669] hover:bg-[#047857] text-white font-bold"
                >
                  Ouvrir l'éditeur
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    setSelectedIntegration(detailIntegration);
                    setDetailIntegration(null);
                    setShowConnectModal(true);
                  }}
                  className="h-8 text-xs bg-[#059669] hover:bg-[#047857] text-white font-bold"
                >
                  Se connecter
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Connect Integration Modal Overlay */}
      {showConnectModal && selectedIntegration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-[#e6e5e0] rounded-xl p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1 text-left">
              <h3 className="text-sm font-bold text-[#26251e]">{t('integrations.connect_modal.title')} {resolveItemName(selectedIntegration)}</h3>
              <p className="text-xs text-[#7a7a76]">{t('integrations.connect_modal.body')}</p>
            </div>
            <div className="flex justify-end gap-2 text-xs pt-1">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedIntegration(null);
                  setShowConnectModal(false);
                }}
                className="h-8 text-[#555552]"
              >
                {t('integrations.cancel')}
              </Button>
              <Button
                onClick={() => {
                  if (selectedIntegration.id.startsWith('google-') && selectedIntegration.id !== 'google-places') {
                    const pack = selectedIntegration.id === 'google-drive' ? 'documents' : 'communication';
                    // Show the polished, reusable Google permission modal
                    setShowConnectModal(false);
                    setSelectedIntegration(null);
                    setGoogleModal({ open: true, pack });
                    return;
                  } else {
                    connectIntegration(selectedIntegration.id);
                    setConnectedIds(prev => Array.from(new Set([...prev, selectedIntegration.id])));
                  }
                  setSelectedIntegration(null);
                  setShowConnectModal(false);
                }}
                className="h-8 bg-[#059669] hover:bg-[#047857] text-white font-bold"
              >
                {t('integrations.connect_modal.confirm')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Polished, reusable Google permission modal */}
      <GoogleConnectModal
        open={googleModal.open}
        pack={googleModal.pack}
        redirect="/integrations"
        onClose={() => setGoogleModal(prev => ({ ...prev, open: false }))}
      />

      {/* Start From Scratch / Add Integration Dialog */}
      {showAddScratchModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <form onSubmit={handleCreateCustomIntegration} className="w-full max-w-xl bg-white border border-[#e6e5e0] rounded-2xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#26251e]">{t('integrations.add_integration')}</h3>
                <p className="text-xs text-[#7a7a76]">{t('integrations.add_modal.subtitle')}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddScratchModal(false)}
                className="text-[#7a7a76] hover:text-[#26251e] p-1 rounded-md hover:bg-slate-100"
                title={t('integrations.close')}
                aria-label={t('integrations.close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{t('integrations.add_modal.type_label')}</label>
              <div className="grid grid-cols-4 gap-3">
                {/* Scratch Card */}
                <div
                  onClick={() => setCustomType('scratch')}
                  className={`p-4 border rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${customType === 'scratch' ? 'border-[#059669] bg-[#059669]/5 shadow-xs' : 'border-[#e5e5e0] hover:border-[#7a7a76] bg-white'}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-[#059669] flex items-center justify-center font-bold text-sm mb-3">
                    &lt;/&gt;
                  </div>
                  <h4 className="font-bold text-[11px] text-[#26251e] mb-1">{t('integrations.add_modal.type_scratch')}</h4>
                  <input
                    type="radio"
                    title={t('integrations.add_modal.type_scratch')}
                    aria-label={t('integrations.add_modal.type_scratch')}
                    checked={customType === 'scratch'}
                    onChange={() => setCustomType('scratch')}
                    className="text-[#059669] focus:ring-[#059669] mt-2"
                  />
                </div>

                {/* MCP Card */}
                <div
                  onClick={() => setCustomType('mcp')}
                  className={`p-4 border rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${customType === 'mcp' ? 'border-[#059669] bg-[#059669]/5 shadow-xs' : 'border-[#e5e5e0] hover:border-[#7a7a76] bg-white'}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-[#059669] flex items-center justify-center font-bold text-[10px] mb-3">
                    MCP
                  </div>
                  <h4 className="font-bold text-[11px] text-[#26251e] mb-1">{t('integrations.add_modal.type_mcp')}</h4>
                  <input
                    type="radio"
                    title={t('integrations.add_modal.type_mcp')}
                    aria-label={t('integrations.add_modal.type_mcp')}
                    checked={customType === 'mcp'}
                    onChange={() => setCustomType('mcp')}
                    className="text-[#059669] focus:ring-[#059669] mt-2"
                  />
                </div>

                {/* A2A Card */}
                <div
                  onClick={() => setCustomType('a2a')}
                  className={`p-4 border rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${customType === 'a2a' ? 'border-[#059669] bg-[#059669]/5 shadow-xs' : 'border-[#e5e5e0] hover:border-[#7a7a76] bg-white'}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-[#059669] flex items-center justify-center font-bold text-[10px] mb-3">
                    A2A
                  </div>
                  <h4 className="font-bold text-[11px] text-[#26251e] mb-1">{t('integrations.add_modal.type_a2a')}</h4>
                  <input
                    type="radio"
                    title={t('integrations.add_modal.type_a2a')}
                    aria-label={t('integrations.add_modal.type_a2a')}
                    checked={customType === 'a2a'}
                    onChange={() => setCustomType('a2a')}
                    className="text-[#059669] focus:ring-[#059669] mt-2"
                  />
                </div>

                {/* JSON Manifest Card */}
                <div
                  onClick={() => setCustomType('json')}
                  className={`p-4 border rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${customType === 'json' ? 'border-[#059669] bg-[#059669]/5 shadow-xs' : 'border-[#e5e5e0] hover:border-[#7a7a76] bg-white'}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-[#059669] flex items-center justify-center font-bold text-[10px] mb-3">
                    JSON
                  </div>
                  <h4 className="font-bold text-[11px] text-[#26251e] mb-1">Manifeste</h4>
                  <input
                    type="radio"
                    title="Import JSON"
                    aria-label="Import JSON"
                    checked={customType === 'json'}
                    onChange={() => setCustomType('json')}
                    className="text-[#059669] focus:ring-[#059669] mt-2"
                  />
                </div>
              </div>
            </div>

            {/* JSON Manifest input */}
            {customType === 'json' ? (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                  Manifeste JSON
                  <span className="ml-2 normal-case font-normal text-[#7a7a76]">Champs requis : name, description, authType, endpoints</span>
                </label>
                <textarea
                  placeholder={'{\n  "name": "Mon Intégration",\n  "description": "...",\n  "authType": "key",\n  "endpoints": []\n}'}
                  value={jsonManifestInput}
                  onChange={(e) => { setJsonManifestInput(e.target.value); setJsonManifestError(''); }}
                  className="w-full text-xs font-mono p-2.5 bg-[#f9f9f8] border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669] h-32 resize-none"
                />
                {jsonManifestError && (
                  <p className="text-[10px] text-red-600 font-semibold">{jsonManifestError}</p>
                )}
              </div>
            ) : (
              <>
                {/* Inputs */}
                <div className="space-y-1.5">
                  <label htmlFor="custom-integration-name" className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{t('integrations.add_modal.name_label')}</label>
                  <input
                    id="custom-integration-name"
                    title={t('integrations.add_modal.name_field_title')}
                    type="text"
                    required
                    placeholder={t('integrations.add_modal.name_placeholder')}
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="custom-integration-description" className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{t('integrations.add_modal.description_label')}</label>
                  <textarea
                    id="custom-integration-description"
                    title={t('integrations.add_modal.description_field_title')}
                    placeholder={t('integrations.add_modal.description_placeholder')}
                    value={customDescription}
                    onChange={(e) => setCustomDescription(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669] h-20 resize-none"
                  />
                </div>
              </>
            )}

            <div className="flex justify-end gap-2 text-xs pt-2 border-t border-[#e5e5e0]/60">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowAddScratchModal(false)}
                className="h-8.5 text-[#555552]"
              >
                {t('integrations.cancel')}
              </Button>
              <Button
                type="submit"
                className="h-8.5 bg-[#059669] hover:bg-[#047857] text-white font-bold"
              >
                {t('integrations.create')}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Invite Users Modal Overlay */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <form onSubmit={handleInviteSubmit} className="w-full max-w-sm bg-white border border-[#e6e5e0] rounded-xl p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#26251e] flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#059669]" />
                <span>{t('integrations.invite_modal.title')}</span>
              </h3>
              <p className="text-xs text-[#7a7a76]">{t('integrations.invite_modal.subtitle')}</p>
            </div>

            {inviteSuccess ? (
              <div className="py-6 flex flex-col items-center justify-center space-y-2 text-[#059669]">
                <Check className="w-8 h-8 rounded-full bg-[#059669]/10 p-1.5 border border-[#059669]/20 animate-bounce" />
                <p className="text-xs font-bold">{t('integrations.invite_modal.success')}</p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label htmlFor="invite-email-input" className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{t('integrations.invite_modal.email_label')}</label>
                  <input
                    id="invite-email-input"
                    title={t('integrations.invite_modal.email_label')}
                    type="email"
                    required
                    placeholder={t('integrations.invite_modal.email_placeholder')}
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] block mb-1">{t('integrations.invite_modal.role_label')}</label>
                  <div className="flex gap-2">
                    {(['editor', 'viewer', 'admin'] as const).map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setInviteRole(role)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md border text-center transition-colors capitalize ${inviteRole === role ? 'bg-[#059669] border-[#059669] text-white' : 'bg-white border-[#e6e5e0] text-[#555552] hover:bg-slate-50'}`}
                      >
                        {role === 'editor' ? t('integrations.invite_modal.role_editor') : role === 'viewer' ? t('integrations.invite_modal.role_viewer') : t('integrations.invite_modal.role_admin')}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-2 text-xs pt-2 border-t border-[#e5e5e0]/60">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setInviteEmail('');
                      setInviteSuccess(false);
                      setShowInviteModal(false);
                    }}
                    className="h-8 text-[#555552]"
                    disabled={isSendingInvite}
                  >
                    {t('integrations.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSendingInvite}
                    className="h-8 bg-[#059669] hover:bg-[#047857] text-white font-bold flex items-center gap-1.5"
                  >
                    {isSendingInvite ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>{t('integrations.invite_modal.sending')}</span>
                      </>
                    ) : (
                      <span>{t('integrations.invite_modal.send')}</span>
                    )}
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

    </div>
  );
}
