'use client';

import React, { useState, useEffect, startTransition } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { MinervaIcon } from '@/components/icons';

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Reset navigation states when pathname changes
  useEffect(() => {
    setIsNavigating(false);
    setProgress(100);
  }, [pathname]);

  // Intercept anchor clicks to show transition loaders
  useEffect(() => {
    const handleLinkClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest('a');
      if (anchor && anchor.href) {
        const url = new URL(anchor.href);
        const currentUrl = new URL(window.location.href);

        // Check if internal route change
        const isInternal = 
          url.origin === currentUrl.origin &&
          url.pathname !== currentUrl.pathname &&
          !anchor.getAttribute('download') &&
          anchor.target !== '_blank';

        if (isInternal) {
          setIsNavigating(true);
          setProgress(10);
        }
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, []);

  // Intercept window unload events (like redirects using location.replace).
  // startTransition defers the setState outside React's current render cycle,
  // preventing the "setState during render of Router" violation in Next.js 16.
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

  // Animate the progress bar during route loading
  useEffect(() => {
    if (!isNavigating) return;
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + Math.random() * 12;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isNavigating]);

  return (
    <>
      {/* Top Progress Loading Bar */}
      {isNavigating && (
        <div 
          className="fixed top-0 left-0 h-[2.5px] bg-gradient-to-r from-[#10b981] to-[#10b981] z-[9999] transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      )}

      {/* Main content transition blur */}
      <div 
        className={`relative transition-all duration-300 ease-in-out ${
          isNavigating ? 'blur-[1.5px] pointer-events-none opacity-90' : ''
        }`}
      >
        {children}
      </div>

      {/* Screen Loader Spinner Modal overlay */}
      {isNavigating && (
        <div className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-white/40 dark:bg-black/30 backdrop-blur-[1.5px] animate-in fade-in duration-300">
          <div className="flex flex-col items-center gap-3 p-6 bg-white border border-[#e6e5e0] rounded-2xl shadow-none">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-[#10b981]/10 border border-[#10b981]/20">
              <MinervaIcon size={20} className="text-[#10b981]" />
              <Loader2 className="absolute inset-0 h-10 w-10 text-[#10b981] animate-spin stroke-[1.5]" />
            </div>
            <span className="text-[10px] font-semibold tracking-wider text-[#807d72] uppercase">
              Chargement...
            </span>
          </div>
        </div>
      )}
    </>
  );
}
