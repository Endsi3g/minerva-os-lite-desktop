import { TodayRoot } from './_components/today-root';
import { ErrorBoundary } from '@/components/error-boundary';

export const metadata = {
  title: "Aujourd'hui",
  description: 'Concentre-toi sur tes relances, leads chauds et tâches clés du jour.',
};

export default function TodayPage() {
  return (
    <ErrorBoundary>
      <TodayRoot />
    </ErrorBoundary>
  );
}
