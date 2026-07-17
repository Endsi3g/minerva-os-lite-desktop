'use client';

import { useEffect, useRef, useState } from 'react';

interface StoredDraft<T> {
  value: T;
  savedAt: number;
}

interface UseAutosaveDraftOptions<T> {
  /** Unique key for this draft, e.g. `library-note-${noteId}` or `new-lead`. */
  key: string;
  value: T;
  /** Debounce delay in ms before writing to localStorage. Default 800ms. */
  delay?: number;
  /**
   * Pass false to pause autosaving (e.g. while the real record is still
   * loading from the server) so an empty/placeholder value can't clobber a
   * previously saved draft before the caller has restored or discarded it.
   */
  enabled?: boolean;
}

interface UseAutosaveDraftResult<T> {
  /** Draft found in localStorage on mount, or null if none / corrupted. */
  restoredDraft: T | null;
  savedAt: number | null;
  /** Call after the caller applies or discards restoredDraft. */
  dismissRestoredDraft: () => void;
  /** Call after a successful real save so the local draft doesn't linger. */
  clearDraft: () => void;
}

// Debounced localStorage draft persistence so in-progress edits (rich text,
// long forms) survive a refresh, crash, or accidental tab close instead of
// being silently lost. Pairs well with useUnsavedChangesGuard for the
// in-session warning.
export function useAutosaveDraft<T>({
  key,
  value,
  delay = 800,
  enabled = true,
}: UseAutosaveDraftOptions<T>): UseAutosaveDraftResult<T> {
  const storageKey = `minerva_draft_${key}`;
  const [restoredDraft, setRestoredDraft] = useState<T | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const hasCheckedRef = useRef(false);

  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredDraft<T>;
        setRestoredDraft(parsed.value);
        setSavedAt(parsed.savedAt);
      }
    } catch {
      // Corrupted draft — ignore rather than block the editor from loading.
    }
  }, [storageKey]);

  useEffect(() => {
    if (!enabled) return;
    const timeout = setTimeout(() => {
      try {
        const ts = Date.now();
        const draft: StoredDraft<T> = { value, savedAt: ts };
        window.localStorage.setItem(storageKey, JSON.stringify(draft));
        setSavedAt(ts);
      } catch {
        // Storage full or unavailable (private browsing) — fail silently.
      }
    }, delay);
    return () => clearTimeout(timeout);
  }, [storageKey, value, delay, enabled]);

  const dismissRestoredDraft = () => setRestoredDraft(null);

  const clearDraft = () => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setRestoredDraft(null);
    setSavedAt(null);
  };

  return { restoredDraft, savedAt, dismissRestoredDraft, clearDraft };
}
