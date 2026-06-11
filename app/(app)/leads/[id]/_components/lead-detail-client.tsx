'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useReach } from '@/lib/reach-context';
import { Lead, Note } from '@/lib/mock-data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChevronLeft, 
  MapPin, 
  Mail, 
  Calendar, 
  User, 
  Activity, 
  Building, 
  Plus, 
  Flame, 
  Sparkles,
  ArrowRight,
  ClipboardList,
  Loader2,
  Copy,
  Check,
  Trash2,
  FileText,
  Send,
  Cloud
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';


// Helper inline edit component for text properties
interface InlineTextEditProps {
  value: string;
  onSave: (val: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

function InlineTextEdit({ value, onSave, placeholder = 'Non spécifié', className, inputClassName }: InlineTextEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [val, setVal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVal(value);
    }, 0);
    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (val.trim() !== value) {
      onSave(val.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    }
    if (e.key === 'Escape') {
      setVal(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <Input
        ref={inputRef}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn("h-7 text-xs bg-background py-0.5 px-2", inputClassName)}
      />
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-muted/60 px-1 py-0.5 rounded border border-transparent hover:border-border/50 transition-all text-xs min-h-6 flex items-center min-w-0 break-all",
        !value && "text-muted-foreground italic",
        className
      )}
    >
      {value || placeholder}
    </div>
  );
}

function getExportFileName(businessName: string): string {
  const cleanName = businessName.replace(/[^a-zA-Z0-9]/g, '_');
  return `Audit_${cleanName}_${Date.now()}.txt`;
}

export function LeadDetailClient({ id }: { id: string }) {
  const { leads, updateLead, addNoteToLead } = useReach();

  // Look up lead
  const lead = leads.find((l) => l.id === id);

  // States for new note form
  const [noteType, setNoteType] = useState<Note['type']>('general');
  const [noteContent, setNoteContent] = useState('');

  interface Draft {
    id: string;
    lead_id: string;
    user_id: string;
    channel: string;
    tone: string;
    content: string;
    status: string;
    created_at: string;
  }

  // AI draft states
  const [activeTab, setActiveTab] = useState<'notes' | 'drafts'>('notes');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiStage, setAiStage] = useState<'idle' | 'thinking' | 'reading' | 'writing' | 'done'>('idle');

  useEffect(() => {
    if (!generating) {
      const timer = setTimeout(() => {
        setAiStage('idle');
      }, 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => {
      setAiStage('thinking');
    }, 0);
    const interval = setInterval(() => {
      setAiStage((current) => {
        if (current === 'thinking') return 'reading';
        if (current === 'reading') return 'writing';
        return current;
      });
    }, 2000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [generating]);
  
  // Composer states
  const [draftChannel, setDraftChannel] = useState<'Email' | 'DM' | 'Call'>('Email');
  const [draftTone, setDraftTone] = useState<string>('Calme & Conseil');
  const [draftInstructions, setDraftInstructions] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);

  // Gmail OAuth status states
  const [gmailConnected, setGmailConnected] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [checkingGmail, setCheckingGmail] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [exportingDrive, setExportingDrive] = useState(false);

  useEffect(() => {
    const checkGmail = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('settings')
            .select('google_refresh_token, google_email')
            .eq('user_id', user.id)
            .maybeSingle();
          if (data && data.google_refresh_token) {
            setGmailConnected(true);
            setGoogleEmail(data.google_email || '');
          }
        }
      } catch (e) {
        console.error("Error checking Gmail connection:", e);
      }
      setCheckingGmail(false);
    };
    checkGmail();
  }, []);

  const handleSendEmail = async () => {
    if (!lead || !generatedContent.trim()) return;
    setSendingEmail(true);
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: id,
          subject: `Prospection - ${lead.businessName}`,
          body: generatedContent
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const nextActionDate = new Date();
        nextActionDate.setDate(nextActionDate.getDate() + 3);

        // Update local React Context for instant UI updates
        updateLead(lead.id, {
          status: 'Contacted',
          nextAction: 'Relance e-mail / Appel téléphonique suite à premier contact',
          nextActionDate: nextActionDate.toISOString().split('T')[0]
        });

        const logText = data.simulated 
          ? `[Simulé] E-mail envoyé avec succès (mode bac à sable) :\n\nSujet : Prospection - ${lead.businessName}\n\n${generatedContent}` 
          : `E-mail envoyé via Gmail API (compte ${googleEmail || 'connecté'}) :\n\nSujet : Prospection - ${lead.businessName}\n\n${generatedContent}`;
        
        addNoteToLead(lead.id, logText, 'email');
        
        setGeneratedContent(''); // Clear active editor
        await fetchDrafts();
      } else {
        alert(data.error || "Une erreur est survenue lors de l'envoi");
      }
    } catch (err) {
      console.error("Error sending email:", err);
      alert("Erreur de connexion au serveur d'envoi");
    }
    setSendingEmail(false);
  };

  const handleExportToDrive = async (contentToExport: string) => {
    if (!lead || !contentToExport.trim()) return;
    setExportingDrive(true);
    try {
      const defaultFileName = getExportFileName(lead.businessName);
      const res = await fetch('/api/export-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: id,
          fileName: defaultFileName,
          content: contentToExport
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Fichier "${data.fileName}" exporté avec succès sur Google Drive !`);
        const logText = data.simulated 
          ? `[Simulé] Audit SEO exporté avec succès sur Google Drive (mode bac à sable) :\nFichier : ${data.fileName}` 
          : `Audit SEO exporté avec succès sur Google Drive (compte ${googleEmail || 'connecté'}) :\nFichier : ${data.fileName}`;
        addNoteToLead(lead.id, logText, 'general');
      } else {
        alert(data.error || "Erreur lors de l'exportation vers Google Drive");
      }
    } catch (err) {
      console.error("Error exporting to Google Drive:", err);
      alert("Erreur de connexion lors de l'exportation");
    }
    setExportingDrive(false);
  };

  const fetchDrafts = useCallback(async () => {
    setLoadingDrafts(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('drafts')
        .select('*')
        .eq('lead_id', id)
        .order('created_at', { ascending: false });
      if (data) {
        setDrafts(data as Draft[]);
      }
    } catch (e) {
      console.error("Error fetching drafts:", e);
    }
    setLoadingDrafts(false);
  }, [id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDrafts();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchDrafts]);

  const handleGenerateDraft = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: id,
          channel: draftChannel,
          tone: draftTone,
          instructions: draftInstructions
        })
      });
      const data = await res.json();
      if (data.content) {
        setAiStage('done');
        // Let the user appreciate the golden "Done" phase
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setGeneratedContent(data.content);
        // Refresh drafts list
        await fetchDrafts();
      }
    } catch (err) {
      console.error("Error generating draft:", err);
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyDraft = () => {
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteDraft = async (draftId: string) => {
    try {
      const supabase = createClient();
      await supabase.from('drafts').delete().eq('id', draftId);
      setDrafts(prev => prev.filter(d => d.id !== draftId));
      if (generatedContent && drafts.find(d => d.id === draftId)?.content === generatedContent) {
        setGeneratedContent('');
      }
    } catch (err) {
      console.error("Error deleting draft:", err);
    }
  };


  if (!lead) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <h2 className="text-lg font-bold">Prospect introuvable</h2>
        <p className="text-xs text-muted-foreground mt-1">Le lead demandé n&apos;existe pas ou a été supprimé.</p>
        <Button asChild size="sm" className="mt-5">
          <Link href="/leads" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Retour aux leads
          </Link>
        </Button>
      </div>
    );
  }

  const handleSaveProperty = <K extends keyof Lead>(field: K, value: Lead[K]) => {
    updateLead(lead.id, { [field]: value });
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    addNoteToLead(lead.id, noteContent.trim(), noteType);
    setNoteContent('');
  };

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'New': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300';
      case 'Contacted': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300';
      case 'Meeting Booked': return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300';
      case 'Won': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300';
      default: return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300';
    }
  };

  const getTemperatureColor = (temp: Lead['temperature']) => {
    switch (temp) {
      case 'Hot': return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300';
      case 'Warm': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-6">
        
        {/* Back Link Header */}
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
            <Link href="/leads">
              <ChevronLeft className="h-4 w-4" />
              <span>Portefeuille Leads</span>
            </Link>
          </Button>
          <div className="text-[10px] text-muted-foreground font-mono">
            Dernière mise à jour : {new Date(lead.updatedAt).toLocaleString('fr-FR')}
          </div>
        </div>

        {/* Notion Document Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 bg-card border border-border rounded-lg shadow-sm p-6 sm:p-8">
          
          {/* Main Content Side (Document Body) */}
          <div className="space-y-8 min-w-0">
            {/* Lead Title Heading (Notion style click-to-edit header) */}
            <div className="space-y-1.5">
              <InlineTextEdit 
                value={lead.businessName} 
                onSave={(val) => handleSaveProperty('businessName', val)}
                placeholder="Nom de l'entreprise"
                className="text-2xl sm:text-3xl font-bold font-sans tracking-tight hover:bg-muted/40 rounded px-2 py-0.5 -ml-2 text-foreground focus:outline-none"
                inputClassName="text-2xl sm:text-3xl font-bold font-sans h-12 -ml-2"
              />
              <p className="text-xs text-muted-foreground px-0.5">
                Créé le {new Date(lead.createdAt).toLocaleDateString('fr-FR')} • Propriétaire: {lead.owner}
              </p>
            </div>

            <div className="h-px bg-border" />

            {/* Tabs Selector for Notes vs AI Drafts */}
            <div className="space-y-6">
              <div className="flex border-b border-border/60 gap-6">
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={cn(
                    "pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-1 transition-all cursor-pointer",
                    activeTab === 'notes'
                      ? "border-primary text-foreground font-extrabold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Observations & Notes ({lead.notes?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('drafts')}
                  className={cn(
                    "pb-3 text-xs font-bold uppercase tracking-wider border-b-2 px-1 transition-all cursor-pointer",
                    activeTab === 'drafts'
                      ? "border-primary text-foreground font-extrabold"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Rédacteur d&apos;e-mails IA ({drafts.length})
                </button>
              </div>

              {activeTab === 'notes' ? (
                <div className="space-y-6">
                  {/* Add Note Form */}
                  <form onSubmit={handleAddNote} className="space-y-3 bg-secondary/10 border border-border/80 p-4 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-semibold">Type d&apos;activité</span>
                      <Select
                        value={noteType}
                        onValueChange={(val: Note['type']) => setNoteType(val)}
                      >
                        <SelectTrigger className="h-7 w-[110px] text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="visit" className="text-xs">📍 Visite</SelectItem>
                          <SelectItem value="call" className="text-xs">📞 Appel</SelectItem>
                          <SelectItem value="email" className="text-xs">✉️ Email</SelectItem>
                          <SelectItem value="general" className="text-xs">📝 Note</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea 
                      placeholder="Note une observation, le résumé d'un appel ou un retour terrain..."
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className="text-xs min-h-[70px] resize-y bg-background"
                      required
                    />
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" className="h-8 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90">
                        <Plus className="h-3.5 w-3.5" />
                        <span>Ajouter la note</span>
                      </Button>
                    </div>
                  </form>

                  {/* Feed List */}
                  <div className="space-y-3">
                    {lead.notes && lead.notes.length > 0 ? (
                      [...lead.notes].reverse().map((note) => (
                        <div key={note.id} className="border border-border/60 bg-card p-3.5 rounded-lg flex flex-col gap-2 shadow-xs">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0">
                              {note.type === 'visit' ? '📍 Visite' : note.type === 'call' ? '📞 Appel' : note.type === 'email' ? '✉️ Email' : '📝 Note'}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {new Date(note.createdAt).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                            {note.content}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-border rounded-lg">
                        <ClipboardList className="h-5 w-5 text-muted-foreground/45 mb-1.5" />
                        <span className="text-[11px] text-muted-foreground">Aucune note historique pour ce prospect.</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* AI Draft Form */}
                  <div className="space-y-4 bg-secondary/15 border border-border/80 p-5 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Channel Selection */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Canal de prospection</label>
                        <Select
                          value={draftChannel}
                          onValueChange={(val: 'Email' | 'DM' | 'Call') => setDraftChannel(val)}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value="Email" className="text-xs">✉️ E-mail</SelectItem>
                            <SelectItem value="DM" className="text-xs">📱 Message Privé (DM)</SelectItem>
                            <SelectItem value="Call" className="text-xs">📞 Script d&apos;Appel / SMS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Tone Selection */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Style & Ton</label>
                        <Select
                          value={draftTone}
                          onValueChange={(val) => setDraftTone(val)}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value="Calme & Conseil" className="text-xs">😌 Calme & Conseil</SelectItem>
                            <SelectItem value="Direct & Closer" className="text-xs">⚡ Direct & Closer</SelectItem>
                            <SelectItem value="Storytelling" className="text-xs">📖 Storytelling</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Specific instructions */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Consignes spécifiques (optionnel)</label>
                      <Textarea 
                        placeholder="Ex: Propose un rendez-vous ce jeudi à 15h, ou insiste sur le fait que l'audit est 100% gratuit..."
                        value={draftInstructions}
                        onChange={(e) => setDraftInstructions(e.target.value)}
                        className="text-xs min-h-[50px] resize-y bg-background"
                      />
                    </div>

                    {generating && (
                      <div className="space-y-3 p-4 bg-muted/50 border border-border rounded-lg animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Agent de prospection en action
                          </span>
                          <span className="text-[9px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {aiStage === 'thinking' && 'Analyse en cours...'}
                            {aiStage === 'reading' && 'Lecture du contexte...'}
                            {aiStage === 'writing' && 'Rédaction du message...'}
                            {aiStage === 'done' && 'Brouillon prêt !'}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-2">
                          {/* Step 1: Thinking */}
                          <div 
                            className={cn(
                              "flex flex-col gap-1 p-2.5 rounded border text-center transition-all duration-300",
                              aiStage === 'thinking'
                                ? "border-[var(--timeline-thinking)] bg-[var(--timeline-thinking)]/15 scale-[1.02] ring-1 ring-[var(--timeline-thinking)]/45 animate-pulse text-foreground font-semibold"
                                : "border-border/60 bg-background/50 text-muted-foreground/60"
                            )}
                          >
                            <span className="text-xs">📍</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider">Thinking</span>
                          </div>

                          {/* Step 2: Reading */}
                          <div 
                            className={cn(
                              "flex flex-col gap-1 p-2.5 rounded border text-center transition-all duration-300",
                              aiStage === 'reading'
                                ? "border-[var(--timeline-read)] bg-[var(--timeline-read)]/15 scale-[1.02] ring-1 ring-[var(--timeline-read)]/45 animate-pulse text-foreground font-semibold"
                                : "border-border/60 bg-background/50 text-muted-foreground/60"
                            )}
                          >
                            <span className="text-xs">🔎</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider">Reading</span>
                          </div>

                          {/* Step 3: Writing */}
                          <div 
                            className={cn(
                              "flex flex-col gap-1 p-2.5 rounded border text-center transition-all duration-300",
                              aiStage === 'writing'
                                ? "border-[var(--timeline-edit)] bg-[var(--timeline-edit)]/15 scale-[1.02] ring-1 ring-[var(--timeline-edit)]/45 animate-pulse text-foreground font-semibold"
                                : "border-border/60 bg-background/50 text-muted-foreground/60"
                            )}
                          >
                            <span className="text-xs">✍️</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider">Writing</span>
                          </div>

                          {/* Step 4: Done */}
                          <div 
                            className={cn(
                              "flex flex-col gap-1 p-2.5 rounded border text-center transition-all duration-300",
                              aiStage === 'done'
                                ? "border-[var(--timeline-done)] bg-[var(--timeline-done)]/15 scale-[1.02] ring-1 ring-[var(--timeline-done)]/45 text-foreground font-semibold"
                                : "border-border/60 bg-background/50 text-muted-foreground/60"
                            )}
                          >
                            <span className="text-xs">🛡️</span>
                            <span className="text-[9px] font-bold uppercase tracking-wider">Done</span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end pt-1">
                      <Button
                        onClick={handleGenerateDraft}
                        disabled={generating}
                        className="h-8.5 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/95 text-primary-foreground transition-all"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>Rédaction en cours...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Générer le brouillon avec l&apos;IA</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Active Draft Output */}
                  {generatedContent && (
                    <div className="border border-primary/25 bg-primary/5 p-4.5 rounded-lg flex flex-col gap-3.5 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5" />
                          Brouillon IA généré
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={exportingDrive}
                            onClick={() => handleExportToDrive(generatedContent)}
                            className="h-7 text-[10px] font-semibold px-2 text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                            title="Exporter vers Google Drive"
                          >
                            {exportingDrive ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Cloud className="h-3.5 w-3.5 text-primary" />
                            )}
                            <span>Sauvegarder sur Drive</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCopyDraft}
                            className={cn("h-7 w-7 text-muted-foreground hover:text-foreground", copied && "text-emerald-500 hover:text-emerald-500")}
                            title="Copier"
                          >
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={generatedContent}
                        onChange={(e) => setGeneratedContent(e.target.value)}
                        className="text-xs font-sans min-h-[160px] leading-relaxed bg-background focus-visible:ring-1 focus-visible:ring-primary"
                      />
                      
                      {/* Send button panel */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-border/40">
                        <div className="text-[10px] text-muted-foreground">
                          {checkingGmail ? (
                            <span>Vérification de la connexion mail...</span>
                          ) : gmailConnected ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              ✓ Compte Gmail connecté ({googleEmail})
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">
                              ⚠ Gmail non connecté. L&apos;envoi s&apos;exécutera en mode simulation locale.
                            </span>
                          )}
                        </div>
                        <Button
                          onClick={handleSendEmail}
                          disabled={sendingEmail || !lead.contactEmail}
                          size="sm"
                          className="h-8 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/95 text-primary-foreground self-end sm:self-auto"
                        >
                          {sendingEmail ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Envoi...</span>
                            </>
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              <span>Envoyer via Gmail</span>
                            </>
                          )}
                        </Button>
                      </div>
                      
                      <p className="text-[10px] text-muted-foreground italic">
                        * Ce brouillon a été enregistré automatiquement dans l&apos;historique de vos brouillons ci-dessous. Vous pouvez l&apos;éditer librement.
                      </p>
                    </div>
                  )}

                  {/* History of drafts */}
                  <div className="space-y-3.5">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Historique des Brouillons</h4>
                    {loadingDrafts ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 text-primary animate-spin" />
                      </div>
                    ) : drafts.length > 0 ? (
                      <div className="space-y-3">
                        {drafts.map((draft) => (
                          <div key={draft.id} className="border border-border/60 bg-card p-4 rounded-lg flex flex-col gap-3 hover:border-border transition-all">
                            <div className="flex items-center justify-between border-b border-border/40 pb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[8px] font-extrabold uppercase px-1.5 py-0">
                                  {draft.channel === 'Email' ? '✉️ E-mail' : draft.channel === 'DM' ? '📱 Message Privé' : '📞 Script / SMS'}
                                </Badge>
                                <span className="text-[9px] text-muted-foreground font-mono">Ton: {draft.tone}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={exportingDrive}
                                  onClick={() => handleExportToDrive(draft.content)}
                                  className="h-6.5 w-6.5 text-muted-foreground hover:text-primary"
                                  title="Exporter vers Google Drive"
                                >
                                  <Cloud className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setGeneratedContent(draft.content)}
                                  className="h-6.5 w-6.5 text-muted-foreground hover:text-foreground"
                                  title="Ouvrir dans l'éditeur"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteDraft(draft.id)}
                                  className="h-6.5 w-6.5 text-muted-foreground hover:text-red-500"
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-foreground/95 whitespace-pre-wrap leading-relaxed">
                              {draft.content}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-border rounded-lg">
                        <Sparkles className="h-4.5 w-4.5 text-muted-foreground/45 mb-1.5" />
                        <span className="text-[11px] text-muted-foreground">Aucun brouillon généré pour le moment.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar (Notion Properties Panel) */}
          <div className="border-t lg:border-t-0 lg:border-l border-border pt-6 lg:pt-0 lg:pl-6 space-y-6">
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-4">Propriétés du Prospect</h4>
              
              <div className="space-y-4">
                {/* Status selector */}
                <div className="grid grid-cols-[100px_1fr] items-center gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                    <Activity className="h-3 w-3" />
                    Statut
                  </span>
                  <Select
                    value={lead.status}
                    onValueChange={(val: Lead['status']) => handleSaveProperty('status', val)}
                  >
                    <SelectTrigger className={cn("h-7 w-full text-xs font-semibold", getStatusColor(lead.status))}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New" className="text-xs">🔴 Nouveau</SelectItem>
                      <SelectItem value="Contacted" className="text-xs">🟡 Contacté</SelectItem>
                      <SelectItem value="Meeting Booked" className="text-xs">🟣 RDV Fixé</SelectItem>
                      <SelectItem value="Won" className="text-xs">🟢 Gagné</SelectItem>
                      <SelectItem value="Lost" className="text-xs">⚪ Perdu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Temperature selector */}
                <div className="grid grid-cols-[100px_1fr] items-center gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                    <Flame className="h-3 w-3" />
                    Température
                  </span>
                  <Select
                    value={lead.temperature}
                    onValueChange={(val: Lead['temperature']) => handleSaveProperty('temperature', val)}
                  >
                    <SelectTrigger className={cn("h-7 w-full text-xs font-semibold", getTemperatureColor(lead.temperature))}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hot" className="text-xs">🔥 Chaud (Hot)</SelectItem>
                      <SelectItem value="Warm" className="text-xs">☀️ Tiède (Warm)</SelectItem>
                      <SelectItem value="Cold" className="text-xs">❄️ Froid (Cold)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Niche */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 h-6">
                    <Building className="h-3 w-3" />
                    Secteur
                  </span>
                  <InlineTextEdit 
                    value={lead.niche} 
                    onSave={(val) => handleSaveProperty('niche', val)}
                    placeholder="ex: Restauration"
                  />
                </div>

                {/* City */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 h-6">
                    <MapPin className="h-3 w-3" />
                    Ville
                  </span>
                  <InlineTextEdit 
                    value={lead.city} 
                    onSave={(val) => handleSaveProperty('city', val)}
                    placeholder="ex: Lyon"
                  />
                </div>

                {/* Contact Name */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 h-6">
                    <User className="h-3 w-3" />
                    Contact
                  </span>
                  <InlineTextEdit 
                    value={lead.contactName} 
                    onSave={(val) => handleSaveProperty('contactName', val)}
                    placeholder="Nom du gérant"
                  />
                </div>

                {/* Contact Email */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 h-6">
                    <Mail className="h-3 w-3" />
                    Email
                  </span>
                  <InlineTextEdit 
                    value={lead.contactEmail || ''} 
                    onSave={(val) => handleSaveProperty('contactEmail', val)}
                    placeholder="email@contact.com"
                  />
                </div>

                {/* Source */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 h-6">
                    <Sparkles className="h-3 w-3" />
                    Source
                  </span>
                  <InlineTextEdit 
                    value={lead.source} 
                    onSave={(val) => handleSaveProperty('source', val)}
                    placeholder="ex: Google Maps"
                  />
                </div>

                {/* Next action */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 h-6">
                    <ArrowRight className="h-3 w-3" />
                    Relance
                  </span>
                  <InlineTextEdit 
                    value={lead.nextAction} 
                    onSave={(val) => handleSaveProperty('nextAction', val)}
                    placeholder="ex: Rappeler"
                  />
                </div>

                {/* Next action date */}
                <div className="grid grid-cols-[100px_1fr] items-center gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    Date relance
                  </span>
                  <Input 
                    type="date"
                    value={lead.nextActionDate}
                    onChange={(e) => handleSaveProperty('nextActionDate', e.target.value)}
                    className="h-7 text-xs bg-background py-0.5 px-2"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default LeadDetailClient;
