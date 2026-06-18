'use client';

import { AlertCircle, Filter, Mail } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { InboxThread } from '@/lib/inbox-types';
import type { Campaign } from '@/lib/reach-context';

type Filter = 'all' | 'positive' | 'followup' | 'negative';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
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

interface InboxListProps {
  threads: InboxThread[];
  filter: Filter;
  onFilterChange: (f: Filter) => void;
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
  filter,
  onFilterChange,
  selectedThreadId,
  onSelectThread,
  needsReauth,
  loading,
  campaigns,
  campaignFilter,
  onCampaignFilterChange,
}: InboxListProps) {
  const filtered = threads.filter(t => {
    if (filter !== 'all' && t.replyStatus !== filter) return false;
    if (campaignFilter && t.campaignId !== campaignFilter) return false;
    return true;
  });

  // Only show campaigns that have at least one threaded lead
  const relevantCampaigns = campaigns.filter(c =>
    threads.some(t => t.campaignId === c.id)
  );

  return (
    <div className="flex h-full w-[340px] shrink-0 flex-col border-r border-[#e5e5e0]">
      {/* Header */}
      <div className="border-b border-[#e5e5e0] px-4 py-3">
        <h2 className="text-sm font-semibold text-[#26251e]">Boîte de réception</h2>
        <p className="text-xs text-[#78716c] mt-0.5">{threads.length} fils de discussion</p>
      </div>

      {/* Re-auth banner */}
      {needsReauth && (
        <div className="mx-3 mt-2 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Gmail nécessite une nouvelle autorisation.</span>
          <a
            href="/api/auth/google/login"
            className="ml-auto font-semibold underline whitespace-nowrap"
          >
            Réautoriser
          </a>
        </div>
      )}

      {/* Campaign filter */}
      {relevantCampaigns.length > 0 && (
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
                    ? 'bg-[#f54e00] text-white border-[#f54e00]'
                    : 'border-[#e5e5e0] text-[#78716c] hover:border-[#f54e00]/40'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reply-status filter tabs */}
      <div className="px-3 py-2 border-b border-[#e5e5e0]">
        <Tabs value={filter} onValueChange={v => onFilterChange(v as Filter)}>
          <TabsList className="h-7 w-full bg-[#f4f4f3]">
            <TabsTrigger value="all" className="flex-1 text-xs h-6">Tous</TabsTrigger>
            <TabsTrigger value="positive" className="flex-1 text-xs h-6">Positifs</TabsTrigger>
            <TabsTrigger value="followup" className="flex-1 text-xs h-6">À relancer</TabsTrigger>
            <TabsTrigger value="negative" className="flex-1 text-xs h-6">Négatifs</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Thread list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-xs text-[#78716c]">
            Chargement…
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-[#78716c]">
            <Mail className="h-8 w-8 opacity-30" />
            <p className="text-xs">Aucun fil de discussion</p>
          </div>
        ) : (
          filtered.map(thread => {
            const isSelected = thread.gmailThreadId === selectedThreadId;
            const statusMeta = thread.replyStatus ? STATUS_LABELS[thread.replyStatus] : null;
            const initials = thread.leadName.slice(0, 2).toUpperCase();

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
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f54e00]/10 text-[#f54e00] text-xs font-semibold">
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`truncate text-xs font-medium text-[#26251e] ${thread.hasUnread ? 'font-semibold' : ''}`}>
                        {thread.leadName}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {thread.hasUnread && (
                          <span className="h-2 w-2 rounded-full bg-[#059669] inline-block" />
                        )}
                        <span className="text-[10px] text-[#78716c]">{relativeTime(thread.lastMessageDate)}</span>
                      </div>
                    </div>

                    <p className="mt-0.5 text-[10px] text-[#78716c] line-clamp-2">{thread.snippet}</p>

                    <div className="mt-1 flex items-center gap-1.5">
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
