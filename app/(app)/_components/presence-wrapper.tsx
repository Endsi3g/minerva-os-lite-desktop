'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { PresenceProvider, usePresence } from '@/lib/presence-context';
import { createClient } from '@/lib/supabase/client';

interface PresenceWrapperProps {
  children: React.ReactNode;
}

/**
 * OnlineIndicator — shows how many other workspace members are currently online.
 * Rendered inside the PresenceProvider so it can consume usePresence().
 */
export function OnlineIndicator({ currentUserId }: { currentUserId: string }) {
  const { onlineUsers } = usePresence();
  const othersCount = onlineUsers.filter((u) => u.userId !== currentUserId).length;

  if (othersCount === 0) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#059669]/10 border border-[#059669]/20 select-none">
      <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse" />
      <span className="text-[10px] font-semibold text-[#059669]">
        {othersCount} en ligne
      </span>
    </div>
  );
}

/**
 * PresenceWrapper — initializes Supabase Realtime Presence for the active workspace.
 * Uses ReachContext to obtain user + workspace info, and Supabase client for profile lookup.
 * Intended to wrap authenticated layout children.
 */
export function PresenceWrapper({ children }: PresenceWrapperProps) {
  const { user, activeWorkspace } = useReach();
  const pathname = usePathname();

  const [profile, setProfile] = useState<{
    fullName: string;
    avatar: string | null;
  } | null>(null);

  // Load profile from settings table (name + avatar)
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('settings')
      .select('full_name, avatar_base64')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }: { data: { full_name: string; avatar_base64: string | null } | null }) => {
        if (data) {
          // Prefer localStorage-cached avatar for instant display
          const cachedAvatar =
            typeof window !== 'undefined'
              ? localStorage.getItem('minerva_avatar')
              : null;
          setProfile({
            fullName: data.full_name || 'Utilisateur',
            avatar: cachedAvatar ?? data.avatar_base64 ?? null,
          });
        }
      });
  }, [user]);

  // Don't render presence tracking if missing required data
  if (!user || !activeWorkspace || !profile) {
    return <>{children}</>;
  }

  return (
    <PresenceProvider
      workspaceId={activeWorkspace.id}
      userId={user.id}
      userName={profile.fullName}
      userAvatar={profile.avatar}
      currentPage={pathname}
    >
      {children}
    </PresenceProvider>
  );
}
