'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Analytics vit maintenant comme un onglet de /weekly-report (avec Performance
// équipe) — un seul tableau de bord "comment va mon business" au lieu de trois.
export default function AnalyticsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/weekly-report?tab=analytics');
  }, [router]);
  return null;
}
