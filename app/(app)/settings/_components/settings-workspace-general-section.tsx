'use client';

import React, { useState, useRef } from 'react';
import { Upload, Trash2, AlertTriangle } from 'lucide-react';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';

interface WorkspaceGeneralData {
  workspaceName: string;
  companyDescription: string;
  workspaceIconBase64: string;
}

interface Props {
  data: WorkspaceGeneralData;
  onChange: (updates: Partial<WorkspaceGeneralData>) => void;
  isSaving: boolean;
}

export function SettingsWorkspaceGeneralSection({ data, onChange, isSaving }: Props) {
  const iconInputRef = useRef<HTMLInputElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => onChange({ workspaceIconBase64: ev.target?.result as string });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <SettingsSectionWrapper
      title="Général"
      description="Configurez les informations de base de votre espace de travail."
      isSaving={isSaving}
    >
      {/* Workspace icon */}
      <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-4">
        <div>
          <p className="text-xs font-bold text-[#26251e]">Icône de l'espace de travail</p>
          <p className="text-[11px] text-[#7a7a76] mt-0.5">Format 1:1 ; PNG ou JPEG ; max 512 Ko</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl border-2 border-dashed border-[#e5e5e0] bg-[#f4f4f3] flex items-center justify-center overflow-hidden">
            {data.workspaceIconBase64 ? (
              <img src={data.workspaceIconBase64} alt="icon" className="w-full h-full object-cover" />
            ) : (
              <span className="text-2xl font-bold text-[#7a7a76]">{(data.workspaceName || 'M').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <button
            onClick={() => iconInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 border border-[#e5e5e0] rounded-lg text-xs font-semibold text-[#26251e] hover:bg-[#f4f4f3] transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Télécharger
          </button>
          <input ref={iconInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
        </div>
      </div>

      {/* Workspace name */}
      <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-3">
        <div className="flex items-start justify-between gap-6">
          <div className="flex-1">
            <label className="text-xs font-bold text-[#26251e] block mb-0.5">Nom de l'espace de travail</label>
            <p className="text-[11px] text-[#7a7a76]">Définissez le nom de votre espace de travail.</p>
          </div>
          <input
            type="text"
            value={data.workspaceName}
            onChange={(e) => onChange({ workspaceName: e.target.value })}
            className="w-48 text-sm px-3 py-1.5 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-[#fafaf8] text-[#26251e]"
          />
        </div>
      </div>

      {/* Company description */}
      <div className="border border-[#e5e5e0] rounded-xl p-5 bg-white space-y-3">
        <div>
          <label className="text-xs font-bold text-[#26251e] block mb-0.5">Description de l'entreprise</label>
          <p className="text-[11px] text-[#7a7a76]">Informations générales que les modèles d'IA doivent connaître sur votre entreprise.</p>
        </div>
        <textarea
          placeholder="Entrez des informations générales que les modèles doivent connaître sur votre entreprise..."
          value={data.companyDescription}
          onChange={(e) => onChange({ companyDescription: e.target.value })}
          rows={5}
          className="w-full text-sm px-3.5 py-2.5 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-[#fafaf8] resize-none text-[#26251e] placeholder:text-[#7a7a76]"
        />
      </div>

      {/* Delete workspace */}
      <div className="border border-destructive/30 rounded-xl p-5 bg-destructive/5 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold text-destructive">Supprimer l'espace de travail</p>
            <p className="text-[11px] text-[#7a7a76] mt-0.5">
              Cette action est irréversible. Toutes les données associées (leads, agents, tâches, membres) seront définitivement supprimées.
            </p>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-xs font-bold hover:bg-destructive/90 transition-colors shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Supprimer
          </button>
        </div>
        {showDeleteConfirm && (
          <div className="border border-destructive/40 rounded-lg p-4 bg-white space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold">Êtes-vous sûr ? Cette action est irréversible.</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 text-xs border border-[#e5e5e0] rounded-lg hover:bg-[#f4f4f3] transition-colors">
                Annuler
              </button>
              <button className="px-3 py-1.5 text-xs bg-destructive text-white rounded-lg font-bold hover:bg-destructive/90 transition-colors">
                Confirmer la suppression
              </button>
            </div>
          </div>
        )}
      </div>
    </SettingsSectionWrapper>
  );
}
