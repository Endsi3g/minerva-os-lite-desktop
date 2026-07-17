'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layers, ArrowRight, X } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { useSetupProgress } from '@/lib/use-setup-progress';

const DISMISSED_KEY = 'minerva_setup_banner_dismissed';

export function TodaySetupBanner() {
  const { user } = useReach();
  const { loading, completedCount, total } = useSetupProgress();

  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(localStorage.getItem(DISMISSED_KEY) === '1');
  }, []);

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISSED_KEY, '1');
    }
    setDismissed(true);
  };

  if (!user || dismissed || loading || completedCount >= total) return null;

  const pct = Math.round((completedCount / total) * 100);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#059669]/20 bg-[#059669]/5 px-4 py-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#059669]/10 text-[#059669]">
        <Layers className="h-3.5 w-3.5" />
      </div>
 
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-[#26251e]">
            Configuration — {completedCount}/{total} étapes complétées
          </span>
          <span className="text-[10px] text-[#78716c]">({pct}%)</span>
        </div>
        <div className="h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-[#e5e5e0]">
          <div
            className="h-full rounded-full bg-[#059669] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
 
      <Link href="/setup" className="shrink-0">
        <button className="flex items-center gap-1 text-xs font-semibold text-[#059669] hover:underline cursor-pointer">
          Continuer
          <ArrowRight className="h-3 w-3" />
        </button>
      </Link>

      <button
        onClick={handleDismiss}
        className="shrink-0 text-[#a8a29e] hover:text-[#26251e] transition-colors ml-1"
        aria-label="Masquer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
