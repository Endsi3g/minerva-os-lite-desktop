'use client';

import { useParams } from 'next/navigation';
import { CallsPlanRoot } from './_components/calls-plan-root';

export default function CallsPlanPageClient() {
  const params = useParams();
  const planId = (params?.planId as string) || '';
  return <CallsPlanRoot planId={planId} />;
}
