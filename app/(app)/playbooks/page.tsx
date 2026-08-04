'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Playbooks a été retiré (contenu 100% statique/codé en dur, non fonctionnel) —
// ses cas d'usage sont couverts par Séquences (planification) + Campagnes (objectifs).
export default function PlaybooksRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/sequences');
  }, [router]);
  return null;
}
