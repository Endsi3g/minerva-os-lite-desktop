import type { Metadata } from 'next';
import { Suspense } from 'react';
import { WeeklyReportRoot } from './_components/weekly-report-root';

export const metadata: Metadata = {
  title: 'Bilan de la semaine',
  description: 'Bilan IA hebdomadaire, performance de l\'équipe et analytics — réunis en un seul endroit.',
};

export default function WeeklyReportPage() {
  return (
    <Suspense fallback={null}>
      <WeeklyReportRoot />
    </Suspense>
  );
}
