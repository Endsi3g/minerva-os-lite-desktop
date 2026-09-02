'use client';

import React from 'react';
import {
  Sparkles, Wand2, Scissors, Target, RotateCcw,
  SlidersHorizontal, Loader2, ChevronDown, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface AIAssistToolbarProps {
  aiLoading: boolean;
  aiActionLabel?: string;
  hasLead: boolean;
  onAIGenerateFull: () => void;
  onAIPolishStyle: () => void;
  onAIMakeConcise: () => void;
  onAIPersonalizeWithSignals: () => void;
  onAIGenerateFollowup: () => void;
  onAIChangeTone: (tone: 'Direct & Percutant' | 'Conseil & Bienveillant' | 'C-Level & Exécutif' | 'Chaleureux & Décontracté') => void;
}

export function AIAssistToolbar({
  aiLoading,
  aiActionLabel,
  hasLead,
  onAIGenerateFull,
  onAIPolishStyle,
  onAIMakeConcise,
  onAIPersonalizeWithSignals,
  onAIGenerateFollowup,
  onAIChangeTone,
}: AIAssistToolbarProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap p-2 rounded-xl bg-[#fafaf8] border border-[#e5e5e0] text-xs">
      <div className="flex items-center gap-1 text-[11px] font-bold text-[#059669] px-2 py-0.5 rounded-md bg-[#ecfdf5] border border-[#a7f3d0] shrink-0">
        <Sparkles className="h-3 w-3" />
        <span>Minerva AI Copilot</span>
      </div>

      <div className="h-4 w-px bg-[#e5e5e0] mx-0.5 hidden sm:block" />

      {/* Main Generation */}
      <Button
        variant="outline"
        size="sm"
        onClick={onAIGenerateFull}
        disabled={aiLoading}
        className="h-7 text-[11px] font-semibold gap-1.5 bg-white border-[#059669]/40 text-[#059669] hover:bg-[#ecfdf5] hover:border-[#059669] shadow-xs"
        title="Génère un message complet adapté au profil du prospect"
      >
        {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        <span>Générer sur-mesure</span>
      </Button>

      {/* Polish Style */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onAIPolishStyle}
        disabled={aiLoading}
        className="h-7 text-[11px] font-medium gap-1 text-[#26251e] hover:bg-white hover:border hover:border-[#e5e5e0]"
        title="Améliore la clarté, le dynamisme et l'élégance du texte"
      >
        <Wand2 className="h-3 w-3 text-indigo-600" />
        <span>Polir le style</span>
      </Button>

      {/* Make Concise */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onAIMakeConcise}
        disabled={aiLoading}
        className="h-7 text-[11px] font-medium gap-1 text-[#26251e] hover:bg-white hover:border hover:border-[#e5e5e0]"
        title="Raccourcit le message sous les 90 mots pour maximiser le taux de réponse"
      >
        <Scissors className="h-3 w-3 text-amber-600" />
        <span>Rendre concis (&lt;90 mots)</span>
      </Button>

      {/* Inject Signals */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onAIPersonalizeWithSignals}
        disabled={aiLoading || !hasLead}
        className="h-7 text-[11px] font-medium gap-1 text-[#26251e] hover:bg-white hover:border hover:border-[#e5e5e0]"
        title="Injecte des détails contextuels spécifiques (avis, ville, actualité)"
      >
        <Target className="h-3 w-3 text-emerald-600" />
        <span>Injecter signaux</span>
      </Button>

      {/* Followup generator */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onAIGenerateFollowup}
        disabled={aiLoading}
        className="h-7 text-[11px] font-medium gap-1 text-[#26251e] hover:bg-white hover:border hover:border-[#e5e5e0]"
        title="Génère une séquence de relance intelligente"
      >
        <RotateCcw className="h-3 w-3 text-sky-600" />
        <span>Relance J+4</span>
      </Button>

      {/* Tone Switcher Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            disabled={aiLoading}
            className="h-7 text-[11px] font-medium gap-1 text-[#26251e] hover:bg-white hover:border hover:border-[#e5e5e0]"
          >
            <SlidersHorizontal className="h-3 w-3 text-purple-600" />
            <span>Ton</span>
            <ChevronDown className="h-2.5 w-2.5 opacity-60" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 text-xs">
          <DropdownMenuLabel className="text-[10px] font-bold text-[#7a7a76] uppercase">
            Ajuster la tonalité
          </DropdownMenuLabel>
          <DropdownMenuItem onClick={() => onAIChangeTone('Direct & Percutant')} className="cursor-pointer">
            <span className="font-semibold">Direct & Percutant</span>
            <span className="text-[10px] text-[#7a7a76] ml-auto">Sans détour</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAIChangeTone('Conseil & Bienveillant')} className="cursor-pointer">
            <span className="font-semibold">Conseil & Valeur</span>
            <span className="text-[10px] text-[#7a7a76] ml-auto">Consultatif</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAIChangeTone('C-Level & Exécutif')} className="cursor-pointer">
            <span className="font-semibold">C-Level / Exécutif</span>
            <span className="text-[10px] text-[#7a7a76] ml-auto">Sobre & ROI</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onAIChangeTone('Chaleureux & Décontracté')} className="cursor-pointer">
            <span className="font-semibold">Chaleureux</span>
            <span className="text-[10px] text-[#7a7a76] ml-auto">Accessible</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Loading state indicator */}
      {aiLoading && (
        <div className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-[#059669] animate-pulse">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>{aiActionLabel || 'Génération IA en cours…'}</span>
        </div>
      )}
    </div>
  );
}
