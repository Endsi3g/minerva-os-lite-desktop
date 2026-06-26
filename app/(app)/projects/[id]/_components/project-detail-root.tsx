'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { cn } from '@/lib/utils';
import { Folder, ArrowLeft, Loader2, Trash2, Users, MessageSquare, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  id: string;
}

export default function ProjectDetailRoot({ id }: Props) {
  const router = useRouter();
  const { projects, renameProject, deleteProject, leads, teamMessages } = useReach();

  const project = projects.find((p) => p.id === id);

  const [activeTab, setActiveTab] = useState<'leads' | 'conversations'>('leads');
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Loading state — project not yet in context
  if (!project) {
    return (
      <div className="flex h-full items-center justify-center flex-col gap-4 bg-white text-[#26251e]">
        <Loader2 className="h-5 w-5 animate-spin text-[#10b981]" />
        <p className="text-xs text-[#7a7a76]">Chargement du projet…</p>
        <Link
          href="/today"
          className="text-xs font-semibold text-[#10b981] hover:underline flex items-center gap-1"
        >
          <ArrowLeft className="h-3 w-3" />
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  // Filter leads by explicit project_id assignment
  const relatedLeads = leads.filter((lead) => lead.projectId === id);

  // MVP filter: team messages mentioning the project name
  const relatedMessages = teamMessages.filter((msg) =>
    msg.content.toLowerCase().includes(project.name.toLowerCase())
  );

  const startRename = () => {
    setRenameValue(project.name);
    setIsRenaming(true);
  };

  const confirmRename = async () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== project.name) {
      await renameProject(id, trimmed);
    }
    setIsRenaming(false);
  };

  const cancelRename = () => {
    setIsRenaming(false);
    setRenameValue('');
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await deleteProject(id);
    router.push('/today');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white text-[#26251e]">
      {/* Header */}
      <div className="border-b border-[#e5e5e0] px-6 py-4 shrink-0">
        <Link
          href="/today"
          className="inline-flex items-center gap-1.5 text-xs text-[#7a7a76] hover:text-[#26251e] mb-3 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Tableau de bord
        </Link>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center shrink-0">
            <Folder className="h-4 w-4 text-[#10b981]" />
          </div>

          {isRenaming ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                autoFocus
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') confirmRename();
                  if (e.key === 'Escape') cancelRename();
                }}
                className="text-lg font-bold text-[#26251e] bg-transparent border-b-2 border-[#10b981] outline-none flex-1 min-w-0 pb-0.5"
              />
              <button
                onClick={confirmRename}
                className="p-1 rounded hover:bg-[#10b981]/10 text-[#10b981] transition-colors"
                title="Confirmer"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={cancelRename}
                className="p-1 rounded hover:bg-[#e5e5e2] text-[#7a7a76] transition-colors"
                title="Annuler"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-lg font-bold text-[#26251e] truncate">{project.name}</h1>
              <button
                onClick={startRename}
                className="p-1 rounded hover:bg-[#e5e5e2] text-[#7a7a76] hover:text-[#26251e] transition-colors shrink-0"
                title="Renommer"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {project.description && (
          <p className="text-xs text-[#7a7a76] mt-2 ml-11">{project.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#e5e5e0] px-6 shrink-0">
        <button
          onClick={() => setActiveTab('leads')}
          className={cn(
            "flex items-center gap-1.5 px-0 py-3 mr-6 text-xs font-semibold border-b-2 transition-colors",
            activeTab === 'leads'
              ? "border-[#10b981] text-[#10b981]"
              : "border-transparent text-[#7a7a76] hover:text-[#26251e]"
          )}
        >
          <Users className="h-3.5 w-3.5" />
          Leads liés
          {relatedLeads.length > 0 && (
            <span className="ml-1 text-[9px] font-bold bg-[#10b981]/10 text-[#10b981] px-1.5 py-0.5 rounded-full">
              {relatedLeads.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('conversations')}
          className={cn(
            "flex items-center gap-1.5 px-0 py-3 text-xs font-semibold border-b-2 transition-colors",
            activeTab === 'conversations'
              ? "border-[#10b981] text-[#10b981]"
              : "border-transparent text-[#7a7a76] hover:text-[#26251e]"
          )}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Conversations
          {relatedMessages.length > 0 && (
            <span className="ml-1 text-[9px] font-bold bg-[#10b981]/10 text-[#10b981] px-1.5 py-0.5 rounded-full">
              {relatedMessages.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {activeTab === 'leads' && (
          <div className="space-y-2">
            {relatedLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <Users className="h-8 w-8 text-[#e5e5e0]" />
                <p className="text-sm font-semibold text-[#26251e]">Aucun lead lié</p>
                <p className="text-xs text-[#7a7a76] max-w-xs">
                  Les leads dont les notes ou le nom mentionnent &quot;{project.name}&quot; apparaîtront ici.
                </p>
                <Link
                  href="/leads"
                  className="text-xs font-semibold text-[#10b981] hover:underline mt-1"
                >
                  Voir tous les leads
                </Link>
              </div>
            ) : (
              relatedLeads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between p-3 border border-[#e5e5e0] rounded-xl hover:bg-[#f4f4f3] transition-colors group"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-bold text-[#26251e] truncate group-hover:text-[#10b981] transition-colors">
                      {lead.businessName}
                    </span>
                    <div className="flex items-center gap-1.5 text-[10px] text-[#7a7a76]">
                      <span>{lead.niche}</span>
                      {lead.city && <><span>•</span><span>{lead.city}</span></>}
                    </div>
                  </div>
                  <span
                    className={cn(
                      "text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border shrink-0 ml-3",
                      lead.status === 'Won'
                        ? "bg-[#10b981]/10 text-[#059669] border-[#10b981]/20"
                        : lead.status === 'Lost'
                        ? "bg-red-50 text-red-600 border-red-100"
                        : "bg-[#f4f4f3] text-[#555552] border-[#e5e5e0]"
                    )}
                  >
                    {lead.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        )}

        {activeTab === 'conversations' && (
          <div className="space-y-2">
            {relatedMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                <MessageSquare className="h-8 w-8 text-[#e5e5e0]" />
                <p className="text-sm font-semibold text-[#26251e]">Aucune conversation liée</p>
                <p className="text-xs text-[#7a7a76] max-w-xs">
                  Les messages d'équipe mentionnant &quot;{project.name}&quot; apparaîtront ici.
                </p>
              </div>
            ) : (
              relatedMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="p-3 border border-[#e5e5e0] rounded-xl bg-[#fafaf9]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-[#26251e]">{msg.senderName}</span>
                    <span className="text-[9px] text-[#7a7a76]">
                      {new Date(msg.createdAt).toLocaleDateString('fr-CA', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-xs text-[#555552] leading-relaxed">{msg.content}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Footer — Delete */}
      <div className="border-t border-[#e5e5e0] px-6 py-4 shrink-0">
        {showDeleteConfirm ? (
          <div className="flex items-center gap-3">
            <p className="text-xs text-[#555552] flex-1">
              Confirmer la suppression de <strong>&quot;{project.name}&quot;</strong> ? Cette action est irréversible.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(false)}
              className="h-8 text-xs text-[#555552]"
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5"
            >
              {isDeleting ? (
                <><Loader2 className="h-3 w-3 animate-spin" /> Suppression…</>
              ) : (
                <><Trash2 className="h-3 w-3" /> Supprimer</>
              )}
            </Button>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#7a7a76] hover:text-red-600 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Supprimer ce projet
          </button>
        )}
      </div>
    </div>
  );
}
