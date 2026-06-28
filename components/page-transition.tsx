'use client';

import React, { useState, useEffect, useRef, startTransition } from 'react';
import { usePathname } from 'next/navigation';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [displayKey, setDisplayKey] = useState(pathname);
  const [fadeIn, setFadeIn] = useState(true);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // When route finishes, fade the new content in
  useEffect(() => {
    setIsNavigating(false);
    setProgress(100);
    setDisplayKey(pathname);
    if (!prefersReducedMotion.current) {
      setFadeIn(false);
      const t = requestAnimationFrame(() => {
        requestAnimationFrame(() => setFadeIn(true));
      });
      return () => cancelAnimationFrame(t);
    }
  }, [pathname]);

  // Intercept anchor clicks
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (anchor && anchor.href) {
        try {
          const url = new URL(anchor.href);
          const currentUrl = new URL(window.location.href);
          const isInternal =
            url.origin === currentUrl.origin &&
            url.pathname !== currentUrl.pathname &&
            !anchor.getAttribute('download') &&
            anchor.target !== '_blank';
          if (isInternal) {
            setIsNavigating(true);
            setProgress(15);
          }
        } catch {}
      }
    };
    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      startTransition(() => {
        setIsNavigating(true);
        setProgress(50);
      });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Animate progress bar
  useEffect(() => {
    if (!isNavigating) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 88) return prev;
        return prev + Math.random() * 10;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [isNavigating]);

  return (
    <>
      {/* Thin top progress bar — only visible during navigation */}
      <div
        className="fixed top-0 left-0 z-[9999] h-[2px] bg-[#059669] transition-all ease-out pointer-events-none"
        style={{
          width: isNavigating ? `${progress}%` : progress === 100 ? '100%' : '0%',
          opacity: isNavigating ? 1 : progress === 100 ? 0 : 0,
          transitionDuration: isNavigating ? '300ms' : '150ms',
        }}
      />

      {/* Page content with subtle fade on route change */}
      <div
        key={displayKey}
        style={
          prefersReducedMotion.current
            ? {}
            : {
                opacity: fadeIn ? 1 : 0,
                transition: 'opacity 180ms ease-out',
              }
        }
      >
        {children}
      </div>
    </>
  );
}
