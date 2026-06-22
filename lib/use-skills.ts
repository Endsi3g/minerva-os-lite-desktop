'use client';

import { useState, useEffect, useCallback } from 'react';
import { ALL_BUILTIN_SKILLS, type Skill } from './skills-data';

interface SkillsState {
  enabledIds: string[];
  customSkills: Skill[];
}

function storageKey(workspaceId?: string) {
  return `minerva_skills_${workspaceId || 'default'}`;
}

function load(workspaceId?: string): SkillsState {
  if (typeof window === 'undefined') return { enabledIds: [], customSkills: [] };
  try {
    const raw = localStorage.getItem(storageKey(workspaceId));
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  // Default: enable the Sales + Support starter skills
  return { enabledIds: ['sales-cold-email', 'sales-followup', 'cs-reply'], customSkills: [] };
}

export function useSkills(workspaceId?: string) {
  const [state, setState] = useState<SkillsState>({ enabledIds: [], customSkills: [] });

  useEffect(() => {
    setState(load(workspaceId));
  }, [workspaceId]);

  const persist = useCallback((next: SkillsState) => {
    setState(next);
    try { localStorage.setItem(storageKey(workspaceId), JSON.stringify(next)); } catch { /* ignore */ }
  }, [workspaceId]);

  const allSkills: Skill[] = [...ALL_BUILTIN_SKILLS, ...state.customSkills];

  const isEnabled = (id: string) => state.enabledIds.includes(id);

  const toggleSkill = useCallback((id: string) => {
    setState(prev => {
      const enabledIds = prev.enabledIds.includes(id)
        ? prev.enabledIds.filter(x => x !== id)
        : [...prev.enabledIds, id];
      const next = { ...prev, enabledIds };
      try { localStorage.setItem(storageKey(workspaceId), JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [workspaceId]);

  const addCustomSkill = useCallback((skill: Omit<Skill, 'id' | 'builtIn'>) => {
    const id = `custom-${Date.now().toString(36)}`;
    const newSkill: Skill = { ...skill, id, builtIn: false };
    setState(prev => {
      const next = {
        customSkills: [...prev.customSkills, newSkill],
        enabledIds: [...prev.enabledIds, id],
      };
      try { localStorage.setItem(storageKey(workspaceId), JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    return newSkill;
  }, [workspaceId]);

  const deleteCustomSkill = useCallback((id: string) => {
    setState(prev => {
      const next = {
        customSkills: prev.customSkills.filter(s => s.id !== id),
        enabledIds: prev.enabledIds.filter(x => x !== id),
      };
      try { localStorage.setItem(storageKey(workspaceId), JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [workspaceId]);

  const enabledSkills = allSkills.filter(s => state.enabledIds.includes(s.id));

  return { state, allSkills, enabledSkills, isEnabled, toggleSkill, addCustomSkill, deleteCustomSkill, persist };
}
