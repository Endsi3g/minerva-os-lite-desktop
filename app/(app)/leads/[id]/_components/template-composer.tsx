'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';
import { useReach } from '@/lib/reach-context';
import type { Lead } from '@/lib/mock-data';
import {
  Mail, Sparkles, Send, Copy, Check, Loader2, ChevronDown,
  FileText, X, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  tags: string[];
}

interface TemplateComposerProps {
  lead: Lead;
}

const GMAIL_MODIFY_SCOPE = 'https://www.googleapis.com/auth/gmail.modify';

function substitute(text: string, lead: Lead, firstName: string, signature: string): string {
  return text
    .replace(/\{\{prenom\}\}/g, firstName)
    .replace(/\{\{entreprise\}\}/g, lead.businessName || '')
    .replace(/\{\{ville\}\}/g, lead.city || '')
    .replace(/\{\{secteur\}\}/g, lead.niche || '')
    .replace(/\{\{signature\}\}/g, signature);
}

export function TemplateComposer({ lead }: TemplateComposerProps) {
  const { activeWorkspace, addNotification, user } = useReach();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [composedSubject, setComposedSubject] = useState('');
  const [composedBody, setComposedBody] = useState('');

  const [aiLoading, setAiLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [sendError, setSendError] = useState('');
  const [copied, setCopied] = useState(false);

  const [userFirstName, setUserFirstName] = useState('');
  const [userSignature, setUserSignature] = useState('');

  // Fetch user settings for variable substitution
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('settings')
      .select('full_name, email_signature')
      .maybeSingle()
      .then(({ data }: { data: { full_name?: string | null; email_signature?: string | null } | null }) => {
        setUserFirstName(data?.full_name?.split(' ')[0] || '');
        setUserSignature(data?.email_signature || data?.full_name || '');
      });
  }, []);

  const fetchTemplates = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingTemplates(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('email_templates')
      .select('id, name, subject, body, tags')
      .eq('workspace_id', activeWorkspace.id)
      .order('created_at', { ascending: false });
    setTemplates((data || []) as EmailTemplate[]);
    setLoadingTemplates(false);
  }, [activeWorkspace]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const applyTemplate = (tpl: EmailTemplate) => {
    setSelectedTemplate(tpl);
    const firstName = lead.contactName?.split(' ')[0] || lead.businessName || '';
    setComposedSubject(substitute(tpl.subject, lead, firstName, userSignature));
    setComposedBody(substitute(tpl.body, lead, firstName, userSignature));
    setSendStatus('idle');
    setSendError('');
    setPickerOpen(false);
  };

  const handleAIPersonalize = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const baseInstruction = selectedTemplate
        ? `Personnalise ce template email pour ${lead.businessName} en gardant la structure mais en ajoutant des détails ultra-spécifiques au business (avis Google, site web, secteur). Template de départ :\n\nSujet : ${selectedTemplate.subject}\n\n${selectedTemplate.body}`
        : `Génère un email de prospection personnalisé pour ${lead.businessName}`;

      const res = await fetch(getApiUrl('/api/generate-draft'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          channel: 'Email',
          instructions: baseInstruction,
        }),
      });
      const data = await res.json();
      if (res.ok && data.content) {
        setComposedBody(data.content);
        if (!composedSubject) {
          const firstName = lead.contactName?.split(' ')[0] || lead.businessName || '';
          setComposedSubject(`${firstName}, j'ai analysé ${lead.businessName}`);
        }
        toast.success('Message personnalisé par l\'IA');
      } else {
        toast.error(data.error || 'Erreur IA');
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`Sujet : ${composedSubject}\n\n${composedBody}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSend = async () => {
    if (!composedBody.trim() || sending) return;
    if (!lead.contactEmail) {
      toast.error('Aucun email de contact pour ce lead');
      return;
    }
    setSending(true);
    setSendStatus('idle');
    setSendError('');
    try {
      const res = await fetch(getApiUrl('/api/send-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          subject: composedSubject || `Prospection — ${lead.businessName}`,
          body: composedBody,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSendStatus('ok');
        toast.success(`Email envoyé à ${lead.contactEmail}`, {
          description: `Sujet : ${composedSubject || 'Sans objet'}`,
          duration: 5000,
        });
        if (data.contactCreated) {
          toast.success(`Contact ajouté : ${lead.contactEmail}`, {
            description: 'Le prospect a été automatiquement ajouté à vos contacts.',
            duration: 4000,
          });
        }
        // Native Electron notification
        if ((window as any).electron?.sendNotification) {
          (window as any).electron.sendNotification(
            'Email envoyé',
            `À : ${lead.contactEmail} — Sujet : ${composedSubject || 'Sans objet'}`
          );
        }
        // In-app notification
        if (user && activeWorkspace) {
          addNotification({
            userId: user.id,
            workspaceId: activeWorkspace.id,
            type: 'email_sent',
            title: `Email envoyé à ${lead.businessName || lead.contactEmail}`,
            body: `Sujet : ${composedSubject || 'Sans objet'}`,
            link: `/leads/${lead.id}`,
          });
        }
        // Increment template send count
        if (selectedTemplate) {
          const supabase = createClient();
          const { data: tpl } = await supabase
            .from('email_templates')
            .select('sends')
            .eq('id', selectedTemplate.id)
            .single();
          if (tpl) {
            await supabase.from('email_templates').update({ sends: (tpl.sends || 0) + 1 }).eq('id', selectedTemplate.id);
          }
        }
      } else {
        setSendStatus('error');
        setSendError(data.error || 'Erreur d\'envoi');
      }
    } finally {
      setSending(false);
    }
  };

  const hasEmail = !!lead.contactEmail;

  return (
    <div className="border border-[#e5e5e0] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#fafaf8] border-b border-[#e5e5e0]">
        <Mail className="h-3.5 w-3.5 text-[#167f5b]" />
        <span className="text-xs font-bold text-[#14171A] flex-1">Composer un email</span>
        {lead.contactEmail && (
          <span className="text-[10px] text-[#8A9098] truncate max-w-[180px]">→ {lead.contactEmail}</span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {/* Template picker */}
        <div className="relative">
          <button
            onClick={() => setPickerOpen(p => !p)}
            className="w-full flex items-center gap-2 h-8 px-3 border border-[#e5e5e0] rounded-lg text-xs text-[#8A9098] hover:border-[#167f5b]/40 hover:text-[#14171A] transition-colors bg-white"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1 text-left truncate">
              {selectedTemplate ? selectedTemplate.name : 'Choisir un template…'}
            </span>
            {selectedTemplate && (
              <button
                onClick={e => { e.stopPropagation(); setSelectedTemplate(null); setComposedSubject(''); setComposedBody(''); setSendStatus('idle'); }}
                className="shrink-0 p-0.5 rounded hover:bg-[#f4f4f3]"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', pickerOpen && 'rotate-180')} />
          </button>

          {pickerOpen && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1 border border-[#e5e5e0] rounded-xl bg-white shadow-lg max-h-64 overflow-y-auto">
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-[#8A9098]" />
                </div>
              ) : templates.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <p className="text-xs text-[#8A9098]">Aucun template</p>
                  <a href="/settings/email-templates" className="text-[11px] text-[#167f5b] font-bold hover:underline flex items-center gap-1 justify-center">
                    Créer un template <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              ) : (
                <>
                  {templates.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => applyTemplate(tpl)}
                      className={cn(
                        'w-full text-left px-4 py-2.5 hover:bg-[#f4f4f3] transition-colors border-b border-[#f4f4f3] last:border-0',
                        selectedTemplate?.id === tpl.id && 'bg-[#167f5b]/5'
                      )}
                    >
                      <p className="text-xs font-semibold text-[#14171A] truncate">{tpl.name}</p>
                      <p className="text-[10px] text-[#8A9098] truncate mt-0.5">Sujet : {tpl.subject}</p>
                      {tpl.tags?.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {tpl.tags.slice(0, 3).map(tag => (
                            <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#e5e5e0] bg-[#f4f4f3] text-[#8A9098]">{tag}</span>
                          ))}
                        </div>
                      )}
                    </button>
                  ))}
                  <a
                    href="/settings/email-templates"
                    className="flex items-center gap-1.5 px-4 py-2.5 text-[11px] text-[#167f5b] font-bold hover:bg-[#167f5b]/5 transition-colors border-t border-[#e5e5e0]"
                  >
                    <FileText className="h-3 w-3" />
                    Gérer les templates
                  </a>
                </>
              )}
            </div>
          )}
        </div>

        {/* Subject */}
        <Input
          value={composedSubject}
          onChange={e => setComposedSubject(e.target.value)}
          placeholder="Objet de l'email…"
          className="h-8 text-xs border-[#e5e5e0] focus:border-[#167f5b] focus:ring-[#167f5b]/20"
        />

        {/* Body */}
        <Textarea
          value={composedBody}
          onChange={e => setComposedBody(e.target.value)}
          placeholder={
            selectedTemplate
              ? 'Message avec variables substituées…'
              : 'Rédigez votre message ou choisissez un template ci-dessus…'
          }
          rows={6}
          className="text-xs resize-none border-[#e5e5e0] focus:border-[#167f5b] focus:ring-[#167f5b]/20"
        />

        {/* Variable tokens hint */}
        {composedBody.includes('{{') && (
          <p className="text-[10px] text-amber-600 font-medium">
            ⚠ Variables non substituées détectées — vérifiez le message avant envoi.
          </p>
        )}

        {/* Send status */}
        {sendStatus === 'ok' && (
          <div className="flex items-center gap-2.5 rounded-lg bg-[#167f5b]/10 border border-[#167f5b]/20 px-3 py-2">
            <Check className="h-4 w-4 text-[#167f5b] shrink-0" />
            <div>
              <p className="text-xs font-bold text-[#167f5b]">Email envoyé avec succès</p>
              <p className="text-[10px] text-[#167f5b]/70">À : {lead.contactEmail} · Sujet : {composedSubject || 'Sans objet'}</p>
            </div>
          </div>
        )}
        {sendStatus === 'error' && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2">
            <p className="text-[10px] text-red-600 font-medium">{sendError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          {/* AI personalize */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleAIPersonalize}
            disabled={aiLoading}
            className="h-7 text-[10px] gap-1 border-[#167f5b]/30 text-[#167f5b] hover:bg-[#167f5b]/5"
          >
            {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {selectedTemplate ? 'Personnaliser IA' : 'Générer IA'}
          </Button>

          {/* Copy */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            disabled={!composedBody.trim()}
            className="h-7 text-[10px] gap-1 border-[#e5e5e0]"
          >
            {copied ? <Check className="h-3 w-3 text-[#167f5b]" /> : <Copy className="h-3 w-3" />}
            Copier
          </Button>

          <div className="flex-1" />

          {/* Send */}
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!composedBody.trim() || sending || !hasEmail || sendStatus === 'ok'}
            className="h-7 text-[10px] gap-1 bg-[#167f5b] hover:bg-[#0f6b4c] text-white"
            title={!hasEmail ? 'Aucun email de contact' : undefined}
          >
            {sending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
            {sendStatus === 'ok' ? 'Envoyé' : 'Envoyer'}
          </Button>
        </div>

        {!hasEmail && (
          <p className="text-[10px] text-[#a8a29e]">
            Ajoutez un email de contact pour pouvoir envoyer directement.
          </p>
        )}
      </div>
    </div>
  );
}
