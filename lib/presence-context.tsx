'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { createClient } from './supabase/client';

export interface OnlineUser {
  userId: string;
  name: string;
  avatar: string | null;
  page: string;
  onlineAt: string;
}

interface PresenceContextType {
  onlineUsers: OnlineUser[];
}

const PresenceContext = createContext<PresenceContextType>({ onlineUsers: [] });

export const usePresence = () => useContext(PresenceContext);

interface PresenceProviderProps {
  children: React.ReactNode;
  workspaceId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  currentPage: string;
}

export function PresenceProvider({
  children,
  workspaceId,
  userId,
  userName,
  userAvatar,
  currentPage,
}: PresenceProviderProps) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  useEffect(() => {
    if (!workspaceId || !userId) return;
    const supabase = createClient();
    const channel = supabase.channel(`presence-workspace-${workspaceId}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on(
        'presence',
        { event: 'sync' },
        () => {
          const state = channel.presenceState() as Record<
            string,
            Array<{ name: string; avatar: string | null; page: string; online_at: string }>
          >;
          const users: OnlineUser[] = Object.entries(state).map(([uid, presences]) => ({
            userId: uid,
            name: presences[0]?.name || '',
            avatar: presences[0]?.avatar || null,
            page: presences[0]?.page || '',
            onlineAt: presences[0]?.online_at || '',
          }));
          setOnlineUsers(users);
        }
      )
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            name: userName,
            avatar: userAvatar,
            page: currentPage,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, userId]);

  // Update tracked page when currentPage changes without re-subscribing
  useEffect(() => {
    if (channelRef.current) {
      channelRef.current
        .track({
          name: userName,
          avatar: userAvatar,
          page: currentPage,
          online_at: new Date().toISOString(),
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage]);

  return (
    <PresenceContext.Provider value={{ onlineUsers }}>
      {children}
    </PresenceContext.Provider>
  );
}
