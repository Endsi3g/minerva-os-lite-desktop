'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Brain,
  Sparkles,
  BookOpen,
  BarChart2,
  Settings,
  LogOut,
  Menu,
  Bell,
  PanelLeftClose,
  MessageSquare,
  Pin,
  ArrowLeftRight,
  X,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { signout } from '@/app/login/actions';
import { MinervaIcon } from '@/components/icons';
import { ReachProvider, useReach, type AppNotification } from '@/lib/reach-context';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { User as UserIcon } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  dbGetSessions,
  dbDeleteSession,
  dbToggleSessionPin,
  AssistantSession,
} from '@/app/(ai)/assistant/_components/assistant-db';
import { getPlatformUrl } from '@/lib/platform-utils';

// ── Nav items ──────────────────────────────────────────────────────────────
const AI_NAV = [
  { href: '/assistant', icon: Brain,    label: 'Assistant' },
  { href: '/intelligence', icon: BarChart2, label: 'Intelligence' },
  { href: '/agents',     icon: Sparkles, label: 'Agents' },
  { href: '/skills',     icon: BookOpen, label: 'Skills' },
] as const;

// ── Relative time helper ───────────────────────────────────────────────────
function relativeTime(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  return new Date(iso).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
}

// ── Inner layout (requires ReachProvider) ─────────────────────────────────
function AILayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead, activeWorkspace } = useReach();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [userProfile, setUserProfile] = useState<{ fullName: string; companyName: string; avatarBase64?: string | null } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [assistantSessions, setAssistantSessions] = useState<AssistantSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Detect mobile
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Restore collapsed state
  useEffect(() => {
    const stored = localStorage.getItem('minerva_ai_sidebar_collapsed');
    if (stored === 'true') setIsCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    setIsCollapsed(v => {
      localStorage.setItem('minerva_ai_sidebar_collapsed', String(!v));
      return !v;
    });
  };

  // Load user profile
  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const { data } = await supabase.auth.getUser();
      const user = data.user;
      if (!user) { router.push('/login'); return; }
      setUserId(user.id);
      const { data: settings } = await supabase
        .from('settings')
        .select('full_name, company_name, avatar_base64')
        .eq('user_id', user.id)
        .maybeSingle();
      if (settings) {
        setUserProfile({
          fullName: settings.full_name || user.email || 'Utilisateur',
          companyName: settings.company_name || '',
          avatarBase64: settings.avatar_base64 || null,
        });
      }
    })();
  }, [router]);

  // Load assistant sessions with localStorage fallback
  const loadSessions = useCallback(async () => {
    const workspaceId = activeWorkspace?.id || localStorage.getItem('minerva_active_workspace_id') || '';
    if (!workspaceId || !userId) return;
    const sessions = await dbGetSessions(userId, workspaceId);
    setAssistantSessions(sessions);
    // Load active session from Supabase
    let loadedSessId: string | null = null;
    try {
      const res = await fetch('/api/settings/user-prefs');
      if (res.ok) {
        const prefs = await res.json();
        loadedSessId = prefs?.active_ai_sessions?.[workspaceId] ?? null;
      }
    } catch {}

    if (loadedSessId) {
      setActiveSessionId(loadedSessId);
    } else {
      // Fallback
      const local = localStorage.getItem(`minerva_active_sess_${workspaceId}`);
      if (local) setActiveSessionId(local);
    }
  }, [activeWorkspace?.id, userId]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    const handler = () => loadSessions();
    window.addEventListener('minerva_assistant_sync', handler);
    return () => window.removeEventListener('minerva_assistant_sync', handler);
  }, [loadSessions]);

  // Breadcrumb
  function getBreadcrumbs() {
    const parts = pathname.split('/').filter(Boolean);
    const crumbs: { label: string; href: string; isLast: boolean }[] = [];
    let built = '';
    for (let i = 0; i < parts.length; i++) {
      built += '/' + parts[i];
      const seg = parts[i];
      let label = seg.charAt(0).toUpperCase() + seg.slice(1);
      if (seg === 'assistant') label = 'Assistant';
      else if (seg === 'intelligence') label = 'Intelligence';
      else if (seg === 'agents') label = 'Agents';
      else if (seg === 'skills') label = 'Skills';
      crumbs.push({ label, href: built, isLast: i === parts.length - 1 });
    }
    return crumbs;
  }

  const reachUrl = getPlatformUrl('reach', '/today');
  const isOnAssistant = pathname.startsWith('/assistant');

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#26251e] font-sans selection:bg-[#10b981]/10">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <motion.aside
        animate={
          isMobile
            ? { x: sidebarOpen ? 0 : -240, width: 240 }
            : { width: isCollapsed ? 0 : 240, x: 0 }
        }
        initial={false}
        transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 1 }}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#e5e5e0] bg-[#f4f4f3] md:static md:relative shrink-0 overflow-hidden',
          isCollapsed ? 'md:border-r-0' : '',
        )}
        style={{ minWidth: 0 }}
      >
        <motion.div
          className="flex flex-col h-full w-[240px] min-w-[240px]"
          animate={isMobile ? { x: 0, opacity: 1 } : { x: isCollapsed ? -48 : 0, opacity: isCollapsed ? 0 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30, mass: 1 }}
        >
          {/* Brand header */}
          <div className="relative flex h-12 items-center border-b border-[#e5e5e0] px-4">
            <div className="flex items-center gap-2 font-semibold text-sm tracking-tight text-[#26251e] w-full min-w-0">
              <MinervaIcon size={20} className="text-[#059669] shrink-0" />
              <span className="truncate font-bold text-[#26251e]">Minerva AI</span>
              <span className="ml-auto text-[9px] font-bold text-[#059669] bg-[#059669]/10 px-1.5 py-0.5 rounded-full tracking-wider uppercase">
                AI
              </span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-0.5">
            {/* Switch to Reach */}
            <Link
              href={reachUrl}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] hover:text-[#059669] px-2 py-1.5 rounded-md hover:bg-[#e5e5e2]/60 transition-colors mb-3"
            >
              <ArrowLeftRight className="h-3.5 w-3.5 shrink-0" />
              <span>Minerva Reach</span>
            </Link>

            {/* AI Nav items */}
            {AI_NAV.map(({ href, icon: Icon, label }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-2.5 text-xs font-semibold px-2.5 py-2 rounded-md transition-colors',
                    isActive
                      ? 'bg-white text-[#26251e] shadow-xs border border-[#e5e5e0]'
                      : 'text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60',
                  )}
                >
                  <Icon
                    className={cn('h-4 w-4 shrink-0 transition-all', isActive ? 'text-[#059669]' : 'text-[#555552] opacity-60')}
                    strokeWidth={isActive ? 2 : 1.5}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}

            {/* Assistant session history — only on /assistant */}
            {isOnAssistant && assistantSessions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#e5e5e0]/60 space-y-0.5">
                <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                  Historique
                </div>
                <Link
                  href="/assistant"
                  onClick={() => {
                    setSidebarOpen(false);
                    setActiveSessionId(null);
                    if (activeWorkspace) {
                      fetch('/api/settings/user-prefs', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ active_ai_sessions: { [activeWorkspace.id]: null } }),
                      }).catch(() => {});
                    }
                  }}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-semibold text-[#059669] bg-[#059669]/10 border border-[#059669]/20 rounded-md hover:bg-[#059669]/15 transition-all w-full justify-center mb-1"
                >
                  <MessageSquare className="w-3 h-3 shrink-0" />
                  <span>Nouvelle conversation</span>
                </Link>
                <div className="max-h-48 overflow-y-auto space-y-0.5">
                  {assistantSessions.map((sess) => (
                    <div
                      key={sess.id}
                      className={cn(
                        'group flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-all cursor-pointer',
                        activeSessionId === sess.id
                          ? 'bg-[#059669]/10 text-[#059669]'
                          : 'text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e]',
                      )}
                    >
                      {sess.pinned && <Pin className="h-2.5 w-2.5 text-amber-500 shrink-0" />}
                      <Link
                        href="/assistant"
                        onClick={() => {
                          setSidebarOpen(false);
                          setActiveSessionId(sess.id);
                          if (activeWorkspace) {
                            fetch('/api/settings/user-prefs', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ active_ai_sessions: { [activeWorkspace.id]: sess.id } }),
                            }).catch(() => {});
                          }
                          window.dispatchEvent(new CustomEvent('minerva_assistant_sync'));
                        }}
                        className="flex-1 truncate"
                      >
                        {sess.title}
                      </Link>
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          await dbToggleSessionPin(sess.id, !sess.pinned);
                          loadSessions();
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-[#e5e5e2] transition-all"
                      >
                        <Pin className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          const wid = activeWorkspace?.id || localStorage.getItem('minerva_active_workspace_id') || '';
                          await dbDeleteSession(wid, sess.id);
                          loadSessions();
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-100 hover:text-red-600 transition-all"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </nav>

          {/* Sidebar footer */}
          <div className="border-t border-[#e5e5e0] px-3 py-2">
            <div className="w-full flex items-center justify-between">
              <Link
                href="/settings"
                className={cn(
                  'flex items-center gap-2.5 text-xs font-semibold px-2 py-1.5 rounded-md transition-colors flex-1',
                  pathname.startsWith('/settings')
                    ? 'bg-[#e5e5e2] text-[#26251e]'
                    : 'text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60',
                )}
              >
                <Settings className="h-4 w-4 text-[#555552]" />
                <span>Paramètres</span>
              </Link>
              <button
                onClick={async () => { await signout(); }}
                className="h-7 w-7 flex items-center justify-center rounded text-[#7a7a76] hover:bg-[#e5e5e2] hover:text-red-600 transition-colors"
                title="Déconnexion"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.aside>

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden bg-white min-w-0">
        {/* Topbar */}
        <header className="flex h-12 items-center justify-between border-b border-[#e5e5e0] bg-white px-4 md:px-6 shrink-0">
          {/* Left */}
          <div className="flex items-center gap-2 md:gap-4">
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
            >
              <motion.div animate={{ rotate: isCollapsed ? 180 : 0 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }}>
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

          {/* Right */}
          <div className="flex items-center gap-2">
            {/* Platform switch icon */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={reachUrl}
                  className="h-8 flex items-center gap-1.5 px-2.5 rounded-md border border-[#e5e5e0] text-[10px] font-bold text-[#555552] hover:text-[#26251e] hover:bg-[#f4f4f3] transition-colors"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Minerva Reach</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent className="text-xs bg-[#26251e] text-white p-2 rounded-lg font-sans border border-neutral-800">
                Ouvrir Minerva Reach (prospection)
              </TooltipContent>
            </Tooltip>

            <div className="h-4 w-px bg-[#e5e5e0]" />

            {/* Notifications */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="text-[#7a7a76] hover:text-[#26251e] h-8 w-8 relative cursor-pointer">
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-[#059669]" />}
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
                    <div className="p-8 text-center text-xs text-[#7a7a76]">Aucune notification.</div>
                  ) : (
                    notifications.map((notif: AppNotification) => (
                      <div
                        key={notif.id}
                        className="p-3 hover:bg-[#f4f4f3]/25 transition-colors flex gap-2.5 items-start cursor-pointer"
                        onClick={() => { if (!notif.isRead) markNotificationRead(notif.id); }}
                      >
                        {!notif.isRead
                          ? <span className="w-1.5 h-1.5 rounded-full bg-[#059669] mt-1.5 shrink-0" />
                          : <span className="w-1.5 h-1.5 mt-1.5 shrink-0" />}
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

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger className="focus:outline-hidden">
                <div
                  className="h-7 w-7 rounded-full overflow-hidden border border-[#e5e5e0] bg-[#e5e5e2] flex items-center justify-center shrink-0 cursor-pointer"
                  title={userProfile?.fullName || 'Utilisateur'}
                >
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
                  <span className="text-[9px] text-[#7a7a76] truncate">{userProfile?.companyName || ''}</span>
                </div>
                <DropdownMenuItem onClick={() => router.push('/settings?tab=profile')} className="hover:bg-slate-50 cursor-pointer p-2 rounded-lg text-[#26251e] flex items-center gap-1.5">
                  <UserIcon className="h-3.5 w-3.5" />
                  <span>Mon profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')} className="hover:bg-slate-50 cursor-pointer p-2 rounded-lg text-[#26251e] flex items-center gap-1.5">
                  <Settings className="h-3.5 w-3.5" />
                  <span>Paramètres</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[#e5e5e0]/60 my-1" />
                <DropdownMenuItem
                  onClick={async () => { await signout(); router.push('/login'); }}
                  className="hover:bg-slate-50 cursor-pointer p-2 rounded-lg text-rose-600 flex items-center gap-1.5 animate-none"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Déconnexion</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-hidden bg-white relative">
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
        </main>
      </div>
    </div>
  );
}

// ── Root export (wraps with providers) ────────────────────────────────────
export default function AILayout({ children }: { children: React.ReactNode }) {
  return (
    <ReachProvider>
      <TooltipProvider delayDuration={300}>
        <AILayoutContent>{children}</AILayoutContent>
      </TooltipProvider>
    </ReachProvider>
  );
}
