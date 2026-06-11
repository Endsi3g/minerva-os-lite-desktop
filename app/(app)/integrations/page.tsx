'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  PenSquare, 
  Search, 
  Folder, 
  Sparkles, 
  Plug, 
  ChevronDown,
  ChevronRight,
  Globe,
  CheckCircle2,
  Lock,
  PanelLeftClose,
  MoreHorizontal,
  UserPlus,
  Bell,
  LogOut,
  FileText,
  Settings as SettingsIcon,
  FolderPlus,
  Plus,
  Loader2,
  Check,
  Cpu,
  Wrench,
  ChevronUp,
  X,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  GoogleCalendarIcon, 
  GoogleDriveIcon, 
  SharePointIcon, 
  ZoomIcon, 
  TeamsIcon, 
  GoogleMeetIcon, 
  MinervaIcon
} from '@/components/icons';
import { 
  getFolders, 
  getProjects, 
  addProject,
  getConnectedIntegrations, 
  connectIntegration,
  getOnboardingProgress,
  getOnboardingState,
  onboardingTasks,
  toggleOnboardingTask
} from '@/lib/onboarding-store';
import { createClient } from '@/lib/supabase/client';
import { signout } from '@/app/login/actions';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface IntegrationItem {
  id: string;
  name: string;
  category: string;
  owner: string;
  email: string;
  accEmail: string;
  icon: React.ComponentType<{ size?: number; className?: string }> | (() => React.ReactNode);
  status: string;
  assets: string;
  access: string;
  description: string;
  custom?: boolean;
}

const DEFAULT_INTEGRATIONS: IntegrationItem[] = [
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    category: 'calendar',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'alexsmith.mobbin@gmail.com',
    icon: GoogleCalendarIcon,
    status: 'Active',
    assets: '—',
    access: 'Private',
    description: 'Synchronise your Google Calendar to extract context from upcoming events and schedules.'
  },
  {
    id: 'demo-website-1',
    name: 'Demo - Why AI Will Save the ...',
    category: 'website',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'This is a demo website integration',
    icon: () => (
      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
        <CheckCircle2 className="w-4 h-4 text-[#26251e]" />
      </div>
    ),
    status: 'Active',
    assets: '1',
    access: 'Entire workspace',
    description: 'Why AI Will Save the World — Article page analysis and content parsing.'
  },
  {
    id: 'demo-website-2',
    name: 'Demo - NVIDIA Announces Fi...',
    category: 'website',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'This is a demo website integration',
    icon: () => (
      <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
        <CheckCircle2 className="w-4 h-4 text-[#26251e]" />
      </div>
    ),
    status: 'Active',
    assets: '1',
    access: 'Entire workspace',
    description: 'NVIDIA Announces Financial Results — Parsing dynamic charts and financial data.'
  },
  {
    id: 'meeting-recorder',
    name: 'Meeting recorder',
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
    assets: '—',
    access: 'Private',
    description: 'Record, transcribe, and unlock knowledge from your meetings in Google Meet, Zoom, or Microsoft Teams.'
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
    assets: '—',
    access: 'Private',
    description: 'Find and access all of your SharePoint content. Limited to your 1,000 most recent files in the Free tier.'
  },
  {
    id: 'google-drive',
    name: 'Google Drive',
    category: 'document',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'alexsmith.drive@gmail.com',
    icon: GoogleDriveIcon,
    status: 'Active',
    assets: '—',
    access: 'Private',
    description: 'Ask your docs, sheets, presentations, and files anything. Limited to your 1,000 most recent files in the Free tier.'
  },
  {
    id: 'website',
    name: 'Website',
    category: 'website',
    owner: 'Alex Smith',
    email: 'alexsmith@minerva-os-lite.com',
    accEmail: 'https://minerva-os-lite.com',
    icon: () => <Globe className="w-[18px] h-[18px] text-[#7a7a76]" />,
    status: 'Active',
    assets: '100 pages limit',
    access: 'Entire workspace',
    description: 'Update to enterprise to index more pages. Limited to 100 pages'
  }
];

export default function IntegrationsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [availableSearchQuery, setAvailableSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'connected' | 'custom' | 'needs-config'>('all');

  // Sidebar controls
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [todayCollapsed, setTodayCollapsed] = useState(false);

  // Store-backed states
  const [folders, setFolders] = useState<string[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [connectedIds, setConnectedIds] = useState<string[]>([]);
  const [onboarding, setOnboarding] = useState({ percent: 12, score: 0 });
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  // Selection state for connect modal
  const [selectedIntegration, setSelectedIntegration] = useState<IntegrationItem | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Add Custom Integration states
  const [showAddScratchModal, setShowAddScratchModal] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customType, setCustomType] = useState<'scratch' | 'mcp' | 'a2a'>('scratch');
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

  // Project modal
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

  // User details
  const [userName, setUserName] = useState('Moi');

  useEffect(() => {
    const syncStore = () => {
      setFolders(getFolders());
      setProjects(getProjects());
      setConnectedIds(getConnectedIntegrations());
      setOnboarding(getOnboardingProgress());
      setCompletedTasks(getOnboardingState());
    };
    syncStore();
    window.addEventListener('minerva_store_update', syncStore);
    return () => window.removeEventListener('minerva_store_update', syncStore);
  }, []);

  useEffect(() => {
    const collapsed = localStorage.getItem('minerva_sidebar_collapsed') === 'true';
    if (collapsed) {
      setTimeout(() => {
        setIsCollapsed(true);
      }, 0);
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: settings } = await supabase
            .from('settings')
            .select('full_name')
            .eq('user_id', user.id)
            .maybeSingle();
          if (settings?.full_name) {
            setUserName(settings.full_name);
          }
        }
      } catch (err) {
        console.error("Error loading settings in integrations:", err);
      }
    };
    fetchUser();
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('minerva_sidebar_collapsed', String(nextState));
  };

  const handleBackToWorkspace = () => {
    router.push('/today');
  };

  const handleCreateCustomIntegration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;

    const newId = 'custom-' + Date.now();
    const newIntegration: IntegrationItem = {
      id: newId,
      name: customName.trim(),
      category: 'custom',
      owner: userName,
      email: `${userName.toLowerCase().replace(/\s/g, '')}@minerva-os-lite.com`,
      accEmail: 'Custom Connected Integration',
      icon: () => (
        <div className="w-7 h-7 rounded-lg bg-[#059669]/10 flex items-center justify-center border border-[#059669]/20 shrink-0">
          <Plug className="w-4 h-4 text-[#059669]" />
        </div>
      ),
      status: 'Active',
      assets: '—',
      access: 'Private',
      description: customDescription.trim() || 'Custom created integration connector.',
      custom: true
    };

    setIntegrationsList(prev => [...prev, newIntegration]);
    connectIntegration(newId);
    setConnectedIds(prev => [...prev, newId]);

    setCustomName('');
    setCustomDescription('');
    setCustomType('scratch');
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

  const navItems = [
    { name: 'Prospecter', href: '/prospecting', icon: PenSquare },
    { name: 'Search', href: '/leads', icon: Search },
    { name: 'Library', href: '/library', icon: Folder },
    { name: 'Agents', href: '/agents', icon: Sparkles },
    { name: 'Integrations', href: '/integrations', icon: Plug },
  ];

  const recentFiles = [
    { name: 'Onboarding rating report', href: '/leads' },
    { name: 'UX case study charts', href: '/leads' },
    { name: 'Design review doc', href: '/leads' },
    { name: 'Product presentation notes', href: '/leads' },
  ];

  const activeEditIntegration = integrationsList.find(i => i.id === activeIntegrationEditId);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#26251e] font-sans selection:bg-[#059669]/10">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Layout */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#e5e5e0] bg-[#f4f4f3] transition-all duration-300 ease-in-out lg:static lg:relative lg:translate-x-0",
        isCollapsed ? "lg:w-16" : "lg:w-[240px]",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        
        {/* Sidebar Brand Header */}
        <div className={cn(
          "flex h-12 items-center border-b border-[#e5e5e0] px-4 transition-all duration-300",
          isCollapsed ? "lg:justify-center lg:px-0" : "justify-between"
        )}>
          <div className="flex items-center gap-2 font-sans font-semibold text-sm tracking-tight text-[#26251e]">
            <MinervaIcon size={20} className="shrink-0" />
            {!isCollapsed && (
              <div 
                onClick={handleBackToWorkspace}
                className="flex items-center gap-1.5 cursor-pointer hover:bg-[#e5e5e2] px-1.5 py-0.5 rounded transition-colors"
              >
                <span className="font-semibold text-sm text-[#26251e]">Minerva OS Lite</span>
                <ChevronDown className="h-3 w-3 text-[#7a7a76]" />
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden py-3 space-y-4">
          <nav className={cn("space-y-[2px]", isCollapsed ? "px-2" : "px-3")}>
            {navItems.map((item) => {
              const isActive = item.href === '/integrations';
              
              const navLink = (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-md text-xs font-medium transition-all duration-150",
                    isCollapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-1.5",
                    isActive 
                      ? "bg-[#e5e5e2] text-[#26251e] font-semibold" 
                      : "text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e]"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0 text-[#555552]" />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );

              if (isCollapsed) {
                return (
                  <div key={item.name} className="relative group">
                    {navLink}
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-[#26251e] text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                      {item.name}
                    </div>
                  </div>
                );
              }

              return navLink;
            })}
          </nav>

          {/* Folders Section */}
          {!isCollapsed && (
            <div className="px-3 space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider text-left">
                Folders
              </div>
              <div className="space-y-[2px]">
                {folders.map(folder => (
                  <Link 
                    key={folder}
                    href="/library" 
                    className="flex items-center gap-2.5 px-2.5 py-1 text-xs text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e] rounded-md transition-colors"
                  >
                    <Folder className="h-3.5 w-3.5 text-[#7a7a76] shrink-0" />
                    <span className="truncate">{folder}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Projects Section */}
          {!isCollapsed && (
            <div className="px-3 space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider text-left">
                Projects
              </div>
              <div className="space-y-[2px]">
                {projects.map(proj => (
                  <div 
                    key={proj}
                    className="flex items-center gap-2.5 px-2.5 py-1 text-xs text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e] rounded-md transition-colors truncate"
                  >
                    <Folder className="h-3.5 w-3.5 text-[#7a7a76] shrink-0" />
                    <span className="truncate">{proj}</span>
                  </div>
                ))}
                <button 
                  onClick={() => setShowNewProjectModal(true)}
                  className="w-full flex items-center gap-2.5 px-2.5 py-1 text-xs text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e] rounded-md transition-colors text-left"
                >
                  <FolderPlus className="h-4 w-4 text-[#7a7a76]" />
                  <span>New project</span>
                </button>
              </div>
            </div>
          )}

          {/* Today Section */}
          {!isCollapsed && (
            <div className="px-3 space-y-1">
              <button 
                onClick={() => setTodayCollapsed(!todayCollapsed)}
                className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider hover:text-[#26251e] transition-colors"
              >
                <span>Today</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", todayCollapsed && "-rotate-90")} />
              </button>
              
              {!todayCollapsed && (
                <div className="space-y-[2px] mt-1">
                  {recentFiles.map((file) => (
                    <Link 
                      key={file.name}
                      href={file.href}
                      className="flex items-center gap-2.5 px-2.5 py-1 text-xs text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e] rounded-md transition-colors truncate"
                    >
                      <FileText className="h-3.5 w-3.5 text-[#7a7a76] shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar Footer */}
        <div className="border-t border-[#e5e5e0] bg-[#f4f4f3] py-2 px-3 space-y-2">
          {!isCollapsed && (
            <div className="relative">
              {showOnboarding && (
                <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-white border border-[#e5e5e0] rounded-lg shadow-sm space-y-3 z-50 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-1.5">
                    <span className="text-xs font-bold text-[#26251e]">Get started</span>
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
                              {task.name}
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
                className="w-full text-left p-2.5 bg-white border border-[#e5e5e0] hover:border-[#7a7a76] rounded-md transition-all flex flex-col gap-1.5 cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#26251e]">
                  <span>Get started</span>
                  <ChevronUp className={cn("h-3 w-3 text-[#7a7a76] transition-transform duration-200", showOnboarding && "rotate-180")} />
                </div>
                <div className="w-full bg-[#e5e5e2] h-1 rounded-full overflow-hidden">
                  <div className="bg-[#10b981] h-full rounded-full" style={{ width: `${onboarding.percent}%`, transition: 'width 0.5s ease-in-out' }} />
                </div>
              </button>
            </div>
          )}

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
                  className="flex items-center gap-2.5 text-xs font-semibold text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 px-2 py-1.5 rounded-md transition-colors flex-1 text-left font-bold"
                >
                  <SettingsIcon className="h-4 w-4 text-[#555552]" />
                  <span>Settings</span>
                </Link>
                <button 
                  onClick={async () => {
                    await signout();
                  }}
                  className="h-7 w-7 flex items-center justify-center rounded text-[#7a7a76] hover:bg-[#e5e5e2] hover:text-red-600 transition-colors"
                  title="Se déconnecter"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-between relative overflow-hidden bg-white min-w-0">
        
        {/* Unified App Top Header bar */}
        <header className="flex h-12 items-center justify-between border-b border-[#e5e5e0] bg-white px-6 shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-8 w-8 text-[#7a7a76] hover:text-[#26251e]"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>

            <button
              onClick={toggleCollapse}
              className="h-8 w-8 hidden lg:flex items-center justify-center rounded text-[#7a7a76] hover:bg-[#e5e5e2]/60 transition-colors"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#7a7a76]">
              <Link href="/today" className="hover:text-[#26251e]">Minerva OS Lite</Link>
              <span className="text-[#e5e5e0] font-normal">/</span>
              {activeIntegrationEditId ? (
                <>
                  <button onClick={() => setActiveIntegrationEditId(null)} className="hover:text-[#26251e]">Integrations</button>
                  <span className="text-[#e5e5e0] font-normal">/</span>
                  <span className="text-[#26251e] font-bold">{activeEditIntegration?.name}</span>
                  <span className="text-[#e5e5e0] font-normal">/</span>
                  <span className="text-[#7a7a76]">Edit</span>
                </>
              ) : (
                <span className="text-[#26251e] font-bold">Integrations</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowInviteModal(true)}
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs font-semibold text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 flex items-center gap-1.5 rounded-md px-3 border border-[#e5e5e0]"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Invite Users</span>
            </Button>

            <Button variant="ghost" size="icon" className="text-[#7a7a76] hover:text-[#26251e] h-8 w-8 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[#10b981]" />
            </Button>

            <div className="h-4 w-px bg-[#e5e5e0] mx-1" />

            <div className="h-7 w-7 rounded-full overflow-hidden border border-[#e5e5e0] bg-[#e5e5e2] flex items-center justify-center shrink-0">
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>

        {/* Integration Editor View */}
        {activeIntegrationEditId && activeEditIntegration ? (
          <div className="flex-1 overflow-y-auto bg-white p-8 animate-in fade-in duration-200">
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
                    <h1 className="text-xl font-bold leading-none">{activeEditIntegration.name}</h1>
                    <p className="text-xs text-[#7a7a76] line-clamp-1">{activeEditIntegration.description}</p>
                    <p className="text-[10px] text-[#7a7a76]">Par <span className="font-semibold text-[#26251e]">{activeEditIntegration.owner}</span></p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8.5 text-xs font-semibold px-3.5 border-[#e5e5e0] text-[#555552] hover:text-[#26251e] bg-white rounded-md"
                  >
                    Export
                  </Button>
                  <button className="h-8.5 w-8.5 flex items-center justify-center rounded-md border border-[#e5e5e0] hover:bg-slate-50 text-[#7a7a76]">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Editor Tabs Navigation */}
              <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-px">
                <div className="flex gap-6 text-xs font-bold text-[#7a7a76]">
                  <button 
                    onClick={() => setActiveTab('build')}
                    className={`pb-2.5 transition-colors border-b-2 -mb-px ${activeTab === 'build' ? 'border-[#059669] text-[#26251e]' : 'border-transparent hover:text-[#26251e]'}`}
                  >
                    &lt;/&gt; Build
                  </button>
                  <button 
                    onClick={() => setActiveTab('share')}
                    className={`pb-2.5 transition-colors border-b-2 -mb-px ${activeTab === 'share' ? 'border-[#059669] text-[#26251e]' : 'border-transparent hover:text-[#26251e]'}`}
                  >
                    👥 Share
                  </button>
                  <button 
                    onClick={() => setActiveTab('insights')}
                    className={`pb-2.5 transition-colors border-b-2 -mb-px ${activeTab === 'insights' ? 'border-[#059669] text-[#26251e]' : 'border-transparent hover:text-[#26251e]'}`}
                  >
                    📈 Insights
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
                        Authentication
                      </button>
                      <button 
                        onClick={() => setActiveBuildSubTab('actions')}
                        className={`pb-2 ${activeBuildSubTab === 'actions' ? 'text-[#26251e] border-b-2 border-[#26251e]' : 'hover:text-[#26251e]'}`}
                      >
                        Actions
                      </button>
                      <button 
                        onClick={() => setActiveBuildSubTab('triggers')}
                        className={`pb-2 ${activeBuildSubTab === 'triggers' ? 'text-[#26251e] border-b-2 border-[#26251e]' : 'hover:text-[#26251e]'}`}
                      >
                        Triggers
                      </button>
                    </div>

                    {activeBuildSubTab === 'auth' && (
                      <div className="border border-[#e5e5e0] rounded-xl bg-white p-6 space-y-6 shadow-2xs">
                        <div className="flex items-center justify-between border-b border-[#e5e5e0]/60 pb-3">
                          <h2 className="font-bold text-sm">Authentication</h2>
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
                                <span>Enregistré !</span>
                              </>
                            ) : (
                              <span>Save</span>
                            )}
                          </Button>
                        </div>

                        <div className="space-y-4 max-w-md">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold bg-[#f4f4f3] px-2 py-0.5 border border-[#e5e5e0] rounded">Step 1</span>
                            <h3 className="text-xs font-bold mt-1 text-[#26251e]">Type</h3>
                            <p className="text-[11px] text-[#7a7a76]">Select the authentication type that your app requires.</p>
                          </div>
                          
                          <select
                            value={authType}
                            onChange={(e) => setAuthType(e.target.value as 'none' | 'key' | 'oauth')}
                            className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669]"
                          >
                            <option value="none">None (Pas d&apos;authentification nécessaire)</option>
                            <option value="key">API Key (Clé API de sécurité)</option>
                            <option value="oauth">OAuth 2.0 Client Credentials</option>
                          </select>
                        </div>
                      </div>
                    )}

                    {activeBuildSubTab === 'actions' && (
                      <div className="border border-[#e5e5e0] rounded-xl bg-white p-6 space-y-4 shadow-2xs flex flex-col items-center justify-center py-12">
                        <Cpu className="w-8 h-8 text-[#7a7a76]" />
                        <div className="text-center space-y-1">
                          <h3 className="font-bold text-xs">Aucune action configurée</h3>
                          <p className="text-[11px] text-[#7a7a76] max-w-xs leading-relaxed">Déclarez des requêtes API et des méthodes de requêtes pour que Minerva puisse interagir avec ce connecteur.</p>
                        </div>
                        <Button className="h-8 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white">Ajouter une action</Button>
                      </div>
                    )}

                    {activeBuildSubTab === 'triggers' && (
                      <div className="border border-[#e5e5e0] rounded-xl bg-white p-6 space-y-4 shadow-2xs flex flex-col items-center justify-center py-12">
                        <Cpu className="w-8 h-8 text-[#7a7a76]" />
                        <div className="text-center space-y-1">
                          <h3 className="font-bold text-xs">Aucun déclencheur configuré</h3>
                          <p className="text-[11px] text-[#7a7a76] max-w-xs leading-relaxed">Configurez des webhooks ou des processus périodiques de scrutation (polling).</p>
                        </div>
                        <Button className="h-8 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white">Ajouter un trigger</Button>
                      </div>
                    )}

                  </div>
                )}

                {/* Share Tab */}
                {activeTab === 'share' && (
                  <div className="border border-[#e5e5e0] rounded-xl bg-white p-6 space-y-6 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-[#e5e5e0]/60 pb-3">
                      <h2 className="font-bold text-sm">Partager l&apos;intégration</h2>
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
                            <span>Partagé !</span>
                          </>
                        ) : (
                          <span>Save</span>
                        )}
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {/* Invite input */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[#26251e]">Invite users, groups or API keys</label>
                        <div className="flex gap-2">
                          <Input 
                            placeholder="Add users, groups and API keys"
                            value={inviteEmailInput}
                            onChange={(e) => setInviteEmailInput(e.target.value)}
                            className="h-9 text-xs border-[#e5e5e0] focus-visible:ring-[#059669]"
                          />
                          <Button 
                            type="button" 
                            onClick={() => {
                              if (inviteEmailInput.trim()) {
                                setInviteEmailInput('');
                                alert("Utilisateur invité avec succès !");
                              }
                            }}
                            className="h-9 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white"
                          >
                            Add
                          </Button>
                        </div>
                      </div>

                      {/* People with access list */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#26251e] block">People with access</label>
                        <div className="border border-[#e5e5e0]/60 rounded-xl p-3 bg-[#fdfdfc] flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#059669]/10 flex items-center justify-center font-bold text-xs text-[#059669]">
                              {userName.substring(0, 1).toUpperCase()}
                            </div>
                            <div className="text-left">
                              <p className="text-xs font-bold text-[#26251e]">{userName} (You)</p>
                              <p className="text-[10px] text-[#7a7a76]">{activeEditIntegration.email}</p>
                            </div>
                          </div>
                          <select className="text-xs bg-white border border-[#e5e5e0] p-1.5 rounded cursor-pointer">
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                            <option value="admin">Owner</option>
                          </select>
                        </div>
                      </div>

                      {/* General access */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-[#26251e] block">General access</label>
                        <div className="flex items-start gap-3 bg-[#fcfcfb] border border-[#e5e5e0] p-4 rounded-xl">
                          <div className="w-7 h-7 rounded-full bg-[#e5e5e2]/80 flex items-center justify-center text-[#7a7a76] shrink-0">
                            {generalAccessType === 'restricted' ? <Lock className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />}
                          </div>
                          <div className="space-y-1">
                            <select 
                              value={generalAccessType}
                              onChange={(e) => setGeneralAccessType(e.target.value as 'restricted' | 'public')}
                              className="text-xs bg-transparent border-none font-bold text-[#26251e] focus:outline-none p-0 cursor-pointer"
                            >
                              <option value="restricted">Restricted (Privé)</option>
                              <option value="public">Entire Workspace (Public)</option>
                            </select>
                            <p className="text-[10px] text-[#7a7a76] leading-relaxed">
                              {generalAccessType === 'restricted' ? 'Only people with access can use this integration.' : 'Everyone in this workspace can view and use this integration.'}
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
                      <h2 className="font-bold text-sm">Insights</h2>
                      <div className="flex gap-2">
                        <select className="text-xs bg-white border border-[#e5e5e0] p-1.5 rounded cursor-pointer">
                          <option value="30">Last 30 days</option>
                          <option value="7">Last 7 days</option>
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
                        <h4 className="font-bold text-xs text-[#26251e]">No actions configured</h4>
                        <p className="text-[11px] text-[#7a7a76] max-w-xs leading-relaxed">Configure actions to start seeing insights about their usage statistics.</p>
                      </div>
                    </div>
                  </div>
                )}

              </div>

            </div>
          </div>
        ) : (
          /* Main Integrations Scrollable list */
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-5xl mx-auto p-8 space-y-10">
              
              {/* Connected Integrations Section */}
              <div className="space-y-5">
                
                {/* Header Row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-left">
                  <div className="space-y-1">
                    <h1 className="text-xl font-bold tracking-tight text-[#26251e]">Connected integrations</h1>
                    <p className="text-xs text-[#7a7a76]">Manage your connected data sources</p>
                  </div>
                  
                  {/* Dropdown Menu for Add integration */}
                  <div className="shrink-0 self-start sm:self-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          className="h-8.5 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white flex items-center gap-1.5 rounded-md px-3.5"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add integration</span>
                          <ChevronDown className="h-3 w-3 ml-0.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44 text-xs font-semibold bg-white border-[#e5e5e0] shadow-md rounded-md p-1 font-sans">
                        <DropdownMenuItem 
                          onClick={() => setShowAddScratchModal(true)}
                          className="hover:bg-slate-50 cursor-pointer p-2 rounded text-[#26251e]"
                        >
                          + Start from scratch
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => alert("Fonctionnalité d'import bientôt disponible !")}
                          className="hover:bg-slate-50 cursor-pointer p-2 rounded text-[#26251e]"
                        >
                          Import integration
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
                        placeholder="Search integrations"
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
                        All
                      </button>
                      <button 
                        onClick={() => setFilterTab('connected')} 
                        className={`px-3 py-1 rounded font-semibold transition-all ${filterTab === 'connected' ? 'bg-white text-[#26251e] shadow-2xs' : 'text-[#7a7a76] hover:text-[#26251e]'}`}
                      >
                        Connected
                      </button>
                      <button 
                        onClick={() => setFilterTab('custom')} 
                        className={`px-3 py-1 rounded font-semibold transition-all ${filterTab === 'custom' ? 'bg-white text-[#26251e] shadow-2xs' : 'text-[#7a7a76] hover:text-[#26251e]'}`}
                      >
                        Built by me
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
                          <span>Name</span>
                          <ChevronDown className="h-3 w-3" />
                        </th>
                        <th className="py-2.5 px-4 font-bold">Connection status</th>
                        <th className="py-2.5 px-4 font-bold">Assets</th>
                        <th className="py-2.5 px-4 font-bold flex items-center gap-1 cursor-pointer hover:text-[#26251e]">
                          <span>Access</span>
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
                            Aucune intégration connectée ne correspond à vos filtres.
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
                                    <span className="font-semibold text-sm text-[#26251e]">{item.name}</span>
                                    <span className="text-[10px] text-[#7a7a76]">{item.accEmail}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="font-medium text-[#26251e]">{item.status}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-[#7a7a76] font-medium text-left">{item.assets}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1 bg-[#f4f4f3] px-2 py-0.5 rounded-md text-[10px] font-semibold text-[#555552] w-fit">
                                  {item.access === 'Private' ? <Lock className="h-2.5 w-2.5" /> : <Globe className="h-2.5 w-2.5 text-[#7a7a76]" />}
                                  <span>{item.access}</span>
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
                                  onClick={() => setActiveIntegrationEditId(item.id)}
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-7 text-xs font-semibold px-2 text-[#7a7a76] hover:text-[#059669] hover:bg-emerald-50/50"
                                >
                                  Configure
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
                  <h2 className="text-xl font-bold tracking-tight text-[#26251e]">Available integrations</h2>
                  <p className="text-xs text-[#7a7a76]">Browse and connect your data sources</p>
                </div>

                {/* Search Available integrations */}
                <div className="relative w-64 pb-2">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#7a7a76]" />
                  <Input 
                    placeholder="Search integrations"
                    value={availableSearchQuery}
                    onChange={(e) => setAvailableSearchQuery(e.target.value)}
                    className="h-8.5 pl-8.5 text-xs bg-white border-[#e5e5e0] focus-visible:ring-1 focus-visible:ring-[#059669] rounded-md"
                  />
                </div>

                {/* Grid of Available Integrations cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredAvailable.length === 0 ? (
                    <div className="col-span-2 py-8 text-center text-xs text-[#7a7a76]">
                      All available integrations are already connected.
                    </div>
                  ) : (
                    filteredAvailable.map((item) => {
                      const IconComponent = item.icon;
                      return (
                        <div 
                          key={item.id} 
                          onClick={() => {
                            setSelectedIntegration(item);
                            setShowConnectModal(true);
                          }}
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
                            <h3 className="font-bold text-sm text-[#26251e] text-left">{item.name}</h3>
                            <p className="text-[11px] text-[#7a7a76] leading-relaxed text-left">
                              {item.description}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider group-hover:text-[#26251e] transition-colors mt-2 text-left">
                            Connect
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

      </div>

      {/* Connect Integration Modal Overlay */}
      {showConnectModal && selectedIntegration && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-[#e6e5e0] rounded-xl p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1 text-left">
              <h3 className="text-sm font-bold text-[#26251e]">Connecter {selectedIntegration.name}</h3>
              <p className="text-xs text-[#7a7a76]">Voulez-vous connecter cette intégration à votre espace de travail Minerva OS Lite ?</p>
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
                Annuler
              </Button>
              <Button 
                onClick={() => {
                  connectIntegration(selectedIntegration.id);
                  setConnectedIds(prev => [...prev, selectedIntegration.id]);
                  setSelectedIntegration(null);
                  setShowConnectModal(false);
                }}
                className="h-8 bg-[#059669] hover:bg-[#047857] text-white font-bold"
              >
                Confirmer la connexion
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Start From Scratch / Add Integration Dialog */}
      {showAddScratchModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <form onSubmit={handleCreateCustomIntegration} className="w-full max-w-xl bg-white border border-[#e6e5e0] rounded-2xl p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-[#26251e]">Add integration</h3>
                <p className="text-xs text-[#7a7a76]">Connect external tools to retrieve data, take actions, and more.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddScratchModal(false)}
                className="text-[#7a7a76] hover:text-[#26251e] p-1 rounded-md hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Type selector */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Type</label>
              <div className="grid grid-cols-3 gap-3">
                {/* Scratch Card */}
                <div 
                  onClick={() => setCustomType('scratch')}
                  className={`p-4 border rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-all ${customType === 'scratch' ? 'border-[#059669] bg-[#059669]/5 shadow-xs' : 'border-[#e5e5e0] hover:border-[#7a7a76] bg-white'}`}
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-[#059669] flex items-center justify-center font-bold text-sm mb-3">
                    &lt;/&gt;
                  </div>
                  <h4 className="font-bold text-[11px] text-[#26251e] mb-1">Build integration from scratch</h4>
                  <input 
                    type="radio" 
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
                  <h4 className="font-bold text-[11px] text-[#26251e] mb-1">Connect remote MCP</h4>
                  <input 
                    type="radio" 
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
                  <h4 className="font-bold text-[11px] text-[#26251e] mb-1">Connect Remote Agent (A2A)</h4>
                  <input 
                    type="radio" 
                    checked={customType === 'a2a'} 
                    onChange={() => setCustomType('a2a')}
                    className="text-[#059669] focus:ring-[#059669] mt-2" 
                  />
                </div>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Name</label>
              <input 
                type="text" 
                required
                placeholder="Enter integration name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669]"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Integration description</label>
              <textarea 
                placeholder="Enter integration description"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669] h-20 resize-none"
              />
            </div>

            <div className="flex justify-end gap-2 text-xs pt-2 border-t border-[#e5e5e0]/60">
              <Button 
                type="button"
                variant="ghost"
                onClick={() => setShowAddScratchModal(false)}
                className="h-8.5 text-[#555552]"
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="h-8.5 bg-[#059669] hover:bg-[#047857] text-white font-bold"
              >
                Create
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
                <span>Inviter des Collaborateurs</span>
              </h3>
              <p className="text-xs text-[#7a7a76]">Ajoutez des membres d&apos;équipe pour collaborer sur vos campagnes de prospection.</p>
            </div>

            {inviteSuccess ? (
              <div className="py-6 flex flex-col items-center justify-center space-y-2 text-[#059669]">
                <Check className="w-8 h-8 rounded-full bg-[#059669]/10 p-1.5 border border-[#059669]/20 animate-bounce" />
                <p className="text-xs font-bold">Invitation envoyée avec succès !</p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Adresse e-mail</label>
                  <input 
                    type="email" 
                    required
                    placeholder="Ex: collaborateur@agence.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] block mb-1">Rôle d&apos;accès</label>
                  <div className="flex gap-2">
                    {(['editor', 'viewer', 'admin'] as const).map(role => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setInviteRole(role)}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md border text-center transition-colors capitalize ${inviteRole === role ? 'bg-[#059669] border-[#059669] text-white' : 'bg-white border-[#e6e5e0] text-[#555552] hover:bg-slate-50'}`}
                      >
                        {role}
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
                    Annuler
                  </Button>
                  <Button 
                    type="submit"
                    disabled={isSendingInvite}
                    className="h-8 bg-[#059669] hover:bg-[#047857] text-white font-bold flex items-center gap-1.5"
                  >
                    {isSendingInvite ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Envoi...</span>
                      </>
                    ) : (
                      <span>Envoyer l&apos;invitation</span>
                    )}
                  </Button>
                </div>
              </>
            )}
          </form>
        </div>
      )}

      {/* New Project Modal Overlay */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white border border-[#e6e5e0] rounded-xl p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#26251e] text-left">Nouveau Projet</h3>
              <p className="text-xs text-[#7a7a76] text-left">Donnez un nom à votre projet de prospection.</p>
            </div>
            <input 
              type="text" 
              placeholder="Ex: Campagne Dentistes Paris"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-[#e6e5e0] rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (newProjectName.trim()) {
                    addProject(newProjectName.trim());
                    setNewProjectName('');
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
                  setShowNewProjectModal(false);
                }}
                className="h-8 text-[#555552]"
              >
                Annuler
              </Button>
              <Button 
                onClick={() => {
                  if (newProjectName.trim()) {
                    addProject(newProjectName.trim());
                    setNewProjectName('');
                    setShowNewProjectModal(false);
                  }
                }}
                className="h-8 bg-[#059669] hover:bg-[#047857] text-white font-bold"
              >
                Créer le projet
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
