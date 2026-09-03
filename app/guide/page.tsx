'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  BookOpen, 
  Search, 
  Printer, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Target, 
  AlertTriangle, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight,
  Filter,
  Check,
  Zap,
  Bookmark,
  TrendingUp
} from 'lucide-react';
import { SOPS_DATA, SOP_ROLES, type SOPItem } from '@/lib/sop-data';
import { SOPVisualFrame } from '@/components/guide/sop-visual-frame';
import { cn } from '@/lib/utils';

export default function GuidePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [completedSOPs, setCompletedSOPs] = useState<string[]>([]);
  const [activeSOPId, setActiveSOPId] = useState<string>(SOPS_DATA[0].id);

  // Load checklist from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('minerva_sop_completed');
      if (stored) {
        setCompletedSOPs(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const toggleSOPCompleted = (id: string) => {
    setCompletedSOPs((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('minerva_sop_completed', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const filteredSOPs = useMemo(() => {
    return SOPS_DATA.filter((sop) => {
      const matchRole = selectedRole === 'all' || sop.role === selectedRole || sop.role === 'all';
      if (!matchRole) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const inTitle = sop.title.toLowerCase().includes(q);
      const inTagline = sop.tagline.toLowerCase().includes(q);
      const inObjective = sop.objective.toLowerCase().includes(q);
      const inSteps = sop.steps.some(
        (s) => s.title.toLowerCase().includes(q) || s.action.toLowerCase().includes(q)
      );
      return inTitle || inTagline || inObjective || inSteps;
    });
  }, [searchQuery, selectedRole]);

  const progressPercent = Math.round((completedSOPs.length / SOPS_DATA.length) * 100);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="min-h-screen bg-[#F0EDE0] text-[#1a1f1c] font-sans selection:bg-[#1E4B33]/20 selection:text-[#1E4B33]">
      {/* Top Public Header */}
      <header className="sticky top-0 z-40 bg-[#F0EDE0]/95 backdrop-blur border-b border-[#DDD9CA] px-4 py-3 print:hidden">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#1E4B33] text-white flex items-center justify-center font-bold text-sm shadow-xs">
              M
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-[#1a1f1c] tracking-tight font-serif">Minerva OS Reach Lite</span>
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-[#1E4B33]/10 text-[#1E4B33] rounded border border-[#1E4B33]/20 uppercase">
                  SOP Officiel
                </span>
              </div>
              <p className="text-[11px] text-[#6b6b5e]">Manuel d'Opérations Standard & Guide Complet d'Utilisation</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DDD9CA] bg-white hover:bg-[#FAFAF5] text-xs font-semibold text-[#1a1f1c] transition-colors shadow-2xs cursor-pointer"
              title="Imprimer ou enregistrer en PDF"
            >
              <Printer className="w-3.5 h-3.5 text-[#6b6b5e]" />
              <span className="hidden sm:inline">Imprimer / PDF</span>
            </button>

            <Link
              href="/today"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#1E4B33] hover:bg-[#1E4B33]/90 text-white text-xs font-bold transition-all shadow-xs"
            >
              <span>Accéder à l'App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 py-6 sm:py-8">
        {/* Hero Section */}
        <div className="mb-8 p-6 sm:p-8 rounded-2xl bg-white border border-[#DDD9CA] shadow-2xs space-y-4">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#10B981]/10 text-[#065F46] text-xs font-bold border border-[#10B981]/20">
            <Sparkles className="w-3.5 h-3.5" />
            Guide Opérationnel • Édition 2026
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#1a1f1c] tracking-tight">
            Manuel Opérationnel & Procédures Standardisées (SOPs)
          </h1>
          <p className="text-xs sm:text-sm text-[#6b6b5e] max-w-3xl leading-relaxed">
            Ce guide complet détaille les protocoles d'exécution pas à pas pour chaque étape de votre cycle commercial dans Minerva OS Reach Lite : du scraping cartographique à la qualification 360°, la génération d'accroches avec l'IA, la collaboration avec le copilote Minerva et le reporting réel de direction.
          </p>

          {/* Quick Stats Banner */}
          <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#F0EDE0] border border-[#DDD9CA]">
              <span className="text-[10px] font-bold text-[#6b6b5e] uppercase block">Procédures</span>
              <span className="text-lg font-bold text-[#1a1f1c]">8 SOPs Validés</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F0EDE0] border border-[#DDD9CA]">
              <span className="text-[10px] font-bold text-[#6b6b5e] uppercase block">Délivrabilité</span>
              <span className="text-lg font-bold text-[#10B981]">&gt; 95% Cible</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F0EDE0] border border-[#DDD9CA]">
              <span className="text-[10px] font-bold text-[#6b6b5e] uppercase block">Routine du matin</span>
              <span className="text-lg font-bold text-[#1a1f1c]">15 minutes</span>
            </div>
            <div className="p-3 rounded-xl bg-[#F0EDE0] border border-[#DDD9CA]">
              <span className="text-[10px] font-bold text-[#6b6b5e] uppercase block">Progression</span>
              <span className="text-lg font-bold text-[#1E4B33]">{progressPercent}% Assimilé</span>
            </div>
          </div>
        </div>

        {/* Filters & Search Controls */}
        <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 print:hidden">
          {/* Role filter buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {SOP_ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRole(r.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer border",
                  selectedRole === r.id
                    ? "bg-[#1E4B33] text-white border-[#1E4B33] shadow-xs"
                    : "bg-white text-[#6b6b5e] border-[#DDD9CA] hover:text-[#1a1f1c] hover:bg-[#FAFAF5]"
                )}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative min-w-[240px] sm:min-w-[280px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#6b6b5e]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une action, jalon, mot-clé..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[#DDD9CA] bg-white text-xs text-[#1a1f1c] placeholder:text-[#6b6b5e] focus:outline-none focus:ring-1 focus:ring-[#1E4B33]"
            />
          </div>
        </div>

        {/* Layout: Sticky Navigation on Left + SOP Cards on Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Sticky Table of Contents (Hidden on Print & Mobile) */}
          <aside className="hidden lg:block lg:col-span-4 sticky top-20 space-y-4 print:hidden">
            <div className="p-4 bg-white border border-[#DDD9CA] rounded-xl space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-[#DDD9CA] pb-2">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-[#1E4B33]" />
                  <span className="text-xs font-bold text-[#1a1f1c] uppercase tracking-wider">Sommaire des SOPs</span>
                </div>
                <span className="text-[10px] font-bold text-[#6b6b5e]">
                  {completedSOPs.length}/{SOPS_DATA.length}
                </span>
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full bg-[#EAE7D9] h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#10B981] h-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-[#6b6b5e] text-right">{progressPercent}% complété</p>
              </div>

              <nav className="space-y-1 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
                {SOPS_DATA.map((sop) => {
                  const isDone = completedSOPs.includes(sop.id);
                  const isCurrent = activeSOPId === sop.id;
                  return (
                    <a
                      key={sop.id}
                      href={`#${sop.id}`}
                      onClick={() => setActiveSOPId(sop.id)}
                      className={cn(
                        "flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all group",
                        isCurrent
                          ? "bg-[#1E4B33]/10 text-[#1E4B33] font-bold border border-[#1E4B33]/20"
                          : "text-[#6b6b5e] hover:bg-[#F0EDE0] hover:text-[#1a1f1c]"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-[10px] font-bold opacity-75">{sop.number}</span>
                        <span className="truncate">{sop.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleSOPCompleted(sop.id);
                        }}
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                          isDone
                            ? "bg-[#10B981] border-[#10B981] text-white"
                            : "border-[#DDD9CA] bg-white group-hover:border-[#6b6b5e]"
                        )}
                        title={isDone ? "Marquer comme non assimilé" : "Marquer comme assimilé"}
                      >
                        {isDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </button>
                    </a>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main SOP Content Stream */}
          <main className="lg:col-span-8 space-y-10">
            {filteredSOPs.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-[#DDD9CA] space-y-2">
                <AlertTriangle className="w-8 h-8 text-[#E8A33D] mx-auto" />
                <h3 className="font-bold text-sm text-[#1a1f1c]">Aucune procédure trouvée</h3>
                <p className="text-xs text-[#6b6b5e]">Aucun SOP ne correspond aux termes "{searchQuery}".</p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedRole('all'); }}
                  className="mt-3 px-3 py-1.5 bg-[#1E4B33] text-white rounded-lg text-xs font-bold"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            ) : (
              filteredSOPs.map((sop) => {
                const isDone = completedSOPs.includes(sop.id);
                return (
                  <article
                    key={sop.id}
                    id={sop.id}
                    className="p-6 sm:p-8 bg-white border border-[#DDD9CA] rounded-2xl space-y-6 shadow-2xs scroll-mt-24 print:border-none print:shadow-none print:p-0 print:mb-8"
                  >
                    {/* SOP Header */}
                    <div className="flex items-start justify-between gap-4 flex-wrap border-b border-[#DDD9CA] pb-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold bg-[#1E4B33] text-white px-2 py-0.5 rounded">
                            {sop.number}
                          </span>
                          <span className="text-[11px] font-bold text-[#6b6b5e] uppercase tracking-wider">
                            {sop.frequency}
                          </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1a1f1c]">
                          {sop.title}
                        </h2>
                        <p className="text-xs sm:text-sm text-[#6b6b5e] font-medium">
                          {sop.tagline}
                        </p>
                      </div>

                      {/* Checklist Check Button */}
                      <button
                        onClick={() => toggleSOPCompleted(sop.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border print:hidden",
                          isDone
                            ? "bg-[#10B981]/15 text-[#065F46] border-[#10B981]/30"
                            : "bg-[#F0EDE0] text-[#6b6b5e] border-[#DDD9CA] hover:text-[#1a1f1c]"
                        )}
                      >
                        <CheckCircle2 className={cn("w-4 h-4", isDone ? "text-[#10B981]" : "text-[#6b6b5e]")} />
                        <span>{isDone ? 'SOP Assimilé' : 'Marquer comme lu'}</span>
                      </button>
                    </div>

                    {/* Metadata & Objective Box */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-[#F0EDE0]/70 border border-[#DDD9CA] text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-[#1a1f1c]">
                          <Target className="w-3.5 h-3.5 text-[#1E4B33]" />
                          <span>Objectif de la procédure</span>
                        </div>
                        <p className="text-[#6b6b5e] text-[11px] leading-relaxed">
                          {sop.objective}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-[#065F46]">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
                          <span>Definition of Done (Succès)</span>
                        </div>
                        <p className="text-[#6b6b5e] text-[11px] leading-relaxed">
                          {sop.definitionOfDone}
                        </p>
                      </div>
                    </div>

                    {/* Visual UI Frame (Screenshot Mockup) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6b6b5e]">
                          Capture de l'interface & Zones d'action
                        </span>
                        <span className="text-[10px] text-[#1E4B33] font-semibold">
                          Thème Minerva Studio Clair
                        </span>
                      </div>
                      <SOPVisualFrame screenId={sop.visualScreenId} />
                    </div>

                    {/* Step-by-Step Action Protocol */}
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#1a1f1c]">
                        Protocole d'Exécution Pas à Pas
                      </h3>
                      <div className="space-y-2.5">
                        {sop.steps.map((step) => (
                          <div
                            key={step.number}
                            className="p-3.5 rounded-xl border border-[#DDD9CA] bg-[#FAFAF5] hover:border-[#1E4B33]/40 transition-colors space-y-1.5"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-[#1E4B33] text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {step.number}
                                </span>
                                <h4 className="text-xs font-bold text-[#1a1f1c]">
                                  {step.title}
                                </h4>
                              </div>
                              {step.keyboardShortcut && (
                                <kbd className="px-2 py-0.5 rounded bg-[#EAE7D9] border border-[#DDD9CA] text-[9px] font-mono font-bold text-[#1a1f1c]">
                                  {step.keyboardShortcut}
                                </kbd>
                              )}
                            </div>
                            <p className="text-xs text-[#6b6b5e] leading-relaxed pl-7">
                              {step.action}
                            </p>
                            <div className="pl-7 flex items-center justify-between text-[10px] text-[#6b6b5e] pt-1">
                              <span>Localisation : <strong className="text-[#1a1f1c]">{step.uiTarget}</strong></span>
                              {step.tip && (
                                <span className="text-[#065F46] font-semibold">💡 {step.tip}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pitfalls & Target KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      {/* Pitfalls */}
                      <div className="p-3.5 rounded-xl border border-[#cf2d56]/20 bg-[#cf2d56]/5 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-[#cf2d56]">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>Ce qu'il ne faut PAS faire</span>
                        </div>
                        <ul className="space-y-1 text-[11px] text-[#6b6b5e]">
                          {sop.pitfalls.map((p, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-[#cf2d56] font-bold">✕</span>
                              <span>{p}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* KPIs */}
                      <div className="p-3.5 rounded-xl border border-[#10B981]/20 bg-[#10B981]/5 text-xs space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-[#065F46]">
                          <TrendingUp className="w-3.5 h-3.5" />
                          <span>Indicateurs de Performance (KPIs)</span>
                        </div>
                        <ul className="space-y-1 text-[11px] text-[#6b6b5e]">
                          {sop.kpis.map((kpi, idx) => (
                            <li key={idx} className="flex items-start gap-1.5">
                              <span className="text-[#10B981] font-bold">✓</span>
                              <span>{kpi}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </main>
        </div>

        {/* Bottom CTA Banner */}
        <div className="mt-12 p-6 sm:p-8 rounded-2xl bg-[#1E4B33] text-white flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-lg sm:text-xl font-serif font-bold">
              Prêt à mettre ces procédures en pratique ?
            </h3>
            <p className="text-xs sm:text-sm text-[#F0EDE0]/80">
              Ouvrez le Cockpit Today et débutez votre routine commerciale avec Minerva Copilote IA.
            </p>
          </div>
          <Link
            href="/today"
            className="px-5 py-2.5 rounded-xl bg-white text-[#1E4B33] hover:bg-[#FAFAF5] font-bold text-xs transition-all shadow-md shrink-0"
          >
            Lancer Minerva OS
          </Link>
        </div>
      </div>
    </div>
  );
}
