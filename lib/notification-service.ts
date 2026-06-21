// Desktop notification service — Electron IPC or Web Notification API

export type NotifPayload = { title: string; body: string };

export function sendDesktopNotification(title: string, body: string): void {
  if (typeof window === 'undefined') return;
  const electron = (window as any).electron;
  if (electron?.sendNotification) {
    electron.sendNotification(title, body);
    return;
  }
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icon-192.png' });
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
    );
  }
}

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

// SMS stub — configured externally via SUPPORT_SMTP or Twilio
export async function sendSmsNotification(
  to: string,
  body: string,
): Promise<{ sent: boolean; error?: string }> {
  // SMS provider not yet configured — log intent only
  console.info('[SMS stub] Would send to', to, ':', body);
  return { sent: false, error: 'SMS provider not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.' };
}
