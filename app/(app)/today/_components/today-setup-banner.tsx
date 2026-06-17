'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layers, ArrowRight, X } from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';

const DISMISSED_KEY = 'minerva_setup_banner_dismissed';

export function TodaySetupBanner() {
  const { user, leads, goals, activeWorkspace } = useReach();

  const [visible, setVisible] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const total = 6;

  useEffect(() => {
    if (!user) return;
    if (typeof window !== 'undefined' && localStorage.getItem(DISMISSED_KEY) === '1') return;

    const check = async () => {
      try {
        const supabase = createClient();

        const [settingsRes, sequencesRes, teamRes] = await Promise.all([
          supabase
            .from('settings')
            .select('full_name, company_name, google_refresh_token')
            .eq('user_id', user.id)
            .single(),
          activeWorkspace
            ? supabase
                .from('email_sequences')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
            : Promise.resolve({ count: 0 }),
          activeWorkspace
            ? supabase
                .from('team_members')
                .select('id', { count: 'exact', head: true })
                .eq('workspace_id', activeWorkspace.id)
                .eq('status', 'active')
            : Promise.resolve({ count: 0 }),
        ]);

        const s = settingsRes.data;
        const done = [
          !!(s?.full_name && s?.company_name),
          !!s?.google_refresh_token,
          leads.length > 0,
          (sequencesRes.count ?? 0) > 0,
          goals.length > 0,
          (teamRes.count ?? 0) > 0,
        ].filter(Boolean).length;

        setCompletedCount(done);
        setVisible(done < total);
      } catch {
        // silently fail
      }
    };

    check();
  }, [user, leads.length, goals.length, activeWorkspace]);

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(DISMISSED_KEY, '1');
    }
    setVisible(false);
  };

  if (!visible) return null;

  const pct = Math.round((completedCount / total) * 100);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-[#f54e00]/20 bg-[#f54e00]/5 px-4 py-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#f54e00]/10 text-[#f54e00]">
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
            className="h-full rounded-full bg-[#f54e00] transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <Link href="/setup" className="shrink-0">
        <button className="flex items-center gap-1 text-xs font-semibold text-[#f54e00] hover:underline">
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
