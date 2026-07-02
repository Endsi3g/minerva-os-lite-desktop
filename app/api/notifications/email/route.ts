import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email-service';
import {
  emailNewLead,
  emailLeadAging,
  emailTaskDue,
  emailWeeklyDigest,
  emailMention,
} from '@/lib/email-templates';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { type, recipientEmail, recipientName, ...data } = body as {
    type: string;
    recipientEmail: string;
    recipientName: string;
    [key: string]: unknown;
  };

  if (!recipientEmail || !type) {
    return NextResponse.json({ error: 'Missing fields: recipientEmail and type are required' }, { status: 400 });
  }

  const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://minerva-os-lite-desktop.vercel.app';

  let subject: string;
  let html: string;

  switch (type) {
    case 'new_lead': {
      const d = data as {
        businessName?: string;
        niche?: string;
        city?: string;
        score?: number;
        leadId?: string;
      };
      subject = `Nouveau lead : ${d.businessName ?? 'Inconnu'}`;
      html = emailNewLead({
        recipientName,
        businessName: d.businessName ?? 'Inconnu',
        niche: d.niche ?? '—',
        city: d.city ?? '—',
        score: d.score ?? 0,
        leadUrl: `${BASE}/leads/${d.leadId ?? ''}`,
      });
      break;
    }

    case 'lead_aging': {
      const d = data as {
        agingLeads?: { businessName: string; city: string; daysSince: number; id: string }[];
      };
      const leads = (d.agingLeads ?? []).map((l) => ({ ...l, url: `${BASE}/leads/${l.id}` }));
      subject = `${leads.length} lead${leads.length !== 1 ? 's' : ''} sans activité depuis 7+ jours`;
      html = emailLeadAging({ recipientName, agingLeads: leads });
      break;
    }

    case 'task_due': {
      const d = data as {
        tasks?: { title: string; leadName?: string; dueDate: string }[];
      };
      const tasks = (d.tasks ?? []).map((t) => ({ ...t, url: `${BASE}/tasks` }));
      subject = "Tâches à faire aujourd'hui — Minerva";
      html = emailTaskDue({ recipientName, tasks });
      break;
    }

    case 'weekly_digest': {
      const d = data as {
        stats?: { newLeads: number; contacted: number; won: number; revenue: number };
        topLead?: { businessName: string; city: string; score: number };
        weekNumber?: number;
      };
      subject = `Votre rapport de la semaine — Minerva`;
      html = emailWeeklyDigest({
        recipientName,
        stats: d.stats ?? { newLeads: 0, contacted: 0, won: 0, revenue: 0 },
        topLead: d.topLead,
        weekNumber: d.weekNumber ?? 1,
      });
      break;
    }

    case 'mention': {
      const d = data as {
        mentionedBy?: string;
        context?: string;
      };
      subject = `${d.mentionedBy ?? 'Quelqu\'un'} vous a mentionné sur Minerva`;
      html = emailMention({
        recipientName,
        mentionedBy: d.mentionedBy ?? 'Un membre de l\'équipe',
        context: d.context ?? '',
        url: `${BASE}/messages`,
      });
      break;
    }

    default:
      return NextResponse.json({ error: `Unknown notification type: ${type}` }, { status: 400 });
  }

  const result = await sendEmail({ to: recipientEmail, subject, html });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
  return NextResponse.json({ sent: true });
}
