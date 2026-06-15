import { PipelineRoot } from './_components/pipeline-root';
import { ErrorBoundary } from '@/components/error-boundary';

export const metadata = {
  title: 'Pipeline - Minerva Reach',
  description: 'Suivi visuel et progression de tes opportunités de vente.',
};

export default function PipelinePage() {
  return (
    <ErrorBoundary>
      <PipelineRoot />
    </ErrorBoundary>
  );
}
