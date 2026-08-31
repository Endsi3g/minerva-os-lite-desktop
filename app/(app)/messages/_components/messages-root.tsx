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
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  MessageScrollerProvider,
  MessageScroller,
  MessageScrollerViewport,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerButton,
} from '@/components/ui/message-scroller';
import { Message, MessageAvatar, MessageContent as UiMessageContent, MessageHeader, MessageFooter } from '@/components/ui/message';
import { Bubble, BubbleContent } from '@/components/ui/bubble';
import { Marker, MarkerContent } from '@/components/ui/marker';
import {
  Attachment,
  AttachmentMedia,
  AttachmentContent,
  AttachmentTitle,
  AttachmentDescription,
  AttachmentTrigger,
  AttachmentActions,
  AttachmentAction,
} from '@/components/ui/attachment';
import {
  Send, Search, Users, MessageCircle, Smile, ImageIcon, X, FileText, Mic, Square, Paperclip, Loader2,
  MoreHorizontal, Pencil, Trash2, Check, Menu, Bot,
} from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import type { TranslationKey } from '@/lib/translations';

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
  updatedAt: string;
  isEdited: boolean;
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

// Avatar (maison — génère des initiales sur fond coloré à partir du nom, ou affiche une image / icône IA)
function UserAvatar({ name, src, size = 'md' }: { name: string; src?: string | null; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-9 h-9 text-xs';
  const isAi = name.toLowerCase().includes('minerva') || name.toLowerCase().includes('copilote') || name.toLowerCase().includes('ia');

  if (isAi) {
    return (
      <div className={cn(sz, 'rounded-full bg-[#f4f4f3] border border-[#e5e5e0] flex items-center justify-center text-[#26251e] shrink-0')}>
        <Bot className={size === 'sm' ? 'w-3.5 h-3.5 text-[#059669]' : 'w-4 h-4 text-[#059669]'} />
      </div>
    );
  }

  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className={cn(sz, 'rounded-full object-cover shrink-0')} />;
  }

  const hash = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const colors = ['bg-indigo-500','bg-emerald-500','bg-sky-500','bg-rose-500','bg-amber-500','bg-violet-500'];
  const color = colors[hash % colors.length];

  return (
    <div className={cn(sz, color, 'rounded-full flex items-center justify-center text-white font-bold shrink-0')}>
      {initials(name)}
    </div>
  );
}

// Rendu du contenu d'un message — gère [[img]], [[audio]], [[file]], texte brut avec @mentions
function MessageBody({ content, isMe, onImageClick }: { content: string; isMe: boolean; onImageClick: (src: string) => void }) {
  if (content.startsWith('[[img]]')) {
    const src = content.slice(7);
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt="Image"
        className="max-w-[240px] max-h-[220px] rounded-xl object-cover cursor-pointer block hover:opacity-90 transition-opacity"
        onClick={() => onImageClick(src)}
      />
    );
  }

  if (content.startsWith('[[audio]]')) {
    const src = content.slice(9);
    return (
      <audio controls src={src} className="max-w-[260px] h-10">
        Votre navigateur ne supporte pas la lecture audio.
      </audio>
    );
  }

  if (content.startsWith('[[file]]')) {
    const [name, url] = content.slice(8).split('|');
    return (
      <Attachment size="sm" className="relative max-w-[240px] border-transparent bg-transparent">
        <AttachmentMedia className={isMe ? 'bg-white/15 text-white' : ''}>
          <FileText className="w-4 h-4" />
        </AttachmentMedia>
        <AttachmentContent>
          <AttachmentTitle className={isMe ? 'text-white' : 'text-[#26251e]'}>{name || 'Fichier'}</AttachmentTitle>
          <AttachmentDescription className={isMe ? 'text-white/70' : ''}>Pièce jointe</AttachmentDescription>
        </AttachmentContent>
        <AttachmentTrigger asChild>
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Ouvrir ${name || 'le fichier'}`} />
        </AttachmentTrigger>
      </Attachment>
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

// ── Conversation list (shared between desktop sidebar and mobile sheet) ────────

function ConversationList({
  t,
  searchQuery,
  setSearchQuery,
  selectedConversation,
  onSelect,
  members,
  filteredMembers,
}: {
  t: (key: TranslationKey, fallback?: string) => string;
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  selectedConversation: 'group' | string;
  onSelect: (id: 'group' | string) => void;
  members: Member[];
  filteredMembers: Member[];
}) {
  return (
    <>
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
          onClick={() => onSelect('group')}
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
            onClick={() => onSelect(member.id)}
            className={cn(
              'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-colors mb-0.5',
              selectedConversation === member.id ? 'bg-[#059669]/10 text-[#059669]' : 'hover:bg-white/70 text-[#26251e]'
            )}
          >
            <UserAvatar name={member.name} src={member.avatarBase64} />
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
    </>
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
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [mobileListOpen, setMobileListOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
      const humanMembers = raw
        .filter((m) => m.member_user_id && m.status === 'active')
        .map((m) => ({
          id: m.member_user_id!,
          email: m.email,
          name: m.profile?.full_name || m.email.split('@')[0],
          avatarBase64: m.profile?.avatar_base64 ?? null,
        }));

      const minervaMember: Member = {
        id: 'minerva-ai',
        email: 'copilote@minerva.ai',
        name: 'Minerva (Copilote IA)',
        avatarBase64: null,
      };

      setMembers([minervaMember, ...humanMembers]);
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
        updatedAt: r.updated_at || r.created_at,
        isEdited: Boolean(r.is_edited),
      })));
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, [activeWorkspace, currentUserId, selectedConversation]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // Realtime subscription — INSERT (nouveaux messages), UPDATE (édition), DELETE (suppression)
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
          updatedAt: r.updated_at || r.created_at,
          isEdited: Boolean(r.is_edited),
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
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'team_messages',
        filter: `workspace_id=eq.${activeWorkspace.id}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, (payload: any) => {
        const r = payload.new as any;
        setMessages((prev) => prev.map((m) => m.id === r.id
          ? { ...m, content: r.content ?? m.content, updatedAt: r.updated_at || m.updatedAt, isEdited: Boolean(r.is_edited) }
          : m
        ));
      })
      .on('postgres_changes', {
        // Pas de filtre workspace_id ici : un événement DELETE de Postgres ne contient
        // par défaut que la clé primaire dans `old` (REPLICA IDENTITY par défaut), donc
        // un filtre sur workspace_id ne matcherait jamais côté serveur Realtime. On
        // filtre simplement par présence de l'id dans notre liste locale, déjà scopée
        // au workspace courant.
        event: 'DELETE',
        schema: 'public',
        table: 'team_messages',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }, (payload: any) => {
        const deletedId = payload.old?.id;
        if (!deletedId) return;
        setMessages((prev) => prev.filter((m) => m.id !== deletedId));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [activeWorkspace, selectedConversation, currentUserId]);

  // Core send
  const sendContent = async (content: string) => {
    if (!content || !activeWorkspace || !currentUserId || sending) return;
    setSending(true);
    const optimisticId = `opt_${Date.now()}`;
    const nowIso = new Date().toISOString();
    const optimistic: DmMessage = {
      id: optimisticId,
      workspaceId: activeWorkspace.id,
      senderId: currentUserId,
      senderName: currentUserName,
      content,
      recipientId: selectedConversation === 'group' ? null : selectedConversation,
      createdAt: nowIso,
      updatedAt: nowIso,
      isEdited: false,
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
        created_at: nowIso,
      });
      if (error) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        console.error('Send error:', error);
        toast.error(`Échec de l'envoi : ${error.message}`);
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      }

      // AI automatic reply when DMing Minerva or @mentioning in group
      if (selectedConversation === 'minerva-ai') {
        (async () => {
          try {
            const aiRes = await fetch(getApiUrl('/api/ai/generate'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: content,
                systemPrompt: `Tu es Minerva, le copilote commercial et assistant SDR IA de l'équipe pour le workspace "${activeWorkspace.name}". Tu réponds directement en messagerie instantanée à ${currentUserName}. Réponds de façon concise, précise, proactive et directe en français.`,
              }),
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              const replyText = aiData.text?.trim();
              if (replyText) {
                const replyIso = new Date().toISOString();
                const supa = createClient();
                await supa.from('team_messages').insert({
                  workspace_id: activeWorkspace.id,
                  sender_id: 'minerva-ai',
                  sender_name: 'Minerva (Copilote IA)',
                  content: replyText,
                  recipient_id: currentUserId,
                  created_at: replyIso,
                });
              }
            }
          } catch (aiErr) {
            console.error('Minerva AI reply failed:', aiErr);
          }
        })();
      } else if (selectedConversation === 'group' && (content.toLowerCase().includes('@minerva') || content.toLowerCase().includes('@ia'))) {
        (async () => {
          try {
            const aiRes = await fetch(getApiUrl('/api/ai/generate'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                prompt: content,
                systemPrompt: `Tu es Minerva, le copilote commercial IA intervenant dans le chat d'équipe du workspace "${activeWorkspace.name}". ${currentUserName} t'a mentionné. Réponds brièvement et clairement à l'équipe en français.`,
              }),
            });
            if (aiRes.ok) {
              const aiData = await aiRes.json();
              const replyText = aiData.text?.trim();
              if (replyText) {
                const replyIso = new Date().toISOString();
                const supa = createClient();
                await supa.from('team_messages').insert({
                  workspace_id: activeWorkspace.id,
                  sender_id: 'minerva-ai',
                  sender_name: 'Minerva (Copilote IA)',
                  content: replyText,
                  recipient_id: null,
                  created_at: replyIso,
                });
              }
            }
          } catch (aiErr) {
            console.error('Minerva AI group reply failed:', aiErr);
          }
        })();
      }
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      toast.error(`Échec de l'envoi : ${err?.message || 'erreur inconnue'}`);
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

  // ── Édition ────────────────────────────────────────────────────────────────
  const startEdit = (msg: DmMessage) => {
    setEditingId(msg.id);
    setEditDraft(msg.content);
    setTimeout(() => editInputRef.current?.focus(), 0);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft('');
  };

  const saveEdit = async () => {
    const id = editingId;
    const trimmed = editDraft.trim();
    if (!id || !trimmed) { cancelEdit(); return; }
    const prevMessages = messages;
    const nowIso = new Date().toISOString();
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, content: trimmed, updatedAt: nowIso, isEdited: true } : m));
    setEditingId(null);
    setEditDraft('');
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('team_messages')
        .update({ content: trimmed, updated_at: nowIso, is_edited: true })
        .eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      setMessages(prevMessages);
      toast.error(`Échec de la modification : ${err?.message || 'erreur inconnue'}`, { duration: 8000 });
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
  };

  // ── Suppression ───────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    const id = deleteTargetId;
    setDeleteTargetId(null);
    if (!id) return;
    const prevMessages = messages;
    setMessages((prev) => prev.filter((m) => m.id !== id));
    try {
      const supabase = createClient();
      const { error } = await supabase.from('team_messages').delete().eq('id', id);
      if (error) throw error;
    } catch (err: any) {
      setMessages(prevMessages);
      toast.error(`Échec de la suppression : ${err?.message || 'erreur inconnue'}`, { duration: 8000 });
    }
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

  // Messages vocaux — enregistrement via MediaRecorder, upload réel vers
  // Supabase Storage (pas de base64 en base — un enregistrement long
  // exploserait la colonne content).
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.onstop = () => { stream.getTracks().forEach((t) => t.stop()); };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      toast.error('Microphone inaccessible — vérifiez les permissions du navigateur.');
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    setIsRecording(false);
    recorder.onstop = async () => {
      recorder.stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      if (blob.size === 0) return;
      setUploadingVoice(true);
      try {
        const supabase = createClient();
        const ext = (recorder.mimeType || 'audio/webm').includes('mp4') ? 'm4a' : 'webm';
        const path = `${activeWorkspace?.id || 'ws'}/${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from('voice-messages').upload(path, blob, { contentType: blob.type });
        if (error) throw error;
        const { data: urlData } = supabase.storage.from('voice-messages').getPublicUrl(path);
        await sendContent(`[[audio]]${urlData.publicUrl}`);
      } catch (err) {
        console.error('Voice upload failed:', err);
      } finally {
        setUploadingVoice(false);
      }
    };
    recorder.stop();
  };

  // Fichiers arbitraires — upload vers le bucket message-files.
  const handleAttachmentSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !activeWorkspace) return;
    setUploadingFile(true);
    try {
      const supabase = createClient();
      const path = `${activeWorkspace.id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from('message-files').upload(path, file, { contentType: file.type });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('message-files').getPublicUrl(path);
      await sendContent(`[[file]]${file.name}|${urlData.publicUrl}`);
    } catch (err) {
      console.error('File upload failed:', err);
      toast.error('Envoi du fichier impossible.');
    } finally {
      setUploadingFile(false);
    }
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
      {/* Left panel — hidden on mobile, visible on md+ */}
      <div className="hidden md:flex w-56 lg:w-64 flex-shrink-0 border-r border-[#e5e5e0] bg-[#f4f4f3] flex-col">
        <ConversationList
          t={t}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedConversation={selectedConversation}
          onSelect={setSelectedConversation}
          members={members}
          filteredMembers={filteredMembers}
        />
      </div>

      {/* Mobile conversation switcher — slides over from the left */}
      <Sheet open={mobileListOpen} onOpenChange={setMobileListOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col bg-[#f4f4f3]">
          <SheetHeader className="sr-only">
            <SheetTitle>{t('messages.title')}</SheetTitle>
          </SheetHeader>
          <ConversationList
            t={t}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedConversation={selectedConversation}
            onSelect={(id) => { setSelectedConversation(id); setMobileListOpen(false); }}
            members={members}
            filteredMembers={filteredMembers}
          />
        </SheetContent>
      </Sheet>

      {/* Right panel */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="h-14 flex items-center gap-3 px-5 border-b border-[#e5e5e0] shrink-0 bg-white z-10">
          <button
            type="button"
            onClick={() => setMobileListOpen(true)}
            className="md:hidden -ml-1 mr-1 p-1.5 text-[#7a7a76] hover:text-[#26251e] transition-colors shrink-0"
            aria-label="Changer de conversation"
          >
            <Menu className="w-5 h-5" />
          </button>
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
              <UserAvatar name={selectedMember.name} src={selectedMember.avatarBase64} size="sm" />
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
        <div className="flex-1 min-h-0">
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
            <MessageScrollerProvider autoScroll defaultScrollPosition="end">
              <MessageScroller className="h-full">
                <MessageScrollerViewport>
                  <MessageScrollerContent className="px-4 py-4 pb-2 gap-1">
                    {groupedMessages.map(({ date, items }) => (
                      <React.Fragment key={date}>
                        <MessageScrollerItem className="my-3">
                          <Marker variant="separator">
                            <MarkerContent className="text-[10px] font-semibold text-[#7a7a76] tracking-wide uppercase">
                              {formatDate(items[0].createdAt)}
                            </MarkerContent>
                          </Marker>
                        </MessageScrollerItem>

                        {items.map((msg, idx) => {
                          const isMe = msg.senderId === currentUserId;
                          const prevMsg = idx > 0 ? items[idx - 1] : null;
                          const showSenderInfo = !prevMsg || prevMsg.senderId !== msg.senderId;
                          const isEditingThis = editingId === msg.id;

                          return (
                            <MessageScrollerItem key={msg.id} messageId={msg.id} className={showSenderInfo ? 'mt-2' : 'mt-0.5'}>
                              <Message align={isMe ? 'end' : 'start'} className="group/msg items-end">
                                <MessageAvatar className={cn('bg-transparent', (!showSenderInfo || isMe) && 'invisible')}>
                                  {showSenderInfo && !isMe && <UserAvatar name={msg.senderName} size="sm" />}
                                </MessageAvatar>

                                <UiMessageContent className={cn(isMe ? 'items-end' : 'items-start')}>
                                  {showSenderInfo && (
                                    <MessageHeader className={cn('gap-2 px-1', isMe && 'flex-row-reverse')}>
                                      <span className="text-[11px] font-semibold text-[#26251e]">
                                        {isMe ? t('messages.you') : msg.senderName}
                                      </span>
                                      <span className="text-[10px] text-[#7a7a76]">{formatTime(msg.createdAt)}</span>
                                    </MessageHeader>
                                  )}

                                  <div className={cn('flex items-center gap-1', isMe ? 'flex-row-reverse' : 'flex-row')}>
                                    {isEditingThis ? (
                                      <div className="flex items-center gap-1.5 bg-[#f4f4f3] border border-[#e5e5e0] rounded-xl px-2 py-1 min-w-[200px]">
                                        <Input
                                          ref={editInputRef}
                                          value={editDraft}
                                          onChange={(e) => setEditDraft(e.target.value)}
                                          onKeyDown={handleEditKeyDown}
                                          className="flex-1 h-7 border-0 bg-transparent text-sm p-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none"
                                        />
                                        <button onClick={saveEdit} className="text-[#059669] hover:text-[#047857] shrink-0" aria-label="Enregistrer la modification">
                                          <Check className="w-4 h-4" />
                                        </button>
                                        <button onClick={cancelEdit} className="text-[#7a7a76] hover:text-red-500 shrink-0" aria-label="Annuler la modification">
                                          <X className="w-4 h-4" />
                                        </button>
                                      </div>
                                    ) : (
                                      <Bubble variant="ghost" align={isMe ? 'end' : 'start'}>
                                        <BubbleContent
                                          className={cn(
                                            'leading-relaxed break-words overflow-hidden',
                                            msg.content.startsWith('[[img]]')
                                              ? '!p-0 !bg-transparent rounded-xl'
                                              : msg.content.startsWith('[[file]]')
                                                ? '!p-0 !bg-transparent'
                                                : cn(
                                                    '!px-3 !py-2',
                                                    isMe
                                                      ? '!bg-[#059669] !text-white !rounded-2xl !rounded-tr-sm'
                                                      : '!bg-[#f4f4f3] !text-[#26251e] !rounded-2xl !rounded-tl-sm'
                                                  )
                                          )}
                                        >
                                          <MessageBody content={msg.content} isMe={isMe} onImageClick={setLightboxSrc} />
                                        </BubbleContent>
                                      </Bubble>
                                    )}

                                    {isMe && !isEditingThis && !msg.id.startsWith('opt_') && (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button
                                            className="opacity-0 group-hover/msg:opacity-100 transition-opacity text-[#7a7a76] hover:text-[#26251e] shrink-0 p-1"
                                            aria-label="Options du message"
                                          >
                                            <MoreHorizontal className="w-3.5 h-3.5" />
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align={isMe ? 'end' : 'start'} className="w-36">
                                          {!msg.content.startsWith('[[') && (
                                            <DropdownMenuItem onClick={() => startEdit(msg)} className="gap-2 text-xs">
                                              <Pencil className="w-3.5 h-3.5" />
                                              Modifier
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuItem
                                            onClick={() => setDeleteTargetId(msg.id)}
                                            className="gap-2 text-xs text-red-600 focus:text-red-600"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Supprimer
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    )}
                                  </div>

                                  {!showSenderInfo && (
                                    <MessageFooter className="px-1 gap-1">
                                      <span className="text-[9px] text-[#7a7a76]">{formatTime(msg.createdAt)}</span>
                                      {msg.isEdited && <span className="text-[9px] text-[#7a7a76] italic">· modifié</span>}
                                    </MessageFooter>
                                  )}
                                  {showSenderInfo && msg.isEdited && (
                                    <span className={cn('text-[9px] text-[#7a7a76] italic px-1', isMe && 'self-end')}>modifié</span>
                                  )}
                                </UiMessageContent>
                              </Message>
                            </MessageScrollerItem>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </MessageScrollerContent>
                </MessageScrollerViewport>
                <MessageScrollerButton />
              </MessageScroller>
            </MessageScrollerProvider>
          )}
        </div>

        {/* Image preview */}
        {imagePreview && (
          <div className="px-4 py-2 border-t border-[#e5e5e0] bg-[#f4f4f3] flex items-center gap-3 shrink-0">
            <Attachment orientation="horizontal" className="flex-1 border-[#e5e5e0] bg-white">
              <AttachmentMedia variant="image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Aperçu" />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>Image prête à envoyer</AttachmentTitle>
                <AttachmentDescription>Cliquez sur Envoyer pour partager</AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                <AttachmentAction aria-label="Retirer l'image" onClick={() => setImagePreview(null)}>
                  <X className="w-4 h-4" />
                </AttachmentAction>
              </AttachmentActions>
            </Attachment>
            <Button
              onClick={handleSendImage}
              disabled={sending}
              size="sm"
              className="h-8 bg-[#059669] hover:bg-[#047857] text-white text-xs shrink-0"
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

            {/* Fichier arbitraire */}
            <input
              ref={attachmentInputRef}
              type="file"
              className="hidden"
              onChange={handleAttachmentSelect}
            />
            <button
              type="button"
              onClick={() => attachmentInputRef.current?.click()}
              disabled={uploadingFile}
              className="text-[#7a7a76] hover:text-[#26251e] transition-colors p-0.5 shrink-0 disabled:opacity-50"
              title="Joindre un fichier"
            >
              {uploadingFile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
            </button>

            {/* Message vocal */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={uploadingVoice}
              className={cn(
                'transition-colors p-0.5 shrink-0 disabled:opacity-50',
                isRecording ? 'text-red-500' : 'text-[#7a7a76] hover:text-[#26251e]'
              )}
              title={isRecording ? 'Arrêter l\'enregistrement' : 'Message vocal'}
            >
              {uploadingVoice ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isRecording ? (
                <span className="flex items-center gap-1">
                  <Square className="w-4 h-4 fill-current" />
                  <span className="text-[10px] font-bold tabular-nums">{Math.floor(recordingSeconds / 60)}:{String(recordingSeconds % 60).padStart(2, '0')}</span>
                </span>
              ) : (
                <Mic className="w-5 h-5" />
              )}
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

      {/* Fullscreen image lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in duration-150"
          onClick={() => setLightboxSrc(null)}
        >
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 h-9 w-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxSrc}
            alt="aperçu plein écran"
            onClick={e => e.stopPropagation()}
            className="max-w-full max-h-full rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(open) => { if (!open) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce message ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible — le message sera supprimé pour tous les membres de la conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
