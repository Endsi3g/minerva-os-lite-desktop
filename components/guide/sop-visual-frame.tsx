'use client';

import React from 'react';
import { 
  Zap, 
  Check, 
  Clock, 
  Flame, 
  Search, 
  MapPin, 
  Sparkles, 
  Send, 
  Bot, 
  Users, 
  Share2, 
  FileDown, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SOPVisualFrameProps {
  screenId: 'today' | 'prospecting' | 'lead-360' | 'composer' | 'tasks' | 'ads' | 'weekly-report';
  activeStep?: number;
}

export function SOPVisualFrame({ screenId, activeStep }: SOPVisualFrameProps) {
  const getScreenUrl = () => {
    switch (screenId) {
      case 'today': return 'https://minerva-os.app/today';
      case 'prospecting': return 'https://minerva-os.app/prospecting';
      case 'lead-360': return 'https://minerva-os.app/leads/lead-84920';
      case 'composer': return 'https://minerva-os.app/composer';
      case 'tasks': return 'https://minerva-os.app/tasks';
      case 'ads': return 'https://minerva-os.app/ads';
      case 'weekly-report': return 'https://minerva-os.app/weekly-report';
    }
  };

  return (
    <div className="rounded-xl border border-[#DDD9CA] bg-[#F0EDE0] shadow-sm overflow-hidden text-left font-sans">
      {/* Browser / App Header Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#EAE7D9] border-b border-[#DDD9CA] text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#cf2d56]/70 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#E8A33D]/70 inline-block" />
          <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]/70 inline-block" />
          <span className="ml-2 text-[10px] font-bold text-[#6b6b5e] uppercase tracking-wider hidden sm:inline">
            Minerva OS • Workspace Démo
          </span>
        </div>
        <div className="bg-white/80 border border-[#DDD9CA] rounded-md px-3 py-0.5 text-[10px] text-[#6b6b5e] font-mono truncate max-w-[220px] sm:max-w-[320px]">
          {getScreenUrl()}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#1E4B33]/10 text-[#1E4B33] border border-[#1E4B33]/20">
            En direct
          </span>
        </div>
      </div>

      {/* Screen Mockup Container */}
      <div className="p-3 sm:p-4 bg-[#FAFAF5]">
        {screenId === 'today' && <TodayScreenMockup />}
        {screenId === 'prospecting' && <ProspectingScreenMockup />}
        {screenId === 'lead-360' && <Lead360ScreenMockup />}
        {screenId === 'composer' && <ComposerScreenMockup />}
        {screenId === 'tasks' && <TasksScreenMockup />}
        {screenId === 'ads' && <AdsScreenMockup />}
        {screenId === 'weekly-report' && <WeeklyReportScreenMockup />}
      </div>
    </div>
  );
}

// 1. Cockpit Today Screen
function TodayScreenMockup() {
  return (
    <div className="space-y-3">
      {/* Top action header */}
      <div className="flex items-center justify-between border-b border-[#DDD9CA] pb-2.5">
        <div>
          <h4 className="text-sm font-bold text-[#1a1f1c]">Cockpit du jour</h4>
          <p className="text-[10px] text-[#6b6b5e]">Vue d'ensemble et priorités du matin</p>
        </div>
        <div className="relative">
          <button className="flex items-center gap-1 px-2.5 py-1 bg-[#10B981] text-white rounded-lg text-xs font-bold shadow-xs">
            <Zap className="w-3 h-3 fill-white" />
            <span>Actions Rapides</span>
          </button>
          <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#1E4B33] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
            1
          </span>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* Agenda Card */}
        <div className="p-2.5 rounded-lg border border-[#DDD9CA] bg-white space-y-2 relative">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#1a1f1c]">Agenda du jour</span>
            <span className="text-[9px] font-semibold bg-[#10B981]/10 text-[#065F46] px-1.5 py-0.5 rounded">3 dues</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between p-1.5 rounded bg-[#F0EDE0]/50 border border-[#DDD9CA]">
              <span className="text-[11px] font-medium text-[#1a1f1c] truncate">Relancer Boulangerie St-Honoré</span>
              <div className="flex items-center gap-1">
                <span className="p-1 rounded bg-[#10B981]/15 text-[#065F46] cursor-pointer" title="Marquer fait">
                  <Check className="w-3 h-3" />
                </span>
                <span className="p-1 rounded bg-[#E8A33D]/15 text-[#92400e] cursor-pointer" title="Reporter 3j">
                  <Clock className="w-3 h-3" />
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-[#F0EDE0]/50 border border-[#DDD9CA]">
              <span className="text-[11px] font-medium text-[#1a1f1c] truncate">Appel découverte Plomberie Express</span>
              <div className="flex items-center gap-1">
                <span className="p-1 rounded bg-[#10B981]/15 text-[#065F46] cursor-pointer">
                  <Check className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
          <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#1E4B33] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
            2
          </span>
        </div>

        {/* Hot Prospects */}
        <div className="p-2.5 rounded-lg border border-[#DDD9CA] bg-white space-y-2 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[#1a1f1c]">
              <Flame className="w-3.5 h-3.5 text-[#cf2d56]" />
              <span className="text-xs font-bold">Prospects Chauds</span>
            </div>
            <span className="text-[9px] font-bold text-[#cf2d56]">Top conversion</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between p-1.5 rounded bg-[#F0EDE0]/50 border border-[#DDD9CA]">
              <span className="text-[11px] font-bold text-[#1a1f1c] truncate">Clinique Dentaire Laurier</span>
              <span className="text-[10px] font-bold text-[#065F46] bg-[#10B981]/15 px-1.5 py-0.2 rounded">88 pts</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-[#F0EDE0]/50 border border-[#DDD9CA]">
              <span className="text-[11px] font-bold text-[#1a1f1c] truncate">Toiture & Façade 2000</span>
              <span className="text-[10px] font-bold text-[#065F46] bg-[#10B981]/15 px-1.5 py-0.2 rounded">81 pts</span>
            </div>
          </div>
          <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#1E4B33] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
            3
          </span>
        </div>
      </div>

      {/* Agent Feed Banner */}
      <div className="p-2 rounded-lg bg-[#EAE7D9]/60 border border-[#DDD9CA] flex items-center justify-between relative">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-[#1E4B33]" />
          <span className="text-[11px] font-medium text-[#1a1f1c]">
            <strong>Minerva IA :</strong> 2 brouillons de relance prêts pour validation.
          </span>
        </div>
        <button className="px-2 py-0.5 rounded bg-[#1E4B33] text-white text-[10px] font-bold">
          Approuver
        </button>
        <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#1E4B33] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
          4
        </span>
      </div>
    </div>
  );
}

// 2. Prospection Screen Mockup
function ProspectingScreenMockup() {
  return (
    <div className="space-y-3">
      {/* Search Header */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-white border border-[#DDD9CA] relative">
        <div className="flex items-center gap-1 flex-1 min-w-[140px] px-2 py-1 rounded bg-[#F0EDE0] text-xs">
          <Search className="w-3.5 h-3.5 text-[#6b6b5e]" />
          <span className="font-semibold text-[#1a1f1c]">Boulangerie & Pâtisserie</span>
        </div>
        <div className="flex items-center gap-1 flex-1 min-w-[120px] px-2 py-1 rounded bg-[#F0EDE0] text-xs">
          <MapPin className="w-3.5 h-3.5 text-[#6b6b5e]" />
          <span className="font-semibold text-[#1a1f1c]">Montréal - Plateau</span>
        </div>
        <button className="px-3 py-1 bg-[#1E4B33] text-white rounded text-xs font-bold">
          Lancer l'extraction
        </button>
        <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#1E4B33] text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white">
          1
        </span>
      </div>

      {/* Leads Table */}
      <div className="border border-[#DDD9CA] rounded-lg overflow-hidden bg-white text-xs">
        <div className="grid grid-cols-4 bg-[#EAE7D9] px-3 py-1.5 font-bold text-[10px] text-[#6b6b5e] uppercase">
          <span>Commerce</span>
          <span>Ville</span>
          <span>Google Note</span>
          <span className="text-right">Action</span>
        </div>
        <div className="divide-y divide-[#DDD9CA]/60">
          <div className="grid grid-cols-4 px-3 py-2 items-center hover:bg-[#F0EDE0]/40">
            <span className="font-bold text-[#1a1f1c]">Boulangerie Le Pain Doré</span>
            <span className="text-[#6b6b5e]">Montréal</span>
            <span className="text-[#065F46] font-semibold">4.8 ★ (142 avis)</span>
            <div className="text-right">
              <span className="px-2 py-0.5 bg-[#10B981]/15 text-[#065F46] rounded text-[10px] font-bold">Importer</span>
            </div>
          </div>
          <div className="grid grid-cols-4 px-3 py-2 items-center hover:bg-[#F0EDE0]/40">
            <span className="font-bold text-[#1a1f1c]">Pâtisserie Dulce</span>
            <span className="text-[#6b6b5e]">Montréal</span>
            <span className="text-[#cf2d56] font-semibold">3.4 ★ (28 avis)</span>
            <div className="text-right">
              <span className="px-2 py-0.5 bg-[#10B981]/15 text-[#065F46] rounded text-[10px] font-bold">Importer</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. Fiche Lead 360 Screen Mockup
function Lead360ScreenMockup() {
  return (
    <div className="p-3 bg-white border border-[#DDD9CA] rounded-lg space-y-3">
      {/* Header Lead */}
      <div className="flex items-start justify-between border-b border-[#DDD9CA] pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-[#1a1f1c]">Boulangerie Saint-Honoré</h4>
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#cf2d56]/10 text-[#cf2d56] border border-[#cf2d56]/30">
              Chaud (Hot)
            </span>
          </div>
          <p className="text-[10px] text-[#6b6b5e]">Jean-Paul Dupont • (514) 998-1200 • Plateau-Mont-Royal</p>
        </div>
        <span className="text-xs font-bold text-[#1E4B33] bg-[#1E4B33]/10 px-2 py-0.5 rounded">
          Score 88 pts
        </span>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between text-[10px] bg-[#F0EDE0] p-2 rounded-lg font-bold">
        <span className="text-[#065F46]">✓ 1. Nouveau</span>
        <span className="text-[#1E4B33] underline">● 2. Contacté</span>
        <span className="text-[#6b6b5e]">○ 3. RDV Fixé</span>
        <span className="text-[#6b6b5e]">○ 4. Gagné</span>
      </div>

      {/* Audit Snippet */}
      <div className="p-2.5 rounded bg-[#FAFAF5] border border-[#DDD9CA] text-xs space-y-1">
        <span className="font-bold text-[#1a1f1c] text-[11px]">Audit de réputation IA :</span>
        <p className="text-[10px] text-[#6b6b5e] leading-normal">
          Le commerce possède 4 avis négatifs non répondus ce mois-ci sur Google Maps. Excellente opportunité d'accroche pour proposer la solution d'automatisation des avis.
        </p>
      </div>
    </div>
  );
}

// 4. Composer Studio Screen Mockup
function ComposerScreenMockup() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-white border border-[#DDD9CA] rounded-lg p-2.5">
      {/* Sidebar Variables */}
      <div className="p-2 bg-[#F0EDE0] rounded border border-[#DDD9CA] space-y-2">
        <span className="text-[10px] font-bold text-[#6b6b5e] uppercase">Variables Dynamiques</span>
        <div className="flex flex-wrap gap-1">
          {['{{prenom}}', '{{entreprise}}', '{{ville}}', '{{note_moyenne}}'].map((v) => (
            <span key={v} className="px-1.5 py-0.5 bg-white border border-[#DDD9CA] rounded text-[9px] font-mono text-[#1E4B33] font-bold">
              {v}
            </span>
          ))}
        </div>
        <div className="pt-2 border-t border-[#DDD9CA]/80">
          <span className="text-[10px] font-bold text-[#065F46] block">Délivrabilité : 98%</span>
          <span className="text-[9px] text-[#6b6b5e]">Zéro mot spam détecté.</span>
        </div>
      </div>

      {/* Email Editor Pane */}
      <div className="sm:col-span-2 space-y-2">
        <div className="p-1.5 border border-[#DDD9CA] rounded text-xs font-medium text-[#1a1f1c]">
          <span className="text-[#6b6b5e] text-[10px]">Objet : </span>
          Question rapide concernant les avis Google de <span className="font-mono text-[#1E4B33] font-bold">{'{{entreprise}}'}</span>
        </div>
        <div className="p-2 border border-[#DDD9CA] rounded text-[11px] text-[#1a1f1c] leading-relaxed bg-[#FAFAF5] min-h-[90px]">
          Bonjour <span className="font-mono text-[#1E4B33] font-bold">{'{{prenom}}'}</span>,<br />
          J'ai remarqué que votre commerce à <span className="font-mono text-[#1E4B33] font-bold">{'{{ville}}'}</span> compte de très bons retours clients. Cependant, certains avis récents restent sans réponse...
        </div>
        <div className="flex justify-end gap-2">
          <button className="flex items-center gap-1 px-3 py-1 bg-[#10B981] text-white rounded text-xs font-bold">
            <Send className="w-3 h-3" />
            Envoyer via Gmail
          </button>
        </div>
      </div>
    </div>
  );
}

// 5. Tasks & Team Screen Mockup
function TasksScreenMockup() {
  return (
    <div className="p-3 bg-white border border-[#DDD9CA] rounded-lg space-y-2.5">
      <div className="flex items-center justify-between border-b border-[#DDD9CA] pb-2">
        <span className="text-xs font-bold text-[#1a1f1c]">Tâches d'Équipe & Copilote</span>
        <button className="flex items-center gap-1 px-2 py-1 bg-[#1E4B33] text-white rounded text-[10px] font-bold">
          <Plus className="w-3 h-3" /> Nouvelle Tâche
        </button>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="p-2 rounded bg-[#F0EDE0]/60 border border-[#DDD9CA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-[#10B981]" />
            <span className="font-medium text-[#1a1f1c]">Qualifier 15 plombiers sur Laval</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#10B981]/15 text-[#065F46] font-bold text-[10px]">
            <Bot className="w-3 h-3" />
            <span>Minerva Copilote IA</span>
          </div>
        </div>

        <div className="p-2 rounded bg-[#F0EDE0]/60 border border-[#DDD9CA] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-[#6b6b5e]" />
            <span className="font-medium text-[#1a1f1c]">Démo de closing Boulangerie St-Honoré</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-bold text-[10px]">
            <Users className="w-3 h-3" />
            <span>Marc (Closer)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 6. Ads Hub Screen Mockup
function AdsScreenMockup() {
  return (
    <div className="space-y-2.5 p-3 bg-white border border-[#DDD9CA] rounded-lg">
      <div className="flex items-center justify-between border-b border-[#DDD9CA] pb-2">
        <span className="text-xs font-bold text-[#1a1f1c]">Hub Publicitaire & ROI</span>
        <span className="text-[10px] font-bold text-[#065F46] bg-[#10B981]/15 px-2 py-0.5 rounded-full">
          Meta Lead Ads: Connecté ●
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded bg-[#F0EDE0] border border-[#DDD9CA]">
          <span className="text-[9px] text-[#6b6b5e] font-bold uppercase block">Dépenses</span>
          <span className="text-sm font-bold text-[#1a1f1c]">420 $</span>
        </div>
        <div className="p-2 rounded bg-[#F0EDE0] border border-[#DDD9CA]">
          <span className="text-[9px] text-[#6b6b5e] font-bold uppercase block">Leads Reçus</span>
          <span className="text-sm font-bold text-[#10B981]">28</span>
        </div>
        <div className="p-2 rounded bg-[#F0EDE0] border border-[#DDD9CA]">
          <span className="text-[9px] text-[#6b6b5e] font-bold uppercase block">CPA Moyen</span>
          <span className="text-sm font-bold text-[#1a1f1c]">15.00 $</span>
        </div>
        <div className="p-2 rounded bg-[#F0EDE0] border border-[#DDD9CA]">
          <span className="text-[9px] text-[#6b6b5e] font-bold uppercase block">ROI Estimé</span>
          <span className="text-sm font-bold text-[#1E4B33]">3.4x</span>
        </div>
      </div>
    </div>
  );
}

// 7. Weekly Report Screen Mockup
function WeeklyReportScreenMockup() {
  return (
    <div className="p-3 bg-white border border-[#DDD9CA] rounded-lg space-y-3">
      <div className="flex items-center justify-between border-b border-[#DDD9CA] pb-2">
        <div>
          <span className="text-xs font-bold text-[#1a1f1c]">Bilan Hebdomadaire (Métriques Réelles)</span>
          <p className="text-[10px] text-[#6b6b5e]">Semaine 36 • 0 donnée mockée</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button className="flex items-center gap-1 px-2 py-1 rounded bg-[#EAE7D9] text-[#1a1f1c] text-[10px] font-bold">
            <Share2 className="w-3 h-3" /> Copier
          </button>
          <button className="flex items-center gap-1 px-2 py-1 rounded bg-[#1E4B33] text-white text-[10px] font-bold">
            <FileDown className="w-3 h-3" /> PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
        <div className="p-2 rounded bg-[#F0EDE0] border border-[#DDD9CA]">
          <span className="text-[9px] text-[#6b6b5e] uppercase font-bold block">Leads Créés</span>
          <span className="text-sm font-bold text-[#1a1f1c]">42</span>
        </div>
        <div className="p-2 rounded bg-[#F0EDE0] border border-[#DDD9CA]">
          <span className="text-[9px] text-[#6b6b5e] uppercase font-bold block">Contactés</span>
          <span className="text-sm font-bold text-[#1a1f1c]">29</span>
        </div>
        <div className="p-2 rounded bg-[#F0EDE0] border border-[#DDD9CA]">
          <span className="text-[9px] text-[#6b6b5e] uppercase font-bold block">RDV Tenus</span>
          <span className="text-sm font-bold text-[#10B981]">11</span>
        </div>
        <div className="p-2 rounded bg-[#F0EDE0] border border-[#DDD9CA]">
          <span className="text-[9px] text-[#6b6b5e] uppercase font-bold block">Gagnés</span>
          <span className="text-sm font-bold text-[#1E4B33]">3 (4 500 $)</span>
        </div>
      </div>
    </div>
  );
}
