export const metadata = {
  title: 'Agent',
  description: "Détails et configuration d'un agent IA.",
};

import { AgentDetailRoot } from './_components/agent-detail-root';

export async function generateStaticParams() {
  return [
    { id: 'audit-gmb' },
    { id: 'pitcheur-qc' },
    { id: 'radar-reputation' },
    { id: 'lucifee' },
  ];
}

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AgentDetailRoot agentId={id} />;
}
