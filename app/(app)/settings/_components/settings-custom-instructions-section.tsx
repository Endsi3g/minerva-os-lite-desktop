'use client';

import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { SettingsSectionWrapper } from './settings-section-wrapper';

export interface CustomInstructionsData {
  active: boolean;
  aboutYou: string;
  modelInstructions: string;
}

interface Props {
  data: CustomInstructionsData;
  onChange: (updates: Partial<CustomInstructionsData>) => void;
  isSaving: boolean;
}

export function SettingsCustomInstructionsSection({ data, onChange, isSaving }: Props) {
  return (
    <SettingsSectionWrapper
      title="Instructions personnalisées"
      description="Ajoutez des informations que le modèle doit mémoriser pour personnaliser ses réponses."
      isSaving={isSaving}
    >
      {/* Active toggle */}
      <div className="border border-border rounded-xl p-5 bg-card space-y-1 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-foreground">Actif</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Vous pouvez activer / désactiver temporairement les instructions personnalisées.
          </p>
        </div>
        <Switch
          checked={data.active}
          onCheckedChange={(checked) => onChange({ active: checked })}
          aria-label="Activer les instructions personnalisées"
        />
      </div>

      {/* About you */}
      <div className="space-y-2">
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <div className="px-5 pt-4 pb-2">
            <label className="text-xs font-bold text-foreground block mb-3">À propos de vous</label>
            <textarea
              placeholder="Qu'aimeriez-vous que le modèle sache à votre sujet pour mieux personnaliser ses réponses ?"
              value={data.aboutYou}
              onChange={(e) => onChange({ aboutYou: e.target.value })}
              rows={5}
              maxLength={1500}
              className="w-full text-sm bg-transparent focus:outline-none resize-none text-foreground placeholder:text-muted-foreground leading-relaxed"
            />
          </div>
          <div className="px-5 pb-3 flex justify-end">
            <span className="text-[10px] text-muted-foreground">{data.aboutYou.length}/1500</span>
          </div>
        </div>
      </div>

      {/* Model instructions */}
      <div className="space-y-2">
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <div className="px-5 pt-4 pb-2">
            <label className="text-xs font-bold text-foreground block mb-3">Instructions pour le modèle</label>
            <textarea
              placeholder="Comment souhaitez-vous que le modèle réponde ? (ton, format, langue, longueur des réponses...)"
              value={data.modelInstructions}
              onChange={(e) => onChange({ modelInstructions: e.target.value })}
              rows={5}
              maxLength={1500}
              className="w-full text-sm bg-transparent focus:outline-none resize-none text-foreground placeholder:text-muted-foreground leading-relaxed"
            />
          </div>
          <div className="px-5 pb-3 flex justify-end">
            <span className="text-[10px] text-muted-foreground">{data.modelInstructions.length}/1500</span>
          </div>
        </div>
      </div>
    </SettingsSectionWrapper>
  );
}
