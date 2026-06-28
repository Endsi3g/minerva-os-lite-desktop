import React from 'react';
import ClientReportDetail from './client-report-detail';

export const metadata = {
  title: 'Rapport client',
  description: 'Rapport client détaillé et statistiques CRM.',
};

// Next.js static export fallback route parameter
export function generateStaticParams() {
  return [{ id: '_placeholder_' }];
}

export default function ClientReportPage() {
  return <ClientReportDetail />;
}
