'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { Mail, Search, Globe, RefreshCw, Check, Key, Server, ChevronDown, ChevronUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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
        const electronObj = typeof window !== 'undefined' && (window as any).electron;
        let data: any = null;

        if (electronObj) {
          data = await electronObj.dbGet("SELECT google_refresh_token, google_email, apify_token, smtp_config, here_api_key, yelp_api_key, firecrawl_api_key FROM settings LIMIT 1");
        } else {
          const supabase = createClient();
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const res = await supabase
              .from('settings')
              .select('google_refresh_token, google_email, apify_token, smtp_config, here_api_key, yelp_api_key, firecrawl_api_key')
              .eq('user_id', user.id)
              .maybeSingle();
            data = res.data;
          }
        }

        if (data) {
          if (data.google_refresh_token) {
            setGmailConnected(true);
            setGmailEmail(data.google_email || 'Connecté');
          }
          if (data.smtp_config) {
            try {
              const parsed = JSON.parse(data.smtp_config);
              setSmtpConfig(parsed);
              setSmtpSaved(true);
            } catch {}
          }
          if (data.apify_token) {
            if (data.apify_token === 'native' || !data.apify_token.startsWith('apify_api_')) {
              setScraperEngine('native');
              setApifyInput(data.apify_token === 'native' ? '' : data.apify_token);
            } else {
              setScraperEngine('apify');
              setApifyInput(data.apify_token);
            }
          } else {
            setScraperEngine('native');
          }
          if (data.here_api_key) setHereApiKey(data.here_api_key);
          if (data.yelp_api_key) setYelpApiKey(data.yelp_api_key);
          if (data.firecrawl_api_key) setFirecrawlApiKey(data.firecrawl_api_key);
        }
      } catch (e) {
        console.error("Failed to load integrations status:", e);
      }
      setLoading(false);
    };
    fetchConnections();
  }, []);

  const handleConnectGmail = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email',
          redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/settings?tab=integrations` : '',
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      });
      if (error) throw error;
    } catch (e: any) {
      console.error(e);
      alert("Erreur lors de l'authentification Google : " + e.message);
    }
  };

  const handleDisconnectGmail = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('settings')
          .update({
            google_access_token: null,
            google_refresh_token: null,
            google_token_expires_at: null,
            google_email: null,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);
        
        setGmailConnected(false);
        setGmailEmail('');
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la déconnexion de Gmail");
    }
    setLoading(false);
  };

  const handleSaveScraper = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSavingApify(true);
    try {
      const token = scraperEngine === 'native' ? 'native' : apifyInput.trim();
      const electronObj = typeof window !== 'undefined' && (window as any).electron;

      if (electronObj) {
        const settings = await electronObj.dbGet("SELECT user_id FROM settings LIMIT 1");
        if (settings) {
          await electronObj.dbRun(
            "UPDATE settings SET apify_token = ?, updated_at = ?, sync_status = 'pending_update' WHERE user_id = ?",
            [token || null, new Date().toISOString(), settings.user_id]
          );
          if (electronObj.triggerSync) electronObj.triggerSync();
        }
      } else {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('settings')
            .update({
              apify_token: token || null,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);
        }
      }
      alert(scraperEngine === 'native' ? "Moteur de recherche natif Minerva activé avec succès !" : "Token Apify enregistré avec succès !");
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la sauvegarde de la configuration de prospection");
    }
    setSavingApify(false);
  };

  const handleSaveHere = async () => {
    setSavingHere(true);
    try {
      const value = hereApiKey.trim() || null;
      const electronObj = typeof window !== 'undefined' && (window as any).electron;

      if (electronObj) {
        const settings = await electronObj.dbGet("SELECT user_id FROM settings LIMIT 1");
        if (settings) {
          await electronObj.dbRun(
            "UPDATE settings SET here_api_key = ?, updated_at = ?, sync_status = 'pending_update' WHERE user_id = ?",
            [value, new Date().toISOString(), settings.user_id]
          );
          if (electronObj.triggerSync) electronObj.triggerSync();
        }
      } else {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('settings').update({ here_api_key: value, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        }
      }
      alert('Clé HERE enregistrée !');
    } catch (e) { console.error(e); alert('Erreur sauvegarde HERE'); }
    setSavingHere(false);
  };

  const handleSaveYelp = async () => {
    setSavingYelp(true);
    try {
      const value = yelpApiKey.trim() || null;
      const electronObj = typeof window !== 'undefined' && (window as any).electron;

      if (electronObj) {
        const settings = await electronObj.dbGet("SELECT user_id FROM settings LIMIT 1");
        if (settings) {
          await electronObj.dbRun(
            "UPDATE settings SET yelp_api_key = ?, updated_at = ?, sync_status = 'pending_update' WHERE user_id = ?",
            [value, new Date().toISOString(), settings.user_id]
          );
          if (electronObj.triggerSync) electronObj.triggerSync();
        }
      } else {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('settings').update({ yelp_api_key: value, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        }
      }
      alert('Clé Yelp enregistrée !');
    } catch (e) { console.error(e); alert('Erreur sauvegarde Yelp'); }
    setSavingYelp(false);
  };

  const handleSaveFirecrawl = async () => {
    setSavingFirecrawl(true);
    try {
      const value = firecrawlApiKey.trim() || null;
      const electronObj = typeof window !== 'undefined' && (window as any).electron;

      if (electronObj) {
        const settings = await electronObj.dbGet("SELECT user_id FROM settings LIMIT 1");
        if (settings) {
          await electronObj.dbRun(
            "UPDATE settings SET firecrawl_api_key = ?, updated_at = ?, sync_status = 'pending_update' WHERE user_id = ?",
            [value, new Date().toISOString(), settings.user_id]
          );
          if (electronObj.triggerSync) electronObj.triggerSync();
        }
      } else {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('settings').update({ firecrawl_api_key: value, updated_at: new Date().toISOString() }).eq('user_id', user.id);
        }
      }
      alert('Clé Firecrawl enregistrée !');
    } catch (e) { console.error(e); alert('Erreur sauvegarde Firecrawl'); }
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
      alert("Erreur lors de la sauvegarde SMTP");
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
          alert("Connexion SMTP réussie !");
        } else {
          alert(`Échec de la connexion SMTP : ${result.error}`);
        }
      } else {
        alert("Le test SMTP est disponible uniquement dans l'application Electron.");
      }
    } catch (e: any) {
      alert("Erreur : " + e.message);
    }
    setTestingSmtp(false);
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
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                <Mail className="h-5 w-5" />
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
