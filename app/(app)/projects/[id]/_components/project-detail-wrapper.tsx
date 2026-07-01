'use client';
import { useParams } from 'next/navigation';
import ProjectDetailRoot from './project-detail-root';

export default function ProjectDetailWrapper() {
  const { id } = useParams<{ id: string }>();
  return <ProjectDetailRoot id={id} />;
}
