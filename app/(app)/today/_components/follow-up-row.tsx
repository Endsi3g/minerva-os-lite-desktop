'use client';

import React, { useState } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Check, Clock, Mail, Loader2, Copy, CheckCheck } from 'lucide-react';
import { Lead } from '@/lib/mock-data';
import { useReach } from '@/lib/reach-context';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { getApiUrl } from '@/lib/api-helper';

interface FollowUpRowProps {
  lead: Lead;
}

export function FollowUpRow({ lead }: FollowUpRowProps) {
  const { updateLead, addNoteToLead } = useReach();
  const [draftOpen, setDraftOpen] = useState(false);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [draftText, setDraftText] = useState('');
  const [copied, setCopied] = useState(false);

  const getChannel = (lead: Lead) => {
    const text = (lead.nextAction + ' ' + lead.source).toLowerCase();
    if (text.includes('email') || text.includes('mail')) return { label: 'Email', variant: 'indigo' as const };
    if (text.includes('dm') || text.includes('instagram') || text.includes('linkedin') || text.includes('message')) return { label: 'DM', variant: 'purple' as const };
    if (text.includes('appel') || text.includes('téléphone') || text.includes('call') || text.includes('tél')) return { label: 'Call', variant: 'sky' as const };
    return { label: 'Visite', variant: 'neutral' as const };
  };

  const channel = getChannel(lead);

  const handleDone = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    addNoteToLead(lead.id, `Relance effectuée : "${lead.nextAction}"`, 'general');
    updateLead(lead.id, {
      nextAction: 'Relance programmée suite au dernier contact',
      nextActionDate: tomorrow.toISOString().split('T')[0],
      status: lead.status === 'New' ? 'Contacted' : lead.status,
    });
  };

  const handleSnooze = () => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + 3);
    updateLead(lead.id, { nextActionDate: nextDate.toISOString().split('T')[0] });
  };

  const handleQuickDraft = async () => {
    setDraftText('');
    setDraftOpen(true);
    setLoadingDraft(true);
    try {
      const res = await fetch(getApiUrl('/api/generate-draft'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, channel: channel.label, tone: 'Direct' }),
      });
      if (res.ok) {
        const data = await res.json();
        setDraftText(data.draft || '');
      } else {
        setDraftText('Erreur lors de la génération. Veuillez réessayer.');
      }
    } catch {
      setDraftText('Erreur réseau. Veuillez réessayer.');
    } finally {
      setLoadingDraft(false);
    }
  };

  const handleCopy = () => {
    if (!draftText) return;
    navigator.clipboard.writeText(draftText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <TableRow className="hover:bg-[#f4f4f3]/80 transition-colors">
        {/* Lead info */}
        <TableCell className="py-3.5 font-medium">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-[#26251e]">{lead.businessName}</span>
            <span className="text-[10px] text-[#7a7a76]">
              {lead.contactName || 'Sans contact'} • {lead.city}
            </span>
          </div>
        </TableCell>

        {/* Channel */}
        <TableCell className="py-3.5">
          <Badge
            variant="secondary"
            className={cn(
              'text-[9px] font-semibold tracking-wider uppercase px-2 py-0.5',
              channel.variant === 'indigo' && 'bg-indigo-50 text-indigo-700 border border-indigo-200',
              channel.variant === 'purple' && 'bg-purple-50 text-purple-700 border border-purple-200',
              channel.variant === 'sky' && 'bg-sky-50 text-sky-700 border border-sky-200',
              channel.variant === 'neutral' && 'bg-neutral-50 text-neutral-700 border border-neutral-200',
            )}
          >
            {channel.label}
          </Badge>
        </TableCell>

        {/* Last contact */}
        <TableCell className="py-3.5 text-xs text-[#7a7a76] max-w-[150px] truncate">
          {lead.notes && lead.notes.length > 0
            ? lead.notes[lead.notes.length - 1].content
            : 'Aucun contact historique'}
        </TableCell>

        {/* Next action */}
        <TableCell className="py-3.5 text-xs">
          <div className="flex flex-col gap-0.5 max-w-[200px]">
            <span className="font-medium text-[#26251e] truncate">{lead.nextAction}</span>
            <span className="text-[10px] text-destructive font-medium">Aujourd&apos;hui</span>
          </div>
        </TableCell>

        {/* Actions */}
        <TableCell className="py-3.5 text-right">
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-[#059669] hover:text-[#059669] hover:bg-[#059669]/10"
                  onClick={handleQuickDraft}
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Générer un brouillon de relance</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  onClick={handleDone}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Fait (Relance effectuée)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  onClick={handleSnooze}
                >
                  <Clock className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Reporter de 3 jours (Snooze)</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TableCell>
      </TableRow>

      {/* Quick draft sheet */}
      <Sheet open={draftOpen} onOpenChange={setDraftOpen}>
        <SheetContent className="w-[420px] sm:w-[500px] flex flex-col gap-0">
          <SheetHeader className="pb-4 border-b border-[#e5e5e0]">
            <SheetTitle className="text-base font-semibold">Brouillon de relance</SheetTitle>
            <SheetDescription className="text-xs">
              {lead.businessName} — {lead.nextAction}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 py-4 flex flex-col gap-3">
            {loadingDraft ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-[#7a7a76]">
                <Loader2 className="h-6 w-6 animate-spin text-[#059669]" />
                <span className="text-xs">Génération en cours…</span>
              </div>
            ) : (
              <>
                <Textarea
                  value={draftText}
                  onChange={e => setDraftText(e.target.value)}
                  className="flex-1 min-h-[320px] text-xs font-mono resize-none leading-relaxed"
                  placeholder="Le brouillon apparaîtra ici…"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="self-end gap-1.5"
                  onClick={handleCopy}
                  disabled={!draftText}
                >
                  {copied ? (
                    <><CheckCheck className="h-3.5 w-3.5 text-emerald-600" /><span>Copié !</span></>
                  ) : (
                    <><Copy className="h-3.5 w-3.5" /><span>Copier</span></>
                  )}
                </Button>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
export default FollowUpRow;
