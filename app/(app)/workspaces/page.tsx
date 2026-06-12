'use client';

import React, { useState } from 'react';
import { 
  Briefcase, Plus, Trash2, Edit3, Check, Loader2, 
  AlertCircle, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useReach } from '@/lib/reach-context';

export default function WorkspacesPage() {
  const { 
    workspacesList, 
    activeWorkspace, 
    switchWorkspace, 
    createWorkspace, 
    renameWorkspace, 
    deleteWorkspace 
  } = useReach();

  // Create workspace state
  const [newWsName, setNewWsName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Rename workspace state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete workspace state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Handlers
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWsName.trim()) return;

    setIsCreating(true);
    setCreateError('');
    try {
      const created = await createWorkspace(newWsName.trim());
      if (created) {
        setNewWsName('');
      } else {
        setCreateError("Impossible de créer l'espace de travail. Veuillez réessayer.");
      }
    } catch {
      setCreateError("Une erreur est survenue lors de la création.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleStartRename = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleRename = async (id: string) => {
    if (!editingName.trim()) return;
    setIsRenaming(true);
    try {
      await renameWorkspace(id, editingName.trim());
      setEditingId(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    setDeleteError('');
    try {
      // Check if we are deleting the last owned workspace
      const ownedCount = workspacesList.filter(w => w.isOwner).length;
      const target = workspacesList.find(w => w.id === id);
      
      if (target?.isOwner && ownedCount <= 1) {
        setDeleteError("Impossible de supprimer votre dernier espace de travail personnel.");
        setIsDeleting(false);
        return;
      }

      await deleteWorkspace(id);
      setConfirmDeleteId(null);
    } catch {
      setDeleteError("Une erreur est survenue lors de la suppression.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-[#26251e] tracking-tight">Espaces de travail</h1>
          <p className="text-sm text-[#807d72] font-medium">
            Gérez vos différents environnements de prospection et basculez de l&apos;un à l&apos;autre.
          </p>
        </div>

        {/* Section double colonne */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Colonne gauche : Liste des workspaces */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#a3a197]">
              Vos espaces ({workspacesList.length})
            </h2>

            {deleteError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="space-y-3">
              {workspacesList.map((ws) => {
                const isActive = activeWorkspace?.id === ws.id;
                const isEditing = editingId === ws.id;
                const isConfirmingDelete = confirmDeleteId === ws.id;

                return (
                  <div 
                    key={ws.id}
                    className={cn(
                      "group p-4 rounded-xl border transition-all duration-200 bg-[#fbfbfa]",
                      isActive 
                        ? "border-[#26251e] shadow-sm bg-white" 
                        : "border-[#e5e5e0] hover:border-[#a3a197]/50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-4">
                      
                      {/* Left: icon and info */}
                      <div className="flex-1 flex items-center gap-3">
                        <div className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center border",
                          isActive 
                            ? "bg-[#26251e] text-white border-transparent" 
                            : "bg-white text-[#7a7a76] border-[#e5e5e0]"
                        )}>
                          <Briefcase className="w-4 h-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          {isEditing ? (
                            <div className="flex items-center gap-2 max-w-sm">
                              <input 
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="w-full text-sm font-semibold text-[#26251e] px-2 py-1 bg-white border border-[#c4c4c0] rounded focus:outline-none focus:border-[#26251e]"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleRename(ws.id);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                              />
                              <button 
                                onClick={() => handleRename(ws.id)}
                                disabled={isRenaming || !editingName.trim()}
                                className="p-1 hover:bg-[#e5e5e0] rounded text-emerald-700 disabled:opacity-50"
                              >
                                {isRenaming ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4" />
                                )}
                              </button>
                              <button 
                                onClick={() => setEditingId(null)}
                                className="p-1 hover:bg-[#e5e5e0] rounded text-[#807d72]"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-[#26251e] text-sm truncate">
                                {ws.name}
                              </span>
                              
                              {/* Active Badge */}
                              {isActive && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f4f4f3] text-[#26251e] border border-[#e5e5e0]">
                                  <Check className="w-2.5 h-2.5" />
                                  Actif
                                </span>
                              )}

                              {/* Owner Badge */}
                              <span className={cn(
                                "inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border",
                                ws.isOwner 
                                  ? "bg-blue-50 text-blue-700 border-blue-200" 
                                  : "bg-purple-50 text-purple-700 border-purple-200"
                              )}>
                                {ws.isOwner ? "Propriétaire" : "Invité"}
                              </span>
                            </div>
                          )}

                          <p className="text-[11px] text-[#807d72] mt-0.5 font-medium">
                            Propriétaire : <span className="text-[#555552]">{ws.isOwner ? "Vous" : ws.ownerName}</span>
                          </p>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2">
                        {!isActive && !isEditing && !isConfirmingDelete && (
                          <button
                            onClick={() => switchWorkspace(ws.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#555552] bg-white border border-[#e5e5e0] hover:bg-[#f4f4f3] hover:text-[#26251e] transition-colors"
                          >
                            Rejoindre
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {ws.isOwner && !isEditing && !isConfirmingDelete && (
                          <>
                            <button
                              onClick={() => handleStartRename(ws.id, ws.name)}
                              className="p-2 text-[#7a7a76] hover:text-[#26251e] hover:bg-[#e5e5e2]/60 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Renommer"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(ws.id)}
                              className="p-2 text-[#7a7a76] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}

                        {isConfirmingDelete && (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-red-600 font-bold mr-1">Sûr ?</span>
                            <button
                              onClick={() => handleDelete(ws.id)}
                              disabled={isDeleting}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-bold"
                            >
                              {isDeleting ? "..." : "Oui"}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 bg-[#e5e5e2] hover:bg-[#d8d8d4] text-[#26251e] rounded text-[11px] font-semibold"
                            >
                              Non
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Colonne droite : Créer un espace */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#a3a197]">
              Créer un espace
            </h2>

            <div className="p-5 border border-[#e5e5e0] rounded-2xl bg-[#fbfbfa] space-y-4">
              <div className="flex items-center gap-2 text-[#555552]">
                <Plus className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold">Nouvel environnement</span>
              </div>
              <p className="text-xs text-[#807d72] leading-relaxed">
                Les workspaces partitionnent entièrement vos données (leads, tâches, suggestions d&apos;IA) afin de structurer plusieurs campagnes ou clients séparément.
              </p>

              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-1">
                  <label htmlFor="wsName" className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">
                    Nom de l&apos;espace de travail
                  </label>
                  <input
                    type="text"
                    id="wsName"
                    value={newWsName}
                    onChange={(e) => setNewWsName(e.target.value)}
                    placeholder="ex. Agence Sud-Ouest, Campagne B2B..."
                    className="w-full text-xs px-3 py-2 bg-white border border-[#e5e5e0] rounded-lg focus:outline-none focus:border-[#26251e] placeholder:text-[#a3a197]"
                    required
                  />
                </div>

                {createError && (
                  <p className="text-[10px] text-red-600 font-medium">{createError}</p>
                )}

                <button
                  type="submit"
                  disabled={isCreating || !newWsName.trim()}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#26251e] hover:bg-[#3d3c36] text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Créer le workspace
                </button>
              </form>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

interface XProps {
  className?: string;
}

function X({ className }: XProps) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
