export const metadata = {
  title: 'Nouvel agent',
  description: 'Créez un nouvel agent IA personnalisé.',
};

import { AgentCreateRoot } from './_components/agent-create-root';

export default function NewAgentPage() {
  return <AgentCreateRoot />;
}
