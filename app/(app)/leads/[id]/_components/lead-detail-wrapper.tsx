'use client';
import { useParams } from 'next/navigation';
import { LeadDetailClient } from './lead-detail-client';

export default function LeadDetailWrapper() {
  const { id } = useParams<{ id: string }>();
  return <LeadDetailClient id={id} />;
}
