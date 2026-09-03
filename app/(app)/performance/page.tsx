'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Performance vit maintenant comme un onglet de /weekly-report (mis en avant,
// avec Analytics) — un seul tableau de bord "comment va mon business" au lieu de trois.
export default function PerformanceRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/leaderboard');
  }, [router]);
  return null;
}
