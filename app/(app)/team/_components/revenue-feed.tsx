'use client';

import React, { useEffect, useState } from 'react';
import { Reply, CalendarCheck2, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface RevenueEvent {
  id: string;
  type: 'email_received' | 'calendar_event_created';
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "À l'instant";
  if (mins < 60) return `Il y a ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Il y a ${days}j`;
}

export function RevenueFeed({ workspaceId }: { workspaceId: string }) {
  const [events, setEvents] = useState<RevenueEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) return;
    const supabase = createClient();
    supabase
      .from('notifications')
      .select('id, type, title, body, link, created_at')
      .eq('workspace_id', workspaceId)
      .in('type', ['email_received', 'calendar_event_created'])
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }: { data: RevenueEvent[] | null }) => {
        setEvents(data ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="space-y-1 py-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-start gap-3 py-3">
            <div className="w-8 h-8 rounded-full animate-pulse bg-[#e5e5e0] shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-40 animate-pulse rounded bg-[#e5e5e0]" />
              <div className="h-2.5 w-56 animate-pulse rounded bg-[#e5e5e0]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
        <CalendarCheck2 className="h-8 w-8 text-[#d4d4d0]" />
        <p className="text-sm font-bold text-[#807d72]">Aucun événement de revenu cette semaine.</p>
        <p className="text-xs text-[#b0b0a8]">Les réponses positives et bookings apparaîtront ici.</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-[#e5e5e0] py-2">
      {events.map((ev) => {
        const isEmail = ev.type === 'email_received';
        return (
          <div key={ev.id} className="flex items-start gap-3 py-3 last:border-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: isEmail ? '#059669' : '#2563eb' }}
            >
              {isEmail
                ? <Reply className="h-4 w-4 text-white" />
                : <CalendarCheck2 className="h-4 w-4 text-white" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#26251e] truncate">{ev.title}</p>
              {ev.body && (
                <p className="text-[11px] text-[#7a7a76] truncate mt-0.5">{ev.body}</p>
              )}
              <p className="text-[10px] text-[#b0b0a8] mt-1">{relativeTime(ev.created_at)}</p>
            </div>
            {ev.link && (
              <a
                href={ev.link}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-[#f4f4f3] transition-colors text-[#7a7a76] mt-0.5"
              >
                <ChevronRight className="h-4 w-4" />
              </a>
            )}
          </div>
        );
      })}
    </div>
  );
}
