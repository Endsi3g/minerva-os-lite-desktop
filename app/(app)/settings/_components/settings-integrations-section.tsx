'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { SettingsSectionWrapper } from './settings-section-wrapper';
import { Mail, Search, Globe, RefreshCw, Check, Key } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function SettingsIntegrationsSection() {
  const [loading, setLoading] = useState(true);
  const [savingApify, setSavingApify] = useState(false);
  const [apifyInput, setApifyInput] = useState('');
  const [scraperEngine, setScraperEngine] = useState<'native' | 'apify'>('native');
  
  // Real integration states
  const [gmailConnected, setGmailConnected] = useState(false);
  const [gmailEmail, setGmailEmail] = useState('');

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data } = await supabase
            .from('settings')
            .select('google_refresh_token, google_email, apify_token')
            .eq('user_id', user.id)
            .maybeSingle();

          if (data) {
            if (data.google_refresh_token) {
              setGmailConnected(true);
              setGmailEmail(data.google_email || 'Connecté');
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
          }
        }
      } catch (e) {
        console.error("Failed to load integrations status:", e);
      }
      setLoading(false);
    };
    fetchConnections();
  }, []);

  const handleConnectGmail = () => {
    window.location.href = '/api/auth/google/login';
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
        
        alert(scraperEngine === 'native' ? "Moteur de recherche natif Minerva activé avec succès !" : "Token Apify enregistré avec succès !");
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la sauvegarde de la configuration de prospection");
    }
    setSavingApify(false);
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
