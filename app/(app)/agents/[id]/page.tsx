import { AgentDetailRoot } from './_components/agent-detail-root';

export async function generateStaticParams() {
  return [
    { id: 'audit-gmb' },
    { id: 'pitcheur-qc' },
    { id: 'radar-reputation' },
    { id: 'lucifee' },
  ];
}

export default function AgentDetailPage({ params }: { params: { id: string } }) {
  return <AgentDetailRoot agentId={params.id} />;
}
