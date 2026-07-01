'use client';

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { FieldRoot } from '../_components/field-root';

export default function FieldPlanPageClient() {
  const params = useParams();
  const searchParams = useSearchParams();
  const planId = (params?.planId as string) || '';
  const token = searchParams?.get('t') || '';

  return <FieldRoot planId={planId} refreshToken={token} />;
}
