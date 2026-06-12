'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { Lead, Task, Note, AiSuggestion, initialLeads, initialTasks, initialAiSuggestions } from './mock-data';
import { createClient } from './supabase/client';

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
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
    const supabase = createClient();
    try {
      // 1. Fetch leads & notes for the active workspace
      const { data: dbLeads } = await supabase
        .from('leads')
        .select('*')
        .eq('workspace_id', activeWs.id)
        .order('created_at', { ascending: false });

      if (dbLeads && dbLeads.length === 0 && activeWs.isOwner) {
        // Pre-populate DB with mock data for this user
        await populateMockData(currUser.id, activeWs.id);
        
        // Fetch again after population
        const { data: freshLeads } = await supabase
          .from('leads')
          .select('*')
          .eq('workspace_id', activeWs.id)
          .order('created_at', { ascending: false });
        
        const { data: freshNotes } = await supabase
          .from('notes')
          .select('*')
          .eq('workspace_id', activeWs.id)
          .order('created_at', { ascending: true });

        const uiLeads = (freshLeads || []).map(lead => {
          const leadNotes = (freshNotes || []).filter(n => n.lead_id === lead.id);
          return mapDbLeadToUi(lead, leadNotes);
        });
        setLeads(uiLeads);

        // Insert AI suggestions linking correctly to new lead UUIDs
        for (const sug of initialAiSuggestions) {
          const matchingLead = uiLeads.find(l => l.businessName === sug.leadName);
          if (matchingLead) {
            await supabase.from('ai_suggestions').insert({
              lead_id: matchingLead.id,
              user_id: currUser.id,
              workspace_id: activeWs.id,
              action_text: sug.actionText,
              suggested_channel: sug.suggestedChannel,
              reasoning: sug.reasoning,
              draft_prompt: sug.draftPrompt
            });
          }
        }

        // Final load of tasks and suggestions
        const { data: freshTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('workspace_id', activeWs.id)
          .order('created_at', { ascending: false });
        setTasks((freshTasks || []).map(mapDbTaskToUi));

        const { data: freshSuggestions } = await supabase
          .from('ai_suggestions')
          .select('*')
          .eq('workspace_id', activeWs.id);
        setAiSuggestions((freshSuggestions || []).map(s => mapDbSuggestionToUi(s, uiLeads)));
        return;
      }

      const { data: dbNotes } = await supabase
        .from('notes')
        .select('*')
        .eq('workspace_id', activeWs.id)
        .order('created_at', { ascending: true });

      // Combine
      const uiLeads = (dbLeads || []).map(lead => {
        const leadNotes = (dbNotes || []).filter(n => n.lead_id === lead.id);
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

      // 3. Fetch settings for the owner of the active workspace
      const { data: dbSettings } = await supabase
        .from('settings')
        .select('*')
        .eq('user_id', activeWs.owner_id)
        .maybeSingle();

      if (dbSettings) {
        setQuickNote(dbSettings.quick_note || '');
        setFocusTitle(dbSettings.focus_title || 'Objectif principal du jour');
        setFocusItems(dbSettings.focus_items || []);
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

      const uiSuggestions = (dbSuggestions || []).map(s => mapDbSuggestionToUi(s, uiLeads));
      setAiSuggestions(uiSuggestions);

    } catch (e) {
      console.error("Error loading data from Supabase:", e);
    }
  }, [populateMockData]);

  // Load Workspaces List
  const loadWorkspaces = useCallback(async () => {
    try {
      const res = await fetch('/api/workspaces');
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
      }
    } catch (e) {
      console.error("Error loading workspaces:", e);
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
    try {
      const res = await fetch('/api/workspaces', {
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
    try {
      const res = await fetch('/api/workspaces', {
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

  const deleteWorkspace = async (id: string) => {
    if (!user) return;
    try {
      const res = await fetch(`/api/workspaces?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        const updatedList = workspacesList.filter(w => w.id !== id);
        setWorkspacesList(updatedList);
        if (activeWorkspace?.id === id) {
          const fallback = updatedList.find(w => w.isOwner) || updatedList[0] || null;
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
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await loadWorkspaces();
      }
    };
    
    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        loadWorkspaces();
      } else {
        setUser(null);
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

  // Load data whenever activeWorkspace or user changes
  useEffect(() => {
    if (user && activeWorkspace) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData(user, activeWorkspace);
    }
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
  }) => {
    if (!user || !activeWorkspace) return;
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
    const supabase = createClient();

    const currentTask = tasks.find(t => t.id === id);
    if (!currentTask) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ completed: !currentTask.completed })
        .eq('id', id);

      if (error) throw error;

      setTasks(prev => prev.map(t => 
        t.id === id ? { ...t, completed: !t.completed } : t
      ));
    } catch (err) {
      console.error("Error in toggleTask:", err);
    }
  };

  const addTask = async (title: string, category: Task['category']) => {
    if (!user || !activeWorkspace) return;
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
        updateLeadsStatus
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

