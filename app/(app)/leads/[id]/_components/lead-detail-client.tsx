'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import { usePersonas } from '@/lib/use-personas';
import { takePhoto } from '@/lib/native-bridge';
import { getApiUrl } from '@/lib/api-helper';
import { Lead, Note, LeadLocation, GooglePlaceData } from '@/lib/mock-data';
import { computeLeadScoreV2 } from '@/lib/lead-score';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LeadDealCommissionCard } from '@/components/lead-deal-commission-card';
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
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
  Save,
  Cloud,
  Camera,
  HardDrive,
  Tag,
  ExternalLink,
  FileSignature,
  X,
  FileOutput,
  Zap,
  Target,
  DollarSign,
  TrendingUp,
  Star,
  Phone,
  Globe,
  Share2,
  Link as LinkIcon,
  UserPlus,
  Reply,
  CheckSquare,
  CalendarCheck,
  Dog,
  Accessibility,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { GmailIcon, GoogleCalendarIcon, GoogleMapsIcon, InstagramIcon, FacebookIcon } from '@/components/icons';
import { OutreachPanel } from './outreach-panel';
import { GoogleConnectModal } from '@/components/google-connect-modal';
import { TimelineRoot } from '@/app/(app)/leads/timeline/_components/timeline-root';
import { CadenceTimeline } from './cadence-timeline';
import { LeadProgramsBadge } from './lead-programs-badge';
import { LeadEnrichmentReviewBanner } from './lead-enrichment-review-banner';
import { MediaLightboxGrid } from '@/components/media-lightbox';

function cleanMarkdownForPreview(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/\*\*\*/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/^#+\s+/gm, '')
    .trim();
}


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

const DEFAULT_SERVICES = [
  { name: "Création de Site Web Adapté", description: "Design et développement d'un site web moderne, optimisé pour les mobiles et le référencement local.", price: 1500, selected: true },
  { name: "Optimisation Fiche Google Maps (GMB)", description: "Revendication, configuration des services, photos, mots-clés et automatisation des avis clients.", price: 450, selected: true },
  { name: "Gestion de Réputation (Avis Clients)", description: "Système automatisé de collecte et relance des avis clients par SMS/Email pour améliorer la note moyenne.", price: 350, selected: false },
  { name: "Campagne de Prospection Locale (Outreach)", description: "Mise en place de campagnes d'emails personnalisés ciblant vos clients idéaux pour générer des rendez-vous.", price: 800, selected: false },
];

function buildExecutiveSummary(lead: Lead): string {
  const hasNoWebsite = !lead.website;
  const hasBadRating = lead.rating !== undefined && lead.rating < 4.0;
  const parts: string[] = [];
  
  parts.push(
    `Analyse de la présence numérique de ${lead.businessName} située à ${lead.city || 'votre région'}.`
  );
  if (hasNoWebsite) {
    parts.push(
      `L'absence de site web constitue un frein majeur pour capter la clientèle locale qui recherche activement vos services en ligne.`
    );
  } else {
    parts.push(
      `Le site web actuel présente d'importantes opportunités d'optimisation technique pour améliorer le positionnement local.`
    );
  }
  if (hasBadRating) {
    parts.push(
      `La e-réputation (note Google Maps de ${lead.rating?.toFixed(1)}/5) est un axe prioritaire pour restaurer la confiance des clients.`
    );
  }
  parts.push(
    `Cette proposition contient un plan d'action clé en main et transparent pour accélérer votre croissance.`
  );
  return parts.join(' ');
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
        className={cn("h-7 text-xs bg-[#fafaf8] py-0.5 px-2", inputClassName)}
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
        "cursor-pointer hover:bg-[#f4f4f3]/60 px-1 py-0.5 rounded border border-transparent hover:border-[#e5e5e0]/70 transition-all text-xs min-h-6 flex items-center min-w-0 break-all",
        !value && "text-[#8A9098] italic",
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

function ScoreBar({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#8A9098]">{label}</span>
        <span className="text-[10px] font-bold" style={{ color }}>{value}/100</span>
      </div>
      <div className="h-1.5 bg-[#f4f4f3] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function BantCheckbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold border transition-all',
        checked
          ? 'bg-[#167f5b]/10 border-[#167f5b]/30 text-[#167f5b]'
          : 'bg-[#f4f4f3]/60 border-[#e5e5e0] text-[#8A9098]'
      )}
    >
      <span className={cn('w-3 h-3 rounded-sm border flex items-center justify-center shrink-0', checked ? 'bg-[#167f5b] border-[#167f5b]' : 'border-muted-foreground/40')}>
        {checked && <Check className="w-2 h-2 text-white" />}
      </span>
      {label}
    </button>
  );
}

function ScriptPanel({ lead }: { lead: Lead }) {
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState<string | null>(null);
  const [scraped, setScraped] = useState(false);
  const [open, setOpen] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setOpen(true);
    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: lead.businessName,
          niche: lead.niche,
          city: lead.city,
          website: lead.website,
          websiteDescription: lead.websiteDescription,
          phone: lead.phone,
          rating: lead.rating,
          reviewsCount: lead.reviewsCount,
          temperature: lead.temperature,
          contactName: lead.contactName,
          notes: lead.notes?.slice(-3),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setScript(data.script);
        setScraped(data.scraped);
      } else {
        setScript('Erreur lors de la génération du script.');
      }
    } catch {
      setScript('Erreur réseau lors de la génération.');
    }
    setLoading(false);
  };

  const handleCopy = async () => {
    if (!script) return;
    await navigator.clipboard.writeText(script);
    toast.success('Script copié !');
  };

  return (
    <div className="pt-4 border-t border-[#e5e5e0] mt-4 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] flex items-center gap-1.5">
          <FileSignature className="h-3 w-3" />
          Script de Pitch
        </h4>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border border-[#167f5b]/30 text-[#167f5b] bg-[#167f5b]/5 hover:bg-[#167f5b]/10 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Zap className="w-2.5 h-2.5" />}
          Générer
        </button>
      </div>

      {open && (
        <div className="rounded-md border border-[#e5e5e0] bg-[#f4f4f3]/40 p-3 space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 text-[10px] text-[#8A9098]">
              <Loader2 className="h-3 w-3 animate-spin" />
              {lead.website ? 'Analyse du site web + génération…' : 'Génération du script…'}
            </div>
          ) : script ? (
            <>
              {scraped && (
                <p className="text-[9px] text-[#167f5b] font-medium flex items-center gap-1">
                  <Globe className="h-2.5 w-2.5" />
                  Basé sur le site web
                </p>
              )}
              <div className="text-[11px] text-[#14171A] leading-relaxed whitespace-pre-wrap">{cleanMarkdownForPreview(script)}</div>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[9px] text-[#8A9098] hover:text-[#14171A] transition-colors"
              >
                <Copy className="h-2.5 w-2.5" />
                Copier le script
              </button>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

function QualificationPanel({ lead, onSave }: { lead: Lead; onSave: (fields: Partial<Lead>) => void }) {
  const [loading, setLoading] = useState(false);
  const [advEnriching, setAdvEnriching] = useState(false);
  const [advResult, setAdvResult] = useState<{ techStack?: string[]; webPresenceScore?: number; companySizeEstimate?: string; enrichedLogo?: string } | null>(null);
  const [dmName, setDmName] = useState(lead.decisionMakerName || '');
  const [dmRole, setDmRole] = useState(lead.decisionMakerRole || '');

  useEffect(() => { setDmName(lead.decisionMakerName || ''); }, [lead.decisionMakerName]);
  useEffect(() => { setDmRole(lead.decisionMakerRole || ''); }, [lead.decisionMakerRole]);

  const handleEnrich = async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl('/api/enrich-contact'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          website: lead.website,
          businessName: lead.businessName,
          contactName: lead.contactName,
          city: lead.city,
          niche: lead.niche,
          rating: lead.rating,
          reviewsCount: lead.reviewsCount,
          socialLinks: lead.socialLinks,
          photos: lead.photos,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const fields: Partial<Lead> = {
          fitScore: data.fitScore,
          intentScore: data.intentScore,
        };
        if (data.foundEmail && !lead.contactEmail) {
          fields.contactEmail = data.foundEmail;
        }
        if (data.suggestedEmails?.length) fields.suggestedEmails = data.suggestedEmails;
        if (data.decisionMakerName) { fields.decisionMakerName = data.decisionMakerName; setDmName(data.decisionMakerName); }
        if (data.decisionMakerRole) { fields.decisionMakerRole = data.decisionMakerRole; setDmRole(data.decisionMakerRole); }
        if (data.websiteDescription) fields.websiteDescription = data.websiteDescription;
        if (data.companyVibe) fields.companyVibe = data.companyVibe;
        if (data.opportunityScore !== undefined) fields.score = data.opportunityScore;
        onSave(fields);
        toast.success("Enrichissement réussi ! Contacts et pitch d'appel mis à jour.");
      } else {
        toast.error("Échec de l'enrichissement.");
      }
    } catch {
      toast.error('Impossible de contacter le serveur pour l\'enrichissement. Vérifiez votre connexion.');
    }
    setLoading(false);
  };

  const handleAdvancedEnrich = async () => {
    if (!lead.website) { toast.error("Aucun site web pour cet enrichissement."); return; }
    setAdvEnriching(true);
    try {
      const res = await fetch(getApiUrl('/api/leads/enrich-advanced'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      if (res.ok) {
        const data = await res.json();
        setAdvResult({
          techStack: typeof data.techStack === 'string' ? JSON.parse(data.techStack) : data.techStack,
          webPresenceScore: data.webPresenceScore,
          companySizeEstimate: data.companySizeEstimate,
          enrichedLogo: data.enrichedLogo,
        });
        toast.success("Enrichissement avancé terminé !");
      } else {
        toast.error("Échec de l'enrichissement avancé.");
      }
    } catch { toast.error('Connexion impossible. Vérifiez votre internet et réessayez.'); }
    finally { setAdvEnriching(false); }
  };

  const hasData = lead.fitScore !== undefined || lead.intentScore !== undefined || lead.suggestedEmails?.length || lead.decisionMakerName;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Qualification</h4>
        <div className="flex items-center gap-1">
          <button
            onClick={handleAdvancedEnrich}
            disabled={advEnriching || !lead.website}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors disabled:opacity-50"
            title="Enrichissement avancé : logo, taille, tech stack"
          >
            {advEnriching ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Globe className="w-2.5 h-2.5" />}
            Avancé
          </button>
          <button
            onClick={handleEnrich}
            disabled={loading}
            className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border border-[#167f5b]/30 text-[#167f5b] bg-[#167f5b]/5 hover:bg-[#167f5b]/10 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Zap className="w-2.5 h-2.5" />}
            Enrichir
          </button>
        </div>
      </div>

      {/* Advanced enrichment result */}
      {advResult && (
        <div className="rounded-lg border border-purple-100 bg-purple-50/50 p-2.5 space-y-1.5">
          {advResult.enrichedLogo && (
            // eslint-disable-next-line @next/next/no-img-element
            <div className="flex items-center gap-2">
              <img src={advResult.enrichedLogo} alt="logo" className="w-6 h-6 rounded" />
              <span className="text-[10px] text-[#8A9098]">Logo détecté</span>
            </div>
          )}
          {advResult.companySizeEstimate && (
            <div className="flex items-center gap-1.5">
              <Building className="w-3 h-3 text-purple-500" />
              <span className="text-[10px] font-semibold text-[#14171A]">
                {{ solo: 'Solo', small: 'Petite (2–10)', medium: 'Moyenne (11–50)', large: 'Grande (50+)' }[advResult.companySizeEstimate] || advResult.companySizeEstimate}
              </span>
            </div>
          )}
          {advResult.webPresenceScore !== undefined && (
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-[#8A9098]">Présence web</span>
                <span className="text-[9px] font-bold text-purple-700">{advResult.webPresenceScore}/100</span>
              </div>
              <div className="w-full h-1 bg-purple-100 rounded-full">
                <div className="h-1 bg-purple-500 rounded-full" style={{ width: `${advResult.webPresenceScore}%` }} />
              </div>
            </div>
          )}
          {advResult.techStack && advResult.techStack.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {advResult.techStack.map(t => (
                <span key={t} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200">{t}</span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Scores */}
      {(lead.fitScore !== undefined || lead.intentScore !== undefined) && (
        <div className="space-y-2">
          {lead.fitScore !== undefined && <ScoreBar value={lead.fitScore} color="#167f5b" label="Fit digital" />}
          {lead.intentScore !== undefined && <ScoreBar value={lead.intentScore} color="#3b82f6" label="Signal d'intérêt" />}
        </div>
      )}

      {/* BANT */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-wider text-[#8A9098]/60 mb-1.5">BANT</p>
        <div className="flex flex-wrap gap-1.5">
          <BantCheckbox label="Budget" checked={!!lead.bantBudget} onChange={(v) => onSave({ bantBudget: v })} />
          <BantCheckbox label="Authority" checked={!!lead.bantAuthority} onChange={(v) => onSave({ bantAuthority: v })} />
          <BantCheckbox label="Need" checked={!!lead.bantNeed} onChange={(v) => onSave({ bantNeed: v })} />
          <BantCheckbox label="Timing" checked={!!lead.bantTiming} onChange={(v) => onSave({ bantTiming: v })} />
        </div>
      </div>

      {/* Decision maker */}
      <div className="space-y-1.5">
        <p className="text-[9px] font-bold uppercase tracking-wider text-[#8A9098]/60">Décideur</p>
        <div className="flex gap-1.5">
          <input
            value={dmName}
            onChange={(e) => setDmName(e.target.value)}
            onBlur={() => { if (dmName !== lead.decisionMakerName) onSave({ decisionMakerName: dmName }); }}
            placeholder="Prénom Nom"
            className="flex-1 h-6 text-[10px] px-2 border border-[#e5e5e0] rounded bg-[#fafaf8] focus:outline-none focus:ring-1 focus:ring-[#167f5b]/40"
          />
          <input
            value={dmRole}
            onChange={(e) => setDmRole(e.target.value)}
            onBlur={() => { if (dmRole !== lead.decisionMakerRole) onSave({ decisionMakerRole: dmRole }); }}
            placeholder="Propriétaire"
            className="w-24 h-6 text-[10px] px-2 border border-[#e5e5e0] rounded bg-[#fafaf8] focus:outline-none focus:ring-1 focus:ring-[#167f5b]/40"
          />
        </div>
      </div>

      {/* Suggested emails */}
      {lead.suggestedEmails && lead.suggestedEmails.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-[#8A9098]/60">Emails suggérés</p>
          <div className="flex flex-wrap gap-1">
            {lead.suggestedEmails.map((email) => (
              <button
                key={email}
                onClick={() => onSave({ contactEmail: email })}
                title="Définir comme email principal"
                className={cn(
                  'text-[9px] px-1.5 py-0.5 rounded border font-mono transition-all',
                  lead.contactEmail === email
                    ? 'bg-[#167f5b]/10 border-[#167f5b]/30 text-[#167f5b]'
                    : 'bg-[#f4f4f3]/60 border-[#e5e5e0] text-[#8A9098] hover:border-[#167f5b]/30 hover:text-[#14171A]'
                )}
              >
                {email}
              </button>
            ))}
          </div>
        </div>
      )}

      {!hasData && (
        <p className="text-[10px] text-[#8A9098] italic">Cliquez sur "Enrichir" pour calculer les scores et suggérer des emails.</p>
      )}
    </div>
  );
}

function TagInputInline({ onAdd }: { onAdd: (tag: string) => void }) {
  const [val, setVal] = useState('');
  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        value={val}
        onChange={e => setVal(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && val.trim()) {
            onAdd(val.trim());
            setVal('');
          }
        }}
        placeholder="+ Ajouter un tag…"
        className="flex-1 h-6 text-[10px] border border-[#e5e5e0] rounded px-2 bg-[#fafaf8] focus:outline-none focus:ring-1 focus:ring-[#167f5b]/40"
      />
    </div>
  );
}

export function LeadDetailClient({ id }: { id: string }) {
  const { leads, updateLead, addNoteToLead, campaigns, projects, activeWorkspace, updateWorkspace, addTask, addNotification, user } = useReach();
  const { t } = useLanguage();

  // Look up lead
  const lead = leads.find((l) => l.id === id);

  const { personas } = usePersonas(activeWorkspace?.id);
  const leadPersona = personas?.find(p => p.targetNiches.includes(lead?.niche || '') || p.targetCities.includes(lead?.city || ''));

  // States for new note form
  const [noteType, setNoteType] = useState<Note['type']>('general');
  const [noteContent, setNoteContent] = useState('');

  // Website scraper state
  const [scrapingSite, setScrapingSite] = useState(false);
  const [scrapeError, setScrapeError] = useState('');

  // Custom columns state
  const [addingCustomField, setAddingCustomField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');

  // Multiple locations state
  const [newLocationAddress, setNewLocationAddress] = useState('');
  const [addingLocation, setAddingLocation] = useState(false);
  const [deletingLocationIndex, setDeletingLocationIndex] = useState<number | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Accordions for right hub
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    actions: true,
    properties: true,
    intelligence: true,
    field: false,
  });

  const toggleAccordion = (key: string) => {
    setOpenAccordions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (isLocked || !lead) return;

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            handleSaveProperty('imageUrl', event.target.result as string);
            toast.success("Photo de l'établissement mise à jour !");
          }
        };
        reader.readAsDataURL(file);
      } else {
        toast.error("Veuillez déposer un fichier image valide (JPG, PNG, WEBP, etc.).");
      }
    }
  };

  const handleAddLocation = async (addressStr: string) => {
    if (!addressStr.trim() || !lead) return;
    setAddingLocation(true);
    let lat: number | undefined = undefined;
    let lng: number | undefined = undefined;

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressStr.trim())}&limit=1`, {
        headers: { 'User-Agent': 'MinervaOSReachLiteClient/1.0' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json[0]) {
          lat = parseFloat(json[0].lat);
          lng = parseFloat(json[0].lon);
        }
      }
    } catch (e) {
      console.warn('Geocoding new location failed, falling back to jitter:', e);
    }

    if (lat === undefined || lng === undefined) {
      const baseLat = lead.latitude || 45.5019;
      const baseLng = lead.longitude || -73.5674;
      lat = baseLat + (Math.random() - 0.5) * 0.03;
      lng = baseLng + (Math.random() - 0.5) * 0.03;
    }

    const newLoc: LeadLocation = {
      address: addressStr.trim(),
      lat,
      lng
    };

    const current = lead.locations || [];
    handleSaveProperty('locations', [...current, newLoc]);
    setNewLocationAddress('');
    setAddingLocation(false);
    toast.success('Succursale ajoutée avec succès !');
  };

  const handleCreateCustomField = () => {
    if (!newFieldName.trim() || !activeWorkspace || !lead) return;
    const current = activeWorkspace.custom_columns || [];
    if (current.includes(newFieldName.trim())) {
      toast.error('Ce champ existe déjà.');
      return;
    }
    const updated = [...current, newFieldName.trim()];
    updateWorkspace(activeWorkspace.id, { custom_columns: updated });
    setNewFieldName('');
    setAddingCustomField(false);
    toast.success('Champ personnalisé créé');
  };

  const handleSaveCustomField = (colName: string, value: string) => {
    if (!lead) return;
    const nextFields = { ...(lead.customFields || {}), [colName]: value };
    updateLead(lead.id, { customFields: nextFields });
  };

  const handleCopyLeadInfo = () => {
    if (!lead) return;
    
    const lines: string[] = [];
    lines.push(`=== INFORMATIONS DU PROSPECT ===`);
    lines.push(`Nom de l'entreprise : ${lead.businessName}`);
    if (lead.niche) lines.push(`Secteur / Niche : ${lead.niche}`);
    if (lead.city) lines.push(`Ville : ${lead.city}`);
    if (lead.contactName) lines.push(`Nom du contact : ${lead.contactName}`);
    if (lead.decisionMakerRole) lines.push(`Rôle du contact : ${lead.decisionMakerRole}`);
    if (lead.contactEmail) lines.push(`Email : ${lead.contactEmail}`);
    if (lead.phone) lines.push(`Téléphone : ${lead.phone}`);
    if (lead.website) lines.push(`Site web : ${lead.website}`);
    if (lead.address) lines.push(`Adresse complète : ${lead.address}`);
    if (lead.rating !== undefined) lines.push(`Note Google : ${lead.rating}/5 (${lead.reviewsCount || 0} avis)`);
    if (lead.mapsUrl) lines.push(`Lien Google Maps : ${lead.mapsUrl}`);
    if (lead.status) lines.push(`Statut CRM : ${lead.status}`);
    if (lead.temperature) lines.push(`Température : ${lead.temperature}`);
    if (lead.source) lines.push(`Source : ${lead.source}`);
    if (lead.nextAction) lines.push(`Action suivante : ${lead.nextAction} (le ${lead.nextActionDate || 'Non planifié'})`);

    // Field Notes / Contexte
    if (lead.notes && lead.notes.length > 0) {
      lines.push(`\n--- Notes de terrain / Observations ---`);
      lead.notes.forEach((n) => {
        lines.push(`[${new Date(n.createdAt).toLocaleDateString('fr-FR')}] ${n.content}`);
      });
    } else if (lead.websiteDescription) {
      lines.push(`\n--- Description du site (Scraping IA) ---`);
      lines.push(lead.websiteDescription);
    }

    // Social Links
    const social = [];
    if (lead.socialLinks?.instagram) social.push(`Instagram : ${lead.socialLinks.instagram}`);
    if (lead.socialLinks?.facebook) social.push(`Facebook : ${lead.socialLinks.facebook}`);
    if (lead.socialLinks?.linkedin) social.push(`LinkedIn : ${lead.socialLinks.linkedin}`);
    if (social.length > 0) {
      lines.push(`\n--- Réseaux sociaux ---`);
      lines.push(...social);
    }

    // Custom Fields
    if (lead.customFields && Object.keys(lead.customFields).length > 0) {
      lines.push(`\n--- Champs personnalisés ---`);
      Object.entries(lead.customFields).forEach(([k, v]) => {
        if (v) lines.push(`${k} : ${v}`);
      });
    }

    const fullText = lines.join('\n');
    navigator.clipboard.writeText(fullText);
    toast.success('Informations du prospect copiées !');
  };

  // Load workspace and user profile for realtime collaboration
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<{ fullName: string } | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const presenceChannelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  // Unique per-mount suffix prevents "already subscribed" errors on React double-invoke
  const presenceChannelSuffix = useRef(`_${Math.random().toString(36).slice(2, 8)}`);

  // Track last visited lead
  useEffect(() => {
    if (lead?.id) {
      localStorage.setItem('minerva_last_visited_lead_id', lead.id);
    }
  }, [lead?.id]);

  // Auto-enrich with Google Places data on mount
  useEffect(() => {
    if (!lead?.id) return;
    const cached = lead.googlePlaceData;
    if (cached) { setGooglePlaceData(cached); return; }
    setEnrichingGoogle(true);
    fetch(getApiUrl('/api/leads/enrich-google'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leadId: lead.id,
        businessName: lead.businessName,
        city: lead.city,
      }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.ok && d.data) {
          setGooglePlaceData(d.data);
          setGoogleEnrichError(null);
          updateLead(lead.id, {
            rating: lead.rating || d.data.rating || undefined,
            reviewsCount: lead.reviewsCount || d.data.review_count || undefined,
            website: lead.website || d.data.website || undefined,
            phone: lead.phone || d.data.phone || undefined,
            mapsUrl: lead.mapsUrl || `https://www.google.com/maps/place/?q=place_id:${d.data.place_id}`,
            address: lead.address || d.data.formattedAddress || undefined,
          });
        } else if (d.error) {
          setGoogleEnrichError(d.error as string);
        }
      })
      .catch(() => {})
      .finally(() => setEnrichingGoogle(false));
  }, [lead?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-compute and persist score v2 if not yet saved to DB
  useEffect(() => {
    if (!lead || lead.scoreIcp != null) return;
    fetch(getApiUrl('/api/leads/score'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leadId: lead.id, leadData: lead }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.scores) {
          updateLead(lead.id, {
            score: data.scores.total,
            scoreIcp: data.scores.icp,
            scoreEngagement: data.scores.engagement,
            scoreUrgency: data.scores.urgency,
            scoreRevenue: data.scores.revenue,
          });
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id]);

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
    const channelId = `workspace_presence_${activeWorkspace.id}${presenceChannelSuffix.current}`;

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
  const [activeTab, setActiveTab] = useState<'notes' | 'drafts' | 'composer' | 'timeline' | 'gmail' | 'agenda' | 'outreach' | 'reviews'>('notes');
  const prevTabRef = useRef<string>('notes');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [aiStage, setAiStage] = useState<'idle' | 'thinking' | 'reading' | 'writing' | 'done'>('idle');
  const [googlePlaceData, setGooglePlaceData] = useState<GooglePlaceData | null>(null);
  const [enrichingGoogle, setEnrichingGoogle] = useState(false);
  const [googleEnrichError, setGoogleEnrichError] = useState<string | null>(null);
  const [reviewsGoogleConnected, setReviewsGoogleConnected] = useState<boolean | null>(null);
  const [showReviewsConnectModal, setShowReviewsConnectModal] = useState(false);
  const [reviewsCopied, setReviewsCopied] = useState(false);
  const [scrapingMoreReviews, setScrapingMoreReviews] = useState(false);
  const [scrapeReviewsError, setScrapeReviewsError] = useState<string | null>(null);

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
  
  // Gmail threads state (Feature 2)
  const [gmailThreads, setGmailThreads] = useState<Array<{
    id: string;
    subject: string;
    date: string;
    snippet: string;
    unread: boolean;
  }>>([]);
  const [gmailConnectedForTab, setGmailConnectedForTab] = useState<boolean | null>(null);
  const [showGmailConnectModal, setShowGmailConnectModal] = useState(false);
  const [showCalConnectModal, setShowCalConnectModal] = useState(false);
  const [gmailThreadsLoading, setGmailThreadsLoading] = useState(false);
  const [gmailThreadsError, setGmailThreadsError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== 'gmail') return;
    if (!lead?.contactEmail) {
      setGmailConnectedForTab(true);
      setGmailThreads([]);
      return;
    }
    let cancelled = false;
    setGmailThreadsLoading(true);
    setGmailThreadsError(null);
    fetch(getApiUrl(`/api/google/gmail/lead-threads?email=${encodeURIComponent(lead.contactEmail)}`))
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.connected === false) {
          setGmailConnectedForTab(false);
        } else {
          setGmailConnectedForTab(true);
          setGmailThreads(data.threads || []);
          if (data.error) setGmailThreadsError(data.error);
        }
      })
      .catch((err) => {
        if (!cancelled) setGmailThreadsError(err.message);
      })
      .finally(() => {
        if (!cancelled) setGmailThreadsLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab, lead?.contactEmail]);

  // Google account connection status for the "Avis" (reviews) tab — GOOGLE_PLACES_API_KEY
  // itself is a separate server-only credential (checked by the API routes), this only
  // gates whether the tab's UI is shown at all, per product decision.
  useEffect(() => {
    if (activeTab !== 'reviews' || reviewsGoogleConnected !== null) return;
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (!cancelled && reviewsGoogleConnected === null) setReviewsGoogleConnected(false);
    }, 2500);
    fetch(getApiUrl('/api/google/auth/status'), { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setReviewsGoogleConnected(!!data.connected); })
      .catch(() => { if (!cancelled) setReviewsGoogleConnected(false); })
      .finally(() => clearTimeout(timer));
    return () => {
      cancelled = true;
      controller.abort();
      clearTimeout(timer);
    };
  }, [activeTab, reviewsGoogleConnected]);

  const handleCopyAllReviews = useCallback(() => {
    const reviews = googlePlaceData?.reviews || [];
    if (reviews.length === 0) return;
    const text = reviews
      .map((r) => `${'⭐'.repeat(Math.max(1, Math.min(5, Math.round(r.rating || 5))))} ${r.authorName || 'Client'}${r.time ? ` (${r.time})` : ''}\n${r.text}`)
      .join('\n\n---\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setReviewsCopied(true);
      setTimeout(() => setReviewsCopied(false), 2000);
    }).catch(() => {});
  }, [googlePlaceData]);

  const handleScrapeMoreReviews = useCallback(() => {
    if (!lead?.id || scrapingMoreReviews) return;
    setScrapingMoreReviews(true);
    setScrapeReviewsError(null);
    fetch(getApiUrl(`/api/leads/${lead.id}/enrich-google-reviews-scrape`), { method: 'POST' })
      .then((r) => r.json())
      .then((d) => {
        if (d.ok && d.data) {
          setGooglePlaceData(d.data);
        } else {
          setScrapeReviewsError(d.error || 'Échec de la recherche d\'avis supplémentaires.');
        }
      })
      .catch((err) => setScrapeReviewsError(err.message))
      .finally(() => setScrapingMoreReviews(false));
  }, [lead?.id, scrapingMoreReviews]);

  // Google Calendar lead events state (Feature 3)
  const [leadCalEvents, setLeadCalEvents] = useState<Array<{
    id: string;
    summary: string;
    start: string | null;
    end: string | null;
    status: string;
    hangoutLink: string | null;
  }>>([]);
  const [calConnectedForTab, setCalConnectedForTab] = useState<boolean | null>(null);
  const [leadCalLoading, setLeadCalLoading] = useState(false);
  const [leadCalError, setLeadCalError] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab !== 'agenda') return;
    if (!lead?.contactEmail) {
      setCalConnectedForTab(true);
      setLeadCalEvents([]);
      return;
    }
    let cancelled = false;
    setLeadCalLoading(true);
    setLeadCalError(null);
    fetch(getApiUrl(`/api/google/calendar/lead-events?email=${encodeURIComponent(lead.contactEmail)}`))
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.connected === false) {
          setCalConnectedForTab(false);
        } else {
          setCalConnectedForTab(true);
          setLeadCalEvents(data.events || []);
          if (data.error) setLeadCalError(data.error);
        }
      })
      .catch((err) => {
        if (!cancelled) setLeadCalError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLeadCalLoading(false);
      });
    return () => { cancelled = true; };
  }, [activeTab, lead?.contactEmail]);

  // Timeline is now rendered by <TimelineRoot leadId={lead.id} hideSubNav />

  // Composer states
  const [draftChannel, setDraftChannel] = useState<'Email' | 'DM' | 'Call'>('Email');
  const [draftTone, setDraftTone] = useState<string>('Calme & Conseil');
  const [draftInstructions, setDraftInstructions] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [draftError, setDraftError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Personalization variables
  const [customVars, setCustomVars] = useState<Record<string, string>>({});
  const [showVars, setShowVars] = useState(false);
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');

  // Share lead state
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [sharingLead, setSharingLead] = useState(false);
  const [shareLinkCopied, setShareLinkCopied] = useState(false);

  // Proposal Builder state
  const [showProposalBuilder, setShowProposalBuilder] = useState(false);
  const [loadingProposalData, setLoadingProposalData] = useState(false);
  const [exportingProposal, setExportingProposal] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('PROPOSITION COMMERCIALE');
  const [proposalSenderCompany, setProposalSenderCompany] = useState('');
  const [proposalSenderName, setProposalSenderName] = useState('');
  const [proposalRecipientName, setProposalRecipientName] = useState('');
  const [proposalDate, setProposalDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [proposalValidDays, setProposalValidDays] = useState(30);
  const [proposalSummary, setProposalSummary] = useState('');
  const [proposalTaxRate, setProposalTaxRate] = useState(14.975); // combined default for QC
  const [proposalPaymentTerms, setProposalPaymentTerms] = useState('50% à la commande, solde à la livraison. Virement Interac ou bancaire.');
  const [proposalCallToAction, setProposalCallToAction] = useState("Pour accepter cette proposition, répondez directement à ce document ou contactez-nous par courriel.");
  
  interface ProposalService {
    name: string;
    description: string;
    price: number;
    selected: boolean;
  }
  const [proposalServices, setProposalServices] = useState<ProposalService[]>([]);
  const [customServices, setCustomServices] = useState<Omit<ProposalService, 'selected'>[]>([]);
  const [newSvcName, setNewSvcName] = useState('');
  const [newSvcDesc, setNewSvcDesc] = useState('');
  const [newSvcPrice, setNewSvcPrice] = useState('');

  // v4.12.0 — Multi-section proposal builder
  interface ProposalSections {
    intro: string;
    problem: string;
    solution: string;
    pricing: { amount: number; taxRate: number };
    terms: string;
  }
  const [proposalSections, setProposalSections] = useState<ProposalSections>({
    intro: '',
    problem: '',
    solution: '',
    pricing: { amount: 0, taxRate: 14.975 },
    terms: '',
  });
  const [generatingSection, setGeneratingSection] = useState<string | null>(null);
  const [savingProposal, setSavingProposal] = useState(false);

  const generateSection = async (section: 'intro' | 'problem' | 'solution' | 'terms') => {
    if (!lead) return;
    setGeneratingSection(section);
    try {
      const res = await fetch(getApiUrl('/api/proposals/generate-section'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id, section, amount: proposalSections.pricing.amount }),
      });
      const data = await res.json();
      if (res.ok && data.content) {
        setProposalSections(p => ({ ...p, [section]: data.content }));
      } else {
        toast.error(data.error || 'Erreur lors de la génération.');
      }
    } catch {
      toast.error('Connexion impossible. Vérifiez votre internet et réessayez.');
    } finally {
      setGeneratingSection(null);
    }
  };

  const saveProposal = async () => {
    if (!lead) return;
    setSavingProposal(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Vous n\'êtes pas connecté. Actualisez la page pour vous reconnecter.'); return; }
      await supabase.from('proposals').upsert({
        lead_id: lead.id,
        workspace_id: activeWorkspace?.id,
        user_id: user.id,
        title: `Proposition — ${lead.businessName}`,
        amount: proposalSections.pricing.amount,
        section_intro: proposalSections.intro,
        section_problem: proposalSections.problem,
        section_solution: proposalSections.solution,
        section_pricing: proposalSections.pricing,
        section_terms: proposalSections.terms,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'lead_id' });
      toast.success('Proposition sauvegardée.');
    } catch {
      toast.error('La note n\'a pas pu être sauvegardée. Réessayez dans quelques instants.');
    } finally {
      setSavingProposal(false);
    }
  };

  const markProposalSent = async () => {
    if (!lead) return;
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error('Vous n\'êtes pas connecté. Actualisez la page pour vous reconnecter.'); return; }
      await supabase.from('proposals').upsert({
        lead_id: lead.id,
        workspace_id: activeWorkspace?.id,
        user_id: user.id,
        status: 'sent',
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'lead_id' });
      updateLead(lead.id, { status: 'Proposal Sent' });
      toast.success('Lead passé en "Proposition envoyée".');
    } catch {
      toast.error('Une erreur est survenue. Rafraîchissez la page et réessayez.');
    }
  };

  const SECTION_LABELS: Record<string, string> = {
    intro: 'Présentation',
    problem: 'Problème identifié',
    solution: 'Solution proposée',
    terms: 'Modalités',
  };

  const SECTION_PLACEHOLDERS: Record<string, string> = {
    intro: 'Présentation de votre agence et du contexte de cette proposition…',
    problem: 'Quel problème principal avez-vous identifié chez ce client ?',
    solution: 'Décrivez concrètement ce que vous proposez de faire…',
    terms: 'Validité 30 jours, acompte 50%, solde à la livraison…',
  };

  const handleExportProposalPdf = async () => {
    if (!lead) return;
    setExportingProposal(true);
    try {
      const fileName = `${lead.businessName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_proposition.pdf`;
      const dateStr = new Date().toLocaleDateString('fr-CA', { day: '2-digit', month: 'long', year: 'numeric' });
      const amount = proposalSections.pricing.amount;
      const tps = amount * 0.05;
      const tvq = amount * 0.09975;
      const ttc = amount * 1.14975;

      const formattedHtml = `<!DOCTYPE html><html lang="fr"><head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 20mm 15mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 11px; color: #14171A; line-height: 1.6; }
  h1 { font-size: 22px; font-weight: 800; color: #14171A; margin: 0 0 4px; }
  h2 { font-size: 13px; font-weight: 700; color: #167f5b; text-transform: uppercase; letter-spacing: 0.05em; margin: 24px 0 8px; border-bottom: 1px solid #e5e5e0; padding-bottom: 4px; }
  p { margin: 0 0 8px; }
  .header { margin-bottom: 32px; border-bottom: 2px solid #167f5b; padding-bottom: 16px; }
  .meta { font-size: 10px; color: #8A9098; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; }
  td, th { padding: 6px 8px; border: 1px solid #e5e5e0; font-size: 10px; }
  th { background: #f7f7f4; font-weight: 700; }
  .total-row { font-weight: 800; background: #f0fdf4; color: #167f5b; }
  .print-btn { position: fixed; top: 12px; right: 12px; padding: 6px 14px; background: #167f5b; color: #fff; border: none; font-weight: 700; cursor: pointer; border-radius: 6px; font-size: 11px; }
</style>
</head><body>
<button class="print-btn no-print" onclick="window.print()">Imprimer / PDF</button>
<div class="header">
  <h1>PROPOSITION COMMERCIALE</h1>
  <p class="meta">Adressé à : ${lead.contactName || lead.businessName} · ${lead.city}</p>
  <p class="meta">Date : ${dateStr} · Validité : 30 jours</p>
</div>
${proposalSections.intro ? `<h2>Présentation</h2><p>${proposalSections.intro.replace(/\n/g, '<br>')}</p>` : ''}
${proposalSections.problem ? `<h2>Problème identifié</h2><p>${proposalSections.problem.replace(/\n/g, '<br>')}</p>` : ''}
${proposalSections.solution ? `<h2>Solution proposée</h2><p>${proposalSections.solution.replace(/\n/g, '<br>')}</p>` : ''}
${amount > 0 ? `
<h2>Tarification</h2>
<table>
  <tr><th>Description</th><th style="text-align:right">Montant</th></tr>
  <tr><td>Services professionnels</td><td style="text-align:right">${amount.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}</td></tr>
  <tr><td>TPS (5%)</td><td style="text-align:right">${tps.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}</td></tr>
  <tr><td>TVQ (9.975%)</td><td style="text-align:right">${tvq.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}</td></tr>
  <tr class="total-row"><td><strong>Total TTC</strong></td><td style="text-align:right"><strong>${ttc.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}</strong></td></tr>
</table>` : ''}
${proposalSections.terms ? `<h2>Modalités</h2><p>${proposalSections.terms.replace(/\n/g, '<br>')}</p>` : ''}
</body></html>`;

      const electronObj = typeof window !== 'undefined' && (window as any).electron;
      if (electronObj && electronObj.printToPdf) {
        const result = await electronObj.printToPdf(fileName, formattedHtml);
        if (result && result.success) {
          toast.success(`Proposition PDF exportée avec succès !`);
          addNoteToLead(lead.id, `[Desktop] Proposition commerciale PDF créée : ${result.filePath}`, 'general');
          setShowProposalBuilder(false);
        } else {
          toast.error("Erreur lors de l'exportation PDF.");
        }
      } else {
        const printWin = window.open('', '_blank');
        if (printWin) {
          printWin.document.write(formattedHtml);
          printWin.document.close();
          toast.success("Impression lancée dans un nouvel onglet.");
          setShowProposalBuilder(false);
        } else {
          toast.error("Veuillez autoriser les popups pour imprimer.");
        }
      }
    } catch (err) {
      console.error("Error exporting proposal:", err);
      toast.error("Erreur lors de la génération de l'offre.");
    } finally {
      setExportingProposal(false);
    }
  };

  const handleShareLead = async () => {
    if (!lead) return;
    setSharingLead(true);
    try {
      const res = await fetch(getApiUrl('/api/leads/create-share'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setShareLink(data.link);
      } else {
        toast.error(data.error || 'Impossible de créer le lien de partage.');
      }
    } catch {
      toast.error('Connexion impossible. Vérifiez votre internet et réessayez.');
    } finally {
      setSharingLead(false);
    }
  };

  const handleCopyShareLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setShareLinkCopied(true);
    toast.success('Lien copié dans le presse-papiers !');
    setTimeout(() => setShareLinkCopied(false), 2500);
  };

  // Team members for "Assigner à"
  interface TeamMember { id: string; email: string; full_name: string; role: string }
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const ownerParam = activeWorkspace?.owner_id ? `?ownerUserId=${activeWorkspace.owner_id}` : '';
        const res = await fetch(getApiUrl(`/api/team/members${ownerParam}`));
        if (res.ok) {
          const data = await res.json();
          const rawMembers = Array.isArray(data) ? data : (data?.members ?? []);
          const members = rawMembers.map((m: any) => ({
            id: m.member_user_id || m.id,
            email: m.email || '',
            full_name: m.profile?.full_name || m.full_name || m.email?.split('@')[0] || '',
            role: m.role || '',
          }));
          setTeamMembers(members);
        }
      } catch (e) {
        console.error('Error fetching team members:', e);
      }
    };
    fetchTeamMembers();
  }, [activeWorkspace?.owner_id]);

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
          const [settingsRes, googleAcctRes] = await Promise.all([
            supabase
              .from('settings')
              .select('google_refresh_token, google_email')
              .eq('user_id', user.id)
              .maybeSingle(),
            supabase
              .from('google_accounts')
              .select('google_email, status')
              .eq('user_id', user.id)
              .eq('status', 'connected')
              .limit(1)
              .maybeSingle()
          ]);

          const s = settingsRes.data;
          const g = googleAcctRes?.data;

          if (s?.google_refresh_token) {
            setGmailConnected(true);
            setGoogleEmail(s.google_email || '');
          } else if (g) {
            setGmailConnected(true);
            setGoogleEmail(g.google_email || '');
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
        
        addNotification({
          userId: user?.id || '',
          workspaceId: activeWorkspace?.id || '',
          type: 'email_sent',
          title: 'E-mail envoyé',
          body: `L'e-mail pour ${lead.businessName} a été envoyé avec succès.`,
          link: `/leads/${lead.id}`
        });

        setGeneratedContent(''); // Clear active editor
        await fetchDrafts();
      } else {
        toast.error(data.error || t('lead.send_email_error'));
      }
    } catch (err) {
      console.error("Error sending email:", err);
      toast.error(t('lead.send_email_conn_error'));
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
                  color: #14171A;
                  line-height: 1.6;
                  background: white;
                }
                .header {
                  border-bottom: 2px solid #167f5b;
                  padding-bottom: 20px;
                  margin-bottom: 30px;
                }
                h1 {
                  font-size: 24px;
                  font-weight: 800;
                  color: #14171A;
                  margin: 0 0 10px 0;
                  letter-spacing: -0.025em;
                }
                .meta {
                  font-size: 11px;
                  color: #8A9098;
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
                  color: #8A9098;
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
          toast.success("Rapport PDF exporté avec succès !");
          addNoteToLead(lead.id, `[Desktop] Audit SEO exporté en PDF : ${result.filePath}`, 'general');
        }
      } catch (err) {
        console.error("Error generating PDF:", err);
        toast.error("Erreur lors de la génération du PDF.");
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
          toast.success(t('lead.export_local_success').replace('{filePath}', result.filePath));
          addNoteToLead(lead.id, `[Desktop] Audit SEO exporté localement : ${result.filePath}`, 'general');
        }
      } catch (err) {
        console.error("Error exporting locally in Electron:", err);
        toast.error("Erreur lors de l'exportation locale de l'audit.");
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
        toast.success(t('lead.drive_export_success').replace('{fileName}', data.fileName));
        const logText = data.simulated
          ? `[Simulé] Audit SEO exporté avec succès sur Google Drive (mode bac à sable) :\nFichier : ${data.fileName}`
          : `Audit SEO exporté avec succès sur Google Drive (compte ${googleEmail || 'connecté'}) :\nFichier : ${data.fileName}`;
        addNoteToLead(lead.id, logText, 'general');
      } else {
        toast.error(data.error || t('lead.drive_export_error'));
      }
    } catch (err) {
      console.error("Error exporting to Google Drive:", err);
      toast.error(t('lead.drive_export_conn_error'));
    }
    setExportingDrive(false);
  };

  const fetchDrafts = useCallback(async () => {
    setLoadingDrafts(true);
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      if (!isUuid) {
        setLoadingDrafts(false);
        return;
      }
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
    setDraftError(null);
    try {
      // Substitute custom variables into instructions
      let enrichedInstructions = draftInstructions;
      const varEntries = Object.entries(customVars).filter(([k, v]) => k && v);
      if (varEntries.length > 0) {
        const varContext = '\n\nVariables personnalisées à utiliser dans le message :\n' +
          varEntries.map(([k, v]) => `{{${k}}} = "${v}"`).join('\n');
        // Also do literal replacement in instructions
        let substituted = draftInstructions;
        for (const [k, v] of varEntries) {
          substituted = substituted.replaceAll(`{{${k}}}`, v);
        }
        enrichedInstructions = substituted + varContext;
      }

      const res = await fetch(getApiUrl('/api/generate-draft'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: id,
          channel: draftChannel,
          tone: draftTone,
          instructions: enrichedInstructions,
          websiteDescription: lead?.websiteDescription || undefined,
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Erreur ${res.status}`);
      }
      const data = await res.json();
      if (data.content) {
        setAiStage('done');
        // Let the user appreciate the golden "Done" phase
        await new Promise((resolve) => setTimeout(resolve, 1500));
        setGeneratedContent(data.content);
        // Refresh drafts list
        await fetchDrafts();
      } else {
        throw new Error('Réponse vide de l\'IA');
      }
    } catch (err) {
      console.error("Error generating draft:", err);
      setDraftError((err as Error).message);
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
        <p className="text-xs text-[#8A9098] mt-1">{t('lead.not_found_desc')}</p>
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

  const handleScrapeWebsite = async () => {
    if (!lead.website) return;
    setScrapingSite(true);
    setScrapeError('');
    try {
      const res = await fetch(getApiUrl('/api/scrape-website'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: lead.website, businessName: lead.businessName, niche: lead.niche }),
      });
      const data = await res.json();
      if (res.ok && data.description) {
        updateLead(lead.id, { websiteDescription: data.description });
        toast.success('Description du site générée');
      } else {
        setScrapeError(data.error || "Impossible d'analyser le site.");
      }
    } catch {
      setScrapeError('Erreur réseau lors du scraping.');
    } finally {
      setScrapingSite(false);
    }
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
      case 'New': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Contacted': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Meeting Booked': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Proposal Sent': return 'bg-violet-100 text-violet-800 border-violet-200';
      case 'Negotiation': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Won': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default: return 'bg-rose-100 text-rose-800 border-rose-200';
    }
  };

  const getTemperatureColor = (temp: Lead['temperature']) => {
    switch (temp) {
      case 'Hot': return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'Warm': return 'bg-amber-100 text-amber-800 border-amber-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <ErrorBoundary>
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto p-6 flex flex-col gap-6">
        
        {/* Back Link Header */}
        <div className="flex items-center justify-between">
          <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2 text-[#8A9098] hover:text-[#14171A]">
            <Link href="/leads">
              <ChevronLeft className="h-4 w-4" />
              <span>{t('lead.back_to_portfolio')}</span>
            </Link>
          </Button>
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Quick Mark Contacted / Engage button */}
            {lead.status !== 'Contacted' && lead.status !== 'Won' && (
              <button
                onClick={() => {
                  handleSaveProperty('status', 'Contacted');
                  addNoteToLead(lead.id, 'Prospect marqué comme Contacté / Engagé.', 'general');
                  toast.success('Prospect marqué comme Contacté (Engagé) et déplacé dans le Pipeline !');
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-[11px] font-bold shadow-xs transition-all active:scale-95 shrink-0"
                title="Déplacer le lead à l'étape Contacté"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Marquer Contacté</span>
              </button>
            )}

            {/* Copy lead info button */}
            <button
              onClick={handleCopyLeadInfo}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] text-[11px] font-bold text-[#14171A] transition-colors whitespace-nowrap shrink-0"
            >
              <Copy className="h-3 w-3" />
              Copier les infos
            </button>

            {/* Share lead button */}
            {!shareLink ? (
              <button
                onClick={handleShareLead}
                disabled={sharingLead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5e5e0] bg-white hover:bg-[#f4f4f3] text-[11px] font-bold text-[#14171A] transition-colors disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                {sharingLead ? <Loader2 className="h-3 w-3 animate-spin" /> : <Share2 className="h-3 w-3" />}
                Partager
              </button>
            ) : (
              <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2 py-1.5 shrink-0">
                <LinkIcon className="h-3 w-3 text-[#167f5b]" />
                <span className="text-[10px] text-[#167f5b] font-semibold max-w-[140px] truncate">{shareLink}</span>
                <button
                  onClick={handleCopyShareLink}
                  className="p-0.5 hover:bg-emerald-100 rounded transition-colors"
                >
                  {shareLinkCopied ? <Check className="h-3 w-3 text-[#167f5b]" /> : <Copy className="h-3 w-3 text-[#167f5b]" />}
                </button>
                <button
                  onClick={() => setShareLink(null)}
                  className="p-0.5 hover:bg-emerald-100 rounded transition-colors"
                >
                  <X className="h-3 w-3 text-[#167f5b]" />
                </button>
              </div>
            )}
            <div className="text-[10px] text-[#8A9098] font-mono hidden sm:block">
              {t('lead.last_updated')} {new Date(lead.updatedAt).toLocaleString('fr-FR')}
            </div>
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

        {/* Mobile quick actions — sur écran étroit, la colonne de propriétés (statut,
            température, actions) ne se voit qu'après avoir défilé tout le contenu
            principal et ses onglets. Ce bandeau donne un accès immédiat au strict
            nécessaire sans dupliquer la logique (mêmes handleSaveProperty/setActiveTab
            que le panneau complet plus bas). */}
        <div className="xl:hidden flex flex-col gap-2 bg-white border border-[#e5e5e0] rounded-lg shadow-sm p-3">
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={lead.status}
              onValueChange={(val: Lead['status']) => handleSaveProperty('status', val)}
              disabled={isLocked}
            >
              <SelectTrigger className={cn("h-8 w-full text-xs font-semibold", getStatusColor(lead.status))}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="New" className="text-xs">🔴 {t('lead.status_new')}</SelectItem>
                <SelectItem value="Contacted" className="text-xs">🟡 {t('lead.status_contacted')}</SelectItem>
                <SelectItem value="Meeting Booked" className="text-xs">🟣 {t('lead.status_meeting')}</SelectItem>
                <SelectItem value="Proposal Sent" className="text-xs">🟪 Proposition envoyée</SelectItem>
                <SelectItem value="Negotiation" className="text-xs">🟠 Négociation</SelectItem>
                <SelectItem value="Won" className="text-xs">🟢 {t('lead.status_won')}</SelectItem>
                <SelectItem value="Lost" className="text-xs">⚪ {t('lead.status_lost')}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={lead.temperature}
              onValueChange={(val: Lead['temperature']) => handleSaveProperty('temperature', val)}
              disabled={isLocked}
            >
              <SelectTrigger className={cn("h-8 w-full text-xs font-semibold", getTemperatureColor(lead.temperature))}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Hot" className="text-xs">🔥 {t('lead.temp_hot')}</SelectItem>
                <SelectItem value="Warm" className="text-xs">🌤️ {t('lead.temp_warm')}</SelectItem>
                <SelectItem value="Cold" className="text-xs">❄️ {t('lead.temp_cold')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {lead.phone ? (
              <a
                href={`tel:${lead.phone}`}
                className="flex items-center justify-center gap-1.5 h-9 rounded-lg border border-[#e5e5e0] text-xs font-bold text-[#14171A] active:bg-[#f4f4f3] transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />Appeler
              </a>
            ) : <div />}
            {lead.contactEmail ? (
              <button
                type="button"
                onClick={() => setActiveTab('composer')}
                className="flex items-center justify-center gap-1.5 h-9 rounded-lg bg-[#167f5b] hover:bg-[#0f6b4c] text-white text-xs font-bold transition-colors"
              >
                <Mail className="h-3.5 w-3.5" />E-mail
              </button>
            ) : <div />}
          </div>
        </div>

        {/* Notion Document Canvas & Sales Workspace */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] 2xl:grid-cols-[1fr_450px] gap-8 bg-white border border-[#e5e5e0] rounded-xl shadow-sm p-4 sm:p-6">

          {/* Main Content Side (Document Body) */}
          <div className="space-y-8 min-w-0">
            {/* Lead Title Heading (Notion style click-to-edit header) */}
            <div className="space-y-1.5">
              <InlineTextEdit
                value={lead.businessName}
                onSave={(val) => handleSaveProperty('businessName', val)}
                placeholder="Nom de l'entreprise"
                className="text-2xl sm:text-3xl font-heading font-medium tracking-tight hover:bg-[#f4f4f3]/40 rounded px-2 py-0.5 -ml-2 text-[#14171A] focus:outline-none"
                inputClassName="text-2xl sm:text-3xl font-heading font-medium h-12 -ml-2"
                disabled={isLocked}
                onEditStateChange={setIsEditing}
              />
              <p className="text-xs text-[#8A9098] px-0.5">
                {t('lead.created_at')} {new Date(lead.createdAt).toLocaleDateString('fr-FR')} • {t('lead.owner')} {lead.owner}
              </p>
            </div>

            <div className="h-px bg-border" />

            {/* Prospect data from OSM / Google Maps */}
            {(lead.rating !== undefined || lead.reviewsCount !== undefined || lead.phone || lead.website || lead.mapsUrl) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2.5 rounded-lg border border-[#e5e5e0]/70 bg-[#f4f4f3]/40 text-xs">
                {lead.rating !== undefined && (
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        className={cn('h-3 w-3', i <= Math.round(lead.rating!) ? 'fill-amber-400 text-amber-400' : 'text-[#8A9098]/30')}
                      />
                    ))}
                    <span className="font-bold text-[#14171A] ml-0.5">{lead.rating.toFixed(1)}</span>
                    {lead.reviewsCount !== undefined && (
                      <span className="text-[#8A9098]">({lead.reviewsCount} avis)</span>
                    )}
                  </div>
                )}
                {lead.phone && (
                  <a href={`tel:${lead.phone}`} className="flex items-center gap-1 text-[#8A9098] hover:text-[#14171A] transition-colors">
                    <Phone className="h-3 w-3 shrink-0" />
                    {lead.phone}
                  </a>
                )}
                {lead.website && (
                  <a href={lead.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#167f5b] hover:underline truncate max-w-[200px]">
                    <Globe className="h-3 w-3 shrink-0" />
                    {lead.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                )}
                {lead.mapsUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      const url = lead.mapsUrl!;
                      if ((window as any).electron?.openExternal) {
                        (window as any).electron.openExternal(url);
                      } else {
                        window.open(url, '_blank', 'noopener');
                      }
                    }}
                    className="flex items-center gap-1 text-blue-600 hover:underline text-xs"
                  >
                    <GoogleMapsIcon size={12} className="shrink-0" />
                    Google Maps
                  </button>
                )}
              </div>
            )}

            {/* Website scraper — AI business description (fed to the AI script + drafts) */}
            <div className="rounded-lg border border-[#e5e5e0]/70 bg-[#f4f4f3]/40 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">
                  <FileText className="h-3.5 w-3.5" />
                  Description de l&apos;entreprise
                </div>
                {lead.website && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleScrapeWebsite}
                    disabled={scrapingSite || isLocked}
                    className="h-7 text-[11px] font-semibold gap-1.5"
                  >
                    {scrapingSite
                      ? <Loader2 className="h-3 w-3 animate-spin" />
                      : <Sparkles className="h-3 w-3 text-[#167f5b]" />}
                    {scrapingSite ? 'Analyse…' : lead.websiteDescription ? 'Régénérer' : 'Scraper le site'}
                  </Button>
                )}
              </div>
              {scrapeError && (
                <p className="text-[11px] text-red-600 font-medium">{scrapeError}</p>
              )}
              <DescriptionEditor
                value={lead.websiteDescription || ''}
                onSave={val => updateLead(lead.id, { websiteDescription: val })}
              />
            </div>

            {/* Social Links + Instagram Gallery */}
            <SocialLinksSection lead={lead} onSave={(fields) => updateLead(lead.id, fields)} />

            {/* Google Insights teaser — le détail complet (avis, photos, copier tout) vit dans l'onglet "Avis" */}
            {(googlePlaceData || enrichingGoogle) && (
              <button
                type="button"
                onClick={() => setActiveTab('reviews')}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-full border border-[#e2e8f0] bg-white hover:bg-slate-50 transition-all duration-200 shadow-xs hover:shadow-sm text-left"
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#4285F4] shrink-0 text-white shadow-xs">
                  <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current">
                    <path d="M12.24 10.285V13.4h6.86c-.277 1.56-1.602 4.585-6.86 4.585-4.54 0-8.24-3.76-8.24-8.385s3.7-8.385 8.24-8.385c2.58 0 4.307 1.095 5.298 2.045l2.465-2.37C18.26 1.05 15.495 0 12.24 0 5.58 0 0 5.58 0 12.24s5.58 12.24 12.24 12.24c6.96 0 11.57-4.89 11.57-11.79 0-.795-.085-1.4-.19-1.905h-11.38z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-gray-800 tracking-tight">Google Insights</span>
                {enrichingGoogle && <span className="ml-auto text-[10px] text-[#8A9098] animate-pulse">Enrichissement…</span>}
                {googlePlaceData && !enrichingGoogle && (
                  <div className="ml-auto flex items-center gap-1.5 text-[11px] font-medium">
                    <Star className="h-3.5 w-3.5 fill-[#f59e0b] text-[#f59e0b] shrink-0" />
                    <span className="font-extrabold text-[#ea580c]">{googlePlaceData.rating?.toFixed(1) || '0.0'}</span>
                    <span className="text-[#64748b]">
                      ({googlePlaceData.review_count || 0} avis) — voir tout →
                    </span>
                  </div>
                )}
              </button>
            )}

            {/* Tabs Selector for Notes vs AI Drafts */}
            <div className="space-y-4">
              <div className="flex border-b border-[#e5e5e0]/70 gap-1 overflow-x-auto -mx-1 px-1 pb-0"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  className={cn(
                    "pb-3 text-[10px] font-bold uppercase tracking-wider border-b-2 px-1 transition-all cursor-pointer whitespace-nowrap shrink-0",
                    activeTab === 'notes'
                      ? "border-primary text-[#14171A] font-extrabold"
                      : "border-transparent text-[#8A9098] hover:text-[#14171A]"
                  )}
                >
                  {t('lead.notes_tab')} ({lead.notes?.length || 0})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('drafts')}
                  className={cn(
                    "pb-3 text-[10px] font-bold uppercase tracking-wider border-b-2 px-1 transition-all cursor-pointer whitespace-nowrap shrink-0",
                    activeTab === 'drafts'
                      ? "border-primary text-[#14171A] font-extrabold"
                      : "border-transparent text-[#8A9098] hover:text-[#14171A]"
                  )}
                >
                  {t('lead.ai_writer_tab')} ({drafts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('composer')}
                  className={cn(
                    "pb-3 text-[10px] font-bold uppercase tracking-wider border-b-2 px-1 transition-all cursor-pointer whitespace-nowrap shrink-0",
                    activeTab === 'composer'
                      ? "border-[#167f5b] text-[#167f5b] font-extrabold"
                      : "border-transparent text-[#8A9098] hover:text-[#14171A]"
                  )}
                >
                  {t('composer.title')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  className={cn(
                    "pb-3 text-[10px] font-bold uppercase tracking-wider border-b-2 px-1 transition-all cursor-pointer whitespace-nowrap shrink-0",
                    activeTab === 'timeline'
                      ? "border-primary text-[#14171A] font-extrabold"
                      : "border-transparent text-[#8A9098] hover:text-[#14171A]"
                  )}
                >
                  {t('lead.timeline')}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('gmail')}
                  className={cn(
                    "pb-3 text-[10px] font-bold uppercase tracking-wider border-b-2 px-1 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0",
                    activeTab === 'gmail'
                      ? "border-[#167f5b] text-[#14171A] font-extrabold"
                      : "border-transparent text-[#8A9098] hover:text-[#14171A]"
                  )}
                >
                  <GmailIcon size={12} />
                  Gmail
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('agenda')}
                  className={cn(
                    "pb-3 text-[10px] font-bold uppercase tracking-wider border-b-2 px-1 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0",
                    activeTab === 'agenda'
                      ? "border-[#167f5b] text-[#14171A] font-extrabold"
                      : "border-transparent text-[#8A9098] hover:text-[#14171A]"
                  )}
                >
                  <GoogleCalendarIcon size={12} />
                  Agenda
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('outreach')}
                  className={cn(
                    "pb-3 text-[10px] font-bold uppercase tracking-wider border-b-2 px-1 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0",
                    activeTab === 'outreach'
                      ? "border-[#167f5b] text-[#167f5b] font-extrabold"
                      : "border-transparent text-[#8A9098] hover:text-[#14171A]"
                  )}
                >
                  <Zap className="h-3 w-3" />
                  Outreach
                </button>
                {(lead.mapsUrl || lead.googlePlaceId) && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('reviews')}
                    className={cn(
                      "pb-3 text-[10px] font-bold uppercase tracking-wider border-b-2 px-1 transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap shrink-0",
                      activeTab === 'reviews'
                        ? "border-[#167f5b] text-[#167f5b] font-extrabold"
                        : "border-transparent text-[#8A9098] hover:text-[#14171A]"
                    )}
                  >
                    <Star className="h-3 w-3" />
                    Avis {googlePlaceData?.review_count ? `(${googlePlaceData.review_count})` : ''}
                  </button>
                )}
              </div>

              <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
              >
              {activeTab === 'notes' ? (
                <div className="space-y-6">
                  {/* Add Note Form */}
                  <form onSubmit={handleAddNote} className="space-y-3 bg-secondary/10 border border-[#e5e5e0]/80 p-4 rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-semibold">{t('lead.activity_type')}</span>
                      <Select
                        value={noteType}
                        onValueChange={(val: Note['type']) => setNoteType(val)}
                        disabled={isLocked}
                      >
                        <SelectTrigger className="h-7 w-[110px] text-xs bg-[#fafaf8]">
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
                      className="text-xs min-h-[70px] resize-y bg-[#fafaf8]"
                      required
                      disabled={isLocked}
                      onFocus={() => setIsEditing(true)}
                      onBlur={() => setIsEditing(false)}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" size="sm" className="h-8 text-xs font-semibold gap-1.5 bg-[#167f5b] hover:bg-[#167f5b]/90" disabled={isLocked}>
                        <Plus className="h-3.5 w-3.5" />
                        <span>{t('lead.add_note_btn')}</span>
                      </Button>
                    </div>
                  </form>

                  {/* Feed List */}
                  <div className="space-y-3">
                    {lead.notes && lead.notes.length > 0 ? (
                      [...lead.notes].reverse().map((note) => (
                        <div key={note.id} className="border border-[#e5e5e0]/70 bg-white p-3.5 rounded-lg flex flex-col gap-2 shadow-xs">
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
                                  className="h-6 text-[9px] font-bold text-[#167f5b] hover:bg-[#167f5b]/10 px-2 rounded flex items-center gap-1 cursor-pointer"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>PDF</span>
                                </Button>
                              )}
                              <span className="text-[10px] text-[#8A9098] font-mono">
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
                          <p className="text-xs text-[#14171A]/90 whitespace-pre-wrap leading-relaxed">
                            {note.content}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-[#e5e5e0] rounded-lg">
                        <ClipboardList className="h-5 w-5 text-[#8A9098]/45 mb-1.5" />
                        <span className="text-[11px] text-[#8A9098]">{t('lead.no_notes')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'drafts' ? (
                <div className="space-y-6">
                  {/* AI Draft Form */}
                  <div className="space-y-4 bg-secondary/15 border border-[#e5e5e0]/80 p-5 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      {/* Channel Selection */}
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">{t('lead.prospecting_channel')}</label>
                        <Select
                          value={draftChannel}
                          onValueChange={(val: 'Email' | 'DM' | 'Call') => setDraftChannel(val)}
                          disabled={isLocked}
                        >
                          <SelectTrigger className="h-8 text-xs bg-[#fafaf8]">
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
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">{t('lead.style_tone')}</label>
                        <Select
                          value={draftTone}
                          onValueChange={(val) => setDraftTone(val)}
                          disabled={isLocked}
                        >
                          <SelectTrigger className="h-8 text-xs bg-[#fafaf8]">
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
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">{t('lead.custom_instructions')}</label>
                      <Textarea
                        placeholder={t('lead.custom_instructions_placeholder')}
                        value={draftInstructions}
                        onChange={(e) => setDraftInstructions(e.target.value)}
                        className="text-xs min-h-[50px] resize-y bg-[#fafaf8]"
                        disabled={isLocked}
                        onFocus={() => setIsEditing(true)}
                        onBlur={() => setIsEditing(false)}
                      />
                    </div>

                    {/* Personalization variables */}
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => setShowVars(v => !v)}
                        className="flex items-center gap-1.5 text-[10px] font-semibold text-[#8A9098] hover:text-[#14171A] transition-colors"
                      >
                        <span>{showVars ? '▾' : '▸'}</span>
                        Variables de personnalisation
                        {Object.keys(customVars).filter(k => customVars[k]).length > 0 && (
                          <span className="bg-[#167f5b]/10 text-[#167f5b] px-1.5 py-0.5 rounded text-[9px]">
                            {Object.keys(customVars).filter(k => customVars[k]).length} active{Object.keys(customVars).filter(k => customVars[k]).length > 1 ? 's' : ''}
                          </span>
                        )}
                      </button>
                      {showVars && (
                        <div className="border border-[#e5e5e0]/70 rounded-md p-3 space-y-2 bg-[#f4f4f3]/40">
                          <p className="text-[9px] text-[#8A9098]">Définissez des variables <code className="bg-[#f4f4f3] px-1 rounded text-[9px]">{'{{clé}}'}</code> à injecter dans le message généré.</p>
                          {/* Existing vars */}
                          {Object.entries(customVars).map(([k, v]) => (
                            <div key={k} className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono bg-[#167f5b]/10 text-[#167f5b] px-1.5 py-0.5 rounded shrink-0">{`{{${k}}}`}</span>
                              <input
                                type="text"
                                value={v}
                                onChange={e => setCustomVars(prev => ({ ...prev, [k]: e.target.value }))}
                                placeholder="valeur…"
                                className="flex-1 text-[10px] border border-[#e5e5e0] rounded px-2 py-1 bg-[#fafaf8] focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                              <button
                                type="button"
                                onClick={() => setCustomVars(prev => { const n = {...prev}; delete n[k]; return n; })}
                                className="text-[#8A9098] hover:text-destructive transition-colors text-[10px]"
                              >✕</button>
                            </div>
                          ))}
                          {/* Add new var */}
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={newVarKey}
                              onChange={e => setNewVarKey(e.target.value.replace(/[^a-z0-9_]/gi, '_').toLowerCase())}
                              placeholder="nom_variable"
                              className="w-28 text-[10px] border border-[#e5e5e0] rounded px-2 py-1 bg-[#fafaf8] focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                            />
                            <input
                              type="text"
                              value={newVarValue}
                              onChange={e => setNewVarValue(e.target.value)}
                              placeholder="valeur par défaut…"
                              className="flex-1 text-[10px] border border-[#e5e5e0] rounded px-2 py-1 bg-[#fafaf8] focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!newVarKey) return;
                                setCustomVars(prev => ({ ...prev, [newVarKey]: newVarValue }));
                                setNewVarKey(''); setNewVarValue('');
                              }}
                              className="text-[10px] font-bold text-[#167f5b] hover:text-[#167f5b]/80 transition-colors px-2 py-1 border border-primary/30 rounded"
                            >+ Ajouter</button>
                          </div>
                          {/* Quick presets */}
                          <div className="flex flex-wrap gap-1 pt-1">
                            {[
                              ['probleme_principal', ''],
                              ['concurrent_exemple', ''],
                              ['offre_principale', ''],
                              ['objectif_client', ''],
                            ].map(([k]) => (
                              !customVars[k] && (
                                <button
                                  key={k}
                                  type="button"
                                  onClick={() => setCustomVars(prev => ({ ...prev, [k]: '' }))}
                                  className="text-[9px] px-1.5 py-0.5 rounded border border-[#e5e5e0] text-[#8A9098] hover:border-primary hover:text-[#167f5b] transition-colors"
                                >
                                  + {`{{${k}}}`}
                                </button>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {generating && (
                      <div className="space-y-3 p-4 bg-[#f4f4f3]/70 border border-[#e5e5e0] rounded-lg animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">
                            {t('lead.ai_composer_active')}
                          </span>
                          <span className="text-[9px] font-mono bg-[#167f5b]/10 text-[#167f5b] px-1.5 py-0.5 rounded">
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
                                ? "border-[var(--timeline-thinking)] bg-[var(--timeline-thinking)]/15 scale-[1.02] ring-1 ring-[var(--timeline-thinking)]/45 animate-pulse text-[#14171A] font-semibold"
                                : "border-[#e5e5e0]/70 bg-[#fafaf8]/50 text-[#8A9098]/60"
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
                                ? "border-[var(--timeline-read)] bg-[var(--timeline-read)]/15 scale-[1.02] ring-1 ring-[var(--timeline-read)]/45 animate-pulse text-[#14171A] font-semibold"
                                : "border-[#e5e5e0]/70 bg-[#fafaf8]/50 text-[#8A9098]/60"
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
                                ? "border-[var(--timeline-edit)] bg-[var(--timeline-edit)]/15 scale-[1.02] ring-1 ring-[var(--timeline-edit)]/45 animate-pulse text-[#14171A] font-semibold"
                                : "border-[#e5e5e0]/70 bg-[#fafaf8]/50 text-[#8A9098]/60"
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
                                ? "border-[var(--timeline-done)] bg-[var(--timeline-done)]/15 scale-[1.02] ring-1 ring-[var(--timeline-done)]/45 text-[#14171A] font-semibold"
                                : "border-[#e5e5e0]/70 bg-[#fafaf8]/50 text-[#8A9098]/60"
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
                        className="h-8.5 text-xs font-semibold gap-1.5 bg-[#167f5b] hover:bg-[#167f5b]/95 text-white transition-all"
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

                    {draftError && <p className="text-xs text-red-600 font-semibold">{draftError}</p>}
                  </div>

                  {/* Active Draft Output */}
                  {generatedContent && (
                    <div className="border border-primary/25 bg-[#167f5b]/5 p-4.5 rounded-lg flex flex-col gap-3.5 animate-in fade-in duration-300">
                      <div className="flex items-center justify-between border-b border-[#e5e5e0]/70 pb-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#167f5b] flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5" />
                          {t('lead.ai_draft_generated')}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={exportingDrive}
                            onClick={() => handleExportToDrive(generatedContent)}
                            className="h-7 text-[10px] font-semibold px-2 text-[#8A9098] hover:text-[#14171A] flex items-center gap-1 cursor-pointer"
                            title={typeof window !== 'undefined' && (window as any).electron ? t('lead.export_local') : t('lead.save_to_drive')}
                          >
                            {exportingDrive ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : typeof window !== 'undefined' && (window as any).electron ? (
                              <HardDrive className="h-3.5 w-3.5 text-[#167f5b]" />
                            ) : (
                              <Cloud className="h-3.5 w-3.5 text-[#167f5b]" />
                            )}
                            <span>{typeof window !== 'undefined' && (window as any).electron ? t('lead.export_local') : t('lead.save_to_drive')}</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCopyDraft}
                            className={cn("h-7 w-7 text-[#8A9098] hover:text-[#14171A]", copied && "text-emerald-500 hover:text-emerald-500")}
                            title="Copier"
                          >
                            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={generatedContent}
                        onChange={(e) => setGeneratedContent(e.target.value)}
                        className="text-xs font-sans min-h-[160px] leading-relaxed bg-[#fafaf8] focus-visible:ring-1 focus-visible:ring-primary"
                        disabled={isLocked}
                        onFocus={() => setIsEditing(true)}
                        onBlur={() => setIsEditing(false)}
                      />
                      
                      {/* Send button panel */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-[#e5e5e0]/60">
                        <div className="text-[10px] text-[#8A9098]">
                          {checkingGmail ? (
                            <span>{t('lead.checking_gmail')}</span>
                          ) : gmailConnected ? (
                            <span className="text-emerald-600 font-medium">
                              ✓ {t('lead.gmail_connected')} ({googleEmail})
                            </span>
                          ) : (
                            <span className="text-amber-600">
                              ⚠ {t('lead.gmail_not_connected')}
                            </span>
                          )}
                        </div>
                        <Button
                          onClick={handleSendEmail}
                          disabled={sendingEmail || !lead.contactEmail || isLocked}
                          size="sm"
                          className="h-8 text-xs font-bold gap-1.5 bg-[#167f5b] hover:bg-[#167f5b]/95 text-white self-end sm:self-auto"
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
                      
                      <p className="text-[10px] text-[#8A9098] italic">
                        {t('lead.draft_auto_saved')}
                      </p>
                    </div>
                  )}

                  {/* History of drafts */}
                  <div className="space-y-3.5">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">{t('lead.drafts_history')}</h4>
                    {loadingDrafts ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="h-5 w-5 text-[#167f5b] animate-spin" />
                      </div>
                    ) : drafts.length > 0 ? (
                      <div className="space-y-3">
                        {drafts.map((draft) => (
                          <div key={draft.id} className="border border-[#e5e5e0]/70 bg-white p-4 rounded-lg flex flex-col gap-3 hover:border-[#e5e5e0] transition-all">
                            <div className="flex items-center justify-between border-b border-[#e5e5e0]/60 pb-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-[8px] font-extrabold uppercase px-1.5 py-0">
                                  {draft.channel === 'Email' ? `✉️ ${t('lead.channel_email')}` : draft.channel === 'DM' ? `📱 ${t('lead.channel_dm')}` : `📞 ${t('lead.channel_call')}`}
                                </Badge>
                                <span className="text-[9px] text-[#8A9098] font-mono">Ton: {draft.tone}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  disabled={exportingDrive}
                                  onClick={() => handleExportToDrive(draft.content)}
                                  className="h-6.5 w-6.5 text-[#8A9098] hover:text-[#167f5b]"
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
                                  className="h-6.5 w-6.5 text-[#8A9098] hover:text-[#14171A]"
                                  title="Ouvrir dans l'éditeur"
                                  disabled={isLocked}
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDeleteDraft(draft.id)}
                                  className="h-6.5 w-6.5 text-[#8A9098] hover:text-red-500"
                                  title="Supprimer"
                                  disabled={isLocked}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-[#14171A]/95 whitespace-pre-wrap leading-relaxed">
                              {cleanMarkdownForPreview(draft.content)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-[#e5e5e0] rounded-lg">
                        <Sparkles className="h-4.5 w-4.5 text-[#8A9098]/45 mb-1.5" />
                        <span className="text-[11px] text-[#8A9098]">{t('lead.no_drafts')}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : activeTab === 'composer' ? (
                /* ── Composer unifié ── */
                <ComposerPanel lead={lead} addNoteToLead={addNoteToLead} addTask={addTask} workspaceId={activeWorkspace?.id || ''} />
              ) : activeTab === 'timeline' ? (
                /* Timeline Panel — unified timeline for this lead */
                <div className="-mx-4 -mb-4 h-[500px] overflow-hidden">
                  <TimelineRoot leadId={lead.id} hideSubNav />
                </div>
              ) : activeTab === 'gmail' ? (
                /* Gmail Threads Panel */
                <div className="space-y-3">
                  {!lead.contactEmail ? (
                    <p className="text-xs text-[#8A9098] italic py-4 text-center">
                      Aucun email de contact renseigné sur ce lead.
                    </p>
                  ) : gmailConnectedForTab === false ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                      <p className="text-xs text-[#8A9098]">Connectez Gmail pour voir les échanges avec ce contact.</p>
                      <button
                        onClick={() => setShowGmailConnectModal(true)}
                        className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[#167f5b] hover:bg-[#0f6b4c] text-white text-xs font-bold transition-colors"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        Connecter Gmail
                      </button>
                      <GoogleConnectModal
                        open={showGmailConnectModal}
                        onClose={() => setShowGmailConnectModal(false)}
                        pack="communication"
                        redirect={`/leads/${lead.id}`}
                      />
                    </div>
                  ) : gmailThreadsLoading ? (
                    <div className="flex flex-col gap-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-14 rounded-lg border border-[#e5e5e0] bg-[#f4f4f3]/50 animate-pulse" />
                      ))}
                    </div>
                  ) : gmailThreadsError ? (
                    <p className="text-xs text-red-600 py-2">{gmailThreadsError}</p>
                  ) : gmailThreads.length === 0 ? (
                    <p className="text-xs text-[#8A9098] italic py-4 text-center">
                      Aucun échange Gmail avec {lead.contactEmail}.
                    </p>
                  ) : (
                    gmailThreads.map((thread) => (
                      <div
                        key={thread.id}
                        className={cn(
                          "flex flex-col gap-1 p-3 rounded-lg border transition-colors cursor-pointer hover:bg-[#f4f4f3]",
                          thread.unread
                            ? "border-[#167f5b]/30 bg-emerald-50/40"
                            : "border-[#e5e5e0] bg-white"
                        )}
                        onClick={() => {
                          window.open(`https://mail.google.com/mail/u/0/#inbox/${thread.id}`, '_blank');
                        }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn(
                            "text-xs truncate",
                            thread.unread ? "font-bold text-[#14171A]" : "font-semibold text-[#14171A]"
                          )}>
                            {thread.subject}
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {thread.unread && (
                              <span className="w-2 h-2 rounded-full bg-[#167f5b] shrink-0" />
                            )}
                            <span className="text-[10px] text-[#8A9098] font-mono">
                              {new Date(thread.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                            </span>
                            <ExternalLink className="h-3 w-3 text-[#8A9098]" />
                          </div>
                        </div>
                        <p className="text-[11px] text-[#8A9098] line-clamp-2 leading-relaxed">{thread.snippet}</p>
                      </div>
                    ))
                  )}
                </div>
              ) : activeTab === 'agenda' ? (
                /* Google Calendar Lead Events Panel (Agenda) */
                <div className="space-y-3">
                  {!lead.contactEmail ? (
                    <p className="text-xs text-[#8A9098] italic py-4 text-center">
                      Aucun email de contact renseigné sur ce lead.
                    </p>
                  ) : calConnectedForTab === false ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                      <p className="text-xs text-[#8A9098]">Connectez Google Calendar pour voir les événements avec ce contact.</p>
                      <button
                        onClick={() => setShowCalConnectModal(true)}
                        className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[#167f5b] hover:bg-[#0f6b4c] text-white text-xs font-bold transition-colors"
                      >
                        <GoogleCalendarIcon size={14} />
                        Connecter Google Calendar
                      </button>
                      <GoogleConnectModal
                        open={showCalConnectModal}
                        onClose={() => setShowCalConnectModal(false)}
                        pack="communication"
                        redirect={`/leads/${lead.id}`}
                      />
                    </div>
                  ) : leadCalLoading ? (
                    <div className="flex flex-col gap-2">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-14 rounded-lg border border-[#e5e5e0] bg-[#f4f4f3]/50 animate-pulse" />
                      ))}
                    </div>
                  ) : leadCalError ? (
                    <p className="text-xs text-red-600 py-2">{leadCalError}</p>
                  ) : leadCalEvents.length === 0 ? (
                    <p className="text-xs text-[#8A9098] italic py-4 text-center">
                      Aucun événement Calendar avec ce contact (±90 jours).
                    </p>
                  ) : (
                    leadCalEvents.map((ev) => {
                      const startDate = ev.start ? new Date(ev.start) : null;
                      const isUpcoming = startDate ? startDate > new Date() : false;
                      return (
                        <div
                          key={ev.id}
                          className={cn(
                            "flex items-start justify-between gap-3 p-3 rounded-lg border transition-colors",
                            isUpcoming
                              ? "border-[#167f5b]/30 bg-emerald-50/40"
                              : "border-[#e5e5e0] bg-[#f4f4f3]/30"
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[#14171A] truncate">{ev.summary}</p>
                            {startDate && (
                              <p className="text-[10px] text-[#8A9098] mt-0.5">
                                {startDate.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                                {ev.start?.includes('T') && ` · ${startDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            {isUpcoming && (
                              <span className="text-[9px] font-bold text-[#167f5b] bg-emerald-50 border border-[#167f5b]/20 px-1.5 py-0.5 rounded">
                                À venir
                              </span>
                            )}
                            {ev.hangoutLink && (
                              <a
                                href={ev.hangoutLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[9px] font-bold text-[#167f5b] flex items-center gap-0.5 hover:underline"
                              >
                                Meet
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : activeTab === 'outreach' ? (
                <OutreachPanel lead={lead} />
              ) : activeTab === 'reviews' ? (
                /* Avis Google — reviews, photos, copier tout (Places API + complément Firecrawl best-effort) */
                <div className="space-y-4">
                  {reviewsGoogleConnected === null ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#8A9098]">
                      <Loader2 className="w-4 h-4 animate-spin text-[#167f5b]" />
                      <span>Vérification du statut Google...</span>
                    </div>
                  ) : reviewsGoogleConnected === false ? (
                    <div className="flex flex-col items-center gap-3 py-6 text-center">
                      <p className="text-xs text-[#8A9098]">Connectez Google pour voir les avis Maps de ce lead.</p>
                      <button
                        onClick={() => setShowReviewsConnectModal(true)}
                        className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[#167f5b] hover:bg-[#0f6b4c] text-white text-xs font-bold transition-colors"
                      >
                        <Star className="h-3.5 w-3.5" />
                        Connecter Google
                      </button>
                      <GoogleConnectModal
                        open={showReviewsConnectModal}
                        onClose={() => setShowReviewsConnectModal(false)}
                        pack="identity"
                        redirect={`/leads/${lead.id}`}
                      />
                    </div>
                  ) : enrichingGoogle ? (
                    <div className="flex flex-col gap-2">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-16 rounded-lg border border-[#e5e5e0] bg-[#f4f4f3]/50 animate-pulse" />
                      ))}
                    </div>
                  ) : googleEnrichError ? (
                    <div className="py-6 text-center space-y-1">
                      <p className="text-xs text-red-600 font-medium">{googleEnrichError}</p>
                      {googleEnrichError.includes('GOOGLE_PLACES_API_KEY') && (
                        <p className="text-[11px] text-[#8A9098]">Configuration requise côté serveur — voir .env.example.</p>
                      )}
                    </div>
                  ) : !googlePlaceData ? (
                    <p className="text-xs text-[#8A9098] italic py-4 text-center">Aucune donnée Google Maps pour ce lead.</p>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {googlePlaceData.rating !== undefined && (
                              <span className="text-sm font-bold text-amber-600">⭐ {googlePlaceData.rating.toFixed(1)}</span>
                            )}
                            {googlePlaceData.review_count !== undefined && (
                              <span className="text-xs text-[#8A9098]">({googlePlaceData.review_count} avis au total sur Maps)</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleScrapeMoreReviews}
                              disabled={scrapingMoreReviews}
                              className="h-7 text-[11px] font-semibold gap-1.5"
                            >
                              {scrapingMoreReviews
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <Sparkles className="h-3 w-3 text-[#167f5b]" />}
                              {scrapingMoreReviews ? 'Recherche…' : "Chercher plus d'avis"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={handleCopyAllReviews}
                              disabled={!googlePlaceData.reviews?.length}
                              className="h-7 text-[11px] font-semibold gap-1.5"
                            >
                              {reviewsCopied ? <Check className="h-3 w-3 text-[#167f5b]" /> : <Copy className="h-3 w-3" />}
                              {reviewsCopied ? 'Copié !' : 'Copier tous les avis'}
                            </Button>
                          </div>
                        </div>

                        {/* Attribute Badges */}
                        {(googlePlaceData.allows_dogs !== null || googlePlaceData.accessibility_options !== null || googlePlaceData.ev_charging_options !== null) && (
                          <div className="flex flex-wrap gap-1.5 pt-1 pb-2">
                            {googlePlaceData.allows_dogs === true && (
                              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200/50 text-[10px] font-semibold py-0.5 px-2 flex items-center gap-1">
                                <Dog className="w-3 h-3 shrink-0 text-emerald-600" />
                                Chiens autorisés
                              </Badge>
                            )}
                            {googlePlaceData.allows_dogs === false && (
                              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200/50 text-[10px] font-semibold py-0.5 px-2 flex items-center gap-1">
                                <Dog className="w-3 h-3 shrink-0 text-rose-600" />
                                Chiens non admis
                              </Badge>
                            )}
                            {googlePlaceData.accessibility_options?.wheelchairAccessibleEntrance === true && (
                              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200/50 text-[10px] font-semibold py-0.5 px-2 flex items-center gap-1">
                                <Accessibility className="w-3 h-3 shrink-0 text-blue-600" />
                                Accès fauteuil roulant
                              </Badge>
                            )}
                            {googlePlaceData.ev_charging_options?.connectorCount !== undefined && googlePlaceData.ev_charging_options.connectorCount > 0 && (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200/50 text-[10px] font-semibold py-0.5 px-2 flex items-center gap-1">
                                <Zap className="w-3 h-3 shrink-0 text-amber-600" />
                                {googlePlaceData.ev_charging_options.connectorCount} borne{googlePlaceData.ev_charging_options.connectorCount > 1 ? 's' : ''} de recharge VE
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>

                      {scrapeReviewsError && (
                        <p className="text-[11px] text-red-600">{scrapeReviewsError}</p>
                      )}

                      {(googlePlaceData.generative_summary || googlePlaceData.editorial_summary) && (
                        <p className="text-xs text-[#14171A] leading-relaxed bg-[#f4f4f3]/40 border border-[#e5e5e0]/70 rounded-lg p-3">
                          {googlePlaceData.generative_summary || googlePlaceData.editorial_summary}
                        </p>
                      )}

                      {googlePlaceData.photos && googlePlaceData.photos.length > 0 && (
                        <MediaLightboxGrid
                          images={googlePlaceData.photos.map((name) => getApiUrl(`/api/leads/${lead.id}/place-photo?name=${encodeURIComponent(name)}`))}
                          alt="Photo de l'établissement"
                        />
                      )}

                      <div className="space-y-3">
                        {(googlePlaceData.reviews || []).length === 0 ? (
                          <p className="text-xs text-[#8A9098] italic py-2 text-center">Aucun avis disponible pour ce lieu.</p>
                        ) : (
                          googlePlaceData.reviews!.map((r, i) => (
                            <div key={i} className="flex gap-2.5 items-start p-3 rounded-lg border border-[#e5e5e0]/70 bg-white">
                              {r.authorPhotoUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={r.authorPhotoUrl} alt={r.authorName || 'Avis'} className="h-8 w-8 rounded-full shrink-0 object-cover" />
                              ) : (
                                <div className="h-8 w-8 rounded-full shrink-0 bg-[#f4f4f3] flex items-center justify-center text-[11px] font-bold text-[#8A9098]">
                                  {(r.authorName || '?').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-semibold text-[#14171A] truncate">{r.authorName || 'Client Google'}</span>
                                  <span className="text-[10px] text-[#8A9098] shrink-0">{r.time}</span>
                                </div>
                                <span className="text-[10px] text-amber-500">{'⭐'.repeat(Math.max(1, Math.min(5, Math.round(r.rating))))}</span>
                                {r.text && <p className="text-xs text-[#555552] leading-relaxed">{r.text}</p>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : null}
              </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Right Sidebar — Hub Commercial & Intelligence */}
          <div className="border-t lg:border-t-0 lg:border-l border-[#e5e5e0] pt-6 lg:pt-0 lg:pl-6 space-y-4 min-w-0">
            {/* Top Review Banner & Deal Commission */}
            <LeadEnrichmentReviewBanner lead={lead} />
            <LeadDealCommissionCard
              lead={lead}
              onMarkWon={() => handleSaveProperty('status', 'Won')}
            />

            {/* ACCORDION 1: Actions Immédiates & Prospection */}
            <div className="rounded-xl border border-[#e5e5e0] bg-white shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => toggleAccordion('actions')}
                className="w-full flex items-center justify-between p-3.5 bg-[#fafaf8] hover:bg-[#f4f4f3] transition-colors text-left cursor-pointer border-b border-[#e5e5e0]/60"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#167f5b] text-white">
                    <Zap className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#14171A]">Actions & Prospection Immédiate</span>
                    <p className="text-[10px] text-[#8A9098]">Recommandation IA, Cadence & Déclencheurs</p>
                  </div>
                </div>
                {openAccordions.actions ? <ChevronUp className="h-4 w-4 text-[#8A9098]" /> : <ChevronDown className="h-4 w-4 text-[#8A9098]" />}
              </button>

              {openAccordions.actions && (
                <div className="p-3.5 space-y-4 bg-white">
                  {/* Quick Commercial Action Bar */}
                  <div className="grid grid-cols-3 gap-2">
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone}`}
                        className="flex items-center justify-center gap-1.5 h-8 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-colors shadow-2xs"
                        title={`Appeler ${lead.phone}`}
                      >
                        <Phone className="h-3.5 w-3.5 text-emerald-700" /> Appeler
                      </a>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="flex items-center justify-center gap-1.5 h-8 rounded-lg bg-gray-50 text-gray-400 border border-gray-200 text-xs font-medium cursor-not-allowed"
                      >
                        <Phone className="h-3.5 w-3.5" /> Pas de tél
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveTab('composer')}
                      className="flex items-center justify-center gap-1.5 h-8 rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                      title="Rédiger un email ou message"
                    >
                      <Mail className="h-3.5 w-3.5 text-blue-700" /> Écrire
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('agenda')}
                      className="flex items-center justify-center gap-1.5 h-8 rounded-lg bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                      title="Prendre rendez-vous"
                    >
                      <Calendar className="h-3.5 w-3.5 text-purple-700" /> RDV
                    </button>
                  </div>

                  <CadenceTimeline leadId={lead.id} workspaceId={activeWorkspace?.id ?? ''} />
                </div>
              )}
            </div>

            {/* ACCORDION 2: Fiche & Qualification du Prospect */}
            <div className="rounded-xl border border-[#e5e5e0] bg-white shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => toggleAccordion('properties')}
                className="w-full flex items-center justify-between p-3.5 bg-[#fafaf8] hover:bg-[#f4f4f3] transition-colors text-left cursor-pointer border-b border-[#e5e5e0]/60"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-600 text-white">
                    <Activity className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#14171A]">Fiche & Propriétés du Prospect</span>
                    <p className="text-[10px] text-[#8A9098]">Pipeline, contact, coordonnées & BANT</p>
                  </div>
                </div>
                {openAccordions.properties ? <ChevronUp className="h-4 w-4 text-[#8A9098]" /> : <ChevronDown className="h-4 w-4 text-[#8A9098]" />}
              </button>

              {openAccordions.properties && (
                <div className="p-3.5 space-y-4 bg-white">
                  {/* Qualification & Enrichissement */}
                  <QualificationPanel lead={lead} onSave={(fields) => { updateLead(lead.id, fields); fetchDrafts(); }} />

                  <div>
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] mb-3">{t('lead.properties_title')}</h4>

                    <div className="space-y-3.5">
                {/* Status selector */}
                <div className="grid grid-cols-[100px_1fr] items-center gap-1.5">
                  <span className="text-[11px] font-medium text-[#8A9098] flex items-center gap-1.5">
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
                      <SelectItem value="Proposal Sent" className="text-xs">🟪 Proposition envoyée</SelectItem>
                      <SelectItem value="Negotiation" className="text-xs">🟠 Négociation</SelectItem>
                      <SelectItem value="Won" className="text-xs">🟢 {t('lead.status_won')}</SelectItem>
                      <SelectItem value="Lost" className="text-xs">⚪ {t('lead.status_lost')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Temperature selector */}
                <div className="grid grid-cols-[100px_1fr] items-center gap-1.5">
                  <span className="text-[11px] font-medium text-[#8A9098] flex items-center gap-1.5">
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
                  <span className="text-[11px] font-medium text-[#8A9098] flex items-center gap-1.5 h-6">
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
                  <span className="text-[11px] font-medium text-[#8A9098] flex items-center gap-1.5 h-6">
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
                  <span className="text-[11px] font-medium text-[#8A9098] flex items-center gap-1.5 h-6">
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
                  <span className="text-[11px] font-medium text-[#8A9098] flex items-center gap-1.5 h-6">
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
                  <span className="text-[11px] font-medium text-[#8A9098] flex items-center gap-1.5 h-6">
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
                  <span className="text-[11px] font-medium text-[#8A9098] flex items-center gap-1.5 h-6">
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

                {/* Phone */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-[#8A9098] flex items-center gap-1.5 h-6">
                    <Phone className="h-3 w-3" />
                    Téléphone
                  </span>
                  <InlineTextEdit 
                    value={lead.phone || ''} 
                    onSave={(val) => handleSaveProperty('phone', val)}
                    placeholder="Numéro de téléphone"
                    disabled={isLocked}
                    onEditStateChange={setIsEditing}
                  />
                </div>

                {/* Address */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-[#8A9098] flex items-center gap-1.5 h-6">
                    <MapPin className="h-3 w-3" />
                    Adresse
                  </span>
                  <InlineTextEdit 
                    value={lead.address || ''} 
                    onSave={(val) => handleSaveProperty('address', val)}
                    placeholder="Adresse de l'entreprise"
                    disabled={isLocked}
                    onEditStateChange={setIsEditing}
                  />
                </div>

                {/* Rating */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-[#8A9098] flex items-center gap-1.5 h-6">
                    <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                    Note Google
                  </span>
                  <InlineTextEdit 
                    value={lead.rating !== undefined && lead.rating !== null ? lead.rating.toString() : ''} 
                    onSave={(val) => {
                      const parsed = parseFloat(val);
                      handleSaveProperty('rating', isNaN(parsed) ? undefined : parsed);
                    }}
                    placeholder="ex: 4.5"
                    disabled={isLocked}
                    onEditStateChange={setIsEditing}
                  />
                </div>

                {/* Reviews Count */}
                <div className="grid grid-cols-[100px_1fr] items-start gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-[#8A9098] flex items-center gap-1.5 h-6">
                    <Star className="h-3 w-3 text-[#8A9098] shrink-0" />
                    Avis Google
                  </span>
                  <InlineTextEdit 
                    value={lead.reviewsCount !== undefined && lead.reviewsCount !== null ? lead.reviewsCount.toString() : ''} 
                    onSave={(val) => {
                      const parsed = parseInt(val, 10);
                      handleSaveProperty('reviewsCount', isNaN(parsed) ? undefined : parsed);
                    }}
                    placeholder="ex: 12"
                    disabled={isLocked}
                    onEditStateChange={setIsEditing}
                  />
                </div>

                {/* Next action date */}
                <div className="grid grid-cols-[100px_1fr] items-center gap-1.5 py-0.5">
                  <span className="text-[11px] font-medium text-[#8A9098] flex items-center gap-1.5">
                    <Calendar className="h-3 w-3" />
                    {t('lead.prop_next_action_date')}
                  </span>
                  <Input 
                    type="date"
                    value={lead.nextActionDate}
                    onChange={(e) => handleSaveProperty('nextActionDate', e.target.value)}
                    className="h-7 text-xs bg-[#fafaf8] py-0.5 px-2"
                    disabled={isLocked}
                  />
                </div>

                {/* Champs Personnalisés */}
                {activeWorkspace?.custom_columns?.map((colName) => (
                  <div key={colName} className="grid grid-cols-[100px_1fr] items-start gap-1.5 py-0.5 animate-in fade-in duration-100">
                    <span className="text-[11px] font-medium text-[#8A9098] flex items-center gap-1.5 h-6 truncate" title={colName}>
                      <Tag className="h-3 w-3 shrink-0" />
                      {colName}
                    </span>
                    <InlineTextEdit 
                      value={lead.customFields?.[colName] || ''} 
                      onSave={(val) => handleSaveCustomField(colName, val)}
                      placeholder="Non spécifié"
                      disabled={isLocked}
                      onEditStateChange={setIsEditing}
                    />
                  </div>
                ))}
              </div>

              {/* Ajouter un champ personnalisé depuis la fiche de détail */}
              <div className="mt-2 text-right">
                {addingCustomField ? (
                  <div className="flex gap-1.5 items-center justify-end bg-[#fafaf8] border border-[#e5e5e0] p-2 rounded-lg animate-in slide-in-from-top-1 duration-150 mt-1 max-w-[240px] ml-auto">
                    <Input
                      placeholder="Nom du champ…"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      className="h-6 text-[10px] border-[#e5e5e0] focus:ring-[#167f5b]"
                      autoFocus
                    />
                    <Button type="button" onClick={handleCreateCustomField} size="sm" className="bg-[#167f5b] hover:bg-[#0f6b4c] text-white text-[10px] h-6 px-2.5">
                      Créer
                    </Button>
                    <button type="button" onClick={() => { setAddingCustomField(false); setNewFieldName(''); }} className="text-[#8A9098] hover:text-[#14171A] p-0.5">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingCustomField(true)}
                    className="inline-flex items-center gap-1 text-[10px] text-[#167f5b] font-bold hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Ajouter un champ
                  </button>
                )}
              </div>

              {/* Adresses Multiples (Locations) */}
              <div className="pt-4 border-t border-[#e5e5e0] mt-4 space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] flex items-center gap-1.5 font-sans">
                  <MapPin className="h-3.5 w-3.5 text-[#167f5b]" />
                  Autres établissements / succursales ({lead.locations?.length || 0})
                </h4>
                
                {lead.locations && lead.locations.length > 0 ? (
                  <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {lead.locations.map((loc, idx) => {
                      const isDeleting = deletingLocationIndex === idx;
                      return (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-start justify-between gap-2 p-2 bg-[#f4f4f3]/40 border border-[#e5e5e0]/70 rounded-lg text-xs hover:border-[#167f5b]/30 transition-all duration-300",
                            isDeleting
                              ? "animate-out fade-out slide-out-to-top-2 duration-200 opacity-0 transform -translate-y-1"
                              : "animate-in fade-in slide-in-from-top-2 duration-300"
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#14171A] truncate">{loc.address}</p>
                            {loc.lat && loc.lng && (
                              <p className="text-[9px] text-[#8A9098] font-mono mt-0.5">
                                Coords: {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setDeletingLocationIndex(idx);
                              setTimeout(() => {
                                const updated = lead.locations!.filter((_, i) => i !== idx);
                                handleSaveProperty('locations', updated);
                                setDeletingLocationIndex(null);
                              }, 200);
                            }}
                            className="text-[#8A9098]/60 hover:text-red-600 transition-colors p-0.5 rounded hover:bg-red-50 shrink-0"
                            title="Supprimer cette adresse"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-[#8A9098] italic pl-0.5">Aucune succursale enregistrée.</p>
                )}

                {/* Form to add a location */}
                <div className="flex gap-1.5 mt-2.5">
                  <Input
                    placeholder="Saisir une nouvelle adresse et appuyer sur Entrée..."
                    value={newLocationAddress}
                    onChange={(e) => setNewLocationAddress(e.target.value)}
                    className="h-7 text-xs border-[#e5e5e0] focus:ring-[#167f5b] flex-1 bg-white"
                    disabled={addingLocation || isLocked}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddLocation(newLocationAddress);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs font-semibold px-3 shrink-0"
                    disabled={addingLocation || isLocked || !newLocationAddress.trim()}
                    onClick={() => handleAddLocation(newLocationAddress)}
                  >
                    {addingLocation ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Ajouter'}
                  </Button>
                </div>
              </div>

              {/* Scripts Contextuels (Phase 3) */}
              {leadPersona && (Object.keys(leadPersona.callScripts || {}).length > 0 || Object.keys(leadPersona.emailTemplates || {}).length > 0) && (
                <div className="pt-4 border-t border-[#e5e5e0] mt-4 space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] flex items-center gap-1.5">
                    <FileText className="h-3 w-3" />
                    Scripts & Modèles (ICP: {leadPersona.name})
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(leadPersona.callScripts || {}).map(([title, content]) => (
                      <div key={title} className="p-2 border border-[#e5e5e0] rounded-md bg-[#fafaf8]">
                        <p className="text-[10px] font-bold text-[#14171A] mb-1">📞 {title}</p>
                        <p className="text-[10px] text-[#8A9098] line-clamp-2">{content}</p>
                        <Button variant="ghost" size="sm" className="h-5 text-[9px] px-2 mt-1" onClick={() => setGeneratedContent(content as string)}>Utiliser</Button>
                      </div>
                    ))}
                    {Object.entries(leadPersona.emailTemplates || {}).map(([title, content]) => (
                      <div key={title} className="p-2 border border-[#e5e5e0] rounded-md bg-[#fafaf8]">
                        <p className="text-[10px] font-bold text-[#14171A] mb-1">✉️ {title}</p>
                        <p className="text-[10px] text-[#8A9098] line-clamp-2">{content}</p>
                        <Button variant="ghost" size="sm" className="h-5 text-[9px] px-2 mt-1" onClick={() => setGeneratedContent(content as string)}>Utiliser</Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Assigner à */}
              <div className="pt-4 border-t border-[#e5e5e0] mt-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] flex items-center gap-1.5">
                  <User className="h-3 w-3" />
                  Assigner à
                </span>
                <Select
                  value={lead.assignedTo || '__none__'}
                  onValueChange={(val) => {
                    const newVal = val === '__none__' ? null : val;
                    updateLead(lead.id, { assignedTo: newVal as any });
                  }}
                  disabled={isLocked}
                >
                  <SelectTrigger className="h-7 w-full text-xs bg-[#fafaf8]">
                    <SelectValue placeholder="Non assigné" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs text-[#8A9098]">Non assigné</SelectItem>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id} className="text-xs">
                        {m.full_name || m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {lead.assignedTo && (
                  <p className="text-[10px] text-[#8A9098]">
                    Assigné à : <span className="font-semibold text-[#14171A]">{teamMembers.find(m => m.id === lead.assignedTo)?.full_name || teamMembers.find(m => m.id === lead.assignedTo)?.email || 'Membre'}</span>
                  </p>
                )}
              </div>

              {/* Deal */}
              <div className="pt-4 border-t border-[#e5e5e0] mt-4 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" />
                  Deal
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider text-[#8A9098] font-bold">Montant</label>
                    <Input
                      type="number"
                      value={lead.dealAmount ?? ''}
                      onChange={(e) => updateLead(lead.id, { dealAmount: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="0"
                      className="h-7 text-xs bg-[#fafaf8]"
                      disabled={isLocked}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider text-[#8A9098] font-bold">Proba. %</label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={lead.dealProbability ?? ''}
                      onChange={(e) => updateLead(lead.id, { dealProbability: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="0"
                      className="h-7 text-xs bg-[#fafaf8]"
                      disabled={isLocked}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider text-[#8A9098] font-bold">Date de closing</label>
                  <Input
                    type="date"
                    value={lead.dealClosingDate || ''}
                    onChange={(e) => updateLead(lead.id, { dealClosingDate: e.target.value || undefined })}
                    className="h-7 text-xs bg-[#fafaf8]"
                    disabled={isLocked}
                  />
                </div>
                {/* Campagne */}
                {campaigns.length > 0 && (
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase tracking-wider text-[#8A9098] font-bold">Campagne</label>
                    <Select
                      value={lead.campaignId || '__none__'}
                      onValueChange={(v) => updateLead(lead.id, { campaignId: v === '__none__' ? undefined : v })}
                      disabled={isLocked}
                    >
                      <SelectTrigger className="h-7 w-full text-xs bg-[#fafaf8]">
                        <SelectValue placeholder="Aucune" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs text-[#8A9098]">Aucune campagne</SelectItem>
                        {campaigns.map(c => <SelectItem key={c.id} value={c.id} className="text-xs">{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {/* Projet */}
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider text-[#8A9098] font-bold">Projet</label>
                  <Select
                    value={lead.projectId || '__none__'}
                    onValueChange={(v) => updateLead(lead.id, { projectId: v === '__none__' ? undefined : v })}
                    disabled={isLocked}
                  >
                    <SelectTrigger className="h-7 w-full text-xs bg-[#fafaf8]">
                      <SelectValue placeholder="Aucun projet" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs text-[#8A9098]">Aucun projet</SelectItem>
                      {projects.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {lead.projectId && (
                    <a
                      href={`/projects/${lead.projectId}`}
                      className="text-[10px] text-[#167f5b] hover:underline flex items-center gap-1 mt-0.5"
                    >
                      Voir le projet →
                    </a>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] flex items-center gap-1.5">
                  <Tag className="h-3 w-3" />
                  Tags
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(lead.tags || []).map(tag => (
                    <span
                      key={tag}
                      className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        tag.startsWith('@')
                          ? "bg-[#167f5b]/10 text-[#167f5b] border-[#167f5b]/30"
                          : ['Intéressé', 'RDV demandé', 'Demande info'].includes(tag)
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : ['Pas intéressé'].includes(tag)
                              ? "bg-red-50 text-red-700 border-red-200"
                              : "bg-[#f4f4f3] text-[#555552] border-[#e5e5e0]"
                      )}
                    >
                      {tag}
                      {!tag.startsWith('@') && (
                        <button
                          type="button"
                          onClick={() => updateLead(lead.id, { tags: (lead.tags || []).filter(t => t !== tag) })}
                          className="hover:text-red-500 transition-colors ml-0.5"
                          aria-label={`Supprimer le tag ${tag}`}
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                <TagInputInline
                  onAdd={(tag) => {
                    if (tag && !(lead.tags || []).includes(tag)) {
                      updateLead(lead.id, { tags: [...(lead.tags || []), tag] });
                    }
                  }}
                />
              </div>

                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ACCORDION 3: Score & Intelligence Commerciale */}
            <div className="rounded-xl border border-[#e5e5e0] bg-white shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => toggleAccordion('intelligence')}
                className="w-full flex items-center justify-between p-3.5 bg-[#fafaf8] hover:bg-[#f4f4f3] transition-colors text-left cursor-pointer border-b border-[#e5e5e0]/60"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-amber-500 text-white">
                    <Target className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#14171A]">Score & Intelligence Commerciale</span>
                    <p className="text-[10px] text-[#8A9098]">Score v2 multidimensionnel & Pitch IA</p>
                  </div>
                </div>
                {openAccordions.intelligence ? <ChevronUp className="h-4 w-4 text-[#8A9098]" /> : <ChevronDown className="h-4 w-4 text-[#8A9098]" />}
              </button>

              {openAccordions.intelligence && (
                <div className="p-3.5 space-y-4 bg-white">
                  <LeadProgramsBadge leadId={lead.id} />

                  {/* Score v2 — multidimensionnel */}
                  {(() => {
                    const computed = computeLeadScoreV2(lead);
                    const scoreIcp = lead.scoreIcp ?? computed.icp;
                    const scoreEng = lead.scoreEngagement ?? computed.engagement;
                    const scoreUrg = lead.scoreUrgency ?? computed.urgency;
                    const scoreRev = lead.scoreRevenue ?? computed.revenue;
                    const total = lead.score ?? computed.total;
                    const totalColor = total >= 70 ? '#167f5b' : total >= 40 ? '#f59e0b' : '#8A9098';
                    const totalLabel = total >= 70 ? 'Forte opportunité' : total >= 40 ? 'Opportunité moyenne' : 'À qualifier';
                    const dims = [
                      { label: 'ICP', value: scoreIcp, max: 25, color: '#167f5b', tip: 'Complétude des données' },
                      { label: 'Engagement', value: scoreEng, max: 25, color: '#3b82f6', tip: 'Pipeline + température' },
                      { label: 'Urgence', value: scoreUrg, max: 25, color: '#f59e0b', tip: 'Prochaine action' },
                      { label: 'Revenu', value: scoreRev, max: 25, color: '#8b5cf6', tip: 'Potentiel business' },
                    ];
                    return (
                      <div className="rounded-xl border border-[#e5e5e0] bg-[#fafaf8] p-3.5 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Score v2</p>
                          <div className="flex items-center gap-2">
                            <span className="text-xl font-black" style={{ color: totalColor }}>{total}</span>
                            <span className="text-[10px] text-[#8A9098]">/100</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {dims.map(({ label, value, max, color, tip }) => (
                            <div key={label} title={tip}>
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="text-[10px] font-medium text-[#8A9098]">{label}</span>
                                <span className="text-[10px] font-bold" style={{ color }}>{value}/{max}</span>
                              </div>
                              <div className="h-1.5 bg-[#e5e5e0] rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${Math.round((value / max) * 100)}%`, backgroundColor: color }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="text-[10px] font-semibold text-center mt-1" style={{ color: totalColor }}>{totalLabel}</p>
                      </div>
                    );
                  })()}

                  {/* Script de Pitch IA */}
                  <ScriptPanel lead={lead} />
                </div>
              )}
            </div>

            {/* ACCORDION 4: Outils Terrain & Offres */}
            <div className="rounded-xl border border-[#e5e5e0] bg-white shadow-2xs overflow-hidden">
              <button
                type="button"
                onClick={() => toggleAccordion('field')}
                className="w-full flex items-center justify-between p-3.5 bg-[#fafaf8] hover:bg-[#f4f4f3] transition-colors text-left cursor-pointer border-b border-[#e5e5e0]/60"
              >
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-600 text-white">
                    <MapPin className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-[#14171A]">Outils Terrain & Offres</span>
                    <p className="text-[10px] text-[#8A9098]">Google Maps, Devis PDF & Photo devanture</p>
                  </div>
                </div>
                {openAccordions.field ? <ChevronUp className="h-4 w-4 text-[#8A9098]" /> : <ChevronDown className="h-4 w-4 text-[#8A9098]" />}
              </button>

              {openAccordions.field && (
                <div className="p-3.5 space-y-4 bg-white">
                  {/* Actions terrain */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Actions terrain</span>
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 justify-start"
                        onClick={() => {
                          const url = lead.mapsUrl
                            ? lead.mapsUrl
                            : `https://www.google.com/maps/search/${encodeURIComponent((lead.businessName || '') + ' ' + (lead.city || ''))}`;
                          if ((window as any).electron?.openExternal) {
                            (window as any).electron.openExternal(url);
                          } else {
                            window.open(url, '_blank');
                          }
                        }}
                      >
                        <GoogleMapsIcon size={14} />
                        Voir sur Google Maps
                        <ExternalLink className="h-3 w-3 ml-auto text-[#8A9098]" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 justify-start"
                        onClick={() => { window.location.href = '/services'; }}
                      >
                        <Tag className="h-3.5 w-3.5 text-emerald-600" />
                        Présenter une offre
                        <ExternalLink className="h-3 w-3 ml-auto text-[#8A9098]" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5 justify-start bg-[#f0fdf4] border-[#167f5b]/30 hover:bg-[#dcfce7]"
                        disabled={loadingProposalData}
                        onClick={async () => {
                          setLoadingProposalData(true);
                          try {
                            const supabase = createClient();
                            const { data: { user } } = await supabase.auth.getUser();
                            const [svcRes, settRes] = await Promise.all([
                              supabase.from('services').select('*').eq('user_id', user?.id ?? ''),
                              supabase.from('settings').select('full_name, company_name, phone').eq('user_id', user?.id ?? '').maybeSingle(),
                            ]);
                            const dbServices = svcRes.data ?? [];
                            const userSettings = settRes.data;

                            // Set values
                            setProposalSenderCompany(userSettings?.company_name ?? 'Minerva OS');
                            setProposalSenderName(userSettings?.full_name ?? 'Conseiller');
                            setProposalRecipientName(lead.contactName || lead.businessName || '');
                            
                            // Set executive summary prefilled
                            const defaultSummary = buildExecutiveSummary(lead);
                            setProposalSummary(defaultSummary);

                            // Merge DB services with defaults
                            const mappedDbServices = dbServices.map((s: any) => ({
                              name: s.name,
                              description: s.description || '',
                              price: Number(s.price || 0),
                              selected: true
                            }));
                            if (mappedDbServices.length === 0) {
                              setProposalServices(DEFAULT_SERVICES.map((s: any) => ({...s})));
                            } else {
                              setProposalServices(mappedDbServices);
                            }
                            setCustomServices([]);

                            // Pre-populate multi-section proposal with dealAmount if available
                            if (lead.dealAmount) {
                              setProposalSections(p => ({
                                ...p,
                                pricing: { ...p.pricing, amount: lead.dealAmount! },
                              }));
                            }

                            // Open modal!
                            setShowProposalBuilder(true);
                          } catch (err) {
                            console.error('Proposal builder prep error:', err);
                            toast.error("Erreur lors de la préparation du générateur.");
                          } finally {
                            setLoadingProposalData(false);
                          }
                        }}
                      >
                        {loadingProposalData ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <FileOutput className="h-3.5 w-3.5 text-[#167f5b]" />
                        )}
                        {loadingProposalData ? 'Chargement…' : 'Générer une proposition PDF'}
                      </Button>
                    </div>
                  </div>

                  {/* Storefront Photo Section */}
                  <div 
                    className="pt-4 border-t border-[#e5e5e0] space-y-2"
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] flex items-center gap-1.5">
                      <Camera className="h-3 w-3" />
                      {t('lead.photo_section')}
                    </span>
                    
                    {lead.imageUrl ? (
                      <div className={cn(
                        "relative rounded-lg overflow-hidden border group bg-[#f4f4f3] aspect-video flex items-center justify-center transition-all duration-200",
                        dragActive ? "border-[#167f5b] bg-[#167f5b]/5" : "border-[#e5e5e0]"
                      )}>
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
                          "border border-dashed rounded-lg p-5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200",
                          dragActive 
                            ? "border-[#167f5b] bg-[#167f5b]/5" 
                            : "border-[#e5e5e0] hover:border-primary/50 hover:bg-secondary/10",
                          isLocked && "cursor-not-allowed opacity-50 hover:bg-transparent hover:border-transparent"
                        )}
                      >
                        <Camera className="h-5 w-5 text-[#8A9098]" />
                        <span className="text-[10px] font-medium text-[#8A9098]">
                          {dragActive ? "Déposer l'image ici !" : t('lead.take_photo_btn')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showProposalBuilder && (
        <div className="fixed inset-0 bg-[#000000]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 md:p-6 overflow-hidden">
          <div className="bg-[#fafaf8] border border-[#e5e5e0] rounded-2xl w-full max-w-6xl h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-[#14171A]">
            
            {/* Header */}
            <div className="p-4 border-b border-[#e5e5e0]/80 flex items-center justify-between bg-white shrink-0">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-[#14171A] flex items-center gap-2">
                  <FileOutput className="h-4 w-4 text-[#167f5b]" />
                  Générateur de Proposition Commerciale
                </h3>
                <p className="text-[10px] text-[#8A9098] mt-0.5">Personnalisez votre proposition commerciale avant l'exportation PDF.</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowProposalBuilder(false)}
                className="h-8 w-8 hover:bg-[#f4f4f3] rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Multi-section Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* ——— 5 sections éditables ——— */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Sections texte */}
                <div className="space-y-4">
                  {(['intro', 'problem', 'solution', 'terms'] as const).map(section => (
                    <div key={section} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">
                          {SECTION_LABELS[section]}
                        </label>
                        <button
                          type="button"
                          onClick={() => generateSection(section)}
                          disabled={!!generatingSection}
                          className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-[#167f5b]/10 text-[#167f5b] hover:bg-[#167f5b]/20 font-semibold transition-colors disabled:opacity-50"
                        >
                          {generatingSection === section ? (
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-2.5 w-2.5" />
                          )}
                          Générer
                        </button>
                      </div>
                      <Textarea
                        value={proposalSections[section]}
                        onChange={e => setProposalSections(p => ({ ...p, [section]: e.target.value }))}
                        rows={4}
                        className="text-xs resize-none font-sans"
                        placeholder={SECTION_PLACEHOLDERS[section]}
                      />
                    </div>
                  ))}
                </div>

                {/* Section Prix + Taxes QC */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Prix</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={proposalSections.pricing.amount}
                        onChange={e => setProposalSections(p => ({
                          ...p,
                          pricing: { ...p.pricing, amount: Number(e.target.value) },
                        }))}
                        className="w-40 h-8 text-sm font-bold border border-[#e5e5e0] rounded px-2 bg-[#fafaf8] focus:outline-none focus:ring-1 focus:ring-[#167f5b]/40"
                        placeholder="0"
                        min={0}
                      />
                      <span className="text-xs text-[#8A9098]">CAD</span>
                    </div>
                    {proposalSections.pricing.amount > 0 && (
                      <div className="rounded border border-[#e5e5e0] bg-[#f7f7f4] p-3 space-y-1 text-xs">
                        {[
                          ['Sous-total (HT)', proposalSections.pricing.amount],
                          ['TPS (5%)', proposalSections.pricing.amount * 0.05],
                          ['TVQ (9.975%)', proposalSections.pricing.amount * 0.09975],
                        ].map(([label, val]) => (
                          <div key={label as string} className="flex justify-between text-[#555552]">
                            <span>{label}</span>
                            <span>{(val as number).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}</span>
                          </div>
                        ))}
                        <div className="flex justify-between font-bold text-[#14171A] border-t border-[#e5e5e0] pt-1 mt-1">
                          <span>Total TTC</span>
                          <span>{(proposalSections.pricing.amount * 1.14975).toLocaleString('fr-CA', { style: 'currency', currency: 'CAD' })}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Aperçu identité */}
                  <div className="rounded-xl border border-[#e5e5e0] bg-[#f7f7f4] p-4 space-y-2 text-xs text-[#14171A]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Récapitulatif</p>
                    <div><span className="text-[#8A9098]">Client : </span><strong>{lead.businessName}</strong> · {lead.city}</div>
                    {lead.contactName && <div><span className="text-[#8A9098]">Contact : </span>{lead.contactName}</div>}
                    <div><span className="text-[#8A9098]">Validité : </span>30 jours</div>
                    <div><span className="text-[#8A9098]">Date : </span>{new Date().toLocaleDateString('fr-CA')}</div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#e5e5e0]">
                <button
                  type="button"
                  onClick={saveProposal}
                  disabled={savingProposal}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-[#e5e5e0] bg-white text-xs font-bold text-[#14171A] hover:bg-[#f4f4f3] transition-colors disabled:opacity-50"
                >
                  {savingProposal ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  Sauvegarder
                </button>
                <button
                  type="button"
                  onClick={handleExportProposalPdf}
                  disabled={exportingProposal}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-[#e5e5e0] bg-white text-xs font-bold text-[#14171A] hover:bg-[#f4f4f3] transition-colors disabled:opacity-50"
                >
                  {exportingProposal ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                  Exporter PDF
                </button>
                <button
                  type="button"
                  onClick={markProposalSent}
                  className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-[#167f5b] hover:bg-[#0f6b4c] text-white text-xs font-bold transition-colors"
                >
                  <Send className="h-3 w-3" />
                  Marquer envoyée
                </button>
                <button
                  type="button"
                  onClick={() => setShowProposalBuilder(false)}
                  className="ml-auto flex items-center gap-1.5 px-3 h-8 rounded-lg border border-[#e5e5e0] bg-white text-xs font-bold text-[#8A9098] hover:bg-[#f4f4f3] transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>
            {/* LEGACY LEFT PANEL — hidden, kept for old export function compatibility */}
            <div className="hidden">
              <div className="overflow-y-auto p-5 space-y-6">
                
                {/* Section 1: Informations Générales */}
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold uppercase tracking-wider text-[#167f5b] border-b border-[#e5e5e0]/70 pb-1">1. Informations Générales</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-[#8A9098]">Titre du document</label>
                      <Input
                        value={proposalTitle}
                        onChange={(e) => setProposalTitle(e.target.value)}
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-[#8A9098]">Date d'émission</label>
                      <Input
                        type="date"
                        value={proposalDate}
                        onChange={(e) => setProposalDate(e.target.value)}
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-[#8A9098]">Validité (jours)</label>
                      <Input
                        type="number"
                        value={proposalValidDays}
                        onChange={(e) => setProposalValidDays(Number(e.target.value))}
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-[#8A9098]">Nom du destinataire</label>
                      <Input
                        value={proposalRecipientName}
                        onChange={(e) => setProposalRecipientName(e.target.value)}
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-[#8A9098]">Votre entreprise (Expéditeur)</label>
                      <Input
                        value={proposalSenderCompany}
                        onChange={(e) => setProposalSenderCompany(e.target.value)}
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-[#8A9098]">Votre nom</label>
                      <Input
                        value={proposalSenderName}
                        onChange={(e) => setProposalSenderName(e.target.value)}
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Résumé Exécutif */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#167f5b]">2. Résumé exécutif</label>
                    <button
                      type="button"
                      onClick={() => {
                        const autoSummary = buildExecutiveSummary(lead);
                        setProposalSummary(autoSummary);
                      }}
                      className="text-[9px] font-semibold text-[#167f5b] hover:underline"
                    >
                      Réinitialiser le résumé
                    </button>
                  </div>
                  <Textarea
                    value={proposalSummary}
                    onChange={(e) => setProposalSummary(e.target.value)}
                    className="text-xs min-h-[70px] bg-white leading-relaxed resize-y"
                    placeholder="Écrivez le résumé exécutif de la proposition..."
                  />
                </div>

                {/* Section 3: Services et Tarifs */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#167f5b] border-b border-[#e5e5e0]/70 pb-1 block">3. Choix des services & Tarifs</label>
                  
                  {/* Database/Preset Services List */}
                  <div className="space-y-2.5">
                    {proposalServices.map((svc, idx) => (
                      <div key={idx} className="border border-[#e5e5e0]/80 rounded-lg p-3 bg-white flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={svc.selected}
                          onChange={(e) => {
                            const copy = [...proposalServices];
                            copy[idx].selected = e.target.checked;
                            setProposalServices(copy);
                          }}
                          className="mt-1 shrink-0 rounded border-gray-300 text-[#167f5b] focus:ring-[#167f5b]"
                        />
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              value={svc.name}
                              onChange={(e) => {
                                const copy = [...proposalServices];
                                copy[idx].name = e.target.value;
                                setProposalServices(copy);
                              }}
                              className="font-bold text-xs bg-transparent border-b border-transparent hover:border-[#e5e5e0] focus:border-primary focus:outline-none w-full px-1"
                            />
                            <div className="flex items-center gap-1 shrink-0 bg-[#fafaf8] border border-[#e5e5e0] rounded px-1.5 py-0.5">
                              <span className="text-[10px] text-[#8A9098]">$</span>
                              <input
                                type="number"
                                value={svc.price}
                                onChange={(e) => {
                                  const copy = [...proposalServices];
                                  copy[idx].price = Number(e.target.value);
                                  setProposalServices(copy);
                                }}
                                className="w-16 font-bold text-xs bg-transparent border-none text-right focus:outline-none focus:ring-0 p-0"
                              />
                            </div>
                          </div>
                          <Textarea
                            value={svc.description}
                            onChange={(e) => {
                              const copy = [...proposalServices];
                              copy[idx].description = e.target.value;
                              setProposalServices(copy);
                            }}
                            className="text-[11px] text-[#8A9098] bg-transparent border-none resize-none p-1 min-h-[40px] focus:bg-[#fafaf8] focus:ring-0 w-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Custom Service Line */}
                  <div className="border border-dashed border-[#e5e5e0]/80 rounded-lg p-3 space-y-2 bg-[#f4f4f3]/10">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#8A9098] block">Ajouter un service personnalisé</span>
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        placeholder="Nom du service..."
                        value={newSvcName}
                        onChange={(e) => setNewSvcName(e.target.value)}
                        className="text-xs h-8 col-span-2 bg-white"
                      />
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="Prix ($)..."
                          value={newSvcPrice}
                          onChange={(e) => setNewSvcPrice(e.target.value)}
                          className="text-xs h-8 pl-4 bg-white"
                        />
                        <span className="absolute left-1.5 top-2 text-[10px] text-[#8A9098]">$</span>
                      </div>
                    </div>
                    <Textarea
                      placeholder="Description du service..."
                      value={newSvcDesc}
                      onChange={(e) => setNewSvcDesc(e.target.value)}
                      className="text-xs min-h-[40px] bg-white"
                    />
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        size="xs"
                        variant="outline"
                        onClick={() => {
                          if (!newSvcName) return;
                          setCustomServices(prev => [
                            ...prev,
                            {
                              name: newSvcName,
                              description: newSvcDesc,
                              price: Number(newSvcPrice || 0)
                            }
                          ]);
                          setNewSvcName('');
                          setNewSvcDesc('');
                          setNewSvcPrice('');
                        }}
                        className="h-7 text-[10px] font-semibold"
                      >
                        + Ajouter à la liste
                      </Button>
                    </div>
                  </div>

                  {/* Custom Services Added List */}
                  {customServices.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-bold uppercase text-[#8A9098] block">Services personnalisés ajoutés</span>
                      {customServices.map((cs, idx) => (
                        <div key={idx} className="border border-[#e5e5e0]/80 rounded-lg p-2.5 bg-[#fbfbfb] flex items-center justify-between gap-3 text-xs text-[#14171A]">
                          <div>
                            <span className="font-bold">{cs.name}</span>
                            <span className="text-[10px] text-[#8A9098] block truncate max-w-sm">{cs.description}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{cs.price} $</span>
                            <button
                              type="button"
                              onClick={() => setCustomServices(prev => prev.filter((_, i) => i !== idx))}
                              className="text-[#8A9098] hover:text-destructive text-sm"
                            >✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 4: Taxes & Conditions */}
                <div className="space-y-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#167f5b] border-b border-[#e5e5e0]/70 pb-1 block">4. Taxes & Conditions</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase text-[#8A9098]">Taux de Taxes (%)</label>
                      <Input
                        type="number"
                        step="0.001"
                        value={proposalTaxRate}
                        onChange={(e) => setProposalTaxRate(Number(e.target.value))}
                        className="text-xs h-8 bg-white"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-[9px] font-bold uppercase text-[#8A9098]">Conditions de règlement</label>
                      <Textarea
                        value={proposalPaymentTerms}
                        onChange={(e) => setProposalPaymentTerms(e.target.value)}
                        className="text-xs min-h-[50px] bg-white resize-y"
                      />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-[9px] font-bold uppercase text-[#8A9098]">Appel à l'action d'acceptation</label>
                      <Textarea
                        value={proposalCallToAction}
                        onChange={(e) => setProposalCallToAction(e.target.value)}
                        className="text-xs min-h-[50px] bg-white resize-y"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Preview Panel (Minimalist Black & White Print Aesthetic) */}
              <div className="overflow-y-auto p-5 bg-[#fafaf9] flex flex-col">
                <div className="flex items-center justify-between mb-3 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Aperçu en temps réel</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#8A9098] border border-[#e5e5e0] px-1.5 py-0.5 bg-white rounded">Format Papier A4</span>
                </div>
                
                {/* Paper View */}
                <div className="flex-1 bg-white border border-[#e5e5e0] shadow-sm p-6 text-black font-serif text-[11px] leading-relaxed max-w-2xl mx-auto w-full aspect-[1/1.414] overflow-y-auto">
                  
                  {/* Document Header */}
                  <div className="border-b-2 border-black pb-3 mb-5 text-left">
                    <h2 className="font-sans font-black text-xl tracking-tight uppercase">{proposalTitle}</h2>
                    <div className="font-sans text-[9px] text-[#555] uppercase mt-1">
                      Date : {new Date(proposalDate).toLocaleDateString('fr-CA', {day:'2-digit', month:'long', year:'numeric'})}
                      &nbsp;·&nbsp; Valide : {proposalValidDays} jours
                    </div>
                  </div>

                  {/* Parties Block */}
                  <div className="grid grid-cols-2 gap-5 mb-5 font-sans text-left">
                    <div className="border border-black p-3 bg-[#fafafa]">
                      <div className="text-[8px] font-extrabold uppercase border-b border-black pb-1 mb-1.5 text-[#555]">Préparé pour</div>
                      <div className="font-bold text-xs">{lead.businessName}</div>
                      <div className="text-[10px] text-[#555] mt-1 space-y-0.5">
                        {lead.city && <div>📍 {lead.city}</div>}
                        {lead.niche && <div>🏢 Niche : {lead.niche}</div>}
                        {proposalRecipientName && <div>👤 Contact : {proposalRecipientName}</div>}
                      </div>
                    </div>
                    <div className="border border-black p-3 bg-[#fafafa]">
                      <div className="text-[8px] font-extrabold uppercase border-b border-black pb-1 mb-1.5 text-[#555]">De la part de</div>
                      <div className="font-bold text-xs">{proposalSenderCompany || 'Votre agence'}</div>
                      <div className="text-[10px] text-[#555] mt-1 space-y-0.5">
                        <div>👤 {proposalSenderName}</div>
                        {lead.owner && <div>✉️ Responsable : {lead.owner}</div>}
                      </div>
                    </div>
                  </div>

                  {/* Executive Summary */}
                  {proposalSummary && (
                    <div className="mb-5 text-left">
                      <div className="font-sans font-bold text-[9px] uppercase border-b border-black pb-1 mb-2">Résumé exécutif</div>
                      <p className="italic text-[#222] pl-3 border-l-2 border-black whitespace-pre-wrap">{proposalSummary}</p>
                    </div>
                  )}

                  {/* Services and Prices Table */}
                  <div className="mb-5">
                    <div className="font-sans font-bold text-[9px] uppercase border-b border-black pb-1 mb-2 text-left">Services et Tarifs</div>
                    <table className="w-full text-left font-sans text-[10px] border-collapse">
                      <thead>
                        <tr className="border-b border-black text-[#333]">
                          <th className="pb-1.5 font-bold uppercase text-[9px] text-left">Service</th>
                          <th className="pb-1.5 font-bold uppercase text-[9px] text-left">Description</th>
                          <th className="pb-1.5 font-bold uppercase text-[9px] text-right">Prix</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ...proposalServices.filter(s => s.selected),
                          ...customServices
                        ].map((s, i) => (
                          <tr key={i} className="border-b border-[#e5e5e0]">
                            <td className="py-2 font-bold align-top text-left">{s.name}</td>
                            <td className="py-2 text-[#4a4a45] align-top text-left whitespace-pre-wrap">{s.description || '—'}</td>
                            <td className="py-2 text-right font-bold align-top whitespace-nowrap">{s.price.toLocaleString('fr-CA', {style:'currency', currency:'CAD'})}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Totals Box */}
                    {(() => {
                      const allSelected = [
                        ...proposalServices.filter(s => s.selected),
                        ...customServices
                      ];
                      const totalHT = allSelected.reduce((sum, s) => sum + Number(s.price || 0), 0);
                      const taxes = totalHT * (proposalTaxRate / 100);
                      const totalTTC = totalHT + taxes;

                      return (
                        <div className="w-[180px] ml-auto mt-4 border-t border-black pt-1.5 font-sans text-[10px] space-y-1">
                          <div className="flex justify-between">
                            <span>Total HT</span>
                            <span>{totalHT.toLocaleString('fr-CA', {style:'currency', currency:'CAD'})}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Taxes ({proposalTaxRate}%)</span>
                            <span>{taxes.toLocaleString('fr-CA', {style:'currency', currency:'CAD'})}</span>
                          </div>
                          <div className="flex justify-between font-black text-xs border-t border-black pt-1 mt-1">
                            <span>TOTAL TTC</span>
                            <span>{totalTTC.toLocaleString('fr-CA', {style:'currency', currency:'CAD'})}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Regulations Terms */}
                  <div className="mb-5 font-sans text-[10px] text-left">
                    <div className="font-bold text-[9px] uppercase border-b border-black pb-1 mb-2">Conditions de règlement</div>
                    <div className="border border-[#e5e5e0] p-2.5 bg-[#fafaf9]">
                      <p><strong>Modalités :</strong> {proposalPaymentTerms}</p>
                      <p className="mt-1"><strong>Échéance de l'offre :</strong> Valable pour une période de {proposalValidDays} jours.</p>
                    </div>
                  </div>

                  {/* CTA & Signatures */}
                  <div className="font-sans text-[10px] mt-6 border border-black p-3 text-center">
                    <p className="font-bold">{proposalCallToAction}</p>
                    <div className="flex justify-around mt-8 text-[9px] text-[#555]">
                      <div className="border-t border-black w-24 pt-1 mt-2">Signature Client</div>
                      <div className="border-t border-black w-24 pt-1 mt-2">Signature Fournisseur</div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
            {/* END LEGACY HIDDEN PANEL */}

          </div>
        </div>
      )}
    </div>
    </ErrorBoundary>
  );
}

// ── Editable description ─────────────────────────────────────────────────────

function DescriptionEditor({ value, onSave }: { value: string; onSave: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(value); }, [value]);

  if (!editing) {
    return (
      <div className="group relative">
        {value ? (
          <p className="text-xs text-[#14171A] leading-relaxed">{value}</p>
        ) : (
          <p className="text-[11px] text-[#8A9098] italic">
            Analysez le site web pour générer une description commerciale, utilisée ensuite par l&apos;IA (script de visite, brouillons d&apos;emails).
          </p>
        )}
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-1 text-[10px] text-[#167f5b] font-bold hover:underline"
        >
          {value ? 'Modifier la description' : 'Saisir manuellement'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={draft}
        onChange={e => setDraft(e.target.value)}
        rows={5}
        placeholder="Description commerciale du lead…"
        className="text-xs border-[#e5e5e0] resize-none focus:ring-[#167f5b]"
        autoFocus
      />
      <div className="flex gap-2">
        <button
          type="button"
          onClick={async () => {
            setSaving(true);
            onSave(draft);
            await new Promise(r => setTimeout(r, 300));
            setSaving(false);
            setEditing(false);
          }}
          disabled={saving}
          className="h-7 px-3 rounded-lg bg-[#167f5b] text-white text-[10px] font-bold hover:bg-[#0f6b4c] flex items-center gap-1"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Enregistrer
        </button>
        <button
          type="button"
          onClick={() => { setDraft(value); setEditing(false); }}
          className="h-7 px-3 rounded-lg border border-[#e5e5e0] text-[10px] font-bold text-[#8A9098] hover:text-[#14171A]"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}

// ── Social Links + Instagram Gallery ─────────────────────────────────────────

function SocialLinksSection({ lead, onSave }: { lead: Lead; onSave: (fields: Partial<Lead>) => void }) {
  const [editing, setEditing] = useState(false);
  const [instagram, setInstagram] = useState(lead.socialLinks?.instagram || '');
  const [facebook, setFacebook] = useState(lead.socialLinks?.facebook || '');
  const [linkedin, setLinkedin] = useState(lead.socialLinks?.linkedin || '');
  const [website, setWebsite] = useState(lead.website || '');

  const [igPosts, setIgPosts] = useState<string[]>([]);
  const [igLoading, setIgLoading] = useState(false);
  const [igLoaded, setIgLoaded] = useState(false);
  const [igBlockedMsg, setIgBlockedMsg] = useState<string | null>(null);

  const handleSave = () => {
    onSave({
      socialLinks: {
        ...lead.socialLinks,
        ...(instagram ? { instagram } : {}),
        ...(facebook ? { facebook } : {}),
        ...(linkedin ? { linkedin } : {}),
      },
      ...(website ? { website } : {}),
    });
    setEditing(false);
  };

  const loadInstagramPosts = async () => {
    const url = instagram || lead.socialLinks?.instagram;
    if (!url) return;
    setIgLoading(true);
    setIgBlockedMsg(null);
    try {
      const res = await fetch(getApiUrl(`/api/leads/instagram-posts?url=${encodeURIComponent(url)}`));
      if (res.ok) {
        const data = await res.json();
        if (data.blocked) {
          setIgBlockedMsg(data.message || 'Instagram bloque la prévisualisation automatique.');
          setIgLoaded(true);
        } else {
          setIgPosts(data.images || []);
          setIgLoaded(true);
        }
      }
    } catch { /* silent */ }
    finally { setIgLoading(false); }
  };

  const igUrl = instagram || lead.socialLinks?.instagram;
  const fbUrl = facebook || lead.socialLinks?.facebook;
  const liUrl = linkedin || lead.socialLinks?.linkedin;
  const hasAnySocial = igUrl || fbUrl || liUrl;

  if (!hasAnySocial && !editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="flex items-center gap-2 text-xs text-[#8A9098] hover:text-[#167f5b] transition-colors py-1"
      >
        <span className="text-base">+</span> Ajouter réseaux sociaux
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-[#e5e5e0]/70 bg-[#f4f4f3]/40 p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">
          <Globe className="h-3 w-3" />Présence en ligne
        </div>
        <button type="button" onClick={() => setEditing(e => !e)} className="text-[10px] text-[#167f5b] font-bold hover:underline">
          {editing ? 'Fermer' : 'Modifier'}
        </button>
      </div>

      {editing ? (
        <div className="space-y-2">
          {[
            { icon: '/icons/instagram.svg', label: 'Instagram', value: instagram, set: setInstagram, placeholder: 'instagram.com/username' },
            { icon: '/icons/facebook.svg', label: 'Facebook', value: facebook, set: setFacebook, placeholder: 'facebook.com/page' },
            { icon: null, label: 'LinkedIn', value: linkedin, set: setLinkedin, placeholder: 'linkedin.com/company/...' },
            { icon: null, label: 'Site web', value: website, set: setWebsite, placeholder: 'https://...' },
          ].map(field => (
            <div key={field.label} className="flex items-center gap-2">
              {field.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={field.icon} alt={field.label} className="w-4 h-4 rounded shrink-0" />
              ) : (
                <Globe className="w-4 h-4 text-[#8A9098] shrink-0" />
              )}
              <Input
                value={field.value}
                onChange={e => field.set(e.target.value)}
                placeholder={field.placeholder}
                className="h-7 text-xs border-[#e5e5e0] focus:ring-[#167f5b]"
              />
            </div>
          ))}
          <Button size="sm" onClick={handleSave} className="h-7 bg-[#167f5b] hover:bg-[#0f6b4c] text-white text-xs gap-1">
            <Check className="w-3 h-3" />Enregistrer
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {igUrl && (
            <a href={igUrl.startsWith('http') ? igUrl : `https://${igUrl}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#14171A] hover:text-[#167f5b] transition-colors">
              <InstagramIcon size={16} className="rounded" />
              <span className="text-[10px]">{igUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//, '@').replace(/\/$/, '')}</span>
            </a>
          )}
          {fbUrl && (
            <a href={fbUrl.startsWith('http') ? fbUrl : `https://${fbUrl}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#14171A] hover:text-[#167f5b] transition-colors">
              <FacebookIcon size={16} className="rounded" />
              <span className="text-[10px]">Facebook</span>
            </a>
          )}
          {liUrl && (
            <a href={liUrl.startsWith('http') ? liUrl : `https://${liUrl}`} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#14171A] hover:text-[#167f5b] transition-colors">
              <Globe className="w-3.5 h-3.5" />
              <span className="text-[10px]">LinkedIn</span>
            </a>
          )}
        </div>
      )}

      {/* Instagram gallery */}
      {igUrl && !editing && (
        <div className="space-y-2">
          {!igLoaded ? (
            <button
              type="button"
              onClick={loadInstagramPosts}
              disabled={igLoading}
              className="flex items-center gap-1.5 text-[10px] font-bold text-[#8A9098] hover:text-[#14171A] transition-colors"
            >
              {igLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : (
                <InstagramIcon size={12} className="rounded" />
              )}
              {igLoading ? 'Chargement…' : 'Voir les posts Instagram'}
            </button>
          ) : igBlockedMsg ? (
            <div className="space-y-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-2">
                <InstagramIcon size={16} className="rounded shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-amber-800">Publication Instagram uniquement</p>
                  <p className="text-[10px] text-amber-700 leading-relaxed">{igBlockedMsg}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a
                      href={igUrl && (igUrl.startsWith('http') ? igUrl : `https://${igUrl}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-white bg-[#E1306C] hover:bg-[#C13584] px-2.5 py-1 rounded-full flex items-center gap-1 transition-colors"
                    >
                      <InstagramIcon size={12} />
                      Voir le profil Instagram
                    </a>
                    <button
                      type="button"
                      onClick={() => setEditing(true)}
                      className="text-[10px] font-bold text-[#167f5b] hover:underline"
                    >
                      + Ajouter d'autres infos
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : igPosts.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-[9px] font-bold uppercase tracking-wider text-[#8A9098]">Derniers posts</p>
              <div className="grid grid-cols-3 gap-1">
                {igPosts.map((img, i) => (
                  <a key={i} href={igUrl && (igUrl.startsWith('http') ? igUrl : `https://${igUrl}`)} target="_blank" rel="noopener noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img}
                      alt={`Post ${i + 1}`}
                      className="w-full aspect-square object-cover rounded-lg hover:opacity-80 transition-opacity"
                    />
                  </a>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[10px] text-[#8A9098] italic">Compte privé ou scraping indisponible. <a href={igUrl && (igUrl.startsWith('http') ? igUrl : `https://${igUrl}`)} target="_blank" rel="noopener noreferrer" className="text-[#167f5b] underline">Voir le profil →</a></p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Composer unifié ──────────────────────────────────────────────────────────

type ComposerTab = 'email' | 'call' | 'task' | 'meeting' | 'dm';

function ComposerPanel({
  lead,
  addNoteToLead,
  addTask,
  workspaceId,
}: {
  lead: Lead;
  addNoteToLead: (leadId: string, content: string, type: Note['type']) => void;
  addTask: (title: string, category: 'Follow-up' | 'Preparation' | 'General' | 'Meeting', dueDate?: string) => void;
  workspaceId: string;
}) {
  const { t } = useLanguage();
  const [tab, setTab] = useState<ComposerTab>('email');

  // Email state
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Call state
  const [callOutcome, setCallOutcome] = useState<'reached' | 'voicemail' | 'no_answer'>('reached');
  const [callNotes, setCallNotes] = useState('');
  const [callLogging, setCallLogging] = useState(false);

  // Task state
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState<'Follow-up' | 'Preparation' | 'General' | 'Meeting'>('Follow-up');
  const [taskDue, setTaskDue] = useState('');
  const [taskLogging, setTaskLogging] = useState(false);
  const [taskMsg, setTaskMsg] = useState<string | null>(null);

  // Meeting state
  const [meetingTitle, setMeetingTitle] = useState('');
  const [meetingDate, setMeetingDate] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [meetingLogging, setMeetingLogging] = useState(false);
  const [meetingMsg, setMeetingMsg] = useState<string | null>(null);

  const handleSendEmail = async () => {
    if (!emailSubject || !emailBody) return;
    if (!lead.contactEmail) {
      toast.error("Ce lead n'a pas d'email de contact.");
      return;
    }
    setEmailSending(true);
    setEmailMsg(null);
    try {
      // Send the email directly via Gmail API
      const res = await fetch(getApiUrl('/api/send-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          subject: emailSubject,
          body: emailBody,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEmailMsg({ type: 'success', text: `Email envoyé à ${lead.contactEmail}` });
        toast.success(`Email envoyé à ${lead.contactEmail}`, {
          description: `Sujet : ${emailSubject}`,
          duration: 5000,
        });
        addNoteToLead(lead.id, `Email envoyé : ${emailSubject}`, 'email');
        setEmailSubject('');
        setEmailBody('');
      } else {
        const errMsg = (data as { error?: string }).error || t('composer.error');
        setEmailMsg({ type: 'error', text: errMsg });
        toast.error(errMsg);
      }
    } catch {
      setEmailMsg({ type: 'error', text: t('composer.error') });
      toast.error(t('composer.error'));
    } finally {
      setEmailSending(false);
    }
  };

  const [dmText, setDmText] = useState('');
  const [dmPlatform, setDmPlatform] = useState<'instagram' | 'facebook'>('instagram');
  const [dmCopied, setDmCopied] = useState(false);

  const handleSaveDraft = async (type: 'email' | 'dm', subject: string, body: string) => {
    if (!body) return;
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // First try to create a Gmail draft if Google is connected
    let gmailDraftId: string | null = null;
    if (type === 'email') {
      try {
        const gmailRes = await fetch(getApiUrl('/api/create-draft'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: lead.contactEmail || '',
            subject,
            body,
            leadId: lead.id,
            workspaceId: workspaceId,
          }),
        });
        if (gmailRes.ok) {
          const gmailData = await gmailRes.json();
          gmailDraftId = gmailData.draftId || null;
        }
      } catch {
        // Gmail not available, save locally only
      }
    }

    // Save to Supabase DB if UUID, or local state if seed lead
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lead.id);
    if (isUuid) {
      const { error } = await supabase.from('drafts').insert({
        user_id: user.id,
        lead_id: lead.id,
        workspace_id: workspaceId,
        content: body,
        subject: type === 'email' ? subject : `DM ${dmPlatform} — ${lead.businessName}`,
        channel: type === 'email' ? 'Email' : 'DM',
        source: 'user',
        draft_type: type,
        created_at: new Date().toISOString(),
      });

      if (error) {
        toast.error('Erreur lors de la sauvegarde du brouillon.');
        console.error('handleSaveDraft error:', error);
        return;
      }
    } else {
      const localDraft: any = {
        id: `draft-local-${Date.now()}`,
        user_id: user.id,
        lead_id: lead.id,
        content: body,
        subject: type === 'email' ? subject : `DM ${dmPlatform} — ${lead.businessName}`,
        channel: type === 'email' ? 'Email' : 'DM',
        source: 'user',
        draft_type: type,
        created_at: new Date().toISOString(),
      };
      setDrafts(prev => [localDraft, ...prev]);
    }


    const msg = gmailDraftId
      ? `Brouillon créé dans Gmail et sauvegardé dans l'app.`
      : `Brouillon sauvegardé dans l'app (visible dans Inbox → Brouillons).`;
    toast.success(msg);
  };

  const handleLogCall = () => {
    setCallLogging(true);
    const outcomeLabels = { reached: 'Contacté', voicemail: 'Messagerie', no_answer: 'Pas de réponse' };
    const content = `Appel — ${outcomeLabels[callOutcome]}${callNotes ? ` : ${callNotes}` : ''}`;
    addNoteToLead(lead.id, content, 'call');
    toast.success(`Appel enregistré — ${outcomeLabels[callOutcome]}`);
    setCallNotes('');
    setCallOutcome('reached');
    setTimeout(() => setCallLogging(false), 500);
  };

  const handleAddTask = () => {
    if (!taskTitle) return;
    setTaskLogging(true);
    addTask(taskTitle, taskCategory, taskDue || undefined);
    setTaskMsg(t('composer.logged_ok'));
    toast.success(`Tâche créée : ${taskTitle}`);
    setTaskTitle('');
    setTaskDue('');
    setTimeout(() => { setTaskLogging(false); setTaskMsg(null); }, 1500);
  };

  const handleLogMeeting = () => {
    if (!meetingTitle) return;
    setMeetingLogging(true);
    const content = `RDV planifié : ${meetingTitle}${meetingDate ? ` — ${new Date(meetingDate).toLocaleDateString('fr-CA')}` : ''}${meetingLink ? ` — ${meetingLink}` : ''}`;
    addNoteToLead(lead.id, content, 'general');
    toast.success(`RDV enregistré : ${meetingTitle}`);
    setMeetingMsg(t('composer.logged_ok'));
    setMeetingTitle('');
    setMeetingDate('');
    setMeetingLink('');
    setTimeout(() => { setMeetingLogging(false); setMeetingMsg(null); }, 1500);
  };

  const tabConfig: { key: ComposerTab; label: string; icon: React.ReactNode }[] = [
    { key: 'email', label: 'Email', icon: <Mail className="w-3.5 h-3.5" /> },
    { key: 'dm', label: 'DM', icon: <span className="text-[11px] font-black">DM</span> },
    { key: 'call', label: t('composer.tab_call'), icon: <Phone className="w-3.5 h-3.5" /> },
    { key: 'task', label: t('composer.tab_task'), icon: <CheckSquare className="w-3.5 h-3.5" /> },
    { key: 'meeting', label: t('composer.tab_meeting'), icon: <CalendarCheck className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-tabs */}
      <div className="flex items-center gap-1 bg-[#f4f4f3] rounded-xl p-1 border border-[#e5e5e0]">
        {tabConfig.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-xs font-bold transition-colors',
              tab === key ? 'bg-white text-[#167f5b] shadow-sm' : 'text-[#8A9098] hover:text-[#14171A]'
            )}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Email */}
      {tab === 'email' && (
        <div className="space-y-3">
          {!lead.contactEmail && (
            <div className="text-xs text-amber-700 bg-amber-50 px-3 py-2 rounded-lg border border-amber-200">
              Aucun email enregistré pour ce lead. Ajoutez-en un dans les informations de contact.
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">{t('composer.email_to')}</label>
            <div className="h-8 px-3 flex items-center rounded-lg border border-[#e5e5e0] bg-[#fafaf8] text-xs text-[#14171A]">
              {lead.contactEmail || <span className="text-[#b0afa9]">—</span>}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">{t('composer.email_subject')}</label>
            <Input
              value={emailSubject}
              onChange={e => setEmailSubject(e.target.value)}
              placeholder={`Bonjour ${lead.contactName?.split(' ')[0] || lead.businessName}…`}
              className="h-8 text-xs border-[#e5e5e0] focus:ring-[#167f5b]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Corps</label>
            <Textarea
              value={emailBody}
              onChange={e => setEmailBody(e.target.value)}
              placeholder="Rédigez votre message…"
              rows={6}
              className="text-xs border-[#e5e5e0] resize-none focus:ring-[#167f5b]"
            />
          </div>
          {emailMsg && (
            <div className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold', emailMsg.type === 'success' ? 'bg-[#167f5b]/10 text-[#167f5b] border-[#167f5b]/20' : 'bg-red-50 text-red-700 border-red-200')}>
              {emailMsg.type === 'success' ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              {emailMsg.text}
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={handleSendEmail}
              disabled={emailSending || !emailSubject || !emailBody || !lead.contactEmail}
              className="h-8 bg-[#167f5b] hover:bg-[#0f6b4c] text-white font-bold text-xs gap-1.5"
              title={!lead.contactEmail ? "Aucun email de contact" : undefined}
            >
              {emailSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Envoyer
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSaveDraft('email', emailSubject, emailBody)}
              disabled={!emailSubject || !emailBody}
              className="h-8 border-[#e5e5e0] text-xs font-bold gap-1.5"
            >
              <FileText className="w-3.5 h-3.5" />
              Brouillon
            </Button>
            <p className="text-[9px] text-[#8A9098] w-full">&quot;Envoyer&quot; expédie l&apos;email via Gmail. &quot;Brouillon&quot; le sauvegarde dans l&apos;app et Gmail.</p>
          </div>
        </div>
      )}

      {/* Call */}
      {tab === 'call' && (
        <div className="space-y-4">
          {/* Script IA */}
          {lead.websiteDescription && (
            <div className="p-3 rounded-xl bg-[#167f5b]/5 border border-[#167f5b]/20 space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#167f5b]">
                <Sparkles className="w-3 h-3" />
                Script IA suggéré
              </div>
              <p className="text-xs text-[#14171A] leading-relaxed line-clamp-4">
                {`Bonjour ${lead.contactName?.split(' ')[0] || 'Monsieur/Madame'}, je vous appelle au sujet de ${lead.businessName}. ${lead.websiteDescription.slice(0, 200)}…`}
              </p>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">{t('composer.call_outcome')}</label>
            <div className="flex gap-2">
              {(['reached', 'voicemail', 'no_answer'] as const).map(outcome => {
                const labels = { reached: t('composer.call_outcome_reached'), voicemail: t('composer.call_outcome_voicemail'), no_answer: t('composer.call_outcome_no_answer') };
                return (
                  <button
                    key={outcome}
                    type="button"
                    onClick={() => setCallOutcome(outcome)}
                    className={cn(
                      'flex-1 h-8 rounded-lg text-xs font-bold transition-colors border',
                      callOutcome === outcome
                        ? 'bg-[#167f5b] text-white border-[#167f5b]'
                        : 'bg-white text-[#8A9098] border-[#e5e5e0] hover:border-[#167f5b]/30'
                    )}
                  >
                    {labels[outcome]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">{t('composer.call_log')}</label>
            <Textarea
              value={callNotes}
              onChange={e => setCallNotes(e.target.value)}
              placeholder="Notes de l'appel…"
              rows={3}
              className="text-xs border-[#e5e5e0] resize-none focus:ring-[#167f5b]"
            />
          </div>
          <Button
            onClick={handleLogCall}
            disabled={callLogging}
            className="h-8 bg-[#167f5b] hover:bg-[#0f6b4c] text-white font-bold text-xs gap-1.5"
          >
            {callLogging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Phone className="w-3.5 h-3.5" />}
            {t('composer.log')}
          </Button>
        </div>
      )}

      {/* Task */}
      {tab === 'task' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">{t('composer.task_title')}</label>
            <Input
              value={taskTitle}
              onChange={e => setTaskTitle(e.target.value)}
              placeholder={`Relancer ${lead.contactName?.split(' ')[0] || lead.businessName}`}
              className="h-8 text-xs border-[#e5e5e0] focus:ring-[#167f5b]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">{t('composer.task_category')}</label>
              <Select value={taskCategory} onValueChange={v => setTaskCategory(v as typeof taskCategory)}>
                <SelectTrigger className="h-8 text-xs border-[#e5e5e0]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Follow-up" className="text-xs">Relance</SelectItem>
                  <SelectItem value="Preparation" className="text-xs">Préparation</SelectItem>
                  <SelectItem value="General" className="text-xs">Général</SelectItem>
                  <SelectItem value="Meeting" className="text-xs">Réunion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">{t('composer.task_due')}</label>
              <input
                type="date"
                value={taskDue}
                onChange={e => setTaskDue(e.target.value)}
                className="w-full h-8 text-xs border border-[#e5e5e0] rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-[#167f5b]"
              />
            </div>
          </div>
          {taskMsg && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#167f5b]/20 bg-[#167f5b]/5 text-xs font-semibold text-[#167f5b]">
              <Check className="w-3.5 h-3.5" />{taskMsg}
            </div>
          )}
          <Button
            onClick={handleAddTask}
            disabled={taskLogging || !taskTitle}
            className="h-8 bg-[#167f5b] hover:bg-[#0f6b4c] text-white font-bold text-xs gap-1.5"
          >
            {taskLogging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckSquare className="w-3.5 h-3.5" />}
            Créer la tâche
          </Button>
        </div>
      )}

      {/* Meeting */}
      {tab === 'meeting' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">{t('composer.meeting_title')}</label>
            <Input
              value={meetingTitle}
              onChange={e => setMeetingTitle(e.target.value)}
              placeholder={`RDV avec ${lead.businessName}`}
              className="h-8 text-xs border-[#e5e5e0] focus:ring-[#167f5b]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">{t('composer.meeting_date')}</label>
              <input
                type="datetime-local"
                value={meetingDate}
                onChange={e => setMeetingDate(e.target.value)}
                className="w-full h-8 text-xs border border-[#e5e5e0] rounded-lg px-2 focus:outline-none focus:ring-1 focus:ring-[#167f5b]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">{t('composer.meeting_link')}</label>
              <Input
                value={meetingLink}
                onChange={e => setMeetingLink(e.target.value)}
                placeholder="meet.google.com/…"
                className="h-8 text-xs border-[#e5e5e0] focus:ring-[#167f5b]"
              />
            </div>
          </div>
          {lead.website && (
            <div className="p-3 rounded-xl bg-[#f4f4f3] border border-[#e5e5e0]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098] mb-1">Lien de booking</p>
              <Link
                href={`/book/${encodeURIComponent(lead.contactEmail || lead.businessName)}`}
                className="text-xs text-[#167f5b] font-semibold hover:underline"
                target="_blank"
              >
                Partager mon lien de réservation →
              </Link>
            </div>
          )}
          {meetingMsg && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#167f5b]/20 bg-[#167f5b]/5 text-xs font-semibold text-[#167f5b]">
              <Check className="w-3.5 h-3.5" />{meetingMsg}
            </div>
          )}
          <Button
            onClick={handleLogMeeting}
            disabled={meetingLogging || !meetingTitle}
            className="h-8 bg-[#167f5b] hover:bg-[#0f6b4c] text-white font-bold text-xs gap-1.5"
          >
            {meetingLogging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarCheck className="w-3.5 h-3.5" />}
            {t('composer.log')}
          </Button>
        </div>
      )}

      {/* DM — Instagram / Facebook */}
      {tab === 'dm' && (
        <div className="space-y-3">
          {/* Platform selector */}
          <div className="flex gap-2">
            {(['instagram', 'facebook'] as const).map(platform => (
              <button
                key={platform}
                type="button"
                onClick={() => setDmPlatform(platform)}
                className={cn(
                  'flex-1 h-8 rounded-lg text-xs font-bold transition-colors border flex items-center justify-center gap-1.5',
                  dmPlatform === platform
                    ? 'bg-[#14171A] text-white border-[#14171A]'
                    : 'bg-white text-[#8A9098] border-[#e5e5e0] hover:border-[#14171A]/30'
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/icons/${platform}.svg`} alt="" className="w-3.5 h-3.5 rounded" />
                {platform === 'instagram' ? 'Instagram DM' : 'Facebook Messenger'}
              </button>
            ))}
          </div>

          {/* Auto-fill template */}
          {!dmText && (
            <button
              type="button"
              onClick={() => {
                const firstName = lead.contactName?.split(' ')[0] || lead.businessName;
                const template = dmPlatform === 'instagram'
                  ? `Bonjour ${firstName} 👋\n\nJ'ai vu votre profil et je pense qu'on pourrait collaborer ensemble. Je travaille avec des entreprises locales pour améliorer leur présence en ligne.\n\nÇa vous intéresserait qu'on en discute rapidement ?\n\nCordialement,`
                  : `Bonjour ${firstName},\n\nVotre page m'a interpelé ! Je propose des services qui pourraient vraiment booster votre activité.\n\nDispo pour un rapide échange cette semaine ?`;
                setDmText(template);
              }}
              className="text-[10px] text-[#167f5b] font-bold hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />Générer un message template
            </button>
          )}

          {/* Social links info */}
          {dmPlatform === 'instagram' && (lead.socialLinks?.instagram || lead.website?.includes('instagram')) && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-[#fafaf8] border border-[#e5e5e0]">
              <InstagramIcon size={14} className="rounded shrink-0" />
              <a
                href={(lead.socialLinks?.instagram || lead.website || '')}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-[#167f5b] underline truncate"
              >
                {lead.socialLinks?.instagram || lead.website}
              </a>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Message</label>
            <Textarea
              value={dmText}
              onChange={e => setDmText(e.target.value)}
              placeholder={`Rédigez votre message ${dmPlatform === 'instagram' ? 'Instagram' : 'Facebook'}…`}
              rows={6}
              className="text-xs border-[#e5e5e0] resize-none focus:ring-[#167f5b]"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                if (!dmText) return;
                navigator.clipboard.writeText(dmText);
                setDmCopied(true);
                addNoteToLead(lead.id, `Message ${dmPlatform === 'instagram' ? 'Instagram' : 'Facebook'} rédigé : ${dmText.slice(0, 100)}…`, 'general');
                toast.success(`Message copié ! Collez-le dans ${dmPlatform === 'instagram' ? 'Instagram' : 'Facebook Messenger'}.`);
                setTimeout(() => setDmCopied(false), 2500);
              }}
              disabled={!dmText}
              className="h-8 bg-[#14171A] hover:bg-[#3a3a32] text-white font-bold text-xs gap-1.5"
            >
              {dmCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {dmCopied ? 'Copié !' : 'Copier le message'}
            </Button>
            {(lead.socialLinks?.instagram || lead.website?.includes('instagram.com')) && dmPlatform === 'instagram' && (
              <a
                href={lead.socialLinks?.instagram || lead.website || ''}
                target="_blank"
                rel="noopener noreferrer"
                className="h-8 px-3 flex items-center gap-1.5 rounded-lg border border-[#e5e5e0] text-xs font-bold text-[#8A9098] hover:text-[#14171A] transition-colors"
              >
                <InstagramIcon size={14} className="rounded" />
                Ouvrir le profil
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => handleSaveDraft('dm', '', dmText)}
              disabled={!dmText}
              className="h-7 border-[#e5e5e0] text-[10px] font-bold gap-1 px-2"
            >
              <FileText className="w-3 h-3" />
              Sauvegarder brouillon
            </Button>
          </div>
          <p className="text-[9px] text-[#8A9098]">Le message est copié dans votre presse-papiers. Collez-le directement dans l'app concernée.</p>
        </div>
      )}
    </div>
  );
}

export default LeadDetailClient;
