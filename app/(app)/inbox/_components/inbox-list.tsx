'use client';

import { AlertCircle, Filter, Mail, User } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { InboxThread } from '@/lib/inbox-types';
import type { Campaign } from '@/lib/reach-context';

type ReplyStatusFilter = 'all' | 'positive' | 'followup' | 'negative';
type UnreadFilter = 'all' | 'unread' | 'leads';
type ViewMode = 'all' | 'leads' | 'sent';

const REPLY_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  positive: { label: 'Positif', color: 'bg-[#059669]/10 text-[#059669] border-[#059669]/20' },
  followup: { label: 'À relancer', color: 'bg-[#d97706]/10 text-[#d97706] border-[#d97706]/20' },
  negative: { label: 'Négatif', color: 'bg-[#dc2626]/10 text-[#dc2626] border-[#dc2626]/20' },
};

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `il y a ${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

interface InboxListProps {
  threads: InboxThread[];
  viewMode: ViewMode;
  replyFilter: ReplyStatusFilter;
  unreadFilter: UnreadFilter;
  onReplyFilterChange: (f: ReplyStatusFilter) => void;
  onUnreadFilterChange: (f: UnreadFilter) => void;
  selectedThreadId: string | null;
  onSelectThread: (thread: InboxThread) => void;
  needsReauth: boolean;
  loading: boolean;
  campaigns: Campaign[];
  campaignFilter: string | null;
  onCampaignFilterChange: (id: string | null) => void;
}

export function InboxList({
  threads,
  viewMode,
  replyFilter,
  unreadFilter,
  onReplyFilterChange,
  onUnreadFilterChange,
  selectedThreadId,
  onSelectThread,
  needsReauth,
  loading,
  campaigns,
  campaignFilter,
  onCampaignFilterChange,
}: InboxListProps) {
  // Apply filters based on view mode
  const filtered = threads.filter(t => {
    if (viewMode === 'all') {
      if (unreadFilter === 'unread' && !t.hasUnread) return false;
      if (unreadFilter === 'leads' && !t.isLeadLinked) return false;
    } else {
      // leads mode: filter by reply status
      if (replyFilter !== 'all' && t.replyStatus !== replyFilter) return false;
      if (campaignFilter && t.campaignId !== campaignFilter) return false;
    }
    return true;
  });

  const relevantCampaigns = campaigns.filter(c =>
    threads.some(t => t.campaignId === c.id)
  );

  const unreadCount = threads.filter(t => t.hasUnread).length;
  const linkedCount = threads.filter(t => t.isLeadLinked).length;

  return (
    <div className="flex h-full w-full md:w-[340px] md:shrink-0 flex-col border-r border-[#e5e5e0]">
      {/* Header */}
      <div className="border-b border-[#e5e5e0] px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#26251e]">
            {viewMode === 'all' ? 'Boîte de réception' : 'Réponses leads'}
          </h2>
          <span className="text-[10px] text-[#7a7a76]">{threads.length} conversation{threads.length !== 1 ? 's' : ''}</span>
        </div>
        {viewMode === 'all' && unreadCount > 0 && (
          <p className="text-[10px] text-[#059669] mt-0.5 font-medium">{unreadCount} non lu{unreadCount > 1 ? 's' : ''} · {linkedCount} lead{linkedCount !== 1 ? 's' : ''}</p>
        )}
      </div>

      {/* Re-auth banner */}
      {needsReauth && (
        <div className="mx-3 mt-2 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Gmail nécessite une nouvelle autorisation.</span>
          <a
            href="/api/google/auth/start?pack=communication&redirect=/inbox"
            className="ml-auto font-semibold underline whitespace-nowrap"
          >
            Réautoriser
          </a>
        </div>
      )}

      {/* Filters */}
      <div className="px-3 py-2 border-b border-[#e5e5e0]">
        {viewMode === 'all' ? (
          <Tabs value={unreadFilter} onValueChange={v => onUnreadFilterChange(v as UnreadFilter)}>
            <TabsList className="h-7 w-full bg-[#f4f4f3]">
              <TabsTrigger value="all" className="flex-1 text-xs h-6">Tous</TabsTrigger>
              <TabsTrigger value="unread" className="flex-1 text-xs h-6">Non lus</TabsTrigger>
              <TabsTrigger value="leads" className="flex-1 text-xs h-6">Leads</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : (
          <Tabs value={replyFilter} onValueChange={v => onReplyFilterChange(v as ReplyStatusFilter)}>
            <TabsList className="h-7 w-full bg-[#f4f4f3]">
              <TabsTrigger value="all" className="flex-1 text-xs h-6">Tous</TabsTrigger>
              <TabsTrigger value="positive" className="flex-1 text-xs h-6">Positifs</TabsTrigger>
              <TabsTrigger value="followup" className="flex-1 text-xs h-6">Relancer</TabsTrigger>
              <TabsTrigger value="negative" className="flex-1 text-xs h-6">Négatifs</TabsTrigger>
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Campaign filter (leads mode only) */}
      {viewMode === 'leads' && relevantCampaigns.length > 0 && (
        <div className="px-3 pt-2 pb-1 border-b border-[#e5e5e0]">
          <div className="flex items-center gap-1 mb-1.5">
            <Filter className="h-3 w-3 text-[#a8a29e]" />
            <span className="text-[10px] font-semibold text-[#a8a29e] uppercase tracking-wider">Campagne</span>
          </div>
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => onCampaignFilterChange(null)}
              className={`rounded-full px-2 py-0.5 text-[10px] border transition-colors ${
                !campaignFilter
                  ? 'bg-[#26251e] text-white border-[#26251e]'
                  : 'border-[#e5e5e0] text-[#78716c] hover:border-[#26251e]/30'
              }`}
            >
              Toutes
            </button>
            {relevantCampaigns.map(c => (
              <button
                key={c.id}
                onClick={() => onCampaignFilterChange(c.id)}
                className={`rounded-full px-2 py-0.5 text-[10px] border transition-colors truncate max-w-[120px] ${
                  campaignFilter === c.id
                    ? 'bg-[#059669] text-white border-[#059669]'
                    : 'border-[#e5e5e0] text-[#78716c] hover:border-[#059669]/40'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-xs text-[#78716c]">
            Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-[#78716c]">
            <Mail className="h-8 w-8 opacity-30" />
            <p className="text-xs text-center">
              {viewMode === 'all'
                ? 'Aucun email dans votre boîte de réception'
                : 'Aucune réponse de lead pour le moment'}
            </p>
            {viewMode === 'leads' && !needsReauth && threads.length === 0 && (
              <p className="text-[11px] text-[#a8a29e] text-center max-w-[200px]">
                Les réponses apparaîtront ici quand un lead vous répond à un email envoyé via l'app.
              </p>
            )}
          </div>
        ) : (
          filtered.map(thread => {
            const isSelected = thread.gmailThreadId === selectedThreadId;
            const displayName = thread.isLeadLinked
              ? (thread.leadName || thread.fromName)
              : thread.fromName;
            const statusMeta = thread.replyStatus ? REPLY_STATUS_LABELS[thread.replyStatus] : null;
            const initials = getInitials(displayName);

            return (
              <button
                key={thread.gmailThreadId}
                onClick={() => onSelectThread(thread)}
                className={`w-full text-left px-3 py-3 border-b border-[#e5e5e0] hover:bg-[#f4f4f3] transition-colors ${
                  isSelected ? 'bg-[#f4f4f3]' : ''
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {/* Avatar */}
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    thread.isLeadLinked
                      ? 'bg-[#059669]/10 text-[#059669]'
                      : 'bg-[#f4f4f3] text-[#7a7a76]'
                  }`}>
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`truncate text-xs text-[#26251e] ${thread.hasUnread ? 'font-bold' : 'font-medium'}`}>
                        {displayName}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {thread.hasUnread && (
                          <span className="h-2 w-2 rounded-full bg-[#059669] inline-block" />
                        )}
                        <span className="text-[10px] text-[#78716c]">{relativeTime(thread.lastMessageDate)}</span>
                      </div>
                    </div>

                    {/* Subject line */}
                    <p className={`mt-0.5 text-[10px] truncate ${thread.hasUnread ? 'text-[#26251e] font-medium' : 'text-[#7a7a76]'}`}>
                      {thread.subject}
                    </p>

                    <p className="mt-0.5 text-[10px] text-[#a8a29e] line-clamp-1">{thread.snippet}</p>

                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      {thread.isLeadLinked && (
                        <Badge className="text-[9px] px-1 py-0 h-4 border bg-[#059669]/8 text-[#059669] border-[#059669]/20 gap-0.5">
                          <User className="h-2 w-2" />
                          Lead
                        </Badge>
                      )}
                      {statusMeta && (
                        <Badge className={`text-[9px] px-1 py-0 h-4 border ${statusMeta.color}`}>
                          {statusMeta.label}
                        </Badge>
                      )}
                      {thread.messageCount > 1 && (
                        <span className="text-[10px] text-[#a8a29e]">{thread.messageCount} messages</span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
