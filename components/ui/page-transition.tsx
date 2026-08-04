'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * PageTransition — wraps page content with a fade-in animation on route change.
 * Uses usePathname() to detect navigation and applies a 200ms fade.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(true);
  const prevPathname = useRef(pathname);

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      setIsVisible(false);
      const t = setTimeout(() => {
        setIsVisible(true);
        prevPathname.current = pathname;
      }, 80);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  return (
    <div
      style={{
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 200ms ease-in-out',
        willChange: 'opacity',
      }}
    >
      {children}
    </div>
  );
}
