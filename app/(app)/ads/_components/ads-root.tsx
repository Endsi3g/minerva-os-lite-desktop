'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/lib/language-context';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Zap,
  Link2,
  Link2Off,
  RefreshCw,
  ChevronRight,
  ArrowUp,
  Clock,
  Target,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

type AdsTab = 'facebook' | 'google' | 'attribution';

interface FbConnection {
  id: string;
  page_id: string;
  page_name: string;
  form_id: string;
  form_name: string;
  status: string;
  leads_count: number;
  connected_at: string;
}

interface FbPage {
  id: string;
  name: string;
  accessToken: string;
}

interface FbForm {
  id: string;
  name: string;
  status: string;
  leads_count: number;
}

interface AttributionSummary {
  totalLeads: number;
  totalMeetings: number;
  totalWon: number;
  totalPipeline: number;
  meetingRate: number;
  avgFirstContactMin: number | null;
}

interface AttributionSource {
  source: string;
  total: number;
  contacted: number;
  meetings: number;
  won: number;
  pipeline: number;
  contactRate: number;
  meetingRate: number;
  avgFirstContactMin: number | null;
}

function sourceLabel(source: string) {
  const map: Record<string, string> = {
    facebook: 'Facebook Lead Ads',
    google: 'Google Ads',
    organic: 'Organique / OSM',
    osm: 'OpenStreetMap',
    manual: 'Manuel',
  };
  return map[source] || source;
}

function sourceColor(source: string) {
  const map: Record<string, string> = {
    facebook: 'bg-blue-100 text-blue-700 border-blue-200',
    google: 'bg-red-100 text-red-700 border-red-200',
    organic: 'bg-[#059669]/10 text-[#059669] border-[#059669]/20',
    osm: 'bg-[#059669]/10 text-[#059669] border-[#059669]/20',
    manual: 'bg-[#f4f4f3] text-[#7a7a76] border-[#e5e5e0]',
  };
  return map[source] || 'bg-[#f4f4f3] text-[#7a7a76] border-[#e5e5e0]';
}

function formatMinutes(min: number | null) {
  if (min === null) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Facebook Tab ─────────────────────────────────────────────────────────────

function FacebookTab({ workspaceId }: { workspaceId: string }) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connections, setConnections] = useState<FbConnection[]>([]);
  const [pages, setPages] = useState<FbPage[]>([]);
  const [selectedPage, setSelectedPage] = useState<FbPage | null>(null);
  const [forms, setForms] = useState<FbForm[]>([]);
  const [loadingForms, setLoadingForms] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connectingForm, setConnectingForm] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const [statusRes, pagesRes] = await Promise.all([
        fetch(getApiUrl(`/api/ads/facebook?action=status&workspaceId=${workspaceId}`)),
        fetch(getApiUrl(`/api/ads/facebook?action=pages&workspaceId=${workspaceId}`)),
      ]);
      const statusData = await statusRes.json();
      setConnections(statusData.connections || []);

      const pagesData = await pagesRes.json();
      setConnected(pagesData.connected || false);
      setPages(pagesData.pages || []);
    } finally {
      setLoadingStatus(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchStatus();
    // Detect OAuth return
    const url = new URL(window.location.href);
    if (url.searchParams.get('fb') === 'connected') {
      toast.success('Facebook connecté avec succès !');
      window.history.replaceState({}, '', '/ads?tab=facebook');
      fetchStatus();
    }
    if (url.searchParams.get('error')) {
      toast.error('Échec de la connexion Facebook.');
      window.history.replaceState({}, '', '/ads?tab=facebook');
    }
  }, [fetchStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await fetch(getApiUrl(`/api/ads/facebook?action=auth_url&workspaceId=${workspaceId}`));
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast.error("Erreur lors de la connexion Facebook.");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await fetch(getApiUrl('/api/ads/facebook'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'disconnect', workspaceId }),
    });
    setConnected(false);
    setPages([]);
    setForms([]);
    setSelectedPage(null);
    setConnections([]);
    toast.success('Facebook déconnecté.');
  };

  const handleSelectPage = async (page: FbPage) => {
    setSelectedPage(page);
    setLoadingForms(true);
    try {
      const res = await fetch(getApiUrl(`/api/ads/facebook?action=forms&workspaceId=${workspaceId}&pageId=${page.id}`));
      const data = await res.json();
      setForms(data.forms || []);
    } finally {
      setLoadingForms(false);
    }
  };

  const handleConnectForm = async (form: FbForm) => {
    if (!selectedPage) return;
    setConnectingForm(form.id);
    try {
      const res = await fetch(getApiUrl('/api/ads/facebook'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'connect_form',
          workspaceId,
          pageId: selectedPage.id,
          pageName: selectedPage.name,
          formId: form.id,
          formName: form.name,
          pageAccessToken: selectedPage.accessToken,
        }),
      });
      if (res.ok) {
        toast.success(`Formulaire "${form.name}" connecté. Les leads arrivent automatiquement.`);
        fetchStatus();
      } else {
        toast.error('Erreur lors de la connexion du formulaire.');
      }
    } finally {
      setConnectingForm(null);
    }
  };

  if (loadingStatus) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="w-5 h-5 animate-spin text-[#059669]" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-[#e5e5e0] bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg select-none">
            f
          </div>
          <div>
            <p className="text-sm font-bold text-[#26251e]">Facebook Lead Ads</p>
            <p className="text-xs text-[#7a7a76]">Ingestion automatique via webhook Meta</p>
          </div>
        </div>
        {connected ? (
          <div className="flex items-center gap-2">
            <Badge className="bg-[#059669]/10 text-[#059669] border-[#059669]/20 text-[10px]">
              <CheckCircle2 className="w-2.5 h-2.5 mr-1" />Connecté
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleDisconnect} className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
              <Link2Off className="w-3 h-3 mr-1" />Déconnecter
            </Button>
          </div>
        ) : (
          <Button onClick={handleConnect} disabled={connecting} className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5">
            {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
            Connecter Facebook
          </Button>
        )}
      </div>

      {/* Active connections */}
      {connections.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Formulaires connectés</h3>
          {connections.map(conn => (
            <div key={conn.id} className="flex items-center justify-between p-3 rounded-xl border border-[#e5e5e0] bg-white">
              <div>
                <p className="text-xs font-bold text-[#26251e]">{conn.form_name}</p>
                <p className="text-[10px] text-[#7a7a76]">{conn.page_name} · {conn.leads_count} lead{conn.leads_count > 1 ? 's' : ''}</p>
              </div>
              <Badge className="bg-[#059669]/10 text-[#059669] border-[#059669]/20 text-[9px]">actif</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Step 2: Select page */}
      {connected && pages.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Sélectionner une Page</h3>
          <div className="space-y-1.5">
            {pages.map(page => (
              <button
                key={page.id}
                type="button"
                onClick={() => handleSelectPage(page)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors',
                  selectedPage?.id === page.id
                    ? 'border-[#059669]/30 bg-[#059669]/5'
                    : 'border-[#e5e5e0] hover:border-[#059669]/20 bg-white'
                )}
              >
                <span className="text-xs font-semibold text-[#26251e]">{page.name}</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#7a7a76]" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Select form */}
      {selectedPage && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
            Formulaires de {selectedPage.name}
          </h3>
          {loadingForms ? (
            <div className="flex items-center gap-2 p-3 text-xs text-[#7a7a76]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />Chargement des formulaires…
            </div>
          ) : forms.length === 0 ? (
            <p className="text-xs text-[#7a7a76] px-1">Aucun formulaire Lead Ads trouvé sur cette page.</p>
          ) : (
            forms.map(form => {
              const isConnected = connections.some(c => c.form_id === form.id);
              return (
                <div key={form.id} className="flex items-center justify-between p-3 rounded-xl border border-[#e5e5e0] bg-white">
                  <div>
                    <p className="text-xs font-bold text-[#26251e]">{form.name}</p>
                    <p className="text-[10px] text-[#7a7a76]">{form.leads_count} leads historiques · {form.status}</p>
                  </div>
                  {isConnected ? (
                    <Badge className="bg-[#059669]/10 text-[#059669] border-[#059669]/20 text-[9px]"><CheckCircle2 className="w-2.5 h-2.5 mr-1" />Connecté</Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnectForm(form)}
                      disabled={connectingForm === form.id}
                      className="h-7 bg-[#059669] hover:bg-[#047857] text-white text-xs gap-1"
                    >
                      {connectingForm === form.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                      Connecter
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Webhook info */}
      <div className="p-3 rounded-xl bg-[#f4f4f3] border border-[#e5e5e0] space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Webhook Meta</p>
        <code className="text-[10px] text-[#26251e] break-all font-mono">
          {process.env.NEXT_PUBLIC_APP_URL || 'https://votre-app.vercel.app'}/api/ads/facebook/webhook
        </code>
        <p className="text-[9px] text-[#7a7a76]">Token de vérification : <span className="font-mono">minerva_fb_webhook</span></p>
      </div>
    </div>
  );
}

// ── Google Ads Tab ────────────────────────────────────────────────────────────

function GoogleAdsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-2xl border border-[#e5e5e0] bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#e5e5e0] flex items-center justify-center overflow-hidden">
            <Image src="https://www.google.com/s2/favicons?domain=ads.google.com&sz=32" alt="Google Ads" width={24} height={24} unoptimized />
          </div>
          <div>
            <p className="text-sm font-bold text-[#26251e]">Google Ads</p>
            <p className="text-xs text-[#7a7a76]">Import UTM + GCLID tracking</p>
          </div>
        </div>
        <Badge className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
          <AlertTriangle className="w-2.5 h-2.5 mr-1" />Bientôt
        </Badge>
      </div>

      <div className="p-4 rounded-2xl border border-[#e5e5e0] bg-[#fafaf8] space-y-3">
        <p className="text-xs font-bold text-[#26251e]">Comment ça fonctionne</p>
        <div className="space-y-2">
          {[
            { icon: <Target className="w-3.5 h-3.5 text-[#059669]" />, text: "Ajoutez les paramètres UTM à vos URLs de destination dans Google Ads" },
            { icon: <Zap className="w-3.5 h-3.5 text-[#059669]" />, text: "Minerva capte automatiquement utm_source, utm_campaign, gclid à chaque lead entrant" },
            { icon: <BarChart3 className="w-3.5 h-3.5 text-[#059669]" />, text: "Le dashboard Attribution agrège et compare vos coûts publicitaires vs leads générés" },
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-2.5">
              {step.icon}
              <p className="text-xs text-[#7a7a76] leading-relaxed">{step.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-2 p-3 bg-white rounded-xl border border-[#e5e5e0]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1.5">Paramètres UTM recommandés</p>
          <code className="text-[10px] font-mono text-[#26251e] break-all leading-relaxed">
            ?utm_source=google&utm_medium=cpc&utm_campaign={'{nom_campagne}'}&gclid={'{gclid}'}
          </code>
        </div>
      </div>
    </div>
  );
}

// ── Attribution Tab ──────────────────────────────────────────────────────────

function AttributionTab({ workspaceId }: { workspaceId: string }) {
  const [summary, setSummary] = useState<AttributionSummary | null>(null);
  const [bySource, setBySource] = useState<AttributionSource[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/ads/attribution?workspaceId=${workspaceId}`));
      const data = await res.json();
      setSummary(data.summary);
      setBySource(data.bySource || []);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <Loader2 className="w-5 h-5 animate-spin text-[#059669]" />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* KPI row */}
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Leads total', value: summary.totalLeads, icon: <Users className="w-3.5 h-3.5" />, color: 'text-[#26251e]' },
            { label: 'Taux RDV', value: `${summary.meetingRate}%`, icon: <Target className="w-3.5 h-3.5" />, color: 'text-[#059669]' },
            { label: 'Délai moyen', value: formatMinutes(summary.avgFirstContactMin), icon: <Clock className="w-3.5 h-3.5" />, color: summary.avgFirstContactMin && summary.avgFirstContactMin > 5 ? 'text-red-600' : 'text-[#059669]' },
            { label: 'Pipeline gagné', value: `${(summary.totalPipeline / 1000).toFixed(1)}k€`, icon: <TrendingUp className="w-3.5 h-3.5" />, color: 'text-[#059669]' },
          ].map(kpi => (
            <div key={kpi.label} className="p-3 rounded-2xl border border-[#e5e5e0] bg-white space-y-1">
              <div className={cn('flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider', kpi.color)}>
                {kpi.icon}{kpi.label}
              </div>
              <p className="text-xl font-black text-[#26251e]">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* By source table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Performance par source</h3>
          <button onClick={fetchData} className="text-[10px] text-[#059669] hover:text-[#047857] flex items-center gap-1">
            <RefreshCw className="w-2.5 h-2.5" />Actualiser
          </button>
        </div>

        {bySource.length === 0 ? (
          <div className="text-center py-10 text-sm text-[#7a7a76]">
            Aucune donnée d'attribution disponible.<br />
            <span className="text-xs">Commencez à enrichir vos leads avec leur source.</span>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#e5e5e0] overflow-hidden bg-white">
            <div className="grid grid-cols-6 gap-2 px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-[#7a7a76] border-b border-[#e5e5e0] bg-[#fafaf8]">
              <span className="col-span-2">Source</span>
              <span className="text-right">Leads</span>
              <span className="text-right">Tx RDV</span>
              <span className="text-right">Délai</span>
              <span className="text-right">Pipeline</span>
            </div>
            {bySource.map((s, i) => (
              <div key={s.source} className={cn('grid grid-cols-6 gap-2 px-4 py-3 items-center', i < bySource.length - 1 && 'border-b border-[#e5e5e0]')}>
                <span className={cn('col-span-2 text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit', sourceColor(s.source))}>
                  {sourceLabel(s.source)}
                </span>
                <span className="text-right text-xs font-bold text-[#26251e]">{s.total}</span>
                <span className={cn('text-right text-xs font-bold', s.meetingRate >= 30 ? 'text-[#059669]' : s.meetingRate >= 15 ? 'text-amber-600' : 'text-red-600')}>
                  {s.meetingRate}%
                </span>
                <span className={cn('text-right text-xs font-semibold', s.avgFirstContactMin !== null && s.avgFirstContactMin > 5 ? 'text-red-600' : 'text-[#059669]')}>
                  {formatMinutes(s.avgFirstContactMin)}
                </span>
                <span className="text-right text-xs font-bold text-[#26251e]">
                  {s.pipeline > 0 ? `${(s.pipeline / 1000).toFixed(1)}k€` : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Speed-to-lead alert */}
      {summary?.avgFirstContactMin !== null && summary?.avgFirstContactMin !== undefined && summary.avgFirstContactMin > 5 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-red-200 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-red-800">Speed-to-Lead : délai trop élevé</p>
            <p className="text-xs text-red-700 mt-0.5">
              Délai moyen de {formatMinutes(summary.avgFirstContactMin)} avant le premier contact.
              Les études montrent qu'un contact en moins de 5 min multiplie la conversion par 9.
            </p>
          </div>
        </div>
      )}
      {summary?.avgFirstContactMin !== null && summary?.avgFirstContactMin !== undefined && summary.avgFirstContactMin <= 5 && summary.avgFirstContactMin > 0 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-[#059669]/20 bg-[#059669]/5">
          <ArrowUp className="w-4 h-4 text-[#059669] mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-[#059669]">Speed-to-Lead optimal</p>
            <p className="text-xs text-[#047857] mt-0.5">
              Délai moyen de {formatMinutes(summary.avgFirstContactMin)} — excellent ! Vous contactez vos leads dans la fenêtre idéale.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────

export default function AdsRoot() {
  const { t } = useLanguage();
  const { activeWorkspace } = useReach();
  const [activeTab, setActiveTab] = useState<AdsTab>('facebook');

  // Detect tab from URL param
  useEffect(() => {
    const url = new URL(window.location.href);
    const tab = url.searchParams.get('tab') as AdsTab | null;
    if (tab && ['facebook', 'google', 'attribution'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const tabs: { key: AdsTab; label: string; icon: React.ReactNode }[] = [
    { key: 'facebook', label: 'Facebook Lead Ads', icon: <span className="w-4 h-4 flex items-center justify-center font-black text-blue-600 text-base leading-none">f</span> },
    { key: 'google', label: 'Google Ads', icon: <Target className="w-4 h-4" /> },
    { key: 'attribution', label: t('attribution.title') || 'Attribution', icon: <BarChart3 className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#fafaf8] p-6 md:p-8">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-[#26251e] tracking-tight">Publicité & Attribution</h1>
        <p className="text-sm text-[#7a7a76] mt-0.5">Connectez vos sources d'acquisition et analysez la performance de vos campagnes</p>
      </div>

      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-[#f4f4f3] rounded-2xl p-1 border border-[#e5e5e0] mb-6 w-full max-w-lg">
        {tabs.map(({ key, label, icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold transition-colors',
              activeTab === key ? 'bg-white text-[#059669] shadow-sm' : 'text-[#7a7a76] hover:text-[#26251e]'
            )}
          >
            {icon}
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="max-w-2xl">
        {activeTab === 'facebook' && <FacebookTab workspaceId={activeWorkspace?.id || ''} />}
        {activeTab === 'google' && <GoogleAdsTab />}
        {activeTab === 'attribution' && <AttributionTab workspaceId={activeWorkspace?.id || ''} />}
      </div>
    </div>
  );
}
