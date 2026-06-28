'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { Mail, Search, Globe, RefreshCw, Check, Key, Server, ChevronDown, ChevronUp, MessageSquare, Layers, Send, AlertCircle } from 'lucide-react';
import { GmailIcon, SlackIcon, NotionIcon } from '@/components/icons';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SmtpConfig {
  host: string;
  port: string;
  user: string;
  pass: string;
  fromName: string;
}

export function SettingsIntegrationsSection() {
  const [loading, setLoading] = useState(true);
  const [savingApify, setSavingApify] = useState(false);
  const [apifyInput, setApifyInput] = useState('');
  const [scraperEngine, setScraperEngine] = useState<'native' | 'apify'>('native');
  const [hereApiKey, setHereApiKey] = useState('');
  const [savingHere, setSavingHere] = useState(false);
  const [yelpApiKey, setYelpApiKey] = useState('');
  const [savingYelp, setSavingYelp] = useState(false);
  const [firecrawlApiKey, setFirecrawlApiKey] = useState('');
  const [savingFirecrawl, setSavingFirecrawl] = useState(false);

  // Slack + Notion
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [savingSlack, setSavingSlack] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);
  const [slackSaved, setSlackSaved] = useState(false);
  const [notionToken, setNotionToken] = useState('');
  const [notionDatabaseId, setNotionDatabaseId] = useState('');
  const [savingNotion, setSavingNotion] = useState(false);
  const [testingNotion, setTestingNotion] = useState(false);
  const [notionSaved, setNotionSaved] = useState(false);

  // Outreach machine
  const [smartleadApiKey, setSmartleadApiKey] = useState('');
  const [smartleadCampaignId, setSmartleadCampaignId] = useState('');
  const [savingSmartlead, setSavingSmartlead] = useState(false);
  const [dropCowboyUsername, setDropCowboyUsername] = useState('');
  const [dropCowboyApiKey, setDropCowboyApiKey] = useState('');
  const [savingDropCowboy, setSavingDropCowboy] = useState(false);
  const [aiInboxAutoReply, setAiInboxAutoReply] = useState(false);
  const [aiInboxConfidenceMin, setAiInboxConfidenceMin] = useState(80);
  const [savingAiInbox, setSavingAiInbox] = useState(false);

  // Real integration states
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState('');

  // SMTP state
  const [smtpExpanded, setSmtpExpanded] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({ host: '', port: '587', user: '', pass: '', fromName: '' });
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpSaved, setSmtpSaved] = useState(false);
  const isElectron = typeof window !== 'undefined' && !!(window as any).electron;

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        // Check Gmail via google_accounts table (v2.85.0+ modular OAuth)
        const gmailRes = await fetch('/api/google/auth/status').catch(() => null);
        if (gmailRes?.ok) {
          const gmailStatus = await gmailRes.json();
          if (gmailStatus?.connected) {
            setGmailConnected(true);
            setGmailEmail(gmailStatus.email || 'Connecté');
          }
        } else {
          // Fallback: check old column for backwards compat
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: settRow } = await supabase
              .from('settings')
              .select('google_refresh_token, google_email')
              .eq('user_id', user.id)
              .maybeSingle();
            if (settRow?.google_refresh_token) {
              setGmailConnected(true);
              setGmailEmail(settRow.google_email || 'Connecté');
            }
          }
        }

        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('settings')
            .select('apify_token, smtp_config, here_api_key, yelp_api_key, firecrawl_api_key, slack_webhook_url, notion_token, notion_database_id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (data) {
            if (data.smtp_config) {
              try {
                const parsed = JSON.parse(data.smtp_config);
                setSmtpConfig(parsed);
                setSmtpSaved(true);
              } catch {}
            }
            if (data.apify_token) {
              if (data.apify_token === 'native' || data.apify_token.trim().length <= 5) {
                setScraperEngine('native');
                setApifyInput(data.apify_token === 'native' ? '' : data.apify_token);
              } else {
                setScraperEngine('apify');
                setApifyInput(data.apify_token);
              }
            } else {
              setScraperEngine('native');
            }
            if ((data as any).here_api_key) setHereApiKey((data as any).here_api_key);
            if ((data as any).yelp_api_key) setYelpApiKey((data as any).yelp_api_key);
            if ((data as any).firecrawl_api_key) setFirecrawlApiKey((data as any).firecrawl_api_key);
            if ((data as any).slack_webhook_url) setSlackWebhookUrl((data as any).slack_webhook_url);
            if ((data as any).notion_token) setNotionToken((data as any).notion_token);
            if ((data as any).notion_database_id) setNotionDatabaseId((data as any).notion_database_id);
            if ((data as any).smartlead_api_key) setSmartleadApiKey((data as any).smartlead_api_key);
            if ((data as any).smartlead_campaign_id) setSmartleadCampaignId((data as any).smartlead_campaign_id);
            if ((data as any).drop_cowboy_username) setDropCowboyUsername((data as any).drop_cowboy_username);
            if ((data as any).drop_cowboy_api_key) setDropCowboyApiKey((data as any).drop_cowboy_api_key);
            if (typeof (data as any).ai_inbox_auto_reply === 'boolean') setAiInboxAutoReply((data as any).ai_inbox_auto_reply);
            if (typeof (data as any).ai_inbox_confidence_min === 'number') setAiInboxConfidenceMin((data as any).ai_inbox_confidence_min);
          }
        }
      } catch (e) {
        console.error("Failed to load integrations status:", e);
      }
      setLoading(false);
    };
    fetchConnections();
  }, []);

  const handleConnectGmail = async () => {
    if (typeof window !== 'undefined') {
      window.location.href = `/api/google/auth/start?pack=communication&redirect=${encodeURIComponent('/settings?tab=integrations')}`;
    }
  };

  const handleDisconnectGmail = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/google/auth/disconnect', { method: 'POST' });
      if (res.ok) {
        setGmailConnected(false);
        setGmailEmail('');
      } else {
        toast.error('Déconnexion Gmail échouée. Actualisez la page et réessayez.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Déconnexion Gmail échouée. Actualisez la page et réessayez.');
    }
    setLoading(false);
  };

  const handleSaveScraper = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingApify(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const token = scraperEngine === 'native' ? 'native' : apifyInput.trim();
        await supabase
          .from('settings')
          .update({
            apify_token: token || null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        
        toast.success(scraperEngine === 'native' ? "Moteur de recherche natif Minerva activé avec succès !" : "Token Apify enregistré avec succès !");
      }
    } catch (e) {
      console.error(e);
      toast.error('Impossible de sauvegarder la configuration de prospection. Réessayez dans quelques instants.');
    }
    setSavingApify(false);
  };

  const handleSaveHere = async () => {
    setSavingHere(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('settings').update({ here_api_key: hereApiKey.trim() || null, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        toast.success('Clé HERE enregistrée !');
      }
    } catch (e) { console.error(e); toast.error('Impossible d\'enregistrer la clé HERE Maps. Vérifiez la clé et réessayez.'); }
    setSavingHere(false);
  };

  const handleSaveYelp = async () => {
    setSavingYelp(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('settings').update({ yelp_api_key: yelpApiKey.trim() || null, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        toast.success('Clé Yelp enregistrée !');
      }
    } catch (e) { console.error(e); toast.error('Impossible d\'enregistrer la clé Yelp. Vérifiez la clé et réessayez.'); }
    setSavingYelp(false);
  };

  const handleSaveFirecrawl = async () => {
    setSavingFirecrawl(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('settings').update({ firecrawl_api_key: firecrawlApiKey.trim() || null, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        toast.success('Clé Firecrawl enregistrée !');
      }
    } catch (e) { console.error(e); toast.error('Impossible d\'enregistrer la clé Firecrawl. Vérifiez la clé et réessayez.'); }
    setSavingFirecrawl(false);
  };

  const handleSaveSmtp = async () => {
    setSavingSmtp(true);
    try {
      const electronObj = typeof window !== 'undefined' && (window as any).electron;
      const configJson = JSON.stringify(smtpConfig);

      if (electronObj) {
        const settings = await electronObj.dbGet("SELECT user_id FROM settings LIMIT 1");
        if (settings) {
          await electronObj.dbRun(
            "UPDATE settings SET smtp_config = ?, updated_at = ?, sync_status = 'pending_update' WHERE user_id = ?",
            [configJson, new Date().toISOString(), settings.user_id]
          );
          if (electronObj.triggerSync) electronObj.triggerSync();
        }
      } else {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('settings').update({ smtp_config: configJson }).eq('user_id', user.id);
        }
      }
      setSmtpSaved(true);
    } catch (e) {
      console.error(e);
      toast.error('Impossible de sauvegarder la configuration SMTP. Vérifiez les champs et réessayez.');
    }
    setSavingSmtp(false);
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    try {
      const electronObj = typeof window !== 'undefined' && (window as any).electron;
      if (electronObj && electronObj.testSmtpConnection) {
        const result = await electronObj.testSmtpConnection(smtpConfig);
        if (result.success) {
          toast.success("Connexion SMTP réussie !");
        } else {
          toast.error(`Échec de la connexion SMTP : ${result.error}`);
        }
      } else {
        toast.info("Le test SMTP est disponible uniquement dans l'application Electron.");
      }
    } catch (e: any) {
      toast.error(`Erreur SMTP : ${e.message}`);
    }
    setTestingSmtp(false);
  };

  const handleSaveSlack = async () => {
    setSavingSlack(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('settings').update({ slack_webhook_url: slackWebhookUrl.trim() || null, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        setSlackSaved(true);
        toast.success('URL Slack enregistrée !');
        setTimeout(() => setSlackSaved(false), 2000);
      }
    } catch { toast.error('Impossible d\'enregistrer l\'URL Slack. Vérifiez le format et réessayez.'); }
    setSavingSlack(false);
  };

  const handleTestSlack = async () => {
    if (!slackWebhookUrl) { toast.error('Entrez d\'abord une URL de webhook Slack.'); return; }
    setTestingSlack(true);
    try {
      const res = await fetch('/api/integrations/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', webhookUrl: slackWebhookUrl }),
      });
      if (res.ok) toast.success('Message test envoyé dans Slack !');
      else { const d = await res.json(); toast.error(d.error || 'Échec du test Slack.'); }
    } catch { toast.error('Test Slack échoué. Vérifiez que l\'URL du webhook est correcte.'); }
    setTestingSlack(false);
  };

  const handleSaveNotion = async () => {
    setSavingNotion(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('settings').update({
          notion_token: notionToken.trim() || null,
          notion_database_id: notionDatabaseId.trim() || null,
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id);
        setNotionSaved(true);
        toast.success('Connexion Notion enregistrée !');
        setTimeout(() => setNotionSaved(false), 2000);
      }
    } catch { toast.error('Impossible d\'enregistrer le token Notion. Vérifiez le token et réessayez.'); }
    setSavingNotion(false);
  };

  const handleTestNotion = async () => {
    if (!notionToken) { toast.error('Entrez d\'abord un token d\'intégration Notion.'); return; }
    setTestingNotion(true);
    try {
      const res = await fetch('/api/integrations/notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', token: notionToken }),
      });
      if (res.ok) { const d = await res.json(); toast.success(`Notion connecté${d.name ? ` (${d.name})` : ''} !`); }
      else { const d = await res.json(); toast.error(d.error || 'Token Notion invalide.'); }
    } catch { toast.error('Test Notion échoué. Vérifiez que le token d\'intégration est valide.'); }
    setTestingNotion(false);
  };

  const handleSaveSmartlead = async () => {
    setSavingSmartlead(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('settings').update({
          smartlead_api_key: smartleadApiKey.trim() || null,
          smartlead_campaign_id: smartleadCampaignId.trim() || null,
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id);
        toast.success('Smartlead enregistré');
      }
    } catch { toast.error('Impossible d\'enregistrer la clé Smartlead. Vérifiez la clé et réessayez.'); }
    setSavingSmartlead(false);
  };

  const handleSaveDropCowboy = async () => {
    setSavingDropCowboy(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('settings').update({
          drop_cowboy_username: dropCowboyUsername.trim() || null,
          drop_cowboy_api_key: dropCowboyApiKey.trim() || null,
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id);
        toast.success('Drop Cowboy enregistré');
      }
    } catch { toast.error('Impossible d\'enregistrer la clé Drop Cowboy. Vérifiez la clé et réessayez.'); }
    setSavingDropCowboy(false);
  };

  const handleSaveAiInbox = async () => {
    setSavingAiInbox(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('settings').update({
          ai_inbox_auto_reply: aiInboxAutoReply,
          ai_inbox_confidence_min: aiInboxConfidenceMin,
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id);
        toast.success('Inbox IA enregistré');
      }
    } catch { toast.error('Impossible d\'enregistrer la clé Inbox IA. Vérifiez la clé et réessayez.'); }
    setSavingAiInbox(false);
  };

  if (loading) {
    return (
      <SettingsSectionWrapper
        title="Intégrations"
        description="Connecte Minerva Reach à tes outils externes et à ton système principal."
      >
        <div className="flex items-center justify-center py-12 gap-2 text-xs text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span>Chargement des intégrations...</span>
        </div>
      </SettingsSectionWrapper>
    );
  }

  return (
    <SettingsSectionWrapper
      title="Intégrations"
      description="Connecte Minerva Reach à tes outils externes et à ton système principal."
    >
      <div className="space-y-4">
        
        {/* Gmail Card */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex gap-4 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/40 shrink-0">
                <GmailIcon size={20} />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-foreground truncate">Gmail & Google Workspace</span>
                  {gmailConnected ? (
                    <Badge variant="outline" className="text-[9px] font-bold rounded px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                      Connecté ({gmailEmail})
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] font-bold rounded px-1.5 py-0 bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
                      Non connecté
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Lien OAuth direct pour envoyer et programmer tes courriels de prospection en un clic via ton propre compte Gmail.
                </p>
                <div className="pt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary underline hover:text-primary/80 font-medium"
                  >
                    Conditions d'utilisation (Terms of Use)
                  </a>
                  <span className="text-[10px] text-muted-foreground">•</span>
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-primary underline hover:text-primary/80 font-medium"
                  >
                    Politique de confidentialité (Privacy Policy)
                  </a>
                </div>
              </div>
            </div>

            <div className="shrink-0 self-center">
              {gmailConnected ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDisconnectGmail}
                  className="h-8 text-xs font-semibold px-4 min-w-[110px]"
                >
                  Déconnecter
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleConnectGmail}
                  className="h-8 text-xs font-semibold px-4 bg-primary hover:bg-primary/95 text-primary-foreground min-w-[110px]"
                >
                  Se connecter
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* SMTP Card */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5">
            <button
              type="button"
              onClick={() => setSmtpExpanded(!smtpExpanded)}
              className="flex items-start justify-between w-full gap-4 text-left"
            >
              <div className="flex gap-4 min-w-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                  <Server className="h-5 w-5" />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-foreground">SMTP générique</span>
                    <Badge variant="outline" className={`text-[9px] font-bold rounded px-1.5 py-0 ${smtpSaved ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800'}`}>
                      {smtpSaved ? `Configuré (${smtpConfig.user || 'SMTP'})` : 'Non configuré'}
                    </Badge>
                    {!isElectron && (
                      <Badge variant="outline" className="text-[9px] font-bold rounded px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                        Electron uniquement
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Envoie depuis OVH, Proton, Outlook ou tout serveur SMTP. Les identifiants restent sur ton appareil.
                  </p>
                </div>
              </div>
              <div className="shrink-0 self-center text-muted-foreground">
                {smtpExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </div>
            </button>

            {smtpExpanded && (
              <div className="mt-4 pt-4 border-t border-border/50 space-y-3 pl-14">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="grid gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Serveur SMTP (host)</label>
                    <Input
                      value={smtpConfig.host}
                      onChange={(e) => setSmtpConfig(c => ({ ...c, host: e.target.value }))}
                      placeholder="smtp.ovh.net"
                      className="text-xs bg-card h-8"
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Port</label>
                    <Input
                      value={smtpConfig.port}
                      onChange={(e) => setSmtpConfig(c => ({ ...c, port: e.target.value }))}
                      placeholder="587"
                      className="text-xs bg-card h-8"
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Adresse email</label>
                    <Input
                      type="email"
                      value={smtpConfig.user}
                      onChange={(e) => setSmtpConfig(c => ({ ...c, user: e.target.value }))}
                      placeholder="moi@exemple.com"
                      className="text-xs bg-card h-8"
                    />
                  </div>
                  <div className="grid gap-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Mot de passe</label>
                    <Input
                      type="password"
                      value={smtpConfig.pass}
                      onChange={(e) => setSmtpConfig(c => ({ ...c, pass: e.target.value }))}
                      placeholder="••••••••"
                      className="text-xs bg-card h-8"
                    />
                  </div>
                  <div className="grid gap-1 sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nom expéditeur</label>
                    <Input
                      value={smtpConfig.fromName}
                      onChange={(e) => setSmtpConfig(c => ({ ...c, fromName: e.target.value }))}
                      placeholder="Mon Agence"
                      className="text-xs bg-card h-8"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleTestSmtp}
                    disabled={testingSmtp || !smtpConfig.host || !smtpConfig.user}
                    className="h-8 text-xs font-bold gap-1"
                  >
                    {testingSmtp ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Server className="h-3.5 w-3.5" />}
                    Tester
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveSmtp}
                    disabled={savingSmtp || !smtpConfig.host || !smtpConfig.user}
                    className="h-8 text-xs font-bold gap-1 bg-primary hover:bg-primary/95 text-primary-foreground"
                  >
                    {savingSmtp ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Sauvegarder
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Scraper Engine Card */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex gap-4 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Search className="h-5 w-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-foreground truncate">Moteur de recherche prospects</span>
                  <Badge variant="outline" className="text-[9px] font-bold rounded px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                    {scraperEngine === 'native' ? 'Natif Actif' : 'Apify Configuré'}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {"Configure comment l'application recherche et audite les commerces locaux pour ta prospection."}
                </p>
              </div>
            </div>

            {/* Selector Buttons */}
            <div className="pl-14 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setScraperEngine('native')}
                  className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    scraperEngine === 'native'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:bg-muted/10'
                  }`}
                >
                  <span className="text-xs font-bold text-foreground">Scraper Natif Minerva</span>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    Gratuit & illimité. Interroge OpenStreetMap + crawler SEO en temps réel.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setScraperEngine('apify')}
                  className={`flex flex-col items-start p-3 rounded-lg border text-left transition-all cursor-pointer ${
                    scraperEngine === 'apify'
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-card hover:bg-muted/10'
                  }`}
                >
                  <span className="text-xs font-bold text-foreground">Apify Google Maps Scraper</span>
                  <span className="text-[10px] text-muted-foreground mt-1">
                    {"Utilise l'infrastructure cloud d'Apify. Clé API requise."}
                  </span>
                </button>
              </div>
            </div>

            {/* Native scraper action */}
            {scraperEngine === 'native' ? (
              <div className="pl-14 pt-1">
                <Button
                  onClick={() => handleSaveScraper()}
                  disabled={savingApify}
                  size="sm"
                  className="h-8 text-xs font-bold gap-1 px-4 bg-primary hover:bg-primary/95 text-primary-foreground"
                >
                  {savingApify ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Activer le moteur natif</span>
                    </>
                  )}
                </Button>
              </div>
            ) : (
              /* Apify Token form */
              <form onSubmit={handleSaveScraper} className="flex gap-2 pl-14 items-center">
                <div className="relative flex-1">
                  <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="Token API Apify (apify_api_...)"
                    value={apifyInput}
                    onChange={(e) => setApifyInput(e.target.value)}
                    className="pl-8.5 text-xs bg-card h-8.5"
                  />
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingApify}
                  className="h-8.5 text-xs font-bold gap-1 px-3 bg-primary hover:bg-primary/95 text-primary-foreground shrink-0"
                >
                  {savingApify ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Sauvegarder</span>
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* HERE Places API Card */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex gap-4 min-w-0 flex-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Globe className="h-5 w-5" />
              </div>
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-foreground truncate">HERE Places API</span>
                  {!!hereApiKey ? (
                    <Badge variant="outline" className="text-[9px] font-bold rounded px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                      Configuré
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] font-bold rounded px-1.5 py-0 bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
                      Non configuré
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Données locales complètes (250 000 req/mois gratuits). Obtenez votre clé gratuite sur{' '}
                  <a href="https://developer.here.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Obtenir une clé gratuite →</a>
                </p>
                <div className="flex gap-2 items-center pt-1">
                  <div className="relative flex-1 max-w-xs">
                    <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder={hereApiKey ? 'here_api_****' : 'Clé HERE Places API'}
                      value={hereApiKey}
                      onChange={(e) => setHereApiKey(e.target.value)}
                      className="pl-8 text-xs bg-card h-8"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveHere}
                    disabled={savingHere}
                    className="h-8 text-xs font-bold gap-1 px-3 bg-primary hover:bg-primary/95 text-primary-foreground shrink-0"
                  >
                    {savingHere ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Enregistrer
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Yelp Fusion API Card */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex gap-4 min-w-0 flex-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Search className="h-5 w-5" />
              </div>
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-foreground truncate">Yelp Fusion API</span>
                  {!!yelpApiKey ? (
                    <Badge variant="outline" className="text-[9px] font-bold rounded px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                      Configuré
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] font-bold rounded px-1.5 py-0 bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
                      Non configuré
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Avis, notes et coordonnées des commerces (500 req/jour gratuits). Créez votre app sur{' '}
                  <a href="https://www.yelp.com/developers" target="_blank" rel="noopener noreferrer" className="text-primary underline">Obtenir une clé gratuite →</a>
                </p>
                <div className="flex gap-2 items-center pt-1">
                  <div className="relative flex-1 max-w-xs">
                    <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder={yelpApiKey ? 'yelp_****' : 'Clé Yelp Fusion API'}
                      value={yelpApiKey}
                      onChange={(e) => setYelpApiKey(e.target.value)}
                      className="pl-8 text-xs bg-card h-8"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSaveYelp}
                    disabled={savingYelp}
                    className="h-8 text-xs font-bold gap-1 px-3 bg-primary hover:bg-primary/95 text-primary-foreground shrink-0"
                  >
                    {savingYelp ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    Enregistrer
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Firecrawl Card */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5">
            <div className="flex gap-4 min-w-0 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Globe className="h-5 w-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-foreground">Firecrawl (PagesJaunes)</span>
                  {!!firecrawlApiKey ? (
                    <Badge variant="outline" className="text-[9px] font-bold rounded px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                      Configuré
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] font-bold rounded px-1.5 py-0 bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
                      Non configuré
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Scraping structuré de PagesJaunes / YellowPages Canada (500 req/mois gratuits).{' '}
                  <a href="https://firecrawl.dev" target="_blank" rel="noopener noreferrer" className="underline text-primary">
                    Obtenir une clé gratuite →
                  </a>
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder={firecrawlApiKey ? 'fc-****' : 'Clé API Firecrawl (fc-...)'}
                value={firecrawlApiKey}
                onChange={e => setFirecrawlApiKey(e.target.value)}
                className="h-8 text-xs flex-1"
                autoComplete="off"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleSaveFirecrawl}
                disabled={savingFirecrawl}
                className="h-8 text-xs font-semibold px-4 bg-primary hover:bg-primary/95 text-primary-foreground shrink-0"
              >
                {savingFirecrawl ? 'Sauvegarde...' : 'Enregistrer'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Slack Card */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex gap-4 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/40 shrink-0">
                <SlackIcon size={20} />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-foreground">Slack</span>
                  {slackWebhookUrl ? (
                    <Badge variant="outline" className="text-[9px] font-bold rounded px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">Configuré</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] font-bold rounded px-1.5 py-0 bg-slate-50 text-slate-500 border-slate-200">Non configuré</Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Recevez les notifications Minerva (nouveaux leads, visites terrain, mentions) dans un canal Slack via un <strong>Webhook entrant</strong>.{' '}
                  Créez le vôtre sur <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">api.slack.com/apps →</a>
                </p>
                <div className="flex gap-2 items-center pt-1">
                  <div className="relative flex-1">
                    <SlackIcon className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
                    <input
                      type="url"
                      placeholder="https://hooks.slack.com/services/…"
                      value={slackWebhookUrl}
                      onChange={e => setSlackWebhookUrl(e.target.value)}
                      className="w-full pl-8 pr-3 h-8 text-xs border border-input rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={handleTestSlack} disabled={testingSlack} className="h-8 text-xs shrink-0 gap-1">
                    {testingSlack ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                    Tester
                  </Button>
                  <Button type="button" size="sm" onClick={handleSaveSlack} disabled={savingSlack} className="h-8 text-xs font-bold px-3 bg-primary hover:bg-primary/95 text-primary-foreground shrink-0 gap-1">
                    {savingSlack ? <RefreshCw className="h-3 w-3 animate-spin" /> : slackSaved ? <Check className="h-3 w-3" /> : null}
                    {slackSaved ? 'Enregistré' : 'Enregistrer'}
                  </Button>
                </div>
                <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                  <span>Collez l'URL du Webhook entrant — pas votre token bot. Les notifications sont envoyées automatiquement lors des événements CRM importants.</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notion Card */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex gap-4 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/40 shrink-0">
                <NotionIcon size={20} />
              </div>
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-foreground">Notion</span>
                  {notionToken ? (
                    <Badge variant="outline" className="text-[9px] font-bold rounded px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">Configuré</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[9px] font-bold rounded px-1.5 py-0 bg-slate-50 text-slate-500 border-slate-200">Non configuré</Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Exportez vos documents Canvas vers une base de données Notion. Créez une intégration sur{' '}
                  <a href="https://www.notion.so/my-integrations" target="_blank" rel="noopener noreferrer" className="text-primary underline">notion.so/my-integrations →</a>
                </p>
                <div className="space-y-2 pt-1">
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <Key className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                      <input
                        type="password"
                        placeholder={notionToken ? 'secret_****' : "Token d'intégration (secret_…)"}
                        value={notionToken}
                        onChange={e => setNotionToken(e.target.value)}
                        className="w-full pl-8 pr-3 h-8 text-xs border border-input rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
                        autoComplete="off"
                      />
                    </div>
                    <Button type="button" size="sm" variant="outline" onClick={handleTestNotion} disabled={testingNotion} className="h-8 text-xs shrink-0 gap-1">
                      {testingNotion ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Vérifier
                    </Button>
                  </div>
                  <div className="flex gap-2 items-center">
                    <div className="relative flex-1">
                      <NotionIcon className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
                      <input
                        type="text"
                        placeholder="ID de la base de données Notion (optionnel)"
                        value={notionDatabaseId}
                        onChange={e => setNotionDatabaseId(e.target.value)}
                        className="w-full pl-8 pr-3 h-8 text-xs border border-input rounded-md bg-card focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    <Button type="button" size="sm" onClick={handleSaveNotion} disabled={savingNotion} className="h-8 text-xs font-bold px-3 bg-primary hover:bg-primary/95 text-primary-foreground shrink-0 gap-1">
                      {savingNotion ? <RefreshCw className="h-3 w-3 animate-spin" /> : notionSaved ? <Check className="h-3 w-3" /> : null}
                      {notionSaved ? 'Enregistré' : 'Enregistrer'}
                    </Button>
                  </div>
                </div>
                <div className="flex items-start gap-1.5 text-[10px] text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                  <AlertCircle className="h-3 w-3 mt-0.5 shrink-0 text-primary" />
                  <span>Partagez votre base de données avec l'intégration dans Notion (bouton Partager → Inviter), puis copiez son ID depuis l'URL (32 caractères hexadécimaux).</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Outreach Machine — Smartlead */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#059669]/10 shrink-0">
                <Send className="h-4 w-4 text-[#059669]" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#26251e]">Smartlead — Séquences email</p>
                <p className="text-[10px] text-muted-foreground">Enrôle automatiquement tes leads dans des campagnes cold email</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Clé API Smartlead</label>
                <div className="flex gap-2">
                  <Input value={smartleadApiKey} onChange={e => setSmartleadApiKey(e.target.value)} placeholder="sl_..." type="password" className="h-8 text-xs flex-1 border-border" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Campaign ID (défaut)</label>
                <Input value={smartleadCampaignId} onChange={e => setSmartleadCampaignId(e.target.value)} placeholder="123456" className="h-8 text-xs border-border" />
              </div>
              <Button onClick={handleSaveSmartlead} disabled={savingSmartlead} className="h-8 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white gap-1">
                {savingSmartlead ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Outreach Machine — Drop Cowboy */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 shrink-0">
                <MessageSquare className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#26251e]">Drop Cowboy — Voicemail</p>
                <p className="text-[10px] text-muted-foreground">Envoie des voicemails sans sonnerie générés par l'IA (score ≥ 50)</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Nom d'utilisateur</label>
                <Input value={dropCowboyUsername} onChange={e => setDropCowboyUsername(e.target.value)} placeholder="moncompte" className="h-8 text-xs border-border" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Clé API Drop Cowboy</label>
                <Input value={dropCowboyApiKey} onChange={e => setDropCowboyApiKey(e.target.value)} placeholder="dc_..." type="password" className="h-8 text-xs border-border" />
              </div>
              <Button onClick={handleSaveDropCowboy} disabled={savingDropCowboy} className="h-8 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white gap-1">
                {savingDropCowboy ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* AI Inbox */}
        <Card className="border border-border bg-card">
          <CardContent className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 shrink-0">
                <Layers className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#26251e]">IA Inbox — Réponse autonome</p>
                <p className="text-[10px] text-muted-foreground">L'IA répond automatiquement si le score de confiance dépasse le seuil</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#26251e] font-bold">Réponse automatique</span>
                <button
                  onClick={() => setAiInboxAutoReply(v => !v)}
                  className={cn(
                    "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                    aiInboxAutoReply ? "bg-[#059669]" : "bg-[#e5e5e0]"
                  )}
                >
                  <span className={cn("inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform", aiInboxAutoReply ? "translate-x-4" : "translate-x-0.5")} />
                </button>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                  Seuil de confiance — {aiInboxConfidenceMin}%
                </label>
                <p className="text-[9px] text-muted-foreground">En dessous : brouillon. Au-dessus : envoi automatique.</p>
                <input
                  type="range" min={50} max={95} step={5}
                  value={aiInboxConfidenceMin}
                  onChange={e => setAiInboxConfidenceMin(Number(e.target.value))}
                  className="w-full accent-[#059669]"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>50% (permissif)</span><span>95% (strict)</span>
                </div>
              </div>
              <Button onClick={handleSaveAiInbox} disabled={savingAiInbox} className="h-8 text-xs font-bold bg-[#059669] hover:bg-[#047857] text-white gap-1">
                {savingAiInbox ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Minerva Sync Card */}
        <Card className="border border-border bg-card opacity-85">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start justify-between gap-4">
            <div className="flex gap-4 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Globe className="h-5 w-5" />
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-foreground truncate">Minerva OS Sync</span>
                  <Badge variant="outline" className="text-[9px] font-bold rounded px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30">
                    Natif
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Liaison bidirectionnelle native avec le système d&apos;exploitation Minerva. Vos contacts et vos relances sont synchronisés.
                </p>
              </div>
            </div>

            <div className="shrink-0 self-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                className="h-8 text-xs font-semibold px-4 min-w-[110px]"
              >
                Toujours actif
              </Button>
            </div>
          </CardContent>
        </Card>
        
      </div>
    </SettingsSectionWrapper>
  );
}

export default SettingsIntegrationsSection;
