'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  Mail, Search, Download, Filter, Check, X,
  Loader2, ChevronDown, Info, Trash2, ArrowUpDown,
  MessageSquare, Send
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/lib/language-context';
import { getApiUrl } from '@/lib/api-helper';
import { useReach } from '@/lib/reach-context';

// ── Types ────────────────────────────────────────────────────────────────────
type Role = 'admin' | 'editor' | 'viewer';
type Status = 'active' | 'pending';
type Plan = 'Business' | 'Pro' | 'Free';

interface TeamMember {
  id: string;
  workspace_owner_id: string;
  member_user_id: string | null;
  email: string;
  role: Role;
  status: Status;
  invited_at: string;
  joined_at: string | null;
  invited_by: string | null;
  plan?: Plan;
  usage_count?: number;
  profile?: { full_name: string | null; company_name: string | null } | null;
}

export default function TeamPage() {
  const { t, locale } = useLanguage();
  
  // Data State
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string; name: string; avatar?: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'members' | 'chat'>('members');
  const [chatMessage, setChatMessage] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const { teamMessages, sendTeamMessage, activeWorkspace } = useReach();
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);

  // Search and Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'editor' | 'viewer'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | 'Business' | 'Pro' | 'Free'>('all');
  const [showFilterPopover, setShowFilterPopover] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<'email' | 'role' | 'plan'>('email');
  const [sortAscending, setSortAscending] = useState(true);

  // Modals & Panels
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('editor');
  const [invitePlan, setInvitePlan] = useState<Plan>('Business');
  const [isSending, setIsSending] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Active Dropdowns for Table Inline Edits
  const [activeDropdown, setActiveDropdown] = useState<{ id: string; type: 'role' | 'plan' } | null>(null);
  const [updatingMemberId, setUpdatingMemberId] = useState<string | null>(null);

  // Action confirmations
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Toast System
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerToast = (msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [teamMessages, activeTab]);

  // Fetch Members
  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/team/members'));
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to load team members:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Init Data
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: settings } = await supabase
          .from('settings')
          .select('full_name, avatar_base64')
          .eq('user_id', user.id)
          .maybeSingle();
        setCurrentUser({
          id: user.id,
          email: user.email || '',
          name: settings?.full_name || user.email?.split('@')[0] || 'User',
          avatar: settings?.avatar_base64 || undefined,
        });
      }
      await fetchMembers();
    };
    init();
  }, [fetchMembers]);

  // Handle Invite Form Submission
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setIsSending(true);
    setInviteError('');

    try {
      const res = await fetch(getApiUrl('/api/team/invite'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          role: inviteRole,
          plan: invitePlan,
          usageCount: 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || 'Failed to send invitation');
      } else {
        setShowInviteModal(false);
        setInviteEmail('');
        triggerToast(`1 ${t('team.toast_success')}`);
        await fetchMembers();
      }
    } catch (err) {
      console.error(err);
      setInviteError('Failed to invite member. Please check your internet connection.');
    } finally {
      setIsSending(false);
    }
  };

  // Handle Role/Plan Update Inline
  const handleUpdateField = async (memberId: string, updates: { role?: Role; plan?: Plan; usageCount?: number }) => {
    setUpdatingMemberId(memberId);
    setActiveDropdown(null);
    try {
      const res = await fetch(getApiUrl('/api/team/members'), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          ...updates,
        }),
      });

      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => {
            if (m.id === memberId) {
              return {
                ...m,
                role: updates.role !== undefined ? updates.role : m.role,
                plan: updates.plan !== undefined ? updates.plan : m.plan,
                usage_count: updates.usageCount !== undefined ? updates.usageCount : m.usage_count,
              };
            }
            return m;
          })
        );
      } else {
        const data = await res.json();
        triggerToast(`Error: ${data.error || 'Failed to update'}`);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Network error updating member.');
    } finally {
      setUpdatingMemberId(null);
    }
  };

  // Handle Remove Member
  const handleRemoveMember = async (memberId: string) => {
    setRemovingId(memberId);
    try {
      const res = await fetch(getApiUrl(`/api/team/members?id=${memberId}`), { method: 'DELETE' });
      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        triggerToast('Member removed successfully.');
      } else {
        const data = await res.json();
        triggerToast(`Error: ${data.error || 'Failed to remove'}`);
      }
    } catch (err) {
      console.error(err);
      triggerToast('Network error removing member.');
    } finally {
      setRemovingId(null);
      setConfirmRemoveId(null);
    }
  };

  // CSV Export
  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Role', 'Plan', 'Status', 'Invited At'];
    const rows = filteredMembers.map((m) => [
      m.profile?.full_name || '—',
      m.email,
      m.role,
      m.plan || 'Business',
      m.status,
      new Date(m.invited_at).toISOString().split('T')[0]
    ]);

    // Include current user
    if (currentUser) {
      rows.push([
        currentUser.name,
        currentUser.email,
        'admin',
        'Business',
        'active',
        '—'
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.map((val) => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `members_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter & Search Logic
  const filteredMembers = members.filter((member) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      member.email.toLowerCase().includes(searchLower) ||
      (member.profile?.full_name || '').toLowerCase().includes(searchLower);

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && member.status === 'active') ||
      (statusFilter === 'pending' && member.status === 'pending');

    const matchesRole = roleFilter === 'all' || member.role === roleFilter;
    const matchesPlan = planFilter === 'all' || (member.plan || 'Business') === planFilter;

    return matchesSearch && matchesStatus && matchesRole && matchesPlan;
  });

  // Sort Logic
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    let aVal: string = '';
    let bVal: string = '';

    if (sortField === 'email') {
      aVal = a.email;
      bVal = b.email;
    } else if (sortField === 'role') {
      aVal = a.role;
      bVal = b.role;
    } else if (sortField === 'plan') {
      aVal = a.plan || 'Business';
      bVal = b.plan || 'Business';
    }

    return sortAscending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
  });

  const triggerSort = (field: 'email' | 'role' | 'plan') => {
    if (sortField === field) {
      setSortAscending(!sortAscending);
    } else {
      setSortField(field);
      setSortAscending(true);
    }
  };

  // Counts
  const totalInvitedCount = members.filter(m => m.status === 'pending').length;
  const totalMembersCount = members.length + 1; // +1 for current user

  return (
    <div className="h-full overflow-y-auto bg-white text-[#26251e] font-sans selection:bg-[#059669]/10 relative">
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />
      
      {/* ── Toast Notification (Top Right) ── */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-[120] flex items-center gap-2.5 bg-white border border-neutral-200 shadow-md rounded-lg px-4 py-3 text-xs font-semibold animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="w-4 h-4 rounded-full bg-neutral-900 text-white flex items-center justify-center">
            <Check className="w-2.5 h-2.5" />
          </div>
          <span>{toastMessage}</span>
          <button 
            onClick={() => setToastMessage(null)}
            className="ml-2 text-neutral-400 hover:text-neutral-600 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-8 py-10 space-y-6 relative z-10">

        {/* ── Header ── */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#26251e] tracking-tight">
            {t('team.members_title')}
          </h1>
          <p className="text-xs text-neutral-500 font-medium">
            {t('team.members_subtitle')}
          </p>
        </div>

        {/* ── Tab Bar ── */}
        <div className="flex gap-1 border-b border-[#e5e5e0] -mx-8 px-8 bg-white/60">
          <button
            onClick={() => setActiveTab('members')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-t-lg border border-b-0 transition-colors",
              activeTab === 'members'
                ? 'bg-white border-[#e5e5e0] text-[#26251e]'
                : 'bg-[#f4f4f3] border-transparent text-[#807d72] hover:text-[#26251e]'
            )}
          >
            Membres de l&apos;équipe
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={cn(
              "px-4 py-2 text-xs font-bold rounded-t-lg border border-b-0 transition-colors flex items-center gap-1.5",
              activeTab === 'chat'
                ? 'bg-white border-[#e5e5e0] text-[#26251e]'
                : 'bg-[#f4f4f3] border-transparent text-[#807d72] hover:text-[#26251e]'
            )}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chat d&apos;équipe
          </button>
        </div>

        {/* ── Chat Panel (shown when activeTab === 'chat') ── */}
        {activeTab === 'chat' && (
          <div className="flex flex-col bg-white border border-[#e5e5e0] rounded-xl overflow-hidden shadow-2xs" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
            {/* Messages list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {teamMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-[#807d72]">
                  <MessageSquare className="w-10 h-10 opacity-30" />
                  <p className="text-sm font-semibold">Aucun message pour le moment.</p>
                  <p className="text-xs">Commencez la conversation avec votre équipe.</p>
                </div>
              ) : (
                teamMessages.map(msg => {
                  const isMe = msg.senderId === currentUser?.id;
                  const avatarSrc = isMe ? currentUser?.avatar : undefined;
                  const renderContent = (text: string) => {
                    const parts = text.split(/(@\w+)/g);
                    return parts.map((part, i) =>
                      part.startsWith('@')
                        ? <span key={i} className={cn("font-bold", isMe ? "text-white/90 bg-white/20" : "text-[#059669] bg-[#059669]/10", "rounded px-0.5")}>{part}</span>
                        : <span key={i}>{part}</span>
                    );
                  };
                  return (
                    <div key={msg.id} className={cn("flex gap-2.5 items-end", isMe && "flex-row-reverse")}>
                      <div className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden",
                        isMe ? "bg-[#10b981] text-white" : "bg-[#e5e5e0] text-[#26251e]"
                      )}>
                        {avatarSrc
                          ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                          : msg.senderName.charAt(0).toUpperCase()
                        }
                      </div>
                      <div className={cn("max-w-[70%] space-y-0.5", isMe && "items-end flex flex-col")}>
                        <span className="text-[10px] font-semibold text-[#807d72]">
                          {isMe ? 'Vous' : msg.senderName}
                        </span>
                        <div className={cn(
                          "px-3 py-2 rounded-2xl text-xs leading-relaxed",
                          isMe
                            ? "bg-[#10b981] text-white rounded-br-sm"
                            : "bg-[#f4f4f3] text-[#26251e] rounded-bl-sm"
                        )}>
                          {renderContent(msg.content)}
                        </div>
                        <span className="text-[9px] text-[#a3a39c]">
                          {new Date(msg.createdAt).toLocaleTimeString('fr-CA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* @mention autocomplete */}
            {showMentions && (
              <div className="absolute bottom-[60px] left-3 right-3 bg-white border border-[#e5e5e0] rounded-xl shadow-lg z-10 overflow-hidden max-h-40 overflow-y-auto">
                {members
                  .filter(m => (m.profile?.full_name || m.email).toLowerCase().includes(mentionQuery.toLowerCase()))
                  .slice(0, 5)
                  .map(m => {
                    const displayName = m.profile?.full_name || m.email.split('@')[0];
                    return (
                      <button
                        key={m.id}
                        type="button"
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left hover:bg-[#f4f4f3] transition-colors"
                        onMouseDown={e => {
                          e.preventDefault();
                          const atIdx = chatMessage.lastIndexOf('@');
                          const newMsg = chatMessage.slice(0, atIdx) + `@${displayName} `;
                          setChatMessage(newMsg);
                          setShowMentions(false);
                          chatInputRef.current?.focus();
                        }}
                      >
                        <div className="w-6 h-6 rounded-full bg-[#e5e5e0] flex items-center justify-center text-[9px] font-bold shrink-0">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-[#26251e]">{displayName}</span>
                        <span className="text-[#7a7a76]">{m.email}</span>
                      </button>
                    );
                  })}
                {members.filter(m => (m.profile?.full_name || m.email).toLowerCase().includes(mentionQuery.toLowerCase())).length === 0 && (
                  <div className="px-3 py-3 text-xs text-[#7a7a76]">Aucun membre trouvé</div>
                )}
              </div>
            )}
            {/* Input bar */}
            <div className="border-t border-[#e5e5e0] p-3 flex gap-2 items-center bg-white shrink-0 relative">
              <input
                ref={chatInputRef}
                type="text"
                value={chatMessage}
                onChange={e => {
                  const val = e.target.value;
                  setChatMessage(val);
                  const atIdx = val.lastIndexOf('@');
                  if (atIdx !== -1 && (atIdx === 0 || val[atIdx - 1] === ' ')) {
                    setMentionQuery(val.slice(atIdx + 1));
                    setShowMentions(true);
                  } else {
                    setShowMentions(false);
                  }
                }}
                onKeyDown={async e => {
                  if (e.key === 'Escape') { setShowMentions(false); return; }
                  if (e.key === 'Enter' && !e.shiftKey && chatMessage.trim()) {
                    e.preventDefault();
                    const msg = chatMessage.trim();
                    setChatMessage('');
                    setShowMentions(false);
                    await sendTeamMessage(msg);
                  }
                }}
                onBlur={() => setTimeout(() => setShowMentions(false), 150)}
                placeholder="Message à l'équipe... Tapez @ pour mentionner"
                className="flex-1 text-xs bg-[#f4f4f3] border border-[#e5e5e0] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#10b981]"
              />
              <button
                onClick={async () => {
                  if (!chatMessage.trim()) return;
                  const msg = chatMessage.trim();
                  setChatMessage('');
                  setShowMentions(false);
                  await sendTeamMessage(msg);
                }}
                disabled={!chatMessage.trim()}
                className="h-8 w-8 flex items-center justify-center rounded-xl bg-[#10b981] text-white hover:bg-[#059669] transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ── Members Tab Content ── */}
        {activeTab === 'members' && <>

        {/* ── Banner 1: Plan limits alert ── */}
        <div className="flex gap-3 bg-[#059669]/5 border border-[#059669]/20 rounded-lg p-4 text-xs text-neutral-700 leading-relaxed shadow-2xs">
          <Info className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
          <div>
            <span>{t('team.banner_usage')} </span>
            <Link href="/billing" className="underline font-semibold hover:text-[#047857] transition-colors">
              {t('team.banner_usage_link')}
            </Link>
          </div>
        </div>

        {/* ── Stats Overview ── */}
        <div className="space-y-2">
          <h2 className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
            {t('team.stats_overview')}
          </h2>
          <div className="bg-white border border-neutral-200/60 rounded-xl p-5 shadow-2xs space-y-3">
            <div className="space-y-1">
              <span className="text-xs text-neutral-500 font-medium">{t('team.stats_total')}</span>
              <div className="flex items-baseline">
                <span className="text-3xl font-extrabold text-neutral-900 leading-none">{totalMembersCount}</span>
                <span className="text-xs text-neutral-400 font-medium ml-2">
                  ({totalInvitedCount} {t('team.stats_invited')})
                </span>
              </div>
            </div>
            <Link href="/billing" className="text-xs text-[#059669] hover:text-[#047857] font-semibold underline block transition-colors">
              {t('team.stats_details')}
            </Link>
          </div>
        </div>

        {/* ── Banner 2: Extra Spend limits alert ── */}
        <div className="flex gap-3 bg-[#059669]/5 border border-[#059669]/20 rounded-lg p-4 text-xs text-neutral-700 leading-relaxed shadow-2xs">
          <Info className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
          <div>
            <span>{t('team.banner_billing')} </span>
            <Link href="/billing" className="underline font-semibold hover:text-[#047857] transition-colors">
              {t('team.banner_billing_link')}
            </Link>
            <span>{locale === 'en' ? t('team.banner_billing_suffix') : '.'}</span>
          </div>
        </div>

        {/* ── Manage section ── */}
        <div className="space-y-4 pt-2">
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-neutral-900 tracking-tight">
              {t('team.manage_title')}
            </h2>
            <p className="text-xs text-neutral-500 font-medium">
              {t('team.manage_subtitle')}
            </p>
          </div>

          {/* ── Controls Bar ── */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-neutral-100/30 p-1 rounded-lg">
            <div className="flex flex-1 items-center gap-2 min-w-0">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                <input
                  type="text"
                  placeholder={t('team.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-8 pl-9 pr-3 text-xs bg-white border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#059669] focus:border-[#059669] transition-all placeholder:text-neutral-400 font-medium"
                />
              </div>

              {/* Filter Popover Trigger */}
              <div className="relative">
                <button
                  onClick={() => setShowFilterPopover(!showFilterPopover)}
                  className={cn(
                    "h-8 w-8 flex items-center justify-center bg-white border border-neutral-200 rounded-md hover:bg-neutral-50 text-neutral-600 transition-colors relative",
                    (statusFilter !== 'all' || roleFilter !== 'all' || planFilter !== 'all') && "border-[#059669] text-[#059669]"
                  )}
                  title="Filtres"
                >
                  <Filter className="w-3.5 h-3.5" />
                  {(statusFilter !== 'all' || roleFilter !== 'all' || planFilter !== 'all') && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-[#059669] rounded-full" />
                  )}
                </button>

                {/* Filter Popover Menu */}
                {showFilterPopover && (
                  <>
                    <div className="fixed inset-0 z-[80]" onClick={() => setShowFilterPopover(false)} />
                    <div className="absolute left-0 mt-1.5 w-60 bg-white border border-neutral-200 rounded-lg shadow-lg p-3.5 z-[90] space-y-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="flex items-center justify-between border-b border-neutral-100 pb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Filtrer par</span>
                        <button
                          onClick={() => {
                            setStatusFilter('all');
                            setRoleFilter('all');
                            setPlanFilter('all');
                          }}
                          className="text-[10px] font-bold text-[#059669] hover:text-[#047857] transition-colors"
                        >
                          Réinitialiser
                        </button>
                      </div>

                      {/* Status select */}
                      <div className="space-y-1 text-left">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">Statut</label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'pending')}
                          className="w-full text-xs p-1.5 border border-neutral-200 rounded-md bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                        >
                          <option value="all">Tous les statuts</option>
                          <option value="active">Actif</option>
                          <option value="pending">Invité</option>
                        </select>
                      </div>

                      {/* Role select */}
                      <div className="space-y-1 text-left">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">Rôle</label>
                        <select
                          value={roleFilter}
                          onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'editor' | 'viewer')}
                          className="w-full text-xs p-1.5 border border-neutral-200 rounded-md bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                        >
                          <option value="all">Tous les rôles</option>
                          <option value="admin">Administrateur</option>
                          <option value="editor">Éditeur</option>
                          <option value="viewer">Lecteur</option>
                        </select>
                      </div>

                      {/* Plan select */}
                      <div className="space-y-1 text-left">
                        <label className="text-[9px] font-bold uppercase tracking-wider text-neutral-400 block">Forfait</label>
                        <select
                          value={planFilter}
                          onChange={(e) => setPlanFilter(e.target.value as 'all' | 'Business' | 'Pro' | 'Free')}
                          className="w-full text-xs p-1.5 border border-neutral-200 rounded-md bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-[#059669]"
                        >
                          <option value="all">Tous les forfaits</option>
                          <option value="Business">Business</option>
                          <option value="Pro">Pro</option>
                          <option value="Free">Free</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleExportCSV}
                className="h-8 flex items-center gap-1.5 bg-white border border-neutral-200 rounded-md px-3 text-xs text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 font-semibold shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{t('team.btn_export')}</span>
              </button>

              <button
                onClick={() => {
                  setShowInviteModal(true);
                  setInviteError('');
                  setInviteEmail('');
                }}
                className="h-8 bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold rounded-md px-4 shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <span>{t('team.btn_invite')}</span>
              </button>
            </div>
          </div>

          {/* ── Members List Table ── */}
          <div className="border border-neutral-200/60 rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse table-auto">
                <thead>
                  <tr className="border-b border-neutral-200/60 bg-neutral-50/30 text-[10px] font-bold uppercase tracking-wider text-neutral-400 select-none">
                    <th className="py-3 px-4 w-[40%] cursor-pointer hover:bg-neutral-100/30 transition-colors" onClick={() => triggerSort('email')}>
                      <div className="flex items-center gap-1">
                        <span>{t('team.table_name')}</span>
                        <ArrowUpDown className="w-3 h-3 text-neutral-300" />
                      </div>
                    </th>
                    <th className="py-3 px-4 w-[20%] cursor-pointer hover:bg-neutral-100/30 transition-colors" onClick={() => triggerSort('role')}>
                      <div className="flex items-center gap-1">
                        <span>{t('team.table_role')}</span>
                        <ArrowUpDown className="w-3 h-3 text-neutral-300" />
                      </div>
                    </th>
                    <th className="py-3 px-4 w-[20%] cursor-pointer hover:bg-neutral-100/30 transition-colors" onClick={() => triggerSort('plan')}>
                      <div className="flex items-center gap-1">
                        <span>{t('team.table_plan')}</span>
                        <ArrowUpDown className="w-3 h-3 text-neutral-300" />
                      </div>
                    </th>
                    <th className="py-3 px-4 w-[15%]">{t('team.table_usage')}</th>
                    <th className="py-3 px-4 w-[5%]"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  
                  {/* Current User Row (Owner - Always render first if search query matches) */}
                  {currentUser && (searchQuery === '' || 
                    currentUser.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    currentUser.email.toLowerCase().includes(searchQuery.toLowerCase())) && (
                    <tr className="hover:bg-neutral-50/40 transition-colors group">
                      {/* Name/Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-black text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                            {currentUser.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-neutral-900 truncate">
                              {currentUser.name} (You)
                            </p>
                            <p className="text-[10px] text-neutral-400 font-medium truncate mt-0.5">
                              {currentUser.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Role dropdown */}
                      <td className="py-3.5 px-4 relative">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown?.id === 'current_user' && activeDropdown?.type === 'role' ? null : { id: 'current_user', type: 'role' })}
                          className="h-7 px-2 border border-neutral-200 rounded-md bg-white text-neutral-700 hover:bg-neutral-50 flex items-center justify-between gap-1.5 text-[11px] font-semibold transition-colors select-none w-24"
                        >
                          <span>Admin</span>
                          <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        </button>
                        
                        {activeDropdown?.id === 'current_user' && activeDropdown?.type === 'role' && (
                          <>
                            <div className="fixed inset-0 z-[80]" onClick={() => setActiveDropdown(null)} />
                            <div className="absolute left-4 top-11 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-[90] min-w-[120px] text-left">
                              <button
                                onClick={() => setActiveDropdown(null)}
                                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-blue-600 bg-neutral-50 hover:bg-neutral-50"
                              >
                                <span>Admin</span>
                                <Check className="w-3.5 h-3.5 text-blue-600" />
                              </button>
                              {['editor', 'viewer'].map((r) => (
                                <button
                                  key={r}
                                  onClick={() => {
                                    triggerToast('Cannot change owner permissions');
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50 text-left capitalize"
                                >
                                  {r === 'editor' ? 'Editeur' : 'Lecteur'}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </td>

                      {/* Plan dropdown */}
                      <td className="py-3.5 px-4 relative">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown?.id === 'current_user' && activeDropdown?.type === 'plan' ? null : { id: 'current_user', type: 'plan' })}
                          className="h-7 px-2 border border-neutral-200 rounded-md bg-white text-neutral-700 hover:bg-neutral-50 flex items-center justify-between gap-1.5 text-[11px] font-semibold transition-colors select-none w-24"
                        >
                          <span>Business</span>
                          <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        </button>

                        {activeDropdown?.id === 'current_user' && activeDropdown?.type === 'plan' && (
                          <>
                            <div className="fixed inset-0 z-[80]" onClick={() => setActiveDropdown(null)} />
                            <div className="absolute left-4 top-11 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-[90] min-w-[120px] text-left">
                              <button
                                onClick={() => setActiveDropdown(null)}
                                className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-blue-600 bg-neutral-50 hover:bg-neutral-50"
                              >
                                <span>Business</span>
                                <Check className="w-3.5 h-3.5 text-blue-600" />
                              </button>
                              {['Pro', 'Free'].map((p) => (
                                <button
                                  key={p}
                                  onClick={() => {
                                    triggerToast('Workspace plan is linked to billing');
                                    setActiveDropdown(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50 text-left"
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </td>

                      {/* Usage */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4].map((dot) => (
                            <span key={dot} className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
                          ))}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4"></td>
                    </tr>
                  )}

                  {/* Loading State */}
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center">
                        <div className="flex items-center justify-center gap-2 text-neutral-400">
                          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          <span className="text-xs font-semibold">Chargement des membres...</span>
                        </div>
                      </td>
                    </tr>
                  ) : sortedMembers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-xs text-neutral-400 font-medium">
                        Aucun membre trouvé
                      </td>
                    </tr>
                  ) : (
                    sortedMembers.map((member) => {
                      const isInvited = member.status === 'pending';
                      const formattedDate = new Date(member.invited_at).toLocaleDateString(locale, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });

                      const isDropdownOpen = activeDropdown?.id === member.id;
                      const isUpdating = updatingMemberId === member.id;

                      return (
                        <tr key={member.id} className="hover:bg-neutral-50/40 transition-colors group">
                          
                          {/* Name/Email */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              {isInvited ? (
                                <div className="w-8 h-8 rounded-full bg-neutral-50 border border-neutral-200/80 flex items-center justify-center shrink-0">
                                  <Mail className="w-3.5 h-3.5 text-neutral-400" />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-black text-white font-extrabold text-xs flex items-center justify-center shrink-0">
                                  {(member.profile?.full_name || member.email).slice(0, 2).toUpperCase()}
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-neutral-900 truncate">
                                    {isInvited ? member.email : (member.profile?.full_name || member.email)}
                                  </span>
                                  {isInvited && (
                                    <span className="bg-neutral-100 text-neutral-500 border border-neutral-200/80 text-[9px] font-bold px-1.5 py-0.5 rounded select-none shrink-0">
                                      {t('team.status_invited')}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-neutral-400 font-medium truncate mt-0.5">
                                  {isInvited ? `${t('team.invited_on')} ${formattedDate}` : member.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Role cell */}
                          <td className="py-3.5 px-4 relative">
                            {isUpdating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                            ) : isInvited ? (
                              <span className="text-[11px] text-neutral-500 font-semibold capitalize">
                                {member.role === 'admin' ? 'Admin' : member.role === 'editor' ? 'Editor' : 'Viewer'}
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => setActiveDropdown(isDropdownOpen && activeDropdown?.type === 'role' ? null : { id: member.id, type: 'role' })}
                                  className="h-7 px-2 border border-neutral-200 rounded-md bg-white text-neutral-700 hover:bg-neutral-50 flex items-center justify-between gap-1.5 text-[11px] font-semibold transition-colors select-none w-24"
                                >
                                  <span className="capitalize">{member.role}</span>
                                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                </button>

                                {isDropdownOpen && activeDropdown?.type === 'role' && (
                                  <>
                                    <div className="fixed inset-0 z-[80]" onClick={() => setActiveDropdown(null)} />
                                    <div className="absolute left-4 top-11 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-[90] min-w-[120px] text-left">
                                      {(['admin', 'editor', 'viewer'] as Role[]).map((r) => (
                                        <button
                                          key={r}
                                          onClick={() => handleUpdateField(member.id, { role: r })}
                                          className={cn(
                                            "w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50 text-left capitalize",
                                            member.role === r && "text-blue-600 font-bold bg-neutral-50"
                                          )}
                                        >
                                          <span>{r}</span>
                                          {member.role === r && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </>
                            )}
                          </td>

                          {/* Plan cell */}
                          <td className="py-3.5 px-4 relative">
                            {isUpdating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                            ) : isInvited ? (
                              <span className="inline-block bg-neutral-100 text-neutral-600 border border-neutral-200/50 text-[9px] font-bold px-2 py-0.5 rounded-full select-none">
                                {member.plan || 'Business'}
                              </span>
                            ) : (
                              <>
                                <button
                                  onClick={() => setActiveDropdown(isDropdownOpen && activeDropdown?.type === 'plan' ? null : { id: member.id, type: 'plan' })}
                                  className="h-7 px-2 border border-neutral-200 rounded-md bg-white text-neutral-700 hover:bg-neutral-50 flex items-center justify-between gap-1.5 text-[11px] font-semibold transition-colors select-none w-24"
                                >
                                  <span>{member.plan || 'Business'}</span>
                                  <ChevronDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                </button>

                                {isDropdownOpen && activeDropdown?.type === 'plan' && (
                                  <>
                                    <div className="fixed inset-0 z-[80]" onClick={() => setActiveDropdown(null)} />
                                    <div className="absolute left-4 top-11 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 z-[90] min-w-[120px] text-left">
                                      {(['Business', 'Pro', 'Free'] as Plan[]).map((p) => (
                                        <button
                                          key={p}
                                          onClick={() => handleUpdateField(member.id, { plan: p })}
                                          className={cn(
                                            "w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50 text-left",
                                            (member.plan || 'Business') === p && "text-blue-600 font-bold bg-neutral-50"
                                          )}
                                        >
                                          <span>{p}</span>
                                          {(member.plan || 'Business') === p && <Check className="w-3.5 h-3.5 text-blue-600" />}
                                        </button>
                                      ))}
                                    </div>
                                  </>
                                )}
                              </>
                            )}
                          </td>

                          {/* Usage cell */}
                          <td className="py-3.5 px-4">
                            {!isInvited && (
                              <div className="flex items-center gap-1 select-none">
                                {Array.from({ length: 4 }).map((_, i) => {
                                  const fillCount = member.usage_count || 0;
                                  return (
                                    <span
                                      key={i}
                                      className={cn(
                                        "w-1.5 h-1.5 rounded-full transition-colors",
                                        i < fillCount ? "bg-neutral-400" : "bg-neutral-200"
                                      )}
                                      onClick={() => handleUpdateField(member.id, { usageCount: i + 1 })}
                                      title={`Définir l'utilisation à ${i + 1}/4`}
                                    />
                                  );
                                })}
                              </div>
                            )}
                          </td>

                          {/* Actions cell */}
                          <td className="py-3.5 px-4 text-right">
                            {confirmRemoveId === member.id ? (
                              <div className="flex items-center gap-1 justify-end">
                                <button
                                  onClick={() => handleRemoveMember(member.id)}
                                  disabled={removingId === member.id}
                                  className="w-5 h-5 flex items-center justify-center bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                                >
                                  {removingId === member.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                                </button>
                                <button
                                  onClick={() => setConfirmRemoveId(null)}
                                  className="w-5 h-5 flex items-center justify-center bg-neutral-100 hover:bg-neutral-200 text-neutral-600 rounded border border-neutral-200 transition-colors"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmRemoveId(member.id)}
                                className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-neutral-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="Supprimer ce membre"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        </>}
      </div>

      {/* ── Invite User Modal Overlay ── */}
      {showInviteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm bg-white border border-neutral-200 rounded-xl p-5 space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-neutral-900">
                  {t('team.btn_invite')}
                </h3>
                <p className="text-[11px] text-neutral-400 font-medium">
                  Renseignez l&apos;e-mail pour envoyer une invitation au workspace.
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => setShowInviteModal(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Adresse e-mail</label>
                <input
                  type="email"
                  required
                  placeholder="collaborateur@entreprise.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full h-8 text-xs px-3 border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-600 bg-white placeholder:text-neutral-400"
                />
              </div>

              {/* Role Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Rôle</label>
                <div className="flex gap-2">
                  {(['admin', 'editor', 'viewer'] as Role[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setInviteRole(r)}
                      className={cn(
                        "flex-1 py-1.5 text-[10px] font-bold rounded-md border capitalize transition-all",
                        inviteRole === r
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {/* Plan Select */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Forfait</label>
                <div className="flex gap-2">
                  {(['Business', 'Pro', 'Free'] as Plan[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setInvitePlan(p)}
                      className={cn(
                        "flex-1 py-1.5 text-[10px] font-bold rounded-md border transition-all",
                        invitePlan === p
                          ? "bg-neutral-900 text-white border-neutral-900"
                          : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {inviteError && (
                <p className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-100 rounded-md p-2">
                  {inviteError}
                </p>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2 text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="h-8 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 px-4 text-xs font-semibold text-neutral-600 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSending || !inviteEmail}
                  className="h-8 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-100 disabled:text-neutral-400 text-white text-xs font-semibold rounded-md px-4 flex items-center justify-center gap-1.5 transition-colors"
                >
                  {isSending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Envoyer l&apos;invitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
