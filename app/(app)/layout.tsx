'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  Kanban, 
  Brain, 
  Settings as SettingsIcon, 
  Search, 
  Bell, 
  Menu, 
  Moon, 
  Sun,
  User,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReachProvider } from '@/lib/reach-context';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { createClient } from '@/lib/supabase/client';
import { signout } from '@/app/login/actions';
import { 
  Breadcrumb, 
  BreadcrumbList, 
  BreadcrumbItem, 
  BreadcrumbLink, 
  BreadcrumbPage, 
  BreadcrumbSeparator 
} from '@/components/ui/breadcrumb';

const pathnameMap: Record<string, string> = {
  today: 'Tableau de bord',
  leads: 'Prospects',
  prospecting: 'Prospecter',
  pipeline: 'Pipeline',
  intelligence: 'Intelligence & IA',
  settings: 'Paramètres'
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [checkingWelcome, setCheckingWelcome] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
      <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">Minerva OS...</span>
        </div>
      </div>
    );
  }

  const getBreadcrumbs = () => {
    const segments = pathname.split('/').filter(Boolean);
    const crumbs = [];

    crumbs.push({
      label: 'Minerva',
      href: '/today',
      isLast: segments.length === 0 || (segments.length === 1 && segments[0] === 'today')
    });

    segments.forEach((segment, index) => {
      if (segment === 'today' && index === 0) return;

      const href = '/' + segments.slice(0, index + 1).join('/');
      let label = pathnameMap[segment] || segment;

      if (segments[index - 1] === 'leads' && segment !== 'leads') {
        label = 'Fiche prospect';
      }

      crumbs.push({
        label,
        href,
        isLast: index === segments.length - 1
      });
    });

    return crumbs;
  };

  const navItems = [
    { name: 'Today', href: '/today', icon: LayoutDashboard },
    { name: 'Leads', href: '/leads', icon: Users },
    { name: 'Prospecter', href: '/prospecting', icon: Search },
    { name: 'Pipeline', href: '/pipeline', icon: Kanban },
    { name: 'Intelligence', href: '/intelligence', icon: Brain },
    { name: 'Settings', href: '/settings', icon: SettingsIcon },
  ];

  return (
    <ReachProvider>
      <TooltipProvider>
        <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside className={cn(
            "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-card transition-all duration-300 ease-in-out lg:static lg:relative lg:translate-x-0",
            isCollapsed ? "lg:w-16" : "lg:w-64",
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          )}>
            {/* Desktop Collapse Toggle Button */}
            <button
              onClick={toggleCollapse}
              className="absolute -right-3 top-7 z-50 hidden h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground shadow-xs transition-all duration-300 lg:flex"
              aria-label={isCollapsed ? "Déplier la barre" : "Replier la barre"}
            >
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform duration-300", !isCollapsed && "rotate-180")} />
            </button>

            {/* Sidebar Brand Logo */}
            <div className={cn(
              "flex h-14 items-center border-b border-border px-6 transition-all duration-300",
              isCollapsed ? "lg:justify-center lg:px-0" : "justify-between"
            )}>
              <Link 
                href="/today" 
                className="flex items-center gap-2.5 font-sans font-semibold text-base tracking-tight"
                onClick={() => setSidebarOpen(false)}
              >
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-black shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                  M
                </div>
                {!isCollapsed && (
                  <>
                    <span className="animate-in fade-in-0 duration-300">Minerva Reach</span>
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground animate-in fade-in-0 duration-300">Lite</span>
                  </>
                )}
              </Link>
            </div>

            {/* Sidebar Navigation */}
            <nav className={cn("flex-1 space-y-1 py-6 transition-all duration-300", isCollapsed ? "px-2 lg:px-3" : "px-4")}>
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                
                const navLink = (
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={cn(
                      "flex items-center rounded-md text-sm font-medium transition-all duration-300",
                      isCollapsed 
                        ? "justify-center p-2 lg:p-2.5" 
                        : "gap-3 px-3 py-2",
                      isActive 
                        ? "bg-primary/10 text-primary" 
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && <span className="animate-in fade-in-0 duration-300">{item.name}</span>}
                  </Link>
                );

                if (isCollapsed) {
                  return (
                    <Tooltip key={item.name}>
                      <TooltipTrigger asChild>
                        {navLink}
                      </TooltipTrigger>
                      <TooltipContent side="right" className="text-xs">
                        {item.name}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <React.Fragment key={item.name}>
                    {navLink}
                  </React.Fragment>
                );
              })}
            </nav>

            {/* Sidebar Footer */}
            <div className={cn("border-t border-border transition-all duration-300", isCollapsed ? "p-2 lg:p-3" : "p-4")}>
              {isCollapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex h-8 w-8 mx-auto items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold cursor-default">
                      {userProfile?.fullName ? userProfile.fullName.substring(0, 2).toUpperCase() : 'US'}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="text-xs">
                    <p className="font-semibold">{userProfile?.companyName || 'Uprising Studio'}</p>
                    <p className="text-[10px] text-muted-foreground">{userProfile?.fullName || 'Prospection Locale'}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <div className="flex items-center gap-3 rounded-lg bg-secondary/50 p-2 text-left animate-in fade-in-0 duration-300">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {userProfile?.fullName ? userProfile.fullName.substring(0, 2).toUpperCase() : 'US'}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-xs font-medium text-foreground">{userProfile?.companyName || 'Uprising Studio'}</p>
                    <p className="truncate text-[10px] text-muted-foreground">{userProfile?.fullName || 'Prospection Locale'}</p>
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Main Layout Area */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Topbar */}
            <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
              {/* Left Action (Menu Trigger) */}
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>

                <Breadcrumb className="hidden sm:flex">
                  <BreadcrumbList>
                    {getBreadcrumbs().map((crumb, idx) => (
                      <React.Fragment key={crumb.href}>
                        {idx > 0 && <BreadcrumbSeparator />}
                        <BreadcrumbItem>
                          {crumb.isLast ? (
                            <BreadcrumbPage className="text-xs font-semibold">{crumb.label}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink asChild className="text-xs">
                              <Link href={crumb.href}>{crumb.label}</Link>
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </React.Fragment>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>

                {/* Global Search Button (Command Palette Look) */}
                <div className="relative hidden w-64 md:block">
                  <span className="absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                    <Search className="h-4 w-4" />
                  </span>
                  <button className="flex w-full items-center justify-between rounded-md border border-input bg-background py-1.5 pl-9 pr-3 text-left text-xs text-muted-foreground hover:bg-secondary/50 transition-colors">
                    <span>Rechercher...</span>
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-0.5 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                      Ctrl+K
                    </kbd>
                  </button>
                </div>
              </div>

              {/* Right actions */}
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="text-muted-foreground relative">
                  <Bell className="h-4 w-4" />
                  <span className="absolute top-2.5 right-2.5 h-1.5 w-1.5 rounded-full bg-primary" />
                </Button>

                <div className="h-4 w-px bg-border mx-2" />

                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground text-xs font-medium">
                  <User className="h-4 w-4" />
                </div>

                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={async () => {
                    await signout();
                  }}
                  className="text-muted-foreground"
                  title="Se déconnecter"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </header>

            {/* Page Content Slot */}
            <main className="flex-1 overflow-hidden bg-background">
              {children}
            </main>
          </div>
        </div>
      </TooltipProvider>
    </ReachProvider>
  );
}
