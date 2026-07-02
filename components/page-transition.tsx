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
            setProgress(12);
          }
        } catch {}
      }
    };
    document.addEventListener('click', handleLinkClick, { capture: true });
    return () => document.removeEventListener('click', handleLinkClick, { capture: true });
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

  // Smooth non-linear progress simulation
  useEffect(() => {
    if (!isNavigating) return;
    let raf: number;
    let lastTime = performance.now();

    const tick = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      setProgress((prev) => {
        if (prev >= 90) return prev;
        // Slow down as it approaches 90
        const remaining = 90 - prev;
        const increment = Math.min(remaining * 0.04 * (dt / 16), 4);
        return prev + increment;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [isNavigating]);

  const barVisible = isNavigating || (progress > 0 && progress < 100);

  return (
    <>
      {/* Progress bar */}
      <div
        aria-hidden="true"
        className="fixed top-0 left-0 z-[9999] h-[3px] pointer-events-none"
        style={{
          width: barVisible ? `${progress}%` : progress === 100 ? '100%' : '0%',
          opacity: isNavigating ? 1 : progress === 100 ? 0 : 0,
          transition: isNavigating
            ? 'width 200ms cubic-bezier(0.4,0,0.2,1)'
            : 'width 80ms ease-out, opacity 300ms ease-out 80ms',
          background: 'linear-gradient(90deg, #059669 0%, #10b981 60%, #34d399 100%)',
          boxShadow: isNavigating ? '0 0 8px 1px rgba(5,150,105,0.5)' : 'none',
        }}
      >
        {/* Animated shimmer dot at leading edge */}
        {isNavigating && (
          <div
            className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full"
            style={{
              background: '#34d399',
              boxShadow: '0 0 6px 2px rgba(52,211,153,0.7)',
              transform: 'translateY(-50%) translateX(50%)',
            }}
          />
        )}
      </div>

      {/* Page content — subtle fade + micro lift on route change */}
      <div
        key={displayKey}
        style={
          prefersReducedMotion.current
            ? {}
            : {
                opacity: fadeIn ? 1 : 0,
                transform: fadeIn ? 'translateY(0)' : 'translateY(4px)',
                transition: 'opacity 200ms ease-out, transform 200ms cubic-bezier(0.22,1,0.36,1)',
              }
        }
      >
        {children}
      </div>
    </>
  );
}
