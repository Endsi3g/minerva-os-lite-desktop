'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useReach } from '@/lib/reach-context';
import { Folder, Plus, FolderOpen, Users, ChevronRight, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProjectsRoot() {
  const { projects, leads, createProject } = useReach();
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const filtered = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const getLeadCount = (projectId: string) =>
    leads.filter((l) => l.projectId === projectId).length;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createProject(newName.trim());
    setNewName('');
    setIsCreating(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf9] text-[#26251e]">
      <div className="w-full p-3 sm:p-4 md:p-6 space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#e5e5e0] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-[#10b981]" />
              <h1 className="text-xl font-bold tracking-tight">Projets</h1>
            </div>
            <p className="text-xs text-[#807d72] mt-1">
              Organisez vos leads et conversations par projet.
            </p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#26251e] text-white rounded-xl hover:bg-[#3a3933] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau projet
          </button>
        </div>

        {/* New project inline form */}
        {isCreating && (
          <div className="bg-white border border-[#e5e5e0] rounded-xl p-4 flex items-center gap-3 shadow-xs">
            <Folder className="w-4 h-4 text-[#10b981] shrink-0" />
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') { setIsCreating(false); setNewName(''); }
              }}
              placeholder="Nom du projet…"
              className="flex-1 text-sm bg-transparent border-none outline-none text-[#26251e] placeholder:text-[#807d72]"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-3 py-1.5 text-xs font-semibold bg-[#10b981] text-white rounded-lg hover:bg-[#059669] disabled:opacity-40 transition-colors cursor-pointer"
            >
              Créer
            </button>
            <button
              onClick={() => { setIsCreating(false); setNewName(''); }}
              className="px-3 py-1.5 text-xs text-[#807d72] hover:text-[#26251e] transition-colors cursor-pointer"
            >
              Annuler
            </button>
          </div>
        )}

        {/* Search */}
        {projects.length > 4 && (
          <div className="relative max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#807d72]" />
            <input
              type="text"
              placeholder="Rechercher un projet…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 w-full text-xs bg-white border border-[#e5e5e0] rounded-xl focus:outline-none focus:border-[#10b981] transition-colors"
            />
          </div>
        )}

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#e5e5e0]/60 flex items-center justify-center">
              <FolderOpen className="w-7 h-7 text-[#807d72]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#26251e]">
                {search ? 'Aucun projet trouvé' : 'Aucun projet pour l’instant'}
              </p>
              <p className="text-xs text-[#807d72] mt-1">
                {search
                  ? 'Essayez un autre terme de recherche.'
                  : 'Créez votre premier projet pour organiser vos leads.'}
              </p>
            </div>
            {!search && (
              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-[#26251e] text-white rounded-xl hover:bg-[#3a3933] transition-colors cursor-pointer mt-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Créer un projet
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((project) => {
              const leadCount = getLeadCount(project.id);
              const date = new Date(project.createdAt).toLocaleDateString('fr-CA', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              });

              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={cn(
                    'group bg-white border border-[#e5e5e0] rounded-2xl p-5 hover:border-[#10b981]/40 hover:shadow-sm transition-all flex flex-col gap-4'
                  )}
                >
                  {/* Icon + name */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#10b981]/10 flex items-center justify-center shrink-0">
                        <Folder className="w-4.5 h-4.5 text-[#10b981]" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#26251e] leading-tight group-hover:text-[#10b981] transition-colors">
                          {project.name}
                        </p>
                        {project.description && (
                          <p className="text-[11px] text-[#807d72] mt-0.5 line-clamp-1">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#807d72] group-hover:text-[#10b981] group-hover:translate-x-0.5 transition-all shrink-0 mt-0.5" />
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-[11px] text-[#807d72]">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span>{leadCount} lead{leadCount !== 1 ? 's' : ''}</span>
                    </div>
                    <span>{date}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
