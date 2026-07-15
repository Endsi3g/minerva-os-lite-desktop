'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useReach } from '@/lib/reach-context';
import { useLanguage } from '@/lib/language-context';
import type { Lead } from '@/lib/mock-data';
import { cn } from '@/lib/utils';
import {
  Clock, Check, Eye, GitMerge, AlertTriangle, Loader2, RefreshCw,
  Zap, Globe, Phone, Building2, ChevronRight, TrendingUp,
  Users, DollarSign, Target, BarChart3, ArrowDown, Plus, Upload,
} from 'lucide-react';
import { getApiUrl } from '@/lib/api-helper';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CsvImportDialog } from './csv-import-dialog';

// ─── Create Lead Form ─────────────────────────────────────────────────────────

const COMMON_NICHES = [
  'Restauration', 'Immobilier', 'Santé / Bien-être', 'Marketing digital',
  'E-commerce', 'Construction / BTP', 'Éducation / Formation', 'Juridique',
  'Finance / Comptabilité', 'Transport / Logistique', 'Tech / SaaS', 'Autre',
];

const LEAD_STATUSES: { value: Lead['status']; label: string }[] = [
  { value: 'New', label: 'Nouveau' },
  { value: 'Contacted', label: 'Contacté' },
  { value: 'Meeting Booked', label: 'RDV planifié' },
  { value: 'Proposal Sent', label: 'Proposition' },
  { value: 'Won', label: 'Gagné' },
  { value: 'Lost', label: 'Perdu' },
];

interface CreateLeadForm {
  businessName: string;
  contactName: string;
  contactEmail: string;
  phone: string;
  city: string;
  niche: string;
  website: string;
  status: Lead['status'];
  score: number;
  notes: string;
}

const DEFAULT_FORM: CreateLeadForm = {
  businessName: '',
  contactName: '',
  contactEmail: '',
  phone: '',
  city: '',
  niche: '',
  website: '',
  status: 'New',
  score: 50,
  notes: '',
};

function CreateLeadDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const { addLead } = useReach();
  const [form, setForm] = useState<CreateLeadForm>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const set = (field: keyof CreateLeadForm, value: string | number) =>
    setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim()) return;
    setSubmitting(true);
    try {
      await addLead({
        businessName: form.businessName.trim(),
        contactName: form.contactName.trim(),
        contactEmail: form.contactEmail.trim() || undefined,
        phone: form.phone.trim() || undefined,
        city: form.city.trim(),
        niche: form.niche.trim(),
        website: form.website.trim() || undefined,
        status: form.status,
        temperature: 'Warm',
        source: 'manual',
        nextAction: '',
        nextActionDate: '',
        notes: form.notes.trim() || undefined,
        score: form.score,
      });
      toast.success('Lead créé !');
      setForm(DEFAULT_FORM);
      onCreated();
      onClose();
    } catch {
      toast.error('Erreur lors de la création du lead.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold text-[#26251e]">Créer un lead manuellement</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Business name (required) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
              Nom de l'entreprise <span className="text-red-500">*</span>
            </label>
            <Input
              required
              value={form.businessName}
              onChange={e => set('businessName', e.target.value)}
              placeholder="Ex : Boulangerie Martin"
              className="h-9 text-xs"
            />
          </div>

          {/* Contact name */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom du contact</label>
            <Input
              value={form.contactName}
              onChange={e => set('contactName', e.target.value)}
              placeholder="Ex : Jean Martin"
              className="h-9 text-xs"
            />
          </div>

          {/* Email + Phone row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Email</label>
              <Input
                type="email"
                value={form.contactEmail}
                onChange={e => set('contactEmail', e.target.value)}
                placeholder="email@exemple.com"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Téléphone</label>
              <Input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+1 514 000 0000"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* City + Niche row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Ville</label>
              <Input
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="Ex : Montréal"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Secteur / Niche</label>
              <Select value={form.niche} onValueChange={v => set('niche', v)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_NICHES.map(n => (
                    <SelectItem key={n} value={n} className="text-xs">{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Website */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Site web</label>
            <Input
              type="url"
              value={form.website}
              onChange={e => set('website', e.target.value)}
              placeholder="https://exemple.com"
              className="h-9 text-xs"
            />
          </div>

          {/* Status + Score row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Statut</label>
              <Select value={form.status} onValueChange={v => set('status', v as Lead['status'])}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map(s => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                Score <span className="text-[#7a7a76] font-normal normal-case tracking-normal">(0–100)</span>
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.score}
                onChange={e => set('score', Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Notes (optionnel)</label>
            <Textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Contexte, source, informations utiles…"
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={onClose} className="h-8 text-xs">
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={submitting || !form.businessName.trim()}
              className="h-8 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
              Créer le lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── SLA Helper ──────────────────────────────────────────────────────────────

function formatSLA(createdAt?: string): { label: string; level: 'green' | 'amber' | 'red' } {
  if (!createdAt) return { label: 'Inconnu', level: 'red' };
  const ms = Date.now() - new Date(createdAt).getTime();
  const hours = ms / 1000 / 60 / 60;
  const mins = Math.floor(ms / 1000 / 60);
  if (hours < 2) return { label: `Il y a ${mins}min`, level: 'green' };
  if (hours < 24) return { label: `Il y a ${Math.floor(hours)}h`, level: 'amber' };
  const days = Math.floor(hours / 24);
  return { label: `Il y a ${days}j`, level: 'red' };
}

// ─── Source Badge ─────────────────────────────────────────────────────────────

const sourceBadgeClasses: Record<string, string> = {
  osm: 'bg-blue-50 text-blue-700 border-blue-100',
  csv: 'bg-purple-50 text-purple-700 border-purple-100',
  manual: 'bg-slate-50 text-slate-600 border-slate-200',
  form: 'bg-emerald-50 text-[#059669] border-emerald-100',
  facebook: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  google: 'bg-red-50 text-red-700 border-red-100',
  import: 'bg-purple-50 text-purple-700 border-purple-100',
};

const sourceLabels: Record<string, string> = {
  osm: 'OSM',
  csv: 'CSV',
  manual: 'Manuel',
  form: 'Formulaire',
  facebook: 'Facebook',
  google: 'Google Ads',
  import: 'Import',
};

// ─── Score Badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-[#059669] text-white'
    : score >= 50 ? 'bg-amber-400 text-white'
    : 'bg-slate-300 text-slate-700';
  return (
    <span className={cn('inline-flex items-center justify-center w-6 h-6 rounded-full text-[9px] font-bold font-mono', color)}>
      {score}
    </span>
  );
}

// ─── Status Colors ────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  New: 'bg-blue-50 text-blue-600 border-blue-100',
  Contacted: 'bg-amber-50 text-amber-700 border-amber-100',
  'Meeting Booked': 'bg-purple-50 text-purple-700 border-purple-100',
  Won: 'bg-emerald-50 text-[#059669] border-emerald-100',
  Lost: 'bg-slate-50 text-slate-500 border-slate-200',
};

// ─── Speed-to-Lead Alert ──────────────────────────────────────────────────────

function SpeedToLeadAlert({ leads }: { leads: Lead[] }) {
  const urgentLeads = useMemo(() => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const twentyMinAgo = Date.now() - 20 * 60 * 1000;
    return leads.filter(l => {
      if (l.status !== 'New' || !l.createdAt) return false;
      return new Date(l.createdAt).getTime() > twentyMinAgo;
    }).map(l => ({
      ...l,
      elapsed: Math.floor((Date.now() - new Date(l.createdAt).getTime()) / 1000 / 60),
      isBreached: new Date(l.createdAt).getTime() < fiveMinAgo,
    }));
  }, [leads]);

  if (urgentLeads.length === 0) return null;

  return (
    <div className="space-y-2">
      {urgentLeads.map(lead => (
        <div
          key={lead.id}
          className={cn('flex items-center gap-3 px-4 py-3 rounded-xl border', lead.isBreached ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200')}
        >
          <Zap className={cn('w-4 h-4 shrink-0', lead.isBreached ? 'text-red-500' : 'text-amber-500')} />
          <div className="flex-1 min-w-0">
            <p className={cn('text-xs font-bold', lead.isBreached ? 'text-red-700' : 'text-amber-700')}>
              {lead.isBreached ? 'SLA dépassé — contactez immédiatement' : 'Speed-to-Lead — répondre en < 5 min'}
            </p>
            <p className="text-[11px] text-[#7a7a76] mt-0.5 truncate">
              {lead.businessName} · {lead.city} · il y a {lead.elapsed}min
            </p>
          </div>
          <Link
            href={`/leads/${lead.id}`}
            className={cn('shrink-0 text-[10px] font-bold px-3 py-1.5 rounded-lg border-0 transition-colors', lead.isBreached ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-amber-500 text-white hover:bg-amber-600')}
          >
            Répondre
          </Link>
        </div>
      ))}
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, accent, green }: { label: string; value: number; accent?: boolean; green?: boolean }) {
  return (
    <div className={cn('rounded-2xl border p-4 flex flex-col gap-1 bg-white border-[#e5e5e0]', green && 'border-[#059669]/30 bg-[#059669]/5', accent && 'border-amber-200 bg-amber-50/50')}>
      <p className={cn('text-2xl font-bold font-mono tracking-tight text-[#26251e]', green && 'text-[#059669]', accent && 'text-amber-700')}>
        {value}
      </p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{label}</p>
    </div>
  );
}

// ─── Dedup Tab (kept for backwards compatibility) ─────────────────────────────

interface DedupLead {
  id: string;
  businessName: string;
  contactEmail?: string;
  phone?: string;
  website?: string;
  city?: string;
  niche?: string;
  status: string;
  score?: number;
  createdAt: string;
  fieldCount: number;
  leadSourceType?: string;
}

interface DedupGroup {
  leads: DedupLead[];
  matchReasons: Array<'domain' | 'phone' | 'name'>;
  similarity: number;
}

function DedupTab({ workspaceId }: { workspaceId: string }) {
  const { t } = useLanguage();
  const [groups, setGroups] = useState<DedupGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState<string | null>(null);
  const [mergedGroups, setMergedGroups] = useState<Set<number>>(new Set());

  const fetchDuplicates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/leads/dedup?workspaceId=${workspaceId}`));
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { fetchDuplicates(); }, [fetchDuplicates]);

  const handleMerge = async (group: DedupGroup, idx: number) => {
    setMerging(`${idx}`);
    try {
      const res = await fetch(getApiUrl('/api/leads/merge'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds: group.leads.map(l => l.id), workspaceId }),
      });
      if (res.ok) setMergedGroups(prev => new Set([...prev, idx]));
    } finally {
      setMerging(null);
    }
  };

  const reasonColors: Record<string, string> = {
    domain: 'bg-blue-50 text-blue-700 border-blue-100',
    phone: 'bg-amber-50 text-amber-700 border-amber-100',
    name: 'bg-purple-50 text-purple-700 border-purple-100',
  };

  const activeGroups = groups.filter((_, i) => !mergedGroups.has(i));

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-2 text-[#7a7a76]">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">Analyse des doublons…</span>
    </div>
  );

  if (activeGroups.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <Check className="w-10 h-10 text-[#059669]" />
      <p className="text-sm font-semibold text-[#26251e]">{t('dedup.empty')}</p>
      <p className="text-xs text-[#7a7a76]">{t('dedup.empty_sub')}</p>
      <button type="button" onClick={fetchDuplicates} className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#e5e5e0] text-xs font-bold text-[#7a7a76] hover:bg-[#f4f4f3] transition-colors">
        <RefreshCw className="w-3.5 h-3.5" />Réanalyser
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-bold text-[#26251e]">{activeGroups.length} groupe{activeGroups.length > 1 ? 's' : ''} de doublons</span>
        </div>
        <button type="button" onClick={fetchDuplicates} className="p-1.5 rounded-md border border-[#e5e5e0] bg-white text-[#7a7a76] hover:bg-[#f4f4f3] transition-colors">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
      {activeGroups.map((group, idx) => {
        const realIdx = groups.indexOf(group);
        const isMerging = merging === `${realIdx}`;
        const primary = [...group.leads].sort((a, b) => b.fieldCount - a.fieldCount)[0];
        return (
          <div key={idx} className="border border-amber-200 rounded-xl bg-white overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-b border-amber-100">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">{t('dedup.group_label')} #{idx + 1}</span>
                <span className="text-[9px] font-bold text-amber-600">{t('dedup.score_similarity')}: {group.similarity}%</span>
                <div className="flex gap-1">
                  {group.matchReasons.map(r => (
                    <span key={r} className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase tracking-wide', reasonColors[r])}>
                      {r}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleMerge(group, realIdx)}
                disabled={isMerging}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#059669] text-white text-[10px] font-bold hover:bg-[#047857] transition-colors disabled:opacity-60"
              >
                {isMerging ? <><Loader2 className="w-3 h-3 animate-spin" />{t('dedup.merging')}</> : <><GitMerge className="w-3 h-3" />{t('dedup.merge')}</>}
              </button>
            </div>
            <div className="divide-y divide-[#f4f4f3]">
              {group.leads.map(lead => {
                const isPrimary = lead.id === primary.id;
                return (
                  <div key={lead.id} className={cn('flex items-center gap-3 px-4 py-3', isPrimary && 'bg-[#059669]/[0.03]')}>
                    <span className={cn('shrink-0 text-[8px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full border', isPrimary ? 'bg-[#059669]/10 text-[#059669] border-[#059669]/20' : 'bg-slate-100 text-slate-500 border-slate-200')}>
                      {isPrimary ? 'Principal' : 'Doublon'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#26251e] truncate">{lead.businessName}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {lead.city && <span className="text-[10px] text-[#7a7a76]">{lead.city}</span>}
                        {lead.contactEmail && <span className="text-[10px] text-[#7a7a76] truncate">{lead.contactEmail}</span>}
                        {lead.phone && <span className="flex items-center gap-0.5 text-[10px] text-[#7a7a76]"><Phone className="w-2.5 h-2.5" />{lead.phone}</span>}
                        {lead.website && (
                          <span className="flex items-center gap-0.5 text-[10px] text-[#7a7a76] min-w-0 overflow-hidden">
                            <Globe className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate">{lead.website.replace(/https?:\/\/(www\.)?/, '')}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-[9px] text-[#7a7a76] font-mono">{lead.fieldCount} champs</span>
                      {lead.leadSourceType && (
                        <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase', sourceBadgeClasses[lead.leadSourceType] || sourceBadgeClasses.manual)}>
                          {sourceLabels[lead.leadSourceType] || lead.leadSourceType}
                        </span>
                      )}
                      <Link href={`/leads/${lead.id}`} className="p-1 rounded-md border border-[#e5e5e0] bg-white text-[#7a7a76] hover:bg-[#f4f4f3] transition-colors">
                        <Eye className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Funnel Tab ───────────────────────────────────────────────────────────────

const FUNNEL_STAGES = [
  { label: 'Nouveau', status: 'New', color: '#7a7a76', bg: 'bg-slate-200' },
  { label: 'Contacté', status: 'Contacted', color: '#6b7280', bg: 'bg-slate-400' },
  { label: 'RDV planifié', status: 'Meeting Booked', color: '#2563eb', bg: 'bg-blue-500' },
  { label: 'Proposition', status: 'Proposal Sent', color: '#d97706', bg: 'bg-amber-500' },
  { label: 'Négociation', status: 'Negotiation', color: '#7c3aed', bg: 'bg-purple-600' },
  { label: 'Gagné', status: 'Won', color: '#059669', bg: 'bg-[#059669]' },
];

function FunnelTab({ leads }: { leads: Lead[] }) {
  const stages = useMemo(() => {
    return FUNNEL_STAGES.map(s => ({
      ...s,
      count: leads.filter(l => l.status === s.status).length,
    }));
  }, [leads]);

  const total = leads.length || 1;
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  return (
    <div className="space-y-6">
      <div className="p-4 rounded-2xl border border-[#e5e5e0] bg-white space-y-5">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Entonnoir de conversion</h3>
        <div className="space-y-3">
          {stages.map((stage, i) => {
            const pct = total > 0 ? Math.round((stage.count / total) * 100) : 0;
            const barWidth = maxCount > 0 ? Math.max((stage.count / maxCount) * 100, 2) : 2;
            const nextStage = stages[i + 1];
            const convRate = stage.count > 0 && nextStage ? Math.round((nextStage.count / stage.count) * 100) : null;

            return (
              <div key={stage.status}>
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="w-28 shrink-0 text-xs font-semibold text-[#26251e] text-right">{stage.label}</div>
                  <div className="flex-1 bg-[#f4f4f3] rounded-full h-6 overflow-hidden relative">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', stage.bg)}
                      style={{ width: `${barWidth}%` }}
                    />
                    <span className="absolute inset-0 flex items-center pl-3 text-[10px] font-bold" style={{ color: barWidth > 30 ? '#fff' : stage.color }}>
                      {stage.count} leads
                    </span>
                  </div>
                  <div className="w-12 shrink-0 text-right">
                    <span className="text-[10px] font-bold text-[#7a7a76]">{pct}%</span>
                  </div>
                </div>
                {convRate !== null && (
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-28" />
                    <div className="flex items-center gap-1 text-[9px] text-[#7a7a76]">
                      <ArrowDown className="w-2.5 h-2.5" />
                      <span>{convRate}% → {nextStage?.label}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-2xl border border-[#e5e5e0] bg-white space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Total leads</p>
          <p className="text-xl font-black text-[#26251e]">{leads.length}</p>
        </div>
        <div className="p-3 rounded-2xl border border-[#059669]/20 bg-[#059669]/5 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#059669]">Leads gagnés</p>
          <p className="text-xl font-black text-[#059669]">{stages.find(s => s.status === 'Won')?.count ?? 0}</p>
        </div>
        <div className="p-3 rounded-2xl border border-[#e5e5e0] bg-white space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Taux global</p>
          <p className="text-xl font-black text-[#26251e]">
            {leads.length > 0 ? Math.round(((stages.find(s => s.status === 'Won')?.count ?? 0) / leads.length) * 100) : 0}%
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Channels Tab ─────────────────────────────────────────────────────────────

const CHANNEL_DEFS = [
  { key: 'osm', label: 'OpenStreetMap / Google Maps', dotColor: '#059669' },
  { key: 'csv', label: 'Import CSV', dotColor: '#7c3aed' },
  { key: 'manual', label: 'Manuel', dotColor: '#7a7a76' },
  { key: 'form', label: 'Formulaire Web', dotColor: '#2563eb' },
  { key: 'facebook', label: 'Facebook Ads', dotColor: '#1d4ed8' },
  { key: 'google', label: 'Google Ads', dotColor: '#dc2626' },
];

function ChannelsTab({ leads }: { leads: Lead[] }) {
  const rows = useMemo(() => {
    return CHANNEL_DEFS.map(ch => {
      const list = leads.filter(l => {
        const s = l.leadSourceType || 'manual';
        if (ch.key === 'csv') return s === 'csv' || s === 'import';
        return s === ch.key;
      });
      const total = list.length;
      const contacted = list.filter(l => ['Contacted', 'Meeting Booked', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'].includes(l.status)).length;
      const won = list.filter(l => l.status === 'Won').length;
      const convRate = total > 0 ? Math.round((won / total) * 100) : 0;
      return { ...ch, total, contacted, won, convRate };
    });
  }, [leads]);

  const totals = useMemo(() => ({
    total: rows.reduce((s, r) => s + r.total, 0),
    contacted: rows.reduce((s, r) => s + r.contacted, 0),
    won: rows.reduce((s, r) => s + r.won, 0),
    convRate: leads.length > 0 ? Math.round((leads.filter(l => l.status === 'Won').length / leads.length) * 100) : 0,
  }), [rows, leads]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#e5e5e0] overflow-hidden bg-white">
        {/* Header */}
        <div className="grid grid-cols-6 gap-2 px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] border-b border-[#e5e5e0] bg-[#fafaf8]">
          <span className="col-span-2">Source</span>
          <span className="text-right">Leads</span>
          <span className="text-right">Contactés</span>
          <span className="text-right">Gagnés</span>
          <span className="text-right">Taux conv.</span>
        </div>
        {/* Rows */}
        {rows.map((row, i) => (
          <div key={row.key} className={cn('grid grid-cols-6 gap-2 px-4 py-3 items-center hover:bg-[#fafaf8] transition-colors', i < rows.length - 1 && 'border-b border-[#e5e5e0]', row.total === 0 && 'opacity-40')}>
            <div className="col-span-2 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.dotColor }} />
              <span className="text-xs font-semibold text-[#26251e] truncate">{row.label}</span>
            </div>
            <span className="text-right text-xs font-bold text-[#26251e]">{row.total}</span>
            <span className="text-right text-xs text-[#26251e]">{row.contacted}</span>
            <span className="text-right text-xs font-bold text-[#26251e]">{row.won}</span>
            <span className={cn('text-right text-xs font-bold', row.convRate >= 20 ? 'text-[#059669]' : row.convRate >= 10 ? 'text-amber-600' : 'text-[#7a7a76]')}>
              {row.total === 0 ? '—' : `${row.convRate}%`}
            </span>
          </div>
        ))}
        {/* Totals footer */}
        <div className="grid grid-cols-6 gap-2 px-4 py-3 items-center border-t border-[#e5e5e0] bg-[#fafaf8]">
          <span className="col-span-2 text-[10px] font-black uppercase tracking-wider text-[#26251e]">Totaux</span>
          <span className="text-right text-xs font-black text-[#26251e]">{totals.total}</span>
          <span className="text-right text-xs font-bold text-[#26251e]">{totals.contacted}</span>
          <span className="text-right text-xs font-black text-[#059669]">{totals.won}</span>
          <span className="text-right text-xs font-black text-[#059669]">{totals.convRate}%</span>
        </div>
      </div>
    </div>
  );
}

// ─── ROI Tab ──────────────────────────────────────────────────────────────────

function RoiTab({ leads }: { leads: Lead[] }) {
  const [budgets, setBudgets] = useState<Record<string, number>>({});

  // Load budgets from Supabase on mount
  useEffect(() => {
    fetch('/api/settings/user-prefs')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.acquisition_budgets) setBudgets(d.acquisition_budgets); })
      .catch(() => {});
  }, []);

  const updateBudget = (ch: string, val: number) => {
    const updated = { ...budgets, [ch]: val };
    setBudgets(updated);
    // Persist to Supabase asynchronously
    fetch('/api/settings/user-prefs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acquisition_budgets: updated }),
    }).catch(() => {});
  };

  const channels = useMemo(() => {
    return CHANNEL_DEFS.map(ch => {
      const list = leads.filter(l => {
        const s = l.leadSourceType || 'manual';
        if (ch.key === 'csv') return s === 'csv' || s === 'import';
        return s === ch.key;
      });
      const total = list.length;
      const won = list.filter(l => l.status === 'Won');
      const wonCount = won.length;
      const revenue = won.reduce((s, l) => s + ((l as Lead & { dealAmount?: number }).dealAmount || 0), 0);
      const cost = budgets[ch.key] || 0;
      const roi = cost > 0 ? Math.round(((revenue - cost) / cost) * 100) : null;
      return { ...ch, total, wonCount, revenue, cost, roi };
    });
  }, [leads, budgets]);

  const maxRevenue = Math.max(...channels.map(c => c.revenue), 1);

  return (
    <div className="space-y-5">
      <p className="text-xs text-[#7a7a76]">Entrez votre budget mensuel par canal pour calculer le ROI. Les données de revenu viennent des leads gagnés dans votre CRM.</p>

      {/* Channel cards */}
      <div className="space-y-3">
        {channels.map(ch => (
          <div key={ch.key} className="p-4 rounded-2xl border border-[#e5e5e0] bg-white space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ch.dotColor }} />
                <span className="text-sm font-bold text-[#26251e]">{ch.label}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#7a7a76]">
                <span>{ch.total} leads</span>
                <span>·</span>
                <span className="font-bold text-[#059669]">{ch.wonCount} gagnés</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1">Budget (CAD)</p>
                <input
                  type="number"
                  value={ch.cost || ''}
                  onChange={e => updateBudget(ch.key, parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  className="w-full h-8 px-2 text-xs border border-[#e5e5e0] rounded-lg bg-white text-[#26251e] focus:outline-none focus:border-[#059669]"
                />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1">Revenu (CAD)</p>
                <p className="h-8 flex items-center text-sm font-bold text-[#26251e]">${ch.revenue.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1">Coût par lead</p>
                <p className="h-8 flex items-center text-sm font-bold text-[#26251e]">
                  {ch.cost > 0 && ch.total > 0 ? `$${Math.round(ch.cost / ch.total)}` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1">ROI</p>
                <p className={cn('h-8 flex items-center text-sm font-black', ch.roi === null ? 'text-[#7a7a76]' : ch.roi >= 0 ? 'text-[#059669]' : 'text-red-600')}>
                  {ch.roi === null ? '—' : `${ch.roi > 0 ? '+' : ''}${ch.roi}%`}
                </p>
              </div>
            </div>

            {/* Revenue bar */}
            {ch.revenue > 0 && (
              <div className="space-y-1">
                <div className="h-1.5 bg-[#f4f4f3] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#059669] rounded-full transition-all duration-500"
                    style={{ width: `${Math.round((ch.revenue / maxRevenue) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Comparison chart */}
      <div className="p-4 rounded-2xl border border-[#e5e5e0] bg-white space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">ROI par canal</h3>
        <div className="space-y-2">
          {channels.filter(ch => ch.roi !== null).sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0)).map(ch => (
            <div key={ch.key} className="flex items-center gap-3">
              <div className="w-32 shrink-0 text-xs font-semibold text-[#26251e] truncate">{ch.label.split('/')[0].trim()}</div>
              <div className="flex-1 bg-[#f4f4f3] rounded-full h-5 overflow-hidden relative">
                {ch.roi !== null && ch.roi > 0 && (
                  <div
                    className="h-full bg-[#059669] rounded-full"
                    style={{ width: `${Math.min(ch.roi / 3, 100)}%` }}
                  />
                )}
                {ch.roi !== null && ch.roi < 0 && (
                  <div
                    className="h-full bg-red-400 rounded-full"
                    style={{ width: `${Math.min(Math.abs(ch.roi) / 3, 100)}%` }}
                  />
                )}
              </div>
              <div className="w-14 shrink-0 text-right">
                <span className={cn('text-[10px] font-black', (ch.roi ?? 0) >= 0 ? 'text-[#059669]' : 'text-red-600')}>
                  {ch.roi !== null ? `${ch.roi > 0 ? '+' : ''}${ch.roi}%` : '—'}
                </span>
              </div>
            </div>
          ))}
          {channels.every(ch => ch.roi === null) && (
            <p className="text-xs text-[#7a7a76] text-center py-4">Entrez un budget pour calculer le ROI de chaque canal.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Goals Tab ────────────────────────────────────────────────────────────────

interface Goals {
  leads: number;
  clients: number;
  revenue: number;
}

function GoalsTab({ leads }: { leads: Lead[] }) {
  const [goals, setGoals] = useState<Goals>({ leads: 100, clients: 10, revenue: 50000 });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Goals>(goals);

  // Load goals from Supabase on mount
  useEffect(() => {
    fetch('/api/settings/user-prefs')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.acquisition_goals) {
          setGoals(d.acquisition_goals);
          setDraft(d.acquisition_goals);
        }
      })
      .catch(() => {});
  }, []);

  const saveGoals = () => {
    setGoals(draft);
    // Persist to Supabase
    fetch('/api/settings/user-prefs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acquisition_goals: draft }),
    }).catch(() => {});
    setEditing(false);
  };

  const now = new Date();
  const currentMonth = useMemo(() => {
    return leads.filter(l => {
      if (!l.createdAt) return false;
      const d = new Date(l.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads, now.getFullYear(), now.getMonth()]);

  const actual = {
    leads: currentMonth.length,
    clients: currentMonth.filter(l => l.status === 'Won').length,
    revenue: currentMonth.filter(l => l.status === 'Won').reduce((s, l) => s + ((l as Lead & { dealAmount?: number }).dealAmount || 0), 0),
  };

  const pct = (val: number, goal: number) => goal > 0 ? Math.min(Math.round((val / goal) * 100), 100) : 0;

  const milestoneLabel = (p: number) => {
    if (p >= 100) return { label: 'Objectif atteint !', color: 'text-[#059669]' };
    if (p >= 75) return { label: '75% atteint', color: 'text-blue-600' };
    if (p >= 50) return { label: '50% atteint', color: 'text-amber-600' };
    if (p >= 25) return { label: '25% atteint', color: 'text-amber-500' };
    return { label: 'En cours', color: 'text-[#7a7a76]' };
  };

  const progressItems = [
    { label: 'Leads acquis', actual: actual.leads, goal: goals.leads, unit: '' },
    { label: 'Clients gagnés', actual: actual.clients, goal: goals.clients, unit: '' },
    { label: 'Revenu mensuel', actual: actual.revenue, goal: goals.revenue, unit: '$' },
  ];

  // Last 6 months trend
  const monthlyTrend = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      const y = d.getFullYear();
      const m = d.getMonth();
      const count = leads.filter(l => {
        if (!l.createdAt) return false;
        const ld = new Date(l.createdAt);
        return ld.getFullYear() === y && ld.getMonth() === m;
      }).length;
      return { label: d.toLocaleString('fr-FR', { month: 'short' }), count };
    });
  }, [leads]);

  const maxTrend = Math.max(...monthlyTrend.map(m => m.count), 1);

  return (
    <div className="space-y-6">
      {/* Goals editor */}
      <div className="p-4 rounded-2xl border border-[#e5e5e0] bg-white space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Objectifs mensuels</h3>
          {editing ? (
            <div className="flex gap-2">
              <button type="button" onClick={() => setEditing(false)} className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-[#e5e5e0] text-[#7a7a76] hover:bg-[#f4f4f3]">Annuler</button>
              <button type="button" onClick={saveGoals} className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-[#059669] text-white hover:bg-[#047857]">Enregistrer</button>
            </div>
          ) : (
            <button type="button" onClick={() => { setDraft(goals); setEditing(true); }} className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-[#e5e5e0] text-[#7a7a76] hover:bg-[#f4f4f3] transition-colors">
              Modifier
            </button>
          )}
        </div>

        {editing ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">Objectif leads</label>
              <input
                type="number"
                value={draft.leads}
                onChange={e => setDraft({ ...draft, leads: parseInt(e.target.value) || 0 })}
                className="w-full h-9 px-3 text-xs border border-[#e5e5e0] rounded-xl focus:outline-none focus:border-[#059669]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">Objectif clients gagnés</label>
              <input
                type="number"
                value={draft.clients}
                onChange={e => setDraft({ ...draft, clients: parseInt(e.target.value) || 0 })}
                className="w-full h-9 px-3 text-xs border border-[#e5e5e0] rounded-xl focus:outline-none focus:border-[#059669]"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">Objectif revenu (CAD)</label>
              <input
                type="number"
                value={draft.revenue}
                onChange={e => setDraft({ ...draft, revenue: parseInt(e.target.value) || 0 })}
                className="w-full h-9 px-3 text-xs border border-[#e5e5e0] rounded-xl focus:outline-none focus:border-[#059669]"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {progressItems.map(item => {
              const p = pct(item.actual, item.goal);
              const ms = milestoneLabel(p);
              return (
                <div key={item.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#26251e]">{item.label}</span>
                    <span className={cn('text-[9px] font-bold', ms.color)}>{ms.label}</span>
                  </div>
                  <div className="h-2 bg-[#f4f4f3] rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full transition-all duration-500', p >= 100 ? 'bg-[#059669]' : p >= 50 ? 'bg-amber-500' : 'bg-[#7a7a76]')}
                      style={{ width: `${p}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="font-bold text-[#26251e]">{item.unit}{item.actual.toLocaleString()}</span>
                    <span className="text-[#7a7a76]">/ {item.unit}{item.goal.toLocaleString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Milestones */}
      <div className="p-4 rounded-2xl border border-[#e5e5e0] bg-white space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Rappels de progression</h3>
        <div className="space-y-2">
          {progressItems.map(item => {
            const p = pct(item.actual, item.goal);
            const milestones = [25, 50, 75, 100];
            return milestones.map(m => {
              const reached = p >= m;
              return (
                <div key={`${item.label}-${m}`} className={cn('flex items-center gap-3 p-2.5 rounded-xl', reached ? 'bg-[#059669]/5 border border-[#059669]/20' : 'bg-[#f4f4f3] border border-[#e5e5e0]')}>
                  {reached
                    ? <Check className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                    : <div className="w-3.5 h-3.5 rounded-full border-2 border-[#e5e5e0] shrink-0" />}
                  <span className={cn('text-xs', reached ? 'font-bold text-[#059669]' : 'text-[#7a7a76]')}>
                    {item.label} — {m}% atteint {m === 100 ? '🎯' : ''}
                  </span>
                </div>
              );
            });
          })}
        </div>
      </div>

      {/* 6-month trend */}
      <div className="p-4 rounded-2xl border border-[#e5e5e0] bg-white space-y-4">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Tendance — 6 derniers mois (leads)</h3>
        <div className="flex items-end gap-2 h-28">
          {monthlyTrend.map(month => (
            <div key={month.label} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-[9px] font-bold text-[#26251e]">{month.count}</span>
              <div className="w-full bg-[#f4f4f3] rounded-t-md relative overflow-hidden" style={{ height: '80px' }}>
                <div
                  className="absolute bottom-0 left-0 right-0 bg-[#059669] rounded-t-md transition-all duration-500"
                  style={{ height: `${Math.round((month.count / maxTrend) * 100)}%` }}
                />
              </div>
              <span className="text-[9px] text-[#7a7a76] capitalize">{month.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main types ───────────────────────────────────────────────────────────────

type AcqTab = 'dashboard' | 'funnel' | 'channels' | 'roi' | 'goals';
type SourceFilter = 'all' | 'osm' | 'csv' | 'manual' | 'form';
type SortMode = 'recent' | 'old' | 'score_desc' | 'score_asc';

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AcquisitionRoot() {
  const { leads, updateLead, activeWorkspace } = useReach();
  const { t } = useLanguage();

  const [acqTab, setAcqTab] = useState<AcqTab>('dashboard');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [createOpen, setCreateOpen] = useState(false);
  const [csvImportOpen, setCsvImportOpen] = useState(false);

  const now = Date.now();
  const stats = useMemo(() => {
    const total = leads.length;
    const new24h = leads.filter(l => {
      if (!l.createdAt) return false;
      return now - new Date(l.createdAt).getTime() < 24 * 60 * 60 * 1000;
    }).length;
    const inContact = leads.filter(l => l.status === 'Contacted' || l.status === 'Meeting Booked').length;
    const converted = leads.filter(l => l.status === 'Won').length;
    return { total, new24h, inContact, converted };
  }, [leads, now]);

  const sourceCounts = useMemo(() => {
    const counts: Record<SourceFilter, number> = { all: leads.length, osm: 0, csv: 0, manual: 0, form: 0 };
    for (const lead of leads) {
      const src = (lead.leadSourceType || 'manual') as string;
      if (src === 'osm') counts.osm++;
      else if (src === 'csv' || src === 'import') counts.csv++;
      else if (src === 'form') counts.form++;
      else counts.manual++;
    }
    return counts;
  }, [leads]);

  const displayedLeads = useMemo(() => {
    let list = [...leads];
    if (sourceFilter !== 'all') {
      list = list.filter(l => {
        const src = l.leadSourceType || 'manual';
        if (sourceFilter === 'csv') return src === 'csv' || src === 'import';
        return src === sourceFilter;
      });
    }
    list.sort((a, b) => {
      if (sortMode === 'recent') return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sortMode === 'old') return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
      if (sortMode === 'score_desc') return (b.score ?? 0) - (a.score ?? 0);
      if (sortMode === 'score_asc') return (a.score ?? 0) - (b.score ?? 0);
      return 0;
    });
    return list;
  }, [leads, sourceFilter, sortMode]);

  const handleQualify = async (lead: Lead) => {
    try { await updateLead(lead.id, { status: 'Contacted' }); } catch { /* silent */ }
  };

  const filterTabs: { key: SourceFilter; label: string }[] = [
    { key: 'all', label: t('acquisition.source_all') },
    { key: 'osm', label: t('acquisition.source_osm') },
    { key: 'csv', label: t('acquisition.source_csv') },
    { key: 'manual', label: t('acquisition.source_manual') },
    { key: 'form', label: t('acquisition.source_form') },
  ];

  const sortOptions: { key: SortMode; label: string }[] = [
    { key: 'recent', label: t('acquisition.sort_recent') },
    { key: 'old', label: t('acquisition.sort_old') },
    { key: 'score_desc', label: t('acquisition.sort_score_desc') },
    { key: 'score_asc', label: t('acquisition.sort_score_asc') },
  ];

  const acqTabs: { key: AcqTab; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Tableau de bord', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'funnel', label: 'Entonnoir', icon: <ArrowDown className="w-4 h-4" /> },
    { key: 'channels', label: 'Sources', icon: <Globe className="w-4 h-4" /> },
    { key: 'roi', label: 'ROI', icon: <TrendingUp className="w-4 h-4" /> },
    { key: 'goals', label: 'Objectifs', icon: <Target className="w-4 h-4" /> },
  ];

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8] relative">
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />

      <div className="relative z-10 w-full px-3 sm:px-4 md:px-8 py-6 md:py-10 space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-[#26251e]">{t('acquisition.title')}</h1>
          <p className="text-xs text-[#7a7a76] font-medium">{t('acquisition.subtitle')}</p>
        </div>

        {/* Speed-to-Lead alerts */}
        <SpeedToLeadAlert leads={leads} />

        {/* Tab bar */}
        <div className="flex items-center gap-1 bg-[#f4f4f3] rounded-2xl p-1 border border-[#e5e5e0] overflow-x-auto">
          {acqTabs.map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setAcqTab(key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold transition-colors whitespace-nowrap px-3',
                acqTab === key ? 'bg-white text-[#059669] shadow-sm' : 'text-[#7a7a76] hover:text-[#26251e]'
              )}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab: Dashboard ── */}
        {acqTab === 'dashboard' && (
          <div className="space-y-5">
            {/* Dashboard sub-header with create button */}
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-[#7a7a76] uppercase tracking-wider">Tableau de bord</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCsvImportOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e5e5e0] text-[#26251e] hover:bg-[#f4f4f3] text-xs font-bold transition-colors"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Importer CSV
                </button>
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Créer un lead
                </button>
              </div>
            </div>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="Total leads" value={stats.total} />
              <StatCard label={t('acquisition.new_24h')} value={stats.new24h} accent />
              <StatCard label={t('acquisition.in_contact')} value={stats.inContact} />
              <StatCard label={t('acquisition.converted')} value={stats.converted} green />
            </div>

            {/* Source filter + sort */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="flex items-center gap-1 bg-[#f4f4f3] rounded-lg p-0.5 border border-[#e5e5e0]">
                {filterTabs.map(tab => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSourceFilter(tab.key)}
                    className={cn(
                      'inline-flex items-center gap-1 px-3 h-8 rounded-md text-xs font-bold transition-colors',
                      sourceFilter === tab.key ? 'bg-white text-[#26251e]' : 'text-[#7a7a76] hover:text-[#26251e] bg-transparent'
                    )}
                  >
                    {tab.label}
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-black leading-none ml-1', sourceFilter === tab.key ? 'bg-[#059669] text-white' : 'bg-[#e5e5e2] text-[#807d72]')}>
                      {sourceCounts[tab.key]}
                    </span>
                  </button>
                ))}
              </div>
              <select
                value={sortMode}
                onChange={e => setSortMode(e.target.value as SortMode)}
                className="text-xs border border-[#e5e5e0] rounded-lg px-2.5 h-8 bg-white text-[#26251e] focus:outline-none focus:ring-1 focus:ring-[#059669]"
              >
                {sortOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
              </select>
            </div>

            {/* Leads list */}
            {displayedLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center gap-3 bg-white border border-[#e5e5e0] rounded-2xl">
                <p className="text-sm font-semibold text-[#7a7a76]">{t('acquisition.empty')}</p>
                <p className="text-xs text-[#7a7a76]">{t('acquisition.empty_sub')}</p>
                <Link href="/prospecting" className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#059669] text-white text-xs font-bold hover:bg-[#047857] transition-colors">
                  Lancer une prospection
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {displayedLeads.map(lead => {
                  const src = lead.leadSourceType || 'manual';
                  const srcBadgeClass = sourceBadgeClasses[src] || sourceBadgeClasses.manual;
                  const srcLabel = sourceLabels[src] || src;
                  const sla = formatSLA(lead.createdAt);
                  const isContacted = ['Contacted', 'Meeting Booked', 'Won', 'Lost'].includes(lead.status);

                  return (
                    <div key={lead.id} className="flex items-center gap-4 p-4 rounded-2xl border border-[#e5e5e0] bg-white hover:border-[#059669]/30 transition-colors">
                      <span className={cn('shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide', srcBadgeClass)}>
                        {srcLabel}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[#26251e] truncate">{lead.businessName}</p>
                        <p className="text-[11px] text-[#7a7a76] truncate mt-0.5">
                          {[lead.city, lead.niche].filter(Boolean).join(' · ')}
                        </p>
                        {(lead.utmCampaign || lead.utmSource) && (
                          <p className="text-[9px] text-[#7a7a76]/60 mt-0.5 truncate">
                            {lead.utmCampaign ? `campaign: ${lead.utmCampaign}` : ''}
                            {lead.utmCampaign && lead.utmSource ? ' · ' : ''}
                            {lead.utmSource ? `src: ${lead.utmSource}` : ''}
                          </p>
                        )}
                      </div>

                      <span className={cn('shrink-0 hidden sm:inline-flex text-[9px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border', STATUS_COLORS[lead.status] || 'bg-slate-50 text-slate-500 border-slate-200')}>
                        {lead.status}
                      </span>

                      <div className="shrink-0 flex items-center gap-1">
                        {isContacted ? (
                          <span className="text-[10px] font-bold text-[#059669] flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />{t('acquisition.sla_contacted')}
                          </span>
                        ) : (
                          <>
                            <Clock className={cn('w-3.5 h-3.5', sla.level === 'green' ? 'text-[#059669]' : sla.level === 'amber' ? 'text-amber-500' : 'text-red-500')} />
                            <span className={cn('text-[10px] font-bold', sla.level === 'green' ? 'text-[#059669]' : sla.level === 'amber' ? 'text-amber-600' : 'text-red-600')}>
                              {sla.label}
                            </span>
                          </>
                        )}
                      </div>

                      {typeof lead.score === 'number' && lead.score > 0 && (
                        <div className="shrink-0 hidden sm:block">
                          <ScoreBadge score={lead.score} />
                        </div>
                      )}

                      <div className="shrink-0 flex items-center gap-2">
                        {lead.status === 'New' && (
                          <button
                            type="button"
                            onClick={() => handleQualify(lead)}
                            className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-[#059669]/10 text-[#059669] hover:bg-[#059669] hover:text-white transition-colors"
                          >
                            {t('acquisition.qualify')}
                          </button>
                        )}
                        <Link href={`/leads/${lead.id}`} className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-[#e5e5e0] text-[#7a7a76] hover:bg-[#f4f4f3] hover:text-[#26251e] transition-colors flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" />{t('acquisition.view')}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Funnel ── */}
        {acqTab === 'funnel' && <FunnelTab leads={leads} />}

        {/* ── Tab: Channels ── */}
        {acqTab === 'channels' && <ChannelsTab leads={leads} />}

        {/* ── Tab: ROI ── */}
        {acqTab === 'roi' && <RoiTab leads={leads} />}

        {/* ── Tab: Goals ── */}
        {acqTab === 'goals' && <GoalsTab leads={leads} />}
      </div>

      {/* Create Lead Dialog */}
      <CreateLeadDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => {}}
      />
      <CsvImportDialog
        open={csvImportOpen}
        onClose={() => setCsvImportOpen(false)}
        onImported={() => {}}
      />
    </div>
  );
}
