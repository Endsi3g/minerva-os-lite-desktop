'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api-helper';
import { useReach } from '@/lib/reach-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles, Copy, Check, ChevronDown, ChevronUp, Loader2, Star, MessageSquare,
  Layers, HelpCircle, Zap, LayoutTemplate, Globe, Search, Building2, MapPin,
  X, BookMarked, Trash2, ExternalLink, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { WebsitePortfolioSection } from './website-portfolio-section';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HeroContent { headline: string; subheadline: string; cta: string; ctaSecondary?: string; badge?: string }
interface ServiceCard { name: string; description: string; price?: string | null; icon?: string }
interface Testimonial { name: string; role: string; company: string; text: string; rating: number }
interface FAQ { question: string; answer: string }
interface CTAContent { headline: string; subtext: string; buttonText: string }

interface WebsiteSection {
  id: string;
  type: 'hero' | 'services' | 'testimonials' | 'faq' | 'cta';
  title: string;
  content: HeroContent | ServiceCard[] | Testimonial[] | FAQ[] | CTAContent;
}

interface SavedSite {
  id: string;
  leadId: string;
  businessName: string;
  city: string;
  niche: string;
  language: 'fr' | 'en';
  sections: WebsiteSection[];
  savedAt: string;
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success('Copié !');
    setTimeout(() => setCopied(null), 2000);
  }, []);
  return { copied, copy };
}

function CopyButton({ text, id }: { text: string; id: string }) {
  const { copied, copy } = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(text, id)}
      className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border border-[#e5e5e0] bg-white hover:border-[#059669]/40 hover:text-[#059669] text-[#7a7a76] transition-colors"
    >
      {copied === id ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
      Copier
    </button>
  );
}

// ── Section preview components ─────────────────────────────────────────────────

function HeroPreview({ content }: { content: HeroContent }) {
  return (
    <div className="pt-4 space-y-3">
      {content.badge && (
        <span className="inline-block text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#059669]/10 text-[#059669] border border-[#059669]/20">
          {content.badge}
        </span>
      )}
      <h2 className="text-xl font-black text-[#26251e] leading-tight">{content.headline}</h2>
      <p className="text-sm text-[#7a7a76] leading-relaxed">{content.subheadline}</p>
      <div className="flex flex-wrap gap-2 pt-1">
        <span className="px-4 py-2 rounded-xl bg-[#059669] text-white text-xs font-bold">{content.cta}</span>
        {content.ctaSecondary && (
          <span className="px-4 py-2 rounded-xl border border-[#e5e5e0] text-[#26251e] text-xs font-bold">{content.ctaSecondary}</span>
        )}
      </div>
    </div>
  );
}

function ServicesPreview({ items }: { items: ServiceCard[] }) {
  return (
    <div className="pt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
      {items.map((item, i) => (
        <div key={i} className="p-3 rounded-xl bg-[#fafaf8] border border-[#e5e5e0]">
          <div className="flex items-start gap-2">
            {item.icon && <span className="text-lg leading-none">{item.icon}</span>}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-[#26251e]">{item.name}</p>
              <p className="text-[10px] text-[#7a7a76] leading-relaxed mt-0.5">{item.description}</p>
              {item.price && <p className="text-[10px] font-bold text-[#059669] mt-1">{item.price}</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TestimonialsPreview({ items }: { items: Testimonial[] }) {
  return (
    <div className="pt-4 space-y-3">
      {items.map((item, i) => (
        <div key={i} className="p-3 rounded-xl bg-[#fafaf8] border border-[#e5e5e0] space-y-1.5">
          <div className="flex items-center gap-1">
            {Array.from({ length: item.rating }).map((_, j) => (
              <Star key={j} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="text-xs text-[#26251e] leading-relaxed italic">"{item.text}"</p>
          <div>
            <p className="text-[10px] font-bold text-[#26251e]">{item.name}</p>
            <p className="text-[9px] text-[#7a7a76]">{item.role} · {item.company}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function FAQPreview({ items }: { items: FAQ[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="pt-4 space-y-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-[#e5e5e0] overflow-hidden">
          <button
            type="button"
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between p-3 text-left hover:bg-[#fafaf8] transition-colors"
          >
            <span className="text-xs font-bold text-[#26251e] pr-2">{item.question}</span>
            {open === i ? <ChevronUp className="w-3 h-3 text-[#7a7a76] flex-shrink-0" /> : <ChevronDown className="w-3 h-3 text-[#7a7a76] flex-shrink-0" />}
          </button>
          {open === i && (
            <div className="px-3 pb-3 text-xs text-[#7a7a76] leading-relaxed border-t border-[#e5e5e0]">
              <div className="pt-2">{item.answer}</div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CTAPreview({ content }: { content: CTAContent }) {
  return (
    <div className="pt-4 text-center space-y-2 py-4 bg-[#059669]/5 rounded-xl border border-[#059669]/10 mt-3">
      <p className="text-base font-black text-[#26251e]">{content.headline}</p>
      <p className="text-xs text-[#7a7a76]">{content.subtext}</p>
      <span className="inline-block px-5 py-2.5 rounded-xl bg-[#059669] text-white text-xs font-bold">{content.buttonText}</span>
    </div>
  );
}

// ── Section card ───────────────────────────────────────────────────────────────

function SectionCard({ section, isOpen, onToggle }: { section: WebsiteSection; isOpen: boolean; onToggle: () => void }) {
  const icons: Record<string, React.ReactNode> = {
    hero: <LayoutTemplate className="w-4 h-4 text-[#059669]" />,
    services: <Layers className="w-4 h-4 text-blue-500" />,
    testimonials: <MessageSquare className="w-4 h-4 text-purple-500" />,
    faq: <HelpCircle className="w-4 h-4 text-amber-500" />,
    cta: <Zap className="w-4 h-4 text-[#059669]" />,
  };
  const sectionText = formatSectionAsText(section);

  return (
    <div className="rounded-2xl border border-[#e5e5e0] bg-white overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-[#fafaf8] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#f4f4f3] flex items-center justify-center">
            {icons[section.type]}
          </div>
          <span className="text-sm font-bold text-[#26251e]">{section.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <CopyButton text={sectionText} id={section.id} />
          {isOpen ? <ChevronUp className="w-4 h-4 text-[#7a7a76]" /> : <ChevronDown className="w-4 h-4 text-[#7a7a76]" />}
        </div>
      </button>
      {isOpen && (
        <div className="px-4 pb-4 border-t border-[#e5e5e0]">
          {section.type === 'hero' && <HeroPreview content={section.content as HeroContent} />}
          {section.type === 'services' && <ServicesPreview items={section.content as ServiceCard[]} />}
          {section.type === 'testimonials' && <TestimonialsPreview items={section.content as Testimonial[]} />}
          {section.type === 'faq' && <FAQPreview items={section.content as FAQ[]} />}
          {section.type === 'cta' && <CTAPreview content={section.content as CTAContent} />}
        </div>
      )}
    </div>
  );
}

// ── Formatters ─────────────────────────────────────────────────────────────────

function formatSectionAsText(section: WebsiteSection): string {
  const lines: string[] = [`=== ${section.title.toUpperCase()} ===`, ''];
  if (section.type === 'hero') {
    const c = section.content as HeroContent;
    if (c.badge) lines.push(`[Badge] ${c.badge}`, '');
    lines.push(`Headline: ${c.headline}`, '', `Sous-titre: ${c.subheadline}`, '', `CTA Principal: ${c.cta}`);
    if (c.ctaSecondary) lines.push(`CTA Secondaire: ${c.ctaSecondary}`);
  } else if (section.type === 'services') {
    (section.content as ServiceCard[]).forEach((s, i) => {
      lines.push(`${i + 1}. ${s.icon || ''} ${s.name}`, `   ${s.description}`);
      if (s.price) lines.push(`   Prix : ${s.price}`);
      lines.push('');
    });
  } else if (section.type === 'testimonials') {
    (section.content as Testimonial[]).forEach((t, i) => {
      lines.push(`${i + 1}. ★★★★★`, `   "${t.text}"`, `   — ${t.name}, ${t.role} @ ${t.company}`, '');
    });
  } else if (section.type === 'faq') {
    (section.content as FAQ[]).forEach((f, i) => {
      lines.push(`Q${i + 1}: ${f.question}`, `R: ${f.answer}`, '');
    });
  } else if (section.type === 'cta') {
    const c = section.content as CTAContent;
    lines.push(`Titre: ${c.headline}`, '', `Sous-texte: ${c.subtext}`, '', `Bouton: ${c.buttonText}`);
  }
  return lines.join('\n');
}

function formatAllSections(sections: WebsiteSection[], businessName: string): string {
  const header = `STRUCTURE COMPLÈTE — ${businessName.toUpperCase()}\nGénéré par Minerva AI\n${'─'.repeat(50)}\n`;
  return header + sections.map(formatSectionAsText).join('\n\n');
}

// ── Gallery card ───────────────────────────────────────────────────────────────

function GalleryCard({ site, onDelete, onLoad }: { site: SavedSite; onDelete: () => void; onLoad: () => void }) {
  const hero = site.sections.find(s => s.type === 'hero');
  const headline = hero ? (hero.content as HeroContent).headline : '—';
  const date = new Date(site.savedAt);
  const formatted = date.toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="bg-white rounded-2xl border border-[#e5e5e0] overflow-hidden hover:border-[#059669]/30 hover:shadow-sm transition-all group">
      {/* Mock website preview */}
      <div className="h-24 bg-gradient-to-br from-[#f4f4f3] to-[#e9e9e4] flex items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-30 bg-grid-pattern-20" />
        <div className="relative z-10 text-center px-4">
          <p className="text-[10px] font-black text-[#26251e] line-clamp-2 leading-tight">{headline}</p>
        </div>
        <div className="absolute top-2 right-2">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-white border border-[#e5e5e0] text-[#7a7a76]">
            {site.language.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#26251e] truncate">{site.businessName}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {site.city && (
                <span className="flex items-center gap-1 text-[9px] text-[#7a7a76]">
                  <MapPin className="w-2.5 h-2.5" />{site.city}
                </span>
              )}
              {site.niche && (
                <span className="text-[9px] text-[#7a7a76]">{site.niche}</span>
              )}
            </div>
            <p className="text-[9px] text-[#7a7a76] mt-0.5">{formatted} · {site.sections.length} sections</p>
          </div>
        </div>

        <div className="flex items-center gap-1 mt-3">
          <button
            type="button"
            onClick={onLoad}
            className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-[10px] font-bold transition-colors"
          >
            <ExternalLink className="w-2.5 h-2.5" />
            Ouvrir
          </button>
          <Link
            href={`/leads/${site.leadId}`}
            className="h-7 w-7 rounded-lg flex items-center justify-center border border-[#e5e5e0] hover:border-[#059669]/30 text-[#7a7a76] hover:text-[#059669] transition-colors"
            title="Voir le lead"
          >
            <ChevronRight className="w-3 h-3" />
          </Link>
          <button
            type="button"
            onClick={onDelete}
            className="h-7 w-7 rounded-lg flex items-center justify-center border border-[#e5e5e0] hover:border-red-200 text-[#7a7a76] hover:text-red-500 transition-colors"
            title="Supprimer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function WebsiteBuilderRoot() {
  const { leads } = useReach();

  // Mode tabs
  const [mode, setMode] = useState<'builder' | 'gallery'>('builder');

  // Lead picker
  const [leadSearch, setLeadSearch] = useState('');
  const [showLeadPicker, setShowLeadPicker] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const selectedLead = useMemo(() => leads.find(l => l.id === selectedLeadId) ?? null, [leads, selectedLeadId]);

  // Gallery — stored in Supabase
  const [savedSites, setSavedSites] = useState<SavedSite[]>([]);
  useEffect(() => {
    fetch('/api/websites')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (Array.isArray(d?.websites)) setSavedSites(d.websites); })
      .catch(() => {});
  }, []);

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [services, setServices] = useState('');
  const [tone, setTone] = useState<'professional' | 'casual' | 'modern'>('professional');
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');

  // Results
  const [generating, setGenerating] = useState(false);
  const [sections, setSections] = useState<WebsiteSection[]>([]);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['hero']));
  const { copied, copy } = useCopy();

  // Filtered leads for picker
  const leadsWithWebsite = useMemo(() =>
    leads.filter(l => l.businessName),
    [leads]
  );
  const filteredLeads = useMemo(() => {
    const q = leadSearch.toLowerCase();
    return leadsWithWebsite.filter(l =>
      !q ||
      l.businessName.toLowerCase().includes(q) ||
      l.city?.toLowerCase().includes(q) ||
      l.niche?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [leadsWithWebsite, leadSearch]);

  // Select a lead → pre-fill form
  const handleSelectLead = useCallback((leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    setSelectedLeadId(leadId);
    setBusinessName(lead.businessName || '');
    setNiche(lead.niche || '');
    setCity(lead.city || '');
    setDescription(lead.websiteDescription || '');
    setShowLeadPicker(false);
    setLeadSearch('');
    setSections([]);
  }, [leads]);

  const clearLead = () => {
    setSelectedLeadId(null);
    setBusinessName('');
    setNiche('');
    setCity('');
    setDescription('');
    setSections([]);
  };

  // Generate
  const handleGenerate = async () => {
    if (!businessName && !niche) {
      toast.error('Entrez au moins le nom du business ou le secteur d\'activité.');
      return;
    }
    setGenerating(true);
    setSections([]);
    try {
      const res = await fetch(getApiUrl('/api/generate-website'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessName, niche, city, description, services, tone, language }),
      });
      if (res.ok) {
        const data = await res.json();
        setSections(data.sections || []);
        setOpenSections(new Set(['hero']));
        toast.success('Structure générée !');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Erreur lors de la génération.');
      }
    } catch {
      toast.error('Erreur réseau.');
    } finally {
      setGenerating(false);
    }
  };

  // Save to gallery
  const handleSave = () => {
    if (!sections.length) return;
    const newSite: SavedSite = {
      id: Date.now().toString(),
      leadId: selectedLeadId || 'manual',
      businessName: businessName || niche || 'Sans nom',
      city,
      niche,
      language,
      sections,
      savedAt: new Date().toISOString(),
    };
    const updated = [newSite, ...savedSites.filter(s => s.leadId !== (selectedLeadId || 'manual') || s.id === newSite.id)];
    setSavedSites(updated);
    // Persist to Supabase
    fetch('/api/websites', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ websites: updated }),
    }).catch(() => {});
    toast.success(`Sauvegardé dans la galerie !`);
  };

  // Load from gallery
  const handleLoadSite = (site: SavedSite) => {
    setBusinessName(site.businessName);
    setNiche(site.niche);
    setCity(site.city);
    setLanguage(site.language);
    setSections(site.sections);
    setOpenSections(new Set(['hero']));
    if (site.leadId !== 'manual') setSelectedLeadId(site.leadId);
    setMode('builder');
    toast.success('Site chargé !');
  };

  // Delete from gallery
  const handleDeleteSite = (id: string) => {
    const updated = savedSites.filter(s => s.id !== id);
    setSavedSites(updated);
    // Persist to Supabase
    fetch('/api/websites', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ websites: updated }),
    }).catch(() => {});
    toast.success('Supprimé.');
  };

  const toggleSection = (id: string) => {
    setOpenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const expandAll = () => setOpenSections(new Set(sections.map(s => s.id)));
  const collapseAll = () => setOpenSections(new Set());

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf8] relative">
      <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />
      <div className="relative z-10 max-w-3xl mx-auto p-4 md:p-6 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#e5e5e0]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#059669] flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#26251e] tracking-tight">Générateur de site web IA</h1>
              <p className="text-xs text-[#7a7a76] mt-0.5">Structure Framer-ready copywritée en quelques secondes</p>
            </div>
          </div>
        </div>

        {/* Mode tabs */}
        <div className="flex items-center gap-1 bg-[#f4f4f3] rounded-xl p-1 self-start w-fit">
          {([
            { key: 'builder', label: 'Générateur', icon: <Sparkles className="w-3 h-3" /> },
            { key: 'gallery', label: `Galerie${savedSites.length ? ` (${savedSites.length})` : ''}`, icon: <BookMarked className="w-3 h-3" /> },
          ] as const).map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setMode(tab.key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                mode === tab.key
                  ? 'bg-white text-[#26251e] shadow-sm'
                  : 'text-[#7a7a76] hover:text-[#26251e]'
              )}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ── GALLERY MODE ── */}
        {mode === 'gallery' && (
          <div className="space-y-8">
            <WebsitePortfolioSection />

            <div className="pt-6 border-t border-[#e5e5e0]">
              <h2 className="text-sm font-bold text-[#26251e] mb-4">Sites générés par l&apos;IA</h2>
            </div>

            {savedSites.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20 text-center">
                <div className="h-14 w-14 rounded-2xl border border-[#e5e5e0] bg-white flex items-center justify-center">
                  <BookMarked className="h-6 w-6 text-[#7a7a76]/40" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#26251e]">Aucun site sauvegardé</h3>
                  <p className="text-xs text-[#7a7a76] max-w-xs leading-relaxed">
                    Générez un site et cliquez sur "Sauvegarder dans la galerie" pour le retrouver ici.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setMode('builder')}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Générer mon premier site
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-[#7a7a76]">{savedSites.length} site{savedSites.length !== 1 ? 's' : ''} sauvegardé{savedSites.length !== 1 ? 's' : ''}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {savedSites.map(site => (
                    <GalleryCard
                      key={site.id}
                      site={site}
                      onLoad={() => handleLoadSite(site)}
                      onDelete={() => handleDeleteSite(site.id)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── BUILDER MODE ── */}
        {mode === 'builder' && (
          <>
            {/* Lead picker */}
            <div className="bg-white rounded-2xl border border-[#e5e5e0] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-[#26251e]">Générer depuis un lead</p>
                <span className="text-[10px] text-[#7a7a76]">Pré-remplit le formulaire automatiquement</span>
              </div>

              {selectedLead ? (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#059669]/5 border border-[#059669]/20">
                  <div className="h-8 w-8 rounded-full bg-[#059669]/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5 text-[#059669]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#26251e] truncate">{selectedLead.businessName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {selectedLead.city && (
                        <span className="flex items-center gap-1 text-[9px] text-[#7a7a76]">
                          <MapPin className="w-2.5 h-2.5" />{selectedLead.city}
                        </span>
                      )}
                      {selectedLead.niche && <span className="text-[9px] text-[#7a7a76]">{selectedLead.niche}</span>}
                      {selectedLead.websiteDescription && (
                        <span className="text-[9px] text-[#059669] font-bold">✓ Description disponible</span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearLead}
                    className="h-6 w-6 rounded-lg flex items-center justify-center text-[#7a7a76] hover:text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowLeadPicker(v => !v)}
                    className="w-full flex items-center gap-2 h-9 px-3 rounded-xl border border-[#e5e5e0] bg-[#fafaf8] hover:border-[#059669]/30 text-xs text-[#7a7a76] transition-colors"
                  >
                    <Search className="w-3.5 h-3.5 shrink-0" />
                    <span>Sélectionner un lead…</span>
                  </button>

                  {showLeadPicker && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#e5e5e0] rounded-xl shadow-lg z-20 overflow-hidden">
                      <div className="p-2 border-b border-[#e5e5e0]">
                        <input
                          autoFocus
                          type="text"
                          value={leadSearch}
                          onChange={e => setLeadSearch(e.target.value)}
                          placeholder="Rechercher un lead…"
                          className="w-full h-8 px-3 rounded-lg border border-[#e5e5e0] text-xs text-[#26251e] placeholder:text-[#7a7a76] focus:outline-none focus:border-[#059669]/50"
                        />
                      </div>
                      {filteredLeads.length === 0 ? (
                        <div className="py-6 text-center text-xs text-[#7a7a76]">Aucun lead trouvé</div>
                      ) : (
                        <div className="max-h-48 overflow-y-auto">
                          {filteredLeads.map(l => (
                            <button
                              key={l.id}
                              type="button"
                              onClick={() => handleSelectLead(l.id)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#fafaf8] text-left transition-colors"
                            >
                              <div className="h-7 w-7 rounded-full bg-[#059669]/10 flex items-center justify-center shrink-0 text-[10px] font-black text-[#059669]">
                                {l.businessName[0]?.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-[#26251e] truncate">{l.businessName}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  {l.city && <span className="text-[9px] text-[#7a7a76]">{l.city}</span>}
                                  {l.niche && <span className="text-[9px] text-[#7a7a76]">{l.niche}</span>}
                                  {l.websiteDescription && <span className="text-[9px] text-[#059669] font-bold">• Description</span>}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Input form */}
            <div className="bg-white rounded-2xl border border-[#e5e5e0] p-5 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom du business *</label>
                  <Input
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="ex: Salon Beauté Belle"
                    className="h-9 text-sm border-[#e5e5e0] focus:ring-[#059669]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Secteur / Niche</label>
                  <Input
                    value={niche}
                    onChange={e => setNiche(e.target.value)}
                    placeholder="ex: Coiffure, Restaurant, Plomberie"
                    className="h-9 text-sm border-[#e5e5e0] focus:ring-[#059669]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Ville</label>
                  <Input
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder="ex: Montréal, Québec"
                    className="h-9 text-sm border-[#e5e5e0] focus:ring-[#059669]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Services (optionnel)</label>
                  <Input
                    value={services}
                    onChange={e => setServices(e.target.value)}
                    placeholder="ex: Coupe, Coloration, Balayage"
                    className="h-9 text-sm border-[#e5e5e0] focus:ring-[#059669]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Description</label>
                <Textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Décrivez le business, ses points forts, son histoire…"
                  rows={3}
                  className="text-sm border-[#e5e5e0] resize-none focus:ring-[#059669]"
                />
              </div>

              <div className="flex flex-wrap gap-4 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Ton</label>
                  <div className="flex items-center gap-1">
                    {(['professional', 'casual', 'modern'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTone(t)}
                        className={cn(
                          'px-3 h-7 rounded-lg text-[10px] font-bold transition-colors border',
                          tone === t ? 'bg-[#059669] text-white border-[#059669]' : 'bg-white text-[#7a7a76] border-[#e5e5e0] hover:border-[#059669]/30'
                        )}
                      >
                        {{ professional: 'Pro', casual: 'Chaleureux', modern: 'Moderne' }[t]}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Langue</label>
                  <div className="flex items-center gap-1">
                    {(['fr', 'en'] as const).map(l => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLanguage(l)}
                        className={cn(
                          'px-3 h-7 rounded-lg text-[10px] font-bold transition-colors border',
                          language === l ? 'bg-[#26251e] text-white border-[#26251e]' : 'bg-white text-[#7a7a76] border-[#e5e5e0] hover:border-[#26251e]/30'
                        )}
                      >
                        {l.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating || (!businessName && !niche)}
                className="w-full h-10 bg-[#059669] hover:bg-[#047857] text-white font-bold text-sm gap-2"
              >
                {generating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Génération en cours…</>
                ) : (
                  <><Sparkles className="w-4 h-4" />Générer la structure complète</>
                )}
              </Button>
            </div>

            {/* Results */}
            {sections.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#26251e]">{sections.length} sections générées</h2>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={expandAll} className="text-[10px] text-[#7a7a76] hover:text-[#26251e] font-semibold">Tout ouvrir</button>
                    <span className="text-[#e5e5e0]">·</span>
                    <button type="button" onClick={collapseAll} className="text-[10px] text-[#7a7a76] hover:text-[#26251e] font-semibold">Tout fermer</button>
                    <button
                      type="button"
                      onClick={() => copy(formatAllSections(sections, businessName || niche), 'all')}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors',
                        copied === 'all' ? 'bg-[#059669] text-white border-[#059669]' : 'bg-white text-[#26251e] border-[#e5e5e0] hover:border-[#059669]/40'
                      )}
                    >
                      {copied === 'all' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Tout copier
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {sections.map(section => (
                    <SectionCard
                      key={section.id}
                      section={section}
                      isOpen={openSections.has(section.id)}
                      onToggle={() => toggleSection(section.id)}
                    />
                  ))}
                </div>

                {/* Save to gallery */}
                <button
                  type="button"
                  onClick={handleSave}
                  className="w-full flex items-center justify-center gap-2 h-10 rounded-xl border-2 border-dashed border-[#e5e5e0] hover:border-[#059669]/40 hover:bg-[#059669]/5 text-xs font-bold text-[#7a7a76] hover:text-[#059669] transition-all"
                >
                  <BookMarked className="w-3.5 h-3.5" />
                  Sauvegarder dans la galerie
                  {selectedLead && <span className="font-normal">— pour {selectedLead.businessName}</span>}
                </button>

                {/* Framer tip */}
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#f4f4f3] border border-[#e5e5e0]">
                  <LayoutTemplate className="w-4 h-4 text-[#7a7a76] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-[#26251e]">Utilisation dans Framer</p>
                    <p className="text-xs text-[#7a7a76] mt-0.5 leading-relaxed">
                      Copiez chaque section et collez dans l&apos;éditeur Framer en texte libre, ou utilisez &ldquo;Tout copier&rdquo; pour obtenir la structure complète à coller dans un prompt Framer AI.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
