'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Le tour animé a été retiré — /setup (checklist) est désormais le seul
// point d'entrée onboarding, il couvrait les mêmes jalons en double.
export default function GuideRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/setup');
  }, [router]);
  return null;
}
