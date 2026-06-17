'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { useReach } from '@/lib/reach-context';
import { Plus, Pencil, Trash2, Check, X, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type ServiceType = 'digital' | 'saas' | 'audit' | 'formation' | 'autre';

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
  electricien: [
    { name: 'Site web électricien', price: 790, type: 'digital', description: "Site vitrine avec certifications, services et demande de devis." },
    { name: 'Audit SEO local', price: 197, type: 'audit', description: "Analyse SEO locale pour apparaître en tête des recherches Google." },
    { name: 'Pack avis Google', price: 149, type: 'audit', description: "Stratégie de récolte d'avis clients pour améliorer la note." },
  ],
  garage: [
    { name: 'Site web garage auto', price: 990, type: 'digital', description: "Site avec présentation des services, devis en ligne et prise de RDV." },
    { name: 'Campagne Google Ads locale', price: 297, type: 'digital', description: "Campagne ciblée sur les recherches locales (pneus, révision, etc.)." },
    { name: 'Audit réputation en ligne', price: 197, type: 'audit', description: "Analyse des avis et plan d'action pour améliorer la e-réputation." },
  ],
  avocat: [
    { name: 'Site web cabinet juridique', price: 1490, type: 'digital', description: "Site professionnel avec domaines de pratique, équipe et formulaire de contact." },
    { name: 'Optimisation LinkedIn', price: 397, type: 'digital', description: "Refonte du profil LinkedIn et stratégie de contenu mensuelle." },
    { name: 'Audit SEO notoriété', price: 297, type: 'audit', description: "Analyse de la présence en ligne et recommandations pour attirer plus de clients." },
  ],
  comptable: [
    { name: 'Site web comptable', price: 990, type: 'digital', description: "Site avec services, expertises et formulaire de demande de consultation." },
    { name: 'Automatisation rappels fiscaux', price: 149, type: 'saas', description: "Emails automatiques pour rappeler les échéances fiscales à vos clients." },
    { name: 'Formation CRM Minerva', price: 297, type: 'formation', description: "Formation de 3h à l'utilisation de Minerva OS pour gérer vos prospects." },
  ],
  immobil: [
    { name: 'Site web agence immobilière', price: 1990, type: 'digital', description: "Site avec listings de propriétés, filtres de recherche et formulaire agent." },
    { name: 'Gestion avis Google', price: 297, type: 'audit', description: "Stratégie de récolte et réponse aux avis pour les agents immobiliers." },
    { name: 'Campagne Facebook Ads', price: 497, type: 'digital', description: "Campagnes ciblées acheteurs/vendeurs dans votre zone de service." },
  ],
  gym: [
    { name: 'Site web studio / gym', price: 1090, type: 'digital', description: "Site avec horaires des cours, inscription en ligne et galerie." },
    { name: 'Campagne Instagram fitness', price: 397, type: 'digital', description: "Contenu vidéo et stories pour attirer de nouveaux membres." },
    { name: "Système d'abonnements", price: 249, type: 'saas', description: "Intégration d'un module de paiement récurrent pour les abonnements." },
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
      if (!seen.has(t.name)) {
        seen.add(t.name);
        templates.push(t);
      }
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

const TYPE_LABELS: Record<ServiceType, string> = {
  digital: 'Digital',
  saas: 'SaaS',
  audit: 'Audit',
  formation: 'Formation',
  autre: 'Autre',
};

const TYPE_COLORS: Record<ServiceType, string> = {
  digital: 'bg-blue-100 text-blue-800 border-blue-200',
  saas: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  audit: 'bg-amber-100 text-amber-800 border-amber-200',
  formation: 'bg-purple-100 text-purple-800 border-purple-200',
  autre: 'bg-gray-100 text-gray-700 border-gray-200',
};

const EMPTY_FORM = {
  name: '',
  price: '',
  type: 'digital' as ServiceType,
  description: '',
};

export default function ServicesRoot() {
  const { activeWorkspace } = useReach();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNiches, setUserNiches] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);

  // Add form
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY_FORM);
  const [addSaving, setAddSaving] = useState(false);

  // Inline edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editSaving, setEditSaving] = useState(false);

  // Delete confirm
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeWorkspace) return;
    fetchServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspace]);

  useEffect(() => {
    const loadNiches = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('settings')
          .select('niches')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data?.niches && Array.isArray(data.niches)) {
          setUserNiches(data.niches as string[]);
        }
      } catch {}
    };
    loadNiches();
  }, []);

  const fetchServices = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !activeWorkspace) return;

      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('user_id', user.id)
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false });

      if (data) setServices(data as Service[]);
    } catch (e) {
      console.error('Error fetching services:', e);
    }
    setLoading(false);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.name.trim() || !activeWorkspace) return;
    setAddSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('services')
        .insert({
          user_id: user.id,
          workspace_id: activeWorkspace.id,
          name: addForm.name.trim(),
          price: addForm.price !== '' ? parseFloat(addForm.price) : null,
          type: addForm.type,
          description: addForm.description.trim() || null,
        })
        .select()
        .single();

      if (!error && data) {
        setServices((prev) => [data as Service, ...prev]);
        setAddForm(EMPTY_FORM);
        setShowAddForm(false);
      }
    } catch (e) {
      console.error('Error adding service:', e);
    }
    setAddSaving(false);
  };

  const startEdit = (service: Service) => {
    setEditingId(service.id);
    setEditForm({
      name: service.name,
      price: service.price !== null ? String(service.price) : '',
      type: service.type,
      description: service.description || '',
    });
  };

  const handleEditSave = async (serviceId: string) => {
    if (!editForm.name.trim()) return;
    setEditSaving(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('services')
        .update({
          name: editForm.name.trim(),
          price: editForm.price !== '' ? parseFloat(editForm.price) : null,
          type: editForm.type,
          description: editForm.description.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', serviceId)
        .select()
        .single();

      if (!error && data) {
        setServices((prev) => prev.map((s) => (s.id === serviceId ? (data as Service) : s)));
        setEditingId(null);
      }
    } catch (e) {
      console.error('Error updating service:', e);
    }
    setEditSaving(false);
  };

  const handleDelete = async (serviceId: string) => {
    try {
      const supabase = createClient();
      await supabase.from('services').delete().eq('id', serviceId);
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
    } catch (e) {
      console.error('Error deleting service:', e);
    }
    setDeletingId(null);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 flex flex-col gap-6">

        {/* Header */}
        <div className="flex items-start justify-between pb-2 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Services & Tarifs</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Catalogue de tes offres commerciales ({services.length} service{services.length !== 1 ? 's' : ''}).
            </p>
          </div>
          <Button
            size="sm"
            className="gap-2 bg-primary hover:bg-primary/90"
            onClick={() => {
              setShowAddForm(true);
              setEditingId(null);
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            Ajouter un service
          </Button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <form
            onSubmit={handleAddSubmit}
            className="bg-card border border-primary/30 rounded-lg p-5 space-y-4 shadow-sm animate-in fade-in duration-200"
          >
            <h3 className="text-sm font-bold text-foreground">Nouveau service</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Nom *</label>
                <Input
                  placeholder="Audit SEO local"
                  value={addForm.name}
                  onChange={(e) => setAddForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Prix ($)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="497"
                  value={addForm.price}
                  onChange={(e) => setAddForm((p) => ({ ...p, price: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Type</label>
              <Select value={addForm.type} onValueChange={(val: ServiceType) => setAddForm((p) => ({ ...p, type: val }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="digital">Digital</SelectItem>
                  <SelectItem value="saas">SaaS</SelectItem>
                  <SelectItem value="audit">Audit</SelectItem>
                  <SelectItem value="formation">Formation</SelectItem>
                  <SelectItem value="autre">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
              <Textarea
                placeholder="Décris ce que comprend ce service..."
                value={addForm.description}
                onChange={(e) => setAddForm((p) => ({ ...p, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => { setShowAddForm(false); setAddForm(EMPTY_FORM); }}
              >
                Annuler
              </Button>
              <Button type="submit" size="sm" className="bg-primary hover:bg-primary/90" disabled={addSaving}>
                {addSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Enregistrer'}
              </Button>
            </div>
          </form>
        )}

        {/* Service templates */}
        {!showAddForm && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Templates suggérés
                </span>
                {userNiches.length > 0 && (
                  <span className="text-[10px] text-muted-foreground italic">
                    basés sur vos niches ({userNiches.slice(0, 2).join(', ')}{userNiches.length > 2 ? '…' : ''})
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowTemplates(p => !p)}
                className="text-[10px] text-primary hover:underline font-semibold"
              >
                {showTemplates ? 'Réduire' : 'Afficher'}
              </button>
            </div>

            {showTemplates && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {getTemplatesForNiches(userNiches).map((tpl) => (
                  <button
                    key={tpl.name}
                    type="button"
                    onClick={() => {
                      setAddForm({
                        name: tpl.name,
                        price: String(tpl.price),
                        type: tpl.type,
                        description: tpl.description,
                      });
                      setShowAddForm(true);
                      setEditingId(null);
                    }}
                    className="text-left border border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 rounded-lg p-3 space-y-1 transition-all group"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-semibold text-foreground group-hover:text-primary leading-snug">{tpl.name}</span>
                      <Plus className="h-3 w-3 text-primary shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className={cn('text-[8px] font-bold uppercase tracking-wider px-1 py-0 border', TYPE_COLORS[tpl.type])}>
                        {TYPE_LABELS[tpl.type]}
                      </Badge>
                      <span className="text-[10px] font-mono text-muted-foreground">{tpl.price} $</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground leading-snug line-clamp-2">{tpl.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Services list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          </div>
        ) : services.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border rounded-lg">
            <p className="text-sm font-semibold text-foreground">Aucun service pour l&apos;instant</p>
            <p className="text-xs text-muted-foreground mt-1">Clique sur &quot;Ajouter un service&quot; pour créer ton premier tarif.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {services.map((service) =>
              editingId === service.id ? (
                /* Inline edit card */
                <div key={service.id} className="bg-card border border-primary/30 rounded-lg p-4 space-y-3 shadow-sm animate-in fade-in duration-150">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nom *</label>
                    <Input
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Prix ($)</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editForm.price}
                      onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Type</label>
                    <Select value={editForm.type} onValueChange={(val: ServiceType) => setEditForm((p) => ({ ...p, type: val }))}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="digital" className="text-xs">Digital</SelectItem>
                        <SelectItem value="saas" className="text-xs">SaaS</SelectItem>
                        <SelectItem value="audit" className="text-xs">Audit</SelectItem>
                        <SelectItem value="formation" className="text-xs">Formation</SelectItem>
                        <SelectItem value="autre" className="text-xs">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                      rows={2}
                      className="text-xs"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-foreground"
                      onClick={() => setEditingId(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="h-7 text-xs bg-primary hover:bg-primary/90"
                      onClick={() => handleEditSave(service.id)}
                      disabled={editSaving}
                    >
                      {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3 mr-1" /> Sauvegarder</>}
                    </Button>
                  </div>
                </div>
              ) : (
                /* Display card */
                <div key={service.id} className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3 hover:border-border/80 transition-all shadow-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1 min-w-0">
                      <span className="text-sm font-bold text-foreground truncate">{service.name}</span>
                      <Badge
                        variant="outline"
                        className={cn('text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 w-fit border', TYPE_COLORS[service.type])}
                      >
                        {TYPE_LABELS[service.type]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        onClick={() => startEdit(service)}
                        title="Modifier"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {deletingId === service.id ? (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(service.id)}
                            title="Confirmer la suppression"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-foreground"
                            onClick={() => setDeletingId(null)}
                            title="Annuler"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-muted-foreground hover:text-red-500"
                          onClick={() => setDeletingId(service.id)}
                          title="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {service.price !== null && (
                    <p className="text-lg font-bold text-foreground">
                      {service.price.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}
                    </p>
                  )}

                  {service.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{service.description}</p>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
