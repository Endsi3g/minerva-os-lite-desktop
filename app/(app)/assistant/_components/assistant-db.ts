// Assistant Database Helpers

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

// Check if electron is available
const isElectron = typeof window !== 'undefined' && (window as any).electron !== undefined;
const getElectron = () => (window as any).electron;

// Generate UUID safely client-side
const getUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

// ── SESSIONS ──

export async function dbGetSessions(userId: string, workspaceId: string): Promise<AssistantSession[]> {
  if (isElectron) {
    try {
      const rows = await getElectron().dbAll(
        'SELECT * FROM assistant_sessions WHERE workspace_id = ? ORDER BY updated_at DESC',
        [workspaceId]
      );
      return (rows || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        workspaceId: r.workspace_id,
        title: r.title,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch (e) {
      console.error('SQLite getSessions failed, falling back to localStorage:', e);
    }
  }

  // LocalStorage Fallback
  try {
    const key = `minerva_as_sessions_${workspaceId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
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

  if (isElectron) {
    try {
      await getElectron().dbRun(
        'INSERT INTO assistant_sessions (id, user_id, workspace_id, title, created_at, updated_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, "synced")',
        [newSession.id, userId, workspaceId, title, newSession.createdAt, newSession.updatedAt]
      );
      return newSession;
    } catch (e) {
      console.error('SQLite createSession failed:', e);
    }
  }

  // LocalStorage Fallback
  try {
    const key = `minerva_as_sessions_${workspaceId}`;
    const sessions = await dbGetSessions(userId, workspaceId);
    sessions.unshift(newSession);
    localStorage.setItem(key, JSON.stringify(sessions));
  } catch {}
  return newSession;
}

export async function dbUpdateSessionTitle(workspaceId: string, sessionId: string, title: string): Promise<void> {
  if (isElectron) {
    try {
      await getElectron().dbRun(
        'UPDATE assistant_sessions SET title = ?, updated_at = ? WHERE id = ?',
        [title, new Date().toISOString(), sessionId]
      );
      return;
    } catch (e) {
      console.error('SQLite updateSessionTitle failed:', e);
    }
  }

  // LocalStorage Fallback
  try {
    const key = `minerva_as_sessions_${workspaceId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const sessions = JSON.parse(stored) as AssistantSession[];
      const found = sessions.find(s => s.id === sessionId);
      if (found) {
        found.title = title;
        found.updatedAt = new Date().toISOString();
        localStorage.setItem(key, JSON.stringify(sessions));
      }
    }
  } catch {}
}

export async function dbDeleteSession(workspaceId: string, sessionId: string): Promise<void> {
  if (isElectron) {
    try {
      await getElectron().dbRun('DELETE FROM assistant_sessions WHERE id = ?', [sessionId]);
      await getElectron().dbRun('DELETE FROM assistant_messages WHERE session_id = ?', [sessionId]);
      return;
    } catch (e) {
      console.error('SQLite deleteSession failed:', e);
    }
  }

  // LocalStorage Fallback
  try {
    const key = `minerva_as_sessions_${workspaceId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      let sessions = JSON.parse(stored) as AssistantSession[];
      sessions = sessions.filter(s => s.id !== sessionId);
      localStorage.setItem(key, JSON.stringify(sessions));
    }
    localStorage.removeItem(`minerva_as_msgs_${sessionId}`);
  } catch {}
}

// ── MESSAGES ──

export async function dbGetMessages(sessionId: string): Promise<DBMessage[]> {
  if (isElectron) {
    try {
      const rows = await getElectron().dbAll(
        'SELECT * FROM assistant_messages WHERE session_id = ? ORDER BY created_at ASC',
        [sessionId]
      );
      return (rows || []).map((r: any) => ({
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
    } catch (e) {
      console.error('SQLite getMessages failed:', e);
    }
  }

  // LocalStorage Fallback
  try {
    const key = `minerva_as_msgs_${sessionId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
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

  if (isElectron) {
    try {
      await getElectron().dbRun(
        'INSERT INTO assistant_messages (id, session_id, user_id, role, content, attached_file_name, attached_file_type, created_at, sync_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "synced")',
        [
          newMsg.id,
          sessionId,
          userId,
          role,
          content,
          attachedFile?.name || null,
          attachedFile?.type || null,
          newMsg.createdAt,
        ]
      );
      // Touch session updated_at
      await getElectron().dbRun(
        'UPDATE assistant_sessions SET updated_at = ? WHERE id = ?',
        [newMsg.createdAt, sessionId]
      );
      return newMsg;
    } catch (e) {
      console.error('SQLite saveMessage failed:', e);
    }
  }

  // LocalStorage Fallback
  try {
    const key = `minerva_as_msgs_${sessionId}`;
    const messages = await dbGetMessages(sessionId);
    messages.push(newMsg);
    localStorage.setItem(key, JSON.stringify(messages));
  } catch {}
  return newMsg;
}

// ── CANVAS DOCUMENTS ──

export async function dbGetCanvasDocs(userId: string, workspaceId: string): Promise<AssistantCanvasDoc[]> {
  if (isElectron) {
    try {
      const rows = await getElectron().dbAll(
        'SELECT * FROM assistant_canvas WHERE workspace_id = ? ORDER BY updated_at DESC',
        [workspaceId]
      );
      return (rows || []).map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        workspaceId: r.workspace_id,
        title: r.title,
        content: r.content,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }));
    } catch (e) {
      console.error('SQLite getCanvasDocs failed:', e);
    }
  }

  // LocalStorage Fallback
  try {
    const key = `minerva_as_canvas_${workspaceId}`;
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
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

  if (isElectron) {
    try {
      await getElectron().dbRun(
        `INSERT INTO assistant_canvas (id, user_id, workspace_id, title, content, created_at, updated_at, sync_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'synced')
         ON CONFLICT(id) DO UPDATE SET
           title = excluded.title,
           content = excluded.content,
           updated_at = excluded.updated_at`,
        [doc.id, userId, workspaceId, title, content, now, now]
      );
      return doc;
    } catch (e) {
      console.error('SQLite saveCanvasDoc failed:', e);
    }
  }

  // LocalStorage Fallback
  try {
    const key = `minerva_as_canvas_${workspaceId}`;
    const docs = await dbGetCanvasDocs(userId, workspaceId);
    const existingIdx = docs.findIndex(d => d.id === id);
    if (existingIdx !== -1) {
      docs[existingIdx] = {
        ...docs[existingIdx],
        title,
        content,
        updatedAt: now,
      };
    } else {
      docs.unshift(doc);
    }
    localStorage.setItem(key, JSON.stringify(docs));
  } catch {}
  return doc;
}

export async function dbDeleteCanvasDoc(workspaceId: string, id: string): Promise<void> {
  if (isElectron) {
    try {
      await getElectron().dbRun('DELETE FROM assistant_canvas WHERE id = ?', [id]);
      return;
    } catch (e) {
      console.error('SQLite deleteCanvasDoc failed:', e);
    }
  }

  // LocalStorage Fallback
  try {
    const key = `minerva_as_canvas_${workspaceId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      let docs = JSON.parse(stored) as AssistantCanvasDoc[];
      docs = docs.filter(d => d.id !== id);
      localStorage.setItem(key, JSON.stringify(docs));
    }
  } catch {}
}
