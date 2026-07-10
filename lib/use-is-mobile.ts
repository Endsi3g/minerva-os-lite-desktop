'use client';

import { useState, useEffect } from 'react';

// Shared viewport-width mobile check — was duplicated inline in app/(app)/layout.tsx
// before v3.90.0. Matches the `md:` Tailwind breakpoint (768px) used everywhere else
// in the app shell, so mobile-specific JSX branches stay consistent with the CSS.
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [breakpoint]);

  return isMobile;
}
