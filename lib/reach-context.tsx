'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getApiUrl } from './api-helper';
import { User as SupabaseUser, AuthChangeEvent, Session } from '@supabase/supabase-js';
import { Lead, Task, Note, AiSuggestion, initialLeads, initialTasks } from './mock-data';
import { computeLeadScore } from './lead-scoring';
import { createClient } from './supabase/client';

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  description?: string;
  tag?: string;
  accent_color?: string;
  logo_base64?: string;
  created_at: string;
  isOwner: boolean;
  ownerName: string;
}

interface ReachContextType {
  leads: Lead[];
  tasks: Task[];
  aiSuggestions: AiSuggestion[];
  quickNote: string;
  focusTitle: string;
  focusItems: string[];
  workspacesList: Workspace[];
  activeWorkspace: Workspace | null;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace | null>;
  renameWorkspace: (id: string, name: string) => Promise<void>;
  updateWorkspace: (id: string, fields: Partial<Workspace>) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  addLead: (leadData: {
    businessName: string;
    contactName: string;
    contactEmail?: string;
    niche: string;
    city: string;
    source: string;
    status: Lead['status'];
    temperature: Lead['temperature'];
    nextAction: string;
    nextActionDate: string;
    notes?: string;
  }) => void;
  toggleTask: (id: string) => void;
  addTask: (title: string, category: Task['category']) => void;
  deleteTask: (id: string) => void;
  saveQuickNote: (note: string) => void;
  updateFocus: (title: string, items: string[]) => void;
  updateLead: (leadId: string, fields: Partial<Lead>) => void;
  updateLeadStatus: (leadId: string, status: Lead['status']) => void;
  addNoteToLead: (leadId: string, content: string, type: Note['type']) => void;
  deleteLeads: (ids: string[]) => void;
  updateLeadsStatus: (ids: string[], status: Lead['status']) => void;
  importDemoData: () => Promise<void>;
}

const ReachContext = createContext<ReachContextType | undefined>(undefined);

interface DbLead {
  id: string;
  business_name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  niche?: string | null;
  city?: string | null;
  source?: string | null;
  status: Lead['status'];
  temperature: Lead['temperature'];
  next_action?: string | null;
  next_action_date?: string | null;
  owner?: string | null;
  image_url?: string | null;
  score?: number | null;
  created_at: string;
  updated_at: string;
}

interface DbNote {
  id: string;
  lead_id: string;
  type: Note['type'];
  content: string;
  created_at: string;
}

interface DbTask {
  id: string;
  title: string;
  completed: boolean;
  category: Task['category'];
  due_date?: string | null;
}

interface DbSuggestion {
  id: string;
  lead_id: string;
  action_text: string;
  suggested_channel: AiSuggestion['suggestedChannel'];
  reasoning?: string | null;
  draft_prompt?: string | null;
}

// Mapping database Lead to UI Lead
function mapDbLeadToUi(dbLead: DbLead, dbNotes: DbNote[] = []): Lead {
  return {
    id: dbLead.id,
    businessName: dbLead.business_name,
    contactName: dbLead.contact_name || '',
    contactEmail: dbLead.contact_email || '',
    niche: dbLead.niche || '',
    city: dbLead.city || '',
    source: dbLead.source || '',
    status: dbLead.status,
    temperature: dbLead.temperature,
    nextAction: dbLead.next_action || '',
    nextActionDate: dbLead.next_action_date || '',
    owner: dbLead.owner || 'Moi',
    imageUrl: dbLead.image_url || '',
    score: dbLead.score ?? 0,
    createdAt: dbLead.created_at,
    updatedAt: dbLead.updated_at,
    notes: dbNotes
      .filter(n => n.lead_id === dbLead.id)
      .map(n => ({
        id: n.id,
        leadId: n.lead_id,
        type: n.type,
        content: n.content,
        createdAt: n.created_at
      }))
  };
}

// Mapping database Task to UI Task
function mapDbTaskToUi(dbTask: DbTask): Task {
  return {
    id: dbTask.id,
    title: dbTask.title,
    completed: dbTask.completed,
    category: dbTask.category,
    dueDate: dbTask.due_date || ''
  };
}

// Mapping database suggestion to UI AiSuggestion
function mapDbSuggestionToUi(s: DbSuggestion, leads: Lead[]): AiSuggestion {
  const lead = leads.find(l => l.id === s.lead_id);
  return {
    id: s.id,
    leadId: s.lead_id,
    leadName: lead ? lead.businessName : 'Prospect inconnu',
    actionText: s.action_text,
    suggestedChannel: s.suggested_channel,
    reasoning: s.reasoning || '',
    draftPrompt: s.draft_prompt || ''
  };
}

export function ReachProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [quickNote, setQuickNote] = useState<string>('');
  const [focusTitle, setFocusTitle] = useState<string>('Objectif principal du jour');
  const [focusItems, setFocusItems] = useState<string[]>([
    "Finaliser l'onboarding technique du Cabinet Dentaire Dr. Laurent (contrat signé)",
    "Contacter Jean Dupont (Boulangerie L'Épi d'Or) pour bloquer la date de démonstration",
    "Finaliser et envoyer l'audit SEO pour Michel Martin (Garage du Centre)"
  ]);

  // Workspaces State
  const [workspacesList, setWorkspacesList] = useState<Workspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<Workspace | null>(null);

  const loadDataLocal = useCallback(async (userId: string, workspaceId: string) => {
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (!electronObj) return;

    try {
      const dbLeads = await electronObj.dbAll(
        "SELECT * FROM leads WHERE workspace_id = ? ORDER BY created_at DESC",
        [workspaceId]
      );
      const dbNotes = await electronObj.dbAll(
        "SELECT * FROM notes WHERE workspace_id = ? ORDER BY created_at ASC",
        [workspaceId]
      );

      const uiLeads = (dbLeads || []).map((lead: any) => {
        const leadNotes = (dbNotes || []).filter((n: any) => n.lead_id === lead.id);
        return mapDbLeadToUi(lead, leadNotes);
      });
      setLeads(uiLeads);

      const dbTasks = await electronObj.dbAll(
        "SELECT * FROM tasks WHERE workspace_id = ? ORDER BY created_at DESC",
        [workspaceId]
      );
      const uiTasks = (dbTasks || []).map(mapDbTaskToUi);
      setTasks(uiTasks);

      const dbSettings = await electronObj.dbGet(
        "SELECT * FROM settings WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1",
        [userId]
      );
      if (dbSettings) {
        setQuickNote(dbSettings.quick_note || '');
        setFocusTitle(dbSettings.focus_title || 'Objectif principal du jour');
        setFocusItems(dbSettings.focus_items ? JSON.parse(dbSettings.focus_items) : []);
      }
    } catch (err) {
      console.error("Failed to load local SQLite data in ReachProvider:", err);
    }
  }, []);

  const populateMockData = useCallback(async (userId: string, workspaceId: string) => {
    const supabase = createClient();
    try {
      // Insert default settings if they don't exist
      await supabase.from('settings').upsert({
        user_id: userId,
        full_name: 'Utilisateur Minerva',
        company_name: 'Uprising Studio',
        timezone: 'Europe/Paris'
      });

      // Insert leads with workspace_id
      for (const lead of initialLeads) {
        const { data: insertedLead } = await supabase
          .from('leads')
          .insert({
            user_id: userId,
            workspace_id: workspaceId,
            business_name: lead.businessName,
            contact_name: lead.contactName,
            contact_email: lead.contactEmail,
            niche: lead.niche,
            city: lead.city,
            source: lead.source,
            status: lead.status,
            temperature: lead.temperature,
            next_action: lead.nextAction,
            next_action_date: lead.nextActionDate || null
          })
          .select()
          .single();

        if (insertedLead && lead.notes && lead.notes.length > 0) {
          for (const note of lead.notes) {
            await supabase.from('notes').insert({
              lead_id: insertedLead.id,
              user_id: userId,
              workspace_id: workspaceId,
              type: note.type,
              content: note.content
            });
          }
        }
      }

      // Insert tasks with workspace_id
      for (const task of initialTasks) {
        await supabase.from('tasks').insert({
          user_id: userId,
          workspace_id: workspaceId,
          title: task.title,
          completed: task.completed,
          category: task.category,
          due_date: task.dueDate || null
        });
      }

    } catch (err) {
      console.error("Error populating mock data:", err);
    }
  }, []);

  const loadData = useCallback(async (currUser: SupabaseUser, activeWs: Workspace) => {
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      await loadDataLocal(currUser.id, activeWs.id);
      return;
    }
    const supabase = createClient();
    try {
      // 1. Fetch leads & notes for the active workspace
      const { data: dbLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('workspace_id', activeWs.id)
        .order('created_at', { ascending: false });

      // Auto-population of mock data has been disabled for clean workspaces.
      // Demo data can be imported manually via settings.

      const { data: dbNotes } = await supabase
        .from('notes')
        .select('*')
        .eq('workspace_id', activeWs.id)
        .order('created_at', { ascending: true });

      // Combine
      const uiLeads = (dbLeads || []).map((lead: DbLead) => {
        const leadNotes = (dbNotes || []).filter((n: DbNote) => n.lead_id === lead.id);
        return mapDbLeadToUi(lead, leadNotes);
      });
      setLeads(uiLeads);

      // 2. Fetch tasks
      const { data: dbTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', activeWs.id)
        .order('created_at', { ascending: false });

      const uiTasks = (dbTasks || []).map(mapDbTaskToUi);
      setTasks(uiTasks);

      // 3. Fetch settings for the current user (focus/quicknote are personal, not workspace-wide)
      const { data: dbSettings } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', currUser.id)
        .maybeSingle();

      if (dbSettings) {
        setQuickNote(dbSettings.quick_note || '');
        setFocusTitle(dbSettings.focus_title || 'Objectif principal du jour');
        try {
          setFocusItems(dbSettings.focus_items ? JSON.parse(dbSettings.focus_items) : []);
        } catch {
          setFocusItems([]);
        }
      } else {
        setQuickNote('');
        setFocusTitle('Objectif principal du jour');
        setFocusItems([]);
      }

      // 4. Fetch AI suggestions
      const { data: dbSuggestions } = await supabase
        .from('ai_suggestions')
        .select('*')
        .eq('workspace_id', activeWs.id);

      const uiSuggestions = (dbSuggestions || []).map((s: DbSuggestion) => mapDbSuggestionToUi(s, uiLeads));
      setAiSuggestions(uiSuggestions);

    } catch (e) {
      console.error("Error loading data from Supabase:", e);
    }
  }, []);

  // Load Workspaces List
  const loadWorkspaces = useCallback(async () => {
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        const list = await electronObj.dbAll("SELECT * FROM workspaces WHERE sync_status != 'pending_delete'");
        const currentUser = (await createClient().auth.getUser()).data.user;
        let mappedList = (list || []).map((w: any) => ({
          id: w.id,
          name: w.name,
          owner_id: w.owner_id,
          description: w.description || '',
          tag: w.tag || '',
          accent_color: w.accent_color || '',
          logo_base64: w.logo_base64 || '',
          created_at: w.created_at || new Date().toISOString(),
          isOwner: currentUser ? w.owner_id === currentUser.id : true,
          ownerName: currentUser && w.owner_id === currentUser.id ? 'Vous' : 'Propriétaire'
        }));

        if (mappedList.length === 0 && currentUser) {
          const defaultId = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
          const nowStr = new Date().toISOString();
          await electronObj.dbRun(
            "INSERT INTO workspaces (id, name, owner_id, created_at, sync_status) VALUES (?, ?, ?, ?, 'pending_insert')",
            [defaultId, 'Mon Espace', currentUser.id, nowStr]
          );
          mappedList = [{
            id: defaultId,
            name: 'Mon Espace',
            owner_id: currentUser.id,
            description: '',
            tag: '',
            accent_color: '',
            logo_base64: '',
            created_at: nowStr,
            isOwner: true,
            ownerName: 'Vous'
          }];
          if (electronObj.triggerSync) {
            electronObj.triggerSync();
          }
        }

        setWorkspacesList(mappedList);

        const savedId = localStorage.getItem('minerva_active_workspace_id');
        let active = mappedList.find((w: Workspace) => w.id === savedId);
        if (!active && mappedList.length > 0) {
          active = mappedList.find((w: Workspace) => w.isOwner) || mappedList[0];
        }

        if (active) {
          setActiveWorkspace(active);
          localStorage.setItem('minerva_active_workspace_id', active.id);
        }
      } catch (e) {
        console.error("Error loading local workspaces:", e);
      }
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/workspaces'));
      if (res.ok) {
        const data = await res.json();
        const list = data.workspaces || [];
        setWorkspacesList(list);

        const savedId = localStorage.getItem('minerva_active_workspace_id');
        let active = list.find((w: Workspace) => w.id === savedId);
        if (!active && list.length > 0) {
          active = list.find((w: Workspace) => w.isOwner) || list[0];
        }

        if (active) {
          setActiveWorkspace(active);
          localStorage.setItem('minerva_active_workspace_id', active.id);
        }
      } else if (res.status !== 401) {
        // 401 = session not ready yet, silently skip; log anything else unexpected
        console.error("Error loading workspaces:", res.status, res.statusText);
      }
    } catch {
      // Network error (e.g. server not yet ready, Supabase timeout) — will retry
      // automatically on the next auth state change or workspace switch.
    }
  }, []);

  // Workspace Switcher actions
  const switchWorkspace = async (workspaceId: string) => {
    const ws = workspacesList.find(w => w.id === workspaceId);
    if (ws) {
      setActiveWorkspace(ws);
      localStorage.setItem('minerva_active_workspace_id', ws.id);
      window.dispatchEvent(new Event('minerva_workspace_changed'));
    }
  };

  const createWorkspace = async (name: string): Promise<Workspace | null> => {
    if (!user) return null;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36);
        const nowStr = new Date().toISOString();
        await electronObj.dbRun(
          "INSERT INTO workspaces (id, name, owner_id, created_at, sync_status) VALUES (?, ?, ?, ?, 'pending_insert')",
          [id, name, user.id, nowStr]
        );
        const newWs: Workspace = {
          id,
          name,
          owner_id: user.id,
          created_at: nowStr,
          isOwner: true,
          ownerName: 'Vous'
        };
        setWorkspacesList(prev => [...prev, newWs]);
        
        if (electronObj.triggerSync) {
          electronObj.triggerSync();
        }
        return newWs;
      } catch (e) {
        console.error("Error creating local workspace:", e);
        return null;
      }
    }

    try {
      const res = await fetch(getApiUrl('/api/workspaces'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = await res.json();
        const newWs: Workspace = {
          ...data.workspace,
          isOwner: true,
          ownerName: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Vous'
        };
        setWorkspacesList(prev => [...prev, newWs]);
        return newWs;
      }
    } catch (e) {
      console.error("Error creating workspace:", e);
    }
    return null;
  };

  const renameWorkspace = async (id: string, name: string) => {
    if (!user) return;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        const existing = await electronObj.dbGet("SELECT sync_status FROM workspaces WHERE id = ?", [id]);
        let nextStatus = 'pending_update';
        if (existing && existing.sync_status === 'pending_insert') {
          nextStatus = 'pending_insert';
        }
        await electronObj.dbRun(
          "UPDATE workspaces SET name = ?, sync_status = ? WHERE id = ?",
          [name, nextStatus, id]
        );
        setWorkspacesList(prev => prev.map(w => w.id === id ? { ...w, name } : w));
        if (activeWorkspace?.id === id) {
          setActiveWorkspace(prev => prev ? { ...prev, name } : null);
        }
        if (electronObj.triggerSync) {
          electronObj.triggerSync();
        }
      } catch (e) {
        console.error("Error renaming local workspace:", e);
      }
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/workspaces'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name }),
      });
      if (res.ok) {
        setWorkspacesList(prev => prev.map(w => w.id === id ? { ...w, name } : w));
        if (activeWorkspace?.id === id) {
          setActiveWorkspace(prev => prev ? { ...prev, name } : null);
        }
      }
    } catch (e) {
      console.error("Error renaming workspace:", e);
    }
  };

  const updateWorkspace = async (id: string, fields: Partial<Workspace>) => {
    if (!user) return;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        const existing = await electronObj.dbGet("SELECT sync_status FROM workspaces WHERE id = ?", [id]);
        let nextStatus = 'pending_update';
        if (existing && existing.sync_status === 'pending_insert') {
          nextStatus = 'pending_insert';
        }

        const updates: string[] = [];
        const params: any[] = [];
        Object.entries(fields).forEach(([key, val]) => {
          if (['name', 'description', 'tag', 'accent_color', 'logo_base64'].includes(key)) {
            updates.push(`${key} = ?`);
            params.push(val);
          }
        });

        if (updates.length > 0) {
          updates.push("sync_status = ?");
          params.push(nextStatus);
          params.push(id); // for WHERE id = ?

          await electronObj.dbRun(
            `UPDATE workspaces SET ${updates.join(', ')} WHERE id = ?`,
            params
          );

          setWorkspacesList(prev => prev.map(w => w.id === id ? { ...w, ...fields } : w));
          if (activeWorkspace?.id === id) {
            setActiveWorkspace(prev => prev ? { ...prev, ...fields } : null);
          }
          if (electronObj.triggerSync) {
            electronObj.triggerSync();
          }
        }
      } catch (e) {
        console.error("Error updating local workspace:", e);
      }
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/workspaces'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...fields }),
      });
      if (res.ok) {
        setWorkspacesList(prev => prev.map(w => w.id === id ? { ...w, ...fields } : w));
        if (activeWorkspace?.id === id) {
          setActiveWorkspace(prev => prev ? { ...prev, ...fields } : null);
        }
      }
    } catch (e) {
      console.error("Error updating workspace:", e);
    }
  };

  const deleteWorkspace = async (id: string) => {
    if (!user) return;
    
    const updatedList = workspacesList.filter(w => w.id !== id);
    const fallback = updatedList.find(w => w.isOwner) || updatedList[0] || null;
    
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        if (fallback) {
          await electronObj.dbRun("UPDATE leads SET workspace_id = ?, sync_status = 'pending_update' WHERE workspace_id = ?", [fallback.id, id]);
          await electronObj.dbRun("UPDATE tasks SET workspace_id = ?, sync_status = 'pending_update' WHERE workspace_id = ?", [fallback.id, id]);
          await electronObj.dbRun("UPDATE notes SET workspace_id = ?, sync_status = 'pending_update' WHERE workspace_id = ?", [fallback.id, id]);
          await electronObj.dbRun("UPDATE drafts SET workspace_id = ?, sync_status = 'pending_update' WHERE workspace_id = ?", [fallback.id, id]);
        }

        const existing = await electronObj.dbGet("SELECT sync_status FROM workspaces WHERE id = ?", [id]);
        if (existing && existing.sync_status === 'pending_insert') {
          await electronObj.dbRun("DELETE FROM workspaces WHERE id = ?", [id]);
        } else {
          await electronObj.dbRun("UPDATE workspaces SET sync_status = 'pending_delete' WHERE id = ?", [id]);
        }

        setWorkspacesList(updatedList);
        if (activeWorkspace?.id === id) {
          setActiveWorkspace(fallback);
          if (fallback) {
            localStorage.setItem('minerva_active_workspace_id', fallback.id);
          } else {
            localStorage.removeItem('minerva_active_workspace_id');
          }
        }
        if (electronObj.triggerSync) {
          electronObj.triggerSync();
        }
      } catch (e) {
        console.error("Error deleting local workspace:", e);
      }
      return;
    }

    try {
      if (fallback) {
        const supabase = createClient();
        await supabase.from('leads').update({ workspace_id: fallback.id }).eq('workspace_id', id);
        await supabase.from('tasks').update({ workspace_id: fallback.id }).eq('workspace_id', id);
        await supabase.from('notes').update({ workspace_id: fallback.id }).eq('workspace_id', id);
        await supabase.from('drafts').update({ workspace_id: fallback.id }).eq('workspace_id', id);
      }

      const res = await fetch(getApiUrl(`/api/workspaces?id=${id}`), {
        method: 'DELETE',
      });
      if (res.ok) {
        setWorkspacesList(updatedList);
        if (activeWorkspace?.id === id) {
          setActiveWorkspace(fallback);
          if (fallback) {
            localStorage.setItem('minerva_active_workspace_id', fallback.id);
          } else {
            localStorage.removeItem('minerva_active_workspace_id');
          }
        }
      }
    } catch (e) {
      console.error("Error deleting workspace:", e);
    }
  };

  // Setup initial session loading and workspace fetching
  useEffect(() => {
    const supabase = createClient();
    
    const fetchSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);

          const electronObj = typeof window !== 'undefined' && (window as any).electron;
          if (electronObj && electronObj.setSession) {
            electronObj.setSession({
              accessToken: session.access_token,
              supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
              supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
              userId: session.user.id
            });
          }
          await loadWorkspaces();
        }
      } catch {
        // Auth network error on init (e.g. Supabase unreachable) — session will
        // be recovered via onAuthStateChange when connectivity resumes.
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      const electronObj = typeof window !== 'undefined' && (window as any).electron;
      if (session?.user) {
        setUser(session.user);
        if (electronObj && electronObj.setSession) {
          electronObj.setSession({
            accessToken: session.access_token,
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
            supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            userId: session.user.id
          });
        }
        loadWorkspaces().catch(() => {});
      } else {
        setUser(null);
        if (electronObj && electronObj.setSession) {
          electronObj.setSession(null);
        }
        setLeads([]);
        setTasks([]);
        setAiSuggestions([]);
        setWorkspacesList([]);
        setActiveWorkspace(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadWorkspaces]);

  // Set up Focus Lead listener for Spotlight
  useEffect(() => {
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj && electronObj.onFocusLead) {
      const unsubscribe = electronObj.onFocusLead((leadId: string) => {
        window.dispatchEvent(new CustomEvent('minerva_focus_lead', { detail: { leadId } }));
      });
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }
  }, []);

  // Load data whenever activeWorkspace or user changes
  useEffect(() => {
    if (user && activeWorkspace) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData(user, activeWorkspace);
    }
  }, [user, activeWorkspace, loadData]);

  // Listen to remote changes to refresh data dynamically from SQLite
  useEffect(() => {
    const handleRemoteChange = () => {
      if (user && activeWorkspace) {
        loadData(user, activeWorkspace);
      }
    };
    window.addEventListener('minerva_sync_complete', handleRemoteChange);
    return () => window.removeEventListener('minerva_sync_complete', handleRemoteChange);
  }, [user, activeWorkspace, loadData]);

  const addLead = async (leadData: {
    businessName: string;
    contactName: string;
    contactEmail?: string;
    niche: string;
    city: string;
    source: string;
    status: Lead['status'];
    temperature: Lead['temperature'];
    nextAction: string;
    nextActionDate: string;
    notes?: string;
    imageUrl?: string;
  }) => {
    if (!user || !activeWorkspace) return;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;

    if (electronObj) {
      try {
        const leadId = crypto.randomUUID();
        const nowStr = new Date().toISOString();

        const leadScore = computeLeadScore({
          notes: leadData.notes ? [{ id: '', leadId: leadId, type: 'general', content: leadData.notes, createdAt: nowStr }] : [],
          source: leadData.source
        });

        await electronObj.dbRun(`INSERT INTO leads (id, user_id, business_name, contact_name, contact_email, niche, city, source, status, temperature, next_action, next_action_date, owner, image_url, workspace_id, score, created_at, updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_insert')`,
          [leadId, user.id, leadData.businessName, leadData.contactName, leadData.contactEmail || '', leadData.niche, leadData.city, leadData.source, leadData.status, leadData.temperature, leadData.nextAction, leadData.nextActionDate || null, 'Moi', leadData.imageUrl || null, activeWorkspace.id, leadScore, nowStr, nowStr]
        );

        const insertedNotes: DbNote[] = [];
        if (leadData.notes) {
          const noteId = crypto.randomUUID();
          await electronObj.dbRun(`INSERT INTO notes (id, lead_id, user_id, type, content, workspace_id, created_at, updated_at, sync_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_insert')`,
            [noteId, leadId, user.id, 'general', leadData.notes, activeWorkspace.id, nowStr, nowStr]
          );
          insertedNotes.push({
            id: noteId,
            lead_id: leadId,
            type: 'general',
            content: leadData.notes,
            created_at: nowStr
          });
        }

        const newUiLead = mapDbLeadToUi({
          id: leadId,
          business_name: leadData.businessName,
          contact_name: leadData.contactName,
          contact_email: leadData.contactEmail || '',
          niche: leadData.niche,
          city: leadData.city,
          source: leadData.source,
          status: leadData.status,
          temperature: leadData.temperature,
          next_action: leadData.nextAction,
          next_action_date: leadData.nextActionDate || null,
          owner: 'Moi',
          image_url: leadData.imageUrl || null,
          score: leadScore,
          created_at: nowStr,
          updated_at: nowStr
        }, insertedNotes);

        setLeads(prev => [newUiLead, ...prev]);
        electronObj.triggerSync();
      } catch (err) {
        console.error("Local addLead error:", err);
      }
      return;
    }

    const supabase = createClient();

    try {
      const { data: newDbLead, error: leadError } = await supabase
        .from('leads')
        .insert({
          user_id: user.id,
          workspace_id: activeWorkspace.id,
          business_name: leadData.businessName,
          contact_name: leadData.contactName,
          contact_email: leadData.contactEmail,
          niche: leadData.niche,
          city: leadData.city,
          source: leadData.source,
          status: leadData.status,
          temperature: leadData.temperature,
          next_action: leadData.nextAction,
          next_action_date: leadData.nextActionDate || null,
          image_url: leadData.imageUrl || null,
          owner: 'Moi'
        })
        .select()
        .single();

      if (leadError) throw leadError;

      const insertedNotes: DbNote[] = [];
      if (leadData.notes && newDbLead) {
        const { data: newDbNote, error: noteError } = await supabase
          .from('notes')
          .insert({
            lead_id: newDbLead.id,
            user_id: user.id,
            workspace_id: activeWorkspace.id,
            type: 'general',
            content: leadData.notes
          })
          .select()
          .single();

        if (noteError) throw noteError;

        if (newDbNote) {
          insertedNotes.push(newDbNote as DbNote);
        }
      }

      if (newDbLead) {
        const newUiLead = mapDbLeadToUi(newDbLead, insertedNotes);
        setLeads(prev => [newUiLead, ...prev]);
      }
    } catch (err) {
      console.error("Error in addLead:", err);
    }
  };

  const toggleTask = async (id: string) => {
    if (!user) return;
    const currentTask = tasks.find(t => t.id === id);
    if (!currentTask) return;

    const nextCompleted = !currentTask.completed;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;

    if (electronObj) {
      try {
        const completedInt = nextCompleted ? 1 : 0;
        await electronObj.dbRun(
          "UPDATE tasks SET completed = ?, sync_status = 'pending_update', updated_at = ? WHERE id = ?",
          [completedInt, new Date().toISOString(), id]
        );
        setTasks(prev => prev.map(t => 
          t.id === id ? { ...t, completed: nextCompleted } : t
        ));
        electronObj.triggerSync();
      } catch (err) {
        console.error("Local toggleTask error:", err);
      }
      return;
    }

    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: nextCompleted })
        .eq('id', id);

      if (error) throw error;

      setTasks(prev => prev.map(t => 
        t.id === id ? { ...t, completed: nextCompleted } : t
      ));
    } catch (err) {
      console.error("Error in toggleTask:", err);
    }
  };

  const addTask = async (title: string, category: Task['category']) => {
    if (!user || !activeWorkspace) return;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;

    if (electronObj) {
      try {
        const taskId = crypto.randomUUID();
        const nowStr = new Date().toISOString();
        const dueDate = nowStr.split('T')[0];

        await electronObj.dbRun(
          `INSERT INTO tasks (id, user_id, title, completed, category, due_date, workspace_id, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, 'pending_insert')`,
          [taskId, user.id, title, category, dueDate, activeWorkspace.id, nowStr, nowStr]
        );

        const newUiTask: Task = {
          id: taskId,
          title,
          completed: false,
          category,
          dueDate
        };

        setTasks(prev => [newUiTask, ...prev]);
        electronObj.triggerSync();
      } catch (err) {
        console.error("Local addTask error:", err);
      }
      return;
    }

    const supabase = createClient();
    try {
      const { data: newDbTask, error } = await supabase
        .from('tasks')
        .insert({
          user_id: user.id,
          workspace_id: activeWorkspace.id,
          title,
          category,
          due_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;

      if (newDbTask) {
        setTasks(prev => [mapDbTaskToUi(newDbTask), ...prev]);
      }
    } catch (err) {
      console.error("Error in addTask:", err);
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;

    if (electronObj) {
      try {
        const existing = await electronObj.dbGet("SELECT sync_status FROM tasks WHERE id = ?", [id]);
        if (existing && existing.sync_status === 'pending_insert') {
          await electronObj.dbRun("DELETE FROM tasks WHERE id = ?", [id]);
        } else {
          await electronObj.dbRun("UPDATE tasks SET sync_status = 'pending_delete' WHERE id = ?", [id]);
        }
        setTasks(prev => prev.filter(t => t.id !== id));
        electronObj.triggerSync();
      } catch (err) {
        console.error("Local deleteTask error:", err);
      }
      return;
    }

    const supabase = createClient();
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTasks(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error("Error in deleteTask:", err);
    }
  };

  const saveQuickNote = async (note: string) => {
    setQuickNote(note);
    if (!user || !activeWorkspace) return;

    // Only allow owner to modify settings
    if (!activeWorkspace.isOwner) return;

    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        await electronObj.dbRun(`INSERT INTO settings (user_id, quick_note, updated_at, sync_status)
          VALUES (?, ?, ?, 'pending_update')
          ON CONFLICT(user_id) DO UPDATE SET
            quick_note = excluded.quick_note,
            updated_at = excluded.updated_at,
            sync_status = 'pending_update'`,
          [user.id, note, new Date().toISOString()]
        );
        electronObj.triggerSync();
      } catch (err) {
        console.error("Local saveQuickNote error:", err);
      }
      return;
    }

    const supabase = createClient();
    try {
      await supabase
        .from('settings')
        .upsert({
          user_id: user.id,
          quick_note: note
        });
    } catch (err) {
      console.error("Error in saveQuickNote:", err);
    }
  };

  const updateFocus = async (title: string, items: string[]) => {
    setFocusTitle(title);
    setFocusItems(items);
    if (!user || !activeWorkspace) return;

    // Only allow owner to modify settings
    if (!activeWorkspace.isOwner) return;

    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        await electronObj.dbRun(`INSERT INTO settings (user_id, focus_title, focus_items, updated_at, sync_status)
          VALUES (?, ?, ?, ?, 'pending_update')
          ON CONFLICT(user_id) DO UPDATE SET
            focus_title = excluded.focus_title,
            focus_items = excluded.focus_items,
            updated_at = excluded.updated_at,
            sync_status = 'pending_update'`,
          [user.id, title, JSON.stringify(items), new Date().toISOString()]
        );
        electronObj.triggerSync();
      } catch (err) {
        console.error("Local updateFocus error:", err);
      }
      return;
    }

    const supabase = createClient();
    try {
      await supabase
        .from('settings')
        .upsert({
          user_id: user.id,
          focus_title: title,
          focus_items: items
        });
    } catch (err) {
      console.error("Error in updateFocus:", err);
    }
  };

  const updateLead = async (leadId: string, fields: Partial<Lead>) => {
    if (!user) return;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        const dbFields: string[] = [];
        const params: any[] = [];
        
        if (fields.businessName !== undefined) { dbFields.push("business_name = ?"); params.push(fields.businessName); }
        if (fields.contactName !== undefined) { dbFields.push("contact_name = ?"); params.push(fields.contactName); }
        if (fields.contactEmail !== undefined) { dbFields.push("contact_email = ?"); params.push(fields.contactEmail); }
        if (fields.niche !== undefined) { dbFields.push("niche = ?"); params.push(fields.niche); }
        if (fields.city !== undefined) { dbFields.push("city = ?"); params.push(fields.city); }
        if (fields.source !== undefined) { dbFields.push("source = ?"); params.push(fields.source); }
        if (fields.status !== undefined) { dbFields.push("status = ?"); params.push(fields.status); }
        if (fields.temperature !== undefined) { dbFields.push("temperature = ?"); params.push(fields.temperature); }
        if (fields.nextAction !== undefined) { dbFields.push("next_action = ?"); params.push(fields.nextAction); }
        if (fields.nextActionDate !== undefined) { dbFields.push("next_action_date = ?"); params.push(fields.nextActionDate || null); }
        if (fields.imageUrl !== undefined) { dbFields.push("image_url = ?"); params.push(fields.imageUrl || null); }

        if (dbFields.length > 0) {
          dbFields.push("updated_at = ?");
          params.push(new Date().toISOString());
          dbFields.push("sync_status = 'pending_update'");
          params.push(leadId);
          await electronObj.dbRun(`UPDATE leads SET ${dbFields.join(", ")} WHERE id = ?`, params);
        }

        setLeads(prev => prev.map(lead => 
          lead.id === leadId ? { ...lead, ...fields, updatedAt: new Date().toISOString() } : lead
        ));
        electronObj.triggerSync();
      } catch (err) {
        console.error("Local updateLead error:", err);
      }
      return;
    }

    const supabase = createClient();

    const dbFields: Record<string, string | boolean | null | undefined> = {};
    if (fields.businessName !== undefined) dbFields.business_name = fields.businessName;
    if (fields.contactName !== undefined) dbFields.contact_name = fields.contactName;
    if (fields.contactEmail !== undefined) dbFields.contact_email = fields.contactEmail;
    if (fields.niche !== undefined) dbFields.niche = fields.niche;
    if (fields.city !== undefined) dbFields.city = fields.city;
    if (fields.source !== undefined) dbFields.source = fields.source;
    if (fields.status !== undefined) dbFields.status = fields.status;
    if (fields.temperature !== undefined) dbFields.temperature = fields.temperature;
    if (fields.nextAction !== undefined) dbFields.next_action = fields.nextAction;
    if (fields.nextActionDate !== undefined) dbFields.next_action_date = fields.nextActionDate || null;
    if (fields.imageUrl !== undefined) dbFields.image_url = fields.imageUrl || null;

    try {
      const { error } = await supabase
        .from('leads')
        .update(dbFields)
        .eq('id', leadId);

      if (error) throw error;

      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, ...fields, updatedAt: new Date().toISOString() } : lead
      ));
    } catch (err) {
      console.error("Error in updateLead:", err);
    }
  };

  const updateLeadStatus = async (leadId: string, status: Lead['status']) => {
    await updateLead(leadId, { status });
  };

  const deleteLeads = async (ids: string[]) => {
    if (!user) return;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        for (const id of ids) {
          const existing = await electronObj.dbGet("SELECT sync_status FROM leads WHERE id = ?", [id]);
          if (existing && existing.sync_status === 'pending_insert') {
            await electronObj.dbRun("DELETE FROM leads WHERE id = ?", [id]);
            await electronObj.dbRun("DELETE FROM notes WHERE lead_id = ?", [id]);
          } else {
            await electronObj.dbRun("UPDATE leads SET sync_status = 'pending_delete' WHERE id = ?", [id]);
          }
        }
        setLeads(prev => prev.filter(lead => !ids.includes(lead.id)));
        electronObj.triggerSync();
      } catch (err) {
        console.error("Local deleteLeads error:", err);
      }
      return;
    }

    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', ids);

      if (error) throw error;

      setLeads(prev => prev.filter(lead => !ids.includes(lead.id)));
    } catch (err) {
      console.error("Error in deleteLeads:", err);
    }
  };

  const updateLeadsStatus = async (ids: string[], status: Lead['status']) => {
    if (!user) return;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        for (const id of ids) {
          await electronObj.dbRun("UPDATE leads SET status = ?, sync_status = 'pending_update', updated_at = ? WHERE id = ?", [status, new Date().toISOString(), id]);
        }
        setLeads(prev => prev.map(lead => 
          ids.includes(lead.id) ? { ...lead, status, updatedAt: new Date().toISOString() } : lead
        ));
        electronObj.triggerSync();
      } catch (err) {
        console.error("Local updateLeadsStatus error:", err);
      }
      return;
    }

    const supabase = createClient();

    try {
      const { error } = await supabase
        .from('leads')
        .update({ status })
        .in('id', ids);

      if (error) throw error;

      setLeads(prev => prev.map(lead => 
        ids.includes(lead.id) ? { ...lead, status, updatedAt: new Date().toISOString() } : lead
      ));
    } catch (err) {
      console.error("Error in updateLeadsStatus:", err);
    }
  };

  const addNoteToLead = async (leadId: string, content: string, type: Note['type']) => {
    if (!user || !activeWorkspace) return;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        const noteId = crypto.randomUUID();
        const nowStr = new Date().toISOString();
        await electronObj.dbRun(`INSERT INTO notes (id, lead_id, user_id, type, content, workspace_id, created_at, updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending_insert')`,
          [noteId, leadId, user.id, type, content, activeWorkspace.id, nowStr, nowStr]
        );

        const newUiNote: Note = {
          id: noteId,
          leadId,
          type,
          content,
          createdAt: nowStr
        };

        setLeads(prev => prev.map(lead => {
          if (lead.id === leadId) {
            return {
              ...lead,
              notes: [...lead.notes, newUiNote],
              updatedAt: nowStr
            };
          }
          return lead;
        }));
        electronObj.triggerSync();
      } catch (err) {
        console.error("Local addNoteToLead error:", err);
      }
      return;
    }

    const supabase = createClient();

    try {
      const { data: newDbNote, error } = await supabase
        .from('notes')
        .insert({
          lead_id: leadId,
          user_id: user.id,
          workspace_id: activeWorkspace.id,
          type,
          content
        })
        .select()
        .single();

      if (error) throw error;

      if (newDbNote) {
        const newUiNote: Note = {
          id: newDbNote.id,
          leadId: newDbNote.lead_id,
          type: newDbNote.type,
          content: newDbNote.content,
          createdAt: newDbNote.created_at
        };

        setLeads(prev => prev.map(lead => {
          if (lead.id === leadId) {
            return {
              ...lead,
              notes: [...lead.notes, newUiNote],
              updatedAt: new Date().toISOString()
            };
          }
          return lead;
        }));
      }
    } catch (err) {
      console.error("Error in addNoteToLead:", err);
    }
  };

  const importDemoData = async () => {
    if (!user || !activeWorkspace) return;
    await populateMockData(user.id, activeWorkspace.id);
    await loadData(user, activeWorkspace);
  };

  return (
    <ReachContext.Provider
      value={{
        leads,
        tasks,
        aiSuggestions,
        quickNote,
        focusTitle,
        focusItems,
        workspacesList,
        activeWorkspace,
        switchWorkspace,
        createWorkspace,
        renameWorkspace,
        updateWorkspace,
        deleteWorkspace,
        addLead,
        toggleTask,
        addTask,
        deleteTask,
        saveQuickNote,
        updateFocus,
        updateLead,
        updateLeadStatus,
        addNoteToLead,
        deleteLeads,
        updateLeadsStatus,
        importDemoData
      }}
    >
      {children}
    </ReachContext.Provider>
  );
}

export function useReach() {
  const context = useContext(ReachContext);
  if (!context) {
    throw new Error('useReach must be used within a ReachProvider');
  }
  return context;
}

