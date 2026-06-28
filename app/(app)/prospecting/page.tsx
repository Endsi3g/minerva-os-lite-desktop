import ProspectingRoot from './_components/prospecting-root';
import { ErrorBoundary } from '@/components/error-boundary';

export const metadata = {
  title: 'Prospection',
  description: 'Recherche et extraction de prospects locaux via Google Maps.',
};

export default function ProspectingPage() {
  return (
    <ErrorBoundary>
      <ProspectingRoot />
    </ErrorBoundary>
  );
}
