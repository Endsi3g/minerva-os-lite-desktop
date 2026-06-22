'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ALL_BUILTIN_SKILLS, type Skill } from './skills-data';

// Built-in skills enabled by default for a fresh workspace
const DEFAULT_ENABLED = ['sales-cold-email', 'sales-followup', 'cs-reply'];

interface SkillRow {
  skill_id: string;
  name: string | null;
  description: string | null;
  instructions: string | null;
  is_custom: boolean;
  enabled: boolean;
}

/**
 * Skills persistence backed by Supabase (table `workspace_skills`), per user + workspace.
 * Keeps the same surface as before so callers don't change.
 */
export function useSkills(workspaceId?: string) {
  const [enabledIds, setEnabledIds] = useState<string[]>([]);
  const [customSkills, setCustomSkills] = useState<Skill[]>([]);
  const [loaded, setLoaded] = useState(false);
  const userIdRef = useRef<string | null>(null);

  // Load rows from Supabase (and seed defaults the first time)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoaded(true); return; }
        userIdRef.current = user.id;

        // Shared by workspace: read all rows for this workspace (any member),
        // not just the current user's rows.
        let query = supabase
          .from('workspace_skills')
          .select('skill_id, name, description, instructions, is_custom, enabled');
        query = workspaceId ? query.eq('workspace_id', workspaceId) : query.is('workspace_id', null).eq('user_id', user.id);
        const { data } = await query;
        const rows = (data as SkillRow[] | null) ?? [];

        if (cancelled) return;

        if (rows.length === 0) {
          // Seed default-enabled built-ins on first use
          const seed = DEFAULT_ENABLED.map(id => ({
            user_id: user.id,
            workspace_id: workspaceId ?? null,
            skill_id: id,
            is_custom: false,
            enabled: true,
          }));
          await supabase.from('workspace_skills').upsert(seed, { onConflict: 'workspace_id,skill_id' });
          setEnabledIds(DEFAULT_ENABLED);
          setCustomSkills([]);
        } else {
          setEnabledIds(rows.filter(r => r.enabled).map(r => r.skill_id));
          setCustomSkills(
            rows.filter(r => r.is_custom).map(r => ({
              id: r.skill_id,
              name: r.name || 'Compétence',
              description: r.description || '',
              instructions: r.instructions || '',
              pack: 'Créées par vous',
              builtIn: false,
            }))
          );
        }
      } catch { /* ignore — offline */ }
      finally { if (!cancelled) setLoaded(true); }
    };
    run();
    return () => { cancelled = true; };
  }, [workspaceId]);

  const allSkills: Skill[] = [...ALL_BUILTIN_SKILLS, ...customSkills];
  const isEnabled = (id: string) => enabledIds.includes(id);
  const enabledSkills = allSkills.filter(s => enabledIds.includes(s.id));

  const toggleSkill = useCallback(async (id: string) => {
    const uid = userIdRef.current;
    const willEnable = !enabledIds.includes(id);
    setEnabledIds(prev => willEnable ? [...prev, id] : prev.filter(x => x !== id));
    if (!uid) return;
    const builtIn = ALL_BUILTIN_SKILLS.find(s => s.id === id);
    try {
      const supabase = createClient();
      await supabase.from('workspace_skills').upsert({
        user_id: uid,
        workspace_id: workspaceId ?? null,
        skill_id: id,
        is_custom: !builtIn,
        enabled: willEnable,
        ...(builtIn ? { name: builtIn.name, description: builtIn.description, instructions: builtIn.instructions } : {}),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,skill_id' });
    } catch { /* ignore */ }
  }, [enabledIds, workspaceId]);

  const addCustomSkill = useCallback(async (skill: Omit<Skill, 'id' | 'builtIn'>) => {
    const uid = userIdRef.current;
    const id = `custom-${Date.now().toString(36)}`;
    const newSkill: Skill = { ...skill, id, builtIn: false };
    setCustomSkills(prev => [...prev, newSkill]);
    setEnabledIds(prev => [...prev, id]);
    if (uid) {
      try {
        const supabase = createClient();
        await supabase.from('workspace_skills').upsert({
          user_id: uid,
          workspace_id: workspaceId ?? null,
          skill_id: id,
          name: skill.name,
          description: skill.description,
          instructions: skill.instructions,
          is_custom: true,
          enabled: true,
        }, { onConflict: 'workspace_id,skill_id' });
      } catch { /* ignore */ }
    }
    return newSkill;
  }, [workspaceId]);

  const deleteCustomSkill = useCallback(async (id: string) => {
    setCustomSkills(prev => prev.filter(s => s.id !== id));
    setEnabledIds(prev => prev.filter(x => x !== id));
    try {
      const supabase = createClient();
      // Shared: delete by workspace + skill so any member can remove it
      let del = supabase.from('workspace_skills').delete().eq('skill_id', id);
      del = workspaceId ? del.eq('workspace_id', workspaceId) : del.is('workspace_id', null);
      await del;
    } catch { /* ignore */ }
  }, [workspaceId]);

  return {
    state: { enabledIds, customSkills },
    allSkills,
    enabledSkills,
    isEnabled,
    toggleSkill,
    addCustomSkill,
    deleteCustomSkill,
    loaded,
  };
}
