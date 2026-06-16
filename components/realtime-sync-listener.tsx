'use client';

import { useEffect } from 'react';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';
import type { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

export function RealtimeSyncListener() {
  const { activeWorkspace } = useReach();

  useEffect(() => {
    if (!activeWorkspace) return;

    const supabase = createClient();
    const workspaceId = activeWorkspace.id;

    // Helper to invoke quiet background sync and refresh local UI
    const triggerQuietSync = async () => {
      const electronObj = typeof window !== 'undefined' && (window as any).electron;
      if (electronObj) {
        try {
          console.log("[RealtimeSync] Remote database changes detected, running background sync...");
          await electronObj.triggerSync();
          // Dispatch custom event to notify reach-context to reload from SQLite
          window.dispatchEvent(new Event('minerva_sync_complete'));
        } catch (err) {
          console.error("[RealtimeSync] Failed to trigger sync:", err);
        }
      }
    };

    // Subscribe to Postgres changes on leads, tasks, and notes for the active workspace
    const channel = supabase.channel(`workspace_db_changes_${workspaceId}`);

    channel
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `workspace_id=eq.${workspaceId}`
        },
        () => {
          triggerQuietSync();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `workspace_id=eq.${workspaceId}`
        },
        () => {
          triggerQuietSync();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notes',
          filter: `workspace_id=eq.${workspaceId}`
        },
        () => {
          triggerQuietSync();
        }
      )
      .subscribe((status: REALTIME_SUBSCRIBE_STATES) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[RealtimeSync] Subscribed to real-time changes for workspace: ${workspaceId}`);
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [activeWorkspace]);

  return null; // Side-effect only component
}
