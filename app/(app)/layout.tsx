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
  Check,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReachProvider } from '@/lib/reach-context';
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

const pathnameMap: Record<string, string> = {
  today: 'Today',
  leads: 'Inbox',
  library: 'Library',
  pipeline: 'Skills',
  prospecting: 'Workflows',
  intelligence: 'Prompts',
  integrations: 'Integrations',
  settings: 'Settings'
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checkingWelcome, setCheckingWelcome] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
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

  if (pathname === '/integrations') {
    return (
      <ReachProvider>
        <TooltipProvider>
          {children}
        </TooltipProvider>
      </ReachProvider>
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
      let label = pathnameMap[segment] || segment;

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

  return (
    <ReachProvider>
      <TooltipProvider>
        <div className="flex h-screen w-screen overflow-hidden bg-white text-[#26251e] font-sans selection:bg-[#f54e00]/10">
          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 z-40 bg-black/20 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
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
                  <div className="flex items-center gap-1 cursor-pointer hover:bg-[#e5e5e2] px-1.5 py-0.5 rounded transition-colors">
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
                    Projects
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
                    <span>New project</span>
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
              
              {/* Collapsible Get Started progress card */}
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
                      <span>Get started</span>
                      <ChevronUp className={cn("h-3 w-3 text-[#7a7a76] transition-transform duration-200", showOnboarding && "rotate-180")} />
                    </div>
                    <div className="text-[10px] text-[#555552]">
                      {onboarding.percent}% done • <span className="text-[#10b981]">{onboarding.percent === 100 ? 'Completed!' : 'Looking good!'}</span>
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

          {/* Main Layout Area */}
          <div className="flex flex-1 flex-col overflow-hidden bg-white">
            {/* Topbar */}
            <header className="flex h-12 items-center justify-between border-b border-[#e5e5e0] bg-white px-6">
              
              {/* Left Action (Menu Trigger) */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden h-8 w-8"
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
                  <span>Invite Users</span>
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
        </div>

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
                          <Loader2 className="w-3 h-3 animate-spin" />
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
      </TooltipProvider>
    </ReachProvider>
  );
}
