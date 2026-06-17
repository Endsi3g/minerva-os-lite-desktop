'use client';

import { useState } from 'react';
import { Send, Sparkles, Loader2, Mail, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ThreadMessage } from '@/app/api/inbox/thread/[threadId]/route';
import type { InboxThread } from '@/app/api/inbox/threads/route';

type ReplyStatus = 'positive' | 'followup' | 'negative' | null;

const STATUS_OPTIONS: { value: ReplyStatus; label: string; color: string }[] = [
  { value: 'positive', label: 'Réponse positive', color: 'bg-[#059669]/10 text-[#059669] border-[#059669]/20' },
  { value: 'followup', label: 'À relancer', color: 'bg-[#d97706]/10 text-[#d97706] border-[#d97706]/20' },
  { value: 'negative', label: 'Négatif', color: 'bg-[#dc2626]/10 text-[#dc2626] border-[#dc2626]/20' },
];

const QUICK_PRESETS = [
  { label: 'Proposer un créneau', text: 'Bonjour,\n\nMerci pour votre retour. Seriez-vous disponible pour un appel de 15 minutes cette semaine ou la suivante ? Je suis flexible et m\'adapterai à vos disponibilités.\n\nBien cordialement,' },
  { label: 'Demander plus de contexte', text: 'Bonjour,\n\nMerci de votre réponse. Pourriez-vous me donner plus de détails sur vos besoins actuels ? Cela me permettrait de vous proposer la solution la plus adaptée.\n\nBien cordialement,' },
  { label: 'Remercier et fermer', text: 'Bonjour,\n\nJe vous remercie pour votre réponse et comprends votre position. N\'hésitez pas à me recontacter si votre situation évolue.\n\nBien cordialement,' },
];

interface InboxDetailProps {
  thread: InboxThread | null;
  messages: ThreadMessage[];
  loading: boolean;
  suggestions: string[];
  suggestionsLoading: boolean;
  replyText: string;
  sending: boolean;
  onReplyTextChange: (text: string) => void;
  onSendReply: () => void;
  onReplyStatusChange: (status: ReplyStatus) => void;
  onLoadSuggestions: () => void;
}

export function InboxDetail({
  thread,
  messages,
  loading,
  suggestions,
  suggestionsLoading,
  replyText,
  sending,
  onReplyTextChange,
  onSendReply,
  onReplyStatusChange,
  onLoadSuggestions,
}: InboxDetailProps) {
  if (!thread) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[#78716c]">
        <Mail className="h-10 w-10 opacity-20" />
        <p className="text-sm">Sélectionnez un fil de discussion</p>
      </div>
    );
  }

  const currentStatus = STATUS_OPTIONS.find(s => s.value === thread.replyStatus);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b border-[#e5e5e0] px-5 py-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-[#26251e] truncate">{thread.leadName}</p>
          <p className="text-xs text-[#78716c] truncate">{thread.contactEmail}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
              {currentStatus ? (
                <Badge className={`text-[10px] px-1.5 py-0 border ${currentStatus.color}`}>
                  {currentStatus.label}
                </Badge>
              ) : (
                'Statut'
              )}
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {STATUS_OPTIONS.map(opt => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => onReplyStatusChange(opt.value)}
                className="text-xs"
              >
                {opt.label}
              </DropdownMenuItem>
            ))}
            {thread.replyStatus && (
              <DropdownMenuItem onClick={() => onReplyStatusChange(null)} className="text-xs text-[#78716c]">
                Effacer le statut
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[#78716c]" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-[#78716c] py-8">Aucun message à afficher</p>
        ) : (
          messages.map(msg => (
            <div
              key={msg.id}
              className={`flex ${msg.isFromUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 text-xs ${
                  msg.isFromUser
                    ? 'bg-[#f54e00]/10 text-[#26251e]'
                    : 'bg-[#f4f4f3] text-[#26251e]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="font-semibold truncate max-w-[180px]">{msg.from}</span>
                  <span className="text-[10px] text-[#78716c] shrink-0">{msg.date}</span>
                </div>
                <pre className="whitespace-pre-wrap font-sans leading-relaxed">{msg.body || '(aucun contenu)'}</pre>
              </div>
            </div>
          ))
        )}
      </div>

      <Separator />

      {/* AI Suggestions */}
      <div className="px-5 pt-3 pb-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#26251e]">
            <Sparkles className="h-3.5 w-3.5 text-[#f54e00]" />
            Suggestions IA
          </div>
          {suggestions.length === 0 && !suggestionsLoading && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-[#78716c]"
              onClick={onLoadSuggestions}
            >
              Générer
            </Button>
          )}
        </div>

        {suggestionsLoading ? (
          <div className="flex items-center gap-1.5 text-xs text-[#78716c] py-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Génération en cours…
          </div>
        ) : suggestions.length > 0 ? (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => onReplyTextChange(s)}
                className="rounded-md border border-[#e5e5e0] bg-white px-2.5 py-1 text-[10px] text-[#26251e] hover:border-[#f54e00]/40 hover:bg-[#f54e00]/5 transition-colors text-left max-w-[280px] line-clamp-2"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Composer */}
      <div className="px-5 pb-4 pt-1 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => onReplyTextChange(preset.text)}
              className="rounded-full border border-[#e5e5e0] bg-white px-2.5 py-0.5 text-[10px] text-[#26251e] hover:border-[#f54e00]/40 hover:bg-[#f54e00]/5 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <Textarea
          value={replyText}
          onChange={e => onReplyTextChange(e.target.value)}
          placeholder="Rédigez votre réponse…"
          className="min-h-[90px] text-xs resize-none border-[#e5e5e0] focus:border-[#f54e00] focus:ring-[#f54e00]/20"
        />

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={onSendReply}
            disabled={!replyText.trim() || sending}
            className="h-8 gap-1.5 bg-[#f54e00] hover:bg-[#e04500] text-white text-xs"
          >
            {sending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            Envoyer
          </Button>
        </div>
      </div>
    </div>
  );
}
