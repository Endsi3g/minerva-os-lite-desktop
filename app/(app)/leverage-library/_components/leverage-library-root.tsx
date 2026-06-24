'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useReach } from '@/lib/reach-context';
import { getApiUrl } from '@/lib/api-helper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Plus, Pencil, Trash2, BookOpen, Trophy, Target, Sparkles, Loader2, X, Check,
} from 'lucide-react';

interface CaseStudy {
  id: string;
  workspace_id: string;
  title: string;
  niche_target: string;
  results_headline: string;
  email_snippet: string;
  created_at: string;
}

const EMPTY_FORM = { title: '', niche_target: '', results_headline: '', email_snippet: '' };

export function LeverageLibraryRoot() {
  const { activeWorkspace } = useReach();
  const [items, setItems] = useState<CaseStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CaseStudy | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!activeWorkspace?.id) return;
    setLoading(true);
    try {
      const res = await fetch(getApiUrl(`/api/leverage-library?workspace_id=${activeWorkspace.id}`));
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [activeWorkspace?.id]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const openCreate = () => { setEditing(null); setForm(EMPTY_FORM); setShowModal(true); };
  const openEdit = (item: CaseStudy) => { setEditing(item); setForm({ title: item.title, niche_target: item.niche_target, results_headline: item.results_headline, email_snippet: item.email_snippet }); setShowModal(true); };

  const handleSave = async () => {
    if (!form.title.trim() || !activeWorkspace?.id) return;
    setSaving(true);
    try {
      const url = getApiUrl('/api/leverage-library');
      const res = editing
        ? await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editing.id, ...form }) })
        : await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspace_id: activeWorkspace.id, ...form }) });
      if (!res.ok) { toast.error('Erreur lors de la sauvegarde'); return; }
      toast.success(editing ? 'Étude de cas mise à jour' : 'Étude de cas ajoutée');
      setShowModal(false);
      fetchItems();
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(getApiUrl(`/api/leverage-library?id=${id}`), { method: 'DELETE' });
      if (!res.ok) { toast.error('Erreur lors de la suppression'); return; }
      setItems(prev => prev.filter(i => i.id !== id));
      toast.success('Étude de cas supprimée');
    } finally { setDeletingId(null); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-[#e5e5e0] bg-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#059669]/10">
            <BookOpen className="h-4 w-4 text-[#059669]" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[#26251e]">Bibliothèque de preuves</h1>
            <p className="text-[10px] text-[#7a7a76]">Études de cas sélectionnées automatiquement par l'IA lors de la rédaction d'emails</p>
          </div>
        </div>
        <Button onClick={openCreate} className="h-8 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold gap-1.5">
          <Plus className="h-3.5 w-3.5" />Ajouter
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-5 w-5 animate-spin text-[#7a7a76]" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4f4f3] border border-[#e5e5e0]">
              <Trophy className="h-6 w-6 text-[#7a7a76]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#26251e]">Aucune étude de cas</p>
              <p className="text-[11px] text-[#7a7a76] mt-1 max-w-xs">Ajoutez vos études de cas clients. L'IA choisira automatiquement la plus pertinente selon le secteur du lead dans les emails.</p>
            </div>
            <Button onClick={openCreate} className="h-8 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold gap-1.5">
              <Plus className="h-3.5 w-3.5" />Première étude de cas
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map(item => (
              <div key={item.id} className="border border-[#e5e5e0] rounded-xl p-4 bg-white space-y-3 hover:border-[#059669]/30 transition-colors group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#059669]/10">
                      <Trophy className="h-3.5 w-3.5 text-[#059669]" />
                    </div>
                    <p className="text-xs font-semibold text-[#26251e] truncate">{item.title}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button onClick={() => openEdit(item)} className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-[#f4f4f3] text-[#7a7a76] hover:text-[#26251e] transition-colors">
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deletingId === item.id}
                      className="flex h-6 w-6 items-center justify-center rounded-md hover:bg-red-50 text-[#7a7a76] hover:text-red-600 transition-colors"
                    >
                      {deletingId === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                    </button>
                  </div>
                </div>

                {item.niche_target && (
                  <div className="flex items-center gap-1.5">
                    <Target className="h-3 w-3 text-[#7a7a76] shrink-0" />
                    <span className="text-[10px] text-[#7a7a76]">Niche : </span>
                    <span className="text-[10px] font-bold text-[#26251e]">{item.niche_target}</span>
                  </div>
                )}

                {item.results_headline && (
                  <div className="px-2.5 py-1.5 rounded-lg bg-[#059669]/8 border border-[#059669]/15">
                    <p className="text-[10px] font-bold text-[#059669]">{item.results_headline}</p>
                  </div>
                )}

                {item.email_snippet && (
                  <div className="space-y-1">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">Snippet email</p>
                    <p className="text-[11px] text-[#26251e] leading-relaxed line-clamp-3">{item.email_snippet}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-[520px] max-w-full animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-[#e5e5e0]">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#059669]/10">
                  <Sparkles className="h-3.5 w-3.5 text-[#059669]" />
                </div>
                <h2 className="text-sm font-semibold text-[#26251e]">
                  {editing ? 'Modifier l\'étude de cas' : 'Nouvelle étude de cas'}
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-[#f4f4f3] text-[#7a7a76]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Titre *</label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Restaurant à Paris → +40 réservations/mois" className="h-8 text-xs border-[#e5e5e0]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Niche cible</label>
                <Input value={form.niche_target} onChange={e => setForm(f => ({ ...f, niche_target: e.target.value }))} placeholder="Ex: Restaurant, Coiffeur, PME BTP…" className="h-8 text-xs border-[#e5e5e0]" />
                <p className="text-[9px] text-[#7a7a76]">L'IA utilise ce champ pour matcher avec la niche du lead</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Headline résultat</label>
                <Input value={form.results_headline} onChange={e => setForm(f => ({ ...f, results_headline: e.target.value }))} placeholder="Ex: +30 RDV en 21 jours pour 0€ de pub" className="h-8 text-xs border-[#e5e5e0]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Snippet email</label>
                <Textarea value={form.email_snippet} onChange={e => setForm(f => ({ ...f, email_snippet: e.target.value }))} placeholder="Le texte exact à insérer dans l'email (2-3 phrases max)…" rows={4} className="text-xs border-[#e5e5e0] resize-none" />
                <p className="text-[9px] text-[#7a7a76]">Ce texte sera inséré dans l'email généré par l'IA pour personnaliser la preuve sociale</p>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-5 pt-0">
              <Button variant="outline" onClick={() => setShowModal(false)} className="h-8 text-xs border-[#e5e5e0]">Annuler</Button>
              <Button onClick={handleSave} disabled={!form.title.trim() || saving} className="h-8 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold gap-1.5">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {editing ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
