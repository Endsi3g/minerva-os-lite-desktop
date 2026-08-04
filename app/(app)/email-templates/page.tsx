'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Stub de redirection pure — le vrai écran vit à /settings/email-templates.
export default function EmailTemplatesRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/settings/email-templates');
  }, [router]);
  return null;
}
