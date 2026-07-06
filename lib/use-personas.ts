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
  caseStudies: string[];
  faqs: string[];
  callScripts: Record<string, string>;
  emailTemplates: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

function isElectron(): boolean {
  return false;
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
    caseStudies: Array.isArray(row.case_studies) ? row.case_studies : (row.case_studies ? JSON.parse(row.case_studies) : []),
    faqs: Array.isArray(row.faqs) ? row.faqs : (row.faqs ? JSON.parse(row.faqs) : []),
    callScripts: row.call_scripts
      ? (typeof row.call_scripts === 'string' ? JSON.parse(row.call_scripts) : row.call_scripts)
      : {},
    emailTemplates: row.email_templates
      ? (typeof row.email_templates === 'string' ? JSON.parse(row.email_templates) : row.email_templates)
      : {},
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

export function usePersonas(workspaceId: string | undefined) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!workspaceId) { setLoading(false); return; }
    setLoading(true);
    try {
      if (isElectron()) {
        const electronObj = (window as any).electron;
        const rows = await electronObj.dbAll(`SELECT * FROM personas WHERE workspace_id = ? ORDER BY created_at DESC`, [workspaceId]);
        setPersonas(rows.map(mapDbPersona));
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
    const id = typeof crypto !== 'undefined' ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

    if (isElectron()) {
      const persona: Persona = {
        ...data,
        id,
        createdAt: now,
        updatedAt: now,
        caseStudies: data.caseStudies || [],
        faqs: data.faqs || [],
        callScripts: data.callScripts || {},
        emailTemplates: data.emailTemplates || {}
      };
      
      const electronObj = (window as any).electron;
      await electronObj.dbRun(
        `INSERT INTO personas (id, workspace_id, name, description, target_niches, target_cities, scoring_criteria, case_studies, faqs, call_scripts, email_templates, created_at, updated_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_insert')`,
        [id, data.workspaceId, data.name, data.description, JSON.stringify(data.targetNiches), JSON.stringify(data.targetCities), JSON.stringify(data.scoringCriteria), JSON.stringify(data.caseStudies || []), JSON.stringify(data.faqs || []), JSON.stringify(data.callScripts || {}), JSON.stringify(data.emailTemplates || {}), now, now]
      );
      if (electronObj.triggerSync) electronObj.triggerSync();
      
      setPersonas(prev => [persona, ...prev]);
      return persona;
    }

    const supabase = createClient();
    const { data: row, error } = await supabase
      .from('personas')
      .insert({
        id,
        workspace_id: data.workspaceId,
        name: data.name,
        description: data.description,
        target_niches: data.targetNiches,
        target_cities: data.targetCities,
        scoring_criteria: data.scoringCriteria,
        case_studies: data.caseStudies || [],
        faqs: data.faqs || [],
        call_scripts: data.callScripts || {},
        email_templates: data.emailTemplates || {},
        created_at: now,
        updated_at: now
      })
      .select()
      .single();

    if (error || !row) return null;
    const persona = mapDbPersona(row);
    setPersonas(prev => [persona, ...prev]);
    return persona;
  }, []);

  const updatePersona = useCallback(async (id: string, fields: Partial<Omit<Persona, 'id' | 'workspaceId' | 'createdAt'>>) => {
    const now = new Date().toISOString();

    if (isElectron()) {
      const electronObj = (window as any).electron;
      const updates: string[] = ["updated_at = ?", "sync_status = 'pending_update'"];
      const params: any[] = [now];
      
      if (fields.name !== undefined) { updates.push("name = ?"); params.push(fields.name); }
      if (fields.description !== undefined) { updates.push("description = ?"); params.push(fields.description); }
      if (fields.targetNiches !== undefined) { updates.push("target_niches = ?"); params.push(JSON.stringify(fields.targetNiches)); }
      if (fields.targetCities !== undefined) { updates.push("target_cities = ?"); params.push(JSON.stringify(fields.targetCities)); }
      if (fields.scoringCriteria !== undefined) { updates.push("scoring_criteria = ?"); params.push(JSON.stringify(fields.scoringCriteria)); }
      if (fields.caseStudies !== undefined) { updates.push("case_studies = ?"); params.push(JSON.stringify(fields.caseStudies)); }
      if (fields.faqs !== undefined) { updates.push("faqs = ?"); params.push(JSON.stringify(fields.faqs)); }
      if (fields.callScripts !== undefined) { updates.push("call_scripts = ?"); params.push(JSON.stringify(fields.callScripts)); }
      if (fields.emailTemplates !== undefined) { updates.push("email_templates = ?"); params.push(JSON.stringify(fields.emailTemplates)); }
      
      params.push(id);
      await electronObj.dbRun(`UPDATE personas SET ${updates.join(", ")} WHERE id = ?`, params);
      if (electronObj.triggerSync) electronObj.triggerSync();
      
      setPersonas(prev => prev.map(p => p.id === id ? { ...p, ...fields, updatedAt: now } : p));
      return;
    }

    const supabase = createClient();
    const dbFields: Record<string, unknown> = { updated_at: now };
    if (fields.name !== undefined) dbFields.name = fields.name;
    if (fields.description !== undefined) dbFields.description = fields.description;
    if (fields.targetNiches !== undefined) dbFields.target_niches = fields.targetNiches;
    if (fields.targetCities !== undefined) dbFields.target_cities = fields.targetCities;
    if (fields.scoringCriteria !== undefined) dbFields.scoring_criteria = fields.scoringCriteria;
    if (fields.caseStudies !== undefined) dbFields.case_studies = fields.caseStudies;
    if (fields.faqs !== undefined) dbFields.faqs = fields.faqs;
    if (fields.callScripts !== undefined) dbFields.call_scripts = fields.callScripts;
    if (fields.emailTemplates !== undefined) dbFields.email_templates = fields.emailTemplates;
    await supabase.from('personas').update(dbFields).eq('id', id);
    setPersonas(prev => prev.map(p => p.id === id ? { ...p, ...fields, updatedAt: now } : p));
  }, []);

  const deletePersona = useCallback(async (id: string) => {
    if (isElectron()) {
      const electronObj = (window as any).electron;
      await electronObj.dbRun(`UPDATE personas SET sync_status = 'pending_delete' WHERE id = ?`, [id]);
      if (electronObj.triggerSync) electronObj.triggerSync();
      setPersonas(prev => prev.filter(p => p.id !== id));
      return;
    }
    const supabase = createClient();
    await supabase.from('personas').delete().eq('id', id);
    setPersonas(prev => prev.filter(p => p.id !== id));
  }, []);

  return { personas, loading, addPersona, updatePersona, deletePersona, reload: load };
}
