'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { InboxList } from './inbox-list';
import { InboxDetail } from './inbox-detail';
import type { InboxThread, ThreadMessage } from '@/lib/inbox-types';
import type { Lead } from '@/lib/mock-data';
import { Mail, Check, Inbox, Users, Archive, RefreshCw, Send } from 'lucide-react';
import { GoogleConnectModal } from '@/components/google-connect-modal';
import { OutreachNavBar } from '@/components/outreach-nav-bar';

type ReplyStatusFilter = 'all' | 'positive' | 'followup' | 'negative';
type UnreadFilter = 'all' | 'unread' | 'leads';
type ReplyStatus = 'positive' | 'followup' | 'negative' | null;
type ViewMode = 'all' | 'leads' | 'sent';

export function InboxRoot() {
  const router = useRouter();
  const { activeWorkspace, updateLead, addTask, campaigns, addNotification, user } = useReach();

  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [replyFilter, setReplyFilter] = useState<ReplyStatusFilter>('all');
  const [unreadFilter, setUnreadFilter] = useState<UnreadFilter>('all');
  const [campaignFilter, setCampaignFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [hasModifyScope, setHasModifyScope] = useState(true);

  const [showConnect, setShowConnect] = useState(false);
  const [selectedThread, setSelectedThread] = useState<InboxThread | null>(null);
  const [detailMessages, setDetailMessages] = useState<ThreadMessage[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [classifyingThreadId, setClassifyingThreadId] = useState<string | null>(null);

  const fetchThreads = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const mode = viewMode === 'all' ? 'all' : viewMode === 'sent' ? 'sent' : 'leads';
      const res = await fetch(
        getApiUrl(`/api/inbox/threads?workspace_id=${activeWorkspace.id}&mode=${mode}`)
      );
      const data = await res.json();
      const incoming: InboxThread[] = data.threads || [];
      setThreads(incoming);
      setNeedsReauth(!!data.needsReauth);
      setIsConnected(data.isConnected !== false);
      // Notify for new unread replies from leads
      if (data.isConnected && user && activeWorkspace) {
        const seenKey = `inbox_seen_${activeWorkspace.id}`;
        const seen = new Set<string>(JSON.parse(localStorage.getItem(seenKey) || '[]'));
        const newReplies = incoming.filter(t => t.hasUnread && t.isLeadLinked && !seen.has(t.gmailThreadId));
        if (newReplies.length > 0) {
          addNotification({
            userId: user.id,
            workspaceId: activeWorkspace.id,
            type: 'email_received',
            title: newReplies.length === 1 ? `Réponse de ${newReplies[0].fromName || newReplies[0].contactEmail}` : `${newReplies.length} nouvelles réponses de leads`,
            body: newReplies.length === 1 ? (newReplies[0].subject || 'Nouvel email') : newReplies.map(t => t.fromName || t.contactEmail).join(', '),
            link: '/inbox',
          });
          if ((window as any).electron?.sendNotification) {
            (window as any).electron.sendNotification('Nouvelle réponse', newReplies.length === 1 ? `De : ${newReplies[0].fromName || newReplies[0].contactEmail}` : `${newReplies.length} réponses non lues`);
          }
        }
        const allSeen = [...Array.from(seen), ...incoming.map(t => t.gmailThreadId)];
        localStorage.setItem(seenKey, JSON.stringify(allSeen.slice(-200)));
      }
    } catch {
      // silently fail — inbox unavailable without Gmail
    } finally {
      setLoading(false);
    }
  }, [activeWorkspace?.id, viewMode]);

  // Check if gmail.modify scope is granted (needed for archive)
  useEffect(() => {
    fetch(getApiUrl('/api/google/auth/status'))
      .then(r => r.json())
      .then(data => {
        const scopes: string[] = data.scopes || [];
        setHasModifyScope(scopes.includes('https://www.googleapis.com/auth/gmail.modify'));
      })
      .catch(() => setHasModifyScope(true)); // assume OK on error
  }, []);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  // Force a re-fetch right after the Google OAuth redirect, then clean the URL
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('success=google_connected')) {
      setTimeout(() => {
        fetchThreads();
        router.replace('/inbox');
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset thread selection when switching modes
  useEffect(() => {
    setSelectedThread(null);
    setDetailMessages([]);
    setSuggestions([]);
    setReplyText('');
  }, [viewMode]);

  const handleSelectThread = async (thread: InboxThread | null) => {
    if (!thread) { setSelectedThread(null); return; }
    setSelectedThread(thread);
    setDetailMessages([]);
    setDetailLoading(true);
    setSuggestions([]);
    setReplyText('');

    let messages: import('@/lib/inbox-types').ThreadMessage[] = [];
    try {
      const res = await fetch(getApiUrl(`/api/inbox/thread/${thread.gmailThreadId}`));
      if (!res.ok) {
        if (res.status === 403) setNeedsReauth(true);
        return;
      }
      const data = await res.json();
      messages = data.messages || [];
      setDetailMessages(messages);
    } finally {
      setDetailLoading(false);
    }

    // Auto-classify: if thread is linked to a lead and has no AI intent yet, classify silently
    if (thread.isLeadLinked && thread.leadId && !thread.replyIntent && messages.length > 0) {
      const lastReply = [...messages].reverse().find(m => !m.isFromUser);
      if (lastReply) {
        setClassifyingThreadId(thread.gmailThreadId);
        try {
          const res = await fetch(getApiUrl('/api/inbox/classify'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              threadId: thread.gmailThreadId,
              leadId: thread.leadId,
              subject: thread.subject,
              snippet: lastReply.body.slice(0, 800),
              workspaceId: activeWorkspace?.id,
            }),
          });
          if (res.ok) {
            const result = await res.json();
            if (result.intent) {
              setThreads(prev =>
                prev.map(t =>
                  t.gmailThreadId === thread.gmailThreadId
                    ? { ...t, replyIntent: result.intent, intentConfidence: result.confidence ?? null }
                    : t
                )
              );
              setSelectedThread(prev =>
                prev ? { ...prev, replyIntent: result.intent, intentConfidence: result.confidence ?? null } : prev
              );
            }
          }
        } catch { /* silent — non-blocking */ }
        finally { setClassifyingThreadId(null); }
      }
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
      const originalSubject = detailMessages[0]?.subject || selectedThread.subject || '';
      // Find the last message ID for proper threading
      const lastMsg = detailMessages[detailMessages.length - 1];
      const inReplyTo = lastMsg?.id;

      const res = await fetch(getApiUrl('/api/inbox/reply'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: selectedThread.gmailThreadId,
          to: selectedThread.contactEmail,
          subject: originalSubject,
          body: replyText,
          inReplyTo,
        }),
      });

      if (res.ok) {
        setReplyText('');
        await fetchThreads();
        // Refresh messages in current thread
        const refreshRes = await fetch(getApiUrl(`/api/inbox/thread/${selectedThread.gmailThreadId}`));
        if (refreshRes.ok) {
          const data = await refreshRes.json();
          setDetailMessages(data.messages || []);
        }
      }
    } finally {
      setSending(false);
    }
  };

  const handleReplyStatusChange = async (status: ReplyStatus) => {
    if (!selectedThread?.leadId) return;
    await updateLead(selectedThread.leadId, { replyStatus: status });
    setThreads(prev =>
      prev.map(t =>
        t.gmailThreadId === selectedThread.gmailThreadId ? { ...t, replyStatus: status } : t
      )
    );
    setSelectedThread(prev => prev ? { ...prev, replyStatus: status } : prev);
  };

  const handleLeadStatusChange = async (status: Lead['status']) => {
    if (!selectedThread?.leadId) return;
    await updateLead(selectedThread.leadId, { status });
    setThreads(prev =>
      prev.map(t =>
        t.gmailThreadId === selectedThread.gmailThreadId ? { ...t, leadStatus: status } : t
      )
    );
    setSelectedThread(prev => prev ? { ...prev, leadStatus: status } : prev);
  };

  const handleCreateDeal = async (amount: number, probability: number, closingDate: string) => {
    if (!selectedThread?.leadId) return;
    await updateLead(selectedThread.leadId, {
      dealAmount: amount,
      dealProbability: probability,
      dealClosingDate: closingDate,
    });
  };

  const handleCreateTask = async (title: string, dueDate: string) => {
    await addTask(title, 'Follow-up', dueDate);
  };

  const handleArchive = async (threadId: string) => {
    try {
      const res = await fetch(getApiUrl('/api/inbox/archive'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ threadId }),
      });
      if (res.ok) {
        setThreads(prev => prev.filter(t => t.gmailThreadId !== threadId));
        if (selectedThread?.gmailThreadId === threadId) setSelectedThread(null);
      } else if (res.status === 403) {
        setNeedsReauth(true);
      }
    } catch { /* ignore */ }
  };

  if (!isConnected) {
    return (
      <div className="h-full flex items-center justify-center bg-white p-6 w-full">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in duration-300">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#059669]/15 text-[#059669]">
            <Mail className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-[#26251e] font-sans">Connectez votre boîte de réception</h2>
            <p className="text-xs text-[#7a7a76] leading-relaxed">
              Suivez toutes vos conversations email directement depuis Minerva Reach.
              Répondez, qualifiez vos leads et créez des tâches sans quitter l&apos;app.
            </p>
          </div>
          <div className="bg-[#fafaf8] border border-[#e5e5e0] rounded-xl p-4 text-left space-y-2.5">
            {[
              'Voir tous vos emails Gmail dans Minerva',
              'Liaison automatique des emails à vos leads',
              'Réponses assistées par IA en un clic',
            ].map((line) => (
              <div key={line} className="flex items-center gap-2.5 text-xs text-[#26251e]">
                <span className="h-4.5 w-4.5 rounded-full bg-[#059669]/15 text-[#059669] flex items-center justify-center shrink-0">
                  <Check className="h-2.5 w-2.5" />
                </span>
                <span>{line}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => setShowConnect(true)}
            className="w-full py-2.5 px-4 bg-[#059669] hover:bg-[#047857] text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer border-0"
          >
            <span>Connecter mon compte Gmail</span>
          </button>
        </div>
        <GoogleConnectModal open={showConnect} onClose={() => setShowConnect(false)} pack="communication" redirect="/inbox" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">
      <OutreachNavBar />
      {/* View mode tabs */}
      <div className="flex items-center gap-0 border-b border-[#e5e5e0] bg-[#fafaf8] px-4 shrink-0">
        <button
          onClick={() => setViewMode('all')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            viewMode === 'all'
              ? 'border-[#059669] text-[#059669]'
              : 'border-transparent text-[#7a7a76] hover:text-[#26251e]'
          }`}
        >
          <Inbox className="h-3.5 w-3.5" />
          Tous les emails
        </button>
        <button
          onClick={() => setViewMode('leads')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            viewMode === 'leads'
              ? 'border-[#059669] text-[#059669]'
              : 'border-transparent text-[#7a7a76] hover:text-[#26251e]'
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Réponses leads
        </button>
        <button
          onClick={() => setViewMode('sent')}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            viewMode === 'sent'
              ? 'border-[#059669] text-[#059669]'
              : 'border-transparent text-[#7a7a76] hover:text-[#26251e]'
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          Envoyés
        </button>
      </div>

      {/* Scope upgrade banner — only shown when gmail.modify is not yet granted */}
      {!hasModifyScope && (
        <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 shrink-0">
          <Archive className="h-3.5 w-3.5 text-amber-600 shrink-0" />
          <p className="text-[11px] text-amber-800 flex-1">
            Autorisation manquante pour archiver les emails depuis Minerva.
          </p>
          <a
            href="/api/google/auth/start?pack=communication&redirect=/inbox"
            className="shrink-0 flex items-center gap-1 text-[11px] font-bold text-amber-800 underline whitespace-nowrap"
          >
            <RefreshCw className="h-3 w-3" />
            Réautoriser Gmail
          </a>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* List panel */}
        <div className={selectedThread ? 'hidden md:flex md:flex-col' : 'flex flex-col w-full md:w-auto'}>
          <InboxList
            threads={threads}
            viewMode={viewMode}
            replyFilter={replyFilter}
            unreadFilter={unreadFilter}
            onReplyFilterChange={setReplyFilter}
            onUnreadFilterChange={setUnreadFilter}
            selectedThreadId={selectedThread?.gmailThreadId || null}
            onSelectThread={handleSelectThread}
            needsReauth={needsReauth}
            loading={loading}
            campaigns={campaigns}
            campaignFilter={campaignFilter}
            onCampaignFilterChange={setCampaignFilter}
            classifyingThreadId={classifyingThreadId}
          />
        </div>
        {/* Detail panel */}
        <div className={selectedThread ? 'flex flex-col flex-1 min-w-0' : 'hidden md:flex md:flex-col md:flex-1 md:min-w-0'}>
          <InboxDetail
            thread={selectedThread}
            messages={detailMessages}
            loading={detailLoading}
            suggestions={suggestions}
            suggestionsLoading={suggestionsLoading}
            replyText={replyText}
            sending={sending}
            hasModifyScope={hasModifyScope}
            onReplyTextChange={setReplyText}
            onSendReply={handleSendReply}
            onReplyStatusChange={handleReplyStatusChange}
            onLeadStatusChange={handleLeadStatusChange}
            onCreateDeal={handleCreateDeal}
            onCreateTask={handleCreateTask}
            onLoadSuggestions={handleLoadSuggestions}
            onArchive={handleArchive}
            onBack={() => handleSelectThread(null)}
          />
        </div>
      </div>
    </div>
  );
}
