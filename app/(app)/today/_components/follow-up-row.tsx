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
      <TableRow className="hover:bg-accent/40 transition-colors border-b border-border/60">
        {/* Lead info */}
        <TableCell className="py-2.5 font-medium">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-semibold text-foreground truncate max-w-[140px]">{lead.businessName}</span>
            <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
              {lead.contactName || 'Sans contact'} • {lead.city}
            </span>
          </div>
        </TableCell>

        {/* Channel */}
        <TableCell className="py-2.5">
          <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-muted text-muted-foreground inline-block border border-border">
            {channel.label}
          </span>
        </TableCell>

        {/* Last contact */}
        <TableCell className="py-2.5 text-xs text-muted-foreground max-w-[120px] truncate">
          {lead.notes && lead.notes.length > 0
            ? lead.notes[lead.notes.length - 1].content
            : 'Aucun contact'}
        </TableCell>

        {/* Next action */}
        <TableCell className="py-2.5 text-xs">
          <div className="flex flex-col gap-0.5 max-w-[160px]">
            <span className="font-medium text-foreground truncate">{lead.nextAction}</span>
            <span className="text-[10px] text-destructive font-medium">Aujourd'hui</span>
          </div>
        </TableCell>

        {/* Actions */}
        <TableCell className="py-2.5 text-right pr-3">
          <div className="flex items-center justify-end gap-1">
            <button
              onClick={handleQuickDraft}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-emerald-500/10 text-brand-accent-emerald border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <Mail className="h-3 w-3" />
              <span className="hidden sm:inline">Rédiger</span>
            </button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 cursor-pointer"
                  onClick={handleDone}
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Marquer comme fait</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 cursor-pointer"
                  onClick={handleSnooze}
                >
                  <Clock className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Reporter de 3 jours</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TableCell>
      </TableRow>

      {/* Quick draft sheet */}
      <Sheet open={draftOpen} onOpenChange={setDraftOpen}>
        <SheetContent className="w-full max-w-[420px] sm:max-w-[500px] flex flex-col gap-0 bg-card text-card-foreground border-border">
          <SheetHeader className="pb-3 border-b border-border">
            <SheetTitle className="text-base font-semibold text-foreground">Brouillon de relance</SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {lead.businessName} — {lead.nextAction}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 py-4 flex flex-col gap-3">
            {loadingDraft ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin text-brand-accent-emerald" />
                <span className="text-xs">Génération IA en cours…</span>
              </div>
            ) : (
              <>
                <Textarea
                  value={draftText}
                  onChange={e => setDraftText(e.target.value)}
                  className="flex-1 min-h-[300px] text-xs font-mono resize-none leading-relaxed bg-background border-input text-foreground"
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
                    <><CheckCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /><span>Copié !</span></>
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
