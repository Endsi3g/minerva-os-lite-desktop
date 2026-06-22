'use client';

import { useState, useEffect, useCallback } from 'react';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { InboxList } from './inbox-list';
import { InboxDetail } from './inbox-detail';
import type { InboxThread, ThreadMessage } from '@/lib/inbox-types';
import type { Lead } from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/client';
import { Mail, Check } from 'lucide-react';

type Filter = 'all' | 'positive' | 'followup' | 'negative';
type ReplyStatus = 'positive' | 'followup' | 'negative' | null;

export function InboxRoot() {
  const { activeWorkspace, updateLead, addTask, campaigns } = useReach();

  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [campaignFilter, setCampaignFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

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
      setIsConnected(data.isConnected !== false);
    } catch {
      // silently fail — inbox unavailable without Gmail
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  const handleSelectThread = async (thread: InboxThread | null) => {
    if (!thread) { setSelectedThread(null); return; }
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

  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center bg-white p-6 w-full">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in duration-300">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#10b981]/15 text-[#10b981]">
            <Mail className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[#26251e] font-sans">Connectez votre boîte de réception</h2>
            <p className="text-xs text-[#7a7a76] leading-relaxed">
              Suivez toutes les interactions avec vos prospects directement depuis Minerva Reach. 
              Planifiez des séquences d&apos;emails personnalisées et répondez en un clic via votre propre adresse.
            </p>
          </div>
          <div className="bg-[#fafaf8] border border-[#e5e5e0] rounded-xl p-4 text-left space-y-2.5">
            {[
              'Synchronisation automatique des échanges',
              'Détection intelligente des réponses (Positif, À relancer, Négatif)',
              'Rédaction assistée par IA pour vos réponses',
            ].map((line) => (
              <div key={line} className="flex items-center gap-2.5 text-xs text-[#26251e]">
                <span className="h-4.5 w-4.5 rounded-full bg-[#10b981]/15 text-[#10b981] flex items-center justify-center shrink-0">
                  <Check className="h-2.5 w-2.5" />
                </span>
                <span>{line}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.href = `/api/google/auth/start?pack=communication&redirect=${encodeURIComponent('/inbox')}`;
              }
            }}
            className="w-full py-2.5 px-4 bg-[#10b981] hover:bg-[#059669] text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer border-0"
          >
            <span>Connecter mon compte Gmail</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-white">
      {/* List panel — full width on mobile when no thread selected, hidden otherwise; always visible md+ */}
      <div className={selectedThread ? 'hidden md:flex md:flex-col' : 'flex flex-col w-full md:w-auto'}>
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
      </div>
      {/* Detail panel — full width on mobile when thread selected, hidden otherwise; always visible md+ */}
      <div className={selectedThread ? 'flex flex-col flex-1 min-w-0' : 'hidden md:flex md:flex-col md:flex-1 md:min-w-0'}>
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
          onBack={() => handleSelectThread(null)}
        />
      </div>
    </div>
  );
}
