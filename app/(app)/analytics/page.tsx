import { AnalyticsDashboard } from '@/components/analytics-dashboard';

export const metadata = {
  title: 'Analyses - Minerva Reach',
  description: 'Consultez les données d\'utilisation et d\'activité de votre espace de travail.',
};

export default function AnalyticsPage() {
  return (
    <div className="h-full overflow-y-auto min-h-0 scrollbar-thin">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
        <AnalyticsDashboard />
      </div>
    </div>
  );
}
