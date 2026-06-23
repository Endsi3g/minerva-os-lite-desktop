'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Send, Search, Users, MessageCircle, Smile, ImageIcon, X } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Member {
  id: string;
  email: string;
  name: string;
  avatarBase64?: string | null;
}

interface DmMessage {
  id: string;
  workspaceId: string;
  senderId: string;
  senderName: string;
  content: string;
  recipientId: string | null;
  createdAt: string;
}

// ── Emoji data ─────────────────────────────────────────────────────────────────

const EMOJI_GROUPS = [
  { label: 'Smileys', emojis: ['😀','😂','😊','🥰','😎','🤔','😅','🤣','😭','😤','🥳','😍','🤩','😇','🫡'] },
  { label: 'Gestes', emojis: ['👍','👎','👋','🤝','🙏','💪','🤞','✌️','👌','🫶','❤️‍🔥','🤙','👏','🫂','🤜'] },
  { label: 'Symboles', emojis: ['❤️','🔥','✅','⚠️','🎉','🚀','💡','⭐','💯','🎯','📌','🔑','💰','📈','🏆'] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Hier';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// Compresses image to max 800px wide at 70% quality
async function compressImage(dataUrl: string, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(dataUrl); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Avatar
function Avatar({ name, src, size = 'md' }: { name: string; src?: string | null; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const colors = ['bg-indigo-500','bg-emerald-500','bg-sky-500','bg-rose-500','bg-amber-500','bg-violet-500'];
  const color = colors[hash % colors.length];

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={cn(sz, 'rounded-full object-cover shrink-0')} />;
  }
  return (
    <div className={cn(sz, color, 'rounded-full flex items-center justify-center text-white font-bold shrink-0')}>
      {initials(name)}
    </div>
  );
}

// Message content renderer — handles [[img]]..., plain text, @mentions
function MessageContent({ content, isMe }: { content: string; isMe: boolean }) {
  if (content.startsWith('[[img]]')) {
    const src = content.slice(7);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="Image"
        className="max-w-[240px] max-h-[220px] rounded-xl object-cover cursor-pointer block"
        onClick={() => {
          const win = window.open();
          if (win) { win.document.write(`<img src="${src}" style="max-width:100%">`); }
        }}
      />
    );
  }

  // Highlight @mentions
  const parts = content.split(/(@\S+)/g);
  return (
    <span className={cn('text-sm leading-relaxed whitespace-pre-wrap break-words', isMe ? 'text-white' : 'text-[#26251e]')}>
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className={cn('font-bold', isMe ? 'text-white/90 underline underline-offset-2' : 'text-[#059669]')}>
            {part}
          </span>
        ) : part
      )}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MessagesRoot() {
  const { t } = useLanguage();
  const { activeWorkspace } = useReach();

  const [members, setMembers] = useState<Member[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<'group' | string>('group');
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current user
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then((authResult: { data: { user: import('@supabase/supabase-js').User | null } }) => {
      const u = authResult.data.user;
      if (!u) return;
      setCurrentUserId(u.id);
      supabase
        .from('settings')
        .select('full_name')
        .eq('user_id', u.id)
        .maybeSingle()
        .then((settingsResult: { data: { full_name?: string | null } | null }) => {
          setCurrentUserName(settingsResult.data?.full_name || u.email?.split('@')[0] || 'Moi');
        });
    });
  }, []);

  // Fetch workspace members
  const fetchMembers = useCallback(async () => {
    if (!activeWorkspace) return;
    try {
      const ownerParam = activeWorkspace.owner_id ? `?ownerUserId=${activeWorkspace.owner_id}` : '';
      const res = await fetch(getApiUrl(`/api/team/members${ownerParam}`));
      if (!res.ok) return;
      const data = await res.json();
      const raw = (data.members || []) as Array<{
        member_user_id: string | null;
        email: string;
        status: string;
        profile?: { full_name: string | null; avatar_base64?: string | null } | null;
      }>;
      setMembers(
        raw
          .filter((m) => m.member_user_id && m.status === 'active')
          .map((m) => ({
            id: m.member_user_id!,
            email: m.email,
            name: m.profile?.full_name || m.email.split('@')[0],
            avatarBase64: m.profile?.avatar_base64 ?? null,
          }))
      );
    } catch (err) {
      console.error('Failed to load team members:', err);
    }
  }, [activeWorkspace]);

  useEffect(() => { fetchMembers(); }, [fetchMembers]);

  // Load messages
  const loadMessages = useCallback(async () => {
    if (!activeWorkspace || !currentUserId) return;
    setLoadingMessages(true);
    try {
      const supabase = createClient();
      let query = supabase
        .from('team_messages')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: true })
        .limit(100);

      if (selectedConversation === 'group') {
        query = query.is('recipient_id', null);
      } else {
        const theirId = selectedConversation;
        query = query.or(
          `and(sender_id.eq.${currentUserId},recipient_id.eq.${theirId}),and(sender_id.eq.${theirId},recipient_id.eq.${currentUserId})`
        );
      }

      const { data, error } = await query;
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setMessages((data || []).map((r: any) => ({
        id: r.id,
        workspaceId: r.workspace_id || '',
        senderId: r.sender_id || '',
        senderName: r.sender_name || 'Membre',
        content: r.content || '',
        recipientId: r.recipient_id ?? null,
        createdAt: r.created_at,
      })));
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [activeWorkspace, currentUserId, selectedConversation]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Realtime subscription
  useEffect(() => {
    if (!activeWorkspace) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`dm_${activeWorkspace.id}_${selectedConversation}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'team_messages',
        filter: `workspace_id=eq.${activeWorkspace.id}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, (payload: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = payload.new as any;
        const newMsg: DmMessage = {
          id: r.id,
          workspaceId: r.workspace_id || '',
          senderId: r.sender_id || '',
          senderName: r.sender_name || 'Membre',
          content: r.content || '',
          recipientId: r.recipient_id ?? null,
          createdAt: r.created_at,
        };
        const isGroup = selectedConversation === 'group' && newMsg.recipientId === null;
        const isDm = selectedConversation !== 'group' && newMsg.recipientId !== null && (
          (newMsg.senderId === currentUserId && newMsg.recipientId === selectedConversation) ||
          (newMsg.senderId === selectedConversation && newMsg.recipientId === currentUserId)
        );
        if (isGroup || isDm) {
          setMessages((prev) => prev.some((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeWorkspace, selectedConversation, currentUserId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Core send
  const sendContent = async (content: string) => {
    if (!content || !activeWorkspace || !currentUserId || sending) return;
    setSending(true);
    const optimisticId = `opt_${Date.now()}`;
    const optimistic: DmMessage = {
      id: optimisticId,
      workspaceId: activeWorkspace.id,
      senderId: currentUserId,
      senderName: currentUserName,
      content,
      recipientId: selectedConversation === 'group' ? null : selectedConversation,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const supabase = createClient();
      const { error } = await supabase.from('team_messages').insert({
        workspace_id: activeWorkspace.id,
        sender_id: currentUserId,
        sender_name: currentUserName,
        content,
        recipient_id: selectedConversation === 'group' ? null : selectedConversation,
        created_at: new Date().toISOString(),
      });
      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        console.error('Send error:', error);
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleSend = () => {
    const content = newMessage.trim();
    if (!content) return;
    setNewMessage('');
    sendContent(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Image upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const raw = ev.target?.result as string;
      const isImage = file.type.startsWith('image/');
      let dataUrl = raw;
      if (isImage && !file.type.includes('gif')) {
        dataUrl = await compressImage(raw);
      }
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleSendImage = () => {
    if (!imagePreview) return;
    sendContent(`[[img]]${imagePreview}`);
    setImagePreview(null);
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage((prev) => prev + emoji);
    setEmojiOpen(false);
    inputRef.current?.focus();
  };

  // Filtered sidebar
  const filteredMembers = members.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );
  const selectedMember = members.find((m) => m.id === selectedConversation);

  // Group messages by date
  const groupedMessages: Array<{ date: string; items: DmMessage[] }> = [];
  messages.forEach((msg) => {
    const dateKey = new Date(msg.createdAt).toDateString();
    const last = groupedMessages[groupedMessages.length - 1];
    if (last && last.date === dateKey) last.items.push(msg);
    else groupedMessages.push({ date: dateKey, items: [msg] });
  });

  return (
    <div className="flex h-full w-full overflow-hidden bg-white text-[#26251e]">
      {/* Left panel */}
      <div className="w-64 flex-shrink-0 border-r border-[#e5e5e0] bg-[#f4f4f3] flex flex-col">
        <div className="px-4 pt-5 pb-3">
          <h1 className="text-sm font-bold text-[#26251e] tracking-tight mb-3">{t('messages.title')}</h1>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7a7a76]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('messages.search_members')}
              className="pl-8 h-8 text-xs bg-white border-[#e5e5e0] rounded-lg"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-4">
          <button
            onClick={() => setSelectedConversation('group')}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors mb-1',
              selectedConversation === 'group' ? 'bg-[#059669]/10 text-[#059669]' : 'hover:bg-white/70 text-[#26251e]'
            )}
          >
            <div className="w-9 h-9 rounded-full bg-[#059669]/15 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-[#059669]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{t('messages.group_chat')}</p>
              <p className="text-[10px] text-[#7a7a76] truncate">Chat d'équipe</p>
            </div>
          </button>

          {filteredMembers.length > 0 && (
            <>
              <Separator className="my-2 bg-[#e5e5e0]" />
              <p className="text-[10px] font-semibold tracking-wider uppercase text-[#7a7a76] px-2.5 mb-1">Membres</p>
            </>
          )}

          {filteredMembers.map((member) => (
            <button
              key={member.id}
              onClick={() => setSelectedConversation(member.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors mb-0.5',
                selectedConversation === member.id ? 'bg-[#059669]/10 text-[#059669]' : 'hover:bg-white/70 text-[#26251e]'
              )}
            >
              <Avatar name={member.name} src={member.avatarBase64} />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold truncate">{member.name}</p>
                <p className="text-[10px] text-[#7a7a76] truncate">{member.email}</p>
              </div>
            </button>
          ))}

          {members.length === 0 && (
            <p className="text-[11px] text-[#7a7a76] px-2.5 py-3 text-center">Aucun membre actif</p>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center gap-3 px-5 border-b border-[#e5e5e0] shrink-0 bg-white z-10">
          {selectedConversation === 'group' ? (
            <>
              <div className="w-8 h-8 rounded-full bg-[#059669]/15 flex items-center justify-center">
                <Users className="w-4 h-4 text-[#059669]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#26251e]">{t('messages.group_chat')}</p>
                <p className="text-[10px] text-[#7a7a76]">{members.length} membre{members.length !== 1 ? 's' : ''}</p>
              </div>
            </>
          ) : selectedMember ? (
            <>
              <Avatar name={selectedMember.name} src={selectedMember.avatarBase64} size="sm" />
              <div>
                <p className="text-sm font-semibold text-[#26251e]">{selectedMember.name}</p>
                <p className="text-[10px] text-[#7a7a76]">{selectedMember.email}</p>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#7a7a76]">{t('messages.no_conversation')}</p>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-2">
          {loadingMessages ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#059669] border-t-transparent" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageCircle className="w-10 h-10 text-[#e5e5e0] mb-3" />
              <p className="text-sm font-semibold text-[#26251e] mb-1">
                {selectedConversation === 'group' ? t('messages.empty_group') : t('messages.empty_dm')}
              </p>
              <p className="text-xs text-[#7a7a76]">
                {selectedConversation === 'group'
                  ? "Envoyez un message à toute l'équipe"
                  : `Commencez à discuter avec ${selectedMember?.name || 'ce membre'}`}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {groupedMessages.map(({ date, items }) => (
                <div key={date}>
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px bg-[#e5e5e0]" />
                    <span className="text-[10px] font-semibold text-[#7a7a76] tracking-wide uppercase shrink-0">
                      {formatDate(items[0].createdAt)}
                    </span>
                    <div className="flex-1 h-px bg-[#e5e5e0]" />
                  </div>

                  {items.map((msg, idx) => {
                    const isMe = msg.senderId === currentUserId;
                    const prevMsg = idx > 0 ? items[idx - 1] : null;
                    const showSenderInfo = !prevMsg || prevMsg.senderId !== msg.senderId;

                    return (
                      <div
                        key={msg.id}
                        className={cn(
                          'flex gap-2.5',
                          isMe ? 'flex-row-reverse' : 'flex-row',
                          showSenderInfo ? 'mt-3' : 'mt-0.5'
                        )}
                      >
                        <div className="shrink-0 w-7">
                          {showSenderInfo && !isMe && <Avatar name={msg.senderName} size="sm" />}
                        </div>

                        <div className={cn('max-w-[70%] flex flex-col', isMe ? 'items-end' : 'items-start')}>
                          {showSenderInfo && (
                            <div className={cn('flex items-baseline gap-2 mb-1', isMe ? 'flex-row-reverse' : 'flex-row')}>
                              <span className="text-[11px] font-semibold text-[#26251e]">
                                {isMe ? t('messages.you') : msg.senderName}
                              </span>
                              <span className="text-[10px] text-[#7a7a76]">{formatTime(msg.createdAt)}</span>
                            </div>
                          )}

                          <div
                            className={cn(
                              'leading-relaxed break-words overflow-hidden',
                              msg.content.startsWith('[[img]]')
                                ? 'p-0 bg-transparent rounded-xl'
                                : cn(
                                    'px-3 py-2',
                                    isMe
                                      ? 'bg-[#059669] text-white rounded-2xl rounded-tr-sm'
                                      : 'bg-[#f4f4f3] text-[#26251e] rounded-2xl rounded-tl-sm'
                                  )
                            )}
                          >
                            <MessageContent content={msg.content} isMe={isMe} />
                          </div>

                          {!showSenderInfo && (
                            <span className="text-[9px] text-[#7a7a76] mt-0.5 px-1">
                              {formatTime(msg.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Image preview */}
        {imagePreview && (
          <div className="px-4 py-2 border-t border-[#e5e5e0] bg-[#f4f4f3] flex items-center gap-3 shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Aperçu" className="h-16 w-16 object-cover rounded-lg border border-[#e5e5e0]" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#26251e]">Image prête à envoyer</p>
              <p className="text-[10px] text-[#7a7a76]">Cliquez sur Envoyer pour partager</p>
            </div>
            <Button
              onClick={() => setImagePreview(null)}
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-[#7a7a76] hover:text-red-500"
            >
              <X className="w-4 h-4" />
            </Button>
            <Button
              onClick={handleSendImage}
              disabled={sending}
              size="sm"
              className="h-8 bg-[#059669] hover:bg-[#047857] text-white text-xs"
            >
              <Send className="w-3.5 h-3.5 mr-1" />
              Envoyer
            </Button>
          </div>
        )}

        {/* Input bar */}
        <div className="px-4 pt-3 pb-5 border-t border-[#e5e5e0] bg-white shrink-0">
          <div className="flex items-center gap-1.5 bg-[#f4f4f3] border border-[#e5e5e0] rounded-xl px-3 py-2">
            {/* Emoji picker */}
            <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="text-[#7a7a76] hover:text-[#26251e] transition-colors p-0.5 shrink-0"
                >
                  <Smile className="w-5 h-5" />
                </button>
              </PopoverTrigger>
              <PopoverContent side="top" align="start" className="w-64 p-3">
                <div className="space-y-2">
                  {EMOJI_GROUPS.map((group) => (
                    <div key={group.label}>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1">{group.label}</p>
                      <div className="flex flex-wrap gap-0.5">
                        {group.emojis.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleEmojiSelect(emoji)}
                            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-[#f4f4f3] rounded transition-colors"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* Image/GIF upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,image/gif"
              className="hidden"
              onChange={handleFileSelect}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[#7a7a76] hover:text-[#26251e] transition-colors p-0.5 shrink-0"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Text input */}
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('messages.input_placeholder')}
              className="flex-1 h-auto border-0 bg-transparent text-sm p-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
              disabled={sending}
            />

            {/* Send */}
            <Button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              size="icon"
              className="h-8 w-8 bg-[#059669] hover:bg-[#047857] text-white rounded-lg shrink-0 disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
