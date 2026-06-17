import { startOfWeek, startOfMonth, isAfter } from 'date-fns';
import type { Goal } from '@/lib/reach-context';
import type { Lead, Task } from '@/lib/mock-data';

export const METRIC_LABELS: Record<Goal['metric'], string> = {
  leads_created: 'Leads créés',
  leads_contacted: 'Leads contactés',
  leads_won: 'Leads gagnés',
  emails_sent: 'E-mails envoyés',
};

export const PERIOD_LABELS: Record<Goal['period'], string> = {
  week: 'Cette semaine',
  month: 'Ce mois',
};

export function computeProgress(
  metric: Goal['metric'],
  period: Goal['period'],
  leads: Lead[],
  tasks: Task[]
): number {
  const now = new Date();
  const start = period === 'week' ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now);

  switch (metric) {
    case 'leads_created':
      return leads.filter(l => l.createdAt && isAfter(new Date(l.createdAt), start)).length;
    case 'leads_contacted':
      return leads.filter(l => l.createdAt && isAfter(new Date(l.createdAt), start) && l.status !== 'New').length;
    case 'leads_won':
      return leads.filter(l => l.createdAt && isAfter(new Date(l.createdAt), start) && l.status === 'Won').length;
    case 'emails_sent':
      return leads.filter(l => l.createdAt && isAfter(new Date(l.createdAt), start) && l.status !== 'New').length;
    default:
      return 0;
  }
}
