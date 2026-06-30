'use client';

import React, { useState } from 'react';
import { Search, Users, Trash2, X } from 'lucide-react';
import { SettingsSectionWrapper } from './settings-section-wrapper';

interface Group {
  id: string;
  name: string;
  memberCount: number;
}

export function SettingsGroupsSection() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const filtered = groups.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = () => {
    if (!newGroupName.trim()) return;
    setGroups((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: newGroupName.trim(), memberCount: 0 },
    ]);
    setNewGroupName('');
    setShowCreate(false);
  };

  const handleDelete = (id: string) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
  };

  return (
    <SettingsSectionWrapper
      title="Groupes"
      description="Gérez les groupes de membres de votre espace de travail."
      isSaving={false}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-[#26251e]">Gérer les groupes</p>
            <p className="text-[11px] text-[#7a7a76] mt-0.5">Créez ou modifiez des groupes existants.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-[#059669] text-white rounded-lg text-xs font-bold hover:bg-[#059669]/90 transition-colors shrink-0"
          >
            Créer un groupe
          </button>
        </div>

        {showCreate && (
          <div className="border border-[#e5e5e0] rounded-xl p-4 bg-white space-y-3 animate-in fade-in duration-150">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#26251e]">Nouveau groupe</p>
              <button onClick={() => { setShowCreate(false); setNewGroupName(''); }} className="text-[#7a7a76] hover:text-[#26251e]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nom du groupe..."
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                autoFocus
                className="flex-1 text-xs px-3.5 py-2 border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-[#fafaf8] text-[#26251e]"
              />
              <button
                onClick={handleCreate}
                disabled={!newGroupName.trim()}
                className="px-4 py-2 bg-[#059669] text-white text-xs font-bold rounded-lg hover:bg-[#059669]/90 transition-colors disabled:opacity-50"
              >
                Créer
              </button>
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7a7a76]" />
          <input
            type="text"
            placeholder="Rechercher des groupes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#e5e5e0] rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-[#fafaf8] text-[#26251e] placeholder:text-[#7a7a76]"
          />
        </div>

        <div className="border border-[#e5e5e0] rounded-xl overflow-hidden bg-white">
          {filtered.length === 0 ? (
            <div className="py-12 flex flex-col items-center gap-3 text-[#7a7a76]">
              <Users className="w-8 h-8 opacity-30" />
              <p className="text-xs">Aucun groupe trouvé.</p>
              <p className="text-[10px] text-[#7a7a76]">Créez votre premier groupe pour organiser vos membres.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((g) => (
                <div key={g.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-8 h-8 rounded-lg bg-[#059669]/10 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-[#059669]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-[#26251e]">{g.name}</p>
                    <p className="text-[10px] text-[#7a7a76]">{g.memberCount} membre(s)</p>
                  </div>
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="p-1.5 text-[#7a7a76] hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </SettingsSectionWrapper>
  );
}
