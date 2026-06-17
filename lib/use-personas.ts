'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from './supabase/client';
import type { ScoringCriteria } from './lead-scoring';
import { DEFAULT_SCORING } from './lead-scoring';

export type { ScoringCriteria };
export { DEFAULT_SCORING };

export interface Persona {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  targetNiches: string[];
  targetCities: string[];
  scoringCriteria: ScoringCriteria;
  createdAt: string;
  updatedAt: string;
}

const LS_KEY = 'minerva_personas_v1';

function isElectron(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electron;
}

function mapDbPersona(row: Record<string, any>): Persona {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    description: row.description ?? '',
    targetNiches: Array.isArray(row.target_niches) ? row.target_niches : (row.target_niches ? JSON.parse(row.target_niches) : []),
    targetCities: Array.isArray(row.target_cities) ? row.target_cities : (row.target_cities ? JSON.parse(row.target_cities) : []),
    scoringCriteria: row.scoring_criteria
      ? (typeof row.scoring_criteria === 'string' ? JSON.parse(row.scoring_criteria) : row.scoring_criteria)
      : DEFAULT_SCORING,
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

export function usePersonas(workspaceId: string | undefined) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  const saveToLocalStorage = useCallback((updated: Persona[]) => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const all: Persona[] = raw ? JSON.parse(raw) : [];
      const others = all.filter(p => p.workspaceId !== workspaceId);
      localStorage.setItem(LS_KEY, JSON.stringify([...others, ...updated]));
    } catch { /* ignore */ }
  }, [workspaceId]);

  const load = useCallback(async () => {
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);
    try {
      if (isElectron()) {
        const raw = localStorage.getItem(LS_KEY);
        const all: Persona[] = raw ? JSON.parse(raw) : [];
        setPersonas(all.filter(p => p.workspaceId === workspaceId));
      } else {
        const supabase = createClient();
        const { data } = await supabase
          .from('personas')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });
        setPersonas((data ?? []).map(mapDbPersona));
      }
    } catch { /* silently fail */ }
    finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { load(); }, [load]);

  const addPersona = useCallback(async (data: Omit<Persona, 'id' | 'createdAt' | 'updatedAt'>): Promise<Persona | null> => {
    const now = new Date().toISOString();

    if (isElectron()) {
      const persona: Persona = {
        ...data,
        id: typeof crypto !== 'undefined' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
        createdAt: now,
        updatedAt: now,
      };
      const next = [persona, ...personas];
      saveToLocalStorage(next);
      setPersonas(next);
      return persona;
    }

    const supabase = createClient();
    const { data: row, error } = await supabase
      .from('personas')
      .insert({
        workspace_id: data.workspaceId,
        name: data.name,
        description: data.description,
        target_niches: data.targetNiches,
        target_cities: data.targetCities,
        scoring_criteria: data.scoringCriteria,
      })
      .select()
      .single();

    if (error || !row) return null;
    const persona = mapDbPersona(row);
    setPersonas(prev => [persona, ...prev]);
    return persona;
  }, [personas, saveToLocalStorage]);

  const updatePersona = useCallback(async (id: string, fields: Partial<Omit<Persona, 'id' | 'workspaceId' | 'createdAt'>>) => {
    const now = new Date().toISOString();

    if (isElectron()) {
      const next = personas.map(p => p.id === id ? { ...p, ...fields, updatedAt: now } : p);
      saveToLocalStorage(next);
      setPersonas(next);
      return;
    }

    const supabase = createClient();
    const dbFields: Record<string, unknown> = { updated_at: now };
    if (fields.name !== undefined) dbFields.name = fields.name;
    if (fields.description !== undefined) dbFields.description = fields.description;
    if (fields.targetNiches !== undefined) dbFields.target_niches = fields.targetNiches;
    if (fields.targetCities !== undefined) dbFields.target_cities = fields.targetCities;
    if (fields.scoringCriteria !== undefined) dbFields.scoring_criteria = fields.scoringCriteria;
    await supabase.from('personas').update(dbFields).eq('id', id);
    setPersonas(prev => prev.map(p => p.id === id ? { ...p, ...fields, updatedAt: now } : p));
  }, [personas, saveToLocalStorage]);

  const deletePersona = useCallback(async (id: string) => {
    if (isElectron()) {
      const next = personas.filter(p => p.id !== id);
      saveToLocalStorage(next);
      setPersonas(next);
      return;
    }
    const supabase = createClient();
    await supabase.from('personas').delete().eq('id', id);
    setPersonas(prev => prev.filter(p => p.id !== id));
  }, [personas, saveToLocalStorage]);

  return { personas, loading, addPersona, updatePersona, deletePersona, reload: load };
}
