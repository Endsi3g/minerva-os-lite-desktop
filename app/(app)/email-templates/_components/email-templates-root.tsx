'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Mail, Trash2, Edit2, Copy, Check, X, Loader2,
  BarChart2, Tag, Search, ChevronDown, Sparkles, FlaskConical,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useReach } from '@/lib/reach-context';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { ContacterSubNav } from '@/app/(app)/_components/hub-nav/contacter-sub-nav';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  tags: string[];
  is_ab: boolean;
  variant_b_subject?: string;
  variant_b_body?: string;
  sends: number;
  opens: number;
  clicks: number;
  created_at: string;
}

const DEFAULT_TAGS = ['Cold outreach', 'Follow-up', 'Relance', 'RDV', 'Closing', 'Onboarding'];

const VARIABLE_TOKENS = ['{{prenom}}', '{{entreprise}}', '{{ville}}', '{{secteur}}', '{{signature}}'];

function rateColor(rate: number): string {
  if (rate >= 40) return '#059669';
  if (rate >= 20) return '#f59e0b';
  return '#ef4444';
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <p className="text-sm font-black" style={{ color }}>{value}</p>
      <p className="text-[9px] font-bold uppercase tracking-wider text-[#7a7a76]">{label}</p>
    </div>
  );
}

export function EmailTemplatesRoot({ showSubNav = true }: { showSubNav?: boolean }) {
  const { activeWorkspace } = useReach();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '', subject: '', body: '', tags: [] as string[],
    isAb: false, variantBSubject: '', variantBBody: '',
  });

  const fetchTemplates = useCallback(async () => {
    if (!activeWorkspace) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('email_templates')
        .select('*')
        .eq('workspace_id', activeWorkspace.id)
        .order('created_at', { ascending: false });
      setTemplates((data || []) as EmailTemplate[]);
    } catch { setTemplates([]); }
    finally { setLoading(false); }
  }, [activeWorkspace]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', subject: '', body: '', tags: [], isAb: false, variantBSubject: '', variantBBody: '' });
    setShowModal(true);
  };

  const openEdit = (t: EmailTemplate) => {
    setEditing(t);
    setForm({
      name: t.name, subject: t.subject, body: t.body,
      tags: t.tags || [],
      isAb: t.is_ab || false,
      variantBSubject: t.variant_b_subject || '',
      variantBBody: t.variant_b_body || '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!activeWorkspace || !form.name.trim() || !form.subject.trim()) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const payload = {
        workspace_id: activeWorkspace.id,
        name: form.name.trim(),
        subject: form.subject.trim(),
        body: form.body,
        tags: form.tags,
        is_ab: form.isAb,
        variant_b_subject: form.isAb ? form.variantBSubject : null,
        variant_b_body: form.isAb ? form.variantBBody : null,
      };
      if (editing) {
        await supabase.from('email_templates').update(payload).eq('id', editing.id);
        toast.success('Template mis à jour');
      } else {
        await supabase.from('email_templates').insert(payload);
        toast.success('Template créé');
      }
      setShowModal(false);
      fetchTemplates();
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce template ?')) return;
    const supabase = createClient();
    await supabase.from('email_templates').delete().eq('id', id);
    toast.success('Template supprimé');
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleCopy = (t: EmailTemplate) => {
    navigator.clipboard.writeText(`Sujet: ${t.subject}\n\n${t.body}`);
    setCopiedId(t.id);
    toast.success('Copié dans le presse-papier');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const insertVariable = (token: string, isVariantB = false) => {
    if (isVariantB) {
      setForm(prev => ({ ...prev, variantBBody: prev.variantBBody + token }));
    } else {
      setForm(prev => ({ ...prev, body: prev.body + token }));
    }
  };

  const toggleTag = (tag: string) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag) ? prev.tags.filter(t => t !== tag) : [...prev.tags, tag],
    }));
  };

  const allTags = Array.from(new Set([...DEFAULT_TAGS, ...templates.flatMap(t => t.tags || [])]));

  const filtered = templates.filter(t => {
    const matchSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.subject.toLowerCase().includes(search.toLowerCase());
    const matchTag = !tagFilter || (t.tags && t.tags.includes(tagFilter));
    return matchSearch && matchTag;
  });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#fafaf8]">
      {showSubNav && <ContacterSubNav />}

      <div className="flex-1 overflow-y-auto relative min-h-0">
        <div className="absolute inset-0 opacity-[0.25] pointer-events-none bg-grid-pattern-20 z-0" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-6 md:px-8 md:py-8 space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between flex-wrap gap-4 border-b border-[#e5e5e0] pb-5">
            <div>
              <h1 className="text-2xl font-heading font-serif font-black tracking-tight text-[#14171A]">Templates d'Emails</h1>
              <p className="text-xs text-[#4B5158] mt-1 font-medium">Modèles réutilisables, variables dynamiques et tests A/B pour vos campagnes et relances.</p>
            </div>
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 h-8 px-3.5 rounded-xl bg-brand-accent-emerald hover:bg-brand-accent-emeraldHover text-white text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Nouveau template
            </button>
          </div>

          {/* Search & Tag filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A9098]" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un template…"
                className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-[#e5e5e0] rounded-lg focus:outline-none focus:border-[#10B981] transition-colors"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={() => setTagFilter(null)}
                className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer', !tagFilter ? 'bg-[#26251e] text-white border-[#26251e]' : 'bg-white border-[#e5e5e0] text-[#7a7a76] hover:border-[#c5c5c0]')}
              >
                Tous
              </button>
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                  className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer', tagFilter === tag ? 'bg-[#26251e] text-white border-[#26251e]' : 'bg-white border-[#e5e5e0] text-[#7a7a76] hover:border-[#c5c5c0]')}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Templates list */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-[#7a7a76]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-16 text-center border-2 border-dashed border-[#e5e5e0] rounded-2xl bg-white">
              <Mail className="h-10 w-10 text-[#d4d4d0]" />
              <div>
                <p className="text-sm font-black text-[#7a7a76]">Aucun template</p>
                <p className="text-xs text-[#b0b0a8] mt-1">Créez votre premier template email ci-dessus.</p>
              </div>
              <button onClick={openNew} className="text-xs font-bold text-[#10B981] hover:underline cursor-pointer">Créer un template</button>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(t => {
                const openRate = t.sends > 0 ? Math.round((t.opens / t.sends) * 100) : 0;
                const clickRate = t.opens > 0 ? Math.round((t.clicks / t.opens) * 100) : 0;
                return (
                  <div key={t.id} className="border border-[#e5e5e0] bg-white rounded-2xl p-5 space-y-4 hover:border-[#c5c5c0] transition-colors shadow-2xs">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#f4f4f3] border border-[#e5e5e0] flex items-center justify-center shrink-0">
                        {t.is_ab ? <FlaskConical className="h-4 w-4 text-[#6366f1]" /> : <Mail className="h-4 w-4 text-[#7a7a76]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-black text-gray-900">{t.name}</p>
                          {t.is_ab && (
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#c4b5fd] bg-[#f5f3ff] text-[#6366f1]">A/B</span>
                          )}
                        </div>
                        <p className="text-xs text-[#7a7a76] mt-0.5 truncate">Sujet : {t.subject}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(t.tags || []).map(tag => (
                            <span key={tag} className="text-[9px] font-bold px-1.5 py-0.5 rounded border border-[#e5e5e0] bg-[#f4f4f3] text-[#7a7a76]">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => handleCopy(t)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#f4f4f3] text-[#7a7a76] transition-colors" title="Copier">
                          {copiedId === t.id ? <Check className="h-3.5 w-3.5 text-[#10B981]" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <button onClick={() => openEdit(t)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#f4f4f3] text-[#7a7a76] transition-colors" title="Modifier">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-[#7a7a76] hover:text-red-600 transition-colors" title="Supprimer">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-2 border-t border-[#f4f4f3] bg-[#fafaf8] rounded-xl p-3">
                      <StatPill label="Envois" value={String(t.sends || 0)} color="#26251e" />
                      <StatPill label="Ouvertures" value={String(t.opens || 0)} color="#26251e" />
                      <StatPill label="Taux ouv." value={`${openRate}%`} color={rateColor(openRate)} />
                      <StatPill label="Taux clics" value={`${clickRate}%`} color={rateColor(clickRate)} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal create / edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-[#e5e5e0] rounded-2xl w-full max-w-xl p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-gray-900">{editing ? 'Modifier le template' : 'Nouveau template'}</p>
              <button onClick={() => setShowModal(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-[#f4f4f3] text-[#7a7a76]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Nom du template</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="ex: Relance J+3 prospect qualifié"
                  className="w-full h-9 px-3 text-xs bg-[#fafaf8] border border-[#e5e5e0] rounded-lg mt-1 focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Objet</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm(prev => ({ ...prev, subject: e.target.value }))}
                  placeholder="ex: {{prenom}}, suite à notre échange"
                  className="w-full h-9 px-3 text-xs bg-[#fafaf8] border border-[#e5e5e0] rounded-lg mt-1 focus:outline-none focus:border-[#10B981]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76]">Corps du message</label>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] text-[#7a7a76]">Variables :</span>
                    {VARIABLE_TOKENS.map(tok => (
                      <button key={tok} type="button" onClick={() => insertVariable(tok)} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#f4f4f3] hover:bg-[#e5e5e0] text-[#26251e] transition-colors">
                        {tok}
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={6}
                  value={form.body}
                  onChange={e => setForm(prev => ({ ...prev, body: e.target.value }))}
                  placeholder="Bonjour {{prenom}},&#10;&#10;Je fais suite..."
                  className="w-full p-3 text-xs bg-[#fafaf8] border border-[#e5e5e0] rounded-lg focus:outline-none focus:border-[#10B981] font-mono"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#7a7a76] mb-1 block">Tags</label>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_TAGS.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        'text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer',
                        form.tags.includes(tag) ? 'bg-[#10B981] text-white border-[#10B981]' : 'border-[#e5e5e0] text-[#7a7a76] hover:border-[#c5c5c0]'
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#e5e5e0]">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-bold text-[#7a7a76] hover:text-[#26251e] cursor-pointer">
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim() || !form.subject.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-accent-emerald hover:bg-brand-accent-emeraldHover text-white text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {editing ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmailTemplatesRoot;
