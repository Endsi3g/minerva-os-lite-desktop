// Static export: params resolved client-side
export function generateStaticParams() { return []; }

export const metadata = {
  title: 'Mode terrain',
  description: 'Préparez et exécutez votre tournée de prospection.',
};

import React from 'react';
import { FieldRoot } from '../_components/field-root';

export const dynamic = 'force-dynamic';

export default async function FieldPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<Record<string, string>>;
}) {
  const resolved = await params;
  const sp = await searchParams;
  return <FieldRoot planId={resolved.planId} refreshToken={sp.t || ''} />;
}
