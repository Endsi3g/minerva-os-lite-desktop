'use client';

import { useState, useEffect } from 'react';
import { getApiUrl } from '@/lib/api-helper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Globe, Zap, Loader2, Check, RefreshCw, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface AgencyResult {
  agencyName?: string;
  tagline?: string;
  description?: string;
  services?: Array<{ name: string; description: string; price?: string | null }>;
  systemPrompt?: string;
  logoUrl?: string | null;
  brandColors?: string[];
}

export default function SettingsAgencySection() {
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [result, setResult] = useState<AgencyResult | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [saving, setSaving] = useState(false);

  // Load existing settings
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async (authResult: { data: { user: { id: string } | null } }) => {
      const user = authResult.data?.user;
      if (!user) return;
      const { data: settings } = await supabase
        .from('settings')
        .select('agency_website, ai_agency_prompt, company_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (settings) {
        if (settings.agency_website) setWebsiteUrl(settings.agency_website);
        if (settings.ai_agency_prompt) setSystemPrompt(settings.ai_agency_prompt);
      }
    });
  }, []);

  const handleScrape = async () => {
    if (!websiteUrl) { toast.error('Entrez une URL.'); return; }
    setScraping(true);
    setResult(null);
    try {
      const res = await fetch(getApiUrl('/api/agency-setup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteUrl }),
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        if (data.systemPrompt) setSystemPrompt(data.systemPrompt);
        toast.success('Site analysé ! Vérifiez et sauvegardez les données ci-dessous.');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Impossible d\'analyser ce site.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setScraping(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('settings').update({
        ai_agency_prompt: systemPrompt || null,
        agency_website: websiteUrl || null,
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);
      toast.success('Profil d\'agence sauvegardé.');
    } catch {
      toast.error('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-bold text-[#26251e]">Profil d'agence</h3>
        <p className="text-xs text-[#7a7a76] mt-0.5">
          Fournissez votre site web pour configurer automatiquement votre workspace, vos services, votre bibliothèque et l'IA.
        </p>
      </div>

      {/* URL scraper */}
      <div className="space-y-3 p-4 rounded-2xl border border-[#e5e5e0] bg-[#fafaf8]">
        <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
          <Globe className="w-3 h-3" />Site web de l'agence
        </div>
        <div className="flex gap-2">
          <Input
            value={websiteUrl}
            onChange={e => setWebsiteUrl(e.target.value)}
            placeholder="https://monagence.com"
            className="h-9 text-sm border-[#e5e5e0] focus:ring-[#059669]"
          />
          <Button
            onClick={handleScrape}
            disabled={scraping || !websiteUrl}
            className="h-9 bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs gap-1.5 px-4 whitespace-nowrap"
          >
            {scraping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
            {scraping ? 'Analyse…' : 'Analyser'}
          </Button>
        </div>

        {/* Result preview */}
        {result && (
          <div className="space-y-3 pt-3 border-t border-[#e5e5e0]">
            {/* Header */}
            <div className="flex items-center gap-3">
              {result.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={result.logoUrl} alt="logo" className="w-10 h-10 rounded-xl object-contain border border-[#e5e5e0] bg-white p-1" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#26251e]">{result.agencyName}</p>
                {result.tagline && <p className="text-[10px] text-[#7a7a76] truncate">{result.tagline}</p>}
              </div>
              {result.brandColors && result.brandColors.length > 0 && (
                <div className="flex items-center gap-1">
                  {result.brandColors.map((c, i) => (
                    <div key={i} className="w-5 h-5 rounded-full border-2 border-white shadow-sm" style={{ background: c }} title={c} />
                  ))}
                </div>
              )}
            </div>

            {/* Services */}
            {result.services && result.services.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                  {result.services.length} services détectés
                </p>
                <div className="flex flex-wrap gap-1">
                  {result.services.map((s, i) => (
                    <span key={i} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#059669]/10 text-[#059669] border border-[#059669]/20">
                      {s.name}{s.price ? ` · ${s.price}` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className={cn('flex items-center gap-1.5 text-[10px] font-semibold', 'text-[#059669]')}>
              <Check className="w-3 h-3" />
              Workspace mis à jour · Services importés dans le catalogue · Logo dans la bibliothèque
            </div>
          </div>
        )}
      </div>

      {/* AI System Prompt */}
      <div className="space-y-2 p-4 rounded-2xl border border-[#e5e5e0] bg-[#fafaf8]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
            <Building2 className="w-3 h-3" />Prompt IA de l'agence
          </div>
          {result?.systemPrompt && (
            <button
              type="button"
              onClick={() => setSystemPrompt(result.systemPrompt || '')}
              className="flex items-center gap-1 text-[10px] text-[#059669] font-semibold hover:underline"
            >
              <RefreshCw className="w-2.5 h-2.5" />Réimporter depuis le site
            </button>
          )}
        </div>
        <p className="text-[10px] text-[#7a7a76]">
          L'assistant IA utilisera ce prompt comme contexte pour répondre au nom de votre agence.
        </p>
        <Textarea
          value={systemPrompt}
          onChange={e => setSystemPrompt(e.target.value)}
          placeholder="Tu es l'assistant de [Nom de l'agence]…"
          rows={5}
          className="text-xs border-[#e5e5e0] resize-none focus:ring-[#059669]"
        />
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="h-9 bg-[#059669] hover:bg-[#047857] text-white font-bold text-sm gap-2"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        Sauvegarder le profil
      </Button>
    </div>
  );
}
