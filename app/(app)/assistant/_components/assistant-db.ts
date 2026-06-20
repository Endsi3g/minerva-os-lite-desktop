// Assistant Database Helpers
import { createClient } from '@/lib/supabase/client';

export interface AssistantSession {
  id: string;
  userId: string;
  workspaceId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface DBMessage {
  id: string;
  sessionId: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  attachedFile?: { name: string; type: string };
  createdAt: string;
}

export interface AssistantCanvasDoc {
  id: string;
  userId: string;
  workspaceId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// Generate UUID safely client-side
const getUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// ── SESSIONS ──

export async function dbGetSessions(userId: string, workspaceId: string): Promise<AssistantSession[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('assistant_sessions')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });

  if (error || !data) {
    console.error('Supabase getSessions failed:', error);
    return [];
  }

  return data.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    workspaceId: r.workspace_id,
    title: r.title,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function dbCreateSession(userId: string, workspaceId: string, title: string): Promise<AssistantSession> {
  const newSession: AssistantSession = {
    id: getUUID(),
    userId,
    workspaceId,
    title,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const supabase = createClient();
  const { error } = await supabase.from('assistant_sessions').insert({
    id: newSession.id,
    user_id: userId,
    workspace_id: workspaceId,
    title,
    created_at: newSession.createdAt,
    updated_at: newSession.updatedAt,
  });

  if (error) {
    console.error('Supabase createSession failed:', error);
  }

  return newSession;
}

export async function dbUpdateSessionTitle(workspaceId: string, sessionId: string, title: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('assistant_sessions')
    .update({ title, updated_at: new Date().toISOString() })
    .eq('id', sessionId);

  if (error) {
    console.error('Supabase updateSessionTitle failed:', error);
  }
}

export async function dbDeleteSession(workspaceId: string, sessionId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('assistant_sessions')
    .delete()
    .eq('id', sessionId);

  if (error) {
    console.error('Supabase deleteSession failed:', error);
  }
}

// ── MESSAGES ──

export async function dbGetMessages(sessionId: string): Promise<DBMessage[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('assistant_messages')
    .select('*')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error || !data) {
    console.error('Supabase getMessages failed:', error);
    return [];
  }

  return data.map((r: any) => ({
    id: r.id,
    sessionId: r.session_id,
    userId: r.user_id,
    role: r.role as 'user' | 'assistant',
    content: r.content,
    attachedFile: r.attached_file_name
      ? { name: r.attached_file_name, type: r.attached_file_type || '' }
      : undefined,
    createdAt: r.created_at,
  }));
}

export async function dbSaveMessage(
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  attachedFile?: { name: string; type: string }
): Promise<DBMessage> {
  const newMsg: DBMessage = {
    id: getUUID(),
    sessionId,
    userId,
    role,
    content,
    attachedFile,
    createdAt: new Date().toISOString(),
  };

  const supabase = createClient();
  const { error: msgError } = await supabase.from('assistant_messages').insert({
    id: newMsg.id,
    session_id: sessionId,
    user_id: userId,
    role,
    content,
    attached_file_name: attachedFile?.name || null,
    attached_file_type: attachedFile?.type || null,
    created_at: newMsg.createdAt,
  });

  if (msgError) {
    console.error('Supabase saveMessage failed:', msgError);
  } else {
    // Touch session updated_at
    const { error: sessionError } = await supabase
      .from('assistant_sessions')
      .update({ updated_at: newMsg.createdAt })
      .eq('id', sessionId);
    if (sessionError) {
      console.error('Supabase touch session failed:', sessionError);
    }
  }

  return newMsg;
}

// ── CANVAS DOCUMENTS ──

export async function dbGetCanvasDocs(userId: string, workspaceId: string): Promise<AssistantCanvasDoc[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('assistant_canvas')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('updated_at', { ascending: false });

  if (error || !data) {
    console.error('Supabase getCanvasDocs failed:', error);
    return [];
  }

  return data.map((r: any) => ({
    id: r.id,
    userId: r.user_id,
    workspaceId: r.workspace_id,
    title: r.title,
    content: r.content,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function dbSaveCanvasDoc(
  id: string,
  userId: string,
  workspaceId: string,
  title: string,
  content: string
): Promise<AssistantCanvasDoc> {
  const now = new Date().toISOString();
  const doc: AssistantCanvasDoc = {
    id,
    userId,
    workspaceId,
    title,
    content,
    createdAt: now,
    updatedAt: now,
  };

  const supabase = createClient();
  const { error } = await supabase
    .from('assistant_canvas')
    .upsert({
      id,
      user_id: userId,
      workspace_id: workspaceId,
      title,
      content,
      created_at: now,
      updated_at: now
    });

  if (error) {
    console.error('Supabase saveCanvasDoc failed:', error);
  }

  return doc;
}

export async function dbDeleteCanvasDoc(workspaceId: string, id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('assistant_canvas')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Supabase deleteCanvasDoc failed:', error);
  }
}
