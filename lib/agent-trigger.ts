import { getApiUrl } from '@/lib/api-helper';

// Fire-and-forget agent loop trigger with a per-session cooldown.
// Prevents hammering the agent on rapid successive events.

const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes between auto-triggers
const STORAGE_KEY = 'minerva_agent_last_trigger';

function getLastTrigger(): number {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(STORAGE_KEY) ?? '0', 10);
}

function setLastTrigger() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  }
}

export function triggerAgentLoop(reason?: string) {
  if (typeof window === 'undefined') return;

  const last = getLastTrigger();
  if (Date.now() - last < COOLDOWN_MS) return;

  setLastTrigger();

  // Fire and forget — never block the UI
  fetch(getApiUrl('/api/agent/loop'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  }).catch(() => { /* silent */ });
}

// Force trigger regardless of cooldown (manual "Lancer" button)
export function forceAgentLoop(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  setLastTrigger();
  return fetch(getApiUrl('/api/agent/loop'), { method: 'POST' })
    .then(() => {})
    .catch(() => {});
}
