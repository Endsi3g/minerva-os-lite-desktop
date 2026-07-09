// Desktop notification service — Electron IPC or Web Notification API

export type NotifPayload = { title: string; body: string };

// ── Sound ──────────────────────────────────────────────────────────────────────

function playNotifSound(type: 'soft' | 'alert' = 'soft') {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'soft') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    } else {
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.setValueAtTime(900, ctx.currentTime + 0.07);
      osc.frequency.setValueAtTime(1200, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    }
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    
    // Close context after playback completes to release resources
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 500);
  } catch (err) {
    console.warn('playNotifSound failed:', err);
  }
}

// ── Web notification cap & dedup ───────────────────────────────────────────────

// Track active Web Notifications to cap at 6 simultaneous ones
let activeWebNotifCount = 0;
const MAX_WEB_NOTIF = 6;

// Recent notification dedup: title+body → timestamp
const recentNotifCache = new Map<string, number>();
const DEDUP_WINDOW_MS = 2000;

function isDuplicate(title: string, body: string): boolean {
  const key = `${title}||${body}`;
  const last = recentNotifCache.get(key);
  const now = Date.now();
  if (last && now - last < DEDUP_WINDOW_MS) return true;
  recentNotifCache.set(key, now);
  // Prune old entries to avoid memory leak
  if (recentNotifCache.size > 50) {
    const oldest = [...recentNotifCache.entries()].sort((a, b) => a[1] - b[1])[0];
    recentNotifCache.delete(oldest[0]);
  }
  return false;
}

// ── Core send ──────────────────────────────────────────────────────────────────

export function sendDesktopNotification(title: string, body: string, options?: { sound?: boolean; soundType?: 'soft' | 'alert' }): void {
  if (typeof window === 'undefined') return;

  // Dedup: skip if same title+body was sent within the last 2s
  if (isDuplicate(title, body)) return;

  const electron = (window as any).electron;

  if (electron?.sendNotification) {
    // Electron: always use native OS notification (1 per event, OS manages stacking)
    electron.sendNotification(title, body);
  } else if ('Notification' in window) {
    if (Notification.permission === 'granted') {
      if (activeWebNotifCount >= MAX_WEB_NOTIF) {
        // Already at cap — show a summary notification instead of stacking more
        if (!isDuplicate('Minerva OS', `${activeWebNotifCount} notifications en attente`)) {
          const summary = new Notification('Minerva OS', {
            body: `${activeWebNotifCount} notifications en attente`,
            icon: '/icon-192.png',
          });
          activeWebNotifCount++;
          summary.onclose = () => { activeWebNotifCount = Math.max(0, activeWebNotifCount - 1); };
        }
      } else {
        const notif = new Notification(title, { body, icon: '/icon-192.png' });
        activeWebNotifCount++;
        notif.onclose = () => { activeWebNotifCount = Math.max(0, activeWebNotifCount - 1); };
      }
    } else if (Notification.permission === 'default') {
      // Auto-request permission and fire notification if granted
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          const notif = new Notification(title, { body, icon: '/icon-192.png' });
          activeWebNotifCount++;
          notif.onclose = () => { activeWebNotifCount = Math.max(0, activeWebNotifCount - 1); };
        }
      }).catch(() => { /* silently ignore */ });
    }
    // 'denied': do nothing
  }

  if (options?.sound !== false) {
    playNotifSound(options?.soundType ?? 'soft');
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined') return 'denied';
  const electron = (window as any).electron;
  if (electron?.sendNotification) return 'granted'; // Electron always works
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

// ── Task reminders ─────────────────────────────────────────────────────────────

export function checkAndSendTaskReminders(
  tasks: Array<{ id: string; title: string; dueDate?: string; completed?: boolean }>,
): void {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const overdue = tasks.filter((t) => {
    if (t.completed || !t.dueDate) return false;
    return new Date(t.dueDate) < today;
  });

  const dueToday = tasks.filter((t) => {
    if (t.completed || !t.dueDate) return false;
    const d = new Date(t.dueDate);
    const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return dDay.getTime() === today.getTime();
  });

  if (overdue.length > 0) {
    const names = overdue
      .slice(0, 2)
      .map((t) => `• ${t.title}`)
      .join('\n');
    sendDesktopNotification(
      `${overdue.length} tâche${overdue.length > 1 ? 's' : ''} en retard`,
      names + (overdue.length > 2 ? `\n… et ${overdue.length - 2} autres` : ''),
      { soundType: 'alert' },
    );
  }

  if (dueToday.length > 0) {
    const names = dueToday
      .slice(0, 2)
      .map((t) => `• ${t.title}`)
      .join('\n');
    sendDesktopNotification(
      `${dueToday.length} tâche${dueToday.length > 1 ? 's' : ''} pour aujourd'hui`,
      names,
      { sound: true },
    );
  }
}

// ── Lead pipeline reminders ────────────────────────────────────────────────────

export function checkAndSendLeadReminder(
  leads: Array<{ status?: string }>,
): void {
  const newLeads = leads.filter((l) => l.status === 'New').length;
  if (newLeads === 0) {
    sendDesktopNotification(
      'Pipeline vide — Prospectez !',
      "Aucun nouveau lead. Lancez une prospection depuis /prospecting.",
    );
  } else if (newLeads >= 50) {
    sendDesktopNotification(
      `${newLeads} leads en attente de contact`,
      "Pensez à prioriser et à lancer vos séquences.",
    );
  }
}

// ── Lead aging (inactive 7+ days) ─────────────────────────────────────────────

export function checkAndSendLeadAgingAlerts(
  leads: Array<{ id: string; businessName?: string; status?: string; updatedAt?: string }>,
): void {
  const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const aging = leads.filter((l) => {
    if (!l.updatedAt || l.status === 'Won' || l.status === 'Lost') return false;
    return now - new Date(l.updatedAt).getTime() > SEVEN_DAYS;
  });
  if (aging.length === 0) return;
  const names = aging
    .slice(0, 3)
    .map((l) => `• ${l.businessName || 'Lead inconnu'}`)
    .join('\n');
  sendDesktopNotification(
    `${aging.length} lead${aging.length > 1 ? 's' : ''} sans activité depuis 7 jours`,
    names + (aging.length > 3 ? `\n… et ${aging.length - 3} autres` : ''),
    { soundType: 'soft' },
  );
}

// ── Monthly goal milestones ────────────────────────────────────────────────────

export function checkAndSendGoalMilestone(
  metric: string,
  current: number,
  target: number,
  previousPct: number,
): void {
  const pct = target > 0 ? (current / target) * 100 : 0;
  const milestones = [25, 50, 75, 100];
  for (const milestone of milestones) {
    if (previousPct < milestone && pct >= milestone) {
      sendDesktopNotification(
        milestone === 100 ? `🎯 Objectif ${metric} atteint !` : `${milestone}% de l'objectif ${metric}`,
        milestone === 100
          ? `Bravo ! ${current} / ${target} — objectif mensuel accompli.`
          : `${current} / ${target} — continuez comme ça !`,
        { soundType: milestone === 100 ? 'alert' : 'soft' },
      );
      return;
    }
  }
}

// SMS stub — configured externally via SUPPORT_SMTP or Twilio
export async function sendSmsNotification(
  to: string,
  body: string,
): Promise<{ sent: boolean; error?: string }> {
  console.info('[SMS stub] Would send to', to, ':', body);
  return { sent: false, error: 'SMS provider not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.' };
}
