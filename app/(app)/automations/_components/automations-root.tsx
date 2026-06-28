'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getApiUrl } from '@/lib/api-helper';
import { useReach } from '@/lib/reach-context';
import {
  Zap, Moon, Mail, Tag, RefreshCw, Play, CheckCircle2,
  XCircle, Clock, AlertCircle, Activity, Bot, Database
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AutomationSettings {
  autoEnrichOnImport: boolean;
  autoEnrichScheduled: boolean;
  autoEmailOnEnrichment: boolean;
  autoTagReplies: boolean;
}

interface NotificationRow {
  id: string;
  type: string;
  title: string;
  body: string | null;
  created_at: string;
}

type RunStatus = 'idle' | 'running' | 'success' | 'error';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'À l\'instant';
  if (m < 60) return `Il y a ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  return `Il y a ${Math.floor(h / 24)}j`;
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'active' | 'inactive' | 'running' | 'error' }) {
  const config = {
    active: { label: 'Actif', color: 'bg-[#059669]/10 text-[#059669]' },
    inactive: { label: 'Inactif', color: 'bg-[#e5e5e0] text-[#7a7a76]' },
    running: { label: 'En cours…', color: 'bg-blue-50 text-blue-700 animate-pulse' },
    error: { label: 'Erreur', color: 'bg-red-50 text-red-700' },
  };
  const { label, color } = config[status];
  return (
    <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', color)}>{label}</span>
  );
}

// ─── AutomationCard ──────────────────────────────────────────────────────────

interface AutomationCardProps {
  icon: React.ElementType;
  title: string;
  description: string;
  enabled: boolean;
  onToggle: (v: boolean) => void;
  lastRun?: string | null;
  nextRun?: string | null;
  stats?: string | null;
  cronKey?: string;
  onRun?: () => Promise<void>;
  runStatus: RunStatus;
}

function AutomationCard({
  icon: Icon, title, description, enabled, onToggle,
  lastRun, nextRun, stats, cronKey, onRun, runStatus,
}: AutomationCardProps) {
  const cardStatus: 'active' | 'inactive' | 'running' | 'error' =
    runStatus === 'running' ? 'running' :
    runStatus === 'error' ? 'error' :
    enabled ? 'active' : 'inactive';

  return (
    <div className={cn(
      'rounded-xl border bg-white p-5 space-y-4 transition-all',
      enabled ? 'border-[#059669]/30 shadow-[0_0_0_1px_#05966918]' : 'border-[#e5e5e0]',
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
            enabled ? 'bg-[#059669]/10' : 'bg-[#f4f4f3]',
          )}>
            <Icon className={cn('h-4 w-4', enabled ? 'text-[#059669]' : 'text-[#7a7a76]')} />
          </div>
          <div>
            <p className="text-sm font-bold text-[#26251e]">{title}</p>
            <p className="text-[11px] text-[#7a7a76] mt-0.5 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge status={cardStatus} />
          {/* Toggle */}
          <button
            onClick={() => onToggle(!enabled)}
            className={cn(
              'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
              enabled ? 'bg-[#059669]' : 'bg-[#d1d5db]',
            )}
            role="switch" aria-checked={enabled}
          >
            <span className={cn(
              'inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition-transform',
              enabled ? 'translate-x-4' : 'translate-x-0',
            )} />
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between gap-2 text-[10px] text-[#7a7a76]">
        <div className="flex items-center gap-3">
          {lastRun && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Dernier run : {timeAgo(lastRun)}
            </span>
          )}
          {nextRun && (
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              {nextRun}
            </span>
          )}
          {stats && (
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {stats}
            </span>
          )}
        </div>

        {onRun && (
          <button
            onClick={onRun}
            disabled={runStatus === 'running'}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors',
              runStatus === 'running'
                ? 'bg-[#f4f4f3] text-[#7a7a76] cursor-not-allowed'
                : 'bg-[#059669]/10 text-[#059669] hover:bg-[#059669]/20',
            )}
          >
            {runStatus === 'running' ? (
              <RefreshCw className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <Play className="h-2.5 w-2.5" />
            )}
            {runStatus === 'running' ? 'En cours…' : 'Run maintenant'}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── ActivityLog ─────────────────────────────────────────────────────────────

function ActivityLog({ items }: { items: NotificationRow[] }) {
  const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
    scraping_done: { icon: Database, color: '#059669' },
    email_sent: { icon: Mail, color: '#2563eb' },
    info: { icon: Tag, color: '#7c3aed' },
    report: { icon: Activity, color: '#d97706' },
    digest: { icon: Bot, color: '#059669' },
  };

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-[#e5e5e0] bg-white p-8 text-center">
        <Activity className="h-8 w-8 text-[#e5e5e0] mx-auto mb-2" />
        <p className="text-sm font-semibold text-[#26251e]">Aucune activité récente</p>
        <p className="text-xs text-[#7a7a76] mt-1">Lance une automation pour voir l&apos;historique ici.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#e5e5e0] bg-white overflow-hidden">
      <div className="divide-y divide-[#e5e5e0]">
        {items.map(item => {
          const conf = TYPE_CONFIG[item.type] || { icon: Activity, color: '#7a7a76' };
          const Icon = conf.icon;
          return (
            <div key={item.id} className="flex items-start gap-3 px-4 py-3">
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: `${conf.color}18` }}>
                <Icon className="h-3 w-3" style={{ color: conf.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[#26251e] leading-snug">{item.title}</p>
                {item.body && <p className="text-[10px] text-[#7a7a76] mt-0.5 leading-relaxed">{item.body}</p>}
              </div>
              <span className="text-[10px] text-[#7a7a76] shrink-0 mt-0.5">{timeAgo(item.created_at)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AutomationsRoot() {
  const { activeWorkspace } = useReach();
  const [settings, setSettings] = useState<AutomationSettings>({
    autoEnrichOnImport: false,
    autoEnrichScheduled: false,
    autoEmailOnEnrichment: false,
    autoTagReplies: true,
  });
  const [activityLog, setActivityLog] = useState<NotificationRow[]>([]);
  const [runStatuses, setRunStatuses] = useState<Record<string, RunStatus>>({});
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [{ data: s }, { data: notifications }] = await Promise.all([
      supabase.from('settings')
        .select('auto_enrich_on_import, auto_enrich_scheduled, auto_email_on_enrichment, auto_tag_replies')
        .eq('user_id', user.id)
        .maybeSingle(),
      supabase.from('notifications')
        .select('id, type, title, body, created_at')
        .eq('user_id', user.id)
        .in('type', ['scraping_done', 'email_sent', 'info', 'report', 'digest'])
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    if (s) {
      setSettings({
        autoEnrichOnImport: s.auto_enrich_on_import ?? false,
        autoEnrichScheduled: s.auto_enrich_scheduled ?? false,
        autoEmailOnEnrichment: s.auto_email_on_enrichment ?? false,
        autoTagReplies: s.auto_tag_replies ?? true,
      });
    }
    setActivityLog(notifications || []);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30_000);
    return () => clearInterval(interval);
  }, [loadData]);

  const saveToggle = async (key: keyof AutomationSettings, value: boolean) => {
    setSettings(p => ({ ...p, [key]: value }));
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const dbKey = {
      autoEnrichOnImport: 'auto_enrich_on_import',
      autoEnrichScheduled: 'auto_enrich_scheduled',
      autoEmailOnEnrichment: 'auto_email_on_enrichment',
      autoTagReplies: 'auto_tag_replies',
    }[key];
    await supabase.from('settings').update({ [dbKey]: value, updated_at: new Date().toISOString() }).eq('user_id', user.id);
  };

  const triggerAutomation = async (key: string) => {
    setRunStatuses(p => ({ ...p, [key]: 'running' }));
    try {
      const res = await fetch(getApiUrl('/api/automations/trigger'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ automation: key }),
      });
      setRunStatuses(p => ({ ...p, [key]: res.ok ? 'success' : 'error' }));
      // Reload data after run
      setTimeout(() => {
        loadData();
        setRunStatuses(p => ({ ...p, [key]: 'idle' }));
      }, 3000);
    } catch {
      setRunStatuses(p => ({ ...p, [key]: 'error' }));
      setTimeout(() => setRunStatuses(p => ({ ...p, [key]: 'idle' })), 3000);
    }
  };

  // Stats from activity log
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const emailsSentToday = activityLog.filter(n => n.type === 'email_sent' && new Date(n.created_at) >= todayStart).length;
  const enrichmentsThisWeek = activityLog.filter(n => n.type === 'scraping_done').length;
  const tagsApplied = activityLog.filter(n => n.type === 'info' && n.title?.includes('tagué')).length;
  const lastEnrichment = activityLog.find(n => n.type === 'scraping_done');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-5 w-5 animate-spin text-[#7a7a76]" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-full px-4 sm:px-6 py-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#26251e] flex items-center gap-2">
            <Zap className="h-5 w-5 text-[#059669]" />
            Centre d&apos;automations
          </h1>
          <p className="text-xs text-[#7a7a76] mt-0.5">
            Surveille et contrôle toutes tes automations en temps réel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#7a7a76]">Mis à jour {timeAgo(lastRefresh.toISOString())}</span>
          <button onClick={loadData}
            className="flex items-center gap-1.5 px-3 h-7 rounded-lg border border-[#e5e5e0] bg-white text-[10px] font-bold text-[#555552] hover:bg-[#f4f4f3] transition-colors">
            <RefreshCw className="h-3 w-3" />
            Actualiser
          </button>
        </div>
      </div>

      {/* Global stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Enrichissements (7j)', value: String(enrichmentsThisWeek), icon: Database, color: '#059669' },
          { label: 'Emails auto (aujourd\'hui)', value: String(emailsSentToday), icon: Mail, color: '#2563eb' },
          { label: 'Tags appliqués (7j)', value: String(tagsApplied), icon: Tag, color: '#7c3aed' },
          { label: 'Automations actives', value: String(Object.values(settings).filter(Boolean).length), icon: Zap, color: '#059669' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="rounded-xl border border-[#e5e5e0] bg-white px-4 py-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <Icon className="h-3 w-3" style={{ color }} />
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">{label}</span>
            </div>
            <p className="text-2xl font-bold text-[#26251e]">{value}</p>
          </div>
        ))}
      </div>

      {/* Automation cards */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76] mb-3">Automations configurées</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <AutomationCard
            icon={Database}
            title="Enrichissement à l'import"
            description="Enrichit automatiquement chaque lead importé depuis la Prospection (contact, site web, description IA)."
            enabled={settings.autoEnrichOnImport}
            onToggle={v => saveToggle('autoEnrichOnImport', v)}
            stats={`${enrichmentsThisWeek} enrichissements cette semaine`}
            lastRun={lastEnrichment?.created_at}
            runStatus={runStatuses['import'] || 'idle'}
          />
          <AutomationCard
            icon={Moon}
            title="Enrichissement nocturne"
            description="Enrichit chaque nuit jusqu'à 50 leads sans enrichissement ou enrichis il y a plus de 7 jours."
            enabled={settings.autoEnrichScheduled}
            onToggle={v => saveToggle('autoEnrichScheduled', v)}
            nextRun={settings.autoEnrichScheduled ? 'Chaque nuit à 2h' : undefined}
            lastRun={lastEnrichment?.created_at}
            cronKey="enrich-leads"
            onRun={() => triggerAutomation('enrich-leads')}
            runStatus={runStatuses['enrich-leads'] || 'idle'}
          />
          <AutomationCard
            icon={Mail}
            title="Email auto post-enrichissement"
            description="Génère et envoie un email de prospection personnalisé dès qu'un lead est enrichi avec une adresse email."
            enabled={settings.autoEmailOnEnrichment}
            onToggle={v => saveToggle('autoEmailOnEnrichment', v)}
            stats={emailsSentToday > 0 ? `${emailsSentToday} email(s) envoyé(s) aujourd'hui` : 'Aucun email envoyé aujourd\'hui'}
            runStatus={runStatuses['email'] || 'idle'}
          />
          <AutomationCard
            icon={Tag}
            title="Auto-tagging des réponses"
            description="Classe automatiquement les réponses Gmail et applique un tag sur le lead (Intéressé, RDV demandé, Pas intéressé…)."
            enabled={settings.autoTagReplies}
            onToggle={v => saveToggle('autoTagReplies', v)}
            stats={tagsApplied > 0 ? `${tagsApplied} tag(s) appliqué(s) cette semaine` : undefined}
            cronKey="gmail-replies"
            onRun={() => triggerAutomation('gmail-replies')}
            runStatus={runStatuses['gmail-replies'] || 'idle'}
          />
        </div>
      </div>

      {/* System crons */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76] mb-3">Jobs système planifiés</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { key: 'gmail-replies', icon: Mail, title: 'Gmail — Vérif. réponses', desc: 'Vérifie les nouvelles réponses et les classe par IA.', schedule: 'Toutes les heures' },
            { key: 'email-sequences', icon: RefreshCw, title: 'Séquences email', desc: 'Envoie les étapes planifiées des séquences de prospection.', schedule: 'Toutes les heures' },
            { key: 'weekly-report', icon: Activity, title: 'Rapport hebdomadaire', desc: 'Génère le rapport IA de comportement et d\'opportunités.', schedule: 'Chaque lundi' },
            { key: 'process-queue', icon: Bot, title: 'File d\'attente IA', desc: 'Traite les requêtes IA en file d\'attente.', schedule: 'Toutes les 5 min' },
          ].map(({ key, icon: Icon, title, desc, schedule }) => (
            <div key={key} className="rounded-xl border border-[#e5e5e0] bg-white p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f4f4f3]">
                  <Icon className="h-3.5 w-3.5 text-[#555552]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[#26251e]">{title}</p>
                  <p className="text-[10px] text-[#7a7a76] mt-0.5">{desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#7a7a76] flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />
                  {schedule}
                </span>
                <button
                  onClick={() => triggerAutomation(key)}
                  disabled={runStatuses[key] === 'running'}
                  className={cn(
                    'flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold transition-colors',
                    runStatuses[key] === 'running'
                      ? 'bg-[#f4f4f3] text-[#7a7a76] cursor-not-allowed'
                      : runStatuses[key] === 'success'
                        ? 'bg-[#059669]/10 text-[#059669]'
                        : runStatuses[key] === 'error'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-[#f4f4f3] text-[#555552] hover:bg-[#059669]/10 hover:text-[#059669]',
                  )}
                >
                  {runStatuses[key] === 'running' ? <RefreshCw className="h-2 w-2 animate-spin" /> :
                   runStatuses[key] === 'success' ? <CheckCircle2 className="h-2 w-2" /> :
                   runStatuses[key] === 'error' ? <XCircle className="h-2 w-2" /> :
                   <Play className="h-2 w-2" />}
                  {runStatuses[key] === 'running' ? 'Running…' :
                   runStatuses[key] === 'success' ? 'Succès' :
                   runStatuses[key] === 'error' ? 'Erreur' : 'Run'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Activity log */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-[#7a7a76] mb-3">Activité récente (7 jours)</h2>
        <ActivityLog items={activityLog} />
      </div>
    </div>
  );
}
