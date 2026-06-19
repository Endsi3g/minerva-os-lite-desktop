'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { FieldRoot } from '../_components/field-root';

export default function FieldPlanPage() {
  const params = useParams<{ planId: string }>();
  return <FieldRoot planId={params.planId} />;
}
