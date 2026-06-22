'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Briefcase, Plus, Check, Loader2, ArrowLeft, Sparkles, 
  Database, Users, Shield, ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';

export default function NewWorkspacePage() {
  const router = useRouter();
  const { createWorkspace } = useReach();
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [importDemo, setImportDemo] = useState(true);
  const [workspaceType, setWorkspaceType] = useState<'private' | 'shared'>('private');
  
  // Member invite list
  const [memberEmail, setMemberEmail] = useState('');
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);

  // Creation loading steps
  const [creationStep, setCreationStep] = useState<number | null>(null);
  const [createError, setCreateError] = useState('');

  const handleAddEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const email = memberEmail.trim().toLowerCase();
    if (email && !invitedEmails.includes(email)) {
      setInvitedEmails(prev => [...prev, email]);
      setMemberEmail('');
    }
  };

  const handleRemoveEmail = (email: string) => {
    setInvitedEmails(prev => prev.filter(e => e !== email));
  };

  const stepsMessages = [
    "Création de votre nouvel espace de travail...",
    "Partitionnement des données hors-ligne...",
    "Initialisation des agents d'intelligence artificielle...",
    "Finalisation de l'environnement de prospection..."
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setCreateError('');
    setCreationStep(0);

    // Animate the setup checks for high-end feel
    for (let i = 1; i <= stepsMessages.length; i++) {
      await new Promise(r => setTimeout(r, 800));
      if (i < stepsMessages.length) {
        setCreationStep(i);
      }
    }

    try {
      const newWs = await createWorkspace(name.trim());
      if (newWs) {
        // If import demo is checked, we can seed some local mock data for this workspace
        const electronObj = typeof window !== 'undefined' && (window as any).electron;
        if (importDemo && electronObj) {
          try {
            // Seed a welcome lead for them to play with
            const leadId = 'lead-' + Math.random().toString(36).substring(2, 9);
            const nowStr = new Date().toISOString();
            await electronObj.dbRun(
              `INSERT INTO leads (id, user_id, business_name, contact_name, contact_email, niche, city, source, status, temperature, workspace_id, created_at, updated_at, sync_status) 
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_insert')`,
              [leadId, newWs.owner_id, "Café du Montréal", "Marc-Antoine", "marc@cafemontreal.ca", "Cafétéria", "Montreal", "Recherche Google", "New", "Warm", newWs.id, nowStr, nowStr]
            );
            // Also seed a default tasks list item
            const taskId = 'task-' + Math.random().toString(36).substring(2, 9);
            await electronObj.dbRun(
              `INSERT INTO tasks (id, user_id, title, completed, category, workspace_id, created_at, updated_at, sync_status) 
               VALUES (?, ?, ?, 0, 'General', ?, ?, ?, 'pending_insert')`,
              [taskId, newWs.owner_id, "Contacter Café du Montréal", newWs.id, nowStr, nowStr]
            );
          } catch (seedErr) {
            console.error("Failed to seed demo data in new workspace:", seedErr);
          }
        }

        // Redirect to workspaces list
        router.push('/workspaces');
      } else {
        setCreateError("Impossible de créer l'espace de travail. Veuillez réessayer.");
        setCreationStep(null);
      }
    } catch (err) {
      setCreateError("Une erreur est survenue lors de la création.");
      setCreationStep(null);
    }
  };

  if (creationStep !== null) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#fcfcfb] font-sans">
        <div className="w-full max-w-sm text-center space-y-6 animate-pulse">
          <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-4 border-[#e5e5e0] border-t-[#10b981] animate-spin" />
            <Briefcase className="w-8 h-8 text-[#10b981]" />
          </div>
          <div className="space-y-2">
            <h2 className="text-sm font-bold text-[#26251e] uppercase tracking-wider">Configuration</h2>
            <p className="text-xs text-[#7a7a76] font-medium transition-all duration-300">
              {stepsMessages[creationStep]}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-xl mx-auto px-6 py-10 space-y-8">
        
        {/* Navigation & Header */}
        <div className="space-y-4">
          <button 
            onClick={() => router.push('/workspaces')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#807d72] hover:text-[#26251e] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Retour aux espaces
          </button>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-[#26251e] tracking-tight">Nouvel Espace de Travail</h1>
            <p className="text-xs text-[#807d72] font-semibold">
              Configurez et lancez une nouvelle campagne de prospection partitionnée.
            </p>
          </div>
        </div>

        {createError && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold">
            <span>{createError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Workspace info */}
          <div className="bg-[#fbfbfa] border border-[#e5e5e0] rounded-2xl p-5 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="wsName" className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                Nom de l&apos;espace de travail
              </label>
              <input
                type="text"
                id="wsName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex. Agence Québec, Campagne Restos B2B..."
                className="w-full text-xs px-3 py-2.5 bg-white border border-[#e5e5e0] rounded-lg focus:outline-none focus:border-[#26251e] placeholder:text-[#a3a197]"
                required
                autoFocus
              />
            </div>

            {/* Private vs Shared */}
            <div className="space-y-2 pt-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                Type d&apos;accès
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWorkspaceType('private')}
                  className={`flex flex-col items-start gap-1 p-3.5 rounded-xl border text-left transition-all ${
                    workspaceType === 'private' 
                      ? 'border-[#26251e] bg-white ring-1 ring-[#26251e]' 
                      : 'border-[#e5e5e0] bg-white hover:border-[#a3a197]/50'
                  }`}
                >
                  <span className="text-xs font-bold text-[#26251e] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    Privé
                  </span>
                  <span className="text-[10px] text-[#807d72]">
                    Uniquement accessible par vous.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setWorkspaceType('shared')}
                  className={`flex flex-col items-start gap-1 p-3.5 rounded-xl border text-left transition-all ${
                    workspaceType === 'shared' 
                      ? 'border-[#26251e] bg-white ring-1 ring-[#26251e]' 
                      : 'border-[#e5e5e0] bg-white hover:border-[#a3a197]/50'
                  }`}
                >
                  <span className="text-xs font-bold text-[#26251e] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    Partagé
                  </span>
                  <span className="text-[10px] text-[#807d72]">
                    Partagez l&apos;espace avec votre équipe.
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Members invite (conditional) */}
          {workspaceType === 'shared' && (
            <div className="bg-[#fbfbfa] border border-[#e5e5e0] rounded-2xl p-5 space-y-4">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-[#26251e]">Inviter des collaborateurs</h3>
                <p className="text-[10px] text-[#807d72]">
                  Ajoutez les adresses courriel des membres à inviter d&apos;office.
                </p>
              </div>

              <div className="flex gap-2">
                <input 
                  type="email"
                  placeholder="collaborateur@uprising.studio"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 bg-white border border-[#e5e5e0] rounded-lg focus:outline-none focus:border-[#26251e]"
                />
                <Button 
                  type="button" 
                  onClick={handleAddEmail}
                  className="h-9 px-4 bg-[#26251e] text-white hover:bg-[#3d3c36] font-semibold text-xs rounded-lg"
                >
                  Ajouter
                </Button>
              </div>

              {invitedEmails.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {invitedEmails.map(email => (
                    <span 
                      key={email}
                      className="inline-flex items-center gap-1 bg-white border border-[#e5e5e0] rounded-lg px-2.5 py-1 text-[10px] font-semibold text-[#555552]"
                    >
                      {email}
                      <button 
                        type="button" 
                        onClick={() => handleRemoveEmail(email)}
                        className="text-red-500 hover:text-red-700 font-bold text-xs"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Demo import checkbox */}
          <div className="bg-[#fbfbfa] border border-[#e5e5e0] rounded-2xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <Database className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold text-[#26251e]">Données de démonstration</h3>
                <p className="text-[10px] text-[#807d72]">
                  Importer des leads de test et des tâches exemples.
                </p>
              </div>
            </div>
            <input 
              type="checkbox"
              checked={importDemo}
              onChange={(e) => setImportDemo(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 border-[#e5e5e0] focus:ring-emerald-500 cursor-pointer"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#e5e5e0]/60">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push('/workspaces')}
              className="h-10 text-xs font-semibold text-[#555552]"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="h-10 px-5 bg-[#26251e] hover:bg-[#3d3c36] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              Créer l&apos;espace
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </form>

      </div>
    </div>
  );
}
