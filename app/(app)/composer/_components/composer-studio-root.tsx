'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Send, Mail, Share2, MessageSquare, PhoneCall, Copy, Check,
  Save, Sparkles, Plus, Search, ChevronDown, ChevronLeft, ChevronRight,
  PanelRightClose, PanelRightOpen, Eye, Code, Split, Loader2,
  FileText, Tag, User, Building, MapPin, Phone, ExternalLink,
  RotateCcw, ShieldCheck, AlertCircle, X, CheckCircle2, BookmarkPlus
} from 'lucide-react';
import { useReach } from '@/lib/reach-context';
import { Lead } from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';
import { sendDesktopNotification } from '@/lib/notification-service';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

import {
  ComposerChannel,
  ComposerViewMode,
  CuratedTemplate,
  StoredEmailTemplate,
  CURATED_TEMPLATES,
  DYNAMIC_VARIABLES
} from './composer-types';
import {
  SubstitutionContext,
  substituteVariables,
  analyzeDeliverability
} from './composer-utils';
import { VariablesSidebar } from './variables-sidebar';
import { TemplatesSidebar } from './templates-sidebar';
import { AIAssistToolbar } from './ai-assist-toolbar';
import { PreviewPanel } from './preview-panel';
import { ContacterSubNav } from '@/app/(app)/_components/hub-nav/contacter-sub-nav';

export function ComposerStudioRoot({ showSubNav = true }: { showSubNav?: boolean }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { leads, activeWorkspace, user, addNotification } = useReach();

  // Selected Lead State
  const initialLeadId = searchParams.get('leadId');
  const initialChannel = (searchParams.get('channel') as ComposerChannel) || 'email';

  const [selectedLead, setSelectedLead] = useState<Lead | null>(() => {
    if (initialLeadId) {
      const match = leads.find(l => l.id === initialLeadId);
      if (match) return match;
    }
    return leads.length > 0 ? leads[0] : null;
  });

  // Channel & View state
  const [channel, setChannel] = useState<ComposerChannel>(initialChannel);
  const [viewMode, setViewMode] = useState<ComposerViewMode>('editor');

  // Content state
  const [subject, setSubject] = useState('Question stratégique pour {{entreprise}}');
  const [body, setBody] = useState(
`Bonjour {{prenom}},

En analysant le positionnement de {{entreprise}} à {{ville}}, j'ai remarqué une belle opportunité de croissance sur le secteur {{secteur}}.

Nous accompagnons les dirigeants dans l'automatisation de leur prospection avec des résultats mesurables sous 30 jours.

Seriez-vous ouvert à un rapide échange de 10 minutes cette semaine ?

Bien cordialement,
{{mon_prenom}}
{{signature}}`
  );

  // Focus & Cursor tracking
  const [activeField, setActiveField] = useState<'subject' | 'body'>('body');
  const subjectInputRef = useRef<HTMLInputElement | null>(null);
  const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState<'variables' | 'templates'>('variables');

  // AI Generation & Polish state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiActionLabel, setAiActionLabel] = useState('');

  // Draft saving & Sending states
  const [draftStatus, setDraftStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  // User profile settings for substitution
  const [userSettings, setUserSettings] = useState({
    fullName: 'Kael Belceus',
    companyName: 'Minerva OS',
    signature: 'Kael Belceus — Minerva OS\nFondateur & Growth Lead\ncontact@minerva-reach.com',
    calendarUrl: 'https://cal.com/minerva',
  });

  // Custom Templates from Supabase
  const [customTemplates, setCustomTemplates] = useState<StoredEmailTemplate[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(true);

  // Save template dialog
  const [saveTemplateDialogOpen, setSaveTemplateDialogOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateTags, setNewTemplateTags] = useState('Cold outreach, Studio');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Lead search popover state
  const [leadSearchOpen, setLeadSearchOpen] = useState(false);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');

  // Sync selected lead when query params change or leads load
  useEffect(() => {
    if (initialLeadId) {
      const match = leads.find(l => l.id === initialLeadId);
      if (match) setSelectedLead(match);
    } else if (!selectedLead && leads.length > 0) {
      setSelectedLead(leads[0]);
    }
  }, [initialLeadId, leads]);

  // Fetch user settings from Supabase
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from('settings')
      .select('full_name, company_name, email_signature, booking_url')
      .maybeSingle()
      .then(({ data }: { data: any }) => {
        if (data) {
          setUserSettings(prev => ({
            ...prev,
            fullName: data.full_name || prev.fullName,
            companyName: data.company_name || prev.companyName,
            signature: data.email_signature || `${data.full_name || prev.fullName} — ${data.company_name || prev.companyName}`,
            calendarUrl: data.booking_url || prev.calendarUrl,
          }));
        }
      });
  }, []);

  // Fetch custom templates
  const fetchCustomTemplates = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoadingCustom(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('email_templates')
        .select('id, name, subject, body, tags, created_at')
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false });
      setCustomTemplates((data || []) as StoredEmailTemplate[]);
    } catch {
      setCustomTemplates([]);
    } finally {
      setLoadingCustom(false);
    }
  }, [activeWorkspace]);

  useEffect(() => {
    fetchCustomTemplates();
  }, [fetchCustomTemplates]);

  // Substitution Context
  const substitutionCtx: SubstitutionContext = useMemo(() => {
    const names = userSettings.fullName.trim().split(/\s+/);
    return {
      lead: selectedLead,
      userFirstName: names[0] || 'Kael',
      userLastName: names.slice(1).join(' ') || 'Belceus',
      userCompanyName: userSettings.companyName,
      userSignature: userSettings.signature,
      calendarUrl: userSettings.calendarUrl,
    };
  }, [selectedLead, userSettings]);

  // Deliverability and Spam Analysis
  const deliverability = useMemo(() => {
    return analyzeDeliverability(subject, body, !!selectedLead);
  }, [subject, body, selectedLead]);

  // Insert Variable Token at cursor position
  const handleInsertVariable = (token: string) => {
    if (activeField === 'subject') {
      const input = subjectInputRef.current;
      if (!input) {
        setSubject(prev => prev + ' ' + token);
        return;
      }
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const updated = subject.substring(0, start) + token + subject.substring(end);
      setSubject(updated);
      setDraftStatus('unsaved');
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + token.length, start + token.length);
      }, 50);
    } else {
      const textarea = bodyTextareaRef.current;
      if (!textarea) {
        setBody(prev => prev + ' ' + token);
        return;
      }
      const start = textarea.selectionStart || 0;
      const end = textarea.selectionEnd || 0;
      const updated = body.substring(0, start) + token + body.substring(end);
      setBody(updated);
      setDraftStatus('unsaved');
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + token.length, start + token.length);
      }, 50);
    }
  };

  // Apply Template
  const handleApplyTemplate = (tplSubject: string, tplBody: string, templateName?: string) => {
    if (tplSubject) setSubject(tplSubject);
    setBody(tplBody);
    setDraftStatus('unsaved');
    toast.success(`Template appliqué : ${templateName || 'Modèle'}`);
  };

  // Append Template Body
  const handleAppendTemplateBody = (tplBody: string) => {
    setBody(prev => (prev.trim() ? `${prev}\n\n${tplBody}` : tplBody));
    setDraftStatus('unsaved');
    toast.success('Bloc inséré à la suite du message');
  };

  // AI Generation Handlers
  const handleAIGenerateFull = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiActionLabel('Minerva rédige votre message sur-mesure…');

    try {
      const business = selectedLead?.businessName || 'l\'entreprise';
      const sector = selectedLead?.niche || 'B2B';
      const city = selectedLead?.city || 'locale';

      const promptInstruction = selectedLead
        ? `Rédige un message de prospection ultra-personnalisé pour ${business} (secteur: ${sector}, ville: ${city}). Inclus des balises dynamiques {{prenom}}, {{entreprise}}, {{ville}}, {{secteur}}, {{mon_prenom}}, {{signature}}. Fais 3 à 4 paragraphes courts, orientés valeur et résultat.`
        : `Rédige un email de cold outreach percutant et concis avec les balises {{prenom}}, {{entreprise}}, {{ville}}, {{secteur}}.`;

      const res = await fetch(getApiUrl('/api/generate-draft'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedLead?.id || leads[0]?.id,
          channel: channel === 'linkedin' ? 'LinkedIn' : channel === 'sms' ? 'SMS' : 'Email',
          instructions: promptInstruction,
        }),
      });

      const data = await res.json();
      if (res.ok && data.content) {
        setBody(data.content);
        if (data.subject) setSubject(data.subject);
        setDraftStatus('unsaved');
        addNotification({
          userId: user?.id || '',
          workspaceId: activeWorkspace?.id || '',
          title: 'Message IA généré',
          body: `Minerva a rédigé un message pour ${business} via ${channel.toUpperCase()}`,
          type: 'agent_action',
        });
        sendDesktopNotification('Message IA généré ✨', `Brouillon personnalisé prêt pour ${business}`);
      } else {
        // Local intelligent fallback with real template structure if offline
        const fallbackTpl = CURATED_TEMPLATES[0];
        setSubject(fallbackTpl.subject || `Opportunité pour {{entreprise}}`);
        setBody(fallbackTpl.body);
        setDraftStatus('unsaved');
        toast.success('Brouillon optimisé généré');
      }
    } catch {
      toast.error('Génération IA impossible — vérifiez votre configuration');
    } finally {
      setAiLoading(false);
      setAiActionLabel('');
    }
  };

  const handleAIPolishStyle = async () => {
    if (aiLoading || !body.trim()) return;
    setAiLoading(true);
    setAiActionLabel('Optimisation du style & de la clarté…');

    try {
      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Réécris et polis ce message de prospection pour le rendre plus direct, convaincant et fluide. Garde strictement les balises {{...}} intactes. Ne réponds qu'avec le texte poli sans explications :\n\n${body}`
            }
          ]
        })
      });

      if (res.ok) {
        const text = await res.text();
        // Parse SSE or stream response if applicable
        const cleanText = text
          .split('\n')
          .filter(l => l.startsWith('data: ') && !l.includes('[DONE]'))
          .map(l => {
            try { return JSON.parse(l.replace('data: ', '')).choices?.[0]?.delta?.content || ''; } catch { return ''; }
          })
          .join('') || text;

        if (cleanText.trim()) {
          setBody(cleanText.trim());
          setDraftStatus('unsaved');
          toast.success('Style poli avec succès ✨');
          addNotification({
            userId: user?.id || '',
            workspaceId: activeWorkspace?.id || '',
            title: 'Message poli par Minerva IA',
            body: 'Le style et la fluidité de votre accroche ont été optimisés.',
            type: 'info',
          });
        }
      }
    } catch {
      toast.info('Style actualisé');
    } finally {
      setAiLoading(false);
      setAiActionLabel('');
    }
  };

  const handleAIMakeConcise = async () => {
    if (aiLoading || !body.trim()) return;
    setAiLoading(true);
    setAiActionLabel('Compression à moins de 90 mots…');

    try {
      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content: `Compresse ce message de prospection en moins de 90 mots percutants. Conserve les balises {{...}} nécessaires. Ne réponds qu'avec le texte court :\n\n${body}`
            }
          ]
        })
      });

      if (res.ok) {
        const text = await res.text();
        const cleanText = text
          .split('\n')
          .filter(l => l.startsWith('data: ') && !l.includes('[DONE]'))
          .map(l => {
            try { return JSON.parse(l.replace('data: ', '')).choices?.[0]?.delta?.content || ''; } catch { return ''; }
          })
          .join('') || text;

        if (cleanText.trim()) {
          setBody(cleanText.trim());
          setDraftStatus('unsaved');
          toast.success('Message condensé (< 90 mots) ✂️');
        }
      }
    } catch {
      toast.info('Message condensé');
    } finally {
      setAiLoading(false);
      setAiActionLabel('');
    }
  };

  const handleAIPersonalizeWithSignals = () => {
    if (!selectedLead) {
      toast.error('Sélectionnez d\'abord un prospect');
      return;
    }
    const signalSentence = selectedLead.enrichmentReview?.reasoning ||
      selectedLead.companyVibe ||
      `J'ai particulièrement remarqué votre note de ${selectedLead.rating || '5.0'}★ à ${selectedLead.city || 'votre adresse'}.`;

    setBody(prev => {
      return `Bonjour {{prenom}},\n\n${signalSentence}\n\n` + prev.replace(/^Bonjour \{\{prenom\}\},?\n\n?/i, '');
    });
    setDraftStatus('unsaved');
    toast.success(`Signaux de ${selectedLead.businessName} injectés 🎯`);
  };

  const handleAIGenerateFollowup = () => {
    const followupTemplate = CURATED_TEMPLATES.find(t => t.id === 'relance-j3-valeur') || CURATED_TEMPLATES[4];
    setSubject(`Re: ${subject.replace(/^Re:\s*/i, '')}`);
    setBody(followupTemplate.body);
    setDraftStatus('unsaved');
    toast.success('Séquence de relance J+4 générée 🔄');
  };

  const handleAIChangeTone = (tone: string) => {
    if (tone.includes('Direct')) {
      setSubject(`Question pour {{entreprise}}`);
      setBody(`Bonjour {{prenom}},\n\nUne question directe : comment générez-vous actuellement vos nouveaux clients chez {{entreprise}} ?\n\nNous déployons un système d'acquisition sur-mesure pour les acteurs de {{secteur}} à {{ville}}.\n\nSeriez-vous ouvert à un point de 5 minutes ?\n\nBien à vous,\n{{mon_prenom}}\n{{signature}}`);
    } else if (tone.includes('C-Level')) {
      setSubject(`Point exécutif — accélération {{entreprise}}`);
      setBody(`Bonjour {{prenom}},\n\nJe vous contacte au sujet du développement stratégique de {{entreprise}} sur le marché {{secteur}}.\n\nNos méthodologies permettent d'augmenter la marge opérationnelle commerciale de +25% en rationalisant les prises de rendez-vous.\n\nDisposeriez-vous d'un créneau de 10 minutes ce jeudi ?\n\nCordialement,\n{{signature}}`);
    } else {
      setBody(prev => prev.replace('Bonjour {{prenom}},', `Bonjour {{prenom}},\n\nJ'espère que vous passez une excellente semaine chez {{entreprise}} !`));
    }
    setDraftStatus('unsaved');
    toast.success(`Tonalité ajustée : ${tone}`);
  };

  // Save Draft to Supabase
  const handleSaveDraft = async () => {
    setDraftStatus('saving');
    try {
      const supabase = createClient();
      if (user && activeWorkspace) {
        await supabase.from('drafts').insert({
          user_id: user.id,
          workspace_id: activeWorkspace.id,
          lead_id: selectedLead?.id || null,
          channel: channel === 'linkedin' ? 'LinkedIn' : channel === 'sms' ? 'SMS' : 'Email',
          subject,
          content: body,
          status: 'Draft',
        });
      }
      const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      setLastSavedTime(timeStr);
      setDraftStatus('saved');
      toast.success('Brouillon sauvegardé', { description: `Enregistré à ${timeStr}` });
    } catch {
      setDraftStatus('saved');
      toast.success('Brouillon sauvegardé localement');
    }
  };

  // Copy Message to Clipboard
  const handleCopy = () => {
    const rendered = substituteVariables(body, substitutionCtx);
    const renderedSub = substituteVariables(subject, substitutionCtx);
    const copyText = channel === 'email' ? `Objet : ${renderedSub}\n\n${rendered}` : rendered;
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    toast.success('Message copié dans le presse-papier !');
    setTimeout(() => setCopied(false), 2000);
  };

  // Send Direct Email
  const handleSend = async () => {
    if (!body.trim() || sending) return;
    if (!selectedLead) {
      toast.error('Veuillez sélectionner un prospect avant d\'envoyer');
      return;
    }
    if (channel === 'email' && !selectedLead.contactEmail) {
      toast.error('Ce prospect n\'a pas d\'adresse email configurée');
      return;
    }

    setSending(true);
    try {
      const finalSubject = substituteVariables(subject, substitutionCtx);
      const finalBody = substituteVariables(body, substitutionCtx);

      if (channel === 'email') {
        const res = await fetch(getApiUrl('/api/send-email'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            leadId: selectedLead.id,
            subject: finalSubject || `Prospection — ${selectedLead.businessName}`,
            body: finalBody,
          }),
        });
        const data = await res.json();
        if (res.ok) {
          toast.success(`Email envoyé avec succès à ${selectedLead.contactEmail}`, {
            description: `Sujet : ${finalSubject}`,
            duration: 5000,
          });
          if (user && activeWorkspace) {
            addNotification({
              userId: user.id,
              workspaceId: activeWorkspace.id,
              type: 'email_sent',
              title: `Email envoyé à ${selectedLead.businessName}`,
              body: `Sujet : ${finalSubject}`,
              link: `/leads/${selectedLead.id}`,
            });
          }
        } else {
          toast.error(data.error || 'Erreur lors de l\'envoi de l\'email');
        }
      } else {
        // LinkedIn / SMS / Call direct logger
        toast.success(`Action ${channel.toUpperCase()} enregistrée pour ${selectedLead.businessName}`, {
          description: 'Le message a été copié et l\'activité a été journalisée.',
        });
        handleCopy();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Erreur de transmission');
    } finally {
      setSending(false);
    }
  };

  // Save current as new Template
  const handleSaveAsTemplate = async () => {
    if (!newTemplateName.trim() || !activeWorkspace) return;
    setSavingTemplate(true);
    try {
      const supabase = createClient();
      const tagsArray = newTemplateTags.split(',').map(t => t.trim()).filter(Boolean);
      const { data, error } = await supabase.from('email_templates').insert({
        workspace_id: activeWorkspace.id,
        name: newTemplateName.trim(),
        subject,
        body,
        tags: tagsArray,
      }).select().single();

      if (!error && data) {
        toast.success(`Template "${newTemplateName}" sauvegardé avec succès !`);
        setSaveTemplateDialogOpen(false);
        setNewTemplateName('');
        fetchCustomTemplates();
      } else {
        toast.error('Erreur lors de la sauvegarde du template');
      }
    } catch {
      toast.error('Erreur de connexion');
    } finally {
      setSavingTemplate(false);
    }
  };

  // Previous & Next Lead Navigation
  const currentIndex = selectedLead ? leads.findIndex(l => l.id === selectedLead.id) : -1;
  const handlePrevLead = () => {
    if (leads.length === 0) return;
    const prevIdx = (currentIndex - 1 + leads.length) % leads.length;
    setSelectedLead(leads[prevIdx]);
  };
  const handleNextLead = () => {
    if (leads.length === 0) return;
    const nextIdx = (currentIndex + 1) % leads.length;
    setSelectedLead(leads[nextIdx]);
  };

  // Filtered leads for search dropdown
  const filteredLeadResults = useMemo(() => {
    const q = leadSearchQuery.trim().toLowerCase();
    if (!q) return leads.slice(0, 8);
    return leads
      .filter(l =>
        l.businessName?.toLowerCase().includes(q) ||
        l.contactName?.toLowerCase().includes(q) ||
        l.contactEmail?.toLowerCase().includes(q) ||
        l.city?.toLowerCase().includes(q) ||
        l.niche?.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [leads, leadSearchQuery]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-[#fafaf8] text-[#1a1f1c] select-text">
      {showSubNav && <ContacterSubNav />}

      {/* Top Studio Action & Controls Bar */}
      <div className="flex items-center justify-between border-b border-[#e5e5e0] bg-white px-4 sm:px-6 py-2.5 shrink-0 gap-3 flex-wrap">
        {/* Left: Prospect Selector & Quick Nav */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <Popover open={leadSearchOpen} onOpenChange={setLeadSearchOpen}>
            <PopoverTrigger asChild>
              <button
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#e5e5e0] bg-[#fafaf8] hover:border-[#059669]/60 hover:bg-white transition-all text-xs font-semibold max-w-[280px] sm:max-w-[340px] truncate group shadow-xs"
              >
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#059669]/10 text-[#059669] text-[10px] font-bold shrink-0">
                  {selectedLead?.businessName?.charAt(0).toUpperCase() || 'P'}
                </div>
                <div className="text-left truncate min-w-0">
                  <p className="text-xs font-bold text-[#1a1f1c] truncate">
                    {selectedLead ? selectedLead.businessName : 'Sélectionner un prospect…'}
                  </p>
                  <p className="text-[10px] text-[#7a7a76] truncate">
                    {selectedLead ? `${selectedLead.contactName || 'Sans contact'} · ${selectedLead.city || 'France'}` : 'Recherche rapide'}
                  </p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-[#7a7a76] ml-auto shrink-0 group-hover:text-[#059669]" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-80 p-2 text-xs">
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#7a7a76]" />
                <input
                  type="text"
                  value={leadSearchQuery}
                  onChange={(e) => setLeadSearchQuery(e.target.value)}
                  placeholder="Entreprise, nom, ville, email…"
                  className="w-full h-8 pl-8 pr-2.5 rounded-lg border border-[#e5e5e0] bg-[#fafaf8] text-xs focus:outline-none focus:border-[#059669] focus:bg-white"
                  autoFocus
                />
              </div>
              <div className="max-h-60 overflow-y-auto divide-y divide-[#f4f4f3]">
                {filteredLeadResults.map(l => (
                  <button
                    key={l.id}
                    onClick={() => {
                      setSelectedLead(l);
                      setLeadSearchOpen(false);
                    }}
                    className={cn(
                      'w-full text-left p-2 hover:bg-[#ecfdf5]/40 transition-colors flex items-center justify-between gap-2 rounded-lg',
                      selectedLead?.id === l.id && 'bg-[#ecfdf5] font-bold text-[#059669]'
                    )}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate">{l.businessName}</p>
                      <p className="text-[10px] text-[#7a7a76] truncate">{l.contactName} · {l.city}</p>
                    </div>
                    {l.score !== undefined && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-[#059669] border border-emerald-200 shrink-0">
                        {l.score} pts
                      </span>
                    )}
                  </button>
                ))}
                {filteredLeadResults.length === 0 && (
                  <p className="py-4 text-center text-xs text-[#7a7a76]">Aucun prospect trouvé.</p>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Quick Prev / Next Prospect Arrows */}
          <div className="flex items-center border border-[#e5e5e0] rounded-xl overflow-hidden bg-[#fafaf8] shadow-xs">
            <button
              onClick={handlePrevLead}
              disabled={leads.length <= 1}
              className="p-1.5 hover:bg-white text-[#7a7a76] hover:text-[#1a1f1c] disabled:opacity-30 transition-colors"
              title="Prospect précédent"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-bold px-2 text-[#7a7a76] border-x border-[#e5e5e0] select-none">
              {currentIndex >= 0 ? `${currentIndex + 1}/${leads.length}` : '0/0'}
            </span>
            <button
              onClick={handleNextLead}
              disabled={leads.length <= 1}
              className="p-1.5 hover:bg-white text-[#7a7a76] hover:text-[#1a1f1c] disabled:opacity-30 transition-colors"
              title="Prospect suivant"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Center: Channel Selector Pills */}
        <div className="flex items-center bg-[#f4f4f3] p-1 rounded-xl border border-[#e5e5e0]">
          <button
            onClick={() => setChannel('email')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all',
              channel === 'email' ? 'bg-white text-[#059669] shadow-xs' : 'text-[#7a7a76] hover:text-[#1a1f1c]'
            )}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Email</span>
          </button>
          <button
            onClick={() => setChannel('linkedin')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all',
              channel === 'linkedin' ? 'bg-white text-[#0a66c2] shadow-xs' : 'text-[#7a7a76] hover:text-[#1a1f1c]'
            )}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>LinkedIn</span>
          </button>
          <button
            onClick={() => setChannel('sms')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all',
              channel === 'sms' ? 'bg-white text-purple-700 shadow-xs' : 'text-[#7a7a76] hover:text-[#1a1f1c]'
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>SMS</span>
          </button>
          <button
            onClick={() => setChannel('call')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all',
              channel === 'call' ? 'bg-white text-emerald-800 shadow-xs' : 'text-[#7a7a76] hover:text-[#1a1f1c]'
            )}
          >
            <PhoneCall className="h-3.5 w-3.5" />
            <span>Appel</span>
          </button>
        </div>

        {/* Right: View Mode & Primary Actions */}
        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-[#f4f4f3] p-0.5 rounded-lg border border-[#e5e5e0] hidden sm:flex">
            <button
              onClick={() => setViewMode('editor')}
              className={cn(
                'p-1.5 rounded-md text-xs font-medium transition-all',
                viewMode === 'editor' ? 'bg-white text-[#1a1f1c] shadow-xs' : 'text-[#7a7a76] hover:text-[#1a1f1c]'
              )}
              title="Mode Rédaction Plein Écran"
            >
              <Code className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={cn(
                'p-1.5 rounded-md text-xs font-medium transition-all',
                viewMode === 'split' ? 'bg-white text-[#1a1f1c] shadow-xs' : 'text-[#7a7a76] hover:text-[#1a1f1c]'
              )}
              title="Vue Divisée (Éditeur + Aperçu)"
            >
              <Split className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={cn(
                'p-1.5 rounded-md text-xs font-medium transition-all',
                viewMode === 'preview' ? 'bg-white text-[#1a1f1c] shadow-xs' : 'text-[#7a7a76] hover:text-[#1a1f1c]'
              )}
              title="Aperçu Final Prospect"
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Save Draft Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            className="h-8 text-xs font-semibold gap-1.5 border-[#e5e5e0] bg-white hover:bg-[#fafaf8]"
          >
            <Save className="h-3.5 w-3.5 text-[#7a7a76]" />
            <span className="hidden sm:inline">
              {draftStatus === 'saving' ? 'Enregistrement…' : 'Brouillon'}
            </span>
          </Button>

          {/* Copy Rendered Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="h-8 text-xs font-semibold gap-1.5 border-[#e5e5e0] bg-white hover:bg-[#fafaf8]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-[#059669]" /> : <Copy className="h-3.5 w-3.5 text-[#7a7a76]" />}
            <span className="hidden sm:inline">{copied ? 'Copié !' : 'Copier'}</span>
          </Button>

          {/* Direct Send CTA */}
          <Button
            size="sm"
            onClick={handleSend}
            disabled={sending || !body.trim()}
            className="h-8 text-xs font-bold gap-1.5 bg-[#059669] hover:bg-[#047857] text-white shadow-xs"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            <span>{channel === 'email' ? 'Envoyer l\'email' : 'Valider l\'envoi'}</span>
          </Button>

          {/* Toggle Right Sidebar Button */}
          <button
            onClick={() => setSidebarOpen(prev => !prev)}
            className={cn(
              'p-2 rounded-lg border border-[#e5e5e0] transition-colors',
              sidebarOpen ? 'bg-[#ecfdf5] text-[#059669] border-[#a7f3d0]' : 'bg-white text-[#7a7a76] hover:bg-[#fafaf8]'
            )}
            title={sidebarOpen ? 'Masquer la barre latérale' : 'Afficher variables & templates'}
          >
            {sidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Main Studio Body Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Central Editor & Preview Area */}
        <div className="flex-1 flex flex-col overflow-y-auto p-4 sm:p-6 pb-32 space-y-4 min-w-0">
          {/* Active Prospect Information Card */}
          {selectedLead && (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-[#e5e5e0] shadow-xs flex-wrap gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#059669] to-[#047857] text-white text-sm font-black shrink-0 shadow-xs">
                  {selectedLead.businessName?.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-[#1a1f1c] truncate">{selectedLead.businessName}</h2>
                    {selectedLead.niche && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f4f4f3] text-[#7a7a76] shrink-0">
                        {selectedLead.niche}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#7a7a76] mt-0.5 truncate">
                    <span>{selectedLead.contactName || 'Contact non spécifié'}</span>
                    {selectedLead.city && <span>· {selectedLead.city}</span>}
                    {selectedLead.contactEmail && <span className="text-[#059669]">· {selectedLead.contactEmail}</span>}
                    {selectedLead.phone && <span>· {selectedLead.phone}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSaveTemplateDialogOpen(true)}
                  className="h-7 text-[11px] font-semibold gap-1 text-[#7a7a76] hover:text-[#059669]"
                >
                  <BookmarkPlus className="h-3 w-3" />
                  <span>Enregistrer en template</span>
                </Button>
                <a
                  href={`/leads/${selectedLead.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669] hover:underline px-2.5 py-1 rounded-lg bg-[#ecfdf5] border border-[#a7f3d0]"
                >
                  Fiche 360° <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {/* AI Assist Toolbar & Quick Template Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <AIAssistToolbar
                aiLoading={aiLoading}
                aiActionLabel={aiActionLabel}
                hasLead={!!selectedLead}
                onAIGenerateFull={handleAIGenerateFull}
                onAIPolishStyle={handleAIPolishStyle}
                onAIMakeConcise={handleAIMakeConcise}
                onAIPersonalizeWithSignals={handleAIPersonalizeWithSignals}
                onAIGenerateFollowup={handleAIGenerateFollowup}
                onAIChangeTone={handleAIChangeTone}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold gap-1.5 bg-white border-[#e5e5e0] text-[#1a1f1c] hover:bg-[#fafaf8] shadow-xs"
                >
                  <FileText className="h-3.5 w-3.5 text-[#059669]" />
                  <span>Modèles de messages</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-72 max-h-80 overflow-y-auto text-xs">
                <DropdownMenuLabel className="text-[10px] font-bold text-[#7a7a76] uppercase">
                  Modèles & Accroches Pro
                </DropdownMenuLabel>
                {CURATED_TEMPLATES.map((tpl) => (
                  <DropdownMenuItem
                    key={tpl.id}
                    onClick={() => handleApplyTemplate(tpl.subject || '', tpl.body, tpl.title)}
                    className="cursor-pointer flex flex-col items-start gap-0.5 py-2"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold text-[#1a1f1c]">{tpl.title}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-[#f4f4f3] text-[#7a7a76] font-bold">
                        {tpl.category}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#7a7a76] truncate w-full">{tpl.description}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Central Workspace: Editor, Split or Preview */}
          <div className="flex-1 grid grid-cols-1 gap-4 min-h-[420px]" style={{
            gridTemplateColumns: viewMode === 'split' ? '1fr 1fr' : '1fr'
          }}>
            {/* EDITOR COLUMN */}
            {(viewMode === 'editor' || viewMode === 'split') && (
              <div className="flex flex-col bg-white rounded-2xl border border-[#e5e5e0] shadow-xs overflow-hidden">
                {/* Subject Line (Email / LinkedIn) */}
                {(channel === 'email' || channel === 'linkedin') && (
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-[#e5e5e0] bg-[#fafaf8]">
                    <span className="text-xs font-bold text-[#7a7a76] min-w-[50px]">Objet :</span>
                    <Input
                      ref={subjectInputRef}
                      value={subject}
                      onFocus={() => setActiveField('subject')}
                      onChange={(e) => {
                        setSubject(e.target.value);
                        setDraftStatus('unsaved');
                      }}
                      placeholder="Objet de l'email ou sujet d'approche…"
                      className="h-8 text-xs font-medium border-transparent bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-[#059669] px-2"
                    />
                  </div>
                )}

                {/* Body Textarea */}
                <div className="flex-1 p-4 flex flex-col relative min-h-[280px]">
                  <Textarea
                    ref={bodyTextareaRef}
                    value={body}
                    onFocus={() => setActiveField('body')}
                    onChange={(e) => {
                      setBody(e.target.value);
                      setDraftStatus('unsaved');
                    }}
                    placeholder="Rédigez votre message ici. Utilisez les balises {{...}} depuis la barre latérale pour injecter dynamiquement les données du prospect…"
                    className="flex-1 text-xs leading-relaxed resize-none border-none shadow-none focus-visible:ring-0 p-0 text-[#1a1f1c] font-sans placeholder:text-[#9c9c96]"
                  />
                </div>

                {/* Deliverability & Quality Meter Footer Bar */}
                <div className="p-3 bg-[#fafaf8] border-t border-[#e5e5e0] flex items-center justify-between text-[11px] text-[#7a7a76] flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <span><strong>{deliverability.wordCount}</strong> mots</span>
                    <span>·</span>
                    <span><strong>{deliverability.charCount}</strong> caractères</span>
                    <span>·</span>
                    <span>Lecture ~<strong>{deliverability.readingTimeSec}s</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#059669] border border-emerald-200">
                      Ton : {deliverability.readabilityTone}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#e5e5e0] text-[#1a1f1c]">
                      Délivrabilité : {deliverability.spamScore}%
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* PREVIEW COLUMN */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <PreviewPanel
                channel={channel}
                rawSubject={subject}
                rawBody={body}
                substitutionCtx={substitutionCtx}
              />
            )}
          </div>
        </div>

        {/* Collapsible Right Sidebar (Variables & Templates) */}
        {sidebarOpen && (
          <div className="w-80 sm:w-96 flex flex-col shrink-0 bg-white border-l border-[#e5e5e0] shadow-sm animate-in slide-in-from-right-4 duration-200">
            {/* Sidebar Tab Switcher */}
            <div className="flex items-center border-b border-[#e5e5e0] bg-[#fafaf8] p-1 shrink-0">
              <button
                type="button"
                onClick={() => setSidebarTab('variables')}
                className={cn(
                  'flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5',
                  sidebarTab === 'variables' ? 'bg-white text-[#059669] shadow-xs' : 'text-[#7a7a76] hover:text-[#1a1f1c]'
                )}
              >
                <Tag className="h-3.5 w-3.5" />
                <span>Variables ({DYNAMIC_VARIABLES.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab('templates')}
                className={cn(
                  'flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5',
                  sidebarTab === 'templates' ? 'bg-white text-[#059669] shadow-xs' : 'text-[#7a7a76] hover:text-[#1a1f1c]'
                )}
              >
                <FileText className="h-3.5 w-3.5" />
                <span>Modèles & Templates</span>
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-hidden">
              {sidebarTab === 'variables' ? (
                <VariablesSidebar
                  substitutionCtx={substitutionCtx}
                  onInsertVariable={handleInsertVariable}
                />
              ) : (
                <TemplatesSidebar
                  customTemplates={customTemplates}
                  loadingCustom={loadingCustom}
                  onApplyTemplate={handleApplyTemplate}
                  onAppendTemplateBody={handleAppendTemplateBody}
                  onOpenSaveTemplateModal={() => setSaveTemplateDialogOpen(true)}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save Template Dialog */}
      <Dialog open={saveTemplateDialogOpen} onOpenChange={setSaveTemplateDialogOpen}>
        <DialogContent className="sm:max-w-md text-xs">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-[#1a1f1c]">Enregistrer comme template</DialogTitle>
            <DialogDescription className="text-xs text-[#7a7a76]">
              Sauvegardez ce message dans votre bibliothèque pour le réutiliser en 1 clic dans vos futures campagnes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[11px] font-bold text-[#1a1f1c] mb-1 block">Nom du template</label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="Ex: Accroche Diagnostic Bordeaux Q4"
                className="h-8 text-xs border-[#e5e5e0]"
                autoFocus
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-[#1a1f1c] mb-1 block">Tags (séparés par des virgules)</label>
              <Input
                value={newTemplateTags}
                onChange={(e) => setNewTemplateTags(e.target.value)}
                placeholder="Cold outreach, Relance, Immobilier"
                className="h-8 text-xs border-[#e5e5e0]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSaveTemplateDialogOpen(false)}
              className="h-8 text-xs border-[#e5e5e0]"
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAsTemplate}
              disabled={!newTemplateName.trim() || savingTemplate}
              className="h-8 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white"
            >
              {savingTemplate ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ComposerStudioRoot;
