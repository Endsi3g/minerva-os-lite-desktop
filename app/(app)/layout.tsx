'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Loader2,
  AlertCircle,
  Briefcase,
  Settings2,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReachProvider, useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { signout } from '@/app/login/actions';
import { MinervaIcon } from '@/components/icons';
import { 
  getOnboardingProgress, 
  getOnboardingState, 
  getProjects, 
  addProject, 
  onboardingTasks, 
  toggleOnboardingTask 
} from '@/lib/onboarding-store';
import { 
  Breadcrumb, 
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';

function AppLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useLanguage();
  
  // Workspace Context
  const { activeWorkspace, workspacesList, switchWorkspace } = useReach();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checkingWelcome, setCheckingWelcome] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  // Dropdown States for Workspaces switcher
  const [isWorkspaceMenuOpen, setIsWorkspaceMenuOpen] = useState(false);
  const [isSwitchWorkspaceOpen, setIsSwitchWorkspaceOpen] = useState(false);

  // Get started onboarding menu state
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [todayCollapsed, setTodayCollapsed] = useState(false);

  // New states for Minerva OS Lite interactive features
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projects, setProjects] = useState<string[]>([]);
  const [onboarding, setOnboarding] = useState({ percent: 12, score: 0 });
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  // Invite Users modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer' | 'admin'>('editor');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    const syncStore = () => {
      setProjects(getProjects());
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

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('minerva_sidebar_collapsed', String(nextState));
  };

  const [inviteError, setInviteError] = useState('');

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsSendingInvite(true);
    setInviteError('');

    const res = await fetch('/api/team/invite', {
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

  const [userProfile, setUserProfile] = useState<{ fullName: string; companyName: string } | null>(null);

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
        .select('full_name, company_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!settings || !settings.full_name) {
        router.push('/welcome');
      } else {
        setUserProfile({
          fullName: settings.full_name,
          companyName: settings.company_name || 'Uprising Studio'
        });
        setCheckingWelcome(false);
      }
    };
    checkUserAndSettings();
  }, [router]);

  if (checkingWelcome) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f7f7f4] text-[#26251e] font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#f54e00] border-t-transparent" />
          <span className="text-[11px] font-medium tracking-wider text-[#7a7a76] uppercase">Minerva OS...</span>
        </div>
      </div>
    );
  }

  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const crumbs = [];

    crumbs.push({
      label: 'Minerva OS Lite',
      href: '/today',
      isLast: segments.length === 0 || (segments.length === 1 && segments[0] === 'today')
    });

    segments.forEach((segment, index) => {
      if (segment === 'today' && index === 0) return;

      const href = '/' + segments.slice(0, index + 1).join('/');
      let label = segment;
      if (segment === 'today') label = t('nav.today');
      else if (segment === 'leads') label = t('nav.search');
      else if (segment === 'library') label = t('nav.library');
      else if (segment === 'prospecting') label = t('nav.prospect');
      else if (segment === 'integrations') label = t('nav.integrations');
      else if (segment === 'settings') label = t('nav.settings');
      else if (segment === 'team') label = t('nav.team');
      else if (segment === 'workspaces') label = t('nav.workspaces');
      else if (segment === 'agents') label = t('nav.agents');

      if (segments[index - 1] === 'leads' && segment !== 'leads') {
        label = 'Details';
      }

      crumbs.push({
        label,
        href,
        isLast: index === segments.length - 1
      });
    });

    return crumbs;
  };

  // Minerva OS Lite navigation items
  const navItems = [
    { name: t('nav.prospect'), href: '/prospecting', icon: PenSquare },
    { name: t('nav.search'), href: '/leads', icon: Search },
    { name: t('nav.library'), href: '/library', icon: Folder },
    { name: t('nav.agents'), href: '/agents', icon: Sparkles },
    { name: t('nav.integrations'), href: '/integrations', icon: Plug },
    { name: t('nav.team'), href: '/team', icon: Users },
  ];

  const recentFiles = [
    { name: 'Onboarding rating report', href: '/leads' },
    { name: 'UX case study charts', href: '/leads' },
    { name: 'Design review doc', href: '/leads' },
    { name: 'Product presentation notes', href: '/leads' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#26251e] font-sans selection:bg-[#f54e00]/10">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#e5e5e0] bg-[#f4f4f3] transition-all duration-300 ease-in-out md:static md:relative md:translate-x-0",
        isCollapsed ? "md:w-16" : "md:w-[240px]",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        
        {/* Sidebar Brand Header (With Langdock style Switcher Dropdown) */}
        <div className={cn(
          "relative flex h-12 items-center border-b border-[#e5e5e0] px-4 transition-all duration-300",
          isCollapsed ? "md:justify-center md:px-0" : "justify-between"
        )}>
          <div className="flex items-center gap-2 font-sans font-semibold text-sm tracking-tight text-[#26251e] w-full min-w-0">
            <MinervaIcon size={20} className="shrink-0" />
            {!isCollapsed && (
              <div 
                onClick={() => setIsWorkspaceMenuOpen(!isWorkspaceMenuOpen)}
                className="flex flex-1 items-center justify-between gap-1 cursor-pointer hover:bg-[#e5e5e2] px-1.5 py-0.5 rounded transition-colors select-none min-w-0"
              >
                <span className="font-semibold text-sm text-[#26251e] truncate">
                  {activeWorkspace ? activeWorkspace.name : 'Minerva OS Lite'}
                </span>
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

                {/* Switch workspace parent item */}
                <div 
                  className="relative"
                  onMouseEnter={() => setIsSwitchWorkspaceOpen(true)}
                  onMouseLeave={() => setIsSwitchWorkspaceOpen(false)}
                >
                  <button
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 transition-colors text-left",
                      isSwitchWorkspaceOpen && "bg-[#e5e5e2]/60 text-[#26251e]"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>{t('nav.switch_workspace')}</span>
                    </span>
                    <ChevronRight className="w-3 h-3 text-[#7a7a76]" />
                  </button>

                  {/* Submenu flyout to the right */}
                  {isSwitchWorkspaceOpen && (
                    <div className="absolute left-full top-0 ml-0.5 w-52 bg-white border border-[#e5e5e0] rounded-xl shadow-lg py-1.5 z-[101] animate-in fade-in slide-in-from-left-1 duration-150 text-left">
                      <div className="max-h-[200px] overflow-y-auto">
                        {workspacesList.map((ws) => {
                          const isWsActive = activeWorkspace?.id === ws.id;
                          return (
                            <button
                              key={ws.id}
                              onClick={() => {
                                switchWorkspace(ws.id);
                                setIsWorkspaceMenuOpen(false);
                                setIsSwitchWorkspaceOpen(false);
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 transition-colors text-left"
                            >
                              <span className="truncate max-w-[120px]">{ws.name}</span>
                              {isWsActive && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                            </button>
                          );
                        })}
                      </div>
                      
                      {workspacesList.length > 0 && <div className="h-px bg-[#e5e5e0] my-1" />}

                      <Link
                        href="/workspaces"
                        onClick={() => {
                          setIsWorkspaceMenuOpen(false);
                          setIsSwitchWorkspaceOpen(false);
                        }}
                        className="flex items-center justify-between px-3 py-2 text-xs font-semibold text-[#807d72] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 transition-colors"
                      >
                        <span>{t('nav.all_workspaces')}</span>
                        <Globe className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>

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
          <nav className={cn("space-y-[2px]", isCollapsed ? "px-2" : "px-3")}>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/today' && pathname.startsWith(item.href));
              
              const navLink = (
                <Link
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center rounded-md text-xs font-medium transition-all duration-150",
                    isCollapsed 
                      ? "justify-center p-2" 
                      : "gap-2.5 px-2.5 py-1.5",
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
                  <Tooltip key={item.name}>
                    <TooltipTrigger asChild>
                      {navLink}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs bg-[#26251e] text-white">
                      {item.name}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return navLink;
            })}
          </nav>

          {/* Projects Section */}
          {!isCollapsed && (
            <div className="px-3 space-y-1">
              <div className="px-2.5 text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider">
                {t('nav.projects')}
              </div>
              {projects.map((proj) => (
                <div 
                  key={proj}
                  className="flex items-center gap-2.5 px-2.5 py-1 text-xs text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e] rounded-md transition-colors truncate"
                >
                  <Folder className="h-4 w-4 text-[#7a7a76] shrink-0" />
                  <span className="truncate">{proj}</span>
                </div>
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
                className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider hover:text-[#26251e] transition-colors"
              >
                <span>{t('nav.today')}</span>
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
                              {task.name}
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
                className="w-full text-left p-2.5 bg-white border border-[#e5e5e0] hover:border-[#7a7a76] rounded-md transition-all flex flex-col gap-1.5 cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs font-bold text-[#26251e]">
                  <span>{t('nav.get_started')}</span>
                  <ChevronUp className={cn("h-3 w-3 text-[#7a7a76] transition-transform duration-200", showOnboarding && "rotate-180")} />
                </div>
                <div className="text-[10px] text-[#555552]">
                  {onboarding.percent}% done • <span className="text-[#10b981]">{onboarding.percent === 100 ? t('nav.done') : t('nav.in_progress')}</span>
                </div>
                <div className="w-full bg-[#e5e5e2] h-1 rounded-full overflow-hidden">
                  <div className="bg-[#10b981] h-full rounded-full" style={{ width: `${onboarding.percent}%`, transition: 'width 0.5s ease-in-out' }} />
                </div>
              </button>
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
                  className="flex items-center gap-2.5 text-xs font-semibold text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 px-2 py-1.5 rounded-md transition-colors flex-1"
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
      </aside>

      {/* Main Layout Area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-white">
        {/* Topbar */}
        <header className="flex h-12 items-center justify-between border-b border-[#e5e5e0] bg-white px-6">
          
          {/* Left Action (Menu Trigger) */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>

            <button
              onClick={toggleCollapse}
              className="h-8 w-8 hidden md:flex items-center justify-center rounded text-[#7a7a76] hover:bg-[#e5e5e2]/60 transition-colors"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
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
              <button className="flex w-full items-center justify-between rounded border border-[#e5e5e0] bg-white py-1 pl-7 pr-2 text-left text-[10px] text-[#7a7a76] hover:bg-[#f4f4f3] transition-colors">
                <span>Search chats...</span>
                <kbd className="pointer-events-none inline-flex select-none items-center rounded border bg-muted px-1 font-mono text-[9px] text-[#7a7a76]">
                  /
                </kbd>
              </button>
            </div>

            <Button 
              onClick={() => setShowInviteModal(true)}
              variant="ghost" 
              size="sm" 
              className="h-8 text-xs font-semibold text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 flex items-center gap-1.5 rounded-md px-3 border border-[#e5e5e0]"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>{t('nav.invite_members')}</span>
            </Button>

            <Button variant="ghost" size="icon" className="text-[#7a7a76] hover:text-[#26251e] h-8 w-8 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[#10b981]" />
            </Button>

            <div className="h-4 w-px bg-[#e5e5e0] mx-1" />

            <div className="h-7 w-7 rounded-full overflow-hidden border border-[#e5e5e0] bg-[#e5e5e2] flex items-center justify-center shrink-0" title={userProfile?.fullName || 'Utilisateur'}>
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>

        {/* Page Content Slot */}
        <main className="flex-1 overflow-hidden bg-white">
          {children}
        </main>
      </div>

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
                {t('today.cancel')}
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

    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (pathname === '/integrations') {
    return (
      <ReachProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </ReachProvider>
    );
  }

  return (
    <ReachProvider>
      <TooltipProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </TooltipProvider>
    </ReachProvider>
  );
}
