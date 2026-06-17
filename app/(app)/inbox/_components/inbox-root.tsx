'use client';

import { useState, useEffect, useCallback } from 'react';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { InboxList } from './inbox-list';
import { InboxDetail } from './inbox-detail';
import type { InboxThread } from '@/app/api/inbox/threads/route';
import type { ThreadMessage } from '@/app/api/inbox/thread/[threadId]/route';
import type { Lead } from '@/lib/mock-data';

type Filter = 'all' | 'positive' | 'followup' | 'negative';
type ReplyStatus = 'positive' | 'followup' | 'negative' | null;

export function InboxRoot() {
  const { activeWorkspace, updateLead, addTask, campaigns } = useReach();

  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [campaignFilter, setCampaignFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsReauth, setNeedsReauth] = useState(false);

  const [selectedThread, setSelectedThread] = useState<InboxThread | null>(null);
  const [detailMessages, setDetailMessages] = useState<ThreadMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchThreads = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/inbox/threads?workspace_id=${activeWorkspace.id}`));
      const data = await res.json();
      setThreads(data.threads || []);
      setNeedsReauth(!!data.needsReauth);
    } catch {
      // silently fail — inbox unavailable without Gmail
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleSelectThread = async (thread: InboxThread) => {
    setSelectedThread(thread);
    setDetailMessages([]);
    setDetailLoading(true);
    setSuggestions([]);
    setReplyText('');

    try {
      const res = await fetch(getApiUrl(`/api/inbox/thread/${thread.gmailThreadId}`));
      if (!res.ok) {
        if (res.status === 403) setNeedsReauth(true);
        return;
      }
      const data = await res.json();
      setDetailMessages(data.messages || []);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleLoadSuggestions = async () => {
    if (!detailMessages.length || suggestionsLoading) return;
    setSuggestionsLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/inbox/suggest-reply'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: detailMessages.map(m => ({
            from: m.from,
            body: m.body,
            date: m.date,
          })),
        }),
      });
      const data = await res.json();
      setSuggestions(data.suggestions || []);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedThread || !replyText.trim() || sending) return;
    setSending(true);
    try {
      const originalSubject = detailMessages[0]?.subject || '';
      const subject = originalSubject.startsWith('Re:') ? originalSubject : `Re: ${originalSubject}`;

      const res = await fetch(getApiUrl('/api/send-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedThread.leadId,
          subject,
          body: replyText,
        }),
      });

      if (res.ok) {
        setReplyText('');
        await fetchThreads();
        handleSelectThread(selectedThread);
      }
    } finally {
      setSending(false);
    }
  };

  const handleReplyStatusChange = async (status: ReplyStatus) => {
    if (!selectedThread) return;
    await updateLead(selectedThread.leadId, { replyStatus: status });
    setThreads(prev =>
      prev.map(t =>
        t.gmailThreadId === selectedThread.gmailThreadId
          ? { ...t, replyStatus: status }
          : t
      )
    );
    setSelectedThread(prev => prev ? { ...prev, replyStatus: status } : prev);
  };

  const handleLeadStatusChange = async (status: Lead['status']) => {
    if (!selectedThread) return;
    await updateLead(selectedThread.leadId, { status });
    setThreads(prev =>
      prev.map(t =>
        t.gmailThreadId === selectedThread.gmailThreadId
          ? { ...t, leadStatus: status }
          : t
      )
    );
    setSelectedThread(prev => prev ? { ...prev, leadStatus: status } : prev);
  };

  const handleCreateDeal = async (amount: number, probability: number, closingDate: string) => {
    if (!selectedThread) return;
    await updateLead(selectedThread.leadId, {
      dealAmount: amount,
      dealProbability: probability,
      dealClosingDate: closingDate,
    });
  };

  const handleCreateTask = async (title: string, dueDate: string) => {
    await addTask(title, 'Follow-up', dueDate);
  };

  return (
    <div className="flex h-full overflow-hidden bg-white">
      <InboxList
        threads={threads}
        filter={filter}
        onFilterChange={setFilter}
        selectedThreadId={selectedThread?.gmailThreadId || null}
        onSelectThread={handleSelectThread}
        needsReauth={needsReauth}
        loading={loading}
        campaigns={campaigns}
        campaignFilter={campaignFilter}
        onCampaignFilterChange={setCampaignFilter}
      />
      <InboxDetail
        thread={selectedThread}
        messages={detailMessages}
        loading={detailLoading}
        suggestions={suggestions}
        suggestionsLoading={suggestionsLoading}
        replyText={replyText}
        sending={sending}
        onReplyTextChange={setReplyText}
        onSendReply={handleSendReply}
        onReplyStatusChange={handleReplyStatusChange}
        onLeadStatusChange={handleLeadStatusChange}
        onCreateDeal={handleCreateDeal}
        onCreateTask={handleCreateTask}
        onLoadSuggestions={handleLoadSuggestions}
      />
    </div>
  );
}
