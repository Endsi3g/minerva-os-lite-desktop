'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { useReach } from '@/lib/reach-context';
import { Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ServiceType = 'digital' | 'saas' | 'audit' | 'formation' | 'autre';

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
