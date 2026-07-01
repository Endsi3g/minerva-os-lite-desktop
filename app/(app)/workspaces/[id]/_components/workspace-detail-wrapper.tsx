'use client';
import { useParams } from 'next/navigation';
import WorkspaceDetailClient from './workspace-detail-client';

export default function WorkspaceDetailWrapper() {
  const { id } = useParams<{ id: string }>();
  return <WorkspaceDetailClient id={id} />;
}
