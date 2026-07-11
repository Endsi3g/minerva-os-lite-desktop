import type { Metadata } from 'next';
import { WeeklyReportRoot } from './_components/weekly-report-root';

export const metadata: Metadata = {
  title: 'Bilan de la semaine',
  description: 'Bilan complet de la semaine : rapport IA, métriques et journal de toutes les actions',
};

export default function WeeklyReportPage() {
  return <WeeklyReportRoot />;
}
