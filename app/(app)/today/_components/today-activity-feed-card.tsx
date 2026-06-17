'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Mail, FileText, Phone, MessageSquare, Bell, User, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useReach } from '@/lib/reach-context';
import { createClient } from '@/lib/supabase/client';

interface FeedItem {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  time: string;
  link?: string;
}

const ACTIVITY_ICON: Record<string, React.ReactNode> = {
  email: <Mail className="h-3 w-3 text-blue-500" />,
  call: <Phone className="h-3 w-3 text-green-500" />,
  note: <FileText className="h-3 w-3 text-[#78716c]" />,
  general: <FileText className="h-3 w-3 text-[#78716c]" />,
  visit: <User className="h-3 w-3 text-purple-500" />,
  reply_detected: <Mail className="h-3 w-3 text-[#f54e00]" />,
  lead_assigned: <User className="h-3 w-3 text-blue-500" />,
  default: <Activity className="h-3 w-3 text-[#a8a29e]" />,
};

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  return `il y a ${Math.floor(hours / 24)}j`;
}

export function TodayActivityFeedCard() {
  const { user, activeWorkspace, notifications } = useReach();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !activeWorkspace) return;

    const fetchActivity = async () => {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data: activities } = await supabase
          .from('activities')
          .select('id, type, title, body, lead_id, created_at')
          .eq('workspace_id', activeWorkspace.id)
          .order('created_at', { ascending: false })
          .limit(8);

        const activityItems: FeedItem[] = (activities || []).map((a: any) => ({
          id: `act-${a.id}`,
          icon: ACTIVITY_ICON[a.type] ?? ACTIVITY_ICON.default,
          title: a.title || a.type,
          subtitle: a.body || '',
          time: relativeTime(a.created_at),
          link: a.lead_id ? `/leads/${a.lead_id}` : undefined,
        }));

        // Merge with recent notifications (last 24h, unread)
        const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const notifItems: FeedItem[] = notifications
          .filter(n => n.createdAt > cutoff && ['reply_detected', 'lead_assigned'].includes(n.type))
          .slice(0, 4)
          .map(n => ({
            id: `notif-${n.id}`,
            icon: ACTIVITY_ICON[n.type] ?? <Bell className="h-3 w-3 text-[#a8a29e]" />,
            title: n.title,
            subtitle: n.body,
            time: relativeTime(n.createdAt),
            link: n.link,
          }));

        // Merge, deduplicate by id, sort by time (most recent first)
        const merged = [...activityItems, ...notifItems]
          .sort((a, b) => {
            // Items with relative times are already sorted; keep order
            return 0;
          })
          .slice(0, 10);

        setItems(merged);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchActivity();
  }, [user, activeWorkspace, notifications]);

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#f54e00]/10 text-[#f54e00]">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold font-sans">Activité récente</CardTitle>
            <CardDescription className="text-xs">Notes, emails et réponses de vos leads</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-6 pb-4">
        {loading ? (
          <p className="text-xs text-[#78716c] py-2">Chargement…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <MessageSquare className="h-7 w-7 text-[#a8a29e] opacity-50" />
            <p className="text-xs text-[#78716c]">Aucune activité récente.</p>
            <Link href="/leads" className="text-[10px] font-semibold text-[#f54e00] hover:underline flex items-center gap-0.5">
              Voir les leads <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {items.map(item => (
              <div key={item.id} className="group flex items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-[#f4f4f3] transition-colors">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#f4f4f3] group-hover:bg-white">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  {item.link ? (
                    <Link href={item.link} className="truncate text-xs font-medium text-[#26251e] hover:text-[#f54e00] transition-colors block">
                      {item.title}
                    </Link>
                  ) : (
                    <p className="truncate text-xs font-medium text-[#26251e]">{item.title}</p>
                  )}
                  {item.subtitle && (
                    <p className="truncate text-[10px] text-[#78716c]">{item.subtitle}</p>
                  )}
                </div>
                <span className="shrink-0 text-[10px] text-[#a8a29e] tabular-nums">{item.time}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
