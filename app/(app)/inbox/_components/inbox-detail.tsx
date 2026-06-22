'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Send, Sparkles, Loader2, Mail, ChevronDown,
  CheckCircle2, XCircle, Calendar, Briefcase,
  ClipboardList, ExternalLink, DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import type { ThreadMessage, InboxThread } from '@/lib/inbox-types';
import type { Lead } from '@/lib/mock-data';

type ReplyStatus = 'positive' | 'followup' | 'negative' | null;
type LeadStatus = Lead['status'];

const REPLY_STATUS_OPTIONS: { value: ReplyStatus; label: string; color: string }[] = [
  { value: 'positive', label: 'Réponse positive', color: 'bg-[#059669]/10 text-[#059669] border-[#059669]/20' },
  { value: 'followup', label: 'À relancer', color: 'bg-[#d97706]/10 text-[#d97706] border-[#d97706]/20' },
  { value: 'negative', label: 'Négatif', color: 'bg-[#dc2626]/10 text-[#dc2626] border-[#dc2626]/20' },
];

const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string; icon: React.ReactNode }[] = [
  { value: 'Contacted', label: 'Contacté', icon: <Mail className="h-3 w-3" /> },
  { value: 'Meeting Booked', label: 'RDV booké', icon: <Calendar className="h-3 w-3" /> },
  { value: 'Won', label: 'Gagné', icon: <CheckCircle2 className="h-3 w-3 text-[#059669]" /> },
  { value: 'Lost', label: 'Perdu', icon: <XCircle className="h-3 w-3 text-[#dc2626]" /> },
];

const QUICK_PRESETS = [
  { label: 'Proposer un créneau', text: 'Bonjour,\n\nMerci pour votre retour. Seriez-vous disponible pour un appel de 15 minutes cette semaine ou la suivante ? Je suis flexible et m\'adapterai à vos disponibilités.\n\nBien cordialement,' },
  { label: 'Demander plus de contexte', text: 'Bonjour,\n\nMerci de votre réponse. Pourriez-vous me donner plus de détails sur vos besoins actuels ? Cela me permettrait de vous proposer la solution la plus adaptée.\n\nBien cordialement,' },
  { label: 'Remercier et fermer', text: 'Bonjour,\n\nJe vous remercie pour votre réponse et comprends votre position. N\'hésitez pas à me recontacter si votre situation évolue.\n\nBien cordialement,' },
];

function tomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

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
  onLeadStatusChange: (status: LeadStatus) => void;
  onCreateDeal: (amount: number, probability: number, closingDate: string) => void;
  onCreateTask: (title: string, dueDate: string) => void;
  onLoadSuggestions: () => void;
  onBack?: () => void;
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
  onLeadStatusChange,
  onCreateDeal,
  onCreateTask,
  onLoadSuggestions,
  onBack,
}: InboxDetailProps) {
  // Deal dialog state
  const [dealOpen, setDealOpen] = useState(false);
  const [dealAmount, setDealAmount] = useState('');
  const [dealProbability, setDealProbability] = useState('50');
  const [dealDate, setDealDate] = useState(tomorrowDate());

  // Task dialog state
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDate, setTaskDate] = useState(tomorrowDate());

  const handleOpenDeal = () => {
    setDealAmount('');
    setDealProbability('50');
    setDealDate(tomorrowDate());
    setDealOpen(true);
  };

  const handleConfirmDeal = () => {
    const amount = parseFloat(dealAmount);
    if (!isNaN(amount) && amount > 0) {
      onCreateDeal(amount, parseInt(dealProbability) || 50, dealDate);
    }
    setDealOpen(false);
  };

  const handleOpenTask = () => {
    setTaskTitle(thread ? `Follow-up : ${thread.leadName}` : '');
    setTaskDate(tomorrowDate());
    setTaskOpen(true);
  };

  const handleConfirmTask = () => {
    if (taskTitle.trim()) {
      onCreateTask(taskTitle.trim(), taskDate);
    }
    setTaskOpen(false);
  };

  if (!thread) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-[#78716c]">
        <Mail className="h-10 w-10 opacity-20" />
        <p className="text-sm">Sélectionnez un fil de discussion</p>
      </div>
    );
  }

  const currentReplyStatus = REPLY_STATUS_OPTIONS.find(s => s.value === thread.replyStatus);
  const currentLeadStatus = LEAD_STATUS_OPTIONS.find(s => s.value === thread.leadStatus);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* ── Top bar ── */}
      <div className="flex items-center gap-3 border-b border-[#e5e5e0] px-5 py-3">
        {onBack && (
          <button onClick={onBack} className="md:hidden p-1 -ml-1 rounded-md hover:bg-[#e5e5e2] text-[#7a7a76] transition-colors shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-[#26251e] truncate">{thread.leadName}</p>
          <p className="text-xs text-[#78716c] truncate">{thread.contactEmail}</p>
        </div>

        {/* Reply status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1 shrink-0">
              {currentReplyStatus ? (
                <Badge className={`text-[10px] px-1.5 py-0 border ${currentReplyStatus.color}`}>
                  {currentReplyStatus.label}
                </Badge>
              ) : (
                <span className="text-[#78716c]">Réponse</span>
              )}
              <ChevronDown className="h-3 w-3 text-[#78716c]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {REPLY_STATUS_OPTIONS.map(opt => (
              <DropdownMenuItem key={opt.value} onClick={() => onReplyStatusChange(opt.value)} className="text-xs">
                {opt.label}
              </DropdownMenuItem>
            ))}
            {thread.replyStatus && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onReplyStatusChange(null)} className="text-xs text-[#78716c]">
                  Effacer le statut
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Voir le lead */}
        <Link href={`/leads/${thread.leadId}`} target="_blank">
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#78716c] hover:text-[#26251e]">
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* ── Actions rapides ── */}
      <div className="flex items-center gap-2 border-b border-[#e5e5e0] bg-[#fafaf8] px-5 py-2">
        <span className="text-[10px] font-semibold text-[#a8a29e] uppercase tracking-wider mr-1">Actions</span>

        {/* Lead status */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-6 text-[10px] gap-1 px-2 border-[#e5e5e0] bg-white">
              {currentLeadStatus ? (
                <span className="flex items-center gap-1">{currentLeadStatus.icon}{currentLeadStatus.label}</span>
              ) : (
                <span className="text-[#78716c]">Statut lead</span>
              )}
              <ChevronDown className="h-2.5 w-2.5 text-[#a8a29e]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40">
            {LEAD_STATUS_OPTIONS.map(opt => (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => onLeadStatusChange(opt.value)}
                className="text-xs gap-2"
              >
                {opt.icon}
                {opt.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Créer deal */}
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] gap-1 px-2 border-[#e5e5e0] bg-white"
          onClick={handleOpenDeal}
        >
          <DollarSign className="h-3 w-3 text-[#059669]" />
          Créer deal
        </Button>

        {/* Créer tâche */}
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] gap-1 px-2 border-[#e5e5e0] bg-white"
          onClick={handleOpenTask}
        >
          <ClipboardList className="h-3 w-3 text-[#d97706]" />
          Ajouter tâche
        </Button>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[#78716c]" />
          </div>
        ) : messages.length === 0 ? (
          <p className="text-center text-xs text-[#78716c] py-8">Aucun message à afficher</p>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.isFromUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[75%] rounded-xl px-4 py-3 text-xs ${
                  msg.isFromUser ? 'bg-[#059669]/10 text-[#26251e]' : 'bg-[#f4f4f3] text-[#26251e]'
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

      {/* ── Suggestions IA ── */}
      <div className="px-5 pt-3 pb-1">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#26251e]">
            <Sparkles className="h-3.5 w-3.5 text-[#059669]" />
            Suggestions IA
          </div>
          {suggestions.length === 0 && !suggestionsLoading && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] text-[#78716c]" onClick={onLoadSuggestions}>
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
                className="rounded-md border border-[#e5e5e0] bg-white px-2.5 py-1 text-[10px] text-[#26251e] hover:border-[#059669]/40 hover:bg-[#059669]/5 transition-colors text-left max-w-[280px] line-clamp-2"
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* ── Composer ── */}
      <div className="px-5 pb-4 pt-1 space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => onReplyTextChange(preset.text)}
              className="rounded-full border border-[#e5e5e0] bg-white px-2.5 py-0.5 text-[10px] text-[#26251e] hover:border-[#059669]/40 hover:bg-[#059669]/5 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
        <Textarea
          value={replyText}
          onChange={e => onReplyTextChange(e.target.value)}
          placeholder="Rédigez votre réponse…"
          className="min-h-[90px] text-xs resize-none border-[#e5e5e0] focus:border-[#059669] focus:ring-[#059669]/20"
        />
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={onSendReply}
            disabled={!replyText.trim() || sending}
            className="h-8 gap-1.5 bg-[#059669] hover:bg-[#e04500] text-white text-xs"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Envoyer
          </Button>
        </div>
      </div>

      {/* ── Deal dialog ── */}
      <Dialog open={dealOpen} onOpenChange={setDealOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Briefcase className="h-4 w-4 text-[#059669]" />
              Créer un deal — {thread.leadName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[10px] font-semibold text-[#78716c] uppercase tracking-wider block mb-1">Montant estimé (€)</label>
              <Input
                type="number"
                min="0"
                step="100"
                placeholder="ex: 2500"
                value={dealAmount}
                onChange={e => setDealAmount(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#78716c] uppercase tracking-wider block mb-1">Probabilité (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={dealProbability}
                onChange={e => setDealProbability(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#78716c] uppercase tracking-wider block mb-1">Date de clôture estimée</label>
              <Input
                type="date"
                value={dealDate}
                onChange={e => setDealDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setDealOpen(false)}>Annuler</Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-[#059669] hover:bg-[#047857] text-white"
              onClick={handleConfirmDeal}
              disabled={!dealAmount || parseFloat(dealAmount) <= 0}
            >
              <DollarSign className="h-3.5 w-3.5 mr-1" />
              Créer le deal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Task dialog ── */}
      <Dialog open={taskOpen} onOpenChange={setTaskOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <ClipboardList className="h-4 w-4 text-[#d97706]" />
              Ajouter une tâche de follow-up
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[10px] font-semibold text-[#78716c] uppercase tracking-wider block mb-1">Titre</label>
              <Input
                value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)}
                placeholder="ex: Rappeler Café du Centre"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-[#78716c] uppercase tracking-wider block mb-1">Date d'échéance</label>
              <Input
                type="date"
                value={taskDate}
                onChange={e => setTaskDate(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setTaskOpen(false)}>Annuler</Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-[#d97706] hover:bg-[#b45309] text-white"
              onClick={handleConfirmTask}
              disabled={!taskTitle.trim()}
            >
              <ClipboardList className="h-3.5 w-3.5 mr-1" />
              Ajouter la tâche
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
