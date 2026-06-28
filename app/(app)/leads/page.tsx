import { LeadsRoot } from './_components/leads-root';
import { ErrorBoundary } from '@/components/error-boundary';

export const metadata = {
  title: 'Leads',
  description: 'Portefeuille global de toutes tes opportunités de prospection.',
};

export default function LeadsPage() {
  return (
    <ErrorBoundary>
      <LeadsRoot />
    </ErrorBoundary>
  );
}
