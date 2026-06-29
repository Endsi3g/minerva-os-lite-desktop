'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api-helper';
import {
  PenSquare,
  Search,
  Folder,
  Sparkles,
  Plug,
  FolderPlus,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Settings as SettingsIcon,
  Menu,
  Bell,
  LogOut,
  FileText,
  PanelLeftClose,
  UserPlus,
  Users,
  Check,
  X,
  Loader2,
  AlertCircle,
  Briefcase,
  Settings2,
  Globe,
  BarChart3,
  MessageSquare,
  MessageCircle,
  Megaphone,
  Download,
  LayoutDashboard,
  CreditCard,
  HelpCircle,
  Tag,
  Brain,
  Gift,
  MapPin,
  ShieldCheck,
  Mail,
  Activity,
  Kanban,
  Building2,
  RefreshCw,
  Inbox,
  ListChecks,
  Target,
  BookOpen,
  BarChart2,
  Zap,
  ClipboardList,
  Flag,
  TrendingUp,
  Send,
  MoreHorizontal,
  Home,
} from 'lucide-react';
import { BottomBlur } from '@/components/ui/edge-blur';
import { cn } from '@/lib/utils';
import { RealtimeSyncListener } from '@/components/realtime-sync-listener';
import { ReachProvider, useReach, type AppNotification, type Project } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { signout } from '@/app/login/actions';
import { MinervaIcon } from '@/components/icons';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { User as UserIcon } from 'lucide-react';
import {
  getOnboardingProgress,
  getOnboardingState,
  onboardingTasks,
  toggleOnboardingTask
} from '@/lib/onboarding-store';
import { ALL_MODULES, routeToModule, type PermissionModule } from '@/lib/permissions';
import { cachedFetch, invalidateClientCache } from '@/lib/fetch-cache';
import { requestNotificationPermission, checkAndSendTaskReminders, checkAndSendLeadReminder } from '@/lib/notification-service';
import { MinervaOwl } from '@/components/minerva-owl';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import {
  dbGetSessions,
  dbDeleteSession,
  dbToggleSessionPin,
  dbUpdateSessionProject,
  AssistantSession
} from '@/app/(app)/assistant/_components/assistant-db';
import { Pin, PinOff } from 'lucide-react';
import { CalendarDays, UsersRound } from 'lucide-react';

const CURRENT_VERSION = '5.0.0';

function UpdateBanner() {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const dismissedVersion = localStorage.getItem('minerva_dismissed_version');
      if (dismissedVersion !== CURRENT_VERSION) {
        setVisible(true);
      }
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem('minerva_dismissed_version', CURRENT_VERSION);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="bg-[#10b981] text-white text-xs font-semibold py-2 px-4 flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300 relative z-50 shrink-0 select-none">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 animate-pulse shrink-0" />
        <span>
          Une nouvelle mise à jour (v{CURRENT_VERSION}) est disponible ! Veuillez recharger la page et consulter le{' '}
          <Link href="/changelog" onClick={handleDismiss} className="underline font-bold hover:text-emerald-100">
            Changelog
          </Link>{' '}
          pour en savoir plus.
        </span>
      </div>
      <button 
        onClick={handleDismiss}
        className="text-white/80 hover:text-white p-1 hover:bg-emerald-600 rounded-full transition-colors cursor-pointer border-0 bg-transparent shrink-0"
        title="Fermer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// Relative time helper for notification timestamps (declared outside render to remain pure)
function relativeTime(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
  return new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
}

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  
  // Workspace Context
  const { user: contextUser, activeWorkspace, workspacesList, switchWorkspace, leads, tasks, notifications, unreadCount, markNotificationRead, markAllNotificationsRead, projects, createProject } = useReach();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checkingWelcome, setCheckingWelcome] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);
  const [footerExpanded, setFooterExpanded] = useState(false);

  // Dropdown States for Workspaces switcher
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isSwitchWorkspaceOpen, setIsSwitchWorkspaceOpen] = useState(false);

  // Get started onboarding menu state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [todayCollapsed, setTodayCollapsed] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    crm: true, ai: true, data: true, platform: true
  });

  const toggleCategory = (id: string) => {
    setCollapsedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // New states for Minerva OS Lite interactive features
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string | 'all'>('all');
  const [linkingSessionId, setLinkingSessionId] = useState<string | null>(null);

  // Assistant sessions for sidebar display
  const [assistantSessions, setAssistantSessions] = useState<AssistantSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState({ percent: 12, score: 0 });
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  // Spotlight search states
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sync UX badge — Electron only
  const [syncPending, setSyncPending] = useState(0);
  useEffect(() => {
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (!electronObj) return;
    const poll = async () => {
      try {
        const tables = ['leads', 'tasks', 'campaigns', 'goals', 'notifications', 'projects'];
        let total = 0;
        for (const t of tables) {
          const row = await electronObj.dbGet(`SELECT COUNT(*) as cnt FROM ${t} WHERE sync_status LIKE 'pending%'`, []);
          total += row?.cnt ?? 0;
        }
        setSyncPending(total);
      } catch { /* ignore — table may not exist yet */ }
    };
    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, []);

  // Desktop notifications — request permission once, then run daily reminders
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!leads?.length && !tasks?.length) return;
    const NOTIF_KEY = 'minerva_last_daily_notif';
    const last = localStorage.getItem(NOTIF_KEY);
    const today = new Date().toDateString();
    if (last === today) return;
    localStorage.setItem(NOTIF_KEY, today);
    checkAndSendTaskReminders(tasks ?? []);
    checkAndSendLeadReminder(leads ?? []);
  }, [leads, tasks]);



  // Dynamic Workspace Accent Color injection
  useEffect(() => {
    if (activeWorkspace?.accent_color) {
      document.documentElement.style.setProperty('--primary', activeWorkspace.accent_color);
      document.documentElement.style.setProperty('--ring', activeWorkspace.accent_color);
      document.documentElement.style.setProperty('--sidebar-primary', activeWorkspace.accent_color);
    } else {
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--ring');
      document.documentElement.style.removeProperty('--sidebar-primary');
    }
  }, [activeWorkspace]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const progressCallback = React.useCallback((node: HTMLDivElement | null) => {
    if (node !== null) {
      node.style.width = `${onboarding.percent}%`;
      node.style.transition = 'width 0.5s ease-in-out';
    }
  }, [onboarding.percent]);

  const [userProfile, setUserProfile] = useState<{ fullName: string; companyName: string; avatarBase64?: string | null } | null>(null);

  // Real-time Presence state
  const [onlineUsers, setOnlineUsers] = useState<Array<{
    userId: string;
    fullName: string;
    activePage: string;
    color: string;
    avatarBase64?: string | null;
  }>>([]);

  const [memberAvatars, setMemberAvatars] = useState<Record<string, string>>({});

  // Load workspace members' avatars from DB to display them in the presence indicators
  useEffect(() => {
    if (!activeWorkspace) return;
    const loadWorkspaceAvatars = async () => {
      try {
        const ownerParam = activeWorkspace.owner_id ? `?ownerUserId=${activeWorkspace.owner_id}` : '';
        const url = getApiUrl(`/api/team/members${ownerParam}`);
        const data = await cachedFetch<{ members: any[] }>(url, undefined, 30_000);
        if (data) {
          const avatars: Record<string, string> = {};
          (data.members || []).forEach((m: any) => {
            if (m.member_user_id && m.profile?.avatar_base64) {
              avatars[m.member_user_id] = m.profile.avatar_base64;
            }
          });

          // Prefer local cached avatar for the current user for instant sync
          const cachedAvatar = typeof window !== 'undefined' ? localStorage.getItem('minerva_avatar') : null;
          if (contextUser && cachedAvatar) {
            avatars[contextUser.id] = cachedAvatar;
          }

          setMemberAvatars(avatars);
        }
      } catch (err) {
        console.error('Failed to load workspace avatars:', err);
      }
    };
    loadWorkspaceAvatars();
  }, [activeWorkspace?.id, contextUser?.id]);

  useEffect(() => {
    if (!activeWorkspace || !userProfile) return;

    const supabase = createClient();
    const channelId = `workspace_presence_${activeWorkspace.id}`;
    
    // Assign a consistent color based on user full name
    const colors = [
      'bg-indigo-500 text-white',
      'bg-emerald-500 text-white',
      'bg-sky-500 text-white',
      'bg-rose-500 text-white',
      'bg-amber-500 text-white',
      'bg-violet-500 text-white'
    ];
    const hash = userProfile.fullName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const myColor = colors[hash % colors.length];

    const presenceChannel = supabase.channel(channelId);

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const joined: any[] = [];
        Object.keys(state).forEach((key) => {
          state[key].forEach((pres: any) => {
            // Avoid duplicates
            if (!joined.some(u => u.userId === pres.userId)) {
              joined.push(pres);
            }
          });
        });
        setOnlineUsers(joined);
      })
      .subscribe(async (status: REALTIME_SUBSCRIBE_STATES) => {
        if (status === 'SUBSCRIBED' && contextUser) {
          await presenceChannel.track({
            userId: contextUser.id,
            fullName: userProfile.fullName,
            activePage: pathname,
            color: myColor,
            avatarBase64: null // No longer sending heavy base64 over presence to respect payload limits
          });
        }
      });

    return () => {
      presenceChannel.unsubscribe();
    };
  }, [activeWorkspace, userProfile, pathname, contextUser]);

  // Invite Users modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer' | 'admin'>('editor');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    const syncStore = () => {
      setOnboarding(getOnboardingProgress());
      setCompletedTasks(getOnboardingState());
    };
    syncStore();
    window.addEventListener('minerva_store_update', syncStore);

    const handleFocusLead = (e: Event) => {
      const customEvent = e as CustomEvent<{ leadId: string }>;
      if (customEvent.detail?.leadId) {
        router.push(`/leads/${customEvent.detail.leadId}`);
      }
    };
    window.addEventListener('minerva_focus_lead', handleFocusLead);

    return () => {
      window.removeEventListener('minerva_store_update', syncStore);
      window.removeEventListener('minerva_focus_lead', handleFocusLead);
    };
  }, [router]);

  useEffect(() => {
    const collapsed = localStorage.getItem('minerva_sidebar_collapsed') === 'true';
    if (collapsed) {
      setTimeout(() => {
        setIsCollapsed(true);
      }, 0);
    }
    // Auto-collapse on /map for full-screen experience
    if (typeof window !== 'undefined' && window.location.pathname === '/map') {
      setIsCollapsed(true);
      document.body.classList.add('sidebar-collapsed');
    }
  }, []);

  useEffect(() => {
    if (pathname === '/map') {
      setIsCollapsed(true);
      localStorage.setItem('minerva_sidebar_collapsed', 'true');
      document.body.classList.add('sidebar-collapsed');
    }
  }, [pathname]);

  useEffect(() => {
    if (!contextUser || !activeWorkspace) return;
    const loadSessions = async () => {
      const sessions = await dbGetSessions(contextUser.id, activeWorkspace.id);
      setAssistantSessions(sessions);
      const stored = localStorage.getItem(`minerva_active_sess_${activeWorkspace.id}`);
      if (stored) setActiveSessionId(stored);
    };
    loadSessions();

    const handleSync = () => {
      loadSessions();
    };
    window.addEventListener('minerva_assistant_sync', handleSync);
    return () => {
      window.removeEventListener('minerva_assistant_sync', handleSync);
    };
  }, [contextUser, activeWorkspace]);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('minerva_sidebar_collapsed', String(nextState));
    if (nextState) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  };

  // Sync body class on mount
  useEffect(() => {
    if (isCollapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
    return () => document.body.classList.remove('sidebar-collapsed');
  }, [isCollapsed]);

  // Permissions
  const [userPermissions, setUserPermissions] = useState<PermissionModule[] | null>(null);

  const [inviteError, setInviteError] = useState('');

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsSendingInvite(true);
    setInviteError('');

    const res = await fetch(getApiUrl('/api/team/invite'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });

    const data = await res.json();
    setIsSendingInvite(false);

    if (!res.ok) {
      setInviteError(data.error || 'Erreur lors de l\'envoi');
      return;
    }

    setInviteSuccess(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setInviteEmail('');
    setInviteSuccess(false);
    setInviteError('');
    setShowInviteModal(false);
  };

  useEffect(() => {
    const checkUserAndSettings = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: settings } = await supabase
        .from('settings')
        .select('full_name, company_name, avatar_base64')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!settings || !settings.full_name || !settings.company_name) {
        router.push('/onboarding');
      } else {
        // Prefer localStorage-cached avatar for instant display after save
        const cachedAvatar = localStorage.getItem('minerva_avatar');
        setUserProfile({
          fullName: settings.full_name,
          companyName: settings.company_name || 'Uprising Studio',
          avatarBase64: cachedAvatar ?? settings.avatar_base64 ?? null,
        });
        // Keep localStorage in sync with DB value
        if (settings.avatar_base64 && !cachedAvatar) {
          localStorage.setItem('minerva_avatar', settings.avatar_base64);
        }
        setCheckingWelcome(false);
      }
    };
    checkUserAndSettings();
  }, [router]);

  // Fetch user permissions for role-based sidebar filtering (cached for 60 s)
  useEffect(() => {
    if (!contextUser || !activeWorkspace) return;
    const ownerId = (activeWorkspace as { owner_id?: string }).owner_id ?? activeWorkspace.id;
    const url = getApiUrl(`/api/team/my-permissions?workspaceOwnerId=${ownerId}`);
    cachedFetch<{ permissions?: string[] }>(url, undefined, 60_000)
      .then(data => {
        if (data?.permissions) setUserPermissions(data.permissions as PermissionModule[]);
        else setUserPermissions(ALL_MODULES);
      })
      .catch(() => setUserPermissions(ALL_MODULES));
  }, [contextUser?.id, activeWorkspace?.id]);

  // Listen for avatar updates broadcasted from settings save
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'minerva_avatar' && e.newValue !== null) {
        setUserProfile((prev) => prev ? { ...prev, avatarBase64: e.newValue } : prev);
        if (contextUser) {
          setMemberAvatars((prev) => ({ ...prev, [contextUser.id]: e.newValue! }));
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [contextUser]);

  if (checkingWelcome) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f7f7f4] text-[#26251e] font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#10b981] border-t-transparent" />
          <span className="text-[11px] font-medium tracking-wider text-[#7a7a76] uppercase">Minerva OS...</span>
        </div>
      </div>
    );
  }

  // Pages secondaires rattachées à la famille "Leads"
  const LEADS_FAMILY: Record<string, string> = {
    '/pipeline': 'Pipeline',
    '/accounts': 'Comptes',
    '/prospecting': 'Prospection',
    '/leads/timeline': 'Timeline',
  };

  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const crumbs = [];

    crumbs.push({
      label: 'Minerva OS Lite',
      href: '/today',
      isLast: segments.length === 0 || (segments.length === 1 && segments[0] === 'today')
    });

    // Famille Leads : afficher "Leads > [label]" pour pipeline / comptes / prospection / timeline
    if (LEADS_FAMILY[pathname]) {
      crumbs.push({ label: t('nav.search'), href: '/leads', isLast: false });
      crumbs.push({ label: LEADS_FAMILY[pathname], href: pathname, isLast: true });
      return crumbs;
    }

    segments.forEach((segment, index) => {
      if (segment === 'today' && index === 0) return;

      const href = '/' + segments.slice(0, index + 1).join('/');
      let label = segment;
      if (segment === 'today') label = t('nav.today');
      else if (segment === 'leads') label = t('nav.search');
      else if (segment === 'library') label = t('nav.library');
      else if (segment === 'prospecting') label = t('nav.prospect');
      else if (segment === 'integrations') label = t('nav.integrations');
      else if (segment === 'ads') label = 'Publicité & Attribution';
      else if (segment === 'website-builder') label = 'Créateur de site';
      else if (segment === 'settings') label = t('nav.settings');
      else if (segment === 'team') label = t('nav.team');
      else if (segment === 'workspaces') label = t('nav.workspaces');
      else if (segment === 'agents') label = t('nav.agents');
      else if (segment === 'assistant') label = t('nav.assistant');
      else if (segment === 'download') label = t('nav.download');
      else if (segment === 'welcome') label = t('nav.get_started');
      else if (segment === 'audit') label = t('nav.audit');
      else if (segment === 'map') label = t('nav.map');
      else if (segment === 'billing') label = 'Facturation';
      else if (segment === 'help') label = 'Aide & Docs';
      else if (segment === 'inbox') label = 'Boîte de réception';
      else if (segment === 'setup') label = 'Configuration';
      else if (segment === 'personas') label = 'Profils cibles';

      if (segments[index - 1] === 'leads' && segment !== 'leads') {
        const lead = leads.find(l => l.id === segment);
        label = lead?.businessName
          ? lead.businessName.length > 28
            ? lead.businessName.slice(0, 26) + '…'
            : lead.businessName
          : 'Fiche prospect';
      }

      crumbs.push({
        label,
        href,
        isLast: index === segments.length - 1
      });
    });

    return crumbs;
  };

  // Pinned nav items — Navigation v5 : 6 entrées épurées
  const pinnedItems = [
    { name: 'Accueil',     href: '/today',    icon: Home },
    { name: 'Leads',       href: '/leads',    icon: Users },
    { name: 'Outreach',    href: '/outreach', icon: Send },
    { name: 'Templates',   href: '/email-templates', icon: FileText },
    { name: 'Carte',       href: '/map',      icon: MapPin },
    { name: 'Agenda',      href: '/agenda',   icon: CalendarDays },
    { name: 'Équipe',      href: '/team',     icon: UsersRound },
  ];

  // Collapsible nav categories — vidées en v5 (pages secondaires accessibles par URL directe)
  const navCategories: Array<{ id: string; label: string; items: { name: string; href: string; icon: React.ElementType }[] }> = [];

  // Filter nav items based on user role permissions
  const canShowNavItem = (href: string) => {
    if (!userPermissions) return true; // show all while loading
    const mod = routeToModule(href);
    if (!mod) return true; // unknown route — always show
    return userPermissions.includes(mod);
  };

  const filteredNavCategories = navCategories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => canShowNavItem(item.href)),
  })).filter(cat => cat.items.length > 0);

  const filteredPinnedItems = pinnedItems.filter(item => canShowNavItem(item.href));

  // Flat list used for active-state detection across all items
  const allNavItems = [
    ...pinnedItems,
    ...navCategories.flatMap(c => c.items),
  ];

  const recentLeads = leads
    .slice(0, 4)
    .map(l => ({ name: l.businessName, href: `/leads/${l.id}` }));

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#26251e] font-sans selection:bg-[#10b981]/10">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        animate={{
          // Mobile: slide the fixed sidebar in/out via x
          // Desktop: animate width (layout push) + inner content slides via x
          ...(isMobile
            ? { x: sidebarOpen ? 0 : -240, width: 240 }
            : { width: isCollapsed ? 0 : 240, x: 0 }
          ),
        }}
        initial={false}
        transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 1 }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#e5e5e0] bg-[#f4f4f3] md:static md:relative shrink-0 overflow-hidden",
          isCollapsed ? "md:border-r-0" : "",
        )}
        style={{ minWidth: 0 }}>
        {/* Inner wrapper: fixed at 240px so content never reflows; slides left on desktop collapse */}
        <motion.div
          className="flex flex-col h-full w-[240px] min-w-[240px]"
          animate={isMobile
            ? { x: 0, opacity: 1 }
            : { x: isCollapsed ? -48 : 0, opacity: isCollapsed ? 0 : 1 }
          }
          transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 1 }}
        >
        {/* Sidebar Brand Header (With Langdock style Switcher Dropdown) */}
        <div className={cn(
          "relative flex h-12 items-center border-b border-[#e5e5e0] px-4 transition-all duration-300",
          isCollapsed ? "md:justify-center md:px-0" : "justify-between"
        )}>
          <div className="flex items-center gap-2 font-sans font-semibold text-sm tracking-tight text-[#26251e] w-full min-w-0">
            {activeWorkspace?.logo_base64 ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={activeWorkspace.logo_base64} 
                alt="Logo" 
                className="w-5 h-5 object-contain rounded shrink-0" 
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src="/icon.png"
                alt="Minerva"
                className="w-5 h-5 object-contain rounded shrink-0"
              />
            )}
            {!isCollapsed && (
              <div
                onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                className="flex flex-1 items-center justify-between gap-1 cursor-pointer hover:bg-[#e5e5e2] px-1.5 py-0.5 rounded transition-colors select-none min-w-0"
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={activeWorkspace?.id ?? 'default'}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                    className="font-semibold text-sm text-[#26251e] truncate"
                  >
                    {activeWorkspace ? activeWorkspace.name : 'Minerva OS Lite'}
                  </motion.span>
                </AnimatePresence>
                <ChevronDown className="h-3 w-3 text-[#7a7a76] shrink-0" />
              </div>
            )}
          </div>

          {/* Workspace dropdown menu (Langdock Style) */}
          {isWorkspaceMenuOpen && !isCollapsed && (
            <>
              {/* Invisible background click handler */}
              <div 
                className="fixed inset-0 z-[90]" 
                onClick={() => {
                  setIsWorkspaceMenuOpen(false);
                  setIsSwitchWorkspaceOpen(false);
                }}
              />
              
              <div className="absolute left-4 top-11 w-56 bg-white border border-[#e5e5e0] rounded-xl shadow-lg py-1.5 z-[100] animate-in fade-in slide-in-from-top-1 duration-150 text-left">
                <Link
                  href="/settings"
                  onClick={() => setIsWorkspaceMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 transition-colors"
                >
                  <SettingsIcon className="w-3.5 h-3.5" />
                  <span>{t('nav.account_settings')}</span>
                </Link>

                <Link
                  href="/workspaces"
                  onClick={() => setIsWorkspaceMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 transition-colors"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>{t('nav.manage_workspaces')}</span>
                </Link>

                <Link
                  href="/team"
                  onClick={() => setIsWorkspaceMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 transition-colors"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>{t('nav.invite_members')}</span>
                </Link>

                <div className="h-px bg-[#e5e5e0] my-1" />

                {/* Workspace list — inline, no flyout */}
                {workspacesList.length > 0 && (
                  <div>
                    <div className="px-3 py-1 text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">
                      Workspaces
                    </div>
                    <div className="max-h-[160px] overflow-y-auto">
                      {workspacesList.map((ws) => {
                        const isWsActive = activeWorkspace?.id === ws.id;
                        return (
                          <button
                            key={ws.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              switchWorkspace(ws.id);
                              setIsWorkspaceMenuOpen(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 transition-colors text-left"
                          >
                            <span className="flex items-center gap-2 min-w-0">
                              {ws.logo_base64 ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={ws.logo_base64} alt="" className="w-4 h-4 object-contain rounded-sm shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded-sm bg-[#e5e5e2] border border-[#d5d5d0] flex items-center justify-center font-bold text-[8px] text-[#555552] shrink-0">
                                  {ws.name.substring(0, 1).toUpperCase()}
                                </div>
                              )}
                              <span className="truncate max-w-[130px]">{ws.name}</span>
                            </span>
                            {isWsActive && <Check className="w-3.5 h-3.5 text-[#059669] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    <div className="h-px bg-[#e5e5e0] my-1" />
                    <Link
                      href="/workspaces"
                      onClick={() => setIsWorkspaceMenuOpen(false)}
                      className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#807d72] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 transition-colors"
                    >
                      <span>{t('nav.all_workspaces')}</span>
                      <Globe className="w-3 h-3" />
                    </Link>
                  </div>
                )}

                <div className="h-px bg-[#e5e5e0] my-1" />

                <button
                  onClick={async () => {
                    setIsWorkspaceMenuOpen(false);
                    await signout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#555552] hover:text-red-600 hover:bg-red-50 transition-colors text-left"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-600" />
                  <span>{t('nav.logout')}</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-4">
          {(pathname.startsWith('/assistant') || pathname.startsWith('/chat')) && (!isCollapsed ? (
            <div className="px-3 mb-1 space-y-1">
              <Link
                href="/assistant"
                onClick={() => { setSidebarOpen(false); setActiveSessionId(null); if (activeWorkspace) localStorage.removeItem(`minerva_active_sess_${activeWorkspace.id}`); }}
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#10b981] bg-[#10b981]/10 border border-[#10b981]/20 rounded-md hover:bg-[#10b981]/15 transition-all w-full justify-center"
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span>{t('nav.new_chat')}</span>
              </Link>

              {/* Global project filter */}
              <select
                value={selectedProjectFilter}
                onChange={(e) => setSelectedProjectFilter(e.target.value)}
                className="w-full text-[10px] font-bold bg-white border border-[#e5e5e0] rounded-md px-2 py-1 text-[#555552] focus:outline-none focus:ring-1 focus:ring-[#10b981] mb-2 select-none"
              >
                <option value="all">📁 Tous les projets</option>
                {projects.map((proj) => (
                  <option key={proj.id} value={proj.id}>📁 {proj.name}</option>
                ))}
              </select>

              {assistantSessions.length > 0 && (
                <div className="space-y-0.5 mt-1 max-h-48 overflow-y-auto">
                  {assistantSessions
                    .filter((sess) => {
                      if (selectedProjectFilter === 'all') return true;
                      return sess.projectId === selectedProjectFilter;
                    })
                    .map((sess) => {
                      const linkedProject = projects.find((p) => p.id === sess.projectId);
                      return (
                        <div
                          key={sess.id}
                          className={cn(
                            "group flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-all",
                            activeSessionId === sess.id
                              ? "bg-[#10b981]/10 text-[#10b981]"
                              : "text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e]"
                          )}
                        >
                          {sess.pinned && <Pin className="h-2.5 w-2.5 text-amber-500 shrink-0" />}
                          <Link
                            href="/assistant"
                            onClick={() => {
                              setSidebarOpen(false);
                              setActiveSessionId(sess.id);
                              if (activeWorkspace) localStorage.setItem(`minerva_active_sess_${activeWorkspace.id}`, sess.id);
                              // Dispatch sync event to load session messages
                              window.dispatchEvent(new CustomEvent('minerva_assistant_sync'));
                            }}
                            className="flex-1 truncate text-left"
                          >
                            {sess.title}
                          </Link>
                          
                          {/* Small project indicator badge */}
                          {linkedProject && (
                            <span 
                              className="text-[8px] px-1 py-0.5 rounded bg-neutral-200 text-[#555552] max-w-[50px] truncate shrink-0"
                              title={`Projet : ${linkedProject.name}`}
                            >
                              {linkedProject.name}
                            </span>
                          )}

                          {/* Link project dropdown selector */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                onClick={(e) => e.stopPropagation()}
                                className={cn(
                                  "text-neutral-400 hover:text-[#10b981] p-0.5 rounded transition-colors shrink-0",
                                  sess.projectId ? "opacity-100 text-[#10b981]" : "opacity-0 group-hover:opacity-100"
                                )}
                                title="Lier à un projet"
                              >
                                <Folder className="h-2.5 w-2.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-white border border-[#e5e5e0] rounded-md shadow-lg p-1 text-[10px] font-semibold text-[#26251e]">
                              <DropdownMenuItem
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await dbUpdateSessionProject(sess.id, null);
                                  const updated = await dbGetSessions(contextUser!.id, activeWorkspace!.id);
                                  setAssistantSessions(updated);
                                  window.dispatchEvent(new CustomEvent('minerva_assistant_sync'));
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 hover:bg-neutral-100 rounded cursor-pointer"
                              >
                                <Folder className="h-3 w-3 text-neutral-400" />
                                <span>Aucun projet</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-[#e5e5e0] my-1" />
                              {projects.map((p) => {
                                const isLinked = sess.projectId === p.id;
                                return (
                                  <DropdownMenuItem
                                    key={p.id}
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await dbUpdateSessionProject(sess.id, p.id);
                                      const updated = await dbGetSessions(contextUser!.id, activeWorkspace!.id);
                                      setAssistantSessions(updated);
                                      window.dispatchEvent(new CustomEvent('minerva_assistant_sync'));
                                    }}
                                    className="flex items-center justify-between px-2 py-1 hover:bg-neutral-100 rounded cursor-pointer"
                                  >
                                    <span className="flex items-center gap-1.5 truncate">
                                      <Folder className={cn("h-3 w-3", isLinked ? "text-[#10b981]" : "text-neutral-400")} />
                                      <span className="truncate">{p.name}</span>
                                    </span>
                                    {isLinked && <Check className="h-3 w-3 text-[#10b981]" />}
                                  </DropdownMenuItem>
                                );
                              })}
                              <DropdownMenuSeparator className="bg-[#e5e5e0] my-1" />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setLinkingSessionId(sess.id);
                                  setShowNewProjectModal(true);
                                }}
                                className="flex items-center gap-1.5 px-2 py-1 hover:bg-neutral-100 rounded cursor-pointer font-bold text-[#10b981]"
                              >
                                <FolderPlus className="h-3 w-3" />
                                <span>Créer un projet...</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              if (!activeWorkspace) return;
                              await dbToggleSessionPin(sess.id, !sess.pinned);
                              const updated = await dbGetSessions(contextUser!.id, activeWorkspace.id);
                              setAssistantSessions(updated);
                              window.dispatchEvent(new CustomEvent('minerva_assistant_sync'));
                            }}
                            className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-amber-500 transition-opacity p-0.5"
                            title={sess.pinned ? "Désépingler" : "Épingler"}
                          >
                            {sess.pinned ? <PinOff className="h-2.5 w-2.5" /> : <Pin className="h-2.5 w-2.5" />}
                          </button>
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              if (!activeWorkspace) return;
                              await dbDeleteSession(activeWorkspace.id, sess.id);
                              const updated = await dbGetSessions(contextUser!.id, activeWorkspace.id);
                              setAssistantSessions(updated);
                              if (activeSessionId === sess.id) {
                                setActiveSessionId(null);
                                localStorage.removeItem(`minerva_active_sess_${activeWorkspace.id}`);
                              }
                              window.dispatchEvent(new CustomEvent('minerva_assistant_sync'));
                            }}
                            className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-600 transition-opacity p-0.5"
                            title="Supprimer"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          ) : (
            <div className="px-2 mb-2 flex justify-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/assistant"
                    onClick={() => setSidebarOpen(false)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-[#10b981] bg-[#10b981]/10 hover:bg-[#10b981]/15 border border-[#10b981]/20 transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs bg-[#26251e] text-white">
                  {t('nav.new_chat')}
                </TooltipContent>
              </Tooltip>
            </div>
          ))}
          
          {/* Pinned nav items */}
          <nav className={cn("space-y-[2px]", isCollapsed ? "px-2" : "px-3")}>
            {filteredPinnedItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/today' && item.href !== '/welcome' && pathname.startsWith(item.href));

              const navLink = (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center rounded-md text-xs font-medium transition-all duration-150",
                    isCollapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-1.5",
                    isActive
                      ? "bg-[#e5e5e2] text-[#26251e] font-semibold"
                      : "text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e]"
                  )}
                >
                  <item.icon
                    className={cn("h-4 w-4 shrink-0 transition-all duration-150", isActive ? "text-[#26251e]" : "text-[#555552] opacity-60")}
                    strokeWidth={isActive ? 2 : 1.5}
                    aria-hidden="true"
                  />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );

              if (isCollapsed) {
                return (
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                    <TooltipContent side="right" className="text-xs bg-[#26251e] text-white">{item.name}</TooltipContent>
                  </Tooltip>
                );
              }
              return navLink;
            })}
          </nav>

          {/* Collapsible nav categories */}
          {!isCollapsed && (
            <div className="px-3 space-y-1">
              {filteredNavCategories.map((cat) => {
                const isCatCollapsed = collapsedCategories[cat.id] ?? true;
                const hasCatActive = cat.items.some(item => pathname.startsWith(item.href));
                return (
                  <div key={cat.id} className="space-y-[2px]">
                    <button
                      onClick={() => toggleCategory(cat.id)}
                      className={cn(
                        "w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors",
                        hasCatActive ? "text-[#26251e]" : "text-[#7a7a76] hover:text-[#26251e]"
                      )}
                    >
                      <span>{cat.label}</span>
                      <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isCatCollapsed && "-rotate-90")} />
                    </button>
                    {!isCatCollapsed && (
                      <div className="space-y-[2px]">
                        {cat.items.map((item) => {
                          const isActive = pathname.startsWith(item.href);
                          return (
                            <Link
                              key={item.name}
                              href={item.href}
                              onClick={() => setSidebarOpen(false)}
                              className={cn(
                                "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150",
                                isActive
                                  ? "bg-[#e5e5e2] text-[#26251e] font-semibold"
                                  : "text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e]"
                              )}
                            >
                              <item.icon
                                className={cn("h-4 w-4 shrink-0 transition-all duration-150", isActive ? "text-[#26251e]" : "text-[#555552] opacity-60")}
                                strokeWidth={isActive ? 2 : 1.5}
                                aria-hidden="true"
                              />
                              <span className="truncate">{item.name}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Projects Section */}
          {!isCollapsed && (
            <div className="px-3 space-y-1">
              <div className="px-2.5 text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider">
                {t('nav.projects')}
              </div>
              {projects.map((proj: Project) => (
                <Link
                  key={proj.id}
                  href={`/projects/${proj.id}`}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-1 text-xs rounded-md transition-colors truncate",
                    pathname.startsWith(`/projects/${proj.id}`)
                      ? "bg-[#e5e5e2] text-[#26251e] font-semibold"
                      : "text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e]"
                  )}
                >
                  <Folder className="h-4 w-4 text-[#7a7a76] shrink-0" />
                  <span className="truncate">{proj.name}</span>
                </Link>
              ))}
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="w-full flex items-center gap-2.5 px-2.5 py-1 text-xs text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e] rounded-md transition-colors text-left"
              >
                <FolderPlus className="h-4 w-4 text-[#7a7a76]" />
                <span>{t('nav.new_project')}</span>
              </button>
            </div>
          )}

          {/* Today list section (Collapsible) */}
          {!isCollapsed && (
            <div className="px-3 space-y-1">
              <button 
                onClick={() => setTodayCollapsed(!todayCollapsed)}
                className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider hover:text-[#26251e] smooth-toggle"
              >
                <span>{t('nav.today')}</span>
                <ChevronDown className={cn("h-3 w-3 smooth-toggle", todayCollapsed && "-rotate-90")} />
              </button>
              
              {!todayCollapsed && recentLeads.length > 0 && (
                <div className="space-y-[2px] mt-1">
                  {recentLeads.map((lead) => (
                    <Link
                      key={lead.href}
                      href={lead.href}
                      className="flex items-center gap-2.5 px-2.5 py-1 text-xs text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e] rounded-md transition-colors truncate"
                    >
                      <FileText className="h-3.5 w-3.5 text-[#7a7a76] shrink-0" />
                      <span className="truncate">{lead.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-[#e5e5e0] bg-[#f4f4f3] py-2 px-3 space-y-2 shrink-0 overflow-y-auto">
          
          {/* Collapsible Get Started progress card */}
          {!isCollapsed && (
            <div className="relative">
              {showOnboarding && (
                <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-white border border-[#e5e5e0] rounded-lg shadow-sm space-y-3 z-50 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-1.5">
                    <span className="text-xs font-bold text-[#26251e]">{t('nav.get_started')}</span>
                    <span className="text-[10px] font-semibold text-[#059669] bg-[#059669]/10 px-1.5 py-0.5 rounded">{onboarding.percent}% done</span>
                  </div>
                  <div className="space-y-2.5 max-h-[180px] overflow-y-auto text-xs">
                    {onboardingTasks.map((task) => {
                      const isCompleted = completedTasks.includes(task.id);
                      return (
                        <div 
                          key={task.id}
                          onClick={() => toggleOnboardingTask(task.id)}
                          className="flex items-start gap-2.5 text-[#555552] hover:text-[#26251e] cursor-pointer group py-0.5"
                        >
                          <div className="shrink-0 mt-0.5">
                            {isCompleted ? (
                              <span className="w-3.5 h-3.5 rounded-full bg-[#10b981] text-white flex items-center justify-center text-[8px] font-bold">✓</span>
                            ) : (
                              <div className="w-3.5 h-3.5 rounded-full border border-[#7a7a76] group-hover:border-[#26251e]" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn("font-medium text-[#26251e] truncate text-left", isCompleted && "line-through text-[#7a7a76]")}>
                              {t(`onboarding.task.${task.id}` as any)}
                            </p>
                            <p className="text-[9px] text-[#7a7a76] text-left">
                              {task.category === 'chat' ? 'Chat' : 'Workspace'} • {task.pts > 0 ? `+${task.pts} pts` : 'Done'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowOnboarding(!showOnboarding)}
                className="w-full text-left p-2.5 bg-white border border-[#e5e5e0] hover:border-[#7a7a76] rounded-md smooth-toggle flex flex-col gap-1.5 cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#26251e]">
                  <span>{t('nav.get_started')}</span>
                  <ChevronUp className={cn("h-3 w-3 text-[#7a7a76] smooth-toggle", showOnboarding && "rotate-180")} />
                </div>
                <div className="text-[10px] text-[#555552]">
                  {onboarding.percent}% done • <span className="text-[#10b981]">{onboarding.percent === 100 ? t('nav.done') : t('nav.in_progress')}</span>
                </div>
                <div className="w-full bg-[#e5e5e2] h-1 rounded-full overflow-hidden">
                  <div ref={progressCallback} className="bg-[#10b981] h-full rounded-full" />
                </div>
              </button>
            </div>
          )}

          {/* Secondary links — collapsible accordion */}
          {!isCollapsed && (
            <div className="space-y-0.5">
              <button
                onClick={() => setFooterExpanded(v => !v)}
                className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] hover:text-[#26251e] transition-colors"
              >
                <span>Paramètres & Plus</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", footerExpanded && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {footerExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-[2px] pb-1">
                      {[
                        { href: '/guide', icon: Zap, label: 'Guide de démarrage' },
                        { href: '/analytics', icon: BarChart3, label: 'Statistiques' },
                        { href: '/billing', icon: CreditCard, label: 'Facturation' },
                        { href: '/help', icon: HelpCircle, label: 'Aide & Docs' },
                        { href: '/changelog', icon: Megaphone, label: t('nav.changelog') },
                        { href: '/roadmap', icon: Flag, label: 'Roadmap' },
                        { href: '/leverage-library', icon: BookOpen, label: 'Bibliothèque de preuves' },
                      ].map(({ href, icon: Icon, label }) => {
                        const isFooterActive = pathname === href;
                        return (
                          <Link
                            key={href}
                            href={href}
                            onClick={() => setSidebarOpen(false)}
                            className={cn(
                              "flex items-center gap-2.5 text-xs font-semibold px-2.5 py-1.5 rounded-md transition-colors",
                              isFooterActive
                                ? "bg-[#e5e5e2] text-[#26251e]"
                                : "text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60"
                            )}
                          >
                            <Icon
                              className={cn("h-4 w-4 shrink-0 transition-all", isFooterActive ? "text-[#26251e]" : "text-[#555552] opacity-60")}
                              strokeWidth={isFooterActive ? 2 : 1.5}
                            />
                            <span>{label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Settings and user control row */}
          <div className="flex items-center justify-between">
            {isCollapsed ? (
              <Link 
                href="/settings"
                className="flex h-8 w-8 mx-auto items-center justify-center rounded-md hover:bg-[#e5e5e2] text-[#555552] hover:text-[#26251e]"
              >
                <SettingsIcon className="h-4 w-4" />
              </Link>
            ) : (
              <div className="w-full flex items-center justify-between">
                <Link
                  href="/settings"
                  className={cn(
                    "flex items-center gap-2.5 text-xs font-semibold px-2 py-1.5 rounded-md transition-colors flex-1",
                    pathname.startsWith('/settings')
                      ? "bg-[#e5e5e2] text-[#26251e] font-semibold"
                      : "text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60"
                  )}
                >
                  <SettingsIcon className="h-4 w-4 text-[#555552]" />
                  <span>{t('nav.settings')}</span>
                </Link>
                <button 
                  onClick={async () => {
                    await signout();
                  }}
                  className="h-7 w-7 flex items-center justify-center rounded text-[#7a7a76] hover:bg-[#e5e5e2] hover:text-red-600 transition-colors"
                  title={t('nav.logout')}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

        </div>
        </motion.div>
      </motion.aside>

      {/* Main Layout Area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-white min-w-0">
        {/* Topbar */}
        <header className="flex h-12 items-center justify-between border-b border-[#e5e5e0] bg-white px-4 md:px-6 shrink-0">
          
          {/* Left Action (Menu Trigger) */}
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setSidebarOpen(true)}
              title="Ouvrir le menu"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-4 w-4" />
            </Button>

            <button
              onClick={toggleCollapse}
              className="h-8 w-8 hidden md:flex items-center justify-center rounded text-[#7a7a76] hover:bg-[#e5e5e2]/60 transition-colors"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <motion.div
                animate={{ rotate: isCollapsed ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              >
                <PanelLeftClose className="h-4 w-4" />
              </motion.div>
            </button>

            <Breadcrumb className="hidden sm:flex">
              <BreadcrumbList>
                {getBreadcrumbs().map((crumb, idx) => (
                  <React.Fragment key={crumb.href}>
                    {idx > 0 && <BreadcrumbSeparator className="text-[#e5e5e0]" />}
                    <BreadcrumbItem>
                      {crumb.isLast ? (
                        <BreadcrumbPage className="text-xs font-semibold text-[#26251e]">{crumb.label}</BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild className="text-xs text-[#7a7a76] hover:text-[#26251e]">
                          <Link href={crumb.href}>{crumb.label}</Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                  </React.Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <div className="relative w-44 md:block hidden">
              <span className="absolute inset-y-0 left-2 flex items-center text-[#7a7a76]">
                <Search className="h-3 w-3" />
              </span>
              <button 
                onClick={() => setShowSearchModal(true)}
                className="flex w-full items-center justify-between rounded border border-[#e5e5e0] bg-white py-1 pl-7 pr-2 text-left text-[10px] text-[#7a7a76] hover:bg-[#f4f4f3] transition-colors cursor-pointer"
              >
                <span>{t('search.global_placeholder')}</span>
                <kbd className="pointer-events-none inline-flex select-none items-center rounded border bg-muted px-1 font-mono text-[9px] text-[#7a7a76]">
                  /
                </kbd>
              </button>
            </div>

            <Button 
              onClick={() => router.push('/team/invite')}
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs font-semibold text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 flex items-center gap-1.5 rounded-md px-3 border border-[#e5e5e0] cursor-pointer"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{t('nav.invite_members')}</span>
            </Button>

            {/* Real-time Presence list */}
            {onlineUsers.length > 1 && (
              <div className="flex items-center -space-x-1.5 mr-1 ml-1 select-none">
                {onlineUsers.map((u) => {
                  const initials = u.fullName
                    .split(' ')
                    .map(n => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase();
                  
                  // Friendly page label
                  let pageLabel = u.activePage;
                  if (u.activePage === '/today') pageLabel = "Aujourd'hui";
                  else if (u.activePage === '/leads') pageLabel = 'Prospects';
                  else if (u.activePage === '/prospecting') pageLabel = 'Prospection';
                  else if (u.activePage === '/pipeline') pageLabel = 'Pipeline';
                  else if (u.activePage === '/library') pageLabel = 'Bibliothèque';
                  else if (u.activePage === '/settings') pageLabel = 'Paramètres';
                  else if (u.activePage === '/team') pageLabel = 'Équipe';

                  const avatar = (u.userId === contextUser?.id ? (userProfile?.avatarBase64 || memberAvatars[u.userId]) : memberAvatars[u.userId]) || u.avatarBase64;

                  return (
                    <Tooltip key={u.userId}>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold shrink-0 shadow-xs cursor-default select-none transition-transform hover:scale-105 overflow-hidden",
                          avatar ? "bg-transparent" : u.color
                        )}>
                          {avatar ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatar} alt={u.fullName} className="w-full h-full object-cover" />
                          ) : (
                            initials
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs bg-[#26251e] text-white p-2 rounded-lg font-sans border border-neutral-800 shadow-lg">
                        <span className="font-bold block">{u.fullName}</span>
                        <span className="text-[10px] opacity-75 block mt-0.5">Activité : {pageLabel}</span>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            )}

            {/* Sync UX badge — Electron only */}
            {syncPending > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 cursor-default select-none">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span className="text-[10px] font-bold">{syncPending}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-xs bg-[#26251e] text-white p-2 rounded-lg font-sans border border-neutral-800 shadow-lg">
                  {syncPending} modification{syncPending > 1 ? 's' : ''} en attente de synchronisation
                </TooltipContent>
              </Tooltip>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-[#7a7a76] hover:text-[#26251e] h-8 w-8 relative cursor-pointer">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[#10b981]" />}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0 text-left bg-white border border-[#e5e5e0] shadow-md rounded-xl font-sans" align="end">
                <div className="p-3 border-b border-[#e5e5e0] flex items-center justify-between">
                  <span className="text-xs font-bold text-[#26251e]">Notifications</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllNotificationsRead} className="text-[10px] font-semibold text-[#059669] hover:underline cursor-pointer">
                      Marquer comme lu
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#e5e5e0]/60">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-xs text-[#7a7a76]">
                      Aucune notification pour le moment.
                    </div>
                  ) : (
                    notifications.map((notif: AppNotification) => (
                      <div
                        key={notif.id}
                        className="p-3 hover:bg-[#f4f4f3]/25 transition-colors flex gap-2.5 items-start cursor-pointer"
                        onClick={() => {
                          if (!notif.isRead) markNotificationRead(notif.id);
                          if (notif.link) router.push(notif.link);
                        }}
                      >
                        {!notif.isRead ? (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] mt-1.5 shrink-0" />
                        ) : (
                          <span className="w-1.5 h-1.5 mt-1.5 shrink-0" />
                        )}
                        <div className="space-y-0.5 text-left">
                          <p className="text-xs font-semibold text-[#26251e] leading-snug">{notif.title}</p>
                          <p className="text-[10px] text-[#7a7a76] leading-relaxed">{notif.body}</p>
                          <p className="text-[9px] text-neutral-400">{relativeTime(notif.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <div className="h-4 w-px bg-[#e5e5e0] mx-1" />

            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-hidden">
                <div className="h-7 w-7 rounded-full overflow-hidden border border-[#e5e5e0] bg-[#e5e5e2] flex items-center justify-center shrink-0 cursor-pointer" title={userProfile?.fullName || 'Utilisateur'}>
                  {userProfile?.avatarBase64 ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={userProfile.avatarBase64} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[10px] font-bold text-[#807d72] select-none">
                      {(userProfile?.fullName || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48 text-xs font-semibold bg-white border border-[#e5e5e0] shadow-md rounded-xl p-1 font-sans" align="end">
                <div className="px-2.5 py-2 border-b border-[#e5e5e0]/60 flex flex-col text-left">
                  <span className="font-bold text-[#26251e] text-[11px] truncate">{userProfile?.fullName || 'Utilisateur'}</span>
                  <span className="text-[9px] text-[#7a7a76] truncate">{userProfile?.companyName || 'Uprising Studio'}</span>
                </div>
                <DropdownMenuItem onClick={() => router.push('/settings?tab=profile')} className="hover:bg-slate-50 cursor-pointer p-2 rounded-lg text-[#26251e] flex items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5" />
                  <span>Mon profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')} className="hover:bg-slate-50 cursor-pointer p-2 rounded-lg text-[#26251e] flex items-center gap-1.5">
                  <SettingsIcon className="h-3.5 w-3.5" />
                  <span>Paramètres</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#e5e5e0]/60 my-1" />
                <DropdownMenuItem onClick={async () => { await signout(); router.push('/login'); }} className="hover:bg-slate-50 cursor-pointer p-2 rounded-lg text-rose-600 flex items-center gap-1.5 animate-none">
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content Slot */}
        <UpdateBanner />
        <main className="flex-1 overflow-hidden bg-white mobile-main-content relative">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12, ease: 'easeOut' }}
              className="w-full h-full flex flex-col overflow-hidden"
            >
              {children}
            </motion.div>
          </AnimatePresence>
          <RealtimeSyncListener />
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (hidden on md+) */}
      {/* Bottom Nav — 4 primary tabs + "Plus" sheet */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 backdrop-blur-md border-t border-[#e5e5e0] bottom-nav-safe">
        <div className="flex items-center justify-around h-16 px-4">
          {([
            { name: 'Accueil', href: '/today', icon: Home },
            { name: t('nav.prospect'), href: '/prospecting', icon: PenSquare },
            { name: 'Leads', href: '/leads', icon: Users },
            { name: 'Assistant', href: '/assistant', icon: Brain },
          ] as const).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/today' && pathname.startsWith(item.href));
            return (
              <motion.div key={item.href} whileTap={{ scale: 0.88 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-150 min-w-0",
                    isActive ? "text-[#059669]" : "text-[#7a7a76]"
                  )}
                >
                  <item.icon
                    className={cn("h-[22px] w-[22px] shrink-0 transition-all duration-150", isActive ? "opacity-100" : "opacity-50")}
                    strokeWidth={isActive ? 2 : 1.5}
                    fill={isActive ? 'currentColor' : 'none'}
                  />
                  <span className={cn("text-[9px] font-bold tracking-tight leading-tight", isActive ? "opacity-100" : "opacity-50")}>
                    {item.name}
                  </span>
                </Link>
              </motion.div>
            );
          })}

          {/* Plus tab */}
          <motion.button
            whileTap={{ scale: 0.88 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            onClick={() => setMoreSheetOpen(true)}
            className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl min-w-0"
          >
            <MoreHorizontal className="h-[22px] w-[22px] text-[#7a7a76] opacity-50" strokeWidth={1.5} />
            <span className="text-[9px] font-bold tracking-tight leading-tight text-[#7a7a76] opacity-50">Plus</span>
          </motion.button>
        </div>
      </nav>

      {/* Bottom sheet "Plus" */}
      <AnimatePresence>
        {moreSheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[60] bg-black/30 md:hidden"
              onClick={() => setMoreSheetOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 1 }}
              className="fixed bottom-0 left-0 right-0 z-[61] md:hidden bg-white rounded-t-2xl shadow-xl pb-safe"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-[#e5e5e0]" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#7a7a76] px-6 py-2">Navigation</p>
              <div className="grid grid-cols-3 gap-px px-4 pb-6">
                {[
                  { name: 'Bibliothèque', href: '/library', icon: Folder },
                  { name: 'Agents', href: '/agents', icon: Sparkles },
                  { name: 'Intégrations', href: '/integrations', icon: Plug },
                  { name: 'Paramètres', href: '/settings', icon: SettingsIcon },
                  { name: 'Changelog', href: '/changelog', icon: Megaphone },
                  { name: 'Équipe', href: '/team', icon: Users },
                ].map(({ name, href, icon: Icon }) => {
                  const isActive = pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMoreSheetOpen(false)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl transition-colors",
                        isActive ? "bg-[#059669]/8 text-[#059669]" : "text-[#555552] hover:bg-[#f4f4f3]"
                      )}
                    >
                      <Icon className="h-6 w-6" strokeWidth={isActive ? 2 : 1.5} />
                      <span className="text-[10px] font-semibold text-center leading-tight">{name}</span>
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* New Project Modal Overlay */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-[#e6e5e0] rounded-xl p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#26251e] text-left">{t('nav.new_project_title')}</h3>
              <p className="text-xs text-[#7a7a76] text-left">{t('nav.new_project_name_label')}</p>
            </div>
            <input 
              type="text" 
              placeholder={t('nav.new_project_name_label')}
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669]"
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  if (newProjectName.trim()) {
                    const newProj = await createProject(newProjectName.trim());
                    if (newProj && linkingSessionId) {
                      await dbUpdateSessionProject(linkingSessionId, newProj.id);
                      const updated = await dbGetSessions(contextUser!.id, activeWorkspace!.id);
                      setAssistantSessions(updated);
                      window.dispatchEvent(new CustomEvent('minerva_assistant_sync'));
                    }
                    setNewProjectName('');
                    setLinkingSessionId(null);
                    setShowNewProjectModal(false);
                  }
                }
              }}
            />
            <div className="flex justify-end gap-2 text-xs pt-1">
              <Button 
                variant="ghost"
                onClick={() => {
                  setNewProjectName('');
                  setLinkingSessionId(null);
                  setShowNewProjectModal(false);
                }}
                className="h-8 text-[#555552]"
              >
                {t('today.cancel')}
              </Button>
              <Button
                onClick={async () => {
                  if (newProjectName.trim()) {
                    const newProj = await createProject(newProjectName.trim());
                    if (newProj && linkingSessionId) {
                      await dbUpdateSessionProject(linkingSessionId, newProj.id);
                      const updated = await dbGetSessions(contextUser!.id, activeWorkspace!.id);
                      setAssistantSessions(updated);
                      window.dispatchEvent(new CustomEvent('minerva_assistant_sync'));
                    }
                    setNewProjectName('');
                    setLinkingSessionId(null);
                    setShowNewProjectModal(false);
                  }
                }}
                className="h-8 bg-[#059669] hover:bg-[#047857] text-white font-bold"
              >
                {t('nav.new_project_create')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Users Modal Overlay */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <form onSubmit={handleInviteSubmit} className="w-full max-w-sm bg-white border border-[#e6e5e0] rounded-xl p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#26251e] flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#059669]" />
                  <span>{t('nav.invite_users_title')}</span>
                </h3>
                <p className="text-xs text-[#7a7a76]">{t('nav.invite_users_title')}</p>
              </div>
              <button type="button" onClick={() => { setShowInviteModal(false); setInviteError(''); }} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors">
                <span className="text-[#807d72] text-lg leading-none">&times;</span>
              </button>
            </div>

            {inviteSuccess ? (
              <div className="py-6 flex flex-col items-center justify-center space-y-2 text-[#059669]">
                <div className="w-12 h-12 rounded-full bg-[#059669]/10 border border-[#059669]/20 flex items-center justify-center">
                  <Check className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold">{t('nav.invite_success')}</p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{t('nav.invite_email_label')}</label>
                  <input 
                    type="email" 
                    required
                    placeholder="collaborateur@agence.com"
                    value={inviteEmail}
                    onChange={(e) => { setInviteEmail(e.target.value); setInviteError(''); }}
                    className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-full focus:outline-none focus:ring-1 focus:ring-[#059669]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] block mb-1">{t('nav.invite_role_label')}</label>
                  <div className="flex gap-2">
                    {(['editor', 'viewer', 'admin'] as const).map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setInviteRole(role)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-full border text-center transition-colors capitalize ${inviteRole === role ? 'bg-[#26251e] border-[#26251e] text-white' : 'bg-white border-[#e6e5e0] text-[#555552] hover:bg-slate-50'}`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>

                {inviteError && (
                  <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {inviteError}
                  </div>
                )}

                <div className="flex justify-end gap-2 text-xs pt-2 border-t border-[#e5e5e0]/60">
                  <Button 
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setInviteEmail('');
                      setInviteSuccess(false);
                      setInviteError('');
                      setShowInviteModal(false);
                    }}
                    className="h-8 text-[#555552]"
                    disabled={isSendingInvite}
                  >
                    {t('today.cancel')}
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isSendingInvite || !inviteEmail.trim()}
                    className="h-8 bg-[#059669] hover:bg-[#047857] text-white font-bold flex items-center gap-1.5"
                  >
                    {isSendingInvite ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Envoi...</span>
                      </>
                    ) : (
                      <span>{t('nav.invite_send')}</span>
                    )}
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* Spotlight modal overlay */}
      {showSearchModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/45 backdrop-blur-xs" onClick={() => setShowSearchModal(false)}>
          <div 
            className="w-full max-w-xl bg-white border border-[#e6e5e0] rounded-2xl shadow-2xl p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 text-left" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#7a7a76]" />
              <input
                type="text"
                autoFocus
                placeholder="Rechercher des prospects, des espaces de travail ou naviguer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs font-semibold px-4 py-2.5 pl-10 bg-white border border-[#e6e5e0] focus:border-[#10b981] rounded-xl outline-none transition-colors shadow-none text-[#26251e]"
              />
            </div>

            {/* Results categorized list */}
            <div className="max-h-96 overflow-y-auto space-y-4 pr-1">
              {/* Section 1: Navigation Tabs */}
              <div className="space-y-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] block px-1.5">Navigation</span>
                <div className="grid grid-cols-2 gap-1.5 text-left">
                  {[
                    { name: "Aujourd'hui (Tableau de bord)", path: '/today' },
                    { name: 'Prospection (Scraper local)', path: '/prospecting' },
                    { name: 'Prospects ciblés (Recherche)', path: '/leads' },
                    { name: 'Pipeline commercial (Kanban)', path: '/pipeline' },
                    { name: 'Bibliothèque de contenu', path: '/library' },
                    { name: "Espace de configuration IA", path: '/settings' },
                    { name: "Configuration d'équipe", path: '/team' },
                    { name: 'Historique des versions (Changelog)', path: '/changelog' },
                    { name: 'Diagnostics & Téléchargements', path: '/download' },
                  ]
                    .filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .slice(0, 4)
                    .map(tab => (
                      <button
                        key={tab.path}
                        onClick={() => {
                          router.push(tab.path);
                          setShowSearchModal(false);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-[#e5e5e0]/60 hover:bg-[#f4f4f3]/45 hover:border-neutral-300 bg-[#fdfdfc] text-left text-xs text-[#555552] hover:text-[#26251e] font-semibold transition-all cursor-pointer"
                      >
                        {tab.name}
                      </button>
                    ))}
                </div>
              </div>

              {/* Section 2: Projets / Espaces de travail */}
              {workspacesList && workspacesList.length > 0 && (
                <div className="space-y-1 text-left">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] block px-1.5">Espaces de travail (Projets)</span>
                  <div className="space-y-1">
                    {workspacesList
                      .filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
                      .slice(0, 3)
                      .map(ws => (
                        <div
                          key={ws.id}
                          onClick={() => {
                            switchWorkspace(ws.id);
                            setShowSearchModal(false);
                          }}
                          className="p-2 border border-[#e5e5e0]/60 rounded-xl hover:bg-[#fdfdfc] cursor-pointer transition-all flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center font-bold text-[10px] text-[#10b981]">
                              {ws.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-semibold text-[#26251e]">{ws.name}</span>
                          </div>
                          <span className="text-[9px] text-[#7a7a76] font-semibold">Changer d'espace</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Section 3: Prospects */}
              {leads && leads.length > 0 && (
                <div className="space-y-1 text-left">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] block px-1.5">Prospects (Leads)</span>
                  <div className="space-y-1 text-left">
                    {leads
                      .filter(l => l.businessName.toLowerCase().includes(searchQuery.toLowerCase()) || l.city.toLowerCase().includes(searchQuery.toLowerCase()) || l.niche.toLowerCase().includes(searchQuery.toLowerCase()))
                      .slice(0, 4)
                      .map(lead => (
                        <div
                          key={lead.id}
                          onClick={() => {
                            router.push(`/leads?focus=${lead.id}`);
                            setShowSearchModal(false);
                          }}
                          className="p-2.5 border border-[#e5e5e0]/60 rounded-xl hover:bg-[#fdfdfc] cursor-pointer transition-all flex items-center justify-between text-left"
                        >
                          <div className="flex flex-col gap-0.5 text-left">
                            <span className="text-xs font-bold text-[#26251e]">{lead.businessName}</span>
                            <div className="flex items-center gap-1.5 text-[9px] text-[#7a7a76] font-medium text-left">
                              <span>{lead.niche}</span>
                              <span>•</span>
                              <span>{lead.city}</span>
                            </div>
                          </div>
                          <span className="text-[9px] px-2 py-0.5 rounded-md bg-neutral-100 text-[#555552] border border-[#e5e5e0] font-bold uppercase">{lead.status}</span>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            </div>
            <div className="flex items-center justify-between text-[9px] text-[#7a7a76] font-semibold pt-2 border-t border-[#e5e5e0]/60">
              <span>Appuyez sur <kbd className="border bg-neutral-50 px-1 rounded">Échap</kbd> pour fermer</span>
              <span>Minerva OS Spotlight</span>
            </div>
          </div>
        </div>
      )}

      {pathname !== '/messages' && <BottomBlur height={64} />}
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ReachProvider>
      <TooltipProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </TooltipProvider>
    </ReachProvider>
  );
}
