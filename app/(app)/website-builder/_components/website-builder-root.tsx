'use client';

import { useState, useCallback } from 'react';
import { getApiUrl } from '@/lib/api-helper';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Sparkles,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Star,
  MessageSquare,
  Layers,
  HelpCircle,
  Zap,
  LayoutTemplate,
  Globe,
} from 'lucide-react';
import { toast } from 'sonner';

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

function SectionCard({
  section,
  isOpen,
  onToggle,
}: {
  section: WebsiteSection;
  isOpen: boolean;
  onToggle: () => void;
}) {
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

function formatSectionAsText(section: WebsiteSection): string {
  const lines: string[] = [`=== ${section.title.toUpperCase()} ===`, ''];

  if (section.type === 'hero') {
    const c = section.content as HeroContent;
    if (c.badge) lines.push(`[Badge] ${c.badge}`, '');
    lines.push(`Headline: ${c.headline}`, '');
    lines.push(`Sous-titre: ${c.subheadline}`, '');
    lines.push(`CTA Principal: ${c.cta}`);
    if (c.ctaSecondary) lines.push(`CTA Secondaire: ${c.ctaSecondary}`);
  } else if (section.type === 'services') {
    const items = section.content as ServiceCard[];
    items.forEach((s, i) => {
      lines.push(`${i + 1}. ${s.icon || ''} ${s.name}`);
      lines.push(`   ${s.description}`);
      if (s.price) lines.push(`   Prix : ${s.price}`);
      lines.push('');
    });
  } else if (section.type === 'testimonials') {
    const items = section.content as Testimonial[];
    items.forEach((t, i) => {
      lines.push(`${i + 1}. ★★★★★`);
      lines.push(`   "${t.text}"`);
      lines.push(`   — ${t.name}, ${t.role} @ ${t.company}`, '');
    });
  } else if (section.type === 'faq') {
    const items = section.content as FAQ[];
    items.forEach((f, i) => {
      lines.push(`Q${i + 1}: ${f.question}`);
      lines.push(`R: ${f.answer}`, '');
    });
  } else if (section.type === 'cta') {
    const c = section.content as CTAContent;
    lines.push(`Titre: ${c.headline}`, '');
    lines.push(`Sous-texte: ${c.subtext}`, '');
    lines.push(`Bouton: ${c.buttonText}`);
  }

  return lines.join('\n');
}

function formatAllSections(sections: WebsiteSection[], businessName: string): string {
  const header = `STRUCTURE COMPLÈTE — ${businessName.toUpperCase()}\nGénéré par Minerva AI\n${'─'.repeat(50)}\n`;
  return header + sections.map(formatSectionAsText).join('\n\n');
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function WebsiteBuilderRoot() {
  const [businessName, setBusinessName] = useState('');
  const [niche, setNiche] = useState('');
  const [city, setCity] = useState('');
  const [description, setDescription] = useState('');
  const [services, setServices] = useState('');
  const [tone, setTone] = useState<'professional' | 'casual' | 'modern'>('professional');
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');
  const [generating, setGenerating] = useState(false);
  const [sections, setSections] = useState<WebsiteSection[]>([]);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['hero']));
  const { copied, copy } = useCopy();

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
    <div className="min-h-screen bg-[#fafaf8]">
      <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-8">

        {/* Header */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#059669] flex items-center justify-center">
              <Globe className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-black text-[#26251e] tracking-tight">Générateur de site web IA</h1>
          </div>
          <p className="text-sm text-[#7a7a76]">Entrez les infos du business et obtenez une structure complète copywritée, prête pour Framer.</p>
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
            <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Description (optionnel)</label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Décrivez le business, ses points forts, son histoire…"
              rows={2}
              className="text-sm border-[#e5e5e0] resize-none focus:ring-[#059669]"
            />
          </div>

          <div className="flex flex-wrap gap-4 pt-1">
            {/* Tone */}
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
            {/* Language */}
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
                      language === l ? 'bg-[#26251e] text-white border-[#26251e]' : 'bg-white text-[#7a7a76] border-[#e5e5e0]'
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
            {/* Actions bar */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#26251e]">{sections.length} sections générées</h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={expandAll}
                  className="text-[10px] text-[#7a7a76] hover:text-[#26251e] font-semibold"
                >
                  Tout ouvrir
                </button>
                <span className="text-[#e5e5e0]">·</span>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="text-[10px] text-[#7a7a76] hover:text-[#26251e] font-semibold"
                >
                  Tout fermer
                </button>
                <button
                  type="button"
                  onClick={() => copy(formatAllSections(sections, businessName || niche), 'all')}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors',
                    copied === 'all'
                      ? 'bg-[#059669] text-white border-[#059669]'
                      : 'bg-white text-[#26251e] border-[#e5e5e0] hover:border-[#059669]/40'
                  )}
                >
                  {copied === 'all' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  Tout copier
                </button>
              </div>
            </div>

            {/* Section cards */}
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

            {/* Framer tip */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#f4f4f3] border border-[#e5e5e0]">
              <LayoutTemplate className="w-4 h-4 text-[#7a7a76] mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-bold text-[#26251e]">Utilisation dans Framer</p>
                <p className="text-xs text-[#7a7a76] mt-0.5 leading-relaxed">
                  Copiez chaque section et collez dans l'éditeur Framer en texte libre, ou utilisez &ldquo;Tout copier&rdquo; pour obtenir la structure complète à coller dans un prompt Framer AI.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
