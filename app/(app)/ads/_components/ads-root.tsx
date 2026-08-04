'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '@/lib/language-context';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  BarChart3, Zap, Link2, Link2Off, RefreshCw,
  ChevronRight, ChevronDown, ArrowUp,
  Clock, Target, TrendingUp, Users, AlertTriangle,
  CheckCircle2, Loader2, Copy, Check, Camera,
  DollarSign, MousePointer, Activity, Sparkles,
  Globe, Info, MonitorSmartphone,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';

type AdsTab = 'overview' | 'facebook' | 'google' | 'create' | 'history';

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

interface AdVariation {
  variation: 'A' | 'B' | 'C';
  headline: string;
  description: string;
  cta: string;
  hook: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function srcLabel(source: string) {
  const map: Record<string, string> = {
    facebook: 'Facebook Lead Ads',
    google: 'Google Ads',
    organic: 'Organique / OSM',
    osm: 'OpenStreetMap',
    manual: 'Manuel',
    csv: 'Import CSV',
    form: 'Formulaire Web',
  };
  return map[source] || source;
}

function srcColor(source: string) {
  const map: Record<string, string> = {
    facebook: 'bg-blue-100 text-blue-700 border-blue-200',
    google: 'bg-red-100 text-red-700 border-red-200',
    organic: 'bg-[#167f5b]/10 text-[#167f5b] border-[#167f5b]/20',
    osm: 'bg-[#167f5b]/10 text-[#167f5b] border-[#167f5b]/20',
    manual: 'bg-[#f4f4f3] text-[#8A9098] border-[#e5e5e0]',
  };
  return map[source] || 'bg-[#f4f4f3] text-[#8A9098] border-[#e5e5e0]';
}

function fmtMin(min: number | null) {
  if (min === null) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// ── Shared sub-components ─────────────────────────────────────────────────────

function AccordionSection({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-[#e5e5e0] rounded-2xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#fafaf8] transition-colors"
      >
        <span className="text-sm font-bold text-[#14171A]">{title}</span>
        <ChevronDown className={cn('w-4 h-4 text-[#8A9098] transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[#e5e5e0]">
          {children}
        </div>
      )}
    </div>
  );
}

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const go = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier.');
    }
  };
  return (
    <button
      type="button"
      onClick={go}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#e5e5e0] bg-white text-[#8A9098] hover:bg-[#f4f4f3] hover:text-[#14171A] text-[10px] font-bold transition-colors"
    >
      {copied ? <Check className="w-3 h-3 text-[#167f5b]" /> : <Copy className="w-3 h-3" />}
      {label ?? (copied ? 'Copié !' : 'Copier')}
    </button>
  );
}

function CharCount({ value, max }: { value: string; max: number }) {
  const n = value.length;
  return (
    <span className={cn('text-[9px] font-mono font-bold', n > max ? 'text-red-500' : 'text-[#167f5b]')}>
      {n}/{max}
    </span>
  );
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
  const [appConfigured, setAppConfigured] = useState<boolean | null>(null);

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const [statusRes, pagesRes, configRes] = await Promise.all([
        fetch(getApiUrl(`/api/ads/facebook?action=status&workspaceId=${workspaceId}`)),
        fetch(getApiUrl(`/api/ads/facebook?action=pages&workspaceId=${workspaceId}`)),
        fetch(getApiUrl('/api/ads/facebook?action=config_status')),
      ]);
      const statusData = await statusRes.json();
      setConnections(statusData.connections || []);
      const pagesData = await pagesRes.json();
      setConnected(pagesData.connected || false);
      setPages(pagesData.pages || []);
      const configData = await configRes.json();
      setAppConfigured(!!configData.configured);
    } finally {
      setLoadingStatus(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchStatus();
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
      if (res.status === 501) {
        toast.error("L'app Meta n'est pas encore configurée côté serveur — voir la section Configuration ci-dessous.");
        return;
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch {
      toast.error('Erreur lors de la connexion Facebook.');
    } finally {
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
        toast.success(`Formulaire "${form.name}" connecté.`);
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
      <Loader2 className="w-5 h-5 animate-spin text-[#167f5b]" />
    </div>
  );

  const totalFbLeads = connections.reduce((s, c) => s + c.leads_count, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-[#e5e5e0] bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg select-none">f</div>
          <div>
            <p className="text-sm font-bold text-[#14171A]">Facebook Lead Ads</p>
            <p className="text-xs text-[#8A9098]">Ingestion automatique via webhook Meta</p>
          </div>
        </div>
        {connected ? (
          <div className="flex items-center gap-2">
            <Badge className="bg-[#167f5b]/10 text-[#167f5b] border-[#167f5b]/20 text-[10px]">
              <CheckCircle2 className="w-2.5 h-2.5 mr-1" />Connecté
            </Badge>
            <Button variant="ghost" size="sm" onClick={handleDisconnect} className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50">
              <Link2Off className="w-3 h-3 mr-1" />Déconnecter
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={connecting || appConfigured === false}
            title={appConfigured === false ? "L'app Meta n'est pas configurée — voir Configuration ci-dessous" : undefined}
            className="h-8 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 disabled:opacity-50"
          >
            {connecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
            Se connecter avec Facebook
          </Button>
        )}
      </div>

      {/* Config missing warning (admin) */}
      {appConfigured === false && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-amber-200 bg-amber-50">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-amber-800">App Meta non configurée côté serveur</p>
            <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
              Les variables d'environnement <code className="font-mono bg-amber-100 px-1 rounded">FACEBOOK_APP_ID</code> et <code className="font-mono bg-amber-100 px-1 rounded">FACEBOOK_APP_SECRET</code> sont manquantes. Voir « Configuration Meta (admin) » ci-dessous pour les instructions complètes.
            </p>
          </div>
        </div>
      )}

      {/* Stats (when connected) */}
      {connected && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Leads reçus', value: totalFbLeads.toString(), icon: <Users className="w-3.5 h-3.5 text-[#167f5b]" /> },
            { label: 'Taux conversion', value: '—', icon: <TrendingUp className="w-3.5 h-3.5 text-[#8A9098]" /> },
            { label: 'Budget (CAD)', value: '$0.00', icon: <DollarSign className="w-3.5 h-3.5 text-[#8A9098]" /> },
            { label: 'Coût par lead', value: '$0.00', icon: <Target className="w-3.5 h-3.5 text-[#8A9098]" /> },
          ].map(s => (
            <div key={s.label} className="p-3 rounded-2xl border border-[#e5e5e0] bg-white space-y-1">
              <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">{s.icon}{s.label}</div>
              <p className="text-xl font-black text-[#14171A]">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Active connections */}
      {connections.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Formulaires connectés</h3>
          {connections.map(conn => (
            <div key={conn.id} className="flex items-center justify-between p-3 rounded-xl border border-[#e5e5e0] bg-white">
              <div>
                <p className="text-xs font-bold text-[#14171A]">{conn.form_name}</p>
                <p className="text-[10px] text-[#8A9098]">{conn.page_name} · {conn.leads_count} lead{conn.leads_count !== 1 ? 's' : ''}</p>
              </div>
              <Badge className="bg-[#167f5b]/10 text-[#167f5b] border-[#167f5b]/20 text-[9px]">actif</Badge>
            </div>
          ))}
        </div>
      )}

      {/* Page picker */}
      {connected && pages.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Étape 2 — Sélectionnez votre Page</h3>
          <div className="space-y-1.5">
            {pages.map(page => (
              <button
                key={page.id}
                type="button"
                onClick={() => handleSelectPage(page)}
                className={cn(
                  'w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors',
                  selectedPage?.id === page.id ? 'border-[#167f5b]/30 bg-[#167f5b]/5' : 'border-[#e5e5e0] hover:border-[#167f5b]/20 bg-white'
                )}
              >
                <span className="text-xs font-semibold text-[#14171A]">{page.name}</span>
                <ChevronRight className="w-3.5 h-3.5 text-[#8A9098]" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Form picker */}
      {selectedPage && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Étape 3 — Formulaires de {selectedPage.name}</h3>
          {loadingForms ? (
            <div className="flex items-center gap-2 p-3 text-xs text-[#8A9098]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />Chargement…
            </div>
          ) : forms.length === 0 ? (
            <p className="text-xs text-[#8A9098] px-1">Aucun formulaire Lead Ads trouvé.</p>
          ) : (
            forms.map(form => {
              const isConn = connections.some(c => c.form_id === form.id);
              return (
                <div key={form.id} className="flex items-center justify-between p-3 rounded-xl border border-[#e5e5e0] bg-white">
                  <div>
                    <p className="text-xs font-bold text-[#14171A]">{form.name}</p>
                    <p className="text-[10px] text-[#8A9098]">{form.leads_count} leads · {form.status}</p>
                  </div>
                  {isConn ? (
                    <Badge className="bg-[#167f5b]/10 text-[#167f5b] border-[#167f5b]/20 text-[9px]"><CheckCircle2 className="w-2.5 h-2.5 mr-1" />Connecté</Badge>
                  ) : (
                    <Button size="sm" onClick={() => handleConnectForm(form)} disabled={connectingForm === form.id} className="h-7 bg-[#167f5b] hover:bg-[#0f6b4c] text-white text-xs gap-1">
                      {connectingForm === form.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}Connecter
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tutorial */}
      <AccordionSection title="Comment connecter Facebook Lead Ads">
        <ol className="mt-3 space-y-3">
          {[
            'Créez un formulaire Lead Ads dans Meta Business Suite (business.facebook.com)',
            'Cliquez sur "Se connecter avec Facebook" et autorisez les permissions demandées',
            'Sélectionnez votre page Facebook puis le formulaire associé à votre campagne',
            'Les leads arrivent automatiquement dans Minerva via webhook Meta en temps réel',
          ].map((text, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-[#167f5b]/10 text-[#167f5b] text-[10px] font-black flex items-center justify-center">{i + 1}</span>
              <p className="text-xs text-[#8A9098] leading-relaxed">{text}</p>
            </li>
          ))}
        </ol>
      </AccordionSection>

      {/* Webhook */}
      <div className="p-3 rounded-xl bg-[#f4f4f3] border border-[#e5e5e0] space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Webhook Meta</p>
        <code className="text-[10px] text-[#14171A] break-all font-mono">
          {process.env.NEXT_PUBLIC_APP_URL || 'https://votre-app.vercel.app'}/api/ads/facebook/webhook
        </code>
        <p className="text-[9px] text-[#8A9098]">Token de vérification : <span className="font-mono">minerva_fb_webhook</span> (ou la valeur de <span className="font-mono">FACEBOOK_WEBHOOK_VERIFY_TOKEN</span> si définie)</p>
      </div>

      {/* Admin config notes */}
      <AccordionSection title="Configuration Meta (admin)">
        <div className="mt-3 space-y-4">
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">1. Variables d'environnement serveur</p>
            <div className="space-y-1">
              {[
                ['FACEBOOK_APP_ID', "ID de l'app Meta (developers.facebook.com)"],
                ['FACEBOOK_APP_SECRET', "Secret de l'app — jamais exposé au client"],
                ['FACEBOOK_WEBHOOK_VERIFY_TOKEN', "Optionnel — défaut : minerva_fb_webhook"],
              ].map(([k, d]) => (
                <div key={k} className="flex items-start gap-2">
                  <code className="shrink-0 text-[9px] font-mono font-bold text-[#167f5b] bg-[#167f5b]/5 px-1.5 py-0.5 rounded">{k}</code>
                  <p className="text-[10px] text-[#8A9098]">{d}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">2. Redirect URI OAuth à enregistrer</p>
              <CopyBtn text={`${process.env.NEXT_PUBLIC_APP_URL || 'https://votre-app.vercel.app'}/api/ads/facebook/callback`} />
            </div>
            <p className="text-[10px] text-[#8A9098]">Dans le tableau de bord Meta → Facebook Login → Paramètres → « URI de redirection OAuth valides » :</p>
            <div className="p-2.5 rounded-lg bg-[#f4f4f3] border border-[#e5e5e0]">
              <code className="text-[10px] font-mono text-[#14171A] break-all">
                {process.env.NEXT_PUBLIC_APP_URL || 'https://votre-app.vercel.app'}/api/ads/facebook/callback
              </code>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl border border-amber-200 bg-amber-50">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-amber-800">3. App Review Meta requis en production</p>
              <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed">
                Les permissions <span className="font-mono">leads_retrieval</span> et <span className="font-mono">pages_manage_ads</span> exigent un accès avancé (App Review) approuvé par Meta. Tant que la review n'est pas complétée, seuls les admins/testeurs de l'app Meta peuvent connecter Facebook — les autres utilisateurs verront une erreur d'autorisation.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">4. Abonnement webhook</p>
            <p className="text-[10px] text-[#8A9098] leading-relaxed">
              Dans Meta App Dashboard → Webhooks → objet « Page » → abonnez le champ <span className="font-mono">leadgen</span> à l'URL et au token ci-dessus. C'est ce qui déclenche l'ingestion automatique des leads en temps réel.
            </p>
          </div>
        </div>
      </AccordionSection>
    </div>
  );
}

// ── Google Ads Tab ────────────────────────────────────────────────────────────

const UTM_PARAMS = '?utm_source=google&utm_medium=cpc&utm_campaign={nom_campagne}&gclid={gclid}';

function GoogleAdsTab({ workspaceId }: { workspaceId: string }) {
  const [googleConnected, setGoogleConnected] = useState(false);

  useEffect(() => {
    fetch(getApiUrl(`/api/google/auth/status?workspaceId=${workspaceId}`))
      .then(r => r.json())
      .then(d => setGoogleConnected(d.connected || false))
      .catch(() => {});
  }, [workspaceId]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between p-4 rounded-2xl border border-[#e5e5e0] bg-white shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-[#e5e5e0] flex items-center justify-center overflow-hidden">
            <Image src="https://www.google.com/s2/favicons?domain=ads.google.com&sz=32" alt="Google Ads" width={24} height={24} unoptimized />
          </div>
          <div>
            <p className="text-sm font-bold text-[#14171A]">Google Ads</p>
            <p className="text-xs text-[#8A9098]">Import UTM + GCLID tracking</p>
          </div>
        </div>
        {googleConnected ? (
          <Badge className="bg-[#167f5b]/10 text-[#167f5b] border-[#167f5b]/20 text-[10px]">
            <CheckCircle2 className="w-2.5 h-2.5 mr-1" />Connecté
          </Badge>
        ) : (
          <a href={getApiUrl('/api/google/auth/start')} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg bg-[#14171A] hover:bg-[#3a3a32] text-white text-xs font-bold transition-colors">
            <Globe className="w-3 h-3" />Se connecter avec Google
          </a>
        )}
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-blue-200 bg-blue-50">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-800 leading-relaxed">
          Ajoutez les paramètres UTM à vos URLs de destination dans Google Ads. Minerva capte automatiquement la source de chaque lead entrant via vos formulaires.
        </p>
      </div>

      {/* Placeholder stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Clics', value: '--', icon: <MousePointer className="w-3.5 h-3.5 text-[#8A9098]" /> },
          { label: 'Impressions', value: '--', icon: <Activity className="w-3.5 h-3.5 text-[#8A9098]" /> },
          { label: 'CTR', value: '--', icon: <TrendingUp className="w-3.5 h-3.5 text-[#8A9098]" /> },
          { label: 'CPC moyen', value: '--', icon: <DollarSign className="w-3.5 h-3.5 text-[#8A9098]" /> },
        ].map(s => (
          <div key={s.label} className="p-3 rounded-2xl border border-[#e5e5e0] bg-white space-y-1">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">{s.icon}{s.label}</div>
            <p className="text-xl font-black text-[#14171A]">{s.value}</p>
          </div>
        ))}
      </div>
      {!googleConnected && (
        <p className="text-[11px] text-[#8A9098] text-center">Connectez Google Ads pour voir vos statistiques en temps réel</p>
      )}

      {/* UTM Guide */}
      <div className="p-4 rounded-2xl border border-[#e5e5e0] bg-white space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold text-[#14171A]">Paramètres UTM recommandés</p>
          <CopyBtn text={UTM_PARAMS} />
        </div>
        <div className="p-3 rounded-xl bg-[#f4f4f3] border border-[#e5e5e0]">
          <code className="text-[10px] font-mono text-[#14171A] break-all leading-relaxed">{UTM_PARAMS}</code>
        </div>
        <div className="space-y-2">
          {[
            { param: 'utm_source', desc: 'google — identifie Google comme source du trafic' },
            { param: 'utm_medium', desc: 'cpc — identifie le type de campagne (coût par clic)' },
            { param: 'utm_campaign', desc: '{nom_campagne} — nom de votre campagne Google Ads' },
            { param: 'gclid', desc: '{gclid} — identifiant de clic Google (auto-rempli)' },
          ].map(row => (
            <div key={row.param} className="flex items-start gap-2">
              <code className="shrink-0 text-[9px] font-mono font-bold text-[#167f5b] bg-[#167f5b]/5 px-1.5 py-0.5 rounded">{row.param}</code>
              <p className="text-[10px] text-[#8A9098]">{row.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tutorial */}
      <AccordionSection title="Comment connecter Google Ads">
        <ol className="mt-3 space-y-3">
          {[
            'Créez une campagne dans Google Ads (ads.google.com)',
            'Ajoutez les paramètres UTM à vos URLs de destination (voir guide ci-dessus)',
            'Connectez votre compte Google via le bouton "Se connecter avec Google"',
            'Les leads arrivent via vos formulaires avec l\'attribution source automatique',
            'Consultez le tableau d\'attribution dans l\'onglet Historique & Rapports',
          ].map((text, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-[#167f5b]/10 text-[#167f5b] text-[10px] font-black flex items-center justify-center">{i + 1}</span>
              <p className="text-xs text-[#8A9098] leading-relaxed">{text}</p>
            </li>
          ))}
        </ol>
      </AccordionSection>

      {/* Admin config notes — what's live vs what a full API integration needs */}
      <AccordionSection title="Google Ads API — état actuel (admin)">
        <div className="mt-3 space-y-4">
          <div className="flex items-start gap-3 p-3 rounded-xl border border-blue-200 bg-blue-50">
            <Info className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-blue-800">Ce qui est actif aujourd'hui</p>
              <p className="text-[10px] text-blue-700 mt-0.5 leading-relaxed">
                Le bouton « Se connecter avec Google » réutilise la connexion Google générale de Minerva (Calendar/Gmail) pour afficher le statut « Connecté ». L'attribution de source ci-dessus repose sur les paramètres UTM que <em>vous</em> ajoutez aux URLs — il n'y a pas encore d'appel direct à l'API Google Ads, donc les statistiques (Clics, Impressions, CTR, CPC) restent des placeholders tant que ce n'est pas branché.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Pour brancher les vraies statistiques de dépense/ROAS</p>
            <div className="space-y-1">
              {[
                ['Developer Token', "Token d'accès à l'API Google Ads, à demander et faire approuver via le Google Ads API Center du compte manager (MCC)."],
                ['Scope OAuth adwords', "Ajouter https://www.googleapis.com/auth/adwords au flow OAuth Google existant (actuellement limité à Calendar/Gmail)."],
                ['Customer ID', "Chaque workspace doit lier l'ID de son compte Google Ads (format XXX-XXX-XXXX) pour interroger ses campagnes."],
              ].map(([k, d]) => (
                <div key={k} className="flex items-start gap-2">
                  <span className="shrink-0 text-[9px] font-mono font-bold text-[#167f5b] bg-[#167f5b]/5 px-1.5 py-0.5 rounded whitespace-nowrap">{k}</span>
                  <p className="text-[10px] text-[#8A9098]">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AccordionSection>
    </div>
  );
}

// ── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({ workspaceId, onTabChange }: { workspaceId: string; onTabChange: (t: AdsTab) => void }) {
  const { leads } = useReach();
  const [fbConnected, setFbConnected] = useState(false);
  const [fbPageName, setFbPageName] = useState('');

  useEffect(() => {
    fetch(getApiUrl(`/api/ads/facebook?action=pages&workspaceId=${workspaceId}`))
      .then(r => r.json())
      .then(d => {
        setFbConnected(d.connected || false);
        if (d.pages?.length > 0) setFbPageName(d.pages[0].name);
      })
      .catch(() => {});
  }, [workspaceId]);

  const wonCount = useMemo(() => leads.filter(l => l.status === 'Won').length, [leads]);

  const kpis = [
    { label: 'Dépenses totales', value: '$0.00 CAD', icon: <DollarSign className="w-3.5 h-3.5" />, note: 'Connectez vos comptes ads' },
    { label: 'Impressions', value: '0', icon: <Activity className="w-3.5 h-3.5" />, note: 'Placeholder' },
    { label: 'Clics', value: '0', icon: <MousePointer className="w-3.5 h-3.5" />, note: 'Placeholder' },
    { label: 'CPC moyen', value: '$0.00', icon: <Target className="w-3.5 h-3.5" />, note: 'Placeholder' },
    { label: 'ROAS', value: '0.0x', icon: <TrendingUp className="w-3.5 h-3.5" />, note: 'Placeholder' },
    { label: 'CTR', value: '0.0%', icon: <BarChart3 className="w-3.5 h-3.5" />, note: 'Placeholder' },
    { label: 'Conversions', value: wonCount.toString(), icon: <CheckCircle2 className="w-3.5 h-3.5 text-[#167f5b]" />, note: 'Leads gagnés CRM' },
    { label: 'Coût par lead', value: '$0.00', icon: <Users className="w-3.5 h-3.5" />, note: 'Placeholder' },
  ];

  return (
    <div className="space-y-6">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-[#167f5b]/20 bg-[#167f5b]/5">
        <Info className="w-4 h-4 text-[#167f5b] mt-0.5 shrink-0" />
        <p className="text-xs text-[#167f5b] leading-relaxed">
          Connectez Facebook Ads et Google Ads pour voir vos vraies statistiques. Les données ci-dessous sont des indicateurs depuis votre CRM Minerva.
        </p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(kpi => (
          <div key={kpi.label} className="p-3 rounded-2xl border border-[#e5e5e0] bg-white space-y-1 hover:border-[#167f5b]/20 transition-colors">
            <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">
              {kpi.icon}{kpi.label}
            </div>
            <p className="text-xl font-black text-[#14171A]">{kpi.value}</p>
            <p className="text-[9px] text-[#8A9098]">{kpi.note}</p>
          </div>
        ))}
      </div>

      {/* Connexions actives */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Connexions actives</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Facebook */}
          <div className="p-4 rounded-2xl border border-[#e5e5e0] bg-white space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-base select-none">f</div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[#14171A]">Facebook Ads</p>
                {fbConnected && fbPageName ? (
                  <p className="text-xs text-[#8A9098]">{fbPageName}</p>
                ) : (
                  <p className="text-xs text-[#8A9098]">Non connecté</p>
                )}
              </div>
              {fbConnected ? (
                <Badge className="bg-[#167f5b]/10 text-[#167f5b] border-[#167f5b]/20 text-[9px]">Actif</Badge>
              ) : (
                <button
                  type="button"
                  onClick={() => onTabChange('facebook')}
                  className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-[#e5e5e0] text-[#8A9098] hover:border-[#167f5b]/30 hover:text-[#167f5b] transition-colors"
                >
                  Connecter
                </button>
              )}
            </div>
          </div>

          {/* Google */}
          <div className="p-4 rounded-2xl border border-[#e5e5e0] bg-white space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white border border-[#e5e5e0] flex items-center justify-center overflow-hidden">
                <Image src="https://www.google.com/s2/favicons?domain=ads.google.com&sz=32" alt="Google" width={20} height={20} unoptimized />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[#14171A]">Google Ads</p>
                <p className="text-xs text-[#8A9098]">Non connecté</p>
              </div>
              <button
                type="button"
                onClick={() => onTabChange('google')}
                className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-[#e5e5e0] text-[#8A9098] hover:border-[#167f5b]/30 hover:text-[#167f5b] transition-colors"
              >
                Connecter
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Create Tab ────────────────────────────────────────────────────────────────

function CreateTab() {
  const { leads } = useReach();

  const [inputMode, setInputMode] = useState<'lead' | 'custom'>('lead');
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [customBusiness, setCustomBusiness] = useState('');
  const [customNiche, setCustomNiche] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [customValue, setCustomValue] = useState('');
  const [platform, setPlatform] = useState<'facebook' | 'google' | 'both'>('facebook');
  const [adFormat, setAdFormat] = useState('image');
  const [objective, setObjective] = useState('leads');
  const [generating, setGenerating] = useState(false);
  const [variations, setVariations] = useState<AdVariation[] | null>(null);
  const [previewIdx, setPreviewIdx] = useState(0);

  const selectedLead = leads.find(l => l.id === selectedLeadId);

  const canGenerate = inputMode === 'lead' ? !!selectedLeadId : !!customBusiness;

  const handleGenerate = async () => {
    setGenerating(true);
    setVariations(null);
    try {
      const biz = inputMode === 'lead' && selectedLead
        ? `Nom: ${selectedLead.businessName}, Niche: ${selectedLead.niche || 'N/A'}, Ville: ${selectedLead.city || 'N/A'}`
        : `Nom: ${customBusiness}, Niche: ${customNiche || 'N/A'}, Ville: ${customCity || 'N/A'}, Proposition de valeur: ${customValue || 'N/A'}`;

      const prompt = `Génère 3 variations de publicité pour:
${biz}
Plateforme: ${platform}
Format: ${adFormat}
Objectif: ${objective}

Retourne UNIQUEMENT ce JSON valide (sans markdown):
{"variations":[{"variation":"A","headline":"...","description":"...","cta":"...","hook":"..."},{"variation":"B","headline":"...","description":"...","cta":"...","hook":"..."},{"variation":"C","headline":"...","description":"...","cta":"...","hook":"..."}]}

Contraintes: headline max 40 chars, description max 125 chars, cta max 15 chars, hook max 80 chars. Langue: français canadien.`;

      const res = await fetch(getApiUrl('/api/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          provider: 'openrouter',
          system: 'Tu es un expert en publicité digitale francophone. Génère uniquement du JSON valide, sans markdown ni explication.',
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      let fullText = '';
      if (res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += decoder.decode(value, { stream: true });
        }
      } else {
        fullText = await res.text();
      }

      // Extract JSON
      const start = fullText.indexOf('{"variations"');
      const end = fullText.lastIndexOf(']}') + 2;
      if (start !== -1 && end > start) {
        const data = JSON.parse(fullText.slice(start, end));
        if (Array.isArray(data.variations)) {
          setVariations(data.variations);
          setPreviewIdx(0);
        } else {
          throw new Error('Format invalide');
        }
      } else {
        // Try direct parse
        const data = JSON.parse(fullText.trim());
        if (Array.isArray(data.variations)) {
          setVariations(data.variations);
          setPreviewIdx(0);
        } else {
          throw new Error('Format invalide');
        }
      }
    } catch {
      toast.error('Erreur de génération. Vérifiez votre connexion et réessayez.');
    } finally {
      setGenerating(false);
    }
  };

  const copyVariation = (v: AdVariation) => {
    const text = `Accroche: ${v.hook}\n\nTitre: ${v.headline}\nDescription: ${v.description}\nCTA: ${v.cta}`;
    navigator.clipboard.writeText(text).then(() => toast.success(`Variation ${v.variation} copiée !`));
  };

  const variationColors = ['text-blue-600 border-blue-200 bg-blue-50', 'text-purple-600 border-purple-200 bg-purple-50', 'text-[#167f5b] border-[#167f5b]/20 bg-[#167f5b]/5'];

  return (
    <div className="space-y-6">
      {/* Input mode toggle */}
      <div className="flex items-center gap-1 bg-[#f4f4f3] rounded-xl p-1 border border-[#e5e5e0] w-fit">
        {(['lead', 'custom'] as const).map(m => (
          <button
            key={m}
            type="button"
            onClick={() => setInputMode(m)}
            className={cn('px-4 h-8 rounded-lg text-xs font-bold transition-colors', inputMode === m ? 'bg-white text-[#14171A] shadow-sm' : 'text-[#8A9098] hover:text-[#14171A]')}
          >
            {m === 'lead' ? 'Depuis un lead' : 'Saisie manuelle'}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="space-y-4 p-4 rounded-2xl border border-[#e5e5e0] bg-white">
        {inputMode === 'lead' ? (
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Sélectionner un lead</label>
            <select
              value={selectedLeadId}
              onChange={e => setSelectedLeadId(e.target.value)}
              className="w-full h-9 px-3 text-xs border border-[#e5e5e0] rounded-xl bg-white text-[#14171A] focus:outline-none focus:ring-1 focus:ring-[#167f5b] focus:border-[#167f5b]"
            >
              <option value="">— Choisir un lead —</option>
              {leads.map(l => (
                <option key={l.id} value={l.id}>
                  {l.businessName}{l.niche ? ` · ${l.niche}` : ''}{l.city ? ` · ${l.city}` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Nom de l'entreprise *</label>
              <Input value={customBusiness} onChange={e => setCustomBusiness(e.target.value)} placeholder="Ex: Plomberie Dubois" className="h-9 text-xs border-[#e5e5e0] focus:border-[#167f5b]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Niche / Secteur</label>
              <Input value={customNiche} onChange={e => setCustomNiche(e.target.value)} placeholder="Ex: Plomberie" className="h-9 text-xs border-[#e5e5e0] focus:border-[#167f5b]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Ville</label>
              <Input value={customCity} onChange={e => setCustomCity(e.target.value)} placeholder="Ex: Québec" className="h-9 text-xs border-[#e5e5e0] focus:border-[#167f5b]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Proposition de valeur</label>
              <Input value={customValue} onChange={e => setCustomValue(e.target.value)} placeholder="Ex: Service rapide 24/7" className="h-9 text-xs border-[#e5e5e0] focus:border-[#167f5b]" />
            </div>
          </div>
        )}

        {/* Platform */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Plateforme</label>
          <div className="flex gap-2">
            {([['facebook', 'Facebook'], ['google', 'Google'], ['both', 'Les deux']] as const).map(([val, lbl]) => (
              <button key={val} type="button" onClick={() => setPlatform(val)}
                className={cn('px-3 h-8 rounded-xl text-xs font-bold border transition-colors', platform === val ? 'border-[#167f5b] bg-[#167f5b]/5 text-[#167f5b]' : 'border-[#e5e5e0] text-[#8A9098] hover:border-[#167f5b]/30')}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Format</label>
          <div className="flex gap-2 flex-wrap">
            {([['image', 'Image simple'], ['carousel', 'Carrousel'], ['video', 'Vidéo'], ['story', 'Story']] as const).map(([val, lbl]) => (
              <button key={val} type="button" onClick={() => setAdFormat(val)}
                className={cn('px-3 h-8 rounded-xl text-xs font-bold border transition-colors', adFormat === val ? 'border-[#167f5b] bg-[#167f5b]/5 text-[#167f5b]' : 'border-[#e5e5e0] text-[#8A9098] hover:border-[#167f5b]/30')}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {/* Objective */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Objectif</label>
          <div className="flex gap-2 flex-wrap">
            {([['awareness', 'Notoriété'], ['traffic', 'Trafic'], ['leads', 'Leads'], ['conversions', 'Conversions']] as const).map(([val, lbl]) => (
              <button key={val} type="button" onClick={() => setObjective(val)}
                className={cn('px-3 h-8 rounded-xl text-xs font-bold border transition-colors', objective === val ? 'border-[#167f5b] bg-[#167f5b]/5 text-[#167f5b]' : 'border-[#e5e5e0] text-[#8A9098] hover:border-[#167f5b]/30')}>
                {lbl}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={generating || !canGenerate}
          className="w-full bg-[#167f5b] hover:bg-[#0f6b4c] text-white gap-2"
        >
          {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {generating ? 'Génération en cours…' : 'Générer 3 variations'}
        </Button>
      </div>

      {/* Variations output */}
      {variations && variations.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Variations générées</h3>
          {variations.map((v, i) => (
            <div key={v.variation} className="p-4 rounded-2xl border border-[#e5e5e0] bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className={cn('text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border', variationColors[i])}>
                  Variation {v.variation}
                </span>
                <button
                  type="button"
                  onClick={() => copyVariation(v)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#e5e5e0] text-[#8A9098] hover:bg-[#f4f4f3] text-[10px] font-bold transition-colors"
                >
                  <Copy className="w-3 h-3" />Copier tout
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#8A9098]">Accroche</span>
                    <CharCount value={v.hook || ''} max={80} />
                  </div>
                  <p className="text-xs text-[#8A9098] italic">{v.hook}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#8A9098]">Titre</span>
                    <CharCount value={v.headline || ''} max={40} />
                  </div>
                  <p className="text-sm font-bold text-[#14171A]">{v.headline}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#8A9098]">Description</span>
                    <CharCount value={v.description || ''} max={125} />
                  </div>
                  <p className="text-xs text-[#14171A]">{v.description}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#8A9098]">CTA</span>
                    <CharCount value={v.cta || ''} max={15} />
                  </div>
                  <span className="inline-block px-3 py-1 rounded-lg bg-[#167f5b]/10 text-[#167f5b] text-xs font-bold">{v.cta}</span>
                </div>
              </div>
            </div>
          ))}

          {/* Preview */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Aperçu visuel</h3>
            <div className="flex gap-2 mb-3">
              {variations.map((v, i) => (
                <button
                  key={v.variation}
                  type="button"
                  onClick={() => setPreviewIdx(i)}
                  className={cn('text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors', previewIdx === i ? 'border-[#167f5b] bg-[#167f5b]/10 text-[#167f5b]' : 'border-[#e5e5e0] text-[#8A9098] hover:border-[#167f5b]/30')}
                >
                  Var. {v.variation}
                </button>
              ))}
            </div>
            <div className="max-w-xs rounded-2xl border border-[#e5e5e0] bg-white overflow-hidden shadow-sm">
              <div className="bg-[#f4f4f3] h-40 flex flex-col items-center justify-center gap-2 text-[#8A9098]">
                <Camera className="w-7 h-7" />
                <span className="text-[11px]">Ajoutez votre image ici</span>
              </div>
              <div className="p-3 space-y-1.5 border-t border-[#e5e5e0]">
                <p className="text-[10px] font-bold text-[#8A9098]">Votre Page · Sponsorisé</p>
                <p className="text-sm font-bold text-[#14171A]">{variations[previewIdx]?.headline}</p>
                <p className="text-xs text-[#8A9098] line-clamp-2">{variations[previewIdx]?.description}</p>
                <div className="mt-2 pt-2 border-t border-[#e5e5e0]">
                  <span className="inline-block w-full text-center py-1.5 bg-[#e5e5e0] text-[#14171A] text-xs font-bold rounded-md">
                    {variations[previewIdx]?.cta || 'En savoir plus'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Attribution Tab (existing logic, preserved) ───────────────────────────────

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
      <Loader2 className="w-5 h-5 animate-spin text-[#167f5b]" />
    </div>
  );

  return (
    <div className="space-y-6">
      {summary && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Leads total', value: summary.totalLeads, icon: <Users className="w-3.5 h-3.5" />, color: 'text-[#14171A]' },
            { label: 'Taux RDV', value: `${summary.meetingRate}%`, icon: <Target className="w-3.5 h-3.5" />, color: 'text-[#167f5b]' },
            { label: 'Délai moyen', value: fmtMin(summary.avgFirstContactMin), icon: <Clock className="w-3.5 h-3.5" />, color: summary.avgFirstContactMin && summary.avgFirstContactMin > 5 ? 'text-red-600' : 'text-[#167f5b]' },
            { label: 'Pipeline gagné', value: `${(summary.totalPipeline / 1000).toFixed(1)}k$`, icon: <TrendingUp className="w-3.5 h-3.5" />, color: 'text-[#167f5b]' },
          ].map(kpi => (
            <div key={kpi.label} className="p-3 rounded-2xl border border-[#e5e5e0] bg-white space-y-1">
              <div className={cn('flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider', kpi.color)}>
                {kpi.icon}{kpi.label}
              </div>
              <p className="text-xl font-black text-[#14171A]">{kpi.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Performance par source</h3>
          <button onClick={fetchData} className="text-[10px] text-[#167f5b] hover:text-[#0f6b4c] flex items-center gap-1">
            <RefreshCw className="w-2.5 h-2.5" />Actualiser
          </button>
        </div>

        {bySource.length === 0 ? (
          <div className="text-center py-10 text-sm text-[#8A9098]">
            Aucune donnée d'attribution disponible.<br />
            <span className="text-xs">Enrichissez vos leads avec leur source.</span>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#e5e5e0] overflow-hidden bg-white">
            <div className="grid grid-cols-6 gap-2 px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-[#8A9098] border-b border-[#e5e5e0] bg-[#fafaf8]">
              <span className="col-span-2">Source</span>
              <span className="text-right">Leads</span>
              <span className="text-right">Tx RDV</span>
              <span className="text-right">Délai</span>
              <span className="text-right">Pipeline</span>
            </div>
            {bySource.map((s, i) => (
              <div key={s.source} className={cn('grid grid-cols-6 gap-2 px-4 py-3 items-center', i < bySource.length - 1 && 'border-b border-[#e5e5e0]')}>
                <span className={cn('col-span-2 text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit', srcColor(s.source))}>
                  {srcLabel(s.source)}
                </span>
                <span className="text-right text-xs font-bold text-[#14171A]">{s.total}</span>
                <span className={cn('text-right text-xs font-bold', s.meetingRate >= 30 ? 'text-[#167f5b]' : s.meetingRate >= 15 ? 'text-amber-600' : 'text-red-600')}>
                  {s.meetingRate}%
                </span>
                <span className={cn('text-right text-xs font-semibold', s.avgFirstContactMin !== null && s.avgFirstContactMin > 5 ? 'text-red-600' : 'text-[#167f5b]')}>
                  {fmtMin(s.avgFirstContactMin)}
                </span>
                <span className="text-right text-xs font-bold text-[#14171A]">
                  {s.pipeline > 0 ? `${(s.pipeline / 1000).toFixed(1)}k$` : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {summary?.avgFirstContactMin !== null && summary?.avgFirstContactMin !== undefined && summary.avgFirstContactMin > 5 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-red-200 bg-red-50">
          <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-red-800">Speed-to-Lead : délai trop élevé</p>
            <p className="text-xs text-red-700 mt-0.5">
              Délai moyen de {fmtMin(summary.avgFirstContactMin)} avant le premier contact. Un contact en moins de 5 min multiplie la conversion par 9.
            </p>
          </div>
        </div>
      )}
      {summary?.avgFirstContactMin !== null && summary?.avgFirstContactMin !== undefined && summary.avgFirstContactMin > 0 && summary.avgFirstContactMin <= 5 && (
        <div className="flex items-start gap-3 p-4 rounded-2xl border border-[#167f5b]/20 bg-[#167f5b]/5">
          <ArrowUp className="w-4 h-4 text-[#167f5b] mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-bold text-[#167f5b]">Speed-to-Lead optimal</p>
            <p className="text-xs text-[#0f6b4c] mt-0.5">Délai moyen de {fmtMin(summary.avgFirstContactMin)} — vous contactez dans la fenêtre idéale.</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────

type DateRange = '7d' | '30d' | '90d' | 'all';

function HistoryTab({ workspaceId }: { workspaceId: string }) {
  const { leads } = useReach();
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const sourceRows = useMemo(() => {
    const defs = [
      { key: 'osm', label: 'OpenStreetMap / Google Maps', color: 'bg-[#167f5b]' },
      { key: 'csv', label: 'Import CSV', color: 'bg-purple-500' },
      { key: 'manual', label: 'Manuel', color: 'bg-[#8A9098]' },
      { key: 'form', label: 'Formulaire Web', color: 'bg-blue-500' },
      { key: 'facebook', label: 'Facebook Ads', color: 'bg-blue-700' },
      { key: 'google', label: 'Google Ads', color: 'bg-red-500' },
    ];
    return defs.map(({ key, label, color }) => {
      const rows = leads.filter(l => {
        const s = l.leadSourceType || 'manual';
        if (key === 'csv') return s === 'csv' || s === 'import';
        return s === key;
      });
      const total = rows.length;
      const contacted = rows.filter(l => ['Contacted', 'Meeting Booked', 'Proposal Sent', 'Negotiation', 'Won'].includes(l.status)).length;
      const won = rows.filter(l => l.status === 'Won').length;
      const rate = total > 0 ? Math.round((won / total) * 100) : 0;
      return { key, label, color, total, contacted, won, rate };
    }).filter(r => r.total > 0);
  }, [leads]);

  return (
    <div className="space-y-6">
      {/* Date range filter */}
      <div className="flex items-center gap-1 bg-[#f4f4f3] rounded-xl p-1 border border-[#e5e5e0] w-fit">
        {([['7d', '7 jours'], ['30d', '30 jours'], ['90d', '90 jours'], ['all', 'Tout']] as const).map(([val, lbl]) => (
          <button
            key={val}
            type="button"
            onClick={() => setDateRange(val)}
            className={cn('px-3 h-7 rounded-lg text-xs font-bold transition-colors', dateRange === val ? 'bg-white text-[#14171A] shadow-sm' : 'text-[#8A9098] hover:text-[#14171A]')}
          >
            {lbl}
          </button>
        ))}
      </div>

      {/* Attribution component */}
      <AttributionTab workspaceId={workspaceId} />

      {/* Sources table */}
      {sourceRows.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-[#8A9098]">Leads par source</h3>
          <div className="rounded-2xl border border-[#e5e5e0] overflow-hidden bg-white">
            <div className="grid grid-cols-5 gap-2 px-4 py-2 text-[9px] font-bold uppercase tracking-wider text-[#8A9098] border-b border-[#e5e5e0] bg-[#fafaf8]">
              <span className="col-span-2">Source</span>
              <span className="text-right">Leads</span>
              <span className="text-right">Gagnés</span>
              <span className="text-right">Taux conv.</span>
            </div>
            {sourceRows.map((row, i) => (
              <div key={row.key} className={cn('grid grid-cols-5 gap-2 px-4 py-3 items-center', i < sourceRows.length - 1 && 'border-b border-[#e5e5e0]')}>
                <div className="col-span-2 flex items-center gap-2">
                  <span className={cn('w-2 h-2 rounded-full shrink-0', row.color)} />
                  <span className="text-xs font-semibold text-[#14171A] truncate">{row.label}</span>
                </div>
                <span className="text-right text-xs font-bold text-[#14171A]">{row.total}</span>
                <span className="text-right text-xs font-bold text-[#14171A]">{row.won}</span>
                <span className={cn('text-right text-xs font-bold', row.rate >= 20 ? 'text-[#167f5b]' : row.rate >= 10 ? 'text-amber-600' : 'text-[#8A9098]')}>
                  {row.rate}%
                </span>
              </div>
            ))}
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
  const [activeTab, setActiveTab] = useState<AdsTab>('overview');

  useEffect(() => {
    const url = new URL(window.location.href);
    const tab = url.searchParams.get('tab') as AdsTab | null;
    if (tab && ['overview', 'facebook', 'google', 'create', 'history'].includes(tab)) {
      setActiveTab(tab);
    }
  }, []);

  const tabs: { key: AdsTab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Vue d\'ensemble', icon: <BarChart3 className="w-4 h-4" /> },
    { key: 'facebook', label: 'Facebook Ads', icon: <span className="w-4 h-4 flex items-center justify-center font-black text-blue-600 text-sm leading-none">f</span> },
    { key: 'google', label: 'Google Ads', icon: <Globe className="w-4 h-4" /> },
    { key: 'create', label: 'Créer une pub', icon: <Sparkles className="w-4 h-4" /> },
    { key: 'history', label: 'Historique', icon: <Clock className="w-4 h-4" /> },
  ];

  const workspaceId = activeWorkspace?.id || '';

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8] relative">
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />
      <div className="relative z-10 p-6 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-heading font-medium tracking-tight text-[#14171A]">Publicité & Attribution</h1>
          <p className="text-sm text-[#8A9098] mt-0.5">Connectez vos sources d'acquisition et analysez la performance de vos campagnes</p>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1 bg-[#f4f4f3] rounded-2xl p-1 border border-[#e5e5e0] mb-6 overflow-x-auto">
          {tabs.map(({ key, label, icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-bold transition-colors whitespace-nowrap px-3',
                activeTab === key ? 'bg-white text-[#167f5b] shadow-sm' : 'text-[#8A9098] hover:text-[#14171A]'
              )}
            >
              {icon}
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="w-full max-w-7xl">
          {activeTab === 'overview' && <OverviewTab workspaceId={workspaceId} onTabChange={setActiveTab} />}
          {activeTab === 'facebook' && <FacebookTab workspaceId={workspaceId} />}
          {activeTab === 'google' && <GoogleAdsTab workspaceId={workspaceId} />}
          {activeTab === 'create' && <CreateTab />}
          {activeTab === 'history' && <HistoryTab workspaceId={workspaceId} />}
        </div>
      </div>
    </div>
  );
}
