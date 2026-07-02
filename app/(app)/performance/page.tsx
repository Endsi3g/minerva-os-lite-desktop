import type { Metadata } from 'next';
import { PerformanceRoot } from './_components/performance-root';

export const metadata: Metadata = { title: 'Classement de performance' };

export default function PerformancePage() {
  return <PerformanceRoot />;
}
