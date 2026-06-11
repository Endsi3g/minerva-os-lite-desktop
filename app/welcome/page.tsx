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
  FolderPlus, 
  ChevronDown, 
  ChevronRight, 
  ChevronUp, 
  Settings as SettingsIcon,
  FileText,
  MoreHorizontal,
  Settings,
  PanelLeftClose,
  UserPlus,
  Loader2,
  Check,
  Menu
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MinervaIcon } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { 
  getOnboardingProgress, 
  getOnboardingState, 
  toggleOnboardingTask, 
  onboardingTasks 
} from '@/lib/onboarding-store';

export default function WelcomePage() {
  const router = useRouter();
  
  // Sidebar states
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Tasks list expand state
  const [chatExpanded, setChatExpanded] = useState(true);
  const [setupExpanded, setSetupExpanded] = useState(false);
  const [todayCollapsed, setTodayCollapsed] = useState(false);

  // Synchronized store hooks
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [onboarding, setOnboarding] = useState({ percent: 12, score: 0 });

  // Invite Users modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer' | 'admin'>('editor');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  useEffect(() => {
    const syncStore = () => {
      setCompletedTasks(getOnboardingState());
      setOnboarding(getOnboardingProgress());
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

  const handleStartChatting = () => {
    router.push('/leads');
  };

  const recentFiles = [
    { name: 'Onboarding rating report', href: '/leads' },
    { name: 'UX case study charts', href: '/leads' },
    { name: 'Design review doc', href: '/leads' },
    { name: 'Product presentation notes', href: '/leads' },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white text-[#26251e] font-sans selection:bg-[#059669]/10">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Layout Reproduced */}
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
            {[
              { name: 'Prospecter', href: '/prospecting', icon: PenSquare },
              { name: 'Search', href: '/leads', icon: Search },
              { name: 'Library', href: '/library', icon: Folder },
              { name: 'Agents', href: '/agents', icon: Sparkles },
              { name: 'Integrations', href: '/integrations', icon: Plug },
            ].map((item) => {
              const navLink = (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-md text-xs font-medium transition-all duration-150",
                    isCollapsed ? "justify-center p-2" : "gap-2.5 px-2.5 py-1.5",
                    "text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e]"
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

          {/* Projects Section */}
          {!isCollapsed && (
            <div className="px-3 space-y-1">
              <div className="px-2.5 text-[10px] font-bold text-[#7a7a76] uppercase tracking-wider">
                Projects
              </div>
              <Link href="/today" className="flex items-center gap-2.5 px-2.5 py-1.5 text-xs text-[#555552] hover:bg-[#e5e5e2]/60 hover:text-[#26251e] rounded-md transition-all">
                <FolderPlus className="h-4 w-4 text-[#7a7a76]" />
                <span>New project</span>
              </Link>
            </div>
          )}

          {/* Today section */}
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
          {/* Onboarding progress card active state */}
          {!isCollapsed ? (
            <button className="w-full text-left p-2.5 bg-white border border-[#e5e5e0] rounded-md transition-all flex flex-col gap-1.5 cursor-default">
              <div className="flex items-center justify-between text-xs font-bold text-[#26251e]">
                <span>Get started</span>
                <ChevronUp className="h-3 w-3 text-[#7a7a76]" />
              </div>
              <div className="text-[10px] text-[#555552]">
                {onboarding.percent}% done • <span className="text-[#10b981]">{onboarding.percent === 100 ? 'Completed!' : "Let's go!"}</span>
              </div>
              <div className="w-full bg-[#e5e5e2] h-1 rounded-full overflow-hidden">
                <div className="bg-[#10b981] h-full rounded-full" style={{ width: `${onboarding.percent}%`, transition: 'width 0.5s ease-in-out' }} />
              </div>
            </button>
          ) : (
            <div className="flex h-8 w-8 mx-auto items-center justify-center rounded-md bg-white border border-[#e5e5e0]" title={`Get started: ${onboarding.percent}% done`}>
              <span className="text-[9px] font-bold text-[#10b981]">{onboarding.percent}%</span>
            </div>
          )}

          {/* Settings row */}
          <div className="flex items-center justify-between">
            {isCollapsed ? (
              <Link 
                href="/settings"
                className="flex h-8 w-8 mx-auto items-center justify-center rounded-md hover:bg-[#e5e5e2] text-[#555552] hover:text-[#26251e]"
              >
                <SettingsIcon className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/settings"
                className="flex items-center gap-2.5 text-xs font-semibold text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 px-2 py-1.5 rounded-md transition-colors flex-1"
              >
                <SettingsIcon className="h-4 w-4 text-[#555552]" />
                <span>Settings</span>
              </Link>
            )}
          </div>
        </div>

      </aside>

      {/* Main Page Content Area */}
      <div className="flex-1 flex flex-col justify-between relative overflow-hidden bg-white">
        
        {/* Floating Collapse Toggle / Menu Button (to the right of the sidebar) */}
        <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-8 w-8 text-[#7a7a76] hover:text-[#26251e] border border-[#e5e5e0] bg-white/80 backdrop-blur-xs shadow-2xs"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </Button>

          <button
            onClick={toggleCollapse}
            className="hidden lg:flex h-8 w-8 items-center justify-center rounded-md border border-[#e5e5e0] bg-white/80 backdrop-blur-xs text-[#7a7a76] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 transition-colors shadow-2xs"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Floating Top-Right Actions (Invite Users & Profile) */}
        <div className="absolute top-4 right-6 flex items-center gap-3 z-30 pointer-events-auto">
          <Button 
            onClick={() => setShowInviteModal(true)}
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs font-semibold text-[#555552] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 flex items-center gap-1.5 rounded-md px-3 border border-[#e5e5e0] bg-white/80 backdrop-blur-xs shadow-2xs"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Invite Users</span>
          </Button>

          <div className="h-7 w-7 rounded-full overflow-hidden border border-[#e5e5e0] bg-[#e5e5e2] flex items-center justify-center shrink-0 shadow-2xs">
            <img 
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=facearea&facepad=2&w=256&h=256&q=80" 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Inner Grid Pattern Decorative background */}
        <div 
          className="absolute inset-0 opacity-[0.25] pointer-events-none" 
          style={{
            backgroundImage: 'linear-gradient(#e5e5e0 1px, transparent 1px), linear-gradient(90deg, #e5e5e0 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        />

        {/* Welcome Area content container */}
        <div className="flex-1 overflow-y-auto py-12 px-6 flex flex-col items-center relative z-10">
          
          {/* Concentric Circle indicator mockup */}
          <div className="flex flex-col items-center space-y-4 mt-6">
            <div className="relative w-40 h-40 flex items-center justify-center">
              {/* Outer dotted concentric circle arc */}
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="#e5e5e0"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  fill="none"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="34"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeDasharray={`${(onboarding.percent / 100) * 213.6} 213.6`}
                  fill="none"
                  style={{ transition: 'stroke-dasharray 0.5s ease-in-out' }}
                />
              </svg>
              
              {/* Middle green circle with "M" for Minerva */}
              <div className="w-16 h-16 rounded-full bg-[#10b981] flex items-center justify-center text-white text-2xl font-bold font-sans">
                M
              </div>
            </div>

            {/* Title & score text */}
            <div className="text-center space-y-1 max-w-sm">
              <div className="text-3xl font-bold text-[#26251e]">{onboarding.score} <span className="text-base text-[#7a7a76] font-normal">/ 595</span></div>
              <h2 className="text-base font-bold text-[#26251e]">Let&apos;s get started!</h2>
              <p className="text-xs text-[#7a7a76] leading-relaxed">
                Complete tasks to earn points and climb the leaderboard.
              </p>
              
              {/* Leaderboard rank status */}
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 bg-white border border-[#e5e5e0] px-3 py-1 rounded-full text-xs font-semibold text-[#26251e] shadow-xs">
                  🏆 You are ranked #1
                </span>
              </div>
            </div>
          </div>

          {/* Setup Task List area */}
          <div className="w-full max-w-xl mt-12 bg-white border border-[#e5e5e0] rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 border-b border-[#e5e5e0] flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold text-[#26251e] text-left">Get started with Minerva OS Lite</h3>
                <p className="text-xs text-[#7a7a76] text-left">Learn about everything Minerva OS Lite can do for you and get up and running.</p>
              </div>
              <button className="h-7 w-7 flex items-center justify-center rounded hover:bg-[#f4f4f3] text-[#7a7a76]">
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>

            {/* Setup workspace Accordion */}
            <div className="border-b border-[#e5e5e0]">
              <button 
                onClick={() => setSetupExpanded(!setupExpanded)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-xs font-bold text-[#26251e] hover:bg-[#f4f4f3]/30 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Settings className="h-4 w-4 text-[#7a7a76]" />
                  <span>Set-up workspace</span>
                  <span className="text-[10px] font-normal text-[#7a7a76]">
                    {completedTasks.filter(id => onboardingTasks.find(t => t.id === id)?.category === 'workspace').length} / {onboardingTasks.filter(t => t.category === 'workspace').length}
                  </span>
                </div>
                <div className="flex items-center gap-3.5">
                  <span className="text-[10px] text-[#7a7a76] font-semibold bg-[#f4f4f3] px-1.5 py-0.5 rounded">
                    {Math.round((completedTasks.filter(id => onboardingTasks.find(t => t.id === id)?.category === 'workspace').length / onboardingTasks.filter(t => t.category === 'workspace').length) * 100) || 0}% done
                  </span>
                  <div className="shrink-0">
                    {completedTasks.filter(id => onboardingTasks.find(t => t.id === id)?.category === 'workspace').length === onboardingTasks.filter(t => t.category === 'workspace').length ? (
                      <span className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-[#e5e5e0]" />
                    )}
                  </div>
                  <ChevronRight className={cn("h-4 w-4 text-[#7a7a76] transition-transform", setupExpanded && "rotate-90")} />
                </div>
              </button>
              
              {setupExpanded && (
                <div className="px-4 pb-4 divide-y divide-[#e5e5e0]/60 border-t border-[#e5e5e0]/60 pt-1 bg-[#f4f4f3]/10">
                  {onboardingTasks.filter(t => t.category === 'workspace').map(task => {
                    const isCompleted = completedTasks.includes(task.id);
                    return (
                      <div 
                        key={task.id}
                        onClick={() => toggleOnboardingTask(task.id)}
                        className="py-2.5 px-6 flex items-center justify-between text-xs text-[#555552] hover:bg-[#f4f4f3]/10 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="shrink-0">
                            {isCompleted ? (
                              <span className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-[#7a7a76]" />
                            )}
                          </div>
                          <span className={cn("font-medium text-left", isCompleted && "line-through text-[#7a7a76]")}>{task.name}</span>
                        </div>
                        <span className="text-[#059669] font-mono text-[9px] font-bold bg-[#059669]/10 px-1.5 py-0.5 rounded">+{task.pts} pts</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Chat Accordion */}
            <div>
              <button 
                onClick={() => setChatExpanded(!chatExpanded)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-xs font-bold text-[#26251e] hover:bg-[#f4f4f3]/30 transition-colors border-b border-[#e5e5e0]/60"
              >
                <div className="flex items-center gap-2.5">
                  <PenSquare className="h-4 w-4 text-[#7a7a76]" />
                  <span>Chat</span>
                  <span className="text-[10px] font-normal text-[#7a7a76]">
                    {completedTasks.filter(id => onboardingTasks.find(t => t.id === id)?.category === 'chat').length} / {onboardingTasks.filter(t => t.category === 'chat').length}
                  </span>
                </div>
                <div className="flex items-center gap-3.5">
                  <span className="text-[10px] text-[#7a7a76] font-semibold bg-[#f4f4f3] px-1.5 py-0.5 rounded">
                    {Math.round((completedTasks.filter(id => onboardingTasks.find(t => t.id === id)?.category === 'chat').length / onboardingTasks.filter(t => t.category === 'chat').length) * 100) || 0}% done
                  </span>
                  <div className="shrink-0">
                    {completedTasks.filter(id => onboardingTasks.find(t => t.id === id)?.category === 'chat').length === onboardingTasks.filter(t => t.category === 'chat').length ? (
                      <span className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-[#e5e5e0]" />
                    )}
                  </div>
                  <ChevronDown className={cn("h-4 w-4 text-[#7a7a76] transition-transform", !chatExpanded && "-rotate-90")} />
                </div>
              </button>

              {chatExpanded && (
                <div className="divide-y divide-[#e5e5e0]/60">
                  {onboardingTasks.filter(t => t.category === 'chat').map((task) => {
                    const isCompleted = completedTasks.includes(task.id);
                    
                    if (task.id === 'send_first_msg' && !isCompleted) {
                      return (
                        <div key={task.id} className="px-4 py-3.5 bg-[#f4f4f3]/20 flex gap-3">
                          <div 
                            onClick={() => toggleOnboardingTask(task.id)}
                            className="shrink-0 mt-0.5 cursor-pointer"
                          >
                            <div className="w-4 h-4 rounded-full border border-[#7a7a76] flex items-center justify-center" />
                          </div>
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between text-xs font-semibold">
                              <span className="text-[#26251e]">{task.name}</span>
                              <span className="text-[#059669] font-mono text-[10px] font-bold bg-[#059669]/10 px-1.5 py-0.5 rounded">+{task.pts} pts</span>
                            </div>
                            <p className="text-[11px] text-[#555552] leading-relaxed max-w-md text-left">
                              Start a conversation with your model to experience how it can assist you with everyday tasks. The more context you provide, the better the model can tailor responses.
                            </p>
                            <div className="flex items-center gap-4 pt-1">
                              <Button 
                                onClick={handleStartChatting}
                                size="sm" 
                                className="h-8 bg-[#059669] hover:bg-[#047857] text-white rounded text-xs font-bold px-3"
                              >
                                Start chatting
                              </Button>
                              <a href="#" className="text-xs text-[#555552] hover:text-[#26251e] flex items-center gap-1 transition-colors">
                                <span>Learn more</span>
                                <ExternalLinkIcon className="h-3 w-3 text-[#7a7a76]" />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    
                    return (
                      <div 
                        key={task.id}
                        onClick={() => toggleOnboardingTask(task.id)}
                        className="px-4 py-2.5 flex items-center justify-between text-xs text-[#555552] hover:bg-[#f4f4f3]/10 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="shrink-0">
                            {isCompleted ? (
                              <span className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-[#7a7a76]" />
                            )}
                          </div>
                          <span className={cn("font-medium text-left", isCompleted && "line-through text-[#7a7a76]")}>{task.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-[#059669] font-mono text-[9px] font-bold bg-[#059669]/10 px-1.5 py-0.5 rounded">+{task.pts} pts</span>
                          <ChevronRight className="h-3.5 w-3.5 text-[#7a7a76]" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

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

    </div>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
