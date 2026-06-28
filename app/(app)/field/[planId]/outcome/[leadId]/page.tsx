import React from 'react';
import OutcomeClient from './outcome-client';

export const metadata = {
  title: 'Enregistrer le passage',
  description: 'Saisissez le résultat de votre visite terrain.',
};

// Next.js static export fallback route parameters
export function generateStaticParams() {
  return [{ planId: '_placeholder_', leadId: '_placeholder_' }];
}

export default function FieldOutcomePage() {
  return <OutcomeClient />;
}
