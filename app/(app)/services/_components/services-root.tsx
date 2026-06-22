'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { useReach } from '@/lib/reach-context';
import {
  Plus, Pencil, Trash2, Check, X, Loader2, Sparkles,
  FileText, Package, LayoutGrid, DollarSign, Download, Send, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type ServiceType = 'digital' | 'saas' | 'audit' | 'formation' | 'autre';
type ViewTab = 'catalog' | 'packages' | 'quote';

interface ServiceTemplate {
  name: string;
  price: number;
  type: ServiceType;
  description: string;
}

const SERVICE_TEMPLATES_BY_NICHE: Record<string, ServiceTemplate[]> = {
  restaurant: [
    { name: 'Création site web restaurant', price: 1200, type: 'digital', description: "Site vitrine responsive avec menu, horaires et réservation en ligne." },
    { name: 'Gestion avis Google / Yelp', price: 297, type: 'audit', description: "Réponses aux avis négatifs et campagne de récolte d'avis clients." },
    { name: 'Campagne Instagram food', price: 497, type: 'digital', description: "Création de contenu et gestion de la page Instagram pendant 30 jours." },
    { name: 'Menu digital QR code', price: 149, type: 'digital', description: "Menu PDF scannable avec QR code imprimable pour les tables." },
  ],
  cafe: [
    { name: 'Site vitrine café', price: 899, type: 'digital', description: "Site avec horaires, localisation et galerie photo." },
    { name: 'Optimisation fiche Google', price: 297, type: 'audit', description: "Audit et optimisation complète de la fiche Google My Business." },
    { name: 'Campagne Instagram café', price: 397, type: 'digital', description: "Contenu et stories pour attirer de nouveaux clients locaux." },
  ],
  coiffure: [
    { name: 'Site web + prise de RDV', price: 990, type: 'digital', description: "Site vitrine avec module de réservation en ligne intégré (Calendly ou autre)." },
    { name: 'Audit Google My Business', price: 249, type: 'audit', description: "Optimisation de la fiche GMB pour améliorer la visibilité locale." },
    { name: 'Campagne Instagram beauté', price: 397, type: 'digital', description: "Shooting photo et gestion des réseaux sociaux pendant 30 jours." },
    { name: 'SMS rappel RDV', price: 99, type: 'saas', description: "Automatisation des rappels SMS 24h avant chaque rendez-vous." },
  ],
  dentaire: [
    { name: 'Site web clinique dentaire', price: 1490, type: 'digital', description: "Site avec présentation des soins, équipe et prise de RDV en ligne." },
    { name: 'Rappels patients SMS', price: 149, type: 'saas', description: "Envoi automatique de rappels de rendez-vous par SMS." },
    { name: 'Gestion e-réputation', price: 297, type: 'audit', description: "Réponses aux avis et campagne pour augmenter les avis positifs." },
    { name: 'Formation Google Ads locaux', price: 397, type: 'formation', description: "Session de 2h pour apprendre à gérer ses propres campagnes Google Ads." },
  ],
  plombier: [
    { name: 'Site web plombier urgence', price: 790, type: 'digital', description: "Site avec formulaire d'urgence, zone d'intervention et tarifs." },
    { name: 'Audit SEO local', price: 197, type: 'audit', description: "Analyse du positionnement local et recommandations concrètes." },
    { name: 'Fiche Google My Business', price: 149, type: 'audit', description: "Création et optimisation de la fiche GMB avec photos et horaires." },
  ],
  default: [
    { name: 'Site web vitrine', price: 990, type: 'digital', description: "Site professionnel responsive avec présentation de vos services." },
    { name: 'Audit Google My Business', price: 249, type: 'audit', description: "Optimisation complète de la fiche locale pour améliorer la visibilité." },
    { name: 'Campagne réseaux sociaux', price: 397, type: 'digital', description: "Gestion des réseaux sociaux et création de contenu pendant 30 jours." },
    { name: 'Formation prospection Minerva', price: 297, type: 'formation', description: "Session d'onboarding Minerva OS pour automatiser votre prospection locale." },
  ],
};

function getTemplatesForNiches(niches: string[]): ServiceTemplate[] {
  if (niches.length === 0) return SERVICE_TEMPLATES_BY_NICHE.default;
  const templates: ServiceTemplate[] = [];
  const seen = new Set<string>();
  for (const niche of niches) {
    const n = niche.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const key = Object.keys(SERVICE_TEMPLATES_BY_NICHE).find(k => n.includes(k));
    const tpls = SERVICE_TEMPLATES_BY_NICHE[key ?? 'default'] ?? [];
    for (const t of tpls) {
      if (!seen.has(t.name)) { seen.add(t.name); templates.push(t); }
    }
    if (templates.length >= 8) break;
  }
  return templates.length > 0 ? templates : SERVICE_TEMPLATES_BY_NICHE.default;
}

interface Service {
  id: string;
  user_id: string;
  workspace_id: string;
  name: string;
  price: number | null;
  type: ServiceType;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface ServicePackage {
  id: string;
  name: string;
  description: string;
  serviceIds: string[];
  discountedPrice: number | null;
  highlight: boolean;
}

const TYPE_LABELS: Record<ServiceType, string> = {
  digital: 'Digital', saas: 'SaaS', audit: 'Audit', formation: 'Formation', autre: 'Autre',
};

const TYPE_COLORS: Record<ServiceType, string> = {
  digital:   'bg-[#dbeafe]/60 text-[#1e40af] border-[#93c5fd]/60',
  saas:      'bg-[#ecfdf5] text-[#065f46] border-[#6ee7b7]/60',
  audit:     'bg-[#fef3c7]/80 text-[#92400e] border-[#fcd34d]/60',
  formation: 'bg-[#f5f3ff] text-[#5b21b6] border-[#c4b5fd]/60',
  autre:     'bg-[#f4f4f3] text-[#26251e] border-[#e5e5e0]',
};

const EMPTY_FORM = { name: '', price: '', type: 'digital' as ServiceType, description: '' };

// ── Quote types ────────────────────────────────────────────────────────────────
interface QuoteClient {
  name: string;
  company: string;
  email: string;
  address: string;
}

function generateQuoteHtml(client: QuoteClient, selectedServices: Service[], discount: number, validDays: number, sellerName: string): string {
  const subtotal = selectedServices.reduce((s, sv) => s + (sv.price ?? 0), 0);
  const discountAmt = Math.round(subtotal * discount / 100);
  const total = subtotal - discountAmt;
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const validUntil = new Date(Date.now() + validDays * 86400000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

  const rows = selectedServices.map(sv => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #f0efe9;">${sv.name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0efe9;color:#555552;font-size:12px;">${sv.description || ''}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #f0efe9;text-align:right;font-weight:700;">${sv.price !== null ? sv.price.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }) : '—'}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"><title>Devis - ${client.company || client.name}</title>
<style>
  body{font-family:system-ui,sans-serif;margin:0;padding:48px;color:#26251e;font-size:14px;line-height:1.6}
  @media print{body{padding:24px}}
  h1{font-size:28px;font-weight:900;margin:0 0 4px}
  .subtitle{color:#807d72;font-size:13px;margin:0 0 32px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px}
  .label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#807d72;margin-bottom:4px}
  .value{font-size:14px;font-weight:600}
  table{width:100%;border-collapse:collapse;margin:24px 0}
  thead tr{background:#fafaf9;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#807d72}
  th{padding:10px 12px;text-align:left;border-bottom:2px solid #e6e5e0}
  .total-row td{padding:12px;background:#26251e;color:#fff;font-weight:700;font-size:16px}
  .footer{margin-top:48px;padding-top:16px;border-top:1px solid #e6e5e0;font-size:11px;color:#807d72}
  .badge{display:inline-block;background:#f54e00;color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:999px;margin-left:8px}
</style>
</head>
<body>
  <h1>Devis Professionnel</h1>
  <p class="subtitle">Valable jusqu'au ${validUntil} · Référence DEV-${Date.now().toString().slice(-6)}</p>
  <div class="grid">
    <div>
      <p class="label">Émis par</p>
      <p class="value">${sellerName}</p>
    </div>
    <div>
      <p class="label">Destinataire</p>
      <p class="value">${client.name}${client.company ? ` — ${client.company}` : ''}</p>
      ${client.email ? `<p style="margin:2px 0;color:#807d72;font-size:12px">${client.email}</p>` : ''}
      ${client.address ? `<p style="margin:2px 0;color:#807d72;font-size:12px">${client.address}</p>` : ''}
    </div>
  </div>
  <table>
    <thead><tr><th>Service</th><th>Description</th><th style="text-align:right">Prix</th></tr></thead>
    <tbody>${rows}</tbody>
    ${discount > 0 ? `
    <tfoot>
      <tr><td colspan="2" style="padding:10px 12px;text-align:right;color:#807d72">Sous-total</td><td style="padding:10px 12px;text-align:right">${subtotal.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}</td></tr>
      <tr><td colspan="2" style="padding:10px 12px;text-align:right;color:#807d72">Remise (${discount}%)</td><td style="padding:10px 12px;text-align:right;color:#059669">-${discountAmt.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}</td></tr>
    </tfoot>` : ''}
    <tr class="total-row"><td colspan="2">TOTAL</td><td style="text-align:right">${total.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}</td></tr>
  </table>
  <p style="font-size:12px;color:#807d72;margin:0">Date d'émission : ${today}</p>
  <div class="footer">Ce devis est émis par ${sellerName} via Minerva OS Lite. Pour accepter, répondez par email ou signez et retournez ce document.</div>
</body>
</html>`;
}

export default function ServicesRoot() {
  const { activeWorkspace } = useReach();

  const [activeTab, setActiveTab] = useState<ViewTab>('catalog');
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNiches, setUserNiches] = useState<string[]>([]);
  const [sellerName, setSellerName] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);

  // Catalog CRUD
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addSaving, setAddSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [crudError, setCrudError] = useState<string | null>(null);

  // Packages (localStorage)
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [showPkgForm, setShowPkgForm] = useState(false);
  const [pkgForm, setPkgForm] = useState({ name: '', description: '', serviceIds: [] as string[], discountedPrice: '', highlight: false });
  const [editingPkgId, setEditingPkgId] = useState<string | null>(null);

  // Quote
  const [quoteClient, setQuoteClient] = useState<QuoteClient>({ name: '', company: '', email: '', address: '' });
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [quoteDiscount, setQuoteDiscount] = useState(0);
  const [quoteValidDays, setQuoteValidDays] = useState(30);
  const [exportingQuote, setExportingQuote] = useState(false);

  // Load packages from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('minerva_packages');
      if (stored) setPackages(JSON.parse(stored));
    } catch {}
  }, []);

  const savePackages = (pkgs: ServicePackage[]) => {
    setPackages(pkgs);
    try { localStorage.setItem('minerva_packages', JSON.stringify(pkgs)); } catch {}
  };

  const fetchServices = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false });
      if (data) setServices(data as Service[]);
    } catch {}
    setLoading(false);
  }, [activeWorkspace]);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  useEffect(() => {
    const init = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('settings').select('niches, full_name').eq('user_id', user.id).maybeSingle();
        if (data?.niches && Array.isArray(data.niches)) setUserNiches(data.niches as string[]);
        if (data?.full_name) setSellerName(data.full_name);
      } catch {}
    };
    init();
  }, []);

  // ── Catalog CRUD ────────────────────────────────────────────────────────────
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !activeWorkspace) return;
    setAddSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('services').insert({
        user_id: user.id,
        workspace_id: activeWorkspace.id,
        name: addForm.name.trim(),
        price: addForm.price !== '' ? parseFloat(addForm.price) : null,
        type: addForm.type,
        description: addForm.description.trim() || null,
      }).select().single();
      if (error) {
        const msg = (error as { code?: string; message?: string }).code === '42P01'
          ? 'Table "services" introuvable. Exécutez le SQL de configuration.'
          : ((error as { message?: string }).message || 'Erreur.');
        setCrudError(msg);
      } else if (data) {
        setServices(prev => [data as Service, ...prev]);
        setAddForm(EMPTY_FORM);
        setShowAddForm(false);
        setCrudError(null);
      }
    } catch {}
    setAddSaving(false);
  };

  const startEdit = (service: Service) => {
    setEditingId(service.id);
    setEditForm({ name: service.name, price: service.price !== null ? String(service.price) : '', type: service.type, description: service.description || '' });
  };

  const handleEditSave = async (serviceId: string) => {
    if (!editForm.name.trim()) return;
    setEditSaving(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.from('services').update({
        name: editForm.name.trim(),
        price: editForm.price !== '' ? parseFloat(editForm.price) : null,
        type: editForm.type,
        description: editForm.description.trim() || null,
        updated_at: new Date().toISOString(),
      }).eq('id', serviceId).select().single();
      if (!error && data) {
        setServices(prev => prev.map(s => s.id === serviceId ? (data as Service) : s));
        setEditingId(null);
      }
    } catch {}
    setEditSaving(false);
  };

  const handleDelete = async (serviceId: string) => {
    try {
      const supabase = createClient();
      await supabase.from('services').delete().eq('id', serviceId);
      setServices(prev => prev.filter(s => s.id !== serviceId));
    } catch {}
    setDeletingId(null);
  };

  const importTemplate = (tpl: ServiceTemplate) => {
    setAddForm({ name: tpl.name, price: String(tpl.price), type: tpl.type, description: tpl.description });
    setShowAddForm(true);
    setEditingId(null);
    setActiveTab('catalog');
  };

  // ── Packages ────────────────────────────────────────────────────────────────
  const handleSavePackage = () => {
    if (!pkgForm.name.trim()) return;
    if (editingPkgId) {
      savePackages(packages.map(p => p.id === editingPkgId ? { ...p, ...pkgForm, discountedPrice: pkgForm.discountedPrice ? parseFloat(pkgForm.discountedPrice) : null } : p));
      setEditingPkgId(null);
    } else {
      savePackages([...packages, { id: Date.now().toString(), ...pkgForm, discountedPrice: pkgForm.discountedPrice ? parseFloat(pkgForm.discountedPrice) : null }]);
    }
    setPkgForm({ name: '', description: '', serviceIds: [], discountedPrice: '', highlight: false });
    setShowPkgForm(false);
  };

  const startEditPkg = (pkg: ServicePackage) => {
    setEditingPkgId(pkg.id);
    setPkgForm({ name: pkg.name, description: pkg.description, serviceIds: pkg.serviceIds, discountedPrice: pkg.discountedPrice !== null ? String(pkg.discountedPrice) : '', highlight: pkg.highlight });
    setShowPkgForm(true);
  };

  const pkgTotal = (pkg: ServicePackage) => services.filter(s => pkg.serviceIds.includes(s.id)).reduce((sum, s) => sum + (s.price ?? 0), 0);

  // ── Quote ───────────────────────────────────────────────────────────────────
  const toggleServiceInQuote = (id: string) => {
    setSelectedServiceIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const quoteServices = services.filter(s => selectedServiceIds.has(s.id));
  const quoteSubtotal = quoteServices.reduce((s, sv) => s + (sv.price ?? 0), 0);
  const quoteDiscountAmt = Math.round(quoteSubtotal * quoteDiscount / 100);
  const quoteTotal = quoteSubtotal - quoteDiscountAmt;

  const handleExportQuote = async () => {
    if (quoteServices.length === 0) return;
    setExportingQuote(true);
    const html = generateQuoteHtml(quoteClient, quoteServices, quoteDiscount, quoteValidDays, sellerName || 'Minerva OS');
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devis-${(quoteClient.company || quoteClient.name || 'client').toLowerCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-6)}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setExportingQuote(false);
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const totalValue = services.reduce((s, sv) => s + (sv.price ?? 0), 0);
  const avgPrice = services.length > 0 ? Math.round(totalValue / services.filter(s => s.price !== null).length) : 0;
  const typeCount = services.reduce((acc, s) => { acc[s.type] = (acc[s.type] ?? 0) + 1; return acc; }, {} as Record<string, number>);
  const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0]?.[0] as ServiceType | undefined;

  return (
    <div className="h-full overflow-y-auto bg-[#fafaf9]">
      <div className="max-w-5xl mx-auto p-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-[#26251e]">Services & Tarifs</h1>
            <p className="text-xs text-[#807d72] mt-0.5">Catalogue, forfaits et génération de devis.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Services', value: services.length, icon: <LayoutGrid className="h-3.5 w-3.5" /> },
            { label: 'Valeur totale', value: totalValue > 0 ? `${totalValue.toLocaleString('fr-CA', { maximumFractionDigits: 0 })} $` : '—', icon: <DollarSign className="h-3.5 w-3.5" /> },
            { label: 'Prix moyen', value: avgPrice > 0 ? `${avgPrice.toLocaleString('fr-CA')} $` : '—', icon: <FileText className="h-3.5 w-3.5" /> },
            { label: 'Forfaits', value: packages.length, icon: <Package className="h-3.5 w-3.5" /> },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-[#e6e5e0] rounded-xl p-3 flex items-center gap-3">
              <div className="h-7 w-7 rounded-lg bg-[#f0efe9] flex items-center justify-center text-[#807d72] shrink-0">
                {stat.icon}
              </div>
              <div>
                <p className="text-[10px] text-[#807d72] font-bold uppercase tracking-wider">{stat.label}</p>
                <p className="text-sm font-extrabold text-[#26251e]">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-white border border-[#e6e5e0] rounded-xl p-1 w-fit">
          {([
            { id: 'catalog', label: 'Catalogue', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
            { id: 'packages', label: 'Forfaits', icon: <Package className="h-3.5 w-3.5" /> },
            { id: 'quote', label: 'Devis', icon: <FileText className="h-3.5 w-3.5" /> },
          ] as { id: ViewTab; label: string; icon: React.ReactNode }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors',
                activeTab === tab.id
                  ? 'bg-[#26251e] text-white'
                  : 'text-[#807d72] hover:text-[#26251e] hover:bg-[#f0efe9]'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {crudError && (
          <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            <X className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{crudError}</span>
            <button onClick={() => setCrudError(null)}><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {/* ── TAB: CATALOG ── */}
        {activeTab === 'catalog' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#26251e]">Mes services ({services.length})</h2>
              <Button size="sm" className="gap-1.5 bg-[#f54e00] hover:bg-[#d94200] text-white text-xs" onClick={() => { setShowAddForm(true); setEditingId(null); }}>
                <Plus className="h-3.5 w-3.5" /> Ajouter
              </Button>
            </div>

            {/* Add form */}
            {showAddForm && (
              <form onSubmit={handleAddSubmit} className="bg-white border border-[#f54e00]/30 rounded-xl p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-[#26251e]">Nouveau service</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">Nom *</label>
                    <Input placeholder="Audit SEO local" value={addForm.name} onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))} required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">Prix ($)</label>
                    <Input type="number" min="0" step="0.01" placeholder="497" value={addForm.price} onChange={e => setAddForm(p => ({ ...p, price: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">Type</label>
                  <Select value={addForm.type} onValueChange={(v: ServiceType) => setAddForm(p => ({ ...p, type: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">Description</label>
                  <Textarea placeholder="Décris ce que comprend ce service..." value={addForm.description} onChange={e => setAddForm(p => ({ ...p, description: e.target.value }))} rows={2} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setShowAddForm(false); setAddForm(EMPTY_FORM); }}>Annuler</Button>
                  <Button type="submit" size="sm" className="bg-[#f54e00] hover:bg-[#d94200] text-white" disabled={addSaving}>
                    {addSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enregistrer'}
                  </Button>
                </div>
              </form>
            )}

            {/* Templates */}
            <div className="space-y-2">
              <button onClick={() => setShowTemplates(p => !p)} className="flex items-center gap-2 text-xs font-bold text-[#807d72] hover:text-[#26251e] transition-colors">
                <Sparkles className="h-3.5 w-3.5 text-[#f54e00]" />
                Templates suggérés
                {showTemplates ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              {showTemplates && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {getTemplatesForNiches(userNiches).map(tpl => (
                    <button key={tpl.name} type="button" onClick={() => importTemplate(tpl)} className="text-left border border-dashed border-[#f54e00]/30 hover:border-[#f54e00] hover:bg-[#f54e00]/5 rounded-xl p-3 space-y-1 transition-all group">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-[#26251e] leading-snug">{tpl.name}</span>
                        <Plus className="h-3 w-3 text-[#f54e00] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={cn('text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border', TYPE_COLORS[tpl.type])}>{TYPE_LABELS[tpl.type]}</span>
                        <span className="text-[10px] font-mono text-[#807d72]">{tpl.price} $</span>
                      </div>
                      <p className="text-[9px] text-[#807d72] line-clamp-2">{tpl.description}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* List */}
            {loading ? (
              <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#807d72]" /></div>
            ) : services.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#e6e5e0] rounded-xl">
                <LayoutGrid className="h-8 w-8 text-[#e6e5e0] mb-3" />
                <p className="text-sm font-semibold text-[#26251e]">Aucun service</p>
                <p className="text-xs text-[#807d72] mt-1">Ajoute un service ou importe un template.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {services.map(service =>
                  editingId === service.id ? (
                    <div key={service.id} className="bg-white border border-[#f54e00]/30 rounded-xl p-4 space-y-3 shadow-sm">
                      <Input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} className="h-8 text-xs" placeholder="Nom" />
                      <Input type="number" min="0" step="0.01" value={editForm.price} onChange={e => setEditForm(p => ({ ...p, price: e.target.value }))} className="h-8 text-xs" placeholder="Prix ($)" />
                      <Select value={editForm.type} onValueChange={(v: ServiceType) => setEditForm(p => ({ ...p, type: v }))}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}</SelectContent>
                      </Select>
                      <Textarea value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))} rows={2} className="text-xs" placeholder="Description" />
                      <div className="flex justify-end gap-1.5">
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
                        <Button type="button" size="sm" className="h-7 text-xs bg-[#f54e00] hover:bg-[#d94200] text-white" onClick={() => handleEditSave(service.id)} disabled={editSaving}>
                          {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3 mr-1" />Sauver</>}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div key={service.id} className="bg-white border border-[#e6e5e0] rounded-xl p-4 flex flex-col gap-3 hover:border-[#26251e]/20 transition-all shadow-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-sm font-bold text-[#26251e] truncate">{service.name}</span>
                          <span className={cn('text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border w-fit', TYPE_COLORS[service.type])}>
                            {TYPE_LABELS[service.type]}
                          </span>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button className="h-6 w-6 rounded flex items-center justify-center text-[#807d72] hover:text-[#26251e] hover:bg-[#f0efe9] transition-colors" onClick={() => startEdit(service)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {deletingId === service.id ? (
                            <>
                              <button className="h-6 w-6 rounded flex items-center justify-center text-red-600 hover:bg-red-50 transition-colors" onClick={() => handleDelete(service.id)}><Check className="h-3.5 w-3.5" /></button>
                              <button className="h-6 w-6 rounded flex items-center justify-center text-[#807d72] hover:bg-[#f0efe9] transition-colors" onClick={() => setDeletingId(null)}><X className="h-3.5 w-3.5" /></button>
                            </>
                          ) : (
                            <button className="h-6 w-6 rounded flex items-center justify-center text-[#807d72] hover:text-red-500 hover:bg-red-50 transition-colors" onClick={() => setDeletingId(service.id)}><Trash2 className="h-3.5 w-3.5" /></button>
                          )}
                        </div>
                      </div>
                      {service.price !== null && (
                        <p className="text-xl font-bold text-[#26251e]">{service.price.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}</p>
                      )}
                      {service.description && <p className="text-xs text-[#807d72] leading-relaxed line-clamp-3">{service.description}</p>}
                    </div>
                  )
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: PACKAGES ── */}
        {activeTab === 'packages' && (
          <div className="flex flex-col gap-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#26251e]">Forfaits ({packages.length})</h2>
              <Button size="sm" className="gap-1.5 bg-[#f54e00] hover:bg-[#d94200] text-white text-xs" onClick={() => { setShowPkgForm(true); setEditingPkgId(null); setPkgForm({ name: '', description: '', serviceIds: [], discountedPrice: '', highlight: false }); }}>
                <Plus className="h-3.5 w-3.5" /> Nouveau forfait
              </Button>
            </div>

            {showPkgForm && (
              <div className="bg-white border border-[#f54e00]/30 rounded-xl p-5 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-[#26251e]">{editingPkgId ? 'Modifier le forfait' : 'Nouveau forfait'}</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">Nom *</label>
                    <Input placeholder="Pack Starter" value={pkgForm.name} onChange={e => setPkgForm(p => ({ ...p, name: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">Prix forfait ($) <span className="normal-case font-normal">(optionnel)</span></label>
                    <Input type="number" min="0" step="0.01" placeholder="1500" value={pkgForm.discountedPrice} onChange={e => setPkgForm(p => ({ ...p, discountedPrice: e.target.value }))} />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">Description</label>
                  <Input placeholder="Idéal pour les nouvelles PME" value={pkgForm.description} onChange={e => setPkgForm(p => ({ ...p, description: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">Services inclus</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                    {services.map(s => (
                      <label key={s.id} className="flex items-center gap-2 text-xs cursor-pointer hover:bg-[#f0efe9] p-1.5 rounded-lg">
                        <input type="checkbox" checked={pkgForm.serviceIds.includes(s.id)} onChange={e => setPkgForm(p => ({ ...p, serviceIds: e.target.checked ? [...p.serviceIds, s.id] : p.serviceIds.filter(id => id !== s.id) }))} className="rounded" />
                        <span className="truncate">{s.name}</span>
                        {s.price !== null && <span className="text-[#807d72] font-mono ml-auto shrink-0">{s.price} $</span>}
                      </label>
                    ))}
                  </div>
                  {services.length === 0 && <p className="text-xs text-[#807d72] italic">Ajoutez des services dans le catalogue d'abord.</p>}
                </div>
                <label className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={pkgForm.highlight} onChange={e => setPkgForm(p => ({ ...p, highlight: e.target.checked }))} />
                  <span className="font-semibold">Mettre en avant (badge "Recommandé")</span>
                </label>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => { setShowPkgForm(false); setEditingPkgId(null); }}>Annuler</Button>
                  <Button type="button" size="sm" className="bg-[#f54e00] hover:bg-[#d94200] text-white" onClick={handleSavePackage}>Enregistrer</Button>
                </div>
              </div>
            )}

            {packages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-[#e6e5e0] rounded-xl">
                <Package className="h-8 w-8 text-[#e6e5e0] mb-3" />
                <p className="text-sm font-semibold text-[#26251e]">Aucun forfait</p>
                <p className="text-xs text-[#807d72] mt-1">Groupez vos services en forfaits pour présenter une grille tarifaire claire.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.map(pkg => {
                  const included = services.filter(s => pkg.serviceIds.includes(s.id));
                  const originalTotal = pkgTotal(pkg);
                  const savings = pkg.discountedPrice !== null ? originalTotal - pkg.discountedPrice : 0;
                  return (
                    <div key={pkg.id} className={cn('bg-white border rounded-xl p-5 flex flex-col gap-3 relative', pkg.highlight ? 'border-[#f54e00] shadow-md' : 'border-[#e6e5e0]')}>
                      {pkg.highlight && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#f54e00] text-white text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">Recommandé</span>}
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-sm font-extrabold text-[#26251e]">{pkg.name}</h3>
                          {pkg.description && <p className="text-xs text-[#807d72] mt-0.5">{pkg.description}</p>}
                        </div>
                        <div className="flex gap-0.5">
                          <button onClick={() => startEditPkg(pkg)} className="h-6 w-6 rounded text-[#807d72] hover:text-[#26251e] hover:bg-[#f0efe9] flex items-center justify-center"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => savePackages(packages.filter(p => p.id !== pkg.id))} className="h-6 w-6 rounded text-[#807d72] hover:text-red-500 hover:bg-red-50 flex items-center justify-center"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        {included.map(s => (
                          <div key={s.id} className="flex items-center gap-1.5 text-xs">
                            <Check className="h-3 w-3 text-[#059669] shrink-0" />
                            <span className="truncate">{s.name}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-auto pt-3 border-t border-[#f0efe9]">
                        {pkg.discountedPrice !== null ? (
                          <>
                            <p className="text-xl font-bold text-[#26251e]">{pkg.discountedPrice.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}</p>
                            {savings > 0 && <p className="text-[10px] text-[#059669] font-bold">Économie de {savings.toLocaleString('fr-CA', { maximumFractionDigits: 0 })} $</p>}
                          </>
                        ) : (
                          <p className="text-xl font-bold text-[#26251e]">{originalTotal.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: QUOTE ── */}
        {activeTab === 'quote' && (
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Client info */}
              <div className="bg-white border border-[#e6e5e0] rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-[#26251e]">Informations client</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'name' as keyof QuoteClient, label: 'Nom', placeholder: 'Jean Dupont' },
                    { key: 'company' as keyof QuoteClient, label: 'Entreprise', placeholder: 'Acme Inc.' },
                    { key: 'email' as keyof QuoteClient, label: 'Email', placeholder: 'jean@acme.com' },
                    { key: 'address' as keyof QuoteClient, label: 'Adresse', placeholder: '123 rue Principale' },
                  ].map(field => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">{field.label}</label>
                      <Input value={quoteClient[field.key]} onChange={e => setQuoteClient(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} className="h-8 text-xs" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">Remise (%)</label>
                    <Input type="number" min="0" max="100" value={quoteDiscount} onChange={e => setQuoteDiscount(Number(e.target.value))} className="h-8 text-xs" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#807d72]">Validité (jours)</label>
                    <Input type="number" min="1" value={quoteValidDays} onChange={e => setQuoteValidDays(Number(e.target.value))} className="h-8 text-xs" />
                  </div>
                </div>
              </div>

              {/* Service selection */}
              <div className="bg-white border border-[#e6e5e0] rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-[#26251e]">Services à inclure</h3>
                {services.length === 0 ? (
                  <p className="text-xs text-[#807d72] italic">Aucun service dans le catalogue.</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {services.map(s => (
                      <label key={s.id} className={cn('flex items-center gap-2 text-xs cursor-pointer p-2 rounded-lg transition-colors', selectedServiceIds.has(s.id) ? 'bg-[#ecfdf5] border border-[#6ee7b7]/60' : 'hover:bg-[#f0efe9] border border-transparent')}>
                        <input type="checkbox" checked={selectedServiceIds.has(s.id)} onChange={() => toggleServiceInQuote(s.id)} className="rounded text-[#059669]" />
                        <span className="flex-1 truncate font-medium">{s.name}</span>
                        <span className={cn('text-[8px] font-bold uppercase tracking-wider px-1 py-0.5 rounded border', TYPE_COLORS[s.type])}>{TYPE_LABELS[s.type]}</span>
                        {s.price !== null && <span className="font-mono text-[#26251e] shrink-0">{s.price} $</span>}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quote preview */}
            {quoteServices.length > 0 && (
              <div className="bg-white border border-[#e6e5e0] rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#26251e]">Aperçu du devis</h3>
                  <Button size="sm" className="gap-1.5 bg-[#26251e] hover:bg-[#1a1a19] text-white text-xs" onClick={handleExportQuote} disabled={exportingQuote}>
                    {exportingQuote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                    Exporter HTML
                  </Button>
                </div>
                <div className="border border-[#f0efe9] rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#fafaf9] border-b border-[#f0efe9]">
                        <th className="text-left p-2.5 text-[#807d72] font-bold uppercase text-[9px] tracking-wider">Service</th>
                        <th className="text-right p-2.5 text-[#807d72] font-bold uppercase text-[9px] tracking-wider">Prix</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quoteServices.map(s => (
                        <tr key={s.id} className="border-b border-[#f0efe9] last:border-0">
                          <td className="p-2.5">{s.name}</td>
                          <td className="p-2.5 text-right font-mono">{s.price !== null ? `${s.price} $` : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs">
                  {quoteDiscount > 0 && (
                    <>
                      <div className="flex gap-8 text-[#807d72]"><span>Sous-total</span><span className="font-mono">{quoteSubtotal.toLocaleString('fr-CA')} $</span></div>
                      <div className="flex gap-8 text-[#059669]"><span>Remise ({quoteDiscount}%)</span><span className="font-mono">-{quoteDiscountAmt.toLocaleString('fr-CA')} $</span></div>
                    </>
                  )}
                  <div className="flex gap-8 font-bold text-base text-[#26251e] border-t border-[#f0efe9] pt-2 mt-1 w-full justify-end">
                    <span>TOTAL</span>
                    <span className="font-mono">{quoteTotal.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}</span>
                  </div>
                </div>
              </div>
            )}

            {quoteServices.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-[#e6e5e0] rounded-xl">
                <Send className="h-8 w-8 text-[#e6e5e0] mb-3" />
                <p className="text-sm font-semibold text-[#26251e]">Sélectionnez des services</p>
                <p className="text-xs text-[#807d72] mt-1">Cochez les services à inclure dans votre devis.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
