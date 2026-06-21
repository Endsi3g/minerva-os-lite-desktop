import React from 'react';
import { FieldRoot } from '../_components/field-root';

export function generateStaticParams() {
  return [{ planId: '_placeholder_' }];
}

export default async function FieldPlanPage({
  params,
}: {
  params: Promise<{ planId: string }>;
}) {
  const resolved = await params;
  return <FieldRoot planId={resolved.planId} />;
}
