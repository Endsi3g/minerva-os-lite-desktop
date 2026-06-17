'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import { takePhoto } from '@/lib/native-bridge';
import { getApiUrl } from '@/lib/api-helper';
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
  Cloud,
  Camera,
  HardDrive,
  Tag,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';


// Helper inline edit component for text properties
interface InlineTextEditProps {
  value: string;
  onSave: (val: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  onEditStateChange?: (isEditing: boolean) => void;
}

function InlineTextEdit({ value, onSave, placeholder = 'Non spécifié', className, inputClassName, disabled, onEditStateChange }: InlineTextEditProps) {
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
    onEditStateChange?.(false);
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
      onEditStateChange?.(false);
    }
  };

  if (isEditing && !disabled) {
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
      onClick={() => {
        if (!disabled) {
          setIsEditing(true);
          onEditStateChange?.(true);
        }
      }}
      className={cn(
        "cursor-pointer hover:bg-muted/60 px-1 py-0.5 rounded border border-transparent hover:border-border/50 transition-all text-xs min-h-6 flex items-center min-w-0 break-all",
        !value && "text-muted-foreground italic",
        disabled && "cursor-not-allowed hover:bg-transparent hover:border-transparent opacity-85",
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
  const { t } = useLanguage();

  // Look up lead
  const lead = leads.find((l) => l.id === id);

  // States for new note form
  const [noteType, setNoteType] = useState<Note['type']>('general');
  const [noteContent, setNoteContent] = useState('');

  // Load workspace and user profile for realtime collaboration
  const { activeWorkspace } = useReach();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<{ fullName: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const presenceChannelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user);
        const { data: settings } = await supabase
          .from('settings')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();
        setUserProfile({
          fullName: settings?.full_name || user.email || 'Membre'
        });
      }
    };
    fetchUser();
  }, []);

  // Set up the presence channel once — never torn down due to isEditing changes
  useEffect(() => {
    if (!activeWorkspace || !currentUser || !userProfile) return;

    const supabase = createClient();
    const channelId = `workspace_presence_${activeWorkspace.id}`;

    const colors = [
      'bg-indigo-500 text-white',
      'bg-emerald-500 text-white',
      'bg-sky-500 text-white',
      'bg-rose-500 text-white',
      'bg-amber-500 text-white',
      'bg-violet-500 text-white'
    ];
    const hash = userProfile.fullName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const myColor = colors[hash % colors.length];

    const presenceChannel = supabase.channel(channelId);
    presenceChannelRef.current = presenceChannel;

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const joined: any[] = [];
        Object.keys(state).forEach((key) => {
          state[key].forEach((pres: any) => {
            if (!joined.some(u => u.userId === pres.userId)) {
              joined.push(pres);
            }
          });
        });
        setOnlineUsers(joined);
      })
      .subscribe(async (status: REALTIME_SUBSCRIBE_STATES) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({
            userId: currentUser.id,
            fullName: userProfile.fullName,
            activePage: `/leads/${id}`,
            activeLeadId: id,
            editingLeadId: null,
            color: myColor
          });
        }
      });

    return () => {
      presenceChannelRef.current = null;
      presenceChannel.unsubscribe();
      supabase.removeChannel(presenceChannel);
    };
  }, [activeWorkspace, currentUser, userProfile, id]);

  // Re-track editing state without tearing down the channel
  useEffect(() => {
    const ch = presenceChannelRef.current;
    if (!ch || !currentUser) return;
    ch.track({
      userId: currentUser.id,
      fullName: userProfile?.fullName ?? '',
      activePage: `/leads/${id}`,
      activeLeadId: id,
      editingLeadId: isEditing ? id : null,
    }).catch(() => {});
  }, [isEditing, currentUser, userProfile, id]);

  const editors = onlineUsers.filter(
    (u) => u.userId !== currentUser?.id && u.editingLeadId === id
  );
  const viewers = onlineUsers.filter(
    (u) => u.userId !== currentUser?.id && u.activeLeadId === id && u.editingLeadId !== id
  );

  const isLocked = editors.length > 0;

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

  // Team members for "Assigner à"
  interface TeamMember { id: string; email: string; full_name: string; role: string }
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const res = await fetch(getApiUrl('/api/team/members'));
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) setTeamMembers(data);
        }
      } catch (e) {
        console.error('Error fetching team members:', e);
      }
    };
    fetchTeamMembers();
  }, []);

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
      const res = await fetch(getApiUrl('/api/send-email'), {
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
        alert(data.error || t('lead.send_email_error'));
      }
    } catch (err) {
      console.error("Error sending email:", err);
      alert(t('lead.send_email_conn_error'));
    }
    setSendingEmail(false);
  };

  const handleExportPdf = async (noteContent: string, noteType: string) => {
    if (!lead) return;
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj && electronObj.printToPdf) {
      try {
        const defaultFileName = `${lead.businessName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_audit_${noteType}.pdf`;
        const title = noteContent.startsWith('#') 
          ? noteContent.split('\n')[0].replace('#', '').trim() 
          : `Rapport d'Audit - ${lead.businessName}`;
          
        const cleanContent = noteContent.startsWith('#')
          ? noteContent.split('\n').slice(1).join('\n').trim()
          : noteContent;

        const formattedHtml = `
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                  padding: 50px;
                  color: #26251e;
                  line-height: 1.6;
                  background: white;
                }
                .header {
                  border-bottom: 2px solid #059669;
                  padding-bottom: 20px;
                  margin-bottom: 30px;
                }
                h1 {
                  font-size: 24px;
                  font-weight: 800;
                  color: #26251e;
                  margin: 0 0 10px 0;
                  letter-spacing: -0.025em;
                }
                .meta {
                  font-size: 11px;
                  color: #7a7a76;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
                }
                .content {
                  font-size: 13px;
                  white-space: pre-wrap;
                  color: #3f3f3a;
                }
                .footer {
                  margin-top: 60px;
                  font-size: 10px;
                  color: #7a7a76;
                  text-align: center;
                  border-t: 1px solid #e5e5e0;
                  padding-top: 20px;
                  font-weight: 500;
                }
              </style>
            </head>
            <body>
              <div class="header">
                <div class="meta">MINERVA OS REACH LITE · RAPPORT PROFESSIONNEL</div>
                <h1>${title}</h1>
                <div class="meta">Prospect : ${lead.businessName} · Date : ${new Date().toLocaleDateString('fr-FR')}</div>
              </div>
              <div class="content">${cleanContent}</div>
              <div class="footer">Document généré via l'application de bureau native Minerva OS Reach Lite</div>
            </body>
          </html>
        `;

        const result = await electronObj.printToPdf(defaultFileName, formattedHtml);
        if (result && result.success) {
          alert("Rapport PDF exporté avec succès !");
          addNoteToLead(lead.id, `[Desktop] Audit SEO exporté en PDF : ${result.filePath}`, 'general');
        }
      } catch (err) {
        console.error("Error generating PDF:", err);
        alert("Erreur lors de la génération du PDF.");
      }
    }
  };

  const handleExportToDrive = async (contentToExport: string) => {
    if (!lead || !contentToExport.trim()) return;
    setExportingDrive(true);
    
    // Check if running inside Electron for local file saving dialog
    const electronObj = typeof window !== 'undefined' && (window as any).electron;
    if (electronObj && electronObj.exportAudit) {
      try {
        const defaultFileName = getExportFileName(lead.businessName);
        const result = await electronObj.exportAudit(defaultFileName, contentToExport);
        if (result && result.success) {
          alert(t('lead.export_local_success').replace('{filePath}', result.filePath));
          addNoteToLead(lead.id, `[Desktop] Audit SEO exporté localement : ${result.filePath}`, 'general');
        }
      } catch (err) {
        console.error("Error exporting locally in Electron:", err);
        alert("Erreur lors de l'exportation locale de l'audit.");
      }
      setExportingDrive(false);
      return;
    }

    try {
      const defaultFileName = getExportFileName(lead.businessName);
      const res = await fetch(getApiUrl('/api/export-drive'), {
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
        alert(t('lead.drive_export_success').replace('{fileName}', data.fileName));
        const logText = data.simulated 
          ? `[Simulé] Audit SEO exporté avec succès sur Google Drive (mode bac à sable) :\nFichier : ${data.fileName}` 
          : `Audit SEO exporté avec succès sur Google Drive (compte ${googleEmail || 'connecté'}) :\nFichier : ${data.fileName}`;
        addNoteToLead(lead.id, logText, 'general');
      } else {
        alert(data.error || t('lead.drive_export_error'));
      }
    } catch (err) {
      console.error("Error exporting to Google Drive:", err);
      alert(t('lead.drive_export_conn_error'));
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
      const res = await fetch(getApiUrl('/api/generate-draft'), {
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
        <h2 className="text-lg font-bold">{t('lead.not_found_title')}</h2>
        <p className="text-xs text-muted-foreground mt-1">{t('lead.not_found_desc')}</p>
        <Button asChild size="sm" className="mt-5">
          <Link href="/leads" className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            {t('lead.back_to_portfolio')}
          </Link>
        </Button>
      </div>
    );
  }

  const handleSaveProperty = <K extends keyof Lead>(field: K, value: Lead[K]) => {
    updateLead(lead.id, { [field]: value });
  };

  const handleCapturePhoto = async () => {
    const photoBase64 = await takePhoto();
    if (photoBase64) {
      handleSaveProperty('imageUrl', photoBase64);
    }
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
              <span>{t('lead.back_to_portfolio')}</span>
            </Link>
          </Button>
          <div className="text-[10px] text-muted-foreground font-mono">
            {t('lead.last_updated')} {new Date(lead.updatedAt).toLocaleString('fr-FR')}
          </div>
        </div>

        {/* Anti-collision Warn Alerts */}
        {editors.length > 0 && (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-200 shadow-sm font-sans">
            <span className="text-base">🛑</span>
            <div>
              {t('lead.collision_warning_editor').replace('{users}', editors.map((u) => u.fullName).join(', '))}
            </div>
          </div>
        )}

        {editors.length === 0 && viewers.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-4 text-xs font-medium flex items-center gap-2.5 animate-in fade-in duration-200 shadow-sm font-sans">
            <span className="text-base">⚠️</span>
            <div>
              {t('lead.collision_warning_viewer').replace('{users}', viewers.map((u) => u.fullName).join(', '))}
            </div>
          </div>
        )}

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
                disabled={isLocked}
                onEditStateChange={setIsEditing}
              />
              <p className="text-xs text-muted-foreground px-0.5">
                {t('lead.created_at')} {new Date(lead.createdAt).toLocaleDateString('fr-FR')} • {t('lead.owner')} {lead.owner}
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
                  {t('lead.notes_tab')} ({lead.notes?.length || 0})
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
                  {t('lead.ai_writer_tab')} ({drafts.length})
                </button>
              </div>

              {activeTab === 'notes' ? (
                <div className="space-y-6">
                  {/* Add Note Form */}
                  <form onSubmit={handleAddNote} className="space-y-3 bg-secondary/10 border border-border/80 p-4 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-semibold">{t('lead.activity_type')}</span>
                      <Select
                        value={noteType}
                        onValueChange={(val: Note['type']) => setNoteType(val)}
                        disabled={isLocked}
                      >
                        <SelectTrigger className="h-7 w-[110px] text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="text-xs">
                          <SelectItem value="visit" className="text-xs">{t('lead.activity_visit')}</SelectItem>
                          <SelectItem value="call" className="text-xs">{t('lead.activity_call')}</SelectItem>
                          <SelectItem value="email" className="text-xs">{t('lead.activity_email')}</SelectItem>
                          <SelectItem value="general" className="text-xs">{t('lead.activity_general')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea 
                      placeholder={t('lead.note_placeholder')}
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      className="text-xs min-h-[70px] resize-y bg-background"
                      required
                      disabled={isLocked}
                      onFocus={() => setIsEditing(true)}
                      onBlur={() => setIsEditing(false)}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" className="h-8 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/90" disabled={isLocked}>
                        <Plus className="h-3.5 w-3.5" />
                        <span>{t('lead.add_note_btn')}</span>
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
                              {note.type === 'visit' ? t('lead.activity_visit') : note.type === 'call' ? t('lead.activity_call') : note.type === 'email' ? t('lead.activity_email') : t('lead.activity_general')}
                            </Badge>
                            <div className="flex items-center gap-2">
                              {typeof window !== 'undefined' && (window as any).electron && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleExportPdf(note.content, note.type)}
                                  className="h-6 text-[9px] font-bold text-[#059669] hover:bg-[#059669]/10 px-2 rounded flex items-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>PDF</span>
                                </Button>
                              )}
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
                          </div>
                          <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                            {note.content}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-border rounded-lg">
                        <ClipboardList className="h-5 w-5 text-muted-foreground/45 mb-1.5" />
                        <span className="text-[11px] text-muted-foreground">{t('lead.no_notes')}</span>
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
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('lead.prospecting_channel')}</label>
                        <Select
                          value={draftChannel}
                          onValueChange={(val: 'Email' | 'DM' | 'Call') => setDraftChannel(val)}
                          disabled={isLocked}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value="Email" className="text-xs">✉️ {t('lead.channel_email')}</SelectItem>
                            <SelectItem value="DM" className="text-xs">📱 {t('lead.channel_dm')}</SelectItem>
                            <SelectItem value="Call" className="text-xs">📞 {t('lead.channel_call')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Tone Selection */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('lead.style_tone')}</label>
                        <Select
                          value={draftTone}
                          onValueChange={(val) => setDraftTone(val)}
                          disabled={isLocked}
                        >
                          <SelectTrigger className="h-8 text-xs bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="text-xs">
                            <SelectItem value="Calme & Conseil" className="text-xs">😌 {t('lead.tone_calm')}</SelectItem>
                            <SelectItem value="Direct & Closer" className="text-xs">⚡ {t('lead.tone_direct')}</SelectItem>
                            <SelectItem value="Storytelling" className="text-xs">📖 {t('lead.tone_story')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Specific instructions */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('lead.custom_instructions')}</label>
                      <Textarea 
                        placeholder={t('lead.custom_instructions_placeholder')}
                        value={draftInstructions}
                        onChange={(e) => setDraftInstructions(e.target.value)}
                        className="text-xs min-h-[50px] resize-y bg-background"
                        disabled={isLocked}
                        onFocus={() => setIsEditing(true)}
                        onBlur={() => setIsEditing(false)}
                      />
                    </div>

                    {generating && (
                      <div className="space-y-3 p-4 bg-muted/50 border border-border rounded-lg animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            {t('lead.ai_composer_active')}
                          </span>
                          <span className="text-[9px] font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                            {aiStage === 'thinking' && t('lead.ai_thinking')}
                            {aiStage === 'reading' && t('lead.ai_reading')}
                            {aiStage === 'writing' && t('lead.ai_writing')}
                            {aiStage === 'done' && t('lead.ai_done')}
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
                        disabled={generating || isLocked}
                        className="h-8.5 text-xs font-semibold gap-1.5 bg-primary hover:bg-primary/95 text-primary-foreground transition-all"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            <span>{t('lead.generating_draft')}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>{t('lead.generate_draft_btn')}</span>
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
                          {t('lead.ai_draft_generated')}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={exportingDrive}
                            onClick={() => handleExportToDrive(generatedContent)}
                            className="h-7 text-[10px] font-semibold px-2 text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                            title={typeof window !== 'undefined' && (window as any).electron ? t('lead.export_local') : t('lead.save_to_drive')}
                          >
                            {exportingDrive ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : typeof window !== 'undefined' && (window as any).electron ? (
                              <HardDrive className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Cloud className="h-3.5 w-3.5 text-primary" />
                            )}
                            <span>{typeof window !== 'undefined' && (window as any).electron ? t('lead.export_local') : t('lead.save_to_drive')}</span>
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
                        disabled={isLocked}
                        onFocus={() => setIsEditing(true)}
                        onBlur={() => setIsEditing(false)}
                      />
                      
                      {/* Send button panel */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-border/40">
                        <div className="text-[10px] text-muted-foreground">
                          {checkingGmail ? (
                            <span>{t('lead.checking_gmail')}</span>
                          ) : gmailConnected ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              ✓ {t('lead.gmail_connected')} ({googleEmail})
                            </span>
                          ) : (
                            <span className="text-amber-600 dark:text-amber-400">
                              ⚠ {t('lead.gmail_not_connected')}
                            </span>
                          )}
                        </div>
                        <Button
                          onClick={handleSendEmail}
                          disabled={sendingEmail || !lead.contactEmail || isLocked}
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
                              <span>{t('lead.send_via_gmail')}</span>
                            </>
                          )}
                        </Button>
                      </div>
                      
                      <p className="text-[10px] text-muted-foreground italic">
                        {t('lead.draft_auto_saved')}
                      </p>
                    </div>
                  )}

                  {/* History of drafts */}
                  <div className="space-y-3.5">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('lead.drafts_history')}</h4>
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
                                  {draft.channel === 'Email' ? `✉️ ${t('lead.channel_email')}` : draft.channel === 'DM' ? `📱 ${t('lead.channel_dm')}` : `📞 ${t('lead.channel_call')}`}
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
                                  title={typeof window !== 'undefined' && (window as any).electron ? t('lead.export_local') : t('lead.save_to_drive')}
                                >
                                  {typeof window !== 'undefined' && (window as any).electron ? (
                                    <HardDrive className="h-3.5 w-3.5" />
                                  ) : (
                                    <Cloud className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setGeneratedContent(draft.content)}
                                  className="h-6.5 w-6.5 text-muted-foreground hover:text-foreground"
                                  title="Ouvrir dans l'éditeur"
                                  disabled={isLocked}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteDraft(draft.id)}
                                  className="h-6.5 w-6.5 text-muted-foreground hover:text-red-500"
                                  title="Supprimer"
                                  disabled={isLocked}
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
                        <span className="text-[11px] text-muted-foreground">{t('lead.no_drafts')}</span>
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
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-4">{t('lead.properties_title')}</h4>
              
              <div className="space-y-4">
                {/* Status selector */}
                <div className="grid grid-cols-[100px_1fr] items-center gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                    <Activity className="h-3 w-3" />
                    {t('lead.prop_status')}
                  </span>
                  <Select
                    value={lead.status}
                    onValueChange={(val: Lead['status']) => handleSaveProperty('status', val)}
                    disabled={isLocked}
                  >
                    <SelectTrigger className={cn("h-7 w-full text-xs font-semibold", getStatusColor(lead.status))}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="New" className="text-xs">🔴 {t('lead.status_new')}</SelectItem>
                      <SelectItem value="Contacted" className="text-xs">🟡 {t('lead.status_contacted')}</SelectItem>
                      <SelectItem value="Meeting Booked" className="text-xs">🟣 {t('lead.status_meeting')}</SelectItem>
                      <SelectItem value="Won" className="text-xs">🟢 {t('lead.status_won')}</SelectItem>
                      <SelectItem value="Lost" className="text-xs">⚪ {t('lead.status_lost')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Temperature selector */}
                <div className="grid grid-cols-[100px_1fr] items-center gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                    <Flame className="h-3 w-3" />
                    {t('lead.prop_temperature')}
                  </span>
                  <Select
                    value={lead.temperature}
                    onValueChange={(val: Lead['temperature']) => handleSaveProperty('temperature', val)}
                    disabled={isLocked}
                  >
                    <SelectTrigger className={cn("h-7 w-full text-xs font-semibold", getTemperatureColor(lead.temperature))}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hot" className="text-xs">🔥 {t('lead.temp_hot')}</SelectItem>
                      <SelectItem value="Warm" className="text-xs">☀️ {t('lead.temp_warm')}</SelectItem>
                      <SelectItem value="Cold" className="text-xs">❄️ {t('lead.temp_cold')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Niche */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 h-6">
                    <Building className="h-3 w-3" />
                    {t('lead.prop_niche')}
                  </span>
                  <InlineTextEdit 
                    value={lead.niche} 
                    onSave={(val) => handleSaveProperty('niche', val)}
                    placeholder="ex: Restauration"
                    disabled={isLocked}
                    onEditStateChange={setIsEditing}
                  />
                </div>

                {/* City */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 h-6">
                    <MapPin className="h-3 w-3" />
                    {t('lead.prop_city')}
                  </span>
                  <InlineTextEdit 
                    value={lead.city} 
                    onSave={(val) => handleSaveProperty('city', val)}
                    placeholder="ex: Lyon"
                    disabled={isLocked}
                    onEditStateChange={setIsEditing}
                  />
                </div>

                {/* Contact Name */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 h-6">
                    <User className="h-3 w-3" />
                    {t('lead.prop_contact')}
                  </span>
                  <InlineTextEdit 
                    value={lead.contactName} 
                    onSave={(val) => handleSaveProperty('contactName', val)}
                    placeholder="Nom du gérant"
                    disabled={isLocked}
                    onEditStateChange={setIsEditing}
                  />
                </div>

                {/* Contact Email */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 h-6">
                    <Mail className="h-3 w-3" />
                    {t('lead.prop_email')}
                  </span>
                  <InlineTextEdit 
                    value={lead.contactEmail || ''} 
                    onSave={(val) => handleSaveProperty('contactEmail', val)}
                    placeholder="email@contact.com"
                    disabled={isLocked}
                    onEditStateChange={setIsEditing}
                  />
                </div>

                {/* Source */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 h-6">
                    <Sparkles className="h-3 w-3" />
                    {t('lead.prop_source')}
                  </span>
                  <InlineTextEdit 
                    value={lead.source} 
                    onSave={(val) => handleSaveProperty('source', val)}
                    placeholder="ex: Google Maps"
                    disabled={isLocked}
                    onEditStateChange={setIsEditing}
                  />
                </div>

                {/* Next action */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 h-6">
                    <ArrowRight className="h-3 w-3" />
                    {t('lead.prop_next_action')}
                  </span>
                  <InlineTextEdit 
                    value={lead.nextAction} 
                    onSave={(val) => handleSaveProperty('nextAction', val)}
                    placeholder="ex: Rappeler"
                    disabled={isLocked}
                    onEditStateChange={setIsEditing}
                  />
                </div>

                {/* Next action date */}
                <div className="grid grid-cols-[100px_1fr] items-center gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {t('lead.prop_next_action_date')}
                  </span>
                  <Input 
                    type="date"
                    value={lead.nextActionDate}
                    onChange={(e) => handleSaveProperty('nextActionDate', e.target.value)}
                    className="h-7 text-xs bg-background py-0.5 px-2"
                    disabled={isLocked}
                  />
                </div>
              </div>

              {/* Assigner à */}
              <div className="pt-4 border-t border-border mt-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  Assigner à
                </span>
                <Select
                  value={lead.assignedTo || '__none__'}
                  onValueChange={(val) => {
                    const newVal = val === '__none__' ? undefined : val;
                    updateLead(lead.id, { assignedTo: newVal });
                  }}
                  disabled={isLocked}
                >
                  <SelectTrigger className="h-7 w-full text-xs bg-background">
                    <SelectValue placeholder="Non assigné" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs text-muted-foreground">Non assigné</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.full_name || m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {lead.assignedTo && (
                  <p className="text-[10px] text-muted-foreground">
                    Assigné à : <span className="font-semibold text-foreground">{teamMembers.find(m => m.id === lead.assignedTo)?.full_name || teamMembers.find(m => m.id === lead.assignedTo)?.email || 'Membre'}</span>
                  </p>
                )}
              </div>

              {/* Actions terrain */}
              <div className="pt-4 border-t border-border mt-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Actions terrain</span>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 justify-start"
                    onClick={() => {
                      const url = lead.mapsUrl
                        ? lead.mapsUrl
                        : `https://www.google.com/maps/search/${encodeURIComponent((lead.businessName || '') + ' ' + (lead.city || ''))}`;
                      window.open(url, '_blank');
                    }}
                  >
                    <MapPin className="h-3.5 w-3.5 text-rose-500" />
                    Voir sur Google Maps
                    <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1.5 justify-start"
                    onClick={() => { window.location.href = '/services'; }}
                  >
                    <Tag className="h-3.5 w-3.5 text-emerald-600" />
                    Présenter une offre
                    <ExternalLink className="h-3 w-3 ml-auto text-muted-foreground" />
                  </Button>
                </div>
              </div>

              {/* Storefront Photo Section */}
              <div className="pt-5 border-t border-border mt-5 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Camera className="h-3 w-3" />
                  {t('lead.photo_section')}
                </span>
                
                {lead.imageUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-border group bg-muted aspect-video flex items-center justify-center">
                    <img 
                      src={lead.imageUrl} 
                      alt={t('lead.photo_alt')} 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button 
                        type="button"
                        variant="secondary" 
                        size="xs" 
                        onClick={handleCapturePhoto}
                        className="h-7 text-[10px] font-semibold"
                        disabled={isLocked}
                      >
                        {t('lead.change_photo')}
                      </Button>
                      <Button 
                        type="button"
                        variant="destructive" 
                        size="xs" 
                        onClick={() => handleSaveProperty('imageUrl', '')}
                        className="h-7 text-[10px] font-semibold bg-red-600 hover:bg-red-700 text-white"
                        disabled={isLocked}
                      >
                        {t('lead.delete_photo')}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    onClick={() => {
                      if (!isLocked) {
                        handleCapturePhoto();
                      }
                    }}
                    className={cn(
                      "border border-dashed border-border hover:border-primary/50 hover:bg-secondary/10 rounded-lg p-6 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all",
                      isLocked && "cursor-not-allowed opacity-50 hover:bg-transparent hover:border-transparent"
                    )}
                  >
                    <Camera className="h-5 w-5 text-muted-foreground" />
                    <span className="text-[10px] font-medium text-muted-foreground">{t('lead.take_photo_btn')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LeadDetailClient;
