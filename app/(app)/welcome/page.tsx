'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PenSquare,
  Settings,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  Gift,
  Sparkles,
  Check,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  getOnboardingProgress,
  getOnboardingState,
  toggleOnboardingTask,
  onboardingTasks,
} from '@/lib/onboarding-store';

const PROMO_CODE = 'MINERVA10';

export default function WelcomePage() {
  const router = useRouter();

  const [completedTasks, setCompletedTasks] = useState<string[]>([]);
  const [onboarding, setOnboarding] = useState({ percent: 12, score: 0 });
  const [setupExpanded, setSetupExpanded] = useState(false);
  const [chatExpanded, setChatExpanded] = useState(true);
  const [showSetupPanel, setShowSetupPanel] = useState(true);
  const [codeCopied, setCodeCopied] = useState(false);

  const progressCallback = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (node !== null) {
        node.style.width = `${onboarding.percent}%`;
        node.style.transition = 'width 0.5s ease-in-out';
      }
    },
    [onboarding.percent]
  );

  useEffect(() => {
    const syncStore = () => {
      setCompletedTasks(getOnboardingState());
      setOnboarding(getOnboardingProgress());
    };
    syncStore();
    window.addEventListener('minerva_store_update', syncStore);
    return () => window.removeEventListener('minerva_store_update', syncStore);
  }, []);

  const allDone = onboarding.percent === 100;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(PROMO_CODE).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  };

  return (
    <div className="flex-1 overflow-y-auto py-8 px-4 md:px-8 flex flex-col items-center relative z-10 bg-background">

      {/* Progress circle */}
      <div className="flex flex-col items-center space-y-4 mt-4">
        <div className="relative w-40 h-40 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" stroke="#e5e5e0" strokeWidth="2" strokeDasharray="4 4" fill="none" />
            <circle
              cx="50" cy="50" r="34"
              stroke="#10b981" strokeWidth="2.5"
              strokeDasharray={`${(onboarding.percent / 100) * 213.6} 213.6`}
              fill="none"
              className="transition-all duration-500"
            />
          </svg>
          <div className="w-16 h-16 rounded-full bg-[#10b981] flex items-center justify-center text-white text-2xl font-bold">
            {allDone ? <Check className="w-8 h-8" /> : 'M'}
          </div>
        </div>

        <div className="text-center space-y-1 max-w-sm">
          <div className="text-3xl font-bold text-foreground">
            {onboarding.score} <span className="text-base text-muted-foreground font-normal">/ 595</span>
          </div>
          <h2 className="text-base font-bold text-foreground">
            {allDone ? 'Félicitations, tout est complété !' : "Commençons !"}
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {allDone
              ? 'Vous avez débloqué votre réduction de bienvenue.'
              : 'Complétez toutes les tâches pour débloquer votre récompense.'}
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center gap-1.5 bg-card border border-border px-3 py-1 rounded-full text-xs font-semibold text-foreground shadow-sm">
              🏆 Classement #1
            </span>
          </div>
        </div>
      </div>

      {/* 10% incentive banner */}
      <div className={cn(
        "w-full max-w-xl mt-8 rounded-xl border p-4 flex items-start gap-4 transition-all duration-300",
        allDone
          ? "bg-[#10b981]/10 border-[#10b981]/30"
          : "bg-card border-border"
      )}>
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
          allDone ? "bg-[#10b981] text-white" : "bg-amber-50 dark:bg-amber-950/30 text-amber-500"
        )}>
          {allDone ? <Sparkles className="w-5 h-5" /> : <Gift className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          {allDone ? (
            <>
              <p className="text-sm font-bold text-foreground">Votre réduction est débloquée !</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-3">
                Profitez de <span className="font-bold text-[#10b981]">10 % de réduction</span> sur votre premier mois d'abonnement Minerva OS Lite. Utilisez le code ci-dessous lors du paiement.
              </p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-background border border-[#10b981]/40 rounded-lg px-3 py-1.5">
                  <span className="text-sm font-mono font-bold text-[#10b981] tracking-widest">{PROMO_CODE}</span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyCode}
                  className="h-8 text-xs gap-1.5 border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/10"
                >
                  {codeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {codeCopied ? 'Copié !' : 'Copier'}
                </Button>
                <Link href="/billing" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abonnement</span>
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-foreground">
                Complétez toutes les tâches → <span className="text-[#10b981]">10 % off</span> le premier mois
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Un code promo exclusif vous sera remis dès que vous aurez coché toutes les étapes ci-dessous.
              </p>
              <div className="mt-2 w-full bg-muted h-1.5 rounded-full overflow-hidden">
                <div
                  ref={progressCallback}
                  className="bg-[#10b981] h-full rounded-full"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{onboarding.percent}% complété</p>
            </>
          )}
        </div>
      </div>

      {/* Task list panel */}
      {showSetupPanel && (
        <div className="w-full max-w-xl mt-6 bg-card border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-border flex justify-between items-start">
            <div>
              <h3 className="text-sm font-bold text-foreground text-left">Démarrer avec Minerva OS Lite</h3>
              <p className="text-xs text-muted-foreground text-left">Apprenez tout ce que Minerva OS Lite peut faire pour vous.</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-7 w-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 text-xs">
                <DropdownMenuItem onClick={() => setShowSetupPanel(false)} className="cursor-pointer">
                  Masquer ce panneau
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Workspace accordion */}
          <div className="border-b border-border">
            <button
              onClick={() => setSetupExpanded(!setupExpanded)}
              className="w-full px-4 py-3.5 flex items-center justify-between text-xs font-bold text-foreground hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="h-4 w-4 text-muted-foreground" />
                <span>Configurer l'espace de travail</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  {completedTasks.filter(id => onboardingTasks.find(t => t.id === id)?.category === 'workspace').length} / {onboardingTasks.filter(t => t.category === 'workspace').length}
                </span>
              </div>
              <div className="flex items-center gap-3.5">
                <span className="text-[10px] text-muted-foreground font-semibold bg-muted px-1.5 py-0.5 rounded">
                  {Math.round((completedTasks.filter(id => onboardingTasks.find(t => t.id === id)?.category === 'workspace').length / onboardingTasks.filter(t => t.category === 'workspace').length) * 100) || 0}% fait
                </span>
                <div className="shrink-0">
                  {completedTasks.filter(id => onboardingTasks.find(t => t.id === id)?.category === 'workspace').length === onboardingTasks.filter(t => t.category === 'workspace').length ? (
                    <span className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-border" />
                  )}
                </div>
                <ChevronRight className={cn("h-4 w-4 text-muted-foreground transition-transform", setupExpanded && "rotate-90")} />
              </div>
            </button>

            {setupExpanded && (
              <div className="px-4 pb-4 divide-y divide-border/60 border-t border-border/60 pt-1 bg-muted/10">
                {onboardingTasks.filter(t => t.category === 'workspace').map(task => {
                  const isCompleted = completedTasks.includes(task.id);
                  return (
                    <div
                      key={task.id}
                      onClick={() => toggleOnboardingTask(task.id)}
                      className="py-2.5 px-6 flex items-center justify-between text-xs text-muted-foreground hover:bg-muted/20 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          {isCompleted ? (
                            <span className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-muted-foreground/50" />
                          )}
                        </div>
                        <span className={cn("font-medium text-left text-foreground", isCompleted && "line-through text-muted-foreground")}>{task.name}</span>
                      </div>
                      <span className="text-[#059669] font-mono text-[9px] font-bold bg-[#059669]/10 px-1.5 py-0.5 rounded">+{task.pts} pts</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Chat accordion */}
          <div>
            <button
              onClick={() => setChatExpanded(!chatExpanded)}
              className="w-full px-4 py-3.5 flex items-center justify-between text-xs font-bold text-foreground hover:bg-muted/30 transition-colors border-b border-border/60"
            >
              <div className="flex items-center gap-2.5">
                <PenSquare className="h-4 w-4 text-muted-foreground" />
                <span>Chat & Prospection</span>
                <span className="text-[10px] font-normal text-muted-foreground">
                  {completedTasks.filter(id => onboardingTasks.find(t => t.id === id)?.category === 'chat').length} / {onboardingTasks.filter(t => t.category === 'chat').length}
                </span>
              </div>
              <div className="flex items-center gap-3.5">
                <span className="text-[10px] text-muted-foreground font-semibold bg-muted px-1.5 py-0.5 rounded">
                  {Math.round((completedTasks.filter(id => onboardingTasks.find(t => t.id === id)?.category === 'chat').length / onboardingTasks.filter(t => t.category === 'chat').length) * 100) || 0}% fait
                </span>
                <div className="shrink-0">
                  {completedTasks.filter(id => onboardingTasks.find(t => t.id === id)?.category === 'chat').length === onboardingTasks.filter(t => t.category === 'chat').length ? (
                    <span className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-border" />
                  )}
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", !chatExpanded && "-rotate-90")} />
              </div>
            </button>

            {chatExpanded && (
              <div className="divide-y divide-border/60">
                {onboardingTasks.filter(t => t.category === 'chat').map((task) => {
                  const isCompleted = completedTasks.includes(task.id);

                  if (task.id === 'send_first_msg' && !isCompleted) {
                    return (
                      <div key={task.id} className="px-4 py-3.5 bg-muted/20 flex gap-3">
                        <div onClick={() => toggleOnboardingTask(task.id)} className="shrink-0 mt-0.5 cursor-pointer">
                          <div className="w-4 h-4 rounded-full border border-muted-foreground/50" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="text-foreground">{task.name}</span>
                            <span className="text-[#059669] font-mono text-[10px] font-bold bg-[#059669]/10 px-1.5 py-0.5 rounded">+{task.pts} pts</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed max-w-md text-left">
                            Démarrez une conversation avec Minerva pour découvrir comment l'IA peut vous aider au quotidien dans votre prospection.
                          </p>
                          <div className="flex items-center gap-4 pt-1">
                            <Button
                              onClick={() => router.push('/leads')}
                              size="sm"
                              className="h-8 bg-[#059669] hover:bg-[#047857] text-white rounded text-xs font-bold px-3"
                            >
                              Commencer
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={task.id}
                      onClick={() => toggleOnboardingTask(task.id)}
                      className="px-4 py-2.5 flex items-center justify-between text-xs text-muted-foreground hover:bg-muted/20 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="shrink-0">
                          {isCompleted ? (
                            <span className="w-4 h-4 rounded-full bg-[#10b981] text-white flex items-center justify-center text-[10px] font-bold">✓</span>
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-muted-foreground/50" />
                          )}
                        </div>
                        <span className={cn("font-medium text-left text-foreground", isCompleted && "line-through text-muted-foreground")}>{task.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[#059669] font-mono text-[9px] font-bold bg-[#059669]/10 px-1.5 py-0.5 rounded">+{task.pts} pts</span>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="h-12" />
    </div>
  );
}
