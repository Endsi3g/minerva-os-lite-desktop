'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useReach, type AppNotification } from '@/lib/reach-context';
import {
  Bell, BellOff, Check, CheckCheck, Info, UserCheck, Clock, FileBarChart,
  MessageCircle, Mail, Rss, AlertTriangle, Filter, Trash2,
  CalendarClock, AtSign, Target, RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const TYPE_META: Record<AppNotification['type'], { icon: React.ElementType; label: string; color: string }> = {
  info:            { icon: Info,         label: 'Info',            color: 'text-blue-500 bg-blue-50' },
  lead_assigned:   { icon: UserCheck,    label: 'Lead assigné',    color: 'text-[#059669] bg-[#059669]/10' },
  overdue:         { icon: AlertTriangle,label: 'En retard',       color: 'text-amber-600 bg-amber-50' },
  digest:          { icon: Rss,          label: 'Digest',          color: 'text-purple-500 bg-purple-50' },
  report:          { icon: FileBarChart, label: 'Rapport',         color: 'text-indigo-500 bg-indigo-50' },
  team_message:    { icon: MessageCircle,label: 'Équipe',          color: 'text-[#26251e] bg-[#e5e5e2]' },
  email_sent:      { icon: Mail,         label: 'Email envoyé',    color: 'text-sky-500 bg-sky-50' },
  email_received:  { icon: Mail,         label: 'Email reçu',      color: 'text-teal-500 bg-teal-50' },
  scraping_done:   { icon: Check,        label: 'Scraping',        color: 'text-[#059669] bg-[#059669]/10' },
  lead_aging:      { icon: Clock,        label: 'Lead inactif',    color: 'text-amber-500 bg-amber-50' },
  task_due:        { icon: CalendarClock, label: 'Tâche due',       color: 'text-indigo-500 bg-indigo-50' },
  mention:         { icon: AtSign,       label: 'Mention',          color: 'text-sky-500 bg-sky-50' },
  goal_milestone:  { icon: Target,       label: 'Objectif',         color: 'text-[#059669] bg-[#059669]/10' },
  app_update:      { icon: RefreshCw,    label: 'Mise à jour',      color: 'text-purple-500 bg-purple-50' },
};

const ALL_TYPES: AppNotification['type'][] = [
  'info', 'lead_assigned', 'overdue', 'digest', 'report',
  'team_message', 'email_sent', 'email_received', 'scraping_done', 'lead_aging',
  'task_due', 'mention', 'goal_milestone', 'app_update',
];

function groupByDate(notifs: AppNotification[]): { label: string; items: AppNotification[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  const groups: Record<string, AppNotification[]> = {};

  for (const n of notifs) {
    const d = new Date(n.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    let label: string;
    if (day >= today) label = "Aujourd'hui";
    else if (day >= yesterday) label = 'Hier';
    else if (day >= weekAgo) label = 'Cette semaine';
    else label = 'Plus ancien';
    if (!groups[label]) groups[label] = [];
    groups[label].push(n);
  }

  const ORDER = ["Aujourd'hui", 'Hier', 'Cette semaine', 'Plus ancien'];
  return ORDER.filter(l => groups[l]).map(l => ({ label: l, items: groups[l] }));
}

export function NotificationsRoot() {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useReach();
  const [typeFilter, setTypeFilter] = useState<AppNotification['type'] | 'all'>('all');
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const filtered = useMemo(() => {
    let list = [...notifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (typeFilter !== 'all') list = list.filter(n => n.type === typeFilter);
    if (showUnreadOnly) list = list.filter(n => !n.isRead);
    return list;
  }, [notifications, typeFilter, showUnreadOnly]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const usedTypes = useMemo(
    () => ALL_TYPES.filter(t => notifications.some(n => n.type === t)),
    [notifications]
  );

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8] relative">
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />
      <div className="relative z-10 w-full p-3 sm:p-4 md:p-6 space-y-5 max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#e5e5e0]">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[#059669]" />
              <h1 className="text-xl font-bold tracking-tight text-[#26251e]">Notifications</h1>
              {unreadCount > 0 && (
                <span className="h-5 min-w-5 px-1.5 rounded-full bg-[#059669] text-white text-[10px] font-black flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
            <p className="text-xs text-[#7a7a76] mt-0.5">{notifications.length} notification{notifications.length !== 1 ? 's' : ''} au total</p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllNotificationsRead()}
              className="h-8 text-xs border-[#e5e5e0] gap-1.5 shrink-0"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Tout marquer lu
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <button
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={cn(
              'flex items-center gap-1.5 h-7 px-3 rounded-full text-[10px] font-semibold border transition-colors',
              showUnreadOnly
                ? 'bg-[#26251e] text-white border-[#26251e]'
                : 'bg-white text-[#555552] border-[#e5e5e0] hover:border-[#26251e]'
            )}
          >
            <BellOff className="h-3 w-3" />
            Non lues
          </button>
          <div className="h-4 w-px bg-[#e5e5e0]" />
          <button
            onClick={() => setTypeFilter('all')}
            className={cn(
              'h-7 px-3 rounded-full text-[10px] font-semibold border transition-colors',
              typeFilter === 'all'
                ? 'bg-[#059669] text-white border-[#059669]'
                : 'bg-white text-[#555552] border-[#e5e5e0] hover:border-[#059669]/50'
            )}
          >
            Toutes
          </button>
          {usedTypes.map(t => {
            const meta = TYPE_META[t];
            const Icon = meta.icon;
            const isActive = typeFilter === t;
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(isActive ? 'all' : t)}
                className={cn(
                  'flex items-center gap-1.5 h-7 px-3 rounded-full text-[10px] font-semibold border transition-colors',
                  isActive
                    ? 'bg-[#059669] text-white border-[#059669]'
                    : 'bg-white text-[#555552] border-[#e5e5e0] hover:border-[#059669]/50'
                )}
              >
                <Icon className="h-3 w-3" />
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* Notification list */}
        {notifications.length === 0 ? (
          <EmptyState />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center rounded-xl border border-dashed border-[#e5e5e0]">
            <Filter className="h-8 w-8 text-[#7a7a76]/40" />
            <p className="text-sm font-bold text-[#26251e]">Aucun résultat</p>
            <p className="text-xs text-[#7a7a76]">Modifiez les filtres pour voir plus de notifications.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map(group => (
              <div key={group.label}>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#7a7a76] mb-2">{group.label}</p>
                <div className="space-y-1.5">
                  {group.items.map(n => (
                    <NotificationCard
                      key={n.id}
                      notification={n}
                      onRead={() => markNotificationRead(n.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NotificationCard({
  notification: n,
  onRead,
}: {
  notification: AppNotification;
  onRead: () => void;
}) {
  const meta = TYPE_META[n.type] ?? TYPE_META.info;
  const Icon = meta.icon;

  const inner = (
    <div
      className={cn(
        'flex items-start gap-3 p-3.5 rounded-xl border transition-all',
        n.isRead
          ? 'bg-white border-[#e5e5e0] opacity-70 hover:opacity-100'
          : 'bg-white border-[#059669]/20 shadow-sm hover:border-[#059669]/40'
      )}
      onClick={!n.isRead ? onRead : undefined}
    >
      {/* Icon */}
      <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', meta.color)}>
        <Icon className="h-4 w-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-xs font-semibold leading-snug', n.isRead ? 'text-[#555552]' : 'text-[#26251e]')}>
            {n.title}
          </p>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            {!n.isRead && (
              <span className="h-2 w-2 rounded-full bg-[#059669] shrink-0" />
            )}
            <span className="text-[10px] text-[#7a7a76] whitespace-nowrap">
              {formatDistanceToNow(new Date(n.createdAt), { locale: fr, addSuffix: true })}
            </span>
          </div>
        </div>
        {n.body && (
          <p className="text-[11px] text-[#7a7a76] mt-0.5 leading-relaxed line-clamp-2">{n.body}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className={cn('text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full', meta.color)}>
            {meta.label}
          </span>
          {!n.isRead && (
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRead(); }}
              className="text-[10px] text-[#7a7a76] hover:text-[#059669] transition-colors flex items-center gap-0.5"
            >
              <Check className="h-3 w-3" />
              Marquer lu
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (n.link) {
    return (
      <Link href={n.link} onClick={onRead} className="block cursor-pointer">
        {inner}
      </Link>
    );
  }
  return (
    <div className={cn(!n.isRead && 'cursor-pointer')}>
      {inner}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <div className="h-14 w-14 rounded-2xl border border-[#e5e5e0] bg-white flex items-center justify-center">
        <Bell className="h-6 w-6 text-[#7a7a76]/40" />
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-[#26251e]">Aucune notification</h3>
        <p className="text-xs text-[#7a7a76] max-w-xs leading-relaxed">
          Les alertes de leads, messages d'équipe et rapports automatiques apparaîtront ici.
        </p>
      </div>
    </div>
  );
}
