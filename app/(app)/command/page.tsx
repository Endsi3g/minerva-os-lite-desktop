import { ErrorBoundary } from '@/components/error-boundary';
import { CommandRoot } from './_components/command-root';

export const metadata = {
  title: 'Command Center',
  description: 'Pilotez votre stratégie commerciale en temps réel.',
};

export default function CommandPage() {
  return (
    <ErrorBoundary>
      <CommandRoot />
    </ErrorBoundary>
  );
}
