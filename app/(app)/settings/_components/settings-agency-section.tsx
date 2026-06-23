'use client';

import { useState, useEffect, useCallback } from 'react';
import { getApiUrl } from '@/lib/api-helper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Globe, Zap, Loader2, Check, RefreshCw, Building2, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useReach } from '@/lib/reach-context';
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

// ── Accent Color Picker Modal ────────────────────────────────────────────────

function AccentColorModal({
  colors,
  onConfirm,
  onCancel,
}: {
  colors: string[];
  onConfirm: (color: string) => void;
  onCancel: () => void;
}) {
  const [selected, setSelected] = useState(colors[0] || '#059669');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl border border-[#e5e5e0] shadow-xl p-6 max-w-sm w-full space-y-5">
        <button type="button" onClick={onCancel} className="absolute top-4 right-4 text-[#7a7a76] hover:text-[#26251e]">
          <X className="w-4 h-4" />
        </button>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#26251e]">Couleur d'accent du workspace</h3>
          <p className="text-xs text-[#7a7a76] leading-relaxed">
            Cette couleur remplacera le vert Minerva (#059669) pour ce workspace. Choisissez la couleur principale de votre agence.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {colors.map(color => (
            <button
              key={color}
              type="button"
              onClick={() => setSelected(color)}
              className={cn(
                'w-10 h-10 rounded-xl border-2 transition-all',
                selected === color ? 'border-[#26251e] scale-110 shadow-md' : 'border-transparent hover:scale-105'
              )}
              style={{ background: color }}
              title={color}
            />
          ))}
          {/* Manual input */}
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={selected}
              onChange={e => setSelected(e.target.value)}
              className="w-10 h-10 rounded-lg border border-[#e5e5e0] cursor-pointer p-0.5"
            />
            <span className="text-xs font-mono text-[#7a7a76]">{selected}</span>
          </div>
        </div>

        {/* Preview */}
        <div className="p-3 rounded-xl border border-[#e5e5e0] bg-[#fafaf8] space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Aperçu</p>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full" style={{ background: selected }} />
            <span className="text-xs font-bold" style={{ color: selected }}>Couleur d'accent active</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: selected, opacity: 0.2 }} />
          <div className="flex gap-2">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full text-white text-center" style={{ background: selected }}>
              Bouton
            </span>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full border" style={{ color: selected, borderColor: selected }}>
              Outline
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-[10px] text-amber-700 leading-relaxed">
            Cette couleur remplace le vert Minerva. Si elle est trop claire ou trop sombre, elle peut affecter la lisibilité de l'interface.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} className="flex-1 h-9 text-xs">Annuler</Button>
          <Button
            onClick={() => onConfirm(selected)}
            className="flex-1 h-9 text-xs text-white font-bold"
            style={{ background: selected }}
          >
            Appliquer à ce workspace
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function SettingsAgencySection() {
  const { activeWorkspace, updateWorkspace } = useReach();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [scraping, setScraping] = useState(false);
  const [result, setResult] = useState<AgencyResult | null>(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [saving, setSaving] = useState(false);
  const [showColorModal, setShowColorModal] = useState(false);
  const [pendingColors, setPendingColors] = useState<string[]>([]);

  // Load existing settings from settings table and workspace
  const loadSettings = useCallback(async () => {
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user;
    if (!user) return;

    // Try to load from settings table — graceful fallback if columns don't exist
    try {
      const { data: settings } = await supabase
        .from('settings')
        .select('company_name')
        .eq('user_id', user.id)
        .maybeSingle();
      if (settings) {
        // Load extra fields individually to handle missing columns gracefully
        const { data: extra } = await supabase.rpc('get_setting_fields', { p_user_id: user.id, p_fields: ['agency_website', 'ai_agency_prompt'] }).maybeSingle().catch(() => ({ data: null }));
        if (extra) {
          if ((extra as Record<string, string>)['agency_website']) setWebsiteUrl((extra as Record<string, string>)['agency_website']);
          if ((extra as Record<string, string>)['ai_agency_prompt']) setSystemPrompt((extra as Record<string, string>)['ai_agency_prompt']);
        }
      }
    } catch {
      // columns don't exist yet — workspace-only mode
    }

    // Load workspace logo_base64 as logo preview
    if (activeWorkspace?.logo_base64 && activeWorkspace.logo_base64.startsWith('http')) {
      setResult(prev => prev ? { ...prev, logoUrl: activeWorkspace.logo_base64 } : { logoUrl: activeWorkspace.logo_base64 });
    }
  }, [activeWorkspace?.logo_base64]);

  useEffect(() => { loadSettings(); }, [loadSettings]);

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
        // Trigger accent color modal if colors detected
        if (data.brandColors?.length) {
          setPendingColors(data.brandColors);
          setShowColorModal(true);
        }
        toast.success('Site analysé ! Services importés dans le catalogue.');
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

  const handleApplyAccentColor = async (color: string) => {
    if (!activeWorkspace?.id) return;
    await updateWorkspace(activeWorkspace.id, { accent_color: color });
    document.documentElement.style.setProperty('--sidebar-primary', color);
    setShowColorModal(false);
    toast.success(`Couleur d'accent mise à jour : ${color}`);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return;

      // Try saving to settings — graceful on missing columns
      const { error } = await supabase.from('settings').update({
        updated_at: new Date().toISOString(),
      }).eq('user_id', user.id);
      void error;

      // Save system prompt to custom_instructions as fallback (existing column)
      if (systemPrompt) {
        await supabase.from('settings').update({
          custom_instructions: systemPrompt,
          updated_at: new Date().toISOString(),
        }).eq('user_id', user.id);
      }

      toast.success('Profil d\'agence sauvegardé.');
    } catch {
      toast.error('Erreur lors de la sauvegarde.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {showColorModal && pendingColors.length > 0 && (
        <AccentColorModal
          colors={pendingColors}
          onConfirm={handleApplyAccentColor}
          onCancel={() => setShowColorModal(false)}
        />
      )}

      <div className="space-y-6">
        <div>
          <h3 className="text-base font-bold text-[#26251e]">Profil d'agence</h3>
          <p className="text-xs text-[#7a7a76] mt-0.5">
            Fournissez votre site web pour configurer automatiquement votre workspace : nom, services, logo et IA.
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
              onKeyDown={e => e.key === 'Enter' && handleScrape()}
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
              <div className="flex items-center gap-3">
                {result.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={result.logoUrl} alt="logo" className="w-10 h-10 rounded-xl object-contain border border-[#e5e5e0] bg-white p-1" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[#26251e]">{result.agencyName || activeWorkspace?.name}</p>
                  {result.tagline && <p className="text-[10px] text-[#7a7a76] truncate">{result.tagline}</p>}
                </div>
                {result.brandColors && result.brandColors.length > 0 && (
                  <div className="flex items-center gap-1">
                    {result.brandColors.map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => { setPendingColors(result.brandColors || []); setShowColorModal(true); }}
                        className="w-5 h-5 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
                        style={{ background: c }}
                        title={`Appliquer ${c} comme couleur d'accent`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {result.services && result.services.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">
                    {result.services.length} services importés dans le catalogue
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

              <div className="flex items-center gap-1.5 text-[10px] text-[#059669] font-semibold">
                <Check className="w-3 h-3" />
                Workspace renommé · Services importés · Logo mis à jour dans la sidebar
              </div>

              {result.brandColors && result.brandColors.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setPendingColors(result.brandColors || []); setShowColorModal(true); }}
                  className="text-[10px] font-bold text-purple-700 hover:underline flex items-center gap-1"
                >
                  <span className="w-3 h-3 rounded-full inline-block" style={{ background: result.brandColors[0] }} />
                  Choisir la couleur d'accent →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Accent color manual trigger */}
        {activeWorkspace?.accent_color && activeWorkspace.accent_color !== '#059669' && (
          <div className="flex items-center justify-between p-3 rounded-xl border border-[#e5e5e0] bg-white">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full" style={{ background: activeWorkspace.accent_color }} />
              <span className="text-xs font-bold text-[#26251e]">Couleur d'accent : {activeWorkspace.accent_color}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPendingColors([activeWorkspace.accent_color!]); setShowColorModal(true); }}
              className="h-7 text-[10px]"
            >
              Modifier
            </Button>
          </div>
        )}

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
                <RefreshCw className="w-2.5 h-2.5" />Réimporter
              </button>
            )}
          </div>
          <p className="text-[10px] text-[#7a7a76]">
            L'assistant IA utilisera ce contexte pour répondre au nom de votre agence dans l'app.
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
          Sauvegarder
        </Button>
      </div>
    </>
  );
}
