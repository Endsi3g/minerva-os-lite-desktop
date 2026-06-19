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

export interface AppNotification {
  id: string;
  userId: string;
  workspaceId: string;
  type: 'info' | 'lead_assigned' | 'overdue' | 'digest' | 'report' | 'team_message';
  title: string;
  body: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMessage {
  id: string;
  workspaceId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface Project {
  id: string;
  workspaceId: string;
  ownerId: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Campaign {
  id: string;
  workspaceId: string;
  userId: string;
  name: string;
  description?: string;
  niches: string[];
  cities: string[];
  status: 'active' | 'paused' | 'completed' | 'draft';
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
  personaId?: string;
  sequenceConfig?: string;
  goals?: string;
  playbookRunId?: string;
}

export interface Goal {
  id: string;
  workspaceId: string;
  userId: string;
  metric: 'leads_created' | 'leads_contacted' | 'leads_won' | 'emails_sent';
  target: number;
  period: 'week' | 'month';
  createdAt: string;
  updatedAt: string;
}

interface ReachContextType {
  user: SupabaseUser | null;
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
    website?: string;
    rating?: number;
    reviewsCount?: number;
    mapsUrl?: string;
    photos?: string[];
    socialLinks?: Record<string, string>;
    assignedTo?: string;
  }) => void;
  toggleTask: (id: string) => void;
  addTask: (title: string, category: Task['category'], dueDate?: string) => void;
  deleteTask: (id: string) => void;
  updateTask: (id: string, fields: { title?: string; dueDate?: string; category?: Task['category'] }) => void;
  saveQuickNote: (note: string) => void;
  updateFocus: (title: string, items: string[]) => void;
  updateLead: (leadId: string, fields: Partial<Lead>) => void;
  updateLeadStatus: (leadId: string, status: Lead['status']) => void;
  addNoteToLead: (leadId: string, content: string, type: Note['type']) => void;
  deleteLeads: (ids: string[]) => void;
  updateLeadsStatus: (ids: string[], status: Lead['status']) => void;
  importDemoData: () => Promise<void>;
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (notif: Omit<AppNotification, 'id' | 'isRead' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  teamMessages: TeamMessage[];
  sendTeamMessage: (content: string) => Promise<void>;
  projects: Project[];
  createProject: (name: string, description?: string) => Promise<Project | null>;
  renameProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  campaigns: Campaign[];
  addCampaign: (data: {
    name: string;
    description?: string;
    niches?: string[];
    cities?: string[];
    startDate?: string;
    endDate?: string;
    personaId?: string;
    sequenceConfig?: string;
    goals?: string;
    playbookRunId?: string;
  }) => Promise<Campaign | null>;
  updateCampaign: (id: string, fields: Partial<Campaign>) => Promise<void>;
  deleteCampaign: (id: string) => Promise<void>;
  goals: Goal[];
  addGoal: (data: { metric: Goal['metric']; target: number; period: Goal['period'] }) => Promise<Goal | null>;
  updateGoal: (id: string, fields: Partial<Pick<Goal, 'target' | 'period'>>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
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
  // Enrichment fields
  website?: string | null;
  rating?: number | null;
  reviews_count?: number | null;
  maps_url?: string | null;
  photos?: string | null;     // JSON string in SQLite, jsonb in Supabase
  social_links?: string | null; // JSON string in SQLite, jsonb in Supabase
  assigned_to?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  fit_score?: number | null;
  intent_score?: number | null;
  bant_budget?: number | null;
  bant_authority?: number | null;
  bant_need?: number | null;
  bant_timing?: number | null;
  suggested_emails?: string | null;
  decision_maker_name?: string | null;
  decision_maker_role?: string | null;
  deal_amount?: number | null;
  deal_probability?: number | null;
  deal_closing_date?: string | null;
  campaign_id?: string | null;
  last_activity_at?: string | null;
  reply_detected_at?: string | null;
  gmail_thread_id?: string | null;
  reply_status?: 'positive' | 'followup' | 'negative' | null;
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
  let photos: string[] = [];
  let socialLinks: Record<string, string> = {};
  try { photos = dbLead.photos ? JSON.parse(dbLead.photos as string) : []; } catch { photos = []; }
  try { socialLinks = dbLead.social_links ? JSON.parse(dbLead.social_links as string) : {}; } catch { socialLinks = {}; }

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
    website: dbLead.website || undefined,
    rating: dbLead.rating ?? undefined,
    reviewsCount: dbLead.reviews_count ?? undefined,
    mapsUrl: dbLead.maps_url || undefined,
    photos,
    socialLinks,
    assignedTo: dbLead.assigned_to || undefined,
    latitude: dbLead.latitude ?? undefined,
    longitude: dbLead.longitude ?? undefined,
    fitScore: dbLead.fit_score ?? undefined,
    intentScore: dbLead.intent_score ?? undefined,
    bantBudget: Boolean(dbLead.bant_budget),
    bantAuthority: Boolean(dbLead.bant_authority),
    bantNeed: Boolean(dbLead.bant_need),
    bantTiming: Boolean(dbLead.bant_timing),
    suggestedEmails: (() => { try { return dbLead.suggested_emails ? JSON.parse(dbLead.suggested_emails as string) : undefined; } catch { return undefined; } })(),
    decisionMakerName: dbLead.decision_maker_name || undefined,
    decisionMakerRole: dbLead.decision_maker_role || undefined,
    dealAmount: dbLead.deal_amount ?? undefined,
    dealProbability: dbLead.deal_probability ?? undefined,
    dealClosingDate: dbLead.deal_closing_date || undefined,
    campaignId: dbLead.campaign_id || undefined,
    lastActivityAt: dbLead.last_activity_at || undefined,
    replyDetectedAt: dbLead.reply_detected_at || undefined,
    gmailThreadId: dbLead.gmail_thread_id || undefined,
    replyStatus: (dbLead.reply_status as Lead['replyStatus']) ?? null,
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

// Mapping database notification to UI AppNotification
function mapDbNotifToUi(r: any): AppNotification {
  return {
    id: r.id,
    userId: r.user_id,
    workspaceId: r.workspace_id || '',
    type: r.type || 'info',
    title: r.title || '',
    body: r.body || '',
    link: r.link || undefined,
    isRead: Boolean(r.is_read),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Mapping database team_message to UI TeamMessage
function mapDbMsgToUi(r: any): TeamMessage {
  return {
    id: r.id,
    workspaceId: r.workspace_id || '',
    senderId: r.sender_id || '',
    senderName: r.sender_name || 'Membre',
    content: r.content || '',
    createdAt: r.created_at,
  };
}

// Mapping database project to UI Project
function mapDbCampaignToUi(r: any): Campaign {
  let niches: string[] = [];
  let cities: string[] = [];
  try { niches = typeof r.niches === 'string' ? JSON.parse(r.niches) : (Array.isArray(r.niches) ? r.niches : []); } catch { niches = []; }
  try { cities = typeof r.cities === 'string' ? JSON.parse(r.cities) : (Array.isArray(r.cities) ? r.cities : []); } catch { cities = []; }
  
  let sequenceConfig = r.sequence_config;
  if (sequenceConfig && typeof sequenceConfig !== 'string') {
    try { sequenceConfig = JSON.stringify(sequenceConfig); } catch { sequenceConfig = undefined; }
  }
  let goals = r.goals;
  if (goals && typeof goals !== 'string') {
    try { goals = JSON.stringify(goals); } catch { goals = undefined; }
  }

  return {
    id: r.id,
    workspaceId: r.workspace_id || '',
    userId: r.user_id || '',
    name: r.name || '',
    description: r.description || undefined,
    niches,
    cities,
    status: r.status || 'active',
    startDate: r.start_date || undefined,
    endDate: r.end_date || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    personaId: r.persona_id || undefined,
    sequenceConfig: sequenceConfig || undefined,
    goals: goals || undefined,
    playbookRunId: r.playbook_run_id || undefined,
  };
}

function mapDbProjectToUi(r: any): Project {
  return {
    id: r.id,
    workspaceId: r.workspace_id || '',
    ownerId: r.owner_id || '',
    name: r.name || '',
    description: r.description || undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapDbGoalToUi(r: any): Goal {
  return {
    id: r.id,
    workspaceId: r.workspace_id || '',
    userId: r.user_id || '',
    metric: r.metric || 'leads_created',
    target: r.target || 0,
    period: r.period || 'month',
    createdAt: r.created_at,
    updatedAt: r.updated_at,
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

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // Team Messages State
  const [teamMessages, setTeamMessages] = useState<TeamMessage[]>([]);

  // Projects State
  const [projects, setProjects] = useState<Project[]>([]);

  // Campaigns State
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);

  const loadDataLocal = useCallback(async (userId: string, workspaceId: string) => {
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (!electronObj) return;

    try {
      // All IPC calls in parallel — no round-trip sequencing overhead
      const [dbLeads, dbNotes, dbTasks, dbSettings, dbNotifs, dbMsgs, dbProjects, dbCampaigns, dbGoals] = await Promise.all([
        electronObj.dbAll("SELECT * FROM leads WHERE workspace_id = ? ORDER BY created_at DESC", [workspaceId]),
        electronObj.dbAll("SELECT * FROM notes WHERE workspace_id = ? ORDER BY created_at ASC", [workspaceId]),
        electronObj.dbAll("SELECT * FROM tasks WHERE workspace_id = ? ORDER BY created_at DESC", [workspaceId]),
        electronObj.dbGet("SELECT * FROM settings WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1", [userId]),
        electronObj.dbAll("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30", [userId]),
        electronObj.dbAll("SELECT * FROM team_messages WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 50", [workspaceId]),
        electronObj.dbAll("SELECT * FROM projects WHERE workspace_id = ? ORDER BY created_at DESC", [workspaceId]),
        electronObj.dbAll("SELECT * FROM campaigns WHERE workspace_id = ? ORDER BY created_at DESC", [workspaceId]),
        electronObj.dbAll("SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC", [userId]),
      ]);

      const uiLeads = (dbLeads || []).map((lead: any) => {
        const leadNotes = (dbNotes || []).filter((n: any) => n.lead_id === lead.id);
        return mapDbLeadToUi(lead, leadNotes);
      });
      setLeads(uiLeads);
      setTasks((dbTasks || []).map(mapDbTaskToUi));

      if (dbSettings) {
        setQuickNote(dbSettings.quick_note || '');
        setFocusTitle(dbSettings.focus_title || 'Objectif principal du jour');
        setFocusItems(dbSettings.focus_items ? JSON.parse(dbSettings.focus_items) : []);
      }

      setNotifications((dbNotifs || []).map(mapDbNotifToUi));
      setTeamMessages(((dbMsgs || []) as any[]).map(mapDbMsgToUi).reverse());
      setProjects((dbProjects || []).map(mapDbProjectToUi));
      setCampaigns((dbCampaigns || []).map(mapDbCampaignToUi));
      setGoals((dbGoals || []).map(mapDbGoalToUi));
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
      // All 7 queries fired in parallel — one network round-trip instead of 7 sequential
      const [
        { data: dbLeads },
        { data: dbNotes },
        { data: dbTasks },
        { data: dbSettings },
        { data: dbSuggestions },
        { data: dbNotifs },
        { data: dbMsgs },
        { data: dbProjects },
        { data: dbCampaigns },
        { data: dbGoals },
      ] = await Promise.all([
        supabase.from('leads').select('*').eq('workspace_id', activeWs.id).order('created_at', { ascending: false }),
        supabase.from('notes').select('*').eq('workspace_id', activeWs.id).order('created_at', { ascending: true }),
        supabase.from('tasks').select('*').eq('workspace_id', activeWs.id).order('created_at', { ascending: false }),
        supabase.from('settings').select('*').eq('user_id', currUser.id).maybeSingle(),
        supabase.from('ai_suggestions').select('*').eq('workspace_id', activeWs.id),
        supabase.from('notifications').select('*').eq('user_id', currUser.id).order('created_at', { ascending: false }).limit(30),
        supabase.from('team_messages').select('*').eq('workspace_id', activeWs.id).order('created_at', { ascending: false }).limit(50),
        supabase.from('projects').select('*').eq('workspace_id', activeWs.id).order('created_at', { ascending: false }),
        supabase.from('campaigns').select('*').eq('workspace_id', activeWs.id).order('created_at', { ascending: false }),
        supabase.from('goals').select('*').eq('user_id', currUser.id).order('created_at', { ascending: false }),
      ]);

      const uiLeads = (dbLeads || []).map((lead: DbLead) => {
        const leadNotes = (dbNotes || []).filter((n: DbNote) => n.lead_id === lead.id);
        return mapDbLeadToUi(lead, leadNotes);
      });
      setLeads(uiLeads);
      setTasks((dbTasks || []).map(mapDbTaskToUi));

      if (dbSettings) {
        setQuickNote(dbSettings.quick_note || '');
        setFocusTitle(dbSettings.focus_title || 'Objectif principal du jour');
        try { setFocusItems(dbSettings.focus_items ? JSON.parse(dbSettings.focus_items) : []); } catch { setFocusItems([]); }
      } else {
        setQuickNote('');
        setFocusTitle('Objectif principal du jour');
        setFocusItems([]);
      }

      setAiSuggestions((dbSuggestions || []).map((s: DbSuggestion) => mapDbSuggestionToUi(s, uiLeads)));
      if (dbNotifs) setNotifications(dbNotifs.map(mapDbNotifToUi));
      if (dbMsgs) setTeamMessages(dbMsgs.map(mapDbMsgToUi).reverse());
      if (dbProjects) setProjects(dbProjects.map(mapDbProjectToUi));
      if (dbCampaigns) setCampaigns(dbCampaigns.map(mapDbCampaignToUi));
      if (dbGoals) setGoals(dbGoals.map(mapDbGoalToUi));

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
    website?: string;
    rating?: number;
    reviewsCount?: number;
    mapsUrl?: string;
    photos?: string[];
    socialLinks?: Record<string, string>;
    assignedTo?: string;
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

        await electronObj.dbRun(`INSERT INTO leads (id, user_id, business_name, contact_name, contact_email, niche, city, source, status, temperature, next_action, next_action_date, owner, image_url, workspace_id, score, website, rating, reviews_count, maps_url, photos, social_links, assigned_to, created_at, updated_at, sync_status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_insert')`,
          [leadId, user.id, leadData.businessName, leadData.contactName, leadData.contactEmail || '', leadData.niche, leadData.city, leadData.source, leadData.status, leadData.temperature, leadData.nextAction, leadData.nextActionDate || null, 'Moi', leadData.imageUrl || null, activeWorkspace.id, leadScore, leadData.website || null, leadData.rating ?? null, leadData.reviewsCount ?? null, leadData.mapsUrl || null, leadData.photos ? JSON.stringify(leadData.photos) : null, leadData.socialLinks ? JSON.stringify(leadData.socialLinks) : null, leadData.assignedTo || null, nowStr, nowStr]
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
          updated_at: nowStr,
          website: leadData.website || null,
          rating: leadData.rating ?? null,
          reviews_count: leadData.reviewsCount ?? null,
          maps_url: leadData.mapsUrl || null,
          photos: leadData.photos ? JSON.stringify(leadData.photos) : null,
          social_links: leadData.socialLinks ? JSON.stringify(leadData.socialLinks) : null,
          assigned_to: leadData.assignedTo || null
        }, insertedNotes);

        setLeads(prev => [newUiLead, ...prev]);
        electronObj.triggerSync();
      } catch (err) {
        console.error("Local addLead error:", err);
      }
      return;
    }

    const supabase = createClient();

    const corePayload = {
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
      owner: 'Moi',
    };

    const enrichedPayload = {
      ...corePayload,
      website: leadData.website || null,
      rating: leadData.rating ?? null,
      reviews_count: leadData.reviewsCount ?? null,
      maps_url: leadData.mapsUrl || null,
      photos: leadData.photos || null,
      social_links: leadData.socialLinks || null,
      assigned_to: leadData.assignedTo || null,
    };

    try {
      // First attempt: full payload (requires enriched columns in schema)
      let { data: newDbLead, error: leadError } = await supabase
        .from('leads')
        .insert(enrichedPayload)
        .select()
        .single();

      if (leadError) {
        // Enriched columns might not exist in the live schema — retry with core only
        console.warn('addLead enriched insert failed, retrying with core payload:', leadError.message ?? JSON.stringify(leadError));
        const fallback = await supabase.from('leads').insert(corePayload).select().single();
        if (fallback.error) {
          console.error('addLead core insert also failed:', fallback.error.message ?? JSON.stringify(fallback.error));
          return;
        }
        newDbLead = fallback.data;
      }

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

        if (noteError) {
          console.warn('addLead note insert failed:', noteError.message ?? JSON.stringify(noteError));
        } else if (newDbNote) {
          insertedNotes.push(newDbNote as DbNote);
        }
      }

      if (newDbLead) {
        const newUiLead = mapDbLeadToUi(newDbLead, insertedNotes);
        setLeads(prev => [newUiLead, ...prev]);
      }
    } catch (err: any) {
      console.error('addLead unexpected error:', err?.message ?? JSON.stringify(err));
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

  const addTask = async (title: string, category: Task['category'], dueDate?: string) => {
    if (!user || !activeWorkspace) return;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;

    if (electronObj) {
      try {
        const taskId = crypto.randomUUID();
        const nowStr = new Date().toISOString();
        const resolvedDueDate = dueDate ?? nowStr.split('T')[0];

        await electronObj.dbRun(
          `INSERT INTO tasks (id, user_id, title, completed, category, due_date, workspace_id, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, 'pending_insert')`,
          [taskId, user.id, title, category, resolvedDueDate, activeWorkspace.id, nowStr, nowStr]
        );

        const newUiTask: Task = {
          id: taskId,
          title,
          completed: false,
          category,
          dueDate: resolvedDueDate
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
          due_date: dueDate ?? new Date().toISOString().split('T')[0]
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

  const updateTask = async (id: string, fields: { title?: string; dueDate?: string; category?: Task['category'] }) => {
    if (!user) return;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;

    if (electronObj) {
      try {
        const dbFields: string[] = [];
        const params: any[] = [];
        if (fields.title !== undefined) { dbFields.push("title = ?"); params.push(fields.title); }
        if (fields.dueDate !== undefined) { dbFields.push("due_date = ?"); params.push(fields.dueDate); }
        if (fields.category !== undefined) { dbFields.push("category = ?"); params.push(fields.category); }
        if (dbFields.length > 0) {
          dbFields.push("updated_at = ?"); params.push(new Date().toISOString());
          dbFields.push("sync_status = 'pending_update'"); params.push(id);
          await electronObj.dbRun(`UPDATE tasks SET ${dbFields.join(", ")} WHERE id = ?`, params);
        }
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t));
        electronObj.triggerSync();
      } catch (err) {
        console.error("Local updateTask error:", err);
      }
      return;
    }

    const supabase = createClient();
    const dbFields: Record<string, string> = {};
    if (fields.title !== undefined) dbFields.title = fields.title;
    if (fields.dueDate !== undefined) dbFields.due_date = fields.dueDate;
    if (fields.category !== undefined) dbFields.category = fields.category;
    try {
      const { error } = await supabase.from('tasks').update(dbFields).eq('id', id);
      if (error) throw error;
      setTasks(prev => prev.map(t => t.id === id ? { ...t, ...fields } : t));
    } catch (err) {
      console.error("Error in updateTask:", err);
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
        if (fields.website !== undefined) { dbFields.push("website = ?"); params.push(fields.website || null); }
        if (fields.rating !== undefined) { dbFields.push("rating = ?"); params.push(fields.rating ?? null); }
        if (fields.reviewsCount !== undefined) { dbFields.push("reviews_count = ?"); params.push(fields.reviewsCount ?? null); }
        if (fields.mapsUrl !== undefined) { dbFields.push("maps_url = ?"); params.push(fields.mapsUrl || null); }
        if (fields.photos !== undefined) { dbFields.push("photos = ?"); params.push(fields.photos ? JSON.stringify(fields.photos) : null); }
        if (fields.socialLinks !== undefined) { dbFields.push("social_links = ?"); params.push(fields.socialLinks ? JSON.stringify(fields.socialLinks) : null); }
        if (fields.assignedTo !== undefined) { dbFields.push("assigned_to = ?"); params.push(fields.assignedTo || null); }
        if (fields.fitScore !== undefined) { dbFields.push("fit_score = ?"); params.push(fields.fitScore ?? null); }
        if (fields.intentScore !== undefined) { dbFields.push("intent_score = ?"); params.push(fields.intentScore ?? null); }
        if (fields.bantBudget !== undefined) { dbFields.push("bant_budget = ?"); params.push(fields.bantBudget ? 1 : 0); }
        if (fields.bantAuthority !== undefined) { dbFields.push("bant_authority = ?"); params.push(fields.bantAuthority ? 1 : 0); }
        if (fields.bantNeed !== undefined) { dbFields.push("bant_need = ?"); params.push(fields.bantNeed ? 1 : 0); }
        if (fields.bantTiming !== undefined) { dbFields.push("bant_timing = ?"); params.push(fields.bantTiming ? 1 : 0); }
        if (fields.suggestedEmails !== undefined) { dbFields.push("suggested_emails = ?"); params.push(fields.suggestedEmails ? JSON.stringify(fields.suggestedEmails) : null); }
        if (fields.decisionMakerName !== undefined) { dbFields.push("decision_maker_name = ?"); params.push(fields.decisionMakerName || null); }
        if (fields.decisionMakerRole !== undefined) { dbFields.push("decision_maker_role = ?"); params.push(fields.decisionMakerRole || null); }
        if (fields.dealAmount !== undefined) { dbFields.push("deal_amount = ?"); params.push(fields.dealAmount ?? null); }
        if (fields.dealProbability !== undefined) { dbFields.push("deal_probability = ?"); params.push(fields.dealProbability ?? null); }
        if (fields.dealClosingDate !== undefined) { dbFields.push("deal_closing_date = ?"); params.push(fields.dealClosingDate || null); }
        if (fields.campaignId !== undefined) { dbFields.push("campaign_id = ?"); params.push(fields.campaignId || null); }
        if (fields.lastActivityAt !== undefined) { dbFields.push("last_activity_at = ?"); params.push(fields.lastActivityAt || null); }
        if (fields.replyDetectedAt !== undefined) { dbFields.push("reply_detected_at = ?"); params.push(fields.replyDetectedAt || null); }
        if (fields.gmailThreadId !== undefined) { dbFields.push("gmail_thread_id = ?"); params.push(fields.gmailThreadId || null); }
        if (fields.replyStatus !== undefined) { dbFields.push("reply_status = ?"); params.push(fields.replyStatus ?? null); }

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

    const dbFields: Record<string, string | number | boolean | string[] | Record<string, string> | null | undefined> = {};
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
    if (fields.website !== undefined) dbFields.website = fields.website || null;
    if (fields.rating !== undefined) dbFields.rating = fields.rating ?? null;
    if (fields.reviewsCount !== undefined) dbFields.reviews_count = fields.reviewsCount ?? null;
    if (fields.mapsUrl !== undefined) dbFields.maps_url = fields.mapsUrl || null;
    if (fields.photos !== undefined) dbFields.photos = (fields.photos ?? null) as any;
    if (fields.socialLinks !== undefined) dbFields.social_links = (fields.socialLinks ?? null) as any;
    if (fields.assignedTo !== undefined) dbFields.assigned_to = fields.assignedTo || null;
    if (fields.fitScore !== undefined) dbFields.fit_score = fields.fitScore ?? null;
    if (fields.intentScore !== undefined) dbFields.intent_score = fields.intentScore ?? null;
    if (fields.bantBudget !== undefined) dbFields.bant_budget = fields.bantBudget;
    if (fields.bantAuthority !== undefined) dbFields.bant_authority = fields.bantAuthority;
    if (fields.bantNeed !== undefined) dbFields.bant_need = fields.bantNeed;
    if (fields.bantTiming !== undefined) dbFields.bant_timing = fields.bantTiming;
    if (fields.suggestedEmails !== undefined) dbFields.suggested_emails = (fields.suggestedEmails ?? null) as any;
    if (fields.decisionMakerName !== undefined) dbFields.decision_maker_name = fields.decisionMakerName || null;
    if (fields.decisionMakerRole !== undefined) dbFields.decision_maker_role = fields.decisionMakerRole || null;
    if (fields.dealAmount !== undefined) dbFields.deal_amount = fields.dealAmount ?? null;
    if (fields.dealProbability !== undefined) dbFields.deal_probability = fields.dealProbability ?? null;
    if (fields.dealClosingDate !== undefined) dbFields.deal_closing_date = fields.dealClosingDate || null;
    if (fields.campaignId !== undefined) dbFields.campaign_id = fields.campaignId || null;
    if (fields.lastActivityAt !== undefined) dbFields.last_activity_at = fields.lastActivityAt || null;
    if (fields.replyDetectedAt !== undefined) dbFields.reply_detected_at = fields.replyDetectedAt || null;
    if (fields.gmailThreadId !== undefined) dbFields.gmail_thread_id = fields.gmailThreadId || null;
    if (fields.replyStatus !== undefined) dbFields.reply_status = fields.replyStatus ?? null;

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

  // Supabase Realtime subscription for incoming notifications
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase.channel(`notifications_${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload: { new: Record<string, unknown> }) => {
        setNotifications(prev => [mapDbNotifToUi(payload.new), ...prev.slice(0, 29)]);
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [user]);

  const addNotification = async (notif: Omit<AppNotification, 'id' | 'isRead' | 'createdAt' | 'updatedAt'>) => {
    if (!user) return;
    const id = crypto.randomUUID();
    const nowStr = new Date().toISOString();
    const newNotif: AppNotification = {
      ...notif,
      id,
      isRead: false,
      createdAt: nowStr,
      updatedAt: nowStr,
    };

    setNotifications(prev => [newNotif, ...prev]);

    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        await electronObj.dbRun(
          `INSERT INTO notifications (id, user_id, workspace_id, type, title, body, link, is_read, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 'pending_insert')`,
          [id, user.id, notif.workspaceId, notif.type, notif.title, notif.body, notif.link ?? null, nowStr, nowStr]
        );
        if (electronObj.triggerSync) electronObj.triggerSync();
      } catch (err) {
        console.error("Local addNotification error:", err);
      }
      return;
    }

    const supabase = createClient();
    try {
      await supabase.from('notifications').insert({
        id,
        user_id: user.id,
        workspace_id: notif.workspaceId,
        type: notif.type,
        title: notif.title,
        body: notif.body,
        link: notif.link ?? null,
        is_read: false,
        created_at: nowStr,
        updated_at: nowStr,
      });
    } catch (err) {
      console.error("Error in addNotification:", err);
    }
  };

  const markNotificationRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));

    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        await electronObj.dbRun(
          "UPDATE notifications SET is_read = 1, updated_at = ?, sync_status = 'pending_update' WHERE id = ?",
          [new Date().toISOString(), id]
        );
        if (electronObj.triggerSync) electronObj.triggerSync();
      } catch (err) {
        console.error("Local markNotificationRead error:", err);
      }
      return;
    }

    const supabase = createClient();
    try {
      await supabase.from('notifications').update({ is_read: true, updated_at: new Date().toISOString() }).eq('id', id);
    } catch (err) {
      console.error("Error in markNotificationRead:", err);
    }
  };

  const markAllNotificationsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      if (!user) return;
      try {
        await electronObj.dbRun(
          "UPDATE notifications SET is_read = 1, updated_at = ?, sync_status = 'pending_update' WHERE user_id = ? AND is_read = 0",
          [new Date().toISOString(), user.id]
        );
        if (electronObj.triggerSync) electronObj.triggerSync();
      } catch (err) {
        console.error("Local markAllNotificationsRead error:", err);
      }
      return;
    }

    if (!user) return;
    const supabase = createClient();
    try {
      await supabase
        .from('notifications')
        .update({ is_read: true, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('is_read', false);
    } catch (err) {
      console.error("Error in markAllNotificationsRead:", err);
    }
  };

  const sendTeamMessage = async (content: string) => {
    if (!user || !activeWorkspace) return;
    const id = crypto.randomUUID();
    const nowStr = new Date().toISOString();

    // Resolve sender name: prefer settings full_name, fallback to email prefix
    let senderName = user.user_metadata?.full_name as string | undefined;
    if (!senderName) {
      senderName = user.email?.split('@')[0] || 'Membre';
    }

    const optimisticMsg: TeamMessage = {
      id,
      workspaceId: activeWorkspace.id,
      senderId: user.id,
      senderName,
      content,
      createdAt: nowStr,
    };

    setTeamMessages(prev => [...prev, optimisticMsg].slice(-50));

    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        await electronObj.dbRun(
          `INSERT INTO team_messages (id, workspace_id, sender_id, sender_name, content, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_insert')`,
          [id, activeWorkspace.id, user.id, senderName, content, nowStr, nowStr]
        );
        if (electronObj.triggerSync) electronObj.triggerSync();
      } catch (err) {
        console.error("Local sendTeamMessage error:", err);
      }
      return;
    }

    const supabase = createClient();
    try {
      await supabase.from('team_messages').insert({
        id,
        workspace_id: activeWorkspace.id,
        sender_id: user.id,
        sender_name: senderName,
        content,
        created_at: nowStr,
        updated_at: nowStr,
      });
    } catch (err) {
      console.error("Error in sendTeamMessage:", err);
    }
  };

  // Supabase Realtime subscription for incoming team messages
  useEffect(() => {
    if (!activeWorkspace) return;
    const supabase = createClient();
    const channel = supabase.channel(`team_messages_${activeWorkspace.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'team_messages',
        filter: `workspace_id=eq.${activeWorkspace.id}`
      }, (payload: { new: Record<string, unknown> }) => {
        const newMsg = mapDbMsgToUi(payload.new as any);
        // Avoid duplicates from optimistic updates (same id)
        setTeamMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg].slice(-50);
        });
      })
      .subscribe();
    return () => { channel.unsubscribe(); };
  }, [activeWorkspace]);

  const createProject = async (name: string, description?: string): Promise<Project | null> => {
    if (!user || !activeWorkspace) return null;
    const id = crypto.randomUUID();
    const nowStr = new Date().toISOString();

    const optimistic: Project = {
      id,
      workspaceId: activeWorkspace.id,
      ownerId: user.id,
      name,
      description,
      createdAt: nowStr,
      updatedAt: nowStr,
    };
    setProjects(prev => [optimistic, ...prev]);

    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        await electronObj.dbRun(
          `INSERT INTO projects (id, workspace_id, owner_id, name, description, created_at, updated_at, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_insert')`,
          [id, activeWorkspace.id, user.id, name, description ?? null, nowStr, nowStr]
        );
        if (electronObj.triggerSync) electronObj.triggerSync();
      } catch (err) {
        console.error("Local createProject error:", err);
      }
      return optimistic;
    }

    const supabase = createClient();
    try {
      await supabase.from('projects').insert({
        id,
        workspace_id: activeWorkspace.id,
        owner_id: user.id,
        name,
        description: description ?? null,
        created_at: nowStr,
        updated_at: nowStr,
      });
    } catch (err) {
      console.error("Error in createProject:", err);
    }
    return optimistic;
  };

  const renameProject = async (id: string, name: string): Promise<void> => {
    if (!user) return;
    setProjects(prev => prev.map(p => p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p));

    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        const existing = await electronObj.dbGet("SELECT sync_status FROM projects WHERE id = ?", [id]);
        const nextStatus = existing && existing.sync_status === 'pending_insert' ? 'pending_insert' : 'pending_update';
        await electronObj.dbRun(
          "UPDATE projects SET name = ?, updated_at = ?, sync_status = ? WHERE id = ?",
          [name, new Date().toISOString(), nextStatus, id]
        );
        if (electronObj.triggerSync) electronObj.triggerSync();
      } catch (err) {
        console.error("Local renameProject error:", err);
      }
      return;
    }

    const supabase = createClient();
    try {
      await supabase.from('projects').update({ name, updated_at: new Date().toISOString() }).eq('id', id);
    } catch (err) {
      console.error("Error in renameProject:", err);
    }
  };

  const deleteProject = async (id: string): Promise<void> => {
    if (!user) return;
    setProjects(prev => prev.filter(p => p.id !== id));

    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        const existing = await electronObj.dbGet("SELECT sync_status FROM projects WHERE id = ?", [id]);
        if (existing && existing.sync_status === 'pending_insert') {
          await electronObj.dbRun("DELETE FROM projects WHERE id = ?", [id]);
        } else {
          await electronObj.dbRun("UPDATE projects SET sync_status = 'pending_delete' WHERE id = ?", [id]);
        }
        if (electronObj.triggerSync) electronObj.triggerSync();
      } catch (err) {
        console.error("Local deleteProject error:", err);
      }
      return;
    }

    const supabase = createClient();
    try {
      await supabase.from('projects').delete().eq('id', id);
    } catch (err) {
      console.error("Error in deleteProject:", err);
    }
  };

  const addCampaign = async (data: {
    name: string;
    description?: string;
    niches?: string[];
    cities?: string[];
    startDate?: string;
    endDate?: string;
    personaId?: string;
    sequenceConfig?: string;
    goals?: string;
    playbookRunId?: string;
  }): Promise<Campaign | null> => {
    if (!user || !activeWorkspace) return null;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    const newCampaign: Campaign = {
      id: crypto.randomUUID(),
      workspaceId: activeWorkspace.id,
      userId: user.id,
      name: data.name,
      description: data.description,
      niches: data.niches || [],
      cities: data.cities || [],
      status: 'active',
      startDate: data.startDate,
      endDate: data.endDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      personaId: data.personaId,
      sequenceConfig: data.sequenceConfig,
      goals: data.goals,
      playbookRunId: data.playbookRunId,
    };
    if (electronObj) {
      try {
        await electronObj.dbRun(
          `INSERT INTO campaigns (id, workspace_id, user_id, name, description, niches, cities, status, start_date, end_date, created_at, updated_at, persona_id, sequence_config, goals, playbook_run_id, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, 'pending_insert')`,
          [
            newCampaign.id,
            newCampaign.workspaceId,
            newCampaign.userId,
            newCampaign.name,
            newCampaign.description || null,
            JSON.stringify(newCampaign.niches),
            JSON.stringify(newCampaign.cities),
            newCampaign.startDate || null,
            newCampaign.endDate || null,
            newCampaign.createdAt,
            newCampaign.updatedAt,
            newCampaign.personaId || null,
            newCampaign.sequenceConfig || null,
            newCampaign.goals || null,
            newCampaign.playbookRunId || null
          ]
        );
        setCampaigns(prev => [newCampaign, ...prev]);
        electronObj.triggerSync();
      } catch (err) { console.error("Local addCampaign error:", err); }
      return newCampaign;
    }
    const supabase = createClient();
    try {
      const { data: row, error } = await supabase.from('campaigns').insert({
        id: newCampaign.id, workspace_id: newCampaign.workspaceId, user_id: newCampaign.userId,
        name: newCampaign.name, description: newCampaign.description || null,
        niches: newCampaign.niches, cities: newCampaign.cities, status: 'active',
        start_date: newCampaign.startDate || null, end_date: newCampaign.endDate || null,
        created_at: newCampaign.createdAt, updated_at: newCampaign.updatedAt,
        persona_id: newCampaign.personaId || null,
        sequence_config: newCampaign.sequenceConfig ? JSON.parse(newCampaign.sequenceConfig) : null,
        goals: newCampaign.goals ? JSON.parse(newCampaign.goals) : null,
        playbook_run_id: newCampaign.playbookRunId || null,
      }).select().single();
      if (error) throw error;
      const mapped = mapDbCampaignToUi(row);
      setCampaigns(prev => [mapped, ...prev]);
      return mapped;
    } catch (err) { console.error("Error in addCampaign:", err); return null; }
  };

  const updateCampaign = async (id: string, fields: Partial<Campaign>): Promise<void> => {
    if (!user) return;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    const dbFields: string[] = [];
    const params: any[] = [];
    if (fields.name !== undefined) { dbFields.push("name = ?"); params.push(fields.name); }
    if (fields.description !== undefined) { dbFields.push("description = ?"); params.push(fields.description || null); }
    if (fields.niches !== undefined) { dbFields.push("niches = ?"); params.push(JSON.stringify(fields.niches)); }
    if (fields.cities !== undefined) { dbFields.push("cities = ?"); params.push(JSON.stringify(fields.cities)); }
    if (fields.status !== undefined) { dbFields.push("status = ?"); params.push(fields.status); }
    if (fields.startDate !== undefined) { dbFields.push("start_date = ?"); params.push(fields.startDate || null); }
    if (fields.endDate !== undefined) { dbFields.push("end_date = ?"); params.push(fields.endDate || null); }
    if (fields.personaId !== undefined) { dbFields.push("persona_id = ?"); params.push(fields.personaId || null); }
    if (fields.sequenceConfig !== undefined) { dbFields.push("sequence_config = ?"); params.push(fields.sequenceConfig || null); }
    if (fields.goals !== undefined) { dbFields.push("goals = ?"); params.push(fields.goals || null); }
    if (fields.playbookRunId !== undefined) { dbFields.push("playbook_run_id = ?"); params.push(fields.playbookRunId || null); }
    if (electronObj) {
      try {
        if (dbFields.length > 0) {
          dbFields.push("updated_at = ?"); params.push(new Date().toISOString());
          dbFields.push("sync_status = 'pending_update'"); params.push(id);
          await electronObj.dbRun(`UPDATE campaigns SET ${dbFields.join(", ")} WHERE id = ?`, params);
        }
        setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...fields, updatedAt: new Date().toISOString() } : c));
        electronObj.triggerSync();
      } catch (err) { console.error("Local updateCampaign error:", err); }
      return;
    }
    const supabase = createClient();
    const supaFields: Record<string, any> = {};
    if (fields.name !== undefined) supaFields.name = fields.name;
    if (fields.description !== undefined) supaFields.description = fields.description || null;
    if (fields.niches !== undefined) supaFields.niches = fields.niches;
    if (fields.cities !== undefined) supaFields.cities = fields.cities;
    if (fields.status !== undefined) supaFields.status = fields.status;
    if (fields.startDate !== undefined) supaFields.start_date = fields.startDate || null;
    if (fields.endDate !== undefined) supaFields.end_date = fields.endDate || null;
    if (fields.personaId !== undefined) supaFields.persona_id = fields.personaId || null;
    if (fields.sequenceConfig !== undefined) supaFields.sequence_config = fields.sequenceConfig ? JSON.parse(fields.sequenceConfig) : null;
    if (fields.goals !== undefined) supaFields.goals = fields.goals ? JSON.parse(fields.goals) : null;
    if (fields.playbookRunId !== undefined) supaFields.playbook_run_id = fields.playbookRunId || null;
    try {
      await supabase.from('campaigns').update(supaFields).eq('id', id);
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, ...fields, updatedAt: new Date().toISOString() } : c));
    } catch (err) { console.error("Error in updateCampaign:", err); }
  };

  const deleteCampaign = async (id: string): Promise<void> => {
    if (!user) return;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        await electronObj.dbRun("UPDATE campaigns SET sync_status = 'pending_delete' WHERE id = ?", [id]);
        setCampaigns(prev => prev.filter(c => c.id !== id));
        electronObj.triggerSync();
      } catch (err) { console.error("Local deleteCampaign error:", err); }
      return;
    }
    const supabase = createClient();
    try {
      await supabase.from('campaigns').delete().eq('id', id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
    } catch (err) { console.error("Error in deleteCampaign:", err); }
  };

  const addGoal = async (data: { metric: Goal['metric']; target: number; period: Goal['period'] }): Promise<Goal | null> => {
    if (!user || !activeWorkspace) return null;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    const now = new Date().toISOString();
    const newGoal: Goal = {
      id: crypto.randomUUID(),
      workspaceId: activeWorkspace.id,
      userId: user.id,
      metric: data.metric,
      target: data.target,
      period: data.period,
      createdAt: now,
      updatedAt: now,
    };
    if (electronObj) {
      try {
        await electronObj.dbRun(
          `INSERT INTO goals (id, workspace_id, user_id, metric, target, period, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [newGoal.id, newGoal.workspaceId, newGoal.userId, newGoal.metric, newGoal.target, newGoal.period, now, now]
        );
        setGoals(prev => [newGoal, ...prev]);
        electronObj.triggerSync();
      } catch (err) { console.error("Local addGoal error:", err); }
      return newGoal;
    }
    const supabase = createClient();
    try {
      const { data: row, error } = await supabase.from('goals').insert({
        id: newGoal.id, workspace_id: newGoal.workspaceId, user_id: newGoal.userId,
        metric: newGoal.metric, target: newGoal.target, period: newGoal.period,
        created_at: now, updated_at: now,
      }).select().single();
      if (error) throw error;
      const mapped = mapDbGoalToUi(row);
      setGoals(prev => [mapped, ...prev]);
      return mapped;
    } catch (err) { console.error("Error in addGoal:", err); return null; }
  };

  const updateGoal = async (id: string, fields: Partial<Pick<Goal, 'target' | 'period'>>): Promise<void> => {
    if (!user) return;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    const now = new Date().toISOString();
    if (electronObj) {
      try {
        const dbFields: string[] = ['updated_at = ?'];
        const params: any[] = [now];
        if (fields.target !== undefined) { dbFields.push("target = ?"); params.push(fields.target); }
        if (fields.period !== undefined) { dbFields.push("period = ?"); params.push(fields.period); }
        params.push(id);
        await electronObj.dbRun(`UPDATE goals SET ${dbFields.join(", ")} WHERE id = ?`, params);
        setGoals(prev => prev.map(g => g.id === id ? { ...g, ...fields, updatedAt: now } : g));
        electronObj.triggerSync();
      } catch (err) { console.error("Local updateGoal error:", err); }
      return;
    }
    const supabase = createClient();
    try {
      const supaFields: Record<string, any> = { updated_at: now };
      if (fields.target !== undefined) supaFields.target = fields.target;
      if (fields.period !== undefined) supaFields.period = fields.period;
      await supabase.from('goals').update(supaFields).eq('id', id);
      setGoals(prev => prev.map(g => g.id === id ? { ...g, ...fields, updatedAt: now } : g));
    } catch (err) { console.error("Error in updateGoal:", err); }
  };

  const deleteGoal = async (id: string): Promise<void> => {
    if (!user) return;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj) {
      try {
        await electronObj.dbRun("DELETE FROM goals WHERE id = ?", [id]);
        setGoals(prev => prev.filter(g => g.id !== id));
        electronObj.triggerSync();
      } catch (err) { console.error("Local deleteGoal error:", err); }
      return;
    }
    const supabase = createClient();
    try {
      await supabase.from('goals').delete().eq('id', id);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err) { console.error("Error in deleteGoal:", err); }
  };

  const importDemoData = async () => {
    if (!user || !activeWorkspace) return;
    await populateMockData(user.id, activeWorkspace.id);
    await loadData(user, activeWorkspace);
  };

  return (
    <ReachContext.Provider
      value={{
        user,
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
        updateTask,
        saveQuickNote,
        updateFocus,
        updateLead,
        updateLeadStatus,
        addNoteToLead,
        deleteLeads,
        updateLeadsStatus,
        importDemoData,
        notifications,
        unreadCount,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        teamMessages,
        sendTeamMessage,
        projects,
        createProject,
        renameProject,
        deleteProject,
        campaigns,
        addCampaign,
        updateCampaign,
        deleteCampaign,
        goals,
        addGoal,
        updateGoal,
        deleteGoal,
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

