'use client';

import { useEffect, useState } from 'react';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';

// Single source of truth for "is this workspace set up" — shared by the
// /guide checklist, the /setup page, and the TodaySetupBanner nudge, which
// previously each computed their own (inconsistent) version of this state.
export interface SetupProgress {
  loading: boolean;
  profileDone: boolean;
  gmailDone: boolean;
  leadsDone: boolean;
  sequenceDone: boolean;
  goalsDone: boolean;
  teamDone: boolean;
  completedCount: number;
  total: number;
}

const TOTAL_STEPS = 6;

export function useSetupProgress(): SetupProgress {
  const { user, leads, goals, activeWorkspace } = useReach();
  const [loading, setLoading] = useState(true);
  const [profileDone, setProfileDone] = useState(false);
  const [gmailDone, setGmailDone] = useState(false);
  const [sequenceDone, setSequenceDone] = useState(false);
  const [teamDone, setTeamDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const check = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const [settingsRes, googleAccountRes, sequencesRes, teamRes] = await Promise.all([
          supabase
            .from('settings')
            .select('full_name, company_name, google_refresh_token')
            .eq('user_id', user.id)
            .single(),
          supabase
            .from('google_accounts')
            .select('id')
            .eq('user_id', user.id)
            .eq('status', 'connected')
            .maybeSingle(),
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
        if (cancelled) return;

        const s = settingsRes.data;
        setProfileDone(!!(s?.full_name && s?.company_name));
        setGmailDone(!!googleAccountRes.data || !!s?.google_refresh_token);
        setSequenceDone((sequencesRes.count ?? 0) > 0);
        setTeamDone((teamRes.count ?? 0) > 0);
      } catch {
        // silently fail — steps stay unchecked
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    check();
    return () => { cancelled = true; };
  }, [user, activeWorkspace]);

  const leadsDone = leads.length > 0;
  const goalsDone = goals.length > 0;
  const completedCount = [profileDone, gmailDone, leadsDone, sequenceDone, goalsDone, teamDone]
    .filter(Boolean).length;

  return {
    loading,
    profileDone,
    gmailDone,
    leadsDone,
    sequenceDone,
    goalsDone,
    teamDone,
    completedCount,
    total: TOTAL_STEPS,
  };
}
