'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Acquisition a été retiré — l'ajout manuel de lead vit dans /leads/new, et
// l'import CSV + la fusion de doublons vivent déjà nativement dans /leads (en-tête).
export default function AcquisitionRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/leads');
  }, [router]);
  return null;
}
