import React, { Suspense } from 'react';
import { AgendaNewRoot } from './_components/agenda-new-root';

export const metadata = {
  title: 'Nouveau rendez-vous',
  description: 'Planifiez un rendez-vous et synchronisez-le avec votre équipe.',
};

export default function AgendaNewPage() {
  return (
    <Suspense fallback={<div className="h-full" />}>
      <AgendaNewRoot />
    </Suspense>
  );
}
